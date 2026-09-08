# Watchwyrd — AGENTS.md

> Context file for AI coding assistants (Copilot, Codex, Claude, Cursor, OpenCode, etc.)

## Project Overview

Watchwyrd is a Stremio addon providing AI-powered movie/TV recommendations. BYOK model — users provide their own AI API keys. Server is fully stateless.

- **Runtime:** Node.js 22.19+, Express, TypeScript (strict mode)
- **AI Providers:** Google Gemini, Perplexity AI, OpenAI
- **Version:** 0.4.0

---

## Commands

| Command                 | Purpose                                       |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Dev server with hot reload                    |
| `npm run build`         | Production build to `dist/`                   |
| `npm start`             | Run production server                         |
| `npm test`              | Run all tests                                 |
| `npm run test:watch`    | Run tests in watch mode                       |
| `npm run test:coverage` | Run tests with coverage                       |
| `npm run lint`          | Lint code                                     |
| `npm run lint:fix`      | Auto-fix lint issues                          |
| `npm run format`        | Format code with Prettier                     |
| `npm run typecheck`     | TypeScript type checking                      |
| `npm run check`         | Full check (typecheck + lint + format + test) |
| `npm run audit`         | Security audit (same gate CI runs)            |
| `npm run check:ci`      | Full CI gate (check + audit) — pre-push hook  |
| `npm run scan:trivy`    | Trivy image scan (same script CI runs)        |

**Running a single test:**

```bash
npm test -- tests/crypto.test.ts
```

---

## Code Style Guidelines

### TypeScript

- **No `any` types** — Use `unknown` with type guards
- **Explicit return types** for public functions
- **Use `import type`** for type-only imports
- **Strict mode enabled** — All strict TS flags on

### Formatting (Prettier)

```json
{ "semi": true, "singleQuote": true, "tabWidth": 2, "printWidth": 100 }
```

### Naming

- Files: `kebab-case.ts`
- Functions/variables: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Imports

- Use `import type { Type }` for types only
- Group: external → internal → types

### Error Handling

- Use typed errors with `logger` utility
- Never expose internal errors to users
- Return graceful fallbacks (error catalogs)
- **Never** use empty catch blocks

### Testing

- Test files: `*.test.ts` in `tests/`
- Use fixtures from `tests/__fixtures__/`
- Use mocks from `tests/__mocks__/`
- Follow Arrange-Act-Assert pattern

---

## Key Patterns

### Provider Factory

```typescript
import { createProvider } from './providers/factory.js';
const provider = createProvider(config);
```

### Encryption

```typescript
import { encryptConfig, decryptConfig } from './utils/crypto.js';
```

### Circuit Breaker

```typescript
import { withCircuitBreaker } from './utils/circuitBreaker.js';
```

### Caching

```typescript
import { cache } from './cache/index.js';
await cache.get(key);
await cache.set(key, value, ttlSeconds);
```

### Request Context

```typescript
import { createSignalContext } from './signals/context.js';
const ctx = createSignalContext(req);
```

---

## Project Structure

```
src/
├── addon/       # Stremio manifest
├── cache/       # LRU cache
├── catalog/     # Catalog generation
├── config/      # Zod schemas
├── handlers/    # HTTP route handlers
├── middleware/  # Express middleware
├── prompts/     # AI prompt builders
├── providers/   # AI providers (gemini, perplexity, openai)
├── schemas/     # AI response Zod schemas
├── services/    # External services (cinemeta, weather, rpdb)
├── signals/     # Request context (AbortSignal)
├── types/       # TypeScript types
├── utils/       # Utilities (crypto, http, logger)
└── web/         # Static assets (configure wizard CSS/JS)
```

---

## Important Files

| File                              | Purpose                 |
| --------------------------------- | ----------------------- |
| `src/index.ts`                    | Express server entry    |
| `src/providers/factory.ts`        | AI provider factory     |
| `src/catalog/catalogGenerator.ts` | Main catalog generation |
| `src/handlers/stremio.ts`         | Stremio addon endpoints |
| `src/handlers/configure/index.ts` | Configuration wizard    |
| `src/utils/crypto.ts`             | Encryption/decryption   |
| `src/config/schema.ts`            | Zod config schemas      |
| `src/web/public/wizard.css`       | Configure wizard styles |
| `src/web/public/wizard.js`        | Configure wizard logic  |

---

## Environment Variables

| Variable          | Required          | Description                |
| ----------------- | ----------------- | -------------------------- |
| `SECRET_KEY`      | Yes               | Encryption key (32+ chars) |
| `ENCRYPTION_SALT` | Yes               | Salt for key derivation    |
| `BASE_URL`        | Production        | Public URL                 |
| `PORT`            | No (default 7000) | Server port                |
| `LOG_LEVEL`       | No (info)         | debug/info/warn/error      |

---

## Critical Rules

- **Never** use `as any`, `@ts-ignore`, `@ts-expect-error`
- **Never** log sensitive data (API keys, coordinates, search queries)
- **Never** commit `.env` files or secrets
- Use circuit breakers for all external services
- Add graceful degradation for failures
- Use `logger` instead of `console.log`

---

## Code Review Checklist

- [ ] No `any` types — use `unknown` with type guards
- [ ] No sensitive data logged
- [ ] Proper error handling with fallbacks
- [ ] Input validation with Zod schemas
- [ ] Use `import type` for type-only imports
- [ ] Use `logger` instead of `console.log`
- [ ] Circuit breakers for external services

---

## Debugging Tips

| Symptom           | Likely Cause             | Check                           |
| ----------------- | ------------------------ | ------------------------------- |
| Empty catalog     | AI returned invalid JSON | Check AI response in debug logs |
| "Invalid config"  | Decryption failed        | Verify SECRET_KEY matches       |
| Rate limit errors | Missing trust proxy      | Check `app.set('trust proxy')`  |
| Timeout errors    | AI provider slow         | Check circuit breaker state     |

```bash
# Run with debug logging
LOG_LEVEL=debug npm run dev

# Run specific test
npm test -- tests/crypto.test.ts
```
