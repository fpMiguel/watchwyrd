/**
 * Watchwyrd - Wikipedia "On This Day" Service
 *
 * Fetches historical events for the current date from Wikipedia's API.
 * Used to provide historical context for AI recommendations.
 *
 * @see https://api.wikimedia.org/wiki/Feed_API/Reference/On_this_day
 */

import { logger } from '../utils/logger.js';

// =============================================================================
// Types
// =============================================================================

/**
 * A single historical event from Wikipedia
 */
export interface HistoricalEvent {
  text: string;
  year: number;
  pages?: Array<{
    title: string;
    extract?: string;
  }>;
}

/**
 * Context for historical events on this day
 */
export interface OnThisDayContext {
  events: HistoricalEvent[];
  date: string; // MM-DD format
  formattedDate: string; // "January 17"
}

// =============================================================================
// Constants
// =============================================================================

const API_BASE = 'https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REQUEST_TIMEOUT_MS = 5000;
const MAX_EVENTS = 5; // Limit events to keep context concise

// Cache: key is "MM-DD", value is cached response
const eventCache = new Map<string, OnThisDayContext>();
const cacheTimestamps = new Map<string, number>();

// =============================================================================
// Month Names
// =============================================================================

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch historical events for a specific date
 *
 * @param month - Month (1-12)
 * @param day - Day of month (1-31)
 * @returns Array of historical events or null on error
 */
export async function fetchOnThisDay(month: number, day: number): Promise<OnThisDayContext | null> {
  const cacheKey = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const formattedDate = `${MONTH_NAMES[month - 1]} ${day}`;

  // Check cache
  const cached = eventCache.get(cacheKey);
  const timestamp = cacheTimestamps.get(cacheKey);
  if (cached && timestamp && Date.now() - timestamp < CACHE_TTL_MS) {
    logger.debug('On This Day cache hit', { date: cacheKey });
    return cached;
  }

  try {
    const url = `${API_BASE}/selected/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Watchwyrd/1.0 (https://github.com/fpMiguel/watchwyrd)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn('Wikipedia API error', { status: response.status, date: cacheKey });
      return null;
    }

    const data = (await response.json()) as {
      selected?: Array<{
        text: string;
        year: number;
        pages?: Array<{ title: string; extract?: string }>;
      }>;
    };

    if (!data.selected || !Array.isArray(data.selected)) {
      logger.warn('Invalid Wikipedia API response', { date: cacheKey });
      return null;
    }

    // Extract and limit events
    const events: HistoricalEvent[] = data.selected.slice(0, MAX_EVENTS).map((event) => ({
      text: event.text,
      year: event.year,
      pages: event.pages?.slice(0, 2).map((p) => ({
        title: p.title,
        extract: p.extract?.substring(0, 200),
      })),
    }));

    const result: OnThisDayContext = {
      events,
      date: cacheKey,
      formattedDate,
    };

    // Cache the result
    eventCache.set(cacheKey, result);
    cacheTimestamps.set(cacheKey, Date.now());

    logger.debug('Fetched On This Day events', {
      date: cacheKey,
      eventCount: events.length,
    });

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.warn('Wikipedia API request timed out', { date: cacheKey });
    } else {
      logger.warn('Failed to fetch On This Day events', {
        date: cacheKey,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
    return null;
  }
}

/**
 * Get historical events for the current date
 *
 * @param date - Date to get events for
 * @returns OnThisDayContext or null
 */
export async function getOnThisDay(date: Date): Promise<OnThisDayContext | null> {
  const month = date.getMonth() + 1; // getMonth() is 0-indexed
  const day = date.getDate();
  return fetchOnThisDay(month, day);
}

/**
 * Format historical events for AI context
 *
 * @param context - OnThisDayContext from API
 * @returns Formatted string for AI prompt
 */
export function formatOnThisDayContext(context: OnThisDayContext): string {
  if (!context.events.length) {
    return '';
  }

  const eventStrings = context.events.map((event) => `${event.year}: ${event.text}`);

  return `On ${context.formattedDate}: ${eventStrings.join('; ')}`;
}

/**
 * Get a concise summary of notable events for AI context
 *
 * @param date - Date to get events for
 * @returns Formatted string or null
 */
export async function getOnThisDaySummary(date: Date): Promise<string | null> {
  const context = await getOnThisDay(date);
  if (!context) {
    return null;
  }
  return formatOnThisDayContext(context);
}

/**
 * Clear the cache (for testing)
 */
export function clearOnThisDayCache(): void {
  eventCache.clear();
  cacheTimestamps.clear();
}
