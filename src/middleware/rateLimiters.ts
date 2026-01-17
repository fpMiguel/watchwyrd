/**
 * Watchwyrd - Express Rate Limiters
 *
 * Centralized rate limiting configuration for all routes.
 */

import rateLimit from 'express-rate-limit';
import { serverConfig } from '../config/server.js';

// =============================================================================
// Rate Limiters
// =============================================================================

/**
 * General rate limiter - 100 requests per 15 minutes
 * Applied to Stremio addon routes
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => serverConfig.isDev, // Skip in development
});

/**
 * Strict rate limiter - 20 requests per 15 minutes
 * Applied to configure page routes
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => serverConfig.isDev, // Skip in development
});

/**
 * Validation rate limiter - 10 requests per 15 minutes
 * Applied to API key validation endpoints
 * Prevents API key enumeration attacks
 */
export const validationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many validation attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => serverConfig.isDev, // Skip in development
});
