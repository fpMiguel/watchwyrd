/**
 * Test Helpers
 *
 * Shared utilities for testing.
 */

import express, { type Express } from 'express';
import { vi } from 'vitest';
import { encryptConfig } from '../../src/utils/crypto.js';
import { serverConfig } from '../../src/config/server.js';
import type { UserConfig } from '../../src/types/index.js';
import { FULL_GEMINI_CONFIG } from '../__fixtures__/configs.js';

/**
 * Create a test Express app with routes mounted
 */
export async function createTestApp(
  options: {
    mountConfigure?: boolean;
    mountStremio?: boolean;
    initCache?: boolean;
  } = {}
): Promise<Express> {
  const { mountConfigure = true, mountStremio = true, initCache = true } = options;

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Initialize cache if needed
  if (initCache) {
    const { createCache } = await import('../../src/cache/index.js');
    await createCache();
  }

  // Mount routes
  if (mountConfigure) {
    const { createConfigureRoutes } = await import('../../src/handlers/configure/index.js');
    app.use('/configure', createConfigureRoutes());
  }

  if (mountStremio) {
    const { createStremioRoutes } = await import('../../src/handlers/stremio.js');
    app.use('/', createStremioRoutes());
  }

  return app;
}

/**
 * Clean up test app (close cache, etc.)
 */
export async function cleanupTestApp(): Promise<void> {
  const { closeCache } = await import('../../src/cache/index.js');
  await closeCache();
}

/**
 * Encrypt a config for URL usage
 */
export function toEncryptedConfig(config: Partial<UserConfig>): string {
  return encryptConfig(config, serverConfig.security.secretKey);
}

/**
 * Create an encrypted config URL path
 */
export function createConfigPath(config: Partial<UserConfig>, endpoint: string): string {
  const encrypted = toEncryptedConfig(config);
  return `/${encrypted}${endpoint}`;
}

/**
 * Create a valid test config with overrides
 */
export function createTestConfig(overrides: Partial<UserConfig> = {}): UserConfig {
  return {
    ...FULL_GEMINI_CONFIG,
    ...overrides,
  };
}

/**
 * Wait for a specific duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a deferred promise (can be resolved/rejected externally)
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Mock console methods for testing logs
 */
export function mockConsole() {
  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  const mocks = {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
  };

  return {
    mocks,
    restore: () => {
      console.log = original.log;
      console.warn = original.warn;
      console.error = original.error;
      console.info = original.info;
    },
  };
}

/**
 * Generate a random API key for testing
 */
export function generateTestApiKey(prefix = 'test'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = `${prefix}_`;
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * Create a mock HTTP response
 */
export function createMockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Map(),
  };
}

/**
 * Assert that a function throws with specific message
 */
export async function expectAsyncThrow(
  fn: () => Promise<unknown>,
  messageMatch: string | RegExp
): Promise<void> {
  let error: Error | null = null;

  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }

  if (!error) {
    throw new Error('Expected function to throw, but it did not');
  }

  if (typeof messageMatch === 'string') {
    if (!error.message.includes(messageMatch)) {
      throw new Error(
        `Expected error message to include "${messageMatch}", got "${error.message}"`
      );
    }
  } else {
    if (!messageMatch.test(error.message)) {
      throw new Error(`Expected error message to match ${messageMatch}, got "${error.message}"`);
    }
  }
}

/**
 * Measure execution time of an async function
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; elapsed: number }> {
  const start = Date.now();
  const result = await fn();
  const elapsed = Date.now() - start;
  return { result, elapsed };
}

/**
 * Retry a function with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; initialDelay?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, initialDelay = 100 } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e as Error;
      if (attempt < maxAttempts) {
        await sleep(initialDelay * Math.pow(2, attempt - 1));
      }
    }
  }

  throw lastError;
}
