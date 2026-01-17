/**
 * Watchwyrd - AI Search Service
 *
 * Dedicated service for natural language search.
 * Uses separate AI calls per content type for better results.
 */

import type {
  UserConfig,
  ContextSignals,
  ContentType,
  SimpleRecommendation,
} from '../types/index.js';
import { buildSearchPrompt } from '../prompts/index.js';
import { createProvider } from '../providers/factory.js';
import { logger } from '../utils/logger.js';

// =============================================================================
// Types
// =============================================================================

export interface SearchResponse {
  items: SimpleRecommendation[];
}

// =============================================================================
// Search Function
// =============================================================================

/**
 * Execute a natural language search using AI for a specific content type
 *
 * This function:
 * 1. Builds a search-specific prompt for the content type
 * 2. Uses the existing provider infrastructure
 * 3. Returns recommendations for that content type
 *
 * @param config - User configuration with API keys
 * @param context - Current context signals (time, weather, etc.)
 * @param query - The user's search query
 * @param contentType - The type of content to search for
 * @returns Recommendations for the specified content type
 */
export async function executeSearch(
  config: UserConfig,
  context: ContextSignals,
  query: string,
  contentType: ContentType
): Promise<SimpleRecommendation[]> {
  const catalogSize = config.catalogSize || 20;

  const prompt = buildSearchPrompt({
    query,
    context,
    config,
    contentType,
    count: catalogSize,
  });

  logger.debug('Executing AI search', { query, contentType });

  // Use the existing provider infrastructure
  const provider = createProvider(config);
  const response = await provider.generateRecommendations(
    config,
    context,
    contentType,
    catalogSize,
    prompt
  );

  logger.info('AI search completed', {
    query,
    contentType,
    count: response.recommendations.length,
  });

  return response.recommendations.map((item) => ({
    title: item.title,
    year: item.year,
  }));
}
