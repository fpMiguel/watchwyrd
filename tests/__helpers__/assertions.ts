/**
 * Custom Vitest Matchers
 *
 * Extended assertions for domain-specific testing.
 */

// Set required environment variables BEFORE any imports
// This must be at the top to ensure server config loads correctly
process.env['SECRET_KEY'] = 'vitest-secret-key-for-testing-only-32chars';

import { expect } from 'vitest';
import type { StremioMeta, StremioCatalog } from '../../src/types/index.js';

/**
 * Extend Vitest's expect with custom matchers
 */
expect.extend({
  /**
   * Assert that a string is a valid IMDb ID
   */
  toBeValidImdbId(received: unknown) {
    const pass = typeof received === 'string' && /^tt\d{7,9}$/.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid IMDb ID`
          : `expected ${received} to be a valid IMDb ID (format: tt1234567)`,
    };
  },

  /**
   * Assert that an object is a valid Stremio meta
   */
  toBeValidStremiMeta(received: unknown) {
    const meta = received as StremioMeta;
    const errors: string[] = [];

    if (!meta || typeof meta !== 'object') {
      return {
        pass: false,
        message: () => `expected value to be an object, got ${typeof meta}`,
      };
    }

    if (!meta.id || typeof meta.id !== 'string') {
      errors.push('missing or invalid id');
    }

    if (!meta.type || !['movie', 'series'].includes(meta.type)) {
      errors.push('missing or invalid type (must be movie or series)');
    }

    if (!meta.name || typeof meta.name !== 'string') {
      errors.push('missing or invalid name');
    }

    const pass = errors.length === 0;

    return {
      pass,
      message: () =>
        pass
          ? `expected meta not to be valid`
          : `expected valid Stremio meta, but: ${errors.join(', ')}`,
    };
  },

  /**
   * Assert that an object is a valid Stremio catalog
   */
  toBeValidStremioCatalog(received: unknown) {
    const catalog = received as StremioCatalog;
    const errors: string[] = [];

    if (!catalog || typeof catalog !== 'object') {
      return {
        pass: false,
        message: () => `expected value to be an object`,
      };
    }

    if (!Array.isArray(catalog.metas)) {
      errors.push('metas must be an array');
    } else {
      for (let i = 0; i < catalog.metas.length; i++) {
        const meta = catalog.metas[i];
        if (!meta.id) errors.push(`metas[${i}] missing id`);
        if (!meta.type) errors.push(`metas[${i}] missing type`);
        if (!meta.name) errors.push(`metas[${i}] missing name`);
      }
    }

    const pass = errors.length === 0;

    return {
      pass,
      message: () =>
        pass
          ? `expected catalog not to be valid`
          : `expected valid Stremio catalog, but: ${errors.join(', ')}`,
    };
  },

  /**
   * Assert that an array has unique values
   */
  toHaveUniqueValues(received: unknown[]) {
    const seen = new Set();
    const duplicates: unknown[] = [];

    for (const item of received) {
      if (seen.has(item)) {
        duplicates.push(item);
      }
      seen.add(item);
    }

    const pass = duplicates.length === 0;

    return {
      pass,
      message: () =>
        pass
          ? `expected array to have duplicate values`
          : `expected unique values, but found duplicates: ${duplicates.join(', ')}`,
    };
  },

  /**
   * Assert that a number is within range
   */
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be within range [${min}, ${max}]`
          : `expected ${received} to be within range [${min}, ${max}]`,
    };
  },

  /**
   * Assert that an async function resolves within timeout
   */
  async toResolveWithin(received: Promise<unknown>, timeoutMs: number) {
    const start = Date.now();
    let resolved = false;
    let error: Error | null = null;

    try {
      await Promise.race([
        received.then(() => {
          resolved = true;
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)),
      ]);
    } catch (e) {
      error = e as Error;
    }

    const elapsed = Date.now() - start;
    const pass = resolved && elapsed < timeoutMs;

    return {
      pass,
      message: () =>
        pass
          ? `expected promise not to resolve within ${timeoutMs}ms`
          : error?.message === 'Timeout'
            ? `expected promise to resolve within ${timeoutMs}ms, but it timed out`
            : `expected promise to resolve within ${timeoutMs}ms, took ${elapsed}ms`,
    };
  },
});

/**
 * Type declarations for custom matchers
 */
declare module 'vitest' {
  interface Assertion<T = unknown> {
    toBeValidImdbId(): T;
    toBeValidStremiMeta(): T;
    toBeValidStremioCatalog(): T;
    toHaveUniqueValues(): T;
    toBeWithinRange(min: number, max: number): T;
    toResolveWithin(timeoutMs: number): Promise<T>;
  }

  interface AsymmetricMatchersContaining {
    toBeValidImdbId(): unknown;
    toBeValidStremiMeta(): unknown;
    toBeValidStremioCatalog(): unknown;
    toHaveUniqueValues(): unknown;
    toBeWithinRange(min: number, max: number): unknown;
  }
}

export {};
