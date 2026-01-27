/**
 * Meta Resolver Tests
 *
 * Tests for the unified meta resolution utility that:
 * - Resolves AI recommendations to Stremio metas
 * - Handles RPDB poster enhancement
 * - Handles explanation display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create hoisted mock references
const mocks = vi.hoisted(() => ({
  lookupTitles: vi.fn(),
  enhancePosterUrl: vi.fn(),
}));

vi.mock('../src/services/cinemeta.js', () => ({
  lookupTitles: mocks.lookupTitles,
}));

vi.mock('../src/services/rpdb.js', () => ({
  enhancePosterUrl: mocks.enhancePosterUrl,
}));

import { resolveToMetas } from '../src/catalog/metaResolver.js';
import type { MetaLookupInput } from '../src/catalog/metaResolver.js';

describe('resolveToMetas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: enhancePosterUrl returns the poster unchanged
    mocks.enhancePosterUrl.mockImplementation((poster: string) => poster);
  });

  it('should return empty array for empty recommendations', async () => {
    mocks.lookupTitles.mockResolvedValue(new Map());

    const result = await resolveToMetas([], { contentType: 'movie' });

    expect(result).toEqual([]);
  });

  it('should resolve recommendations to Stremio metas', async () => {
    const recommendations: MetaLookupInput[] = [
      { title: 'The Matrix', year: 1999 },
      { title: 'Inception', year: 2010 },
    ];

    const lookupResults = new Map([
      [
        'The Matrix',
        {
          imdbId: 'tt0133093',
          title: 'The Matrix',
          year: 1999,
          type: 'movie' as const,
          poster: 'https://example.com/matrix.jpg',
        },
      ],
      [
        'Inception',
        {
          imdbId: 'tt1375666',
          title: 'Inception',
          year: 2010,
          type: 'movie' as const,
          poster: 'https://example.com/inception.jpg',
        },
      ],
    ]);

    mocks.lookupTitles.mockResolvedValue(lookupResults);

    const result = await resolveToMetas(recommendations, { contentType: 'movie' });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'tt0133093',
      type: 'movie',
      name: 'The Matrix',
      poster: 'https://example.com/matrix.jpg',
      releaseInfo: '1999',
    });
    expect(result[1]).toEqual({
      id: 'tt1375666',
      type: 'movie',
      name: 'Inception',
      poster: 'https://example.com/inception.jpg',
      releaseInfo: '2010',
    });
  });

  it('should filter out results that do not match content type', async () => {
    const recommendations: MetaLookupInput[] = [
      { title: 'Breaking Bad', year: 2008 },
      { title: 'The Matrix', year: 1999 },
    ];

    const lookupResults = new Map([
      [
        'Breaking Bad',
        {
          imdbId: 'tt0903747',
          title: 'Breaking Bad',
          year: 2008,
          type: 'series' as const,
          poster: 'https://example.com/bb.jpg',
        },
      ],
      [
        'The Matrix',
        {
          imdbId: 'tt0133093',
          title: 'The Matrix',
          year: 1999,
          type: 'movie' as const,
          poster: 'https://example.com/matrix.jpg',
        },
      ],
    ]);

    mocks.lookupTitles.mockResolvedValue(lookupResults);

    // Request only movies
    const result = await resolveToMetas(recommendations, { contentType: 'movie' });

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('The Matrix');
  });

  it('should skip recommendations not found in lookup', async () => {
    const recommendations: MetaLookupInput[] = [
      { title: 'The Matrix', year: 1999 },
      { title: 'Unknown Movie', year: 2020 },
    ];

    const lookupResults = new Map([
      [
        'The Matrix',
        {
          imdbId: 'tt0133093',
          title: 'The Matrix',
          year: 1999,
          type: 'movie' as const,
          poster: 'https://example.com/matrix.jpg',
        },
      ],
    ]);

    mocks.lookupTitles.mockResolvedValue(lookupResults);

    const result = await resolveToMetas(recommendations, { contentType: 'movie' });

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('The Matrix');
  });

  it('should add explanation as description when showExplanation is true', async () => {
    const recommendations: MetaLookupInput[] = [
      { title: 'The Matrix', year: 1999, explanation: 'A groundbreaking sci-fi film' },
    ];

    const lookupResults = new Map([
      [
        'The Matrix',
        {
          imdbId: 'tt0133093',
          title: 'The Matrix',
          year: 1999,
          type: 'movie' as const,
          poster: 'https://example.com/matrix.jpg',
        },
      ],
    ]);

    mocks.lookupTitles.mockResolvedValue(lookupResults);

    const result = await resolveToMetas(recommendations, {
      contentType: 'movie',
      showExplanation: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.description).toBe('A groundbreaking sci-fi film');
  });

  it('should not add description when showExplanation is false', async () => {
    const recommendations: MetaLookupInput[] = [
      { title: 'The Matrix', year: 1999, explanation: 'A groundbreaking sci-fi film' },
    ];

    const lookupResults = new Map([
      [
        'The Matrix',
        {
          imdbId: 'tt0133093',
          title: 'The Matrix',
          year: 1999,
          type: 'movie' as const,
          poster: 'https://example.com/matrix.jpg',
        },
      ],
    ]);

    mocks.lookupTitles.mockResolvedValue(lookupResults);

    const result = await resolveToMetas(recommendations, {
      contentType: 'movie',
      showExplanation: false,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.description).toBeUndefined();
  });

  it('should not add description when explanation is undefined', async () => {
    const recommendations: MetaLookupInput[] = [{ title: 'The Matrix', year: 1999 }];

    const lookupResults = new Map([
      [
        'The Matrix',
        {
          imdbId: 'tt0133093',
          title: 'The Matrix',
          year: 1999,
          type: 'movie' as const,
          poster: 'https://example.com/matrix.jpg',
        },
      ],
    ]);

    mocks.lookupTitles.mockResolvedValue(lookupResults);

    const result = await resolveToMetas(recommendations, {
      contentType: 'movie',
      showExplanation: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.description).toBeUndefined();
  });

  it('should enhance poster with RPDB when rpdbApiKey is provided', async () => {
    const recommendations: MetaLookupInput[] = [{ title: 'The Matrix', year: 1999 }];

    const lookupResults = new Map([
      [
        'The Matrix',
        {
          imdbId: 'tt0133093',
          title: 'The Matrix',
          year: 1999,
          type: 'movie' as const,
          poster: 'https://example.com/matrix.jpg',
        },
      ],
    ]);

    mocks.lookupTitles.mockResolvedValue(lookupResults);
    mocks.enhancePosterUrl.mockReturnValue('https://rpdb.example.com/matrix-enhanced.jpg');

    const result = await resolveToMetas(recommendations, {
      contentType: 'movie',
      rpdbApiKey: 'my-rpdb-key',
    });

    expect(mocks.enhancePosterUrl).toHaveBeenCalledWith(
      'https://example.com/matrix.jpg',
      'tt0133093',
      'my-rpdb-key'
    );
    expect(result[0]?.poster).toBe('https://rpdb.example.com/matrix-enhanced.jpg');
  });

  it('should pass correct lookup items to lookupTitles', async () => {
    const recommendations: MetaLookupInput[] = [
      { title: 'The Matrix', year: 1999 },
      { title: 'Inception', year: 2010 },
    ];

    mocks.lookupTitles.mockResolvedValue(new Map());

    await resolveToMetas(recommendations, { contentType: 'series' });

    expect(mocks.lookupTitles).toHaveBeenCalledWith([
      { title: 'The Matrix', year: 1999, type: 'series' },
      { title: 'Inception', year: 2010, type: 'series' },
    ]);
  });

  it('should not include releaseInfo when year is not provided', async () => {
    const recommendations: MetaLookupInput[] = [{ title: 'The Matrix', year: 1999 }];

    const lookupResults = new Map([
      [
        'The Matrix',
        {
          imdbId: 'tt0133093',
          title: 'The Matrix',
          year: undefined,
          type: 'movie' as const,
          poster: 'https://example.com/matrix.jpg',
        },
      ],
    ]);

    mocks.lookupTitles.mockResolvedValue(lookupResults);

    const result = await resolveToMetas(recommendations, { contentType: 'movie' });

    expect(result).toHaveLength(1);
    expect(result[0]?.releaseInfo).toBeUndefined();
  });

  it('should preserve order of recommendations', async () => {
    const recommendations: MetaLookupInput[] = [
      { title: 'A Movie', year: 2020 },
      { title: 'B Movie', year: 2021 },
      { title: 'C Movie', year: 2022 },
    ];

    const lookupResults = new Map([
      [
        'A Movie',
        {
          imdbId: 'tt1111111',
          title: 'A Movie',
          year: 2020,
          type: 'movie' as const,
          poster: 'https://example.com/a.jpg',
        },
      ],
      [
        'B Movie',
        {
          imdbId: 'tt2222222',
          title: 'B Movie',
          year: 2021,
          type: 'movie' as const,
          poster: 'https://example.com/b.jpg',
        },
      ],
      [
        'C Movie',
        {
          imdbId: 'tt3333333',
          title: 'C Movie',
          year: 2022,
          type: 'movie' as const,
          poster: 'https://example.com/c.jpg',
        },
      ],
    ]);

    mocks.lookupTitles.mockResolvedValue(lookupResults);

    const result = await resolveToMetas(recommendations, { contentType: 'movie' });

    expect(result).toHaveLength(3);
    expect(result[0]?.name).toBe('A Movie');
    expect(result[1]?.name).toBe('B Movie');
    expect(result[2]?.name).toBe('C Movie');
  });
});
