/**
 * Watchwyrd - In-Flight Request Tracker
 *
 * Tracks in-progress async operations to prevent duplicate work.
 * Used for request deduplication in catalog and search generation.
 *
 * Features:
 * - Prevents concurrent duplicate requests for the same key
 * - Automatic cleanup of stale/abandoned requests
 * - Configurable timeout for stale detection
 * - Named instances for logging
 */

import { logger } from './logger.js';
import { registerInterval } from './cleanup.js';

/**
 * Tracks in-flight async operations by key
 * Prevents duplicate concurrent requests for the same resource
 */
export class InFlightTracker<T> {
  private requests = new Map<string, Promise<T>>();
  private startTimes = new Map<string, number>();
  private readonly name: string;
  private readonly timeoutMs: number;

  /**
   * Create a new in-flight tracker
   * @param name - Name for logging and cleanup registration
   * @param timeoutMs - Timeout in ms after which stale entries are cleaned up
   * @param cleanupIntervalMs - How often to run cleanup (default: 60s)
   */
  constructor(name: string, timeoutMs: number, cleanupIntervalMs = 60_000) {
    this.name = name;
    this.timeoutMs = timeoutMs;

    // Register cleanup interval for graceful shutdown
    registerInterval(`${name}-cleanup`, () => this.cleanup(), cleanupIntervalMs);
  }

  /**
   * Get an in-flight request if one exists
   */
  get(key: string): Promise<T> | undefined {
    return this.requests.get(key);
  }

  /**
   * Check if a request is in flight
   */
  has(key: string): boolean {
    return this.requests.has(key);
  }

  /**
   * Track a new in-flight request
   * The promise will be automatically removed when it settles
   */
  set(key: string, promise: Promise<T>): void {
    this.startTimes.set(key, Date.now());
    this.requests.set(key, promise);

    // Auto-cleanup on completion (success or failure)
    // We catch errors here to prevent unhandled rejection warnings,
    // but the original promise rejection is still propagated to callers
    promise
      .catch(() => {
        // Errors are handled by the caller, we just need to prevent
        // unhandled rejection warnings from the finally handler
      })
      .finally(() => {
        this.requests.delete(key);
        this.startTimes.delete(key);
      });
  }

  /**
   * Manually remove an in-flight request
   */
  delete(key: string): boolean {
    this.startTimes.delete(key);
    return this.requests.delete(key);
  }

  /**
   * Get current count of in-flight requests
   */
  get size(): number {
    return this.requests.size;
  }

  /**
   * Clean up stale in-flight requests that have exceeded timeout
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, startTime] of this.startTimes.entries()) {
      if (now - startTime > this.timeoutMs) {
        this.requests.delete(key);
        this.startTimes.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.warn(`${this.name}: Cleaned up stale in-flight requests`, { count: cleaned });
    }
  }
}
