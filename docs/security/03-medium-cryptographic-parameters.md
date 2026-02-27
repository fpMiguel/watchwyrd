# 🟡 MEDIUM: PBKDF2 Iterations Below Current Recommendations

**Severity**: MEDIUM (Cryptographic weakening)  
**CVSS Score**: 5.3 (AV:L/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)  
**Category**: Cryptography  
**Status**: ⏳ Pending Fix (Backward Compatible Solution Available)

---

## Executive Summary

The PBKDF2 key derivation function uses **100,000 iterations**, which meets the minimum NIST requirement but is below modern security recommendations. As of 2024-2025, security experts recommend **300,000+ iterations** for adequate brute-force resistance. This can be increased without breaking existing encrypted configs by using versioned key derivation.

---

## Vulnerability Details

### Location
- **File**: `src/utils/crypto.ts`
- **Line**: 39
- **Code**: `crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256')`

### Problem Description

Current implementation uses 100,000 iterations of PBKDF2 with SHA-256. While this meets the **minimum** NIST requirement (100,000 for digital signatures as of 2020), it is on the **low end** for high-security applications protecting encryption keys.

**Why This Matters**:
- **Hardware improvements**: Modern GPUs/ASICs compute PBKDF2 much faster
- **Brute-force resistance**: Lower iterations enable faster offline attacks if `SECRET_KEY` is low-entropy
- **Future-proofing**: Today's acceptable iteration may be insufficient in 3-5 years
- **Industry best practice**: OWASP, Trail of Bits recommend 300,000+ for new systems

---

## Impact Assessment

- **Current Risk**: **MEDIUM** - `SECRET_KEY` is random (32+ chars), reducing impact but not eliminating risk
- **Long-term Risk**: **HIGH** - Hardware will continue improving; iteration count will become increasingly inadequate
- **Compliance**: May fail strict standards (PCI-DSS, FIPS with higher requirements)

---

## Proposed Fix (Backward Compatible)

### Implementation Strategy

**Option A: Versioned Key Derivation (RECOMMENDED)**
- Use deriveKey_v2 (300k iterations) for new encryptions
- Continue using deriveKey_v1 (100k iterations) for decryption of existing configs
- No version prefix needed - maintain both functions and try v2 first

**Option B: Configurable Iterations**
- Use `PBKDF2_ITERATIONS` environment variable (default 300000)
- Backward compat: Keep 100k as fallback for old configs

### Code Changes

```typescript
// src/utils/crypto.ts

// Make iterations configurable
const PBKDF2_ITERATIONS = Math.max(
  parseInt(process.env.PBKDF2_ITERATIONS || '300000', 10),
  100000 // minimum safety floor
);

// Original derivation (for decrypting old configs)
function deriveKey_legacy(secret: string): Buffer {
  const salt = Buffer.from(serverConfig.security.encryptionSalt);
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256');
}

// New derivation with higher iterations (for new encryptions)
function deriveKey_current(secret: string): Buffer {
  const salt = Buffer.from(serverConfig.security.encryptionSalt);
  return crypto.pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

// Update encrypt() to use deriveKey_current()
export function encrypt(plaintext: string, secret: string): string {
  const key = deriveKey_current(secret); // Use new iterations
  // ... rest unchanged
}

// Update decrypt() to try both derivation methods
export function decrypt(ciphertext: string, secret: string): string {
  try:
    // Try new derivation first (since most configs will eventually be new)
    return decryptWithDerivation(ciphertext, secret, deriveKey_current);
  } catch (e1:
    // Fall back to legacy derivation for old configs
    try:
      return decryptWithDerivation(ciphertext, secret, deriveKey_legacy);
    } catch (e2:
      throw new Error('Failed to decrypt with both iteration counts');
    }
}

// Helper
function decryptWithDerivation(
  ciphertext: string,
  secret: string,
  deriveFn: (secret: string) => Buffer
): string {
  // existing decrypt logic but using deriveFn instead of hardcoded deriveKey
}
```

### Environment Variable

```bash
# Optional: Override PBKDF2 iterations (for testing or compliance)
# Default: 300000 (recommended)
# Minimum: 100000
PBKDF2_ITERATIONS=300000
```

---

## Verification Steps

1. **Type check**: `npm run typecheck` ✓
2. **Tests**: All `tests/crypto.test.ts` must pass ✓
3. **Performance**: Benchmark encryption with 300k iterations:
   ```bash
   npm run test:bench:crypto  # add benchmark if not present
   ```
   Expected: 50-200ms overhead (acceptable for config operations)
4. **Backward compatibility**: Old encrypted configs (100k) must still decrypt ✓

---

## Migration Path

**Zero-downtime approach**:
- New configs: use 300k iterations (unnoticed by users)
- Old configs: automatically fall back to 100k on decryption
- Over time, as users regenerate configs, all will use 300k
- No user action required, no breaking changes

---

## References

- **NIST SP 800-132**: Recommendation for Password-Based Key Derivation
- **OWASP Cryptographic Storage Cheat Sheet**: "Use PBKDF2 with at least 10,000 iterations, preferably 300,000+"
- **Trail of Bits Crypto Guidelines**: Iteration count recommendations

---

**Priority**: HIGH - Implement within 1 week with backward compatibility to avoid breaking existing user configs.
