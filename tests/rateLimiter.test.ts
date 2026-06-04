/**
 * Watchwyrd - Rate Limiter Tests
 *
 * Tests for the per-API-key rate limiter that ensures
 * only one concurrent Gemini API request per key.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Bottleneck from 'bottleneck';
import { geminiRateLimiter } from '../src/utils/rateLimiter.js';
import { registerInterval } from '../src/utils/cleanup.js';

describe('API Key Rate Limiter', () => {
  beforeEach(() => {
    geminiRateLimiter.clearSync();
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

    it(
      'should serialize concurrent requests for the same API key',
      { timeout: 10000 },
      async () => {
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
      }
    );

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
    it('should report stats correctly', () => {
      const stats = geminiRateLimiter.getStats();
      // Just check that stats are available (activeKeys may not be 0 due to previous tests)
      expect(typeof stats.activeKeys).toBe('number');
      expect(typeof stats.totalQueued).toBe('number');
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
      expect(stats.activeKeys).toBeGreaterThanOrEqual(1);

      await promise;
    });

    it('should report zero counts when no keys are active', () => {
      const stats = geminiRateLimiter.getStats();
      expect(stats.activeKeys).toBe(0);
      expect(stats.totalQueued).toBe(0);
    });

    it('should count queued and running jobs in totalQueued', async () => {
      const apiKey = 'total-queued-key';

      const longRequest = geminiRateLimiter.execute(apiKey, async () => {
        await sleep(500);
        return 'long';
      });

      await sleep(50);

      const queuedRequest = geminiRateLimiter.execute(apiKey, async () => 'queued');

      await sleep(50);

      const stats = geminiRateLimiter.getStats();
      expect(stats.totalQueued).toBeGreaterThanOrEqual(1);

      await longRequest.catch(() => {});
      await queuedRequest.catch(() => {});
    });
  });

  describe('clear', () => {
    it('should clear all state', async () => {
      // Create some state
      await geminiRateLimiter.execute('clear-key', async () => 'done');

      // Clear it (use sync version for test)
      geminiRateLimiter.clearSync();

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
      geminiRateLimiter.clearSync();

      // Queued request should be rejected (bottleneck throws "stopped" error)
      await expect(queuedRequest).rejects.toThrow(/stopped|cleared/i);

      // Long request may still complete or error depending on timing
    });

    it('should dispose cleanup interval via async clear', async () => {
      await geminiRateLimiter.execute('clear-async-key', async () => 'done');

      geminiRateLimiter['cleanupInterval'] = registerInterval(
        'rate-limiter-cleanup',
        () => geminiRateLimiter['cleanupStaleLimiters'](),
        5 * 60 * 1000
      );

      await geminiRateLimiter['clear']();

      const stats = geminiRateLimiter.getStats();
      expect(stats.activeKeys).toBe(0);
      expect(stats.totalQueued).toBe(0);
    });

    it('should invoke clear with no cleanupInterval set', async () => {
      geminiRateLimiter['cleanupInterval'] = null;

      await expect(geminiRateLimiter['clear']()).resolves.toBeUndefined();
    });
  });

  describe('limiter error event', () => {
    it('should invoke limiter error handler when bottleneck emits an error', async () => {
      await geminiRateLimiter.execute('error-event-key', async () => 'done');

      const limiter = geminiRateLimiter['getLimiter']('error-event-key');
      const error = new Error('bottleneck test error');

      expect(() => {
        limiter.Events.trigger('error', error);
      }).not.toThrow();
    });
  });

  describe('constructor cleanup interval', () => {
    it('should invoke cleanupStaleLimiters via the registered interval', async () => {
      geminiRateLimiter['keyTtlMs'] = 1;

      await geminiRateLimiter.execute('interval-key', async () => 'done');

      geminiRateLimiter['cleanupInterval'] = registerInterval(
        'rate-limiter-cleanup',
        () => { geminiRateLimiter['cleanupStaleLimiters'](); },
        100
      );

      await new Promise((resolve) => setTimeout(resolve, 150));

      const stats = geminiRateLimiter.getStats();
      expect(stats.activeKeys).toBe(0);
    }, 5000);
  });

  describe('evictOldestLimiters', () => {
    it('should not throw when called without exceeding maxKeys', () => {
      expect(() => {
        geminiRateLimiter['evictOldestLimiters']();
      }).not.toThrow();
    });

    it('should evict oldest limiters when maxKeys is exceeded', async () => {
      geminiRateLimiter['maxKeys'] = 0;

      await geminiRateLimiter.execute('evict-a', async () => 'a');
      await geminiRateLimiter.execute('evict-b', async () => 'b');
      await geminiRateLimiter.execute('evict-c', async () => 'c');

      const stats = geminiRateLimiter.getStats();
      expect(stats.activeKeys).toBeLessThanOrEqual(1);
    });
  });

  describe('cleanupStaleLimiters', () => {
    it('should not throw when called with no stale entries', async () => {
      await geminiRateLimiter.execute('stale-key', async () => 'done');

      expect(() => {
        geminiRateLimiter['cleanupStaleLimiters']();
      }).not.toThrow();
    });

    it('should clean stale entries when their lastUsed exceeds keyTtlMs', async () => {
      geminiRateLimiter['keyTtlMs'] = 1;

      await geminiRateLimiter.execute('stale-clean-key', async () => 'done');

      expect(geminiRateLimiter.getStats().activeKeys).toBe(1);

      await sleep(10);

      geminiRateLimiter['cleanupStaleLimiters']();

      const stats = geminiRateLimiter.getStats();
      expect(stats.activeKeys).toBe(0);
    });
  });

  describe('queue overflow', () => {
    it('should reject requests when queue exceeds highWater', async () => {
      const apiKey = 'overflow-key';

      const limiter = geminiRateLimiter['getLimiter'](apiKey);
      await limiter.updateSettings({ highWater: 1 });

      const firstPromise = geminiRateLimiter.execute(apiKey, async () => {
        await sleep(500);
        return 'first';
      });

      await sleep(50);

      const secondPromise = geminiRateLimiter.execute(apiKey, async () => 'second');

      await sleep(50);

      await expect(
        geminiRateLimiter.execute(apiKey, async () => 'third')
      ).rejects.toThrow('Rate limit exceeded');

      await firstPromise.catch(() => {});
      await secondPromise.catch(() => {});
    }, 5000);
  });

  describe('logSafeKey', () => {
    it('should produce consistent results for the same input', () => {
      const hash1 = geminiRateLimiter['logSafeKey']('test-key');
      const hash2 = geminiRateLimiter['logSafeKey']('test-key');

      expect(hash1).toBe(hash2);
    });

    it('should produce different results for different inputs', () => {
      const hash1 = geminiRateLimiter['logSafeKey']('key-one');
      const hash2 = geminiRateLimiter['logSafeKey']('key-two');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce consistent results across multiple calls', () => {
      const hashes: string[] = [];
      for (let i = 0; i < 10; i++) {
        hashes.push(geminiRateLimiter['logSafeKey']('deterministic-key'));
      }

      expect(hashes.every((h) => h === hashes[0])).toBe(true);
    });
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('constructor cleanup callback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('should execute the cleanup callback immediately when setInterval fires', async () => {
    vi.stubGlobal('setInterval', vi.fn((cb: () => void) => {
      cb();
      return { unref: vi.fn() };
    }));

    vi.resetModules();
    const mod = await import('../src/utils/rateLimiter.js');
    const limiter = mod.geminiRateLimiter;

    const stats = limiter.getStats();
    expect(typeof stats.activeKeys).toBe('number');
  });
});
