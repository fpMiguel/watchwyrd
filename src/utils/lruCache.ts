/**
 * Watchwyrd - Generic LRU Cache
 *
 * A simple, efficient LRU (Least Recently Used) cache implementation
 * using Map's insertion order. Used for in-memory caching across services.
 *
 * Features:
 * - Configurable max size with automatic eviction
 * - TTL (time-to-live) support for entries
 * - Hit rate statistics for monitoring
 * - Type-safe with generics
 */

import { logger } from './logger.js';

/**
 * Cache entry with value and timestamp
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

/**
 * Cache statistics for monitoring
 */
export interface LRUCacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  hits: number;
  misses: number;
}

/**
 * Generic LRU cache implementation
 * Uses Map's insertion order for LRU behavior
 */
export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly name: string;

  // Stats
  private hits = 0;
  private misses = 0;

  /**
   * Create a new LRU cache
   * @param maxSize - Maximum number of entries (default: 1000)
   * @param ttlMs - Time-to-live in milliseconds (default: 1 hour)
   * @param name - Optional name for logging
   */
  constructor(maxSize = 1000, ttlMs = 60 * 60 * 1000, name = 'lru-cache') {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.name = name;
  }

  /**
   * Get a value from the cache
   * Returns undefined if not found or expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;

    return entry.value;
  }

  /**
   * Set a value in the cache
   * Automatically evicts oldest entries if at capacity
   */
  set(key: string, value: T): void {
    // Delete if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        logger.debug(`${this.name}: Evicted oldest entry`, { key: oldestKey });
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries and reset stats
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): LRUCacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.hits / total : 0,
      hits: this.hits,
      misses: this.misses,
    };
  }

  /**
   * Get current size
   */
  get size(): number {
    return this.cache.size;
  }
}
