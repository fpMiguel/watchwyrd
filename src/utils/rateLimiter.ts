/**
 * Watchwyrd - API Key Rate Limiter
 *
 * Ensures only ONE concurrent request per Gemini API key.
 * This prevents hitting rate limits when multiple catalog requests
 * arrive simultaneously for the same user.
 *
 * Uses a queue-based approach: if a request is in progress for an API key,
 * subsequent requests wait until it completes.
 */

import { logger } from './logger.js';

/**
 * Queue entry for pending requests
 */
interface QueueEntry {
  resolve: (value: void) => void;
  reject: (error: Error) => void;
}

/**
 * Rate limiter state per API key
 */
interface KeyState {
  /** Whether a request is currently in progress */
  inProgress: boolean;
  /** Queue of waiting requests */
  queue: QueueEntry[];
  /** Timestamp of last request completion */
  lastRequestTime: number;
}

/**
 * Per-API-key rate limiter
 * Ensures only one request is processed at a time per API key
 */
class ApiKeyRateLimiter {
  private keyStates = new Map<string, KeyState>();
  private readonly minDelayBetweenRequests: number;

  constructor(minDelayMs = 1000) {
    this.minDelayBetweenRequests = minDelayMs;
  }

  /**
   * Get or create state for an API key
   */
  private getKeyState(apiKey: string): KeyState {
    // Use hash of API key for privacy in logs
    const keyHash = this.hashKey(apiKey);

    if (!this.keyStates.has(keyHash)) {
      this.keyStates.set(keyHash, {
        inProgress: false,
        queue: [],
        lastRequestTime: 0,
      });
    }
    return this.keyStates.get(keyHash)!;
  }

  /**
   * Hash API key for privacy-safe logging
   */
  private hashKey(apiKey: string): string {
    // Simple hash for internal tracking - not cryptographic
    let hash = 0;
    for (let i = 0; i < apiKey.length; i++) {
      const char = apiKey.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `key_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Acquire a slot to make a request for this API key.
   * If another request is in progress, this will wait.
   */
  async acquire(apiKey: string): Promise<void> {
    const state = this.getKeyState(apiKey);
    const keyHash = this.hashKey(apiKey);

    if (!state.inProgress) {
      // No request in progress - check minimum delay
      const timeSinceLastRequest = Date.now() - state.lastRequestTime;
      if (timeSinceLastRequest < this.minDelayBetweenRequests) {
        const waitTime = this.minDelayBetweenRequests - timeSinceLastRequest;
        logger.debug('Rate limiter: enforcing minimum delay', { keyHash, waitMs: waitTime });
        await this.sleep(waitTime);
      }

      state.inProgress = true;
      logger.debug('Rate limiter: acquired slot', { keyHash, queueLength: 0 });
      return;
    }

    // Request in progress - add to queue and wait
    logger.debug('Rate limiter: queuing request', { keyHash, queueLength: state.queue.length + 1 });

    return new Promise<void>((resolve, reject) => {
      state.queue.push({ resolve, reject });
    });
  }

  /**
   * Release the slot after a request completes.
   * This will process the next queued request if any.
   */
  release(apiKey: string): void {
    const state = this.getKeyState(apiKey);
    const keyHash = this.hashKey(apiKey);

    state.lastRequestTime = Date.now();

    if (state.queue.length > 0) {
      // Process next queued request
      const next = state.queue.shift()!;
      logger.debug('Rate limiter: processing queued request', {
        keyHash,
        remainingQueue: state.queue.length,
      });

      // Small delay before allowing next request
      setTimeout(() => {
        next.resolve();
      }, this.minDelayBetweenRequests);
    } else {
      // No more queued requests
      state.inProgress = false;
      logger.debug('Rate limiter: released slot', { keyHash });
    }
  }

  /**
   * Release with error - reject all queued requests
   */
  releaseWithError(apiKey: string, error: Error): void {
    const state = this.getKeyState(apiKey);
    const keyHash = this.hashKey(apiKey);

    state.lastRequestTime = Date.now();
    state.inProgress = false;

    // Reject all queued requests with the same error
    const queueLength = state.queue.length;
    while (state.queue.length > 0) {
      const entry = state.queue.shift()!;
      entry.reject(error);
    }

    if (queueLength > 0) {
      logger.debug('Rate limiter: rejected queued requests', { keyHash, count: queueLength });
    }
  }

  /**
   * Execute a function with rate limiting for the given API key.
   * Only one execution per API key at a time.
   */
  async execute<T>(apiKey: string, fn: () => Promise<T>): Promise<T> {
    await this.acquire(apiKey);

    try {
      const result = await fn();
      this.release(apiKey);
      return result;
    } catch (error) {
      // On error, release but don't process queue immediately
      // This prevents cascading failures
      this.releaseWithError(apiKey, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get stats about current rate limiter state
   */
  getStats(): { activeKeys: number; totalQueued: number } {
    let totalQueued = 0;
    for (const state of this.keyStates.values()) {
      totalQueued += state.queue.length;
    }
    return {
      activeKeys: this.keyStates.size,
      totalQueued,
    };
  }

  /**
   * Clear state for cleanup
   */
  clear(): void {
    // Reject all pending requests
    for (const state of this.keyStates.values()) {
      while (state.queue.length > 0) {
        const entry = state.queue.shift()!;
        entry.reject(new Error('Rate limiter cleared'));
      }
    }
    this.keyStates.clear();
    logger.debug('Rate limiter: cleared all state');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Global rate limiter instance for Gemini API calls
 * Enforces minimum 1 second between requests per API key
 */
export const geminiRateLimiter = new ApiKeyRateLimiter(1000);
