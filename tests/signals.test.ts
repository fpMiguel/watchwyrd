/**
 * Watchwyrd - Context Signal Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTimeOfDay,
  getDayType,
  getSeason,
  generateContextSignals,
  getTemporalBucket,
  describeContext,
} from '../src/signals/context.js';
import { getNearestHoliday, formatHolidayContext } from '../src/services/holidays.js';
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

  describe('getSeason', () => {
    it('should determine spring months (Northern Hemisphere)', () => {
      expect(getSeason(3, true)).toBe('spring');
      expect(getSeason(4, true)).toBe('spring');
      expect(getSeason(5, true)).toBe('spring');
    });

    it('should determine summer months (Northern Hemisphere)', () => {
      expect(getSeason(6, true)).toBe('summer');
      expect(getSeason(7, true)).toBe('summer');
      expect(getSeason(8, true)).toBe('summer');
    });

    it('should determine fall months (Northern Hemisphere)', () => {
      expect(getSeason(9, true)).toBe('fall');
      expect(getSeason(10, true)).toBe('fall');
      expect(getSeason(11, true)).toBe('fall');
    });

    it('should determine winter months (Northern Hemisphere)', () => {
      expect(getSeason(12, true)).toBe('winter');
      expect(getSeason(1, true)).toBe('winter');
      expect(getSeason(2, true)).toBe('winter');
    });

    it('should flip seasons for Southern Hemisphere', () => {
      expect(getSeason(6, false)).toBe('winter'); // June is winter in S.H.
      expect(getSeason(12, false)).toBe('summer'); // December is summer in S.H.
    });
  });

  describe('getNearestHoliday (async)', () => {
    it('should find Christmas on December 25 for US', async () => {
      const date = new Date('2026-12-25');
      const result = await getNearestHoliday(date, 'US');
      // The API should return Christmas Day
      expect(result).not.toBeNull();
      if (result) {
        expect(result.name.toLowerCase()).toContain('christmas');
      }
    });

    it('should return null for unsupported country codes', async () => {
      const date = new Date('2026-12-25');
      const result = await getNearestHoliday(date, 'XX');
      // XX is not a valid country, should return null
      expect(result).toBeNull();
    });

    it('should format holiday context correctly', () => {
      const holiday = {
        name: 'Christmas Day',
        localName: 'Christmas',
        date: '2026-12-25',
        daysUntil: 2,
        isToday: false,
        isTomorrow: false,
        types: ['Public'],
      };
      const formatted = formatHolidayContext(holiday);
      expect(formatted).toContain('Christmas Day');
      expect(formatted).toContain('2 days');
    });

    it('should format today holiday correctly', () => {
      const holiday = {
        name: 'Christmas Day',
        localName: 'Christmas',
        date: '2026-12-25',
        daysUntil: 0,
        isToday: true,
        isTomorrow: false,
        types: ['Public'],
      };
      const formatted = formatHolidayContext(holiday);
      expect(formatted).toBe('Christmas Day');
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
      // Holiday detection is async and depends on Nager.Date API
      // It may return null if no holiday is nearby or API is unavailable
      expect(typeof signals.nearbyHoliday === 'string' || signals.nearbyHoliday === null).toBe(
        true,
      );
    });
  });

  describe('getTemporalBucket', () => {
    it('should create bucket string from signals', () => {
      const signals = {
        timeOfDay: 'evening' as const,
        dayType: 'weekend' as const,
        season: 'fall' as const,
        localTime: '20:00',
        dayOfWeek: 'Saturday',
        date: '2026-10-31',
        nearbyHoliday: 'Halloween',
        timezone: 'UTC',
        country: 'US',
      };

      expect(getTemporalBucket(signals)).toBe('evening_weekend_fall');
    });
  });

  describe('describeContext', () => {
    it('should generate readable description', () => {
      const signals = {
        timeOfDay: 'evening' as const,
        dayType: 'weekend' as const,
        dayOfWeek: 'Saturday',
        season: 'winter' as const,
        nearbyHoliday: 'Christmas Day',
        localTime: '20:00',
        date: '2026-12-25',
        timezone: 'UTC',
        country: 'US',
      };

      const description = describeContext(signals);

      expect(description).toContain('evening');
      expect(description).toContain('Saturday');
      expect(description).toContain('winter');
      expect(description).toContain('Christmas');
    });
  });
});
