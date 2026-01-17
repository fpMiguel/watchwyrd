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
export const SYSTEM_PROMPT = `You are Watchwyrd, a cinematic oracle that divines personalized movie and TV series recommendations. Generate recommendations as structured JSON.

CRITICAL RULES:
1. Return ONLY valid JSON matching the schema - no markdown, no explanation, no code blocks
2. Include exactly the requested number of recommendations
3. Provide the EXACT official title as it appears on IMDb/TMDB
4. When contentType is "movie", ONLY recommend movies/films - NEVER TV series
5. When contentType is "series", ONLY recommend TV series/shows - NEVER movies
6. Never exceed the user's maxRating
7. Never include excludedGenres
8. Weight genres according to genreWeights (higher = more likely)
9. Consider the current temporal context (time, day, season, holiday)
10. Each explanation must be 1-2 sentences, specific to the item and context
11. Ensure genre diversity unless user preferences are narrow
12. Confidence scores should reflect how well the item matches preferences

TITLE ACCURACY:
- Use the exact official title (e.g., "The Shawshank Redemption" not "Shawshank")
- Include the correct release year
- For series, use the first air date year

OUTPUT SCHEMA:
{
  "recommendations": [
    {
      "title": "string (exact title as on IMDb/TMDB)",
      "year": number (release year - MUST be accurate),
      "genres": ["string"],
      "runtime": number (minutes, for series use avg episode length),
      "explanation": "string (1-2 sentences)",
      "contextTags": ["string"],
      "confidenceScore": number (0.0-1.0)
    }
  ],
  "metadata": {
    "generatedAt": "ISO 8601 timestamp",
    "searchUsed": boolean
  }
}

VALID CONTEXT TAGS:
- Temporal: morning, afternoon, evening, latenight, weekday, weekend
- Seasonal: spring, summer, fall, winter, holiday
- Recency: classic, modern, recent_release, new_release
- Match quality: high_genre_match, genre_discovery
- Popularity: mainstream, cult_favorite, hidden_gem
- Watch style: binge_worthy, casual_watch`;

// =============================================================================
// User Prompt Construction
// =============================================================================

/**
 * Build context data from signals
 */
function buildContextData(context: ContextSignals): Record<string, unknown> {
  const contextData: Record<string, unknown> = {
    localTime: context.localTime,
    timeOfDay: context.timeOfDay,
    dayOfWeek: context.dayOfWeek,
    dayType: context.dayType,
    date: context.date,
    season: context.season,
    nearbyHoliday: context.nearbyHoliday,
  };

  if (context.weather) {
    contextData['weather'] = {
      condition: context.weather.condition,
      temperature: context.weather.temperature,
      description: context.weather.description,
    };
  }

  return contextData;
}

/**
 * Build preferences object from user config
 */
function buildPreferences(config: UserConfig) {
  return {
    languages: config.preferredLanguages,
    maxRating: config.maxRating,
    genreWeights: config.genreWeights,
    excludedGenres: config.excludedGenres,
    noveltyBias: config.noveltyBias,
    popularityBias: config.popularityBias,
    preferredEras: config.preferredEras,
    runtimePreference: config.runtimePreference,
  };
}

/**
 * Build weather guidance if weather context is available
 */
function buildWeatherGuidance(context: ContextSignals): string {
  if (!context.weather) return '';

  return `

WEATHER CONTEXT:
The user's current weather is ${context.weather.description || context.weather.condition} (${context.weather.temperature}°C).
Consider this when selecting recommendations:
- Rainy/stormy weather: cozy dramas, mysteries, thrillers
- Cold weather: warm feel-good content, family films
- Hot weather: light entertainment, action for indoor fun
- Clear evening: romantic or atmospheric choices`;
}

/**
 * Build the user prompt with configuration and context
 *
 * @param config - User configuration
 * @param context - Context signals
 * @param contentType - Content type to generate
 * @param count - Number of recommendations
 * @param variantSuffix - Optional variant-specific instructions
 * @returns Complete user prompt string
 */
export function buildUserPrompt(
  config: UserConfig,
  context: ContextSignals,
  contentType: ContentType,
  count: number,
  variantSuffix?: string
): string {
  const contentTypeLabel =
    contentType === 'movie' ? 'MOVIES (films)' : 'TV SERIES (television shows, NOT movies)';

  const request = {
    preferences: buildPreferences(config),
    context: buildContextData(context),
    request: {
      contentType,
      count,
      includeNewReleases: config.includeNewReleases,
    },
  };

  const weatherGuidance = buildWeatherGuidance(context);
  const variantInstructions = variantSuffix || '';

  return `USER CONFIGURATION:
${JSON.stringify(request, null, 2)}
${weatherGuidance}
${variantInstructions}

IMPORTANT: Generate exactly ${count} ${contentTypeLabel} recommendations.
${contentType === 'series' ? 'Only include TV series/shows - absolutely NO movies or films.' : 'Only include movies/films - absolutely NO TV series.'}
Each recommendation MUST include the exact official title and release year.
Return ONLY the JSON response matching the schema.`;
}
