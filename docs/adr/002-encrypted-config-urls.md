# ADR-002: Encrypted Configuration URLs

## Status

Accepted

## Date

2026-01-15

## Context

Stremio addons receive user configuration through the manifest URL path. For Watchwyrd, this includes:

- AI provider API keys (sensitive)
- User preferences (genres, location)
- Feature toggles

Passing API keys in plain text URLs creates security risks:
- Keys visible in browser history
- Keys logged by proxies/CDNs
- Keys exposed in error reports
- Keys shared accidentally when sharing addon URL

## Decision

Encrypt the entire configuration object using **AES-256-GCM** before encoding it in the URL:

```
/enc.{encrypted_base64_config}/manifest.json
```

Implementation:
- Use PBKDF2 to derive encryption key from `SECRET_KEY` environment variable
- Encrypt with AES-256-GCM (authenticated encryption)
- Base64url encode for URL safety
- Decrypt on each request server-side

```typescript
// Encryption flow
config → JSON → AES-256-GCM encrypt → Base64url → URL path
```

## Consequences

### Positive

- **Security**: API keys never visible in plain text URLs
- **Privacy**: User preferences are also protected
- **Tamper-proof**: GCM authentication detects modification attempts
- **Shareable**: Users can share addon URLs without exposing keys

### Negative

- **Server dependency**: Decryption requires server with SECRET_KEY
- **No client-side decoding**: Cannot inspect config without server
- **Key rotation complexity**: Changing SECRET_KEY invalidates all existing URLs

### Neutral

- Slight CPU overhead for encryption/decryption (negligible)
- Longer URLs due to encryption overhead

## Alternatives Considered

### Alternative 1: Plain Text Configuration

Simple but exposes sensitive API keys. Rejected for security reasons.

### Alternative 2: JWT Tokens

Would work but:
- Adds JWT dependency
- Payload still readable (only signed, not encrypted)
- API keys would be visible in base64 payload

### Alternative 3: Server-Side Session Storage

Store config on server, use session ID in URL:
- Requires persistent storage (database)
- Session management complexity
- Doesn't work for stateless deployments

## References

- [Crypto Implementation](../../src/utils/crypto.ts)
- [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
