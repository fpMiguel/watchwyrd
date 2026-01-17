/**
 * Watchwyrd - HTTP Client with Connection Pooling
 *
 * Uses undici for efficient HTTP/1.1 and HTTP/2 connections.
 * Provides connection pooling, timeouts, and keep-alive.
 */

import type { Dispatcher } from 'undici';
import { Pool } from 'undici';
import { logger } from './logger.js';

// =============================================================================
// Types
// =============================================================================

interface PoolConfig {
  /** Maximum connections per origin */
  connections?: number;
  /** Keep-alive timeout in ms */
  keepAliveTimeout?: number;
  /** Request timeout in ms */
  timeout?: number;
  /** Enable pipelining */
  pipelining?: number;
}

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

// =============================================================================
// Pool Management
// =============================================================================

const pools = new Map<string, Pool>();

const DEFAULT_CONFIG: Required<PoolConfig> = {
  connections: 10,
  keepAliveTimeout: 30000, // 30 seconds
  timeout: 30000, // 30 seconds
  pipelining: 1,
};

/**
 * Get or create a connection pool for a given origin
 */
function getPool(origin: string, config?: PoolConfig): Pool {
  const existing = pools.get(origin);
  if (existing) return existing;

  const poolConfig = { ...DEFAULT_CONFIG, ...config };

  const pool = new Pool(origin, {
    connections: poolConfig.connections,
    keepAliveTimeout: poolConfig.keepAliveTimeout,
    pipelining: poolConfig.pipelining,
    connect: {
      timeout: poolConfig.timeout,
    },
  });

  pools.set(origin, pool);
  logger.debug('Created HTTP connection pool', { origin, connections: poolConfig.connections });

  return pool;
}

/**
 * Extract origin from URL
 */
function getOrigin(url: string): string {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}`;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Fetch with connection pooling
 *
 * @param url - Full URL to fetch
 * @param options - Fetch options
 * @returns Response with JSON helper
 */
export async function pooledFetch(
  url: string,
  options: FetchOptions = {}
): Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: <T = unknown>() => Promise<T>;
}> {
  const origin = getOrigin(url);
  const pool = getPool(origin);
  const path = url.replace(origin, '');

  const headers: Record<string, string> = {
    'User-Agent': 'Watchwyrd/1.0',
    Accept: 'application/json',
    ...options.headers,
  };

  const requestOptions: Dispatcher.RequestOptions = {
    path,
    method: options.method || 'GET',
    headers,
    bodyTimeout: options.timeout || DEFAULT_CONFIG.timeout,
    headersTimeout: options.timeout || DEFAULT_CONFIG.timeout,
  };

  if (options.body) {
    requestOptions.body = options.body;
  }

  const response = await pool.request(requestOptions);

  // Collect body
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.body) {
    chunks.push(chunk as Uint8Array);
  }
  const bodyText = Buffer.concat(chunks).toString('utf-8');

  return {
    ok: response.statusCode >= 200 && response.statusCode < 300,
    status: response.statusCode,
    text: () => Promise.resolve(bodyText),
    json: <T = unknown>(): Promise<T> => {
      try {
        return Promise.resolve(JSON.parse(bodyText) as T);
      } catch {
        return Promise.reject(
          new Error(`Invalid JSON response from ${origin}: ${bodyText.substring(0, 100)}`)
        );
      }
    },
  };
}

/**
 * Configure pool for a specific origin
 */
export function configurePool(origin: string, config: PoolConfig): void {
  // Close existing pool if any
  const existing = pools.get(origin);
  if (existing) {
    existing.close().catch(() => {});
    pools.delete(origin);
  }

  // Create new pool with config
  getPool(origin, config);
}

/**
 * Get pool statistics
 */
export function getPoolStats(): Record<string, { connected: number; pending: number }> {
  const stats: Record<string, { connected: number; pending: number }> = {};

  for (const [origin, pool] of pools.entries()) {
    const poolStats = pool.stats;
    stats[origin] = {
      connected: poolStats.connected,
      pending: poolStats.pending,
    };
  }

  return stats;
}

/**
 * Close all connection pools
 */
export async function closeAllPools(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  for (const [origin, pool] of pools.entries()) {
    closePromises.push(
      pool.close().then(() => {
        logger.debug('Closed HTTP connection pool', { origin });
      })
    );
  }

  await Promise.all(closePromises);
  pools.clear();
}
