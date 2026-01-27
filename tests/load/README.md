# Load Testing for Watchwyrd

This directory contains load testing infrastructure to validate that Watchwyrd can handle 500+ concurrent users.

## Overview

The load testing system consists of:

1. **Mock Server** - Simulates all external APIs (Gemini, OpenAI, Perplexity, Cinemeta)
2. **k6 Load Test** - Generates realistic load with 500 unique user configurations
3. **Monitoring Scripts** - Track performance metrics during the test

## Prerequisites

### Install k6

**Windows:**

```powershell
choco install k6
```

**macOS:**

```bash
brew install k6
```

**Linux:**

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Install Dependencies

The mock server uses Express:

```bash
npm install
```

## Running the Load Test

### Step 1: Start the Mock Server

```bash
node tests/load/mock-server.js
```

The mock server will run on http://localhost:8888 and simulate:

- **Gemini API** (3-5 second latency)
- **OpenAI/Perplexity API** (4-6 second latency)
- **Cinemeta API** (200-500ms latency)
- **Weather API** (100-300ms latency)

### Step 2: Build and Start Watchwyrd in Mock Mode

```bash
npm run build
```

Then in a separate terminal:

**Windows (PowerShell):**

```powershell
$env:MOCK_MODE="true"
$env:SECRET_KEY="test-secret-key-for-load-testing-only"
node dist/index.js
```

**Linux/macOS:**

```bash
MOCK_MODE=true SECRET_KEY=test-secret-key-for-load-testing-only node dist/index.js
```

### Step 3: Run the Load Test

In a third terminal:

```bash
k6 run tests/load/test-500-users.js
```

## Load Test Stages

The test simulates realistic traffic growth:

| Duration  | Target Users | Phase          |
| --------- | ------------ | -------------- |
| 1 minute  | 50 users     | Warm-up        |
| 2 minutes | 100 users    | Build-up       |
| 2 minutes | 200 users    | Build-up       |
| 2 minutes | 300 users    | Build-up       |
| 3 minutes | 500 users    | Peak ramp      |
| 5 minutes | 500 users    | Sustained peak |
| 2 minutes | 0 users      | Cool-down      |

**Total duration:** ~17 minutes

## User Simulation

The test generates **500 unique user configurations** with realistic distribution:

- 60% Gemini users (various models)
- 25% OpenAI users (GPT-4, GPT-5)
- 15% Perplexity users

Each user:

- Makes requests to random catalog types (movies/series)
- Has unique API keys
- Simulates realistic "think time" (3-15 seconds between requests)

## Success Criteria

The baseline test passes if:

- ✅ **Error rate < 5%** - Less than 5% of requests fail
- ✅ **P95 response time < 10s** - 95% of requests complete within 10 seconds
- ✅ **System remains stable** - No crashes, memory leaks, or resource exhaustion

## Interpreting Results

After the test completes, you'll see a summary like:

```
╔════════════════════════════════════════════════════════╗
║               LOAD TEST RESULTS                        ║
╟────────────────────────────────────────────────────────╢
║  Total Requests:         3,245                         ║
║  Successful:             3,089                         ║
║  Failed:                   156                         ║
║  Error Rate:              4.81%                        ║
╟────────────────────────────────────────────────────────╢
║  Cache Hit Rate:         68.23%                        ║
║  Cache Hits:             2,107                         ║
║  Cache Misses:             982                         ║
╟────────────────────────────────────────────────────────╢
║  Avg Response Time:     3,456ms                        ║
║  P95 Response Time:     8,912ms                        ║
║  P99 Response Time:    12,345ms                        ║
║  Max Response Time:    15,678ms                        ║
╚════════════════════════════════════════════════════════╝
```

### Key Metrics Explained

- **Error Rate** - Percentage of failed requests (timeouts, 500 errors, etc.)
- **Cache Hit Rate** - How often catalogs are served from cache (higher is better)
- **P95 Response Time** - 95% of requests are faster than this
- **P99 Response Time** - 99% of requests are faster than this

### Expected Baseline Results (Before Optimization)

Based on the codebase analysis, the **current unoptimized** system will likely show:

- ❌ High error rate (10-20%) due to rate limiter queue overflows
- ❌ Slow P95 times (>15s) due to per-API-key serialization
- ⚠️ Low cache hit rate (~40%) due to cache thrashing (1000 entry limit)
- ⚠️ Possible timeouts during peak load

## Monitoring During the Test

### Watch Server Logs

Watch the Watchwyrd logs for errors:

```bash
# The server outputs logs in real-time
```

### Monitor System Resources (Optional)

**Windows (PowerShell):**

```powershell
while ($true) {
  Get-Process node | Select-Object CPU, WorkingSet, ProcessName
  Start-Sleep -Seconds 2
}
```

**Linux/macOS:**

```bash
watch -n 2 'ps aux | grep node'
```

## Troubleshooting

### Mock server connection errors

- Ensure mock server is running on http://localhost:8888
- Check with: `curl http://localhost:8888/health`

### Watchwyrd connection errors

- Ensure Watchwyrd is running on http://localhost:7000
- Ensure `MOCK_MODE=true` is set
- Check with: `curl http://localhost:7000/health`

### k6 not found

- Install k6 using the instructions above
- Verify with: `k6 version`

### High error rates

- This is expected in the baseline test (system not yet optimized)
- The goal is to measure current performance before optimization

## Next Steps

After running the baseline:

1. Analyze the bottlenecks (error logs, slow responses, cache misses)
2. Implement performance optimizations
3. Re-run the load test to validate improvements
4. Compare before/after metrics

## Files

- `mock-server.js` - Standalone mock server for external APIs
- `test-500-users.js` - k6 load test script
- `README.md` - This file
- `summary.json` - Generated after each test run (detailed metrics)
