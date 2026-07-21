/**
 * Context Signal Tests — Timezone and Weather Edge Cases
 *
 * Covers timezone validation fallback (lines 48-49), weather context
 * fetching (lines 94-114), and describeContext with weather (line 152).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateContextSignals, describeContext } from '../src/signals/context.js';
import type { UserConfig, ContextSignals } from '../src/types/index.js';

vi.mock('../src/services/weather.js', () => ({
  fetchWeatherByCoords: vi.fn(),
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { fetchWeatherByCoords } from '../src/services/weather.js';

function makeBaseConfig(overrides: Partial<UserConfig> = {}): UserConfig {
  return {
    aiProvider: 'gemini',
    geminiApiKey: 'test',
    geminiModel: 'gemini-2.5-flash',
    perplexityApiKey: '',
    perplexityModel: 'sonar',
    openaiApiKey: '',
    openaiModel: 'gpt-4o-mini',
    timezone: 'UTC',
    country: 'US',
    includeMovies: true,
    includeSeries: true,
    excludedGenres: [],
    showExplanations: true,
    enableWeatherContext: false,
    enableGrounding: false,
    catalogSize: 20,
    requestTimeout: 60,
    subtitleTolerance: 'prefer_dubbed',
    rpdbApiKey: '',
    ...overrides,
  };
}

describe('generateContextSignals — timezone edge cases', () => {
  it('should fall back to UTC on invalid timezone', async () => {
    const signals = await generateContextSignals(makeBaseConfig({ timezone: 'Invalid/Zone' }));
    expect(signals.timezone).toBe('UTC');
  });

  it('should restore valid timezone after invalid fallback', async () => {
    const signals = await generateContextSignals(makeBaseConfig({ timezone: 'Invalid/Zone' }));
    expect(signals.country).toBe('US');
    expect(signals.timeOfDay).toBeDefined();
    expect(signals.dayType).toBeDefined();
  });
});

describe('generateContextSignals — weather context', () => {
  beforeEach(() => {
    vi.mocked(fetchWeatherByCoords).mockResolvedValue({
      condition: 'cloudy',
      temperature: 18,
      description: 'Cloudy with a chance of meatballs',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should skip weather when enableWeatherContext is false', async () => {
    const signals = await generateContextSignals(makeBaseConfig({ enableWeatherContext: false }));
    expect(signals.weather).toBeUndefined();
  });

  it('should skip weather when no location configured', async () => {
    const signals = await generateContextSignals(makeBaseConfig({
      enableWeatherContext: true,
      weatherLocation: undefined,
    }));
    expect(signals.weather).toBeUndefined();
  });

  it('should fetch and attach weather when context is enabled', async () => {
    const signals = await generateContextSignals(makeBaseConfig({
      enableWeatherContext: true,
      weatherLocation: {
        latitude: 40.7128,
        longitude: -74.006,
        name: 'New York',
        country: 'US',
      },
    }));
    expect(signals.weather).toBeDefined();
    expect(signals.weather!.condition).toBe('cloudy');
    expect(signals.weather!.temperature).toBe(18);
    expect(signals.weather!.description).toBe('Cloudy with a chance of meatballs');
  });

  it('should handle weather fetch failure gracefully', async () => {
    vi.mocked(fetchWeatherByCoords).mockRejectedValueOnce(new Error('API unavailable'));
    const signals = await generateContextSignals(makeBaseConfig({
      enableWeatherContext: true,
      weatherLocation: {
        latitude: 40.7128,
        longitude: -74.006,
        name: 'New York',
        country: 'US',
      },
    }));
    expect(signals.weather).toBeUndefined();
  });
});

describe('describeContext — with weather', () => {
  it('should include weather description when available', () => {
    const signals: ContextSignals = {
      localTime: '14:00',
      timeOfDay: 'afternoon',
      dayOfWeek: 'Monday',
      dayType: 'weekday',
      date: '2026-06-03',
      timezone: 'UTC',
      country: 'US',
      weather: { condition: 'rainy', temperature: 15, description: 'Light rain' },
    };
    const desc = describeContext(signals);
    expect(desc).toContain('afternoon');
    expect(desc).toContain('Light rain');
  });

  it('should handle weather with only condition (no description)', () => {
    const signals: ContextSignals = {
      localTime: '14:00',
      timeOfDay: 'afternoon',
      dayOfWeek: 'Monday',
      dayType: 'weekday',
      date: '2026-06-03',
      timezone: 'UTC',
      country: 'US',
      weather: { condition: 'sunny', temperature: 25, description: '' },
    };
    const desc = describeContext(signals);
    expect(desc).toContain('afternoon');
    expect(desc).toContain('sunny');
  });

  it('should include weekend day name when on weekend', () => {
    const signals: ContextSignals = {
      localTime: '10:00',
      timeOfDay: 'morning',
      dayOfWeek: 'Saturday',
      dayType: 'weekend',
      date: '2026-06-06',
      timezone: 'UTC',
      country: 'US',
    };
    const desc = describeContext(signals);
    expect(desc).toContain('morning');
    expect(desc).toContain('Saturday');
  });

  it('should omit day name on weekdays', () => {
    const signals: ContextSignals = {
      localTime: '10:00',
      timeOfDay: 'morning',
      dayOfWeek: 'Tuesday',
      dayType: 'weekday',
      date: '2026-06-02',
      timezone: 'UTC',
      country: 'US',
    };
    const desc = describeContext(signals);
    expect(desc).toContain('morning');
    expect(desc).not.toContain('Tuesday');
  });
});
