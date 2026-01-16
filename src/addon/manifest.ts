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

  // Main catalogs (always shown)
  if (includeMovies) {
    catalogs.push({
      type: 'movie',
      id: 'watchwyrd-movies-main',
      name: 'Watchwyrd: Movies',
    });
  }

  if (includeSeries) {
    catalogs.push({
      type: 'series',
      id: 'watchwyrd-series-main',
      name: 'Watchwyrd: Series',
    });
  }

  // v2.0 Specialty catalogs
  if (includeMovies) {
    // Perfect for Tonight - quick contextual picks
    catalogs.push({
      type: 'movie',
      id: 'watchwyrd-movies-tonight',
      name: '🌙 Perfect for Tonight',
    });

    // Hidden Gems - lesser-known quality content
    catalogs.push({
      type: 'movie',
      id: 'watchwyrd-movies-hidden',
      name: '💎 Hidden Gems',
    });

    // Comfort Movies - feel-good favorites
    catalogs.push({
      type: 'movie',
      id: 'watchwyrd-movies-comfort',
      name: '🛋️ Comfort Movies',
    });

    // Classic Cinema - timeless films
    catalogs.push({
      type: 'movie',
      id: 'watchwyrd-movies-classic',
      name: '🎬 Classic Cinema',
    });

    // New releases
    if (config?.includeNewReleases !== false) {
      catalogs.push({
        type: 'movie',
        id: 'watchwyrd-movies-new',
        name: '🆕 New Releases',
      });
    }
  }

  if (includeSeries) {
    // Binge-worthy series
    catalogs.push({
      type: 'series',
      id: 'watchwyrd-series-binge',
      name: '📺 Binge-Worthy',
    });

    // Hidden Gems - lesser-known quality series
    catalogs.push({
      type: 'series',
      id: 'watchwyrd-series-hidden',
      name: '💎 Hidden Gems',
    });

    // New releases
    if (config?.includeNewReleases !== false) {
      catalogs.push({
        type: 'series',
        id: 'watchwyrd-series-new',
        name: '🆕 New Series',
      });
    }
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
    description: 'Your viewing fate, revealed — AI-powered personalized movie and series recommendations',
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
