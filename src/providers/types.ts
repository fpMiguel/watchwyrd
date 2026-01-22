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
  AIResponse,
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
 * Request-specific options that can override defaults
 */
export interface GenerationOptions {
  /** Override default temperature (0.0-2.0) */
  temperature?: number;
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

/**
 * Higher temperature for discovery/variety catalogs
 */
export const DISCOVERY_TEMPERATURE = 1.2;

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
    variantSuffix?: string,
    options?: GenerationOptions
  ): Promise<AIResponse>;

  /**
   * Validate API key
   */
  validateApiKey(): Promise<{ valid: boolean; error?: string }>;
}
