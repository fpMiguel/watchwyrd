/**
 * Watchwyrd - Context Signal Engine
 *
 * Derives contextual signals from system time, weather, holidays, and user configuration.
 * These signals are used to personalize recommendations.
 */

import type { ContextSignals, TimeOfDay, DayType, Season, UserConfig } from '../types/index.js';
import { fetchWeather, fetchWeatherByCoords } from '../services/weather.js';
import { getNearestHoliday, formatHolidayContext } from '../services/holidays.js';
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

/**
 * Get season based on month (Northern Hemisphere)
 */
export function getSeason(month: number, isNorthernHemisphere = true): Season {
  // Adjust for hemisphere
  const adjustedMonth = isNorthernHemisphere ? month : (month + 6) % 12;

  if (adjustedMonth >= 3 && adjustedMonth <= 5) return 'spring';
  if (adjustedMonth >= 6 && adjustedMonth <= 8) return 'summer';
  if (adjustedMonth >= 9 && adjustedMonth <= 11) return 'fall';
  return 'winter';
}

/**
 * Check if country is in southern hemisphere
 */
function isSouthernHemisphere(country: string): boolean {
  const southernCountries = ['AU', 'NZ', 'ZA', 'AR', 'CL', 'BR', 'PE', 'BO', 'PY', 'UY'];
  return southernCountries.includes(country.toUpperCase());
}

// =============================================================================
// Main Signal Generation
// =============================================================================

/**
 * Generate all context signals from current time and user config
 * Async to support weather and holiday API fetching
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
  const month = parseInt(getPart('month'), 10);
  const day = getPart('day');
  const year = getPart('year');
  const weekdayName = getPart('weekday');

  // Calculate day of week (0-6)
  const localDate = new Date(`${year}-${getPart('month')}-${day}`);
  const dayOfWeek = localDate.getDay();

  // Determine hemisphere for season calculation
  const isNorthern = !isSouthernHemisphere(config.country);

  // Fetch holiday context from Nager.Date API (if enabled)
  let nearbyHoliday: string | null = null;
  if (config.enableHolidayContext !== false) {
    try {
      const holiday = await getNearestHoliday(localDate, config.country);
      if (holiday) {
        nearbyHoliday = formatHolidayContext(holiday);
        logger.debug('Holiday context added', { holiday: nearbyHoliday });
      }
    } catch (error) {
      logger.warn('Failed to fetch holiday context', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  // Build base signals
  const signals: ContextSignals = {
    localTime: `${String(hour).padStart(2, '0')}:${minute}`,
    timeOfDay: getTimeOfDay(hour),
    dayOfWeek: weekdayName,
    dayType: getDayType(dayOfWeek),
    date: `${year}-${getPart('month')}-${day}`,
    season: getSeason(month, isNorthern),
    nearbyHoliday,
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
  return `${signals.timeOfDay}_${signals.dayType}_${signals.season}`;
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

  // Season if relevant
  if (signals.season === 'winter' || signals.season === 'summer') {
    parts.push(`in ${signals.season}`);
  }

  // Weather if available
  if (signals.weather) {
    parts.push(`(${signals.weather.description || signals.weather.condition})`);
  }

  // Holiday if nearby
  if (signals.nearbyHoliday) {
    parts.push(`around ${signals.nearbyHoliday}`);
  }

  return parts.join(' ');
}
