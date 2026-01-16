/**
 * Watchwyrd - Cache Module
 *
 * Provides cache abstraction with support for multiple backends.
 */

import type { CacheBackend } from './interface.js';
import { MemoryCache } from './memory.js';
import { RedisCache } from './redis.js';
import { serverConfig } from '../config/server.js';
import { logger } from '../utils/logger.js';

export type { CacheBackend };
export { MemoryCache } from './memory.js';
export { RedisCache } from './redis.js';

// Singleton cache instance
let cacheInstance: CacheBackend | null = null;

/**
 * Create cache instance based on configuration
 */
export async function createCache(): Promise<CacheBackend> {
  if (cacheInstance) {
    return cacheInstance;
  }

  const { backend, redisUrl, ttl, maxSize } = serverConfig.cache;

  if (backend === 'redis' && redisUrl) {
    logger.info('Initializing Redis cache backend');
    const redis = new RedisCache(redisUrl);
    await redis.connect();
    cacheInstance = redis;
  } else {
    logger.info('Initializing memory cache backend');
    cacheInstance = new MemoryCache({ maxSize, ttlSeconds: ttl });
  }

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
