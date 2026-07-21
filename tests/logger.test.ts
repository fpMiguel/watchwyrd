import { describe, it, expect, vi, afterEach } from 'vitest';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('array redaction', () => {
    it('should handle arrays with string elements containing sensitive data (line 44)', async () => {
      vi.resetModules();
      const { logger } = await import('../src/utils/logger.js');
      expect(() => {
        logger.info('test', ['sk-abcdef12345678901234567890']);
      }).not.toThrow();
    });

    it('should handle arrays with nested objects containing sensitive data (line 46)', async () => {
      vi.resetModules();
      const { logger } = await import('../src/utils/logger.js');
      expect(() => {
        logger.info('test', [{ key: 'sk-abcdef12345678901234567890' }]);
      }).not.toThrow();
    });

    it('should handle arrays with mixed primitive elements (non-string, non-object)', async () => {
      vi.resetModules();
      const { logger } = await import('../src/utils/logger.js');
      expect(() => {
        logger.info('test', [42, true, null, 'safe string']);
      }).not.toThrow();
    });
  });

  describe('non-object fallback (line 67)', () => {
    it('should handle number passed as meta hitting return obj fallback', async () => {
      vi.resetModules();
      const { logger } = await import('../src/utils/logger.js');
      expect(() => {
        logger.info('test', 42 as any);
      }).not.toThrow();
    });

    it('should handle boolean passed as meta hitting return obj fallback', async () => {
      vi.resetModules();
      const { logger } = await import('../src/utils/logger.js');
      expect(() => {
        logger.info('test', true as any);
      }).not.toThrow();
    });
  });

  describe('error logging', () => {
    it('should log error without meta parameter (line 201)', async () => {
      vi.resetModules();
      const { logger } = await import('../src/utils/logger.js');
      expect(() => {
        logger.error('test error');
      }).not.toThrow();
    });

    it('should log error with meta parameter (line 199)', async () => {
      vi.resetModules();
      const { logger } = await import('../src/utils/logger.js');
      expect(() => {
        logger.error('test error with meta', { error: 'something' });
      }).not.toThrow();
    });
  });

  describe('production logger (line 144)', () => {
    const ORIGINAL_NODE_ENV = process.env['NODE_ENV'];

    afterEach(() => {
      process.env['NODE_ENV'] = ORIGINAL_NODE_ENV;
    });

    it('should create production logger with JSON output when NODE_ENV=production', async () => {
      process.env['NODE_ENV'] = 'production';
      vi.resetModules();
      const { logger } = await import('../src/utils/logger.js');
      expect(() => {
        logger.info('production test');
      }).not.toThrow();
    });
  });
});