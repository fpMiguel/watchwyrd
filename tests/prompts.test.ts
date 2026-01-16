/**
 * Prompt Builder Tests
 *
 * Tests for AI prompt generation logic.
 */

import { describe, it, expect } from 'vitest';
import { buildCatalogPrompt } from '../src/prompts/catalog.js';
import { buildContextBlock, buildContextKey } from '../src/prompts/context.js';
import { SYSTEM_PROMPT } from '../src/prompts/system.js';
import { getTimeOfDay, getDayType, describeContext } from '../src/signals/context.js';
import { createTestConfig } from './__fixtures__/configs.js';
import type { ContextSignals } from '../src/types/index.js';

// Create a valid context for tests
const createTestContext = (): ContextSignals => ({
  dayOfWeek: 'Friday',
  dayType: 'weekend_start',
  timeOfDay: 'evening',
  hour: 20,
  month: 'January',
  season: 'winter',
});

describe('System Prompt', () => {
  it('should contain role definition', () => {
    expect(SYSTEM_PROMPT).toContain('movie');
    expect(SYSTEM_PROMPT).toContain('recommendation');
  });

  it('should specify JSON output requirement', () => {
    expect(SYSTEM_PROMPT.toLowerCase()).toContain('json');
  });

  it('should specify required fields', () => {
    expect(SYSTEM_PROMPT).toContain('title');
    expect(SYSTEM_PROMPT).toContain('year');
  });
});

describe('Catalog Prompt Builder', () => {
  describe('buildCatalogPrompt', () => {
    it('should include content type in prompt', () => {
      const prompt = buildCatalogPrompt({
        contentType: 'movie',
        count: 10,
        variant: 'fornow',
        context: createTestContext(),
        config: createTestConfig(),
      });

      expect(prompt.toLowerCase()).toContain('movie');
    });

    it('should include requested count', () => {
      const prompt = buildCatalogPrompt({
        contentType: 'movie',
        count: 25,
        variant: 'random',
        context: createTestContext(),
        config: createTestConfig(),
      });

      expect(prompt).toContain('25');
    });

    it('should include excluded genres when provided', () => {
      const config = createTestConfig({ excludedGenres: ['Horror', 'Thriller'] });
      const prompt = buildCatalogPrompt({
        contentType: 'movie',
        count: 10,
        variant: 'fornow',
        context: createTestContext(),
        config,
      });

      expect(prompt).toContain('Horror');
      expect(prompt).toContain('Thriller');
    });

    it('should include context information', () => {
      const context = createTestContext();
      const prompt = buildCatalogPrompt({
        contentType: 'movie',
        count: 10,
        variant: 'fornow',
        context,
        config: createTestConfig(),
      });

      expect(prompt).toContain('Friday');
    });

    it('should differ between fornow and random variants', () => {
      const context = createTestContext();
      const config = createTestConfig();
      
      const fornowPrompt = buildCatalogPrompt({
        contentType: 'movie',
        count: 10,
        variant: 'fornow',
        context,
        config,
      });

      const randomPrompt = buildCatalogPrompt({
        contentType: 'movie',
        count: 10,
        variant: 'random',
        context,
        config,
      });

      // Prompts should be different
      expect(fornowPrompt).not.toBe(randomPrompt);
    });

    it('should handle series content type', () => {
      const prompt = buildCatalogPrompt({
        contentType: 'series',
        count: 15,
        variant: 'fornow',
        context: createTestContext(),
        config: createTestConfig(),
      });

      expect(prompt.toLowerCase()).toContain('series');
    });

    it('should request explanations when enabled', () => {
      const config = createTestConfig({ showExplanations: true });
      const prompt = buildCatalogPrompt({
        contentType: 'movie',
        count: 10,
        variant: 'fornow',
        context: createTestContext(),
        config,
      });

      expect(prompt.toLowerCase()).toContain('reason');
    });

    it('should not request explanations when disabled', () => {
      const config = createTestConfig({ showExplanations: false });
      const prompt = buildCatalogPrompt({
        contentType: 'movie',
        count: 10,
        variant: 'fornow',
        context: createTestContext(),
        config,
      });

      // Should work without errors
      expect(prompt).toBeDefined();
    });
  });

  describe('SYSTEM_PROMPT', () => {
    it('should return non-empty system prompt', () => {
      expect(SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });

    it('should include output format instructions', () => {
      expect(SYSTEM_PROMPT.toLowerCase()).toContain('json');
    });
  });
});

describe('Context Builder', () => {
  describe('getTimeOfDay', () => {
    it('should return latenight for late hours', () => {
      expect(getTimeOfDay(2)).toBe('latenight');
      expect(getTimeOfDay(4)).toBe('latenight');
    });

    it('should return morning for morning hours', () => {
      expect(getTimeOfDay(8)).toBe('morning');
      expect(getTimeOfDay(10)).toBe('morning');
    });

    it('should return evening for evening hours', () => {
      expect(getTimeOfDay(19)).toBe('evening');
      expect(getTimeOfDay(21)).toBe('evening');
    });

    it('should return afternoon for midday hours', () => {
      expect(getTimeOfDay(12)).toBe('afternoon');
      expect(getTimeOfDay(15)).toBe('afternoon');
    });
  });

  describe('getDayType', () => {
    it('should return weekend for Saturday (6)', () => {
      expect(getDayType(6)).toBe('weekend');
    });

    it('should return weekend for Sunday (0)', () => {
      expect(getDayType(0)).toBe('weekend');
    });

    it('should return weekday for Monday (1)', () => {
      expect(getDayType(1)).toBe('weekday');
    });

    it('should return weekday for Friday (5)', () => {
      expect(getDayType(5)).toBe('weekday');
    });
  });

  describe('buildContextBlock', () => {
    it('should build context from signals', () => {
      const signals = createTestContext();
      const block = buildContextBlock(signals);

      expect(typeof block).toBe('string');
      expect(block.length).toBeGreaterThan(0);
    });

    it('should include time information', () => {
      const signals = createTestContext();
      const block = buildContextBlock(signals);

      expect(block).toContain('evening');
    });

    it('should include weather when provided', () => {
      const signals: ContextSignals = {
        ...createTestContext(),
        weather: {
          condition: 'rainy',
          temperature: 15,
          description: 'Light rain',
        },
      };
      const block = buildContextBlock(signals);

      expect(block.toLowerCase()).toMatch(/rain|weather|15/);
    });
  });

  describe('buildContextKey', () => {
    it('should return unique key for different contexts', () => {
      const key1 = buildContextKey(createTestContext());
      const key2 = buildContextKey({
        ...createTestContext(),
        timeOfDay: 'morning',
      });

      expect(key1).not.toBe(key2);
    });

    it('should return same key for same context', () => {
      const context = createTestContext();
      const key1 = buildContextKey(context);
      const key2 = buildContextKey(context);

      expect(key1).toBe(key2);
    });
  });

  describe('describeContext', () => {
    it('should return descriptive string', () => {
      const signals = createTestContext();
      const str = describeContext(signals);

      expect(typeof str).toBe('string');
      expect(str.length).toBeGreaterThan(0);
    });
  });
});

describe('Prompt Optimization', () => {
  it('should not exceed reasonable prompt length', () => {
    const config = createTestConfig({
      excludedGenres: ['Horror', 'Thriller', 'Crime', 'War', 'Documentary'],
      showExplanations: true,
    });
    
    const prompt = buildCatalogPrompt({
      contentType: 'movie',
      count: 50,
      variant: 'fornow',
      context: createTestContext(),
      config,
    });

    // Prompt should be optimized and not excessively long
    // Reasonable limit: 3000 characters
    expect(prompt.length).toBeLessThan(3000);
  });

  it('should include all necessary information concisely', () => {
    const config = createTestConfig({ excludedGenres: ['Horror'] });
    
    const prompt = buildCatalogPrompt({
      contentType: 'series',
      count: 20,
      variant: 'random',
      context: createTestContext(),
      config,
    });

    // Must include essential elements
    expect(prompt).toContain('20');
    expect(prompt.toLowerCase()).toContain('series');
    expect(prompt).toContain('Horror');
  });
});
