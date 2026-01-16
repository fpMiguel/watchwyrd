/**
 * Watchwyrd - Rate Limiter Tests
 *
 * Tests for the per-API-key rate limiter that ensures
 * only one concurrent Gemini API request per key.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { geminiRateLimiter } from '../src/utils/rateLimiter.js';

describe('API Key Rate Limiter', () => {
  beforeEach(() => {
    geminiRateLimiter.clear();
  });

  describe('execute', () => {
    it('should execute a single request immediately', async () => {
      let executed = false;
      
      await geminiRateLimiter.execute('test-key-1', async () => {
        executed = true;
        return 'result';
      });
      
      expect(executed).toBe(true);
    });

    it('should return the result of the executed function', async () => {
      const result = await geminiRateLimiter.execute('test-key-2', async () => {
        return { data: 'test' };
      });
      
      expect(result).toEqual({ data: 'test' });
    });

    it('should serialize concurrent requests for the same API key', { timeout: 10000 }, async () => {
      const executionOrder: number[] = [];
      const apiKey = 'same-key';
      
      // Start 3 concurrent requests
      const promises = [
        geminiRateLimiter.execute(apiKey, async () => {
          executionOrder.push(1);
          await sleep(100);
          return 1;
        }),
        geminiRateLimiter.execute(apiKey, async () => {
          executionOrder.push(2);
          await sleep(100);
          return 2;
        }),
        geminiRateLimiter.execute(apiKey, async () => {
          executionOrder.push(3);
          await sleep(100);
          return 3;
        }),
      ];
      
      const results = await Promise.all(promises);
      
      // Requests should execute in order (serialized)
      expect(executionOrder).toEqual([1, 2, 3]);
      expect(results).toEqual([1, 2, 3]);
    });

    it('should allow parallel requests for different API keys', { timeout: 5000 }, async () => {
      const startTimes: Record<string, number> = {};
      const start = Date.now();
      
      // Start concurrent requests with different keys
      const promises = [
        geminiRateLimiter.execute('key-a', async () => {
          startTimes['a'] = Date.now() - start;
          await sleep(100);
          return 'a';
        }),
        geminiRateLimiter.execute('key-b', async () => {
          startTimes['b'] = Date.now() - start;
          await sleep(100);
          return 'b';
        }),
        geminiRateLimiter.execute('key-c', async () => {
          startTimes['c'] = Date.now() - start;
          await sleep(100);
          return 'c';
        }),
      ];
      
      await Promise.all(promises);
      
      // All requests should start within ~50ms of each other (parallel)
      const times = Object.values(startTimes);
      const maxDiff = Math.max(...times) - Math.min(...times);
      expect(maxDiff).toBeLessThan(100);
    });

    it('should propagate errors from the executed function', async () => {
      await expect(
        geminiRateLimiter.execute('error-key', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });

    it('should release the lock after an error', async () => {
      const apiKey = 'error-release-key';
      
      // First request throws
      await expect(
        geminiRateLimiter.execute(apiKey, async () => {
          throw new Error('First error');
        })
      ).rejects.toThrow();
      
      // Second request should still work
      const result = await geminiRateLimiter.execute(apiKey, async () => {
        return 'success after error';
      });
      
      expect(result).toBe('success after error');
    });
  });

  describe('getStats', () => {
    it('should report zero active keys initially', () => {
      const stats = geminiRateLimiter.getStats();
      expect(stats.activeKeys).toBe(0);
      expect(stats.totalQueued).toBe(0);
    });

    it('should track active keys', async () => {
      // Start a request that takes time
      const promise = geminiRateLimiter.execute('stats-key', async () => {
        await sleep(100);
        return true;
      });
      
      // Check stats while request is in progress
      await sleep(10);
      const stats = geminiRateLimiter.getStats();
      expect(stats.activeKeys).toBe(1);
      
      await promise;
    });
  });

  describe('clear', () => {
    it('should clear all state', async () => {
      // Create some state
      await geminiRateLimiter.execute('clear-key', async () => 'done');
      
      // Clear it
      geminiRateLimiter.clear();
      
      const stats = geminiRateLimiter.getStats();
      expect(stats.activeKeys).toBe(0);
    });

    it('should reject queued requests when cleared', { timeout: 5000 }, async () => {
      const apiKey = 'clear-queue-key';
      
      // Start a long request
      const longRequest = geminiRateLimiter.execute(apiKey, async () => {
        await sleep(1000);
        return 'long';
      });
      
      // Queue another request
      await sleep(10);
      const queuedRequest = geminiRateLimiter.execute(apiKey, async () => {
        return 'queued';
      });
      
      // Clear while requests are in progress
      await sleep(20);
      geminiRateLimiter.clear();
      
      // Queued request should be rejected
      await expect(queuedRequest).rejects.toThrow('Rate limiter cleared');
      
      // Long request may still complete or error depending on timing
    });
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
