/**
 * Watchwyrd - Stremio Addon Manifest
 *
 * Defines the addon manifest that tells Stremio about
 * our addon's capabilities and configuration options.
 */

import type { UserConfig, ManifestCatalog } from '../types/index.js';
import { serverConfig } from '../config/server.js';
import { CATALOG_DEFINITIONS, type CatalogVariant } from '../catalog/definitions.js';
import { VALID_GENRES } from '../config/schema.js';

/**
 * Addon version (synced with package.json)
 */
export const ADDON_VERSION = '0.0.37';

/**
 * Addon ID
 */
export const ADDON_ID = 'community.watchwyrd';

/**
 * All supported genres for Discover filtering
 */
export const SUPPORTED_GENRES = VALID_GENRES;

/**
 * Generate catalog ID from variant and content type
 */
export function getCatalogId(variant: CatalogVariant, contentType: 'movie' | 'series'): string {
  const typeKey = contentType === 'movie' ? 'movies' : 'series';
  return `watchwyrd-${typeKey}-${variant}`;
}

/**
 * Parse catalog ID into variant and content type
 */
export function parseCatalogId(
  catalogId: string
): { variant: CatalogVariant; contentType: 'movie' | 'series' } | null {
  const match = catalogId.match(/^watchwyrd-(movies|series)-(.+)$/);
  if (!match) return null;
  return {
    contentType: match[1] === 'movies' ? 'movie' : 'series',
    variant: match[2] as CatalogVariant,
  };
}

/**
 * Generate catalogs based on user configuration
 * Both catalogs support genre filtering via Stremio's Discover screen
 */
export function generateCatalogs(config?: Partial<UserConfig>): ManifestCatalog[] {
  const catalogs: ManifestCatalog[] = [];

  const includeMovies = config?.includeMovies ?? true;
  const includeSeries = config?.includeSeries ?? true;

  for (const definition of CATALOG_DEFINITIONS) {
    // Generate for each applicable content type
    for (const contentType of definition.types) {
      // Skip based on content type preferences
      if (contentType === 'movie' && !includeMovies) continue;
      if (contentType === 'series' && !includeSeries) continue;

      catalogs.push({
        type: contentType,
        id: getCatalogId(definition.variant, contentType),
        name: definition.name,
        // Enable genre filtering in Discover screen
        extra: [{ name: 'genre', options: [...SUPPORTED_GENRES], isRequired: false }],
        genres: [...SUPPORTED_GENRES],
      });
    }
  }

  return catalogs;
}

/**
 * Stremio manifest structure
 */
interface StremioManifest {
  id: string;
  version: string;
  name: string;
  description: string;
  logo: string;
  background: string;
  resources: string[];
  types: string[];
  idPrefixes: string[];
  catalogs: ManifestCatalog[];
  behaviorHints: {
    configurable: boolean;
    configurationRequired: boolean;
  };
}

/**
 * Generate complete manifest for a user's configuration
 *
 * When config is provided (user has configured via /configure page),
 * we set configurationRequired: false so Stremio shows "Install" button.
 * We set configurable: false to hide Stremio's native "Configure" button
 * since we use our own /configure page.
 */
export function generateManifest(config?: Partial<UserConfig>): StremioManifest {
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
