/**
 * Watchwyrd - Context Signal Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTimeOfDay,
  getDayType,
  generateContextSignals,
  getTemporalBucket,
  describeContext,
} from '../src/signals/context.js';
import type { UserConfig } from '../src/types/index.js';

describe('Context Signals', () => {
  describe('getTimeOfDay', () => {
    it('should classify morning hours', () => {
      expect(getTimeOfDay(5)).toBe('morning');
      expect(getTimeOfDay(8)).toBe('morning');
      expect(getTimeOfDay(11)).toBe('morning');
    });

    it('should classify afternoon hours', () => {
      expect(getTimeOfDay(12)).toBe('afternoon');
      expect(getTimeOfDay(14)).toBe('afternoon');
      expect(getTimeOfDay(16)).toBe('afternoon');
    });

    it('should classify evening hours', () => {
      expect(getTimeOfDay(17)).toBe('evening');
      expect(getTimeOfDay(19)).toBe('evening');
      expect(getTimeOfDay(21)).toBe('evening');
    });

    it('should classify late night hours', () => {
      expect(getTimeOfDay(22)).toBe('latenight');
      expect(getTimeOfDay(0)).toBe('latenight');
      expect(getTimeOfDay(3)).toBe('latenight');
    });
  });

  describe('getDayType', () => {
    it('should identify weekdays', () => {
      expect(getDayType(1)).toBe('weekday'); // Monday
      expect(getDayType(2)).toBe('weekday'); // Tuesday
      expect(getDayType(3)).toBe('weekday'); // Wednesday
      expect(getDayType(4)).toBe('weekday'); // Thursday
      expect(getDayType(5)).toBe('weekday'); // Friday
    });

    it('should identify weekends', () => {
      expect(getDayType(0)).toBe('weekend'); // Sunday
      expect(getDayType(6)).toBe('weekend'); // Saturday
    });
  });

  describe('generateContextSignals', () => {
    let mockDate: Date;

    beforeEach(() => {
      mockDate = new Date('2026-10-31T20:30:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should generate complete context signals', async () => {
      const config = {
        geminiApiKey: 'test',
        timezone: 'UTC',
        country: 'US',
        enableWeatherContext: false,
      } as UserConfig;

      const signals = await generateContextSignals(config);

      expect(signals.timezone).toBe('UTC');
      expect(signals.country).toBe('US');
      expect(signals.date).toBe('2026-10-31');
    });
  });

  describe('getTemporalBucket', () => {
    it('should create bucket string from signals', () => {
      const signals = {
        timeOfDay: 'evening' as const,
        dayType: 'weekend' as const,
        localTime: '20:00',
        dayOfWeek: 'Saturday',
        date: '2026-10-31',
        timezone: 'UTC',
        country: 'US',
      };

      expect(getTemporalBucket(signals)).toBe('evening_weekend');
    });
  });

  describe('describeContext', () => {
    it('should generate readable description', () => {
      const signals = {
        timeOfDay: 'evening' as const,
        dayType: 'weekend' as const,
        dayOfWeek: 'Saturday',
        localTime: '20:00',
        date: '2026-12-25',
        timezone: 'UTC',
        country: 'US',
      };

      const description = describeContext(signals);

      expect(description).toContain('evening');
      expect(description).toContain('Saturday');
    });
  });
});
