# AGENTS.md

> Context file for AI coding assistants (Copilot, Codex, Claude, Cursor, etc.)

## Project Overview

**Watchwyrd** is a Stremio addon providing AI-powered movie/TV recommendations. It uses a BYOK (Bring Your Own Key) model—users provide their own AI API keys. The server is fully stateless.

**Supported AI Providers:** Google Gemini, Perplexity AI, OpenAI

## Development Environment

### Prerequisites
- Node.js 20+
- npm 9+

### Setup
```bash
git clone https://github.com/fpMiguel/watchwyrd.git
cd watchwyrd
npm install
cp .env.example .env  # Add API key for E2E tests (optional)
npm run dev           # http://localhost:7000/configure
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server with hot reload |
| `npm run check` | **Run before commits** (typecheck + lint + format + test) |
| `npm run check:all` | Full check including unused code analysis |
| `npm test` | Tests only |
| `npm run build` | Production build |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Auto-format code |
| `npm run knip` | Find unused exports/dependencies |

## Project Structure

```
src/
├── providers/     # AI provider implementations (gemini, perplexity, openai)
├── catalog/       # Catalog generation logic
├── handlers/      # HTTP route handlers
├── prompts/       # AI prompt builders
├── services/      # External services (cinemeta, weather, rpdb)
├── utils/         # Shared utilities (crypto, http, logger)
├── config/        # Configuration schemas (Zod)
└── cache/         # LRU cache implementation
```

## Code Conventions

### TypeScript
- No `any` types - use `unknown` and type guards
- Explicit return types for public functions
- Use `import type` for type-only imports
- Prefer interfaces over types for object shapes

### Naming
- Files: `kebab-case.ts`
- Functions/variables: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Error Handling
- Use typed errors where possible
- Log errors with context using the `logger` utility
- Never expose internal errors to users
- Return graceful fallbacks (e.g., error catalogs)

### Testing
- Follow Arrange-Act-Assert pattern
- Use fixtures from `tests/__fixtures__/`
- Use mocks from `tests/__mocks__/`
- Test file naming: `*.test.ts`

## Important Patterns

### Provider Abstraction
All AI providers implement `IAIProvider` interface. Use the factory:
```typescript
import { createProvider } from './providers/factory.js';
const provider = createProvider(config);
```

### Configuration Encryption
User configs are encrypted with AES-256-GCM:
```typescript
import { encryptConfig, decryptConfig } from './utils/crypto.js';
```

### Circuit Breaker
External services use circuit breakers for resilience:
```typescript
import { withCircuitBreaker } from './utils/circuitBreaker.js';
```

### Caching
Use the cache interface for all cacheable operations:
```typescript
import { cache } from './cache/index.js';
await cache.get(key);
await cache.set(key, value, ttlSeconds);
```

## Architecture Decisions

Key decisions are documented in `docs/adr/`. Most important:

- **ADR-001**: Provider abstraction layer for multiple AI providers
- **ADR-002**: Encrypted config URLs (AES-256-GCM)
- **ADR-008**: BYOK architecture (users bring their own API keys)

## Do

- Run `npm run check` before marking changes complete
- Follow existing patterns in the codebase
- Add tests for new functionality
- Use the `logger` utility for all logging
- Keep functions small and focused
- Use `import type` for type-only imports

## Don't

- Add `any` types—use `unknown` with type guards
- Log sensitive data (API keys, coordinates, search queries)
- Store user data server-side (stateless design)
- Modify `docs/security/` (private, gitignored)
- Add dependencies without justification
- Commit secrets or `.env` files

## Git Conventions

### Branch Names
```
feature/add-new-provider
fix/cache-invalidation
docs/update-readme
```

### Commit Messages
Use [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add OpenRouter provider support
fix: handle empty API response gracefully
docs: update installation instructions
test: add catalog generation edge cases
```

### Pull Requests
- Reference related issue in description
- Ensure `npm run check` passes
- Keep PRs focused on a single concern

## Common Tasks

### Adding a new AI provider
1. Create `src/providers/{name}.ts` implementing `IAIProvider`
2. Add to factory in `src/providers/factory.ts`
3. Add config schema in `src/config/schema.ts`
4. Add to configure wizard in `src/handlers/configure/`
5. Create ADR in `docs/adr/`

### Adding a new service
1. Create `src/services/{name}.ts`
2. Add circuit breaker wrapper if external
3. Add caching if appropriate
4. Add tests in `tests/`

### Modifying prompts
1. Edit files in `src/prompts/`
2. Run E2E tests with `RUN_API_TESTS=true npm test`
3. Verify AI responses are valid JSON

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Production | Encryption key (32+ chars) |
| `BASE_URL` | Production | Public URL |
| `PORT` | No | Server port (default: 7000) |
| `LOG_LEVEL` | No | debug/info/warn/error |

## Sensitive Files (gitignored)

- `.env` — Environment variables
- `docs/security/` — Security documentation

## Security Notes

- Never commit API keys or secrets
- User configs are encrypted with AES-256-GCM
- API keys only exist in encrypted addon URLs
- See ADR-008 for BYOK architecture details
