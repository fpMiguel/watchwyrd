/**
 * Watchwyrd - Core Type Definitions
 *
 * This file contains all TypeScript interfaces and types used throughout
 * the application. Organized by domain for maintainability.
 */

// =============================================================================
// Stremio Types
// =============================================================================

/**
 * Stremio content types supported by the addon
 */
export type ContentType = 'movie' | 'series';

/**
 * Stremio Meta object - represents a single piece of content
 */
export interface StremioMeta {
  id: string;
  type: ContentType;
  name: string;
  poster?: string;
  posterShape?: 'square' | 'poster' | 'landscape';
  background?: string;
  logo?: string;
  description?: string;
  releaseInfo?: string;
  year?: number;
  runtime?: string;
  genres?: string[];
  director?: string[];
  cast?: string[];
  imdbRating?: string;
  links?: StremioLink[];
}

/**
 * Stremio Link object for additional metadata
 */
export interface StremioLink {
  name: string;
  category: string;
  url: string;
}

/**
 * Stremio Catalog response
 */
export interface StremioCatalog {
  metas: StremioMeta[];
  cacheMaxAge?: number;
}

/**
 * Stremio Manifest Catalog definition
 */
export interface ManifestCatalog {
  type: ContentType;
  id: string;
  name: string;
  extra?: Array<{ name: string; options?: string[]; isRequired?: boolean }>;
  genres?: string[];
}

// =============================================================================
// User Configuration Types
// =============================================================================

/**
 * Supported AI providers
 */
export type AIProvider = 'gemini' | 'perplexity';

/**
 * Supported Gemini models
 */
export type GeminiModel =
  | 'gemini-3-flash'
  | 'gemini-3-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite';

/**
 * Supported Perplexity models
 */
export type PerplexityModel = 'sonar' | 'sonar-pro' | 'sonar-reasoning-pro';

/**
 * Union type for all AI models
 */
export type AIModel = GeminiModel | PerplexityModel;

/**
 * Preset profile options
 */
export type PresetProfile =
  | 'casual'
  | 'cinephile'
  | 'family'
  | 'binge_watcher'
  | 'discovery'
  | 'custom';

/**
 * Subtitle tolerance options
 */
export type SubtitleTolerance =
  | 'dubbed_only'
  | 'prefer_dubbed'
  | 'no_preference'
  | 'prefer_original';

/**
 * Complete user configuration object
 */
export interface UserConfig {
  // AI Provider selection
  aiProvider: AIProvider;

  // Gemini settings (used when aiProvider is 'gemini')
  geminiApiKey: string;
  geminiModel: GeminiModel;

  // Perplexity settings (used when aiProvider is 'perplexity')
  perplexityApiKey?: string;
  perplexityModel?: PerplexityModel;

  // RPDB settings (optional, for enhanced posters)
  rpdbApiKey?: string;

  // Location/timezone
  timezone: string;
  country: string;

  // Weather location (optional, for weather-based recommendations)
  weatherLocation?: WeatherLocation;

  // Content preferences
  subtitleTolerance: SubtitleTolerance;
  includeMovies: boolean;
  includeSeries: boolean;

  // Genre preferences
  excludedGenres: string[];

  // Feature toggles
  enableWeatherContext: boolean;
  showExplanations: boolean;

  // Catalog display settings
  catalogSize: number; // Items per catalog page (5-250, default 20)
}

/**
 * Weather location from geocoding
 */
export interface WeatherLocation {
  name: string; // City name
  country: string; // Country name
  latitude: number;
  longitude: number;
  admin1?: string; // State/Province
}

/**
 * Partial user config for configuration updates
 */
export type PartialUserConfig = Partial<UserConfig>;

// =============================================================================
// Context Signal Types
// =============================================================================

/**
 * Time of day classification
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'latenight';

/**
 * Day of week classification
 */
export type DayType = 'weekday' | 'weekend';

/**
 * Complete context signals derived from time and user config
 */
export interface ContextSignals {
  // Temporal signals
  localTime: string; // HH:mm format
  timeOfDay: TimeOfDay;
  dayOfWeek: string;
  dayType: DayType;
  date: string; // YYYY-MM-DD format

  // User-derived signals
  timezone: string;
  country: string;

  // Optional weather (if enabled)
  weather?: {
    condition: string;
    temperature: number;
    description?: string;
  };
}

// =============================================================================
// Gemini API Types
// =============================================================================

/**
 * Context tags for recommendations
 */
export type ContextTag =
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'latenight'
  | 'weekday'
  | 'weekend'
  | 'spring'
  | 'summer'
  | 'fall'
  | 'winter'
  | 'holiday'
  | 'classic'
  | 'modern'
  | 'recent_release'
  | 'new_release'
  | 'high_genre_match'
  | 'genre_discovery'
  | 'mainstream'
  | 'cult_favorite'
  | 'hidden_gem'
  | 'binge_worthy'
  | 'casual_watch';

/**
 * Single recommendation from AI (works for both Gemini and Perplexity)
 */
export interface GeminiRecommendation {
  imdbId: string;
  title: string;
  year: number;
  genres: string[];
  runtime: number; // minutes
  explanation: string;
  contextTags: ContextTag[];
  confidenceScore: number; // 0-1
}

/**
 * Alias for backwards compatibility
 */
export type AIRecommendation = GeminiRecommendation;

/**
 * Complete AI response (works for both Gemini and Perplexity)
 */
export interface GeminiResponse {
  recommendations: GeminiRecommendation[];
  metadata: {
    generatedAt: string;
    modelUsed: AIModel;
    providerUsed: AIProvider;
    searchUsed: boolean;
    totalCandidatesConsidered: number;
  };
}

/**
 * Alias for backwards compatibility
 */
export type AIResponse = GeminiResponse;

// =============================================================================
// Cache Types
// =============================================================================

/**
 * Cached catalog entry
 */
export interface CachedCatalog {
  catalog: StremioCatalog;
  generatedAt: number;
  expiresAt: number;
  configHash: string;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
}

// =============================================================================
// Server Types
// =============================================================================

/**
 * Server configuration
 */
export interface ServerConfig {
  port: number;
  host: string;
  baseUrl: string;
  nodeEnv: 'development' | 'production';
  cacheTtl: number;
  cacheMaxSize: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  rateLimitEnabled: boolean;
  rateLimitMax: number;
  rateLimitWindowMs: number;
}

// =============================================================================
// Search Types
// =============================================================================

/**
 * Simple recommendation item from AI (title + year only)
 */
export interface SimpleRecommendation {
  title: string;
  year: number;
}
