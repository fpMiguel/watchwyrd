/**
 * Watchwyrd - API Key Rate Limiter (bottleneck-based)
 *
 * Ensures only ONE concurrent request per Gemini API key.
 * Uses bottleneck for robust rate limiting with clustering support.
 *
 * This prevents hitting rate limits when multiple catalog requests
 * arrive simultaneously for the same user.
 */

import Bottleneck from 'bottleneck';
import { logger } from './logger.js';

// Types

interface LimiterEntry {
  limiter: Bottleneck;
  lastUsed: number;
}

// API Key Rate Limiter

/**
 * Per-API-key rate limiter using bottleneck
 * Ensures only one request is processed at a time per API key
 */
class ApiKeyRateLimiter {
  private limiters = new Map<string, LimiterEntry>();
  private readonly minTime: number;
  private readonly maxKeys: number;
  private readonly keyTtlMs: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(minDelayMs = 1000, maxKeys = 1000, keyTtlMs = 60 * 60 * 1000) {
    this.minTime = minDelayMs;
    this.maxKeys = maxKeys;
    this.keyTtlMs = keyTtlMs;

    // Cleanup stale limiters every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupStaleLimiters(), 5 * 60 * 1000);
  }

  /**
   * Hash API key for privacy-safe logging and Map keys
   */
  private hashKey(apiKey: string): string {
    let hash = 0;
    for (let i = 0; i < apiKey.length; i++) {
      const char = apiKey.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `key_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Get or create a limiter for an API key
   */
  private getLimiter(apiKey: string): Bottleneck {
    const keyHash = this.hashKey(apiKey);

    const existing = this.limiters.get(keyHash);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing.limiter;
    }

    // Evict old limiters if needed
    this.evictOldestLimiters();

    // Create new limiter with:
    // - maxConcurrent: 1 (only one request at a time per key)
    // - minTime: minimum time between requests
    // - reservoir: unlimited (we control via concurrency)
    const limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: this.minTime,
      highWater: 50, // Max queue size
      strategy: Bottleneck.strategy.OVERFLOW, // Reject when queue is full
    });

    // Set up event listeners
    limiter.on('error', (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Rate limiter error', { keyHash, error: message });
    });

    limiter.on('dropped', () => {
      logger.warn('Rate limiter: request dropped (queue full)', { keyHash });
    });

    this.limiters.set(keyHash, {
      limiter,
      lastUsed: Date.now(),
    });

    logger.debug('Created new rate limiter', { keyHash });

    return limiter;
  }

  /**
   * Remove limiters that haven't been used recently
   */
  private cleanupStaleLimiters(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.limiters.entries()) {
      if (now - entry.lastUsed > this.keyTtlMs) {
        // Stop the limiter gracefully
        entry.limiter.stop({ dropWaitingJobs: false }).catch(() => {});
        this.limiters.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cleaned up stale rate limiters', {
        cleaned,
        remaining: this.limiters.size,
      });
    }
  }

  /**
   * Evict oldest limiters if we exceed maxKeys
   */
  private evictOldestLimiters(): void {
    if (this.limiters.size <= this.maxKeys) return;

    const entries = [...this.limiters.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed);

    const toRemove = this.limiters.size - this.maxKeys;
    for (let i = 0; i < Math.min(toRemove, entries.length); i++) {
      const entry = entries[i];
      if (entry) {
        entry[1].limiter.stop({ dropWaitingJobs: true }).catch(() => {});
        this.limiters.delete(entry[0]);
      }
    }

    logger.warn('Evicted old rate limiters', {
      evicted: toRemove,
      remaining: this.limiters.size,
    });
  }

  /**
   * Execute a function with rate limiting for the given API key.
   * Only one execution per API key at a time.
   */
  async execute<T>(apiKey: string, fn: () => Promise<T>): Promise<T> {
    const limiter = this.getLimiter(apiKey);
    const keyHash = this.hashKey(apiKey);

    try {
      return await limiter.schedule({ priority: 5 }, async () => {
        logger.debug('Rate limiter: executing request', { keyHash });
        return fn();
      });
    } catch (error) {
      // Check if it's a queue overflow error
      if (error instanceof Error && error.message.includes('This job has been dropped')) {
        logger.warn('Rate limiter: queue full, rejecting request', { keyHash });
        throw new Error('Rate limit exceeded: too many pending requests');
      }
      throw error;
    }
  }

  /**
   * Get stats about current rate limiter state
   */
  getStats(): { activeKeys: number; totalQueued: number } {
    let totalQueued = 0;
    for (const entry of this.limiters.values()) {
      const counts = entry.limiter.counts();
      totalQueued += counts.QUEUED + counts.RUNNING;
    }
    return {
      activeKeys: this.limiters.size,
      totalQueued,
    };
  }

  /**
   * Clear all limiters for cleanup
   */
  async clear(): Promise<void> {
    const stopPromises: Promise<void>[] = [];

    for (const entry of this.limiters.values()) {
      stopPromises.push(entry.limiter.stop({ dropWaitingJobs: true }).then(() => {}));
    }

    await Promise.all(stopPromises);
    this.limiters.clear();

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    logger.debug('Rate limiter: cleared all state');
  }

  /**
   * Synchronous clear for compatibility
   */
  clearSync(): void {
    for (const entry of this.limiters.values()) {
      entry.limiter.stop({ dropWaitingJobs: true }).catch(() => {});
    }
    this.limiters.clear();

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Global rate limiter instance for Gemini API calls
 * Enforces minimum 1 second between requests per API key
 */
export const geminiRateLimiter = new ApiKeyRateLimiter(1000);
