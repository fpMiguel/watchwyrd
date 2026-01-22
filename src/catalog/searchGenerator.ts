/**
 * Watchwyrd - Search Generator
 *
 * Handles natural language search with caching.
 * Uses separate AI calls per content type for better results.
 */

import type {
  UserConfig,
  ContentType,
  StremioCatalog,
  StremioMeta,
  SimpleRecommendation,
} from '../types/index.js';
import type { CacheableValue } from '../cache/index.js';
import { generateContextSignals } from '../signals/context.js';
import { getCache, generateCacheKey } from '../cache/index.js';
import { createConfigHash } from '../config/schema.js';
import { logger } from '../utils/logger.js';
import { lookupTitles } from '../services/cinemeta.js';
import { enhancePosterUrl } from '../services/rpdb.js';
import { executeSearch as executeAISearch } from '../services/search.js';
import { normalizeSearchQuery } from '../prompts/index.js';
import { SEARCH_TTL_SECONDS } from './definitions.js';

// In-Flight Search Tracking (prevents duplicate AI calls)

const inFlightSearches = new Map<string, Promise<SimpleRecommendation[]>>();
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

// Cinemeta Resolution

/**
 * Resolve recommendations to Stremio metas
 * Optionally enhances posters with RPDB rating overlays
 */
async function resolveToMetas(
  recommendations: SimpleRecommendation[],
  contentType: ContentType,
  rpdbApiKey?: string
): Promise<StremioMeta[]> {
  const metas: StremioMeta[] = [];

  // Build lookup items for batch processing
  const lookupItems = recommendations.map((rec) => ({
    title: rec.title,
    year: rec.year,
    type: contentType,
  }));

  // Batch lookup all titles
  const lookupResults = await lookupTitles(lookupItems);

  for (const rec of recommendations) {
    const result = lookupResults.get(rec.title);
    if (result?.type !== contentType) continue;

    // Enhance poster with RPDB if configured
    const poster = enhancePosterUrl(result.poster, result.imdbId, rpdbApiKey);

    metas.push({
      id: result.imdbId,
      type: result.type,
      name: result.title,
      poster,
      releaseInfo: result.year ? String(result.year) : undefined,
    });
  }

  return metas;
}

// Search Cache Entry

interface SearchCacheEntry extends CacheableValue {
  items: SimpleRecommendation[];
}

// Public API

/**
 * Execute a natural language search for a specific content type
 *
 * Flow:
 * 1. Check cache for existing results
 * 2. Check if search is already in progress
 * 3. Generate new results via AI
 * 4. Cache results
 * 5. Resolve to Stremio metas
 */
export async function executeSearch(
  config: UserConfig,
  contentType: ContentType,
  query: string
): Promise<StremioCatalog> {
  const normalizedQuery = normalizeSearchQuery(query);
  const configHash = createConfigHash(config);
  const typeKey = contentType === 'movie' ? 'movies' : 'series';

  // Cache key includes content type (separate cache per type)
  const cacheKey = generateCacheKey(configHash, `search-${typeKey}`, normalizedQuery);

  const cache = getCache();

  // 1. Check cache
  const cached = await cache.get<SearchCacheEntry>(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    logger.info('Returning cached search results', {
      query: normalizedQuery,
      contentType,
      age: Math.round((Date.now() - cached.generatedAt) / 1000),
    });

    const metas = await resolveToMetas(cached.items, contentType);
    return { metas };
  }

  // 2. Check if search is in progress
  let searchPromise = inFlightSearches.get(cacheKey);

  if (!searchPromise) {
    // 3. Start new search
    logger.info('Starting search generation', { query: normalizedQuery, contentType });
    searchStartTimes.set(cacheKey, Date.now());

    const context = await generateContextSignals(config);

    searchPromise = executeAISearch(config, context, query, contentType)
      .then(async (items) => {
        // Cache the result
        const cacheEntry: SearchCacheEntry = {
          items,
          generatedAt: Date.now(),
          expiresAt: Date.now() + SEARCH_TTL_SECONDS * 1000,
        };
        await cache.set<SearchCacheEntry>(cacheKey, cacheEntry, SEARCH_TTL_SECONDS);
        logger.debug('Cached search results', { query: normalizedQuery, contentType });
        return items;
      })
      .finally(() => {
        inFlightSearches.delete(cacheKey);
        searchStartTimes.delete(cacheKey);
      });

    inFlightSearches.set(cacheKey, searchPromise);
  } else {
    logger.info('Waiting for in-flight search', { query: normalizedQuery, contentType });
  }

  try {
    const items = await searchPromise;
    const metas = await resolveToMetas(items, contentType, config.rpdbApiKey);
    return { metas };
  } catch (error) {
    logger.error('Search failed', {
      query: normalizedQuery,
      contentType,
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
