/**
 * Watchwyrd - Catalog Definitions
 *
 * Metadata-only catalog definitions.
 * Prompt logic has been moved to src/prompts/ for better separation of concerns.
 *
 * Catalog types:
 * - "For Now": AI recommendations using all available context
 * - "Discover": Diverse mix for discovery
 * - "Search": Natural language search (special - not listed in manifest directly)
 */

import type { ContentType } from '../types/index.js';

// Re-export CatalogVariant from prompts (single source of truth)
export type { CatalogVariant } from '../prompts/index.js';

// Types

/**
 * Catalog variant definition for internal use.
 * Defines display properties and behavior for each catalog variant.
 */
export interface CatalogVariantDefinition {
  /** Unique variant identifier */
  variant: 'fornow' | 'discover';

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

export const CATALOG_VARIANTS: CatalogVariantDefinition[] = [
  {
    variant: 'fornow',
    name: '✨ For Now',
    description: 'AI picks based on time, weather, and more',
    types: ['movie', 'series'],
    ttlSeconds: 60 * 60, // 1 hour
  },
  {
    variant: 'discover',
    name: '🎲 Discover',
    description: 'Diverse mix: gems, classics, cult favorites & more',
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
 * Get catalog variant definition by variant name
 */
export function getCatalogVariant(variant: string): CatalogVariantDefinition | undefined {
  return CATALOG_VARIANTS.find((c) => c.variant === variant);
}

/**
 * Get TTL for a catalog variant
 */
export function getCatalogTTL(variant: string): number {
  const definition = getCatalogVariant(variant);
  return definition?.ttlSeconds ?? 60 * 60; // Default 1 hour
}
