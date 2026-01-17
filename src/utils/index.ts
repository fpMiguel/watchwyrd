/**
 * Watchwyrd - Utility Functions
 *
 * Common utility functions used throughout the application.
 */

export * from './logger.js';

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract retry delay from Gemini API error message
 * Returns delay in milliseconds, or null if not found
 *
 * Parses formats like:
 * - "retryDelay":"28s"
 * - "retry in 25.669974471s"
 * - "Please retry in 14.782958712s"
 */
export function extractRetryDelay(errorMessage: string): number | null {
  // Pattern for "retryDelay":"28s" or "retryDelay": "28s"
  const retryDelayPattern = /retryDelay["']?\s*[":]\s*["']?(\d+)s?["']?/i;
  const match1 = errorMessage.match(retryDelayPattern);
  if (match1?.[1]) {
    const seconds = parseInt(match1[1], 10);
    if (!isNaN(seconds) && seconds > 0) {
      // Add 5 second buffer to be safe
      return (seconds + 5) * 1000;
    }
  }

  // Pattern for "retry in X.XXXs" or "Please retry in X.XXXs"
  const retryInPattern = /retry in (\d+\.?\d*)/i;
  const match2 = errorMessage.match(retryInPattern);
  if (match2?.[1]) {
    const seconds = parseFloat(match2[1]);
    if (!isNaN(seconds) && seconds > 0) {
      // Add 5 second buffer to be safe
      return Math.ceil(seconds + 5) * 1000;
    }
  }

  return null;
}

/**
 * Check if error is a rate limit / quota error that should be retried
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('429') ||
    message.includes('rate') ||
    message.includes('quota') ||
    message.includes('too many requests') ||
    message.includes('resource exhausted') ||
    message.includes('503') ||
    message.includes('service unavailable')
  );
}

/**
 * Retry a function with exponential backoff and API-aware delays
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, delay: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelay = 1000, maxDelay = 60000, onRetry } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        break;
      }

      // Only retry on retryable errors
      if (!isRetryableError(lastError)) {
        throw lastError;
      }

      // Try to extract API-specified retry delay
      let delay = extractRetryDelay(lastError.message);

      // Fall back to exponential backoff if no API delay specified
      if (!delay) {
        delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      }

      // Cap the delay
      delay = Math.min(delay, maxDelay);

      if (onRetry) {
        onRetry(attempt, delay, lastError);
      }

      await sleep(delay);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Safely parse JSON with a default value
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Truncate string to specified length
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Check if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Remove undefined values from an object
 */
export function compact<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined)) as T;
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate a random ID
 */
export function randomId(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}
