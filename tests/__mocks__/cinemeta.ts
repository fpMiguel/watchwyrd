/**
 * Mock Cinemeta Service
 *
 * Mock implementation for testing without real Cinemeta API calls.
 * Uses recorded real API responses for realistic test data.
 *
 * Usage:
 *   vi.mock('../src/services/cinemeta.js', () => import('./__mocks__/cinemeta.js'));
 *
 * To update fixtures with real data:
 *   1. Run: RECORD_RESPONSES=true npm run test:integration
 *   2. Copy responses to tests/__fixtures__/recorded/cinemeta-responses.ts
 */

import { vi } from 'vitest';
import type { ContentType } from '../../src/types/index.js';
import { KNOWN_MOVIE_IDS, KNOWN_SERIES_IDS } from '../__fixtures__/catalogs.js';
import {
  getRecordedSearch,
  getRecordedMeta,
  type RecordedCinemetaResult,
} from '../__fixtures__/recorded/cinemeta-responses.js';

// =============================================================================
// Fallback Data (used when recorded fixtures don't have a match)
// =============================================================================

/**
 * Known titles for fallback lookups
 */
const KNOWN_TITLES: Record<
  string,
  { imdbId: string; title: string; year: number; type: ContentType; poster: string }
> = {
  'the shawshank redemption': {
    imdbId: KNOWN_MOVIE_IDS.shawshank,
    title: 'The Shawshank Redemption',
    year: 1994,
    type: 'movie',
    poster: 'https://example.com/shawshank.jpg',
  },
  'the godfather': {
    imdbId: KNOWN_MOVIE_IDS.godfather,
    title: 'The Godfather',
    year: 1972,
    type: 'movie',
    poster: 'https://example.com/godfather.jpg',
  },
  inception: {
    imdbId: KNOWN_MOVIE_IDS.inception,
    title: 'Inception',
    year: 2010,
    type: 'movie',
    poster: 'https://example.com/inception.jpg',
  },
  'the matrix': {
    imdbId: KNOWN_MOVIE_IDS.matrix,
    title: 'The Matrix',
    year: 1999,
    type: 'movie',
    poster: 'https://example.com/matrix.jpg',
  },
  'breaking bad': {
    imdbId: KNOWN_SERIES_IDS.breakingBad,
    title: 'Breaking Bad',
    year: 2008,
    type: 'series',
    poster: 'https://example.com/breakingbad.jpg',
  },
  'game of thrones': {
    imdbId: KNOWN_SERIES_IDS.gameOfThrones,
    title: 'Game of Thrones',
    year: 2011,
    type: 'series',
    poster: 'https://example.com/got.jpg',
  },
  'stranger things': {
    imdbId: KNOWN_SERIES_IDS.strangerThings,
    title: 'Stranger Things',
    year: 2016,
    type: 'series',
    poster: 'https://example.com/strangerthings.jpg',
  },
};

/**
 * Known IMDb IDs for meta lookups
 */
const KNOWN_IMDB_IDS: Record<string, { id: string; name: string; year: number; poster: string }> = {
  [KNOWN_MOVIE_IDS.shawshank]: {
    id: KNOWN_MOVIE_IDS.shawshank,
    name: 'The Shawshank Redemption',
    year: 1994,
    poster: 'https://example.com/shawshank.jpg',
  },
  [KNOWN_MOVIE_IDS.godfather]: {
    id: KNOWN_MOVIE_IDS.godfather,
    name: 'The Godfather',
    year: 1972,
    poster: 'https://example.com/godfather.jpg',
  },
  [KNOWN_SERIES_IDS.breakingBad]: {
    id: KNOWN_SERIES_IDS.breakingBad,
    name: 'Breaking Bad',
    year: 2008,
    poster: 'https://example.com/breakingbad.jpg',
  },
};

// =============================================================================
// Mock State
// =============================================================================

/**
 * Cache statistics (mirrors real implementation)
 */
const mockCacheStats = {
  hits: 0,
  misses: 0,
  inFlightHits: 0,
  operations: 0,
};

/**
 * Internal cache for mock (simulates real caching behavior)
 */
const mockCache = new Map<string, RecordedCinemetaResult | null>();

/**
 * Generate cache key (mirrors real implementation)
 */
function getCacheKey(title: string, year: number | undefined, type: ContentType): string {
  const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${type}:${normalizedTitle}:${year || 'any'}`;
}

// =============================================================================
// Mock Functions (for vi.mock usage)
// =============================================================================

/**
 * Mock lookupTitle - uses recorded fixtures with fallback to KNOWN_TITLES
 */
export const lookupTitle = vi
  .fn()
  .mockImplementation(
    async (
      title: string,
      year: number | undefined,
      type: ContentType
    ): Promise<RecordedCinemetaResult | null> => {
      const cacheKey = getCacheKey(title, year, type);
      mockCacheStats.operations++;

      // Check mock cache first
      if (mockCache.has(cacheKey)) {
        mockCacheStats.hits++;
        return mockCache.get(cacheKey) ?? null;
      }

      mockCacheStats.misses++;

      // Try recorded fixtures first
      const recorded = getRecordedSearch(title, year, type);
      if (recorded !== undefined) {
        mockCache.set(cacheKey, recorded);
        return recorded;
      }

      // Fallback to KNOWN_TITLES
      const normalizedTitle = title.toLowerCase().trim();
      const known = KNOWN_TITLES[normalizedTitle];
      if (known && known.type === type) {
        const result: RecordedCinemetaResult = {
          imdbId: known.imdbId,
          title: known.title,
          year: known.year,
          poster: known.poster,
          type: known.type,
        };
        mockCache.set(cacheKey, result);
        return result;
      }

      // Not found
      mockCache.set(cacheKey, null);
      return null;
    }
  );

/**
 * Mock lookupTitles - batch lookup using lookupTitle
 */
export const lookupTitles = vi
  .fn()
  .mockImplementation(
    async (
      items: Array<{ title: string; year?: number; type: ContentType }>
    ): Promise<Map<string, RecordedCinemetaResult | null>> => {
      const results = new Map<string, RecordedCinemetaResult | null>();

      for (const item of items) {
        const result = await lookupTitle(item.title, item.year, item.type);
        results.set(item.title, result);
      }

      return results;
    }
  );

/**
 * Mock getCinemetaMeta - uses recorded fixtures with fallback
 */
export const getCinemetaMeta = vi
  .fn()
  .mockImplementation(
    async (
      imdbId: string,
      _type: ContentType
    ): Promise<{ id: string; name: string; year?: number; poster?: string } | null> => {
      // Try recorded fixtures first
      const recorded = getRecordedMeta(imdbId);
      if (recorded !== undefined) {
        return recorded;
      }

      // Fallback to KNOWN_IMDB_IDS
      return KNOWN_IMDB_IDS[imdbId] ?? null;
    }
  );

/**
 * Mock clearCinemetaCache - resets mock state
 */
export const clearCinemetaCache = vi.fn().mockImplementation(() => {
  mockCache.clear();
  mockCacheStats.hits = 0;
  mockCacheStats.misses = 0;
  mockCacheStats.inFlightHits = 0;
  mockCacheStats.operations = 0;
});

/**
 * Mock getCacheStats - returns mock cache statistics
 */
export const getCacheStats = vi.fn().mockImplementation(() => {
  const total = mockCacheStats.hits + mockCacheStats.misses;
  const hitRate = total > 0 ? ((mockCacheStats.hits / total) * 100).toFixed(1) : '0.0';
  return {
    hits: mockCacheStats.hits,
    misses: mockCacheStats.misses,
    inFlightHits: mockCacheStats.inFlightHits,
    hitRate: `${hitRate}%`,
    cacheSize: mockCache.size,
  };
});

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Reset all mock state and call counts
 */
export function resetCinemetaMocks(): void {
  lookupTitle.mockClear();
  lookupTitles.mockClear();
  getCinemetaMeta.mockClear();
  clearCinemetaCache.mockClear();
  getCacheStats.mockClear();
  mockCache.clear();
  mockCacheStats.hits = 0;
  mockCacheStats.misses = 0;
  mockCacheStats.inFlightHits = 0;
  mockCacheStats.operations = 0;
}
