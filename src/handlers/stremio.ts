/**
 * Watchwyrd - Stremio Request Handlers
 *
 * Handles Stremio addon protocol requests for manifests and catalogs.
 * Supports both regular catalogs and natural language search.
 * Uses on-demand generation for efficient AI API usage.
 * Supports encrypted config URLs (AES-256-GCM) for API key security.
 */

import { z } from 'zod';
import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import type { UserConfig, ContentType, PresetProfile } from '../types/index.js';
import { generateManifest } from '../addon/manifest.js';
import { generateCatalog } from '../catalog/index.js';
import { executeSearch, isSearchCatalog } from '../catalog/searchGenerator.js';
import { safeParseUserConfig, applyPreset, VALID_GENRES } from '../config/schema.js';
import { serverConfig } from '../config/server.js';
import { logger } from '../utils/logger.js';
import { decryptConfig, isEncrypted } from '../utils/crypto.js';

// Maximum config string length to prevent DoS via large decryption operations
const MAX_CONFIG_LENGTH = 8192;

/**
 * Parse user configuration from URL path
 * Only accepts encrypted configs (enc.xxx format)
 * Rejects configs exceeding MAX_CONFIG_LENGTH to prevent DoS
 */
function parseConfigFromUrl(configStr: string): Record<string, unknown> | null {
  try {
    // Reject oversized configs to prevent DoS
    if (configStr.length > MAX_CONFIG_LENGTH) {
      logger.warn('Config string exceeds maximum length', {
        length: configStr.length,
        maxLength: MAX_CONFIG_LENGTH,
      });
      return null;
    }

    const config = decryptConfig(configStr, serverConfig.security.secretKey);

    if (config) {
      return config;
    }

    logger.warn('Failed to parse config from URL', {
      configStr: configStr.substring(0, 50),
      isEncrypted: isEncrypted(configStr),
    });
    return null;
  } catch (error) {
    logger.warn('Failed to parse config from URL', {
      configStr: configStr.substring(0, 50),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Build full user config from partial config
 */
function buildUserConfig(partial: Record<string, unknown>): UserConfig | null {
  // Apply preset if specified
  const presetProfile = partial['presetProfile'] as string | undefined;
  if (presetProfile && presetProfile !== 'custom') {
    partial = applyPreset(partial as Partial<UserConfig>, presetProfile as PresetProfile) as Record<
      string,
      unknown
    >;
  }

  const result = safeParseUserConfig(partial);

  if (!result.success) {
    logger.warn('Invalid user config', { errors: z.flattenError(result.errors!) });
    return null;
  }

  return result.data ?? null;
}

/**
 * Extract catalog type from catalog ID
 */
function getCatalogType(catalogId: string): ContentType | null {
  if (catalogId.includes('movies')) return 'movie';
  if (catalogId.includes('series')) return 'series';
  return null;
}

/**
 * Create Stremio addon routes
 */
export function createStremioRoutes(): Router {
  const router = createRouter();

  // Manifest endpoint

  // Without config (returns base manifest for discovery)
  router.get('/manifest.json', (_req: Request, res: Response) => {
    logger.debug('Manifest request (no config)');
    res.json(generateManifest());
  });

  // With config (returns personalized manifest)
  router.get('/:config/manifest.json', (req: Request, res: Response) => {
    const configStr = req.params['config'] as string | undefined;

    if (!configStr) {
      res.json(generateManifest());
      return;
    }

    const partialConfig = parseConfigFromUrl(configStr);

    if (!partialConfig) {
      res.json(generateManifest());
      return;
    }

    logger.debug('Manifest request with config');
    res.json(generateManifest(partialConfig));
  });

  // Catalog endpoint

  // Catalog request handler (shared logic)
  async function handleCatalogRequest(
    configStr: string | undefined,
    type: string | undefined,
    id: string | undefined,
    res: Response,
    extra?: string
  ): Promise<void> {
    logger.debug('Catalog request', { type, id, extra });

    // Validate parameters
    if (!configStr || !type || !id) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // Parse extra params (genre or search query)
    let genre: string | undefined;
    let searchQuery: string | undefined;

    if (extra) {
      // Parse genre filter
      const genreMatch = extra.match(/genre=([^&]+)/);
      if (genreMatch) {
        const decodedGenre = decodeURIComponent(genreMatch[1]!);
        // Validate genre against whitelist to prevent injection
        if (VALID_GENRES.includes(decodedGenre as (typeof VALID_GENRES)[number])) {
          genre = decodedGenre;
        } else {
          logger.warn('Invalid genre requested, ignoring', { requestedGenre: decodedGenre });
        }
      }

      // Parse search query
      const searchMatch = extra.match(/search=([^&]+)/);
      if (searchMatch) {
        searchQuery = decodeURIComponent(searchMatch[1]!);
      }
    }

    // Parse and validate config
    const partialConfig = parseConfigFromUrl(configStr);

    if (!partialConfig) {
      res.status(400).json({ error: 'Invalid configuration' });
      return;
    }

    const config = buildUserConfig(partialConfig);

    if (!config) {
      res.status(400).json({ error: 'Configuration validation failed' });
      return;
    }

    // Determine content type (from URL type param for search, from catalog ID otherwise)
    let contentType: ContentType | null;
    if (isSearchCatalog(id)) {
      contentType = type === 'movie' ? 'movie' : type === 'series' ? 'series' : null;
    } else {
      contentType = getCatalogType(id);
    }

    if (!contentType) {
      res.status(404).json({ error: 'Unknown catalog' });
      return;
    }

    try {
      // Route to search or catalog generator
      if (isSearchCatalog(id) && searchQuery) {
        logger.info('Processing search request', { query: searchQuery, contentType });
        const catalog = await executeSearch(config, contentType, searchQuery);
        res.json(catalog);
      } else if (isSearchCatalog(id) && !searchQuery) {
        // Search catalog without query - return empty
        res.json({ metas: [] });
      } else {
        // Regular catalog request
        const catalog = await generateCatalog(config, contentType, id, genre);
        res.json(catalog);
      }
    } catch (error) {
      logger.error('Catalog/search generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        catalogId: id,
        genre,
        searchQuery,
      });
      res.status(500).json({ error: 'Failed to generate catalog' });
    }
  }

  // Basic catalog route: /:config/catalog/:type/:id.json
  router.get(
    '/:config/catalog/:type/:id.json',
    async (req: Request, res: Response): Promise<void> => {
      await handleCatalogRequest(
        req.params['config'] as string | undefined,
        req.params['type'] as string | undefined,
        req.params['id'] as string | undefined,
        res
      );
    }
  );

  // Catalog route with extra params (for genre filter): /:config/catalog/:type/:id/:extra.json
  router.get(
    '/:config/catalog/:type/:id/:extra.json',
    async (req: Request, res: Response): Promise<void> => {
      await handleCatalogRequest(
        req.params['config'] as string | undefined,
        req.params['type'] as string | undefined,
        req.params['id'] as string | undefined,
        res,
        req.params['extra'] as string | undefined
      );
    }
  );

  return router;
}
