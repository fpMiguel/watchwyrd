/**
 * Watchwyrd - RPDB (RatingPosterDB) Service
 *
 * Optional integration for enhanced posters with rating overlays.
 * Posters include IMDb, Rotten Tomatoes, and Metacritic ratings.
 *
 * Free tier key for development: t0-free-rpdb
 * Get your own key at: https://ratingposterdb.com/
 */

import { logger } from '../utils/logger.js';

// =============================================================================
// Types
// =============================================================================

type PosterTier = 'poster-default' | 'poster-w500' | 'poster-w780';

interface RPDBOptions {
  /** Poster size tier */
  tier?: PosterTier;
  /** Fallback URL if RPDB fails */
  fallback?: string;
}

// =============================================================================
// Constants
// =============================================================================

const RPDB_BASE = 'https://api.ratingposterdb.com';

// Free tier key for local development
export const RPDB_FREE_KEY = 't0-free-rpdb';

// =============================================================================
// Poster URL Generation
// =============================================================================

/**
 * Generate RPDB poster URL for an IMDb ID
 *
 * @param apiKey - RPDB API key
 * @param imdbId - IMDb ID (e.g., "tt0111161")
 * @param options - Optional configuration
 * @returns RPDB poster URL
 */
export function getRPDBPosterUrl(
  apiKey: string,
  imdbId: string,
  options: RPDBOptions = {}
): string {
  const tier = options.tier || 'poster-default';

  // Validate IMDb ID format
  if (!imdbId.startsWith('tt')) {
    logger.debug('Invalid IMDb ID for RPDB', { imdbId });
    return options.fallback || '';
  }

  return `${RPDB_BASE}/${apiKey}/imdb/${tier}/${imdbId}.jpg`;
}

/**
 * Replace poster URL with RPDB version if API key is configured
 *
 * @param originalPoster - Original poster URL
 * @param imdbId - IMDb ID
 * @param apiKey - RPDB API key (optional)
 * @returns RPDB poster URL or original
 */
export function enhancePosterUrl(
  originalPoster: string | undefined,
  imdbId: string,
  apiKey?: string
): string {
  // If no API key, return original
  if (!apiKey) {
    return originalPoster || '';
  }

  // Generate RPDB URL with original as fallback
  return getRPDBPosterUrl(apiKey, imdbId, {
    tier: 'poster-default',
    fallback: originalPoster,
  });
}

/**
 * Check if RPDB is enabled (API key is configured)
 */
export function isRPDBEnabled(apiKey?: string): boolean {
  return !!apiKey && apiKey.length > 0;
}

/**
 * Validate RPDB API key format
 * Valid formats: t0-xxx, t1-xxx, t2-xxx (tier prefixes)
 */
export function isValidRPDBKey(apiKey: string): boolean {
  if (!apiKey) return false;

  // Free tier key
  if (apiKey === RPDB_FREE_KEY) return true;

  // Standard key format: tier-prefix followed by alphanumeric
  return /^t[0-2]-[a-zA-Z0-9]+$/.test(apiKey);
}
