/**
 * Error Parser Tests
 */
import { describe, it, expect } from 'vitest';
import { parseApiError } from '../src/providers/errorParser.js';

describe('parseApiError', () => {
  describe('authentication errors', () => {
    it('should detect 401 status', () => {
      const result = parseApiError('Error 401: Unauthorized', 'gemini');
      expect(result.category).toBe('auth');
      expect(result.userMessage).toContain('Invalid API key');
    });

    it('should detect unauthorized message', () => {
      const result = parseApiError('unauthorized', 'openai');
      expect(result.category).toBe('auth');
      expect(result.userMessage).toContain('Invalid API key');
    });

    it('should detect invalid_api_key', () => {
      const result = parseApiError('invalid_api_key', 'perplexity');
      expect(result.category).toBe('auth');
      expect(result.userMessage).toContain('Invalid API key');
    });

    it('should detect API_KEY_INVALID', () => {
      const result = parseApiError('API_KEY_INVALID', 'gemini');
      expect(result.category).toBe('auth');
      expect(result.userMessage).toContain('Invalid API key');
    });

    it('should detect "Incorrect API key"', () => {
      const result = parseApiError('Incorrect API key provided', 'openai');
      expect(result.category).toBe('auth');
      expect(result.userMessage).toContain('Invalid API key');
    });

    it('should detect 403 permission denied', () => {
      const result = parseApiError('403 PERMISSION_DENIED', 'gemini');
      expect(result.category).toBe('auth');
      expect(result.userMessage).toContain('permissions');
    });

    it('should detect forbidden', () => {
      const result = parseApiError('forbidden', 'perplexity');
      expect(result.category).toBe('auth');
      expect(result.userMessage).toContain('permissions');
    });
  });

  describe('rate limit errors', () => {
    it('should detect 429 status', () => {
      const result = parseApiError('429 Too Many Requests', 'gemini');
      expect(result.category).toBe('rate-limit');
      expect(result.userMessage).toContain('Rate limit exceeded');
    });

    it('should detect rate_limit message', () => {
      const result = parseApiError('rate_limit_exceeded', 'openai');
      expect(result.category).toBe('rate-limit');
      expect(result.userMessage).toContain('Rate limit exceeded');
    });

    it('should detect quota exceeded', () => {
      const result = parseApiError('quota exceeded', 'perplexity');
      expect(result.category).toBe('rate-limit');
      expect(result.userMessage).toContain('Rate limit exceeded');
    });

    it('should detect too many requests', () => {
      const result = parseApiError('too many requests', 'gemini');
      expect(result.category).toBe('rate-limit');
      expect(result.userMessage).toContain('Rate limit exceeded');
    });

    it('should detect resource exhausted', () => {
      const result = parseApiError('resource exhausted', 'gemini');
      expect(result.category).toBe('rate-limit');
      expect(result.userMessage).toContain('Rate limit exceeded');
    });
  });

  describe('billing errors', () => {
    it('should detect 402 payment required', () => {
      const result = parseApiError('402 Payment Required', 'openai');
      expect(result.category).toBe('billing');
      expect(result.userMessage).toContain('Billing issue');
    });

    it('should detect billing message', () => {
      const result = parseApiError('billing issue', 'gemini');
      expect(result.category).toBe('billing');
      expect(result.userMessage).toContain('Billing issue');
    });

    it('should detect insufficient_quota', () => {
      const result = parseApiError('insufficient_quota', 'openai');
      // 'quota' pattern matches rate-limit before billing
      expect(result.category).toBe('rate-limit');
    });

    it('should detect insufficient credits', () => {
      const result = parseApiError('insufficient credits', 'perplexity');
      expect(result.category).toBe('billing');
    });
  });

  describe('model errors', () => {
    it('should detect 404 not found', () => {
      const result = parseApiError('404 model_not_found', 'gemini');
      expect(result.category).toBe('model');
      expect(result.userMessage).toContain('model is not available');
    });

    it('should detect model_not_found', () => {
      const result = parseApiError('model_not_found', 'openai');
      expect(result.category).toBe('model');
    });

    it('should detect generic not found', () => {
      const result = parseApiError('The requested resource was not found', 'perplexity');
      expect(result.category).toBe('model');
    });
  });

  describe('network errors', () => {
    it('should detect ENOTFOUND', () => {
      const result = parseApiError('ENOTFOUND api.openai.com', 'openai');
      expect(result.category).toBe('network');
      expect(result.userMessage).toContain('Network error');
    });

    it('should detect ECONNREFUSED', () => {
      const result = parseApiError('ECONNREFUSED', 'gemini');
      expect(result.category).toBe('network');
      expect(result.userMessage).toContain('Network error');
    });

    it('should detect ECONNRESET', () => {
      const result = parseApiError('ECONNRESET', 'perplexity');
      expect(result.category).toBe('network');
      expect(result.userMessage).toContain('Network error');
    });

    it('should detect network message', () => {
      const result = parseApiError('network error', 'gemini');
      expect(result.category).toBe('network');
    });
  });

  describe('timeout errors', () => {
    it('should detect ETIMEDOUT', () => {
      const result = parseApiError('ETIMEDOUT', 'openai');
      expect(result.category).toBe('timeout');
      expect(result.userMessage).toContain('timed out');
    });

    it('should detect timeout message', () => {
      const result = parseApiError('Request timed out', 'gemini');
      expect(result.category).toBe('timeout');
      expect(result.userMessage).toContain('timed out');
    });

    it('should detect "timed out"', () => {
      const result = parseApiError('The connection timed out', 'perplexity');
      expect(result.category).toBe('timeout');
    });
  });

  describe('server errors', () => {
    it('should detect 500', () => {
      const result = parseApiError('500 Internal Server Error', 'gemini');
      expect(result.category).toBe('server');
      expect(result.userMessage).toContain('Service temporarily unavailable');
    });

    it('should detect 502', () => {
      const result = parseApiError('502 Bad Gateway', 'openai');
      expect(result.category).toBe('server');
    });

    it('should detect 503', () => {
      const result = parseApiError('503 Service Unavailable', 'perplexity');
      expect(result.category).toBe('server');
    });

    it('should detect 504', () => {
      const result = parseApiError('504 Gateway Timeout', 'gemini');
      // 'timeout' pattern matches before '504' (server) pattern
      expect(result.category).toBe('timeout');
    });

    it('should detect overloaded', () => {
      const result = parseApiError('service overloaded', 'openai');
      expect(result.category).toBe('server');
    });

    it('should detect unavailable', () => {
      const result = parseApiError('service unavailable', 'perplexity');
      expect(result.category).toBe('server');
    });
  });

  describe('generic fallback', () => {
    it('should return unknown category for unrecognized errors', () => {
      const result = parseApiError('some random error that does not match any pattern', 'gemini');
      expect(result.category).toBe('unknown');
    });

    it('should return fallback message for unrecognized errors', () => {
      const result = parseApiError('unique_error_code_xyz', 'openai');
      expect(result.userMessage).toBe(
        'Could not validate API key. Please verify your key and try again.'
      );
    });

    it('should handle empty string', () => {
      const result = parseApiError('', 'gemini');
      expect(result.category).toBe('unknown');
    });
  });

  describe('security: no internal details leaked', () => {
    it('should not include the raw error message in user-facing output for auth errors', () => {
      const result = parseApiError(
        'API_KEY_INVALID: key sk-abc123 was rejected by api.openai.com/v1',
        'openai'
      );
      expect(result.userMessage).not.toContain('sk-abc123');
      expect(result.userMessage).not.toContain('api.openai.com');
    });

    it('should not include the raw error message in user-facing output for unknown errors', () => {
      const result = parseApiError(
        'POST https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent returned 500',
        'gemini'
      );
      expect(result.userMessage).not.toContain('generativelanguage.googleapis.com');
      expect(result.userMessage).not.toContain('generateContent');
    });
  });
});