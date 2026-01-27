/**
 * Watchwyrd - Provider Utilities
 *
 * Shared utility functions for AI providers.
 * Reduces code duplication across gemini.ts, openai.ts, and perplexity.ts.
 */

import type { Recommendation } from '../schemas/index.js';
import type { AIRecommendation, AIResponse, AIProvider, AIModel } from '../types/index.js';

/**
 * Remove duplicate recommendations by normalized title + year.
 *
 * Normalization:
 * - Lowercase
 * - Remove leading articles (the, a, an)
 * - Trim whitespace
 *
 * @param items - Array of recommendations
 * @returns Deduplicated array preserving first occurrence order
 */
export function deduplicateRecommendations(items: Recommendation[]): Recommendation[] {
  const seen = new Set<string>();
  const result: Recommendation[] = [];

  for (const item of items) {
    const normalizedTitle = item.title
      .toLowerCase()
      .replace(/^(the|a|an)\s+/i, '')
      .trim();
    const key = `${normalizedTitle}:${item.year}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

/**
 * Build a standardized AI response from recommendations.
 *
 * Maps Recommendation[] (from Zod schema) to AIResponse format
 * with additional metadata.
 *
 * @param recommendations - Deduplicated recommendations
 * @param rawCount - Original count before deduplication (for metadata)
 * @param model - Model identifier used for generation
 * @param provider - AI provider ('gemini', 'openai', 'perplexity')
 * @param searchUsed - Whether web search was used
 * @returns AIResponse with recommendations and metadata
 */
export function buildAIResponse(
  recommendations: Recommendation[],
  rawCount: number,
  model: AIModel,
  provider: AIProvider,
  searchUsed: boolean
): AIResponse {
  return {
    recommendations: recommendations.map(
      (rec): AIRecommendation => ({
        imdbId: '',
        title: rec.title,
        year: rec.year,
        genres: [],
        runtime: 0,
        explanation: rec.reason || '',
        contextTags: [],
        confidenceScore: 0.8,
      })
    ),
    metadata: {
      generatedAt: new Date().toISOString(),
      modelUsed: model,
      providerUsed: provider,
      searchUsed,
      totalCandidatesConsidered: rawCount,
    },
  };
}

/**
 * Parse JSON response with descriptive error message.
 *
 * Wraps JSON.parse with a try-catch that provides context
 * about the failed content (logged at debug level only).
 *
 * @param text - Raw text to parse as JSON
 * @returns Parsed JSON (unknown type, caller must validate)
 * @throws Error with generic message (details logged separately)
 */
export function parseJsonSafely(text: string): unknown {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Don't include content preview in thrown error - could leak sensitive data
    // The caller can log debug info if needed
    throw new Error('Failed to parse AI response as JSON');
  }
}
