/**
 * Watchwyrd - Stremio Request Handlers
 *
 * Handles Stremio addon protocol requests for manifests and catalogs.
 */

import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import type { UserConfig, ContentType, PresetProfile } from '../types/index.js';
import { generateManifest } from '../addon/manifest.js';
import { generateCatalog } from '../catalog/generator.js';
import { safeParseUserConfig, applyPreset } from '../config/schema.js';
import { logger } from '../utils/logger.js';

/**
 * Parse user configuration from URL path or query string
 */
function parseConfigFromUrl(configStr: string): Record<string, unknown> | null {
  try {
    // Config is base64-encoded JSON
    const decoded = Buffer.from(configStr, 'base64').toString('utf-8');
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    logger.warn('Failed to parse config from URL', { configStr: configStr.substring(0, 50) });
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
    partial = applyPreset(partial as Partial<UserConfig>, presetProfile as PresetProfile) as Record<string, unknown>;
  }

  const result = safeParseUserConfig(partial);

  if (!result.success) {
    logger.warn('Invalid user config', { errors: result.errors?.format() });
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

  // ==========================================================================
  // Manifest endpoint
  // ==========================================================================

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

  // ==========================================================================
  // Catalog endpoint
  // ==========================================================================

  /**
   * Parse extra parameters from Stremio catalog request
   * Format: "skip=20" or "genre=Action" or "skip=20&genre=Action"
   */
  function parseExtraParams(extra?: string): { skip?: number; genre?: string } {
    if (!extra) return {};
    
    const params: { skip?: number; genre?: string } = {};
    const parts = extra.split('&');
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 'skip' && value) {
        params.skip = parseInt(value, 10) || 0;
      } else if (key === 'genre' && value) {
        params.genre = decodeURIComponent(value);
      }
    }
    
    return params;
  }

  // Catalog request handler (shared logic)
  async function handleCatalogRequest(
    configStr: string | undefined,
    type: string | undefined,
    id: string | undefined,
    res: Response,
    extra?: string
  ): Promise<void> {
    const extraParams = parseExtraParams(extra);
    logger.debug('Catalog request', { type, id, extra: extraParams });

    // Validate parameters
    if (!configStr || !type || !id) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
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

    // Determine content type from catalog ID
    const contentType = getCatalogType(id);

    if (!contentType) {
      res.status(404).json({ error: 'Unknown catalog' });
      return;
    }

    try {
      // Pass the catalog ID and skip for variant-specific prompts and pagination
      const catalog = await generateCatalog(config, contentType, id, extraParams.skip);
      res.json(catalog);
    } catch (error) {
      logger.error('Catalog generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        catalogId: id,
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

  // Extended catalog route with extra param: /:config/catalog/:type/:id/:extra.json
  // Stremio sends requests like /catalog/movie/id/skip=0.json or /catalog/movie/id/genre=Action.json
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
