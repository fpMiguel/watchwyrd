# Quick Start: Run Load Test Baseline

## 🚀 Fastest Way to Run the Baseline Test

### Prerequisites

- Node.js installed ✓ (you have it)
- Application built ✓ (already done)

### Step 1: Start Services (2 terminals)

**Terminal 1:**

```bash
node tests/load/mock-server.js
```

Wait for: `Ready for load testing...`

**Terminal 2:**

```bash
MOCK_MODE=true SECRET_KEY=test-key node dist/index.js
```

Wait for: `🔮 Watchwyrd is running!`

### Step 2: Run Test (3rd terminal)

```bash
# Simple 1-minute baseline test (100 users)
MOCK_MODE=true node tests/load/simple-load-test.js
```

**OR** if you have k6 installed:

```bash
# Full 17-minute test (500 users)
k6 run tests/load/test-500-users.js
```

### Step 3: View Results

You'll see output like:

```
╔════════════════════════════════════════════════════════╗
║          SIMPLE LOAD TEST RESULTS                      ║
╟────────────────────────────────────────────────────────╢
║  Total Requests:         245                           ║
║  Successful:             198                           ║
║  Failed:                  47                           ║
║  Error Rate:            19.18%                         ║
╟────────────────────────────────────────────────────────╢
║  Cache Hit Rate:        42.31%                         ║
║  P95 Response Time:   14523ms                          ║
╚════════════════════════════════════════════════════════╝

✗ TEST FAILED - System needs optimization
  - Error rate too high: 19.18%
  - P95 response time too slow: 14523ms
```

This is **expected**! The current system is not optimized for 500 concurrent users.

---

## 🔒 Safety Check

Before running, verify interception is working:

```bash
MOCK_MODE=true node tests/load/test-interception.js
```

Expected output:

```
✅ SUCCESS: Mock interception is working correctly!
   Requests to Google API are being redirected to mock server.
```

If you see `✗ FAILURE`, do NOT proceed! Real APIs would be hit.

---

## 📊 What the Baseline Tells Us

The baseline test will reveal:

1. **Current capacity** - How many users it handles before breaking
2. **Bottlenecks** - Where the system slows down (rate limiter, cache, etc.)
3. **Error patterns** - What fails first under load
4. **Cache efficiency** - How often catalogs are served from cache

These metrics guide the optimization strategy.

---

## 🎯 After Baseline

Once you have the baseline metrics, we can:

1. Implement the performance optimizations (PM2 clustering, rate limiter tuning, etc.)
2. Re-run the same test
3. Compare before/after to quantify improvement

---

**Ready?** Run the test and share the results!
