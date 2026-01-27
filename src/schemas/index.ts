/**
 * Watchwyrd - Schemas Module
 *
 * Centralized schema definitions and validation utilities.
 */

export {
  // Schemas
  RecommendationSchema,
  AIResponseSchema,
  // Types
  type Recommendation,
  type ParsedAIResponse,
  // JSON Schema generators
  getGeminiJsonSchema,
  getPerplexityResponseFormat,
  // Validation utilities
  parseAIResponse,
  safeParseAIResponse,
  validateRecommendation,
} from './recommendations.js';
