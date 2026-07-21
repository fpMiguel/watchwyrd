/**
 * Mock Perplexity AI SDK
 *
 * Factory functions for creating controllable mock instances
 * of the @perplexity-ai/perplexity_ai SDK for testing PerplexityProvider.
 */

import { vi } from 'vitest';

/**
 * Create a fully controllable mock for the Perplexity AI SDK.
 * Returns both the mock constructor and inner mock functions.
 */
export function createMockPerplexity() {
  const mockCreate = vi.fn();

  const Perplexity = vi.fn(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));

  return {
    Perplexity,
    mockCreate,
  };
}

/**
 * Configure the mock chat.completions.create to return a successful response
 * with the given content string.
 */
export function setupPerplexitySuccess(
  mockCreate: ReturnType<typeof vi.fn>,
  content: string
) {
  mockCreate.mockResolvedValue({
    choices: [
      {
        message: {
          content,
        },
      },
    ],
  });
}

/**
 * Configure the mock to return a response with array content (Perplexity's content type format).
 */
export function setupPerplexityArrayContent(
  mockCreate: ReturnType<typeof vi.fn>,
  textParts: string[]
) {
  mockCreate.mockResolvedValue({
    choices: [
      {
        message: {
          content: textParts.map((text) => ({ text })),
        },
      },
    ],
  });
}

/**
 * Configure the mock to return an empty response (no content).
 */
export function setupPerplexityEmptyResponse(
  mockCreate: ReturnType<typeof vi.fn>
) {
  mockCreate.mockResolvedValue({
    choices: [
      {
        message: {
          content: null,
        },
      },
    ],
  });
}

/**
 * Configure the mock to throw an error.
 */
export function setupPerplexityError(
  mockCreate: ReturnType<typeof vi.fn>,
  errorMessage: string
) {
  mockCreate.mockRejectedValue(new Error(errorMessage));
}