import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  generateManifest: vi.fn(),
  generateCatalog: vi.fn(),
  executeSearch: vi.fn(),
  isSearchCatalog: vi.fn(),
  safeParseUserConfig: vi.fn(),
  applyPreset: vi.fn(),
  decryptConfig: vi.fn(),
  isEncrypted: vi.fn(),
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../src/addon/manifest.js', () => ({
  generateManifest: mocks.generateManifest,
}));

vi.mock('../src/catalog/index.js', () => ({
  generateCatalog: mocks.generateCatalog,
}));

vi.mock('../src/catalog/searchGenerator.js', () => ({
  executeSearch: mocks.executeSearch,
  isSearchCatalog: (id: string) => mocks.isSearchCatalog(id),
}));

vi.mock('../src/config/schema.js', () => ({
  safeParseUserConfig: mocks.safeParseUserConfig,
  applyPreset: mocks.applyPreset,
  VALID_GENRES: [
    'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
    'Documentary', 'Drama', 'Family', 'Fantasy', 'History',
    'Horror', 'Music', 'Mystery', 'Romance', 'Science Fiction',
    'Thriller', 'War', 'Western',
  ],
}));

vi.mock('../src/config/server.js', () => ({
  serverConfig: {
    baseUrl: 'http://localhost:7000',
    security: {
      secretKey: 'test-secret-key-that-is-long-enough-for-testing-123',
      encryptionSalt: 'test-salt-for-derivation',
    },
  },
}));

vi.mock('../src/utils/crypto.js', () => ({
  decryptConfig: mocks.decryptConfig,
  isEncrypted: mocks.isEncrypted,
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: mocks.logger,
}));

import { createStremioRoutes } from '../src/handlers/stremio.js';

const DEFAULT_USER_CONFIG = {
  aiProvider: 'gemini',
  geminiApiKey: 'test-key',
  geminiModel: 'gemini-2.5-flash',
  perplexityApiKey: undefined,
  perplexityModel: undefined,
  openaiApiKey: undefined,
  openaiModel: undefined,
  rpdbApiKey: undefined,
  weatherLocation: undefined,
  includeMovies: true,
  includeSeries: true,
  excludedGenres: [],
  catalogSize: 20,
  requestTimeout: 30,
  subtitleTolerance: 'prefer_dubbed',
  timezone: 'UTC',
  country: 'US',
  showExplanations: true,
  enableWeatherContext: false,
  enableGrounding: false,
};

function createApp() {
  const app = express();
  app.use('/', createStremioRoutes());
  return app;
}

function setupCatalogSuccess() {
  mocks.decryptConfig.mockReturnValue({ geminiApiKey: 'test-key' });
  mocks.isEncrypted.mockReturnValue(true);
  mocks.applyPreset.mockImplementation((cfg: Record<string, unknown>) => cfg);
  mocks.safeParseUserConfig.mockReturnValue({ success: true, data: DEFAULT_USER_CONFIG });
}

describe('Manifest endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateManifest.mockReturnValue({
      id: 'community.watchwyrd',
      version: '1.0.0',
      name: 'Watchwyrd',
      description: 'AI recommendations',
      resources: ['catalog'],
      types: ['movie', 'series'],
      behaviorHints: { configurable: false, configurationRequired: true },
    });
  });

  it('should return base manifest', async () => {
    const app = createApp();
    const res = await request(app).get('/manifest.json');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'community.watchwyrd' });
    expect(mocks.generateManifest).toHaveBeenCalledWith();
  });

  it('should cache base manifest publicly for 24 hours', async () => {
    const app = createApp();
    const res = await request(app).get('/manifest.json');

    expect(res.headers['cache-control']).toBe('public, max-age=86400');
  });

  it('should return personalized manifest with valid config', async () => {
    mocks.generateManifest.mockReturnValue({
      id: 'community.watchwyrd',
      version: '1.0.0',
      name: 'Watchwyrd',
      catalogs: [{ type: 'movie', id: 'watchwyrd-movies-fornow' }],
      behaviorHints: { configurable: false, configurationRequired: false },
    });
    mocks.decryptConfig.mockReturnValue({ geminiApiKey: 'test-key' });
    mocks.isEncrypted.mockReturnValue(true);

    const app = createApp();
    const res = await request(app).get('/enc.valid-config/manifest.json');

    expect(res.status).toBe(200);
    expect(mocks.generateManifest).toHaveBeenCalledWith(
      expect.objectContaining({ geminiApiKey: 'test-key' })
    );
  });

  it('should cache personalized manifest privately for 1 hour', async () => {
    mocks.decryptConfig.mockReturnValue({ geminiApiKey: 'test-key' });
    mocks.isEncrypted.mockReturnValue(true);

    const app = createApp();
    const res = await request(app).get('/enc.valid-config/manifest.json');

    expect(res.headers['cache-control']).toBe('private, max-age=3600');
  });

  it('should return base manifest when decrypt fails', async () => {
    mocks.decryptConfig.mockReturnValue(null);
    mocks.isEncrypted.mockReturnValue(true);

    const app = createApp();
    const res = await request(app).get('/enc.invalid/manifest.json');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'community.watchwyrd' });
    expect(mocks.generateManifest).toHaveBeenCalledWith();
  });
});

describe('Catalog endpoint validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupCatalogSuccess();
    mocks.isSearchCatalog.mockReturnValue(false);
    mocks.generateCatalog.mockResolvedValue({ metas: [{ id: 'tt0111161', name: 'Test' }] });
  });

  it('should return 404 when route does not match (missing config segment)', async () => {
    const app = createApp();
    const res = await request(app).get('/catalog/movie/watchwyrd-movies-fornow.json');

    expect(res.status).toBe(404);
  });

  it('should return 400 for invalid content type', async () => {
    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/invalid/watchwyrd-movies-fornow.json'
    );

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid content type' });
  });

  it('should return 404 for unknown catalog ID', async () => {
    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/movie/unknown-catalog.json'
    );

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Unknown catalog' });
  });

  it('should return 400 when decryptConfig returns null', async () => {
    mocks.decryptConfig.mockReturnValue(null);

    const app = createApp();
    const res = await request(app).get(
      '/enc.invalid/catalog/movie/watchwyrd-movies-fornow.json'
    );

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid configuration' });
  });

  it('should return 400 when config validation fails', async () => {
    mocks.safeParseUserConfig.mockReturnValue({
      success: false,
      errors: { issues: [] },
    });

    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/movie/watchwyrd-movies-fornow.json'
    );

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Configuration validation failed' });
  });

  it('should return 404 when catalog type cannot be determined from catalog ID', async () => {
    mocks.isSearchCatalog.mockReturnValue(false);

    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/series/watchwyrd-unknown-fornow.json'
    );

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Unknown catalog' });
  });

  it('should return 400 for malformed search query encoding', async () => {
    const originalDecode = globalThis.decodeURIComponent;
    globalThis.decodeURIComponent = vi.fn((str: string) => {
      if (str === 'malformed-search') throw new URIError('Malformed');
      return originalDecode(str);
    });

    mocks.isSearchCatalog.mockReturnValue(true);

    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/movie/watchwyrd-search/search=malformed-search.json'
    );

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid search query encoding' });

    globalThis.decodeURIComponent = originalDecode;
  });

  it('should return catalog successfully for valid request', async () => {
    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/movie/watchwyrd-movies-fornow.json'
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ metas: [expect.objectContaining({ id: 'tt0111161' })] });
  });

  it('should set private cache control on catalog response', async () => {
    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/movie/watchwyrd-movies-fornow.json'
    );

    expect(res.headers['cache-control']).toBe('private, max-age=3600');
  });

  it('should handle malformed genre encoding gracefully', async () => {
    const originalDecode = globalThis.decodeURIComponent;
    globalThis.decodeURIComponent = vi.fn((str: string) => {
      if (str === 'malformed-genre') throw new URIError('Malformed');
      return originalDecode(str);
    });

    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/movie/watchwyrd-movies-fornow/genre=malformed-genre.json'
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ metas: [expect.objectContaining({ id: 'tt0111161' })] });

    globalThis.decodeURIComponent = originalDecode;
  });
});

describe('Catalog generation error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupCatalogSuccess();
    mocks.isSearchCatalog.mockReturnValue(false);
  });

  it('should return 500 when generateCatalog throws', async () => {
    mocks.generateCatalog.mockRejectedValue(new Error('AI service unavailable'));

    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/movie/watchwyrd-movies-fornow.json'
    );

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to generate catalog' });
  });
});

describe('Search catalog handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupCatalogSuccess();
    mocks.isSearchCatalog.mockReturnValue(true);
    mocks.executeSearch.mockResolvedValue({
      metas: [{ id: 'tt0111161', name: 'Result' }],
    });
  });

  it('should execute search with query from extra params', async () => {
    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/movie/watchwyrd-search/search=90s+sci-fi.json'
    );

    expect(res.status).toBe(200);
    expect(mocks.executeSearch).toHaveBeenCalledWith(
      expect.objectContaining({ geminiApiKey: 'test-key' }),
      'movie',
      '90s+sci-fi'
    );
    expect(res.body).toEqual({ metas: [expect.objectContaining({ id: 'tt0111161' })] });
  });

  it('should return empty metas for search catalog without query', async () => {
    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/movie/watchwyrd-search.json'
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ metas: [] });
    expect(mocks.executeSearch).not.toHaveBeenCalled();
  });

  it('should return empty metas when extra has no search param', async () => {
    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/movie/watchwyrd-search/genre=Action.json'
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ metas: [] });
  });

  it('should return 500 when executeSearch throws', async () => {
    mocks.executeSearch.mockRejectedValue(new Error('AI search failed'));

    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/movie/watchwyrd-search/search=test+query.json'
    );

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to generate catalog' });
  });

  it('should return 400 for search query exceeding max length', async () => {
    const longQuery = 'a'.repeat(501);

    const app = createApp();
    const res = await request(app).get(
      `/enc.config/catalog/movie/watchwyrd-search/search=${longQuery}.json`
    );

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Search query too long' });
  });
});

describe('Genre filter handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupCatalogSuccess();
    mocks.isSearchCatalog.mockReturnValue(false);
    mocks.generateCatalog.mockResolvedValue({ metas: [] });
  });

  it('should pass valid genre filter to generateCatalog', async () => {
    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/movie/watchwyrd-movies-fornow/genre=Action.json'
    );

    expect(res.status).toBe(200);
    expect(mocks.generateCatalog).toHaveBeenCalledWith(
      expect.anything(),
      'movie',
      'watchwyrd-movies-fornow',
      'Action'
    );
  });

  it('should pass undefined genre for invalid genre value', async () => {
    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/movie/watchwyrd-movies-fornow/genre=NonExistent.json'
    );

    expect(res.status).toBe(200);
    expect(mocks.generateCatalog).toHaveBeenCalledWith(
      expect.anything(),
      'movie',
      'watchwyrd-movies-fornow',
      undefined
    );
  });

  it('should pass undefined genre when extra has no genre param', async () => {
    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/movie/watchwyrd-movies-fornow/some=thing.json'
    );

    expect(res.status).toBe(200);
    expect(mocks.generateCatalog).toHaveBeenCalledWith(
      expect.anything(),
      'movie',
      'watchwyrd-movies-fornow',
      undefined
    );
  });
});

describe('Preset profile handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.decryptConfig.mockReturnValue({ geminiApiKey: 'test-key', presetProfile: 'cinephile' });
    mocks.isEncrypted.mockReturnValue(true);
    mocks.generateCatalog.mockResolvedValue({ metas: [] });
    mocks.isSearchCatalog.mockReturnValue(false);
  });

  it('should apply preset and validate config', async () => {
    mocks.applyPreset.mockImplementation(
      (cfg: Record<string, unknown>) => ({ ...cfg, excludedGenres: ['Horror'] })
    );
    mocks.safeParseUserConfig.mockReturnValue({
      success: true,
      data: { ...DEFAULT_USER_CONFIG, excludedGenres: ['Horror'] },
    });

    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/movie/watchwyrd-movies-fornow.json'
    );

    expect(res.status).toBe(200);
    expect(mocks.applyPreset).toHaveBeenCalledWith(
      expect.objectContaining({ geminiApiKey: 'test-key' }),
      'cinephile'
    );
  });

  it('should not apply preset when profile is custom', async () => {
    mocks.decryptConfig.mockReturnValue({ geminiApiKey: 'test-key', presetProfile: 'custom' });
    mocks.isEncrypted.mockReturnValue(true);
    mocks.applyPreset.mockImplementation((cfg: Record<string, unknown>) => cfg);
    mocks.safeParseUserConfig.mockReturnValue({
      success: true,
      data: DEFAULT_USER_CONFIG,
    });

    const app = createApp();
    const res = await request(app).get(
      '/enc.config/catalog/movie/watchwyrd-movies-fornow.json'
    );

    expect(res.status).toBe(200);
    expect(mocks.applyPreset).not.toHaveBeenCalled();
  });
});
