# Manifest Improvements

**Based on:** [Stremio Addon SDK Manifest Documentation](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md)  
**Created:** 2026-01-17

This document outlines potential improvements to the Watchwyrd addon manifest based on the official Stremio SDK specification.

---

## Current Status ✅

The following manifest properties are already correctly implemented:

| Property | Value | Status |
|----------|-------|--------|
| `id` | `community.watchwyrd` | ✅ Correct format |
| `name` | `Watchwyrd` | ✅ |
| `description` | Human readable | ✅ |
| `version` | `0.0.38` | ✅ Semver |
| `resources` | `["catalog"]` | ✅ |
| `types` | `["movie", "series"]` | ✅ |
| `idPrefixes` | `["tt"]` | ✅ IMDb IDs |
| `catalogs` | With `extra` for genre/search | ✅ |
| `logo` | 256x256 PNG | ✅ |
| `background` | 1024x786+ | ✅ |
| `behaviorHints.configurable` | `false` (custom page) | ✅ |
| `behaviorHints.configurationRequired` | Dynamic | ✅ |

---

## Recommended Improvements

### 1. Add Contact Email 📧

**Priority:** Medium  
**Effort:** Low (5 minutes)

**Current:** Missing  
**Recommended:** Add `contactEmail` to manifest

```typescript
contactEmail: 'your-email@example.com',
```

**Benefits:**
- Enables Stremio's "Report" button for users to report issues
- Stremio team can contact you about addon-related matters
- Professional appearance in addon catalog

**Implementation:**
```typescript
// src/addon/manifest.ts - in generateManifest()
return {
  // ... existing fields
  contactEmail: serverConfig.contactEmail || undefined,
  // ...
};

// src/config/server.ts - add config
contactEmail: process.env.CONTACT_EMAIL,
```

---

### 2. Add Adult Content Flag 🔞

**Priority:** Low  
**Effort:** Low (5 minutes)

**Current:** Missing (defaults to `false`)  
**Recommended:** Explicitly set `behaviorHints.adult`

```typescript
behaviorHints: {
  configurable: false,
  configurationRequired: !hasConfig,
  adult: false, // Explicit declaration
},
```

**Benefits:**
- Clear declaration that addon is family-safe
- May affect addon visibility in family-mode Stremio installations
- Shows intentional consideration of content rating

---

### 3. Add P2P Content Flag 🌐

**Priority:** Low  
**Effort:** Low (5 minutes)

**Current:** Missing (defaults to `false`)  
**Recommended:** Explicitly set `behaviorHints.p2p`

```typescript
behaviorHints: {
  configurable: false,
  configurationRequired: !hasConfig,
  adult: false,
  p2p: false, // We don't provide streams, only metadata
},
```

**Benefits:**
- Clear declaration that no P2P/BitTorrent is involved
- Reassures privacy-conscious users
- May affect addon warnings in Stremio

---

### 4. Consider `optionsLimit` for Genre Filter 🎭

**Priority:** Low  
**Effort:** Medium (30 minutes)

**Current:** Default `optionsLimit: 1` (only one genre at a time)  
**Potential:** Allow multi-genre selection

```typescript
extra: [{ 
  name: 'genre', 
  options: [...SUPPORTED_GENRES], 
  isRequired: false,
  optionsLimit: 3  // Allow up to 3 genres
}],
```

**Considerations:**
- Would require prompt changes to handle multiple genres
- May increase complexity of AI prompts
- Current single-genre approach is simpler and works well
- **Recommendation:** Keep current behavior unless users request multi-genre

---

### 5. Advanced Resource Definition 🔧

**Priority:** Low  
**Effort:** Medium (20 minutes)

**Current:** Simple resource array `["catalog"]`  
**Potential:** Use advanced notation for clarity

```typescript
resources: [
  {
    name: 'catalog',
    types: ['movie', 'series'],
    // idPrefixes not needed for catalog
  }
],
```

**Benefits:**
- More explicit about what types each resource supports
- Future-proof if adding more resources (meta, stream)
- Self-documenting code

**Note:** Current simple notation works identically; this is purely for clarity.

---

### 6. Future: Meta Resource 📋

**Priority:** Future  
**Effort:** High (several hours)

If Watchwyrd ever provides its own meta information (beyond Cinemeta lookup):

```typescript
resources: [
  'catalog',
  {
    name: 'meta',
    types: ['movie', 'series'],
    idPrefixes: ['tt']
  }
],
```

**Use cases:**
- Enhanced AI-generated descriptions
- "Why recommended" explanations visible in Stremio UI
- Custom poster overlays

**Note:** Currently not needed since we use Cinemeta for metadata.

---

## Implementation Priority

| Improvement | Priority | Effort | Recommended |
|-------------|----------|--------|-------------|
| Contact Email | Medium | Low | ✅ Yes |
| Adult Flag | Low | Low | ✅ Yes |
| P2P Flag | Low | Low | ✅ Yes |
| Options Limit | Low | Medium | ❌ Not now |
| Advanced Resources | Low | Medium | ❌ Not now |
| Meta Resource | Future | High | ❌ Future |

---

## Quick Implementation

To implement the recommended changes (items 1-3):

```typescript
// src/addon/manifest.ts

export function generateManifest(config?: Partial<UserConfig>): StremioManifest {
  const hasConfig = config && (config.geminiApiKey || config.perplexityApiKey);

  return {
    id: ADDON_ID,
    version: ADDON_VERSION,
    name: 'Watchwyrd',
    description: 'Your viewing fate, revealed — AI-powered personalized movie and series recommendations',
    logo: `${serverConfig.baseUrl}/static/logo.png`,
    background: `${serverConfig.baseUrl}/static/background.jpg`,
    contactEmail: serverConfig.contactEmail || undefined, // NEW
    resources: ['catalog'],
    types: ['movie', 'series'],
    idPrefixes: ['tt'],
    catalogs: generateCatalogs(config),
    behaviorHints: {
      configurable: false,
      configurationRequired: !hasConfig,
      adult: false,  // NEW - explicit
      p2p: false,    // NEW - explicit
    },
  };
}
```

---

## References

- [Stremio Addon SDK - Manifest](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md)
- [Stremio Addon SDK - Content Types](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/content.types.md)
- [Stremio Addon SDK - Catalog Handler](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineCatalogHandler.md)
