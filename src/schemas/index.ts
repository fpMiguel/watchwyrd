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
  type AIResponse,
  // JSON Schema
  GEMINI_JSON_SCHEMA,
  getGeminiJsonSchema,
  getPerplexityResponseFormat,
  // Validation utilities
  parseAIResponse,
  safeParseAIResponse,
  validateRecommendation,
} from './recommendations.js';
