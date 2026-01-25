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
  SimpleRecommendation,
} from '../types/index.js';
import type { CacheableValue } from '../cache/index.js';
import { generateContextSignals } from '../signals/context.js';
import { getCache, generateCacheKey } from '../cache/index.js';
import { createConfigHash } from '../config/schema.js';
import { logger, InFlightTracker } from '../utils/index.js';
import { executeSearch as executeAISearch } from '../services/search.js';
import { normalizeSearchQuery } from '../prompts/index.js';
import { SEARCH_TTL_SECONDS } from './definitions.js';
import { resolveToMetas } from './metaResolver.js';

// In-Flight Search Tracking using shared utility
const SEARCH_TIMEOUT_MS = 90 * 1000;
const inFlightSearches = new InFlightTracker<SimpleRecommendation[]>('search', SEARCH_TIMEOUT_MS);

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

    const metas = await resolveToMetas(cached.items, { contentType });
    return { metas };
  }

  // 2. Check if search is in progress
  let searchPromise = inFlightSearches.get(cacheKey);

  if (!searchPromise) {
    // 3. Start new search
    logger.info('Starting search generation', { query: normalizedQuery, contentType });

    const context = await generateContextSignals(config);

    searchPromise = executeAISearch(config, context, query, contentType).then(async (items) => {
      // Cache the result
      const cacheEntry: SearchCacheEntry = {
        items,
        generatedAt: Date.now(),
        expiresAt: Date.now() + SEARCH_TTL_SECONDS * 1000,
      };
      await cache.set<SearchCacheEntry>(cacheKey, cacheEntry, SEARCH_TTL_SECONDS);
      logger.debug('Cached search results', { query: normalizedQuery, contentType });
      return items;
    });

    // InFlightTracker automatically cleans up on promise settlement
    inFlightSearches.set(cacheKey, searchPromise);
  } else {
    logger.info('Waiting for in-flight search', { query: normalizedQuery, contentType });
  }

  try {
    const items = await searchPromise;
    const metas = await resolveToMetas(items, { contentType, rpdbApiKey: config.rpdbApiKey });
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
