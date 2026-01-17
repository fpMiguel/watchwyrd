/**
 * Watchwyrd - Configuration Schema & Validation
 *
 * Uses Zod for runtime validation with full TypeScript integration.
 * Provides default values and validation for all user configuration options.
 */

import { z } from 'zod';
import type {
  UserConfig,
  GeminiModel,
  PerplexityModel,
  AIProvider,
  PresetProfile,
  ContentRating,
  RuntimePreference,
  BingePreference,
  SubtitleTolerance,
  ReleaseEra,
} from '../types/index.js';

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * AI provider validation
 */
export const aiProviderSchema = z.enum(['gemini', 'perplexity']);

/**
 * Gemini model validation
 */
export const geminiModelSchema = z.enum([
  'gemini-3-flash',
  'gemini-3-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
]);

/**
 * Perplexity model validation
 */
export const perplexityModelSchema = z.enum(['sonar', 'sonar-pro', 'sonar-reasoning-pro']);

/**
 * Preset profile validation
 */
export const presetProfileSchema = z.enum([
  'casual',
  'cinephile',
  'family',
  'binge_watcher',
  'discovery',
  'custom',
]);

/**
 * Content rating validation
 */
export const contentRatingSchema = z.enum(['G', 'PG', 'PG-13', 'R', 'NC-17']);

/**
 * Runtime preference validation
 */
export const runtimePreferenceSchema = z.enum(['short', 'medium', 'long', 'any']);

/**
 * Binge preference validation
 */
export const bingePreferenceSchema = z.enum(['none', 'moderate', 'high']);

/**
 * Subtitle tolerance validation
 */
export const subtitleToleranceSchema = z.enum([
  'dubbed_only',
  'prefer_dubbed',
  'no_preference',
  'prefer_original',
]);

/**
 * Release era validation
 */
export const releaseEraSchema = z.enum([
  'pre-1970',
  '1970s',
  '1980s',
  '1990s',
  '2000s',
  '2010s',
  '2020s',
]);

/**
 * Valid genre names
 */
export const VALID_GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Music',
  'Mystery',
  'Romance',
  'Science Fiction',
  'TV Movie',
  'Thriller',
  'War',
  'Western',
] as const;

export type Genre = (typeof VALID_GENRES)[number];

/**
 * Genre weights validation (1-5 scale, restricted to valid genres)
 */
export const genreWeightsSchema = z.record(z.string(), z.number().min(1).max(5)).refine(
  (weights) => {
    const validGenreSet = new Set(VALID_GENRES as readonly string[]);
    return Object.keys(weights).every((key) => validGenreSet.has(key));
  },
  { message: 'Invalid genre name in genre weights' }
);

/**
 * Weather location validation
 */
export const weatherLocationSchema = z
  .object({
    name: z.string(),
    country: z.string(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    admin1: z.string().optional(),
  })
  .optional();

/**
 * Complete user configuration schema
 */
export const userConfigSchema = z.object({
  // AI Provider selection
  aiProvider: aiProviderSchema.default('gemini'),

  // Gemini settings
  geminiApiKey: z.string().default(''),
  geminiModel: geminiModelSchema.default('gemini-3-flash'),

  // Perplexity settings
  perplexityApiKey: z.string().optional(),
  perplexityModel: perplexityModelSchema.optional(),

  // Location/timezone
  timezone: z.string().default('UTC'),
  country: z.string().default('US'),

  // Weather location (for weather-based recommendations)
  weatherLocation: weatherLocationSchema,

  // Content preferences
  preferredLanguages: z.array(z.string()).default(['en']),
  subtitleTolerance: subtitleToleranceSchema.default('prefer_dubbed'),
  maxRating: contentRatingSchema.default('R'),
  includeMovies: z.boolean().default(true),
  includeSeries: z.boolean().default(true),

  // Genre preferences
  genreWeights: genreWeightsSchema.default({}),
  excludedGenres: z.array(z.string()).default([]),

  // Discovery preferences
  noveltyBias: z.number().min(0).max(100).default(50),
  popularityBias: z.number().min(0).max(100).default(50),
  preferredEras: z.array(releaseEraSchema).default([]),
  includeNewReleases: z.boolean().default(true),

  // Viewing context
  runtimePreference: runtimePreferenceSchema.default('any'),
  bingePreference: bingePreferenceSchema.default('moderate'),

  // Feature toggles
  enableSeasonalThemes: z.boolean().default(true),
  enableTimeContext: z.boolean().default(true),
  enableWeatherContext: z.boolean().default(false),
  enableHolidayContext: z.boolean().default(true),
  showExplanations: z.boolean().default(true),

  // Catalog display settings (AI models typically return 20-50 items max)
  catalogSize: z.number().min(5).max(50).default(20),
});

// =============================================================================
// Default Configurations
// =============================================================================

/**
 * Default genre weights (balanced)
 */
export const DEFAULT_GENRE_WEIGHTS: Record<Genre, number> = {
  Action: 3,
  Adventure: 3,
  Animation: 3,
  Comedy: 3,
  Crime: 3,
  Documentary: 3,
  Drama: 3,
  Family: 3,
  Fantasy: 3,
  History: 3,
  Horror: 3,
  Music: 3,
  Mystery: 3,
  Romance: 3,
  'Science Fiction': 3,
  'TV Movie': 3,
  Thriller: 3,
  War: 3,
  Western: 3,
};

/**
 * Preset profile configurations
 */
export const PRESET_PROFILES: Record<PresetProfile, Partial<UserConfig>> = {
  casual: {
    popularityBias: 70,
    noveltyBias: 50,
    runtimePreference: 'medium',
    bingePreference: 'moderate',
    genreWeights: {
      Comedy: 4,
      Action: 4,
      Adventure: 3,
      Drama: 3,
      Romance: 3,
    },
  },
  cinephile: {
    popularityBias: 30,
    noveltyBias: 40,
    runtimePreference: 'any',
    bingePreference: 'none',
    preferredEras: ['pre-1970', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'],
    genreWeights: {
      Drama: 5,
      'Science Fiction': 4,
      Thriller: 4,
      Mystery: 4,
      Documentary: 4,
      History: 3,
    },
  },
  family: {
    maxRating: 'PG-13',
    popularityBias: 60,
    noveltyBias: 50,
    runtimePreference: 'medium',
    bingePreference: 'moderate',
    excludedGenres: ['Horror'],
    genreWeights: {
      Family: 5,
      Animation: 5,
      Adventure: 4,
      Comedy: 4,
      Fantasy: 4,
    },
  },
  binge_watcher: {
    includeSeries: true,
    includeMovies: false,
    popularityBias: 60,
    noveltyBias: 60,
    runtimePreference: 'short',
    bingePreference: 'high',
    genreWeights: {
      Drama: 5,
      Thriller: 4,
      'Science Fiction': 4,
      Crime: 4,
      Mystery: 4,
    },
  },
  discovery: {
    popularityBias: 20,
    noveltyBias: 70,
    runtimePreference: 'any',
    bingePreference: 'moderate',
    includeNewReleases: true,
  },
  custom: {
    // No overrides - user configures everything
  },
};

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Parse and validate user configuration from URL parameters or form data
 */
export function parseUserConfig(input: unknown): UserConfig {
  return userConfigSchema.parse(input);
}

/**
 * Safely parse user configuration, returning errors if invalid
 */
export function safeParseUserConfig(input: unknown): {
  success: boolean;
  data?: UserConfig;
  errors?: z.ZodError;
} {
  const result = userConfigSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Apply preset profile to base configuration
 */
export function applyPreset(
  baseConfig: Partial<UserConfig>,
  preset: PresetProfile
): Partial<UserConfig> {
  const presetConfig = PRESET_PROFILES[preset];
  return {
    ...baseConfig,
    ...presetConfig,
  };
}

/**
 * Validate that required fields are present based on selected AI provider
 */
export function validateRequiredFields(config: Partial<UserConfig>): string[] {
  const errors: string[] = [];

  const provider = config.aiProvider || 'gemini';

  if (provider === 'gemini') {
    if (!config.geminiApiKey || config.geminiApiKey.trim() === '') {
      errors.push('Gemini API key is required');
    }
  } else if (provider === 'perplexity') {
    if (!config.perplexityApiKey || config.perplexityApiKey.trim() === '') {
      errors.push('Perplexity API key is required');
    }
  }

  if (config.includeMovies === false && config.includeSeries === false) {
    errors.push('At least one content type (movies or series) must be enabled');
  }

  return errors;
}

/**
 * Create a configuration hash for cache keying
 */
export function createConfigHash(config: UserConfig): string {
  // Create deterministic JSON string of relevant config fields
  const relevantFields = {
    languages: config.preferredLanguages.sort(),
    maxRating: config.maxRating,
    genreWeights: Object.entries(config.genreWeights).sort(),
    excludedGenres: config.excludedGenres.sort(),
    noveltyBias: config.noveltyBias,
    popularityBias: config.popularityBias,
    preferredEras: config.preferredEras.sort(),
    runtimePreference: config.runtimePreference,
    includeNewReleases: config.includeNewReleases,
  };

  const str = JSON.stringify(relevantFields);
  // Simple hash function for cache key
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// =============================================================================
// Export Types
// =============================================================================

export type {
  AIProvider,
  GeminiModel,
  PerplexityModel,
  PresetProfile,
  ContentRating,
  RuntimePreference,
  BingePreference,
  SubtitleTolerance,
  ReleaseEra,
};
