/**
 * Mock AI Providers
 *
 * Mock implementations for testing AI provider functionality
 * without making real API calls.
 */

import { vi } from 'vitest';
import type { Recommendation } from '../../src/schemas/recommendations.js';
import {
  SAMPLE_MOVIE_RECOMMENDATIONS,
  SAMPLE_SERIES_RECOMMENDATIONS,
} from '../__fixtures__/recommendations.js';

/**
 * Mock response structure from AI providers
 */
export interface MockAIResponse {
  recommendations: Recommendation[];
  error?: string;
  delay?: number;
}

/**
 * Create a mock Gemini provider
 */
export function createMockGeminiProvider(
  options: {
    defaultResponse?: Recommendation[];
    shouldFail?: boolean;
    failureError?: string;
    responseDelay?: number;
  } = {}
) {
  const {
    defaultResponse = SAMPLE_MOVIE_RECOMMENDATIONS,
    shouldFail = false,
    failureError = 'Mock API error',
    responseDelay = 0,
  } = options;

  return {
    generateRecommendations: vi.fn().mockImplementation(async () => {
      if (responseDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, responseDelay));
      }

      if (shouldFail) {
        throw new Error(failureError);
      }

      return defaultResponse;
    }),

    validateApiKey: vi.fn().mockResolvedValue(true),

    listModels: vi.fn().mockResolvedValue([
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', available: true, freeTier: true },
      {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        available: true,
        freeTier: true,
      },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', available: true, freeTier: true },
    ]),
  };
}

/**
 * Create a mock Perplexity provider
 */
export function createMockPerplexityProvider(
  options: {
    defaultResponse?: Recommendation[];
    shouldFail?: boolean;
    failureError?: string;
  } = {}
) {
  const {
    defaultResponse = SAMPLE_MOVIE_RECOMMENDATIONS,
    shouldFail = false,
    failureError = 'Mock API error',
  } = options;

  return {
    generateRecommendations: vi.fn().mockImplementation(async () => {
      if (shouldFail) {
        throw new Error(failureError);
      }
      return defaultResponse;
    }),

    validateApiKey: vi.fn().mockResolvedValue(true),

    listModels: vi.fn().mockResolvedValue([
      { id: 'sonar', name: 'Sonar', available: true },
      { id: 'sonar-pro', name: 'Sonar Pro', available: true },
    ]),
  };
}

/**
 * Create a mock provider factory
 */
export function createMockProviderFactory() {
  const geminiProvider = createMockGeminiProvider();
  const perplexityProvider = createMockPerplexityProvider();

  return {
    createProvider: vi.fn().mockImplementation((type: string) => {
      if (type === 'gemini') return geminiProvider;
      if (type === 'perplexity') return perplexityProvider;
      throw new Error(`Unknown provider: ${type}`);
    }),

    geminiProvider,
    perplexityProvider,
  };
}

/**
 * Mock Gemini SDK
 */
export function mockGeminiSDK() {
  const mockGenerateContent = vi.fn().mockResolvedValue({
    response: {
      text: () => JSON.stringify({ recommendations: SAMPLE_MOVIE_RECOMMENDATIONS }),
    },
  });

  const mockGetGenerativeModel = vi.fn().mockReturnValue({
    generateContent: mockGenerateContent,
  });

  const mockListModels = vi.fn().mockResolvedValue([
    { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
    { name: 'models/gemini-2.0-flash', displayName: 'Gemini 2.0 Flash' },
  ]);

  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
      listModels: mockListModels,
    })),
    mockGenerateContent,
    mockGetGenerativeModel,
    mockListModels,
  };
}

/**
 * Mock Perplexity API responses
 */
export function mockPerplexityFetch() {
  return vi.fn().mockImplementation(async (url: string, options: RequestInit) => {
    const body = JSON.parse(options.body as string);

    // Validate request
    if (!body.model || !body.messages) {
      return {
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid request' }),
      };
    }

    // Return mock response
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recommendations: SAMPLE_MOVIE_RECOMMENDATIONS,
              }),
            },
          },
        ],
      }),
    };
  });
}

/**
 * Setup mock for content type-specific responses
 */
export function createContentTypeMockProvider() {
  return {
    generateRecommendations: vi.fn().mockImplementation(async (prompt: string) => {
      if (prompt.includes('series') || prompt.includes('TV show')) {
        return SAMPLE_SERIES_RECOMMENDATIONS;
      }
      return SAMPLE_MOVIE_RECOMMENDATIONS;
    }),
    validateApiKey: vi.fn().mockResolvedValue(true),
    listModels: vi.fn().mockResolvedValue([]),
  };
}
