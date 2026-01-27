/**
 * Cinemeta Integration Tests
 *
 * These tests make REAL API calls to Cinemeta.
 * They are skipped by default and only run when RUN_API_TESTS=true.
 *
 * Run with: npm run test:integration
 *
 * These tests serve two purposes:
 * 1. Verify the real Cinemeta API integration works
 * 2. Record responses to update mock fixtures (set RECORD_RESPONSES=true)
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { lookupTitle, getCinemetaMeta, clearCinemetaCache } from '../../src/services/cinemeta.js';
import {
  SKIP_INTEGRATION,
  recordResponse,
  printRecordModeBanner,
} from './__helpers__/integration-utils.js';

// Cinemeta-specific timeout (faster than AI providers)
const CINEMETA_TIMEOUT = 15_000;

describe.skipIf(SKIP_INTEGRATION)('Cinemeta Integration Tests', () => {
  beforeAll(() => {
    printRecordModeBanner('Cinemeta Integration Tests');
  });

  beforeEach(() => {
    clearCinemetaCache();
  });

  // ===========================================================================
  // lookupTitle - Movies
  // ===========================================================================

  describe('lookupTitle - Movies', () => {
    it('should find The Shawshank Redemption', { timeout: CINEMETA_TIMEOUT }, async () => {
      const result = await lookupTitle('The Shawshank Redemption', 1994, 'movie');
      recordResponse('cinemeta:movie:the-shawshank-redemption:1994', result);

      expect(result).not.toBeNull();
      expect(result?.imdbId).toBe('tt0111161');
      expect(result?.title).toContain('Shawshank');
      expect(result?.year).toBe(1994);
      expect(result?.type).toBe('movie');
      expect(result?.poster).toBeTruthy();
    });

    it('should find Inception without year', { timeout: CINEMETA_TIMEOUT }, async () => {
      const result = await lookupTitle('Inception', undefined, 'movie');
      recordResponse('cinemeta:movie:inception:any', result);

      expect(result).not.toBeNull();
      // Note: Without a year, Cinemeta may return any movie named "Inception"
      // We just verify it returns something with the right title
      expect(result?.title).toBe('Inception');
      expect(result?.imdbId).toBeTruthy();
    });

    it('should find The Matrix with exact year', { timeout: CINEMETA_TIMEOUT }, async () => {
      const result = await lookupTitle('The Matrix', 1999, 'movie');
      recordResponse('cinemeta:movie:the-matrix:1999', result);

      expect(result).not.toBeNull();
      expect(result?.imdbId).toBe('tt0133093');
      expect(result?.year).toBe(1999);
    });

    it('should find Se7en with special characters', { timeout: CINEMETA_TIMEOUT }, async () => {
      const result = await lookupTitle('Se7en', 1995, 'movie');
      recordResponse('cinemeta:movie:se7en:1995', result);

      expect(result).not.toBeNull();
      expect(result?.imdbId).toBe('tt0114369');
    });

    it('should find Godfather with partial title', { timeout: CINEMETA_TIMEOUT }, async () => {
      const result = await lookupTitle('Godfather', 1972, 'movie');
      recordResponse('cinemeta:movie:godfather:1972', result);

      expect(result).not.toBeNull();
      expect(result?.title).toContain('Godfather');
    });

    it('should accept 1-year tolerance', { timeout: CINEMETA_TIMEOUT }, async () => {
      // Inception is 2010, searching with 2011
      const result = await lookupTitle('Inception', 2011, 'movie');
      recordResponse('cinemeta:movie:inception:2011', result);

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Inception');
      // The year returned should be close to what we searched for
      expect(result?.year).toBeGreaterThanOrEqual(2009);
      expect(result?.year).toBeLessThanOrEqual(2012);
    });

    it('should return null for non-existent title', { timeout: CINEMETA_TIMEOUT }, async () => {
      const result = await lookupTitle('ThisMovieDoesNotExist12345XYZ', 2023, 'movie');
      recordResponse('cinemeta:movie:nonexistent:2023', result);

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // lookupTitle - Series
  // ===========================================================================

  describe('lookupTitle - Series', () => {
    it('should find Breaking Bad', { timeout: CINEMETA_TIMEOUT }, async () => {
      const result = await lookupTitle('Breaking Bad', 2008, 'series');
      recordResponse('cinemeta:series:breaking-bad:2008', result);

      expect(result).not.toBeNull();
      expect(result?.imdbId).toBe('tt0903747');
      expect(result?.type).toBe('series');
    });
  });

  // ===========================================================================
  // Content Type Separation
  // ===========================================================================

  describe('Content Type Separation', () => {
    it(
      'should return null for movie title searched as series',
      { timeout: CINEMETA_TIMEOUT },
      async () => {
        const result = await lookupTitle('The Shawshank Redemption', 1994, 'series');
        recordResponse('cinemeta:series:the-shawshank-redemption:1994', result);

        // Should either return null or a different series
        if (result) {
          expect(result.type).toBe('series');
          expect(result.imdbId).not.toBe('tt0111161'); // Not the movie
        }
      }
    );

    it(
      'should return null for series title searched as movie',
      { timeout: CINEMETA_TIMEOUT },
      async () => {
        const result = await lookupTitle('Breaking Bad', 2008, 'movie');
        recordResponse('cinemeta:movie:breaking-bad:2008', result);

        // Should either return null or a different movie
        if (result) {
          expect(result.type).toBe('movie');
          expect(result.imdbId).not.toBe('tt0903747'); // Not the series
        }
      }
    );
  });

  // ===========================================================================
  // getCinemetaMeta
  // ===========================================================================

  describe('getCinemetaMeta', () => {
    it('should fetch metadata for valid IMDb ID', { timeout: CINEMETA_TIMEOUT }, async () => {
      const result = await getCinemetaMeta('tt0111161', 'movie');
      recordResponse('cinemeta:meta:tt0111161:movie', result);

      expect(result).not.toBeNull();
      expect(result?.name).toContain('Shawshank');
      expect(Number(result?.year)).toBe(1994);
      expect(result?.poster).toBeTruthy();
    });

    it('should return null for invalid IMDb ID', { timeout: CINEMETA_TIMEOUT }, async () => {
      const result = await getCinemetaMeta('tt9999999999', 'movie');
      recordResponse('cinemeta:meta:tt9999999999:movie', result);

      expect(result).toBeNull();
    });

    it('should fetch series metadata', { timeout: CINEMETA_TIMEOUT }, async () => {
      const result = await getCinemetaMeta('tt0903747', 'series');
      recordResponse('cinemeta:meta:tt0903747:series', result);

      expect(result).not.toBeNull();
      expect(result?.name).toContain('Breaking Bad');
    });
  });

  // ===========================================================================
  // Cache Behavior
  // ===========================================================================

  describe('Cache Behavior', () => {
    it('should cache results for repeat lookups', { timeout: CINEMETA_TIMEOUT }, async () => {
      // First lookup
      const result1 = await lookupTitle('The Matrix', 1999, 'movie');
      expect(result1).not.toBeNull();

      // Second lookup should use cache (much faster)
      const start = Date.now();
      const result2 = await lookupTitle('The Matrix', 1999, 'movie');
      const duration = Date.now() - start;

      expect(result2).toEqual(result1);
      // Cache hit should be < 50ms
      expect(duration).toBeLessThan(50);
    });
  });
});
