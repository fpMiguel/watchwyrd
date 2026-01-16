/**
 * Test Fixtures - Catalog Responses
 *
 * Sample Stremio catalog data for testing.
 */

import type { StremioMeta, StremioCatalog } from '../../src/types/index.js';

/**
 * Valid Stremio meta object for a movie
 */
export const VALID_MOVIE_META: StremioMeta = {
  id: 'tt0111161',
  type: 'movie',
  name: 'The Shawshank Redemption',
  poster: 'https://example.com/poster.jpg',
  year: 1994,
  genres: ['Drama'],
  description: 'A classic tale of hope and friendship.',
};

/**
 * Valid Stremio meta object for a series
 */
export const VALID_SERIES_META: StremioMeta = {
  id: 'tt0903747',
  type: 'series',
  name: 'Breaking Bad',
  poster: 'https://example.com/poster.jpg',
  year: 2008,
  genres: ['Drama', 'Crime', 'Thriller'],
  description: 'A high school chemistry teacher turned meth cook.',
};

/**
 * Minimal valid meta (only required fields)
 */
export const MINIMAL_META: StremioMeta = {
  id: 'tt1234567',
  type: 'movie',
  name: 'Test Movie',
};

/**
 * Meta with RPDB poster
 */
export const META_WITH_RPDB: StremioMeta = {
  id: 'tt0111161',
  type: 'movie',
  name: 'The Shawshank Redemption',
  poster: 'https://api.ratingposterdb.com/xxxxx/imdb/poster-default/tt0111161.jpg',
  year: 1994,
};

/**
 * Sample movie catalog
 */
export const SAMPLE_MOVIE_CATALOG: StremioCatalog = {
  metas: [
    {
      id: 'tt0111161',
      type: 'movie',
      name: 'The Shawshank Redemption',
      poster: 'https://example.com/shawshank.jpg',
      year: 1994,
    },
    {
      id: 'tt0068646',
      type: 'movie',
      name: 'The Godfather',
      poster: 'https://example.com/godfather.jpg',
      year: 1972,
    },
    {
      id: 'tt0468569',
      type: 'movie',
      name: 'The Dark Knight',
      poster: 'https://example.com/darkknight.jpg',
      year: 2008,
    },
  ],
};

/**
 * Sample series catalog
 */
export const SAMPLE_SERIES_CATALOG: StremioCatalog = {
  metas: [
    {
      id: 'tt0903747',
      type: 'series',
      name: 'Breaking Bad',
      poster: 'https://example.com/breakingbad.jpg',
      year: 2008,
    },
    {
      id: 'tt0944947',
      type: 'series',
      name: 'Game of Thrones',
      poster: 'https://example.com/got.jpg',
      year: 2011,
    },
  ],
};

/**
 * Empty catalog
 */
export const EMPTY_CATALOG: StremioCatalog = {
  metas: [],
};

/**
 * Error catalog (returned on failure)
 */
export const ERROR_CATALOG: StremioCatalog = {
  metas: [
    {
      id: 'error-ai-failure',
      type: 'movie',
      name: '⚠️ Service Temporarily Unavailable',
      description: 'Unable to generate recommendations. Please try again later.',
      poster: 'https://via.placeholder.com/300x450/1a1a2e/ffffff?text=Error',
    },
  ],
};

/**
 * Factory to create a catalog with N items
 */
export function createCatalog(
  count: number,
  type: 'movie' | 'series' = 'movie'
): StremioCatalog {
  const metas: StremioMeta[] = [];

  for (let i = 0; i < count; i++) {
    metas.push({
      id: `tt${(1000000 + i).toString().padStart(7, '0')}`,
      type,
      name: `Test ${type === 'movie' ? 'Movie' : 'Series'} ${i + 1}`,
      poster: `https://example.com/poster${i}.jpg`,
      year: 2000 + (i % 25),
    });
  }

  return { metas };
}

/**
 * IMDB IDs for well-known movies (for Cinemeta testing)
 */
export const KNOWN_MOVIE_IDS = {
  shawshank: 'tt0111161',
  godfather: 'tt0068646',
  darkKnight: 'tt0468569',
  inception: 'tt1375666',
  matrix: 'tt0133093',
  fightClub: 'tt0137523',
  forrestGump: 'tt0109830',
  pulpFiction: 'tt0110912',
  interstellar: 'tt0816692',
  goodfellas: 'tt0099685',
};

/**
 * IMDB IDs for well-known series
 */
export const KNOWN_SERIES_IDS = {
  breakingBad: 'tt0903747',
  gameOfThrones: 'tt0944947',
  theWire: 'tt0306414',
  sopranos: 'tt0141842',
  strangerThings: 'tt4574334',
  theOffice: 'tt0386676',
  betterCallSaul: 'tt3032476',
  chernobyl: 'tt7366338',
  mandalorian: 'tt8111088',
  trueDetective: 'tt2356777',
};
