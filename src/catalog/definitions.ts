/**
 * Watchwyrd - Catalog Definitions
 *
 * Metadata-only catalog definitions.
 * Prompt logic has been moved to src/prompts/ for better separation of concerns.
 *
 * Catalog types:
 * - "For Now": AI recommendations using all available context
 * - "Random": Surprise picks for discovery
 * - "Search": Natural language search (special - not listed in manifest directly)
 */

import type { ContentType } from '../types/index.js';

// Re-export CatalogVariant from prompts (single source of truth)
export type { CatalogVariant } from '../prompts/index.js';
export { CATALOG_VARIANTS as ALL_VARIANTS } from '../prompts/index.js';

// Types

/**
 * Catalog metadata (no prompt logic - that's in prompts/)
 */
export interface CatalogMetadata {
  /** Unique variant identifier */
  variant: 'fornow' | 'random';

  /** Display name with emoji */
  name: string;

  /** Short description for UI */
  description: string;

  /** Applicable content types */
  types: ContentType[];

  /** Cache TTL in seconds */
  ttlSeconds: number;
}

// Catalog Metadata

export const CATALOG_METADATA: CatalogMetadata[] = [
  {
    variant: 'fornow',
    name: '✨ For Now',
    description: 'AI picks based on time, weather, and more',
    types: ['movie', 'series'],
    ttlSeconds: 60 * 60, // 1 hour
  },
  {
    variant: 'random',
    name: '🎲 Random',
    description: 'Surprise picks to expand your horizons',
    types: ['movie', 'series'],
    ttlSeconds: 60 * 60, // 1 hour
  },
];

/**
 * Search catalog TTL (separate from regular catalogs)
 */
export const SEARCH_TTL_SECONDS = 60 * 60; // 1 hour

// Helper Functions

/**
 * Get catalog metadata by variant
 */
export function getCatalogMetadata(variant: string): CatalogMetadata | undefined {
  return CATALOG_METADATA.find((c) => c.variant === variant);
}

/**
 * Get all catalog metadata for a content type
 */
export function getCatalogsForType(contentType: ContentType): CatalogMetadata[] {
  return CATALOG_METADATA.filter((c) => c.types.includes(contentType));
}

/**
 * Get TTL for a catalog variant
 */
export function getCatalogTTL(variant: string): number {
  const metadata = getCatalogMetadata(variant);
  return metadata?.ttlSeconds ?? 60 * 60; // Default 1 hour
}

// Legacy exports for backwards compatibility during refactoring
export const CATALOG_DEFINITIONS = CATALOG_METADATA;
