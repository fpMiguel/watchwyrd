/**
 * Watchwyrd - Stremio Addon Manifest
 *
 * Defines the addon manifest that tells Stremio about
 * our addon's capabilities and configuration options.
 */

import type { UserConfig, ManifestCatalog, ContentType } from '../types/index.js';
import { serverConfig } from '../config/server.js';
import { CATALOG_METADATA } from '../catalog/definitions.js';
import type { CatalogVariant } from '../prompts/index.js';
import { VALID_GENRES } from '../config/schema.js';

/**
 * Addon version (synced with package.json)
 */
export const ADDON_VERSION = '0.0.38';

/**
 * Addon ID
 */
export const ADDON_ID = 'community.watchwyrd';

/**
 * All supported genres for Discover filtering
 */
export const SUPPORTED_GENRES = VALID_GENRES;

/**
 * Search catalog ID (same for both types - Stremio distinguishes by type)
 */
export const SEARCH_CATALOG_ID = 'watchwyrd-search';

/**
 * Generate catalog ID from variant and content type
 */
export function getCatalogId(variant: CatalogVariant | 'search', contentType: ContentType): string {
  if (variant === 'search') {
    return SEARCH_CATALOG_ID;
  }
  const typeKey = contentType === 'movie' ? 'movies' : 'series';
  return `watchwyrd-${typeKey}-${variant}`;
}

/**
 * Parse catalog ID into variant and content type
 */
export function parseCatalogId(
  catalogId: string
): { variant: CatalogVariant | 'search'; contentType: ContentType } | null {
  // Check for search catalog
  if (catalogId === SEARCH_CATALOG_ID) {
    return { variant: 'search', contentType: 'movie' }; // Type determined by request
  }

  const match = catalogId.match(/^watchwyrd-(movies|series)-(.+)$/);
  if (!match) return null;
  return {
    contentType: match[1] === 'movies' ? 'movie' : 'series',
    variant: match[2] as CatalogVariant,
  };
}

/**
 * Generate catalogs based on user configuration
 * Includes regular catalogs + search catalogs
 */
export function generateCatalogs(config?: Partial<UserConfig>): ManifestCatalog[] {
  const catalogs: ManifestCatalog[] = [];

  const includeMovies = config?.includeMovies ?? true;
  const includeSeries = config?.includeSeries ?? true;

  // Add regular catalogs (For Now, Random)
  for (const definition of CATALOG_METADATA) {
    for (const contentType of definition.types) {
      if (contentType === 'movie' && !includeMovies) continue;
      if (contentType === 'series' && !includeSeries) continue;

      catalogs.push({
        type: contentType,
        id: getCatalogId(definition.variant, contentType),
        name: definition.name,
        extra: [{ name: 'genre', options: [...SUPPORTED_GENRES], isRequired: false }],
        genres: [...SUPPORTED_GENRES],
      });
    }
  }

  // Add search catalogs (one for movies, one for series)
  if (includeMovies) {
    catalogs.push({
      type: 'movie',
      id: SEARCH_CATALOG_ID,
      name: 'Watchwyrd',
      extra: [{ name: 'search', isRequired: true }],
    });
  }

  if (includeSeries) {
    catalogs.push({
      type: 'series',
      id: SEARCH_CATALOG_ID,
      name: 'Watchwyrd',
      extra: [{ name: 'search', isRequired: true }],
    });
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
    adult: boolean;
    p2p: boolean;
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
      // Content flags
      adult: false, // No adult content - also enforced in AI prompts
      p2p: false, // No P2P/BitTorrent - we only provide metadata
    },
  };
}
