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
    getMessage: () => 'Invalid API key. Please check your configuration.',
  },
  // Rate limit errors
  {
    patterns: ['429', 'rate_limit', 'quota', 'too many requests', 'resource exhausted'],
    category: 'rate-limit',
    getMessage: () => 'Rate limit exceeded. Please wait and try again later.'
  },
  // Billing errors
  {
    patterns: ['402', 'billing', 'payment', 'insufficient_quota', 'insufficient credits'],
    category: 'billing',
    getMessage: () => 'Billing issue. Please check your account subscription.',
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
    getMessage: () => 'API key lacks required permissions. Please check your account settings.',
  },
  // Network errors
  {
    patterns: ['ENOTFOUND', 'ECONNREFUSED', 'network', 'ECONNRESET'],
    category: 'network',
    getMessage: () => 'Network error. Please check your connection and try again.',
  },
  // Timeout errors
  {
    patterns: ['timeout', 'ETIMEDOUT', 'timed out'],
    category: 'timeout',
    getMessage: () => 'Request timed out. The service might be busy - please try again.',
  },
  // Server errors
  {
    patterns: ['500', '502', '503', '504', 'overloaded', 'unavailable'],
    category: 'server',
    getMessage: () => 'Service temporarily unavailable. Please try again later.',
  },
];
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
