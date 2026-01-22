/**
 * Circuit Breaker Tests
 *
 * Tests for the circuit breaker pattern implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker } from '../src/utils/circuitBreaker.js';

describe('CircuitBreaker', () => {
  let circuit: CircuitBreaker;

  beforeEach(() => {
    circuit = new CircuitBreaker({
      name: 'test-circuit',
      failureThreshold: 3,
      resetTimeout: 100, // Short timeout for testing
    });
  });

  describe('execute', () => {
    it('should execute successful functions', async () => {
      const result = await circuit.execute(() => Promise.resolve('success'));
      expect(result).toBe('success');
    });

    it('should pass through function results', async () => {
      const data = { id: 1, name: 'test' };
      const result = await circuit.execute(() => Promise.resolve(data));
      expect(result).toEqual(data);
    });

    it('should propagate errors', async () => {
      await expect(circuit.execute(() => Promise.reject(new Error('test error')))).rejects.toThrow(
        'test error'
      );
    });
  });

  describe('getStats', () => {
    it('should return initial stats', () => {
      const stats = circuit.getStats();

      expect(stats.state).toBe('CLOSED');
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.lastFailure).toBeNull();
      expect(stats.lastSuccess).toBeNull();
    });

    it('should track successes', async () => {
      await circuit.execute(() => Promise.resolve('ok'));
      await circuit.execute(() => Promise.resolve('ok'));

      const stats = circuit.getStats();
      expect(stats.successes).toBeGreaterThanOrEqual(1);
      expect(stats.lastSuccess).not.toBeNull();
    });

    it('should track failures', async () => {
      try {
        await circuit.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }

      const stats = circuit.getStats();
      expect(stats.failures).toBeGreaterThanOrEqual(1);
      expect(stats.lastFailure).not.toBeNull();
    });
  });

  describe('isAvailable', () => {
    it('should return true when circuit is closed', () => {
      expect(circuit.isAvailable()).toBe(true);
    });

    it('should return true initially', () => {
      const newCircuit = new CircuitBreaker({
        name: 'new-circuit',
      });
      expect(newCircuit.isAvailable()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should close the circuit', async () => {
      // Generate some failures
      for (let i = 0; i < 5; i++) {
        try {
          await circuit.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      // Reset
      circuit.reset();

      // Should be available again
      expect(circuit.isAvailable()).toBe(true);
      expect(circuit.getStats().state).toBe('CLOSED');
    });
  });

  describe('getBreaker', () => {
    it('should return the underlying opossum instance', () => {
      const breaker = circuit.getBreaker();
      expect(breaker).toBeDefined();
      expect(typeof breaker.fire).toBe('function');
    });
  });
});

describe('Circuit Breaker with Different Options', () => {
  it('should use default options when not specified', () => {
    const circuit = new CircuitBreaker({ name: 'defaults' });

    expect(circuit.isAvailable()).toBe(true);
    expect(circuit.getStats().state).toBe('CLOSED');
  });

  it('should accept custom failure threshold', () => {
    const circuit = new CircuitBreaker({
      name: 'custom-threshold',
      failureThreshold: 10,
    });

    expect(circuit.isAvailable()).toBe(true);
  });

  it('should accept custom reset timeout', () => {
    const circuit = new CircuitBreaker({
      name: 'custom-timeout',
      resetTimeout: 5000,
    });

    expect(circuit.isAvailable()).toBe(true);
  });

  it('should accept custom success threshold', () => {
    const circuit = new CircuitBreaker({
      name: 'custom-success',
      successThreshold: 5,
    });

    expect(circuit.isAvailable()).toBe(true);
  });
});
