/**
 * Recorded Cinemeta API Responses
 *
 * These are real responses from the Cinemeta API, recorded for use in mocked tests.
 * This allows tests to run without network calls while using realistic data.
 *
 * To update these fixtures:
 * 1. Run: npm run test:record
 * 2. Or manually run the integration tests with RUN_API_TESTS=true
 *
 * Last updated: 2026-01-27
 */

import type { ContentType } from '../../../src/types/index.js';

/**
 * Recorded Cinemeta search result
 */
export interface RecordedCinemetaResult {
  imdbId: string;
  title: string;
  year: number;
  poster: string;
  type: ContentType;
}

/**
 * Recorded search queries and their results
 * Key format: `${type}:${normalizedTitle}:${year || 'any'}`
 */
export const RECORDED_CINEMETA_SEARCHES: Record<string, RecordedCinemetaResult | null> = {
  // Movies
  'movie:the shawshank redemption:1994': {
    imdbId: 'tt0111161',
    title: 'The Shawshank Redemption',
    year: 1994,
    poster: 'https://images.metahub.space/poster/small/tt0111161/img',
    type: 'movie',
  },
  'movie:inception:any': {
    imdbId: 'tt1375666',
    title: 'Inception',
    year: 2010,
    poster: 'https://images.metahub.space/poster/small/tt1375666/img',
    type: 'movie',
  },
  'movie:the matrix:1999': {
    imdbId: 'tt0133093',
    title: 'The Matrix',
    year: 1999,
    poster: 'https://images.metahub.space/poster/small/tt0133093/img',
    type: 'movie',
  },
  'movie:se7en:1995': {
    imdbId: 'tt0114369',
    title: 'Se7en',
    year: 1995,
    poster: 'https://images.metahub.space/poster/small/tt0114369/img',
    type: 'movie',
  },
  'movie:godfather:1972': {
    imdbId: 'tt0068646',
    title: 'The Godfather',
    year: 1972,
    poster: 'https://images.metahub.space/poster/small/tt0068646/img',
    type: 'movie',
  },
  'movie:inception:2011': {
    // Year off by 1, should still match
    imdbId: 'tt1375666',
    title: 'Inception',
    year: 2010,
    poster: 'https://images.metahub.space/poster/small/tt1375666/img',
    type: 'movie',
  },

  // Series
  'series:breaking bad:2008': {
    imdbId: 'tt0903747',
    title: 'Breaking Bad',
    year: 2008,
    poster: 'https://images.metahub.space/poster/small/tt0903747/img',
    type: 'series',
  },

  // Cross-type lookups (should return null or different result)
  'series:the shawshank redemption:1994': null, // Movie searched as series
  'movie:breaking bad:2008': null, // Series searched as movie

  // Non-existent titles
  'movie:thismoviedoesnotexist12345xyz:2023': null,
};

/**
 * Recorded Cinemeta meta lookups by IMDb ID
 */
export const RECORDED_CINEMETA_METAS: Record<
  string,
  { id: string; name: string; year?: number; poster?: string } | null
> = {
  tt0111161: {
    id: 'tt0111161',
    name: 'The Shawshank Redemption',
    year: 1994,
    poster: 'https://images.metahub.space/poster/small/tt0111161/img',
  },
  tt0903747: {
    id: 'tt0903747',
    name: 'Breaking Bad',
    year: 2008,
    poster: 'https://images.metahub.space/poster/small/tt0903747/img',
  },
  tt9999999999: null, // Invalid ID
};

/**
 * Helper to get a recorded search result
 */
export function getRecordedSearch(
  title: string,
  year: number | undefined,
  type: ContentType
): RecordedCinemetaResult | null | undefined {
  const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, ' ');
  const key = `${type}:${normalizedTitle}:${year || 'any'}`;

  // Check exact match first
  if (key in RECORDED_CINEMETA_SEARCHES) {
    return RECORDED_CINEMETA_SEARCHES[key];
  }

  // Try without year
  const keyAny = `${type}:${normalizedTitle}:any`;
  if (keyAny in RECORDED_CINEMETA_SEARCHES) {
    return RECORDED_CINEMETA_SEARCHES[keyAny];
  }

  // Return undefined to indicate "not recorded" vs null which means "recorded as not found"
  return undefined;
}

/**
 * Helper to get a recorded meta lookup
 */
export function getRecordedMeta(
  imdbId: string
): { id: string; name: string; year?: number; poster?: string } | null | undefined {
  if (imdbId in RECORDED_CINEMETA_METAS) {
    return RECORDED_CINEMETA_METAS[imdbId];
  }
  return undefined;
}
