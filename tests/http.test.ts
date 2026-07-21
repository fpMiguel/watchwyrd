/**
 * HTTP Connection Pool Tests
 *
 * Covers pool reuse, max pool limit, and pool cleanup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/utils/logger.js', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

const mockRequest = vi.fn();
const mockClose = vi.fn().mockResolvedValue(undefined);

vi.mock('undici', () => ({
  Pool: class {
    request = mockRequest;
    close = mockClose;
  },
}));

let httpModule: typeof import('../src/utils/http.js');

beforeEach(async () => {
  vi.clearAllMocks();
  mockRequest.mockResolvedValue({
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: (async function* () {
      yield Buffer.from(JSON.stringify({ data: 'ok' }));
    })(),
  });
  httpModule = await import('../src/utils/http.js');
});

describe('pooledFetch', () => {
  it('should make a GET request and return parsed response', async () => {
    const response = await httpModule.pooledFetch('https://api.example.com/data');
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
  });

  it('should return text body', async () => {
    const response = await httpModule.pooledFetch('https://api.example.com/data');
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ data: 'ok' });
  });

  it('should support json helper', async () => {
    const response = await httpModule.pooledFetch('https://api.example.com/data');
    const data = await response.json<{ data: string }>();
    expect(data).toEqual({ data: 'ok' });
  });

  it('should reject json on invalid response body', async () => {
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      headers: {},
      body: (async function* () {
        yield Buffer.from('not-json');
      })(),
    });

    const response = await httpModule.pooledFetch('https://api.example.com/data');
    await expect(response.json()).rejects.toThrow('Invalid JSON response');
  });

  it('should reuse pool for same origin across requests', async () => {
    const r1 = await httpModule.pooledFetch('https://api.example.com/one');
    const r2 = await httpModule.pooledFetch('https://api.example.com/two');
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
  });

  it('should throw when max pools exceeded', async () => {
    // api.example.com pool already exists from previous test
    for (let i = 0; i < 9; i++) {
      await httpModule.pooledFetch(`https://api${i}.example.com/data`);
    }
    await expect(
      httpModule.pooledFetch('https://api-overflow.example.com/data')
    ).rejects.toThrow('Maximum number of HTTP connection pools');
  });

  it('should send body on POST request', async () => {
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: (async function* () {
        yield Buffer.from(JSON.stringify({ data: 'posted' }));
      })(),
    });

    await httpModule.pooledFetch('https://api.example.com/data', {
      method: 'POST',
      body: JSON.stringify({ test: true }),
    });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ body: JSON.stringify({ test: true }) })
    );
  });
});

describe('closeHttpPools', () => {
  it('should close all pools without error', async () => {
    await httpModule.pooledFetch('https://api.example.com/data');
    await expect(httpModule.closeHttpPools()).resolves.toBeUndefined();
  });
});
