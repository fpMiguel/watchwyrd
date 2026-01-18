/**
 * Watchwyrd - Search Prompts
 *
 * Natural language search prompt builder.
 * Lets the AI handle intent detection, typo correction,
 * mood interpretation, and constraint extraction.
 */

import type { ContextSignals, ContentType, UserConfig } from '../types/index.js';
import { buildContextBlock } from './context.js';

// Types

export interface SearchPromptOptions {
  query: string;
  context: ContextSignals;
  config: UserConfig;
  contentType: ContentType;
  count: number;
}

// Search Prompt Builder

/**
 * Build a natural language search prompt for a specific content type
 *
 * Key design decisions:
 * - Returns only the requested content type for better results
 * - AI handles all interpretation (typos, mood, comparisons, exclusions)
 * - Context signals are included for relevance enhancement
 * - Minimal constraints on AI - let it use its intelligence
 */
export function buildSearchPrompt(options: SearchPromptOptions): string {
  const { query, context, config, contentType, count } = options;
  const contextBlock = buildContextBlock(context);
  const type = contentType === 'movie' ? 'movies' : 'TV series';
  const typeEmphasis =
    contentType === 'movie'
      ? 'Only movies/films - NO TV shows or series'
      : 'Only TV series/shows with episodes - NO movies or films';

  let prompt = `USER SEARCH: "${query}"

TYPE: ${typeEmphasis}

CURRENT CONTEXT:
${contextBlock}

INSTRUCTIONS:
Interpret the search query naturally and return ${count} relevant ${type}.

Handle automatically:
- Typos and misspellings (e.g., "scfi" → sci-fi)
- Mood-based requests (e.g., "something relaxing" → calm, slow-paced content)
- Comparisons (e.g., "like Inception" → similar mind-bending films)
- Exclusions (e.g., "horror but not gory" → psychological horror)
- Era constraints (e.g., "90s action" → 1990-1999)
- Quality descriptors (e.g., "hidden gems" → lesser-known but highly rated)
- Vague requests (e.g., "something good" → use context to guide choices)

Consider the current context when relevant - the user might want content that fits their current moment.`;

  if (config.excludedGenres.length > 0) {
    prompt += `\n\nNEVER include ${config.excludedGenres.join(', ')} content regardless of the search query.`;
  }

  prompt += `\n\nReturn JSON: {"items":[{"title":"...","year":...}]}`;

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
