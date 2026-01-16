# ADR-008: Bring Your Own Key (BYOK) Architecture

## Status

Accepted

## Date

2026-01-15

## Context

AI API services require authentication. Options for handling API keys:

1. **Operator provides keys**: Single key for all users
2. **Users provide keys**: Each user brings their own API key (BYOK)

Considerations:
- Cost: AI API calls cost money
- Privacy: Who sees user queries?
- Scalability: Rate limits apply per key
- Trust: Users must trust operator with their keys

## Decision

Adopt **Bring Your Own Key (BYOK)** architecture:

- Users provide their own AI provider API keys
- Keys are encrypted in configuration URLs (see ADR-002)
- Server never stores keys persistently
- Each user's requests use their own API quotas

### User Flow
1. User gets API key from Gemini/Perplexity
2. User enters key in configure wizard
3. Key is encrypted into manifest URL
4. On each request, key is decrypted and used

### Key Handling
```typescript
// Keys only exist in memory during request
const config = decryptConfig(encryptedPath);
const provider = createProvider(config); // Uses config.geminiApiKey
const recommendations = await provider.generate(prompt);
// Key goes out of scope, not stored
```

## Consequences

### Positive

- **No hosting costs**: Operator pays nothing for AI usage
- **User control**: Users manage their own quotas and billing
- **Privacy**: Operator doesn't aggregate user queries
- **Scalability**: No shared rate limits
- **Sustainability**: Project can run indefinitely without revenue

### Negative

- **User friction**: Users must obtain their own API keys
- **Key security**: Users trust server with their keys
- **Support burden**: Users may have key/quota issues
- **Free tier limits**: Users may hit free tier limits

### Neutral

- Requires clear documentation on obtaining keys
- Development keys can be pre-filled for local testing

## Alternatives Considered

### Alternative 1: Operator-Provided Keys

Single API key for all users:
- Simple user experience
- Operator bears all API costs
- Unsustainable without monetization
- Privacy concerns (operator sees all queries)

### Alternative 2: Freemium Model

Free tier with operator key, premium with user keys:
- Complex implementation
- Requires payment processing
- User confusion about limits

### Alternative 3: OAuth with Providers

Users authorize app to use their AI account:
- Not supported by Gemini/Perplexity
- Complex OAuth implementation
- Still requires user accounts

## Security Measures

1. **Encryption**: Keys encrypted in URLs (AES-256-GCM)
2. **No logging**: Keys never written to logs
3. **Memory only**: Keys exist only during request processing
4. **HTTPS**: All traffic encrypted in transit
5. **Input masking**: Password fields in configure UI

## Documentation Requirements

Clear instructions for users to:
1. Create AI provider account
2. Generate API key
3. Understand free tier limits
4. Enter key in configuration wizard

## References

- [Configure Wizard](../../src/handlers/configure/)
- [Encrypted Config](./002-encrypted-config-urls.md)
