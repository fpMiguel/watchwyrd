/**
 * Watchwyrd - Stremio Request Handlers
 *
 * Handles Stremio addon protocol requests for manifests and catalogs.
 * Uses batch generation to optimize AI API calls (10 catalogs = 1 API call).
 * Supports encrypted config URLs (AES-256-GCM) for API key security.
 */

import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import type { UserConfig, ContentType, PresetProfile } from '../types/index.js';
import { generateManifest } from '../addon/manifest.js';
import { generateCatalogBatched } from '../catalog/batchGenerator.js';
import { safeParseUserConfig, applyPreset } from '../config/schema.js';
import { serverConfig } from '../config/server.js';
import { logger } from '../utils/logger.js';
import { decryptConfig, isEncrypted } from '../utils/crypto.js';

/**
 * Parse user configuration from URL path
 * Only accepts encrypted configs (enc.xxx format)
 */
function parseConfigFromUrl(configStr: string): Record<string, unknown> | null {
  try {
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

  // Catalog request handler (shared logic)
  async function handleCatalogRequest(
    configStr: string | undefined,
    type: string | undefined,
    id: string | undefined,
    res: Response
  ): Promise<void> {
    logger.debug('Catalog request', { type, id });

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
      const catalog = await generateCatalogBatched(config, contentType, id);
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

  return router;
}
