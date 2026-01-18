/**
 * Watchwyrd - Configure Page Components
 *
 * Reusable HTML components for the configuration wizard.
 * Each function returns an HTML string for its component.
 */

import { VALID_GENRES } from '../../config/schema.js';
import { AI_PROVIDERS, CATALOG_SIZE_OPTIONS, GENRE_ICONS } from './data.js';
import { ADDON_VERSION } from '../../addon/manifest.js';

/**
 * Header with logo and title
 */
export function renderHeader(): string {
  return `
    <div class="wizard-header">
      <img src="/static/logo.png" alt="Watchwyrd" class="wizard-logo">
      <h1 class="wizard-title">Watchwyrd</h1>
      <p class="wizard-tagline">Your viewing fate, revealed</p>
    </div>
  `;
}

/**
 * Progress bar showing current step
 */
export function renderProgressBar(): string {
  const steps = [
    { num: 1, label: 'AI Setup' },
    { num: 2, label: 'Location' },
    { num: 3, label: 'Preferences' },
    { num: 4, label: 'Review' },
  ];

  return `
    <div class="progress-container" role="navigation" aria-label="Setup progress">
      <div class="progress-steps">
        <div class="progress-line" aria-hidden="true"></div>
        <div class="progress-line-fill" aria-hidden="true"></div>
        ${steps
          .map(
            (step) => `
          <div class="progress-step" data-step="${step.num}" role="button" tabindex="0" aria-label="Step ${step.num}: ${step.label}">
            <div class="step-circle" aria-hidden="true">${step.num}</div>
            <span class="step-label">${step.label}</span>
          </div>
        `
          )
          .join('')}
      </div>
      <div class="sr-only" aria-live="polite" id="stepAnnouncer"></div>
    </div>
  `;
}

/**
 * Step 1: AI Provider Selection + API Key (Combined)
 */
export function renderStep1_AISetup(
  devGeminiKey: string,
  devPerplexityKey: string,
  devOpenAIKey: string
): string {
  const providerCards = AI_PROVIDERS.map(
    (p) => `
    <div class="selection-card provider-card" data-provider="${p.id}">
      <input type="radio" name="aiProvider" value="${p.id}">
      <div class="selection-icon">${p.icon}</div>
      <div class="selection-title">${p.name}</div>
      <div class="selection-desc">${p.description}</div>
      <div class="selection-features">
        ${p.features.map((f) => `<span class="feature-tag">✓ ${f}</span>`).join('')}
      </div>
    </div>
  `
  ).join('');

  return `
    <div class="wizard-step" id="step1">
      <div class="wizard-card">
        <div class="card-header">
          <div class="card-icon">🤖</div>
          <h2 class="card-title">Choose Your AI</h2>
          <p class="card-subtitle">Select your AI provider and enter your API key</p>
        </div>
        
        <div class="card-content">
          <div class="selection-grid">
            ${providerCards}
          </div>
          
          <!-- API Key Section (shown after provider selection) -->
          <div id="apiKeySection" style="display: none; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
            <!-- Gemini Section -->
            <div id="geminiKeySection" style="display: none;">
              <div class="form-group">
                <label class="form-label">
                  🔑 Gemini API Key <span class="required">*</span>
                </label>
                <input 
                  type="password" 
                  id="geminiApiKey" 
                  class="form-input"
                  placeholder="AIza..."
                  value="${devGeminiKey}"
                  autocomplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                >
                <p class="form-help">
                  Get your free key from 
                  <a href="https://aistudio.google.com/apikey" target="_blank">Google AI Studio ↗</a>
                </p>
              </div>
              
              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">Model</label>
                <select id="geminiModel" class="form-select" disabled>
                  <option value="">Enter API key first...</option>
                </select>
              </div>
            </div>
            
            <!-- Perplexity Section -->
            <div id="perplexityKeySection" style="display: none;">
              <div class="form-group">
                <label class="form-label">
                  🔑 Perplexity API Key <span class="required">*</span>
                </label>
                <input 
                  type="password" 
                  id="perplexityApiKey" 
                  class="form-input"
                  placeholder="pplx-..."
                  value="${devPerplexityKey}"
                  autocomplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                >
                <p class="form-help">
                  Get your key from 
                  <a href="https://www.perplexity.ai/settings/api" target="_blank">Perplexity Settings ↗</a>
                </p>
              </div>
              
              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">Model</label>
                <select id="perplexityModel" class="form-select">
                  <option value="">Enter API key to load models...</option>
                </select>
                <p class="form-help">All Perplexity models include real-time web search</p>
              </div>
            </div>
            
            <!-- OpenAI Section -->
            <div id="openaiKeySection" style="display: none;">
              <div class="form-group">
                <label class="form-label">
                  🔑 OpenAI API Key <span class="required">*</span>
                </label>
                <input 
                  type="password" 
                  id="openaiApiKey" 
                  class="form-input"
                  placeholder="sk-..."
                  value="${devOpenAIKey}"
                  autocomplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                >
                <p class="form-help">
                  Get your key from 
                  <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform ↗</a>
                </p>
              </div>
              
              <div class="form-group" style="margin-top: 1rem;">
                <label class="form-label">Model</label>
                <select id="openaiModel" class="form-select">
                  <option value="gpt-4o-mini">GPT-4o Mini (Recommended)</option>
                  <option value="gpt-4o">GPT-4o (Best quality)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="o1-mini">o1-mini (Reasoning)</option>
                  <option value="o3-mini">o3-mini (Advanced reasoning)</option>
                </select>
                <p class="form-help">GPT-4o Mini offers the best balance of speed and cost</p>
              </div>
            </div>
            
            <!-- Status Message -->
            <div id="keyStatus" class="form-status"></div>
          </div>
          
          <div class="alert alert-info" style="margin-top: 1.5rem;">
            <span class="alert-icon">🔒</span>
            <div class="alert-content">
              <strong>Privacy:</strong> Your API key is stored locally in Stremio, never on our servers.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Step 2: Location & Timezone (was Step 3)
 */
export function renderStep2_Location(): string {
  return `
    <div class="wizard-step" id="step2" style="display: none;">
      <div class="wizard-card">
        <div class="card-header">
          <div class="card-icon">🌍</div>
          <h2 class="card-title">Set Your Location</h2>
          <p class="card-subtitle">For time-aware and contextual recommendations</p>
        </div>
        
        <div class="card-content">
          <div class="form-group">
            <label class="form-label">Timezone</label>
            <select id="timezone" class="form-select">
              <option value="">Loading...</option>
            </select>
            <p class="form-help">Auto-detected from your browser</p>
          </div>
          
          <div class="form-group">
            <label class="form-label">Country</label>
            <select id="country" class="form-select">
              <option value="">Loading...</option>
            </select>
            <p class="form-help">Used for regional content preferences</p>
          </div>
          
          <div class="checkbox-item" style="margin-top: 1rem;">
            <input type="checkbox" id="weatherToggle">
            <label for="weatherToggle">
              <div class="label-main">🌤️ Enable weather-based recommendations</div>
              <div class="label-sub">Match your viewing mood to the weather outside (via <a href="https://open-meteo.com" target="_blank" style="color: var(--accent);">Open-Meteo</a>)</div>
            </label>
          </div>
          
          <div id="weatherLocationSection" style="display: none; margin-top: 1rem; padding-left: 2rem;">
            <div class="form-group">
              <label class="form-label">📍 Your City</label>
              <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <button type="button" id="useMyLocationBtn" class="btn btn-secondary" style="font-size: 0.85rem; padding: 0.5rem 0.75rem;">
                  📍 Use My Location
                </button>
              </div>
              <div style="position: relative;">
                <input 
                  type="text" 
                  id="locationSearch" 
                  class="form-input"
                  placeholder="Search for your city..."
                  autocomplete="off"
                >
                <div id="locationResults" class="location-dropdown"></div>
              </div>
              <p id="selectedLocation" class="form-help"></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Step 3: Content Preferences (was Step 4)
 */
export function renderStep3_Preferences(devRpdbKey: string): string {
  const catalogSizeOptions = CATALOG_SIZE_OPTIONS.map(
    (o) => `
    <option value="${o.value}" ${o.value === 20 ? 'selected' : ''}>${o.label} (${o.description})</option>
  `
  ).join('');

  const genreTags = VALID_GENRES.map(
    (g) => `
    <div class="tag-item genre-tag selected" data-genre="${g}" role="checkbox" aria-checked="true" tabindex="0">
      <span class="genre-icon">${GENRE_ICONS[g] || '🎬'}</span>
      <span class="tag-icon">✓</span>
      <span class="tag-label">${g}</span>
    </div>
  `
  ).join('');

  return `
    <div class="wizard-step" id="step3" style="display: none;">
      <div class="wizard-card">
        <div class="card-header">
          <div class="card-icon">🎬</div>
          <h2 class="card-title">Your Preferences</h2>
          <p class="card-subtitle">Customize what you want to discover</p>
        </div>
        
        <div class="card-content">
          <!-- Content Types -->
          <div class="form-group">
            <label class="form-label">Content Types</label>
            <div class="checkbox-list" style="flex-direction: row; gap: 1rem;">
              <div class="checkbox-item" style="flex: 1;">
                <input type="checkbox" id="includeMovies" checked>
                <label for="includeMovies">
                  <div class="label-main">🎬 Movies</div>
                </label>
              </div>
              <div class="checkbox-item" style="flex: 1;">
                <input type="checkbox" id="includeSeries" checked>
                <label for="includeSeries">
                  <div class="label-main">📺 TV Series</div>
                </label>
              </div>
            </div>
          </div>
          
          <!-- Genre Selection -->
          <div class="form-group" style="margin-top: 1.5rem;">
            <label class="form-label">Genres (click to exclude)</label>
            <div class="tag-grid">
              ${genreTags}
            </div>
          </div>
          
          <!-- Catalog Size -->
          <div class="form-group" style="margin-top: 1.5rem;">
            <label class="form-label">Catalog Size</label>
            <select id="catalogSize" class="form-select">
              ${catalogSizeOptions}
            </select>
            <p class="form-help">More items = longer load times. AI typically returns 20-30 items max.</p>
          </div>
          
          <!-- Request Timeout -->
          <div class="form-group" style="margin-top: 1.5rem;">
            <label class="form-label">⏱️ Request Timeout</label>
            <select id="requestTimeout" class="form-select">
              <option value="15">15 seconds (fast, may timeout)</option>
              <option value="30" selected>30 seconds (recommended)</option>
              <option value="45">45 seconds (patient)</option>
              <option value="60">60 seconds (very patient)</option>
              <option value="90">90 seconds (handles rate limits)</option>
              <option value="120">120 seconds (maximum)</option>
            </select>
            <p class="form-help">Max time to wait for AI + metadata. Lower = faster fail, higher = handles rate limits better.</p>
          </div>
          
          <!-- Feature Toggles -->
          <div class="form-group" style="margin-top: 1.5rem;">
            <label class="form-label">Smart Features</label>
            <div class="checkbox-list">
              <div class="checkbox-item">
                <input type="checkbox" id="showExplanations" checked>
                <label for="showExplanations">
                  <div class="label-main">💬 Show why recommended</div>
                  <div class="label-sub">Brief explanation for each recommendation</div>
                </label>
              </div>
            </div>
          </div>
          
          <!-- RPDB Enhanced Posters -->
          <div class="form-group" style="margin-top: 1.5rem;">
            <label class="form-label">🎨 Enhanced Posters (RPDB)</label>
            <p class="form-help" style="margin-bottom: 0.5rem;">
              <a href="https://ratingposterdb.com/" target="_blank" style="color: var(--accent-color);">RatingPosterDB</a> 
              adds IMDb/RT/Metacritic ratings directly on posters. Optional.
            </p>
            <input 
              type="password" 
              id="rpdbApiKey" 
              class="form-input" 
              placeholder="RPDB API Key (optional - leave blank to disable)"
              value="${devRpdbKey}"
              autocomplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              data-bwignore="true"
              data-form-type="other"
              style="margin-top: 0.5rem;"
            >
            <p class="form-help">Get your key at <a href="https://ratingposterdb.com/" target="_blank" style="color: var(--accent-color);">ratingposterdb.com</a></p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Step 4: Review & Generate (was Step 5)
 */
export function renderStep4_Review(): string {
  return `
    <div class="wizard-step" id="step4" style="display: none;">
      <div class="wizard-card">
        <div class="card-header">
          <div class="card-icon">✨</div>
          <h2 class="card-title">Ready to Install</h2>
          <p class="card-subtitle">Review your configuration and generate install link</p>
        </div>
        
        <div class="card-content">
          <div id="configSummary" class="config-summary">
            <!-- Populated by JavaScript -->
          </div>
          
          <div class="alert alert-info" style="margin-top: 1.5rem;">
            <span class="alert-icon">🔒</span>
            <div class="alert-content">
              <div class="alert-title">Privacy Note</div>
              <div class="alert-message">
                Your API key is encoded in the URL and stored locally in Stremio.
                It's never sent to our servers.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Navigation buttons
 */
export function renderNavigation(): string {
  return `
    <div class="wizard-nav" role="navigation" aria-label="Wizard navigation">
      <button type="button" class="btn btn-secondary btn-back" id="prevBtn" style="display: none;" aria-label="Go to previous step">
        ← Back
      </button>
      <button type="button" class="btn" id="nextBtn" disabled aria-label="Continue to next step">
        Continue →
      </button>
    </div>
    <div class="keyboard-hint" aria-hidden="true">
      <kbd class="kbd">Enter</kbd> to continue • <kbd class="kbd">Esc</kbd> to go back
    </div>
  `;
}

/**
 * Third-party services transparency section
 */
export function renderThirdPartyServices(): string {
  return `
    <div class="third-party-section">
      <button class="third-party-toggle" onclick="toggleThirdParty()">
        <span class="toggle-icon">▶</span>
        🔒 Third-Party Services & Privacy
      </button>
      <div class="third-party-content" id="thirdPartyContent">
        <p class="third-party-intro">
          Watchwyrd uses the following external services. We believe in complete transparency about your data.
        </p>
        
        <div class="service-card">
          <div class="service-header">
            <span class="service-icon">🤖</span>
            <div class="service-info">
              <strong>Google Gemini</strong> (if selected)
              <a href="https://ai.google.dev" target="_blank" class="service-link">ai.google.dev</a>
            </div>
          </div>
          <div class="service-details">
            <p><strong>Data sent:</strong> Your preferences (genres, content type) and context signals (time of day, weather).</p>
            <p><strong>Not sent:</strong> Personal information, IP address, or location details.</p>
            <p><strong>Privacy:</strong> <a href="https://ai.google.dev/terms" target="_blank">Gemini API Terms</a></p>
          </div>
        </div>
        
        <div class="service-card">
          <div class="service-header">
            <span class="service-icon">🔍</span>
            <div class="service-info">
              <strong>Perplexity AI</strong> (if selected)
              <a href="https://www.perplexity.ai" target="_blank" class="service-link">perplexity.ai</a>
            </div>
          </div>
          <div class="service-details">
            <p><strong>Data sent:</strong> Your preferences and context for generating recommendations with real-time web search.</p>
            <p><strong>Not sent:</strong> Personal information or location details.</p>
            <p><strong>Privacy:</strong> <a href="https://www.perplexity.ai/privacy" target="_blank">Perplexity Privacy Policy</a></p>
          </div>
        </div>
        
        <div class="service-card">
          <div class="service-header">
            <span class="service-icon">🌤️</span>
            <div class="service-info">
              <strong>Open-Meteo</strong> (weather & geocoding)
              <a href="https://open-meteo.com" target="_blank" class="service-link">open-meteo.com</a>
            </div>
          </div>
          <div class="service-details">
            <p><strong>Data sent:</strong> Your configured city coordinates for weather data.</p>
            <p><strong>Not sent:</strong> Any personal information or identifiers.</p>
            <p><strong>Note:</strong> Open-Meteo is free, open-source, and requires no API key. 🎉</p>
            <p><strong>Privacy:</strong> <a href="https://open-meteo.com/en/terms" target="_blank">Open-Meteo Terms</a></p>
          </div>
        </div>
        
        <div class="service-card">
          <div class="service-header">
            <span class="service-icon">🎬</span>
            <div class="service-info">
              <strong>Cinemeta</strong> (Stremio)
              <a href="https://www.stremio.com" target="_blank" class="service-link">stremio.com</a>
            </div>
          </div>
          <div class="service-details">
            <p><strong>Data sent:</strong> Movie/series titles to resolve correct IMDb IDs and fetch metadata.</p>
            <p><strong>Not sent:</strong> User preferences or any personal data.</p>
            <p><strong>Note:</strong> Cinemeta is Stremio's official metadata addon.</p>
          </div>
        </div>
        
        <div class="service-card">
          <div class="service-header">
            <span class="service-icon">🗺️</span>
            <div class="service-info">
              <strong>OpenStreetMap Nominatim</strong>
              <a href="https://nominatim.openstreetmap.org" target="_blank" class="service-link">nominatim.openstreetmap.org</a>
            </div>
          </div>
          <div class="service-details">
            <p><strong>Data sent:</strong> Coordinates (only when "Use My Location" button is clicked).</p>
            <p><strong>Not sent:</strong> Any data unless you explicitly click the location button.</p>
            <p><strong>Note:</strong> Used for reverse geocoding to find your city name. Free, no API key required. 🎉</p>
            <p><strong>Privacy:</strong> <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank">OSM Privacy Policy</a></p>
          </div>
        </div>
        
        <div class="service-card">
          <div class="service-header">
            <span class="service-icon">🎨</span>
            <div class="service-info">
              <strong>RatingPosterDB</strong> (if configured)
              <a href="https://ratingposterdb.com" target="_blank" class="service-link">ratingposterdb.com</a>
            </div>
          </div>
          <div class="service-details">
            <p><strong>Data sent:</strong> IMDb IDs to fetch enhanced poster artwork with rating overlays.</p>
            <p><strong>Not sent:</strong> User preferences or personal data.</p>
            <p><strong>Note:</strong> Optional feature - only enabled if you provide an RPDB API key.</p>
          </div>
        </div>
        
        <div class="privacy-note">
          <span class="note-icon">✅</span>
          <p><strong>Your API keys</strong> are stored only in your browser and encoded in your personal addon URL. 
          They are never stored on any server. Each user brings their own API keys.</p>
        </div>
        
        <div class="credits-section">
          <h4>🙏 Credits & Acknowledgments</h4>
          <ul>
            <li><strong>Stremio</strong> - For the amazing open addon ecosystem</li>
            <li><strong>Open-Meteo</strong> - For free, reliable weather data</li>
            <li><strong>OpenStreetMap</strong> - For free geolocation services</li>
            <li><strong>RatingPosterDB</strong> - For enhanced poster artwork</li>
            <li><strong>Google & Perplexity</strong> - For powerful AI APIs</li>
            <li><strong>stremio-ai-search & stremio-ai-companion</strong> - Inspiration for IMDB resolution patterns</li>
          </ul>
        </div>
      </div>
    </div>
  `;
}

/**
 * Footer
 */
export function renderFooter(): string {
  return `
    ${renderThirdPartyServices()}
    <footer class="wizard-footer">
      <p>
        Watchwyrd v${ADDON_VERSION} • 
        <a href="https://github.com/fpMiguel/watchwyrd" target="_blank">GitHub</a> •
        Open Source (MIT)
      </p>
      <p class="footer-disclaimer">
        ⚠️ Experimental software - Use at your own risk. Not affiliated with Stremio, Google, or Perplexity.
      </p>
    </footer>
  `;
}

/**
 * Success page content
 */
export function renderSuccessPage(stremioUrl: string, httpUrl: string): string {
  return `
    <div class="confetti-container" id="confettiContainer" aria-hidden="true"></div>
    <div class="success-container">
      <div class="success-icon">🎉</div>
      <h1 class="success-title">Your Fate is Sealed!</h1>
      <p class="success-subtitle">Watchwyrd is ready to install in Stremio</p>
      
      <div class="install-card">
        <h3>📦 One-Click Install</h3>
        <a href="${stremioUrl}" class="btn btn-success btn-lg btn-block">
          Install in Stremio
        </a>
        
        <div style="margin-top: 2rem;">
          <h3>📋 Or copy the URL manually</h3>
          <div class="url-box">
            <div class="url-input" id="installUrl">${httpUrl}</div>
            <button class="copy-btn" id="copyBtn" onclick="copyUrl()" aria-label="Copy URL to clipboard">📋 Copy</button>
          </div>
          
          <ol class="install-steps">
            <li data-step="1">Open Stremio desktop app</li>
            <li data-step="2">Go to <strong>Addons</strong> (puzzle icon)</li>
            <li data-step="3">Click <strong>Install from URL</strong></li>
            <li data-step="4">Paste the URL and confirm</li>
          </ol>
        </div>
      </div>
      
      <a href="/configure" class="btn btn-secondary">
        ← Configure Again
      </a>
    </div>
  `;
}

/**
 * Additional CSS for location dropdown
 */
export function getLocationDropdownCSS(): string {
  return `
    .location-dropdown {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 8px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 100;
      margin-top: 4px;
      box-shadow: var(--shadow-hover);
    }

    .location-result {
      padding: 0.75rem 1rem;
      cursor: pointer;
      border-bottom: 1px solid var(--border);
      transition: background var(--transition-fast);
    }

    .location-result:last-child {
      border-bottom: none;
    }

    .location-result:hover {
      background: var(--bg-hover);
    }

    .config-summary {
      background: var(--bg-input);
      border-radius: 10px;
      padding: 1.5rem;
    }

    .summary-group {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
    }

    .summary-group:last-child {
      border-bottom: none;
    }

    .summary-label {
      color: var(--text-muted);
    }

    .summary-value {
      font-weight: 500;
      text-align: right;
    }

    .feature-tag {
      display: inline-block;
      font-size: 0.7rem;
      color: var(--text-muted);
      margin-right: 0.5rem;
    }

    .loading-spinner-small {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      vertical-align: middle;
      margin-right: 0.5rem;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    .shake {
      animation: shake 0.3s ease;
    }
  `;
}
