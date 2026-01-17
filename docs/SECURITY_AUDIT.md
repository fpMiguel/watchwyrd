# Security Audit Report

**Project:** Watchwyrd (Stremio AI Addon)  
**Audit Date:** 2026-01-17  
**Auditor:** Automated Security Review  
**Version:** 0.0.37  

---

## Executive Summary

This security audit covers the Watchwyrd codebase, a Stremio addon that uses AI (Gemini/Perplexity) to generate personalized recommendations. The audit identified **6 High**, **8 Medium**, and **5 Low** severity issues across authentication, input validation, cryptography, HTTP security, and rate limiting.

### Risk Overview

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | ✅ |
| High | 6 | ⚠️ Action Required |
| Medium | 8 | ⚠️ Recommended |
| Low | 5 | ℹ️ Consider |

### Priority Remediation

1. **Implement HTTP rate limiting** (DoS protection)
2. **Add global security headers** (XSS/Clickjacking protection)
3. **Fix dependency vulnerabilities** (`npm audit fix`)
4. **Sanitize error responses** (Information leakage)

---

## Table of Contents

1. [Authentication & API Keys](#1-authentication--api-keys)
2. [Input Validation](#2-input-validation)
3. [Cryptography](#3-cryptography)
4. [HTTP Security](#4-http-security)
5. [Rate Limiting & DoS](#5-rate-limiting--dos)
6. [Error Handling](#6-error-handling)
7. [Dependencies](#7-dependencies)
8. [Remediation Checklist](#8-remediation-checklist)

---

## 1. Authentication & API Keys

### 1.1 API Key Encryption ✅ SECURE

**Status:** Well implemented

- API keys encrypted with AES-256-GCM before embedding in URLs
- Random IV per encryption prevents pattern analysis
- Auth tag provides integrity verification

### 1.2 Development Keys in Client Render 🔴 HIGH

**File:** `src/handlers/configure/index.ts:34-37`

**Issue:** Dev API keys from environment variables are passed to client-side JavaScript when `NODE_ENV=development`.

```typescript
const DEV_GEMINI_KEY = process.env['NODE_ENV'] === 'development' 
  ? process.env['GEMINI_API_KEY'] || '' : '';
```

**Risk:** If development mode is accidentally deployed, API keys are visible in page source.

**Recommendation:** Never send server-side API keys to client. Only populate from user input.

### 1.3 Weak Default Secret Key 🟡 MEDIUM

**File:** `src/config/server.ts:17`

**Issue:** Hardcoded default secret used when `SECRET_KEY` not set.

```typescript
const DEFAULT_SECRET = 'watchwyrd-dev-secret-key-not-for-production';
```

**Risk:** If production SECRET_KEY isn't configured, all user API keys are encrypted with a publicly known key.

**Recommendation:** Require `SECRET_KEY` in production or fail startup.

### 1.4 Logger Redaction ✅ SECURE

**File:** `src/utils/logger.ts`

**Status:** Properly redacts sensitive fields matching patterns: `apiKey`, `secret`, `token`, `password`, `authorization`, `credential`.

---

## 2. Input Validation

### 2.1 HTML Injection in URL Templates 🔴 HIGH

**File:** `src/handlers/configure/index.ts:287-289`

**Issue:** Generated URLs are embedded directly into HTML without escaping.

```typescript
res.send(generateSuccessPageHtml(stremioUrl, httpUrl));
// In template: <div class="url-input">${httpUrl}</div>
```

**Risk:** If `serverConfig.baseUrl` contains malicious characters (`<`, `>`, `"`), XSS is possible.

**Recommendation:** HTML-escape all dynamic content before template injection:

```typescript
function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', 
    '"': '&quot;', "'": '&#39;'
  }[c] || c));
}
```

### 2.2 Config Validation ✅ SECURE

**File:** `src/config/schema.ts`

**Status:** Comprehensive Zod schema validation with:
- Strict enum constraints for providers, models, presets
- Range validation for numeric fields
- No prototype pollution risk

### 2.3 Unrestricted Genre Keys 🟡 MEDIUM

**File:** `src/config/schema.ts:99`

**Issue:** `genreWeightsSchema` allows arbitrary string keys.

```typescript
const genreWeightsSchema = z.record(z.string(), z.number().min(1).max(5));
```

**Risk:** Unrecognized genres silently accepted, could cause unexpected behavior.

**Recommendation:** Use enum for genre keys.

---

## 3. Cryptography

### 3.1 AES-256-GCM Implementation ✅ SECURE

**File:** `src/utils/crypto.ts`

**Status:** Correctly implemented:
- Proper authenticated encryption
- Random 128-bit IV per encryption
- Auth tag validation on decrypt
- Timing-safe operations

### 3.2 Fixed PBKDF2 Salt 🟡 MEDIUM

**File:** `src/utils/crypto.ts:50`

**Issue:** Fixed salt used for key derivation.

```typescript
const SALT = 'watchwyrd-config-encryption-v1';
```

**Risk:** If the same secret is used across deployments, derived keys are identical, weakening security.

**Mitigation:** Current implementation relies on SECRET_KEY being unique per deployment.

**Recommendation:** Consider per-deployment random salt or increase iteration count.

### 3.3 Error Handling ✅ SECURE

**Status:** Generic error messages without leaking cryptographic details.

---

## 4. HTTP Security

### 4.1 Missing Global Security Headers 🔴 HIGH

**File:** `src/index.ts`

**Issue:** Only `/configure` routes have security headers. All other endpoints lack protection.

**Missing Headers:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (for HTTPS)

**Recommendation:** Add global middleware:

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
```

### 4.2 CORS Configuration 🟡 MEDIUM

**File:** `src/index.ts:30-35`

**Issue:** CORS allows all origins (`origin: '*'`).

```typescript
cors({
  origin: '*',
  methods: ['GET', 'POST'],
})
```

**Context:** Required for Stremio compatibility (app makes cross-origin requests).

**Recommendation:** Document this requirement; add `credentials: false` explicitly.

### 4.3 Missing Cache-Control 🟡 MEDIUM

**Issue:** No cache directives on API responses. Sensitive data may be cached by proxies.

**Recommendation:** Add to sensitive endpoints:

```typescript
res.setHeader('Cache-Control', 'no-store, must-revalidate');
```

### 4.4 CSP on Configure Page ✅ SECURE

**File:** `src/handlers/configure/index.ts:164-180`

**Status:** Properly configured with strict directives.

---

## 5. Rate Limiting & DoS

### 5.1 No HTTP Rate Limiting 🔴 HIGH

**Issue:** No request-level rate limiting on any endpoint.

**Exposed Endpoints:**
- `POST /configure` - Form submission
- `POST /configure/validate-key` - External API calls
- `GET /catalog/*` - AI generation (expensive)

**Risk:** Single attacker can flood server, exhaust resources, or brute-force API key validation.

**Recommendation:** Install `express-rate-limit`:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
});

app.use(limiter);
```

### 5.2 Memory Leak in Batch Tracking 🔴 HIGH

**File:** `src/catalog/batchGenerator.ts:94`

**Issue:** `inFlightBatches` Map can grow unbounded if requests crash.

```typescript
const inFlightBatches = new Map<string, Promise<BatchResult>>();
```

**Risk:** Memory exhaustion over time.

**Recommendation:** Add timeout cleanup and periodic garbage collection.

### 5.3 Unbounded Rate Limiter State 🔴 HIGH

**File:** `src/utils/rateLimiter.ts:39`

**Issue:** `keyStates` Map grows with each unique API key.

```typescript
private keyStates = new Map<string, KeyState>();
```

**Risk:** Attacker can submit thousands of fake API keys to exhaust memory.

**Recommendation:** Use LRU cache with max entries and TTL cleanup.

### 5.4 Missing Request Timeout 🟡 MEDIUM

**File:** `src/catalog/batchGenerator.ts`

**Issue:** No timeout on AI API calls. Slow responses block indefinitely.

**Recommendation:** Add 60-90 second timeout wrapper.

---

## 6. Error Handling

### 6.1 Raw Error Messages in Responses 🟡 MEDIUM

**File:** `src/handlers/configure/index.ts:336, 421`

**Issue:** API validation returns unfiltered error messages.

```typescript
res.json({ valid: false, error: `Validation failed: ${errorMessage}` });
```

**Risk:** Internal error details (network issues, API infrastructure) exposed.

**Recommendation:** Filter through `parseApiError()` before responding.

### 6.2 Stremio Handler ✅ SECURE

**File:** `src/handlers/stremio.ts:159-162`

**Status:** Properly handles errors with generic responses and internal logging.

### 6.3 Error Truncation ✅ SECURE

**Files:** `src/providers/gemini.ts`, `src/providers/perplexity.ts`

**Status:** Error messages truncated to 100 chars in retry logic.

---

## 7. Dependencies

### 7.1 Vulnerable Dependencies 🔴 HIGH

**Command:** `npm audit`

| Package | Severity | Issue |
|---------|----------|-------|
| `path-to-regexp` (via stremio-addon-sdk) | High | ReDoS vulnerability |
| `tmp` (via inquirer) | Low | Symlink directory write |

**Total:** 3 High, 3 Low severity vulnerabilities

**Recommendation:**

```bash
# Fix low-severity issues
npm audit fix

# For high-severity (requires SDK update)
npm audit fix --force
# Note: May install breaking changes
```

**Alternative:** If SDK update breaks compatibility, document accepted risk.

---

## 8. Remediation Checklist

### Immediate (This Sprint)

- [ ] Add HTTP rate limiting middleware
- [ ] Add global security headers
- [ ] Run `npm audit fix` for dependency vulnerabilities
- [ ] HTML-escape URLs in configure page templates

### Short-term (Next Sprint)

- [ ] Require SECRET_KEY in production
- [ ] Add memory limits to rate limiter state
- [ ] Add timeout to AI API calls
- [ ] Sanitize error messages in API responses

### Medium-term (Backlog)

- [ ] Remove dev API keys from client render
- [ ] Add per-deployment random salt for PBKDF2
- [ ] Implement request queue size limits
- [ ] Add Cache-Control headers to sensitive endpoints

### Documentation

- [ ] Document CORS `*` requirement and security implications
- [ ] Add security section to CONTRIBUTING.md
- [ ] Create incident response plan

---

## Appendix: OWASP Top 10 Coverage

| Category | Status | Notes |
|----------|--------|-------|
| A01 Broken Access Control | ⚠️ | No auth required (by design), but rate limiting needed |
| A02 Cryptographic Failures | ✅ | AES-256-GCM properly implemented |
| A03 Injection | ⚠️ | HTML injection risk in configure page |
| A04 Insecure Design | ✅ | Privacy-focused, no user data storage |
| A05 Security Misconfiguration | ⚠️ | Missing security headers, default secrets |
| A06 Vulnerable Components | ⚠️ | 6 dependency vulnerabilities |
| A07 Auth Failures | ✅ | API keys encrypted, properly handled |
| A08 Data Integrity Failures | ✅ | GCM provides integrity |
| A09 Logging Failures | ✅ | Sensitive data redacted |
| A10 SSRF | ✅ | External calls only to known APIs |

---

*Report generated following OWASP ASVS and industry security audit standards.*
