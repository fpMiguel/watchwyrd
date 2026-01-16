/**
 * Watchwyrd - Logger (pino-based)
 *
 * High-performance structured logging with built-in redaction.
 * Uses pino for speed and pino-pretty for development readability.
 */

import pino from 'pino';

/**
 * Sensitive paths to redact in all environments
 * Pino uses dot-notation paths for nested redaction
 */
const REDACT_PATHS = [
  // Credentials
  'apiKey',
  'geminiApiKey',
  'perplexityApiKey',
  'rpdbApiKey',
  'api_key',
  'password',
  'secret',
  'token',
  'authorization',
  'credential',
  // Location privacy
  'latitude',
  'longitude',
  'coords',
  'location.latitude',
  'location.longitude',
  'weatherLocation.latitude',
  'weatherLocation.longitude',
  // Search/query privacy
  'query',
  'searchQuery',
  // Nested patterns
  '*.apiKey',
  '*.api_key',
  '*.password',
  '*.secret',
  '*.token',
  '*.latitude',
  '*.longitude',
];

/**
 * Determine log level from environment
 */
function getLogLevel(): string {
  return process.env['LOG_LEVEL'] || 'info';
}

/**
 * Check if running in production
 */
function isProduction(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

/**
 * Create pino logger instance
 */
function createLogger(): pino.Logger {
  const level = getLogLevel();

  // Base options for all environments
  const baseOptions: pino.LoggerOptions = {
    level,
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    // Custom timestamp format matching previous logger
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
  };

  if (isProduction()) {
    // Production: JSON output for log aggregation
    return pino(baseOptions);
  }

  // Development: Pretty print for readability
  return pino({
    ...baseOptions,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  });
}

// Create singleton logger instance
const pinoLogger = createLogger();

/**
 * Logger interface (maintains compatibility with existing code)
 */
export const logger = {
  debug(message: string, meta?: object): void {
    if (meta) {
      pinoLogger.debug(meta, message);
    } else {
      pinoLogger.debug(message);
    }
  },

  info(message: string, meta?: object): void {
    if (meta) {
      pinoLogger.info(meta, message);
    } else {
      pinoLogger.info(message);
    }
  },

  warn(message: string, meta?: object): void {
    if (meta) {
      pinoLogger.warn(meta, message);
    } else {
      pinoLogger.warn(message);
    }
  },

  error(message: string, meta?: object): void {
    if (meta) {
      pinoLogger.error(meta, message);
    } else {
      pinoLogger.error(message);
    }
  },

  /** Access underlying pino instance for advanced use */
  child: pinoLogger.child.bind(pinoLogger),
};
