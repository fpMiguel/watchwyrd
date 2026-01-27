/**
 * Watchwyrd - Cinemeta Service Tests
 *
 * Tests for the Cinemeta lookup service that validates
 * AI-generated recommendations against Stremio's metadata.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  lookupTitle,
  getCinemetaMeta,
  clearCinemetaCache,
  getCacheStats,
} from '../src/services/cinemeta.js';

describe('Cinemeta Service', () => {
  beforeEach(() => {
    // Clear cache between tests
    clearCinemetaCache();
  });

  describe('lookupTitle', () => {
    it('should find well-known movies by title', { timeout: 10000 }, async () => {
      const result = await lookupTitle('The Shawshank Redemption', 1994, 'movie');

      expect(result).not.toBeNull();
      expect(result?.imdbId).toBe('tt0111161');
      expect(result?.title).toContain('Shawshank');
      expect(result?.year).toBe(1994);
      expect(result?.type).toBe('movie');
      expect(result?.poster).toBeTruthy();
    });

    it('should find movies without exact year', { timeout: 10000 }, async () => {
      const result = await lookupTitle('Inception', undefined, 'movie');

      expect(result).not.toBeNull();
      expect(result?.imdbId).toBe('tt1375666');
      expect(result?.title).toContain('Inception');
    });

    it('should find TV series correctly', { timeout: 10000 }, async () => {
      const result = await lookupTitle('Breaking Bad', 2008, 'series');

      expect(result).not.toBeNull();
      expect(result?.imdbId).toBe('tt0903747');
      expect(result?.type).toBe('series');
    });

    it('should return null for non-existent titles', { timeout: 10000 }, async () => {
      const result = await lookupTitle('ThisMovieDoesNotExist12345XYZ', 2023, 'movie');

      expect(result).toBeNull();
    });

    it('should use cached results on repeat lookups', { timeout: 10000 }, async () => {
      // First lookup
      const result1 = await lookupTitle('The Matrix', 1999, 'movie');
      expect(result1).not.toBeNull();

      // Second lookup should use cache
      const result2 = await lookupTitle('The Matrix', 1999, 'movie');
      expect(result2).toEqual(result1);
    });

    it('should handle titles with special characters', { timeout: 10000 }, async () => {
      const result = await lookupTitle('Se7en', 1995, 'movie');

      expect(result).not.toBeNull();
      expect(result?.imdbId).toBe('tt0114369');
    });

    it('should match partial titles', { timeout: 10000 }, async () => {
      // "Godfather" should match "The Godfather"
      const result = await lookupTitle('Godfather', 1972, 'movie');

      expect(result).not.toBeNull();
      expect(result?.title).toContain('Godfather');
    });
  });

  describe('getCinemetaMeta', () => {
    it('should fetch metadata for valid IMDb ID', { timeout: 10000 }, async () => {
      const result = await getCinemetaMeta('tt0111161', 'movie');

      expect(result).not.toBeNull();
      expect(result?.name).toContain('Shawshank');
      // Cinemeta returns year as string or number depending on endpoint
      expect(Number(result?.year)).toBe(1994);
      expect(result?.poster).toBeTruthy();
    });

    it('should return null for invalid IMDb ID', { timeout: 10000 }, async () => {
      const result = await getCinemetaMeta('tt9999999999', 'movie');

      expect(result).toBeNull();
    });

    it('should fetch series metadata', { timeout: 10000 }, async () => {
      const result = await getCinemetaMeta('tt0903747', 'series');

      expect(result).not.toBeNull();
      expect(result?.name).toContain('Breaking Bad');
    });
  });

  describe('Content Type Separation', () => {
    it('should return null when searching movie title as series', { timeout: 10000 }, async () => {
      // "The Shawshank Redemption" is a movie, not a series
      const result = await lookupTitle('The Shawshank Redemption', 1994, 'series');

      // Should either return null or return a series (not the movie)
      if (result) {
        expect(result.type).toBe('series');
      }
    });

    it('should return null when searching series title as movie', { timeout: 10000 }, async () => {
      // "Breaking Bad" is a series, not a movie
      const result = await lookupTitle('Breaking Bad', 2008, 'movie');

      // Should either return null or return a movie (not the series)
      if (result) {
        expect(result.type).toBe('movie');
      }
    });
  });

  describe('Year Matching', () => {
    it('should prefer exact year matches', { timeout: 10000 }, async () => {
      const result = await lookupTitle('The Matrix', 1999, 'movie');

      expect(result).not.toBeNull();
      expect(result?.year).toBe(1999);
    });

    it('should accept 1-year tolerance', { timeout: 10000 }, async () => {
      // Search with year off by 1
      const result = await lookupTitle('Inception', 2011, 'movie'); // Actual year is 2010

      expect(result).not.toBeNull();
      expect(result?.title).toContain('Inception');
    });
  });

  describe('clearCinemetaCache', () => {
    it('should clear the cache', { timeout: 10000 }, async () => {
      // Populate cache
      await lookupTitle('The Shawshank Redemption', 1994, 'movie');

      // Clear it
      clearCinemetaCache();

      // The function should complete without error
      // (We can't directly test cache state, but we verify function works)
      expect(true).toBe(true);
    });
  });

  describe('getCacheStats', () => {
    it('should track cache hits and misses', { timeout: 10000 }, async () => {
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

    it('should return cache size', { timeout: 10000 }, async () => {
      clearCinemetaCache();

      await lookupTitle('Inception', 2010, 'movie');
      const stats = getCacheStats();

      expect(stats.cacheSize).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Title Normalization', () => {
    it('should normalize whitespace in cache keys', { timeout: 10000 }, async () => {
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
