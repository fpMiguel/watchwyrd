/**
 * Recommendation Schema Tests
 *
 * Tests for AI recommendation parsing and validation.
 */

import { describe, it, expect } from 'vitest';
import {
  validateRecommendation,
  RecommendationSchema,
  parseAIResponse,
  safeParseAIResponse,
} from '../src/schemas/recommendations.js';
import {
  SAMPLE_MOVIE_RECOMMENDATIONS,
  MINIMAL_RECOMMENDATIONS,
  INVALID_RECOMMENDATION_NO_TITLE,
  INVALID_RECOMMENDATION_BAD_YEAR,
} from './__fixtures__/recommendations.js';

describe('Recommendation Schema', () => {
  describe('RecommendationSchema', () => {
    it('should validate correct recommendation', () => {
      const result = RecommendationSchema.safeParse({
        title: 'The Matrix',
        year: 1999,
        reason: 'Great sci-fi movie',
      });

      expect(result.success).toBe(true);
    });

    it('should validate recommendation without reason', () => {
      const result = RecommendationSchema.safeParse({
        title: 'Inception',
        year: 2010,
      });

      expect(result.success).toBe(true);
    });

    it('should reject recommendation without title', () => {
      const result = RecommendationSchema.safeParse(INVALID_RECOMMENDATION_NO_TITLE);
      expect(result.success).toBe(false);
    });

    it('should reject recommendation with non-string title', () => {
      const result = RecommendationSchema.safeParse({
        title: 123,
        year: 2020,
      });

      expect(result.success).toBe(false);
    });

    it('should reject recommendation without year', () => {
      const result = RecommendationSchema.safeParse({
        title: 'Unknown Year Movie',
      });

      // Year is required in schema
      expect(result.success).toBe(false);
    });

    it('should reject recommendation with invalid year type', () => {
      const result = RecommendationSchema.safeParse(INVALID_RECOMMENDATION_BAD_YEAR);
      expect(result.success).toBe(false);
    });
  });

  describe('validateRecommendation', () => {
    it('should return recommendation object for valid input', () => {
      const result = validateRecommendation({
        title: 'Interstellar',
        year: 2014,
        reason: 'Epic space journey',
      });

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Interstellar');
      expect(result?.year).toBe(2014);
    });

    it('should return null for invalid recommendation', () => {
      const result = validateRecommendation({
        year: 2020,
        reason: 'No title',
      });

      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = validateRecommendation(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = validateRecommendation(undefined);
      expect(result).toBeNull();
    });
  });

  describe('safeParseAIResponse', () => {
    it('should parse valid response object', () => {
      const result = safeParseAIResponse({ items: SAMPLE_MOVIE_RECOMMENDATIONS });

      expect(result).not.toBeNull();
      expect(result?.items).toHaveLength(SAMPLE_MOVIE_RECOMMENDATIONS.length);
    });

    it('should parse minimal recommendations', () => {
      const result = safeParseAIResponse({ items: MINIMAL_RECOMMENDATIONS });

      expect(result).not.toBeNull();
      // Minimal recommendations don't have year, so they'll fail validation
    });

    it('should return null for invalid response', () => {
      const result = safeParseAIResponse('not valid');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = safeParseAIResponse(null);
      expect(result).toBeNull();
    });

    it('should return null for missing items array', () => {
      const result = safeParseAIResponse({ recommendations: [] });
      expect(result).toBeNull();
    });

    it('should handle empty items array', () => {
      const result = safeParseAIResponse({ items: [] });

      expect(result).not.toBeNull();
      expect(result?.items).toEqual([]);
    });
  });

  describe('parseAIResponse', () => {
    it('should parse valid response', () => {
      const result = parseAIResponse({ items: SAMPLE_MOVIE_RECOMMENDATIONS });

      expect(result.items).toHaveLength(SAMPLE_MOVIE_RECOMMENDATIONS.length);
      expect(result.items[0].title).toBe(SAMPLE_MOVIE_RECOMMENDATIONS[0].title);
    });

    it('should throw for invalid response', () => {
      expect(() => parseAIResponse('not valid')).toThrow('Invalid AI response');
    });

    it('should throw for missing items', () => {
      expect(() => parseAIResponse({ data: [] })).toThrow('Invalid AI response');
    });
  });
});

describe('Recommendation Edge Cases', () => {
  it('should handle unicode in titles', () => {
    const result = RecommendationSchema.safeParse({
      title: 'Amélie',
      year: 2001,
    });

    expect(result.success).toBe(true);
  });

  it('should handle special characters in titles', () => {
    const result = RecommendationSchema.safeParse({
      title: "What's Eating Gilbert Grape",
      year: 1993,
    });

    expect(result.success).toBe(true);
  });

  it('should handle numbers in titles', () => {
    const result = RecommendationSchema.safeParse({
      title: '2001: A Space Odyssey',
      year: 1968,
    });

    expect(result.success).toBe(true);
  });

  it('should handle very long titles', () => {
    const longTitle = 'A'.repeat(500);
    const result = RecommendationSchema.safeParse({
      title: longTitle,
      year: 2020,
    });

    // Schema should accept long titles (no arbitrary limit)
    expect(result.success).toBe(true);
  });

  it('should handle very long reasons', () => {
    const longReason = 'Great '.repeat(100);
    const result = RecommendationSchema.safeParse({
      title: 'Test Movie',
      year: 2020,
      reason: longReason,
    });

    expect(result.success).toBe(true);
  });

  it('should reject year below minimum', () => {
    const result = RecommendationSchema.safeParse({
      title: 'Old Movie',
      year: 1888, // Below 1900 minimum
    });
    expect(result.success).toBe(false);
  });

  it('should accept year at valid boundary', () => {
    const result = RecommendationSchema.safeParse({
      title: 'Early Movie',
      year: 1900,
    });
    expect(result.success).toBe(true);
  });

  it('should accept current year', () => {
    const result = RecommendationSchema.safeParse({
      title: 'New Movie',
      year: new Date().getFullYear(),
    });
    expect(result.success).toBe(true);
  });
});
