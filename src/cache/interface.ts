/**
 * Watchwyrd - Cache Interface
 *
 * Defines the cache interface and provides factory function
 * for creating cache instances.
 */

import type { CachedCatalog, CacheStats } from '../types/index.js';

/**
 * Cache interface that all cache backends must implement
 */
export interface CacheBackend {
  /**
   * Get a cached catalog by key
   */
  get(key: string): Promise<CachedCatalog | null>;

  /**
   * Set a cached catalog with TTL
   */
  set(key: string, value: CachedCatalog, ttlSeconds: number): Promise<void>;

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
