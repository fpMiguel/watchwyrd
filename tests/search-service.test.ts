/**
 * Search Service Tests
 *
 * Tests the executeSearch function that bridges prompts and AI providers
 * for natural language search.
 */

import { describe, it, expect, vi } from 'vitest';
import type { UserConfig, ContextSignals, AIResponse } from '../src/types/index.js';
const mockGenerateRecommendations = vi.fn();
const mockCreateProvider = vi.fn(() => ({
  generateRecommendations: mockGenerateRecommendations,
  provider: 'gemini',
  model: 'gemini-2.5-flash',
}));

vi.mock('../src/providers/factory.js', () => ({
  createProvider: vi.fn(() => mockCreateProvider()),
  getActiveProvider: vi.fn(() => 'gemini'),
}));

vi.mock('../src/prompts/index.js', () => ({
  buildSearchPrompt: vi.fn(() => 'mock-search-prompt'),
  normalizeSearchQuery: vi.fn((q: string) => q),
}));

import { executeSearch } from '../src/services/search.js';

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

const testContext: ContextSignals = {
  localTime: '14:30',
  timeOfDay: 'afternoon',
  dayOfWeek: 'Wednesday',
  dayType: 'weekday',
  date: '2026-01-15',
  timezone: 'UTC',
  country: 'US',
};

function makeAIResponse(): AIResponse {
  return {
    recommendations: [
      { title: 'The Shawshank Redemption', year: 1994, reason: 'Classic' },
      { title: 'Inception', year: 2010, reason: 'Mind-bending' },
    ],
    metadata: {
      generatedAt: new Date().toISOString(),
      modelUsed: 'gemini-2.5-flash',
      providerUsed: 'gemini',
      searchUsed: true,
      totalCandidatesConsidered: 2,
    },
  };
}

describe('executeSearch', () => {
  it('should return recommendations from provider', async () => {
    mockGenerateRecommendations.mockResolvedValueOnce(makeAIResponse());

    const result = await executeSearch(testConfig, testContext, '90s sci-fi', 'movie');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ title: 'The Shawshank Redemption', year: 1994 });
    expect(result[1]).toEqual({ title: 'Inception', year: 2010 });
  });

  it('should pass the correct content type to the provider', async () => {
    mockGenerateRecommendations.mockResolvedValueOnce(makeAIResponse());

    await executeSearch(testConfig, testContext, 'drama series', 'series');

    expect(mockGenerateRecommendations).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'series',
      expect.any(Number),
      expect.any(String)
    );
  });

  it('should use default catalog size when not specified', async () => {
    mockGenerateRecommendations.mockResolvedValueOnce(makeAIResponse());

    const configNoSize = { ...testConfig, catalogSize: undefined as unknown as number };
    await executeSearch(configNoSize, testContext, 'sci-fi', 'movie');

    expect(mockGenerateRecommendations).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      20,
      expect.any(String)
    );
  });

  it('should use custom catalog size when specified', async () => {
    mockGenerateRecommendations.mockResolvedValueOnce(makeAIResponse());

    const configCustomSize = { ...testConfig, catalogSize: 5 };
    await executeSearch(configCustomSize, testContext, 'comedy', 'movie');

    expect(mockGenerateRecommendations).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      5,
      expect.any(String)
    );
  });

  it('should throw when provider fails', async () => {
    mockGenerateRecommendations.mockRejectedValueOnce(new Error('API error'));

    await expect(executeSearch(testConfig, testContext, 'sci-fi', 'movie')).rejects.toThrow(
      'API error'
    );
  });

  it('should return empty array when provider returns empty recommendations', async () => {
    const emptyResponse = makeAIResponse();
    emptyResponse.recommendations = [];
    mockGenerateRecommendations.mockResolvedValueOnce(emptyResponse);

    const result = await executeSearch(testConfig, testContext, 'sci-fi', 'movie');

    expect(result).toEqual([]);
  });

  it('should create provider with given config', async () => {
    mockGenerateRecommendations.mockResolvedValueOnce(makeAIResponse());

    await executeSearch(testConfig, testContext, 'sci-fi', 'movie');

    expect(mockCreateProvider).toHaveBeenCalled();
  });
});
