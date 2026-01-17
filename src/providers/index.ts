/**
 * Watchwyrd - AI Providers Module
 *
 * Unified exports for all AI provider functionality.
 */

// Types
export type { IAIProvider, GenerationConfig } from './types.js';
export {
  DEFAULT_GENERATION_CONFIG,
  parseAIJson,
  extractRecommendations,
  parseRecommendation,
} from './types.js';

// Prompts
export { SYSTEM_PROMPT, buildUserPrompt } from './prompts.js';

// Providers
export { GeminiProvider } from './gemini.js';
export { PerplexityProvider } from './perplexity.js';

// Factory
export { createProvider, getActiveProvider } from './factory.js';
