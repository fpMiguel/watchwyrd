/**
 * Weather Service Tests
 *
 * Tests for weather service functionality:
 * - fetchWeatherByCoords
 * - searchLocations
 * - Weather code mapping
 * - Caching behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock cleanup registration - must be before imports
vi.mock('../src/utils/cleanup.js', () => ({
  registerInterval: vi.fn(() => ({ dispose: vi.fn() })),
}));

// Create hoisted mock references
const mocks = vi.hoisted(() => ({
  pooledFetch: vi.fn(),
  weatherCircuit: {
    execute: vi.fn((fn: () => Promise<unknown>) => fn()),
  },
}));

vi.mock('../src/utils/http.js', () => ({
  pooledFetch: mocks.pooledFetch,
}));

vi.mock('../src/utils/circuitBreaker.js', () => ({
  weatherCircuit: mocks.weatherCircuit,
}));

// Import after mocks are set up
import { fetchWeatherByCoords, searchLocations } from '../src/services/weather.js';

describe('weather service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.weatherCircuit.execute.mockImplementation((fn: () => Promise<unknown>) => fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchWeatherByCoords', () => {
    it('should fetch weather data successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          current: {
            temperature_2m: 22.5,
            weather_code: 0, // Clear sky
            is_day: 1,
          },
        }),
      };

      mocks.pooledFetch.mockResolvedValue(mockResponse);

      const result = await fetchWeatherByCoords(40.7128, -74.006);

      expect(result).not.toBeNull();
      expect(result?.condition).toBe('clear');
      expect(result?.temperature).toBe(23); // Rounded from 22.5
      expect(result?.isDay).toBe(true);
      expect(result?.description).toContain('Clear');
    });

    it('should return null on circuit breaker error', async () => {
      mocks.weatherCircuit.execute.mockRejectedValue(new Error('Weather API error: 500'));

      const result = await fetchWeatherByCoords(10.1, 20.2);

      expect(result).toBeNull();
    });

    it('should handle circuit breaker open state', async () => {
      mocks.weatherCircuit.execute.mockRejectedValue(new Error('Circuit breaker open'));

      const result = await fetchWeatherByCoords(30.3, 40.4);

      expect(result).toBeNull();
    });

    it('should include timezone in request when provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          current: {
            temperature_2m: 25,
            weather_code: 0,
            is_day: 1,
          },
        }),
      };

      mocks.pooledFetch.mockResolvedValue(mockResponse);

      await fetchWeatherByCoords(35.6762, 139.6503, 'Asia/Tokyo');

      expect(mocks.pooledFetch).toHaveBeenCalledWith(
        expect.stringContaining('timezone=Asia%2FTokyo'),
        expect.any(Object)
      );
    });

    describe('weather code mapping', () => {
      const testWeatherCode = async (
        code: number,
        expectedCondition: string,
        lat: number,
        lon: number
      ) => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({
            current: {
              temperature_2m: 20,
              weather_code: code,
              is_day: 1,
            },
          }),
        };

        mocks.pooledFetch.mockResolvedValue(mockResponse);

        const result = await fetchWeatherByCoords(lat, lon);
        expect(result?.condition).toBe(expectedCondition);
      };

      it('should map code 0 to clear', async () => {
        await testWeatherCode(0, 'clear', 1.01, 1.01);
      });

      it('should map codes 1-2 to clear', async () => {
        await testWeatherCode(1, 'clear', 1.02, 1.02);
        await testWeatherCode(2, 'clear', 1.03, 1.03);
      });

      it('should map code 3 to cloudy', async () => {
        await testWeatherCode(3, 'cloudy', 1.04, 1.04);
      });

      it('should map codes 45-48 to foggy', async () => {
        await testWeatherCode(45, 'foggy', 1.05, 1.05);
        await testWeatherCode(48, 'foggy', 1.06, 1.06);
      });

      it('should map codes 51-57 (drizzle) to rainy', async () => {
        await testWeatherCode(51, 'rainy', 1.07, 1.07);
        await testWeatherCode(55, 'rainy', 1.08, 1.08);
      });

      it('should map codes 61-67 (rain) to rainy', async () => {
        await testWeatherCode(61, 'rainy', 1.09, 1.09);
        await testWeatherCode(65, 'rainy', 1.1, 1.1);
      });

      it('should map codes 71-77 to snowy', async () => {
        await testWeatherCode(71, 'snowy', 1.11, 1.11);
        await testWeatherCode(75, 'snowy', 1.12, 1.12);
      });

      it('should map codes 80-82 (rain showers) to rainy', async () => {
        await testWeatherCode(80, 'rainy', 1.13, 1.13);
        await testWeatherCode(82, 'rainy', 1.14, 1.14);
      });

      it('should map codes 85-86 (snow showers) to snowy', async () => {
        await testWeatherCode(85, 'snowy', 1.15, 1.15);
        await testWeatherCode(86, 'snowy', 1.16, 1.16);
      });

      it('should map codes 95-99 (thunderstorm) to stormy', async () => {
        await testWeatherCode(95, 'stormy', 1.17, 1.17);
        await testWeatherCode(99, 'stormy', 1.18, 1.18);
      });

      it('should default unknown codes to cloudy', async () => {
        await testWeatherCode(999, 'cloudy', 1.19, 1.19);
      });
    });

    describe('temperature descriptions', () => {
      const testTempDescription = async (
        temp: number,
        expectedWord: string,
        lat: number,
        lon: number
      ) => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({
            current: {
              temperature_2m: temp,
              weather_code: 0,
              is_day: 1,
            },
          }),
        };

        mocks.pooledFetch.mockResolvedValue(mockResponse);

        const result = await fetchWeatherByCoords(lat, lon);
        expect(result?.description.toLowerCase()).toContain(expectedWord);
      };

      it('should describe cold temperatures (< 10C)', async () => {
        await testTempDescription(5, 'cold', 2.01, 2.01);
      });

      it('should describe mild temperatures (10-19C)', async () => {
        await testTempDescription(15, 'mild', 2.02, 2.02);
      });

      it('should describe warm temperatures (20-29C)', async () => {
        await testTempDescription(25, 'warm', 2.03, 2.03);
      });

      it('should describe hot temperatures (>= 30C)', async () => {
        await testTempDescription(35, 'hot', 2.04, 2.04);
      });
    });

    describe('caching', () => {
      it('should cache results and return cached data', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({
            current: {
              temperature_2m: 15,
              weather_code: 3,
              is_day: 0,
            },
          }),
        };

        mocks.pooledFetch.mockResolvedValue(mockResponse);

        // First call - should hit API
        const result1 = await fetchWeatherByCoords(51.5074, -0.1278);

        // Second call with same coords - should use cache
        const result2 = await fetchWeatherByCoords(51.5074, -0.1278);

        expect(result1).toEqual(result2);
        // Circuit breaker execute should only be called once due to caching
        expect(mocks.weatherCircuit.execute).toHaveBeenCalledTimes(1);
      });

      it('should round coordinates to 2 decimal places for caching', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({
            current: {
              temperature_2m: 20,
              weather_code: 1,
              is_day: 1,
            },
          }),
        };

        mocks.pooledFetch.mockResolvedValue(mockResponse);

        // Slightly different coords that round to same value
        await fetchWeatherByCoords(60.7128, -84.0065);
        await fetchWeatherByCoords(60.7124, -84.0061);

        // Both should use same cache key
        expect(mocks.weatherCircuit.execute).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('searchLocations', () => {
    it('should return empty array for short query', async () => {
      const result = await searchLocations('a');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty query', async () => {
      const result = await searchLocations('');
      expect(result).toEqual([]);
    });

    it('should search for locations', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          results: [
            {
              id: 1,
              name: 'New York',
              latitude: 40.7128,
              longitude: -74.006,
              country: 'United States',
              country_code: 'US',
            },
          ],
        }),
      };

      mocks.pooledFetch.mockResolvedValue(mockResponse);

      const result = await searchLocations('New York');

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('New York');
    });

    it('should return empty array on API error', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };

      mocks.pooledFetch.mockResolvedValue(mockResponse);

      const result = await searchLocations('London');

      expect(result).toEqual([]);
    });

    it('should handle missing results in response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      };

      mocks.pooledFetch.mockResolvedValue(mockResponse);

      const result = await searchLocations('Unknown');

      expect(result).toEqual([]);
    });

    it('should limit count to max 100', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [] }),
      };

      mocks.pooledFetch.mockResolvedValue(mockResponse);

      await searchLocations('Paris', 200);

      expect(mocks.pooledFetch).toHaveBeenCalledWith(
        expect.stringContaining('count=100'),
        expect.any(Object)
      );
    });

    it('should handle fetch errors gracefully', async () => {
      mocks.pooledFetch.mockRejectedValue(new Error('Network error'));

      const result = await searchLocations('Berlin');

      expect(result).toEqual([]);
    });
  });
});
