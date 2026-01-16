/**
 * Watchwyrd - Gemini API Client
 *
 * Handles all communication with Google's Gemini API.
 * Includes prompt construction, response parsing, and error handling.
 * Relies on retry with API-specified delays for rate limit handling.
 */

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import type {
  UserConfig,
  ContextSignals,
  ContentType,
  GeminiResponse,
  GeminiRecommendation,
  GeminiModel,
} from '../types/index.js';
import { logger } from '../utils/logger.js';
import { retry } from '../utils/index.js';

// =============================================================================
// System Prompt
// =============================================================================

const SYSTEM_PROMPT = `You are Watchwyrd, a cinematic oracle that divines personalized movie and TV series recommendations for Stremio users. Generate recommendations as structured JSON.

CRITICAL RULES:
1. Return ONLY valid JSON matching the schema below - no markdown, no explanation, no code blocks
2. Include exactly the requested number of recommendations
3. Provide the EXACT official title as it appears on IMDb/TMDB
4. When contentType is "movie", ONLY recommend movies/films - NEVER TV series
5. When contentType is "series", ONLY recommend TV series/shows - NEVER movies
6. Never exceed the user's maxRating
7. Never include excludedGenres
8. Weight genres according to genreWeights (higher = more likely to recommend)
9. Consider the current temporal context (time, day, season, holiday)
10. Each explanation must be 1-2 sentences, specific to the item and context
11. Ensure genre diversity unless user preferences are narrow
12. Confidence scores should reflect how well the item matches user preferences

TITLE ACCURACY:
- Use the exact official title (e.g., "The Shawshank Redemption" not "Shawshank Redemption")
- Include the correct release year
- For series, use the first air date year

OUTPUT SCHEMA:
{
  "recommendations": [
    {
      "title": "string (exact title as it appears on IMDb/TMDB)",
      "year": number (release year - MUST be accurate),
      "genres": ["string"],
      "runtime": number (minutes, for series use average episode length),
      "explanation": "string (1-2 sentences explaining why this is recommended)",
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
    weatherGuidance = `\n\nWEATHER CONTEXT:
The user's current weather is ${context.weather.description || context.weather.condition} (${context.weather.temperature}°C).
Consider this when selecting recommendations:
- Rainy/stormy weather: cozy dramas, mysteries, thrillers
- Cold weather: warm feel-good content, family films
- Hot weather: light entertainment, action for indoor fun
- Clear evening: romantic or atmospheric choices`;
  }

  // Build variant-specific instructions
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

// =============================================================================
// Response Validation
// =============================================================================

/**
 * Validate and clean Gemini response
 * Note: IMDb IDs are now looked up via Cinemeta, so they're optional in AI response
 */
function validateResponse(data: unknown): GeminiResponse {
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

    // Year is required (for accurate Cinemeta lookup)
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
      modelUsed: 'gemini-3-flash' as GeminiModel, // Will be overwritten
      providerUsed: 'gemini' as const,
      searchUsed: typeof metadata?.['searchUsed'] === 'boolean'
        ? metadata['searchUsed']
        : false,
      totalCandidatesConsidered: recommendations.length,
    },
  };
}

/**
 * Parse JSON from Gemini response, handling potential markdown wrapping
 */
function parseGeminiJson(text: string): unknown {
  // Remove potential markdown code blocks
  let cleaned = text.trim();

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  cleaned = cleaned.trim();

  return JSON.parse(cleaned);
}

// =============================================================================
// Gemini Client Class
// =============================================================================

/**
 * Gemini API client for generating recommendations
 * Relies on retry with API-specified delays for rate limit handling
 */
export class GeminiClient {
  private model: GenerativeModel;
  private modelName: GeminiModel;

  constructor(apiKey: string, modelName: GeminiModel = 'gemini-3-flash') {
    const genAI = new GoogleGenerativeAI(apiKey);

    // Map our model names to actual Gemini model identifiers
    // Updated Jan 2026 - using stable model identifiers
    const modelMapping: Record<GeminiModel, string> = {
      'gemini-3-flash': 'gemini-2.0-flash',        // Latest fast model
      'gemini-3-pro': 'gemini-2.5-pro',            // Best quality
      'gemini-2.5-flash': 'gemini-2.5-flash',      // Stable balanced
      'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite', // Cheapest
    };

    this.model = genAI.getGenerativeModel({
      model: modelMapping[modelName],
      systemInstruction: SYSTEM_PROMPT,
    });

    this.modelName = modelName;
    logger.info('Gemini client initialized', { model: modelName });
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

    logger.debug('Generating recommendations', { contentType, count });

    // Note: Rate limiter disabled for now - relying on retry with API-specified delays
    const response = await retry(
      async () => {
        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 8192,
          },
        });

        const text = result.response.text();

        if (!text) {
          throw new Error('Empty response from Gemini');
        }

        const parsed = parseGeminiJson(text);
        return validateResponse(parsed);
      },
      { 
        maxAttempts: 3, 
        baseDelay: 2000,
        maxDelay: 120000, // Allow up to 120 seconds for retry delay (API can request long waits)
        onRetry: (attempt, delay, error) => {
          logger.warn('Retrying Gemini API call', {
            attempt,
            delayMs: delay,
            reason: error.message.substring(0, 100),
          });
        },
      }
    );

    // Update metadata with actual model used
    response.metadata.modelUsed = this.modelName;

    logger.info('Recommendations generated', {
      contentType,
      count: response.recommendations.length,
      searchUsed: response.metadata.searchUsed,
    });

    return response;
  }

  /**
   * Validate API key by making a minimal request
   * Rate-limited to 1 concurrent request per API key
   */
  async validateApiKey(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Note: Rate limiter disabled for now - relying on retry with API-specified delays
      const result = await retry(
        async () => {
          return await this.model.generateContent({
            contents: [{ role: 'user', parts: [{ text: 'Reply with just: OK' }] }],
            generationConfig: { maxOutputTokens: 10 },
          });
        },
        {
          maxAttempts: 3,
          baseDelay: 2000,
          maxDelay: 120000, // Allow up to 120 seconds for retry delay
          onRetry: (attempt, delay, error) => {
            logger.info('Retrying API key validation', {
              attempt,
              delayMs: delay,
              reason: error.message.substring(0, 80),
            });
          },
        }
      );

      const text = result.response.text();
      // Accept any response - if we got here without error, the key is valid
      if (text && text.length > 0) {
        return { valid: true };
      }
      return { valid: false, error: 'Empty response from API - key may be invalid' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('API key validation failed', { error: errorMessage });
      
      // Parse and return user-friendly error message
      return { valid: false, error: this.parseApiError(errorMessage) };
    }
  }

  /**
   * Parse Gemini API error into user-friendly message
   */
  private parseApiError(errorMessage: string): string {
    // Rate limit / quota exceeded
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
      if (errorMessage.includes('free_tier')) {
        return 'You have exceeded your free tier quota. Please wait a few minutes or upgrade to a paid plan at https://ai.google.dev';
      }
      const retryMatch = errorMessage.match(/retry in (\d+\.?\d*)/i);
      if (retryMatch && retryMatch[1]) {
        return `Rate limit exceeded. Please wait ${Math.ceil(parseFloat(retryMatch[1]))} seconds and try again.`;
      }
      return 'API quota exceeded. Please wait a moment and try again, or check your billing at https://ai.google.dev';
    }

    // Model not found
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return 'The selected model is not available. Please try a different model (Gemini 2.5 Flash is recommended).';
    }

    // Invalid API key
    if (errorMessage.includes('401') || errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('unauthorized')) {
      return 'Invalid API key. Please check that you copied the entire key from https://aistudio.google.com/apikey';
    }

    // Permission denied
    if (errorMessage.includes('403') || errorMessage.includes('PERMISSION_DENIED')) {
      return 'API key does not have permission to use this model. Please enable the Gemini API in your Google Cloud console.';
    }

    // Network errors
    if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('network')) {
      return 'Network error. Please check your internet connection and try again.';
    }

    // Timeout
    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return 'Request timed out. The API might be busy - please try again in a moment.';
    }

    // Generic fallback
    return 'Could not validate API key. Please verify your key and try again.';
  }
}
