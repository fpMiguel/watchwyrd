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
  AIResponse,
  PerplexityModel,
} from '../types/index.js';
import {
  type IAIProvider,
  type GenerationConfig,
  type GenerationOverrides,
  DEFAULT_GENERATION_CONFIG,
} from './types.js';
import { SYSTEM_PROMPT } from '../prompts/index.js';
import {
  parseAIResponse,
  getPerplexityResponseFormat,
  type Recommendation,
} from '../schemas/index.js';
import { logger, createClientPool, retry } from '../utils/index.js';
import { perplexityCircuit } from '../utils/circuitBreaker.js';
import { deduplicateRecommendations, buildAIResponse, parseJsonSafely } from './utils.js';
import { parseApiError } from './errorParser.js';

// Singleton Client Pool (Connection Reuse with TTL)
// Using shared utility for connection pooling
const clientPool = createClientPool<Perplexity>({
  name: 'perplexity',
  prefix: 'pplx',
  createClient: (apiKey) => new Perplexity({ apiKey }),
});

// Perplexity Provider Implementation

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
    this.client = clientPool.get(apiKey);
    this.model = model;
    this.config = { ...DEFAULT_GENERATION_CONFIG, ...config };

    logger.info('Perplexity provider initialized', { model });
  }

  /**
   * Generate recommendations using Perplexity's web search
   */
  async generateRecommendations(
    config: UserConfig,
    _context: ContextSignals,
    contentType: ContentType,
    count = 20,
    prompt?: string,
    options?: GenerationOverrides
  ): Promise<AIResponse> {
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const includeReason = config.showExplanations !== false;
    const temperature = options?.temperature ?? this.config.temperature;

    logger.debug('Generating recommendations via Perplexity with structured output', {
      contentType,
      count,
      includeReason,
      temperature,
    });

    // Circuit breaker wraps the entire retry operation so a single failed
    // request (with retries) counts as one failure, not multiple
    const recommendations = await perplexityCircuit.execute(() =>
      retry(async () => this.generateWithStructuredOutput(prompt, includeReason, temperature), {
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
      })
    );

    // Deduplicate results using shared utility
    const deduplicated = deduplicateRecommendations(recommendations);

    logger.info('Recommendations generated via Perplexity', {
      contentType,
      count: deduplicated.length,
    });

    return buildAIResponse(
      deduplicated,
      recommendations.length,
      this.model,
      'perplexity',
      true // Perplexity always uses search
    );
  }

  /**
   * Generate with structured output (JSON schema)
   * @param prompt - The prompt to send to the AI
   * @param includeReason - Whether to include reason field in schema
   */
  private async generateWithStructuredOutput(
    prompt: string,
    includeReason = true,
    temperature?: number
  ): Promise<Recommendation[]> {
    const completion = (await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: temperature ?? this.config.temperature,
      max_tokens: this.config.maxOutputTokens,
      stream: false,
      response_format: getPerplexityResponseFormat(includeReason),
    } as Parameters<typeof this.client.chat.completions.create>[0])) as {
      choices: Array<{ message?: { content?: string | { text?: string }[] } }>;
    };

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from Perplexity');
    }

    // Handle both string and array content types from the API
    const contentString =
      typeof content === 'string'
        ? content
        : (content as { text?: string }[]).map((c) => c.text || '').join('');

    // Parse and validate with Zod (using shared utility for error handling)
    const parsed = parseJsonSafely(contentString);
    const validated = parseAIResponse(parsed);

    return validated.items;
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
    return parseApiError(errorMessage, 'perplexity').userMessage;
  }
}
