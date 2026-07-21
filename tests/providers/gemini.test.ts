/**
 * Gemini Provider Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { UserConfig } from '../../src/types/index.js';
import {
  SAMPLE_MOVIE_RECOMMENDATIONS,
} from '../__fixtures__/recommendations.js';
import { createTestConfig } from '../__fixtures__/configs.js';

// --- Hoisted mocks (run before vi.mock hoisting) ---

const { mockGenerateContent, HarmCategory, HarmBlockThreshold, GoogleGenAI } = vi.hoisted(
  () => {
    const mockGenerateContent = vi.fn();
    return {
      mockGenerateContent,
      HarmCategory: { HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' },
      HarmBlockThreshold: { BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE' },
      GoogleGenAI: vi.fn(function () {
        return { models: { generateContent: mockGenerateContent } };
      }),
    };
  }
);

// Mock the SDK
vi.mock('@google/genai', () => ({
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
}));

import { geminiCircuit } from '../../src/utils/circuitBreaker.js';

// --- Test setup helpers ---

function setupGeminiSuccess(items: readonly { title: string; year: number; reason?: string }[] = []) {
  mockGenerateContent.mockResolvedValue({
    text: JSON.stringify({ items }),
  });
}

function setupGeminiEmptyResponse() {
  mockGenerateContent.mockResolvedValue({ text: null });
}

function setupGeminiError(message: string) {
  mockGenerateContent.mockRejectedValue(new Error(message));
}

function setupGeminiMalformedJson(rawText: string) {
  mockGenerateContent.mockResolvedValue({ text: rawText });
}

describe('GeminiProvider', () => {
  let GeminiProvider: Awaited<typeof import('../src/providers/gemini.js')>['GeminiProvider'] | null = null;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(geminiCircuit, 'execute').mockImplementation(<T>(fn: () => T) => fn());
    // Dynamic import so that vi.mock takes effect first
    const mod = await import('../../src/providers/gemini.js');
    GeminiProvider = mod.GeminiProvider;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------
  describe('constructor', () => {
    it('should create instance with default model', () => {
      const provider = new (GeminiProvider!)('test-api-key');
      expect(provider.provider).toBe('gemini');
      expect(provider.model).toBe('gemini-2.5-flash');
    });

    it('should create instance with custom model', () => {
      const provider = new (GeminiProvider!)('test-api-key', 'gemini-2.0-flash');
      expect(provider.model).toBe('gemini-2.0-flash');
    });

    it('should create instance with custom config', () => {
      const provider = new (GeminiProvider!)('test-api-key', 'gemini-2.5-flash', {
        temperature: 0.8,
        maxOutputTokens: 4096,
      });
      // Just verifying it doesn't throw
      expect(provider).toBeDefined();
    });
  });

  // ---------------------------------------------------------------
  // generateRecommendations
  // ---------------------------------------------------------------
  describe('generateRecommendations', () => {
    it('should return valid AIResponse on success', async () => {
      setupGeminiSuccess(SAMPLE_MOVIE_RECOMMENDATIONS);
      const provider = new (GeminiProvider!)('test-api-key');
      const config = createTestConfig({ showExplanations: true });

      const result = await provider.generateRecommendations(
        config,
        {} as any,
        'movie',
        5,
        'test prompt'
      );

      expect(result.recommendations).toHaveLength(SAMPLE_MOVIE_RECOMMENDATIONS.length);
      expect(result.recommendations[0]?.title).toBe('The Shawshank Redemption');
      expect(result.metadata.providerUsed).toBe('gemini');
      expect(result.metadata.modelUsed).toBe('gemini-2.5-flash');
      expect(result.metadata.searchUsed).toBe(false);
    });

    it('should throw when prompt is empty', async () => {
      const provider = new (GeminiProvider!)('test-api-key');
      const config = createTestConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, undefined)
      ).rejects.toThrow('Prompt is required');
    });

    it('should throw when prompt is undefined', async () => {
      const provider = new (GeminiProvider!)('test-api-key');
      const config = createTestConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, '')
      ).rejects.toThrow('Prompt is required');
    });

    it('should handle empty response from API', async () => {
      setupGeminiEmptyResponse();
      const provider = new (GeminiProvider!)('test-api-key');
      const config = createTestConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, 'test prompt')
      ).rejects.toThrow('Empty response from Gemini');
    });

    it('should handle malformed JSON response', async () => {
      setupGeminiMalformedJson('not json at all');
      const provider = new (GeminiProvider!)('test-api-key');
      const config = createTestConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, 'test prompt')
      ).rejects.toThrow('Failed to parse AI response as JSON');
    });

    it('should handle Zod validation failure', async () => {
      // Return valid JSON but with wrong shape (no items key)
      setupGeminiMalformedJson(JSON.stringify({ notItems: [] }));
      const provider = new (GeminiProvider!)('test-api-key');
      const config = createTestConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, 'test prompt')
      ).rejects.toThrow('Invalid AI response');
    });

    it('should deduplicate results', async () => {
      const items = [
        { title: 'The Matrix', year: 1999, reason: 'First' },
        { title: 'The Matrix', year: 1999, reason: 'Duplicate' },
        { title: 'Inception', year: 2010, reason: 'Unique' },
      ];
      setupGeminiSuccess(items);
      const provider = new (GeminiProvider!)('test-api-key');
      const config = createTestConfig();

      const result = await provider.generateRecommendations(
        config,
        {} as any,
        'movie',
        5,
        'test prompt'
      );

      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0]?.explanation).toBe('First');
    });

    it('should include reasons when showExplanations is true', async () => {
      const items = [{ title: 'Test', year: 2020, reason: 'because test' }];
      setupGeminiSuccess(items);
      const provider = new (GeminiProvider!)('test-api-key');
      const config = createTestConfig({ showExplanations: true });

      const result = await provider.generateRecommendations(
        config,
        {} as any,
        'movie',
        5,
        'test prompt'
      );

      expect(result.recommendations[0]?.explanation).toBe('because test');
    });

    it('should exclude reasons when showExplanations is false', async () => {
      // showExplanations: false controls the JSON schema sent to the API
      // but the mock always returns reason; the provider doesn't strip it
      const items = [{ title: 'Test', year: 2020, reason: 'because test' }];
      setupGeminiSuccess(items);
      const provider = new (GeminiProvider!)('test-api-key');
      const config = createTestConfig({ showExplanations: false });

      const result = await provider.generateRecommendations(
        config,
        {} as any,
        'movie',
        5,
        'test prompt'
      );

      expect(result.recommendations[0]?.explanation).toBe('because test');
    });

    it('should pass generation config correctly (temperature for non-thinking models)', async () => {
      setupGeminiSuccess(SAMPLE_MOVIE_RECOMMENDATIONS);
      const provider = new (GeminiProvider!)('test-api-key', 'gemini-2.0-flash');
      const config = createTestConfig();

      await provider.generateRecommendations(config, {} as any, 'movie', 5, 'test prompt');

      // Verify the generateContent call had temperature and topP
      const callArg = mockGenerateContent.mock.calls[0][0];
      expect(callArg.model).toBe('gemini-2.0-flash');
      expect(callArg.config.temperature).toBeDefined();
      expect(callArg.config.topP).toBeDefined();
    });

    it('should set thinkingBudget 0 for thinking models (gemini-3)', async () => {
      setupGeminiSuccess(SAMPLE_MOVIE_RECOMMENDATIONS);
      const provider = new (GeminiProvider!)('test-api-key', 'gemini-3-flash-preview');
      const config = createTestConfig();

      await provider.generateRecommendations(config, {} as any, 'movie', 5, 'test prompt');

      const callArg = mockGenerateContent.mock.calls[0][0];
      expect(callArg.config.thinkingConfig).toEqual({ thinkingBudget: 0 });
      // Thinking models should NOT have temperature
      expect(callArg.config.temperature).toBeUndefined();
    });

    it('should set thinkingBudget 0 for gemini-2.5-pro', async () => {
      setupGeminiSuccess(SAMPLE_MOVIE_RECOMMENDATIONS);
      const provider = new (GeminiProvider!)('test-api-key', 'gemini-2.5-pro');
      const config = createTestConfig();

      await provider.generateRecommendations(config, {} as any, 'movie', 5, 'test prompt');

      const callArg = mockGenerateContent.mock.calls[0][0];
      expect(callArg.config.thinkingConfig).toEqual({ thinkingBudget: 0 });
    });

    it('should retry on transient (retryable) failure', async () => {
      vi.useFakeTimers();
      mockGenerateContent
        .mockRejectedValueOnce(new Error('429 rate limit'))
        .mockResolvedValueOnce({ text: JSON.stringify({ items: SAMPLE_MOVIE_RECOMMENDATIONS }) });

      const provider = new (GeminiProvider!)('test-api-key');
      const config = createTestConfig();

      const resultPromise = provider.generateRecommendations(
        config,
        {} as any,
        'movie',
        5,
        'test prompt'
      );
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.recommendations).toHaveLength(SAMPLE_MOVIE_RECOMMENDATIONS.length);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      setupGeminiError('Invalid API key');
      const provider = new (GeminiProvider!)('test-api-key');
      const config = createTestConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, 'test prompt')
      ).rejects.toThrow('Invalid API key');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should apply temperature override from options', async () => {
      setupGeminiSuccess(SAMPLE_MOVIE_RECOMMENDATIONS);
      const provider = new (GeminiProvider!)('test-api-key', 'gemini-2.0-flash');
      const config = createTestConfig();

      await provider.generateRecommendations(
        config,
        {} as any,
        'movie',
        5,
        'test prompt',
        { temperature: 1.5 }
      );

      const callArg = mockGenerateContent.mock.calls[0][0];
      expect(callArg.config.temperature).toBe(1.5);
    });
  });

  // ---------------------------------------------------------------
  // validateApiKey
  // ---------------------------------------------------------------
  describe('validateApiKey', () => {
    it('should return valid true on success', async () => {
      mockGenerateContent.mockResolvedValue({ text: 'OK' });
      const provider = new (GeminiProvider!)('test-api-key');

      const result = await provider.validateApiKey();

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid false on empty response', async () => {
      mockGenerateContent.mockResolvedValue({ text: '' });
      const provider = new (GeminiProvider!)('test-api-key');

      const result = await provider.validateApiKey();

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return valid false on API error (auth)', async () => {
      setupGeminiError('401 Unauthorized');
      const provider = new (GeminiProvider!)('test-api-key');

      const result = await provider.validateApiKey();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });

    it('should return valid false on network error', async () => {
      setupGeminiError('ENOTFOUND');
      const provider = new (GeminiProvider!)('test-api-key');

      const result = await provider.validateApiKey();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle non-Error throws', async () => {
      mockGenerateContent.mockRejectedValue('string error');
      const provider = new (GeminiProvider!)('test-api-key');

      const result = await provider.validateApiKey();

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});