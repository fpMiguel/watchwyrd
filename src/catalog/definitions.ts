/**
 * Watchwyrd - Catalog Definitions
 *
 * Simple, context-aware catalog system:
 * - "For Now": AI recommendations using all available context
 * - "Random": Surprise picks for discovery
 *
 * Both catalogs support genre filtering in Stremio's Discover screen.
 */

import type { ContentType, ContextSignals } from '../types/index.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Catalog variant identifiers
 */
export type CatalogVariant = 'fornow' | 'random';

/**
 * Catalog definition with all metadata
 */
export interface CatalogDefinition {
  /** Unique variant identifier */
  variant: CatalogVariant;

  /** Display name with emoji */
  name: string;

  /** Short description for UI */
  description: string;

  /** Applicable content types */
  types: ContentType[];

  /** Cache TTL in seconds */
  ttlSeconds: number;

  /** Prompt builder function */
  buildPrompt: (context: ContextSignals, contentType: ContentType, genre?: string) => string;
}

// =============================================================================
// Context Builders (DRY)
// =============================================================================

function buildContextBlock(context: ContextSignals): string {
  const parts: string[] = [];

  // Time context
  if (context.timeOfDay) {
    parts.push(`Time: ${context.timeOfDay} (${context.dayType})`);
  }

  // Weather
  if (context.weather) {
    parts.push(`Weather: ${context.weather.condition}, ${context.weather.temperature}°C`);
  }

  return parts.length > 0 ? parts.join('\n') : '';
}

// =============================================================================
// Catalog Definitions
// =============================================================================

export const CATALOG_DEFINITIONS: CatalogDefinition[] = [
  {
    variant: 'fornow',
    name: '✨ For Now',
    description: 'AI picks based on time, weather, and more',
    types: ['movie', 'series'],
    ttlSeconds: 60 * 60, // 1 hour
    buildPrompt: (context, contentType, genre) => {
      const type = contentType === 'movie' ? 'movies' : 'series';
      const contextBlock = buildContextBlock(context);

      let prompt = `Recommend ${type} perfect for RIGHT NOW.

CURRENT CONTEXT:
${contextBlock || 'No specific context available.'}

INSTRUCTIONS:
- Match recommendations to the current context above
- Consider mood appropriate for ${context.timeOfDay || 'this time'} on a ${context.dayType || 'regular day'}
- Ensure variety in your recommendations
- Include both popular and lesser-known titles
- Prioritize quality and rewatchability`;

      if (genre) {
        prompt += `\n\nGENRE FILTER: Only recommend ${genre} ${type}.`;
      }

      return prompt;
    },
  },

  {
    variant: 'random',
    name: '🎲 Random',
    description: 'Surprise picks to expand your horizons',
    types: ['movie', 'series'],
    ttlSeconds: 60 * 60, // 1 hour
    buildPrompt: (_, contentType, genre) => {
      const type = contentType === 'movie' ? 'movies' : 'series';

      let prompt = `Recommend UNEXPECTED ${type} the user would never find on their own.

INSTRUCTIONS:
- Be ADVENTUROUS and unpredictable
- Include hidden gems, cult classics, international titles
- Mix genres and styles creatively
- Recommend things outside typical comfort zones
- Include experimental, arthouse, and unique premises
- Prioritize discovery over mainstream appeal
- No obvious blockbusters or widely-known Hollywood hits`;

      if (genre) {
        prompt += `\n\nGENRE FILTER: Only recommend ${genre} ${type} - but still be surprising within that genre.`;
      }

      return prompt;
    },
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get catalog definition by variant
 */
export function getCatalogDefinition(variant: CatalogVariant): CatalogDefinition | undefined {
  return CATALOG_DEFINITIONS.find((c) => c.variant === variant);
}

/**
 * Get all catalog definitions for a content type
 */
export function getCatalogsForType(contentType: ContentType): CatalogDefinition[] {
  return CATALOG_DEFINITIONS.filter((c) => c.types.includes(contentType));
}

/**
 * Build the complete prompt for a catalog
 */
export function buildCatalogPrompt(
  variant: CatalogVariant,
  context: ContextSignals,
  contentType: ContentType,
  genre?: string
): string {
  const definition = getCatalogDefinition(variant);
  if (!definition) {
    return '';
  }
  return definition.buildPrompt(context, contentType, genre);
}

/**
 * Get TTL for a catalog variant
 */
export function getCatalogTTL(variant: CatalogVariant): number {
  const definition = getCatalogDefinition(variant);
  return definition?.ttlSeconds ?? 60 * 60; // Default 1 hour
}

/**
 * All available variants
 */
export const ALL_VARIANTS: CatalogVariant[] = CATALOG_DEFINITIONS.map((c) => c.variant);
