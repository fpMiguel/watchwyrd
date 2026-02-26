import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/index.js';
import { resetMetrics } from '../src/utils/metrics.js';

describe('health and metrics endpoints', () => {
  beforeEach(() => {
    resetMetrics();
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
});
