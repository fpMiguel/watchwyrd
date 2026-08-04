/**
 * Watchwyrd - Logger (pino-based)
 *
 * High-performance structured logging with built-in redaction.
 * Uses pino for speed and pino-pretty for development readability.
 */

import pino from 'pino';

/**
 * Sensitive patterns to redact from log strings
 * Includes API keys and encrypted config tokens (which are effectively bearer tokens)
 */
const SENSITIVE_PATTERNS: [RegExp, string][] = [
  // API keys
  [/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_OPENAI_KEY]'], // OpenAI
  [/pplx-[a-zA-Z0-9]{20,}/g, '[REDACTED_PERPLEXITY_KEY]'], // Perplexity
  [/AIza[a-zA-Z0-9_-]{35}/g, '[REDACTED_GOOGLE_KEY]'], // Google API keys
  [/key=[a-zA-Z0-9_-]{20,}/gi, 'key=[REDACTED]'], // Generic key= in URLs
  // Encrypted config tokens (bearer tokens that could be replayed)
  [/enc\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_CONFIG]'], // enc.xxx tokens
];

/**
 * Redact sensitive patterns from a string (API keys, encrypted configs)
 */
function redactSensitiveData(value: string): string {
  let result = value;
  for (const [pattern, replacement] of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Prevent log injection: strip CR/LF from log messages.
 * CodeQL js/log-injection only recognizes `replace`-based sanitizers when the
 * replacement is the empty string and the regex matches a newline.
 */
function sanitizeLogMessage(message: string): string {
  return message.replace(/\r|\n/g, '');
}

/**
 * Sanitize a single log string: redact sensitive patterns and strip line breaks.
 */
function sanitizeLogString(value: string): string {
  return sanitizeLogMessage(redactSensitiveData(value));
}

/**
 * Recursively redact API keys from object values (strings only)
 * Handles arrays properly to preserve their structure
 */
function redactSensitiveDataFromObject(obj: unknown): unknown {
  // Handle arrays separately to preserve array structure
  if (Array.isArray(obj)) {
    return obj.map((item: unknown): unknown => {
      if (typeof item === 'string') {
        return sanitizeLogString(item);
      } else if (item !== null && typeof item === 'object') {
        return redactSensitiveDataFromObject(item);
      }
      return item;
    });
  }

  if (obj !== null && typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    const entries: [string, unknown][] = Object.entries(record).map(([key, value]) => {
      if (typeof value === 'string') {
        return [key, sanitizeLogString(value)];
      }
      if (value !== null && typeof value === 'object') {
        return [key, redactSensitiveDataFromObject(value)];
      }
      return [key, value];
    });

    return Object.fromEntries(entries);
  }

  return obj;
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
  // Encrypted config (bearer tokens)
  'configStr',
  'config',
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
  '*.configStr',
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
    const safeMeta = meta ? redactSensitiveDataFromObject(meta) : undefined;
    if (safeMeta) {
      pinoLogger.debug(safeMeta, sanitizeLogMessage(message));
    } else {
      pinoLogger.debug(sanitizeLogMessage(message));
    }
  },

  info(message: string, meta?: object): void {
    const safeMeta = meta ? redactSensitiveDataFromObject(meta) : undefined;
    if (safeMeta) {
      pinoLogger.info(safeMeta, sanitizeLogMessage(message));
    } else {
      pinoLogger.info(sanitizeLogMessage(message));
    }
  },

  warn(message: string, meta?: object): void {
    const safeMeta = meta ? redactSensitiveDataFromObject(meta) : undefined;
    if (safeMeta) {
      pinoLogger.warn(safeMeta, sanitizeLogMessage(message));
    } else {
      pinoLogger.warn(sanitizeLogMessage(message));
    }
  },

  error(message: string, meta?: object): void {
    const safeMeta = meta ? redactSensitiveDataFromObject(meta) : undefined;
    if (safeMeta) {
      pinoLogger.error(safeMeta, sanitizeLogMessage(message));
    } else {
      pinoLogger.error(sanitizeLogMessage(message));
    }
  },

  /** Access underlying pino instance for advanced use */
  child: pinoLogger.child.bind(pinoLogger),
};
