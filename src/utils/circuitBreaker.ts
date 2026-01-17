/**
 * Watchwyrd - Circuit Breaker Pattern
 *
 * Prevents cascade failures when external services are down.
 * States: CLOSED → OPEN → HALF_OPEN → CLOSED
 *
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is down, requests fail fast
 * - HALF_OPEN: Testing if service recovered
 */

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
// Circuit Breaker Implementation
// =============================================================================

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailure: number | null = null;
  private lastSuccess: number | null = null;
  private nextAttempt = 0;

  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly successThreshold: number;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 30000; // 30 seconds
    this.successThreshold = options.successThreshold ?? 2;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        logger.debug('Circuit breaker open, failing fast', { name: this.name });
        throw new Error(`Circuit breaker open: ${this.name}`);
      }

      // Try to recover
      this.state = 'HALF_OPEN';
      this.successes = 0;
      logger.info('Circuit breaker half-open, testing recovery', { name: this.name });
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record a successful call
   */
  private onSuccess(): void {
    this.lastSuccess = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failures = 0;
        logger.info('Circuit breaker closed, service recovered', { name: this.name });
      }
    } else {
      // Reset failure count on success in closed state
      this.failures = 0;
    }
  }

  /**
   * Record a failed call
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Failed during recovery, open again
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      logger.warn('Circuit breaker opened again, recovery failed', { name: this.name });
    } else if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      logger.warn('Circuit breaker opened', {
        name: this.name,
        failures: this.failures,
        resetInMs: this.resetTimeout,
      });
    }
  }

  /**
   * Get current circuit breaker stats
   */
  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
    };
  }

  /**
   * Check if circuit is allowing requests
   */
  isAvailable(): boolean {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) return true;
    if (this.state === 'HALF_OPEN') return true;
    return false;
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    logger.info('Circuit breaker manually reset', { name: this.name });
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
