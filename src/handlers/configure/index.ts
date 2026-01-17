/**
 * Watchwyrd - Configure Page Routes
 *
 * Express router for the configuration wizard.
 * Handles serving the wizard UI and processing form submissions.
 */

import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { serverConfig } from '../../config/server.js';
import { VALID_GENRES } from '../../config/schema.js';
import { GeminiProvider } from '../../providers/gemini.js';
import { searchLocations } from '../../services/weather.js';
import { logger } from '../../utils/logger.js';
import { encryptConfig } from '../../utils/crypto.js';
import { validationLimiter } from '../../middleware/rateLimiters.js';

import { getAllStyles } from './styles.js';
import { getLocationDropdownCSS } from './components.js';
import {
  renderHeader,
  renderProgressBar,
  renderStep1_Provider,
  renderStep2_ApiKey,
  renderStep3_Location,
  renderStep4_Preferences,
  renderStep5_Review,
  renderNavigation,
  renderFooter,
  renderSuccessPage,
} from './components.js';
import { getWizardScript, getSuccessPageScript } from './scripts.js';

// Dev mode API keys (only used in development)
const DEV_GEMINI_KEY =
  process.env['NODE_ENV'] === 'development' ? process.env['GEMINI_API_KEY'] || '' : '';
const DEV_PERPLEXITY_KEY =
  process.env['NODE_ENV'] === 'development' ? process.env['PERPLEXITY_API_KEY'] || '' : '';

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (c) => htmlEscapes[c] || c);
}

/**
 * Generate the complete wizard page HTML
 */
function generateWizardPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Watchwyrd - Setup Wizard</title>
  <link rel="icon" type="image/png" href="/static/favicon.png">
  <meta name="description" content="Configure your personalized AI-powered movie and TV recommendations">
  <meta name="theme-color" content="#7c3aed">
  <style>
    ${getAllStyles()}
    ${getLocationDropdownCSS()}
  </style>
</head>
<body>
  <div class="wizard-container">
    ${renderHeader()}
    ${renderProgressBar()}
    
    <form id="wizardForm">
      ${renderStep1_Provider()}
      ${renderStep2_ApiKey(DEV_GEMINI_KEY, DEV_PERPLEXITY_KEY)}
      ${renderStep3_Location()}
      ${renderStep4_Preferences()}
      ${renderStep5_Review()}
    </form>
    
    ${renderNavigation()}
    ${renderFooter()}
  </div>
  
  ${getWizardScript(DEV_GEMINI_KEY, DEV_PERPLEXITY_KEY)}
</body>
</html>`;
}

/**
 * Generate success page HTML
 */
function generateSuccessPageHtml(stremioUrl: string, httpUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Watchwyrd - Ready to Install</title>
  <link rel="icon" type="image/png" href="/static/favicon.png">
  <style>
    ${getAllStyles()}
  </style>
</head>
<body>
  ${renderSuccessPage(stremioUrl, httpUrl)}
  ${getSuccessPageScript()}
</body>
</html>`;
}

/**
 * Parse Gemini API error response into user-friendly message
 */
function parseGeminiApiError(status: number, errorData: Record<string, unknown>): string {
  const error = errorData['error'] as Record<string, unknown> | undefined;
  const message = error?.['message'] as string | undefined;
  const details = error?.['details'] as Array<Record<string, unknown>> | undefined;

  if (details && details.length > 0) {
    for (const detail of details) {
      if (detail['@type'] === 'type.googleapis.com/google.rpc.ErrorInfo') {
        const reason = detail['reason'] as string;
        if (reason === 'API_KEY_INVALID') {
          return 'Invalid API key. Please check that you copied the entire key.';
        }
      }
      if (detail['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure') {
        const violations = detail['violations'] as Array<Record<string, unknown>> | undefined;
        if (violations && violations.length > 0 && violations[0]) {
          const metric = (violations[0]['quotaMetric'] as string) || '';
          if (metric.includes('free_tier')) {
            return 'Free tier quota exceeded. Please wait a few minutes or upgrade.';
          }
          return 'API quota exceeded. Please wait and try again.';
        }
      }
      if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo') {
        const retryDelay = detail['retryDelay'] as string;
        if (retryDelay) {
          const seconds = parseInt(retryDelay.replace('s', ''));
          return `Rate limited. Please wait ${seconds} seconds.`;
        }
      }
    }
  }

  switch (status) {
    case 400:
      return message || 'Bad request. Check your API key format.';
    case 401:
      return 'Invalid API key.';
    case 403:
      return 'API key lacks permission. Enable Gemini API in Google Cloud.';
    case 404:
      return 'API not found. May be unavailable in your region.';
    case 429:
      return message || 'Too many requests. Wait and retry.';
    case 500:
    case 502:
    case 503:
      return 'Gemini API temporarily unavailable.';
    default:
      return message || `API error (${status})`;
  }
}

/**
 * Sanitize error messages to prevent information leakage
 */
function sanitizeErrorMessage(message: string): string {
  // Map common error patterns to safe messages
  const patterns: [RegExp, string][] = [
    [/invalid.*api.*key/i, 'Invalid API key'],
    [/unauthorized/i, 'Invalid API key'],
    [/forbidden/i, 'API key lacks permission'],
    [/rate.*limit/i, 'Rate limit exceeded. Try again later.'],
    [/timeout/i, 'Request timed out. Try again.'],
    [/network/i, 'Network error. Check your connection.'],
    [/ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i, 'Service unavailable. Try again later.'],
    [/500|502|503|504/i, 'Service temporarily unavailable.'],
  ];

  for (const [pattern, safeMessage] of patterns) {
    if (pattern.test(message)) {
      return safeMessage;
    }
  }

  // Default: return generic message (don't expose internal details)
  return 'Validation failed. Please check your API key.';
}

/**
 * Create configure page routes
 */
export function createConfigureRoutes(): Router {
  const router = createRouter();

  // CSP middleware - protects against XSS and data exfiltration
  router.use((_req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'", // Inline scripts for wizard
        "style-src 'self' 'unsafe-inline'", // Inline styles for wizard
        "img-src 'self' data:", // Allow data URIs for icons
        "connect-src 'self'", // Only allow API calls to self
        "frame-ancestors 'none'", // Prevent clickjacking
        "form-action 'self'", // Forms only submit to self
      ].join('; ')
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  // GET /configure - Show configuration wizard
  router.get('/', (_req: Request, res: Response) => {
    res.send(generateWizardPage());
  });

  // POST /configure - Process form and generate install link
  router.post('/', async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;

      const aiProvider = body['aiProvider'] || 'gemini';

      const config: Record<string, unknown> = {
        aiProvider,
        geminiApiKey: body['geminiApiKey'] || '',
        geminiModel: body['geminiModel'] || 'gemini-2.5-flash',
        perplexityApiKey: body['perplexityApiKey'] || '',
        perplexityModel: body['perplexityModel'] || 'sonar-pro',
        timezone: body['timezone'] || 'UTC',
        country: body['country'] || 'US',
        presetProfile: body['presetProfile'] || 'casual',
        includeMovies: body['includeMovies'] === 'true',
        includeSeries: body['includeSeries'] === 'true',
        enableWeatherContext: body['enableWeatherContext'] === 'true',
        showExplanations: body['showExplanations'] === 'true',
        rpdbApiKey: (body['rpdbApiKey'] as string) || undefined,
        catalogSize: parseInt(body['catalogSize'] as string) || 20,
        excludedGenres: [] as string[],
      };

      // Add weather location if provided
      const weatherLat = body['weatherLocationLat'] as string;
      const weatherLon = body['weatherLocationLon'] as string;
      if (weatherLat && weatherLon && body['enableWeatherContext'] === 'true') {
        config['weatherLocation'] = {
          name: body['weatherLocationName'] || '',
          country: body['weatherLocationCountry'] || '',
          latitude: parseFloat(weatherLat),
          longitude: parseFloat(weatherLon),
          admin1: body['weatherLocationAdmin1'] || '',
        };
      }

      // Handle excluded genres
      const selectedGenres = Array.isArray(body['genres'])
        ? body['genres']
        : body['genres']
          ? [body['genres']]
          : [];

      config['excludedGenres'] = VALID_GENRES.filter(
        (g) => !(selectedGenres as string[]).includes(g)
      );

      // Validate API key
      if (aiProvider === 'gemini' && !config['geminiApiKey']) {
        res.status(400).json({ error: 'Gemini API key is required' });
        return;
      }

      if (aiProvider === 'perplexity' && !config['perplexityApiKey']) {
        res.status(400).json({ error: 'Perplexity API key is required' });
        return;
      }

      // Validate Gemini key
      if (aiProvider === 'gemini') {
        const gemini = new GeminiProvider(
          config['geminiApiKey'] as string,
          config['geminiModel'] as 'gemini-2.5-flash'
        );

        const validationResult = await gemini.validateApiKey();

        if (!validationResult.valid) {
          res.status(400).json({ error: validationResult.error || 'Invalid Gemini API key' });
          return;
        }
      }

      // Generate encrypted config for URL (AES-256-GCM)
      // This protects API keys from being visible in the URL
      const encryptedConfig = encryptConfig(config, serverConfig.security.secretKey);

      const manifestPath = `/${encryptedConfig}/manifest.json`;
      const stremioUrl = `stremio://${serverConfig.baseUrl.replace(/^https?:\/\//, '')}${manifestPath}`;
      const httpUrl = `${serverConfig.baseUrl}${manifestPath}`;

      logger.info('Configuration generated', {
        provider: aiProvider,
        model: aiProvider === 'gemini' ? config['geminiModel'] : config['perplexityModel'],
        preset: config['presetProfile'],
        encrypted: true,
      });

      // HTML-escape URLs to prevent XSS
      res.send(generateSuccessPageHtml(escapeHtml(stremioUrl), escapeHtml(httpUrl)));
    } catch (error) {
      logger.error('Configuration error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
  });

  // API endpoint to validate API key and get available models
  // Extra rate limiting to prevent API key enumeration
  router.post('/validate-key', validationLimiter, async (req: Request, res: Response) => {
    try {
      const { apiKey, provider } = req.body as { apiKey?: string; provider?: string };

      if (!apiKey) {
        res.json({ valid: false, error: 'API key is required' });
        return;
      }

      // Handle Perplexity validation
      if (provider === 'perplexity') {
        try {
          const testResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'sonar',
              messages: [{ role: 'user', content: 'test' }],
              max_tokens: 1,
            }),
          });

          if (!testResponse.ok) {
            const errorData = (await testResponse.json().catch(() => ({}))) as Record<
              string,
              unknown
            >;
            const errorDetail =
              (errorData['detail'] as string) ||
              (errorData['error'] as { message?: string })?.message ||
              'Invalid API key';
            res.json({ valid: false, error: errorDetail });
            return;
          }

          // Perplexity doesn't have a models endpoint, so we return the known models
          // This list should be updated when Perplexity adds new models
          // See: https://docs.perplexity.ai/guides/model-cards
          const perplexityModels = [
            { id: 'sonar', name: 'Sonar (Fast)', tier: 'standard' },
            { id: 'sonar-pro', name: 'Sonar Pro (Recommended)', tier: 'standard' },
          ];

          res.json({ valid: true, models: perplexityModels });
        } catch (error) {
          // Sanitize error message - don't expose internal details
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const safeMessage = sanitizeErrorMessage(errorMessage);
          res.json({ valid: false, error: safeMessage });
        }
        return;
      }

      // Gemini validation
      const modelsResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );

      if (!modelsResponse.ok) {
        const errorData = (await modelsResponse.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        const errorMessage = parseGeminiApiError(modelsResponse.status, errorData);
        res.json({ valid: false, error: errorMessage });
        return;
      }

      const modelsData = (await modelsResponse.json()) as {
        models?: Array<{
          name: string;
          displayName?: string;
          supportedGenerationMethods?: string[];
        }>;
      };

      if (!modelsData.models || modelsData.models.length === 0) {
        res.json({ valid: false, error: 'No models available' });
        return;
      }

      // Map models dynamically - filter to gemini models that support generateContent
      const geminiModels = modelsData.models
        .filter((m) => {
          const name = m.name.replace('models/', '');
          // Only include gemini models that support content generation
          return (
            name.startsWith('gemini-') &&
            m.supportedGenerationMethods?.includes('generateContent') &&
            // Exclude embedding, vision-only, and legacy models
            !name.includes('embedding') &&
            !name.includes('aqa') &&
            !name.includes('imagen') &&
            !name.includes('veo')
          );
        })
        .map((m) => {
          const id = m.name.replace('models/', '');
          const displayName = m.displayName || id;
          // Determine if it's free tier (flash models are typically free)
          const isFreeTier = id.includes('flash') || id.includes('lite') || id.includes('exp');
          return {
            id,
            name: displayName,
            freeTier: isFreeTier,
            available: true,
          };
        })
        // Sort: free tier first, then by name
        .sort((a, b) => {
          if (a.freeTier !== b.freeTier) return a.freeTier ? -1 : 1;
          return a.id.localeCompare(b.id);
        })
        // Deduplicate by base name (keep latest version)
        .reduce(
          (acc, model) => {
            // Extract base name (e.g., gemini-2.5-flash from gemini-2.5-flash-001)
            const baseName = model.id.replace(/-\d{3}$/, '').replace(/-latest$/, '');
            const existing = acc.find((m) => m.id === baseName || m.id.startsWith(baseName + '-'));
            if (!existing) {
              acc.push(model);
            }
            return acc;
          },
          [] as Array<{ id: string; name: string; freeTier: boolean; available: boolean }>
        );

      res.json({
        valid: true,
        models: geminiModels,
        totalApiModels: modelsData.models.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('API key validation error', { error: errorMessage });
      res.json({ valid: false, error: `Validation failed: ${errorMessage}` });
    }
  });

  // API endpoint to search for locations
  router.get('/search-locations', async (req: Request, res: Response) => {
    try {
      const query = req.query['q'] as string | undefined;

      // Validate query: min 2 chars, max 100 chars, alphanumeric + spaces only
      if (!query || query.length < 2) {
        res.json({ results: [] });
        return;
      }

      if (query.length > 100) {
        res.json({ results: [], error: 'Query too long' });
        return;
      }

      // Allow letters, numbers, spaces, hyphens, apostrophes, and common diacritics
      if (!/^[\p{L}\p{N}\s\-'.,]+$/u.test(query)) {
        res.json({ results: [], error: 'Invalid characters in query' });
        return;
      }

      const results = await searchLocations(query, 10);

      const locations = results.map((r) => ({
        id: r.id,
        name: r.name,
        country: r.country,
        admin1: r.admin1,
        latitude: r.latitude,
        longitude: r.longitude,
        label: r.admin1 ? `${r.name}, ${r.admin1}, ${r.country}` : `${r.name}, ${r.country}`,
      }));

      res.json({ results: locations });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Location search error', { error: errorMessage });
      res.json({ results: [], error: 'Failed to search locations' });
    }
  });

  return router;
}
