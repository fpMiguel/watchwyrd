/**
 * Recorded AI Provider Responses
 *
 * Real API responses captured via RECORD_RESPONSES=true
 * Used for realistic mock data in unit tests.
 *
 * To update these fixtures:
 * 1. Run: RUN_API_TESTS=true RECORD_RESPONSES=true npm run test:integration
 * 2. Copy the logged JSON responses here
 * 3. Update the corresponding exports
 *
 * These fixtures help create realistic unit tests without network calls.
 */

import type { AIResponse } from '../../../src/types/index.js';

// =============================================================================
// Gemini Responses
// =============================================================================

/**
 * Gemini movie recommendations (fornow variant, 5 items)
 * Recorded: (run integration tests to populate)
 */
export const GEMINI_MOVIE_FORNOW_RESPONSE: AIResponse | null = null;

/**
 * Gemini series recommendations (fornow variant, 5 items)
 * Recorded: (run integration tests to populate)
 */
export const GEMINI_SERIES_FORNOW_RESPONSE: AIResponse | null = null;

/**
 * Gemini movie recommendations (discover variant, 5 items)
 * Recorded: (run integration tests to populate)
 */
export const GEMINI_MOVIE_DISCOVER_RESPONSE: AIResponse | null = null;

// =============================================================================
// Perplexity Responses
// =============================================================================

/**
 * Perplexity movie recommendations (fornow variant, 5 items)
 * Recorded: (run integration tests to populate)
 */
export const PERPLEXITY_MOVIE_FORNOW_RESPONSE: AIResponse | null = null;

/**
 * Perplexity series recommendations (fornow variant, 5 items)
 * Recorded: (run integration tests to populate)
 */
export const PERPLEXITY_SERIES_FORNOW_RESPONSE: AIResponse | null = null;

/**
 * Perplexity movie recommendations (discover variant, 5 items)
 * Recorded: (run integration tests to populate)
 */
export const PERPLEXITY_MOVIE_DISCOVER_RESPONSE: AIResponse | null = null;

// =============================================================================
// OpenAI Responses
// =============================================================================

/**
 * OpenAI movie recommendations (fornow variant, 5 items)
 * Recorded: (run integration tests to populate)
 */
export const OPENAI_MOVIE_FORNOW_RESPONSE: AIResponse | null = null;

/**
 * OpenAI series recommendations (fornow variant, 5 items)
 * Recorded: (run integration tests to populate)
 */
export const OPENAI_SERIES_FORNOW_RESPONSE: AIResponse | null = null;

/**
 * OpenAI movie recommendations (discover variant, 5 items)
 * Recorded: (run integration tests to populate)
 */
export const OPENAI_MOVIE_DISCOVER_RESPONSE: AIResponse | null = null;

// =============================================================================
// Helper to get recorded response by provider/type/variant
// =============================================================================

type ProviderName = 'gemini' | 'perplexity' | 'openai';
type ContentType = 'movie' | 'series';
type Variant = 'fornow' | 'discover';

const RESPONSE_MAP: Record<string, AIResponse | null> = {
  'gemini:movie:fornow': GEMINI_MOVIE_FORNOW_RESPONSE,
  'gemini:series:fornow': GEMINI_SERIES_FORNOW_RESPONSE,
  'gemini:movie:discover': GEMINI_MOVIE_DISCOVER_RESPONSE,
  'perplexity:movie:fornow': PERPLEXITY_MOVIE_FORNOW_RESPONSE,
  'perplexity:series:fornow': PERPLEXITY_SERIES_FORNOW_RESPONSE,
  'perplexity:movie:discover': PERPLEXITY_MOVIE_DISCOVER_RESPONSE,
  'openai:movie:fornow': OPENAI_MOVIE_FORNOW_RESPONSE,
  'openai:series:fornow': OPENAI_SERIES_FORNOW_RESPONSE,
  'openai:movie:discover': OPENAI_MOVIE_DISCOVER_RESPONSE,
};

/**
 * Get a recorded response by provider, content type, and variant.
 * Returns null if not yet recorded.
 */
export function getRecordedResponse(
  provider: ProviderName,
  contentType: ContentType,
  variant: Variant = 'fornow'
): AIResponse | null {
  const key = `${provider}:${contentType}:${variant}`;
  return RESPONSE_MAP[key] ?? null;
}
