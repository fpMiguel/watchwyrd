/**
 * Watchwyrd - Recommendation Schema
 *
 * Zod schema for AI recommendation responses.
 * Single source of truth for response validation.
 */

import { z } from 'zod';

// =============================================================================
// Recommendation Schema
// =============================================================================

/**
 * Single recommendation item from AI
 */
export const RecommendationSchema = z.object({
  title: z.string().min(1),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 2),
  reason: z.string().optional(),
});

/**
 * AI response containing array of recommendations
 */
export const AIResponseSchema = z.object({
  items: z.array(RecommendationSchema),
});

// =============================================================================
// TypeScript Types (inferred from Zod)
// =============================================================================

export type Recommendation = z.infer<typeof RecommendationSchema>;
export type AIResponse = z.infer<typeof AIResponseSchema>;

// =============================================================================
// JSON Schema (manually defined for API use)
// =============================================================================

/**
 * JSON Schema for Gemini API (Google's format)
 */
export const GEMINI_JSON_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Exact movie/series title as shown on IMDb',
          },
          year: {
            type: 'integer',
            description: 'Release year (for series, first air date year)',
          },
          reason: {
            type: 'string',
            description: 'Brief explanation of why this recommendation fits',
          },
        },
        required: ['title', 'year'],
      },
      description: 'Array of recommended movies or series',
    },
  },
  required: ['items'],
};

/**
 * Get JSON Schema formatted for Perplexity API
 */
export function getPerplexityResponseFormat(): object {
  return {
    type: 'json_schema',
    json_schema: {
      schema: GEMINI_JSON_SCHEMA,
    },
  };
}

// =============================================================================
// Validation Utilities
// =============================================================================

/**
 * Parse and validate AI response
 * Returns validated recommendations or throws with details
 */
export function parseAIResponse(data: unknown): AIResponse {
  const result = AIResponseSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid AI response: ${errors}`);
  }

  return result.data;
}

/**
 * Safely parse AI response, returning null on failure
 */
export function safeParseAIResponse(data: unknown): AIResponse | null {
  const result = AIResponseSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Validate a single recommendation
 */
export function validateRecommendation(item: unknown): Recommendation | null {
  const result = RecommendationSchema.safeParse(item);
  return result.success ? result.data : null;
}
