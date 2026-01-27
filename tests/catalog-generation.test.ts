/**
 * Catalog Generation Tests (Mocked)
 *
 * Comprehensive tests for the complete AI recommendation flow:
 * AI Provider → Recommendations → Cinemeta Lookup → Stremio Catalog
 *
 * All external dependencies are mocked for fast, reliable testing.
 * Run `npm run test:integration` for real API tests (requires API keys).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ContentType, AIResponse, AIProvider, AIRecommendation } from '../src/types/index.js';
import type { Recommendation } from '../src/schemas/recommendations.js';
import {
  SAMPLE_MOVIE_RECOMMENDATIONS,
  SAMPLE_SERIES_RECOMMENDATIONS,
  EMPTY_RECOMMENDATIONS,
} from './__fixtures__/recommendations.js';
import {
  createGeminiConfig,
  createPerplexityConfig,
  createOpenAIConfig,
} from './__fixtures__/configs.js';

// =============================================================================
// Hoisted Mocks
// =============================================================================

const mocks = vi.hoisted(() => ({
  // Provider factory mock
  createProvider: vi.fn(),

  // Cinemeta mocks
  lookupTitles: vi.fn(),

  // RPDB mock
  enhancePosterUrl: vi.fn(),

  // Cache mocks
  getCache: vi.fn(),

  // Context signals mock
  generateContextSignals: vi.fn(),
  getTemporalBucket: vi.fn(),

  // Logger mock (to suppress logs in tests)
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Module mocks
vi.mock('../src/providers/index.js', () => ({
  createProvider: mocks.createProvider,
}));

vi.mock('../src/services/cinemeta.js', () => ({
  lookupTitles: mocks.lookupTitles,
}));

vi.mock('../src/services/rpdb.js', () => ({
  enhancePosterUrl: mocks.enhancePosterUrl,
}));

vi.mock('../src/cache/index.js', () => ({
  getCache: mocks.getCache,
  generateCacheKey: vi.fn().mockReturnValue('test-cache-key'),
}));

vi.mock('../src/signals/context.js', () => ({
  generateContextSignals: mocks.generateContextSignals,
  getTemporalBucket: mocks.getTemporalBucket,
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: mocks.logger,
}));

// Import after mocks are set up
import { generateCatalog } from '../src/catalog/catalogGenerator.js';

// =============================================================================
// Test Fixtures & Helpers
// =============================================================================

/**
 * Convert Recommendation to AIRecommendation format
 */
function toAIRecommendation(rec: Recommendation, index: number): AIRecommendation {
  return {
    imdbId: `tt${1000000 + index}`,
    title: rec.title,
    year: rec.year,
    genres: ['Drama'],
    runtime: 120,
    explanation: rec.reason || 'AI recommended',
    contextTags: ['evening'],
    confidenceScore: 0.95,
  };
}

/**
 * Create a mock AI response from recommendations
 */
function createMockAIResponse(
  recommendations: Recommendation[],
  provider: AIProvider = 'gemini'
): AIResponse {
  return {
    recommendations: recommendations.map((rec, i) => toAIRecommendation(rec, i)),
    metadata: {
      generatedAt: new Date().toISOString(),
      modelUsed: provider === 'gemini' ? 'gemini-2.5-flash' : 'sonar-pro',
      providerUsed: provider,
      searchUsed: false,
      totalCandidatesConsidered: recommendations.length * 2,
    },
  };
}

/**
 * Create mock Cinemeta lookup results for recommendations
 */
function createMockCinemetaResults(
  recommendations: Recommendation[],
  contentType: ContentType
): Map<string, { imdbId: string; title: string; year: number; type: ContentType; poster: string }> {
  const results = new Map();
  let idCounter = 1000000;

  for (const rec of recommendations) {
    results.set(rec.title, {
      imdbId: `tt${idCounter++}`,
      title: rec.title,
      year: rec.year,
      type: contentType,
      poster: `https://images.example.com/${encodeURIComponent(rec.title)}.jpg`,
    });
  }

  return results;
}

/**
 * Create a mock provider instance
 */
function createMockProvider(
  response: AIResponse | Error,
  provider: AIProvider = 'gemini'
): {
  provider: AIProvider;
  model: string;
  generateRecommendations: ReturnType<typeof vi.fn>;
  validateApiKey: ReturnType<typeof vi.fn>;
} {
  const generateFn = vi.fn();

  if (response instanceof Error) {
    // Use mockImplementation to avoid unhandled rejection warnings
    // The error is only created when the mock is actually called
    const errorMessage = response.message;
    generateFn.mockImplementation(() => Promise.reject(new Error(errorMessage)));
  } else {
    generateFn.mockResolvedValue(response);
  }

  return {
    provider,
    model: provider === 'gemini' ? 'gemini-2.5-flash' : 'sonar-pro',
    generateRecommendations: generateFn,
    validateApiKey: vi.fn().mockResolvedValue({ valid: true }),
  };
}

/**
 * Get test config for a provider
 */
function getTestConfig(provider: AIProvider) {
  switch (provider) {
    case 'gemini':
      return createGeminiConfig();
    case 'perplexity':
      return createPerplexityConfig();
    case 'openai':
      return createOpenAIConfig();
  }
}

/**
 * Default context signals
 */
const DEFAULT_CONTEXT = {
  timeOfDay: 'evening' as const,
  dayOfWeek: 'friday' as const,
  season: 'winter' as const,
  isWeekend: true,
  isHoliday: false,
  localTime: '20:00',
  timezone: 'America/New_York',
};

// =============================================================================
// Test Setup
// =============================================================================

describe('Catalog Generation (Mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mocks.generateContextSignals.mockResolvedValue(DEFAULT_CONTEXT);
    mocks.getTemporalBucket.mockReturnValue('evening');
    mocks.enhancePosterUrl.mockImplementation((poster: string) => poster);
    mocks.getCache.mockReturnValue({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Parameterized Tests: All Providers × All Content Types
  // ===========================================================================

  describe.each<AIProvider>(['gemini', 'perplexity', 'openai'])('%s provider', (provider) => {
    describe.each<ContentType>(['movie', 'series'])('%s catalog', (contentType) => {
      const recommendations =
        contentType === 'movie' ? SAMPLE_MOVIE_RECOMMENDATIONS : SAMPLE_SERIES_RECOMMENDATIONS;

      it('should generate catalog with valid recommendations', async () => {
        // Arrange
        const config = getTestConfig(provider);
        const aiResponse = createMockAIResponse(recommendations.slice(0, 5), provider);
        const mockProvider = createMockProvider(aiResponse, provider);
        const cinemetaResults = createMockCinemetaResults(recommendations.slice(0, 5), contentType);

        mocks.createProvider.mockReturnValue(mockProvider);
        mocks.lookupTitles.mockResolvedValue(cinemetaResults);

        // Act
        const catalog = await generateCatalog(
          config,
          contentType,
          `watchwyrd-${contentType}-fornow`
        );

        // Assert
        expect(catalog.metas).toHaveLength(5);
        expect(mockProvider.generateRecommendations).toHaveBeenCalledOnce();
        expect(mocks.lookupTitles).toHaveBeenCalledOnce();

        // Verify meta structure
        for (const meta of catalog.metas) {
          expect(meta.id).toMatch(/^tt\d+$/);
          expect(meta.type).toBe(contentType);
          expect(meta.name).toBeTruthy();
          expect(meta.poster).toBeTruthy();
        }
      });

      it('should handle empty recommendations gracefully', async () => {
        // Arrange
        const config = getTestConfig(provider);
        const aiResponse = createMockAIResponse(EMPTY_RECOMMENDATIONS, provider);
        const mockProvider = createMockProvider(aiResponse, provider);

        mocks.createProvider.mockReturnValue(mockProvider);
        mocks.lookupTitles.mockResolvedValue(new Map());

        // Act
        const catalog = await generateCatalog(
          config,
          contentType,
          `watchwyrd-${contentType}-fornow`
        );

        // Assert
        expect(catalog.metas).toHaveLength(0);
      });

      it('should resolve titles via Cinemeta correctly', async () => {
        // Arrange
        const config = getTestConfig(provider);
        const testRecs = recommendations.slice(0, 3);
        const aiResponse = createMockAIResponse(testRecs, provider);
        const mockProvider = createMockProvider(aiResponse, provider);
        const cinemetaResults = createMockCinemetaResults(testRecs, contentType);

        mocks.createProvider.mockReturnValue(mockProvider);
        mocks.lookupTitles.mockResolvedValue(cinemetaResults);

        // Act
        await generateCatalog(config, contentType, `watchwyrd-${contentType}-fornow`);

        // Assert
        const lookupCall = mocks.lookupTitles.mock.calls[0]?.[0] as Array<{
          title: string;
          year: number;
          type: ContentType;
        }>;
        expect(lookupCall).toHaveLength(3);
        for (const item of lookupCall) {
          expect(item.type).toBe(contentType);
          expect(item.title).toBeTruthy();
          expect(item.year).toBeTypeOf('number');
        }
      });

      it('should preserve recommendation order in catalog', async () => {
        // Arrange
        const config = getTestConfig(provider);
        const orderedRecs = recommendations.slice(0, 5);
        const aiResponse = createMockAIResponse(orderedRecs, provider);
        const mockProvider = createMockProvider(aiResponse, provider);
        const cinemetaResults = createMockCinemetaResults(orderedRecs, contentType);

        mocks.createProvider.mockReturnValue(mockProvider);
        mocks.lookupTitles.mockResolvedValue(cinemetaResults);

        // Act
        const catalog = await generateCatalog(
          config,
          contentType,
          `watchwyrd-${contentType}-fornow`
        );

        // Assert
        expect(catalog.metas).toHaveLength(5);
        for (let i = 0; i < catalog.metas.length; i++) {
          expect(catalog.metas[i]?.name).toBe(orderedRecs[i]?.title);
        }
      });
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should return error catalog when provider fails with generic error', async () => {
      // Arrange
      const config = createGeminiConfig();
      const mockProvider = createMockProvider(new Error('AI service unavailable'), 'gemini');

      mocks.createProvider.mockReturnValue(mockProvider);

      // Act
      const catalog = await generateCatalog(config, 'movie', 'watchwyrd-movies-fornow');

      // Assert
      expect(catalog.metas).toHaveLength(1);
      expect(catalog.metas[0]?.name).toContain('Unavailable');
      expect(catalog.metas[0]?.id).toContain('error');
    });

    it('should return rate limit error catalog when provider returns 429', async () => {
      // Arrange
      const config = createPerplexityConfig();
      const mockProvider = createMockProvider(new Error('Rate limit exceeded (429)'), 'perplexity');

      mocks.createProvider.mockReturnValue(mockProvider);

      // Act
      const catalog = await generateCatalog(config, 'movie', 'watchwyrd-movies-fornow');

      // Assert
      expect(catalog.metas).toHaveLength(1);
      expect(catalog.metas[0]?.name).toContain('Rate Limited');
    });

    it('should return API key error catalog when authentication fails', async () => {
      // Arrange
      const config = createOpenAIConfig();
      const mockProvider = createMockProvider(new Error('Invalid API key (401)'), 'openai');

      mocks.createProvider.mockReturnValue(mockProvider);

      // Act
      const catalog = await generateCatalog(config, 'movie', 'watchwyrd-movies-fornow');

      // Assert
      expect(catalog.metas).toHaveLength(1);
      expect(catalog.metas[0]?.name).toContain('API Key');
    });

    it('should return timeout error catalog when request times out', async () => {
      // Arrange
      const config = createGeminiConfig();
      const mockProvider = createMockProvider(new Error('Request timeout'), 'gemini');

      mocks.createProvider.mockReturnValue(mockProvider);

      // Act
      const catalog = await generateCatalog(config, 'movie', 'watchwyrd-movies-fornow');

      // Assert
      expect(catalog.metas).toHaveLength(1);
      expect(catalog.metas[0]?.name).toContain('Timeout');
    });

    it('should return connection error catalog when network fails', async () => {
      // Arrange
      const config = createGeminiConfig();
      const mockProvider = createMockProvider(new Error('ECONNREFUSED'), 'gemini');

      mocks.createProvider.mockReturnValue(mockProvider);

      // Act
      const catalog = await generateCatalog(config, 'movie', 'watchwyrd-movies-fornow');

      // Assert
      expect(catalog.metas).toHaveLength(1);
      expect(catalog.metas[0]?.name).toContain('Connection');
    });

    it('should filter out Cinemeta lookup failures', async () => {
      // Arrange
      const config = createGeminiConfig();
      const testRecs = SAMPLE_MOVIE_RECOMMENDATIONS.slice(0, 5);
      const aiResponse = createMockAIResponse(testRecs, 'gemini');
      const mockProvider = createMockProvider(aiResponse, 'gemini');

      // Only 2 of 5 titles found in Cinemeta
      const partialResults = new Map([
        [
          testRecs[0]!.title,
          {
            imdbId: 'tt1000000',
            title: testRecs[0]!.title,
            year: testRecs[0]!.year,
            type: 'movie' as ContentType,
            poster: 'https://example.com/1.jpg',
          },
        ],
        [
          testRecs[2]!.title,
          {
            imdbId: 'tt1000002',
            title: testRecs[2]!.title,
            year: testRecs[2]!.year,
            type: 'movie' as ContentType,
            poster: 'https://example.com/2.jpg',
          },
        ],
      ]);

      mocks.createProvider.mockReturnValue(mockProvider);
      mocks.lookupTitles.mockResolvedValue(partialResults);

      // Act
      const catalog = await generateCatalog(config, 'movie', 'watchwyrd-movies-fornow');

      // Assert
      expect(catalog.metas).toHaveLength(2);
    });

    it('should filter out wrong content type from Cinemeta results', async () => {
      // Arrange
      const config = createGeminiConfig();
      const testRecs = SAMPLE_MOVIE_RECOMMENDATIONS.slice(0, 3);
      const aiResponse = createMockAIResponse(testRecs, 'gemini');
      const mockProvider = createMockProvider(aiResponse, 'gemini');

      // Return series instead of movies
      const wrongTypeResults = new Map([
        [
          testRecs[0]!.title,
          {
            imdbId: 'tt1000000',
            title: testRecs[0]!.title,
            year: testRecs[0]!.year,
            type: 'series' as ContentType, // Wrong type!
            poster: 'https://example.com/1.jpg',
          },
        ],
      ]);

      mocks.createProvider.mockReturnValue(mockProvider);
      mocks.lookupTitles.mockResolvedValue(wrongTypeResults);

      // Act
      const catalog = await generateCatalog(config, 'movie', 'watchwyrd-movies-fornow');

      // Assert
      expect(catalog.metas).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Configuration Tests
  // ===========================================================================

  describe('Configuration Options', () => {
    it('should include explanations when showExplanations is true', async () => {
      // Arrange
      const config = createGeminiConfig({ showExplanations: true });
      const testRecs = SAMPLE_MOVIE_RECOMMENDATIONS.slice(0, 2);
      const aiResponse = createMockAIResponse(testRecs, 'gemini');
      const mockProvider = createMockProvider(aiResponse, 'gemini');
      const cinemetaResults = createMockCinemetaResults(testRecs, 'movie');

      mocks.createProvider.mockReturnValue(mockProvider);
      mocks.lookupTitles.mockResolvedValue(cinemetaResults);

      // Act
      const catalog = await generateCatalog(config, 'movie', 'watchwyrd-movies-fornow');

      // Assert
      expect(catalog.metas).toHaveLength(2);
      for (const meta of catalog.metas) {
        expect(meta.description).toBeTruthy();
      }
    });

    it('should not include explanations when showExplanations is false', async () => {
      // Arrange
      const config = createGeminiConfig({ showExplanations: false });
      const testRecs = SAMPLE_MOVIE_RECOMMENDATIONS.slice(0, 2);
      const aiResponse = createMockAIResponse(testRecs, 'gemini');
      const mockProvider = createMockProvider(aiResponse, 'gemini');
      const cinemetaResults = createMockCinemetaResults(testRecs, 'movie');

      mocks.createProvider.mockReturnValue(mockProvider);
      mocks.lookupTitles.mockResolvedValue(cinemetaResults);

      // Act
      const catalog = await generateCatalog(config, 'movie', 'watchwyrd-movies-fornow');

      // Assert
      expect(catalog.metas).toHaveLength(2);
      for (const meta of catalog.metas) {
        expect(meta.description).toBeUndefined();
      }
    });

    it('should enhance posters with RPDB when rpdbApiKey is provided', async () => {
      // Arrange
      const config = createGeminiConfig({ rpdbApiKey: 'test-rpdb-key' });
      const testRecs = SAMPLE_MOVIE_RECOMMENDATIONS.slice(0, 1);
      const aiResponse = createMockAIResponse(testRecs, 'gemini');
      const mockProvider = createMockProvider(aiResponse, 'gemini');
      const cinemetaResults = createMockCinemetaResults(testRecs, 'movie');

      mocks.createProvider.mockReturnValue(mockProvider);
      mocks.lookupTitles.mockResolvedValue(cinemetaResults);
      mocks.enhancePosterUrl.mockReturnValue('https://rpdb.example.com/enhanced.jpg');

      // Act
      const catalog = await generateCatalog(config, 'movie', 'watchwyrd-movies-fornow');

      // Assert
      expect(mocks.enhancePosterUrl).toHaveBeenCalled();
      expect(catalog.metas[0]?.poster).toBe('https://rpdb.example.com/enhanced.jpg');
    });

    it('should respect catalogSize configuration', async () => {
      // Arrange
      const config = createGeminiConfig({ catalogSize: 15 });
      const testRecs = SAMPLE_MOVIE_RECOMMENDATIONS;
      const aiResponse = createMockAIResponse(testRecs, 'gemini');
      const mockProvider = createMockProvider(aiResponse, 'gemini');
      const cinemetaResults = createMockCinemetaResults(testRecs, 'movie');

      mocks.createProvider.mockReturnValue(mockProvider);
      mocks.lookupTitles.mockResolvedValue(cinemetaResults);

      // Act
      await generateCatalog(config, 'movie', 'watchwyrd-movies-fornow');

      // Assert - verify catalogSize is passed to provider
      const providerCall = mockProvider.generateRecommendations.mock.calls[0];
      expect(providerCall?.[3]).toBe(15); // 4th argument is count
    });
  });

  // ===========================================================================
  // Caching Tests
  // ===========================================================================

  describe('Caching Behavior', () => {
    it('should return cached catalog if available and not expired', async () => {
      // Arrange
      const config = createGeminiConfig();
      const cachedCatalog = {
        catalog: {
          metas: [{ id: 'tt1234567', type: 'movie', name: 'Cached Movie', poster: 'url' }],
        },
        generatedAt: Date.now() - 1000,
        expiresAt: Date.now() + 10000,
        configHash: 'test-hash',
      };

      mocks.getCache.mockReturnValue({
        get: vi.fn().mockResolvedValue(cachedCatalog),
        set: vi.fn().mockResolvedValue(undefined),
      });

      // Act
      const catalog = await generateCatalog(config, 'movie', 'watchwyrd-movies-fornow');

      // Assert
      expect(catalog.metas).toHaveLength(1);
      expect(catalog.metas[0]?.name).toBe('Cached Movie');
      expect(mocks.createProvider).not.toHaveBeenCalled(); // Provider not called
    });

    it('should regenerate catalog if cache is expired', async () => {
      // Arrange
      const config = createGeminiConfig();
      const expiredCache = {
        catalog: { metas: [{ id: 'tt1234567', type: 'movie', name: 'Old Movie', poster: 'url' }] },
        generatedAt: Date.now() - 100000,
        expiresAt: Date.now() - 1000, // Expired!
        configHash: 'test-hash',
      };

      const mockCache = {
        get: vi.fn().mockResolvedValue(expiredCache),
        set: vi.fn().mockResolvedValue(undefined),
      };
      mocks.getCache.mockReturnValue(mockCache);

      const testRecs = SAMPLE_MOVIE_RECOMMENDATIONS.slice(0, 2);
      const aiResponse = createMockAIResponse(testRecs, 'gemini');
      const mockProvider = createMockProvider(aiResponse, 'gemini');
      const cinemetaResults = createMockCinemetaResults(testRecs, 'movie');

      mocks.createProvider.mockReturnValue(mockProvider);
      mocks.lookupTitles.mockResolvedValue(cinemetaResults);

      // Act
      const catalog = await generateCatalog(config, 'movie', 'watchwyrd-movies-fornow');

      // Assert
      expect(catalog.metas).toHaveLength(2);
      expect(catalog.metas[0]?.name).not.toBe('Old Movie');
      expect(mockProvider.generateRecommendations).toHaveBeenCalledOnce();
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should return stale cache as fallback when generation fails', async () => {
      // Arrange
      const config = createGeminiConfig();
      const staleCache = {
        catalog: {
          metas: [{ id: 'tt1234567', type: 'movie', name: 'Stale Movie', poster: 'url' }],
        },
        generatedAt: Date.now() - 100000,
        expiresAt: Date.now() - 1000, // Expired
        configHash: 'test-hash',
      };

      mocks.getCache.mockReturnValue({
        get: vi.fn().mockResolvedValue(staleCache),
        set: vi.fn().mockResolvedValue(undefined),
      });

      const mockProvider = createMockProvider(new Error('AI service down'), 'gemini');
      mocks.createProvider.mockReturnValue(mockProvider);

      // Act
      const catalog = await generateCatalog(config, 'movie', 'watchwyrd-movies-fornow');

      // Assert - returns stale cache, not error catalog
      expect(catalog.metas).toHaveLength(1);
      expect(catalog.metas[0]?.name).toBe('Stale Movie');
    });
  });

  // ===========================================================================
  // Catalog Variant Tests
  // ===========================================================================

  describe('Catalog Variants', () => {
    const variants = ['fornow', 'discover', 'trending', 'hidden-gems'];

    it.each(variants)('should extract %s variant from catalog ID', async (variant) => {
      // Arrange
      const config = createGeminiConfig();
      const testRecs = SAMPLE_MOVIE_RECOMMENDATIONS.slice(0, 2);
      const aiResponse = createMockAIResponse(testRecs, 'gemini');
      const mockProvider = createMockProvider(aiResponse, 'gemini');
      const cinemetaResults = createMockCinemetaResults(testRecs, 'movie');

      mocks.createProvider.mockReturnValue(mockProvider);
      mocks.lookupTitles.mockResolvedValue(cinemetaResults);

      // Act
      const catalog = await generateCatalog(config, 'movie', `watchwyrd-movies-${variant}`);

      // Assert
      expect(catalog.metas).toHaveLength(2);
      expect(mockProvider.generateRecommendations).toHaveBeenCalledOnce();
    });

    it('should use higher temperature for discover variant', async () => {
      // Arrange
      const config = createGeminiConfig();
      const testRecs = SAMPLE_MOVIE_RECOMMENDATIONS.slice(0, 2);
      const aiResponse = createMockAIResponse(testRecs, 'gemini');
      const mockProvider = createMockProvider(aiResponse, 'gemini');
      const cinemetaResults = createMockCinemetaResults(testRecs, 'movie');

      mocks.createProvider.mockReturnValue(mockProvider);
      mocks.lookupTitles.mockResolvedValue(cinemetaResults);

      // Act
      await generateCatalog(config, 'movie', 'watchwyrd-movies-discover');

      // Assert - verify temperature override is passed
      const providerCall = mockProvider.generateRecommendations.mock.calls[0];
      const options = providerCall?.[5] as { temperature?: number } | undefined;
      expect(options?.temperature).toBe(1.2); // DISCOVERY_TEMPERATURE
    });
  });

  // ===========================================================================
  // Genre Filter Tests
  // ===========================================================================

  describe('Genre Filtering', () => {
    it('should pass genre to catalog generation', async () => {
      // Arrange
      const config = createGeminiConfig();
      const testRecs = SAMPLE_MOVIE_RECOMMENDATIONS.slice(0, 2);
      const aiResponse = createMockAIResponse(testRecs, 'gemini');
      const mockProvider = createMockProvider(aiResponse, 'gemini');
      const cinemetaResults = createMockCinemetaResults(testRecs, 'movie');

      mocks.createProvider.mockReturnValue(mockProvider);
      mocks.lookupTitles.mockResolvedValue(cinemetaResults);

      // Act
      const catalog = await generateCatalog(config, 'movie', 'watchwyrd-movies-fornow', 'Action');

      // Assert
      expect(catalog.metas).toHaveLength(2);
      // Provider should receive the genre in the prompt
      expect(mockProvider.generateRecommendations).toHaveBeenCalledOnce();
    });
  });
});
