/**
 * Watchwyrd - Main Entry Point
 *
 * Initializes and starts the Stremio addon server.
 */

import express from 'express';
import cors from 'cors';
import { serverConfig } from './config/server.js';
import { createCache, closeCache } from './cache/index.js';
import { createStremioRoutes, createConfigureRoutes } from './handlers/index.js';
import { logger } from './utils/logger.js';
import { ADDON_VERSION } from './addon/manifest.js';
import { generalLimiter, strictLimiter } from './middleware/rateLimiters.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Create and configure the Express application
 */
async function createApp(): Promise<express.Application> {
  const app = express();

  // ==========================================================================
  // Security Headers (Global)
  // ==========================================================================

  app.use((_req, res, next) => {
    // Prevent MIME-type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Disable unnecessary browser features
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    // Global CSP - restrictive default for API routes
    // (Configure routes override with more permissive CSP for wizard UI)
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'"
    );
    next();
  });

  // ==========================================================================
  // Middleware
  // ==========================================================================

  // CORS - Allow all origins (required for Stremio addon compatibility)
  // Stremio app makes cross-origin requests to addon servers
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: false, // Explicitly disable credentials
    })
  );

  // Parse JSON and URL-encoded bodies
  app.use(express.json({ limit: '100kb' })); // Limit body size
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // Request logging - INFO level to see all Stremio requests
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      userAgent: req.headers['user-agent']?.substring(0, 50),
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
    });
    next();
  });

  // ==========================================================================
  // Static Files
  // ==========================================================================

  app.use('/static', express.static(path.join(__dirname, 'web/public')));

  // ==========================================================================
  // Routes
  // ==========================================================================

  // Health check (no rate limit)
  app.get('/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: 'healthy',
      version: ADDON_VERSION,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Configure page (strict rate limit - handles API keys)
  app.use('/configure', strictLimiter, createConfigureRoutes());

  // Redirect root to configure
  app.get('/', (_req, res) => {
    res.redirect('/configure');
  });

  // Stremio addon routes (general rate limit)
  app.use('/', generalLimiter, createStremioRoutes());

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Unhandled error', { error: err.message, stack: err.stack });
      res.status(500).json({ error: 'Internal server error' });
    }
  );

  return app;
}

/**
 * Start the server
 */
async function start(): Promise<void> {
  logger.info('Starting Watchwyrd...', {
    version: ADDON_VERSION,
    env: serverConfig.nodeEnv,
  });

  try {
    // Initialize cache
    await createCache();

    // Create app
    const app = await createApp();

    // Start listening
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

    // Graceful shutdown
    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down...`);

      server.close(() => {
        closeCache()
          .then(() => {
            logger.info('Server stopped');
            process.exit(0);
          })
          .catch(() => process.exit(1));
      });

      // Force exit after timeout
      setTimeout(() => {
        logger.warn('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Run
start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
