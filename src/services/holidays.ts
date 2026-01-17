/**
 * Watchwyrd - Holiday Service
 *
 * Fetches public holidays from the Nager.Date API.
 * Free, no authentication required, supports 100+ countries.
 *
 * @see https://date.nager.at/
 */

import { logger } from '../utils/logger.js';

// =============================================================================
// Types
// =============================================================================

export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  localName: string;
  name: string;
  countryCode: string;
  global: boolean;
  types: string[]; // Public, Bank, School, Authorities, Optional, Observance
}

export interface HolidayContext {
  name: string;
  localName: string;
  daysUntil: number; // 0 = today, negative = past
  isToday: boolean;
  types: string[];
}

// =============================================================================
// Cache
// =============================================================================

// Cache holidays per country-year (they don't change)
const holidayCache = new Map<string, PublicHoliday[]>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const cacheTimestamps = new Map<string, number>();

// =============================================================================
// API Client
// =============================================================================

const NAGER_DATE_BASE_URL = 'https://date.nager.at/api/v3';
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Fetch public holidays for a country and year
 */
async function fetchHolidays(countryCode: string, year: number): Promise<PublicHoliday[]> {
  const cacheKey = `${countryCode}-${year}`;

  // Check cache
  const cachedTimestamp = cacheTimestamps.get(cacheKey);
  if (cachedTimestamp && Date.now() - cachedTimestamp < CACHE_TTL_MS) {
    const cached = holidayCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(
      `${NAGER_DATE_BASE_URL}/publicholidays/${year}/${countryCode.toUpperCase()}`,
      {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        // Country not supported, return empty array
        logger.debug('Country not supported by Nager.Date', { countryCode });
        return [];
      }
      throw new Error(`Nager.Date API error: ${response.status}`);
    }

    const holidays = (await response.json()) as PublicHoliday[];

    // Cache the result
    holidayCache.set(cacheKey, holidays);
    cacheTimestamps.set(cacheKey, Date.now());

    logger.debug('Fetched holidays from Nager.Date', {
      countryCode,
      year,
      count: holidays.length,
    });

    return holidays;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.warn('Nager.Date API timeout', { countryCode, year });
    } else {
      logger.warn('Failed to fetch holidays', {
        countryCode,
        year,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
    return [];
  }
}

// =============================================================================
// Holiday Detection
// =============================================================================

/**
 * Find holidays within a window of days from the given date
 *
 * @param date - The reference date
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "DE")
 * @param windowDays - Number of days to look ahead/behind (default: 7)
 * @returns Array of nearby holidays with context
 */
export async function findNearbyHolidays(
  date: Date,
  countryCode: string,
  windowDays = 7
): Promise<HolidayContext[]> {
  const year = date.getFullYear();

  // Fetch holidays for current year (and next year if near end of year)
  const holidayPromises = [fetchHolidays(countryCode, year)];

  // If we're in December, also fetch next year's holidays
  if (date.getMonth() === 11) {
    holidayPromises.push(fetchHolidays(countryCode, year + 1));
  }

  // If we're in January, also fetch previous year's holidays
  if (date.getMonth() === 0) {
    holidayPromises.push(fetchHolidays(countryCode, year - 1));
  }

  const holidayArrays = await Promise.all(holidayPromises);
  const allHolidays = holidayArrays.flat();

  // Filter to only global/public holidays within the window
  const nearbyHolidays: HolidayContext[] = [];
  const dateMs = date.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const holiday of allHolidays) {
    // Only consider public holidays (skip observances, school holidays, etc.)
    if (!holiday.global && !holiday.types.includes('Public')) {
      continue;
    }

    const holidayDate = new Date(holiday.date);
    const diffMs = holidayDate.getTime() - dateMs;
    const daysUntil = Math.round(diffMs / dayMs);

    if (daysUntil >= -windowDays && daysUntil <= windowDays) {
      nearbyHolidays.push({
        name: holiday.name,
        localName: holiday.localName,
        daysUntil,
        isToday: daysUntil === 0,
        types: holiday.types,
      });
    }
  }

  // Sort by proximity (closest first)
  nearbyHolidays.sort((a, b) => Math.abs(a.daysUntil) - Math.abs(b.daysUntil));

  return nearbyHolidays;
}

/**
 * Get the most relevant nearby holiday for context
 *
 * Prioritizes:
 * 1. Today's holiday
 * 2. Tomorrow's holiday
 * 3. Upcoming holidays within 3 days
 * 4. Recently passed holidays (1-2 days ago)
 */
export async function getNearestHoliday(
  date: Date,
  countryCode: string
): Promise<HolidayContext | null> {
  const holidays = await findNearbyHolidays(date, countryCode, 7);

  if (holidays.length === 0) {
    return null;
  }

  // Prioritize: today > tomorrow > upcoming 3 days > past 2 days
  const today = holidays.find((h) => h.isToday);
  if (today) return today;

  const tomorrow = holidays.find((h) => h.daysUntil === 1);
  if (tomorrow) return tomorrow;

  const upcoming = holidays.find((h) => h.daysUntil > 0 && h.daysUntil <= 3);
  if (upcoming) return upcoming;

  const recent = holidays.find((h) => h.daysUntil >= -2 && h.daysUntil < 0);
  if (recent) return recent;

  // Return the closest one or null
  return holidays[0] ?? null;
}

/**
 * Format holiday context for display
 */
export function formatHolidayContext(holiday: HolidayContext): string {
  if (holiday.isToday) {
    return holiday.name;
  }

  if (holiday.daysUntil === 1) {
    return `${holiday.name} (tomorrow)`;
  }

  if (holiday.daysUntil === -1) {
    return `${holiday.name} (yesterday)`;
  }

  if (holiday.daysUntil > 0) {
    return `${holiday.name} (in ${holiday.daysUntil} days)`;
  }

  return `${holiday.name} (${Math.abs(holiday.daysUntil)} days ago)`;
}

// =============================================================================
// Supported Countries
// =============================================================================

/**
 * Check if a country is supported by the Nager.Date API
 * The API supports 100+ countries
 */
export async function isCountrySupported(countryCode: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(`${NAGER_DATE_BASE_URL}/AvailableCountries`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return false;
    }

    const countries = (await response.json()) as Array<{ countryCode: string }>;
    return countries.some((c) => c.countryCode === countryCode.toUpperCase());
  } catch {
    return false;
  }
}
