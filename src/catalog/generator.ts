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
  PaginationContext,
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
  | 'tonight'
  | 'binge'
  | 'new'
  | 'hidden'
  | 'classic'
  | 'comfort';

/**
 * Extract catalog variant from catalog ID
 */
export function getCatalogVariant(catalogId: string): CatalogVariant {
  if (catalogId.includes('tonight')) return 'tonight';
  if (catalogId.includes('binge')) return 'binge';
  if (catalogId.includes('new')) return 'new';
  if (catalogId.includes('hidden')) return 'hidden';
  if (catalogId.includes('classic')) return 'classic';
  if (catalogId.includes('comfort')) return 'comfort';
  return 'main';
}

/**
 * Get specialized prompt suffix for catalog variant
 */
function getVariantPromptSuffix(variant: CatalogVariant, contentType: ContentType): string {
  switch (variant) {
    case 'tonight':
      return `
SPECIAL FOCUS: "Perfect for Tonight"
- Prioritize content that matches the CURRENT time of day and weather
- Focus on mood-appropriate selections
- Shorter runtime preferred for weeknights
- Comfort picks for the current season
- High confidence, easy choices`;

    case 'binge':
      return `
SPECIAL FOCUS: "Binge-Worthy Series"
- Only recommend series with high binge potential
- Look for: cliffhangers, addictive storylines, consistent quality
- Prefer completed series or those with multiple seasons
- Strong character development and plot progression
- Series that are hard to stop watching`;

    case 'new':
      return `
SPECIAL FOCUS: "New Releases"
- ONLY recommend ${contentType === 'movie' ? 'movies' : 'series'} released in the last 6 months
- Include highly anticipated upcoming releases (next 3 months)
- Focus on theatrical releases, major streaming premieres
- Prioritize critically acclaimed or buzzworthy new content
- Use web search to find the LATEST releases`;

    case 'hidden':
      return `
SPECIAL FOCUS: "Hidden Gems"
- AVOID mainstream blockbusters and widely-known titles
- Focus on critically acclaimed but lesser-known content
- Include indie films, foreign cinema, festival favorites
- Look for high ratings but low viewership
- Prioritize unique, distinctive, or cult favorites
- Include underseen masterpieces from any era`;

    case 'classic':
      return `
SPECIAL FOCUS: "Classic Cinema"
- ONLY recommend ${contentType === 'movie' ? 'movies' : 'series'} from before 2000
- Focus on timeless, influential, and iconic titles
- Include award winners, directors' masterpieces
- Mix different decades and film movements
- These should be essential viewing for any cinephile`;

    case 'comfort':
      return `
SPECIAL FOCUS: "Comfort Movies"
- Focus on feel-good, heartwarming content
- Light comedies, romantic films, family-friendly
- Rewatchable favorites with happy endings
- Nostalgic picks that provide emotional comfort
- Perfect for relaxation and de-stressing
- Avoid heavy drama, horror, or intense thrillers`;

    default:
      return '';
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
 * @param skip Number of items to skip (for pagination)
 */
export async function generateCatalog(
  config: UserConfig,
  contentType: ContentType,
  catalogId?: string,
  skip?: number
): Promise<StremioCatalog> {
  const startTime = Date.now();
  const variant = catalogId ? getCatalogVariant(catalogId) : 'main';
  const page = skip ? Math.floor(skip / 20) : 0; // 20 items per page

  // Generate context signals (now async for weather)
  const context = await generateContextSignals(config);
  const temporalBucket = getTemporalBucket(context);
  const configHash = createConfigHash(config);

  // Generate cache key (include variant and page)
  const cacheKey = generateCacheKey(
    configHash,
    `${contentType}-${variant}-p${page}`,
    temporalBucket
  );

  logger.debug('Generating catalog', {
    contentType,
    variant,
    page,
    skip,
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
      page,
      age: Math.round((Date.now() - cached.generatedAt) / 1000),
    });
    return cached.catalog;
  }

  // Cache miss - generate new recommendations
  logger.info('Cache miss, generating new catalog', { contentType, variant, page });

  // Smart pagination: Get previous titles to exclude
  let previousTitles: string[] = [];
  if (page > 0) {
    // Look for previous page's cache to get exclusion list
    const prevPageKey = generateCacheKey(
      configHash,
      `${contentType}-${variant}-p${page - 1}`,
      temporalBucket
    );
    const prevCached = await cache.get(prevPageKey);
    if (prevCached?.paginationContext) {
      previousTitles = prevCached.paginationContext.previousTitles;
      logger.debug('Smart pagination: loaded previous titles', {
        count: previousTitles.length,
        page,
      });
    }
  }

  try {
    // Get variant-specific prompt suffix
    let variantSuffix = getVariantPromptSuffix(variant, contentType);

    // Add smart pagination context with explicit exclusions
    if (page > 0 || previousTitles.length > 0) {
      const exclusionList =
        previousTitles.length > 0
          ? `\n\nDO NOT recommend any of these titles (already shown to user):\n${previousTitles.map((t) => `- ${t}`).join('\n')}`
          : '';

      variantSuffix += `\n\nPAGINATION: This is page ${page + 1}. Generate COMPLETELY DIFFERENT recommendations.
${exclusionList}

Focus on:
- Lesser-known quality content not in the exclusion list
- Different genres/themes than previous pages
- Hidden gems and cult favorites
- Varied time periods and styles`;
    }

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
        20,
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
        20,
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

    // Build pagination context for next page
    const newTitles = response.recommendations.map((r) => r.title);
    const paginationContext: PaginationContext = {
      previousTitles: [...previousTitles, ...newTitles],
      page,
      totalShown: previousTitles.length + newTitles.length,
      createdAt: Date.now(),
    };

    // Cache the result with pagination context
    const cachedCatalog: CachedCatalog = {
      catalog,
      generatedAt: Date.now(),
      expiresAt: Date.now() + serverConfig.cache.ttl * 1000,
      configHash,
      paginationContext,
    };

    await cache.set(cacheKey, cachedCatalog, serverConfig.cache.ttl);

    const elapsed = Date.now() - startTime;
    logger.info('Catalog generated and cached', {
      contentType,
      count: catalog.metas.length,
      elapsed: `${elapsed}ms`,
      provider,
      page,
      totalTitlesExcluded: previousTitles.length,
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
