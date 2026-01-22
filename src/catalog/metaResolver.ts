/**
 * Watchwyrd - Meta Resolver
 *
 * Unified utility for resolving AI recommendations to Stremio metas.
 * Consolidates duplicate code from catalogGenerator and searchGenerator.
 *
 * Features:
 * - Batch lookup via Cinemeta
 * - Optional RPDB poster enhancement
 * - Optional explanation display
 */

import type { ContentType, StremioMeta } from '../types/index.js';
import { lookupTitles } from '../services/cinemeta.js';
import { enhancePosterUrl } from '../services/rpdb.js';

/**
 * Recommendation item with optional explanation.
 * Works with both AIRecommendation and SimpleRecommendation.
 */
export interface RecommendationItem {
  title: string;
  year: number;
  explanation?: string;
}

/**
 * Options for meta resolution
 */
export interface ResolveMetasOptions {
  /** Content type for filtering results */
  contentType: ContentType;
  /** Show explanation as description (default: false) */
  showExplanation?: boolean;
  /** RPDB API key for poster enhancement (optional) */
  rpdbApiKey?: string;
}

/**
 * Resolve AI recommendations to Stremio metas.
 *
 * This function:
 * 1. Batch looks up titles via Cinemeta
 * 2. Filters results by content type
 * 3. Optionally enhances posters with RPDB
 * 4. Optionally adds explanations as descriptions
 *
 * @param recommendations - Array of recommendations to resolve
 * @param options - Resolution options
 * @returns Array of Stremio metas
 */
export async function resolveToMetas(
  recommendations: RecommendationItem[],
  options: ResolveMetasOptions
): Promise<StremioMeta[]> {
  const { contentType, showExplanation = false, rpdbApiKey } = options;
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
