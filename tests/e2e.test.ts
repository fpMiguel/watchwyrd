/**
 * Watchwyrd - End-to-End Tests
 *
 * Tests the complete flow from configuration to catalog generation.
 * Requires a valid Gemini API key in the GEMINI_API_KEY environment variable.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';

// Import app components
import { createStremioRoutes } from '../src/handlers/stremio.js';
import { createConfigureRoutes } from '../src/handlers/configure.js';
import { createCache, closeCache } from '../src/cache/index.js';
import type { UserConfig } from '../src/types/index.js';

// =============================================================================
// Test Configuration
// =============================================================================

const TEST_API_KEY = process.env['GEMINI_API_KEY'] || '';
// Only run API tests when explicitly requested via RUN_API_TESTS=true
const RUN_API_TESTS = process.env['RUN_API_TESTS'] === 'true';
const SKIP_API_TESTS = !TEST_API_KEY || !RUN_API_TESTS;

if (SKIP_API_TESTS && TEST_API_KEY) {
  console.log('ℹ️  Skipping Gemini API tests. Set RUN_API_TESTS=true to run them.');
}

// Test user configuration
const testConfig: Partial<UserConfig> = {
  geminiApiKey: TEST_API_KEY,
  geminiModel: 'gemini-2.5-flash',
  timezone: 'America/New_York',
  country: 'US',
  includeMovies: true,
  includeSeries: true,
  maxRating: 'R',
  noveltyBias: 50,
  popularityBias: 50,
  includeNewReleases: false,
  enableSeasonalThemes: true,
  enableTimeContext: true,
  showExplanations: true,
  preferredLanguages: ['en'],
  excludedGenres: [],
  genreWeights: {},
  preferredEras: [],
  runtimePreference: 'any',
  bingePreference: 'moderate',
  subtitleTolerance: 'prefer_dubbed',
  enableWeatherContext: false,
};

// Base64 encode the config
const configBase64 = Buffer.from(JSON.stringify(testConfig)).toString('base64');

// =============================================================================
// Test App Setup
// =============================================================================

let app: Express;

beforeAll(async () => {
  // Create Express app for testing
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize cache (required for catalog generation)
  await createCache();

  // Mount routes
  app.use('/configure', createConfigureRoutes());
  app.use('/', createStremioRoutes());

  // Health endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
});

afterAll(async () => {
  await closeCache();
});

// =============================================================================
// Health Check Tests
// =============================================================================

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

// =============================================================================
// Manifest Tests
// =============================================================================

describe('Manifest Endpoint', () => {
  it('should return base manifest without config', async () => {
    const response = await request(app).get('/manifest.json');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: 'community.watchwyrd',
      name: 'Watchwyrd',
      version: expect.any(String),
      description: expect.stringContaining('AI-powered'),
      resources: ['catalog'],
      types: ['movie', 'series'],
      behaviorHints: {
        configurable: false,
        configurationRequired: true,
      },
    });
  });

  it('should return manifest with catalogs when config provided', async () => {
    const response = await request(app).get(`/${configBase64}/manifest.json`);

    expect(response.status).toBe(200);
    expect(response.body.catalogs).toBeDefined();
    expect(response.body.catalogs.length).toBeGreaterThan(0);

    // Should have movie catalog
    const movieCatalog = response.body.catalogs.find(
      (c: { type: string }) => c.type === 'movie'
    );
    expect(movieCatalog).toBeDefined();
    expect(movieCatalog.id).toContain('watchwyrd');

    // Should have series catalog
    const seriesCatalog = response.body.catalogs.find(
      (c: { type: string }) => c.type === 'series'
    );
    expect(seriesCatalog).toBeDefined();
  });

  it('should handle invalid base64 config gracefully', async () => {
    const response = await request(app).get('/invalid-base64!/manifest.json');

    // Should still return base manifest
    expect(response.status).toBe(200);
    expect(response.body.id).toBe('community.watchwyrd');
  });

  it('should respect includeMovies=false in config', async () => {
    const noMoviesConfig = { ...testConfig, includeMovies: false };
    const configB64 = Buffer.from(JSON.stringify(noMoviesConfig)).toString('base64');

    const response = await request(app).get(`/${configB64}/manifest.json`);

    expect(response.status).toBe(200);

    const movieCatalog = response.body.catalogs.find(
      (c: { type: string }) => c.type === 'movie'
    );
    expect(movieCatalog).toBeUndefined();

    const seriesCatalog = response.body.catalogs.find(
      (c: { type: string }) => c.type === 'series'
    );
    expect(seriesCatalog).toBeDefined();
  });
});

// =============================================================================
// Configure Page Tests
// =============================================================================

describe('Configure Page', () => {
  it('should serve the configuration page', async () => {
    const response = await request(app).get('/configure');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
    expect(response.text).toContain('Watchwyrd');
    expect(response.text).toContain('Gemini API Key');
    expect(response.text).toContain('Configure');
  });

  it('should contain timezone auto-detection script', async () => {
    const response = await request(app).get('/configure');

    expect(response.text).toContain('Intl.DateTimeFormat');
    expect(response.text).toContain('autoDetectLocation');
  });

  it('should contain all required form fields', async () => {
    const response = await request(app).get('/configure');

    // API configuration
    expect(response.text).toContain('name="geminiApiKey"');
    expect(response.text).toContain('name="geminiModel"');

    // Location
    expect(response.text).toContain('name="timezone"');
    expect(response.text).toContain('name="country"');

    // Preferences
    expect(response.text).toContain('name="presetProfile"');
    expect(response.text).toContain('name="includeMovies"');
    expect(response.text).toContain('name="includeSeries"');
    expect(response.text).toContain('name="maxRating"');

    // Sliders
    expect(response.text).toContain('name="noveltyBias"');
    expect(response.text).toContain('name="popularityBias"');
  });

  it('should reject form submission without API key', async () => {
    const response = await request(app)
      .post('/configure')
      .type('form')
      .send({
        geminiModel: 'gemini-2.5-flash',
        timezone: 'UTC',
        country: 'US',
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain('API key is required');
  });
});

// =============================================================================
// API Key Validation Tests
// =============================================================================

describe('API Key Validation', () => {
  it('should reject empty API key', async () => {
    const response = await request(app)
      .post('/configure/validate-key')
      .send({ apiKey: '' });

    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(false);
    expect(response.body.error).toContain('required');
  });

  it('should reject missing API key', async () => {
    const response = await request(app)
      .post('/configure/validate-key')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(false);
  });

  it('should validate real API key and return models', { skip: SKIP_API_TESTS }, async () => {
    const response = await request(app)
      .post('/configure/validate-key')
      .send({ apiKey: TEST_API_KEY });

    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(true);
    expect(response.body.models).toBeDefined();
    expect(Array.isArray(response.body.models)).toBe(true);
    expect(response.body.models.length).toBeGreaterThan(0);

    // Each model should have required fields
    for (const model of response.body.models) {
      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('name');
      expect(model).toHaveProperty('freeTier');
      expect(model).toHaveProperty('available');
    }
  });

  it('should return error for invalid API key', async () => {
    const response = await request(app)
      .post('/configure/validate-key')
      .send({ apiKey: 'invalid-api-key-12345' });

    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(false);
    expect(response.body.error).toBeDefined();
  });
});

// =============================================================================
// Catalog Generation Tests (requires valid API key)
// =============================================================================

describe('Catalog Generation', () => {
  it('should return error for missing config', async () => {
    const response = await request(app).get('/catalog/movie/watchwyrd-movies-main.json');

    expect(response.status).toBe(404);
  });

  it('should return empty catalog for config without API key', async () => {
    const invalidConfig = Buffer.from('{"invalid": true}').toString('base64');
    const response = await request(app).get(
      `/${invalidConfig}/catalog/movie/watchwyrd-movies-main.json`
    );

    // Returns 200 with empty metas (graceful degradation)
    expect(response.status).toBe(200);
    expect(response.body.metas).toEqual([]);
  });

  it('should return error for unknown catalog', async () => {
    const response = await request(app).get(
      `/${configBase64}/catalog/movie/unknown-catalog.json`
    );

    expect(response.status).toBe(404);
  });

  it('should generate movie catalog with valid config', { skip: SKIP_API_TESTS, timeout: 65000 }, async () => {
    const response = await request(app)
      .get(`/${configBase64}/catalog/movie/watchwyrd-movies-main.json`)
      .timeout(60000); // 60 second timeout for API call

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('metas');
    expect(Array.isArray(response.body.metas)).toBe(true);

    // Should have recommendations
    if (response.body.metas.length > 0) {
      const meta = response.body.metas[0];
      expect(meta).toHaveProperty('id');
      expect(meta).toHaveProperty('type', 'movie');
      expect(meta).toHaveProperty('name');

      // ID should be IMDb format
      expect(meta.id).toMatch(/^tt\d{7,9}$/);
    }
  });

  it('should generate series catalog with valid config', { skip: SKIP_API_TESTS, timeout: 65000 }, async () => {
    const response = await request(app)
      .get(`/${configBase64}/catalog/series/watchwyrd-series-main.json`)
      .timeout(60000);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('metas');
    expect(Array.isArray(response.body.metas)).toBe(true);

    if (response.body.metas.length > 0) {
      const meta = response.body.metas[0];
      expect(meta).toHaveProperty('id');
      expect(meta).toHaveProperty('type', 'series');
      expect(meta).toHaveProperty('name');
      expect(meta.id).toMatch(/^tt\d{7,9}$/);
    }
  });
});

// =============================================================================
// Full E2E Flow Test
// =============================================================================

describe('Full E2E Flow', () => {
  it('should complete full flow: validate key -> get manifest -> get catalog', { skip: SKIP_API_TESTS, timeout: 120000 }, async () => {
    // Step 1: Validate API key
    const validateResponse = await request(app)
      .post('/configure/validate-key')
      .send({ apiKey: TEST_API_KEY });

    expect(validateResponse.body.valid).toBe(true);
    expect(validateResponse.body.models.length).toBeGreaterThan(0);

    // Find an available model
    const availableModel = validateResponse.body.models.find(
      (m: { available: boolean }) => m.available
    );
    expect(availableModel).toBeDefined();

    // Step 2: Build config with available model
    const e2eConfig = {
      ...testConfig,
      geminiModel: availableModel.id,
    };
    const e2eConfigB64 = Buffer.from(JSON.stringify(e2eConfig)).toString('base64');

    // Step 3: Get manifest with config
    const manifestResponse = await request(app).get(`/${e2eConfigB64}/manifest.json`);

    expect(manifestResponse.status).toBe(200);
    expect(manifestResponse.body.catalogs.length).toBeGreaterThan(0);

    // Get first catalog
    const firstCatalog = manifestResponse.body.catalogs[0];
    expect(firstCatalog).toBeDefined();

    // Step 4: Fetch catalog
    const catalogResponse = await request(app)
      .get(`/${e2eConfigB64}/catalog/${firstCatalog.type}/${firstCatalog.id}.json`)
      .timeout(60000);

    expect(catalogResponse.status).toBe(200);
    expect(catalogResponse.body.metas).toBeDefined();

    // Verify we got recommendations
    console.log(`✓ E2E test passed! Got ${catalogResponse.body.metas.length} recommendations`);

    if (catalogResponse.body.metas.length > 0) {
      const firstRec = catalogResponse.body.metas[0];
      console.log(`  First recommendation: "${firstRec.name}" (${firstRec.id})`);

      // Verify structure
      expect(firstRec.id).toMatch(/^tt\d{7,9}$/);
      expect(firstRec.name).toBeTruthy();
      expect(firstRec.type).toBe(firstCatalog.type);
    }
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('Error Handling', () => {
  it('should handle malformed JSON in config gracefully', async () => {
    // This is not valid base64
    const response = await request(app).get('/!!!invalid!!!/manifest.json');

    expect(response.status).toBe(200);
    // Should return base manifest
    expect(response.body.id).toBe('community.watchwyrd');
  });

  it('should return proper content-type for JSON endpoints', async () => {
    const response = await request(app).get('/manifest.json');

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('should return proper content-type for HTML endpoints', async () => {
    const response = await request(app).get('/configure');

    expect(response.headers['content-type']).toMatch(/text\/html/);
  });
});

// =============================================================================
// Configuration Presets Tests
// =============================================================================

describe('Configuration Presets', () => {
  const presets = ['casual', 'cinephile', 'family', 'binge_watcher', 'discovery'];

  for (const preset of presets) {
    it(`should accept ${preset} preset`, async () => {
      const presetConfig = {
        ...testConfig,
        presetProfile: preset,
      };
      const presetB64 = Buffer.from(JSON.stringify(presetConfig)).toString('base64');

      const response = await request(app).get(`/${presetB64}/manifest.json`);

      expect(response.status).toBe(200);
      expect(response.body.catalogs).toBeDefined();
    });
  }
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('should handle config with only movies enabled', async () => {
    const moviesOnlyConfig = {
      ...testConfig,
      includeMovies: true,
      includeSeries: false,
    };
    const configB64 = Buffer.from(JSON.stringify(moviesOnlyConfig)).toString('base64');

    const response = await request(app).get(`/${configB64}/manifest.json`);

    expect(response.status).toBe(200);
    expect(
      response.body.catalogs.every((c: { type: string }) => c.type === 'movie')
    ).toBe(true);
  });

  it('should handle config with only series enabled', async () => {
    const seriesOnlyConfig = {
      ...testConfig,
      includeMovies: false,
      includeSeries: true,
    };
    const configB64 = Buffer.from(JSON.stringify(seriesOnlyConfig)).toString('base64');

    const response = await request(app).get(`/${configB64}/manifest.json`);

    expect(response.status).toBe(200);
    expect(
      response.body.catalogs.every((c: { type: string }) => c.type === 'series')
    ).toBe(true);
  });

  it('should handle empty excluded genres', async () => {
    const configWithNoExclusions = {
      ...testConfig,
      excludedGenres: [],
    };
    const configB64 = Buffer.from(JSON.stringify(configWithNoExclusions)).toString('base64');

    const response = await request(app).get(`/${configB64}/manifest.json`);

    expect(response.status).toBe(200);
  });

  it('should handle many excluded genres', async () => {
    const configWithManyExclusions = {
      ...testConfig,
      excludedGenres: ['Horror', 'Thriller', 'Crime', 'War', 'Western'],
    };
    const configB64 = Buffer.from(JSON.stringify(configWithManyExclusions)).toString('base64');

    const response = await request(app).get(`/${configB64}/manifest.json`);

    expect(response.status).toBe(200);
  });

  it('should handle extreme novelty bias values', async () => {
    // Test minimum
    const minConfig = { ...testConfig, noveltyBias: 0 };
    const minB64 = Buffer.from(JSON.stringify(minConfig)).toString('base64');
    const minResponse = await request(app).get(`/${minB64}/manifest.json`);
    expect(minResponse.status).toBe(200);

    // Test maximum
    const maxConfig = { ...testConfig, noveltyBias: 100 };
    const maxB64 = Buffer.from(JSON.stringify(maxConfig)).toString('base64');
    const maxResponse = await request(app).get(`/${maxB64}/manifest.json`);
    expect(maxResponse.status).toBe(200);
  });
});
