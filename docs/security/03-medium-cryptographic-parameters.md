# 🟡 MEDIUM: Insecure Cryptographic Parameters

**Severity**: MEDIUM  
**CVSS Score**: 5.3 (AV:L/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)  
**Category**: Cryptography  
**Audit Sub-area**: API Key Handling & Authentication  

---

## Executive Summary

The cryptographic implementation is generally strong (AES-256-GCM), but two parameters could be improved for future-proofing: PBKDF2 iteration count and key rotation mechanism. These are not urgent vulnerabilities but should be addressed to maintain cryptographic hygiene.

---

## Vulnerability Details

### 1. PBKDF2 Iteration Count May Be Insufficient

#### Location
- **File**: `src/utils/crypto.ts`
- **Lines**: Key derivation section (around PBKDF2 configuration)

#### Problem Description

The current implementation uses **100,000 iterations** of PBKDF2 for key derivation:

```typescript
const derivedKey = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
  key,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt', 'decrypt']
);
```

While 100,000 iterations meets NIST's 2020 minimum recommendations (100,000 for protecting digital signatures), it is on the lower end for high-security applications. Modern hardware can compute PBKDF2 much faster, and as of 2024, NIST SP 800-63B suggests considering higher iteration counts for sensitive data like encryption keys.

#### Why This Matters

- **Brute force resistance**: Higher iterations slow down password guessing attacks if the encryption key is derived from a passphrase
- **Future-proofing**: Moore's Law - today's acceptable iteration count may be insufficient in 5 years
- **Industry best practice**: Many security experts recommend 200,000-600,000 iterations for new systems

#### Impact
- **Current Risk**: LOW - The watchwyrd server uses random encryption keys, not user passwords
- **Long-term Risk**: MEDIUM - May need upgrading as hardware improves
- **Compliance**: May not meet strict standards (FIPS 140-2 Level 3 requires 10,000+ but doesn't specify upper bound)

---

### 2. No Key Rotation Mechanism

#### Location
- **Files**: `src/utils/crypto.ts`, entire application
- **Scope**: All encrypted configuration data

#### Problem Description

The encryption system has **no mechanism to rotate** the `SECRET_KEY`. Once set, the same key is used indefinitely to encrypt/decrypt all user configuration URLs.

Key rotation is a security best practice because:
- Limits exposure if key is compromised
- Allows periodic refresh to stronger algorithms
- Meets compliance requirements (some standards mandate key rotation annually or biennially)

#### Why This Matters

- **Compromise impact**: If `SECRET_KEY` leaks, ALL encrypted configs are compromised permanently
- **Algorithm agility**: Cannot upgrade to post-quantum algorithms without rotation mechanism
- **Compliance gaps**: PCI-DSS, HIPAA, and others expect key rotation capabilities
- **Operational risk**: Staff turnover - key should be rotated if admin leaves

#### Impact
- **Confidentiality**: MEDIUM - Single point of failure
- **Long-term security**: Reduced - Cannot adapt to new threats
- **Compliance**: May fail audits requiring key rotation

---

## Recommendations

### For PBKDF2 Iterations

**Option A: Immediate Increase (Recommended)**
```typescript
iterations: 300000 // Safe for today, moderate performance impact
```

**Option B: Adaptive Iterations**
```typescript
// Use environment variable to adjust based on performance
const ITERATIONS = parseInt(process.env.PBKDF2_ITERATIONS || '300000');
```

**Performance Impact Estimate**:
- 100k → 300k iterations = ~3x slower key derivation
- Expected increase: 50-100ms on first encryption/decryption
- Acceptable for configuration operations (not per-request)

**Testing**: Benchmark with realistic hardware before deploying to production.

---

### For Key Rotation

**Phase 1: Design (1-2 days)**

Design a rotation strategy:
- Maintain a keychain with `currentKey` and `previousKeys` (for decrypting old configs)
- Encrypt configs with key ID prefix: `v2:encryptedData`
- Decrypt based on key ID, using `previousKeys` for old configs

**Phase 2: Implementation (2-3 days)**

Implement in `src/utils/crypto.ts`:
```typescript
interface Keychain {
  keys: Array<{ id: string; key: string; createdAt: Date }>;
  currentKeyId: string;
}

export async function rotateKey(newKey: string): Promise<void> {
  // 1. Add new key as current
  // 2. Retain old keys for decryption (mark as deprecated)
  // 3. Re-encrypt on next access (lazy migration) OR batch re-encrypt
}
```

**Phase 3: Migration Strategy (1-2 days)**

Choose a migration approach:
- **Lazy migration**: Decrypt with old key, re-encrypt with new key on next access
- **Batch migration**: Iterate all stored configs during rotation window
- **Hybrid**: Lazy migration + background batch for active users

**Phase 4: Operational Procedure (1 day)**

Document and automate:
- Rotation schedule (quarterly? annually?)
- Key generation process (cryptographically random, 64+ chars)
- Backup and recovery procedures (encrypted key backups)
- Emergency rollback if rotation fails

---

## Verification Steps

### For PBKDF2
1. Confirm iteration count in `src/utils/crypto.ts`
2. Benchmark encryption/decryption with current vs. proposed iterations
3. Verify no performance regressions in test suite (>5% slowdown unacceptable)
4. Update documentation to specify recommended iteration count

### For Key Rotation
1. Review design document before implementation
2. Test rotation with both lazy and batch migration strategies
3. Verify old configs decrypt correctly after rotation
4. Confirm new configs use new key
5. Document rollback procedure and test it

---

## Related Issues

- **Linked**: Salt storage could be improved (store salts separately from encrypted data)
- **Prerequisite**: Ensure proper key management practices before increasing iterations
- **Dependency**: Key rotation design must coordinate with config schema and caching layer

---

## References

- **NIST SP 800-132**: Recommendation for Password-Based Key Derivation
- **NIST SP 800-57**: Recommendation for Key Management
- **PCI-DSS 3.2**: Requirement 3.5 - Key management processes
- **OWASP**: [Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

---

**Priority**: Medium - Implement within 1 month, schedule key rotation for next quarterly update.
