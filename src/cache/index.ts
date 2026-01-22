/**
 * Watchwyrd - Cache Module
 *
 * Provides cache abstraction with memory backend.
 */

import type { CacheBackend } from './interface.js';
import { MemoryCache } from './memory.js';
import { serverConfig } from '../config/server.js';
import { logger } from '../utils/logger.js';

export type { CacheBackend, CacheableValue } from './interface.js';
export { MemoryCache } from './memory.js';

// Singleton cache instance
let cacheInstance: CacheBackend | null = null;

/**
 * Create cache instance based on configuration
 */
export function createCache(): CacheBackend {
  if (cacheInstance) {
    return cacheInstance;
  }

  const { ttl, maxSize } = serverConfig.cache;
  logger.info('Initializing memory cache backend');
  cacheInstance = new MemoryCache({ maxSize, ttlSeconds: ttl });

  return cacheInstance;
}

/**
 * Get the current cache instance
 */
export function getCache(): CacheBackend {
  if (!cacheInstance) {
    throw new Error('Cache not initialized. Call createCache() first.');
  }
  return cacheInstance;
}

/**
 * Close the cache connection
 */
export async function closeCache(): Promise<void> {
  if (cacheInstance) {
    await cacheInstance.close();
    cacheInstance = null;
  }
}

/**
 * Generate cache key from components
 */
export function generateCacheKey(
  configHash: string,
  contentType: string,
  temporalBucket: string
): string {
  return `catalog:${configHash}:${contentType}:${temporalBucket}`;
}
