# Development Documentation

Technical documentation for Watchwyrd contributors.

## Contents

### [TESTING.md](./TESTING.md)
Test infrastructure, coverage analysis, and testing best practices:
- Test structure and organization
- Coverage goals and current status
- Mock implementations
- Test fixtures and helpers

### [MANIFEST.md](./MANIFEST.md)
Stremio addon manifest documentation:
- Current manifest properties
- Potential improvements
- Compatibility considerations

## Quick Start for Developers

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run all checks (lint, typecheck, test)
npm run check
```

## Key Files

| File | Purpose |
|------|---------|
| `src/providers/` | AI provider implementations |
| `src/catalog/` | Catalog generation logic |
| `src/handlers/` | HTTP route handlers |
| `src/prompts/` | AI prompt builders |
| `tests/` | Test files |

## See Also

- [Contributing Guide](../../CONTRIBUTING.md)
- [Architecture Decision Records](../adr/)
