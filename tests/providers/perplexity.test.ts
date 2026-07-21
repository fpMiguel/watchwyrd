import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SAMPLE_MOVIE_RECOMMENDATIONS } from '../__fixtures__/recommendations.js';
import { createPerplexityConfig } from '../__fixtures__/configs.js';

const { mockCreate, MockPerplexity } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  return {
    mockCreate,
    MockPerplexity: vi.fn(function () {
      return { chat: { completions: { create: mockCreate } } };
    }),
  };
});

vi.mock('@perplexity-ai/perplexity_ai', () => ({
  default: MockPerplexity,
}));

import { perplexityCircuit } from '../../src/utils/circuitBreaker.js';

function setupSuccess(items: { title: string; year: number; reason?: string }[] = []) {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ items }) } }],
  });
}

function setupArrayContent(textParts: string[]) {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content: textParts.map((t) => ({ text: t })) } }],
  });
}

function setupEmptyResponse() {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content: null } }],
  });
}

function setupError(message: string) {
  mockCreate.mockRejectedValue(new Error(message));
}

describe('PerplexityProvider', () => {
  let PerplexityProvider: Awaited<typeof import('../src/providers/perplexity.js')>['PerplexityProvider'] | null = null;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(perplexityCircuit, 'execute').mockImplementation(<T>(fn: () => T) => fn());
    const mod = await import('../../src/providers/perplexity.js');
    PerplexityProvider = mod.PerplexityProvider;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------
  describe('constructor', () => {
    it('should create instance with default model', () => {
      const provider = new (PerplexityProvider!)('test-key');
      expect(provider.provider).toBe('perplexity');
      expect(provider.model).toBe('sonar-pro');
    });

    it('should create instance with custom model', () => {
      const provider = new (PerplexityProvider!)('test-key', 'sonar');
      expect(provider.model).toBe('sonar');
    });

    it('should create instance with custom config', () => {
      const provider = new (PerplexityProvider!)('test-key', 'sonar-pro', {
        temperature: 0.7,
        maxOutputTokens: 4096,
      });
      expect(provider).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // generateRecommendations
  // -----------------------------------------------------------------------
  describe('generateRecommendations', () => {
    it('should return valid AIResponse on success', async () => {
      setupSuccess(SAMPLE_MOVIE_RECOMMENDATIONS);
      const provider = new (PerplexityProvider!)('test-key');
      const config = createPerplexityConfig();

      const result = await provider.generateRecommendations(
        config, {} as any, 'movie', 5, 'test prompt'
      );

      expect(result.recommendations).toHaveLength(SAMPLE_MOVIE_RECOMMENDATIONS.length);
      expect(result.recommendations[0]?.title).toBe('The Shawshank Redemption');
      expect(result.metadata.providerUsed).toBe('perplexity');
      expect(result.metadata.modelUsed).toBe('sonar-pro');
      expect(result.metadata.searchUsed).toBe(true);
    });

    it('should handle array content format from Perplexity API', async () => {
      const jsonStr = JSON.stringify({ items: SAMPLE_MOVIE_RECOMMENDATIONS.slice(0, 2) });
      setupArrayContent([jsonStr]);
      const provider = new (PerplexityProvider!)('test-key');
      const config = createPerplexityConfig();

      const result = await provider.generateRecommendations(
        config, {} as any, 'movie', 2, 'test prompt'
      );

      expect(result.recommendations).toHaveLength(2);
    });

    it('should throw when prompt is empty', async () => {
      const provider = new (PerplexityProvider!)('test-key');
      const config = createPerplexityConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, undefined)
      ).rejects.toThrow('Prompt is required');
    });

    it('should throw when prompt is empty string', async () => {
      const provider = new (PerplexityProvider!)('test-key');
      const config = createPerplexityConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, '')
      ).rejects.toThrow('Prompt is required');
    });

    it('should handle empty response', async () => {
      setupEmptyResponse();
      const provider = new (PerplexityProvider!)('test-key');
      const config = createPerplexityConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, 'test prompt')
      ).rejects.toThrow('Empty response from Perplexity');
    });

    it('should handle malformed JSON response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'not valid json' } }],
      });
      const provider = new (PerplexityProvider!)('test-key');
      const config = createPerplexityConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, 'test prompt')
      ).rejects.toThrow('Failed to parse AI response as JSON');
    });

    it('should handle Zod validation failure', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ notItems: [] }) } }],
      });
      const provider = new (PerplexityProvider!)('test-key');
      const config = createPerplexityConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, 'test prompt')
      ).rejects.toThrow('Invalid AI response');
    });

    it('should deduplicate results', async () => {
      const items = [
        { title: 'The Matrix', year: 1999, reason: 'First' },
        { title: 'The Matrix', year: 1999, reason: 'Duplicate' },
        { title: 'Dune', year: 2021, reason: 'Epic' },
      ];
      setupSuccess(items);
      const provider = new (PerplexityProvider!)('test-key');
      const config = createPerplexityConfig();

      const result = await provider.generateRecommendations(
        config, {} as any, 'movie', 5, 'test prompt'
      );

      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0]?.explanation).toBe('First');
    });

    it('should include reasons when showExplanations is true', async () => {
      const items = [{ title: 'Test', year: 2020, reason: 'great pick' }];
      setupSuccess(items);
      const provider = new (PerplexityProvider!)('test-key');
      const config = createPerplexityConfig({ showExplanations: true });

      const result = await provider.generateRecommendations(
        config, {} as any, 'movie', 5, 'test prompt'
      );

      expect(result.recommendations[0]?.explanation).toBe('great pick');
    });

    it('should exclude reasons when showExplanations is false', async () => {
      // showExplanations: false controls the JSON schema sent to the API
      // but the mock always returns reason; the provider doesn't strip it
      const items = [{ title: 'Test', year: 2020, reason: 'great pick' }];
      setupSuccess(items);
      const provider = new (PerplexityProvider!)('test-key');
      const config = createPerplexityConfig({ showExplanations: false });

      const result = await provider.generateRecommendations(
        config, {} as any, 'movie', 5, 'test prompt'
      );

      expect(result.recommendations[0]?.explanation).toBe('great pick');
    });

    it('should retry on transient (retryable) failure', async () => {
      vi.useFakeTimers();
      mockCreate
        .mockRejectedValueOnce(new Error('429 rate limit'))
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ items: SAMPLE_MOVIE_RECOMMENDATIONS }) } }] });

      const provider = new (PerplexityProvider!)('test-key');
      const config = createPerplexityConfig();

      const resultPromise = provider.generateRecommendations(
        config, {} as any, 'movie', 5, 'test prompt'
      );
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.recommendations).toHaveLength(SAMPLE_MOVIE_RECOMMENDATIONS.length);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      setupError('Invalid API key');
      const provider = new (PerplexityProvider!)('test-key');
      const config = createPerplexityConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, 'test prompt')
      ).rejects.toThrow('Invalid API key');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // validateApiKey
  // -----------------------------------------------------------------------
  describe('validateApiKey', () => {
    it('should return valid true on success', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'OK' } }],
      });
      const provider = new (PerplexityProvider!)('test-key');

      const result = await provider.validateApiKey();

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid false on empty response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '' } }],
      });
      const provider = new (PerplexityProvider!)('test-key');

      const result = await provider.validateApiKey();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Empty response from API');
    });

    it('should return valid false on auth error', async () => {
      setupError('401 Unauthorized');
      const provider = new (PerplexityProvider!)('test-key');

      const result = await provider.validateApiKey();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });

    it('should return valid false on network error', async () => {
      setupError('ENOTFOUND');
      const provider = new (PerplexityProvider!)('test-key');

      const result = await provider.validateApiKey();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });
});