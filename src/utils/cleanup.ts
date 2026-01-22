/**
 * Watchwyrd - Cleanup Registry
 *
 * Centralized registry for cleanup handlers to prevent memory leaks.
 * All setInterval timers and other cleanup tasks should register here.
 */

import { logger } from './logger.js';

/**
 * Registry of cleanup handlers
 */
const cleanupHandlers: Array<{ name: string; handler: () => void }> = [];

/**
 * Registry of interval timers
 */
const intervalTimers: Array<{ name: string; timer: ReturnType<typeof setInterval> }> = [];

/**
 * Register a cleanup handler to be called during shutdown
 */
export function registerCleanupHandler(name: string, handler: () => void): void {
  cleanupHandlers.push({ name, handler });
}

/**
 * Register an interval timer that should be cleared during shutdown
 * @returns The interval timer (for use in the calling code if needed)
 */
export function registerInterval(
  name: string,
  callback: () => void,
  intervalMs: number
): ReturnType<typeof setInterval> {
  const timer = setInterval(callback, intervalMs);
  intervalTimers.push({ name, timer });
  return timer;
}

/**
 * Clear all registered intervals and run cleanup handlers
 * Should be called during graceful shutdown
 */
export function runCleanup(): void {
  logger.info('Running cleanup handlers...', {
    intervals: intervalTimers.length,
    handlers: cleanupHandlers.length,
  });

  // Clear all intervals
  for (const { name, timer } of intervalTimers) {
    clearInterval(timer);
    logger.debug('Cleared interval', { name });
  }
  intervalTimers.length = 0;

  // Run all cleanup handlers
  for (const { name, handler } of cleanupHandlers) {
    try {
      handler();
      logger.debug('Ran cleanup handler', { name });
    } catch (error) {
      logger.warn('Cleanup handler failed', {
        name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  cleanupHandlers.length = 0;

  logger.info('Cleanup complete');
}

/**
 * Get count of registered cleanup items (for testing)
 */
export function getCleanupStats(): { intervals: number; handlers: number } {
  return {
    intervals: intervalTimers.length,
    handlers: cleanupHandlers.length,
  };
}
