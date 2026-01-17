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
  admin1?: string; // State/Province
  admin2?: string; // County/District
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
