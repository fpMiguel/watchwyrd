/**
 * AI Provider Integration Tests
 *
 * These tests make REAL API calls to AI providers (Gemini, Perplexity, OpenAI).
 * They are skipped by default and only run when RUN_API_TESTS=true.
 *
 * Run with: npm run test:integration
 *
 * Environment variables required:
 * - GEMINI_API_KEY for Gemini tests
 * - PERPLEXITY_API_KEY for Perplexity tests
 * - OPENAI_API_KEY for OpenAI tests
 *
 * Record mode: RECORD_RESPONSES=true to capture responses for fixtures
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { ContentType, AIProvider, UserConfig } from '../../src/types/index.js';
import type { IAIProvider } from '../../src/providers/types.js';
import { GeminiProvider } from '../../src/providers/gemini.js';
import { PerplexityProvider } from '../../src/providers/perplexity.js';
import { OpenAIProvider } from '../../src/providers/openai.js';
import {
  createGeminiConfig,
  createPerplexityConfig,
  createOpenAIConfig,
  MINIMAL_CONTEXT,
} from '../__fixtures__/configs.js';
import {
  SKIP_INTEGRATION,
  RECORD_MODE,
  TIMEOUTS,
  recordResponse,
  printRecordModeBanner,
  logSkipReason,
  buildTestPrompt,
  expectValidAIResponse,
  expectAllRecommendationsValid,
  expectValidKeyResult,
  expectInvalidKeyResult,
  withRetry,
} from './__helpers__/integration-utils.js';

// =============================================================================
// Environment & Configuration
// =============================================================================

const GEMINI_KEY = process.env['GEMINI_API_KEY'] ?? '';
const PERPLEXITY_KEY = process.env['PERPLEXITY_API_KEY'] ?? '';
const OPENAI_KEY = process.env['OPENAI_API_KEY'] ?? '';

/** Provider test configuration - add new providers here */
interface ProviderTestConfig {
  name: AIProvider;
  displayName: string;
  key: string;
  model: string;
  createProvider: () => IAIProvider;
  createInvalidProvider: () => IAIProvider;
  createConfig: () => UserConfig;
  /** Provider-specific assertions */
  extraAssertions?: (response: unknown) => void;
}

const PROVIDERS: ProviderTestConfig[] = [
  {
    name: 'gemini',
    displayName: 'Gemini',
    key: GEMINI_KEY,
    model: 'gemini-2.5-flash',
    createProvider: () => new GeminiProvider(GEMINI_KEY, 'gemini-2.5-flash'),
    createInvalidProvider: () => new GeminiProvider('invalid-gemini-key-xxx', 'gemini-2.5-flash'),
    createConfig: () => createGeminiConfig({ geminiApiKey: GEMINI_KEY }),
  },
  {
    name: 'perplexity',
    displayName: 'Perplexity',
    key: PERPLEXITY_KEY,
    model: 'sonar',
    createProvider: () => new PerplexityProvider(PERPLEXITY_KEY, 'sonar'),
    createInvalidProvider: () => new PerplexityProvider('invalid-perplexity-key-xxx', 'sonar'),
    createConfig: () => createPerplexityConfig({ perplexityApiKey: PERPLEXITY_KEY }),
  },
  {
    name: 'openai',
    displayName: 'OpenAI',
    key: OPENAI_KEY,
    model: 'gpt-4o-mini',
    createProvider: () => new OpenAIProvider(OPENAI_KEY, 'gpt-4o-mini'),
    createInvalidProvider: () => new OpenAIProvider('invalid-openai-key-xxx', 'gpt-4o-mini'),
    createConfig: () => createOpenAIConfig({ openaiApiKey: OPENAI_KEY }),
  },
];

// Content types to test
const CONTENT_TYPES: ContentType[] = ['movie', 'series'];

// =============================================================================
// Test Suite
// =============================================================================

describe.skipIf(SKIP_INTEGRATION)('AI Provider Integration Tests', () => {
  beforeAll(() => {
    printRecordModeBanner('AI Provider Integration Tests');

    // Log which providers are available
    for (const provider of PROVIDERS) {
      if (!provider.key) {
        logSkipReason(provider.displayName, `${provider.name.toUpperCase()}_API_KEY not set`);
      }
    }
  });

  // ===========================================================================
  // Parameterized Tests: All Providers
  // ===========================================================================

  describe.each(PROVIDERS)('$displayName Provider', (providerConfig) => {
    const { name, key, model, createProvider, createInvalidProvider, createConfig } =
      providerConfig;
    const shouldSkip = !key;

    // -------------------------------------------------------------------------
    // API Key Validation
    // -------------------------------------------------------------------------

    describe.skipIf(shouldSkip)('API Key Validation', () => {
      it('should validate a valid API key', { timeout: TIMEOUTS.validation }, async () => {
        const provider = createProvider();

        const result = await withRetry(() => provider.validateApiKey(), {
          maxRetries: 2,
          onRetry: (attempt) => console.log(`  Retry ${attempt} for ${name} validation...`),
        });

        recordResponse(`${name}:validation:valid`, result);
        expectValidKeyResult(result);
      });

      it('should reject an invalid API key', { timeout: TIMEOUTS.validation }, async () => {
        const invalidProvider = createInvalidProvider();

        const result = await invalidProvider.validateApiKey();

        recordResponse(`${name}:validation:invalid`, result);
        expectInvalidKeyResult(result);
      });
    });

    // -------------------------------------------------------------------------
    // Recommendation Generation
    // -------------------------------------------------------------------------

    describe.skipIf(shouldSkip)('Recommendation Generation', () => {
      it.each(CONTENT_TYPES)(
        'should generate %s recommendations',
        { timeout: TIMEOUTS.generation },
        async (contentType) => {
          const provider = createProvider();
          const config = createConfig();
          const prompt = buildTestPrompt(config, contentType, 5, 'fornow');

          const response = await withRetry(
            () => provider.generateRecommendations(config, MINIMAL_CONTEXT, contentType, 5, prompt),
            {
              maxRetries: 1,
              onRetry: (attempt) => console.log(`  Retry ${attempt} for ${name} ${contentType}...`),
            }
          );

          recordResponse(`${name}:${contentType}:fornow:5`, response);

          // Validate response structure
          expectValidAIResponse(response, name, { minRecommendations: 3, checkModel: model });
          expectAllRecommendationsValid(response);

          // All recommendations should have a title and year at minimum
          for (const rec of response.recommendations) {
            expect(rec.title.length).toBeGreaterThan(0);
            expect(rec.year).toBeGreaterThanOrEqual(1900);
          }
        }
      );

      it(
        'should handle discovery temperature (higher creativity)',
        { timeout: TIMEOUTS.generation },
        async () => {
          const provider = createProvider();
          const config = createConfig();
          const prompt = buildTestPrompt(config, 'movie', 5, 'discover');

          const response = await withRetry(
            () =>
              provider.generateRecommendations(config, MINIMAL_CONTEXT, 'movie', 5, prompt, {
                temperature: 1.2,
              }),
            { maxRetries: 1 }
          );

          recordResponse(`${name}:movie:discover:5`, response);

          expectValidAIResponse(response, name, { minRecommendations: 3 });
          expectAllRecommendationsValid(response);
        }
      );
    });

    // -------------------------------------------------------------------------
    // Provider-Specific Features
    // -------------------------------------------------------------------------

    describe.skipIf(shouldSkip)('Provider-Specific Features', () => {
      it(
        'should return correct provider in metadata',
        { timeout: TIMEOUTS.generation },
        async () => {
          const provider = createProvider();
          const config = createConfig();
          const prompt = buildTestPrompt(config, 'movie', 3, 'fornow');

          const response = await withRetry(() =>
            provider.generateRecommendations(config, MINIMAL_CONTEXT, 'movie', 3, prompt)
          );

          expect(response.metadata.providerUsed).toBe(name);
          expect(response.metadata.modelUsed).toBe(model);
          expect(response.metadata.generatedAt).toBeTruthy();

          // Verify timestamp is recent (within last 5 minutes)
          const generatedAt = new Date(response.metadata.generatedAt).getTime();
          const now = Date.now();
          expect(now - generatedAt).toBeLessThan(5 * 60 * 1000);
        }
      );
    });
  });

  // ===========================================================================
  // Cross-Provider Consistency Tests
  // ===========================================================================

  describe('Cross-Provider Consistency', () => {
    const availableProviders = PROVIDERS.filter((p) => p.key);

    it.skipIf(availableProviders.length < 2)(
      'all available providers should return consistent response structure',
      { timeout: TIMEOUTS.batch },
      async () => {
        const results: Array<{ provider: AIProvider; response: unknown }> = [];

        for (const providerConfig of availableProviders) {
          const provider = providerConfig.createProvider();
          const config = providerConfig.createConfig();
          const prompt = buildTestPrompt(config, 'movie', 5, 'fornow');

          const response = await withRetry(
            () => provider.generateRecommendations(config, MINIMAL_CONTEXT, 'movie', 5, prompt),
            { maxRetries: 1 }
          );

          results.push({ provider: providerConfig.name, response });

          // Each provider should return valid structure
          expectValidAIResponse(response, providerConfig.name, { minRecommendations: 3 });
        }

        recordResponse('cross-provider:movie:fornow:5', results);

        // All providers returned results
        expect(results.length).toBe(availableProviders.length);
      }
    );

    it.skipIf(availableProviders.length < 1)(
      'recommendations should have diverse content',
      { timeout: TIMEOUTS.generation },
      async () => {
        // Use first available provider
        const providerConfig = availableProviders[0]!;
        const provider = providerConfig.createProvider();
        const config = providerConfig.createConfig();
        const prompt = buildTestPrompt(config, 'movie', 10, 'discover');

        const response = await withRetry(() =>
          provider.generateRecommendations(config, MINIMAL_CONTEXT, 'movie', 10, prompt, {
            temperature: 1.2,
          })
        );

        // Should have multiple recommendations
        expect(response.recommendations.length).toBeGreaterThanOrEqual(5);

        // Recommendations should have unique titles
        const titles = response.recommendations.map((r) => r.title.toLowerCase());
        const uniqueTitles = new Set(titles);
        expect(uniqueTitles.size).toBe(titles.length);

        // Should have variety in years (not all from same decade)
        const years = response.recommendations.map((r) => r.year);
        const decades = new Set(years.map((y) => Math.floor(y / 10)));
        expect(decades.size).toBeGreaterThanOrEqual(2);

        recordResponse(`${providerConfig.name}:diversity-check`, {
          uniqueTitles: uniqueTitles.size,
          totalTitles: titles.length,
          decades: [...decades],
        });
      }
    );
  });
});

// =============================================================================
// Record Mode Instructions
// =============================================================================

if (RECORD_MODE) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    RECORDING INSTRUCTIONS                    ║
╠══════════════════════════════════════════════════════════════╣
║ After tests complete, copy the logged JSON responses to:    ║
║   tests/__fixtures__/recorded/provider-responses.ts         ║
║                                                              ║
║ This provides realistic mock data for unit tests.           ║
╚══════════════════════════════════════════════════════════════╝
`);
}
