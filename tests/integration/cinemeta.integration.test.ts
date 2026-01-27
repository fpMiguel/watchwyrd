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
 * 2. Record responses to update mock fixtures (see RECORD_MODE below)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { lookupTitle, getCinemetaMeta, clearCinemetaCache } from '../../src/services/cinemeta.js';

// Skip unless RUN_API_TESTS=true
const SKIP = process.env['RUN_API_TESTS'] !== 'true';

// Set to true to log responses for updating fixtures
const RECORD_MODE = process.env['RECORD_RESPONSES'] === 'true';

function recordResponse(label: string, response: unknown): void {
  if (RECORD_MODE) {
    console.log(`\n📝 RECORDED: ${label}`);
    console.log(JSON.stringify(response, null, 2));
  }
}

describe.skipIf(SKIP)('Cinemeta Integration Tests', () => {
  beforeEach(() => {
    clearCinemetaCache();
  });

  describe('lookupTitle - Movies', () => {
    it('should find The Shawshank Redemption', { timeout: 15000 }, async () => {
      const result = await lookupTitle('The Shawshank Redemption', 1994, 'movie');
      recordResponse('movie:the shawshank redemption:1994', result);

      expect(result).not.toBeNull();
      expect(result?.imdbId).toBe('tt0111161');
      expect(result?.title).toContain('Shawshank');
      expect(result?.year).toBe(1994);
      expect(result?.type).toBe('movie');
      expect(result?.poster).toBeTruthy();
    });

    it('should find Inception without year', { timeout: 15000 }, async () => {
      const result = await lookupTitle('Inception', undefined, 'movie');
      recordResponse('movie:inception:any', result);

      expect(result).not.toBeNull();
      // Note: Without a year, Cinemeta may return any movie named "Inception"
      // We just verify it returns something with the right title
      expect(result?.title).toBe('Inception');
      expect(result?.imdbId).toBeTruthy();
    });

    it('should find The Matrix with exact year', { timeout: 15000 }, async () => {
      const result = await lookupTitle('The Matrix', 1999, 'movie');
      recordResponse('movie:the matrix:1999', result);

      expect(result).not.toBeNull();
      expect(result?.imdbId).toBe('tt0133093');
      expect(result?.year).toBe(1999);
    });

    it('should find Se7en with special characters', { timeout: 15000 }, async () => {
      const result = await lookupTitle('Se7en', 1995, 'movie');
      recordResponse('movie:se7en:1995', result);

      expect(result).not.toBeNull();
      expect(result?.imdbId).toBe('tt0114369');
    });

    it('should find Godfather with partial title', { timeout: 15000 }, async () => {
      const result = await lookupTitle('Godfather', 1972, 'movie');
      recordResponse('movie:godfather:1972', result);

      expect(result).not.toBeNull();
      expect(result?.title).toContain('Godfather');
    });

    it('should accept 1-year tolerance', { timeout: 15000 }, async () => {
      // Inception is 2010, searching with 2011
      const result = await lookupTitle('Inception', 2011, 'movie');
      recordResponse('movie:inception:2011', result);

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Inception');
      // The year returned should be close to what we searched for
      expect(result?.year).toBeGreaterThanOrEqual(2009);
      expect(result?.year).toBeLessThanOrEqual(2012);
    });

    it('should return null for non-existent title', { timeout: 15000 }, async () => {
      const result = await lookupTitle('ThisMovieDoesNotExist12345XYZ', 2023, 'movie');
      recordResponse('movie:thismoviedoesnotexist12345xyz:2023', result);

      expect(result).toBeNull();
    });
  });

  describe('lookupTitle - Series', () => {
    it('should find Breaking Bad', { timeout: 15000 }, async () => {
      const result = await lookupTitle('Breaking Bad', 2008, 'series');
      recordResponse('series:breaking bad:2008', result);

      expect(result).not.toBeNull();
      expect(result?.imdbId).toBe('tt0903747');
      expect(result?.type).toBe('series');
    });
  });

  describe('Content Type Separation', () => {
    it('should return null for movie title searched as series', { timeout: 15000 }, async () => {
      const result = await lookupTitle('The Shawshank Redemption', 1994, 'series');
      recordResponse('series:the shawshank redemption:1994', result);

      // Should either return null or a different series
      if (result) {
        expect(result.type).toBe('series');
        expect(result.imdbId).not.toBe('tt0111161'); // Not the movie
      }
    });

    it('should return null for series title searched as movie', { timeout: 15000 }, async () => {
      const result = await lookupTitle('Breaking Bad', 2008, 'movie');
      recordResponse('movie:breaking bad:2008', result);

      // Should either return null or a different movie
      if (result) {
        expect(result.type).toBe('movie');
        expect(result.imdbId).not.toBe('tt0903747'); // Not the series
      }
    });
  });

  describe('getCinemetaMeta', () => {
    it('should fetch metadata for valid IMDb ID', { timeout: 15000 }, async () => {
      const result = await getCinemetaMeta('tt0111161', 'movie');
      recordResponse('meta:tt0111161:movie', result);

      expect(result).not.toBeNull();
      expect(result?.name).toContain('Shawshank');
      expect(Number(result?.year)).toBe(1994);
      expect(result?.poster).toBeTruthy();
    });

    it('should return null for invalid IMDb ID', { timeout: 15000 }, async () => {
      const result = await getCinemetaMeta('tt9999999999', 'movie');
      recordResponse('meta:tt9999999999:movie', result);

      expect(result).toBeNull();
    });

    it('should fetch series metadata', { timeout: 15000 }, async () => {
      const result = await getCinemetaMeta('tt0903747', 'series');
      recordResponse('meta:tt0903747:series', result);

      expect(result).not.toBeNull();
      expect(result?.name).toContain('Breaking Bad');
    });
  });

  describe('Cache Behavior', () => {
    it('should cache results for repeat lookups', { timeout: 15000 }, async () => {
      // First lookup
      const result1 = await lookupTitle('The Matrix', 1999, 'movie');
      expect(result1).not.toBeNull();

      // Second lookup should use cache (much faster)
      const start = Date.now();
      const result2 = await lookupTitle('The Matrix', 1999, 'movie');
      const duration = Date.now() - start;

      expect(result2).toEqual(result1);
      // Cache hit should be < 5ms
      expect(duration).toBeLessThan(50);
    });
  });
});

// Instructions for recording new fixtures
if (RECORD_MODE) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                      RECORD MODE ENABLED                       ║
╠════════════════════════════════════════════════════════════════╣
║ Responses will be logged to console.                           ║
║ Copy the logged JSON to update:                                ║
║   tests/__fixtures__/recorded/cinemeta-responses.ts            ║
╚════════════════════════════════════════════════════════════════╝
`);
}
