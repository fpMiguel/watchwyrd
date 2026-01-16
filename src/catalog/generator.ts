/**
 * Watchwyrd - Catalog Generator
 *
 * Orchestrates the catalog generation process:
 * 1. Check cache for existing catalog
 * 2. Generate context signals
 * 3. Call AI API (Gemini or Perplexity) if cache miss
 * 4. Look up IMDb IDs via Cinemeta (ensures accuracy)
 * 5. Transform to Stremio format
 * 6. Cache and return
 */

import type {
  UserConfig,
  ContentType,
  StremioCatalog,
  StremioMeta,
  GeminiRecommendation,
  CachedCatalog,
  GeminiResponse,
} from '../types/index.js';
import { GeminiClient } from '../gemini/client.js';
import { PerplexityClient } from '../perplexity/client.js';
import { generateContextSignals, getTemporalBucket, describeContext } from '../signals/context.js';
import { getCache, generateCacheKey } from '../cache/index.js';
import { createConfigHash } from '../config/schema.js';
import { serverConfig } from '../config/server.js';
import { logger } from '../utils/logger.js';
import { lookupTitle, type CinemetaSearchResult } from '../services/cinemeta.js';

// =============================================================================
// Catalog Variant Types
// =============================================================================

/**
 * Catalog variant determines the type of recommendations
 */
export type CatalogVariant =
  | 'main'
  | 'hidden'
  | 'greats'
  | 'comfort'
  | 'surprise'
  | 'binge'
  | 'easy';

/**
 * Extract catalog variant from catalog ID
 */
export function getCatalogVariant(catalogId: string): CatalogVariant {
  if (catalogId.includes('hidden')) return 'hidden';
  if (catalogId.includes('greats')) return 'greats';
  if (catalogId.includes('comfort')) return 'comfort';
  if (catalogId.includes('surprise')) return 'surprise';
  if (catalogId.includes('binge')) return 'binge';
  if (catalogId.includes('easy')) return 'easy';
  return 'main';
}

/**
 * Get specialized prompt suffix for catalog variant
 */
function getVariantPromptSuffix(variant: CatalogVariant, contentType: ContentType): string {
  const type = contentType === 'movie' ? 'movies' : 'series';

  switch (variant) {
    // ==========================================================================
    // SHARED VARIANTS (Movies & Series)
    // ==========================================================================
    case 'hidden':
      return `
SPECIAL FOCUS: "💎 Hidden Gems"
- AVOID mainstream blockbusters and widely-known titles
- Focus on critically acclaimed but LESSER-KNOWN content
- Include indie films, foreign cinema, festival favorites
- Look for high ratings but LOW viewership/popularity
- Prioritize unique, distinctive, or cult favorites
- Include underseen masterpieces from any era
- These are the ${type} most people haven't heard of but SHOULD watch`;

    case 'surprise':
      return `
SPECIAL FOCUS: "🎲 Surprise Me"
- Recommend UNEXPECTED ${type} outside the user's typical preferences
- Include genres they might not usually watch
- Mix in wildcards: experimental, avant-garde, unique premises
- Include acclaimed ${type} from unexpected countries/cultures
- Throw in some cult classics or critically divisive picks
- Goal: EXPAND horizons and introduce new favorites
- Be adventurous and unpredictable!`;

    case 'comfort':
      return `
SPECIAL FOCUS: "🛋️ Comfort Picks"
- Focus on FEEL-GOOD, heartwarming ${type}
- Light comedies, romantic ${type}, family-friendly content
- Rewatchable favorites with satisfying/happy endings
- Nostalgic picks that provide emotional comfort
- Perfect for relaxation and de-stressing
- AVOID heavy drama, horror, intense thrillers, or sad endings
- Cozy, warm, and emotionally safe choices`;

    // ==========================================================================
    // MOVIE-SPECIFIC VARIANTS
    // ==========================================================================
    case 'greats':
      return `
SPECIAL FOCUS: "🎬 All-Time Greats"
- Recommend HIGHLY-RATED, acclaimed classic ${type}
- Include award winners (Oscars, Golden Globes, etc.)
- Directors' masterpieces and essential cinema
- Mix different decades: 50s through 2020s
- IMDb 8.0+ or major critical consensus
- Influential films that shaped cinema
- Essential viewing for any film lover`;

    // ==========================================================================
    // SERIES-SPECIFIC VARIANTS
    // ==========================================================================
    case 'binge':
      return `
SPECIAL FOCUS: "📺 Binge-Worthy"
- ONLY recommend series with HIGH BINGE POTENTIAL
- Look for: cliffhangers, addictive storylines, consistent quality
- Prefer completed series or those with 2+ seasons available
- Strong character development and plot progression
- Series that are HARD TO STOP watching
- "Just one more episode" type shows
- Tight pacing, no filler episodes`;

    case 'easy':
      return `
SPECIAL FOCUS: "☕ Easy Watching"
- Light, RELAXING series for casual viewing
- Sitcoms, light procedurals, feel-good dramas
- Episodes can be watched out of order
- No complex mythology or heavy storylines
- Perfect background watching or wind-down content
- Minimal emotional investment required
- Cozy, episodic, low-stakes entertainment`;

    // ==========================================================================
    // MAIN (Default - Full Context Awareness)
    // ==========================================================================
    default:
      return `
MAIN CATALOG: Full personalized recommendations
- Use ALL context signals: time of day, weather, season, day of week
- Balance user preferences with variety
- Mix familiar genres with gentle discovery
- Consider the viewing moment (morning vs late night, weekday vs weekend)
- This is the PRIMARY recommendation feed - make it excellent`;
  }
}

// =============================================================================
// Transformation Functions
// =============================================================================

/**
 * Convert Gemini recommendation to Stremio Meta object
 * Requires valid IMDb ID from Cinemeta lookup
 */
function recommendationToMeta(
  rec: GeminiRecommendation,
  cinemetaResult: CinemetaSearchResult,
  showExplanation: boolean
): StremioMeta {
  // Return minimal meta object matching Cinemeta's format exactly
  // Only include the essential fields that Stremio requires
  const meta: StremioMeta = {
    id: cinemetaResult.imdbId,
    type: cinemetaResult.type,
    name: cinemetaResult.title,
    poster: cinemetaResult.poster,
  };

  // Optional fields - only add if we have valid data
  if (cinemetaResult.year) {
    meta.releaseInfo = String(cinemetaResult.year);
  }

  // Add description with explanation if enabled (keep simple, no emojis)
  if (showExplanation && rec.explanation) {
    meta.description = rec.explanation;
  }

  return meta;
}

/**
 * Resolve AI recommendations to valid Stremio items via Cinemeta lookup
 * This ensures we only return items that actually exist with correct metadata
 */
async function resolveRecommendations(
  recommendations: GeminiRecommendation[],
  contentType: ContentType,
  showExplanation: boolean
): Promise<StremioMeta[]> {
  const metas: StremioMeta[] = [];
  const lookupPromises: Promise<{
    rec: GeminiRecommendation;
    result: CinemetaSearchResult | null;
  }>[] = [];

  // Look up all titles in parallel (in batches)
  for (const rec of recommendations) {
    lookupPromises.push(
      lookupTitle(rec.title, rec.year, contentType).then((result) => ({ rec, result }))
    );
  }

  const results = await Promise.all(lookupPromises);

  for (const { rec, result } of results) {
    if (!result) {
      logger.debug('Cinemeta lookup failed, skipping', { title: rec.title, year: rec.year });
      continue;
    }

    // Double-check content type matches (movie vs series)
    if (result.type !== contentType) {
      logger.warn('Content type mismatch from Cinemeta', {
        title: rec.title,
        expected: contentType,
        got: result.type,
      });
      continue;
    }

    const meta = recommendationToMeta(rec, result, showExplanation);
    metas.push(meta);
  }

  logger.info('Resolved recommendations via Cinemeta', {
    requested: recommendations.length,
    resolved: metas.length,
    dropped: recommendations.length - metas.length,
  });

  return metas;
}

/**
 * Convert resolved recommendations to Stremio catalog
 * Returns minimal format matching Cinemeta exactly
 */
function transformToCatalog(metas: StremioMeta[]): StremioCatalog {
  return {
    metas,
  };
}

// =============================================================================
// Catalog Generation
// =============================================================================

/**
 * Generate catalog for a specific content type and catalog variant
 * @param config User configuration
 * @param contentType 'movie' or 'series'
 * @param catalogId Catalog identifier for variant detection
 */
export async function generateCatalog(
  config: UserConfig,
  contentType: ContentType,
  catalogId?: string
): Promise<StremioCatalog> {
  const startTime = Date.now();
  const variant = catalogId ? getCatalogVariant(catalogId) : 'main';
  const catalogSize = config.catalogSize || 20;

  // Generate context signals (now async for weather)
  const context = await generateContextSignals(config);
  const temporalBucket = getTemporalBucket(context);
  const configHash = createConfigHash(config);

  // Generate cache key (include variant)
  const cacheKey = generateCacheKey(configHash, `${contentType}-${variant}`, temporalBucket);

  logger.debug('Generating catalog', {
    contentType,
    variant,
    catalogSize,
    temporalBucket,
    cacheKey,
    hasWeather: !!context.weather,
  });

  // Check cache first
  const cache = getCache();
  const cached = await cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    logger.info('Returning cached catalog', {
      contentType,
      variant,
      age: Math.round((Date.now() - cached.generatedAt) / 1000),
    });
    return cached.catalog;
  }

  // Cache miss - generate new recommendations
  logger.info('Cache miss, generating new catalog', { contentType, variant });

  try {
    // Get variant-specific prompt suffix
    const variantSuffix = getVariantPromptSuffix(variant, contentType);

    // Step 1: Get AI recommendations (titles + years)
    // Select AI provider based on configuration
    let response: GeminiResponse;
    const provider = config.aiProvider || 'gemini';

    if (provider === 'perplexity' && config.perplexityApiKey) {
      const perplexity = new PerplexityClient(
        config.perplexityApiKey,
        config.perplexityModel || 'sonar-pro'
      );
      response = await perplexity.generateRecommendations(
        config,
        context,
        contentType,
        catalogSize,
        variantSuffix
      );
      logger.debug('Using Perplexity provider', {
        model: config.perplexityModel,
        variant,
      });
    } else {
      const gemini = new GeminiClient(config.geminiApiKey, config.geminiModel);
      response = await gemini.generateRecommendations(
        config,
        context,
        contentType,
        catalogSize,
        variantSuffix
      );
      logger.debug('Using Gemini provider', { model: config.geminiModel, variant });
    }

    // Step 2: Resolve titles to valid IMDb IDs via Cinemeta
    // This ensures accuracy and prevents showing wrong content types
    const metas = await resolveRecommendations(
      response.recommendations,
      contentType,
      config.showExplanations
    );

    // Step 3: Transform to Stremio format
    const catalog = transformToCatalog(metas);

    // Cache the result
    const cachedCatalog: CachedCatalog = {
      catalog,
      generatedAt: Date.now(),
      expiresAt: Date.now() + serverConfig.cache.ttl * 1000,
      configHash,
    };

    await cache.set(cacheKey, cachedCatalog, serverConfig.cache.ttl);

    const elapsed = Date.now() - startTime;
    logger.info('Catalog generated and cached', {
      contentType,
      count: catalog.metas.length,
      elapsed: `${elapsed}ms`,
      provider,
    });

    return catalog;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to generate catalog', {
      contentType,
      error: errorMessage,
    });

    // If we have stale cache, return it as fallback
    if (cached) {
      logger.warn('Returning stale cached catalog as fallback');
      return cached.catalog;
    }

    // Check if it's a rate limit error and provide helpful info
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
      // Extract retry delay if available
      const retryMatch = errorMessage.match(/retry in (\d+\.?\d*)/i);
      const retrySeconds = retryMatch?.[1] ? Math.ceil(parseFloat(retryMatch[1])) : 60;

      logger.warn('Rate limited by AI API', {
        contentType,
        suggestedRetry: `${retrySeconds}s`,
      });

      // Return empty catalog
      return { metas: [] };
    }

    // Return empty catalog on complete failure
    return { metas: [] };
  }
}

/**
 * Get contextual description for catalog header
 */
export async function getCatalogDescription(config: UserConfig): Promise<string> {
  const context = await generateContextSignals(config);
  return describeContext(context);
}
