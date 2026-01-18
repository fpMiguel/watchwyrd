# Development

Technical documentation for contributors.

## Quick Start

```bash
npm install        # Install dependencies
npm run dev        # Dev server with hot reload
npm test           # Run tests
npm run check      # Lint + typecheck + test
```

## Documentation

- [Testing Guide](./TESTING.md) - Test structure and coverage
- [Manifest Reference](./MANIFEST.md) - Stremio manifest options

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `src/providers/` | AI provider implementations |
| `src/catalog/` | Catalog generation |
| `src/handlers/` | HTTP route handlers |
| `src/prompts/` | AI prompt builders |
| `src/services/` | External service clients |
| `src/utils/` | Shared utilities |

## See Also

- [Contributing Guide](../../CONTRIBUTING.md)
- [Architecture Decisions](../adr/)
