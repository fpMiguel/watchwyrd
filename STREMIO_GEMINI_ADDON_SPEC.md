# Watchwyrd — Product & Technical Specification

**Version:** 1.0.0  
**Last Updated:** January 2026  
**Status:** Implementation-Ready

---

# 1. Addon Overview

## 1.1 Name

**Watchwyrd** — *Your Viewing Fate, Revealed*

> *From Old English/Norse "wyrd" (fate, destiny) — an AI oracle that divines your perfect cinematic destiny.*

## 1.2 Short Description

A Stremio addon that leverages Google's Gemini API to deliver intelligent, context-aware movie and TV series recommendations tailored to the user's preferences, time, season, and viewing habits — all configured at install-time with the user's own API key.

## 1.3 Core Value Proposition

| Aspect | Value |
|--------|-------|
| **Personalization** | Deep customization through static preferences (genres, eras, content ratings, runtime) combined with temporal context (time of day, day of week, seasonality, holidays) |
| **Intelligence** | Gemini's reasoning capabilities synthesize multiple signals into coherent, explainable recommendations |
| **Recency** | Gemini's grounding/search tools enable discovery of newly released content beyond the model's knowledge cutoff |
| **Cost Efficiency** | Batch-level API calls, aggressive caching, and intelligent refresh strategies minimize costs |
| **Transparency** | Every recommendation includes human-readable explanations |

## 1.4 Target Users

- **Primary:** Stremio power users who want smarter discovery beyond algorithmic popularity rankings
- **Secondary:** Users overwhelmed by choice who want curated, contextual suggestions
- **Technical:** Users comfortable providing their own Gemini API key

## 1.5 Explicit Non-Goals

| Non-Goal | Rationale |
|----------|-----------|
| Real-time mood detection | Requires runtime user interaction; violates static configuration constraint |
| Watch history integration | Stremio does not expose watch history to addons |
| Social recommendations | No access to friends' viewing data |
| Interactive refinement | No runtime Q&A possible within addon architecture |
| Stream provision | This addon provides catalogs/metadata only, not streams |
| Per-item API calls | Economically and architecturally unsustainable |

---

# 2. Technical Foundations

## 2.1 How Stremio Addons Work

Stremio addons are HTTP(S) services that respond to standardized requests. The protocol is REST-like with JSON responses.

**Core Architecture:**

```
┌─────────────────┐      HTTPS/JSON       ┌─────────────────┐
│   Stremio App   │ ◄──────────────────► │   Addon Server  │
│  (Client-side)  │                       │  (Your Service) │
└─────────────────┘                       └─────────────────┘
         │                                         │
         │  manifest.json                          │
         │  /catalog/{type}/{id}                   │
         │  /meta/{type}/{id}                      │
         └─────────────────────────────────────────┘
```

**Request Flow:**
1. User installs addon via manifest URL
2. Stremio fetches `manifest.json` to understand addon capabilities
3. For catalogs: Stremio requests `/catalog/{type}/{id}.json`
4. For metadata: Stremio requests `/meta/{type}/{id}.json`
5. Addon returns JSON conforming to Stremio's schema

## 2.2 Supported Stremio Resources

| Resource | Supported | Purpose |
|----------|-----------|---------|
| `catalog` | ✅ Yes | Recommendation lists displayed in Discover/Board |
| `meta` | ✅ Yes | Enhanced metadata with recommendation explanations |
| `stream` | ❌ No | Out of scope — this addon does not provide streams |
| `subtitles` | ❌ No | Out of scope |

## 2.3 Hosting & Performance Considerations

| Consideration | Recommendation |
|---------------|----------------|
| **Hosting** | Serverless (Vercel, Cloudflare Workers, AWS Lambda) or lightweight VPS |
| **HTTPS** | Required for production (Stremio rejects HTTP in production) |
| **CORS** | Must allow `*` or Stremio origins |
| **Cold Start** | Cache manifest and frequent catalog responses |
| **Latency Target** | <500ms for catalog responses (excluding Gemini API latency) |

## 2.4 Known Platform Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| No watch history access | Cannot personalize based on viewing behavior | Use static genre/era preferences as proxy |
| No runtime user input | Cannot ask clarifying questions | Comprehensive install-time configuration |
| Static configuration only | Preferences frozen at install | Provide preset profiles + advanced customization |
| No push notifications | Cannot alert users to new recommendations | Users refresh by visiting catalog |
| Limited metadata display | Explanation text must fit in description field | Concise, structured explanations |

---

# 3. Supported Content Types

## 3.1 Movies

### Scope
- Feature-length films (typically 60+ minutes)
- All genres, eras, and origins
- Theatrical releases, direct-to-streaming, and festival films

### Metadata Usage

| Field | Usage |
|-------|-------|
| `id` | IMDb ID (tt-prefixed) for universal identification |
| `name` | Display title |
| `poster` | Visual identification |
| `year` | Release year for era-based filtering |
| `genres` | Primary categorization signal |
| `runtime` | Length-based filtering (short session vs. epic viewing) |
| `description` | Extended with recommendation explanation |

### Runtime & Franchise Handling

**Runtime Categories:**
- **Quick Watch:** <90 minutes — weeknight, casual viewing
- **Standard:** 90-130 minutes — general recommendation
- **Epic:** 130+ minutes — weekend/dedicated viewing sessions

**Franchise Awareness:**
- Gemini identifies franchise entries and considers:
  - Standalone watchability (can view without prior films?)
  - Chronological placement (prequel, sequel, spinoff)
  - Recommended viewing order

### Handling of Recent Releases

**Strategy:** Gemini grounding/search for movies released within the past 6 months.

| Trigger | Action |
|---------|--------|
| User enables "Include New Releases" | Weekly search for recent theatrical/streaming releases |
| Seasonal refresh (quarterly) | Batch search for critically acclaimed new releases |
| Holiday periods | Search for recent holiday-themed releases |

**Cache Duration:** 7 days for new release data.

---

## 3.2 Series

### Scope
- TV series (network, cable, streaming originals)
- Limited series / miniseries
- Docuseries
- Anime series

### Season & Episode Awareness

| Signal | Handling |
|--------|----------|
| **Total Seasons** | Distinguishes limited series (1 season) from long-runners |
| **Episode Count** | Informs time commitment estimation |
| **Episode Runtime** | 22-30 min (sitcom), 45-60 min (drama), 60+ min (prestige) |
| **Ongoing vs. Completed** | Flags series still in production |

### Binge-Friendliness Logic

Gemini evaluates binge potential based on:

| Factor | Weight | Rationale |
|--------|--------|-----------|
| Episode runtime | High | Shorter episodes = more bingeable |
| Cliffhanger style | Medium | Serialized narratives encourage continuation |
| Total episodes | Medium | Finite series more binge-friendly |
| Standalone episodes | Low | Procedurals less demanding of commitment |

**Binge Score Categories:**
- **High:** Limited series, tight serialization, <45 min episodes
- **Medium:** Serialized dramas with 45-60 min episodes
- **Low:** Long-running procedurals, anthology series

### Franchise & Continuity Handling

| Scenario | Gemini Behavior |
|----------|-----------------|
| **Shared Universe** (MCU, Arrowverse) | Notes viewing order dependencies |
| **Spin-offs** | Indicates parent series relationship |
| **Reboots** | Distinguishes from original series |
| **Anthology** | Marks seasons as independently watchable |

### Handling of Newly Released Seasons

**Strategy:** Gemini grounding/search for:
- New seasons of popular series (within past 3 months)
- Series premieres (new shows launched within past 6 months)

**Triggers:**
- User preference for "Include Ongoing Series"
- Quarterly catalog refresh
- User-specified favorite genres with high new-release activity

---

# 4. Context & Signal Engine

All signals are **static** (configured at install-time) or **derived** (computed from system time/date without user interaction).

## 4.1 Signal Catalog

### Signal: Time of Day

| Attribute | Value |
|-----------|-------|
| **Description** | Current hour in user's timezone |
| **Data Source** | System clock + user-configured timezone |
| **Gemini Knowledge Sufficient?** | Yes — Gemini understands viewing patterns by time |
| **Gemini Online Search Needed?** | No |
| **External API Required?** | No |
| **Influence on Recommendations** | Morning: light/uplifting; Afternoon: varied; Evening: drama/thriller; Late Night: cult/horror |
| **Implementation Complexity** | Low |

### Signal: Day of Week

| Attribute | Value |
|-----------|-------|
| **Description** | Monday-Sunday classification |
| **Data Source** | System clock |
| **Gemini Knowledge Sufficient?** | Yes — understands weekday vs. weekend patterns |
| **Gemini Online Search Needed?** | No |
| **External API Required?** | No |
| **Influence on Recommendations** | Weekdays: shorter content, episodic; Weekends: longer films, binge-worthy series |
| **Implementation Complexity** | Low |

### Signal: Date & Seasonality

| Attribute | Value |
|-----------|-------|
| **Description** | Month/season classification + special dates |
| **Data Source** | System clock |
| **Gemini Knowledge Sufficient?** | Yes — extensive knowledge of seasonal themes |
| **Gemini Online Search Needed?** | No (for general seasonality) |
| **External API Required?** | No |
| **Influence on Recommendations** | October: horror; December: holiday films; Summer: blockbusters; Winter: cozy dramas |
| **Implementation Complexity** | Low |

### Signal: Public Holidays

| Attribute | Value |
|-----------|-------|
| **Description** | Recognition of major holidays by region |
| **Data Source** | User-configured country/region + system date |
| **Gemini Knowledge Sufficient?** | Yes — knows major holidays for all regions |
| **Gemini Online Search Needed?** | Rarely — only for obscure regional holidays |
| **External API Required?** | No |
| **Influence on Recommendations** | Holiday-themed content surfaced during relevant periods |
| **Implementation Complexity** | Low |

### Signal: User Timezone

| Attribute | Value |
|-----------|-------|
| **Description** | UTC offset or timezone name |
| **Data Source** | User-configured at install |
| **Gemini Knowledge Sufficient?** | Yes — timezone interpretation |
| **Gemini Online Search Needed?** | No |
| **External API Required?** | No |
| **Influence on Recommendations** | Enables accurate time-of-day calculations |
| **Implementation Complexity** | Low |

### Signal: Weather (Conditional)

| Attribute | Value |
|-----------|-------|
| **Description** | General weather conditions (sunny, rainy, cold, hot) |
| **Data Source** | Option A: User self-reports typical weather; Option B: External weather API |
| **Gemini Knowledge Sufficient?** | Partially — knows seasonal weather patterns by region |
| **Gemini Online Search Needed?** | Can supplement with general regional weather |
| **External API Required?** | **Optional** — for real-time accuracy (OpenWeatherMap free tier) |
| **Influence on Recommendations** | Rainy: cozy indoor films; Hot: light entertainment; Cold: epic sagas |
| **Implementation Complexity** | Medium (if using external API) |

**Decision:** Weather signal is **optional**. Default implementation uses Gemini's seasonal weather inference based on user region + date. Real-time weather API is a v2 enhancement.

### Signal: Language Preferences

| Attribute | Value |
|-----------|-------|
| **Description** | Preferred content languages, subtitle tolerance |
| **Data Source** | User-configured at install |
| **Gemini Knowledge Sufficient?** | Yes — knows content availability by language |
| **Gemini Online Search Needed?** | No |
| **External API Required?** | No |
| **Influence on Recommendations** | Filters/ranks content by language availability |
| **Implementation Complexity** | Low |

### Signal: Genre Affinity Weights

| Attribute | Value |
|-----------|-------|
| **Description** | User's preference strength for each genre (1-5 scale) |
| **Data Source** | User-configured at install |
| **Gemini Knowledge Sufficient?** | Yes — understands genre characteristics |
| **Gemini Online Search Needed?** | No |
| **External API Required?** | No |
| **Influence on Recommendations** | Primary ranking factor; high-affinity genres weighted heavily |
| **Implementation Complexity** | Low |

### Signal: Age Rating Constraints

| Attribute | Value |
|-----------|-------|
| **Description** | Maximum acceptable content rating (G, PG, PG-13, R, etc.) |
| **Data Source** | User-configured at install |
| **Gemini Knowledge Sufficient?** | Yes — knows rating systems globally |
| **Gemini Online Search Needed?** | No |
| **External API Required?** | No |
| **Influence on Recommendations** | Hard filter; excludes content above threshold |
| **Implementation Complexity** | Low |

### Signal: Novelty vs. Familiarity Bias

| Attribute | Value |
|-----------|-------|
| **Description** | Preference for discovering new content vs. beloved classics |
| **Data Source** | User-configured slider (0-100: Classics ↔ New) |
| **Gemini Knowledge Sufficient?** | Yes |
| **Gemini Online Search Needed?** | Yes — for discovering genuinely new releases |
| **External API Required?** | No |
| **Influence on Recommendations** | Balances catalog between timeless picks and recent releases |
| **Implementation Complexity** | Low |

### Signal: Popularity Tolerance

| Attribute | Value |
|-----------|-------|
| **Description** | Preference for mainstream hits vs. hidden gems |
| **Data Source** | User-configured slider (0-100: Obscure ↔ Popular) |
| **Gemini Knowledge Sufficient?** | Yes — broad knowledge of popular and obscure titles |
| **Gemini Online Search Needed?** | No |
| **External API Required?** | No |
| **Influence on Recommendations** | Adjusts recommendation pool breadth |
| **Implementation Complexity** | Low |

### Signal: Release Era Preferences

| Attribute | Value |
|-----------|-------|
| **Description** | Preferred decades/eras for content |
| **Data Source** | User-configured (multi-select: Pre-1970, 1970s, 1980s, 1990s, 2000s, 2010s, 2020s) |
| **Gemini Knowledge Sufficient?** | Yes |
| **Gemini Online Search Needed?** | No |
| **External API Required?** | No |
| **Influence on Recommendations** | Weights content from preferred eras |
| **Implementation Complexity** | Low |

### Signal: Runtime / Episode Length Bias

| Attribute | Value |
|-----------|-------|
| **Description** | Preferred content duration |
| **Data Source** | User-configured (Short/Medium/Long/No Preference) |
| **Gemini Knowledge Sufficient?** | Yes — knows typical runtimes |
| **Gemini Online Search Needed?** | No |
| **External API Required?** | No |
| **Influence on Recommendations** | Filters/ranks by duration appropriateness |
| **Implementation Complexity** | Low |

### Signal: Regional Availability

| Attribute | Value |
|-----------|-------|
| **Description** | User's country for availability context |
| **Data Source** | User-configured at install |
| **Gemini Knowledge Sufficient?** | Partially — general awareness of regional catalogs |
| **Gemini Online Search Needed?** | No — recommendations are platform-agnostic |
| **External API Required?** | No |
| **Influence on Recommendations** | Minor factor; primarily for regional holiday/cultural context |
| **Implementation Complexity** | Low |

---

## 4.2 Excluded Dynamic Signals

| Signal | Reason for Exclusion |
|--------|---------------------|
| **Current Mood** | Requires runtime user input; violates static constraint |
| **Social Context** | Cannot detect who user is watching with |
| **Energy Level** | No physiological sensing possible |
| **Watch History** | Not exposed by Stremio to addons |
| **Real-time Ratings** | Cannot capture user feedback during sessions |
| **Viewing Intent** | Cannot ask "what do you want to watch tonight?" |
| **Device Type** | Not reliably exposed to addons |
| **Remaining Free Time** | Cannot query user's schedule |

---

# 5. Static Configuration System

## 5.1 Configuration Fields

All configuration is captured at addon install time via Stremio's native configuration UI.

### Core Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `geminiApiKey` | `password` | ✅ Yes | — | User's personal Gemini API key |
| `geminiModel` | `select` | ✅ Yes | `gemini-3-flash` | Selected Gemini model |
| `timezone` | `select` | ✅ Yes | Auto-detect | User's timezone |
| `country` | `select` | ✅ Yes | Auto-detect | User's country (for holidays/regional context) |
| `configMode` | `select` | No | `basic` | Basic or Advanced configuration mode |

### Content Preferences

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `preferredLanguages` | `multiselect` | No | `["en"]` | Content languages |
| `subtitleTolerance` | `select` | No | `prefer_dubbed` | Willingness to watch subtitled content |
| `maxRating` | `select` | No | `R` | Maximum content rating |
| `includeMovies` | `checkbox` | No | `true` | Include movie recommendations |
| `includeSeries` | `checkbox` | No | `true` | Include series recommendations |

### Genre Preferences (Advanced Mode)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `genreWeights` | `object` | No | Equal weights | Per-genre affinity (1-5 scale) |
| `excludedGenres` | `multiselect` | No | `[]` | Genres to completely exclude |

### Discovery Preferences

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `noveltyBias` | `slider` | No | `50` | 0=Classics, 100=New releases |
| `popularityBias` | `slider` | No | `50` | 0=Hidden gems, 100=Mainstream |
| `preferredEras` | `multiselect` | No | All eras | Preferred release decades |
| `includeNewReleases` | `checkbox` | No | `true` | Enable Gemini search for recent content |

### Viewing Context

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `typicalRuntime` | `select` | No | `any` | Preferred content length |
| `bingePreference` | `select` | No | `moderate` | Preference for binge-worthy series |

### Feature Toggles

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `enableSeasonalThemes` | `checkbox` | No | `true` | Adjust for holidays/seasons |
| `enableTimeContext` | `checkbox` | No | `true` | Adjust for time of day |
| `enableWeatherContext` | `checkbox` | No | `false` | Use weather-based adjustments |
| `showExplanations` | `checkbox` | No | `true` | Include recommendation explanations |

---

## 5.2 Gemini API Key Handling

**Security Measures:**
- API key transmitted over HTTPS only
- Key stored in Stremio's local configuration (client-side)
- Key sent to addon server with each request
- Addon server uses key for Gemini calls, never stores it persistently
- Key never logged or included in error reports

**Validation:**
- On install: Addon validates key with minimal Gemini API call
- Invalid key: Installation blocked with clear error message
- Quota exceeded: Graceful fallback to cached recommendations

---

## 5.3 Gemini Model Selection

### Allowed Models (January 2026)

| Model | Rationale | Use Case |
|-------|-----------|----------|
| **gemini-3-flash** | Best balance of speed, cost, and capability. 1M token context. Native grounding/search. $0.50/1M input. | **Recommended default** |
| **gemini-3-pro** | Highest reasoning quality. Best for complex preference synthesis. $2/1M input. | Users prioritizing quality over cost |
| **gemini-2.5-flash** | Proven stability, excellent for structured output. $0.30/1M input. | Budget-conscious users |
| **gemini-2.5-flash-lite** | Lowest cost option. $0.10/1M input. | High-volume, simple recommendations |

### Rejected Models

| Model | Rejection Reason |
|-------|------------------|
| `gemini-2.0-*` | Scheduled for deprecation Feb 2026 |
| `gemini-*-chat` | Optimized for conversation, not structured reasoning |
| Legacy models | No grounding/search capability |

---

## 5.4 Preset Profiles

For users preferring quick setup, preset profiles pre-fill configuration values.

| Profile | Target User | Key Settings |
|---------|-------------|--------------|
| **Casual Viewer** | Light entertainment seekers | High popularity bias, mainstream genres, shorter runtimes |
| **Cinephile** | Serious film enthusiasts | Low popularity bias, all eras, longer runtimes, no exclusions |
| **Family Friendly** | Households with children | PG-13 max rating, family genres prioritized |
| **Binge Watcher** | Series-focused users | Series prioritized, high binge preference, recent content |
| **Discovery Mode** | Users seeking variety | Low popularity bias, high novelty, broad genres |
| **Custom** | Power users | All fields manually configured |

---

## 5.5 Basic vs. Advanced Mode

| Mode | Visible Configuration |
|------|----------------------|
| **Basic** | API key, model, preset profile, timezone, country, languages, max rating |
| **Advanced** | All fields including per-genre weights, era selection, all toggles |

---

## 5.6 Validation & Error Handling

| Scenario | Response |
|----------|----------|
| Missing API key | Block installation; display clear error |
| Invalid API key | Block installation; display "Invalid Gemini API Key" |
| Invalid timezone | Fallback to UTC; warn user |
| Contradictory settings | Use sensible defaults; log warning |
| All genres excluded | Reset to no exclusions; warn user |

---

# 6. Gemini Integration Architecture

## 6.1 Role of Gemini

Gemini serves as a **reasoning and synthesis engine**, not a conversational agent.

**Responsibilities:**
- Synthesize user preferences into coherent recommendation criteria
- Apply temporal context (time, season, holidays) to content selection
- Retrieve recent content via grounding/search when enabled
- Generate human-readable explanations for each recommendation
- Return structured, deterministic output

**Explicitly NOT Gemini's Role:**
- Chatting with users
- Storing user data
- Making real-time decisions per user action
- Providing streams or playback data

---

## 6.2 When Gemini Is Called

| Trigger | Frequency | Scope |
|---------|-----------|-------|
| **Catalog Generation** | Max 1x per 6 hours per user config hash | Generate full recommendation batch |
| **Cache Miss** | On-demand | When cached catalog expired |
| **Forced Refresh** | User-initiated (rare) | Manual cache invalidation |

**Never Called For:**
- Individual item lookups
- Real-time user interactions
- Stream resolution
- Metadata enhancement per-item

---

## 6.3 When Gemini Online Search Is Triggered

| Scenario | Trigger Condition | Search Query Pattern |
|----------|-------------------|---------------------|
| **New Movie Releases** | `includeNewReleases=true` + `noveltyBias > 60` | "best new movies released [current month] [current year]" |
| **New Series/Seasons** | `includeNewReleases=true` + `includeSeries=true` | "new TV series premieres [current month] [current year]" |
| **Seasonal Refresh** | Quarterly (Jan, Apr, Jul, Oct) | "critically acclaimed [movies/series] [current quarter] [current year]" |
| **Holiday Content** | Within 14 days of major holiday | "[holiday name] themed movies [current year]" |

**Search Constraints:**
- Maximum 2 search queries per catalog generation
- Results cached for 7 days
- Search disabled if user sets `includeNewReleases=false`

---

## 6.4 Prompt Structure

### System Prompt (Fixed)

```
You are a movie and TV series recommendation engine. Your task is to generate personalized recommendations based on user preferences and contextual signals.

RULES:
1. Return ONLY valid JSON matching the provided schema
2. Never include content exceeding the user's rating limit
3. Never include excluded genres
4. Prioritize genres with higher user weights
5. Consider temporal context (time of day, season, holidays)
6. Include a brief, specific explanation for each recommendation
7. For recent content queries, use your search capabilities
8. Return exactly the requested number of recommendations
9. Ensure diversity across genres unless user preferences are narrow
10. Include IMDb IDs (tt-prefixed) for all recommendations
```

### User Configuration Block (Dynamic)

```json
{
  "preferences": {
    "languages": ["en", "es"],
    "maxRating": "PG-13",
    "genreWeights": {
      "Action": 4,
      "Comedy": 5,
      "Drama": 3,
      "Horror": 1,
      "Sci-Fi": 4
    },
    "excludedGenres": ["Horror"],
    "noveltyBias": 65,
    "popularityBias": 40,
    "preferredEras": ["1990s", "2000s", "2010s", "2020s"],
    "runtimePreference": "medium"
  },
  "context": {
    "localTime": "20:30",
    "dayOfWeek": "Saturday",
    "date": "2026-01-15",
    "season": "winter",
    "nearbyHoliday": null,
    "timezone": "America/New_York"
  },
  "request": {
    "contentType": "movie",
    "count": 20,
    "includeNewReleases": true
  }
}
```

### Output Schema (Enforced)

```json
{
  "recommendations": [
    {
      "imdbId": "tt1234567",
      "title": "Example Movie",
      "year": 2024,
      "genres": ["Action", "Sci-Fi"],
      "runtime": 125,
      "explanation": "A Saturday evening calls for an engaging action film. This 2024 release matches your sci-fi affinity and preference for recent content.",
      "contextTags": ["weekend", "evening", "recent_release", "high_genre_match"],
      "confidenceScore": 0.87
    }
  ],
  "metadata": {
    "generatedAt": "2026-01-15T20:35:00Z",
    "modelUsed": "gemini-3-flash",
    "searchUsed": true,
    "totalCandidatesConsidered": 150
  }
}
```

---

## 6.5 Guardrails Against Prompt Instability

| Risk | Mitigation |
|------|------------|
| **Hallucinated IMDb IDs** | Post-process validation against known ID format; fallback to title-based search |
| **Schema violations** | Strict JSON schema validation; reject and retry with simplified prompt |
| **Inconsistent explanations** | Explanation template enforcement in prompt |
| **Excessive recommendations** | Hard limit on output array length |
| **Inappropriate content** | Double-check rating filter in post-processing |
| **Repetitive results** | Deduplicate and request additional items if needed |

---

## 6.6 Caching Strategy

### Cache Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      Request Flow                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Stremio Request                                            │
│        │                                                    │
│        ▼                                                    │
│  ┌─────────────┐    HIT     ┌─────────────────────────┐    │
│  │ L1: Memory  │ ─────────► │ Return Cached Catalog   │    │
│  │ Cache (5m)  │            └─────────────────────────┘    │
│  └─────────────┘                                            │
│        │ MISS                                               │
│        ▼                                                    │
│  ┌─────────────┐    HIT     ┌─────────────────────────┐    │
│  │ L2: Redis/  │ ─────────► │ Populate L1, Return     │    │
│  │ KV (6hr)    │            └─────────────────────────┘    │
│  └─────────────┘                                            │
│        │ MISS                                               │
│        ▼                                                    │
│  ┌─────────────┐            ┌─────────────────────────┐    │
│  │ L3: Gemini  │ ─────────► │ Populate L1+L2, Return  │    │
│  │ API Call    │            └─────────────────────────┘    │
│  └─────────────┘                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Cache Key Structure

```
catalog:{configHash}:{contentType}:{temporalBucket}
```

- `configHash`: SHA-256 of normalized user preferences
- `contentType`: `movie` or `series`
- `temporalBucket`: `morning|afternoon|evening|latenight` + `weekday|weekend` + `season`

### Cache Invalidation

| Trigger | Action |
|---------|--------|
| 6 hours elapsed | L2 cache expires; next request regenerates |
| Season change | All seasonal-tagged caches invalidated |
| Holiday ±14 days | Holiday-tagged caches refreshed |
| User reinstalls addon | New config hash = fresh cache |

---

## 6.7 Failure & Fallback Behavior

| Failure Mode | Detection | Fallback |
|--------------|-----------|----------|
| **API Key Invalid** | 401/403 response | Return error to user; block addon functionality |
| **Quota Exceeded** | 429 response | Return stale cache if available; display notice |
| **Gemini Timeout** | >30s response time | Return stale cache; retry in background |
| **Malformed Response** | JSON parse failure | Retry with simplified prompt (1 retry) |
| **Search Unavailable** | Grounding failure | Generate recommendations without new releases |
| **Complete Outage** | No response | Return hardcoded "Recommendations Unavailable" placeholder |

---

# 7. Recommendation Logic

## 7.1 Ranking Methodology

Recommendations are scored using a weighted composite formula:

```
Score = (GenreMatch × 0.35) + (TemporalFit × 0.20) + (NoveltyFit × 0.15) 
      + (PopularityFit × 0.15) + (EraFit × 0.10) + (RuntimeFit × 0.05)
```

### Component Definitions

| Component | Calculation |
|-----------|-------------|
| **GenreMatch** | Sum of user genre weights for item's genres, normalized 0-1 |
| **TemporalFit** | Gemini's assessment of content appropriateness for current time/day/season |
| **NoveltyFit** | How well release year matches user's novelty bias |
| **PopularityFit** | How well item's popularity matches user's popularity bias |
| **EraFit** | 1.0 if release decade in user's preferred eras, 0.5 otherwise |
| **RuntimeFit** | 1.0 if runtime matches preference, 0.7 if acceptable, 0.4 if mismatched |

---

## 7.2 Movie vs. Series Balancing

When both content types enabled:

| Scenario | Movie:Series Ratio |
|----------|-------------------|
| Weekday evening, short time | 40:60 (favor episodic) |
| Weekend, high binge preference | 30:70 (favor series) |
| Weekend, no binge preference | 60:40 (favor movies) |
| Late night | 50:50 (balanced) |
| User disabled one type | 100:0 or 0:100 |

Gemini determines ratio based on temporal context and user preferences.

---

## 7.3 Tie-Breaking Logic

When multiple items have identical scores:

1. **Recency** — More recent content preferred (if novelty bias ≥ 50)
2. **Primary Genre Match** — Item whose primary genre has highest user weight
3. **Critical Acclaim** — Higher-rated content preferred
4. **Alphabetical** — Deterministic fallback

---

## 7.4 Refresh Cadence

| Catalog Type | Refresh Interval | Rationale |
|--------------|------------------|-----------|
| Primary recommendations | 6 hours | Balance freshness with API cost |
| New releases catalog | 24 hours | New content doesn't change rapidly |
| Seasonal specials | 7 days | Holiday windows are multi-day |
| Time-of-day variants | Immediate | Uses temporal bucket in cache key |

---

## 7.5 Cold-Start Behavior

For users with minimal configuration (Basic mode with preset):

| Scenario | Behavior |
|----------|----------|
| **First request** | Generate recommendations using preset defaults |
| **No genre preferences** | Equal weight across popular genres |
| **No era preferences** | Slight recency bias (2010s-2020s weighted 1.2x) |
| **Default novelty** | 50/50 balance classics and recent |

---

## 7.6 Recommendation Validity Duration

| Context | Validity |
|---------|----------|
| **Time-of-day specific** | Until next temporal bucket (morning→afternoon→evening→night) |
| **Day-of-week specific** | Until midnight in user's timezone |
| **Seasonal** | Until season change (equinox/solstice) |
| **Holiday-specific** | Until 3 days after holiday |
| **General recommendations** | 6 hours |

---

# 8. Catalog Design

## 8.1 Movie Recommendation Catalogs

### Primary Catalog: "Watchwyrd: Movies"

| Property | Value |
|----------|-------|
| **ID** | `watchwyrd-movies-main` |
| **Type** | `movie` |
| **Name** | "Watchwyrd: Movies" |
| **Purpose** | Primary movie recommendations blending all signals |
| **Item Count** | 20-40 items |
| **Refresh** | 6 hours |

### Sub-Catalog: "New Releases" (Conditional)

| Property | Value |
|----------|-------|
| **ID** | `watchwyrd-movies-new` |
| **Type** | `movie` |
| **Name** | "New & Trending Movies" |
| **Purpose** | Recent releases discovered via Gemini search |
| **Condition** | Only shown if `includeNewReleases=true` |
| **Item Count** | 10-15 items |
| **Refresh** | 24 hours |

### Sub-Catalog: "Perfect for Tonight" (Conditional)

| Property | Value |
|----------|-------|
| **ID** | `watchwyrd-movies-tonight` |
| **Type** | `movie` |
| **Name** | "Perfect for Tonight" |
| **Purpose** | Time-aware picks for current moment |
| **Condition** | Only shown if `enableTimeContext=true` |
| **Item Count** | 10 items |
| **Refresh** | Per temporal bucket |

---

## 8.2 Series Recommendation Catalogs

### Primary Catalog: "Watchwyrd: Series"

| Property | Value |
|----------|-------|
| **ID** | `watchwyrd-series-main` |
| **Type** | `series` |
| **Name** | "Watchwyrd: Series" |
| **Purpose** | Primary series recommendations |
| **Item Count** | 20-40 items |
| **Refresh** | 6 hours |

### Sub-Catalog: "Binge-Worthy" (Conditional)

| Property | Value |
|----------|-------|
| **ID** | `watchwyrd-series-binge` |
| **Type** | `series` |
| **Name** | "Binge-Worthy Series" |
| **Purpose** | High binge-score series |
| **Condition** | Only shown if `bingePreference ≠ none` |
| **Item Count** | 10-15 items |
| **Refresh** | 6 hours |

### Sub-Catalog: "New Seasons & Premieres" (Conditional)

| Property | Value |
|----------|-------|
| **ID** | `watchwyrd-series-new` |
| **Type** | `series` |
| **Name** | "New Seasons & Premieres" |
| **Purpose** | Recently released series/seasons via search |
| **Condition** | Only shown if `includeNewReleases=true` |
| **Item Count** | 10-15 items |
| **Refresh** | 24 hours |

---

## 8.3 Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Catalog ID | `watchwyrd-{type}-{purpose}` | `watchwyrd-movies-main` |
| Catalog Name | "Watchwyrd: {Type}" or descriptive | "Watchwyrd: Movies" |
| Sub-catalog Name | Descriptive, actionable | "Perfect for Tonight" |

---

## 8.4 UI Behavior Inside Stremio

| Behavior | Implementation |
|----------|----------------|
| **Catalog Position** | Appears in Discover/Board alongside other addon catalogs |
| **Poster Display** | Standard Stremio poster grid |
| **Item Selection** | Opens standard Stremio detail view |
| **Description** | Includes recommendation explanation |
| **Links** | Links field contains "Why recommended" tooltip text |

---

# 9. Explainability & Transparency

## 9.1 "Why This Was Recommended" Logic

Every recommendation includes a human-readable explanation generated by Gemini.

### Explanation Components

| Component | Example |
|-----------|---------|
| **Temporal Trigger** | "Perfect for a Saturday evening" |
| **Genre Match** | "Matches your love of sci-fi" |
| **Seasonal Relevance** | "A cozy winter drama" |
| **Recency Note** | "Released this month" |
| **Era Match** | "A 90s classic you'll appreciate" |
| **Unique Selling Point** | "Critically acclaimed thriller with a twist ending" |

### Explanation Format

```
"{Temporal context}. {Primary reason}. {Secondary reason}."
```

**Example:**
> "A perfect Saturday night pick. This sci-fi thriller matches your genre preferences and features the complex narratives you enjoy. Released in 2024 for those seeking fresh content."

---

## 9.2 Context Tags

Each recommendation carries machine-readable tags for filtering and UI enhancement.

| Tag Category | Possible Values |
|--------------|-----------------|
| **Temporal** | `morning`, `afternoon`, `evening`, `latenight`, `weekday`, `weekend` |
| **Seasonal** | `spring`, `summer`, `fall`, `winter`, `holiday_[name]` |
| **Recency** | `classic`, `modern`, `recent_release`, `new_release` |
| **Genre** | `high_genre_match`, `genre_discovery` |
| **Popularity** | `mainstream`, `cult_favorite`, `hidden_gem` |
| **Binge** | `binge_worthy`, `casual_watch` |

---

## 9.3 Relevance Scoring

| Score Range | Interpretation | UI Display |
|-------------|----------------|------------|
| 0.85 - 1.00 | Excellent match | ★★★★★ or "Perfect for you" |
| 0.70 - 0.84 | Strong match | ★★★★☆ or "Great match" |
| 0.55 - 0.69 | Good match | ★★★☆☆ or "Good pick" |
| 0.40 - 0.54 | Moderate match | ★★☆☆☆ or "Worth considering" |
| < 0.40 | Not shown | — |

---

## 9.4 Explainable Exclusions

When applicable, provide reasoning for notable omissions:

| Exclusion Reason | Example Explanation |
|------------------|---------------------|
| Rating exceeded | "The Godfather Part II excluded due to R rating limit" |
| Genre excluded | "Horror titles hidden per your preferences" |
| Era mismatch | "Pre-1980 films deprioritized based on your settings" |
| Language mismatch | "Foreign-language films without dubs hidden" |

**Note:** Exclusion explanations are shown in a dedicated "Preferences Applied" section, not per-item.

---

# 10. Novel but Feasible Features

## 10.1 Temporal Micro-Catalogs

| Aspect | Detail |
|--------|--------|
| **Description** | Dynamically named catalogs based on current context: "Sunday Morning Picks", "Friday Night Thrillers" |
| **User Benefit** | Immediate relevance; feels personally curated |
| **API Cost Impact** | Zero additional cost — uses existing cached recommendations with filtered view |
| **Technical Feasibility** | Low complexity; client-side filtering of base catalog |

---

## 10.2 Franchise Navigator

| Aspect | Detail |
|--------|--------|
| **Description** | When recommending a sequel/spinoff, include metadata about the franchise and suggested viewing order |
| **User Benefit** | Reduces confusion for connected universes (MCU, Star Wars, etc.) |
| **API Cost Impact** | Minimal — franchise data derived from Gemini's base knowledge |
| **Technical Feasibility** | Medium complexity; requires structured franchise data in response |

---

## 10.3 Seasonal Event Catalogs

| Aspect | Detail |
|--------|--------|
| **Description** | Auto-generated catalogs for holidays/events: "Halloween Horrors", "Holiday Classics", "Summer Blockbusters" |
| **User Benefit** | Timely, relevant content without manual curation |
| **API Cost Impact** | Low — one Gemini call per seasonal event, cached for 7+ days |
| **Technical Feasibility** | Low complexity; scheduled generation based on calendar |

---

## 10.4 Explanation Cards

| Aspect | Detail |
|--------|--------|
| **Description** | Rich explanation format with visual indicators showing why each factor contributed to the recommendation |
| **User Benefit** | Transparency builds trust; educational about own preferences |
| **API Cost Impact** | Zero — explanations generated alongside recommendations |
| **Technical Feasibility** | Low complexity; requires structured explanation schema |

---

## 10.5 Confidence Calibration

| Aspect | Detail |
|--------|--------|
| **Description** | Each recommendation shows confidence level; lower confidence = "discovery" picks outside comfort zone |
| **User Benefit** | Sets expectations; encourages exploration with clear framing |
| **API Cost Impact** | Zero — confidence score is part of standard output |
| **Technical Feasibility** | Low complexity; numeric score already in schema |

---

## 10.6 Rejected Feature Ideas

| Feature | Rejection Reason |
|---------|------------------|
| **Real-time chat refinement** | Violates static configuration constraint |
| **Per-item API calls** | Economically unsustainable; latency issues |
| **Social integration** | No access to social data in Stremio |
| **Playback tracking** | Stremio doesn't expose this to addons |
| **Push notifications** | Not supported by Stremio addon architecture |
| **Complex mood detection** | Requires runtime input; not feasible |
| **ML training on user data** | Privacy concerns; requires persistent storage |

---

# 11. Privacy, Security & Data Handling

## 11.1 Gemini API Key Handling

| Aspect | Implementation |
|--------|----------------|
| **Storage Location** | Stremio app's local configuration (client-side) |
| **Transmission** | HTTPS only; never over unencrypted connections |
| **Server-Side Handling** | Used immediately for Gemini call; never persisted |
| **Logging** | API key explicitly excluded from all logs |
| **Error Messages** | Never include API key in error responses |

---

## 11.2 Data Storage Policy

**Principle: Stateless by Default**

| Data Type | Storage | Retention |
|-----------|---------|-----------|
| User API key | Client-side only | Until addon uninstalled |
| User preferences | Client-side only | Until addon uninstalled |
| Cached recommendations | Server-side Redis/KV | 6-24 hours (auto-expire) |
| Request logs | Server-side | 7 days (aggregated, no PII) |
| Gemini responses | Not stored | Processed and discarded |

---

## 11.3 Online Search Data Handling

| Aspect | Policy |
|--------|--------|
| **Search queries sent to Gemini** | Generic (e.g., "new movies January 2026"), no user-identifying info |
| **Search results** | Cached server-side as part of recommendation batch |
| **User correlation** | Search results not linked to specific users |

---

## 11.4 External API Data Usage

| Scenario | Data Handling |
|----------|---------------|
| **Weather API (if enabled)** | Only latitude/longitude sent; no user identity |
| **IMDb ID validation** | Only ID prefix checked; no external calls |
| **No other external APIs** | By design |

---

## 11.5 User Trust Considerations

| Consideration | Implementation |
|---------------|----------------|
| **Transparency** | Clear documentation of data flows |
| **User Control** | All features toggleable; user provides own API key |
| **Minimal Data** | Only essential data collected; no analytics tracking |
| **Open Source** | Full source code available for audit |
| **No Account Required** | Addon works without any signup/login |

---

# 12. Performance & Scalability

## 12.1 Request Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        Request Flow                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User opens Stremio Discover                                     │
│           │                                                      │
│           ▼                                                      │
│  Stremio requests /catalog/movie/gemini-movies-main.json         │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Addon Server                               ││
│  │  1. Extract user config from request                         ││
│  │  2. Compute config hash + temporal bucket                    ││
│  │  3. Check L1 cache (memory, 5 min TTL)                       ││
│  │     └─ HIT → Return immediately (<10ms)                      ││
│  │  4. Check L2 cache (Redis/KV, 6hr TTL)                       ││
│  │     └─ HIT → Populate L1, return (<50ms)                     ││
│  │  5. Call Gemini API with config + context                    ││
│  │     └─ Wait for response (500-3000ms)                        ││
│  │  6. Validate & transform response                            ││
│  │  7. Populate L1 + L2 caches                                  ││
│  │  8. Return catalog JSON                                      ││
│  └─────────────────────────────────────────────────────────────┘│
│           │                                                      │
│           ▼                                                      │
│  Stremio renders catalog in UI                                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 12.2 Gemini Call Frequency

| Scenario | Calls per User per Day |
|----------|------------------------|
| **Typical usage** | 1-4 calls (6-hour cache) |
| **Heavy browsing** | 4-8 calls (multiple time buckets) |
| **Maximum** | 12 calls (every 2 hours, all content types) |

**Cost Estimation (gemini-3-flash @ $0.50/1M input, $3/1M output):**
- Average prompt: ~2,000 tokens input, ~3,000 tokens output
- Per call cost: ~$0.01
- Per user per day: $0.01 - $0.12
- Per user per month: $0.30 - $3.60

---

## 12.3 Online Search Usage Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max searches per catalog generation | 2 | Cost control |
| Search cache duration | 7 days | New releases don't change hourly |
| Monthly search budget per user | ~20 searches | Well within free tier (5,000/month) |

---

## 12.4 External API Call Limits

| API | Limit | Rationale |
|-----|-------|-----------|
| Weather (if enabled) | 1 call per 3 hours | Weather doesn't change rapidly |
| No other external APIs | — | By design |

---

## 12.5 Caching Layers

| Layer | Technology | TTL | Purpose |
|-------|------------|-----|---------|
| L1 | In-memory (Node.js Map) | 5 minutes | Hot path; same-user rapid requests |
| L2 | Redis / Cloudflare KV / Vercel KV | 6 hours | Cross-request persistence |
| L3 | Gemini API | — | Source of truth |

---

## 12.6 Cost Control Strategy

| Strategy | Implementation |
|----------|----------------|
| **Aggressive caching** | 6-hour default TTL; temporal bucketing reduces unique cache keys |
| **Batch requests** | All recommendations in single Gemini call |
| **Model selection** | Default to flash (cheapest capable model) |
| **Search limits** | Cap at 2 searches per generation; 7-day cache |
| **Graceful degradation** | Serve stale cache on quota exceeded |
| **User transparency** | Show estimated monthly cost in addon config |

---

# 13. Roadmap

## 13.1 MVP (v1.0)

**Goal:** Working recommendation engine with core personalization

| Feature | Priority | Complexity |
|---------|----------|------------|
| Basic configuration UI | P0 | Low |
| Gemini API integration | P0 | Medium |
| Movie recommendations catalog | P0 | Medium |
| Series recommendations catalog | P0 | Medium |
| Time-of-day context | P0 | Low |
| Day-of-week context | P0 | Low |
| Seasonal context | P0 | Low |
| Genre preferences | P0 | Low |
| Basic caching (L2 only) | P0 | Low |
| Recommendation explanations | P0 | Low |
| Model selection | P0 | Low |
| Preset profiles | P1 | Low |

**Timeline:** 4-6 weeks

---

## 13.2 v2.0 — Enhanced Personalization

**Goal:** Deeper customization, improved UX

| Feature | Priority | Complexity |
|---------|----------|------------|
| L1 in-memory caching | P0 | Low |
| New releases via Gemini search | P0 | Medium |
| Holiday-aware recommendations | P1 | Low |
| Franchise navigator | P1 | Medium |
| Binge-worthy series catalog | P1 | Low |
| "Perfect for Tonight" micro-catalog | P1 | Low |
| Advanced configuration mode | P1 | Medium |
| Confidence scoring display | P2 | Low |
| Era preferences | P2 | Low |

**Timeline:** 4-6 weeks after v1.0

---

## 13.3 v3.0 — Optional Enhancements

**Goal:** Carefully justified expansions

| Feature | Priority | Complexity | Justification Required |
|---------|----------|------------|------------------------|
| Weather-based context | P2 | Medium | Only if external API cost is negligible |
| Multi-profile support | P3 | High | Only if user demand demonstrated |
| Regional content optimization | P3 | Medium | Only if clear value over current approach |
| Watch party recommendations | P3 | High | Only if Stremio adds social features |

**Timeline:** Based on user feedback post-v2.0

---

# Appendix A: Manifest Example

```json
{
  "id": "community.watchwyrd",
  "version": "1.0.0",
  "name": "Watchwyrd",
  "description": "Your viewing fate, revealed — AI-powered personalized movie and series recommendations using Google Gemini",
  "logo": "https://watchwyrd.app/logo.png",
  "resources": ["catalog", "meta"],
  "types": ["movie", "series"],
  "idPrefixes": ["tt"],
  "catalogs": [
    {
      "type": "movie",
      "id": "watchwyrd-movies-main",
      "name": "Watchwyrd: Movies"
    },
    {
      "type": "series",
      "id": "watchwyrd-series-main",
      "name": "Watchwyrd: Series"
    }
  ],
  "behaviorHints": {
    "configurable": true,
    "configurationRequired": true
  },
  "config": [
    {
      "key": "geminiApiKey",
      "type": "password",
      "title": "Gemini API Key",
      "required": true
    },
    {
      "key": "geminiModel",
      "type": "select",
      "title": "Gemini Model",
      "options": ["gemini-3-flash", "gemini-3-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
      "default": "gemini-3-flash"
    },
    {
      "key": "timezone",
      "type": "select",
      "title": "Your Timezone",
      "options": ["America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo", "UTC"],
      "default": "UTC"
    },
    {
      "key": "presetProfile",
      "type": "select",
      "title": "Preference Profile",
      "options": ["casual", "cinephile", "family", "binge_watcher", "discovery", "custom"],
      "default": "casual"
    }
  ]
}
```

---

# Appendix B: Gemini Prompt Template

```
System: You are Watchwyrd, a cinematic oracle that divines personalized movie and TV series recommendations for Stremio users. Generate recommendations as structured JSON, as if revealing fated viewing destinies.

RULES:
1. Return ONLY valid JSON matching the schema below
2. Include exactly {count} recommendations
3. Every item must have a valid IMDb ID (tt-prefixed)
4. Never exceed the user's maxRating
5. Never include excludedGenres
6. Weight genres according to genreWeights
7. Consider the current temporal context
8. Each explanation must be 1-2 sentences, specific to the item
9. Use grounding search ONLY for recent releases when instructed
10. Ensure genre diversity unless user preferences are narrow

OUTPUT SCHEMA:
{
  "recommendations": [
    {
      "imdbId": "string (tt-prefixed)",
      "title": "string",
      "year": number,
      "genres": ["string"],
      "runtime": number (minutes),
      "explanation": "string (1-2 sentences)",
      "contextTags": ["string"],
      "confidenceScore": number (0-1)
    }
  ],
  "metadata": {
    "generatedAt": "ISO 8601 timestamp",
    "searchUsed": boolean
  }
}

USER CONFIGURATION:
{configuration_json}

Generate {content_type} recommendations for the above user.
```

---

# Appendix C: Error Response Schema

```json
{
  "error": {
    "code": "INVALID_API_KEY | QUOTA_EXCEEDED | GEMINI_TIMEOUT | CONFIGURATION_ERROR",
    "message": "Human-readable error description",
    "recoverable": true | false,
    "suggestedAction": "Description of what user can do"
  }
}
```

---

**End of Specification**

*This document represents a complete, implementation-ready specification for the Watchwyrd Stremio addon. All features have been validated against Stremio platform constraints and Gemini API capabilities as of January 2026.*

*"Your viewing fate, revealed."* ✨
