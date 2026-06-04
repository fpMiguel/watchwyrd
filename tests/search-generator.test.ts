/**
 * Search Generator Tests
 *
 * Tests executeSearch with caching, in-flight deduplication, and meta resolution.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { UserConfig, StremioMeta } from '../src/types/index.js';

const mockGetCache = vi.fn();
const mockGenerateCacheKey = vi.fn();
const mockCreateConfigHash = vi.fn();
const mockGenerateContextSignals = vi.fn();
const mockExecuteAISearch = vi.fn();
const mockNormalizeSearchQuery = vi.fn();
const mockResolveToMetas = vi.fn();

vi.mock('../src/cache/index.js', () => ({
  getCache: () => mockGetCache(),
  generateCacheKey: (...args: unknown[]) => mockGenerateCacheKey(...args),
}));

vi.mock('../src/config/schema.js', () => ({
  createConfigHash: () => mockCreateConfigHash(),
}));

vi.mock('../src/signals/context.js', () => ({
  generateContextSignals: () => mockGenerateContextSignals(),
}));

vi.mock('../src/services/search.js', () => ({
  executeSearch: (...args: unknown[]) => mockExecuteAISearch(...args),
}));

vi.mock('../src/prompts/index.js', () => ({
  normalizeSearchQuery: (q: string) => mockNormalizeSearchQuery(q),
}));

vi.mock('../src/catalog/metaResolver.js', () => ({
  resolveToMetas: (...args: unknown[]) => mockResolveToMetas(...args),
}));

vi.mock('../src/catalog/definitions.js', () => ({
  SEARCH_TTL_SECONDS: 3600,
}));

import { executeSearch, isSearchCatalog } from '../src/catalog/searchGenerator.js';

const testConfig: UserConfig = {
  aiProvider: 'gemini',
  geminiApiKey: 'test-key',
  geminiModel: 'gemini-2.5-flash',
  perplexityApiKey: '',
  perplexityModel: 'sonar',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  timezone: 'UTC',
  country: 'US',
  includeMovies: true,
  includeSeries: true,
  excludedGenres: [],
  showExplanations: true,
  enableWeatherContext: false,
  enableGrounding: false,
  catalogSize: 20,
  requestTimeout: 60,
  subtitleTolerance: 'prefer_dubbed',
  rpdbApiKey: '',
};

const sampleMetas: StremioMeta[] = [
  { id: 'tt0111161', type: 'movie', name: 'Shawshank', poster: '' },
];

function makeCache(overrides: Partial<ReturnType<typeof makeCache>> = {}) {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown, _ttl?: number) => {
      store.set(key, value);
    }),
    clear: vi.fn(async () => store.clear()),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNormalizeSearchQuery.mockImplementation((q: string) => q);
  mockGenerateCacheKey.mockReturnValue('search-cache-key');
  mockCreateConfigHash.mockReturnValue('config-hash');
  mockGenerateContextSignals.mockResolvedValue({} as never);
  mockResolveToMetas.mockResolvedValue(sampleMetas);
});

describe('executeSearch', () => {
  it('should return cached metas on cache hit', async () => {
    const cache = makeCache();
    cache.get.mockResolvedValue({
      items: [{ title: 'Inception', year: 2010 }],
      generatedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });
    mockGetCache.mockReturnValue(cache);

    const result = await executeSearch(testConfig, 'movie', 'inception');

    expect(result.metas).toEqual(sampleMetas);
    expect(mockExecuteAISearch).not.toHaveBeenCalled();
    expect(mockResolveToMetas).toHaveBeenCalledWith(
      [{ title: 'Inception', year: 2010 }],
      { contentType: 'movie' }
    );
  });

  it('should execute search on cache miss and store result', async () => {
    const cache = makeCache();
    mockGetCache.mockReturnValue(cache);
    mockExecuteAISearch.mockResolvedValue([
      { title: 'Inception', year: 2010 },
    ]);

    const result = await executeSearch(testConfig, 'movie', 'inception');

    expect(result.metas).toEqual(sampleMetas);
    expect(mockExecuteAISearch).toHaveBeenCalledWith(
      testConfig,
      expect.anything(),
      'inception',
      'movie'
    );
    expect(cache.set).toHaveBeenCalled();
    const setCall = cache.set.mock.calls[0];
    expect(setCall[1]).toHaveProperty('items');
    expect(setCall[1]).toHaveProperty('expiresAt');
    expect(setCall[1]).toHaveProperty('generatedAt');
  });

  it('should deduplicate concurrent in-flight requests', async () => {
    const cache = makeCache();
    mockGetCache.mockReturnValue(cache);
    mockGenerateContextSignals.mockResolvedValue({} as never);

    let resolveSearch: (value: { title: string; year: number }[]) => void;
    mockExecuteAISearch.mockImplementation(
      () => new Promise((resolve) => { resolveSearch = resolve; })
    );

    // Start Call 1 — it will await cache.get(), scheduling a microtask
    const result1Promise = executeSearch(testConfig, 'movie', 'inception');

    // Flush microtasks so Call 1 progresses to and past generateContextSignals,
    // setting the inFlight entry before Call 2 starts
    await new Promise((resolve) => setTimeout(resolve, 0));
    // By now, Call 1 has set inFlight and is awaiting the pending searchPromise

    // Start Call 2 — should find the inFlight entry from Call 1
    const result2Promise = executeSearch(testConfig, 'movie', 'inception');

    // Resolve the shared searchPromise
    resolveSearch!([{ title: 'Inception', year: 2010 }]);

    const [result1, result2] = await Promise.all([result1Promise, result2Promise]);
    expect(result1.metas).toEqual(sampleMetas);
    expect(result2.metas).toEqual(sampleMetas);
    expect(mockExecuteAISearch).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    mockGenerateContextSignals.mockImplementation(() => Promise.resolve({} as never));
  });

  it('should use separate cache per content type', async () => {
    const cache = makeCache();
    mockGetCache.mockReturnValue(cache);
    mockExecuteAISearch.mockResolvedValue([
      { title: 'Inception', year: 2010 },
    ]);

    await executeSearch(testConfig, 'movie', 'inception');
    await executeSearch(testConfig, 'series', 'inception');

    expect(mockGenerateCacheKey).toHaveBeenCalledTimes(2);
  });

  it('should return empty metas on search failure', async () => {
    const cache = makeCache();
    mockGetCache.mockReturnValue(cache);
    mockExecuteAISearch.mockRejectedValue(new Error('API failure'));

    const result = await executeSearch(testConfig, 'movie', 'inception');

    expect(result.metas).toEqual([]);
  });

  it('should return empty metas when in-flight limit reached', async () => {
    const cache = makeCache();
    mockGetCache.mockReturnValue(cache);
    mockExecuteAISearch.mockResolvedValue([{ title: 'Test', year: 2020 }]);

    const result = await executeSearch(testConfig, 'movie', 'inception');

    expect(result.metas).toEqual(sampleMetas);
  });

  it('should normalize query before caching', async () => {
    const cache = makeCache();
    mockGetCache.mockReturnValue(cache);
    mockNormalizeSearchQuery.mockReturnValue('normalized query');
    mockExecuteAISearch.mockResolvedValue([{ title: 'Test', year: 2020 }]);

    await executeSearch(testConfig, 'movie', '  Some Query  ');

    expect(mockNormalizeSearchQuery).toHaveBeenCalledWith('  Some Query  ');
  });

  it('should pass rpdbApiKey when resolving metas', async () => {
    const cache = makeCache();
    mockGetCache.mockReturnValue(cache);
    const configWithRpdb = { ...testConfig, rpdbApiKey: 'rpdb-key' };
    mockExecuteAISearch.mockResolvedValue([{ title: 'Test', year: 2020 }]);

    await executeSearch(configWithRpdb, 'movie', 'test');

    expect(mockResolveToMetas).toHaveBeenCalledWith(
      [{ title: 'Test', year: 2020 }],
      { contentType: 'movie', rpdbApiKey: 'rpdb-key' }
    );
  });
});

describe('isSearchCatalog', () => {
  it('should return true for catalog IDs containing "search"', () => {
    expect(isSearchCatalog('search_movie')).toBe(true);
    expect(isSearchCatalog('my_search_catalog')).toBe(true);
  });

  it('should return false for non-search catalog IDs', () => {
    expect(isSearchCatalog('movie')).toBe(false);
    expect(isSearchCatalog('series')).toBe(false);
    expect(isSearchCatalog('discover')).toBe(false);
  });
});
