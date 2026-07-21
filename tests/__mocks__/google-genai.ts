/**
 * Mock Google GenAI SDK
 *
 * Factory functions for creating controllable mock instances
 * of the @google/genai SDK for testing GeminiProvider.
 */

import { vi } from 'vitest';
import type { SAMPLE_MOVIE_RECOMMENDATIONS } from '../__fixtures__/recommendations.js';

/**
 * Create a fully controllable mock for the Google GenAI SDK.
 * Returns both the mock constructors and the inner mock functions
 * that can be asserted or reconfigured in tests.
 */
export function createMockGoogleGenAI() {
  const mockGenerateContent = vi.fn();

  const GoogleGenAI = vi.fn(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  }));

  return {
    GoogleGenAI,
    mockGenerateContent,
    HarmCategory: {
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    },
    HarmBlockThreshold: {
      BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
    },
  };
}

/**
 * Configure the mock generateContent to return a successful JSON response.
 */
export function setupGeminiSuccess(
  mockGenerateContent: ReturnType<typeof vi.fn>,
  items: readonly { title: string; year: number; reason?: string }[] = []
) {
  mockGenerateContent.mockResolvedValue({
    text: JSON.stringify({ items }),
  });
}

/**
 * Configure the mock generateContent to return empty text.
 */
export function setupGeminiEmptyResponse(
  mockGenerateContent: ReturnType<typeof vi.fn>
) {
  mockGenerateContent.mockResolvedValue({
    text: null,
  });
}

/**
 * Configure the mock generateContent to throw a specific error.
 */
export function setupGeminiError(
  mockGenerateContent: ReturnType<typeof vi.fn>,
  errorMessage: string
) {
  mockGenerateContent.mockRejectedValue(new Error(errorMessage));
}

/**
 * Configure the mock generateContent to return malformed JSON.
 */
export function setupGeminiMalformedJson(
  mockGenerateContent: ReturnType<typeof vi.fn>,
  rawText: string
) {
  mockGenerateContent.mockResolvedValue({
    text: rawText,
  });
}