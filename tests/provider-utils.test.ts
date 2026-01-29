/**
 * Provider Utils Tests
 *
 * Tests for shared provider utility functions:
 * - deduplicateRecommendations
 * - buildAIResponse
 * - parseJsonSafely
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  deduplicateRecommendations,
  buildAIResponse,
  parseJsonSafely,
} from '../src/providers/utils.js';
import type { Recommendation } from '../src/schemas/index.js';

describe('deduplicateRecommendations', () => {
  it('should return empty array for empty input', () => {
    expect(deduplicateRecommendations([])).toEqual([]);
  });

  it('should return single item unchanged', () => {
    const items: Recommendation[] = [{ title: 'The Matrix', year: 1999, reason: 'Great movie' }];
    expect(deduplicateRecommendations(items)).toEqual(items);
  });

  it('should remove exact duplicates', () => {
    const items: Recommendation[] = [
      { title: 'The Matrix', year: 1999, reason: 'First occurrence' },
      { title: 'The Matrix', year: 1999, reason: 'Second occurrence' },
    ];

    const result = deduplicateRecommendations(items);

    expect(result).toHaveLength(1);
    expect(result[0]?.reason).toBe('First occurrence');
  });

  it('should normalize leading articles (the, a, an)', () => {
    const items: Recommendation[] = [
      { title: 'The Matrix', year: 1999, reason: 'With The' },
      { title: 'Matrix', year: 1999, reason: 'Without The' },
    ];

    const result = deduplicateRecommendations(items);

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('The Matrix');
  });

  it('should normalize "A" article', () => {
    const items: Recommendation[] = [
      { title: 'A Beautiful Mind', year: 2001, reason: 'With A' },
      { title: 'Beautiful Mind', year: 2001, reason: 'Without A' },
    ];

    const result = deduplicateRecommendations(items);
    expect(result).toHaveLength(1);
  });

  it('should normalize "An" article', () => {
    const items: Recommendation[] = [
      { title: 'An American Werewolf in London', year: 1981, reason: 'With An' },
      { title: 'American Werewolf in London', year: 1981, reason: 'Without An' },
    ];

    const result = deduplicateRecommendations(items);
    expect(result).toHaveLength(1);
  });

  it('should be case insensitive', () => {
    const items: Recommendation[] = [
      { title: 'THE MATRIX', year: 1999, reason: 'Uppercase' },
      { title: 'the matrix', year: 1999, reason: 'Lowercase' },
    ];

    const result = deduplicateRecommendations(items);
    expect(result).toHaveLength(1);
  });

  it('should treat different years as different movies', () => {
    const items: Recommendation[] = [
      { title: 'Dune', year: 1984, reason: 'Original' },
      { title: 'Dune', year: 2021, reason: 'Remake' },
    ];

    const result = deduplicateRecommendations(items);
    expect(result).toHaveLength(2);
  });

  it('should preserve order of first occurrences', () => {
    const items: Recommendation[] = [
      { title: 'First Movie', year: 2020, reason: '1st' },
      { title: 'Second Movie', year: 2021, reason: '2nd' },
      { title: 'First Movie', year: 2020, reason: 'Duplicate' },
      { title: 'Third Movie', year: 2022, reason: '3rd' },
    ];

    const result = deduplicateRecommendations(items);

    expect(result).toHaveLength(3);
    expect(result[0]?.title).toBe('First Movie');
    expect(result[1]?.title).toBe('Second Movie');
    expect(result[2]?.title).toBe('Third Movie');
  });

  it('should trim trailing whitespace after normalization', () => {
    // The trim() is applied after article removal, so "The Matrix " normalizes to "matrix"
    const items: Recommendation[] = [
      { title: 'The Matrix ', year: 1999, reason: 'With trailing space' },
      { title: 'The Matrix', year: 1999, reason: 'Without trailing space' },
    ];

    const result = deduplicateRecommendations(items);
    expect(result).toHaveLength(1);
  });
});

describe('buildAIResponse', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-22T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should build response with empty recommendations', () => {
    const result = buildAIResponse([], 0, 'gemini-2.0-flash', 'gemini', false);

    expect(result.recommendations).toEqual([]);
    expect(result.metadata.modelUsed).toBe('gemini-2.0-flash');
    expect(result.metadata.providerUsed).toBe('gemini');
    expect(result.metadata.searchUsed).toBe(false);
    expect(result.metadata.totalCandidatesConsidered).toBe(0);
  });

  it('should map recommendations to AIRecommendation format', () => {
    const recommendations: Recommendation[] = [
      { title: 'The Matrix', year: 1999, reason: 'A groundbreaking sci-fi film' },
    ];

    const result = buildAIResponse(recommendations, 5, 'sonar', 'perplexity', true);

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]).toEqual({
      imdbId: '',
      title: 'The Matrix',
      year: 1999,
      genres: [],
      runtime: 0,
      explanation: 'A groundbreaking sci-fi film',
      contextTags: [],
      confidenceScore: 0.8,
    });
  });

  it('should handle missing reason field', () => {
    const recommendations: Recommendation[] = [{ title: 'Inception', year: 2010 }];

    const result = buildAIResponse(recommendations, 1, 'gpt-4o', 'openai', false);

    expect(result.recommendations[0]?.explanation).toBe('');
  });

  it('should include correct metadata', () => {
    const recommendations: Recommendation[] = [
      { title: 'Movie 1', year: 2020 },
      { title: 'Movie 2', year: 2021 },
    ];

    const result = buildAIResponse(recommendations, 10, 'gemini-2.0-flash', 'gemini', true);

    expect(result.metadata).toEqual({
      generatedAt: '2025-01-22T12:00:00.000Z',
      modelUsed: 'gemini-2.0-flash',
      providerUsed: 'gemini',
      searchUsed: true,
      totalCandidatesConsidered: 10,
    });
  });

  it('should set default values for unmapped fields', () => {
    const recommendations: Recommendation[] = [{ title: 'Test', year: 2020, reason: 'Test' }];

    const result = buildAIResponse(recommendations, 1, 'gemini-2.0-flash', 'gemini', false);

    const rec = result.recommendations[0];
    expect(rec?.imdbId).toBe('');
    expect(rec?.genres).toEqual([]);
    expect(rec?.runtime).toBe(0);
    expect(rec?.contextTags).toEqual([]);
    expect(rec?.confidenceScore).toBe(0.8);
  });
});

describe('parseJsonSafely', () => {
  it('should parse valid JSON object', () => {
    const json = '{"title": "Test", "year": 2020}';
    const result = parseJsonSafely(json);

    expect(result).toEqual({ title: 'Test', year: 2020 });
  });

  it('should parse valid JSON array', () => {
    const json = '[{"title": "Test"}]';
    const result = parseJsonSafely(json);

    expect(result).toEqual([{ title: 'Test' }]);
  });

  it('should trim whitespace before parsing', () => {
    const json = '   {"valid": true}   ';
    const result = parseJsonSafely(json);

    expect(result).toEqual({ valid: true });
  });

  it('should parse JSON with newlines', () => {
    const json = `{
      "title": "Test",
      "year": 2020
    }`;
    const result = parseJsonSafely(json);

    expect(result).toEqual({ title: 'Test', year: 2020 });
  });

  it('should throw error for invalid JSON', () => {
    const invalidJson = 'This is not JSON';

    expect(() => parseJsonSafely(invalidJson)).toThrow('Failed to parse AI response as JSON');
  });

  it('should throw generic error without content preview (security)', () => {
    const longInvalidJson = 'x'.repeat(300);

    // Error should NOT contain the content (could leak sensitive data)
    expect(() => parseJsonSafely(longInvalidJson)).toThrow('Failed to parse AI response as JSON');
    try {
      parseJsonSafely(longInvalidJson);
    } catch (error) {
      expect((error as Error).message).not.toContain('xxx');
    }
  });

  it('should handle empty string', () => {
    expect(() => parseJsonSafely('')).toThrow('Failed to parse AI response as JSON');
  });

  it('should handle malformed JSON with partial structure', () => {
    const malformed = '{"title": "Test", "year":}';

    expect(() => parseJsonSafely(malformed)).toThrow('Failed to parse AI response as JSON');
  });
});
