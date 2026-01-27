/**
 * Watchwyrd - In-Memory Cache Backend
 *
 * LRU cache implementation for single-instance deployments.
 * Fast and simple, no external dependencies required.
 */

import { LRUCache } from 'lru-cache';
import type { CacheBackend } from './interface.js';
import type { CacheStats, CacheableValue } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * In-memory LRU cache backend
 */
export class MemoryCache implements CacheBackend {
  private cache: LRUCache<string, CacheableValue>;
  private hits = 0;
  private misses = 0;
  private maxSize: number;

  constructor(options: { maxSize?: number; ttlSeconds?: number } = {}) {
    const { maxSize = 1000, ttlSeconds = 21600 } = options;
    this.maxSize = maxSize;

    this.cache = new LRUCache<string, CacheableValue>({
      max: maxSize,
      ttl: ttlSeconds * 1000,
      updateAgeOnGet: false,
      updateAgeOnHas: false,
    });

    logger.info('Memory cache initialized', { maxSize, ttlSeconds });
  }

  get<T extends CacheableValue>(key: string): Promise<T | null> {
    const value = this.cache.get(key);

    if (value) {
      this.hits++;
      logger.debug('Cache hit', { key });
      return Promise.resolve(value as T);
    }

    this.misses++;
    logger.debug('Cache miss', { key });
    return Promise.resolve(null);
  }

  set<T extends CacheableValue>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.cache.set(key, value, { ttl: ttlSeconds * 1000 });
    logger.debug('Cache set', { key, ttlSeconds });
    return Promise.resolve();
  }

  delete(key: string): Promise<boolean> {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    logger.debug('Cache delete', { key, existed });
    return Promise.resolve(existed);
  }

  clear(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    logger.info('Cache cleared');
    return Promise.resolve();
  }

  has(key: string): Promise<boolean> {
    return Promise.resolve(this.cache.has(key));
  }

  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  close(): Promise<void> {
    this.cache.clear();
    logger.info('Memory cache closed');
    return Promise.resolve();
  }
}
