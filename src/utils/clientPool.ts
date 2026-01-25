/**
 * Watchwyrd - Generic Client Pool
 *
 * Provides client pooling for AI provider SDK clients with:
 * - LRU eviction when pool reaches capacity
 * - TTL-based cleanup for stale clients
 * - SHA-256 hashed API keys for secure storage
 *
 * Uses the lru-cache package for efficient pooling.
 *
 * Usage:
 *   const pool = createClientPool({
 *     name: 'gemini',
 *     prefix: 'gemini',
 *     createClient: (apiKey) => new GoogleGenerativeAI(apiKey),
 *   });
 *   const client = pool.get(apiKey);
 */

import crypto from 'crypto';
import { LRUCache } from 'lru-cache';
import { logger } from './logger.js';

// Global registry of all client pools for shutdown cleanup
const poolRegistry: ClientPool<unknown>[] = [];

/**
 * Close all registered client pools.
 * Call during graceful shutdown to clean up resources.
 */
export function closeAllPools(): void {
  for (const pool of poolRegistry) {
    pool.dispose();
  }
  poolRegistry.length = 0;
  logger.debug('All client pools closed');
}

/**
 * Configuration options for client pool
 */
export interface ClientPoolOptions<T> {
  /** Pool name for logging (e.g., 'gemini', 'openai') */
  name: string;
  /** Prefix for hashed API keys (e.g., 'gemini', 'openai', 'pplx') */
  prefix: string;
  /** Factory function to create a new client */
  createClient: (apiKey: string) => T;
  /** Maximum number of clients in pool (default: 100) */
  maxSize?: number;
  /** TTL in ms before idle clients are removed (default: 1 hour) */
  ttlMs?: number;
}

/**
 * Client pool interface
 */
export interface ClientPool<T> {
  /** Get or create a pooled client for the given API key */
  get: (apiKey: string) => T;
  /** Get current pool size */
  size: () => number;
  /** Clear all clients */
  dispose: () => void;
}

/**
 * Hash API key using SHA-256 for secure pool storage.
 * Uses first 16 chars of hex digest for sufficient uniqueness
 * while keeping keys reasonably short.
 *
 * @param apiKey - Raw API key
 * @param prefix - Prefix for the hash (e.g., 'gemini', 'openai')
 * @returns Hashed key like "gemini_a1b2c3d4e5f6g7h8"
 */
function hashApiKey(apiKey: string, prefix: string): string {
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
  return `${prefix}_${hash.substring(0, 16)}`;
}

/**
 * Create a client pool using lru-cache for efficient caching.
 *
 * The pool maintains clients keyed by hashed API keys.
 * Clients are evicted when:
 * - They haven't been accessed for longer than TTL
 * - Pool is at capacity and a new client is needed (LRU evicted)
 *
 * @param options - Pool configuration
 * @returns Client pool with get, size, and dispose methods
 */
export function createClientPool<T extends object>(options: ClientPoolOptions<T>): ClientPool<T> {
  const {
    name,
    prefix,
    createClient,
    maxSize = 100,
    ttlMs = 60 * 60 * 1000, // 1 hour
  } = options;

  // Store original API key mapping for client creation
  // This is needed because lru-cache's fetchMethod doesn't have access to the original key
  const apiKeyMap = new Map<string, string>();

  const cache = new LRUCache<string, T>({
    max: maxSize,
    ttl: ttlMs,
    updateAgeOnGet: true, // Reset TTL on access
    dispose: (_value, key) => {
      apiKeyMap.delete(key);
      logger.debug(`${name} client evicted from pool`);
    },
  });

  const clientPool: ClientPool<T> = {
    get(apiKey: string): T {
      const keyHash = hashApiKey(apiKey, prefix);

      // Check if client exists in cache
      let client = cache.get(keyHash);
      if (client) {
        return client;
      }

      // Create new client and add to cache
      client = createClient(apiKey);
      apiKeyMap.set(keyHash, apiKey);
      cache.set(keyHash, client);
      logger.debug(`Created new ${name} client for pool`);

      return client;
    },

    size: () => cache.size,

    dispose(): void {
      cache.clear();
      apiKeyMap.clear();
      logger.debug(`Disposed ${name} client pool`);
    },
  };

  // Register pool for shutdown cleanup
  poolRegistry.push(clientPool as ClientPool<unknown>);

  return clientPool;
}
