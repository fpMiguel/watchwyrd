/**
 * Watchwyrd - Catalog Generator
 *
 * Generates AI-powered catalogs on-demand with caching.
 *
 * Strategy:
 * 1. Each catalog request generates ONLY the requested catalog
 * 2. Each catalog is cached individually after generation
 * 3. Concurrent requests for the same catalog share a single generation
 *
 * Benefits:
 * - Efficient: Only generates what Stremio actually requests
 * - Cost-effective: No wasted API calls for unused catalogs
 * - Fast: Single catalog generation is quicker than batch
 * - Reliable: One failure doesn't affect other catalogs
 */

import type {
  UserConfig,
  ContentType,
  StremioCatalog,
  StremioMeta,
  GeminiRecommendation,
  CachedCatalog,
  ContextSignals,
} from '../types/index.js';
import { createProvider } from '../providers/index.js';
import { generateContextSignals, getTemporalBucket } from '../signals/context.js';
import { getCache, generateCacheKey } from '../cache/index.js';
import { createConfigHash } from '../config/schema.js';
import { serverConfig } from '../config/server.js';
import { logger } from '../utils/logger.js';
import { lookupTitle } from '../services/cinemeta.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Catalog variant types for different recommendation styles
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
 * TTL (in seconds) for each catalog variant
 * Optimized based on context-sensitivity and how often content changes:
 * - main/surprise/comfort: Short TTL - highly context-aware (time/weather/mood)
 * - easy: Medium TTL - casual but still context-aware
 * - binge: Longer TTL - evening activity, less volatile
 * - hidden/greats: Longest TTL - timeless content
 */
const VARIANT_TTL: Record<CatalogVariant, number> = {
  main: 1 * 60 * 60, // 1 hour - highly context-aware
  surprise: 1 * 60 * 60, // 1 hour - discovery should feel fresh
  comfort: 1 * 60 * 60, // 1 hour - mood-dependent, changes with weather/time
  easy: 2 * 60 * 60, // 2 hours - casual but context-aware
  binge: 4 * 60 * 60, // 4 hours - evening activity, less volatile
  hidden: 24 * 60 * 60, // 24 hours - hidden gems are timeless
  greats: 48 * 60 * 60, // 48 hours - classics never change
};

/**
 * Get TTL for a specific catalog variant
 */
function getVariantTTL(variant: CatalogVariant): number {
  return VARIANT_TTL[variant] || serverConfig.cache.ttl;
}

interface CatalogRequest {
  contentType: ContentType;
  variant: CatalogVariant;
  catalogId: string;
}

// =============================================================================
// In-Flight Generation Tracking (with cleanup)
// =============================================================================

// Track in-progress catalog generations by cache key
const inFlightGenerations = new Map<string, Promise<StremioCatalog>>();

// Track when generations started (for timeout cleanup)
const generationStartTimes = new Map<string, number>();

// Maximum time a generation can be in-flight before cleanup (90 seconds)
const GENERATION_TIMEOUT_MS = 90 * 1000;

// Cleanup stale generations periodically (every 60 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [key, startTime] of generationStartTimes.entries()) {
    if (now - startTime > GENERATION_TIMEOUT_MS) {
      inFlightGenerations.delete(key);
      generationStartTimes.delete(key);
      logger.warn('Cleaned up stale in-flight generation', { key });
    }
  }
}, 60 * 1000);

// =============================================================================
// AI Request Timeout
// =============================================================================

const AI_REQUEST_TIMEOUT_MS = 60 * 1000; // 60 seconds per catalog

/**
 * Wrap a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)),
  ]);
}

// =============================================================================
// Catalog Key Helper
// =============================================================================

/**
 * Generate the catalog key used for caching and logging
 */
function getCatalogKey(contentType: ContentType, variant: CatalogVariant): string {
  const typeKey = contentType === 'movie' ? 'movies' : 'series';
  return `${typeKey}-${variant}`;
}

// =============================================================================
// Variant Prompt Suffixes (from generator.ts pattern)
// =============================================================================

/**
 * Get specialized prompt suffix for catalog variant
 */
function getVariantPromptSuffix(variant: CatalogVariant, contentType: ContentType): string {
  const type = contentType === 'movie' ? 'movies' : 'series';

  switch (variant) {
    case 'main':
      return ''; // No special suffix for main catalog

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
- AVOID heavy drama, horror, intense thrillers, or sad endings`;

    case 'greats':
      return `
SPECIAL FOCUS: "⭐ All-Time Greats"
- Essential classics and masterpieces in cinema/television
- Award-winning, critically acclaimed ${type}
- Highly influential works that shaped the medium
- IMDb Top 250, Oscar/Emmy winners, Criterion Collection picks
- Timeless ${type} that remain culturally significant
- The absolute BEST ${type} of all time`;

    case 'binge':
      return `
SPECIAL FOCUS: "📺 Binge-Worthy Series"
- HIGHLY ADDICTIVE series with strong hooks
- Cliffhangers and compelling story arcs
- Multiple seasons available for marathon watching
- Excellent pacing that makes you want "just one more episode"
- Strong character development and plot progression
- Series with loyal fanbases and high completion rates`;

    case 'easy':
      return `
SPECIAL FOCUS: "☕ Easy Watching"
- Light, relaxing series for casual viewing
- Low-stakes, feel-good content
- Sitcoms, procedurals, anthology series
- Perfect for background viewing or winding down
- No heavy plot, easy to follow
- Comfortable, familiar formats`;

    default:
      return '';
  }
}

// =============================================================================
// Response Parsing (simplified - individual responses)
// =============================================================================

// =============================================================================
// Cinemeta Resolution
// =============================================================================

/**
 * Resolve recommendations to Stremio metas via Cinemeta
 */
async function resolveToMetas(
  recommendations: GeminiRecommendation[],
  contentType: ContentType,
  showExplanation: boolean
): Promise<StremioMeta[]> {
  const metas: StremioMeta[] = [];

  // Look up all titles in parallel
  const lookupPromises = recommendations.map((rec) =>
    lookupTitle(rec.title, rec.year, contentType).then((result) => ({ rec, result }))
  );

  const results = await Promise.all(lookupPromises);

  for (const { rec, result } of results) {
    if (result?.type !== contentType) continue;

    const meta: StremioMeta = {
      id: result.imdbId,
      type: result.type,
      name: result.title,
      poster: result.poster,
    };

    if (result.year) {
      meta.releaseInfo = String(result.year);
    }

    if (showExplanation && rec.explanation) {
      meta.description = rec.explanation;
    }

    metas.push(meta);
  }

  return metas;
}

// =============================================================================
// Catalog Generation
// =============================================================================

/**
 * Generate a single catalog using AI
 */
async function generateSingleCatalog(
  config: UserConfig,
  context: ContextSignals,
  catalog: CatalogRequest,
  itemsPerCatalog: number
): Promise<StremioCatalog> {
  const key = getCatalogKey(catalog.contentType, catalog.variant);

  logger.info('Generating catalog', {
    key,
    contentType: catalog.contentType,
    variant: catalog.variant,
    items: itemsPerCatalog,
  });

  try {
    // Get variant-specific prompt suffix
    const variantSuffix = getVariantPromptSuffix(catalog.variant, catalog.contentType);

    // Create provider using factory (handles connection pooling)
    const aiProvider = createProvider(config);

    // Generate recommendations with timeout protection
    const response = await withTimeout(
      aiProvider.generateRecommendations(
        config,
        context,
        catalog.contentType,
        itemsPerCatalog,
        variantSuffix
      ),
      AI_REQUEST_TIMEOUT_MS,
      `AI request timeout for ${key}`
    );

    // Resolve to Stremio metas via Cinemeta
    const metas = await resolveToMetas(
      response.recommendations,
      catalog.contentType,
      config.showExplanations
    );

    logger.info('Catalog generated', {
      key,
      recommendationsFromAI: response.recommendations.length,
      metasResolved: metas.length,
    });

    return { metas };
  } catch (error) {
    logger.error('Failed to generate catalog', {
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error; // Re-throw to let caller handle
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate a single catalog on-demand
 *
 * When a catalog is requested:
 * 1. Check if it's already cached → return immediately
 * 2. Check if generation is in progress → wait for it
 * 3. Otherwise, generate ONLY the requested catalog
 *
 * This is more cost-effective than batch generation as it only
 * generates what Stremio actually requests.
 */
export async function generateCatalog(
  config: UserConfig,
  contentType: ContentType,
  catalogId: string
): Promise<StremioCatalog> {
  const variant = extractVariant(catalogId);
  const catalogKey = getCatalogKey(contentType, variant);
  const configHash = createConfigHash(config);

  // Generate context for cache key
  const context = await generateContextSignals(config);
  const temporalBucket = getTemporalBucket(context);
  const cacheKey = generateCacheKey(configHash, `${contentType}-${variant}`, temporalBucket);

  // 1. Check cache first
  const cache = getCache();
  const cached = await cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    logger.info('Returning cached catalog', {
      catalogKey,
      age: Math.round((Date.now() - cached.generatedAt) / 1000),
    });
    return cached.catalog;
  }

  // 2. Check if generation is already in progress for this specific catalog
  let generationPromise = inFlightGenerations.get(cacheKey);

  if (!generationPromise) {
    // 3. Start new generation for just this catalog
    logger.info('Starting catalog generation', { catalogKey });

    // Track start time for timeout cleanup
    generationStartTimes.set(cacheKey, Date.now());

    const catalogRequest: CatalogRequest = {
      contentType,
      variant,
      catalogId,
    };

    const itemsPerCatalog = config.catalogSize || 20;

    generationPromise = generateSingleCatalog(config, context, catalogRequest, itemsPerCatalog)
      .then(async (catalog) => {
        // Cache the result with variant-specific TTL
        const variantTtl = getVariantTTL(variant);
        const now = Date.now();
        const ttlMs = variantTtl * 1000;

        const cachedCatalog: CachedCatalog = {
          catalog,
          generatedAt: now,
          expiresAt: now + ttlMs,
          configHash,
        };

        await cache.set(cacheKey, cachedCatalog, variantTtl);

        logger.debug('Cached catalog', {
          catalogKey,
          items: catalog.metas.length,
          ttlSeconds: variantTtl,
        });

        return catalog;
      })
      .finally(() => {
        // Clean up in-flight tracking
        inFlightGenerations.delete(cacheKey);
        generationStartTimes.delete(cacheKey);
      });

    inFlightGenerations.set(cacheKey, generationPromise);
  } else {
    logger.info('Waiting for in-flight generation', { catalogKey });
  }

  try {
    return await generationPromise;
  } catch (error) {
    logger.error('Catalog generation failed', {
      catalogKey,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return stale cache as fallback
    if (cached) {
      logger.warn('Returning stale cache as fallback');
      return cached.catalog;
    }

    return { metas: [] };
  }
}

/**
 * Extract variant from catalog ID
 */
function extractVariant(catalogId: string): CatalogVariant {
  if (catalogId.includes('hidden')) return 'hidden';
  if (catalogId.includes('greats')) return 'greats';
  if (catalogId.includes('comfort')) return 'comfort';
  if (catalogId.includes('surprise')) return 'surprise';
  if (catalogId.includes('binge')) return 'binge';
  if (catalogId.includes('easy')) return 'easy';
  return 'main';
}

/**
 * Check if generation is currently in progress for a config
 */
export function isGenerationInProgress(configHash: string): boolean {
  for (const key of inFlightGenerations.keys()) {
    if (key.startsWith(configHash)) return true;
  }
  return false;
}
