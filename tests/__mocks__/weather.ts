/**
 * Mock Weather Service
 *
 * Mock implementation for testing weather context without real API calls.
 */

import { vi } from 'vitest';

/**
 * Weather data structure
 */
export interface MockWeatherData {
  condition: string;
  temperature: number;
  humidity: number;
  description: string;
}

/**
 * Sample weather conditions
 */
export const WEATHER_CONDITIONS = {
  sunny: {
    condition: 'clear',
    temperature: 25,
    humidity: 40,
    description: 'Clear sky',
  },
  rainy: {
    condition: 'rain',
    temperature: 15,
    humidity: 85,
    description: 'Light rain',
  },
  snowy: {
    condition: 'snow',
    temperature: -5,
    humidity: 70,
    description: 'Light snow',
  },
  cloudy: {
    condition: 'clouds',
    temperature: 18,
    humidity: 60,
    description: 'Overcast clouds',
  },
  stormy: {
    condition: 'thunderstorm',
    temperature: 22,
    humidity: 90,
    description: 'Thunderstorm',
  },
};

/**
 * Create a mock weather service
 */
export function createMockWeatherService(
  options: {
    defaultWeather?: MockWeatherData;
    shouldFail?: boolean;
    failureError?: string;
  } = {}
) {
  const {
    defaultWeather = WEATHER_CONDITIONS.sunny,
    shouldFail = false,
    failureError = 'Weather API error',
  } = options;

  return {
    getWeather: vi.fn().mockImplementation(async (_lat: number, _lon: number) => {
      if (shouldFail) {
        throw new Error(failureError);
      }
      return defaultWeather;
    }),

    formatWeatherContext: vi.fn().mockImplementation((weather: MockWeatherData) => {
      return `Weather: ${weather.description}, ${weather.temperature}°C`;
    }),
  };
}

/**
 * Create a location-aware mock weather service
 */
export function createLocationAwareMockWeather() {
  return {
    getWeather: vi.fn().mockImplementation(async (lat: number, _lon: number) => {
      // Return different weather based on latitude
      if (lat > 60) {
        return WEATHER_CONDITIONS.snowy;
      } else if (lat > 40) {
        return WEATHER_CONDITIONS.cloudy;
      } else if (lat > 20) {
        return WEATHER_CONDITIONS.sunny;
      } else {
        return WEATHER_CONDITIONS.rainy;
      }
    }),

    formatWeatherContext: vi.fn().mockImplementation((weather: MockWeatherData) => {
      return `Weather: ${weather.description}, ${weather.temperature}°C`;
    }),
  };
}

/**
 * Create always-fail weather service
 */
export function createFailingWeatherService() {
  return {
    getWeather: vi.fn().mockRejectedValue(new Error('Weather service unavailable')),
    formatWeatherContext: vi.fn().mockReturnValue('Weather: unavailable'),
  };
}
