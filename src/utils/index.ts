/**
 * Watchwyrd - Utility Functions
 *
 * Common utility functions used throughout the application.
 * Uses p-retry for robust retry logic with exponential backoff.
 */

import pRetry, { AbortError } from 'p-retry';

export * from './logger.js';
export * from './cleanup.js';
export * from './clientPool.js';
export * from './lruCache.js';
export * from './inFlightTracker.js';

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
 * Retry options matching previous API
 */
interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, delay: number, error: Error) => void;
}

/**
 * Retry a function with exponential backoff and API-aware delays
 * Uses p-retry under the hood for robust retry handling
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts = 3, baseDelay = 1000, maxDelay = 60000, onRetry } = options;

  return pRetry(
    async () => {
      try {
        return await fn();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Don't retry non-retryable errors
        if (!isRetryableError(err)) {
          throw new AbortError(err.message);
        }

        throw err;
      }
    },
    {
      retries: maxAttempts - 1, // p-retry counts retries, not attempts
      minTimeout: baseDelay,
      maxTimeout: maxDelay,
      factor: 2, // Exponential backoff
      onFailedAttempt: (context) => {
        // Try to extract API-specified retry delay for next attempt
        const apiDelay = extractRetryDelay(context.error.message);

        if (onRetry) {
          const delay = apiDelay || baseDelay * Math.pow(2, context.attemptNumber - 1);
          onRetry(context.attemptNumber, Math.min(delay, maxDelay), context.error);
        }
      },
    }
  );
}
