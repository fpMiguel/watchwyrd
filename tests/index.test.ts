import { describe, it, expect, vi, afterEach } from 'vitest';

const { mockApp, mockServer, mockExpress, cacheThrowRef } = vi.hoisted(() => {
  const server: Record<string, any> = {
    requestTimeout: 0,
    headersTimeout: 0,
    keepAliveTimeout: 0,
    on: vi.fn(),
  };
  const app: Record<string, any> = {
    use: vi.fn().mockReturnThis(),
    get: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    listen: vi.fn((_port: any, _host: any, cb?: () => void) => {
      if (cb) cb();
      return server;
    }),
  };
  const exp = vi.fn(() => app) as any;
  exp.json = vi.fn(() => vi.fn());
  exp.urlencoded = vi.fn(() => vi.fn());
  exp.static = vi.fn(() => vi.fn());
  exp.Router = vi.fn(() => ({
    get: vi.fn().mockReturnThis(),
    post: vi.fn().mockReturnThis(),
    use: vi.fn().mockReturnThis(),
  }));
  return { mockApp: app, mockServer: server, mockExpress: exp, cacheThrowRef: { value: false } };
});

vi.mock('express', () => ({ default: mockExpress }));
vi.mock('../src/handlers/index.js', () => ({
  createStremioRoutes: vi.fn(() => vi.fn()),
  createConfigureRoutes: vi.fn(() => vi.fn()),
}));
vi.mock('../src/middleware/rateLimiters.js', () => ({
  generalLimiter: vi.fn(),
  strictLimiter: vi.fn(),
}));
vi.mock('../src/middleware/requestId.js', () => ({
  requestIdMiddleware: vi.fn(),
}));
vi.mock('../src/utils/metrics.js', () => ({
  httpMetricsMiddleware: vi.fn(),
  getMetricsSnapshot: vi.fn(() => ({})),
  getReadinessSnapshot: vi.fn(() => ({ status: 'ready' })),
}));
vi.mock('../src/cache/index.js', () => ({
  createCache: vi.fn(() => {
    if (cacheThrowRef.value) throw new Error('Cache init failed');
  }),
  closeCache: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
vi.mock('../src/utils/cleanup.js', () => ({
  runCleanup: vi.fn(),
}));
vi.mock('../src/utils/clientPool.js', () => ({
  closeAllPools: vi.fn(),
}));
vi.mock('../src/utils/http.js', () => ({
  closeHttpPools: vi.fn(),
}));
vi.mock('../src/addon/manifest.js', () => ({
  ADDON_VERSION: '0.0.0-test',
}));

describe('start()', () => {
  const originalExit = process.exit;

  afterEach(() => {
    process.exit = originalExit;
    vi.restoreAllMocks();
  });

  it('should create server and set timeouts', async () => {
    process.exit = vi.fn() as any;

    mockServer.requestTimeout = 0;
    mockServer.headersTimeout = 0;
    mockServer.keepAliveTimeout = 0;

    vi.resetModules();
    const { start } = await import('../src/index.js');

    start();

    expect(mockServer.requestTimeout).toBe(125000);
    expect(mockServer.headersTimeout).toBe(126000);
    expect(mockServer.keepAliveTimeout).toBe(5000);
    expect(mockApp.listen).toHaveBeenCalled();
  });

  it('should log error and exit when startup fails', async () => {
    process.exit = vi.fn() as any;
    cacheThrowRef.value = true;

    vi.resetModules();
    const { start } = await import('../src/index.js');

    start();

    expect(process.exit).toHaveBeenCalledWith(1);

    cacheThrowRef.value = false;
  });

  it('should log unhandled promise rejections', async () => {
    process.exit = vi.fn() as any;

    vi.resetModules();
    const { logger } = await import('../src/utils/logger.js');
    const { start } = await import('../src/index.js');

    start();

    process.emit('unhandledRejection', new Error('test rejection'), Promise.resolve());

    expect(logger.error).toHaveBeenCalledWith('Unhandled promise rejection', expect.any(Object));
  });
});