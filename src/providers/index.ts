/**
 * Watchwyrd - AI Providers Module
 *
 * Unified exports for all AI provider functionality.
 */

// Types
export type { IAIProvider, GenerationConfig } from './types.js';
export { DEFAULT_GENERATION_CONFIG } from './types.js';

// Providers
export { GeminiProvider } from './gemini.js';
export { PerplexityProvider } from './perplexity.js';
export { OpenAIProvider } from './openai.js';

// Factory
export { createProvider, getActiveProvider } from './factory.js';

// Utilities
export { deduplicateRecommendations, buildAIResponse, parseJsonSafely } from './utils.js';
export { parseApiError } from './errorParser.js';
export type { ApiErrorCategory, ParsedApiError } from './errorParser.js';
