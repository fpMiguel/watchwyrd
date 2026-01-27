/**
 * Test Fixtures - AI Recommendations
 *
 * Sample recommendation data for testing.
 */

import type { Recommendation } from '../../src/schemas/recommendations.js';

/**
 * Valid movie recommendation
 */
export const VALID_MOVIE_RECOMMENDATION: Recommendation = {
  title: 'The Shawshank Redemption',
  year: 1994,
  reason: 'A timeless story of hope and friendship.',
};

/**
 * Valid series recommendation
 */
export const VALID_SERIES_RECOMMENDATION: Recommendation = {
  title: 'Breaking Bad',
  year: 2008,
  reason: 'Gripping drama with stellar performances.',
};

/**
 * Sample movie recommendations list
 */
export const SAMPLE_MOVIE_RECOMMENDATIONS: Recommendation[] = [
  { title: 'The Shawshank Redemption', year: 1994, reason: 'A classic tale of hope.' },
  { title: 'The Godfather', year: 1972, reason: 'Masterpiece of cinema.' },
  { title: 'Pulp Fiction', year: 1994, reason: 'Tarantino at his best.' },
  { title: 'The Dark Knight', year: 2008, reason: "Heath Ledger's iconic performance." },
  { title: 'Inception', year: 2010, reason: 'Mind-bending storytelling.' },
  { title: 'Interstellar', year: 2014, reason: 'Epic space adventure.' },
  { title: 'The Matrix', year: 1999, reason: 'Revolutionary sci-fi.' },
  { title: 'Goodfellas', year: 1990, reason: 'Scorsese classic.' },
  { title: 'Fight Club', year: 1999, reason: 'Thought-provoking thriller.' },
  { title: 'Forrest Gump', year: 1994, reason: 'Heartwarming journey.' },
];

/**
 * Sample series recommendations list
 */
export const SAMPLE_SERIES_RECOMMENDATIONS: Recommendation[] = [
  { title: 'Breaking Bad', year: 2008, reason: 'Perfect character development.' },
  { title: 'Game of Thrones', year: 2011, reason: 'Epic fantasy.' },
  { title: 'The Wire', year: 2002, reason: 'Realistic crime drama.' },
  { title: 'The Sopranos', year: 1999, reason: 'Groundbreaking TV.' },
  { title: 'Stranger Things', year: 2016, reason: 'Nostalgic sci-fi horror.' },
  { title: 'True Detective', year: 2014, reason: 'Atmospheric thriller.' },
  { title: 'The Office', year: 2005, reason: 'Workplace comedy gold.' },
  { title: 'Better Call Saul', year: 2015, reason: 'Worthy Breaking Bad prequel.' },
  { title: 'Chernobyl', year: 2019, reason: 'Harrowing historical drama.' },
  { title: 'The Mandalorian', year: 2019, reason: 'Star Wars at its best.' },
];

/**
 * Recommendations without optional reason field (but with year!)
 */
export const MINIMAL_RECOMMENDATIONS: Recommendation[] = [
  { title: 'Movie One', year: 2020 },
  { title: 'Movie Two', year: 2021 },
  { title: 'Movie Three', year: 2022 },
];

/**
 * Empty recommendations list
 */
export const EMPTY_RECOMMENDATIONS: Recommendation[] = [];

/**
 * Recommendations with special characters
 */
export const SPECIAL_CHAR_RECOMMENDATIONS: Recommendation[] = [
  { title: 'Se7en', year: 1995, reason: 'Dark thriller.' },
  { title: 'Amélie', year: 2001, reason: 'French romantic comedy.' },
  { title: '12 Years a Slave', year: 2013, reason: 'Powerful drama.' },
  { title: 'E.T. the Extra-Terrestrial', year: 1982, reason: 'Spielberg classic.' },
];

/**
 * Factory to create N recommendations
 */
export function createRecommendations(
  count: number,
  type: 'movie' | 'series' = 'movie'
): Recommendation[] {
  const base = type === 'movie' ? SAMPLE_MOVIE_RECOMMENDATIONS : SAMPLE_SERIES_RECOMMENDATIONS;

  // Repeat base array if needed
  const result: Recommendation[] = [];
  for (let i = 0; i < count; i++) {
    const item = base[i % base.length];
    result.push({
      ...item,
      title: count > base.length ? `${item.title} ${Math.floor(i / base.length) + 1}` : item.title,
    });
  }

  return result;
}

/**
 * Invalid recommendation (missing title)
 */
export const INVALID_RECOMMENDATION_NO_TITLE = {
  year: 2020,
  reason: 'Missing title.',
};

/**
 * Invalid recommendation (wrong year type)
 */
export const INVALID_RECOMMENDATION_BAD_YEAR = {
  title: 'Test Movie',
  year: 'twenty-twenty',
  reason: 'Year should be number.',
};
