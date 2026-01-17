/**
 * Watchwyrd - End-to-End Tests
 *
 * Tests the complete flow from configuration to catalog generation.
 * Requires a valid Gemini API key in the GEMINI_API_KEY environment variable.
 * 
 * Run with: RUN_API_TESTS=true npm test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';

// Import app components
import { createStremioRoutes } from '../src/handlers/stremio.js';
import { createConfigureRoutes } from '../src/handlers/configure/index.js';
import { createCache, closeCache } from '../src/cache/index.js';
import { encryptConfig } from '../src/utils/crypto.js';
import { serverConfig } from '../src/config/server.js';
import type { UserConfig } from '../src/types/index.js';

// Helper to encrypt config for test URLs
function toEncryptedConfig(config: Record<string, unknown>): string {
  return encryptConfig(config, serverConfig.security.secretKey);
}

// =============================================================================
// Test Logging Helper
// =============================================================================

const LOG_PREFIX = '🧪 E2E';

function logStep(step: string, details?: Record<string, unknown>) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  const detailsStr = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] ${LOG_PREFIX} ${step}${detailsStr}`);
}

function logSuccess(message: string, details?: Record<string, unknown>) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  const detailsStr = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] ✅ ${message}${detailsStr}`);
}

function logError(message: string, error?: unknown) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  const errorStr = error instanceof Error ? error.message : String(error);
  console.error(`[${timestamp}] ❌ ${message}: ${errorStr}`);
}

function logProgress(current: number, total: number, message: string) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  const pct = Math.round((current / total) * 100);
  console.log(`[${timestamp}] 📊 [${current}/${total}] (${pct}%) ${message}`);
}

// =============================================================================
// Test Configuration
// =============================================================================

const TEST_GEMINI_API_KEY = process.env['GEMINI_API_KEY'] || '';
const TEST_PERPLEXITY_API_KEY = process.env['PERPLEXITY_API_KEY'] || '';

// Only run API tests when explicitly requested via RUN_API_TESTS=true
const RUN_API_TESTS = process.env['RUN_API_TESTS'] === 'true';
const SKIP_API_TESTS = !RUN_API_TESTS;

// Determine which providers are available
const HAS_GEMINI = !!TEST_GEMINI_API_KEY;
const HAS_PERPLEXITY = !!TEST_PERPLEXITY_API_KEY;

if (RUN_API_TESTS) {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 RUNNING FULL E2E TESTS WITH API CALLS');
  console.log('='.repeat(60));
  console.log(`   Gemini API Key:     ${HAS_GEMINI ? '✅ Available' : '❌ Missing'}`);
  console.log(`   Perplexity API Key: ${HAS_PERPLEXITY ? '✅ Available' : '❌ Missing'}`);
  console.log('='.repeat(60) + '\n');
} else {
  console.log('ℹ️  Skipping API tests. Set RUN_API_TESTS=true to run them.');
}

// Backward compatibility
const TEST_API_KEY = TEST_GEMINI_API_KEY;

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

// Encrypt the config for URL usage
const configBase64 = toEncryptedConfig(testConfig);

// =============================================================================
// Test App Setup
// =============================================================================

let app: Express;

beforeAll(async () => {
  logStep('Setting up test environment...');
  
  // Create Express app for testing
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize cache (required for catalog generation)
  logStep('Initializing cache...');
  await createCache();

  // Mount routes
  app.use('/configure', createConfigureRoutes());
  app.use('/', createStremioRoutes());

  // Health endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  
  logSuccess('Test environment ready');
});

afterAll(async () => {
  logStep('Cleaning up test environment...');
  await closeCache();
  logSuccess('Cleanup complete');
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
    const configB64 = toEncryptedConfig(noMoviesConfig);

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
    expect(response.text).toContain('Setup Wizard');
  });

  it('should contain timezone auto-detection script', async () => {
    const response = await request(app).get('/configure');

    expect(response.text).toContain('Intl.DateTimeFormat');
    // New wizard detects timezone in the location setup step
    expect(response.text).toContain('resolvedOptions().timeZone');
  });

  it('should contain all required form fields', async () => {
    const response = await request(app).get('/configure');

    // API configuration (wizard uses IDs)
    expect(response.text).toContain('id="geminiApiKey"');
    expect(response.text).toContain('id="geminiModel"');

    // Location
    expect(response.text).toContain('id="timezone"');
    expect(response.text).toContain('id="country"');

    // Preferences (wizard uses IDs for state management)
    expect(response.text).toContain('data-profile');
    expect(response.text).toContain('id="includeMovies"');
    expect(response.text).toContain('id="includeSeries"');
    expect(response.text).toContain('id="maxRating"');

    // Sliders
    expect(response.text).toContain('id="noveltyBias"');
    expect(response.text).toContain('id="popularityBias"');
  });

  it('should reject form submission without API key', async () => {
    const response = await request(app)
      .post('/configure')
      .type('form')
      .send({
        aiProvider: 'gemini',
        geminiModel: 'gemini-2.5-flash',
        timezone: 'UTC',
        country: 'US',
      });

    // New wizard returns 400 for validation errors
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('API key');
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

  it('should validate Gemini API key and return models', { skip: SKIP_API_TESTS || !HAS_GEMINI }, async () => {
    logStep('Validating Gemini API key...');
    const startTime = Date.now();
    
    const response = await request(app)
      .post('/configure/validate-key')
      .send({ apiKey: TEST_GEMINI_API_KEY, provider: 'gemini' });

    const elapsed = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(true);
    expect(response.body.models).toBeDefined();
    expect(Array.isArray(response.body.models)).toBe(true);
    expect(response.body.models.length).toBeGreaterThan(0);

    logSuccess(`Gemini API key valid`, { 
      modelsAvailable: response.body.models.length,
      elapsed: `${elapsed}ms`
    });

    // Each model should have required fields
    for (const model of response.body.models) {
      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('name');
      expect(model).toHaveProperty('freeTier');
      expect(model).toHaveProperty('available');
    }
  });

  it('should validate Perplexity API key and return models', { skip: SKIP_API_TESTS || !HAS_PERPLEXITY }, async () => {
    logStep('Validating Perplexity API key...');
    const startTime = Date.now();
    
    const response = await request(app)
      .post('/configure/validate-key')
      .send({ apiKey: TEST_PERPLEXITY_API_KEY, provider: 'perplexity' });

    const elapsed = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(true);
    
    logSuccess(`Perplexity API key valid`, { elapsed: `${elapsed}ms` });
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
    const invalidConfig = toEncryptedConfig({ invalid: true });
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

  it('should generate movie catalog with Gemini', { skip: SKIP_API_TESTS || !HAS_GEMINI, timeout: 120000 }, async () => {
    logStep('Generating movie catalog with GEMINI...');
    const startTime = Date.now();
    
    const geminiConfig: Partial<UserConfig> = {
      ...testConfig,
      aiProvider: 'gemini',
      geminiApiKey: TEST_GEMINI_API_KEY,
      geminiModel: 'gemini-2.5-flash',
    };
    const geminiConfigB64 = toEncryptedConfig(geminiConfig);
    
    const response = await request(app)
      .get(`/${geminiConfigB64}/catalog/movie/watchwyrd-movies-main.json`)
      .timeout(115000);

    const elapsed = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('metas');
    expect(Array.isArray(response.body.metas)).toBe(true);

    // Should have recommendations
    if (response.body.metas.length > 0) {
      const meta = response.body.metas[0];
      expect(meta).toHaveProperty('id');
      expect(meta).toHaveProperty('type', 'movie');
      expect(meta).toHaveProperty('name');
      expect(meta.id).toMatch(/^tt\d{7,9}$/);
      
      logSuccess(`Gemini movie catalog generated`, {
        count: response.body.metas.length,
        elapsed: `${elapsed}ms`,
        firstTitle: meta.name
      });
    } else {
      logError('Gemini returned empty catalog', { elapsed: `${elapsed}ms` });
    }
  });

  it('should generate movie catalog with Perplexity', { skip: SKIP_API_TESTS || !HAS_PERPLEXITY, timeout: 120000 }, async () => {
    logStep('Generating movie catalog with PERPLEXITY...');
    const startTime = Date.now();
    
    const perplexityConfig: Partial<UserConfig> = {
      ...testConfig,
      aiProvider: 'perplexity',
      perplexityApiKey: TEST_PERPLEXITY_API_KEY,
      perplexityModel: 'sonar',
    };
    const perplexityConfigB64 = toEncryptedConfig(perplexityConfig);
    
    const response = await request(app)
      .get(`/${perplexityConfigB64}/catalog/movie/watchwyrd-movies-main.json`)
      .timeout(115000);

    const elapsed = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('metas');
    expect(Array.isArray(response.body.metas)).toBe(true);

    if (response.body.metas.length > 0) {
      const meta = response.body.metas[0];
      expect(meta).toHaveProperty('id');
      expect(meta).toHaveProperty('type', 'movie');
      expect(meta).toHaveProperty('name');
      expect(meta.id).toMatch(/^tt\d{7,9}$/);
      
      logSuccess(`Perplexity movie catalog generated`, {
        count: response.body.metas.length,
        elapsed: `${elapsed}ms`,
        firstTitle: meta.name
      });
    } else {
      logError('Perplexity returned empty catalog', { elapsed: `${elapsed}ms` });
    }
  });

  it('should generate series catalog with Gemini', { skip: SKIP_API_TESTS || !HAS_GEMINI, timeout: 120000 }, async () => {
    logStep('Generating series catalog with GEMINI...');
    const startTime = Date.now();
    
    const geminiConfig: Partial<UserConfig> = {
      ...testConfig,
      aiProvider: 'gemini',
      geminiApiKey: TEST_GEMINI_API_KEY,
      geminiModel: 'gemini-2.5-flash',
    };
    const geminiConfigB64 = toEncryptedConfig(geminiConfig);
    
    const response = await request(app)
      .get(`/${geminiConfigB64}/catalog/series/watchwyrd-series-main.json`)
      .timeout(115000);

    const elapsed = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('metas');
    expect(Array.isArray(response.body.metas)).toBe(true);

    if (response.body.metas.length > 0) {
      const meta = response.body.metas[0];
      expect(meta).toHaveProperty('id');
      expect(meta).toHaveProperty('type', 'series');
      expect(meta).toHaveProperty('name');
      expect(meta.id).toMatch(/^tt\d{7,9}$/);
      
      logSuccess(`Gemini series catalog generated`, {
        count: response.body.metas.length,
        elapsed: `${elapsed}ms`,
        firstTitle: meta.name
      });
    }
  });

  it('should generate series catalog with Perplexity', { skip: SKIP_API_TESTS || !HAS_PERPLEXITY, timeout: 120000 }, async () => {
    logStep('Generating series catalog with PERPLEXITY...');
    const startTime = Date.now();
    
    const perplexityConfig: Partial<UserConfig> = {
      ...testConfig,
      aiProvider: 'perplexity',
      perplexityApiKey: TEST_PERPLEXITY_API_KEY,
      perplexityModel: 'sonar',
    };
    const perplexityConfigB64 = toEncryptedConfig(perplexityConfig);
    
    const response = await request(app)
      .get(`/${perplexityConfigB64}/catalog/series/watchwyrd-series-main.json`)
      .timeout(115000);

    const elapsed = Date.now() - startTime;
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('metas');
    expect(Array.isArray(response.body.metas)).toBe(true);

    if (response.body.metas.length > 0) {
      const meta = response.body.metas[0];
      expect(meta).toHaveProperty('id');
      expect(meta).toHaveProperty('type', 'series');
      expect(meta).toHaveProperty('name');
      expect(meta.id).toMatch(/^tt\d{7,9}$/);
      
      logSuccess(`Perplexity series catalog generated`, {
        count: response.body.metas.length,
        elapsed: `${elapsed}ms`,
        firstTitle: meta.name
      });
    }
  });
});

// =============================================================================
// Full E2E Flow Test
// =============================================================================

describe('Full E2E Flow', () => {
  it('should complete full Gemini flow: validate -> manifest -> catalog', { skip: SKIP_API_TESTS || !HAS_GEMINI, timeout: 180000 }, async () => {
    const totalSteps = 4;
    const startTime = Date.now();
    
    // Step 1: Validate API key
    logProgress(1, totalSteps, 'Validating Gemini API key...');
    const validateResponse = await request(app)
      .post('/configure/validate-key')
      .send({ apiKey: TEST_GEMINI_API_KEY, provider: 'gemini' });

    expect(validateResponse.body.valid).toBe(true);
    expect(validateResponse.body.models.length).toBeGreaterThan(0);

    // Find an available model
    const availableModel = validateResponse.body.models.find(
      (m: { available: boolean }) => m.available
    );
    expect(availableModel).toBeDefined();
    logSuccess(`API key valid, using model: ${availableModel.id}`);

    // Step 2: Build config with available model
    logProgress(2, totalSteps, 'Building configuration...');
    const e2eConfig: Partial<UserConfig> = {
      ...testConfig,
      aiProvider: 'gemini',
      geminiApiKey: TEST_GEMINI_API_KEY,
      geminiModel: availableModel.id,
    };
    const e2eConfigB64 = toEncryptedConfig(e2eConfig);

    // Step 3: Get manifest with config
    logProgress(3, totalSteps, 'Fetching manifest...');
    const manifestResponse = await request(app).get(`/${e2eConfigB64}/manifest.json`);

    expect(manifestResponse.status).toBe(200);
    expect(manifestResponse.body.catalogs.length).toBeGreaterThan(0);
    logSuccess(`Manifest received with ${manifestResponse.body.catalogs.length} catalogs`);

    // Get first catalog
    const firstCatalog = manifestResponse.body.catalogs[0];
    expect(firstCatalog).toBeDefined();

    // Step 4: Fetch catalog (this triggers batch generation!)
    logProgress(4, totalSteps, `Generating catalog: ${firstCatalog.id}...`);
    const catalogResponse = await request(app)
      .get(`/${e2eConfigB64}/catalog/${firstCatalog.type}/${firstCatalog.id}.json`)
      .timeout(120000);

    expect(catalogResponse.status).toBe(200);
    expect(catalogResponse.body.metas).toBeDefined();

    const elapsed = Date.now() - startTime;

    // Verify we got recommendations
    if (catalogResponse.body.metas.length > 0) {
      const firstRec = catalogResponse.body.metas[0];
      
      expect(firstRec.id).toMatch(/^tt\d{7,9}$/);
      expect(firstRec.name).toBeTruthy();
      expect(firstRec.type).toBe(firstCatalog.type);
      
      logSuccess(`GEMINI E2E COMPLETE`, {
        recommendations: catalogResponse.body.metas.length,
        firstTitle: firstRec.name,
        totalElapsed: `${elapsed}ms`
      });
    } else {
      logError('Empty catalog returned', { elapsed: `${elapsed}ms` });
    }
  });

  it('should complete full Perplexity flow: validate -> manifest -> catalog', { skip: SKIP_API_TESTS || !HAS_PERPLEXITY, timeout: 180000 }, async () => {
    const totalSteps = 4;
    const startTime = Date.now();
    
    // Step 1: Validate API key
    logProgress(1, totalSteps, 'Validating Perplexity API key...');
    const validateResponse = await request(app)
      .post('/configure/validate-key')
      .send({ apiKey: TEST_PERPLEXITY_API_KEY, provider: 'perplexity' });

    expect(validateResponse.body.valid).toBe(true);
    logSuccess('Perplexity API key valid');

    // Step 2: Build config
    logProgress(2, totalSteps, 'Building configuration...');
    const e2eConfig: Partial<UserConfig> = {
      ...testConfig,
      aiProvider: 'perplexity',
      perplexityApiKey: TEST_PERPLEXITY_API_KEY,
      perplexityModel: 'sonar',
    };
    const e2eConfigB64 = toEncryptedConfig(e2eConfig);

    // Step 3: Get manifest with config
    logProgress(3, totalSteps, 'Fetching manifest...');
    const manifestResponse = await request(app).get(`/${e2eConfigB64}/manifest.json`);

    expect(manifestResponse.status).toBe(200);
    expect(manifestResponse.body.catalogs.length).toBeGreaterThan(0);
    logSuccess(`Manifest received with ${manifestResponse.body.catalogs.length} catalogs`);

    // Get first catalog
    const firstCatalog = manifestResponse.body.catalogs[0];
    expect(firstCatalog).toBeDefined();

    // Step 4: Fetch catalog (this triggers batch generation!)
    logProgress(4, totalSteps, `Generating catalog: ${firstCatalog.id}...`);
    const catalogResponse = await request(app)
      .get(`/${e2eConfigB64}/catalog/${firstCatalog.type}/${firstCatalog.id}.json`)
      .timeout(120000);

    expect(catalogResponse.status).toBe(200);
    expect(catalogResponse.body.metas).toBeDefined();

    const elapsed = Date.now() - startTime;

    // Verify we got recommendations
    if (catalogResponse.body.metas.length > 0) {
      const firstRec = catalogResponse.body.metas[0];
      
      expect(firstRec.id).toMatch(/^tt\d{7,9}$/);
      expect(firstRec.name).toBeTruthy();
      expect(firstRec.type).toBe(firstCatalog.type);
      
      logSuccess(`PERPLEXITY E2E COMPLETE`, {
        recommendations: catalogResponse.body.metas.length,
        firstTitle: firstRec.name,
        totalElapsed: `${elapsed}ms`
      });
    } else {
      logError('Empty catalog returned', { elapsed: `${elapsed}ms` });
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
      const presetB64 = toEncryptedConfig(presetConfig);

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
    const configB64 = toEncryptedConfig(moviesOnlyConfig);

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
    const configB64 = toEncryptedConfig(seriesOnlyConfig);

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
    const configB64 = toEncryptedConfig(configWithNoExclusions);

    const response = await request(app).get(`/${configB64}/manifest.json`);

    expect(response.status).toBe(200);
  });

  it('should handle many excluded genres', async () => {
    const configWithManyExclusions = {
      ...testConfig,
      excludedGenres: ['Horror', 'Thriller', 'Crime', 'War', 'Western'],
    };
    const configB64 = toEncryptedConfig(configWithManyExclusions);

    const response = await request(app).get(`/${configB64}/manifest.json`);

    expect(response.status).toBe(200);
  });

  it('should handle extreme novelty bias values', async () => {
    // Test minimum
    const minConfig = { ...testConfig, noveltyBias: 0 };
    const minB64 = toEncryptedConfig(minConfig);
    const minResponse = await request(app).get(`/${minB64}/manifest.json`);
    expect(minResponse.status).toBe(200);

    // Test maximum
    const maxConfig = { ...testConfig, noveltyBias: 100 };
    const maxB64 = toEncryptedConfig(maxConfig);
    const maxResponse = await request(app).get(`/${maxB64}/manifest.json`);
    expect(maxResponse.status).toBe(200);
  });
});
