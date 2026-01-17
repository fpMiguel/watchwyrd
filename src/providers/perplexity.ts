/**
 * Watchwyrd - Perplexity AI Provider
 *
 * Handles communication with Perplexity's API.
 * Implements the IAIProvider interface for consistent behavior.
 * Leverages Perplexity's web search for current content discovery.
 *
 * Optimizations:
 * - Connection pooling for HTTP reuse
 * - Response streaming where supported
 * - Lower temperature for faster responses
 */

import Perplexity from '@perplexity-ai/perplexity_ai';
import type {
  UserConfig,
  ContextSignals,
  ContentType,
  GeminiResponse,
  PerplexityModel,
} from '../types/index.js';
import {
  type IAIProvider,
  type GenerationConfig,
  DEFAULT_GENERATION_CONFIG,
  extractRecommendations,
} from './types.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts.js';
import { logger } from '../utils/logger.js';
import { retry } from '../utils/index.js';

// =============================================================================
// Singleton Client Pool (Connection Reuse with TTL)
// =============================================================================

interface PooledClient {
  client: Perplexity;
  lastUsed: number;
}

/**
 * Client pool for connection reuse
 * Maps API key hash to client with TTL tracking
 */
const clientPool = new Map<string, PooledClient>();

// Pool configuration
const POOL_MAX_SIZE = 100;
const POOL_TTL_MS = 60 * 60 * 1000; // 1 hour idle timeout

// Cleanup stale clients every 10 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of clientPool.entries()) {
    if (now - entry.lastUsed > POOL_TTL_MS) {
      clientPool.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.debug('Cleaned up stale Perplexity clients', { cleaned, remaining: clientPool.size });
  }
}, 10 * 60 * 1000);

/**
 * Hash API key for pool storage (don't store raw keys)
 */
function hashApiKey(apiKey: string): string {
  let hash = 0;
  for (let i = 0; i < apiKey.length; i++) {
    const char = apiKey.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `pplx_${Math.abs(hash).toString(36)}`;
}

/**
 * Get or create a pooled client for the given API key
 */
function getPooledClient(apiKey: string): Perplexity {
  const keyHash = hashApiKey(apiKey);
  const entry = clientPool.get(keyHash);

  if (entry) {
    entry.lastUsed = Date.now();
    return entry.client;
  }

  // Evict oldest if pool is full
  if (clientPool.size >= POOL_MAX_SIZE) {
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [key, e] of clientPool.entries()) {
      if (e.lastUsed < oldestTime) {
        oldestTime = e.lastUsed;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      clientPool.delete(oldestKey);
      logger.debug('Evicted oldest Perplexity client from pool');
    }
  }

  const client = new Perplexity({ apiKey });
  clientPool.set(keyHash, { client, lastUsed: Date.now() });
  logger.debug('Created new Perplexity client for connection pool');
  return client;
}

// =============================================================================
// Perplexity Provider Implementation
// =============================================================================

/**
 * Perplexity AI provider implementation
 */
export class PerplexityProvider implements IAIProvider {
  readonly provider = 'perplexity' as const;
  readonly model: PerplexityModel;

  private client: Perplexity;
  private config: GenerationConfig;

  constructor(
    apiKey: string,
    model: PerplexityModel = 'sonar-pro',
    config: Partial<GenerationConfig> = {}
  ) {
    this.client = getPooledClient(apiKey);
    this.model = model;
    this.config = { ...DEFAULT_GENERATION_CONFIG, ...config };

    logger.info('Perplexity provider initialized', { model });
  }

  /**
   * Generate recommendations using Perplexity's web search
   */
  async generateRecommendations(
    config: UserConfig,
    context: ContextSignals,
    contentType: ContentType,
    count = 20,
    variantSuffix?: string
  ): Promise<GeminiResponse> {
    const prompt = buildUserPrompt(config, context, contentType, count, variantSuffix);

    logger.debug('Generating recommendations via Perplexity', { contentType, count });

    const recommendations = await retry(
      async () => {
        // Don't use response_format - it causes hangs/issues with Perplexity
        // Instead rely on prompt engineering + JSON extraction
        const completion = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxOutputTokens,
        });

        const content = completion.choices[0]?.message?.content;

        if (!content) {
          throw new Error('Empty response from Perplexity');
        }

        // Handle both string and array content types from the API
        const contentString =
          typeof content === 'string'
            ? content
            : (content as { text?: string }[]).map((c) => c.text || '').join('');

        const parsed: unknown = JSON.parse(contentString.trim());
        return extractRecommendations(parsed);
      },
      {
        maxAttempts: 3,
        baseDelay: 2000,
        maxDelay: 60000,
        onRetry: (attempt, delay, error) => {
          logger.warn('Retrying Perplexity API call', {
            attempt,
            delayMs: delay,
            reason: error.message.substring(0, 100),
          });
        },
      }
    );

    logger.info('Recommendations generated via Perplexity', {
      contentType,
      count: recommendations.length,
    });

    return {
      recommendations,
      metadata: {
        generatedAt: new Date().toISOString(),
        modelUsed: this.model,
        providerUsed: 'perplexity',
        searchUsed: true, // Perplexity always uses search
        totalCandidatesConsidered: recommendations.length,
      },
    };
  }

  /**
   * Validate API key with minimal request
   */
  async validateApiKey(): Promise<{ valid: boolean; error?: string }> {
    try {
      const result = await retry(
        async () => {
          return await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: 'user', content: 'Reply with just: OK' }],
            max_tokens: 10,
          });
        },
        {
          maxAttempts: 2,
          baseDelay: 1000,
          maxDelay: 10000,
        }
      );

      const content = result.choices[0]?.message?.content;
      if (content && content.length > 0) {
        return { valid: true };
      }
      return { valid: false, error: 'Empty response from API - key may be invalid' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Perplexity API key validation failed', { error: errorMessage });
      return { valid: false, error: this.parseApiError(errorMessage) };
    }
  }

  /**
   * Parse Perplexity API error into user-friendly message
   */
  private parseApiError(errorMessage: string): string {
    if (
      errorMessage.includes('401') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('invalid')
    ) {
      return 'Invalid API key. Please check your Perplexity API key.';
    }
    if (errorMessage.includes('429') || errorMessage.includes('rate')) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    }
    if (
      errorMessage.includes('402') ||
      errorMessage.includes('payment') ||
      errorMessage.includes('billing')
    ) {
      return 'Billing issue with your Perplexity account. Please check your subscription.';
    }
    if (errorMessage.includes('503') || errorMessage.includes('unavailable')) {
      return 'Perplexity service is temporarily unavailable. Please try again later.';
    }
    return 'Could not validate API key. Please verify your key and try again.';
  }
}

// =============================================================================
// Factory (for backwards compatibility)
// =============================================================================

/**
 * Create a Perplexity provider instance
 * @deprecated Use PerplexityProvider class directly
 */
export class PerplexityClient extends PerplexityProvider {
  constructor(apiKey: string, model: PerplexityModel = 'sonar-pro') {
    super(apiKey, model);
  }
}
