/**
 * Watchwyrd - Generic Client Pool
 *
 * Provides connection pooling for AI provider clients with:
 * - TTL-based cleanup to prevent stale connections
 * - LRU eviction when pool reaches capacity
 * - SHA-256 hashed API keys for secure storage
 * - Proper cleanup integration via registerInterval
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

import { logger } from './logger.js';
import { registerInterval, type RegisteredInterval } from './cleanup.js';

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
  /** Cleanup interval in ms (default: 10 minutes) */
  cleanupIntervalMs?: number;
}

/**
 * Client pool interface
 */
export interface ClientPool<T> {
  /** Get or create a pooled client for the given API key */
  get: (apiKey: string) => T;
  /** Get current pool size */
  size: () => number;
  /** Clear all clients and stop cleanup interval */
  dispose: () => void;
}

/**
 * Internal pooled entry with last-used timestamp
 */
interface PooledEntry<T> {
  client: T;
  lastUsed: number;
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
 * Create a client pool with TTL-based cleanup and LRU eviction.
 *
 * The pool maintains a Map of API key hashes to client entries.
 * Clients are evicted when:
 * - They haven't been used for longer than TTL (checked periodically)
 * - Pool is at capacity and a new client is needed (oldest evicted)
 *
 * Note: Race condition between size check and set is acceptable.
 * maxSize is a soft limit - briefly exceeding it under high concurrency
 * is harmless since clients will be cleaned up by TTL.
 *
 * @param options - Pool configuration
 * @returns Client pool with get, size, and dispose methods
 */
export function createClientPool<T>(options: ClientPoolOptions<T>): ClientPool<T> {
  const {
    name,
    prefix,
    createClient,
    maxSize = 100,
    ttlMs = 60 * 60 * 1000, // 1 hour
    cleanupIntervalMs = 10 * 60 * 1000, // 10 minutes
  } = options;

  const pool = new Map<string, PooledEntry<T>>();

  // Register cleanup interval for TTL-based eviction
  const cleanupInterval: RegisteredInterval = registerInterval(
    `${name}-client-pool-cleanup`,
    () => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of pool.entries()) {
        if (now - entry.lastUsed > ttlMs) {
          pool.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.debug(`Cleaned up stale ${name} clients`, {
          cleaned,
          remaining: pool.size,
        });
      }
    },
    cleanupIntervalMs
  );

  const clientPool: ClientPool<T> = {
    get(apiKey: string): T {
      const keyHash = hashApiKey(apiKey, prefix);
      const entry = pool.get(keyHash);

      // Return existing client if found, update last-used time
      if (entry) {
        entry.lastUsed = Date.now();
        return entry.client;
      }

      // Evict oldest client if at capacity (LRU eviction)
      if (pool.size >= maxSize) {
        let oldestKey = '';
        let oldestTime = Infinity;

        for (const [key, e] of pool.entries()) {
          if (e.lastUsed < oldestTime) {
            oldestTime = e.lastUsed;
            oldestKey = key;
          }
        }

        if (oldestKey) {
          pool.delete(oldestKey);
          logger.debug(`Evicted oldest ${name} client from pool`);
        }
      }

      // Create new client and add to pool
      const client = createClient(apiKey);
      pool.set(keyHash, { client, lastUsed: Date.now() });
      logger.debug(`Created new ${name} client for connection pool`);

      return client;
    },

    size: () => pool.size,

    dispose(): void {
      pool.clear();
      cleanupInterval.dispose();
      logger.debug(`Disposed ${name} client pool`);
    },
  };

  // Register pool for shutdown cleanup
  poolRegistry.push(clientPool as ClientPool<unknown>);

  return clientPool;
}
