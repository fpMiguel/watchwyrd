/**
 * Watchwyrd - Catalog Prompts
 *
 * Prompt builders for catalog variants (For Now, Random).
 * Each variant has a specific prompt optimized for its purpose.
 */

import type { ContextSignals, ContentType, UserConfig } from '../types/index.js';
import { buildContextBlock } from './context.js';

// Types

export type CatalogVariant = 'fornow' | 'random';

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
 * Build the "Random" catalog prompt
 * Surprising, unexpected recommendations for discovery
 */
function buildRandomPrompt(options: CatalogPromptOptions): string {
  const { contentType, count, genre, config } = options;
  const type = contentType === 'movie' ? 'movies' : 'series';

  let prompt = `Recommend ${count} UNEXPECTED ${type} the user would never find on their own.

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
    case 'random':
      return buildRandomPrompt(options);
    default:
      return buildForNowPrompt(options);
  }
}

/**
 * All available catalog variants
 */
export const CATALOG_VARIANTS: CatalogVariant[] = ['fornow', 'random'];
