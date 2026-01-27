/**
 * Watchwyrd - Cinemeta Service
 *
 * Uses Stremio's Cinemeta addon to look up IMDb IDs and metadata
 * by title. This ensures accurate IMDb IDs since we're querying
 * an authoritative source rather than relying on AI-generated IDs.
 *
 * Features:
 * - LRU cache with 24-hour TTL
 * - Parallel batch lookups with rate limiting
 * - Connection pooling via undici
 * - Circuit breaker for fault tolerance
 */

import { LRUCache } from 'lru-cache';
import { logger, retry } from '../utils/index.js';
import { pooledFetch } from '../utils/http.js';
import { cinemetaCircuit } from '../utils/circuitBreaker.js';
import type { ContentType } from '../types/index.js';

const CINEMETA_BASE = 'https://v3-cinemeta.strem.io';

// Cache Configuration

const CACHE_MAX_SIZE = 5000; // Maximum entries in LRU cache
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STATS_LOG_INTERVAL = 100; // Log cache stats every N operations

/**
 * Cinemeta search result
 */
export interface CinemetaSearchResult {
  imdbId: string;
  title: string;
  year: number;
  poster: string;
  type: ContentType;
}

// Sentinel value for negative cache (not found)
const NOT_FOUND: unique symbol = Symbol('NOT_FOUND');
type CacheValue = CinemetaSearchResult | typeof NOT_FOUND;

// Global cache instance using lru-cache package
// allowStale: false ensures expired entries are not returned
const cinemetaCache = new LRUCache<string, CacheValue>({
  max: CACHE_MAX_SIZE,
  ttl: CACHE_TTL_MS,
  allowStale: false,
});

// In-flight request tracking to deduplicate concurrent lookups
const inFlightLookups = new Map<string, Promise<CinemetaSearchResult | null>>();

// Cache statistics for monitoring
const cacheStats = {
  hits: 0,
  misses: 0,
  inFlightHits: 0,
  operations: 0,
};

// Cache Key Generation

/**
 * Normalize title for consistent cache key generation.
 * Conservative approach: lowercase, trim, collapse whitespace.
 */
function normalizeTitle(title: string): string {
  return title.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Generate cache key from title, year, and type
 */
function getCacheKey(title: string, year: number | undefined, type: ContentType): string {
  return `${type}:${normalizeTitle(title)}:${year || 'any'}`;
}

/**
 * Log cache statistics periodically
 */
function logCacheStatsIfNeeded(): void {
  cacheStats.operations++;
  if (cacheStats.operations % STATS_LOG_INTERVAL === 0) {
    const total = cacheStats.hits + cacheStats.misses;
    const hitRate = total > 0 ? ((cacheStats.hits / total) * 100).toFixed(1) : '0.0';
    logger.debug('Cinemeta cache stats', {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      inFlightHits: cacheStats.inFlightHits,
      hitRate: `${hitRate}%`,
      cacheSize: cinemetaCache.size,
    });
  }
}

/**
 * Get current cache statistics (for testing/debugging)
 */
export function getCacheStats(): {
  hits: number;
  misses: number;
  inFlightHits: number;
  hitRate: string;
  cacheSize: number;
} {
  const total = cacheStats.hits + cacheStats.misses;
  const hitRate = total > 0 ? ((cacheStats.hits / total) * 100).toFixed(1) : '0.0';
  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    inFlightHits: cacheStats.inFlightHits,
    hitRate: `${hitRate}%`,
    cacheSize: cinemetaCache.size,
  };
}

// Cinemeta API Functions

/**
 * Search Cinemeta catalog by title (with circuit breaker)
 */
async function searchCinemeta(
  title: string,
  type: ContentType
): Promise<Array<{ id: string; name: string; year?: number; poster?: string }>> {
  const encodedQuery = encodeURIComponent(title);
  const url = `${CINEMETA_BASE}/catalog/${type}/top/search=${encodedQuery}.json`;

  try {
    return await cinemetaCircuit.execute(async () => {
      const response = await retry(
        async () => {
          const res = await pooledFetch(url, { timeout: 10000 });
          if (!res.ok) {
            throw new Error(`Cinemeta search failed: ${res.status}`);
          }
          return res.json<{
            metas?: Array<{ id: string; name: string; year?: number; poster?: string }>;
          }>();
        },
        { maxAttempts: 2, baseDelay: 500, maxDelay: 2000 }
      );

      return response.metas || [];
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Don't log circuit breaker open as warning (it's expected)
    if (message.includes('Circuit breaker open')) {
      logger.debug('Cinemeta circuit open, skipping lookup', { title, type });
    } else {
      logger.warn('Cinemeta search failed', { title, type, error: message });
    }
    return [];
  }
}

/**
 * Get metadata for a specific IMDb ID from Cinemeta
 */
export async function getCinemetaMeta(
  imdbId: string,
  type: ContentType
): Promise<{ id: string; name: string; year?: number; poster?: string } | null> {
  const url = `${CINEMETA_BASE}/meta/${type}/${imdbId}.json`;

  try {
    return await cinemetaCircuit.execute(async () => {
      const response = await retry(
        async () => {
          const res = await pooledFetch(url, { timeout: 10000 });
          if (!res.ok) {
            if (res.status === 404) return { meta: null };
            throw new Error(`Cinemeta meta failed: ${res.status}`);
          }
          return res.json<{
            meta?: { id: string; name: string; year?: number; poster?: string };
          }>();
        },
        { maxAttempts: 2, baseDelay: 500, maxDelay: 2000 }
      );

      return response.meta || null;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (!message.includes('Circuit breaker open')) {
      logger.warn('Cinemeta meta lookup failed', { imdbId, type, error: message });
    }
    return null;
  }
}

/**
 * Look up a title in Cinemeta and return the best match
 *
 * @param title - Movie or series title to search for
 * @param year - Optional release year for better matching
 * @param type - Content type (movie or series)
 * @returns Cinemeta result with IMDb ID or null if not found
 */
export async function lookupTitle(
  title: string,
  year: number | undefined,
  type: ContentType
): Promise<CinemetaSearchResult | null> {
  const cacheKey = getCacheKey(title, year, type);
  logCacheStatsIfNeeded();

  // Check cache first (LRU cache handles TTL internally)
  const cached = cinemetaCache.get(cacheKey);
  if (cached !== undefined) {
    cacheStats.hits++;
    const found = cached !== NOT_FOUND;
    logger.debug('Cinemeta cache hit', { title, type, found });
    return found ? cached : null;
  }

  // Check for in-flight request for the same title
  const inFlight = inFlightLookups.get(cacheKey);
  if (inFlight) {
    cacheStats.inFlightHits++;
    logger.debug('Cinemeta in-flight hit', { title, type });
    return inFlight;
  }

  // Create the lookup promise and track it
  const lookupPromise = performLookup(title, year, type, cacheKey);
  inFlightLookups.set(cacheKey, lookupPromise);

  try {
    cacheStats.misses++;
    return await lookupPromise;
  } finally {
    inFlightLookups.delete(cacheKey);
  }
}

/**
 * Perform the actual Cinemeta lookup (internal helper)
 */
async function performLookup(
  title: string,
  year: number | undefined,
  type: ContentType,
  cacheKey: string
): Promise<CinemetaSearchResult | null> {
  const results = await searchCinemeta(title, type);

  if (results.length === 0) {
    // Cache negative result to avoid repeated lookups
    cinemetaCache.set(cacheKey, NOT_FOUND);
    logger.debug('Cinemeta lookup: no results', { title, type, year });
    return null;
  }

  // Find best match by title and optionally year
  const normalizedSearchTitle = normalizeTitle(title);
  let bestMatch: { id: string; name: string; year?: number; poster?: string } | undefined =
    results[0];
  let bestScore = 0;

  for (const result of results) {
    const resultTitle = normalizeTitle(result.name);
    let score = 0;

    // Exact title match
    if (resultTitle === normalizedSearchTitle) {
      score += 100;
    } else if (
      resultTitle.includes(normalizedSearchTitle) ||
      normalizedSearchTitle.includes(resultTitle)
    ) {
      score += 50;
    }

    // Year match (if provided)
    if (year && result.year) {
      if (result.year === year) {
        score += 30;
      } else if (Math.abs(result.year - year) <= 1) {
        score += 15; // Allow 1 year tolerance
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = result;
    }
  }

  // Must have at least a partial title match
  if (bestScore < 50 || !bestMatch) {
    logger.debug('Cinemeta lookup: no good match', {
      title,
      type,
      year,
      topResult: bestMatch?.name,
      topResultYear: bestMatch?.year,
    });
    cinemetaCache.set(cacheKey, NOT_FOUND);
    return null;
  }

  const result: CinemetaSearchResult = {
    imdbId: bestMatch.id,
    title: bestMatch.name,
    year: bestMatch.year || year || new Date().getFullYear(),
    poster: bestMatch.poster || '',
    type,
  };

  // Cache the result
  cinemetaCache.set(cacheKey, result);

  logger.debug('Cinemeta lookup successful', {
    searchTitle: title,
    foundTitle: result.title,
    imdbId: result.imdbId,
    year: result.year,
  });

  return result;
}

/**
 * Look up multiple titles in parallel with optimized batching
 *
 * Optimizations:
 * - Pre-filters cached items to avoid unnecessary async work
 * - Only fetches uncached items in batches
 * - Leverages in-flight deduplication from lookupTitle
 *
 * @param items - Array of items with title, year, and type
 * @returns Map of original titles to Cinemeta results
 */
export async function lookupTitles(
  items: Array<{ title: string; year?: number; type: ContentType }>
): Promise<Map<string, CinemetaSearchResult | null>> {
  const results = new Map<string, CinemetaSearchResult | null>();
  const uncachedItems: Array<{ title: string; year?: number; type: ContentType }> = [];

  // First pass: collect cache hits synchronously
  for (const item of items) {
    const cacheKey = getCacheKey(item.title, item.year, item.type);
    const cached = cinemetaCache.get(cacheKey);
    if (cached !== undefined) {
      cacheStats.hits++;
      logCacheStatsIfNeeded();
      results.set(item.title, cached !== NOT_FOUND ? cached : null);
    } else {
      uncachedItems.push(item);
    }
  }

  // Log if we saved work via cache
  if (uncachedItems.length < items.length) {
    logger.debug('Cinemeta batch: cache pre-filter', {
      total: items.length,
      cached: items.length - uncachedItems.length,
      toFetch: uncachedItems.length,
    });
  }

  // Second pass: fetch only uncached items in batches
  if (uncachedItems.length > 0) {
    const BATCH_SIZE = 10;
    for (let i = 0; i < uncachedItems.length; i += BATCH_SIZE) {
      const batch = uncachedItems.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((item) => lookupTitle(item.title, item.year, item.type))
      );

      batch.forEach((item, index) => {
        // eslint-disable-next-line security/detect-object-injection -- index from forEach is always valid
        const batchResult = batchResults[index];
        results.set(item.title, batchResult !== undefined ? batchResult : null);
      });
    }
  }

  return results;
}

/**
 * Clear the Cinemeta cache and reset stats
 */
export function clearCinemetaCache(): void {
  cinemetaCache.clear();
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.inFlightHits = 0;
  cacheStats.operations = 0;
  logger.debug('Cinemeta cache cleared');
}
