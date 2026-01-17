/**
 * Watchwyrd - AI Search Service
 *
 * Dedicated service for natural language search.
 * Returns both movies and series in a single AI call.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { UserConfig, ContextSignals, SimpleRecommendation } from '../types/index.js';
import { SYSTEM_PROMPT, buildSearchPrompt } from '../prompts/index.js';
import { DEFAULT_GENERATION_CONFIG } from '../providers/types.js';
import { logger } from '../utils/logger.js';
import { retry } from '../utils/index.js';

// =============================================================================
// Types
// =============================================================================

export interface SearchResponse {
  movies: SimpleRecommendation[];
  series: SimpleRecommendation[];
}

// =============================================================================
// Model Mapping (same as gemini.ts)
// =============================================================================

type GeminiModel = 'gemini-3-flash' | 'gemini-3-pro' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite';

const MODEL_MAPPING: Record<GeminiModel, string> = {
  'gemini-3-flash': 'gemini-2.0-flash',
  'gemini-3-pro': 'gemini-2.5-pro',
  'gemini-2.5-flash': 'gemini-2.5-flash',
  'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
};

// =============================================================================
// Response Parsing
// =============================================================================

/**
 * Parse AI response for search (expects movies + series)
 */
function parseSearchResponse(text: string): SearchResponse {
  let cleaned = text.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  const parsed = JSON.parse(cleaned.trim()) as {
    movies?: unknown[];
    series?: unknown[];
  };

  const movies: SimpleRecommendation[] = [];
  const series: SimpleRecommendation[] = [];

  // Parse movies
  if (Array.isArray(parsed.movies)) {
    for (const item of parsed.movies) {
      const rec = extractValidRecommendation(item);
      if (rec) {
        movies.push(rec);
      }
    }
  }

  // Parse series
  if (Array.isArray(parsed.series)) {
    for (const item of parsed.series) {
      const rec = extractValidRecommendation(item);
      if (rec) {
        series.push(rec);
      }
    }
  }

  return { movies, series };
}

/**
 * Extract and validate a recommendation item
 */
function extractValidRecommendation(item: unknown): SimpleRecommendation | null {
  if (!item || typeof item !== 'object') return null;
  const rec = item as Record<string, unknown>;
  const title = rec['title'];
  const year = rec['year'];

  if (typeof title !== 'string' || title.length === 0) return null;
  if (typeof year !== 'number' || year < 1900 || year > new Date().getFullYear() + 2) return null;

  return { title, year };
}

// =============================================================================
// Search Function
// =============================================================================

/**
 * Execute a natural language search using AI
 *
 * This function:
 * 1. Builds a search-specific prompt
 * 2. Calls the AI with the dual-type system prompt
 * 3. Parses the response to extract both movies and series
 *
 * @param config - User configuration with API keys
 * @param context - Current context signals (time, weather, etc.)
 * @param query - The user's search query
 * @returns Both movies and series recommendations
 */
export async function executeAISearch(
  config: UserConfig,
  context: ContextSignals,
  query: string
): Promise<SearchResponse> {
  const apiKey = config.geminiApiKey;
  const model = config.geminiModel || 'gemini-2.5-flash';
  const catalogSize = config.catalogSize || 20;

  if (!apiKey) {
    throw new Error('No Gemini API key configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({
    model: MODEL_MAPPING[model],
    systemInstruction: SYSTEM_PROMPT,
  });

  const prompt = buildSearchPrompt({
    query,
    context,
    config,
    moviesCount: catalogSize,
    seriesCount: catalogSize,
  });

  logger.debug('Executing AI search', { query, model });

  const response = await retry(
    async () => {
      const result = await genModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: DEFAULT_GENERATION_CONFIG.temperature,
          topP: DEFAULT_GENERATION_CONFIG.topP,
          maxOutputTokens: DEFAULT_GENERATION_CONFIG.maxOutputTokens,
        },
      });

      const text = result.response.text();
      if (!text) {
        throw new Error('Empty response from AI');
      }

      return parseSearchResponse(text);
    },
    {
      maxAttempts: 3,
      baseDelay: 2000,
      maxDelay: 120000,
      onRetry: (attempt, delay, error) => {
        logger.warn('Retrying AI search', {
          attempt,
          delayMs: delay,
          reason: error.message.substring(0, 100),
        });
      },
    }
  );

  logger.info('AI search completed', {
    query,
    moviesCount: response.movies.length,
    seriesCount: response.series.length,
  });

  return response;
}

/**
 * Execute search with Perplexity (fallback)
 * Uses the same prompt structure but different API
 */
export async function executePerplexitySearch(
  config: UserConfig,
  context: ContextSignals,
  query: string
): Promise<SearchResponse> {
  const apiKey = config.perplexityApiKey;
  const model = config.perplexityModel || 'sonar-pro';
  const catalogSize = config.catalogSize || 20;

  if (!apiKey) {
    throw new Error('No Perplexity API key configured');
  }

  const prompt = buildSearchPrompt({
    query,
    context,
    config,
    moviesCount: catalogSize,
    seriesCount: catalogSize,
  });

  logger.debug('Executing Perplexity search', { query, model });

  const response = await retry(
    async () => {
      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature: DEFAULT_GENERATION_CONFIG.temperature,
          max_tokens: DEFAULT_GENERATION_CONFIG.maxOutputTokens,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Perplexity API error: ${res.status} - ${error}`);
      }

      const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
      const text = data.choices[0]?.message?.content;

      if (!text) {
        throw new Error('Empty response from Perplexity');
      }

      return parseSearchResponse(text);
    },
    {
      maxAttempts: 3,
      baseDelay: 2000,
      maxDelay: 120000,
      onRetry: (attempt, delay, error) => {
        logger.warn('Retrying Perplexity search', {
          attempt,
          delayMs: delay,
          reason: error.message.substring(0, 100),
        });
      },
    }
  );

  logger.info('Perplexity search completed', {
    query,
    moviesCount: response.movies.length,
    seriesCount: response.series.length,
  });

  return response;
}

/**
 * Execute search using configured provider
 */
export async function executeSearch(
  config: UserConfig,
  context: ContextSignals,
  query: string
): Promise<SearchResponse> {
  if (config.aiProvider === 'perplexity' && config.perplexityApiKey) {
    return executePerplexitySearch(config, context, query);
  }
  return executeAISearch(config, context, query);
}
