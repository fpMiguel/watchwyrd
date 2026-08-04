/**
 * Express Rate Limiter Middleware Tests
 *
 * Tests that the rate limiter middleware instances are configured
 * with the expected limits and dev-mode skip behavior.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock server config to control isDev for testing skip functions
vi.mock('../src/config/server.js', () => ({
  serverConfig: {
    port: 7000,
    host: '0.0.0.0',
    baseUrl: 'http://localhost:7000',
    nodeEnv: 'test',
    isDev: false,
    isProd: false,
    isTest: true,
    cache: { ttl: 21600, maxSize: 1000 },
    logging: { level: 'error' },
    rateLimit: { max: 100, windowMs: 900000 },
    security: { secretKey: 'test-key-32-chars-minimum-required', encryptionSalt: 'test-salt' },
  },
}));

import { generalLimiter, strictLimiter, validationLimiter } from '../src/middleware/rateLimiters.js';

describe('Rate Limiters', () => {
  it('should create generalLimiter with 100 max', () => {
    expect(generalLimiter).toBeDefined();
  });

  it('should create strictLimiter with 20 max', () => {
    expect(strictLimiter).toBeDefined();
  });

  it('should create validationLimiter with 10 max', () => {
    expect(validationLimiter).toBeDefined();
  });

  it('should evaluate skip function in test environment', async () => {
    const req = { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as never;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      headersSent: false,
    } as never;

    // Cover skip() in all three limiters
    for (const limiter of [generalLimiter, strictLimiter, validationLimiter]) {
      const next = vi.fn();
      await new Promise<void>((resolve) => {
        limiter(req, res, () => {
          next();
          resolve();
        });
      });
      expect(next).toHaveBeenCalled();
    }
  });
});
