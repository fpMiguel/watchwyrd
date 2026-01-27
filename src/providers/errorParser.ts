/**
 * Watchwyrd - API Error Parser
 *
 * Shared utility for parsing API errors into user-friendly messages.
 * Used across all AI providers for consistent error handling.
 */

import type { AIProvider } from '../types/index.js';

/**
 * Error category for classification
 */
export type ApiErrorCategory =
  | 'auth'
  | 'rate-limit'
  | 'billing'
  | 'model'
  | 'network'
  | 'timeout'
  | 'server'
  | 'unknown';

/**
 * Parsed API error result
 */
export interface ParsedApiError {
  category: ApiErrorCategory;
  userMessage: string;
}

/**
 * Error pattern definition
 */
interface ErrorPattern {
  patterns: string[];
  category: ApiErrorCategory;
  getMessage: (provider: AIProvider, errorMessage: string) => string;
}

/**
 * Common error patterns shared across providers
 */
const COMMON_ERROR_PATTERNS: ErrorPattern[] = [
  // Authentication errors
  {
    patterns: ['401', 'unauthorized', 'invalid_api_key', 'API_KEY_INVALID', 'Incorrect API key'],
    category: 'auth',
    getMessage: (provider) =>
      `Invalid API key. Please check your ${getProviderName(provider)} API key.`,
  },
  // Rate limit errors
  {
    patterns: ['429', 'rate_limit', 'quota', 'too many requests', 'resource exhausted'],
    category: 'rate-limit',
    getMessage: (_provider, errorMessage) => {
      // Check for free tier specific message
      if (errorMessage.includes('free_tier')) {
        return 'You have exceeded your free tier quota. Please wait a few minutes or upgrade.';
      }
      // Extract retry delay if present
      const retryMatch = errorMessage.match(/retry in (\d+\.?\d*)/i);
      if (retryMatch?.[1]) {
        return `Rate limit exceeded. Please wait ${Math.ceil(parseFloat(retryMatch[1]))} seconds.`;
      }
      return 'Rate limit exceeded. Please wait a moment and try again.';
    },
  },
  // Billing errors
  {
    patterns: ['402', 'billing', 'payment', 'insufficient_quota', 'insufficient credits'],
    category: 'billing',
    getMessage: (provider) =>
      `Billing issue with your ${getProviderName(provider)} account. Please check your subscription.`,
  },
  // Model errors
  {
    patterns: ['404', 'model_not_found', 'not found'],
    category: 'model',
    getMessage: () => 'The selected model is not available. Please try a different model.',
  },
  // Permission errors
  {
    patterns: ['403', 'PERMISSION_DENIED', 'forbidden'],
    category: 'auth',
    getMessage: (provider) =>
      `API key does not have permission. Please check your ${getProviderName(provider)} account settings.`,
  },
  // Network errors
  {
    patterns: ['ENOTFOUND', 'ECONNREFUSED', 'network', 'ECONNRESET'],
    category: 'network',
    getMessage: () => 'Network error. Please check your internet connection.',
  },
  // Timeout errors
  {
    patterns: ['timeout', 'ETIMEDOUT', 'timed out'],
    category: 'timeout',
    getMessage: () => 'Request timed out. The API might be busy - please try again.',
  },
  // Server errors
  {
    patterns: ['500', '502', '503', '504', 'overloaded', 'unavailable'],
    category: 'server',
    getMessage: (provider) =>
      `${getProviderName(provider)} service is temporarily unavailable. Please try again later.`,
  },
];

/**
 * Get display name for provider
 */
function getProviderName(provider: AIProvider): string {
  switch (provider) {
    case 'gemini':
      return 'Gemini';
    case 'openai':
      return 'OpenAI';
    case 'perplexity':
      return 'Perplexity';
    default:
      return 'AI';
  }
}

/**
 * Parse an API error message into a user-friendly message
 *
 * @param errorMessage - The raw error message
 * @param provider - The AI provider for context
 * @returns Parsed error with category and user message
 */
export function parseApiError(errorMessage: string, provider: AIProvider): ParsedApiError {
  const lowerMessage = errorMessage.toLowerCase();

  for (const { patterns, category, getMessage } of COMMON_ERROR_PATTERNS) {
    const matches = patterns.some((pattern) => lowerMessage.includes(pattern.toLowerCase()));
    if (matches) {
      return {
        category,
        userMessage: getMessage(provider, errorMessage),
      };
    }
  }

  return {
    category: 'unknown',
    userMessage: 'Could not validate API key. Please verify your key and try again.',
  };
}
