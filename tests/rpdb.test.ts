/**
 * RPDB Service Tests
 *
 * Tests for RatingPosterDB poster URL generation and validation.
 */

import { describe, it, expect } from 'vitest';
import {
  getRPDBPosterUrl,
  enhancePosterUrl,
  isRPDBEnabled,
  isValidRPDBKey,
  RPDB_FREE_KEY,
} from '../src/services/rpdb.js';

describe('RPDB Service', () => {
  describe('getRPDBPosterUrl', () => {
    it('should generate correct RPDB URL', () => {
      const url = getRPDBPosterUrl('test-api-key', 'tt0111161');

      expect(url).toBe(
        'https://api.ratingposterdb.com/test-api-key/imdb/poster-default/tt0111161.jpg'
      );
    });

    it('should use specified tier', () => {
      const url = getRPDBPosterUrl('test-api-key', 'tt0111161', { tier: 'poster-w780' });

      expect(url).toBe(
        'https://api.ratingposterdb.com/test-api-key/imdb/poster-w780/tt0111161.jpg'
      );
    });

    it('should return empty string for invalid IMDb ID', () => {
      const url = getRPDBPosterUrl('test-api-key', 'invalid123');

      expect(url).toBe('');
    });

    it('should return fallback for invalid IMDb ID', () => {
      const url = getRPDBPosterUrl('test-api-key', 'invalid123', {
        fallback: 'https://fallback.com/poster.jpg',
      });

      expect(url).toBe('https://fallback.com/poster.jpg');
    });

    it('should accept valid IMDb IDs starting with tt', () => {
      const url = getRPDBPosterUrl('key', 'tt0000001');

      expect(url).toContain('tt0000001.jpg');
    });
  });

  describe('enhancePosterUrl', () => {
    it('should return RPDB URL when API key is provided', () => {
      const url = enhancePosterUrl('https://original.com/poster.jpg', 'tt0111161', 'my-api-key');

      expect(url).toContain('ratingposterdb.com');
      expect(url).toContain('my-api-key');
      expect(url).toContain('tt0111161');
    });

    it('should return original URL when no API key', () => {
      const url = enhancePosterUrl('https://original.com/poster.jpg', 'tt0111161');

      expect(url).toBe('https://original.com/poster.jpg');
    });

    it('should return original URL when API key is empty', () => {
      const url = enhancePosterUrl('https://original.com/poster.jpg', 'tt0111161', '');

      expect(url).toBe('https://original.com/poster.jpg');
    });

    it('should return empty string when no original and no API key', () => {
      const url = enhancePosterUrl(undefined, 'tt0111161');

      expect(url).toBe('');
    });
  });

  describe('isRPDBEnabled', () => {
    it('should return true when API key is provided', () => {
      expect(isRPDBEnabled('my-api-key')).toBe(true);
    });

    it('should return false when API key is undefined', () => {
      expect(isRPDBEnabled(undefined)).toBe(false);
    });

    it('should return false when API key is empty string', () => {
      expect(isRPDBEnabled('')).toBe(false);
    });
  });

  describe('isValidRPDBKey', () => {
    it('should accept free tier key', () => {
      expect(isValidRPDBKey(RPDB_FREE_KEY)).toBe(true);
      expect(isValidRPDBKey('t0-free-rpdb')).toBe(true);
    });

    it('should accept tier 0 keys', () => {
      expect(isValidRPDBKey('t0-abc123')).toBe(true);
    });

    it('should accept tier 1 keys', () => {
      expect(isValidRPDBKey('t1-xyz789')).toBe(true);
    });

    it('should accept tier 2 keys', () => {
      expect(isValidRPDBKey('t2-premium')).toBe(true);
    });

    it('should reject empty keys', () => {
      expect(isValidRPDBKey('')).toBe(false);
    });

    it('should reject keys without tier prefix', () => {
      expect(isValidRPDBKey('abc123')).toBe(false);
    });

    it('should reject invalid tier prefixes', () => {
      expect(isValidRPDBKey('t3-invalid')).toBe(false);
      expect(isValidRPDBKey('t9-invalid')).toBe(false);
    });

    it('should reject keys with special characters', () => {
      expect(isValidRPDBKey('t0-abc@123')).toBe(false);
      expect(isValidRPDBKey('t1-key_test')).toBe(false);
    });
  });

  describe('RPDB_FREE_KEY constant', () => {
    it('should be the documented free tier key', () => {
      expect(RPDB_FREE_KEY).toBe('t0-free-rpdb');
    });
  });
});
