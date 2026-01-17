/**
 * Watchwyrd - Shared Prompt Builder
 *
 * Common prompt construction logic used by all AI providers.
 * Ensures consistent behavior across Gemini and Perplexity.
 */

import type { UserConfig, ContextSignals, ContentType } from '../types/index.js';

// =============================================================================
// System Prompt
// =============================================================================

/**
 * Shared system prompt for all AI providers
 */
export const SYSTEM_PROMPT = `You are a movie and TV recommendation engine. Return ONLY valid JSON.

OUTPUT FORMAT (no markdown, no explanation):
{"items":[{"title":"Exact Title","year":2020,"reason":"Why this fits"}]}

RULES:
1. Use EXACT titles as shown on IMDb (e.g., "The Shawshank Redemption" not "Shawshank")
2. Year must be accurate (for series, use first air date year)
3. Movies include theatrical, streaming originals, and direct-to-video. Series are TV shows with episodes.
4. Never mix movies and series - return only the requested type`;

// =============================================================================
// User Prompt Construction
// =============================================================================

/**
 * Build context string from signals
 */
function buildContext(context: ContextSignals): string {
  const parts: string[] = [];

  parts.push(`Time: ${context.timeOfDay} (${context.localTime})`);
  parts.push(`Day: ${context.dayOfWeek} (${context.dayType})`);

  if (context.weather) {
    parts.push(
      `Weather: ${context.weather.description || context.weather.condition}, ${context.weather.temperature}°C`
    );
  }

  return parts.join(', ');
}

/**
 * Build genre preference string
 */
function buildGenrePrefs(config: UserConfig): string {
  // Only excluded genres are used now
  if (config.excludedGenres.length > 0) {
    return `NEVER include: ${config.excludedGenres.join(', ')}`;
  }
  return 'Any genre';
}

/**
 * Build the user prompt with configuration and context
 */
export function buildUserPrompt(
  config: UserConfig,
  context: ContextSignals,
  contentType: ContentType,
  count: number,
  variantSuffix?: string
): string {
  const type = contentType === 'movie' ? 'movies' : 'TV series';
  const typeEmphasis =
    contentType === 'movie'
      ? 'Only movies/films - NO TV shows or series'
      : 'Only TV series/shows with episodes - NO movies or films';

  const includeReason = config.showExplanations;

  let prompt = `Recommend ${count} ${type}.

TYPE: ${typeEmphasis}
GENRES: ${buildGenrePrefs(config)}
CONTEXT: ${buildContext(context)}`;

  if (variantSuffix) {
    prompt += `\n\n${variantSuffix}`;
  }

  prompt += `\n\nReturn JSON: {"items":[{"title":"...","year":...${includeReason ? ',"reason":"..."' : ''}}]}`;

  if (!includeReason) {
    prompt += `\nDo NOT include "reason" field.`;
  }

  return prompt;
}
