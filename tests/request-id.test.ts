import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requestIdMiddleware } from '../src/middleware/requestId.js';

describe('requestIdMiddleware', () => {
  it('uses incoming request id when valid', async () => {
    const app = express();
    app.use(requestIdMiddleware);
    app.get('/ping', (req, res) => {
      res.json({ requestId: req.requestId });
    });

    const response = await request(app).get('/ping').set('x-request-id', 'req-12345');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('req-12345');
    expect(response.body.requestId).toBe('req-12345');
  });

  it('generates a request id when missing', async () => {
    const app = express();
    app.use(requestIdMiddleware);
    app.get('/ping', (req, res) => {
      res.json({ requestId: req.requestId });
    });

    const response = await request(app).get('/ping');

    expect(response.status).toBe(200);
    expect(typeof response.headers['x-request-id']).toBe('string');
    expect(typeof response.body.requestId).toBe('string');
  });
});
