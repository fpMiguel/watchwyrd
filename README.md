<div align="center">

# 🔮 Watchwyrd

**AI-powered movie & TV recommendations for Stremio**

[![Build](https://github.com/fpMiguel/watchwyrd/actions/workflows/ci.yml/badge.svg)](https://github.com/fpMiguel/watchwyrd/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

<img src="docs/watchwyrd_logo_transparent.png" alt="Watchwyrd Logo" width="180">

[Features](#-features) • [Quick Start](#-quick-start) • [Self-Hosting](#-self-hosting) • [Privacy](#-privacy--security)

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

Both catalogs available for **Movies** and **TV Series**, with genre filtering in Stremio's Discover screen.

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
| **OpenStreetMap Nominatim** | Coordinates (on button click) | Reverse geocoding for city detection |
| **Cinemeta** | Titles, years | IMDb metadata lookup |
| **RPDB** | IMDb IDs | Enhanced poster artwork (optional) |

**Not sent to AI**: IP address, watch history, personal info.

---

## 🛠️ Development

```bash
npm install          # Install dependencies
npm run dev          # Dev server with hot reload
npm test             # Run tests
npm run lint         # Lint code
npm run format       # Format code
npm run check        # Full check (typecheck + lint + format + tests)
npm run build        # Production build
```

---

## 📝 License

[MIT License](LICENSE)

---

## 🙏 Acknowledgments

- [Stremio](https://www.stremio.com/) for the platform
- [Google Gemini](https://ai.google.dev/) & [Perplexity](https://www.perplexity.ai/) for AI
- [Open-Meteo](https://open-meteo.com/) for free weather data
- [OpenStreetMap](https://www.openstreetmap.org/) for free geolocation services
- [RatingPosterDB](https://ratingposterdb.com/) for enhanced poster artwork

---

## ⚠️ Disclaimer

> **EXPERIMENTAL SOFTWARE — NO WARRANTY**
>
> This project is provided "AS IS" without warranty of any kind. By using this software:
>
> - You accept **all responsibility** for any API costs, issues, or damages
> - You acknowledge this is an **experiment**, not a production product
> - The authors accept **no liability** for any use or misuse of this software
> - This addon **only recommends content** — it does not provide, host, or stream any media
> - **You are solely responsible** for how you use recommendations and for complying with all applicable laws
> - This addon aggregates metadata from third-party sources — **data accuracy and availability are not guaranteed**
>
> This project does not promote, encourage, or facilitate any illegal activity.
