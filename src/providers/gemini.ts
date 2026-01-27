/**
 * Gemini AI Provider - Handles communication with Google's Gemini API.
 * Uses the new @google/genai SDK (replaces deprecated @google/generative-ai).
 */

import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
  type GenerateContentConfig,
  type SafetySetting,
} from '@google/genai';
import type {
  UserConfig,
  ContextSignals,
  ContentType,
  AIResponse,
  GeminiModel,
} from '../types/index.js';
import {
  type IAIProvider,
  type GenerationConfig,
  type GenerationOverrides,
  DEFAULT_GENERATION_CONFIG,
} from './types.js';
import { SYSTEM_PROMPT } from '../prompts/index.js';
import { parseAIResponse, type Recommendation, getGeminiJsonSchema } from '../schemas/index.js';
import { logger, createClientPool, retry } from '../utils/index.js';
import { geminiCircuit } from '../utils/circuitBreaker.js';
import { deduplicateRecommendations, buildAIResponse, parseJsonSafely } from './utils.js';
import { parseApiError } from './errorParser.js';

// Model mapping (see ADR-010)
const MODEL_MAPPING: Record<GeminiModel, string> = {
  'gemini-2.5-flash': 'gemini-2.5-flash',
  'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
  'gemini-2.0-flash': 'gemini-2.0-flash',
  'gemini-2.0-flash-lite': 'gemini-2.0-flash-lite',
  'gemini-2.5-pro': 'gemini-2.5-pro',
  'gemini-3-flash-preview': 'gemini-3-flash-preview',
};

const SAFETY_SETTINGS: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Client pool for HTTP/2 connection reuse (using shared utility)
const clientPool = createClientPool<GoogleGenAI>({
  name: 'gemini',
  prefix: 'gemini',
  createClient: (apiKey) => new GoogleGenAI({ apiKey }),
});

export class GeminiProvider implements IAIProvider {
  readonly provider = 'gemini' as const;
  readonly model: GeminiModel;

  private ai: GoogleGenAI;
  private config: GenerationConfig;
  private enableGrounding: boolean;

  // Grounding disabled: incompatible with structured JSON output (responseMimeType: 'application/json')
  constructor(
    apiKey: string,
    model: GeminiModel = 'gemini-2.5-flash',
    config: Partial<GenerationConfig> = {},
    _enableGrounding = false
  ) {
    this.ai = clientPool.get(apiKey);
    this.model = model;
    this.config = { ...DEFAULT_GENERATION_CONFIG, ...config };
    this.enableGrounding = false;

    // eslint-disable-next-line security/detect-object-injection -- model is Zod-validated enum
    logger.info('Gemini provider initialized', { model, actualModel: MODEL_MAPPING[model] });
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
    options?: GenerationOverrides
  ): Promise<AIResponse> {
    if (!prompt) throw new Error('Prompt is required');

    const includeReason = config.showExplanations !== false;
    logger.debug('Generating recommendations', {
      contentType,
      count,
      model: this.model,
      temperature: options?.temperature ?? this.config.temperature,
    });

    // Circuit breaker wraps the entire retry operation so a single failed
    // request (with retries) counts as one failure, not multiple
    const recommendations = await geminiCircuit.execute(() =>
      retry(async () => this.generateWithStructuredOutput(prompt, includeReason, options), {
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
      })
    );

    // Deduplicate results using shared utility
    const deduplicated = deduplicateRecommendations(recommendations);

    logger.info('Recommendations generated', { contentType, count: deduplicated.length });

    return buildAIResponse(
      deduplicated,
      recommendations.length,
      this.model,
      'gemini',
      this.enableGrounding
    );
  }

  private async generateWithStructuredOutput(
    prompt: string,
    includeReason = true,
    options?: GenerationOverrides
  ): Promise<Recommendation[]> {
    const jsonSchema = getGeminiJsonSchema(includeReason) as Record<string, unknown>;

    const actualModel = MODEL_MAPPING[this.model];

    // Gemini 3 and 2.5-pro need thinkingBudget: 0 for reliable JSON output (see ADR-010)
    const isThinkingModel =
      actualModel.includes('gemini-3') || actualModel.includes('gemini-2.5-pro');

    // Build generation config for new SDK
    const generateConfig: GenerateContentConfig = {
      responseMimeType: 'application/json',
      responseJsonSchema: jsonSchema,
      maxOutputTokens: this.config.maxOutputTokens,
      systemInstruction: SYSTEM_PROMPT,
      safetySettings: SAFETY_SETTINGS,
    };

    // Thinking models don't support custom temperature
    if (!isThinkingModel) {
      // Use override temperature if provided, otherwise use default config
      generateConfig.temperature = options?.temperature ?? this.config.temperature;
      generateConfig.topP = this.config.topP;
    }

    // Suppress thinking tokens for reliable JSON
    if (isThinkingModel) {
      generateConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const response = await this.ai.models.generateContent({
      model: actualModel,
      contents: prompt,
      config: generateConfig,
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    // Parse and validate with Zod (using shared utility for error handling)
    const parsed = parseJsonSafely(text);
    const validated = parseAIResponse(parsed);

    return validated.items;
  }

  async validateApiKey(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Note: Gemini 2.5+ models use "thinking tokens" internally, so we need
      // a higher maxOutputTokens to ensure we get actual output text
      const response = await retry(
        async () => {
          return await this.ai.models.generateContent({
            model: MODEL_MAPPING[this.model],
            contents: 'Reply with just: OK',
            config: { maxOutputTokens: 50 },
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

      const text = response.text;
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

  private parseApiError(errorMessage: string): string {
    return parseApiError(errorMessage, 'gemini').userMessage;
  }
}
