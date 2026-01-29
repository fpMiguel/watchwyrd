/**
 * Watchwyrd - Main Entry Point
 */

import express from 'express';
import cors from 'cors';
import { serverConfig } from './config/server.js';
import { createCache, closeCache } from './cache/index.js';
import { createStremioRoutes, createConfigureRoutes } from './handlers/index.js';
import { logger, runCleanup, closeAllPools } from './utils/index.js';
import { closeHttpPools } from './utils/http.js';
import { ADDON_VERSION } from './addon/manifest.js';
import { generalLimiter, strictLimiter } from './middleware/rateLimiters.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createApp(): express.Application {
  const app = express();

  // Trust proxy for correct client IP detection behind reverse proxies (Render, Railway, Cloudflare)
  // Only enable when explicitly configured to avoid IP spoofing when directly exposed
  const trustProxyEnabled =
    process.env['TRUST_PROXY'] === '1' || process.env['TRUST_PROXY']?.toLowerCase() === 'true';
  if (trustProxyEnabled) {
    app.set('trust proxy', 1);
  }

  // HTTPS redirect in production (before other middleware)
  // Uses configured BASE_URL to prevent host header injection
  if (!serverConfig.isDev) {
    app.use((req, res, next) => {
      // With trust proxy enabled, use req.secure; otherwise check header directly
      const isSecure = trustProxyEnabled
        ? req.secure
        : req.headers['x-forwarded-proto'] === 'https';

      if (!isSecure) {
        // Use configured BASE_URL to prevent host header injection attacks
        const baseUrl = serverConfig.baseUrl;
        if (baseUrl?.startsWith('https://')) {
          return res.redirect(301, `${baseUrl}${req.url}`);
        }
        // If BASE_URL is not HTTPS or not configured, skip redirect
        // (server may be running behind a non-HTTPS proxy in some setups)
      }
      next();
    });
  }

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    // CORP: cross-origin required for Stremio Web and browser-based clients to load resources
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    // HSTS: Enforce HTTPS for 1 year (only effective over HTTPS)
    if (!serverConfig.isDev) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // CORS (required for Stremio addon compatibility)
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
      credentials: false,
    })
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // Request logging (redact sensitive data from paths)
  app.use((req, _res, next) => {
    // Redact search queries and encrypted config from logged paths
    // Encrypted configs (enc.xxx) are bearer tokens that could be replayed
    const redactedPath = req.path
      .replace(/\/search=[^/]+/g, '/search=[REDACTED]')
      .replace(/\/enc\.[^/]+/g, '/[ENCRYPTED_CONFIG]');
    logger.info(`${req.method} ${redactedPath}`, {
      userAgent: req.headers['user-agent']?.substring(0, 50),
      query: Object.keys(req.query).length > 0 ? '[present]' : undefined,
    });
    next();
  });

  // Static files
  app.use('/static', express.static(path.join(__dirname, 'web/public')));

  // Routes
  app.get('/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: 'healthy',
      version: ADDON_VERSION,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/configure', strictLimiter, createConfigureRoutes());
  app.get('/', (_req, res) => res.redirect('/configure'));
  app.use('/', generalLimiter, createStremioRoutes());

  // Error handling
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      // Log error details (redact stack in production)
      logger.error('Unhandled error', {
        error: err.message,
        stack: serverConfig.isDev ? err.stack : undefined,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  );

  return app;
}

/**
 * Start the server
 */
function start(): void {
  logger.info('Starting Watchwyrd...', { version: ADDON_VERSION, env: serverConfig.nodeEnv });

  try {
    createCache();
    const app = createApp();

    const server = app.listen(serverConfig.port, serverConfig.host, () => {
      logger.info(`🔮 Watchwyrd is running!`, {
        url: serverConfig.baseUrl,
        configure: `${serverConfig.baseUrl}/configure`,
      });

      if (serverConfig.isDev) {
        console.log('\n========================================');
        console.log('🔮 WATCHWYRD - Your viewing fate, revealed');
        console.log('========================================');
        console.log(`\n📍 Server:    ${serverConfig.baseUrl}`);
        console.log(`⚙️  Configure: ${serverConfig.baseUrl}/configure`);
        console.log(`❤️  Health:    ${serverConfig.baseUrl}/health`);
        console.log('\n========================================\n');
      }
    });

    // Server timeouts (Slowloris protection)
    server.requestTimeout = 30000; // 30 seconds total request timeout (per request)
    server.headersTimeout = 31000; // Slightly higher than requestTimeout
    server.keepAliveTimeout = 5000; // Keep-alive connections timeout

    // Graceful shutdown
    const shutdown = (signal: string): void => {
      logger.info(`Received ${signal}, shutting down...`);
      runCleanup(); // Clear all registered intervals
      closeAllPools(); // Close AI provider client pools
      void closeHttpPools(); // Close HTTP connection pools (async, best-effort)
      server.close(() => {
        closeCache()
          .then(() => {
            logger.info('Server stopped');
            process.exit(0);
          })
          .catch(() => process.exit(1));
      });
      setTimeout(() => {
        logger.warn('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, _promise) => {
      logger.error('Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: serverConfig.isDev && reason instanceof Error ? reason.stack : undefined,
      });
      // Log and continue - process will exit naturally if this is fatal
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

start();
