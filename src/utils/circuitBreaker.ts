/**
 * Watchwyrd - Circuit Breaker Pattern (opossum-based)
 *
 * Prevents cascade failures when external services are down.
 * Uses opossum for battle-tested circuit breaker implementation.
 *
 * States: CLOSED → OPEN → HALF_OPEN → CLOSED
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is down, requests fail fast
 * - HALF_OPEN: Testing if service recovered
 */

import CircuitBreakerLib from 'opossum';
import { logger } from './logger.js';

// =============================================================================
// Types
// =============================================================================

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  /** Name for logging */
  name: string;
  /** Number of failures before opening circuit */
  failureThreshold?: number;
  /** Time in ms before attempting recovery */
  resetTimeout?: number;
  /** Number of successes in half-open to close circuit */
  successThreshold?: number;
}

interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number | null;
  lastSuccess: number | null;
}

// =============================================================================
// Circuit Breaker Wrapper
// =============================================================================

/**
 * Circuit breaker wrapper that maintains API compatibility
 * while using opossum under the hood
 */
export class CircuitBreaker {
  private readonly breaker: CircuitBreakerLib<unknown[], unknown>;
  private readonly name: string;
  private lastFailure: number | null = null;
  private lastSuccess: number | null = null;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;

    // Create a passthrough function - actual work is done in execute()
    const passthrough = async <T>(fn: () => Promise<T>): Promise<T> => fn();

    this.breaker = new CircuitBreakerLib(passthrough, {
      timeout: false, // No timeout, let the function handle it
      errorThresholdPercentage: 50,
      volumeThreshold: options.failureThreshold ?? 5,
      resetTimeout: options.resetTimeout ?? 30000,
      rollingCountTimeout: 60000, // 1 minute rolling window
      rollingCountBuckets: 6,
    });

    // Set up event listeners for logging
    this.breaker.on('open', () => {
      logger.warn('Circuit breaker opened', {
        name: this.name,
        stats: this.breaker.stats,
      });
    });

    this.breaker.on('halfOpen', () => {
      logger.info('Circuit breaker half-open, testing recovery', { name: this.name });
    });

    this.breaker.on('close', () => {
      logger.info('Circuit breaker closed, service recovered', { name: this.name });
    });

    this.breaker.on('fallback', () => {
      logger.debug('Circuit breaker fallback triggered', { name: this.name });
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await this.breaker.fire(fn);
      this.lastSuccess = Date.now();
      return result as T;
    } catch (error) {
      this.lastFailure = Date.now();

      // Re-throw with clear message if circuit is open
      if (this.breaker.opened) {
        throw new Error(`Circuit breaker open: ${this.name}`);
      }

      throw error;
    }
  }

  /**
   * Get current circuit breaker stats
   */
  getStats(): CircuitStats {
    const state: CircuitState = this.breaker.opened
      ? 'OPEN'
      : this.breaker.halfOpen
        ? 'HALF_OPEN'
        : 'CLOSED';

    return {
      state,
      failures: this.breaker.stats.failures,
      successes: this.breaker.stats.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
    };
  }

  /**
   * Check if circuit is allowing requests
   */
  isAvailable(): boolean {
    return !this.breaker.opened || this.breaker.halfOpen;
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.breaker.close();
    logger.info('Circuit breaker manually reset', { name: this.name });
  }

  /**
   * Get the underlying opossum instance for advanced use
   */
  getBreaker(): CircuitBreakerLib<unknown[], unknown> {
    return this.breaker;
  }
}

// =============================================================================
// Global Circuit Breakers
// =============================================================================

/** Circuit breaker for Cinemeta API */
export const cinemetaCircuit = new CircuitBreaker({
  name: 'cinemeta',
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  successThreshold: 2,
});

/** Circuit breaker for Weather API */
export const weatherCircuit = new CircuitBreaker({
  name: 'weather',
  failureThreshold: 3,
  resetTimeout: 60000, // 1 minute
  successThreshold: 1,
});
