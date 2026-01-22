/**
 * Retry Logic Tests
 *
 * Tests for retry utilities:
 * - extractRetryDelay
 * - isRetryableError
 * - retry function
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractRetryDelay, isRetryableError, retry } from '../src/utils/index.js';

describe('extractRetryDelay', () => {
  describe('retryDelay format', () => {
    it('should extract delay from retryDelay":"28s" format', () => {
      const message = 'Error: {"retryDelay":"28s"}';
      const delay = extractRetryDelay(message);

      // 28 seconds + 5 second buffer = 33 seconds = 33000ms
      expect(delay).toBe(33000);
    });

    it('should extract delay from retryDelay": "28s" format with space', () => {
      const message = 'Error: retryDelay": "28s"';
      const delay = extractRetryDelay(message);

      expect(delay).toBe(33000);
    });

    it('should extract delay from retryDelay:28s format without quotes', () => {
      const message = 'Error: retryDelay:28s';
      const delay = extractRetryDelay(message);

      expect(delay).toBe(33000);
    });

    it('should handle single quotes', () => {
      const message = "Error: {'retryDelay':'15s'}";
      const delay = extractRetryDelay(message);

      // 15 + 5 = 20 seconds = 20000ms
      expect(delay).toBe(20000);
    });
  });

  describe('retry in format', () => {
    it('should extract delay from "retry in 25.669974471s" format', () => {
      const message = 'Rate limited. Please retry in 25.669974471s';
      const delay = extractRetryDelay(message);

      // ceil(25.67 + 5) = 31 seconds = 31000ms
      expect(delay).toBe(31000);
    });

    it('should extract delay from "Please retry in 14.782958712s" format', () => {
      const message = 'Resource exhausted. Please retry in 14.782958712s';
      const delay = extractRetryDelay(message);

      // ceil(14.78 + 5) = 20 seconds = 20000ms
      expect(delay).toBe(20000);
    });

    it('should handle whole numbers in retry in format', () => {
      const message = 'Please retry in 10 seconds';
      const delay = extractRetryDelay(message);

      // ceil(10 + 5) = 15 seconds = 15000ms
      expect(delay).toBe(15000);
    });
  });

  describe('edge cases', () => {
    it('should return null for message without delay', () => {
      const message = 'Generic error message';
      expect(extractRetryDelay(message)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(extractRetryDelay('')).toBeNull();
    });

    it('should return null for zero delay', () => {
      const message = 'retryDelay":"0s"';
      expect(extractRetryDelay(message)).toBeNull();
    });

    it('should return null for negative number (invalid)', () => {
      // The regex won't match negative numbers since it looks for \d+
      const message = 'retry in -5s';
      expect(extractRetryDelay(message)).toBeNull();
    });

    it('should prefer retryDelay format when both are present', () => {
      const message = 'retryDelay":"10s" and retry in 20s';
      const delay = extractRetryDelay(message);

      // Should use retryDelay format (10 + 5 = 15 seconds)
      expect(delay).toBe(15000);
    });
  });
});

describe('isRetryableError', () => {
  it('should return true for 429 status code', () => {
    const error = new Error('Request failed with status 429');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for rate limit errors', () => {
    const error = new Error('Rate limit exceeded');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for quota errors', () => {
    const error = new Error('Quota exceeded for this API');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for too many requests', () => {
    const error = new Error('Too many requests, slow down');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for resource exhausted', () => {
    const error = new Error('Resource exhausted');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for 503 status code', () => {
    const error = new Error('Request failed with status 503');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for service unavailable', () => {
    const error = new Error('Service unavailable, try again later');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should be case insensitive', () => {
    const error = new Error('RATE LIMIT EXCEEDED');
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return false for generic errors', () => {
    const error = new Error('Something went wrong');
    expect(isRetryableError(error)).toBe(false);
  });

  it('should return false for validation errors', () => {
    const error = new Error('Invalid API key');
    expect(isRetryableError(error)).toBe(false);
  });

  it('should return false for 404 errors', () => {
    const error = new Error('Resource not found (404)');
    expect(isRetryableError(error)).toBe(false);
  });

  it('should return false for 400 errors', () => {
    const error = new Error('Bad request (400)');
    expect(isRetryableError(error)).toBe(false);
  });
});

describe('retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const resultPromise = retry(fn);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('429 rate limit'))
      .mockRejectedValueOnce(new Error('429 rate limit'))
      .mockResolvedValue('success');

    const resultPromise = retry(fn, { maxAttempts: 3, baseDelay: 100 });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Invalid API key'));

    await expect(retry(fn, { maxAttempts: 3 })).rejects.toThrow('Invalid API key');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throw after max attempts exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('429 rate limit'));

    const resultPromise = retry(fn, { maxAttempts: 3, baseDelay: 100 });

    // Run timers and catch the expected rejection
    const [, error] = await Promise.all([
      vi.runAllTimersAsync(),
      resultPromise.catch((e: Error) => e),
    ]);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('429 rate limit');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should call onRetry callback on each retry', async () => {
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('quota exceeded'))
      .mockResolvedValue('success');

    const resultPromise = retry(fn, { maxAttempts: 2, baseDelay: 100, onRetry });
    await vi.runAllTimersAsync();
    await resultPromise;

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Number), expect.any(Error));
  });

  it('should use default options when not specified', async () => {
    const fn = vi.fn().mockResolvedValue('result');

    const resultPromise = retry(fn);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe('result');
  });

  it('should respect maxDelay option', async () => {
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('rate limit'))
      .mockRejectedValueOnce(new Error('rate limit'))
      .mockResolvedValue('success');

    const resultPromise = retry(fn, {
      maxAttempts: 3,
      baseDelay: 50000,
      maxDelay: 1000,
      onRetry,
    });
    await vi.runAllTimersAsync();
    await resultPromise;

    // Delay should be capped at maxDelay
    const lastCall = onRetry.mock.calls[onRetry.mock.calls.length - 1] as [number, number, Error];
    expect(lastCall[1]).toBeLessThanOrEqual(1000);
  });

  it('should convert non-Error throws to Error', async () => {
    const fn = vi.fn().mockRejectedValue('string error');

    await expect(retry(fn, { maxAttempts: 1 })).rejects.toThrow('string error');
  });
});
