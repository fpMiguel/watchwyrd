/**
 * Watchwyrd - Configuration Schema Tests
 */

import { describe, it, expect } from 'vitest';
import {
  parseUserConfig,
  safeParseUserConfig,
  createConfigHash,
  applyPreset,
  validateRequiredFields,
  PRESET_PROFILES,
} from '../src/config/schema.js';

describe('Configuration Schema', () => {
  describe('parseUserConfig', () => {
    it('should parse valid minimal config', () => {
      const config = parseUserConfig({
        geminiApiKey: 'test-api-key',
      });

      expect(config.geminiApiKey).toBe('test-api-key');
      expect(config.geminiModel).toBe('gemini-3-flash');
      expect(config.timezone).toBe('UTC');
      expect(config.includeMovies).toBe(true);
      expect(config.includeSeries).toBe(true);
    });

    it('should apply all defaults correctly', () => {
      const config = parseUserConfig({
        geminiApiKey: 'test-key',
      });

      expect(config.preferredLanguages).toEqual(['en']);
      expect(config.subtitleTolerance).toBe('prefer_dubbed');
      expect(config.maxRating).toBe('R');
      expect(config.noveltyBias).toBe(50);
      expect(config.popularityBias).toBe(50);
      expect(config.enableSeasonalThemes).toBe(true);
      expect(config.showExplanations).toBe(true);
    });

    it('should not throw on missing API key (uses defaults)', () => {
      // With multi-provider support, API keys are validated by validateRequiredFields
      const config = parseUserConfig({});
      expect(config.geminiApiKey).toBe('');
      expect(config.aiProvider).toBe('gemini');
    });

    it('should validate genre weights range', () => {
      const config = parseUserConfig({
        geminiApiKey: 'test-key',
        genreWeights: { Action: 5, Comedy: 1 },
      });

      expect(config.genreWeights['Action']).toBe(5);
      expect(config.genreWeights['Comedy']).toBe(1);
    });

    it('should reject invalid genre weight values', () => {
      expect(() =>
        parseUserConfig({
          geminiApiKey: 'test-key',
          genreWeights: { Action: 10 }, // Out of range
        })
      ).toThrow();
    });
  });

  describe('safeParseUserConfig', () => {
    it('should return success for valid config', () => {
      const result = safeParseUserConfig({
        geminiApiKey: 'test-key',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid config via validateRequiredFields', () => {
      const result = safeParseUserConfig({
        aiProvider: 'gemini',
        geminiApiKey: '', // Empty string
      });

      // Schema passes but validateRequiredFields catches it
      expect(result.success).toBe(true);
      const errors = validateRequiredFields(result.data!);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Gemini API key is required');
    });
  });

  describe('createConfigHash', () => {
    it('should generate consistent hashes', () => {
      const config = parseUserConfig({
        geminiApiKey: 'test-key',
        noveltyBias: 75,
      });

      const hash1 = createConfigHash(config);
      const hash2 = createConfigHash(config);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different configs', () => {
      const config1 = parseUserConfig({
        geminiApiKey: 'test-key',
        noveltyBias: 75,
      });

      const config2 = parseUserConfig({
        geminiApiKey: 'test-key',
        noveltyBias: 25,
      });

      expect(createConfigHash(config1)).not.toBe(createConfigHash(config2));
    });

    it('should ignore API key in hash', () => {
      const config1 = parseUserConfig({
        geminiApiKey: 'key-1',
        noveltyBias: 50,
      });

      const config2 = parseUserConfig({
        geminiApiKey: 'key-2',
        noveltyBias: 50,
      });

      expect(createConfigHash(config1)).toBe(createConfigHash(config2));
    });
  });

  describe('applyPreset', () => {
    it('should apply casual preset', () => {
      const config = applyPreset({ geminiApiKey: 'test' }, 'casual');

      expect(config.popularityBias).toBe(PRESET_PROFILES.casual.popularityBias);
      expect(config.geminiApiKey).toBe('test');
    });

    it('should apply family preset with rating limit', () => {
      const config = applyPreset({ geminiApiKey: 'test' }, 'family');

      expect(config.maxRating).toBe('PG-13');
      expect(config.excludedGenres).toContain('Horror');
    });

    it('should apply binge_watcher preset with series preference', () => {
      const config = applyPreset({ geminiApiKey: 'test' }, 'binge_watcher');

      expect(config.includeSeries).toBe(true);
      expect(config.includeMovies).toBe(false);
      expect(config.bingePreference).toBe('high');
    });

    it('should not override with custom preset', () => {
      const config = applyPreset(
        { geminiApiKey: 'test', noveltyBias: 80 },
        'custom'
      );

      expect(config.noveltyBias).toBe(80);
    });
  });
});
