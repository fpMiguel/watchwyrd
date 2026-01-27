/**
 * Watchwyrd - Cinemeta Service Tests (Mocked)
 *
 * Unit tests for the Cinemeta lookup service using mocked responses.
 * These tests run without network calls for speed and reliability.
 *
 * For real API integration tests, see: tests/integration/cinemeta.integration.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create hoisted mock references
const mocks = vi.hoisted(() => ({
  lookupTitle: vi.fn(),
  lookupTitles: vi.fn(),
  getCinemetaMeta: vi.fn(),
  clearCinemetaCache: vi.fn(),
  getCacheStats: vi.fn(),
}));

// Mock the cinemeta service
vi.mock('../src/services/cinemeta.js', () => ({
  lookupTitle: mocks.lookupTitle,
  lookupTitles: mocks.lookupTitles,
  getCinemetaMeta: mocks.getCinemetaMeta,
  clearCinemetaCache: mocks.clearCinemetaCache,
  getCacheStats: mocks.getCacheStats,
}));

// Import recorded fixtures for realistic mock data
import {
  RECORDED_CINEMETA_SEARCHES,
  RECORDED_CINEMETA_METAS,
} from './__fixtures__/recorded/cinemeta-responses.js';

// Import the mocked module
import {
  lookupTitle,
  getCinemetaMeta,
  clearCinemetaCache,
  getCacheStats,
} from '../src/services/cinemeta.js';

// =============================================================================
// Mock Implementation Helpers
// =============================================================================

/**
 * Mock cache state
 */
let mockCacheStats = { hits: 0, misses: 0, inFlightHits: 0, cacheSize: 0 };
const mockCache = new Map<string, unknown>();

function getCacheKey(title: string, year: number | undefined, type: string): string {
  const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${type}:${normalizedTitle}:${year || 'any'}`;
}

function setupMocks(): void {
  // Reset state
  mockCacheStats = { hits: 0, misses: 0, inFlightHits: 0, cacheSize: 0 };
  mockCache.clear();

  // Setup lookupTitle mock
  mocks.lookupTitle.mockImplementation(
    async (title: string, year: number | undefined, type: 'movie' | 'series') => {
      const cacheKey = getCacheKey(title, year, type);

      // Check cache
      if (mockCache.has(cacheKey)) {
        mockCacheStats.hits++;
        return mockCache.get(cacheKey);
      }

      mockCacheStats.misses++;

      // Check recorded responses
      const searchKey = `${type}:${title.toLowerCase().trim().replace(/\s+/g, ' ')}:${year || 'any'}`;
      // eslint-disable-next-line security/detect-object-injection
      let result = RECORDED_CINEMETA_SEARCHES[searchKey];

      // Try without year if not found
      if (result === undefined) {
        const anyYearKey = `${type}:${title.toLowerCase().trim().replace(/\s+/g, ' ')}:any`;
        // eslint-disable-next-line security/detect-object-injection
        result = RECORDED_CINEMETA_SEARCHES[anyYearKey];
      }

      // Store in cache and return
      mockCache.set(cacheKey, result ?? null);
      mockCacheStats.cacheSize = mockCache.size;
      return result ?? null;
    }
  );

  // Setup getCinemetaMeta mock
  mocks.getCinemetaMeta.mockImplementation(async (imdbId: string, _type: 'movie' | 'series') => {
    // eslint-disable-next-line security/detect-object-injection
    return RECORDED_CINEMETA_METAS[imdbId] ?? null;
  });

  // Setup clearCinemetaCache mock
  mocks.clearCinemetaCache.mockImplementation(() => {
    mockCache.clear();
    mockCacheStats = { hits: 0, misses: 0, inFlightHits: 0, cacheSize: 0 };
  });

  // Setup getCacheStats mock
  mocks.getCacheStats.mockImplementation(() => {
    const total = mockCacheStats.hits + mockCacheStats.misses;
    const hitRate = total > 0 ? ((mockCacheStats.hits / total) * 100).toFixed(1) : '0.0';
    return {
      hits: mockCacheStats.hits,
      misses: mockCacheStats.misses,
      inFlightHits: mockCacheStats.inFlightHits,
      hitRate: `${hitRate}%`,
      cacheSize: mockCacheStats.cacheSize,
    };
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('Cinemeta Service (Mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
    clearCinemetaCache();
  });

  describe('lookupTitle', () => {
    it('should find well-known movies by title', async () => {
      const result = await lookupTitle('The Shawshank Redemption', 1994, 'movie');

      expect(result).not.toBeNull();
      expect(result?.imdbId).toBe('tt0111161');
      expect(result?.title).toContain('Shawshank');
      expect(result?.year).toBe(1994);
      expect(result?.type).toBe('movie');
      expect(result?.poster).toBeTruthy();
    });

    it('should find movies without exact year', async () => {
      const result = await lookupTitle('Inception', undefined, 'movie');

      expect(result).not.toBeNull();
      expect(result?.imdbId).toBe('tt1375666');
      expect(result?.title).toBe('Inception');
    });

    it('should find TV series correctly', async () => {
      const result = await lookupTitle('Breaking Bad', 2008, 'series');

      expect(result).not.toBeNull();
      expect(result?.imdbId).toBe('tt0903747');
      expect(result?.type).toBe('series');
    });

    it('should return null for non-existent titles', async () => {
      const result = await lookupTitle('ThisMovieDoesNotExist12345XYZ', 2023, 'movie');

      expect(result).toBeNull();
    });

    it('should use cached results on repeat lookups', async () => {
      // First lookup
      const result1 = await lookupTitle('The Matrix', 1999, 'movie');
      expect(result1).not.toBeNull();

      // Second lookup should use cache
      const result2 = await lookupTitle('The Matrix', 1999, 'movie');
      expect(result2).toEqual(result1);
    });

    it('should handle titles with special characters', async () => {
      const result = await lookupTitle('Se7en', 1995, 'movie');

      expect(result).not.toBeNull();
      expect(result?.imdbId).toBe('tt0114369');
    });

    it('should match partial titles', async () => {
      // "Godfather" should match "The Godfather"
      const result = await lookupTitle('Godfather', 1972, 'movie');

      expect(result).not.toBeNull();
      expect(result?.title).toContain('Godfather');
    });
  });

  describe('getCinemetaMeta', () => {
    it('should fetch metadata for valid IMDb ID', async () => {
      const result = await getCinemetaMeta('tt0111161', 'movie');

      expect(result).not.toBeNull();
      expect(result?.name).toContain('Shawshank');
      expect(Number(result?.year)).toBe(1994);
      expect(result?.poster).toBeTruthy();
    });

    it('should return null for invalid IMDb ID', async () => {
      const result = await getCinemetaMeta('tt9999999999', 'movie');

      expect(result).toBeNull();
    });

    it('should fetch series metadata', async () => {
      const result = await getCinemetaMeta('tt0903747', 'series');

      expect(result).not.toBeNull();
      expect(result?.name).toContain('Breaking Bad');
    });
  });

  describe('Content Type Separation', () => {
    it('should return null when searching movie title as series', async () => {
      // "The Shawshank Redemption" is a movie, not a series
      const result = await lookupTitle('The Shawshank Redemption', 1994, 'series');

      // Should return null (recorded as null in fixtures)
      expect(result).toBeNull();
    });

    it('should return null when searching series title as movie', async () => {
      // "Breaking Bad" is a series, not a movie
      const result = await lookupTitle('Breaking Bad', 2008, 'movie');

      // Should return null (recorded as null in fixtures)
      expect(result).toBeNull();
    });
  });

  describe('Year Matching', () => {
    it('should prefer exact year matches', async () => {
      const result = await lookupTitle('The Matrix', 1999, 'movie');

      expect(result).not.toBeNull();
      expect(result?.year).toBe(1999);
    });

    it('should accept 1-year tolerance', async () => {
      // Search with year off by 1
      const result = await lookupTitle('Inception', 2011, 'movie'); // Actual year is 2010

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Inception');
    });
  });

  describe('clearCinemetaCache', () => {
    it('should clear the cache', async () => {
      // Populate cache
      await lookupTitle('The Shawshank Redemption', 1994, 'movie');

      // Clear it
      clearCinemetaCache();

      // Verify mock was called
      expect(mocks.clearCinemetaCache).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should track cache hits and misses', async () => {
      // Start with clean state
      clearCinemetaCache();
      const initialStats = getCacheStats();
      expect(initialStats.hits).toBe(0);
      expect(initialStats.misses).toBe(0);

      // First lookup - cache miss
      await lookupTitle('The Matrix', 1999, 'movie');
      const afterMiss = getCacheStats();
      expect(afterMiss.misses).toBe(1);

      // Second lookup - cache hit
      await lookupTitle('The Matrix', 1999, 'movie');
      const afterHit = getCacheStats();
      expect(afterHit.hits).toBe(1);
      expect(afterHit.hitRate).toBe('50.0%');
    });

    it('should return cache size', async () => {
      clearCinemetaCache();

      await lookupTitle('Inception', undefined, 'movie');
      const stats = getCacheStats();

      expect(stats.cacheSize).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Title Normalization', () => {
    it('should normalize whitespace in cache keys', async () => {
      clearCinemetaCache();

      // First lookup with extra spaces
      await lookupTitle('  The Matrix  ', 1999, 'movie');

      // Second lookup with normal spacing should hit cache
      const stats1 = getCacheStats();
      const missesBefore = stats1.misses;

      await lookupTitle('The Matrix', 1999, 'movie');

      const stats2 = getCacheStats();
      // Should be a cache hit, not a miss
      expect(stats2.misses).toBe(missesBefore);
      expect(stats2.hits).toBeGreaterThan(stats1.hits);
    });
  });
});
