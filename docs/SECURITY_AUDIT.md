# Security Audit Report v2

**Project:** Watchwyrd (Stremio AI Addon)  
**Audit Date:** 2026-01-17  
**Version:** 0.0.37  
**Status:** Post-Remediation Review

---

## Executive Summary

This is a follow-up audit after implementing security fixes. The codebase now has strong foundational security with rate limiting, encryption, and input validation. **2 High** and **3 Medium** severity issues remain.

### Risk Overview

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | ✅ None |
| High | 2 | ⚠️ Action Required |
| Medium | 3 | ⚠️ Recommended |
| Low | 2 | ℹ️ Consider |

---

## Security Strengths ✅

### Encryption & Authentication
- AES-256-GCM with authenticated encryption
- Random 128-bit IV per encryption
- PBKDF2 key derivation (100k iterations)
- `SECRET_KEY` required in production (fails startup)

### Rate Limiting
- HTTP rate limiting: 100 req/15min general, 20 req/15min on `/configure`
- Per-API-key rate limiting with 1s minimum delay
- Memory-limited: 1000 max keys, 50 queue limit, TTL cleanup

### Input Validation
- Zod schema validation on all configs
- HTML escaping for XSS prevention
- Genre keys restricted to `VALID_GENRES` enum
- Error message sanitization

### Resource Protection
- 60 second AI request timeout
- 90 second batch tracking cleanup
- Request body size limit (100kb)
- LRU eviction on rate limiter state

### HTTP Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (restrictive)
- CSP on `/configure` routes

---

## Remaining Issues

### HIGH Severity

#### 1. Dev API Keys Exposed in HTML

**File:** `src/handlers/configure/index.ts:78, 88`

**Issue:** Development API keys are embedded directly in wizard HTML/JavaScript.

```typescript
const DEV_GEMINI_KEY = process.env['NODE_ENV'] === 'development' 
  ? process.env['GEMINI_API_KEY'] || '' : '';
// Later passed to renderStep2_ApiKey() and wizard scripts
```

**Risk:** If `NODE_ENV` is accidentally left as `development` in production, API keys are visible in page source.

**Recommendation:** Never embed API keys in client-side code. Only use for server-side validation.

---

#### 2. `/validate-key` Endpoint Missing Rate Limit

**File:** `src/handlers/configure/index.ts`

**Issue:** The `/validate-key` endpoint makes external API calls but doesn't have its own rate limit.

**Risk:** Attacker can enumerate API keys or cause excessive external API charges.

**Recommendation:** Apply `strictLimiter` or create dedicated limiter for validation endpoints.

---

### MEDIUM Severity

#### 3. Missing Global CSP

**File:** `src/index.ts`

**Issue:** Content-Security-Policy only applied to `/configure` routes. API routes lack CSP.

**Risk:** If any XSS exists in API responses (e.g., error messages), no CSP protection.

**Recommendation:** Add minimal CSP to all routes: `default-src 'none'; frame-ancestors 'none'`

---

#### 4. Client Pool Caches API Keys

**Files:** `src/providers/gemini.ts:63`, `src/providers/perplexity.ts:48`

**Issue:** API keys used as Map keys in client pools, kept in memory indefinitely.

```typescript
private static clientPool = new Map<string, GoogleGenerativeAI>();
```

**Risk:** Long-running server accumulates all user API keys in memory. If memory is dumped, keys are exposed.

**Recommendation:** Add TTL-based eviction for pooled clients (e.g., 1 hour idle timeout).

---

#### 5. Config String Length Unlimited

**File:** `src/handlers/stremio.ts`

**Issue:** `configStr` extracted from URL path without length validation.

**Risk:** Extremely long config strings could cause parsing overhead or memory issues.

**Recommendation:** Reject configs > 8KB (encrypted configs should be ~2-3KB max).

---

### LOW Severity

#### 6. Location Search Query Validation

**File:** `src/handlers/configure/index.ts:471`

**Issue:** Location search query only checks `length < 2`, no max length or character validation.

**Recommendation:** Add max length (100 chars) and alphanumeric filter.

---

#### 7. No SECRET_KEY Entropy Validation

**File:** `src/config/server.ts`

**Issue:** No check that `SECRET_KEY` has sufficient entropy/length.

**Recommendation:** Warn if SECRET_KEY < 32 characters.

---

## Accepted Risks (Documented)

| Item | Risk Level | Justification |
|------|------------|---------------|
| Fixed PBKDF2 salt | Low | Acceptable for config encryption (not passwords). Security comes from unique SECRET_KEY per deployment. Scales horizontally. |
| CORS `origin: '*'` | Low | Required for Stremio addon compatibility. `credentials: false` prevents cookie theft. |
| Dev default SECRET_KEY | Low | Only used in development. Production requires explicit key. |
| Rate limit skipped in dev | Low | Allows testing. Not applicable in production. |

---

## Remediation Checklist

### Immediate (Before Production)

- [ ] Remove dev API keys from client render OR add strict NODE_ENV check
- [ ] Add rate limiter to `/validate-key` endpoint

### Short-term

- [ ] Add minimal CSP to all routes
- [ ] Add TTL eviction to client pools
- [ ] Add config string length limit

### Optional

- [ ] Location search input sanitization
- [ ] SECRET_KEY entropy validation

---

## Dependency Vulnerabilities

```
6 vulnerabilities (3 low, 3 high)
```

| Package | Severity | Issue | Status |
|---------|----------|-------|--------|
| `path-to-regexp` (stremio-addon-sdk) | High | ReDoS vulnerability | Accepted - in SDK's internal router, not our code |
| `tmp` (inquirer) | Low | Symlink directory write | Accepted - dev dependency only |

**Note:** Fixing requires breaking SDK update. Risk accepted as vulnerabilities are in SDK internals, not exposed endpoints.

---

## OWASP Top 10 Coverage

| Category | Status | Notes |
|----------|--------|-------|
| A01 Broken Access Control | ✅ | Rate limiting, encrypted configs |
| A02 Cryptographic Failures | ✅ | AES-256-GCM, proper key handling |
| A03 Injection | ✅ | HTML escaping, Zod validation |
| A04 Insecure Design | ✅ | Privacy-focused, no user data storage |
| A05 Security Misconfiguration | ⚠️ | Dev keys in HTML, missing global CSP |
| A06 Vulnerable Components | ⚠️ | SDK dependencies (accepted) |
| A07 Auth Failures | ✅ | API keys encrypted, validated |
| A08 Data Integrity Failures | ✅ | GCM provides integrity |
| A09 Logging Failures | ✅ | Sensitive data redacted |
| A10 SSRF | ✅ | External calls only to known APIs |

---

*Report generated 2026-01-17. Review recommended before production deployment.*
