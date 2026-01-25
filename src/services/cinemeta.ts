/**
 * Watchwyrd - Cinemeta Service
 *
 * Uses Stremio's Cinemeta addon to look up IMDb IDs and metadata
 * by title. This ensures accurate IMDb IDs since we're querying
 * an authoritative source rather than relying on AI-generated IDs.
 *
 * Features:
 * - LRU cache with configurable size (uses shared utility)
 * - 24-hour TTL for cache entries
 * - Parallel batch lookups with rate limiting
 * - Connection pooling via undici
 * - Circuit breaker for fault tolerance
 */

import { logger, LRUCache } from '../utils/index.js';
import { retry } from '../utils/index.js';
import { pooledFetch } from '../utils/http.js';
import { cinemetaCircuit } from '../utils/circuitBreaker.js';
import type { ContentType } from '../types/index.js';

const CINEMETA_BASE = 'https://v3-cinemeta.strem.io';

// Cache Configuration

const CACHE_MAX_SIZE = 5000; // Maximum entries in LRU cache
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

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

// Global cache instance using shared LRUCache utility
const cinemetaCache = new LRUCache<CinemetaSearchResult | null>(
  CACHE_MAX_SIZE,
  CACHE_TTL,
  'cinemeta'
);

// Cache Key Generation

/**
 * Generate cache key from title, year, and type
 */
function getCacheKey(title: string, year: number | undefined, type: ContentType): string {
  return `${type}:${title.toLowerCase()}:${year || 'any'}`;
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

  // Check cache first (LRU cache handles TTL internally)
  const cached = cinemetaCache.get(cacheKey);
  if (cached !== undefined) {
    logger.debug('Cinemeta cache hit', { title, type, found: !!cached });
    return cached;
  }

  const results = await searchCinemeta(title, type);

  if (results.length === 0) {
    // Cache negative result to avoid repeated lookups
    cinemetaCache.set(cacheKey, null);
    logger.debug('Cinemeta lookup: no results', { title, type, year });
    return null;
  }

  // Find best match by title and optionally year
  const normalizedTitle = title.toLowerCase().trim();
  let bestMatch: { id: string; name: string; year?: number; poster?: string } | undefined =
    results[0];
  let bestScore = 0;

  for (const result of results) {
    const resultTitle = result.name.toLowerCase().trim();
    let score = 0;

    // Exact title match
    if (resultTitle === normalizedTitle) {
      score += 100;
    } else if (resultTitle.includes(normalizedTitle) || normalizedTitle.includes(resultTitle)) {
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
    cinemetaCache.set(cacheKey, null);
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
 * @param items - Array of items with title, year, and type
 * @returns Map of original titles to Cinemeta results
 */
export async function lookupTitles(
  items: Array<{ title: string; year?: number; type: ContentType }>
): Promise<Map<string, CinemetaSearchResult | null>> {
  const results = new Map<string, CinemetaSearchResult | null>();

  // Process in larger batches with keep-alive connections
  const BATCH_SIZE = 10;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((item) => lookupTitle(item.title, item.year, item.type))
    );

    batch.forEach((item, index) => {
      // eslint-disable-next-line security/detect-object-injection -- index from forEach is always valid
      const batchResult = batchResults[index];
      results.set(item.title, batchResult !== undefined ? batchResult : null);
    });
  }

  return results;
}

/**
 * Clear the Cinemeta cache
 */
export function clearCinemetaCache(): void {
  cinemetaCache.clear();
  logger.debug('Cinemeta cache cleared');
}
