/**
 * Watchwyrd - Perplexity AI Client
 *
 * Handles all communication with Perplexity's API.
 * Uses the official Perplexity SDK with structured JSON output.
 * Perplexity excels at finding current/recent content via web search.
 */

import Perplexity from '@perplexity-ai/perplexity_ai';
import type {
  UserConfig,
  ContextSignals,
  ContentType,
  GeminiResponse,
  GeminiRecommendation,
  PerplexityModel,
} from '../types/index.js';
import { logger } from '../utils/logger.js';
import { retry } from '../utils/index.js';

// =============================================================================
// System Prompt
// =============================================================================

const SYSTEM_PROMPT = `You are Watchwyrd, a cinematic oracle that divines personalized movie and TV series recommendations. Generate recommendations as structured JSON.

CRITICAL RULES:
1. Return ONLY valid JSON matching the schema - no markdown, no explanation
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

LEVERAGE YOUR WEB SEARCH:
- Include recent releases and trending content when appropriate
- Find hidden gems that match user preferences
- Verify titles exist before including them`;

// =============================================================================
// JSON Schema for Structured Output
// =============================================================================

const RECOMMENDATION_SCHEMA = {
  type: 'object' as const,
  properties: {
    recommendations: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          title: { type: 'string' as const, description: 'Exact title as on IMDb/TMDB' },
          year: { type: 'number' as const, description: 'Release year' },
          genres: { type: 'array' as const, items: { type: 'string' as const } },
          runtime: { type: 'number' as const, description: 'Runtime in minutes' },
          explanation: { type: 'string' as const, description: '1-2 sentence explanation' },
          contextTags: { type: 'array' as const, items: { type: 'string' as const } },
          confidenceScore: { type: 'number' as const, description: '0.0 to 1.0' },
        },
        required: ['title', 'year', 'genres', 'runtime', 'explanation', 'contextTags', 'confidenceScore'],
      },
    },
    metadata: {
      type: 'object' as const,
      properties: {
        generatedAt: { type: 'string' as const },
        searchUsed: { type: 'boolean' as const },
      },
      required: ['generatedAt', 'searchUsed'],
    },
  },
  required: ['recommendations', 'metadata'],
};

// =============================================================================
// Prompt Construction
// =============================================================================

/**
 * Build the user prompt with configuration and context
 */
function buildUserPrompt(
  config: UserConfig,
  context: ContextSignals,
  contentType: ContentType,
  count: number,
  variantSuffix?: string
): string {
  const contentTypeLabel = contentType === 'movie' ? 'MOVIES (films)' : 'TV SERIES (television shows, NOT movies)';
  
  // Build context object including weather if available
  const contextData: Record<string, unknown> = {
    localTime: context.localTime,
    timeOfDay: context.timeOfDay,
    dayOfWeek: context.dayOfWeek,
    dayType: context.dayType,
    date: context.date,
    season: context.season,
    nearbyHoliday: context.nearbyHoliday,
  };

  // Add weather context if available
  if (context.weather) {
    contextData['weather'] = {
      condition: context.weather.condition,
      temperature: context.weather.temperature,
      description: context.weather.description,
    };
  }

  const request = {
    preferences: {
      languages: config.preferredLanguages,
      maxRating: config.maxRating,
      genreWeights: config.genreWeights,
      excludedGenres: config.excludedGenres,
      noveltyBias: config.noveltyBias,
      popularityBias: config.popularityBias,
      preferredEras: config.preferredEras,
      runtimePreference: config.runtimePreference,
    },
    context: contextData,
    request: {
      contentType,
      count,
      includeNewReleases: config.includeNewReleases,
    },
  };

  // Build weather-specific guidance if weather is available
  let weatherGuidance = '';
  if (context.weather) {
    weatherGuidance = `

WEATHER CONTEXT:
The user's current weather is ${context.weather.description || context.weather.condition} (${context.weather.temperature}°C).
Consider this when selecting recommendations - match the mood to the weather.`;
  }

  // Build variant-specific instructions
  const variantInstructions = variantSuffix || '';

  return `USER CONFIGURATION:
${JSON.stringify(request, null, 2)}
${weatherGuidance}
${variantInstructions}

Generate exactly ${count} ${contentTypeLabel} recommendations.
${contentType === 'series' ? 'Only include TV series/shows - absolutely NO movies.' : 'Only include movies/films - absolutely NO TV series.'}
Each recommendation MUST include the exact official title and release year.
Use your web search to find current trending content and verify titles.`;
}

// =============================================================================
// Response Validation
// =============================================================================

/**
 * Validate and clean Perplexity response
 */
function validateResponse(data: unknown, model: PerplexityModel): GeminiResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response format: expected object');
  }

  const response = data as Record<string, unknown>;

  if (!Array.isArray(response['recommendations'])) {
    throw new Error('Invalid response format: missing recommendations array');
  }

  const recommendations: GeminiRecommendation[] = [];

  for (const item of response['recommendations'] as unknown[]) {
    if (!item || typeof item !== 'object') continue;

    const rec = item as Record<string, unknown>;

    // Title is required
    if (typeof rec['title'] !== 'string' || rec['title'].length === 0) {
      logger.warn('Skipping recommendation with missing title');
      continue;
    }

    // Year is required
    if (typeof rec['year'] !== 'number' || rec['year'] < 1900 || rec['year'] > new Date().getFullYear() + 2) {
      logger.warn('Skipping recommendation with invalid year', { title: rec['title'], year: rec['year'] });
      continue;
    }

    recommendations.push({
      imdbId: '', // Will be populated by Cinemeta lookup
      title: rec['title'],
      year: rec['year'],
      genres: Array.isArray(rec['genres']) ? (rec['genres'] as string[]) : [],
      runtime: typeof rec['runtime'] === 'number' ? rec['runtime'] : 120,
      explanation: typeof rec['explanation'] === 'string' ? rec['explanation'] : '',
      contextTags: Array.isArray(rec['contextTags']) ? (rec['contextTags'] as GeminiRecommendation['contextTags']) : [],
      confidenceScore: typeof rec['confidenceScore'] === 'number'
        ? Math.min(1, Math.max(0, rec['confidenceScore']))
        : 0.5,
    });
  }

  const metadata = response['metadata'] as Record<string, unknown> | undefined;

  return {
    recommendations,
    metadata: {
      generatedAt: typeof metadata?.['generatedAt'] === 'string'
        ? metadata['generatedAt']
        : new Date().toISOString(),
      modelUsed: model,
      providerUsed: 'perplexity',
      searchUsed: typeof metadata?.['searchUsed'] === 'boolean'
        ? metadata['searchUsed']
        : true, // Perplexity always uses search
      totalCandidatesConsidered: recommendations.length,
    },
  };
}

// =============================================================================
// Perplexity Client Class
// =============================================================================

/**
 * Perplexity AI client for generating recommendations
 * Leverages Perplexity's web search for current content discovery
 */
export class PerplexityClient {
  private client: Perplexity;
  private modelName: PerplexityModel;

  constructor(apiKey: string, modelName: PerplexityModel = 'sonar-pro') {
    this.client = new Perplexity({ apiKey });
    this.modelName = modelName;
    logger.info('Perplexity client initialized', { model: modelName });
  }

  /**
   * Generate recommendations for a content type
   */
  async generateRecommendations(
    config: UserConfig,
    context: ContextSignals,
    contentType: ContentType,
    count = 20,
    variantSuffix?: string
  ): Promise<GeminiResponse> {
    const prompt = buildUserPrompt(config, context, contentType, count, variantSuffix);

    logger.debug('Generating recommendations via Perplexity', { contentType, count });

    const response = await retry(
      async () => {
        const completion = await this.client.chat.completions.create({
          model: this.modelName,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              schema: RECOMMENDATION_SCHEMA,
            },
          },
        });

        const content = completion.choices[0]?.message?.content;

        if (!content) {
          throw new Error('Empty response from Perplexity');
        }

        // Handle both string and array content types from the API
        const contentString = typeof content === 'string' 
          ? content 
          : (content as { text?: string }[]).map(c => c.text || '').join('');

        const parsed: unknown = JSON.parse(contentString);
        return validateResponse(parsed, this.modelName);
      },
      { 
        maxAttempts: 3, 
        baseDelay: 2000,
        maxDelay: 60000,
        onRetry: (attempt, delay, error) => {
          logger.warn('Retrying Perplexity API call', {
            attempt,
            delayMs: delay,
            reason: error.message.substring(0, 100),
          });
        },
      }
    );

    logger.info('Recommendations generated via Perplexity', {
      contentType,
      count: response.recommendations.length,
      searchUsed: response.metadata.searchUsed,
    });

    return response;
  }

  /**
   * Validate API key by making a minimal request
   */
  async validateApiKey(): Promise<{ valid: boolean; error?: string }> {
    try {
      const result = await retry(
        async () => {
          return await this.client.chat.completions.create({
            model: this.modelName,
            messages: [
              { role: 'user', content: 'Reply with just: OK' },
            ],
            max_tokens: 10,
          });
        },
        {
          maxAttempts: 2,
          baseDelay: 1000,
          maxDelay: 10000,
        }
      );

      const content = result.choices[0]?.message?.content;
      if (content && content.length > 0) {
        return { valid: true };
      }
      return { valid: false, error: 'Empty response from API - key may be invalid' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Perplexity API key validation failed', { error: errorMessage });
      return { valid: false, error: this.parseApiError(errorMessage) };
    }
  }

  /**
   * Parse Perplexity API error into user-friendly message
   */
  private parseApiError(errorMessage: string): string {
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('invalid')) {
      return 'Invalid API key. Please check your Perplexity API key.';
    }
    if (errorMessage.includes('429') || errorMessage.includes('rate')) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    }
    if (errorMessage.includes('402') || errorMessage.includes('payment') || errorMessage.includes('billing')) {
      return 'Billing issue with your Perplexity account. Please check your subscription.';
    }
    if (errorMessage.includes('503') || errorMessage.includes('unavailable')) {
      return 'Perplexity service is temporarily unavailable. Please try again later.';
    }
    return 'Could not validate API key. Please verify your key and try again.';
  }
}
