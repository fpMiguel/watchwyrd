/**
 * Watchwyrd - Search Prompts
 *
 * Natural language search prompt builder.
 * Lets the AI handle intent detection, typo correction,
 * mood interpretation, and constraint extraction.
 */

import type { ContextSignals, UserConfig } from '../types/index.js';
import { buildContextBlock } from './context.js';

// =============================================================================
// Types
// =============================================================================

export interface SearchPromptOptions {
  query: string;
  context: ContextSignals;
  config: UserConfig;
  moviesCount: number;
  seriesCount: number;
}

// =============================================================================
// Search Prompt Builder
// =============================================================================

/**
 * Build a natural language search prompt
 *
 * Key design decisions:
 * - Returns BOTH movies and series (Stremio will display in separate catalogs)
 * - AI handles all interpretation (typos, mood, comparisons, exclusions)
 * - Context signals are included for relevance enhancement
 * - Minimal constraints on AI - let it use its intelligence
 */
export function buildSearchPrompt(options: SearchPromptOptions): string {
  const { query, context, config, moviesCount, seriesCount } = options;
  const contextBlock = buildContextBlock(context);

  let prompt = `USER SEARCH: "${query}"

CURRENT CONTEXT:
${contextBlock}

INSTRUCTIONS:
Interpret the search query naturally and return relevant recommendations.

Handle automatically:
- Typos and misspellings (e.g., "scfi" → sci-fi)
- Mood-based requests (e.g., "something relaxing" → calm, slow-paced content)
- Comparisons (e.g., "like Inception" → similar mind-bending films)
- Exclusions (e.g., "horror but not gory" → psychological horror)
- Era constraints (e.g., "90s action" → 1990-1999)
- Quality descriptors (e.g., "hidden gems" → lesser-known but highly rated)
- Vague requests (e.g., "something good" → use context to guide choices)

Consider the current context when relevant - the user might want content that fits their current moment.

Return ${moviesCount} movies and ${seriesCount} series.
Even if the query seems specific to one type, include both - the user might appreciate related content.`;

  if (config.excludedGenres.length > 0) {
    prompt += `\n\nNEVER include ${config.excludedGenres.join(', ')} content regardless of the search query.`;
  }

  prompt += `\n\nReturn JSON: {"movies":[{"title":"...","year":...}],"series":[{"title":"...","year":...}]}`;

  return prompt;
}

/**
 * Normalize a search query for cache key generation
 * - Lowercase
 * - Remove extra whitespace
 * - Remove punctuation (except essential ones)
 */
export function normalizeSearchQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s'-]/g, '');
}
