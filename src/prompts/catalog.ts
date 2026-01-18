/**
 * Watchwyrd - Catalog Prompts
 *
 * Prompt builders for catalog variants (For Now, Discover).
 * Each variant has a specific prompt optimized for its purpose.
 */

import type { ContextSignals, ContentType, UserConfig } from '../types/index.js';
import { buildContextBlock } from './context.js';

// Types

export type CatalogVariant = 'fornow' | 'discover';

export interface CatalogPromptOptions {
  variant: CatalogVariant;
  context: ContextSignals;
  contentType: ContentType;
  count: number;
  genre?: string;
  config: UserConfig;
}

// Prompt Builders

/**
 * Build the "For Now" catalog prompt
 * Context-aware recommendations for the current moment
 */
function buildForNowPrompt(options: CatalogPromptOptions): string {
  const { context, contentType, count, genre, config } = options;
  const type = contentType === 'movie' ? 'movies' : 'series';
  const contextBlock = buildContextBlock(context);

  let prompt = `Recommend ${count} ${type} perfect for RIGHT NOW.

CURRENT CONTEXT:
${contextBlock}

INSTRUCTIONS:
- Match recommendations to the current context above
- Consider mood appropriate for ${context.timeOfDay || 'this time'} on a ${context.dayType || 'regular day'}
- Include a mix of popular titles and lesser-known gems
- Prioritize quality and rewatchability
- Ensure variety in tone and style`;

  if (genre) {
    prompt += `\n\nGENRE FILTER: Only recommend ${genre} ${type}.`;
  }

  if (config.excludedGenres.length > 0) {
    prompt += `\n\nEXCLUDE: Never recommend ${config.excludedGenres.join(', ')} content.`;
  }

  prompt += buildOutputInstruction(contentType, config.showExplanations);

  return prompt;
}

/**
 * Build the "Discover" catalog prompt
 * Diverse mix for discovery - something for everyone
 * Note: Uses higher API temperature (1.2) for variety instead of prompt-based seed
 */
function buildDiscoverPrompt(options: CatalogPromptOptions): string {
  const { contentType, count, genre, config } = options;
  const type = contentType === 'movie' ? 'movies' : 'series';

  let prompt = `Recommend ${count} diverse ${type} with something for everyone.

DIVERSITY REQUIREMENTS (aim for this mix):
- 2-3 hidden gems: underseen titles with high ratings, overlooked by mainstream
- 2-3 popular crowd-pleasers: beloved titles most people enjoy
- 1-2 cult classics: titles with devoted fan followings
- 1-2 classics/older titles: from before 2000, timeless quality
- 1-2 recent releases: from the last 2-3 years
- 1-2 international: non-English language gems
- 1 wild card: something unexpected, experimental, or niche

INSTRUCTIONS:
- Vary decades: include old (pre-1990), middle (1990-2010), and modern (2010+)
- Vary tone: mix light/fun with serious/deep
- Vary pacing: include both slow burns and fast-paced
- Include both critically acclaimed AND audience favorites
- Balance artsy/indie with accessible/mainstream
- Each recommendation should feel distinct from the others`;

  if (genre) {
    prompt += `\n\nGENRE FILTER: Only recommend ${genre} ${type} - but still be surprising within that genre.`;
  }

  if (config.excludedGenres.length > 0) {
    prompt += `\n\nEXCLUDE: Never recommend ${config.excludedGenres.join(', ')} content.`;
  }

  prompt += buildOutputInstruction(contentType, config.showExplanations);

  return prompt;
}

/**
 * Build the output format instruction
 */
function buildOutputInstruction(contentType: ContentType, showExplanations: boolean): string {
  const typeEmphasis =
    contentType === 'movie'
      ? 'Only movies/films - NO TV shows or series'
      : 'Only TV series/shows with episodes - NO movies or films';

  let instruction = `\n\nTYPE: ${typeEmphasis}`;
  instruction += `\n\nReturn JSON: {"items":[{"title":"...","year":...${showExplanations ? ',"reason":"..."' : ''}}]}`;

  if (!showExplanations) {
    instruction += `\nDo NOT include "reason" field.`;
  }

  return instruction;
}

// Public API

/**
 * Build a catalog prompt based on variant
 */
export function buildCatalogPrompt(options: CatalogPromptOptions): string {
  switch (options.variant) {
    case 'fornow':
      return buildForNowPrompt(options);
    case 'discover':
      return buildDiscoverPrompt(options);
    default:
      return buildForNowPrompt(options);
  }
}

/**
 * All available catalog variants
 */
export const CATALOG_VARIANTS: CatalogVariant[] = ['fornow', 'discover'];
