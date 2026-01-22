/**
 * Watchwyrd - Cleanup Registry Tests
 *
 * Tests for the centralized cleanup registry that manages intervals and shutdown handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test the cleanup module in isolation, so we'll import fresh each test
describe('Cleanup Registry', () => {
  // Store original module for restoration
  let cleanupModule: typeof import('../src/utils/cleanup.js');

  beforeEach(async () => {
    // Clear module cache and re-import for fresh state
    vi.resetModules();
    cleanupModule = await import('../src/utils/cleanup.js');
  });

  afterEach(() => {
    // Run cleanup to clear any registered handlers
    cleanupModule.runCleanup();
  });

  describe('registerInterval', () => {
    it('should register an interval and return the timer', () => {
      const callback = vi.fn();
      const timer = cleanupModule.registerInterval('test-interval', callback, 1000);

      expect(timer).toBeDefined();
      expect(cleanupModule.getCleanupStats().intervals).toBe(1);

      // Clean up
      clearInterval(timer);
    });

    it('should track multiple intervals', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      cleanupModule.registerInterval('interval-1', callback1, 1000);
      cleanupModule.registerInterval('interval-2', callback2, 2000);

      expect(cleanupModule.getCleanupStats().intervals).toBe(2);
    });

    it('should execute callback at specified interval', async () => {
      vi.useFakeTimers();
      const callback = vi.fn();

      cleanupModule.registerInterval('exec-test', callback, 100);

      // Advance time by 100ms
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);

      // Advance another 100ms
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('registerCleanupHandler', () => {
    it('should register a cleanup handler', () => {
      const handler = vi.fn();
      cleanupModule.registerCleanupHandler('test-handler', handler);

      expect(cleanupModule.getCleanupStats().handlers).toBe(1);
    });

    it('should track multiple handlers', () => {
      cleanupModule.registerCleanupHandler('handler-1', vi.fn());
      cleanupModule.registerCleanupHandler('handler-2', vi.fn());
      cleanupModule.registerCleanupHandler('handler-3', vi.fn());

      expect(cleanupModule.getCleanupStats().handlers).toBe(3);
    });
  });

  describe('runCleanup', () => {
    it('should clear all registered intervals', () => {
      vi.useFakeTimers();
      const callback = vi.fn();

      cleanupModule.registerInterval('cleanup-test', callback, 100);

      // Verify interval is running
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);

      // Run cleanup
      cleanupModule.runCleanup();

      // Verify interval is stopped
      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not 3

      vi.useRealTimers();
    });

    it('should execute all cleanup handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      cleanupModule.registerCleanupHandler('handler-1', handler1);
      cleanupModule.registerCleanupHandler('handler-2', handler2);

      cleanupModule.runCleanup();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should reset stats after cleanup', () => {
      cleanupModule.registerInterval('int-1', vi.fn(), 1000);
      cleanupModule.registerCleanupHandler('handler-1', vi.fn());

      expect(cleanupModule.getCleanupStats().intervals).toBe(1);
      expect(cleanupModule.getCleanupStats().handlers).toBe(1);

      cleanupModule.runCleanup();

      expect(cleanupModule.getCleanupStats().intervals).toBe(0);
      expect(cleanupModule.getCleanupStats().handlers).toBe(0);
    });

    it('should continue cleanup even if a handler throws', () => {
      const failingHandler = vi.fn(() => {
        throw new Error('Handler failed');
      });
      const successHandler = vi.fn();

      cleanupModule.registerCleanupHandler('failing', failingHandler);
      cleanupModule.registerCleanupHandler('success', successHandler);

      // Should not throw
      expect(() => cleanupModule.runCleanup()).not.toThrow();

      // Both handlers should have been called
      expect(failingHandler).toHaveBeenCalledTimes(1);
      expect(successHandler).toHaveBeenCalledTimes(1);
    });

    it('should be safe to call multiple times', () => {
      const handler = vi.fn();
      cleanupModule.registerCleanupHandler('once-only', handler);

      cleanupModule.runCleanup();
      cleanupModule.runCleanup();

      // Handler should only be called once (first cleanup)
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCleanupStats', () => {
    it('should return zero counts initially', async () => {
      // Fresh import for clean state
      vi.resetModules();
      const fresh = await import('../src/utils/cleanup.js');

      const stats = fresh.getCleanupStats();
      expect(stats.intervals).toBe(0);
      expect(stats.handlers).toBe(0);
    });

    it('should accurately reflect registered items', () => {
      cleanupModule.registerInterval('i1', vi.fn(), 1000);
      cleanupModule.registerInterval('i2', vi.fn(), 1000);
      cleanupModule.registerCleanupHandler('h1', vi.fn());

      const stats = cleanupModule.getCleanupStats();
      expect(stats.intervals).toBe(2);
      expect(stats.handlers).toBe(1);
    });
  });
});
