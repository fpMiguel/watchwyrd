/**
 * Watchwyrd - Express Rate Limiters
 *
 * Centralized rate limiting configuration for all routes.
 */

import rateLimit from 'express-rate-limit';
import { serverConfig } from '../config/server.js';

// Rate Limiters

/**
 * General rate limiter
 * Applied to Stremio addon routes
 */
export const generalLimiter = rateLimit({
  windowMs: serverConfig.rateLimit.windowMs,
  max: serverConfig.rateLimit.max,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => serverConfig.isDev,
});

/**
 * Strict rate limiter - stricter limit for configure routes
 */
export const strictLimiter = rateLimit({
  windowMs: serverConfig.rateLimit.windowMs,
  max: Math.max(1, Math.floor(serverConfig.rateLimit.max / 5)), // 20% of general max
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => serverConfig.isDev,
});

/**
 * Validation rate limiter - most restrictive for validation endpoints
 * Prevents API key enumeration attacks
 */
export const validationLimiter = rateLimit({
  windowMs: serverConfig.rateLimit.windowMs,
  max: Math.max(1, Math.floor(serverConfig.rateLimit.max / 10)), // 10% of general max
  message: { error: 'Too many validation attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => serverConfig.isDev,
});
