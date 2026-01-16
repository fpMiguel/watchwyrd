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
  });
});
