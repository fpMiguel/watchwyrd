/**
 * Watchwyrd - Context Signal Engine
 *
 * Derives contextual signals from system time, weather, and user configuration.
 * These signals are used to personalize recommendations.
 */

import type { ContextSignals, TimeOfDay, DayType, UserConfig } from '../types/index.js';
import { fetchWeather, fetchWeatherByCoords } from '../services/weather.js';
import { logger } from '../utils/logger.js';

// =============================================================================
// Time Classification
// =============================================================================

/**
 * Classify hour into time of day
 */
export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'latenight';
}

/**
 * Get day type (weekday or weekend)
 */
export function getDayType(dayOfWeek: number): DayType {
  // 0 = Sunday, 6 = Saturday
  return dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'weekday';
}

// =============================================================================
// Main Signal Generation
// =============================================================================

/**
 * Generate all context signals from current time and user config
 * Async to support weather API fetching
 */
export async function generateContextSignals(config: UserConfig): Promise<ContextSignals> {
  // Get current time in user's timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: config.timezone,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';

  const hour = parseInt(getPart('hour'), 10);
  const minute = getPart('minute');
  const day = getPart('day');
  const year = getPart('year');
  const weekdayName = getPart('weekday');

  // Calculate day of week (0-6)
  const localDate = new Date(`${year}-${getPart('month')}-${day}`);
  const dayOfWeek = localDate.getDay();

  // Build base signals
  const signals: ContextSignals = {
    localTime: `${String(hour).padStart(2, '0')}:${minute}`,
    timeOfDay: getTimeOfDay(hour),
    dayOfWeek: weekdayName,
    dayType: getDayType(dayOfWeek),
    date: `${year}-${getPart('month')}-${day}`,
    timezone: config.timezone,
    country: config.country,
  };

  // Fetch weather if enabled
  if (config.enableWeatherContext) {
    try {
      let weather;

      // Use explicit weather location if configured, otherwise fall back to timezone
      if (config.weatherLocation?.latitude && config.weatherLocation?.longitude) {
        weather = await fetchWeatherByCoords(
          config.weatherLocation.latitude,
          config.weatherLocation.longitude,
          config.timezone
        );
        logger.debug('Weather fetched for location', {
          location: config.weatherLocation.name,
          country: config.weatherLocation.country,
        });
      } else {
        weather = await fetchWeather(config.timezone);
      }

      if (weather) {
        signals.weather = {
          condition: weather.condition,
          temperature: weather.temperature,
          description: weather.description,
        };
        logger.debug('Weather context added', { weather: signals.weather });
      }
    } catch (error) {
      logger.warn('Failed to fetch weather for context', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  return signals;
}

/**
 * Create temporal bucket string for cache keying
 */
export function getTemporalBucket(signals: ContextSignals): string {
  return `${signals.timeOfDay}_${signals.dayType}`;
}

/**
 * Get human-readable context description for explanations
 */
export function describeContext(signals: ContextSignals): string {
  const parts: string[] = [];

  // Time description
  const timeDescriptions: Record<TimeOfDay, string> = {
    morning: 'this morning',
    afternoon: 'this afternoon',
    evening: 'this evening',
    latenight: 'late at night',
  };
  parts.push(timeDescriptions[signals.timeOfDay]);

  // Day description
  if (signals.dayType === 'weekend') {
    parts.push(`on a ${signals.dayOfWeek}`);
  }

  // Weather if available
  if (signals.weather) {
    parts.push(`(${signals.weather.description || signals.weather.condition})`);
  }

  return parts.join(' ');
}
