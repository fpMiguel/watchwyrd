/**
 * Watchwyrd - Cache Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryCache } from '../src/cache/memory.js';
import type { CachedCatalog } from '../src/types/index.js';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  const mockCatalog: CachedCatalog = {
    catalog: {
      metas: [
        {
          id: 'tt1234567',
          type: 'movie',
          name: 'Test Movie',
        },
      ],
    },
    generatedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
    configHash: 'abc123',
  };

  beforeEach(() => {
    cache = new MemoryCache({ maxSize: 100, ttlSeconds: 3600 });
  });

  describe('get/set', () => {
    it('should store and retrieve values', async () => {
      await cache.set('test-key', mockCatalog, 3600);
      const result = await cache.get('test-key');

      expect(result).toEqual(mockCatalog);
    });

    it('should return null for missing keys', async () => {
      const result = await cache.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should track hits and misses', async () => {
      await cache.set('key1', mockCatalog, 3600);

      await cache.get('key1'); // hit
      await cache.get('key2'); // miss
      await cache.get('key1'); // hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });
  });

  describe('has', () => {
    it('should return true for existing keys', async () => {
      await cache.set('test-key', mockCatalog, 3600);

      expect(await cache.has('test-key')).toBe(true);
    });

    it('should return false for missing keys', async () => {
      expect(await cache.has('nonexistent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove existing keys', async () => {
      await cache.set('test-key', mockCatalog, 3600);
      const deleted = await cache.delete('test-key');

      expect(deleted).toBe(true);
      expect(await cache.has('test-key')).toBe(false);
    });

    it('should return false for missing keys', async () => {
      const deleted = await cache.delete('nonexistent');

      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', async () => {
      await cache.set('key1', mockCatalog, 3600);
      await cache.set('key2', mockCatalog, 3600);

      await cache.clear();

      expect(await cache.has('key1')).toBe(false);
      expect(await cache.has('key2')).toBe(false);
    });

    it('should reset stats', async () => {
      await cache.set('key1', mockCatalog, 3600);
      await cache.get('key1');
      await cache.get('key2');

      await cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', async () => {
      const stats = cache.getStats();

      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(100);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should update size after adding items', async () => {
      await cache.set('key1', mockCatalog, 3600);
      await cache.set('key2', mockCatalog, 3600);

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });
  });
});
