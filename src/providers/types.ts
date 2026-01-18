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
  AIProvider,
  AIModel,
} from '../types/index.js';

// Provider Configuration

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

// Provider Interface

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
