# Manifest Reference

Stremio addon manifest configuration based on the [official SDK docs](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md).

## Current Configuration

| Property | Value | Status |
|----------|-------|--------|
| `id` | `community.watchwyrd` | ✅ |
| `version` | Synced with package.json | ✅ |
| `resources` | `["catalog"]` | ✅ |
| `types` | `["movie", "series"]` | ✅ |
| `idPrefixes` | `["tt"]` | ✅ |
| `behaviorHints.configurable` | `false` | ✅ |

## Optional Improvements

### Contact Email

Add `contactEmail` to enable Stremio's "Report" button:

```typescript
contactEmail: process.env.CONTACT_EMAIL || undefined,
```

### Explicit Behavior Hints

```typescript
behaviorHints: {
  configurable: false,
  configurationRequired: !hasConfig,
  adult: false,  // Family-safe content
  p2p: false,    // No P2P/torrents
},
```

## References

- [Stremio Addon SDK - Manifest](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md)
- [Implementation](../../src/addon/manifest.ts)
