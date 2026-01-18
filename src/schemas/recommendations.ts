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
// JSON Schema (dynamically generated based on settings)
// =============================================================================

/**
 * Generate JSON Schema for Gemini API based on settings
 * @param includeReason - Whether to include the reason field
 */
export function getGeminiJsonSchema(includeReason = true): object {
  const itemProperties: Record<string, object> = {
    title: {
      type: 'string',
      description: 'Exact movie/series title as shown on IMDb',
    },
    year: {
      type: 'integer',
      description: 'Release year (for series, first air date year)',
    },
  };

  if (includeReason) {
    itemProperties['reason'] = {
      type: 'string',
      description: 'Brief explanation of why this recommendation fits',
    };
  }

  return {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: itemProperties,
          required: ['title', 'year'],
        },
        description: 'Array of recommended movies or series',
      },
    },
    required: ['items'],
  };
}

/**
 * Default schema with reason (for backward compatibility)
 */
export const GEMINI_JSON_SCHEMA = getGeminiJsonSchema(true);

/**
 * Get JSON Schema formatted for Perplexity API
 * @param includeReason - Whether to include the reason field
 */
export function getPerplexityResponseFormat(includeReason = true): object {
  return {
    type: 'json_schema',
    json_schema: {
      schema: getGeminiJsonSchema(includeReason),
    },
  };
}

/**
 * Get response format for OpenAI API (JSON mode)
 * OpenAI uses a simpler JSON mode with json_object type
 * GPT-5 models require json_schema format instead
 * @param _includeReason - Whether to include the reason field (used in prompt, not schema for OpenAI)
 * @param isGpt5 - Whether this is a GPT-5 model (requires json_schema)
 */
export function getOpenAIResponseFormat(
  _includeReason = true,
  isGpt5 = false
): { type: 'json_object' } | { type: 'json_schema'; json_schema: object } {
  if (isGpt5) {
    // GPT-5 models are reasoning models that require json_schema format
    return {
      type: 'json_schema',
      json_schema: {
        name: 'recommendations',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  year: { type: 'integer' },
                  reason: { type: 'string' },
                },
                required: ['title', 'year', 'reason'],
                additionalProperties: false,
              },
            },
          },
          required: ['items'],
          additionalProperties: false,
        },
      },
    };
  }

  return { type: 'json_object' };
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
