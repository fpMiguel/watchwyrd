/**
 * Gemini AI Provider - Handles communication with Google's Gemini API.
 */

// Tool type kept for future grounding support
import {
  GoogleGenerativeAI,
  SchemaType,
  HarmCategory,
  HarmBlockThreshold,
  type Schema,
  type Tool,
} from '@google/generative-ai';
void (undefined as unknown as Tool);
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
  type GenerationOptions,
  DEFAULT_GENERATION_CONFIG,
} from './types.js';
import { SYSTEM_PROMPT } from '../prompts/index.js';
import { parseAIResponse, type Recommendation, getGeminiJsonSchema } from '../schemas/index.js';
import { logger, createClientPool } from '../utils/index.js';
import { retry } from '../utils/index.js';
import { deduplicateRecommendations, buildAIResponse, parseJsonSafely } from './utils.js';

// Model mapping (see ADR-010)
const MODEL_MAPPING: Record<GeminiModel, string> = {
  'gemini-2.5-flash': 'gemini-2.5-flash',
  'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
  'gemini-2.0-flash': 'gemini-2.0-flash',
  'gemini-2.0-flash-lite': 'gemini-2.0-flash-lite',
  'gemini-2.5-pro': 'gemini-2.5-pro',
  'gemini-3-flash-preview': 'gemini-3-flash-preview',
};

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Client pool for HTTP/2 connection reuse (using shared utility)
const clientPool = createClientPool<GoogleGenerativeAI>({
  name: 'gemini',
  prefix: 'gemini',
  createClient: (apiKey) => new GoogleGenerativeAI(apiKey),
});

export class GeminiProvider implements IAIProvider {
  readonly provider = 'gemini' as const;
  readonly model: GeminiModel;

  private genAI: GoogleGenerativeAI;
  private config: GenerationConfig;
  private enableGrounding: boolean;

  // Grounding disabled: incompatible with structured JSON output (responseMimeType: 'application/json')
  constructor(
    apiKey: string,
    model: GeminiModel = 'gemini-2.5-flash',
    config: Partial<GenerationConfig> = {},
    _enableGrounding = false
  ) {
    this.genAI = clientPool.get(apiKey);
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
    options?: GenerationOptions
  ): Promise<AIResponse> {
    if (!prompt) throw new Error('Prompt is required');

    const includeReason = config.showExplanations !== false;
    logger.debug('Generating recommendations', {
      contentType,
      count,
      model: this.model,
      temperature: options?.temperature ?? this.config.temperature,
    });

    const recommendations = await retry(
      async () => this.generateWithStructuredOutput(prompt, includeReason, options),
      {
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
      }
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
    options?: GenerationOptions
  ): Promise<Recommendation[]> {
    const geminiSchema = this.convertToGeminiSchema(
      getGeminiJsonSchema(includeReason) as Record<string, unknown>
    ) as unknown as Schema;

    const actualModel = MODEL_MAPPING[this.model];

    // Gemini 3 and 2.5-pro need thinkingBudget: 0 for reliable JSON output (see ADR-010)
    const isThinkingModel =
      actualModel.includes('gemini-3') || actualModel.includes('gemini-2.5-pro');

    // Build generation config
    const generationConfig: Record<string, unknown> = {
      responseMimeType: 'application/json',
      responseSchema: geminiSchema,
      maxOutputTokens: this.config.maxOutputTokens,
    };

    // Thinking models don't support custom temperature
    if (!isThinkingModel) {
      // Use override temperature if provided, otherwise use default config
      generationConfig['temperature'] = options?.temperature ?? this.config.temperature;
      generationConfig['topP'] = this.config.topP;
    }

    // Suppress thinking tokens for reliable JSON
    if (isThinkingModel) {
      generationConfig['thinkingConfig'] = { thinkingBudget: 0 };
    }

    const model = this.genAI.getGenerativeModel({
      model: actualModel,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig,
      safetySettings: SAFETY_SETTINGS,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = result.response.text();
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    // Parse and validate with Zod (using shared utility for error handling)
    const parsed = parseJsonSafely(text);
    const validated = parseAIResponse(parsed);

    return validated.items;
  }

  /* eslint-disable security/detect-object-injection -- static schema conversion, no user input */
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
  /* eslint-enable security/detect-object-injection */

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
