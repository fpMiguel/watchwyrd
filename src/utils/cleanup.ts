/**
 * Watchwyrd - Cleanup Registry
 *
 * Centralized registry for interval timers to prevent memory leaks.
 * All setInterval timers should register here for graceful shutdown.
 */

import { logger } from './logger.js';

/**
 * Registered interval entry
 */
interface IntervalEntry {
  name: string;
  timer: ReturnType<typeof setInterval>;
}

/**
 * Return type for registerInterval - includes dispose function
 */
export interface RegisteredInterval {
  timer: ReturnType<typeof setInterval>;
  dispose: () => void;
}

/**
 * Registry of interval timers
 */
const intervalTimers: IntervalEntry[] = [];

/**
 * Register an interval timer that should be cleared during shutdown.
 * Timer is unref'd so it won't prevent process exit if cleanup isn't called.
 *
 * @returns Object with timer and dispose function. Call dispose() to clear
 *          the interval AND remove it from the registry.
 */
export function registerInterval(
  name: string,
  callback: () => void,
  intervalMs: number
): RegisteredInterval {
  const timer = setInterval(callback, intervalMs);

  // Unref so this timer won't keep the process alive
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  const entry: IntervalEntry = { name, timer };
  intervalTimers.push(entry);

  return {
    timer,
    dispose: () => {
      clearInterval(timer);
      const index = intervalTimers.indexOf(entry);
      if (index !== -1) {
        intervalTimers.splice(index, 1);
        logger.debug('Disposed interval', { name });
      }
    },
  };
}

/**
 * Clear all registered intervals
 * Should be called during graceful shutdown
 */
export function runCleanup(): void {
  logger.info('Running cleanup...', {
    intervals: intervalTimers.length,
  });

  // Clear all intervals
  for (const { name, timer } of intervalTimers) {
    clearInterval(timer);
    logger.debug('Cleared interval', { name });
  }
  intervalTimers.length = 0;

  logger.info('Cleanup complete');
}

/**
 * Get count of registered cleanup items (for testing)
 */
export function getCleanupStats(): { intervals: number } {
  return {
    intervals: intervalTimers.length,
  };
}
