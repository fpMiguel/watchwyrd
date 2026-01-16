/**
 * Test Fixtures - User Configurations
 *
 * Reusable configuration objects for testing.
 */

import type { UserConfig, ContextSignals } from '../../src/types/index.js';

/**
 * Minimal valid context for testing prompts
 */
export const MINIMAL_CONTEXT: ContextSignals = {
  localTime: '14:30',
  timeOfDay: 'afternoon',
  dayOfWeek: 'Wednesday',
  dayType: 'weekday',
  date: '2025-01-15',
  timezone: 'America/New_York',
  country: 'US',
};

/**
 * Minimal valid Gemini configuration
 */
export const MINIMAL_GEMINI_CONFIG: Partial<UserConfig> = {
  aiProvider: 'gemini',
  geminiApiKey: 'test-gemini-api-key-xxxxx',
  geminiModel: 'gemini-2.5-flash',
};

/**
 * Full Gemini configuration with all options
 */
export const FULL_GEMINI_CONFIG: UserConfig = {
  aiProvider: 'gemini',
  geminiApiKey: 'test-gemini-api-key-xxxxx',
  geminiModel: 'gemini-2.5-flash',
  perplexityApiKey: '',
  perplexityModel: 'sonar',
  timezone: 'America/New_York',
  country: 'US',
  includeMovies: true,
  includeSeries: true,
  excludedGenres: [],
  showExplanations: true,
  enableWeatherContext: false,
  locationLat: undefined,
  locationLon: undefined,
  locationName: undefined,
  catalogSize: 20,
  requestTimeout: 60,
  subtitleTolerance: 'prefer_dubbed',
  rpdbApiKey: '',
};

/**
 * Minimal valid Perplexity configuration
 */
export const MINIMAL_PERPLEXITY_CONFIG: Partial<UserConfig> = {
  aiProvider: 'perplexity',
  perplexityApiKey: 'test-perplexity-api-key-xxxxx',
  perplexityModel: 'sonar',
};

/**
 * Full Perplexity configuration
 */
export const FULL_PERPLEXITY_CONFIG: UserConfig = {
  ...FULL_GEMINI_CONFIG,
  aiProvider: 'perplexity',
  geminiApiKey: '',
  perplexityApiKey: 'test-perplexity-api-key-xxxxx',
  perplexityModel: 'sonar',
};

/**
 * Family-friendly configuration (excludes adult content)
 */
export const FAMILY_CONFIG: Partial<UserConfig> = {
  ...MINIMAL_GEMINI_CONFIG,
  excludedGenres: ['Horror', 'Thriller', 'Crime', 'War'],
};

/**
 * Movies-only configuration
 */
export const MOVIES_ONLY_CONFIG: Partial<UserConfig> = {
  ...MINIMAL_GEMINI_CONFIG,
  includeMovies: true,
  includeSeries: false,
};

/**
 * Series-only configuration
 */
export const SERIES_ONLY_CONFIG: Partial<UserConfig> = {
  ...MINIMAL_GEMINI_CONFIG,
  includeMovies: false,
  includeSeries: true,
};

/**
 * Configuration with weather context enabled
 */
export const WEATHER_ENABLED_CONFIG: Partial<UserConfig> = {
  ...MINIMAL_GEMINI_CONFIG,
  enableWeatherContext: true,
  locationLat: 40.7128,
  locationLon: -74.006,
  locationName: 'New York, NY',
};

/**
 * Configuration with custom timeout
 */
export const CUSTOM_TIMEOUT_CONFIG: Partial<UserConfig> = {
  ...MINIMAL_GEMINI_CONFIG,
  requestTimeout: 120,
};

/**
 * Configuration with RPDB enabled
 */
export const RPDB_ENABLED_CONFIG: Partial<UserConfig> = {
  ...MINIMAL_GEMINI_CONFIG,
  rpdbApiKey: 't0-free-rpdb',
};

/**
 * Invalid configuration (missing API key)
 */
export const INVALID_CONFIG_NO_KEY: Partial<UserConfig> = {
  aiProvider: 'gemini',
  geminiApiKey: '',
};

/**
 * Invalid configuration (unknown provider)
 */
export const INVALID_CONFIG_BAD_PROVIDER = {
  aiProvider: 'unknown-provider',
  geminiApiKey: 'test-key',
};

/**
 * Factory to create custom configurations
 */
export function createTestConfig(
  overrides: Partial<UserConfig> = {}
): UserConfig {
  return {
    ...FULL_GEMINI_CONFIG,
    ...overrides,
  };
}

/**
 * Factory to create Gemini config
 */
export function createGeminiConfig(
  overrides: Partial<UserConfig> = {}
): UserConfig {
  return createTestConfig({
    aiProvider: 'gemini',
    geminiApiKey: 'test-gemini-key',
    ...overrides,
  });
}

/**
 * Factory to create Perplexity config
 */
export function createPerplexityConfig(
  overrides: Partial<UserConfig> = {}
): UserConfig {
  return createTestConfig({
    aiProvider: 'perplexity',
    geminiApiKey: '',
    perplexityApiKey: 'test-perplexity-key',
    ...overrides,
  });
}
