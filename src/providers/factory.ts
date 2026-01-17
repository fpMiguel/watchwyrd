/**
 * Watchwyrd - AI Provider Factory
 *
 * Factory for creating AI provider instances.
 * Provides a unified way to create providers based on user configuration.
 */

import type { UserConfig, AIProvider } from '../types/index.js';
import type { IAIProvider } from './types.js';
import { GeminiProvider } from './gemini.js';
import { PerplexityProvider } from './perplexity.js';
import { logger } from '../utils/logger.js';

/**
 * Create an AI provider instance based on user configuration
 *
 * @param config - User configuration with API keys and model selection
 * @returns IAIProvider instance
 * @throws Error if no valid API key is configured
 */
export function createProvider(config: UserConfig): IAIProvider {
  const provider = config.aiProvider || 'gemini';

  logger.debug('Creating AI provider', { provider });

  if (provider === 'perplexity' && config.perplexityApiKey) {
    return new PerplexityProvider(config.perplexityApiKey, config.perplexityModel || 'sonar-pro');
  }

  // Default to Gemini
  if (!config.geminiApiKey) {
    throw new Error('No valid API key configured');
  }

  return new GeminiProvider(
    config.geminiApiKey,
    config.geminiModel || 'gemini-2.5-flash' // Default to best balanced model
  );
}

/**
 * Get the active provider type from config
 */
export function getActiveProvider(config: UserConfig): AIProvider {
  if (config.aiProvider === 'perplexity' && config.perplexityApiKey) {
    return 'perplexity';
  }
  return 'gemini';
}
