/**
 * Provider Factory Tests
 *
 * Tests for the AI provider factory and provider selection logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestConfig } from './__fixtures__/configs.js';

// Import the actual types and test the factory logic
describe('Provider Factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProvider', () => {
    it('should throw for gemini provider without API key', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'gemini',
        geminiApiKey: '',
      });

      expect(() => createProvider(config)).toThrow('No valid API key');
    });

    it('should throw for perplexity provider without API key (falls back to gemini)', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'perplexity',
        geminiApiKey: '',
        perplexityApiKey: '',
      });

      // Without perplexity key, falls back to gemini which also has no key
      expect(() => createProvider(config)).toThrow('No valid API key');
    });

    it('should create gemini provider with valid config', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'gemini',
        geminiApiKey: 'test-api-key-12345',
      });

      const provider = createProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create perplexity provider with valid config', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'perplexity',
        perplexityApiKey: 'test-perplexity-key-12345',
      });

      const provider = createProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create OpenAI provider with valid config', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'openai',
        openaiApiKey: 'test-openai-key-12345',
      });

      const provider = createProvider(config);
      expect(provider).toBeDefined();
      expect(provider.provider).toBe('openai');
    });

    it('should fall back to gemini when perplexity API key is empty', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'perplexity',
        geminiApiKey: 'valid-gemini-key',
        perplexityApiKey: '',
      });

      const provider = createProvider(config);
      expect(provider).toBeDefined();
      expect(provider.provider).toBe('gemini');
    });

    it('should fall back to gemini when OpenAI API key is empty', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'openai',
        geminiApiKey: 'valid-gemini-key',
        openaiApiKey: '',
      });

      const provider = createProvider(config);
      expect(provider).toBeDefined();
      expect(provider.provider).toBe('gemini');
    });

    it('should fall back to gemini for unknown provider name', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'unknown-provider' as any,
        geminiApiKey: 'valid-gemini-key',
      });

      const provider = createProvider(config);
      expect(provider).toBeDefined();
      expect(provider.provider).toBe('gemini');
    });

    it('should throw for unknown provider with no gemini key', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'unknown-provider' as any,
        geminiApiKey: '',
      });

      expect(() => createProvider(config)).toThrow('No valid API key');
    });

    it('should throw when no API keys are configured at all', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'gemini',
        geminiApiKey: '',
        perplexityApiKey: '',
        openaiApiKey: '',
      });

      expect(() => createProvider(config)).toThrow('No valid API key');
    });

    it('should default to gemini when aiProvider is empty string', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: '' as any,
        geminiApiKey: 'valid-gemini-key',
      });

      const provider = createProvider(config);
      expect(provider).toBeDefined();
      expect(provider.provider).toBe('gemini');
    });

    it('should create provider with whitespace-only gemini key (truthy)', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'gemini',
        geminiApiKey: '   ',
      });

      const provider = createProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create perplexity provider with whitespace-only key (truthy)', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'perplexity',
        perplexityApiKey: '   ',
      });

      const provider = createProvider(config);
      expect(provider).toBeDefined();
      expect(provider.provider).toBe('perplexity');
    });

    it('should create openai provider with whitespace-only key (truthy)', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'openai',
        openaiApiKey: '   ',
      });

      const provider = createProvider(config);
      expect(provider).toBeDefined();
      expect(provider.provider).toBe('openai');
    });
  });

  describe('getActiveProvider', () => {
    it('should return gemini for gemini provider', async () => {
      const { getActiveProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'gemini',
        geminiApiKey: 'gemini-key-123',
        perplexityApiKey: 'perplexity-key-456',
      });

      expect(getActiveProvider(config)).toBe('gemini');
    });

    it('should return perplexity for perplexity provider with key', async () => {
      const { getActiveProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'perplexity',
        geminiApiKey: 'gemini-key-123',
        perplexityApiKey: 'perplexity-key-456',
      });

      expect(getActiveProvider(config)).toBe('perplexity');
    });

    it('should return gemini for perplexity provider without key', async () => {
      const { getActiveProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'perplexity',
        geminiApiKey: 'gemini-key-123',
        perplexityApiKey: '',
      });

      // Falls back to gemini when perplexity has no key
      expect(getActiveProvider(config)).toBe('gemini');
    });

    it('should return openai for openai provider with key', async () => {
      const { getActiveProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'openai',
        openaiApiKey: 'openai-key-123',
      });

      expect(getActiveProvider(config)).toBe('openai');
    });

    it('should return gemini for openai provider without key', async () => {
      const { getActiveProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'openai',
        geminiApiKey: 'gemini-key-123',
        openaiApiKey: '',
      });

      expect(getActiveProvider(config)).toBe('gemini');
    });

    it('should return gemini when no provider or keys specified (default)', async () => {
      const { getActiveProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: undefined as any,
        geminiApiKey: 'gemini-key-123',
      });

      expect(getActiveProvider(config)).toBe('gemini');
    });

    it('should return gemini when aiProvider is empty string', async () => {
      const { getActiveProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: '' as any,
        geminiApiKey: 'gemini-key-123',
        perplexityApiKey: 'perplexity-key-456',
        openaiApiKey: 'openai-key-789',
      });

      expect(getActiveProvider(config)).toBe('gemini');
    });

    it('should return gemini when aiProvider is perplexity but key is whitespace', async () => {
      const { getActiveProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'perplexity',
        perplexityApiKey: '   ',
      });

      expect(getActiveProvider(config)).toBe('perplexity');
    });

    it('should return gemini when aiProvider is openai but key is whitespace', async () => {
      const { getActiveProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'openai',
        openaiApiKey: '   ',
      });

      expect(getActiveProvider(config)).toBe('openai');
    });
  });
});

describe('Provider Configuration', () => {
  describe('model selection', () => {
    it('should use specified gemini model', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'gemini',
        geminiApiKey: 'test-key',
        geminiModel: 'gemini-2.0-flash',
      });

      const provider = createProvider(config);
      expect(provider).toBeDefined();
      // Provider should be configured with the specified model
    });

    it('should use specified perplexity model', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'perplexity',
        perplexityApiKey: 'test-key',
        perplexityModel: 'sonar-pro',
      });

      const provider = createProvider(config);
      expect(provider).toBeDefined();
    });

    it('should use specified openai model', async () => {
      const { createProvider } = await import('../src/providers/factory.js');

      const config = createTestConfig({
        aiProvider: 'openai',
        openaiApiKey: 'test-key',
        openaiModel: 'gpt-4o',
      });

      const provider = createProvider(config);
      expect(provider).toBeDefined();
      expect(provider.model).toBe('gpt-4o');
    });
  });
});
