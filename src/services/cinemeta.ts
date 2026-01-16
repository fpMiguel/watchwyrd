/**
 * Watchwyrd - Cinemeta Service
 *
 * Uses Stremio's Cinemeta addon to look up IMDb IDs and metadata
 * by title. This ensures accurate IMDb IDs since we're querying
 * an authoritative source rather than relying on AI-generated IDs.
 */

import { logger } from '../utils/logger.js';
import { retry } from '../utils/index.js';
import type { ContentType } from '../types/index.js';

const CINEMETA_BASE = 'https://v3-cinemeta.strem.io';

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

/**
 * Cache for Cinemeta lookups to reduce API calls
 */
const cinemetaCache = new Map<string, CinemetaSearchResult | null>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const cacheTimestamps = new Map<string, number>();

/**
 * Generate cache key from title, year, and type
 */
function getCacheKey(title: string, year: number | undefined, type: ContentType): string {
  return `${type}:${title.toLowerCase()}:${year || 'any'}`;
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid(key: string): boolean {
  const timestamp = cacheTimestamps.get(key);
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Search Cinemeta catalog by title
 */
async function searchCinemeta(
  title: string,
  type: ContentType
): Promise<Array<{ id: string; name: string; year?: number; poster?: string }>> {
  const encodedQuery = encodeURIComponent(title);
  const url = `${CINEMETA_BASE}/catalog/${type}/top/search=${encodedQuery}.json`;

  try {
    const response = await retry(
      async () => {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Cinemeta search failed: ${res.status}`);
        }
        return res.json() as Promise<{
          metas?: Array<{ id: string; name: string; year?: number; poster?: string }>;
        }>;
      },
      { maxAttempts: 2, baseDelay: 500, maxDelay: 2000 }
    );

    return response.metas || [];
  } catch (error) {
    logger.warn('Cinemeta search failed', {
      title,
      type,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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
    const response = await retry(
      async () => {
        const res = await fetch(url);
        if (!res.ok) {
          if (res.status === 404) return { meta: null };
          throw new Error(`Cinemeta meta failed: ${res.status}`);
        }
        return res.json() as Promise<{
          meta?: { id: string; name: string; year?: number; poster?: string };
        }>;
      },
      { maxAttempts: 2, baseDelay: 500, maxDelay: 2000 }
    );

    return response.meta || null;
  } catch (error) {
    logger.warn('Cinemeta meta lookup failed', {
      imdbId,
      type,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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

  // Check cache first
  if (cinemetaCache.has(cacheKey) && isCacheValid(cacheKey)) {
    const cached = cinemetaCache.get(cacheKey);
    logger.debug('Cinemeta cache hit', { title, type, found: !!cached });
    return cached || null;
  }

  const results = await searchCinemeta(title, type);

  if (results.length === 0) {
    // Cache negative result to avoid repeated lookups
    cinemetaCache.set(cacheKey, null);
    cacheTimestamps.set(cacheKey, Date.now());
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
    cacheTimestamps.set(cacheKey, Date.now());
    return null;
  }

  const result: CinemetaSearchResult = {
    imdbId: bestMatch.id,
    title: bestMatch.name,
    year: bestMatch.year || year || new Date().getFullYear(),
    poster: bestMatch.poster || `https://images.metahub.space/poster/medium/${bestMatch.id}/img`,
    type,
  };

  // Cache the result
  cinemetaCache.set(cacheKey, result);
  cacheTimestamps.set(cacheKey, Date.now());

  logger.debug('Cinemeta lookup successful', {
    searchTitle: title,
    foundTitle: result.title,
    imdbId: result.imdbId,
    year: result.year,
  });

  return result;
}

/**
 * Look up multiple titles in parallel
 *
 * @param items - Array of items with title, year, and type
 * @returns Map of original titles to Cinemeta results
 */
export async function lookupTitles(
  items: Array<{ title: string; year?: number; type: ContentType }>
): Promise<Map<string, CinemetaSearchResult | null>> {
  const results = new Map<string, CinemetaSearchResult | null>();

  // Process in batches to avoid overwhelming Cinemeta
  const BATCH_SIZE = 5;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((item) => lookupTitle(item.title, item.year, item.type))
    );

    batch.forEach((item, index) => {
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
  cacheTimestamps.clear();
  logger.debug('Cinemeta cache cleared');
}
