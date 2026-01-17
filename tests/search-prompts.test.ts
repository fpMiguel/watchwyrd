/**
 * Search Prompt Tests
 *
 * Tests for natural language search prompt generation.
 */

import { describe, it, expect } from 'vitest';
import { buildSearchPrompt, normalizeSearchQuery } from '../src/prompts/search.js';
import { createTestConfig, MINIMAL_CONTEXT } from './__fixtures__/configs.js';

describe('Search Prompts', () => {
  describe('buildSearchPrompt', () => {
    it('should build a movie search prompt', () => {
      const prompt = buildSearchPrompt({
        query: 'scary movies from the 90s',
        context: MINIMAL_CONTEXT,
        config: createTestConfig(),
        contentType: 'movie',
        count: 10,
      });

      expect(prompt).toContain('scary movies from the 90s');
      expect(prompt).toContain('Only movies/films');
      expect(prompt).toContain('NO TV shows');
      expect(prompt).toContain('10 relevant movies');
    });

    it('should build a series search prompt', () => {
      const prompt = buildSearchPrompt({
        query: 'best comedy shows',
        context: MINIMAL_CONTEXT,
        config: createTestConfig(),
        contentType: 'series',
        count: 15,
      });

      expect(prompt).toContain('best comedy shows');
      expect(prompt).toContain('Only TV series/shows');
      expect(prompt).toContain('NO movies');
      expect(prompt).toContain('15 relevant TV series');
    });

    it('should include context information', () => {
      const context = {
        ...MINIMAL_CONTEXT,
        dayOfWeek: 'Friday',
        dayType: 'weekend' as const,
        timeOfDay: 'evening' as const,
      };

      const prompt = buildSearchPrompt({
        query: 'something fun',
        context,
        config: createTestConfig(),
        contentType: 'movie',
        count: 10,
      });

      expect(prompt).toContain('CURRENT CONTEXT');
      expect(prompt).toContain('Friday');
      expect(prompt).toContain('evening');
    });

    it('should include excluded genres when configured', () => {
      const config = createTestConfig({
        excludedGenres: ['Horror', 'War'],
      });

      const prompt = buildSearchPrompt({
        query: 'action movies',
        context: MINIMAL_CONTEXT,
        config,
        contentType: 'movie',
        count: 10,
      });

      expect(prompt).toContain('NEVER include Horror, War');
    });

    it('should not mention excluded genres when none configured', () => {
      const config = createTestConfig({
        excludedGenres: [],
      });

      const prompt = buildSearchPrompt({
        query: 'action movies',
        context: MINIMAL_CONTEXT,
        config,
        contentType: 'movie',
        count: 10,
      });

      expect(prompt).not.toContain('NEVER include');
    });

    it('should include JSON output format instruction', () => {
      const prompt = buildSearchPrompt({
        query: 'test query',
        context: MINIMAL_CONTEXT,
        config: createTestConfig(),
        contentType: 'movie',
        count: 10,
      });

      expect(prompt).toContain('Return JSON');
      expect(prompt).toContain('{"items":[{"title":"...","year":...}]}');
    });

    it('should include handling instructions', () => {
      const prompt = buildSearchPrompt({
        query: 'test',
        context: MINIMAL_CONTEXT,
        config: createTestConfig(),
        contentType: 'movie',
        count: 10,
      });

      expect(prompt).toContain('Typos and misspellings');
      expect(prompt).toContain('Mood-based requests');
      expect(prompt).toContain('Comparisons');
      expect(prompt).toContain('Exclusions');
    });
  });

  describe('normalizeSearchQuery', () => {
    it('should lowercase the query', () => {
      expect(normalizeSearchQuery('HORROR Movies')).toBe('horror movies');
    });

    it('should trim whitespace', () => {
      expect(normalizeSearchQuery('  horror movies  ')).toBe('horror movies');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeSearchQuery('horror   movies')).toBe('horror movies');
    });

    it('should remove special characters', () => {
      expect(normalizeSearchQuery('horror! @movies#')).toBe('horror movies');
    });

    it('should preserve hyphens', () => {
      expect(normalizeSearchQuery('sci-fi movies')).toBe('sci-fi movies');
    });

    it('should preserve apostrophes', () => {
      expect(normalizeSearchQuery("don't look up")).toBe("don't look up");
    });

    it('should handle empty strings', () => {
      expect(normalizeSearchQuery('')).toBe('');
    });

    it('should handle complex queries', () => {
      expect(normalizeSearchQuery("  Movies like 'The Matrix' (1999)  ")).toBe(
        "movies like 'the matrix' 1999"
      );
    });
  });
});
