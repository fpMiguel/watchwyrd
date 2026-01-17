/**
 * Watchwyrd - AI Provider Types
 *
 * Shared interfaces and types for AI providers.
 * Enables consistent behavior across Gemini and Perplexity.
 */

import type {
  UserConfig,
  ContextSignals,
  ContentType,
  GeminiResponse,
  GeminiRecommendation,
  AIProvider,
  AIModel,
} from '../types/index.js';

// =============================================================================
// Provider Configuration
// =============================================================================

/**
 * Generation configuration for AI requests
 */
export interface GenerationConfig {
  temperature: number;
  topP: number;
  maxOutputTokens: number;
}

/**
 * Default generation config optimized for reliability
 * Note: Lower token limits don't significantly speed up responses
 * but DO cause truncation errors - so use generous limits
 */
export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  temperature: 0.4, // Lower for faster, more deterministic responses
  topP: 0.9,
  maxOutputTokens: 8192, // Enough for 50 recommendations with full explanations
};

// =============================================================================
// Provider Interface
// =============================================================================

/**
 * Unified AI provider interface
 * All AI providers must implement this interface
 */
export interface IAIProvider {
  /** Provider identifier */
  readonly provider: AIProvider;

  /** Model being used */
  readonly model: AIModel;

  /**
   * Generate recommendations for a content type
   */
  generateRecommendations(
    config: UserConfig,
    context: ContextSignals,
    contentType: ContentType,
    count: number,
    variantSuffix?: string
  ): Promise<GeminiResponse>;

  /**
   * Validate API key
   */
  validateApiKey(): Promise<{ valid: boolean; error?: string }>;
}

// =============================================================================
// Recommendation Parsing
// =============================================================================

/**
 * Parse a single recommendation from AI response
 * Handles new format: {"title":"...","year":...,"reason":"..."}
 */
export function parseRecommendation(item: Record<string, unknown>): GeminiRecommendation | null {
  if (typeof item['title'] !== 'string' || item['title'].length === 0) {
    return null;
  }

  const year = item['year'];
  if (typeof year !== 'number' || year < 1900 || year > new Date().getFullYear() + 2) {
    return null;
  }

  // Support both "reason" (new) and "explanation" (legacy) fields
  const explanation =
    typeof item['reason'] === 'string'
      ? item['reason']
      : typeof item['explanation'] === 'string'
        ? item['explanation']
        : '';

  return {
    imdbId: '', // Will be populated by Cinemeta lookup
    title: item['title'],
    year: year,
    genres: [], // Not used - Cinemeta provides this
    runtime: 0, // Not used - Cinemeta provides this
    explanation,
    contextTags: [], // Not used
    confidenceScore: 0.8, // Not used
  };
}

/**
 * Parse JSON from AI response, handling potential markdown wrapping
 */
export function parseAIJson(text: string): unknown {
  let cleaned = text.trim();

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  return JSON.parse(cleaned.trim());
}

/**
 * Validate and extract recommendations from parsed response
 * Supports new format: {"items":[...]} and legacy: {"recommendations":[...]}
 */
export function extractRecommendations(data: unknown): GeminiRecommendation[] {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response format: expected object');
  }

  const response = data as Record<string, unknown>;

  // Support both new "items" format and legacy "recommendations" format
  const items = response['items'] || response['recommendations'];

  if (!Array.isArray(items)) {
    throw new Error('Invalid response format: missing items or recommendations array');
  }

  const recommendations: GeminiRecommendation[] = [];

  for (const item of items as unknown[]) {
    if (!item || typeof item !== 'object') continue;
    const rec = parseRecommendation(item as Record<string, unknown>);
    if (rec) recommendations.push(rec);
  }

  return recommendations;
}
