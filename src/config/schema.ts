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
export const aiProviderSchema = z.enum(['gemini', 'perplexity', 'openai']);

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

  // OpenAI settings
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().optional(),

  // RPDB settings (optional, for enhanced posters with ratings)
  rpdbApiKey: z.string().optional(),

  // Location/timezone with format validation
  // Timezone: IANA format (e.g., "America/New_York", "Europe/London", "America/Argentina/Buenos_Aires") or UTC
  // Supports hyphens, digits, and multiple path segments per IANA spec
  timezone: z
    .string()
    .regex(/^(UTC|[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)*)$/, 'Invalid timezone format')
    .default('UTC'),
  // Country: ISO 3166-1 alpha-2 code (e.g., "US", "GB", "DE")
  country: z
    .string()
    .length(2, 'Country code must be 2 characters')
    .regex(/^[A-Z]{2}$/, 'Country code must be uppercase letters')
    .default('US'),

  // Weather location (for weather-based recommendations)
  weatherLocation: weatherLocationSchema,

  // Content preferences
  subtitleTolerance: subtitleToleranceSchema.default('prefer_dubbed'),
  includeMovies: z.boolean().default(true),
  includeSeries: z.boolean().default(true),

  // Genre preferences (validated against VALID_GENRES whitelist)
  excludedGenres: z.array(z.enum(VALID_GENRES)).default([]),

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
 * Provider-specific required field definitions (data-driven validation)
 */
const PROVIDER_REQUIRED_FIELDS: Record<AIProvider, { field: keyof UserConfig; message: string }[]> =
  {
    gemini: [{ field: 'geminiApiKey', message: 'Gemini API key is required' }],
    perplexity: [{ field: 'perplexityApiKey', message: 'Perplexity API key is required' }],
    openai: [{ field: 'openaiApiKey', message: 'OpenAI API key is required' }],
  };

/**
 * Validate that required fields are present based on selected AI provider
 */
export function validateRequiredFields(config: Partial<UserConfig>): string[] {
  const errors: string[] = [];
  const provider = config.aiProvider || 'gemini';

  // Validate provider-specific required fields
  // eslint-disable-next-line security/detect-object-injection -- provider is Zod-validated enum
  const requiredFields = PROVIDER_REQUIRED_FIELDS[provider] || [];
  for (const { field, message } of requiredFields) {
    // eslint-disable-next-line security/detect-object-injection -- field from static config
    const value = config[field];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push(message);
    }
  }

  // Validate at least one content type is enabled
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
