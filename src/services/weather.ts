/**
 * Watchwyrd - Weather Service
 *
 * Fetches weather data to influence recommendations.
 * Uses Open-Meteo API (free, no API key required).
 */

import { logger } from '../utils/logger.js';

// =============================================================================
// Types
// =============================================================================

export interface WeatherData {
  condition: WeatherCondition;
  temperature: number; // Celsius
  description: string;
  isDay: boolean;
}

export type WeatherCondition =
  | 'clear'
  | 'cloudy'
  | 'rainy'
  | 'stormy'
  | 'snowy'
  | 'foggy'
  | 'windy';

// =============================================================================
// Weather Code Mapping (WMO codes)
// =============================================================================

/**
 * Map WMO weather codes to our simplified conditions
 * https://open-meteo.com/en/docs#weathervariables
 */
function weatherCodeToCondition(code: number): WeatherCondition {
  // Clear sky
  if (code === 0) return 'clear';

  // Mainly clear, partly cloudy
  if (code >= 1 && code <= 2) return 'clear';

  // Overcast
  if (code === 3) return 'cloudy';

  // Fog
  if (code >= 45 && code <= 48) return 'foggy';

  // Drizzle
  if (code >= 51 && code <= 57) return 'rainy';

  // Rain
  if (code >= 61 && code <= 67) return 'rainy';

  // Snow
  if (code >= 71 && code <= 77) return 'snowy';

  // Rain showers
  if (code >= 80 && code <= 82) return 'rainy';

  // Snow showers
  if (code >= 85 && code <= 86) return 'snowy';

  // Thunderstorm
  if (code >= 95 && code <= 99) return 'stormy';

  return 'cloudy';
}

/**
 * Get human-readable description for weather condition
 */
function getWeatherDescription(condition: WeatherCondition, temp: number): string {
  const tempDesc = temp < 10 ? 'cold' : temp < 20 ? 'mild' : temp < 30 ? 'warm' : 'hot';

  const conditionDescs: Record<WeatherCondition, string> = {
    clear: `Clear and ${tempDesc}`,
    cloudy: `Cloudy and ${tempDesc}`,
    rainy: `Rainy and ${tempDesc}`,
    stormy: `Stormy weather`,
    snowy: `Snowy and cold`,
    foggy: `Foggy and ${tempDesc}`,
    windy: `Windy and ${tempDesc}`,
  };

  return conditionDescs[condition];
}

// =============================================================================
// Timezone to Coordinates Mapping
// =============================================================================

/**
 * Approximate coordinates for major timezones
 * Used to fetch weather when we only have timezone
 */
const TIMEZONE_COORDS: Record<string, { lat: number; lon: number }> = {
  // Europe
  'Europe/London': { lat: 51.5, lon: -0.1 },
  'Europe/Paris': { lat: 48.9, lon: 2.3 },
  'Europe/Berlin': { lat: 52.5, lon: 13.4 },
  'Europe/Brussels': { lat: 50.8, lon: 4.4 },
  'Europe/Amsterdam': { lat: 52.4, lon: 4.9 },
  'Europe/Rome': { lat: 41.9, lon: 12.5 },
  'Europe/Madrid': { lat: 40.4, lon: -3.7 },
  'Europe/Lisbon': { lat: 38.7, lon: -9.1 },
  'Europe/Vienna': { lat: 48.2, lon: 16.4 },
  'Europe/Zurich': { lat: 47.4, lon: 8.5 },
  'Europe/Stockholm': { lat: 59.3, lon: 18.1 },
  'Europe/Oslo': { lat: 59.9, lon: 10.8 },
  'Europe/Copenhagen': { lat: 55.7, lon: 12.6 },
  'Europe/Helsinki': { lat: 60.2, lon: 25.0 },
  'Europe/Warsaw': { lat: 52.2, lon: 21.0 },
  'Europe/Prague': { lat: 50.1, lon: 14.4 },
  'Europe/Budapest': { lat: 47.5, lon: 19.0 },
  'Europe/Athens': { lat: 38.0, lon: 23.7 },
  'Europe/Moscow': { lat: 55.8, lon: 37.6 },
  'Europe/Istanbul': { lat: 41.0, lon: 29.0 },

  // Americas
  'America/New_York': { lat: 40.7, lon: -74.0 },
  'America/Los_Angeles': { lat: 34.1, lon: -118.2 },
  'America/Chicago': { lat: 41.9, lon: -87.6 },
  'America/Denver': { lat: 39.7, lon: -105.0 },
  'America/Phoenix': { lat: 33.4, lon: -112.1 },
  'America/Toronto': { lat: 43.7, lon: -79.4 },
  'America/Vancouver': { lat: 49.3, lon: -123.1 },
  'America/Mexico_City': { lat: 19.4, lon: -99.1 },
  'America/Sao_Paulo': { lat: -23.5, lon: -46.6 },
  'America/Buenos_Aires': { lat: -34.6, lon: -58.4 },
  'America/Lima': { lat: -12.0, lon: -77.0 },
  'America/Bogota': { lat: 4.6, lon: -74.1 },

  // Asia
  'Asia/Tokyo': { lat: 35.7, lon: 139.7 },
  'Asia/Shanghai': { lat: 31.2, lon: 121.5 },
  'Asia/Hong_Kong': { lat: 22.3, lon: 114.2 },
  'Asia/Singapore': { lat: 1.3, lon: 103.8 },
  'Asia/Seoul': { lat: 37.6, lon: 127.0 },
  'Asia/Mumbai': { lat: 19.1, lon: 72.9 },
  'Asia/Delhi': { lat: 28.6, lon: 77.2 },
  'Asia/Bangkok': { lat: 13.8, lon: 100.5 },
  'Asia/Jakarta': { lat: -6.2, lon: 106.8 },
  'Asia/Dubai': { lat: 25.3, lon: 55.3 },
  'Asia/Tel_Aviv': { lat: 32.1, lon: 34.8 },

  // Oceania
  'Australia/Sydney': { lat: -33.9, lon: 151.2 },
  'Australia/Melbourne': { lat: -37.8, lon: 145.0 },
  'Australia/Brisbane': { lat: -27.5, lon: 153.0 },
  'Australia/Perth': { lat: -31.9, lon: 115.9 },
  'Pacific/Auckland': { lat: -36.8, lon: 174.8 },

  // Africa
  'Africa/Cairo': { lat: 30.0, lon: 31.2 },
  'Africa/Johannesburg': { lat: -26.2, lon: 28.0 },
  'Africa/Lagos': { lat: 6.5, lon: 3.4 },
  'Africa/Nairobi': { lat: -1.3, lon: 36.8 },
};

/**
 * Get approximate coordinates from timezone
 */
function getCoordinatesFromTimezone(timezone: string): { lat: number; lon: number } | null {
  // Direct match
  if (TIMEZONE_COORDS[timezone]) {
    return TIMEZONE_COORDS[timezone];
  }

  // Try to find a similar timezone (same region)
  const region = timezone.split('/')[0];
  for (const [tz, coords] of Object.entries(TIMEZONE_COORDS)) {
    if (tz.startsWith(region + '/')) {
      return coords;
    }
  }

  return null;
}

// =============================================================================
// Geocoding API (Location Search)
// =============================================================================

/**
 * Location result from Open-Meteo Geocoding API
 */
export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code: string;
  admin1?: string;      // State/Province
  admin2?: string;      // County/District
  population?: number;
  timezone?: string;
}

/**
 * Search for locations using Open-Meteo Geocoding API
 * Use this for autocomplete functionality
 */
export async function searchLocations(query: string, count = 10): Promise<GeocodingResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', query);
    url.searchParams.set('count', String(Math.min(count, 100)));
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Watchwyrd/2.0' },
    });

    if (!response.ok) {
      logger.warn('Geocoding API error', { status: response.status });
      return [];
    }

    const data = (await response.json()) as { results?: GeocodingResult[] };
    return data.results || [];
  } catch (error) {
    logger.warn('Failed to search locations', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return [];
  }
}

// =============================================================================
// Weather API
// =============================================================================

/**
 * Fetch current weather from Open-Meteo API using coordinates
 * Free, no API key required, generous rate limits
 */
export async function fetchWeatherByCoords(
  latitude: number,
  longitude: number,
  timezone?: string
): Promise<WeatherData | null> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
    url.searchParams.set('current', 'temperature_2m,weather_code,is_day');
    if (timezone) {
      url.searchParams.set('timezone', timezone);
    }

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Watchwyrd/2.0' },
    });

    if (!response.ok) {
      logger.warn('Weather API error', { status: response.status });
      return null;
    }

    const data = (await response.json()) as {
      current: {
        temperature_2m: number;
        weather_code: number;
        is_day: number;
      };
    };

    const condition = weatherCodeToCondition(data.current.weather_code);
    const temperature = Math.round(data.current.temperature_2m);

    const weather: WeatherData = {
      condition,
      temperature,
      description: getWeatherDescription(condition, temperature),
      isDay: data.current.is_day === 1,
    };

    logger.debug('Weather fetched by coords', { latitude, longitude, weather });
    return weather;
  } catch (error) {
    logger.warn('Failed to fetch weather by coords', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return null;
  }
}

/**
 * Fetch current weather from Open-Meteo API
 * Falls back to timezone-based coordinates if no location provided
 * @deprecated Use fetchWeatherByCoords with explicit coordinates
 */
export async function fetchWeather(timezone: string): Promise<WeatherData | null> {
  const coords = getCoordinatesFromTimezone(timezone);

  if (!coords) {
    logger.debug('No coordinates for timezone', { timezone });
    return null;
  }

  return fetchWeatherByCoords(coords.lat, coords.lon, timezone);
}

// =============================================================================
// Weather-based Mood Mapping
// =============================================================================

/**
 * Get mood-based genre suggestions from weather
 */
export function getWeatherMoodGenres(weather: WeatherData): string[] {
  const genres: string[] = [];

  // Weather condition based
  switch (weather.condition) {
    case 'rainy':
      genres.push('Drama', 'Romance', 'Mystery'); // Cozy indoor vibes
      break;
    case 'stormy':
      genres.push('Thriller', 'Horror', 'Action'); // Intense atmosphere
      break;
    case 'snowy':
      genres.push('Family', 'Comedy', 'Fantasy'); // Warm, feel-good
      break;
    case 'clear':
      if (weather.isDay) {
        genres.push('Adventure', 'Action', 'Comedy'); // Energetic
      } else {
        genres.push('Romance', 'Drama', 'Sci-Fi'); // Evening vibes
      }
      break;
    case 'cloudy':
      genres.push('Drama', 'Thriller', 'Mystery');
      break;
    case 'foggy':
      genres.push('Mystery', 'Horror', 'Thriller'); // Atmospheric
      break;
    default:
      break;
  }

  // Temperature based additions
  if (weather.temperature < 10) {
    genres.push('Comedy', 'Family'); // Warm up with feel-good
  } else if (weather.temperature > 30) {
    genres.push('Action', 'Thriller'); // Indoor entertainment
  }

  // Remove duplicates
  return [...new Set(genres)];
}

/**
 * Get weather-based viewing suggestion text
 */
export function getWeatherSuggestion(weather: WeatherData): string {
  const suggestions: Record<WeatherCondition, string> = {
    rainy: 'Perfect weather to cozy up with a good film',
    stormy: 'Stormy night calls for intense viewing',
    snowy: 'Snowy outside - time for warm, feel-good entertainment',
    clear: weather.isDay
      ? 'Beautiful day - but great movies await inside!'
      : 'Clear evening - perfect for movie night',
    cloudy: 'Overcast skies set the mood for drama',
    foggy: 'Mysterious weather for mysterious films',
    windy: 'Stay in and enjoy some quality entertainment',
  };

  return suggestions[weather.condition];
}
