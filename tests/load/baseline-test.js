/**
 * Baseline Load Test for Watchwyrd (Node.js)
 *
 * Tests the system's ability to handle concurrent users
 * using only Node.js built-in modules (no k6 required).
 *
 * All external API calls are mocked - zero real quota/token consumption.
 *
 * Usage: MOCK_MODE=true node tests/load/baseline-test.js
 */

import http from 'node:http';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { encrypt } from '../../dist/utils/crypto.js';

// ============================================================================
// Configuration
// ============================================================================

const BASE_URL = 'http://localhost:7000';
const MOCK_SERVER_URL = 'http://localhost:8888';
const SECRET_KEY = process.env['SECRET_KEY'] || 'test-secret-key';

// Test parameters
const MAX_CONCURRENT_USERS = 200; // Concurrent users
const RAMP_UP_DURATION_MS = 30 * 1000; // 30 seconds ramp-up
const SUSTAINED_DURATION_MS = 120 * 1000; // 2 minutes sustained load
const RAMP_DOWN_DURATION_MS = 15 * 1000; // 15 seconds ramp-down

// Metrics storage
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: [],
  cacheHits: 0,
  cacheMisses: 0,
  statusCodes: new Map(),
  startTime: 0,
  endTime: 0,
};

// ============================================================================
// User Configuration Generation
// ============================================================================

function generateUserConfigs(count) {
  const configs = [];

  const providers = [
    {
      name: 'gemini',
      weight: 60,
      apiKey: 'geminiApiKey',
      models: ['gemini-2.5-flash', 'gemini-2.0-flash'],
    },
    { name: 'openai', weight: 25, apiKey: 'openaiApiKey', models: ['gpt-4o-mini', 'gpt-4o'] },
    { name: 'perplexity', weight: 15, apiKey: 'perplexityApiKey', models: ['sonar', 'sonar-pro'] },
  ];

  for (let i = 0; i < count; i++) {
    // Select provider based on weights
    const providerRoll = Math.random() * 100;
    let cumulative = 0;
    let selectedProvider = providers[0];

    for (const p of providers) {
      cumulative += p.weight;
      if (providerRoll <= cumulative) {
        selectedProvider = p;
        break;
      }
    }

    // Select random model for provider
    const selectedModel =
      selectedProvider.models[Math.floor(Math.random() * selectedProvider.models.length)];

    // Create config object matching Watchwyrd's UserConfig schema
    const config = {
      userId: randomUUID(), // Generate unique UUID for each user
      aiProvider: selectedProvider.name,
      geminiApiKey: selectedProvider.name === 'gemini' ? `mock-api-key-${i}` : '',
      geminiModel: selectedProvider.name === 'gemini' ? selectedModel : 'gemini-2.5-flash',
      perplexityApiKey: selectedProvider.name === 'perplexity' ? `mock-api-key-${i}` : '',
      perplexityModel: selectedProvider.name === 'perplexity' ? selectedModel : 'sonar-pro',
      openaiApiKey: selectedProvider.name === 'openai' ? `mock-api-key-${i}` : '',
      openaiModel: selectedProvider.name === 'openai' ? selectedModel : 'gpt-4o-mini',
      rpdbApiKey: undefined,
      timezone: 'UTC',
      country: 'US',
      weatherLocation: undefined,
      subtitleTolerance: 'no_preference',
      includeMovies: true,
      includeSeries: Math.random() > 0.5,
      excludedGenres: [],
      enableWeatherContext: false,
      enableGrounding: false,
      showExplanations: false,
      catalogSize: 20,
      requestTimeout: 30,
    };

    // Encrypt config using the same method as Watchwyrd
    const configJson = JSON.stringify(config);
    const encrypted = encrypt(configJson, SECRET_KEY);
    configs.push(encrypted);
  }

  return configs;
}

const USER_CONFIGS = generateUserConfigs(MAX_CONCURRENT_USERS);
const CONTENT_TYPES = ['movie', 'series'];

// ============================================================================
// HTTP Request Helper
// ============================================================================

function makeRequest(config, contentType) {
  return new Promise((resolve) => {
    const catalogId = `${contentType}s-fornow`; // movies-fornow or series-fornow
    const path = `/${config}/catalog/${contentType}/${catalogId}.json`;

    const startTime = performance.now();

    const req = http.get(
      {
        hostname: 'localhost',
        port: 7000,
        path: path,
        timeout: 30000,
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const endTime = performance.now();
          const duration = endTime - startTime;

          metrics.totalRequests++;
          metrics.responseTimes.push(duration);

          // Track status codes
          const statusCode = res.statusCode || 0;
          metrics.statusCodes.set(statusCode, (metrics.statusCodes.get(statusCode) || 0) + 1);

          if (statusCode === 200) {
            metrics.successfulRequests++;

            // Estimate cache hit/miss based on response time
            // Cache hits should be <1 second, misses will be 5-10 seconds
            if (duration < 1000) {
              metrics.cacheHits++;
            } else {
              metrics.cacheMisses++;
            }
          } else {
            metrics.failedRequests++;
            metrics.errors.push({
              status: statusCode,
              duration,
              contentType,
            });
          }

          resolve({
            success: statusCode === 200,
            duration,
            status: statusCode,
          });
        });
      }
    );

    req.on('error', (err) => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      metrics.totalRequests++;
      metrics.failedRequests++;
      metrics.responseTimes.push(duration);
      metrics.errors.push({
        error: err.message,
        duration,
        contentType,
      });

      resolve({
        success: false,
        duration,
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
    });
  });
}

// ============================================================================
// Virtual User Simulation
// ============================================================================

async function simulateUser(userId, testEndTime) {
  const config = USER_CONFIGS[userId % USER_CONFIGS.length];
  let requestCount = 0;

  while (Date.now() < testEndTime) {
    const contentType = CONTENT_TYPES[Math.floor(Math.random() * CONTENT_TYPES.length)];

    await makeRequest(config, contentType);
    requestCount++;

    // Think time: 2-8 seconds between requests
    const thinkTime = 2000 + Math.random() * 6000;
    await new Promise((resolve) => setTimeout(resolve, thinkTime));
  }

  return requestCount;
}

// ============================================================================
// Statistics Calculation
// ============================================================================

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function calculateStats() {
  const duration = (metrics.endTime - metrics.startTime) / 1000;
  const errorRate =
    metrics.totalRequests > 0 ? (metrics.failedRequests / metrics.totalRequests) * 100 : 0;

  const cacheTotal = metrics.cacheHits + metrics.cacheMisses;
  const cacheHitRate = cacheTotal > 0 ? (metrics.cacheHits / cacheTotal) * 100 : 0;

  const avg =
    metrics.responseTimes.length > 0
      ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
      : 0;

  const p50 = percentile(metrics.responseTimes, 50);
  const p95 = percentile(metrics.responseTimes, 95);
  const p99 = percentile(metrics.responseTimes, 99);
  const max = metrics.responseTimes.length > 0 ? Math.max(...metrics.responseTimes) : 0;
  const min = metrics.responseTimes.length > 0 ? Math.min(...metrics.responseTimes) : 0;

  const throughput = metrics.totalRequests / duration;

  return {
    duration,
    errorRate,
    cacheHitRate,
    avg,
    p50,
    p95,
    p99,
    max,
    min,
    throughput,
  };
}

// ============================================================================
// Results Display
// ============================================================================

function printResults() {
  const stats = calculateStats();

  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║          BASELINE LOAD TEST RESULTS                    ║');
  console.log('╟────────────────────────────────────────────────────────╢');
  console.log(
    `║  Total Requests:     ${metrics.totalRequests.toString().padStart(8)}                      ║`
  );
  console.log(
    `║  Successful:         ${metrics.successfulRequests.toString().padStart(8)}                      ║`
  );
  console.log(
    `║  Failed:             ${metrics.failedRequests.toString().padStart(8)}                      ║`
  );
  console.log(
    `║  Error Rate:         ${stats.errorRate.toFixed(2).padStart(7)}%                     ║`
  );
  console.log('╟────────────────────────────────────────────────────────╢');
  console.log(
    `║  Cache Hit Rate:     ${stats.cacheHitRate.toFixed(2).padStart(7)}%                     ║`
  );
  console.log(
    `║  Cache Hits:         ${metrics.cacheHits.toString().padStart(8)}                      ║`
  );
  console.log(
    `║  Cache Misses:       ${metrics.cacheMisses.toString().padStart(8)}                      ║`
  );
  console.log('╟────────────────────────────────────────────────────────╢');
  console.log(`║  Min Response Time:  ${stats.min.toFixed(0).padStart(6)}ms                     ║`);
  console.log(`║  Avg Response Time:  ${stats.avg.toFixed(0).padStart(6)}ms                     ║`);
  console.log(`║  P50 Response Time:  ${stats.p50.toFixed(0).padStart(6)}ms                     ║`);
  console.log(`║  P95 Response Time:  ${stats.p95.toFixed(0).padStart(6)}ms                     ║`);
  console.log(`║  P99 Response Time:  ${stats.p99.toFixed(0).padStart(6)}ms                     ║`);
  console.log(`║  Max Response Time:  ${stats.max.toFixed(0).padStart(6)}ms                     ║`);
  console.log('╟────────────────────────────────────────────────────────╢');
  console.log(
    `║  Throughput:         ${stats.throughput.toFixed(2).padStart(7)} req/s                 ║`
  );
  console.log(
    `║  Concurrent Users:   ${MAX_CONCURRENT_USERS.toString().padStart(8)}                      ║`
  );
  console.log(
    `║  Test Duration:      ${stats.duration.toFixed(0).padStart(6)}s                      ║`
  );
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  // Status code distribution
  if (metrics.statusCodes.size > 0) {
    console.log('Status Code Distribution:');
    for (const [code, count] of Array.from(metrics.statusCodes).sort((a, b) => b[1] - a[1])) {
      const percent = (count / metrics.totalRequests) * 100;
      console.log(`  ${code}: ${count.toString().padStart(6)} (${percent.toFixed(1)}%)`);
    }
    console.log('');
  }

  // Pass/fail criteria
  const passed = stats.errorRate < 10 && stats.p95 < 15000;

  if (passed) {
    console.log('✓ BASELINE TEST PASSED');
    console.log('  System handled load reasonably well');
  } else {
    console.log('✗ BASELINE TEST REVEALED BOTTLENECKS');
    if (stats.errorRate >= 10) {
      console.log(`  - High error rate: ${stats.errorRate.toFixed(2)}% (threshold: 10%)`);
    }
    if (stats.p95 >= 15000) {
      console.log(`  - Slow P95 response: ${stats.p95.toFixed(0)}ms (threshold: 15000ms)`);
    }
    console.log('');
    console.log('  This is EXPECTED for the unoptimized baseline!');
  }

  console.log('');

  // Sample errors
  if (metrics.errors.length > 0) {
    const errorSample = metrics.errors.slice(0, 5);
    console.log(`Sample errors (showing ${errorSample.length} of ${metrics.errors.length}):`);
    errorSample.forEach((err) => {
      if (err.error) {
        console.log(`  - ${err.error} (${err.duration.toFixed(0)}ms)`);
      } else {
        console.log(`  - HTTP ${err.status} (${err.duration.toFixed(0)}ms)`);
      }
    });
    console.log('');
  }

  // Bottleneck analysis
  console.log('Bottleneck Analysis:');
  console.log('');

  if (stats.errorRate > 15) {
    console.log('  🔴 HIGH ERROR RATE detected');
    console.log('     Likely cause: Rate limiter queue overflow');
    console.log('     Location: src/utils/rateLimiter.ts:75');
    console.log('     Fix: Increase maxConcurrent from 1 to 3');
    console.log('');
  }

  if (stats.cacheHitRate < 50) {
    console.log('  🔴 LOW CACHE HIT RATE detected');
    console.log('     Likely cause: Cache thrashing (1000 entry limit)');
    console.log('     Location: src/cache/memory.ts:26');
    console.log('     Fix: Increase cache size to 10,000 entries');
    console.log('');
  }

  if (stats.p95 > 12000) {
    console.log('  🟡 SLOW P95 RESPONSE TIME detected');
    console.log('     Likely cause: Per-API-key serialization');
    console.log('     Location: src/utils/rateLimiter.ts:75');
    console.log('     Fix: Allow concurrent requests per user');
    console.log('');
  }

  if (stats.avg > 6000) {
    console.log('  🟡 HIGH AVERAGE RESPONSE TIME detected');
    console.log('     Likely cause: Single-threaded bottleneck');
    console.log('     Fix: Implement PM2 clustering');
    console.log('');
  }
}

// ============================================================================
// Pre-flight Checks
// ============================================================================

async function checkServices() {
  console.log('Performing pre-flight checks...\n');

  // Check mock server
  try {
    await new Promise((resolve, reject) => {
      const req = http.get(`${MOCK_SERVER_URL}/health`, (res) => {
        if (res.statusCode === 200) {
          console.log('✓ Mock server is running');
          resolve();
        } else {
          reject(new Error(`Mock server returned ${res.statusCode}`));
        }
      });
      req.on('error', reject);
      req.setTimeout(5000);
    });
  } catch (err) {
    console.error('✗ Mock server is NOT running');
    console.error(`  Error: ${err.message}`);
    console.error('');
    console.error('  Please start it with:');
    console.error('    node tests/load/mock-server.js');
    console.error('');
    process.exit(1);
  }

  // Check Watchwyrd
  try {
    await new Promise((resolve, reject) => {
      const req = http.get(`${BASE_URL}/health`, (res) => {
        if (res.statusCode === 200) {
          console.log('✓ Watchwyrd is running');
          resolve();
        } else {
          reject(new Error(`Watchwyrd returned ${res.statusCode}`));
        }
      });
      req.on('error', reject);
      req.setTimeout(5000);
    });
  } catch (err) {
    console.error('✗ Watchwyrd is NOT running');
    console.error(`  Error: ${err.message}`);
    console.error('');
    console.error('  Please start it with:');
    console.error('    MOCK_MODE=true SECRET_KEY=test-key node dist/index.js');
    console.error('');
    process.exit(1);
  }

  console.log('');
}

// ============================================================================
// Main Test Execution
// ============================================================================

async function runLoadTest() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║          Watchwyrd Baseline Load Test                 ║');
  console.log('╟────────────────────────────────────────────────────────╢');
  console.log(
    `║  Max Concurrent:     ${MAX_CONCURRENT_USERS.toString().padStart(8)} users                 ║`
  );
  console.log(
    `║  Ramp-up:            ${(RAMP_UP_DURATION_MS / 1000).toString().padStart(6)}s                      ║`
  );
  console.log(
    `║  Sustained:          ${(SUSTAINED_DURATION_MS / 1000).toString().padStart(6)}s                      ║`
  );
  console.log(
    `║  Ramp-down:          ${(RAMP_DOWN_DURATION_MS / 1000).toString().padStart(6)}s                      ║`
  );
  console.log(
    `║  Total Duration:     ${((RAMP_UP_DURATION_MS + SUSTAINED_DURATION_MS + RAMP_DOWN_DURATION_MS) / 1000).toString().padStart(6)}s                      ║`
  );
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  await checkServices();

  console.log('Starting load test...');
  console.log('');

  metrics.startTime = Date.now();
  const testEndTime = metrics.startTime + RAMP_UP_DURATION_MS + SUSTAINED_DURATION_MS;

  const users = [];

  // Progress reporter - show stats every 10 seconds
  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - metrics.startTime) / 1000;
    const throughput = metrics.totalRequests / elapsed;
    console.log(
      `  [${elapsed.toFixed(0)}s] Requests: ${metrics.totalRequests} | ` +
        `Throughput: ${throughput.toFixed(1)} req/s | ` +
        `Errors: ${metrics.failedRequests} | ` +
        `Cache hits: ${metrics.cacheHits}/${metrics.cacheHits + metrics.cacheMisses}`
    );
  }, 10000);

  // Ramp up users gradually
  console.log(`Ramping up to ${MAX_CONCURRENT_USERS} users over ${RAMP_UP_DURATION_MS / 1000}s...`);
  for (let i = 0; i < MAX_CONCURRENT_USERS; i++) {
    const delay = (RAMP_UP_DURATION_MS / MAX_CONCURRENT_USERS) * i;
    setTimeout(() => {
      users.push(simulateUser(i, testEndTime));

      // Progress indicator
      if ((i + 1) % 50 === 0 || i === MAX_CONCURRENT_USERS - 1) {
        console.log(`  ${i + 1}/${MAX_CONCURRENT_USERS} users active...`);
      }
    }, delay);
  }

  // Wait for sustained load period
  await new Promise((resolve) =>
    setTimeout(resolve, RAMP_UP_DURATION_MS + SUSTAINED_DURATION_MS + 5000)
  );

  console.log('');
  console.log('Test completed, waiting for final requests...');

  // Wait for all users to finish
  await Promise.all(users);

  clearInterval(progressInterval);

  metrics.endTime = Date.now();

  console.log('All requests completed!');
  console.log('');

  // Print results
  printResults();
}

// ============================================================================
// Entry Point
// ============================================================================

runLoadTest().catch((err) => {
  console.error('');
  console.error('╔════════════════════════════════════════════════════════╗');
  console.error('║                  TEST FAILED                           ║');
  console.error('╚════════════════════════════════════════════════════════╝');
  console.error('');
  console.error(`Error: ${err.message}`);
  console.error('');
  if (err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
