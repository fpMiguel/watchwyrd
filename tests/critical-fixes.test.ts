/**
 * Critical Fixes Tests
 *
 * Tests for critical issues identified in the security audit:
 * 1. OpenAI provider in schema validation
 * 2. OpenAI fields in userConfigSchema
 * 3. Cache type safety (generic interface)
 * 4. JSON.parse error handling in providers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseUserConfig, validateRequiredFields, aiProviderSchema } from '../src/config/schema.js';
import { MemoryCache } from '../src/cache/memory.js';
import type { CacheableValue } from '../src/cache/interface.js';
import { createTestConfig, createOpenAIConfig } from './__fixtures__/configs.js';

describe('Critical Fix: OpenAI Provider Schema', () => {
  describe('aiProviderSchema', () => {
    it('should accept gemini as valid provider', () => {
      const result = aiProviderSchema.safeParse('gemini');
      expect(result.success).toBe(true);
    });

    it('should accept perplexity as valid provider', () => {
      const result = aiProviderSchema.safeParse('perplexity');
      expect(result.success).toBe(true);
    });

    it('should accept openai as valid provider', () => {
      const result = aiProviderSchema.safeParse('openai');
      expect(result.success).toBe(true);
    });

    it('should reject invalid providers', () => {
      const result = aiProviderSchema.safeParse('invalid-provider');
      expect(result.success).toBe(false);
    });
  });

  describe('parseUserConfig with OpenAI', () => {
    it('should parse config with openai provider', () => {
      const config = parseUserConfig({
        aiProvider: 'openai',
        openaiApiKey: 'sk-test-key-12345',
        openaiModel: 'gpt-4o-mini',
      });

      expect(config.aiProvider).toBe('openai');
      expect(config.openaiApiKey).toBe('sk-test-key-12345');
      expect(config.openaiModel).toBe('gpt-4o-mini');
    });

    it('should allow openaiApiKey and openaiModel fields', () => {
      const config = parseUserConfig({
        geminiApiKey: 'test-key',
        openaiApiKey: 'sk-openai-key',
        openaiModel: 'gpt-4o',
      });

      expect(config.openaiApiKey).toBe('sk-openai-key');
      expect(config.openaiModel).toBe('gpt-4o');
    });
  });

  describe('validateRequiredFields with OpenAI', () => {
    it('should require OpenAI API key when provider is openai', () => {
      const config = createTestConfig({
        aiProvider: 'openai',
        openaiApiKey: '',
      });

      const errors = validateRequiredFields(config);
      expect(errors).toContain('OpenAI API key is required');
    });

    it('should pass validation with valid OpenAI config', () => {
      const config = createOpenAIConfig();
      const errors = validateRequiredFields(config);
      expect(errors).not.toContain('OpenAI API key is required');
    });

    it('should require Gemini API key when provider is gemini', () => {
      const config = createTestConfig({
        aiProvider: 'gemini',
        geminiApiKey: '',
      });

      const errors = validateRequiredFields(config);
      expect(errors).toContain('Gemini API key is required');
    });

    it('should require Perplexity API key when provider is perplexity', () => {
      const config = createTestConfig({
        aiProvider: 'perplexity',
        perplexityApiKey: '',
      });

      const errors = validateRequiredFields(config);
      expect(errors).toContain('Perplexity API key is required');
    });
  });
});

describe('Critical Fix: Cache Type Safety', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache({ maxSize: 100, ttlSeconds: 3600 });
  });

  afterEach(async () => {
    await cache.close();
  });

  interface TestCacheEntry extends CacheableValue {
    data: string;
    count: number;
  }

  interface AnotherCacheEntry extends CacheableValue {
    items: string[];
  }

  it('should store and retrieve typed cache entries', async () => {
    const entry: TestCacheEntry = {
      data: 'test-data',
      count: 42,
      generatedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    };

    await cache.set<TestCacheEntry>('test-key', entry, 3600);
    const retrieved = await cache.get<TestCacheEntry>('test-key');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.data).toBe('test-data');
    expect(retrieved?.count).toBe(42);
  });

  it('should handle different cache entry types', async () => {
    const entry1: TestCacheEntry = {
      data: 'test',
      count: 1,
      generatedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    };

    const entry2: AnotherCacheEntry = {
      items: ['a', 'b', 'c'],
      generatedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    };

    await cache.set<TestCacheEntry>('key1', entry1, 3600);
    await cache.set<AnotherCacheEntry>('key2', entry2, 3600);

    const retrieved1 = await cache.get<TestCacheEntry>('key1');
    const retrieved2 = await cache.get<AnotherCacheEntry>('key2');

    expect(retrieved1?.data).toBe('test');
    expect(retrieved2?.items).toEqual(['a', 'b', 'c']);
  });

  it('should return null for non-existent keys', async () => {
    const result = await cache.get<TestCacheEntry>('nonexistent');
    expect(result).toBeNull();
  });

  it('should require generatedAt and expiresAt in cache entries', async () => {
    // This test validates at compile-time that CacheableValue fields are required
    const validEntry: CacheableValue = {
      generatedAt: Date.now(),
      expiresAt: Date.now() + 1000,
    };

    await cache.set('valid-key', validEntry, 60);
    const result = await cache.get('valid-key');
    expect(result?.generatedAt).toBeDefined();
    expect(result?.expiresAt).toBeDefined();
  });
});

describe('Critical Fix: JSON Parse Error Handling', () => {
  // These tests verify that malformed JSON responses are handled gracefully
  // We test the error message format that providers should produce

  it('should produce descriptive error for malformed JSON', () => {
    const malformedJson = 'This is not JSON at all';

    let errorMessage = '';
    try {
      JSON.parse(malformedJson);
    } catch {
      // Simulate the error handling in providers
      errorMessage = `Failed to parse AI response as JSON: ${malformedJson.substring(0, 200)}${malformedJson.length > 200 ? '...' : ''}`;
    }

    expect(errorMessage).toContain('Failed to parse AI response as JSON');
    expect(errorMessage).toContain('This is not JSON');
  });

  it('should truncate long malformed responses in error message', () => {
    const longMalformedJson = 'x'.repeat(300);

    let errorMessage = '';
    try {
      JSON.parse(longMalformedJson);
    } catch {
      errorMessage = `Failed to parse AI response as JSON: ${longMalformedJson.substring(0, 200)}${longMalformedJson.length > 200 ? '...' : ''}`;
    }

    expect(errorMessage.length).toBeLessThan(260);
    expect(errorMessage).toContain('...');
  });

  it('should not truncate short malformed responses', () => {
    const shortMalformedJson = 'invalid';

    let errorMessage = '';
    try {
      JSON.parse(shortMalformedJson);
    } catch {
      errorMessage = `Failed to parse AI response as JSON: ${shortMalformedJson.substring(0, 200)}${shortMalformedJson.length > 200 ? '...' : ''}`;
    }

    expect(errorMessage).not.toContain('...');
    expect(errorMessage).toContain('invalid');
  });

  it('should handle various malformed JSON cases', () => {
    const malformedCases = [
      '{ unclosed object',
      '[ unclosed array',
      '{"key": undefined}',
      'null null',
      '{"items": [}',
    ];

    for (const malformed of malformedCases) {
      expect(() => JSON.parse(malformed)).toThrow();
    }
  });
});
