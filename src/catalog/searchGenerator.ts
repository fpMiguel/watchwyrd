/**
 * Watchwyrd - Search Generator
 *
 * Handles natural language search with smart caching.
 *
 * Key features:
 * - Single AI call returns BOTH movies and series
 * - Results cached together, served separately per Stremio request
 * - Context-aware search using time/weather signals
 */

import type {
  UserConfig,
  ContentType,
  StremioCatalog,
  StremioMeta,
  SimpleRecommendation,
  CachedCatalog,
} from '../types/index.js';
import { generateContextSignals } from '../signals/context.js';
import { getCache, generateCacheKey } from '../cache/index.js';
import { createConfigHash } from '../config/schema.js';
import { logger } from '../utils/logger.js';
import { lookupTitle } from '../services/cinemeta.js';
import { executeSearch as executeAISearch } from '../services/search.js';
import { normalizeSearchQuery } from '../prompts/index.js';
import { SEARCH_TTL_SECONDS } from './definitions.js';

// =============================================================================
// Types
// =============================================================================

interface SearchCacheEntry {
  movies: SimpleRecommendation[];
  series: SimpleRecommendation[];
  generatedAt: number;
  expiresAt: number;
}

// =============================================================================
// In-Flight Search Tracking (prevents duplicate AI calls)
// =============================================================================

const inFlightSearches = new Map<string, Promise<SearchCacheEntry>>();
const searchStartTimes = new Map<string, number>();
const SEARCH_TIMEOUT_MS = 90 * 1000;

// Cleanup stale searches periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, startTime] of searchStartTimes.entries()) {
    if (now - startTime > SEARCH_TIMEOUT_MS) {
      inFlightSearches.delete(key);
      searchStartTimes.delete(key);
      logger.warn('Cleaned up stale in-flight search', { key });
    }
  }
}, 60 * 1000);

// =============================================================================
// Cinemeta Resolution
// =============================================================================

/**
 * Resolve recommendations to Stremio metas
 */
async function resolveToMetas(
  recommendations: SimpleRecommendation[],
  contentType: ContentType
): Promise<StremioMeta[]> {
  const metas: StremioMeta[] = [];

  const lookupPromises = recommendations.map((rec) =>
    lookupTitle(rec.title, rec.year, contentType).then((result) => ({ rec, result }))
  );

  const results = await Promise.all(lookupPromises);

  for (const { result } of results) {
    if (result?.type !== contentType) continue;

    metas.push({
      id: result.imdbId,
      type: result.type,
      name: result.title,
      poster: result.poster,
      releaseInfo: result.year ? String(result.year) : undefined,
    });
  }

  return metas;
}

// =============================================================================
// Search Generation
// =============================================================================

/**
 * Generate search results using AI
 * Returns both movies and series in a single call
 */
async function generateSearchResults(config: UserConfig, query: string): Promise<SearchCacheEntry> {
  logger.info('Generating search results', { query });

  // Generate context for the search
  const context = await generateContextSignals(config);

  try {
    // Execute AI search (returns both movies and series)
    const response = await executeAISearch(config, context, query);

    return {
      movies: response.movies,
      series: response.series,
      generatedAt: Date.now(),
      expiresAt: Date.now() + SEARCH_TTL_SECONDS * 1000,
    };
  } catch (error) {
    logger.error('Search generation failed', {
      query,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Execute a natural language search
 *
 * Flow:
 * 1. Check cache for existing results
 * 2. Check if search is already in progress
 * 3. Generate new results via AI (returns both types)
 * 4. Cache combined results
 * 5. Return requested type
 */
export async function executeSearch(
  config: UserConfig,
  contentType: ContentType,
  query: string
): Promise<StremioCatalog> {
  const normalizedQuery = normalizeSearchQuery(query);
  const configHash = createConfigHash(config);

  // Cache key includes config but NOT content type (we cache both together)
  const cacheKey = generateCacheKey(configHash, `search-${normalizedQuery}`, '');

  const cache = getCache();

  // 1. Check cache
  const cached = (await cache.get(cacheKey)) as unknown as SearchCacheEntry | undefined;
  if (cached && cached.expiresAt > Date.now()) {
    logger.info('Returning cached search results', {
      query: normalizedQuery,
      contentType,
      age: Math.round((Date.now() - cached.generatedAt) / 1000),
    });

    const recommendations = contentType === 'movie' ? cached.movies : cached.series;
    const metas = await resolveToMetas(recommendations, contentType);
    return { metas };
  }

  // 2. Check if search is in progress
  let searchPromise = inFlightSearches.get(cacheKey);

  if (!searchPromise) {
    // 3. Start new search
    logger.info('Starting search generation', { query: normalizedQuery });
    searchStartTimes.set(cacheKey, Date.now());

    searchPromise = generateSearchResults(config, query)
      .then(async (result) => {
        // Cache the combined result (cast to CachedCatalog for cache.set compatibility)
        await cache.set(cacheKey, result as unknown as CachedCatalog, SEARCH_TTL_SECONDS);
        logger.debug('Cached search results', { query: normalizedQuery });
        return result;
      })
      .finally(() => {
        inFlightSearches.delete(cacheKey);
        searchStartTimes.delete(cacheKey);
      });

    inFlightSearches.set(cacheKey, searchPromise);
  } else {
    logger.info('Waiting for in-flight search', { query: normalizedQuery });
  }

  try {
    const result = await searchPromise;
    const recommendations = contentType === 'movie' ? result.movies : result.series;
    const metas = await resolveToMetas(recommendations, contentType);
    return { metas };
  } catch (error) {
    logger.error('Search failed', {
      query: normalizedQuery,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { metas: [] };
  }
}

/**
 * Check if a catalog ID is a search catalog
 */
export function isSearchCatalog(catalogId: string): boolean {
  return catalogId.includes('search');
}
