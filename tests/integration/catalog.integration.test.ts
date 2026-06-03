/**
 * Catalog Integration Tests
 *
 * Tests the full Express request -> handler -> catalog -> response flow
 * using mocked AI providers and Cinemeta. No API keys required.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createMockGeminiProvider } from '../__mocks__/providers.js';
import { FULL_GEMINI_CONFIG } from '../__fixtures__/configs.js';
import { encryptConfig } from '../../src/utils/crypto.js';
import { serverConfig } from '../../src/config/server.js';
import {
  SAMPLE_MOVIE_RECOMMENDATIONS,
  SAMPLE_SERIES_RECOMMENDATIONS,
  EMPTY_RECOMMENDATIONS,
} from '../__fixtures__/recommendations.js';
import type { AIResponse } from '../../src/types/index.js';

// =============================================================================
// Mocks
// =============================================================================

const mockGeminiProvider = createMockGeminiProvider();

// Mock provider factory (used by catalogGenerator.ts via providers/index.js)
vi.mock('../../src/providers/index.js', () => ({
  createProvider: vi.fn(() => mockGeminiProvider),
  getActiveProvider: vi.fn(() => 'gemini'),
  GeminiProvider: vi.fn(),
  PerplexityProvider: vi.fn(),
  OpenAIProvider: vi.fn(),
  DEFAULT_GENERATION_CONFIG: { temperature: 0.4, topP: 0.9, maxOutputTokens: 8192 },
}));

// Also mock factory.js directly (used by services/search.ts)
vi.mock('../../src/providers/factory.js', () => ({
  createProvider: vi.fn(() => mockGeminiProvider),
  getActiveProvider: vi.fn(() => 'gemini'),
}));

// Mock Cinemeta so resolveToMetas works without real API calls
vi.mock('../../src/services/cinemeta.js', () => import('../__mocks__/cinemeta.js'));

// =============================================================================
// Helpers
// =============================================================================

function makeAIResponse(recommendations = SAMPLE_MOVIE_RECOMMENDATIONS): AIResponse {
  return {
    recommendations,
    metadata: {
      generatedAt: new Date().toISOString(),
      modelUsed: 'gemini-2.5-flash',
      providerUsed: 'gemini',
      searchUsed: false,
      totalCandidatesConsidered: recommendations.length,
    },
  };
}

function encConfig(config: Record<string, unknown>): string {
  return encryptConfig(config, serverConfig.security.secretKey);
}

// =============================================================================
// Test Setup
// =============================================================================

let app: Express;
let geminiConfigB64: string;

beforeAll(async () => {
  const express = (await import('express')).default;
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const { createCache } = await import('../../src/cache/index.js');
  await createCache();

  const { createStremioRoutes } = await import('../../src/handlers/stremio.js');
  app.use('/', createStremioRoutes());

  geminiConfigB64 = encConfig(FULL_GEMINI_CONFIG);
});

afterAll(async () => {
  const { closeCache } = await import('../../src/cache/index.js');
  await closeCache();
});

beforeEach(async () => {
  const { getCache } = await import('../../src/cache/index.js');
  const cache = getCache();
  await cache.clear();
});

// =============================================================================
// Movie Catalog Tests
// =============================================================================

describe('Movie Catalogs', () => {
  it('should return movie-fornow catalog with valid metas', async () => {
    mockGeminiProvider.generateRecommendations.mockResolvedValueOnce(makeAIResponse());

    const res = await request(app).get(
      `/${geminiConfigB64}/catalog/movie/watchwyrd-movies-fornow.json`
    );

    expect(res.status).toBe(200);
    expect(res.body.metas.length).toBeGreaterThan(0);
    expect(res.body.metas[0]).toHaveProperty('id');
    expect(res.body.metas[0]).toHaveProperty('type', 'movie');
    expect(res.body.metas[0]).toHaveProperty('name');
    expect(res.body.metas[0].id).toMatch(/^tt\d{7,9}$/);
  });

  it('should return movie-discover catalog', async () => {
    mockGeminiProvider.generateRecommendations.mockResolvedValueOnce(makeAIResponse());

    const res = await request(app).get(
      `/${geminiConfigB64}/catalog/movie/watchwyrd-movies-discover.json`
    );

    expect(res.status).toBe(200);
    expect(res.body.metas.length).toBeGreaterThan(0);
  });

  it('should return movie catalog with genre filter', async () => {
    mockGeminiProvider.generateRecommendations.mockResolvedValueOnce(makeAIResponse());

    const res = await request(app).get(
      `/${geminiConfigB64}/catalog/movie/watchwyrd-movies-fornow/genre=Action.json`
    );

    expect(res.status).toBe(200);
    expect(res.body.metas.length).toBeGreaterThan(0);
  });

  it('should set Cache-Control header', async () => {
    mockGeminiProvider.generateRecommendations.mockResolvedValueOnce(makeAIResponse());

    const res = await request(app).get(
      `/${geminiConfigB64}/catalog/movie/watchwyrd-movies-fornow.json`
    );

    expect(res.headers['cache-control']).toMatch(/private.*max-age=3600/);
  });
});

// =============================================================================
// Series Catalog Tests
// =============================================================================

describe('Series Catalogs', () => {
  it('should return series-fornow catalog', async () => {
    mockGeminiProvider.generateRecommendations.mockResolvedValueOnce(
      makeAIResponse(SAMPLE_SERIES_RECOMMENDATIONS)
    );

    const res = await request(app).get(
      `/${geminiConfigB64}/catalog/series/watchwyrd-series-fornow.json`
    );

    expect(res.status).toBe(200);
    expect(res.body.metas.length).toBeGreaterThan(0);
    expect(res.body.metas[0]).toHaveProperty('type', 'series');
  });

  it('should return series-discover catalog', async () => {
    mockGeminiProvider.generateRecommendations.mockResolvedValueOnce(
      makeAIResponse(SAMPLE_SERIES_RECOMMENDATIONS)
    );

    const res = await request(app).get(
      `/${geminiConfigB64}/catalog/series/watchwyrd-series-discover.json`
    );

    expect(res.status).toBe(200);
    expect(res.body.metas.length).toBeGreaterThan(0);
  });

  it('should return series catalog with genre filter', async () => {
    mockGeminiProvider.generateRecommendations.mockResolvedValueOnce(
      makeAIResponse(SAMPLE_SERIES_RECOMMENDATIONS)
    );

    const res = await request(app).get(
      `/${geminiConfigB64}/catalog/series/watchwyrd-series-fornow/genre=Drama.json`
    );

    expect(res.status).toBe(200);
    expect(res.body.metas.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Search Catalog Tests
// =============================================================================

describe('Search Catalog', () => {
  it('should return empty metas for search without query', async () => {
    const res = await request(app).get(
      `/${geminiConfigB64}/catalog/movie/watchwyrd-search.json`
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ metas: [] });
  });

  it('should reject search query exceeding max length', async () => {
    const longQuery = 'a'.repeat(501);
    const res = await request(app).get(
      `/${geminiConfigB64}/catalog/movie/watchwyrd-search/search=${longQuery}.json`
    );

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error).toContain('too long');
  });
});

// =============================================================================
// Validation & Error Handling
// =============================================================================

describe('Validation & Error Handling', () => {
  it('should return 400 for invalid content type', async () => {
    const res = await request(app).get(
      `/${geminiConfigB64}/catalog/game/watchwyrd-movies-fornow.json`
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('content type');
  });

  it('should return 404 for unknown catalog ID', async () => {
    const res = await request(app).get(
      `/${geminiConfigB64}/catalog/movie/unknown-catalog.json`
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Unknown');
  });

  it('should return 400 for invalid config', async () => {
    const res = await request(app).get(
      `/invalid-config/catalog/movie/watchwyrd-movies-fornow.json`
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid');
  });

  it('should return 404 when catalog path has no config', async () => {
    const res = await request(app).get('/catalog/movie/watchwyrd-movies-fornow.json');

    expect(res.status).toBe(404);
  });

  it('should handle provider failure with error catalog', async () => {
    mockGeminiProvider.generateRecommendations.mockRejectedValueOnce(
      new Error('Rate limit exceeded (429)')
    );

    const res = await request(app).get(
      `/${geminiConfigB64}/catalog/movie/watchwyrd-movies-fornow.json`
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.metas)).toBe(true);
  });

  it('should handle empty catalog from provider gracefully', async () => {
    mockGeminiProvider.generateRecommendations.mockResolvedValueOnce(
      makeAIResponse(EMPTY_RECOMMENDATIONS)
    );

    const res = await request(app).get(
      `/${geminiConfigB64}/catalog/movie/watchwyrd-movies-fornow.json`
    );

    expect(res.status).toBe(200);
    expect(res.body.metas).toEqual([]);
  });

  it('should handle invalid genre gracefully', async () => {
    mockGeminiProvider.generateRecommendations.mockResolvedValueOnce(makeAIResponse());

    const res = await request(app).get(
      `/${geminiConfigB64}/catalog/movie/watchwyrd-movies-fornow/genre=InvalidGenre.json`
    );

    expect(res.status).toBe(200);
  });
});
