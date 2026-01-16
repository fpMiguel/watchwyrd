/**
 * Catalog Generator - Generates AI-powered catalogs on-demand with caching.
 *
 * Each catalog request generates only the requested catalog, caches it individually,
 * and concurrent requests for the same catalog share a single generation.
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
import { logger } from '../utils/logger.js';
import { lookupTitles } from '../services/cinemeta.js';
import { enhancePosterUrl } from '../services/rpdb.js';
import { buildCatalogPrompt, type CatalogVariant, CATALOG_VARIANTS } from '../prompts/index.js';
import { getCatalogTTL } from './definitions.js';

export type { CatalogVariant } from '../prompts/index.js';

const ALL_VARIANTS = CATALOG_VARIANTS;

interface CatalogRequest {
  contentType: ContentType;
  variant: CatalogVariant;
  catalogId: string;
  genre?: string;
}

// In-flight generation tracking
const inFlightGenerations = new Map<string, Promise<StremioCatalog>>();
const generationStartTimes = new Map<string, number>();
const GENERATION_TIMEOUT_MS = 200 * 1000;
const DEFAULT_REQUEST_TIMEOUT_SECS = 30;

// Cleanup stale generations
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)),
  ]);
}

function createErrorCatalog(error: Error, catalogKey: string): StremioCatalog {
  const errorMessage = error.message.toLowerCase();

  let title = '⚠️ Temporarily Unavailable';
  let description =
    'AI recommendations are temporarily unavailable. Please try again in a few minutes.';

  if (
    errorMessage.includes('rate') ||
    errorMessage.includes('quota') ||
    errorMessage.includes('429')
  ) {
    title = '⏳ Rate Limited';
    description =
      'Too many requests. The AI service is cooling down. Please wait 1-2 minutes and refresh.';
  } else if (errorMessage.includes('timeout')) {
    title = '⏱️ Request Timeout';
    description =
      'The AI service took too long to respond. This usually resolves quickly - please try again.';
  } else if (
    errorMessage.includes('api key') ||
    errorMessage.includes('401') ||
    errorMessage.includes('invalid')
  ) {
    title = '🔑 API Key Issue';
    description =
      'There may be an issue with your API key. Please check your configuration at /configure.';
  } else if (
    errorMessage.includes('network') ||
    errorMessage.includes('enotfound') ||
    errorMessage.includes('econnrefused')
  ) {
    title = '🌐 Connection Error';
    description = 'Could not connect to the AI service. Please check your internet connection.';
  }

  logger.debug('Created error catalog', { catalogKey, title });

  return {
    metas: [
      {
        id: `error-${catalogKey}`,
        type: 'movie',
        name: title,
        description,
        poster: '',
        background: '',
        genres: [],
        releaseInfo: '',
      },
    ],
  };
}

function getCatalogKey(contentType: ContentType, variant: CatalogVariant, genre?: string): string {
  const typeKey = contentType === 'movie' ? 'movies' : 'series';
  return genre ? `${typeKey}-${variant}-${genre}` : `${typeKey}-${variant}`;
}

async function resolveToMetas(
  recommendations: GeminiRecommendation[],
  contentType: ContentType,
  showExplanation: boolean,
  rpdbApiKey?: string
): Promise<StremioMeta[]> {
  const metas: StremioMeta[] = [];

  // Build lookup items for batch processing
  const lookupItems = recommendations.map((rec) => ({
    title: rec.title,
    year: rec.year,
    type: contentType,
  }));

  // Batch lookup all titles (handles caching, connection pooling internally)
  const lookupResults = await lookupTitles(lookupItems);

  for (const rec of recommendations) {
    const result = lookupResults.get(rec.title);
    if (result?.type !== contentType) continue;

    // Enhance poster with RPDB if configured
    const poster = enhancePosterUrl(result.poster, result.imdbId, rpdbApiKey);

    const meta: StremioMeta = {
      id: result.imdbId,
      type: result.type,
      name: result.title,
      poster,
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

async function generateSingleCatalog(
  config: UserConfig,
  context: ContextSignals,
  catalog: CatalogRequest,
  itemsPerCatalog: number
): Promise<StremioCatalog> {
  const key = getCatalogKey(catalog.contentType, catalog.variant, catalog.genre);

  logger.info('Generating catalog', {
    key,
    contentType: catalog.contentType,
    variant: catalog.variant,
    genre: catalog.genre,
    items: itemsPerCatalog,
  });

  try {
    // Build catalog-specific prompt using new options interface
    const catalogPrompt = buildCatalogPrompt({
      variant: catalog.variant,
      context,
      contentType: catalog.contentType,
      count: itemsPerCatalog,
      genre: catalog.genre,
      config,
    });

    // Create provider using factory (handles connection pooling)
    const aiProvider = createProvider(config);

    // Use configurable timeout (default 30s, covers AI + metadata fetching)
    const timeoutSecs = config.requestTimeout || DEFAULT_REQUEST_TIMEOUT_SECS;
    const timeoutMs = timeoutSecs * 1000;

    // Wrap entire generation (AI + metadata) with timeout
    const generateWithTimeout = async (): Promise<StremioCatalog> => {
      // Generate recommendations from AI
      const response = await aiProvider.generateRecommendations(
        config,
        context,
        catalog.contentType,
        itemsPerCatalog,
        catalogPrompt
      );

      // Resolve to Stremio metas via Cinemeta (with optional RPDB enhancement)
      const metas = await resolveToMetas(
        response.recommendations,
        catalog.contentType,
        config.showExplanations,
        config.rpdbApiKey
      );

      logger.info('Catalog generated', {
        key,
        recommendationsFromAI: response.recommendations.length,
        metasResolved: metas.length,
      });

      return { metas };
    };

    return await withTimeout(
      generateWithTimeout(),
      timeoutMs,
      `Catalog request timeout (${timeoutSecs}s) for ${key}`
    );
  } catch (error) {
    logger.error('Failed to generate catalog', {
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error; // Re-throw to let caller handle
  }
}

/**
 * Generate a catalog on-demand. Checks cache first, shares in-flight requests.
 */
export async function generateCatalog(
  config: UserConfig,
  contentType: ContentType,
  catalogId: string,
  genre?: string
): Promise<StremioCatalog> {
  const variant = extractVariant(catalogId);
  const catalogKey = getCatalogKey(contentType, variant, genre);
  const configHash = createConfigHash(config);

  // Generate context for cache key
  const context = await generateContextSignals(config);
  const temporalBucket = getTemporalBucket(context);
  const cacheKeyBase = genre ? `${contentType}-${variant}-${genre}` : `${contentType}-${variant}`;
  const cacheKey = generateCacheKey(configHash, cacheKeyBase, temporalBucket);

  // Check cache
  const cache = getCache();
  const cached = await cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    logger.info('Returning cached catalog', {
      catalogKey,
      age: Math.round((Date.now() - cached.generatedAt) / 1000),
    });
    return cached.catalog;
  }

  // Check for in-flight generation
  let generationPromise = inFlightGenerations.get(cacheKey);

  if (!generationPromise) {
    logger.info('Starting catalog generation', { catalogKey, genre });
    generationStartTimes.set(cacheKey, Date.now());

    const catalogRequest: CatalogRequest = {
      contentType,
      variant,
      catalogId,
      genre,
    };

    const itemsPerCatalog = config.catalogSize || 20;

    generationPromise = generateSingleCatalog(config, context, catalogRequest, itemsPerCatalog)
      .then(async (catalog) => {
        // Cache the result with variant-specific TTL from definitions
        const variantTtl = getCatalogTTL(variant);
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
    const err = error instanceof Error ? error : new Error(String(error));

    logger.error('Catalog generation failed', {
      catalogKey,
      error: err.message,
    });

    // Return stale cache as fallback if available
    if (cached) {
      logger.warn('Returning stale cache as fallback');
      return cached.catalog;
    }

    // Return user-friendly error catalog
    return createErrorCatalog(err, catalogKey);
  }
}

function extractVariant(catalogId: string): CatalogVariant {
  for (const variant of ALL_VARIANTS) {
    if (catalogId.includes(variant)) return variant;
  }
  return 'fornow';
}

export function isGenerationInProgress(configHash: string): boolean {
  for (const key of inFlightGenerations.keys()) {
    if (key.startsWith(configHash)) return true;
  }
  return false;
}
