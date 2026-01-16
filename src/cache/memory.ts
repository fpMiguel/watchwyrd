/**
 * Watchwyrd - In-Memory Cache Backend
 *
 * LRU cache implementation for single-instance deployments.
 * Fast and simple, no external dependencies required.
 */

import { LRUCache } from 'lru-cache';
import type { CacheBackend } from './interface.js';
import type { CachedCatalog, CacheStats } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * In-memory LRU cache backend
 */
export class MemoryCache implements CacheBackend {
  private cache: LRUCache<string, CachedCatalog>;
  private hits = 0;
  private misses = 0;
  private maxSize: number;

  constructor(options: { maxSize?: number; ttlSeconds?: number } = {}) {
    const { maxSize = 1000, ttlSeconds = 21600 } = options;
    this.maxSize = maxSize;

    this.cache = new LRUCache<string, CachedCatalog>({
      max: maxSize,
      ttl: ttlSeconds * 1000,
      updateAgeOnGet: false,
      updateAgeOnHas: false,
    });

    logger.info('Memory cache initialized', { maxSize, ttlSeconds });
  }

  async get(key: string): Promise<CachedCatalog | null> {
    const value = this.cache.get(key);

    if (value) {
      this.hits++;
      logger.debug('Cache hit', { key });
      return value;
    }

    this.misses++;
    logger.debug('Cache miss', { key });
    return null;
  }

  async set(key: string, value: CachedCatalog, ttlSeconds: number): Promise<void> {
    this.cache.set(key, value, { ttl: ttlSeconds * 1000 });
    logger.debug('Cache set', { key, ttlSeconds });
  }

  async delete(key: string): Promise<boolean> {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    logger.debug('Cache delete', { key, existed });
    return existed;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    logger.info('Cache cleared');
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  async close(): Promise<void> {
    this.cache.clear();
    logger.info('Memory cache closed');
  }
}
