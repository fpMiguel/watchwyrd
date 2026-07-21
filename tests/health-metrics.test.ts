import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/index.js';
import { resetMetrics, getHttpMetricsSnapshot } from '../src/utils/metrics.js';
import { createCache, closeCache } from '../src/cache/index.js';

describe('health and metrics endpoints', () => {
  beforeEach(() => {
    resetMetrics();
  });

  afterEach(async () => {
    await closeCache();
  });

  it('returns liveness response', async () => {
    const app = createApp();
    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('live');
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('returns readiness response', async () => {
    const app = createApp();
    const response = await request(app).get('/health/ready');

    expect([200, 503]).toContain(response.status);
    expect(['ready', 'degraded']).toContain(response.body.status);
    expect(typeof response.body.timestamp).toBe('string');
    expect(response.body.dependencies).toBeDefined();
    expect(typeof response.body.dependencies.cacheInitialized).toBe('boolean');
  });

  it('returns metrics snapshot and tracks request', async () => {
    const app = createApp();

    await request(app).get('/health/live');
    const response = await request(app).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.body.service).toBeDefined();
    expect(response.body.http.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(response.body.http.recent)).toBe(true);
  });

  it('should limit recent requests to MAX_RECENT (line 80)', async () => {
    const app = createApp();
    for (let i = 0; i < 55; i++) {
      await request(app).get('/health/live');
    }
    const response = await request(app).get('/metrics');
    expect(response.body.http.recent.length).toBeLessThanOrEqual(50);
  });

  it('should report cache initialized when createCache was called (line 124)', async () => {
    createCache();
    const app = createApp();
    const response = await request(app).get('/health/ready');
    expect(response.body.dependencies.cacheInitialized).toBe(true);
  });

  it('returns detailed health information', async () => {
    const app = createApp();
    const response = await request(app).get('/health/detailed');

    expect(response.status).toBe(200);
    expect(response.body.service).toBeDefined();
    expect(response.body.service.version).toBeDefined();
    expect(typeof response.body.service.uptimeSeconds).toBe('number');
    expect(typeof response.body.service.timestamp).toBe('string');
    expect(response.body.cache).toBeDefined();
    expect(response.body.cache.memory).toBeDefined();
    expect(response.body.cache.cinemeta).toBeDefined();
    expect(response.body.circuits).toBeDefined();
    expect(response.body.circuits.cinemeta).toBeDefined();
    expect(response.body.circuits.weather).toBeDefined();
    expect(response.body.circuits.gemini).toBeDefined();
    expect(response.body.circuits.openai).toBeDefined();
    expect(response.body.circuits.perplexity).toBeDefined();
    expect(response.body.http).toBeDefined();
    expect(response.body.http.total).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(response.body.http.recent)).toBe(true);
  });

  it('sets Cache-Control: no-store on all health and metrics endpoints', async () => {
    const app = createApp();
    const endpoints = ['/health', '/health/live', '/health/ready', '/health/detailed', '/metrics'];
    for (const endpoint of endpoints) {
      const response = await request(app).get(endpoint);
      expect(response.headers['cache-control']).toBe('no-store');
    }
  });

  it('sets security headers via Helmet', async () => {
    const app = createApp();
    const response = await request(app).get('/health');

    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
    expect(response.headers['x-download-options']).toBe('noopen');
    expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
  });

  it('sets CORS headers', async () => {
    const app = createApp();
    const response = await request(app).get('/health');

    expect(response.headers['access-control-allow-origin']).toBe('*');
  });

  it('sets Permissions-Policy header', async () => {
    const app = createApp();
    const response = await request(app).get('/health');

    expect(response.headers['permissions-policy']).toBe('geolocation=(), microphone=(), camera=()');
  });

  it('returns 404 for unknown routes', async () => {
    const app = createApp();
    const response = await request(app).get('/nonexistent-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('serves static files', async () => {
    const app = createApp();
    const response = await request(app).get('/static/wizard.js');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('javascript');
  });

  it('redirects root to /configure', async () => {
    const app = createApp();
    const response = await request(app).get('/').redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/configure');
  });

  it('handles errors with 500 via next(err)', async () => {
    const app = createApp();
    const stack = app.router.stack;
    const errorLayer = stack.pop();
    const notFoundLayer = stack.pop();

    app.get('/trigger-error', (_req, _res, next) => {
      next(new Error('Test next error'));
    });

    stack.push(notFoundLayer);
    stack.push(errorLayer);

    const response = await request(app).get('/trigger-error');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error' });
  });

  it('handles errors with 500 via synchronous throw', async () => {
    const app = createApp();
    const stack = app.router.stack;
    const errorLayer = stack.pop();
    const notFoundLayer = stack.pop();

    app.get('/throw-sync', () => {
      throw new Error('Sync error');
    });

    stack.push(notFoundLayer);
    stack.push(errorLayer);

    const response = await request(app).get('/throw-sync');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error' });
  });

  it('sets trust proxy when TRUST_PROXY env is set', async () => {
    vi.stubEnv('TRUST_PROXY', '1');
    const app = createApp();
    expect(app.get('trust proxy')).toBe(1);
    vi.unstubAllEnvs();
  });
});

describe('HTTPS redirect', () => {
  it('redirects insecure requests to HTTPS when trust proxy and https base url are configured', async () => {
    vi.stubEnv('TRUST_PROXY', '1');
    vi.stubEnv('BASE_URL', 'https://watchwyrd.example.com');
    vi.resetModules();
    const { createApp: createHttpsApp } = await import('../src/index.js');
    const response = await request(createHttpsApp()).get('/').redirects(0);
    expect(response.status).toBe(301);
    expect(response.headers.location).toBe('https://watchwyrd.example.com/');
    vi.unstubAllEnvs();
  });
});

describe('getHttpMetricsSnapshot', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('should return current metrics snapshot (line 182)', () => {
    const snapshot = getHttpMetricsSnapshot();
    expect(snapshot).toHaveProperty('total');
    expect(snapshot).toHaveProperty('byStatus');
    expect(snapshot).toHaveProperty('recent');
    expect(snapshot.total).toBe(0);
    expect(snapshot.recent).toEqual([]);
  });
});
