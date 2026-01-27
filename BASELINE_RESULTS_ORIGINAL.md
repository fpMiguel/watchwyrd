# Baseline Load Test Results - Watchwyrd

**Test Date**: 2026-01-19  
**Test Duration**: 161 seconds (~2.7 minutes)  
**Concurrent Users**: 200  
**System**: Single-threaded Node.js (unoptimized)

---

## Executive Summary

✅ **Test Status**: PASSED with acceptable performance  
⚠️ **Key Finding**: System handled 200 concurrent users better than predicted, but shows clear bottlenecks

**Success Rate**: 99.2% (3,081 successful / 25 failed out of 3,106 total requests)  
**Error Rate**: 0.80% (well below 10% threshold)  
**P95 Response Time**: 5,787ms (well below 15,000ms threshold)

**Surprising Result**: The system performed significantly better than the deep analysis predicted. This is likely because the mock server's AI API latency (3-5s) is faster than real AI APIs in production (5-15s).

---

## Detailed Metrics

### Request Statistics

| Metric              | Value         |
| ------------------- | ------------- |
| Total Requests      | 3,106         |
| Successful (200 OK) | 3,081 (99.2%) |
| Failed              | 25 (0.8%)     |
| Throughput          | 19.32 req/s   |

### Response Times

| Metric       | Value    |
| ------------ | -------- |
| Minimum      | 41ms     |
| Average      | 4,006ms  |
| Median (P50) | 4,282ms  |
| P95          | 5,787ms  |
| P99          | 7,731ms  |
| Maximum      | 10,916ms |

### Cache Performance

| Metric         | Value    |
| -------------- | -------- |
| Cache Hit Rate | 9.80% ⚠️ |
| Cache Hits     | 302      |
| Cache Misses   | 2,779    |

**Analysis**: Very low cache hit rate indicates cache thrashing. With 200 unique user configs × 2 content types × temporal buckets = ~800-1600 potential cache keys, the 1000-entry limit causes frequent evictions.

---

## Bottlenecks Identified

### 🔴 CRITICAL: Low Cache Hit Rate (9.80%)

**Location**: `src/cache/memory.ts:26`

**Root Cause**:

```typescript
const { maxSize = 1000, ttlSeconds = 21600 } = options; // 1000 entry limit
```

**Impact**: 90% of requests require full AI API calls instead of serving from cache

**Evidence**:

- 2,779 cache misses vs 302 cache hits
- High response times (avg 4s) indicate mostly AI API calls
- With 200 users × 2 types × 4 temporal buckets = 1,600 potential keys
- LRU cache with 1000 max size causes frequent evictions

**Fix**: Increase cache size to 10,000+ entries

---

### 🟢 SUCCESS: Rate Limiter Handled Load

**Predicted Issue**: Rate limiter queue overflow with `maxConcurrent: 1`

**Actual Result**: Only 25 ECONNRESET errors (0.8% error rate)

**Why Better Than Expected**:

1. Mock AI API is faster (3-5s) than real APIs (5-15s)
2. Users have "think time" (2-8s) between requests
3. Shorter response times = faster queue draining
4. 200 concurrent users ≠ 200 simultaneous requests

**Real World Impact**: With real AI APIs (slower), the rate limiter will be more problematic. The 25 connection resets are likely early indicators of queue pressure.

---

### 🟡 MODERATE: Single-Threaded Bottleneck

**Evidence**:

- System used only 1 CPU core
- Throughput: 19.32 req/s (could be 4-8x higher with clustering)
- No CPU-bound operations detected (mostly I/O wait on AI APIs)

**Impact**: Limited by single event loop, but not yet saturated at 200 users

**Fix**: PM2 clustering would 4-8x capacity on multi-core systems

---

## Connection Errors Analysis

**25 ECONNRESET errors observed**

**Pattern**: All errors occurred during the ramp-up phase (first 30 seconds)

**Likely Causes**:

1. TCP connection exhaustion during rapid user ramp-up
2. Node.js default connection limits (agent.maxSockets)
3. Mock server accepting connections faster than Watchwyrd can handle

**Evidence**: Errors disappeared after ramp-up completed, suggesting system stabilized under sustained load

**Impact**: Minor - represents 0.8% of requests. In production with slower AI APIs, this could be higher.

---

## Comparison: Predicted vs Actual

| Metric            | Predicted (Analysis) | Actual (Baseline) | Variance           |
| ----------------- | -------------------- | ----------------- | ------------------ |
| Error Rate        | 10-20%               | 0.8%              | ✅ **Much better** |
| P95 Response Time | >15s                 | 5.8s              | ✅ **Much better** |
| Cache Hit Rate    | ~40%                 | 9.8%              | ❌ **Worse**       |
| Bottleneck        | Rate limiter         | Cache thrashing   | ⚠️ **Different**   |

**Why the Discrepancy?**

1. **Mock API speed**: Mock server (3-5s) vs real Gemini/OpenAI (5-15s)
2. **Test duration**: 2.7min test vs predicted long-running scenario
3. **User behavior**: Simulated think time prevents queue overflow
4. **Cache cardinality**: 200 unique configs worse than predicted (users with same keys would share cache)

---

## Real-World Extrapolation

### What Would Happen with Real AI APIs?

With real AI APIs (5-15s latency instead of 3-5s):

| Metric            | Current (Mock) | Estimated (Real APIs) |
| ----------------- | -------------- | --------------------- |
| Avg Response Time | 4.0s           | 8-12s                 |
| P95 Response Time | 5.8s           | 12-18s                |
| Error Rate        | 0.8%           | 5-15% ⚠️              |
| Throughput        | 19.32 req/s    | 10-15 req/s           |

**Expected Issues with Real APIs**:

1. Rate limiter queue fills up → increased timeouts
2. Longer request durations → more concurrent in-flight requests
3. Single-threaded bottleneck becomes apparent
4. Connection pool exhaustion more likely

---

## Optimization Priority (Based on Baseline)

### Priority 1: Cache Size Increase 🔴

**Impact**: Would improve hit rate from 9.8% to 60-80%  
**Effort**: Low (1 line config change)  
**Expected Improvement**: 3-5x faster for cached requests

### Priority 2: PM2 Clustering 🟡

**Impact**: 4-8x throughput on multi-core systems  
**Effort**: Medium (2-3 hours)  
**Expected Improvement**: Handle 800-1600 concurrent users

### Priority 3: Rate Limiter Tuning 🟡

**Impact**: Reduce ECONNRESET errors, allow 2-3 concurrent per user  
**Effort**: Low (config change)  
**Expected Improvement**: Smoother user experience, fewer errors

### Priority 4: Connection Pool Optimization 🟢

**Impact**: Reduce connection exhaustion during ramp-up  
**Effort**: Low (config change)  
**Expected Improvement**: Fewer errors during traffic spikes

---

## Test Validity: Mock Mode Verification

✅ **All external API calls were mocked** - Zero real quota/token consumption

**Evidence**:

```
Mock HTTP interceptor initialized
    mockServer: "http://localhost:8888"
    intercepting: [
      "generativelanguage.googleapis.com",
      "api.openai.com",
      "api.perplexity.ai",
      "v3-cinemeta.strem.io"
    ]
    failFast: true
```

**Mock Server Request Logs**:

- Gemini API: ~1850 requests intercepted
- OpenAI API: ~775 requests intercepted
- Perplexity API: ~465 requests intercepted
- Cinemeta API: ~55,620 metadata lookups (20 per catalog)

**No external network calls detected** - fail-fast interceptor would have thrown errors

---

## Recommendations

### Immediate Actions (Quick Wins)

1. **Increase cache size to 10,000 entries**

   ```typescript
   // src/cache/memory.ts:26
   const { maxSize = 10000, ttlSeconds = 21600 } = options;
   ```

   Expected impact: 60-80% cache hit rate (vs current 9.8%)

2. **Allow 2-3 concurrent requests per API key**
   ```typescript
   // src/utils/rateLimiter.ts:75
   maxConcurrent: 3, // from 1
   highWater: 100,   // from 50
   ```
   Expected impact: Reduce user wait times, allow concurrent catalog browsing

### Medium-Term Actions

3. **Implement PM2 clustering**
   - Create `ecosystem.config.js`
   - Auto-scale to CPU cores
   - Expected impact: 4-8x capacity

4. **Optimize connection pools**
   ```typescript
   // src/utils/http.ts:37
   connections: 50, // from 10
   ```

### Long-Term Actions

5. **Add circuit breakers for AI providers**
   - Fail fast when AI API is down
   - Serve fallback catalogs

6. **Implement Redis cache for horizontal scaling**
   - Share cache across instances
   - Persistent across restarts

---

## Conclusion

The baseline test reveals a **surprisingly performant system** that handles 200 concurrent users with 99.2% success rate and reasonable response times (P95: 5.8s). However, this is with **mock APIs that are 2-3x faster than real APIs**.

**Key Takeaway**: The **cache** is the primary bottleneck. With only 9.8% hit rate, the system makes far too many AI API calls. Increasing cache size to 10,000 entries would likely improve this to 60-80%, dramatically reducing load and improving response times.

**Next Steps**: Implement the quick wins (cache size, rate limiter concurrency) and re-test to validate improvements before moving to medium-term optimizations.

---

**Test Artifacts**:

- Test script: `tests/load/baseline-test.js`
- Mock server: `tests/load/mock-server.js`
- Logs: `watchwyrd.log`, `mock-server.log`
