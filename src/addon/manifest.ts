/**
 * Watchwyrd - Stremio Addon Manifest
 *
 * Defines the addon manifest that tells Stremio about
 * our addon's capabilities and configuration options.
 */

import type { UserConfig, ManifestCatalog } from '../types/index.js';
import { serverConfig } from '../config/server.js';

/**
 * Addon version (synced with package.json)
 */
export const ADDON_VERSION = '0.0.37';

/**
 * Addon ID
 */
export const ADDON_ID = 'community.watchwyrd';

/**
 * Catalog types available in the addon
 */
export type CatalogId =
  | 'watchwyrd-movies-main'
  | 'watchwyrd-series-main'
  | 'watchwyrd-movies-tonight'
  | 'watchwyrd-series-binge'
  | 'watchwyrd-movies-new'
  | 'watchwyrd-series-new'
  | 'watchwyrd-movies-hidden'
  | 'watchwyrd-series-hidden'
  | 'watchwyrd-movies-classic'
  | 'watchwyrd-movies-comfort';

/**
 * Generate catalogs based on user configuration
 */
export function generateCatalogs(config?: Partial<UserConfig>): ManifestCatalog[] {
  const catalogs: ManifestCatalog[] = [];

  const includeMovies = config?.includeMovies ?? true;
  const includeSeries = config?.includeSeries ?? true;

  // ==========================================================================
  // MOVIES (5 catalogs)
  // ==========================================================================
  if (includeMovies) {
    // Main personalized feed - adapts to time, weather, mood, preferences
    catalogs.push({
      type: 'movie',
      id: 'watchwyrd-movies-main',
      name: 'Watchwyrd: Movies',
    });

    // Hidden Gems - lesser-known quality films
    catalogs.push({
      type: 'movie',
      id: 'watchwyrd-movies-hidden',
      name: '💎 Hidden Gems',
    });

    // All-Time Greats - highly-rated classics
    catalogs.push({
      type: 'movie',
      id: 'watchwyrd-movies-greats',
      name: '🎬 All-Time Greats',
    });

    // Comfort Picks - feel-good, familiar vibes
    catalogs.push({
      type: 'movie',
      id: 'watchwyrd-movies-comfort',
      name: '🛋️ Comfort Picks',
    });

    // Surprise Me - unexpected, outside comfort zone
    catalogs.push({
      type: 'movie',
      id: 'watchwyrd-movies-surprise',
      name: '🎲 Surprise Me',
    });
  }

  // ==========================================================================
  // SERIES (5 catalogs)
  // ==========================================================================
  if (includeSeries) {
    // Main personalized feed - adapts to all context signals
    catalogs.push({
      type: 'series',
      id: 'watchwyrd-series-main',
      name: 'Watchwyrd: Series',
    });

    // Hidden Gems - underrated series worth discovering
    catalogs.push({
      type: 'series',
      id: 'watchwyrd-series-hidden',
      name: '💎 Hidden Gems',
    });

    // Binge-Worthy - addictive, can't-stop-watching shows
    catalogs.push({
      type: 'series',
      id: 'watchwyrd-series-binge',
      name: '📺 Binge-Worthy',
    });

    // Easy Watching - light, relaxing content
    catalogs.push({
      type: 'series',
      id: 'watchwyrd-series-easy',
      name: '☕ Easy Watching',
    });

    // Surprise Me - something unexpected
    catalogs.push({
      type: 'series',
      id: 'watchwyrd-series-surprise',
      name: '🎲 Surprise Me',
    });
  }

  return catalogs;
}

/**
 * Generate complete manifest for a user's configuration
 *
 * When config is provided (user has configured via /configure page),
 * we set configurationRequired: false so Stremio shows "Install" button.
 * We set configurable: false to hide Stremio's native "Configure" button
 * since we use our own /configure page.
 */
export function generateManifest(config?: Partial<UserConfig>) {
  // Check if user has valid config - either Gemini or Perplexity API key
  const hasConfig = config && (config.geminiApiKey || config.perplexityApiKey);

  return {
    id: ADDON_ID,
    version: ADDON_VERSION,
    name: 'Watchwyrd',
    description:
      'Your viewing fate, revealed — AI-powered personalized movie and series recommendations',
    logo: `${serverConfig.baseUrl}/static/logo.png`,
    background: `${serverConfig.baseUrl}/static/background.jpg`,
    resources: ['catalog'],
    types: ['movie', 'series'],
    idPrefixes: ['tt'],
    catalogs: generateCatalogs(config),
    behaviorHints: {
      // Hide Stremio's native configure - we use custom /configure page
      configurable: false,
      configurationRequired: !hasConfig,
    },
  };
}
