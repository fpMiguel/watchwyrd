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
  SubtitleTolerance,
} from '../types/index.js';

// Zod Schemas

/**
 * AI provider validation
 */
export const aiProviderSchema = z.enum(['gemini', 'perplexity']);

/**
 * Gemini model validation - see ADR-010 for model selection rationale
 */
export const geminiModelSchema = z.enum([
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
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
 * Subtitle tolerance validation
 */
export const subtitleToleranceSchema = z.enum([
  'dubbed_only',
  'prefer_dubbed',
  'no_preference',
  'prefer_original',
]);

/**
 * Valid genre names (aligned with TMDB/Stremio)
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
  'Thriller',
  'War',
  'Western',
] as const;

export type Genre = (typeof VALID_GENRES)[number];

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
  geminiModel: geminiModelSchema.default('gemini-2.5-flash'),

  // Perplexity settings
  perplexityApiKey: z.string().optional(),
  perplexityModel: perplexityModelSchema.optional(),

  // RPDB settings (optional, for enhanced posters with ratings)
  rpdbApiKey: z.string().optional(),

  // Location/timezone
  timezone: z.string().default('UTC'),
  country: z.string().default('US'),

  // Weather location (for weather-based recommendations)
  weatherLocation: weatherLocationSchema,

  // Content preferences
  subtitleTolerance: subtitleToleranceSchema.default('prefer_dubbed'),
  includeMovies: z.boolean().default(true),
  includeSeries: z.boolean().default(true),

  // Genre preferences
  excludedGenres: z.array(z.string()).default([]),

  // Feature toggles
  enableWeatherContext: z.boolean().default(false),
  enableGrounding: z.boolean().default(false), // Google Search grounding for Gemini
  showExplanations: z.boolean().default(true),

  // Catalog display settings (AI models typically return 20-50 items max)
  catalogSize: z.number().min(5).max(50).default(20),

  // Performance settings
  // Max seconds to wait for catalog generation (includes AI + metadata)
  requestTimeout: z.number().min(10).max(120).default(30),
});

// Default Configurations

/**
 * Preset profile configurations
 */
export const PRESET_PROFILES: Record<PresetProfile, Partial<UserConfig>> = {
  casual: {
    // Default casual preferences
  },
  cinephile: {
    // Film enthusiast preferences
  },
  family: {
    excludedGenres: ['Horror'],
  },
  binge_watcher: {
    includeSeries: true,
    includeMovies: false,
  },
  discovery: {
    // Balanced discovery with no specific preferences
  },
  custom: {
    // No overrides - user configures everything
  },
};

// Validation Functions

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
  // eslint-disable-next-line security/detect-object-injection -- preset is Zod-validated enum
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
    excludedGenres: config.excludedGenres.sort(),
    includeMovies: config.includeMovies,
    includeSeries: config.includeSeries,
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

// Export Types

export type { AIProvider, GeminiModel, PerplexityModel, PresetProfile, SubtitleTolerance };
