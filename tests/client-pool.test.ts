/**
 * Client Pool Tests
 *
 * Tests for the generic client pool with TTL-based cleanup and LRU eviction.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Need to reset modules to get fresh pool state
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('createClientPool', () => {
  it('should create a client on first get', async () => {
    const { createClientPool } = await import('../src/utils/clientPool.js');
    const createClient = vi.fn().mockReturnValue({ id: 'client1' });

    const pool = createClientPool({
      name: 'test',
      prefix: 'test',
      createClient,
    });

    const client = pool.get('api-key-123');

    expect(createClient).toHaveBeenCalledWith('api-key-123');
    expect(client).toEqual({ id: 'client1' });
    expect(pool.size()).toBe(1);

    pool.dispose();
  });

  it('should return cached client on subsequent gets', async () => {
    const { createClientPool } = await import('../src/utils/clientPool.js');
    const createClient = vi.fn().mockReturnValue({ id: 'client1' });

    const pool = createClientPool({
      name: 'test',
      prefix: 'test',
      createClient,
    });

    const client1 = pool.get('api-key-123');
    const client2 = pool.get('api-key-123');

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(client1).toBe(client2);

    pool.dispose();
  });

  it('should create different clients for different API keys', async () => {
    const { createClientPool } = await import('../src/utils/clientPool.js');
    let counter = 0;
    const createClient = vi.fn().mockImplementation(() => ({ id: `client${++counter}` }));

    const pool = createClientPool({
      name: 'test',
      prefix: 'test',
      createClient,
    });

    const client1 = pool.get('api-key-1');
    const client2 = pool.get('api-key-2');

    expect(createClient).toHaveBeenCalledTimes(2);
    expect(client1).not.toBe(client2);
    expect(pool.size()).toBe(2);

    pool.dispose();
  });

  it('should evict oldest client when at max capacity (LRU)', async () => {
    const { createClientPool } = await import('../src/utils/clientPool.js');
    let counter = 0;
    const createClient = vi.fn().mockImplementation(() => ({ id: `client${++counter}` }));

    const pool = createClientPool({
      name: 'test',
      prefix: 'test',
      createClient,
      maxSize: 2,
    });

    // Add 2 clients to reach capacity
    pool.get('key-1'); // oldest
    pool.get('key-2');

    expect(pool.size()).toBe(2);

    // Adding a 3rd should evict the oldest (key-1)
    pool.get('key-3');

    expect(pool.size()).toBe(2);
    expect(createClient).toHaveBeenCalledTimes(3);

    // key-1 should be evicted, getting it again should create a new client
    pool.get('key-1');
    expect(createClient).toHaveBeenCalledTimes(4);

    pool.dispose();
  });

  it('should update lastUsed on get to affect LRU order', async () => {
    vi.useFakeTimers();

    const { createClientPool } = await import('../src/utils/clientPool.js');
    let counter = 0;
    const createClient = vi.fn().mockImplementation(() => ({ id: `client${++counter}` }));

    const pool = createClientPool({
      name: 'test',
      prefix: 'test',
      createClient,
      maxSize: 2,
    });

    // Add 2 clients
    pool.get('key-1'); // Created first
    vi.advanceTimersByTime(100);
    pool.get('key-2'); // Created second

    // Access key-1 to make it more recent than key-2
    vi.advanceTimersByTime(100);
    pool.get('key-1');

    // Now key-2 is the oldest - adding key-3 should evict key-2
    vi.advanceTimersByTime(100);
    pool.get('key-3');

    // key-2 should be evicted
    pool.get('key-2');
    expect(createClient).toHaveBeenCalledTimes(4); // 1, 2, 3, then 2 again

    pool.dispose();
  });

  it('should clean expired clients by TTL', async () => {
    vi.useFakeTimers();

    const { createClientPool } = await import('../src/utils/clientPool.js');
    const createClient = vi.fn().mockReturnValue({});

    const pool = createClientPool({
      name: 'test',
      prefix: 'test',
      createClient,
      ttlMs: 1000, // 1 second TTL
      cleanupIntervalMs: 500, // cleanup every 500ms
    });

    // Create a client
    pool.get('key-1');
    expect(pool.size()).toBe(1);

    // Advance past cleanup interval but within TTL
    vi.advanceTimersByTime(600);
    expect(pool.size()).toBe(1);

    // Advance past TTL (total: 1600ms > 1000ms TTL)
    vi.advanceTimersByTime(1000);
    expect(pool.size()).toBe(0);

    pool.dispose();
  });

  it('should clear all clients on dispose', async () => {
    const { createClientPool } = await import('../src/utils/clientPool.js');
    const createClient = vi.fn().mockReturnValue({});

    const pool = createClientPool({
      name: 'test',
      prefix: 'test',
      createClient,
    });

    pool.get('key-1');
    pool.get('key-2');
    expect(pool.size()).toBe(2);

    pool.dispose();

    expect(pool.size()).toBe(0);
  });

  it('should return current pool size', async () => {
    const { createClientPool } = await import('../src/utils/clientPool.js');
    const createClient = vi.fn().mockReturnValue({});

    const pool = createClientPool({
      name: 'test',
      prefix: 'test',
      createClient,
    });

    expect(pool.size()).toBe(0);

    pool.get('key-1');
    expect(pool.size()).toBe(1);

    pool.get('key-2');
    expect(pool.size()).toBe(2);

    pool.dispose();
  });

  it('should use default options when not specified', async () => {
    const { createClientPool } = await import('../src/utils/clientPool.js');
    const createClient = vi.fn().mockReturnValue({});

    const pool = createClientPool({
      name: 'test',
      prefix: 'test',
      createClient,
      // maxSize, ttlMs, cleanupIntervalMs all use defaults
    });

    // Should work with defaults
    pool.get('key-1');
    expect(pool.size()).toBe(1);

    pool.dispose();
  });
});

describe('closeAllPools', () => {
  it('should close all registered pools', async () => {
    const { createClientPool, closeAllPools } = await import('../src/utils/clientPool.js');
    const createClient = vi.fn().mockReturnValue({});

    const pool1 = createClientPool({
      name: 'pool1',
      prefix: 'p1',
      createClient,
    });

    const pool2 = createClientPool({
      name: 'pool2',
      prefix: 'p2',
      createClient,
    });

    pool1.get('key-1');
    pool2.get('key-2');

    expect(pool1.size()).toBe(1);
    expect(pool2.size()).toBe(1);

    closeAllPools();

    expect(pool1.size()).toBe(0);
    expect(pool2.size()).toBe(0);
  });

  it('should handle empty registry', async () => {
    const { closeAllPools } = await import('../src/utils/clientPool.js');

    // Should not throw
    expect(() => closeAllPools()).not.toThrow();
  });
});

describe('API key hashing', () => {
  it('should store clients by hashed key (same key = same client)', async () => {
    const { createClientPool } = await import('../src/utils/clientPool.js');
    const createClient = vi.fn().mockReturnValue({});

    const pool = createClientPool({
      name: 'test',
      prefix: 'test',
      createClient,
    });

    // Same API key should return same client
    pool.get('my-secret-api-key');
    pool.get('my-secret-api-key');

    expect(createClient).toHaveBeenCalledTimes(1);

    pool.dispose();
  });

  it('should use prefix in hashed key', async () => {
    const { createClientPool } = await import('../src/utils/clientPool.js');
    let counter = 0;
    const createClient = vi.fn().mockImplementation(() => ({ id: `client${++counter}` }));

    // Create two pools with different prefixes
    const pool1 = createClientPool({
      name: 'gemini',
      prefix: 'gemini',
      createClient,
    });

    const pool2 = createClientPool({
      name: 'openai',
      prefix: 'openai',
      createClient,
    });

    // Same API key in different pools should create separate clients
    pool1.get('same-key');
    pool2.get('same-key');

    expect(createClient).toHaveBeenCalledTimes(2);

    pool1.dispose();
    pool2.dispose();
  });
});
