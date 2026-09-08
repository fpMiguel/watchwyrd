# Development

Technical documentation for contributors.

## Quick Start

```bash
npm install        # Install dependencies
npm run dev        # Dev server with hot reload
npm test           # Run tests
npm run check      # Typecheck + lint + format + test
npm run check:ci   # Full CI gate (check + audit)
npm run scan:trivy # Trivy scan (needs Docker)
```

## Documentation

- [Testing Guide](./TESTING.md) - Test structure and coverage
- [Manifest Reference](./MANIFEST.md) - Stremio manifest options
- [Technical Showcase](../SHOWCASE.md) - Quality bar and observability

## Project Structure

| Directory         | Purpose                                 |
| ----------------- | --------------------------------------- |
| `src/addon/`      | Stremio manifest                        |
| `src/cache/`      | LRU cache with in-flight deduplication  |
| `src/catalog/`    | Catalog generation                      |
| `src/config/`     | Zod schemas and environment validation  |
| `src/handlers/`   | HTTP route handlers                     |
| `src/middleware/` | Express middleware (rate limits, etc.)  |
| `src/prompts/`    | AI prompt builders                      |
| `src/providers/`  | AI provider implementations             |
| `src/schemas/`    | AI response Zod schemas                 |
| `src/services/`   | External service clients                |
| `src/signals/`    | Request context (AbortSignal)           |
| `src/types/`      | TypeScript types                        |
| `src/utils/`      | Shared utilities                        |
| `src/web/`        | Static assets (configure wizard CSS/JS) |

## See Also

- [Contributing Guide](../../CONTRIBUTING.md)
- [Architecture Decisions](../adr/)
