import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const REQUEST_ID_HEADER = 'x-request-id';

function extractHeaderValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  const headerValue = Array.isArray(value) ? value[0] : value;
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  if (!trimmed) return null;
  return trimmed;
}

function isValidRequestId(value: string): boolean {
  if (value.length < 6 || value.length > 128) return false;
  return /^[A-Za-z0-9._-]+$/.test(value);
}

function generateRequestId(): string {
  return crypto.randomUUID();
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = extractHeaderValue(req.get(REQUEST_ID_HEADER));
  const requestId = incoming && isValidRequestId(incoming) ? incoming : generateRequestId();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

export const requestIdHeaderName = REQUEST_ID_HEADER;
