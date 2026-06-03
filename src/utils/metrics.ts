import type { Request, Response, NextFunction } from 'express';
import type { CacheStats } from '../types/index.js';
import { getCache } from '../cache/index.js';
import { getCacheStats } from '../services/cinemeta.js';
import {
  cinemetaCircuit,
  weatherCircuit,
  geminiCircuit,
  openaiCircuit,
  perplexityCircuit,
} from './circuitBreaker.js';
import { logger } from './logger.js';

interface HttpMetric {
  path: string;
  method: string;
  status: number;
  durationMs: number;
  requestId: string | undefined;
}

interface HttpMetricsSnapshot {
  total: number;
  byStatus: Record<string, number>;
  recent: HttpMetric[];
}

interface MetricsSnapshot {
  service: {
    uptimeSeconds: number;
    timestamp: string;
    version: string;
  };
  http: HttpMetricsSnapshot;
  cache: {
    memory: CacheStats | null;
    cinemeta: ReturnType<typeof getCacheStats>;
  };
  circuits: {
    cinemeta: ReturnType<typeof cinemetaCircuit.getStats>;
    weather: ReturnType<typeof weatherCircuit.getStats>;
    gemini: ReturnType<typeof geminiCircuit.getStats>;
    openai: ReturnType<typeof openaiCircuit.getStats>;
    perplexity: ReturnType<typeof perplexityCircuit.getStats>;
  };
}

interface ReadinessSnapshot {
  status: 'ready' | 'degraded';
  timestamp: string;
  dependencies: {
    cacheInitialized: boolean;
    circuits: {
      cinemeta: boolean;
      weather: boolean;
      gemini: boolean;
      openai: boolean;
      perplexity: boolean;
    };
  };
}

const MAX_RECENT = 50;
const recentRequests: HttpMetric[] = [];
const statusCounts = new Map<string, number>();
let totalRequests = 0;

function normalizePath(path: string): string {
  return path
    .replace(/\/enc\.[^/]+/g, '/[ENCRYPTED_CONFIG]')
    .replace(/\/search=[^/]+/g, '/search=[REDACTED]');
}

function recordHttpMetric(metric: HttpMetric): void {
  totalRequests += 1;
  const statusKey = String(metric.status);
  statusCounts.set(statusKey, (statusCounts.get(statusKey) ?? 0) + 1);
  recentRequests.push(metric);
  if (recentRequests.length > MAX_RECENT) {
    recentRequests.shift();
  }
}

export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  const normalizedPath = normalizePath(req.path || req.url);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    recordHttpMetric({
      path: normalizedPath,
      method: req.method,
      status: res.statusCode,
      durationMs,
      requestId: req.requestId,
    });
  });

  next();
}

function snapshotHttpMetrics(): HttpMetricsSnapshot {
  return {
    total: totalRequests,
    byStatus: Object.fromEntries(statusCounts),
    recent: [...recentRequests],
  };
}

function getCacheStatsSafe(): CacheStats | null {
  try {
    return getCache().getStats();
  } catch (error) {
    logger.debug('Cache not initialized for metrics', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

function isCacheInitialized(): boolean {
  try {
    getCache();
    return true;
  } catch (error) {
    logger.debug('Cache not initialized for readiness', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

export function getMetricsSnapshot(version: string): MetricsSnapshot {
  return {
    service: {
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      version,
    },
    http: snapshotHttpMetrics(),
    cache: {
      memory: getCacheStatsSafe(),
      cinemeta: getCacheStats(),
    },
    circuits: {
      cinemeta: cinemetaCircuit.getStats(),
      weather: weatherCircuit.getStats(),
      gemini: geminiCircuit.getStats(),
      openai: openaiCircuit.getStats(),
      perplexity: perplexityCircuit.getStats(),
    },
  };
}

export function getReadinessSnapshot(): ReadinessSnapshot {
  const circuits = {
    cinemeta: cinemetaCircuit.isAvailable(),
    weather: weatherCircuit.isAvailable(),
    gemini: geminiCircuit.isAvailable(),
    openai: openaiCircuit.isAvailable(),
    perplexity: perplexityCircuit.isAvailable(),
  };
  const cacheInitialized = isCacheInitialized();
  const allCircuitsAvailable = Object.values(circuits).every(Boolean);
  return {
    status: cacheInitialized && allCircuitsAvailable ? 'ready' : 'degraded',
    timestamp: new Date().toISOString(),
    dependencies: {
      cacheInitialized,
      circuits,
    },
  };
}

export function resetMetrics(): void {
  recentRequests.length = 0;
  totalRequests = 0;
  statusCounts.clear();
}

export function getHttpMetricsSnapshot(): HttpMetricsSnapshot {
  return snapshotHttpMetrics();
}
