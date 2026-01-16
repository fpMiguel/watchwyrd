/**
 * Watchwyrd - Simple Logger
 *
 * A lightweight logger with levels and structured output.
 * Privacy-focused: In production, sensitive data is redacted.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Check if running in production
 */
function isProduction(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

/**
 * Get current log level (lazy to avoid import issues during tests)
 */
function getCurrentLevel(): number {
  try {
    const level = (process.env['LOG_LEVEL'] as LogLevel) || 'info';
    return LOG_LEVELS[level] ?? LOG_LEVELS.info;
  } catch {
    return LOG_LEVELS.info;
  }
}

/**
 * Sensitive field patterns to redact in production
 */
const SENSITIVE_PATTERNS = [
  /apiKey/i,
  /api_key/i,
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /credential/i,
  /key$/i,
];

/**
 * Check if a field name is sensitive
 */
function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(fieldName));
}

/**
 * Redact sensitive values in metadata for production logging
 * In development, all data is logged for debugging
 */
function sanitizeMetadata(meta: object | undefined): object | undefined {
  if (!meta || !isProduction()) {
    return meta;
  }

  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(meta)) {
    if (isSensitiveField(key)) {
      // Redact sensitive fields but indicate they were present
      if (typeof value === 'string' && value.length > 0) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value ? '[REDACTED]' : value;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeMetadata(value as object);
    } else if (typeof value === 'string' && value.length > 200) {
      // Truncate very long strings in production (could contain sensitive data)
      sanitized[key] = value.substring(0, 100) + '...[truncated]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Format log message with timestamp and level
 */
function formatMessage(level: LogLevel, message: string, meta?: object): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  const sanitizedMeta = sanitizeMetadata(meta);
  
  if (sanitizedMeta && Object.keys(sanitizedMeta).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(sanitizedMeta)}`;
  }
  return `${prefix} ${message}`;
}

/**
 * Logger interface
 */
export const logger = {
  debug(message: string, meta?: object): void {
    if (LOG_LEVELS.debug >= getCurrentLevel()) {
      console.debug(formatMessage('debug', message, meta));
    }
  },

  info(message: string, meta?: object): void {
    if (LOG_LEVELS.info >= getCurrentLevel()) {
      console.info(formatMessage('info', message, meta));
    }
  },

  warn(message: string, meta?: object): void {
    if (LOG_LEVELS.warn >= getCurrentLevel()) {
      console.warn(formatMessage('warn', message, meta));
    }
  },

  error(message: string, meta?: object): void {
    if (LOG_LEVELS.error >= getCurrentLevel()) {
      console.error(formatMessage('error', message, meta));
    }
  },
};
