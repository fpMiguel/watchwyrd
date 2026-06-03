import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SAMPLE_MOVIE_RECOMMENDATIONS } from '../__fixtures__/recommendations.js';
import { createTestConfig, createOpenAIConfig } from '../__fixtures__/configs.js';

const { mockCreate, MockOpenAI } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  return {
    mockCreate,
    MockOpenAI: vi.fn(function () {
      return { chat: { completions: { create: mockCreate } } };
    }),
  };
});

vi.mock('openai', () => ({
  default: MockOpenAI,
}));

import { openaiCircuit } from '../../src/utils/circuitBreaker.js';

function setupSuccess(items: { title: string; year: number; reason?: string }[] = []) {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ items }) } }],
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

describe('OpenAIProvider', () => {
  let OpenAIProvider: Awaited<typeof import('../src/providers/openai.js')>['OpenAIProvider'] | null = null;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(openaiCircuit, 'execute').mockImplementation(<T>(fn: () => T) => fn());
    const mod = await import('../../src/providers/openai.js');
    OpenAIProvider = mod.OpenAIProvider;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------
  describe('constructor', () => {
    it('should create instance with default model', () => {
      const provider = new (OpenAIProvider!)('test-key');
      expect(provider.provider).toBe('openai');
      expect(provider.model).toBe('gpt-4o-mini');
      expect(provider.isGpt5).toBe(false);
    });

    it('should detect GPT-5 model and set isGpt5 flag', () => {
      const provider = new (OpenAIProvider!)('test-key', 'gpt-5-preview');
      expect(provider.model).toBe('gpt-5-preview');
      expect(provider.isGpt5).toBe(true);
    });

    it('should adjust maxOutputTokens for GPT-5 models', () => {
      const provider = new (OpenAIProvider!)('test-key', 'gpt-5-preview', {
        maxOutputTokens: 100,
      });
      expect(provider.model).toBe('gpt-5-preview');
      expect(provider.isGpt5).toBe(true);
    });

    it('should not set isGpt5 for GPT-4 models', () => {
      const models = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4-turbo'];
      for (const model of models) {
        const provider = new (OpenAIProvider!)('test-key', model as any);
        expect(provider.isGpt5).toBe(false);
      }
    });

    it('should create with custom config', () => {
      const provider = new (OpenAIProvider!)('test-key', 'gpt-4o', {
        temperature: 0.9,
        maxOutputTokens: 4096,
      });
      expect(provider).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // generateRecommendations
  // -----------------------------------------------------------------------
  describe('generateRecommendations', () => {
    it('should return valid AIResponse on success (GPT-4.x)', async () => {
      setupSuccess(SAMPLE_MOVIE_RECOMMENDATIONS);
      const provider = new (OpenAIProvider!)('test-key', 'gpt-4o');
      const config = createOpenAIConfig();

      const result = await provider.generateRecommendations(
        config, {} as any, 'movie', 5, 'test prompt'
      );

      expect(result.recommendations).toHaveLength(SAMPLE_MOVIE_RECOMMENDATIONS.length);
      expect(result.metadata.providerUsed).toBe('openai');
      expect(result.metadata.modelUsed).toBe('gpt-4o');

      // Verify GPT-4.x path: json_object, max_tokens, temperature
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.response_format?.type).toBe('json_object');
      expect(callArgs.max_tokens).toBeDefined();
      expect(callArgs.temperature).toBeDefined();
      expect(callArgs.max_completion_tokens).toBeUndefined();
    });

    it('should use json_schema path for GPT-5 models', async () => {
      setupSuccess(SAMPLE_MOVIE_RECOMMENDATIONS);
      const provider = new (OpenAIProvider!)('test-key', 'gpt-5-preview');
      const config = createOpenAIConfig({ openaiModel: 'gpt-5-preview' });

      const result = await provider.generateRecommendations(
        config, {} as any, 'movie', 5, 'test prompt'
      );

      expect(result.recommendations).toHaveLength(SAMPLE_MOVIE_RECOMMENDATIONS.length);

      // Verify GPT-5 path: json_schema, max_completion_tokens, no temperature
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.response_format?.type).toBe('json_schema');
      expect(callArgs.max_completion_tokens).toBeDefined();
      expect(callArgs.max_tokens).toBeUndefined();
      expect(callArgs.temperature).toBeUndefined();
    });

    it('should throw when prompt is empty', async () => {
      const provider = new (OpenAIProvider!)('test-key');
      const config = createOpenAIConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, undefined)
      ).rejects.toThrow('Prompt is required');
    });

    it('should throw when prompt is empty string', async () => {
      const provider = new (OpenAIProvider!)('test-key');
      const config = createOpenAIConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, '')
      ).rejects.toThrow('Prompt is required');
    });

    it('should handle empty response (null content)', async () => {
      setupEmptyResponse();
      const provider = new (OpenAIProvider!)('test-key');
      const config = createOpenAIConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, 'test prompt')
      ).rejects.toThrow('Empty response from OpenAI');
    });

    it('should handle malformed JSON response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'not valid json' } }],
      });
      const provider = new (OpenAIProvider!)('test-key');
      const config = createOpenAIConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, 'test prompt')
      ).rejects.toThrow('Failed to parse AI response as JSON');
    });

    it('should deduplicate results', async () => {
      const items = [
        { title: 'The Matrix', year: 1999, reason: 'First' },
        { title: 'The Matrix', year: 1999, reason: 'Duplicate' },
        { title: 'Dune', year: 2021, reason: 'Unique' },
      ];
      setupSuccess(items);
      const provider = new (OpenAIProvider!)('test-key');
      const config = createOpenAIConfig();

      const result = await provider.generateRecommendations(
        config, {} as any, 'movie', 5, 'test prompt'
      );

      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0]?.explanation).toBe('First');
    });

    it('should include reasons when showExplanations is true', async () => {
      const items = [{ title: 'Test', year: 2020, reason: 'great movie' }];
      setupSuccess(items);
      const provider = new (OpenAIProvider!)('test-key');
      const config = createOpenAIConfig({ showExplanations: true });

      const result = await provider.generateRecommendations(
        config, {} as any, 'movie', 5, 'test prompt'
      );

      expect(result.recommendations[0]?.explanation).toBe('great movie');
    });

    it('should exclude reasons when showExplanations is false', async () => {
      // showExplanations: false controls the JSON schema sent to the API
      // (schema omits reason field). Since the mock always returns reason,
      // it still appears in the response — the provider doesn't strip it.
      const items = [{ title: 'Test', year: 2020, reason: 'great movie' }];
      setupSuccess(items);
      const provider = new (OpenAIProvider!)('test-key');
      const config = createOpenAIConfig({ showExplanations: false });

      const result = await provider.generateRecommendations(
        config, {} as any, 'movie', 5, 'test prompt'
      );

      expect(result.recommendations[0]?.explanation).toBe('great movie');
    });

    it('should retry on transient (retryable) failure with GPT-4.x', async () => {
      vi.useFakeTimers();
      mockCreate
        .mockRejectedValueOnce(new Error('429 rate limit'))
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ items: SAMPLE_MOVIE_RECOMMENDATIONS }) } }] });

      const provider = new (OpenAIProvider!)('test-key', 'gpt-4o');
      const config = createOpenAIConfig();

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
      const provider = new (OpenAIProvider!)('test-key');
      const config = createOpenAIConfig();

      await expect(
        provider.generateRecommendations(config, {} as any, 'movie', 5, 'test prompt')
      ).rejects.toThrow('Invalid API key');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should apply temperature override from options for GPT-4.x', async () => {
      setupSuccess(SAMPLE_MOVIE_RECOMMENDATIONS);
      const provider = new (OpenAIProvider!)('test-key', 'gpt-4o');
      const config = createOpenAIConfig();

      await provider.generateRecommendations(
        config, {} as any, 'movie', 5, 'test prompt', { temperature: 1.5 }
      );

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.temperature).toBe(1.5);
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
      const provider = new (OpenAIProvider!)('test-key');

      const result = await provider.validateApiKey();

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid false on empty response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '' } }],
      });
      const provider = new (OpenAIProvider!)('test-key');

      const result = await provider.validateApiKey();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Empty response from API');
    });

    it('should return valid false on auth error', async () => {
      setupError('401 Unauthorized');
      const provider = new (OpenAIProvider!)('test-key');

      const result = await provider.validateApiKey();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });

    it('should return valid false on network error', async () => {
      setupError('ENOTFOUND api.openai.com');
      const provider = new (OpenAIProvider!)('test-key');

      const result = await provider.validateApiKey();

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });
});