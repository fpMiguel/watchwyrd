/**
 * Watchwyrd - Configure Page Handler
 *
 * Serves the custom configuration UI and handles form submissions.
 */

import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { serverConfig } from '../config/server.js';
import { PRESET_PROFILES, DEFAULT_GENRE_WEIGHTS } from '../config/schema.js';
import { GeminiClient } from '../gemini/client.js';
import { searchLocations } from '../services/weather.js';
import { logger } from '../utils/logger.js';

// Dev mode API keys (only used in development)
const DEV_GEMINI_KEY =
  process.env['NODE_ENV'] === 'development' ? process.env['GEMINI_API_KEY'] || '' : '';
const DEV_PERPLEXITY_KEY =
  process.env['NODE_ENV'] === 'development' ? process.env['PERPLEXITY_API_KEY'] || '' : '';

/**
 * Generate the configuration page HTML
 */
function generateConfigPage(error?: string, success?: string): string {
  const presetOptions = Object.keys(PRESET_PROFILES)
    .map(
      (p) =>
        `<option value="${p}">${p.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>`
    )
    .join('\n');

  const genreCheckboxes = Object.keys(DEFAULT_GENRE_WEIGHTS)
    .map(
      (g) => `
      <label class="genre-item">
        <input type="checkbox" name="genres" value="${g}" checked>
        <span>${g}</span>
      </label>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Watchwyrd - Configure</title>
  <link rel="icon" type="image/png" href="/static/favicon.png">
  <style>
    :root {
      --bg-dark: #0d1117;
      --bg-card: #161b22;
      --bg-input: #21262d;
      --border: #30363d;
      --text: #c9d1d9;
      --text-muted: #8b949e;
      --accent: #7c3aed;
      --accent-hover: #8b5cf6;
      --success: #238636;
      --error: #f85149;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg-dark);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    header {
      text-align: center;
      margin-bottom: 2rem;
    }

    h1 {
      font-size: 2.5rem;
      background: linear-gradient(135deg, var(--accent), #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
    }

    .tagline {
      color: var(--text-muted);
      font-style: italic;
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 1.5rem;
    }

    .card h2 {
      font-size: 1.25rem;
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    input[type="text"],
    input[type="password"],
    select {
      width: 100%;
      padding: 0.75rem 1rem;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-size: 1rem;
    }

    input:focus,
    select:focus {
      outline: none;
      border-color: var(--accent);
    }

    .help-text {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: 0.5rem;
    }

    .checkbox-group {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .genre-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.75rem;
    }

    .genre-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      background: var(--bg-input);
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .genre-item:hover {
      background: var(--border);
    }

    .slider-container {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    input[type="range"] {
      flex: 1;
      -webkit-appearance: none;
      background: var(--bg-input);
      border-radius: 8px;
      height: 8px;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      background: var(--accent);
      border-radius: 50%;
      cursor: pointer;
    }

    .slider-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .btn {
      display: inline-block;
      padding: 0.875rem 2rem;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn:hover {
      background: var(--accent-hover);
    }

    .btn-block {
      display: block;
      width: 100%;
    }

    .alert {
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }

    .alert-error {
      background: rgba(248, 81, 73, 0.1);
      border: 1px solid var(--error);
      color: var(--error);
    }

    .alert-success {
      background: rgba(35, 134, 54, 0.1);
      border: 1px solid var(--success);
      color: var(--success);
    }

    .install-url {
      margin-top: 1.5rem;
      padding: 1rem;
      background: var(--bg-input);
      border-radius: 8px;
      word-break: break-all;
      font-family: monospace;
      font-size: 0.875rem;
    }

    .install-url a {
      color: var(--accent);
      text-decoration: none;
    }

    .install-url a:hover {
      text-decoration: underline;
    }

    footer {
      text-align: center;
      margin-top: 2rem;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    footer a {
      color: var(--accent);
      text-decoration: none;
    }

    .button-group {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .button-group .btn {
      flex: 1;
    }

    .btn-secondary {
      background: var(--bg-input);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: var(--border);
    }

    /* Modal Styles */
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .modal-content {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid var(--border);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.5rem;
    }

    .modal-close {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 2rem;
      cursor: pointer;
      line-height: 1;
    }

    .modal-close:hover {
      color: var(--text);
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }

    /* Preview Results */
    .preview-section {
      margin-bottom: 2rem;
    }

    .preview-section h3 {
      margin-bottom: 1rem;
      color: var(--accent);
    }

    .preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 1rem;
    }

    .preview-item {
      background: var(--bg-input);
      border-radius: 8px;
      overflow: hidden;
      transition: transform 0.2s;
    }

    .preview-item:hover {
      transform: scale(1.05);
    }

    .preview-poster {
      width: 100%;
      aspect-ratio: 2/3;
      object-fit: cover;
      background: var(--border);
    }

    .preview-info {
      padding: 0.75rem;
    }

    .preview-title {
      font-weight: 600;
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .preview-year {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .preview-explanation {
      font-size: 0.7rem;
      color: var(--text-muted);
      margin-top: 0.5rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .preview-loading {
      text-align: center;
      padding: 3rem;
    }

    .preview-loading .spinner {
      display: inline-block;
      width: 40px;
      height: 40px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .preview-error {
      text-align: center;
      padding: 2rem;
      color: var(--error);
    }

    .preview-empty {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <img src="/static/logo-large.png" alt="Watchwyrd Logo" style="width: 120px; height: 120px; margin-bottom: 0.5rem;">
      <h1 style="margin-top: 0;">Watchwyrd</h1>
      <p class="tagline">Your viewing fate, revealed</p>
    </header>

    ${error ? `<div class="alert alert-error">${error}</div>` : ''}
    ${success ? `<div class="alert alert-success">${success}</div>` : ''}

    <form method="POST" action="/configure">
      <div class="card">
        <h2>🔑 AI Provider Configuration</h2>

        <div class="form-group">
          <label for="aiProvider">AI Provider *</label>
          <select id="aiProvider" name="aiProvider">
            <option value="gemini" selected>Google Gemini</option>
            <option value="perplexity">Perplexity AI</option>
          </select>
          <p class="help-text">Choose your AI provider for generating recommendations</p>
        </div>

        <!-- Gemini Configuration -->
        <div id="geminiConfig">
          <div class="form-group">
            <label for="geminiApiKey">Gemini API Key *</label>
            <input type="password" id="geminiApiKey" name="geminiApiKey"
                   placeholder="Enter your Gemini API key"
                   value="${DEV_GEMINI_KEY}">
            <p class="help-text">
              Get your API key from
              <a href="https://aistudio.google.com/apikey" target="_blank" style="color: var(--accent)">
                Google AI Studio
              </a>
              ${DEV_GEMINI_KEY ? '<span style="color: var(--success);">✓ Dev key auto-filled</span>' : ''}
            </p>
            <p id="geminiKeyStatus" class="help-text" style="display: none;"></p>
          </div>

          <div class="form-group">
            <label for="geminiModel">Gemini Model</label>
            <select id="geminiModel" name="geminiModel">
              <option value="gemini-2.5-flash" selected>Gemini 2.5 Flash ✓ Free tier</option>
              <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite ✓ Free tier (Fastest)</option>
              <option value="gemini-3-flash">Gemini 2.0 Flash ✓ Free tier</option>
              <option value="gemini-3-pro">Gemini 2.5 Pro (Best Quality, Paid)</option>
            </select>
            <p class="help-text">✓ = Included in free tier. Free tier has rate limits.</p>
          </div>
        </div>

        <!-- Perplexity Configuration -->
        <div id="perplexityConfig" style="display: none;">
          <div class="form-group">
            <label for="perplexityApiKey">Perplexity API Key *</label>
            <input type="password" id="perplexityApiKey" name="perplexityApiKey"
                   placeholder="Enter your Perplexity API key"
                   value="${DEV_PERPLEXITY_KEY}">
            <p class="help-text">
              Get your API key from
              <a href="https://www.perplexity.ai/settings/api" target="_blank" style="color: var(--accent)">
                Perplexity Settings
              </a>
              ${DEV_PERPLEXITY_KEY ? '<span style="color: var(--success);">✓ Dev key auto-filled</span>' : ''}
            </p>
            <p id="perplexityKeyStatus" class="help-text" style="display: none;"></p>
          </div>

          <div class="form-group">
            <label for="perplexityModel">Perplexity Model</label>
            <select id="perplexityModel" name="perplexityModel">
              <option value="sonar-pro" selected>Sonar Pro (Recommended)</option>
              <option value="sonar">Sonar (Lightweight)</option>
              <option value="sonar-reasoning-pro">Sonar Reasoning Pro (Best)</option>
            </select>
            <p class="help-text">Perplexity includes web search for up-to-date recommendations</p>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>🌍 Your Location</h2>

        <div class="form-group">
          <label for="timezone">Timezone</label>
          <select id="timezone" name="timezone">
            <option value="">Detecting...</option>
          </select>
          <p class="help-text">Auto-detected from your browser. Change if needed.</p>
        </div>

        <div class="form-group">
          <label for="country">Country (for holiday detection)</label>
          <select id="country" name="country">
            <option value="">Detecting...</option>
          </select>
          <p class="help-text">Used for holiday-themed recommendations</p>
        </div>
      </div>

      <div class="card">
        <h2>🎬 Content Preferences</h2>

        <div class="form-group">
          <label for="presetProfile">Quick Setup Profile</label>
          <select id="presetProfile" name="presetProfile">
            ${presetOptions}
          </select>
          <p class="help-text">Choose a preset or select "Custom" to configure everything manually</p>
        </div>

        <div class="form-group">
          <label>Content Types</label>
          <div class="checkbox-group">
            <label>
              <input type="checkbox" name="includeMovies" value="true" checked>
              <span>Movies</span>
            </label>
            <label>
              <input type="checkbox" name="includeSeries" value="true" checked>
              <span>TV Series</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label for="maxRating">Maximum Content Rating</label>
          <select id="maxRating" name="maxRating">
            <option value="G">G (General Audiences)</option>
            <option value="PG">PG (Parental Guidance)</option>
            <option value="PG-13">PG-13 (Parents Cautioned)</option>
            <option value="R" selected>R (Restricted)</option>
            <option value="NC-17">NC-17 (Adults Only)</option>
          </select>
        </div>
      </div>

      <div class="card">
        <h2>🎯 Discovery Preferences</h2>

        <div class="form-group">
          <label>Novelty Preference</label>
          <div class="slider-container">
            <input type="range" id="noveltyBias" name="noveltyBias" min="0" max="100" value="50">
            <span id="noveltyValue">50</span>
          </div>
          <div class="slider-labels">
            <span>Timeless Classics</span>
            <span>New Releases</span>
          </div>
        </div>

        <div class="form-group">
          <label>Popularity Preference</label>
          <div class="slider-container">
            <input type="range" id="popularityBias" name="popularityBias" min="0" max="100" value="50">
            <span id="popularityValue">50</span>
          </div>
          <div class="slider-labels">
            <span>Hidden Gems</span>
            <span>Mainstream Hits</span>
          </div>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" name="includeNewReleases" value="true" checked>
            <span>Include content released in the last 6 months (uses Gemini search)</span>
          </label>
        </div>
      </div>

      <div class="card">
        <h2>🎭 Genre Preferences</h2>
        <p class="help-text" style="margin-bottom: 1rem">Uncheck genres you want to exclude</p>
        <div class="genre-grid">
          ${genreCheckboxes}
        </div>
      </div>

      <div class="card">
        <h2>⚙️ Features</h2>

        <div class="form-group checkbox-group" style="flex-direction: column; gap: 1rem;">
          <label>
            <input type="checkbox" name="enableSeasonalThemes" value="true" checked>
            <span>Seasonal recommendations (holidays, seasons)</span>
          </label>
          <label>
            <input type="checkbox" name="enableTimeContext" value="true" checked>
            <span>Time-aware recommendations (morning, evening, etc.)</span>
          </label>
          <label>
            <input type="checkbox" name="enableWeatherContext" value="true" id="weatherToggle">
            <span>🌤️ Weather-based recommendations (match mood to weather)</span>
          </label>
          
          <!-- Weather Location Search (shown when weather is enabled) -->
          <div id="weatherLocationSection" style="display: none; margin-top: 1rem; padding-left: 1.5rem;">
            <label class="form-label">📍 Your Location (for weather)</label>
            <div style="position: relative;">
              <input 
                type="text" 
                id="locationSearch" 
                class="input" 
                placeholder="Search for your city..."
                autocomplete="off"
                style="width: 100%;"
              >
              <div id="locationResults" class="dropdown-menu" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-input); border: 1px solid var(--border); border-radius: 8px; max-height: 200px; overflow-y: auto; z-index: 100;"></div>
            </div>
            <input type="hidden" name="weatherLocationName" id="weatherLocationName">
            <input type="hidden" name="weatherLocationCountry" id="weatherLocationCountry">
            <input type="hidden" name="weatherLocationLat" id="weatherLocationLat">
            <input type="hidden" name="weatherLocationLon" id="weatherLocationLon">
            <input type="hidden" name="weatherLocationAdmin1" id="weatherLocationAdmin1">
            <p id="selectedLocation" style="margin-top: 0.5rem; color: var(--text-muted); font-size: 0.9rem;"></p>
          </div>
          
          <label>
            <input type="checkbox" name="showExplanations" value="true" checked>
            <span>Show why each title was recommended</span>
          </label>
        </div>
      </div>

      <div class="button-group">
        <button type="button" class="btn btn-secondary btn-block" id="previewBtn">
          👁️ Preview Recommendations
        </button>
        <button type="submit" class="btn btn-block">
          <img src="/static/icon.png" alt="" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 6px;">
          Generate Install Link
        </button>
      </div>
    </form>

    <!-- Preview Modal -->
    <div id="previewModal" class="modal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h2>🎬 Preview Recommendations</h2>
          <button class="modal-close" id="closeModal">&times;</button>
        </div>
        <div class="modal-body" id="previewResults">
          <p>Loading recommendations...</p>
        </div>
      </div>
    </div>

    <footer>
      <p>
        Watchwyrd is open source •
        <a href="https://github.com/fpMiguel/watchwyrd" target="_blank">GitHub</a>
      </p>
    </footer>
  </div>

  <script>
    // Update slider values
    document.getElementById('noveltyBias').addEventListener('input', (e) => {
      document.getElementById('noveltyValue').textContent = e.target.value;
    });
    document.getElementById('popularityBias').addEventListener('input', (e) => {
      document.getElementById('popularityValue').textContent = e.target.value;
    });

    // =========================================================================
    // Timezone and Country Auto-Detection
    // =========================================================================

    // All IANA timezones grouped by region
    const timezonesByRegion = {
      'Americas': [
        'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
        'America/Anchorage', 'America/Phoenix', 'America/Toronto', 'America/Vancouver',
        'America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Santiago',
        'America/Buenos_Aires', 'America/Sao_Paulo', 'America/Caracas', 'Pacific/Honolulu'
      ],
      'Europe': [
        'Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
        'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Vienna',
        'Europe/Warsaw', 'Europe/Prague', 'Europe/Stockholm', 'Europe/Oslo',
        'Europe/Helsinki', 'Europe/Athens', 'Europe/Moscow', 'Europe/Istanbul'
      ],
      'Asia': [
        'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore',
        'Asia/Taipei', 'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Manila', 'Asia/Kolkata',
        'Asia/Mumbai', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Tehran', 'Asia/Jerusalem',
        'Asia/Karachi', 'Asia/Dhaka', 'Asia/Kuala_Lumpur', 'Asia/Ho_Chi_Minh'
      ],
      'Oceania': [
        'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth',
        'Australia/Adelaide', 'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Guam'
      ],
      'Africa': [
        'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
        'Africa/Casablanca', 'Africa/Algiers', 'Africa/Tunis'
      ],
      'Other': ['UTC']
    };

    // Countries with ISO codes
    const countries = [
      { code: 'US', name: 'United States' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'CA', name: 'Canada' },
      { code: 'AU', name: 'Australia' },
      { code: 'NZ', name: 'New Zealand' },
      { code: 'DE', name: 'Germany' },
      { code: 'FR', name: 'France' },
      { code: 'ES', name: 'Spain' },
      { code: 'IT', name: 'Italy' },
      { code: 'NL', name: 'Netherlands' },
      { code: 'BE', name: 'Belgium' },
      { code: 'AT', name: 'Austria' },
      { code: 'CH', name: 'Switzerland' },
      { code: 'SE', name: 'Sweden' },
      { code: 'NO', name: 'Norway' },
      { code: 'DK', name: 'Denmark' },
      { code: 'FI', name: 'Finland' },
      { code: 'PL', name: 'Poland' },
      { code: 'PT', name: 'Portugal' },
      { code: 'IE', name: 'Ireland' },
      { code: 'JP', name: 'Japan' },
      { code: 'KR', name: 'South Korea' },
      { code: 'CN', name: 'China' },
      { code: 'TW', name: 'Taiwan' },
      { code: 'HK', name: 'Hong Kong' },
      { code: 'SG', name: 'Singapore' },
      { code: 'MY', name: 'Malaysia' },
      { code: 'TH', name: 'Thailand' },
      { code: 'PH', name: 'Philippines' },
      { code: 'ID', name: 'Indonesia' },
      { code: 'VN', name: 'Vietnam' },
      { code: 'IN', name: 'India' },
      { code: 'PK', name: 'Pakistan' },
      { code: 'AE', name: 'United Arab Emirates' },
      { code: 'SA', name: 'Saudi Arabia' },
      { code: 'IL', name: 'Israel' },
      { code: 'TR', name: 'Turkey' },
      { code: 'RU', name: 'Russia' },
      { code: 'BR', name: 'Brazil' },
      { code: 'MX', name: 'Mexico' },
      { code: 'AR', name: 'Argentina' },
      { code: 'CL', name: 'Chile' },
      { code: 'CO', name: 'Colombia' },
      { code: 'PE', name: 'Peru' },
      { code: 'ZA', name: 'South Africa' },
      { code: 'EG', name: 'Egypt' },
      { code: 'NG', name: 'Nigeria' },
      { code: 'KE', name: 'Kenya' },
      { code: 'OTHER', name: 'Other' }
    ];

    // Timezone to country mapping for auto-detection
    const tzToCountry = {
      'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
      'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US',
      'Pacific/Honolulu': 'US', 'America/Toronto': 'CA', 'America/Vancouver': 'CA',
      'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Paris': 'FR',
      'Europe/Berlin': 'DE', 'Europe/Rome': 'IT', 'Europe/Madrid': 'ES',
      'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Vienna': 'AT',
      'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ', 'Europe/Stockholm': 'SE',
      'Europe/Oslo': 'NO', 'Europe/Helsinki': 'FI', 'Europe/Athens': 'GR',
      'Europe/Moscow': 'RU', 'Europe/Istanbul': 'TR',
      'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Shanghai': 'CN',
      'Asia/Hong_Kong': 'HK', 'Asia/Singapore': 'SG', 'Asia/Taipei': 'TW',
      'Asia/Bangkok': 'TH', 'Asia/Jakarta': 'ID', 'Asia/Manila': 'PH',
      'Asia/Kolkata': 'IN', 'Asia/Mumbai': 'IN', 'Asia/Dubai': 'AE',
      'Asia/Riyadh': 'SA', 'Asia/Tehran': 'IR', 'Asia/Jerusalem': 'IL',
      'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
      'Australia/Perth': 'AU', 'Pacific/Auckland': 'NZ',
      'America/Mexico_City': 'MX', 'America/Bogota': 'CO', 'America/Lima': 'PE',
      'America/Santiago': 'CL', 'America/Buenos_Aires': 'AR', 'America/Sao_Paulo': 'BR',
      'Africa/Cairo': 'EG', 'Africa/Johannesburg': 'ZA', 'Africa/Lagos': 'NG',
      'Africa/Nairobi': 'KE'
    };

    // Populate timezone select
    function populateTimezones() {
      const select = document.getElementById('timezone');
      select.innerHTML = '';
      
      for (const [region, zones] of Object.entries(timezonesByRegion)) {
        const group = document.createElement('optgroup');
        group.label = region;
        
        for (const tz of zones) {
          const option = document.createElement('option');
          option.value = tz;
          // Format: "New York (UTC-5)" 
          try {
            const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: tz,
              timeZoneName: 'short'
            });
            const parts = formatter.formatToParts(new Date());
            const tzName = parts.find(p => p.type === 'timeZoneName')?.value || '';
            const cityName = tz.split('/').pop().replace(/_/g, ' ');
            option.textContent = cityName + ' (' + tzName + ')';
          } catch {
            option.textContent = tz;
          }
          group.appendChild(option);
        }
        
        select.appendChild(group);
      }
    }

    // Populate country select
    function populateCountries() {
      const select = document.getElementById('country');
      select.innerHTML = '';
      
      for (const country of countries) {
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = country.name;
        select.appendChild(option);
      }
    }

    // Auto-detect timezone and country
    function autoDetectLocation() {
      // Detect timezone from browser
      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const tzSelect = document.getElementById('timezone');
      
      // Set detected timezone
      for (const option of tzSelect.options) {
        if (option.value === detectedTz) {
          option.selected = true;
          break;
        }
      }
      
      // If not found in our list, add it
      if (!tzSelect.value || tzSelect.value !== detectedTz) {
        const option = document.createElement('option');
        option.value = detectedTz;
        option.textContent = detectedTz.split('/').pop().replace(/_/g, ' ') + ' (Detected)';
        option.selected = true;
        tzSelect.insertBefore(option, tzSelect.firstChild);
      }
      
      // Detect country from timezone
      const detectedCountry = tzToCountry[detectedTz] || 'US';
      const countrySelect = document.getElementById('country');
      
      for (const option of countrySelect.options) {
        if (option.value === detectedCountry) {
          option.selected = true;
          break;
        }
      }
    }

    // =========================================================================
    // Provider Switching
    // =========================================================================
    
    const aiProviderSelect = document.getElementById('aiProvider');
    const geminiConfigDiv = document.getElementById('geminiConfig');
    const perplexityConfigDiv = document.getElementById('perplexityConfig');
    
    aiProviderSelect.addEventListener('change', () => {
      const provider = aiProviderSelect.value;
      
      if (provider === 'gemini') {
        geminiConfigDiv.style.display = 'block';
        perplexityConfigDiv.style.display = 'none';
      } else {
        geminiConfigDiv.style.display = 'none';
        perplexityConfigDiv.style.display = 'block';
      }
    });

    // =========================================================================
    // Gemini API Key Validation
    // =========================================================================
    
    let geminiValidationTimeout = null;
    const geminiApiKeyInput = document.getElementById('geminiApiKey');
    const geminiKeyStatus = document.getElementById('geminiKeyStatus');
    const geminiModelSelect = document.getElementById('geminiModel');
    
    // Initially disable model select until API key is validated
    geminiModelSelect.disabled = true;
    geminiModelSelect.innerHTML = '<option value="">Enter API key first...</option>';
    
    geminiApiKeyInput.addEventListener('input', () => {
      // Debounce validation
      if (geminiValidationTimeout) clearTimeout(geminiValidationTimeout);
      
      const key = geminiApiKeyInput.value.trim();
      if (key.length < 20) {
        geminiKeyStatus.style.display = 'none';
        geminiModelSelect.disabled = true;
        geminiModelSelect.innerHTML = '<option value="">Enter API key first...</option>';
        return;
      }
      
      geminiKeyStatus.innerHTML = '⏳ Validating API key and fetching available models...';
      geminiKeyStatus.style.color = 'var(--text-muted)';
      geminiKeyStatus.style.display = 'block';
      geminiModelSelect.disabled = true;
      geminiModelSelect.innerHTML = '<option value="">Loading models...</option>';
      
      geminiValidationTimeout = setTimeout(async () => {
        try {
          const response = await fetch('/configure/validate-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'gemini', apiKey: key })
          });
          
          const result = await response.json();
          
          if (result.valid) {
            const availableCount = result.models.filter(m => m.available).length;
            geminiKeyStatus.innerHTML = '✓ API key valid! ' + availableCount + ' models available.';
            geminiKeyStatus.style.color = 'var(--success)';
            
            // Update model dropdown with availability info
            geminiModelSelect.innerHTML = '';
            geminiModelSelect.disabled = false;
            
            let hasAvailable = false;
            for (const model of result.models) {
              const option = document.createElement('option');
              option.value = model.id;
              
              let label = model.name;
              if (model.available) {
                hasAvailable = true;
                if (model.freeTier) {
                  label += ' ✓ Free';
                } else {
                  label += ' 💰 Paid';
                }
              } else {
                label += ' ❌ Not available';
                option.disabled = true;
                option.style.color = 'var(--text-muted)';
              }
              
              option.textContent = label;
              geminiModelSelect.appendChild(option);
            }
            
            // Select first available model
            if (hasAvailable) {
              for (const option of geminiModelSelect.options) {
                if (!option.disabled) {
                  option.selected = true;
                  break;
                }
              }
            }
          } else {
            // Show detailed error message
            geminiKeyStatus.innerHTML = '<strong style="color: var(--error)">✗ Error:</strong> ' + 
              (result.error || 'Invalid API key');
            geminiKeyStatus.style.color = 'var(--error)';
            geminiModelSelect.disabled = true;
            geminiModelSelect.innerHTML = '<option value="">Fix API key error first...</option>';
          }
        } catch (err) {
          geminiKeyStatus.innerHTML = '<strong style="color: var(--error)">✗ Network Error:</strong> Could not connect to validation service. Check your internet connection.';
          geminiKeyStatus.style.color = 'var(--error)';
          geminiModelSelect.disabled = true;
          geminiModelSelect.innerHTML = '<option value="">Validation failed...</option>';
        }
      }, 800);
    });

    // =========================================================================
    // Perplexity API Key Validation
    // =========================================================================
    
    let perplexityValidationTimeout = null;
    const perplexityApiKeyInput = document.getElementById('perplexityApiKey');
    const perplexityKeyStatus = document.getElementById('perplexityKeyStatus');
    const perplexityModelSelect = document.getElementById('perplexityModel');
    
    perplexityApiKeyInput.addEventListener('input', () => {
      // Debounce validation
      if (perplexityValidationTimeout) clearTimeout(perplexityValidationTimeout);
      
      const key = perplexityApiKeyInput.value.trim();
      if (key.length < 20) {
        perplexityKeyStatus.style.display = 'none';
        return;
      }
      
      perplexityKeyStatus.innerHTML = '⏳ Validating Perplexity API key...';
      perplexityKeyStatus.style.color = 'var(--text-muted)';
      perplexityKeyStatus.style.display = 'block';
      
      perplexityValidationTimeout = setTimeout(async () => {
        try {
          const response = await fetch('/configure/validate-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'perplexity', apiKey: key })
          });
          
          const result = await response.json();
          
          if (result.valid) {
            perplexityKeyStatus.innerHTML = '✓ API key valid! Perplexity models are ready to use.';
            perplexityKeyStatus.style.color = 'var(--success)';
          } else {
            perplexityKeyStatus.innerHTML = '<strong style="color: var(--error)">✗ Error:</strong> ' + 
              (result.error || 'Invalid API key');
            perplexityKeyStatus.style.color = 'var(--error)';
          }
        } catch (err) {
          perplexityKeyStatus.innerHTML = '<strong style="color: var(--error)">✗ Network Error:</strong> Could not connect to validation service.';
          perplexityKeyStatus.style.color = 'var(--error)';
        }
      }, 800);
    });

    // Initialize on page load
    populateTimezones();
    populateCountries();
    autoDetectLocation();
    
    // Auto-validate pre-filled API keys (dev mode)
    if (geminiApiKeyInput.value.length >= 20) {
      // Trigger validation for pre-filled Gemini key
      geminiApiKeyInput.dispatchEvent(new Event('input'));
    }
    if (perplexityApiKeyInput.value.length >= 20) {
      // Trigger validation for pre-filled Perplexity key
      perplexityApiKeyInput.dispatchEvent(new Event('input'));
    }

    // =========================================================================
    // Preview Functionality
    // =========================================================================
    
    const previewBtn = document.getElementById('previewBtn');
    const previewModal = document.getElementById('previewModal');
    const closeModalBtn = document.getElementById('closeModal');
    const previewResults = document.getElementById('previewResults');
    
    // Close modal handlers
    closeModalBtn.addEventListener('click', () => {
      previewModal.style.display = 'none';
    });
    
    previewModal.addEventListener('click', (e) => {
      if (e.target === previewModal) {
        previewModal.style.display = 'none';
      }
    });
    
    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && previewModal.style.display !== 'none') {
        previewModal.style.display = 'none';
      }
    });
    
    // Preview button click handler
    previewBtn.addEventListener('click', async () => {
      const provider = document.getElementById('aiProvider').value;
      let apiKey, modelSelect;
      
      if (provider === 'gemini') {
        apiKey = document.getElementById('geminiApiKey').value.trim();
        modelSelect = document.getElementById('geminiModel');
        
        if (!apiKey || apiKey.length < 20) {
          alert('Please enter a valid Gemini API key first');
          return;
        }
        
        if (modelSelect.disabled) {
          alert('Please wait for API key validation to complete');
          return;
        }
      } else {
        apiKey = document.getElementById('perplexityApiKey').value.trim();
        
        if (!apiKey || apiKey.length < 20) {
          alert('Please enter a valid Perplexity API key first');
          return;
        }
      }
      
      // Show modal with loading state
      previewModal.style.display = 'flex';
      previewResults.innerHTML = \`
        <div class="preview-loading">
          <div class="spinner"></div>
          <p style="margin-top: 1rem;">Generating recommendations with AI...</p>
          <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">This may take 20-30 seconds</p>
        </div>
      \`;
      
      // Build config from form
      const form = document.querySelector('form');
      const formData = new FormData(form);
      const config = {
        aiProvider: formData.get('aiProvider'),
        geminiApiKey: formData.get('geminiApiKey'),
        geminiModel: formData.get('geminiModel'),
        perplexityApiKey: formData.get('perplexityApiKey'),
        perplexityModel: formData.get('perplexityModel'),
        timezone: formData.get('timezone'),
        country: formData.get('country'),
        presetProfile: formData.get('presetProfile'),
        includeMovies: formData.get('includeMovies') === 'true',
        includeSeries: formData.get('includeSeries') === 'true',
        maxRating: formData.get('maxRating'),
        noveltyBias: parseInt(formData.get('noveltyBias')) || 50,
        popularityBias: parseInt(formData.get('popularityBias')) || 50,
        includeNewReleases: formData.get('includeNewReleases') === 'true',
        enableSeasonalThemes: formData.get('enableSeasonalThemes') === 'true',
        enableTimeContext: formData.get('enableTimeContext') === 'true',
        enableWeatherContext: formData.get('enableWeatherContext') === 'true',
        showExplanations: formData.get('showExplanations') === 'true',
        preferredLanguages: ['en'],
        excludedGenres: []
      };
      
      // Add weather location if set
      const weatherLat = formData.get('weatherLocationLat');
      const weatherLon = formData.get('weatherLocationLon');
      if (weatherLat && weatherLon && config.enableWeatherContext) {
        config.weatherLocation = {
          name: formData.get('weatherLocationName') || '',
          country: formData.get('weatherLocationCountry') || '',
          latitude: parseFloat(weatherLat),
          longitude: parseFloat(weatherLon),
          admin1: formData.get('weatherLocationAdmin1') || ''
        };
      }
      
      // Get selected genres and determine excluded
      const allGenres = Array.from(document.querySelectorAll('input[name="genres"]')).map(el => el.value);
      const selectedGenres = Array.from(document.querySelectorAll('input[name="genres"]:checked')).map(el => el.value);
      config.excludedGenres = allGenres.filter(g => !selectedGenres.includes(g));
      
      // Base64 encode config
      const configBase64 = btoa(JSON.stringify(config));
      
      try {
        // Fetch both movie and series catalogs
        const results = { movies: null, series: null };
        const errors = [];
        
        if (config.includeMovies) {
          try {
            const movieResponse = await fetch(\`/\${configBase64}/catalog/movie/watchwyrd-movies-main.json\`);
            if (movieResponse.ok) {
              results.movies = await movieResponse.json();
            } else {
              const err = await movieResponse.json();
              errors.push('Movies: ' + (err.error || 'Failed to load'));
            }
          } catch (e) {
            errors.push('Movies: Network error');
          }
        }
        
        if (config.includeSeries) {
          try {
            const seriesResponse = await fetch(\`/\${configBase64}/catalog/series/watchwyrd-series-main.json\`);
            if (seriesResponse.ok) {
              results.series = await seriesResponse.json();
            } else {
              const err = await seriesResponse.json();
              errors.push('Series: ' + (err.error || 'Failed to load'));
            }
          } catch (e) {
            errors.push('Series: Network error');
          }
        }
        
        // Render results
        let html = '';
        
        if (errors.length > 0) {
          html += \`<div class="preview-error">⚠️ \${errors.join(' | ')}</div>\`;
        }
        
        if (results.movies && results.movies.metas && results.movies.metas.length > 0) {
          html += \`
            <div class="preview-section">
              <h3>🎬 Movies (\${results.movies.metas.length} recommendations)</h3>
              <div class="preview-grid">
                \${results.movies.metas.map(meta => \`
                  <div class="preview-item">
                    <img class="preview-poster" src="\${meta.poster || ''}" alt="\${meta.name}" 
                         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 150%22><rect fill=%22%2321262d%22 width=%22100%22 height=%22150%22/><text x=%2250%22 y=%2275%22 text-anchor=%22middle%22 fill=%22%238b949e%22 font-size=%2210%22>No Poster</text></svg>'">
                    <div class="preview-info">
                      <div class="preview-title" title="\${meta.name}">\${meta.name}</div>
                      <div class="preview-year">\${meta.releaseInfo || meta.year || ''}</div>
                      \${meta.description ? \`<div class="preview-explanation">\${meta.description.replace(/✨ /, '').split('\\n')[0]}</div>\` : ''}
                    </div>
                  </div>
                \`).join('')}
              </div>
            </div>
          \`;
        }
        
        if (results.series && results.series.metas && results.series.metas.length > 0) {
          html += \`
            <div class="preview-section">
              <h3>📺 Series (\${results.series.metas.length} recommendations)</h3>
              <div class="preview-grid">
                \${results.series.metas.map(meta => \`
                  <div class="preview-item">
                    <img class="preview-poster" src="\${meta.poster || ''}" alt="\${meta.name}"
                         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 150%22><rect fill=%22%2321262d%22 width=%22100%22 height=%22150%22/><text x=%2250%22 y=%2275%22 text-anchor=%22middle%22 fill=%22%238b949e%22 font-size=%2210%22>No Poster</text></svg>'">
                    <div class="preview-info">
                      <div class="preview-title" title="\${meta.name}">\${meta.name}</div>
                      <div class="preview-year">\${meta.releaseInfo || meta.year || ''}</div>
                      \${meta.description ? \`<div class="preview-explanation">\${meta.description.replace(/✨ /, '').split('\\n')[0]}</div>\` : ''}
                    </div>
                  </div>
                \`).join('')}
              </div>
            </div>
          \`;
        }
        
        if (!html || html.trim() === '' || 
            ((!results.movies || !results.movies.metas || results.movies.metas.length === 0) && 
             (!results.series || !results.series.metas || results.series.metas.length === 0))) {
          html = '<div class="preview-empty">No recommendations generated. Try different settings or check your API key.</div>';
        }
        
        previewResults.innerHTML = html;
        
      } catch (err) {
        previewResults.innerHTML = \`
          <div class="preview-error">
            <p>❌ Failed to generate preview</p>
            <p style="font-size: 0.875rem; margin-top: 0.5rem;">\${err.message || 'Unknown error'}</p>
          </div>
        \`;
      }
    });

    // =========================================================================
    // Weather Location Search with Autocomplete
    // =========================================================================
    
    const weatherToggle = document.getElementById('weatherToggle');
    const weatherLocationSection = document.getElementById('weatherLocationSection');
    const locationSearch = document.getElementById('locationSearch');
    const locationResults = document.getElementById('locationResults');
    const selectedLocation = document.getElementById('selectedLocation');
    
    let searchTimeout = null;
    
    // Show/hide weather location section based on toggle
    weatherToggle.addEventListener('change', () => {
      weatherLocationSection.style.display = weatherToggle.checked ? 'block' : 'none';
    });
    
    // Location search with debounce
    locationSearch.addEventListener('input', () => {
      const query = locationSearch.value.trim();
      
      // Clear previous timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      if (query.length < 2) {
        locationResults.style.display = 'none';
        return;
      }
      
      // Debounce: wait 300ms after user stops typing
      searchTimeout = setTimeout(async () => {
        try {
          const response = await fetch(\`/configure/search-locations?q=\${encodeURIComponent(query)}\`);
          const data = await response.json();
          
          if (data.results && data.results.length > 0) {
            locationResults.innerHTML = data.results.map(loc => \`
              <div class="location-item" 
                   style="padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid var(--border);"
                   data-name="\${loc.name}"
                   data-country="\${loc.country}"
                   data-lat="\${loc.latitude}"
                   data-lon="\${loc.longitude}"
                   data-admin1="\${loc.admin1 || ''}"
                   data-label="\${loc.label}">
                📍 \${loc.label}
              </div>
            \`).join('');
            locationResults.style.display = 'block';
            
            // Add click handlers
            locationResults.querySelectorAll('.location-item').forEach(item => {
              item.addEventListener('click', () => selectLocation(item));
              item.addEventListener('mouseenter', () => item.style.background = 'var(--bg-card)');
              item.addEventListener('mouseleave', () => item.style.background = 'transparent');
            });
          } else {
            locationResults.innerHTML = '<div style="padding: 0.75rem 1rem; color: var(--text-muted);">No locations found</div>';
            locationResults.style.display = 'block';
          }
        } catch (err) {
          console.error('Location search error:', err);
          locationResults.style.display = 'none';
        }
      }, 300);
    });
    
    // Select a location from the dropdown
    function selectLocation(item) {
      const name = item.dataset.name;
      const country = item.dataset.country;
      const lat = item.dataset.lat;
      const lon = item.dataset.lon;
      const admin1 = item.dataset.admin1;
      const label = item.dataset.label;
      
      // Update hidden fields
      document.getElementById('weatherLocationName').value = name;
      document.getElementById('weatherLocationCountry').value = country;
      document.getElementById('weatherLocationLat').value = lat;
      document.getElementById('weatherLocationLon').value = lon;
      document.getElementById('weatherLocationAdmin1').value = admin1;
      
      // Update UI
      locationSearch.value = label;
      selectedLocation.textContent = \`✓ Weather location set to \${label}\`;
      selectedLocation.style.color = 'var(--success)';
      locationResults.style.display = 'none';
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!locationSearch.contains(e.target) && !locationResults.contains(e.target)) {
        locationResults.style.display = 'none';
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Generate success page with install link
 */
function generateSuccessPage(stremioUrl: string, httpUrl: string): string {
  return `<!DOCTYPE html>>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Watchwyrd - Ready to Install</title>
  <link rel="icon" type="image/png" href="/static/favicon.png">
  <style>
    :root {
      --bg-dark: #0d1117;
      --bg-card: #161b22;
      --bg-input: #21262d;
      --border: #30363d;
      --text: #c9d1d9;
      --text-muted: #8b949e;
      --accent: #7c3aed;
      --success: #238636;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-dark);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .container {
      max-width: 600px;
      text-align: center;
    }

    h1 {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    h2 {
      font-size: 1.5rem;
      color: var(--success);
      margin-bottom: 2rem;
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 1.5rem;
    }

    .install-url {
      background: var(--bg-input);
      padding: 1rem;
      border-radius: 8px;
      word-break: break-all;
      font-family: monospace;
      font-size: 0.875rem;
      margin: 1rem 0;
    }

    .btn {
      display: inline-block;
      padding: 1rem 2rem;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      text-decoration: none;
      margin: 0.5rem;
      transition: transform 0.2s;
    }

    .btn:hover {
      transform: scale(1.05);
    }

    .btn-secondary {
      background: var(--bg-input);
      border: 1px solid var(--border);
    }

    p {
      color: var(--text-muted);
      margin-top: 1rem;
    }

    .steps {
      text-align: left;
      margin: 1.5rem 0;
    }

    .steps li {
      margin: 0.75rem 0;
      padding-left: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="/static/logo.png" alt="Watchwyrd" style="width: 100px; height: 100px; margin-bottom: 1rem;">
    <h2>Your fate is sealed!</h2>

    <div class="card">
      <p style="color: var(--text); margin-bottom: 1rem;">Click below to install Watchwyrd in Stremio:</p>

      <a href="${stremioUrl}" class="btn">
        📦 Install in Stremio
      </a>

      <p style="margin-top: 1.5rem; font-size: 0.875rem;">Or copy this URL and add it manually:</p>
      <div class="install-url">${httpUrl}</div>

      <ol class="steps">
        <li>Open Stremio</li>
        <li>Go to <strong>Addons</strong> (puzzle icon)</li>
        <li>Click <strong>Install from URL</strong></li>
        <li>Paste the URL above</li>
      </ol>
    </div>

    <a href="/configure" class="btn btn-secondary">
      ← Back to Configuration
    </a>
  </div>
</body>
</html>`;
}

/**
 * Create configure page routes
 */
export function createConfigureRoutes(): Router {
  const router = createRouter();

  // GET /configure - Show configuration form
  router.get('/', (_req: Request, res: Response) => {
    res.send(generateConfigPage());
  });

  // POST /configure - Process form and generate install link
  router.post('/', async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;

      // Extract form data
      const aiProvider = body['aiProvider'] || 'gemini';

      const config: Record<string, unknown> = {
        aiProvider,
        geminiApiKey: body['geminiApiKey'] || '',
        geminiModel: body['geminiModel'] || 'gemini-3-flash',
        perplexityApiKey: body['perplexityApiKey'] || '',
        perplexityModel: body['perplexityModel'] || 'sonar-pro',
        timezone: body['timezone'] || 'UTC',
        country: body['country'] || 'US',
        presetProfile: body['presetProfile'] || 'casual',
        includeMovies: body['includeMovies'] === 'true',
        includeSeries: body['includeSeries'] === 'true',
        maxRating: body['maxRating'] || 'R',
        noveltyBias: parseInt(body['noveltyBias'] as string) || 50,
        popularityBias: parseInt(body['popularityBias'] as string) || 50,
        includeNewReleases: body['includeNewReleases'] === 'true',
        enableSeasonalThemes: body['enableSeasonalThemes'] === 'true',
        enableTimeContext: body['enableTimeContext'] === 'true',
        enableWeatherContext: body['enableWeatherContext'] === 'true',
        showExplanations: body['showExplanations'] === 'true',
        preferredLanguages: ['en'],
        excludedGenres: [] as string[],
      };

      // Add weather location if provided
      const weatherLat = body['weatherLocationLat'] as string;
      const weatherLon = body['weatherLocationLon'] as string;
      if (weatherLat && weatherLon && body['enableWeatherContext'] === 'true') {
        config['weatherLocation'] = {
          name: body['weatherLocationName'] || '',
          country: body['weatherLocationCountry'] || '',
          latitude: parseFloat(weatherLat),
          longitude: parseFloat(weatherLon),
          admin1: body['weatherLocationAdmin1'] || '',
        };
      }

      // Handle excluded genres (genres not checked)
      const selectedGenres = Array.isArray(body['genres'])
        ? body['genres']
        : body['genres']
          ? [body['genres']]
          : [];

      const allGenres = Object.keys(DEFAULT_GENRE_WEIGHTS);
      config['excludedGenres'] = allGenres.filter((g) => !(selectedGenres as string[]).includes(g));

      // Validate API key based on provider
      if (aiProvider === 'gemini' && !config['geminiApiKey']) {
        res.send(generateConfigPage('Gemini API key is required'));
        return;
      }

      if (aiProvider === 'perplexity' && !config['perplexityApiKey']) {
        res.send(generateConfigPage('Perplexity API key is required'));
        return;
      }

      // Test API key based on provider
      if (aiProvider === 'gemini') {
        const gemini = new GeminiClient(
          config['geminiApiKey'] as string,
          config['geminiModel'] as 'gemini-3-flash'
        );

        const validationResult = await gemini.validateApiKey();

        if (!validationResult.valid) {
          res.send(generateConfigPage(validationResult.error || 'Invalid Gemini API key'));
          return;
        }
      }
      // Perplexity key validation is done client-side before form submission

      // Generate install URLs
      const configBase64 = Buffer.from(JSON.stringify(config)).toString('base64');
      const manifestPath = `/${configBase64}/manifest.json`;
      const stremioUrl = `stremio://${serverConfig.baseUrl.replace(/^https?:\/\//, '')}${manifestPath}`;
      const httpUrl = `${serverConfig.baseUrl}${manifestPath}`;

      logger.info('Configuration generated', {
        provider: aiProvider,
        model: aiProvider === 'gemini' ? config['geminiModel'] : config['perplexityModel'],
        preset: config['presetProfile'],
      });

      res.send(generateSuccessPage(stremioUrl, httpUrl));
    } catch (error) {
      logger.error('Configuration error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.send(generateConfigPage('An error occurred. Please try again.'));
    }
  });

  // API endpoint to validate API key and get available models dynamically
  router.post('/validate-key', async (req: Request, res: Response) => {
    try {
      const { apiKey, provider } = req.body as { apiKey?: string; provider?: string };

      if (!apiKey) {
        res.json({ valid: false, error: 'API key is required' });
        return;
      }

      // Handle Perplexity validation
      if (provider === 'perplexity') {
        try {
          // Validate by making a minimal request to Perplexity
          const testResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'sonar',
              messages: [{ role: 'user', content: 'test' }],
              max_tokens: 1,
            }),
          });

          if (!testResponse.ok) {
            const errorData = (await testResponse.json().catch(() => ({}))) as Record<
              string,
              unknown
            >;
            const errorDetail =
              (errorData['detail'] as string) ||
              (errorData['error'] as { message?: string })?.message ||
              'Invalid API key';
            res.json({ valid: false, error: errorDetail });
            return;
          }

          res.json({ valid: true });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          res.json({ valid: false, error: `Perplexity validation failed: ${errorMessage}` });
        }
        return;
      }

      // Fetch available models from Gemini API
      const modelsResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );

      if (!modelsResponse.ok) {
        const errorData = (await modelsResponse.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        const errorMessage = parseGeminiApiError(modelsResponse.status, errorData);
        res.json({ valid: false, error: errorMessage });
        return;
      }

      const modelsData = (await modelsResponse.json()) as {
        models?: Array<{
          name: string;
          displayName?: string;
          description?: string;
          supportedGenerationMethods?: string[];
        }>;
      };

      if (!modelsData.models || modelsData.models.length === 0) {
        res.json({ valid: false, error: 'No models available for this API key' });
        return;
      }

      // Map API model names to our internal names and determine availability
      // Models that support generateContent are the ones we can use
      const availableApiModels = new Set(
        modelsData.models
          .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m) => m.name.replace('models/', ''))
      );

      // Our model mapping (internal name -> API name)
      const ourModels = [
        {
          id: 'gemini-2.5-flash',
          apiName: 'gemini-2.5-flash',
          displayName: 'Gemini 2.5 Flash',
          freeTier: true,
        },
        {
          id: 'gemini-2.5-flash-lite',
          apiName: 'gemini-2.5-flash-lite',
          displayName: 'Gemini 2.5 Flash Lite',
          freeTier: true,
        },
        {
          id: 'gemini-3-flash',
          apiName: 'gemini-2.0-flash',
          displayName: 'Gemini 2.0 Flash',
          freeTier: true,
        },
        {
          id: 'gemini-3-pro',
          apiName: 'gemini-2.5-pro',
          displayName: 'Gemini 2.5 Pro',
          freeTier: false,
        },
      ];

      // Check which models are available for this API key
      const models = ourModels.map((model) => ({
        id: model.id,
        name: model.displayName,
        freeTier: model.freeTier,
        available:
          availableApiModels.has(model.apiName) ||
          availableApiModels.has(model.apiName + '-latest') ||
          // Check for variations like gemini-2.0-flash-001
          Array.from(availableApiModels).some((m) => m.startsWith(model.apiName)),
      }));

      // Log available models for debugging
      logger.debug('Available Gemini models', {
        apiModels: Array.from(availableApiModels).slice(0, 20),
        mappedModels: models,
      });

      res.json({
        valid: true,
        models,
        // Include raw model count for info
        totalApiModels: modelsData.models.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('API key validation error', { error: errorMessage });

      // Parse network/fetch errors
      if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('fetch')) {
        res.json({ valid: false, error: 'Network error. Please check your internet connection.' });
      } else {
        res.json({ valid: false, error: `Validation failed: ${errorMessage}` });
      }
    }
  });

  // API endpoint to search for locations (for weather)
  router.get('/search-locations', async (req: Request, res: Response) => {
    try {
      const query = req.query['q'] as string | undefined;

      if (!query || query.length < 2) {
        res.json({ results: [] });
        return;
      }

      const results = await searchLocations(query, 10);

      // Map to simpler format for frontend
      const locations = results.map((r) => ({
        id: r.id,
        name: r.name,
        country: r.country,
        admin1: r.admin1,
        latitude: r.latitude,
        longitude: r.longitude,
        // Create display label
        label: r.admin1 ? `${r.name}, ${r.admin1}, ${r.country}` : `${r.name}, ${r.country}`,
      }));

      res.json({ results: locations });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Location search error', { error: errorMessage });
      res.json({ results: [], error: 'Failed to search locations' });
    }
  });

  return router;
}

/**
 * Parse Gemini API error response into user-friendly message
 */
function parseGeminiApiError(status: number, errorData: Record<string, unknown>): string {
  const error = errorData['error'] as Record<string, unknown> | undefined;
  const message = error?.['message'] as string | undefined;
  const details = error?.['details'] as Array<Record<string, unknown>> | undefined;

  // Extract specific error info from details
  if (details && details.length > 0) {
    for (const detail of details) {
      if (detail['@type'] === 'type.googleapis.com/google.rpc.ErrorInfo') {
        const reason = detail['reason'] as string;
        if (reason === 'API_KEY_INVALID') {
          return 'Invalid API key. Please check that you copied the entire key from https://aistudio.google.com/apikey';
        }
      }
      if (detail['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure') {
        const violations = detail['violations'] as Array<Record<string, unknown>> | undefined;
        if (violations && violations.length > 0 && violations[0]) {
          const metric = (violations[0]['quotaMetric'] as string) || '';
          if (metric.includes('free_tier')) {
            return 'Free tier quota exceeded. Please wait a few minutes or upgrade to a paid plan.';
          }
          return 'API quota exceeded. Please wait and try again, or check your billing settings.';
        }
      }
      if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo') {
        const retryDelay = detail['retryDelay'] as string;
        if (retryDelay) {
          const seconds = parseInt(retryDelay.replace('s', ''));
          return `Rate limited. Please wait ${seconds} seconds and try again.`;
        }
      }
    }
  }

  // Fallback to status code based messages
  switch (status) {
    case 400:
      return message || 'Bad request. Please check your API key format.';
    case 401:
      return 'Invalid API key. Please verify your key is correct.';
    case 403:
      return 'API key does not have permission. Please enable the Gemini API in Google Cloud Console.';
    case 404:
      return 'API endpoint not found. The Gemini API may be unavailable in your region.';
    case 429:
      return message || 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
      return 'Gemini API is temporarily unavailable. Please try again later.';
    default:
      return message || `API error (${status}). Please try again.`;
  }
}
