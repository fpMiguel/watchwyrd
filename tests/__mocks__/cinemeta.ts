/**
 * Mock Cinemeta Service
 *
 * Mock implementation for testing without real Cinemeta API calls.
 */

import { vi } from 'vitest';
import type { StremioMeta } from '../../src/types/index.js';
import { KNOWN_MOVIE_IDS, KNOWN_SERIES_IDS } from '../__fixtures__/catalogs.js';

/**
 * Cinemeta lookup result
 */
export interface CinemetaResult {
  imdbId: string;
  title: string;
  year: number;
  type: 'movie' | 'series';
  poster?: string;
}

/**
 * Known titles database for mocking
 */
const KNOWN_TITLES: Record<string, CinemetaResult> = {
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
 * Known IMDb IDs to metadata
 */
const KNOWN_IMDB_IDS: Record<string, StremioMeta> = {
  [KNOWN_MOVIE_IDS.shawshank]: {
    id: KNOWN_MOVIE_IDS.shawshank,
    type: 'movie',
    name: 'The Shawshank Redemption',
    year: 1994,
    poster: 'https://example.com/shawshank.jpg',
    genres: ['Drama'],
  },
  [KNOWN_MOVIE_IDS.godfather]: {
    id: KNOWN_MOVIE_IDS.godfather,
    type: 'movie',
    name: 'The Godfather',
    year: 1972,
    poster: 'https://example.com/godfather.jpg',
    genres: ['Crime', 'Drama'],
  },
  [KNOWN_SERIES_IDS.breakingBad]: {
    id: KNOWN_SERIES_IDS.breakingBad,
    type: 'series',
    name: 'Breaking Bad',
    year: 2008,
    poster: 'https://example.com/breakingbad.jpg',
    genres: ['Crime', 'Drama', 'Thriller'],
  },
};

/**
 * Create a mock Cinemeta service
 */
export function createMockCinemetaService(options: {
  shouldFail?: boolean;
  failureRate?: number;
  responseDelay?: number;
} = {}) {
  const {
    shouldFail = false,
    failureRate = 0,
    responseDelay = 0,
  } = options;

  return {
    lookupTitle: vi.fn().mockImplementation(
      async (title: string, year?: number, type?: 'movie' | 'series') => {
        if (responseDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, responseDelay));
        }

        if (shouldFail || Math.random() < failureRate) {
          return null;
        }

        const normalizedTitle = title.toLowerCase().trim();
        const result = KNOWN_TITLES[normalizedTitle];

        if (!result) {
          return null;
        }

        // Check type matches
        if (type && result.type !== type) {
          return null;
        }

        // Check year tolerance
        if (year && Math.abs(result.year - year) > 1) {
          return null;
        }

        return result;
      }
    ),

    getCinemetaMeta: vi.fn().mockImplementation(
      async (imdbId: string, _type: 'movie' | 'series') => {
        if (responseDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, responseDelay));
        }

        if (shouldFail || Math.random() < failureRate) {
          return null;
        }

        return KNOWN_IMDB_IDS[imdbId] || null;
      }
    ),

    clearCinemetaCache: vi.fn(),
  };
}

/**
 * Mock Cinemeta that always returns results
 */
export function createAlwaysSuccessCinemeta() {
  let idCounter = 1000000;

  return {
    lookupTitle: vi.fn().mockImplementation(
      async (title: string, year?: number, type: 'movie' | 'series' = 'movie') => {
        // Check known titles first
        const normalizedTitle = title.toLowerCase().trim();
        const known = KNOWN_TITLES[normalizedTitle];
        if (known && (!type || known.type === type)) {
          return known;
        }

        // Generate a fake result for unknown titles
        return {
          imdbId: `tt${idCounter++}`,
          title,
          year: year || 2020,
          type,
          poster: `https://example.com/${encodeURIComponent(title)}.jpg`,
        };
      }
    ),

    getCinemetaMeta: vi.fn().mockImplementation(
      async (imdbId: string, type: 'movie' | 'series' = 'movie') => {
        const known = KNOWN_IMDB_IDS[imdbId];
        if (known) return known;

        // Generate fake meta
        return {
          id: imdbId,
          type,
          name: `Test Title ${imdbId}`,
          year: 2020,
          poster: `https://example.com/${imdbId}.jpg`,
        };
      }
    ),

    clearCinemetaCache: vi.fn(),
  };
}

/**
 * Mock Cinemeta that always fails
 */
export function createAlwaysFailCinemeta() {
  return {
    lookupTitle: vi.fn().mockResolvedValue(null),
    getCinemetaMeta: vi.fn().mockResolvedValue(null),
    clearCinemetaCache: vi.fn(),
  };
}
