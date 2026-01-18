/**
 * Watchwyrd - OpenAI Provider
 *
 * Handles communication with OpenAI's API.
 * Implements the IAIProvider interface for consistent behavior.
 *
 * Features:
 * - Structured output with JSON mode (GPT-4.x) or JSON schema (GPT-5)
 * - HTTP/2 connection pooling
 * - GPT-4o, GPT-4.1, and GPT-5 family support
 *
 * Note: GPT-5 models are reasoning models that:
 * - Require json_schema format instead of json_object
 * - Require higher max_completion_tokens (4000+) for reasoning overhead
 * - Do not support custom temperature (fixed at 1.0)
 */

import OpenAI from 'openai';
import type {
  UserConfig,
  ContextSignals,
  ContentType,
  GeminiResponse,
  OpenAIModel,
} from '../types/index.js';
import {
  type IAIProvider,
  type GenerationConfig,
  type GenerationOptions,
  DEFAULT_GENERATION_CONFIG,
} from './types.js';
import { SYSTEM_PROMPT } from '../prompts/index.js';
import { parseAIResponse, type Recommendation } from '../schemas/index.js';
import { logger } from '../utils/logger.js';
import { retry } from '../utils/index.js';

// Singleton Client Pool (Connection Reuse with TTL)

interface PooledClient {
  client: OpenAI;
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
setInterval(
  () => {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of clientPool.entries()) {
      if (now - entry.lastUsed > POOL_TTL_MS) {
        clientPool.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      logger.debug('Cleaned up stale OpenAI clients', { cleaned, remaining: clientPool.size });
    }
  },
  10 * 60 * 1000
);

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
  return `openai_${Math.abs(hash).toString(36)}`;
}

/**
 * Get or create a pooled client for the given API key
 */
function getPooledClient(apiKey: string): OpenAI {
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
      logger.debug('Evicted oldest OpenAI client from pool');
    }
  }

  const client = new OpenAI({ apiKey });
  clientPool.set(keyHash, { client, lastUsed: Date.now() });
  logger.debug('Created new OpenAI client for connection pool');
  return client;
}

// OpenAI Provider Implementation

/**
 * Check if model is a GPT-5 reasoning model
 */
function isGpt5Model(model: string): boolean {
  return model.startsWith('gpt-5');
}

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements IAIProvider {
  readonly provider = 'openai' as const;
  readonly model: OpenAIModel;
  readonly isGpt5: boolean;

  private client: OpenAI;
  private config: GenerationConfig;

  constructor(
    apiKey: string,
    model: OpenAIModel = 'gpt-4o-mini',
    config: Partial<GenerationConfig> = {}
  ) {
    this.client = getPooledClient(apiKey);
    this.model = model;
    this.isGpt5 = isGpt5Model(model);
    this.config = { ...DEFAULT_GENERATION_CONFIG, ...config };

    // GPT-5 models need higher token limit for reasoning overhead
    if (this.isGpt5 && this.config.maxOutputTokens < 4000) {
      this.config.maxOutputTokens = 4000;
    }

    logger.info('OpenAI provider initialized', { model, isGpt5: this.isGpt5 });
  }

  /**
   * Generate recommendations using structured output
   */
  async generateRecommendations(
    config: UserConfig,
    _context: ContextSignals,
    contentType: ContentType,
    count = 20,
    prompt?: string,
    options?: GenerationOptions
  ): Promise<GeminiResponse> {
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const includeReason = config.showExplanations !== false;
    const temperature = options?.temperature ?? this.config.temperature;

    logger.debug('Generating recommendations via OpenAI with structured output', {
      contentType,
      count,
      model: this.model,
      includeReason,
      temperature,
    });

    const recommendations = await retry(
      async () => this.generateWithStructuredOutput(prompt, includeReason, temperature),
      {
        maxAttempts: 3,
        baseDelay: 2000,
        maxDelay: 60000,
        onRetry: (attempt, delay, error) => {
          logger.warn('Retrying OpenAI API call', {
            attempt,
            delayMs: delay,
            reason: error.message.substring(0, 100),
          });
        },
      }
    );

    // Deduplicate results
    const deduplicated = this.deduplicateRecommendations(recommendations);

    logger.info('Recommendations generated via OpenAI', {
      contentType,
      count: deduplicated.length,
      model: this.model,
    });

    return {
      recommendations: deduplicated.map((rec) => ({
        imdbId: '',
        title: rec.title,
        year: rec.year,
        genres: [],
        runtime: 0,
        explanation: rec.reason || '',
        contextTags: [],
        confidenceScore: 0.8,
      })),
      metadata: {
        generatedAt: new Date().toISOString(),
        modelUsed: this.model,
        providerUsed: 'openai',
        searchUsed: false,
        totalCandidatesConsidered: recommendations.length,
      },
    };
  }

  /**
   * Generate with structured output (JSON mode for GPT-4.x, JSON schema for GPT-5)
   * @param prompt - The prompt to send to the AI
   * @param _includeReason - Whether to include reason field in schema
   */
  private async generateWithStructuredOutput(
    prompt: string,
    _includeReason = true,
    temperature?: number
  ): Promise<Recommendation[]> {
    let content: string | null = null;

    if (this.isGpt5) {
      // GPT-5 models: Use json_schema, max_completion_tokens, no temperature
      // GPT-5 models are reasoning models that use tokens for internal thinking
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'recommendations',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      year: { type: 'integer' },
                      reason: { type: 'string' },
                    },
                    required: ['title', 'year', 'reason'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['items'],
              additionalProperties: false,
            },
          },
        },
        max_completion_tokens: this.config.maxOutputTokens,
      });
      content = completion.choices[0]?.message?.content ?? null;
    } else {
      // GPT-4.x models: Use json_object, max_tokens, temperature
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: this.config.maxOutputTokens,
        temperature: temperature ?? this.config.temperature,
      });
      content = completion.choices[0]?.message?.content ?? null;
    }

    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse and validate with Zod
    const parsed = JSON.parse(content.trim()) as unknown;
    const validated = parseAIResponse(parsed);

    return validated.items;
  }

  /**
   * Remove duplicate recommendations (normalize by title + year)
   */
  private deduplicateRecommendations(items: Recommendation[]): Recommendation[] {
    const seen = new Set<string>();
    const result: Recommendation[] = [];

    for (const item of items) {
      // Normalize: lowercase, remove articles, trim
      const normalizedTitle = item.title
        .toLowerCase()
        .replace(/^(the|a|an)\s+/i, '')
        .trim();
      const key = `${normalizedTitle}:${item.year}`;

      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }

    return result;
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
      logger.error('OpenAI API key validation failed', { error: errorMessage });
      return { valid: false, error: this.parseApiError(errorMessage) };
    }
  }

  /**
   * Parse OpenAI API error into user-friendly message
   */
  private parseApiError(errorMessage: string): string {
    if (
      errorMessage.includes('401') ||
      errorMessage.includes('invalid_api_key') ||
      errorMessage.includes('Incorrect API key')
    ) {
      return 'Invalid API key. Please check your OpenAI API key.';
    }
    if (errorMessage.includes('429') || errorMessage.includes('rate_limit')) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    }
    if (
      errorMessage.includes('402') ||
      errorMessage.includes('insufficient_quota') ||
      errorMessage.includes('billing')
    ) {
      return 'Insufficient credits or billing issue. Please check your OpenAI account.';
    }
    if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
      return 'OpenAI service is temporarily overloaded. Please try again later.';
    }
    if (errorMessage.includes('model_not_found')) {
      return 'Model not available. Please select a different model.';
    }
    return 'Could not validate API key. Please verify your key and try again.';
  }
}
