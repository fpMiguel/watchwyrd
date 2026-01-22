/**
 * Watchwyrd - Cache Interface
 *
 * Defines the cache interface and provides factory function
 * for creating cache instances.
 */

import type { CacheStats, CacheableValue } from '../types/index.js';

// Re-export CacheableValue for convenience
export type { CacheableValue } from '../types/index.js';

/**
 * Cache interface that all cache backends must implement
 * Generic type T allows for different value types (catalogs, search results, etc.)
 */
export interface CacheBackend {
  /**
   * Get a cached value by key
   * Returns the value or null if not found/expired
   */
  get<T extends CacheableValue>(key: string): Promise<T | null>;

  /**
   * Set a cached value with TTL
   */
  set<T extends CacheableValue>(key: string, value: T, ttlSeconds: number): Promise<void>;

  /**
   * Delete a cached entry
   */
  delete(key: string): Promise<boolean>;

  /**
   * Clear all cached entries
   */
  clear(): Promise<void>;

  /**
   * Check if a key exists
   */
  has(key: string): Promise<boolean>;

  /**
   * Get cache statistics
   */
  getStats(): CacheStats;

  /**
   * Close the cache connection (for cleanup)
   */
  close(): Promise<void>;
}
