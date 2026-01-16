/**
 * Watchwyrd - Redis Cache Backend
 *
 * Redis cache implementation for distributed deployments.
 * Supports multiple instances sharing the same cache.
 */

import { Redis } from 'ioredis';
import type { CacheBackend } from './interface.js';
import type { CachedCatalog, CacheStats } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { safeJsonParse } from '../utils/index.js';

/**
 * Redis cache backend
 */
export class RedisCache implements CacheBackend {
  private client: Redis;
  private hits = 0;
  private misses = 0;
  private keyPrefix = 'watchwyrd:';

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client.on('connect', () => {
      logger.info('Redis cache connected');
    });

    this.client.on('error', (err: Error) => {
      logger.error('Redis cache error', { error: err.message });
    });

    this.client.on('reconnecting', () => {
      logger.warn('Redis cache reconnecting');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    await this.client.connect();
  }

  private prefixKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get(key: string): Promise<CachedCatalog | null> {
    try {
      const data = await this.client.get(this.prefixKey(key));

      if (data) {
        this.hits++;
        logger.debug('Redis cache hit', { key });
        return safeJsonParse<CachedCatalog | null>(data, null);
      }

      this.misses++;
      logger.debug('Redis cache miss', { key });
      return null;
    } catch (error) {
      logger.error('Redis get error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.misses++;
      return null;
    }
  }

  async set(key: string, value: CachedCatalog, ttlSeconds: number): Promise<void> {
    try {
      await this.client.setex(
        this.prefixKey(key),
        ttlSeconds,
        JSON.stringify(value)
      );
      logger.debug('Redis cache set', { key, ttlSeconds });
    } catch (error) {
      logger.error('Redis set error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(this.prefixKey(key));
      logger.debug('Redis cache delete', { key, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logger.error('Redis delete error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      // Find all keys with our prefix
      const keys = await this.client.keys(`${this.keyPrefix}*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      this.hits = 0;
      this.misses = 0;
      logger.info('Redis cache cleared', { keysDeleted: keys.length });
    } catch (error) {
      logger.error('Redis clear error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(this.prefixKey(key));
      return exists > 0;
    } catch (error) {
      logger.error('Redis has error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: -1, // Redis doesn't easily expose this per-prefix
      maxSize: -1,
    };
  }

  async close(): Promise<void> {
    await this.client.quit();
    logger.info('Redis cache closed');
  }
}
