/**
 * Watchwyrd - Gemini AI Provider
 *
 * Handles communication with Google's Gemini API.
 * Implements the IAIProvider interface for consistent behavior.
 *
 * Features:
 * - Structured output with JSON Schema validation
 * - HTTP/2 connection pooling
 * - Automatic fallback to text parsing
 */

import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';
import type {
  UserConfig,
  ContextSignals,
  ContentType,
  GeminiResponse,
  GeminiModel,
} from '../types/index.js';
import { type IAIProvider, type GenerationConfig, DEFAULT_GENERATION_CONFIG } from './types.js';
import { SYSTEM_PROMPT } from '../prompts/index.js';
import { parseAIResponse, type Recommendation, GEMINI_JSON_SCHEMA } from '../schemas/index.js';
import { logger } from '../utils/logger.js';
import { retry } from '../utils/index.js';

// =============================================================================
// Model Mapping
// =============================================================================

/**
 * Map our model names to actual Gemini model identifiers
 * Updated Jan 2026 - using stable model identifiers
 */
const MODEL_MAPPING: Record<GeminiModel, string> = {
  'gemini-3-flash': 'gemini-2.0-flash',
  'gemini-3-pro': 'gemini-2.5-pro',
  'gemini-2.5-flash': 'gemini-2.5-flash', // Default - best balance of speed/quality
  'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
};

// =============================================================================
// Singleton Client Pool (HTTP/2 Connection Reuse with TTL)
// =============================================================================

interface PooledClient {
  client: GoogleGenerativeAI;
  lastUsed: number;
}

/**
 * Client pool for HTTP/2 connection reuse
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
      logger.debug('Cleaned up stale Gemini clients', { cleaned, remaining: clientPool.size });
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
  return `gemini_${Math.abs(hash).toString(36)}`;
}

/**
 * Get or create a pooled client for the given API key
 */
function getPooledClient(apiKey: string): GoogleGenerativeAI {
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
      logger.debug('Evicted oldest Gemini client from pool');
    }
  }

  const client = new GoogleGenerativeAI(apiKey);
  clientPool.set(keyHash, { client, lastUsed: Date.now() });
  logger.debug('Created new Gemini client for connection pool');
  return client;
}

// =============================================================================
// Gemini Provider Implementation
// =============================================================================

/**
 * Gemini AI provider implementation
 */
export class GeminiProvider implements IAIProvider {
  readonly provider = 'gemini' as const;
  readonly model: GeminiModel;

  private genAI: GoogleGenerativeAI;
  private config: GenerationConfig;

  constructor(
    apiKey: string,
    model: GeminiModel = 'gemini-2.5-flash',
    config: Partial<GenerationConfig> = {}
  ) {
    this.genAI = getPooledClient(apiKey);
    this.model = model;
    this.config = { ...DEFAULT_GENERATION_CONFIG, ...config };

    logger.info('Gemini provider initialized', { model, actualModel: MODEL_MAPPING[model] });
  }

  /**
   * Generate recommendations using structured output
   */
  async generateRecommendations(
    _config: UserConfig,
    _context: ContextSignals,
    contentType: ContentType,
    count = 20,
    prompt?: string
  ): Promise<GeminiResponse> {
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    logger.debug('Generating recommendations with structured output', {
      contentType,
      count,
      model: this.model,
    });

    const recommendations = await retry(async () => this.generateWithStructuredOutput(prompt), {
      maxAttempts: 3,
      baseDelay: 2000,
      maxDelay: 120000,
      onRetry: (attempt, delay, error) => {
        logger.warn('Retrying Gemini API call', {
          attempt,
          delayMs: delay,
          reason: error.message.substring(0, 100),
        });
      },
    });

    // Deduplicate results
    const deduplicated = this.deduplicateRecommendations(recommendations);

    logger.info('Recommendations generated', {
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
        providerUsed: 'gemini',
        searchUsed: false,
        totalCandidatesConsidered: recommendations.length,
      },
    };
  }

  /**
   * Generate with structured output (JSON mode)
   */
  private async generateWithStructuredOutput(prompt: string): Promise<Recommendation[]> {
    // Convert JSON schema to Gemini schema format with SchemaType enums
    const geminiSchema = this.convertToGeminiSchema(
      GEMINI_JSON_SCHEMA as Record<string, unknown>
    ) as unknown as Schema;

    const model = this.genAI.getGenerativeModel({
      model: MODEL_MAPPING[this.model],
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: geminiSchema,
        temperature: this.config.temperature,
        topP: this.config.topP,
        maxOutputTokens: this.config.maxOutputTokens,
      },
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = result.response.text();
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    // Parse and validate with Zod
    const parsed = JSON.parse(text) as unknown;
    const validated = parseAIResponse(parsed);

    return validated.items;
  }

  /**
   * Convert JSON Schema to Gemini's expected format with SchemaType enums
   */
  private convertToGeminiSchema(jsonSchema: Record<string, unknown>): Record<string, unknown> {
    const typeMap: Record<string, unknown> = {
      object: SchemaType.OBJECT,
      array: SchemaType.ARRAY,
      string: SchemaType.STRING,
      integer: SchemaType.INTEGER,
      number: SchemaType.NUMBER,
      boolean: SchemaType.BOOLEAN,
    };

    const convert = (schema: Record<string, unknown>): Record<string, unknown> => {
      const result: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(schema)) {
        if (key === 'type' && typeof value === 'string') {
          result['type'] = typeMap[value] || value;
        } else if (key === 'properties' && typeof value === 'object' && value !== null) {
          const props: Record<string, unknown> = {};
          for (const [propKey, propValue] of Object.entries(value as Record<string, unknown>)) {
            props[propKey] = convert(propValue as Record<string, unknown>);
          }
          result['properties'] = props;
        } else if (key === 'items' && typeof value === 'object' && value !== null) {
          result['items'] = convert(value as Record<string, unknown>);
        } else {
          result[key] = value;
        }
      }

      return result;
    };

    return convert(jsonSchema);
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
      const model = this.genAI.getGenerativeModel({
        model: MODEL_MAPPING[this.model],
      });

      const result = await retry(
        async () => {
          return await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: 'Reply with just: OK' }] }],
            generationConfig: { maxOutputTokens: 10 },
          });
        },
        {
          maxAttempts: 3,
          baseDelay: 2000,
          maxDelay: 120000,
          onRetry: (attempt, delay, error) => {
            logger.info('Retrying API key validation', {
              attempt,
              delayMs: delay,
              reason: error.message.substring(0, 80),
            });
          },
        }
      );

      const text = result.response.text();
      if (text && text.length > 0) {
        return { valid: true };
      }
      return { valid: false, error: 'Empty response from API - key may be invalid' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('API key validation failed', { error: errorMessage });
      return { valid: false, error: this.parseApiError(errorMessage) };
    }
  }

  /**
   * Parse Gemini API error into user-friendly message
   */
  private parseApiError(errorMessage: string): string {
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
      if (errorMessage.includes('free_tier')) {
        return 'You have exceeded your free tier quota. Please wait a few minutes or upgrade to a paid plan.';
      }
      const retryMatch = errorMessage.match(/retry in (\d+\.?\d*)/i);
      if (retryMatch?.[1]) {
        return `Rate limit exceeded. Please wait ${Math.ceil(parseFloat(retryMatch[1]))} seconds and try again.`;
      }
      return 'API quota exceeded. Please wait a moment and try again.';
    }

    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return 'The selected model is not available. Please try Gemini 2.5 Flash.';
    }

    if (
      errorMessage.includes('401') ||
      errorMessage.includes('API_KEY_INVALID') ||
      errorMessage.includes('unauthorized')
    ) {
      return 'Invalid API key. Please check that you copied the entire key.';
    }

    if (errorMessage.includes('403') || errorMessage.includes('PERMISSION_DENIED')) {
      return 'API key does not have permission. Please enable the Gemini API in Google Cloud console.';
    }

    if (
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('network')
    ) {
      return 'Network error. Please check your internet connection.';
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return 'Request timed out. The API might be busy - please try again.';
    }

    return 'Could not validate API key. Please verify your key and try again.';
  }
}
