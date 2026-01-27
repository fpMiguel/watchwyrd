/**
 * Watchwyrd - Logger (pino-based)
 *
 * High-performance structured logging with built-in redaction.
 * Uses pino for speed and pino-pretty for development readability.
 */

import pino from 'pino';

/**
 * API key patterns to redact from error message strings
 * These patterns catch common API key formats that might appear in error messages
 */
const API_KEY_PATTERNS: [RegExp, string][] = [
  [/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_OPENAI_KEY]'], // OpenAI
  [/pplx-[a-zA-Z0-9]{20,}/g, '[REDACTED_PERPLEXITY_KEY]'], // Perplexity
  [/AIza[a-zA-Z0-9_-]{35}/g, '[REDACTED_GOOGLE_KEY]'], // Google API keys
  [/key=[a-zA-Z0-9_-]{20,}/gi, 'key=[REDACTED]'], // Generic key= in URLs
];

/**
 * Redact API keys from a string (for error messages)
 */
function redactApiKeys(value: string): string {
  let result = value;
  for (const [pattern, replacement] of API_KEY_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Recursively redact API keys from object values (strings only)
 */
function redactApiKeysFromObject(obj: object): object {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = redactApiKeys(value);
    } else if (value !== null && typeof value === 'object') {
      result[key] = redactApiKeysFromObject(value as object);
    } else {
      result[key] = value;
    }
  }
  return result;
}

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
 * Applies API key pattern redaction to all log metadata
 */
export const logger = {
  debug(message: string, meta?: object): void {
    const safeMeta = meta ? redactApiKeysFromObject(meta) : undefined;
    if (safeMeta) {
      pinoLogger.debug(safeMeta, message);
    } else {
      pinoLogger.debug(message);
    }
  },

  info(message: string, meta?: object): void {
    const safeMeta = meta ? redactApiKeysFromObject(meta) : undefined;
    if (safeMeta) {
      pinoLogger.info(safeMeta, message);
    } else {
      pinoLogger.info(message);
    }
  },

  warn(message: string, meta?: object): void {
    const safeMeta = meta ? redactApiKeysFromObject(meta) : undefined;
    if (safeMeta) {
      pinoLogger.warn(safeMeta, message);
    } else {
      pinoLogger.warn(message);
    }
  },

  error(message: string, meta?: object): void {
    const safeMeta = meta ? redactApiKeysFromObject(meta) : undefined;
    if (safeMeta) {
      pinoLogger.error(safeMeta, message);
    } else {
      pinoLogger.error(message);
    }
  },

  /** Access underlying pino instance for advanced use */
  child: pinoLogger.child.bind(pinoLogger),
};
