# 🟡 MEDIUM: Input Validation Gaps

**Severity**: MEDIUM  
**CVSS Score**: 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L)  
**Category**: Input Validation  
**Audit Sub-area**: API Key Handling & Authentication  

---

## Executive Summary

While the codebase has strong input validation using Zod schemas, two gaps were identified: a limited genre whitelist and missing request size limits. These are not immediately exploitable but could lead to denial of service or unexpected behavior under malicious input.

---

## Vulnerability Details

### 1. Insufficient Genre Whitelist

#### Location
- **File**: `src/config/schema.ts`
- **Lines**: Genre validation schema

#### Problem Description

The genre filtering system uses a **hardcoded whitelist** of allowed genres. If a user requests a genre not in the whitelist, the system fails to generate recommendations, potentially causing confusion.

The whitelist appears limited and may not cover all valid movie/TV genres users might want. While this prevents unexpected values from causing errors, it's restrictive and may not be future-proof as genre taxonomies evolve.

**Example**: User searches for "cyberpunk" genre → not in whitelist → silently ignored or error.

#### Impact
- **User Experience**: MEDIUM - Users cannot discover by certain genres
- **Availability**: LOW - Requests may fail for unsupported genres
- **Maintenance**: HIGH - Whitelist must be manually updated

---

### 2. Missing Request Size Limits

#### Location
- **Files**: `src/index.ts` (Express app), `src/handlers/configure/index.ts`
- **Scope**: All HTTP endpoints, especially `/configure` POST

#### Problem Description

The Express application does **not enforce request body size limits**. While the configure endpoint only sends small JSON configs, an attacker could send extremely large payloads to exhaust server memory or disk space.

**Why This Matters**:
- **Memory exhaustion**: Large JSON bodies get parsed into memory by `express.json()`
- **DoS potential**: Multiple large requests can crash the server
- **Default Express limit**: 100kb for JSON bodies - should be explicitly set lower if needed

Current code likely uses default Express behavior without `express.json({ limit: '10kb' })` or similar.

#### Impact
- **Availability**: HIGH - Easy DoS via memory exhaustion
- **Resource Consumption**: Unlimited request size could crash server
- **Cost**: If running on metered infrastructure, large requests incur costs

---

## Recommendations

### For Genre Whitelist

**Immediate (1 hour):**
1. Document the current whitelist in `src/config/schema.ts` comments
2. Add validation error message: `"Genre '${genre}' not supported. Supported: ${list}"` or "Genre filter ignored" (non-breaking)

**Short-term (1 day):**
1. **Expand the whitelist** - Add common genres from IMDb, TMDB, TMDb genre lists
2. **Make it extensible** - Store whitelist in config file, not hardcoded
3. **Fallback behavior**: If genre not in whitelist, either:
   - Silently ignore and log warning (current behavior likely)
   - Return 400 with clear error (more explicit)

**Long-term (1 week):**
- Implement dynamic genre mapping from external metadata service
- Allow users to request new genres via feature request
- Regular sync with official genre taxonomies

---

### For Request Size Limits

**Immediate (30 minutes):**

Add explicit body size limits to Express middleware in `src/index.ts`:

```typescript
import express from 'express';

const app = express();

// Add BEFORE your routes
app.use(express.json({ limit: '10kb' })); // Config payloads are small
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// For file uploads (if any in future):
// app.use(express.multipart({ limit: '1mb' }));
```

**Recommended limits**:
- `/configure` endpoint: `10kb` (configs are tiny, 1-2kb typical)
- All other JSON endpoints: `50kb` max
- Adjust based on actual measurements

**Testing**:
```bash
# Test with oversized payload
echo '{"data": "'"$(head -c 20000 /dev/zero | base64)"'"}' | \
  curl -X POST -d @- http://localhost:7000/configure -H "Content-Type: application/json"
# Should return 413 Payload Too Large
```

---

## Verification Steps

### Genre Validation
1. Attempt to filter by an unsupported genre (e.g., "experimental")
2. Observe behavior: does it fail silently or with clear error?
3. Verify supported genres list is documented
4. Test edge: genre name with special characters, mixed case

### Request Size Limits
1. Send normal config payload (~1kb) - should succeed
2. Send 15kb payload - should get 413 response
3. Send 50kb payload - should get 413 response
4. Verify memory usage does not spike with rejected large payloads
5. Check logs for 413 events (optional: rate-limit them)

---

## Related Issues

- **Linked**: Input validation is generally good - these are gaps, not systemic failures
- **Prerequisite**: None - these are independent fixes
- **Compounding**: Large requests could exacerbate other DoS vectors if not limited

---

## References

- **OWASP**: [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- **OWASP**: [Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html#prevent-dos-attacks)
- **Express.js**: [Built-in middleware docs](https://expressjs.com/en/4x/api.html#express.json) - `limit` option

---

**Priority**: Medium - Implement within 1-2 weeks, prioritize request size limits first (higher impact).
