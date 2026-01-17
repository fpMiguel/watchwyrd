<div align="center">

# 🔮 Watchwyrd

**AI-powered movie & TV recommendations for Stremio**

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

<img src="docs/watchwyrd_logo_transparent.png" alt="Watchwyrd Logo" width="180">

*Your viewing fate, revealed* ✨

[Features](#-features) • [Quick Start](#-quick-start) • [Self-Hosting](#-self-hosting) • [How It Works](#-how-it-works)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧠 **AI-Powered** | Google Gemini or Perplexity AI for intelligent recommendations |
| 🕐 **Context-Aware** | Adapts to time of day, day of week, and weather |
| 🎬 **2 Smart Catalogs** | "For Now" (contextual) and "Random" (surprise picks) |
| 🔒 **Privacy-First** | Your API key, encrypted config, no tracking |
| ⚡ **Fast** | 1-hour cache, connection pooling, parallel requests |

### Catalogs

| Catalog | Description |
|---------|-------------|
| ✨ **For Now** | Perfect picks based on current time, weather, and mood |
| 🎲 **Random** | Surprise recommendations to discover something new |

Both available for **Movies** and **TV Series**, with genre filtering in Stremio's Discover screen.

---

## 🚀 Quick Start

### 1. Get an API Key

| Provider | Link | Notes |
|----------|------|-------|
| **Google Gemini** | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Free tier available |
| **Perplexity AI** | [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) | Paid, includes web search |

### 2. Configure & Install

1. Visit your Watchwyrd instance's `/configure` page
2. Enter your API key and preferences
3. Click **"Install in Stremio"**

That's it! Your personalized catalogs will appear in Stremio.

---

## 🖥️ Self-Hosting

### Docker (Recommended)

```bash
git clone https://github.com/fpMiguel/watchwyrd.git
cd watchwyrd
docker-compose up -d
# Open http://localhost:7000/configure
```

### Node.js

```bash
git clone https://github.com/fpMiguel/watchwyrd.git
cd watchwyrd
npm install
npm run build
npm start
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `7000` | Server port |
| `BASE_URL` | `http://localhost:7000` | Public URL (required for production) |
| `SECRET_KEY` | auto-generated | Encryption key for config URLs |
| `LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error` |

> ⚠️ **Production**: Always set `SECRET_KEY` to a strong, unique value (32+ characters).

---

## 📊 How It Works

```
Stremio → Watchwyrd → AI Provider (Gemini/Perplexity)
                ↓
            Cinemeta → IMDb metadata
                ↓
            Cache (1hr) → Response
```

1. **You configure** preferences (genres, weather, etc.)
2. **Stremio requests** a catalog
3. **Watchwyrd checks cache** — returns immediately if fresh
4. **AI generates** recommendations (title + year + reason)
5. **Cinemeta validates** each title → accurate IMDb IDs & posters
6. **Cached & returned** to Stremio

### Why Cinemeta?

AI models can hallucinate IMDb IDs. Instead, Watchwyrd:
- Asks AI for **title + year** only
- Validates against Stremio's Cinemeta service
- Ensures 100% accurate metadata

---

## ⚙️ Configuration Options

| Option | Description |
|--------|-------------|
| **AI Provider** | Gemini (free tier) or Perplexity (web search) |
| **Content Types** | Movies, Series, or both |
| **Excluded Genres** | Genres you never want to see |
| **Weather Context** | Enable weather-based recommendations |
| **Catalog Size** | 5–50 items per catalog |

---

## 🔒 Privacy & Security

| Principle | Implementation |
|-----------|----------------|
| **Your API Key** | Stored encrypted in your addon URL only |
| **No Tracking** | No accounts, no analytics, no user data stored |
| **Encrypted Config** | AES-256-GCM encryption for URL parameters |
| **Stateless** | Server stores nothing about users |

### Third-Party Services

| Service | Data Sent | Purpose |
|---------|-----------|---------|
| **Gemini/Perplexity** | Preferences, time context | AI recommendations |
| **Open-Meteo** | City coordinates | Weather data (optional) |
| **Cinemeta** | Titles, years | IMDb metadata lookup |

**Not sent to AI**: IP address, watch history, personal info.

---

## 🛠️ Development

```bash
npm install          # Install dependencies
npm run dev          # Dev server with hot reload
npm test             # Run tests
npm run lint         # Lint code
npm run format       # Format code
npm run build        # Production build
```

### Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5
- **Framework**: Express.js
- **Validation**: Zod
- **Testing**: Vitest
- **AI**: Google Gemini / Perplexity API

---

## 📝 License

[MIT License](LICENSE) — use freely, contribute back if you can!

---

## 🙏 Acknowledgments

- [Stremio](https://www.stremio.com/) for the platform
- [Google Gemini](https://ai.google.dev/) & [Perplexity](https://www.perplexity.ai/) for AI
- [Open-Meteo](https://open-meteo.com/) for free weather data

---

<div align="center">

⚠️ **Experimental Software** — Use at your own risk. API costs are your responsibility.

Made with 💜 by the community

</div>
