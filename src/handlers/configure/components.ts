/**
 * Watchwyrd - Configure Page Components
 *
 * Reusable HTML components for the configuration wizard.
 * Each function returns an HTML string for its component.
 */

import { VALID_GENRES } from '../../config/schema.js';
import { AI_PROVIDERS, CATALOG_SIZE_OPTIONS } from './data.js';

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
    { num: 1, label: 'Provider' },
    { num: 2, label: 'API Key' },
    { num: 3, label: 'Location' },
    { num: 4, label: 'Preferences' },
    { num: 5, label: 'Review' },
  ];

  return `
    <div class="progress-container">
      <div class="progress-steps">
        <div class="progress-line"></div>
        <div class="progress-line-fill"></div>
        ${steps
          .map(
            (step) => `
          <div class="progress-step" data-step="${step.num}">
            <div class="step-circle">${step.num}</div>
            <span class="step-label">${step.label}</span>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}

/**
 * Step 1: AI Provider Selection
 */
export function renderStep1_Provider(): string {
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
          <h2 class="card-title">Choose Your AI Provider</h2>
          <p class="card-subtitle">Select which AI will power your recommendations</p>
        </div>
        
        <div class="card-content">
          <div class="selection-grid">
            ${providerCards}
          </div>
          
          <div class="alert alert-info" style="margin-top: 1.5rem;">
            <span class="alert-icon">💡</span>
            <div class="alert-content">
              <strong>Tip:</strong> Perplexity includes real-time web search for the latest releases. 
              Gemini offers a generous free tier.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Step 2: API Key Configuration
 */
export function renderStep2_ApiKey(devGeminiKey: string, devPerplexityKey: string): string {
  return `
    <div class="wizard-step" id="step2" style="display: none;">
      <div class="wizard-card">
        <div class="card-header">
          <div class="card-icon">🔑</div>
          <h2 class="card-title">Enter Your API Key</h2>
          <p class="card-subtitle">Your key is stored locally in Stremio, never on our servers</p>
        </div>
        
        <div class="card-content">
          <!-- Gemini Section -->
          <div id="geminiKeySection" style="display: none;">
            <div class="form-group">
              <label class="form-label">
                Gemini API Key <span class="required">*</span>
              </label>
              <input 
                type="password" 
                id="geminiApiKey" 
                class="form-input"
                placeholder="AIza..."
                value="${devGeminiKey}"
                autocomplete="off"
              >
              <p class="form-help">
                Get your free key from 
                <a href="https://aistudio.google.com/apikey" target="_blank">Google AI Studio ↗</a>
              </p>
            </div>
            
            <div class="form-group" style="margin-top: 1.5rem;">
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
                Perplexity API Key <span class="required">*</span>
              </label>
              <input 
                type="password" 
                id="perplexityApiKey" 
                class="form-input"
                placeholder="pplx-..."
                value="${devPerplexityKey}"
                autocomplete="off"
              >
              <p class="form-help">
                Get your key from 
                <a href="https://www.perplexity.ai/settings/api" target="_blank">Perplexity Settings ↗</a>
              </p>
            </div>
            
            <div class="form-group" style="margin-top: 1.5rem;">
              <label class="form-label">Model</label>
              <select id="perplexityModel" class="form-select">
                <option value="">Enter API key to load models...</option>
              </select>
              <p class="form-help">All Perplexity models include real-time web search</p>
            </div>
          </div>
          
          <!-- Status Message -->
          <div id="keyStatus" class="form-status"></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Step 3: Location & Timezone
 */
export function renderStep3_Location(): string {
  return `
    <div class="wizard-step" id="step3" style="display: none;">
      <div class="wizard-card">
        <div class="card-header">
          <div class="card-icon">🌍</div>
          <h2 class="card-title">Set Your Location</h2>
          <p class="card-subtitle">For time-aware and holiday-themed recommendations</p>
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
            <p class="form-help">Used for holiday detection (Christmas, Halloween, etc.)</p>
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
 * Step 4: Content Preferences
 */
export function renderStep4_Preferences(): string {
  const catalogSizeOptions = CATALOG_SIZE_OPTIONS.map(
    (o) => `
    <option value="${o.value}" ${o.value === 20 ? 'selected' : ''}>${o.label} (${o.description})</option>
  `
  ).join('');

  const genreTags = VALID_GENRES.map(
    (g) => `
    <div class="tag-item genre-tag selected" data-genre="${g}">
      <span class="tag-icon">✓</span>
      <span class="tag-label">${g}</span>
    </div>
  `
  ).join('');

  return `
    <div class="wizard-step" id="step4" style="display: none;">
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
              type="text" 
              id="rpdbApiKey" 
              class="form-input" 
              placeholder="RPDB API Key (optional - leave blank to disable)"
              style="margin-top: 0.5rem;"
            >
            <p class="form-help">For local dev/testing, use: <code>t0-free-rpdb</code></p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Step 5: Review & Generate
 */
export function renderStep5_Review(): string {
  return `
    <div class="wizard-step" id="step5" style="display: none;">
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
    <div class="wizard-nav">
      <button type="button" class="btn btn-secondary btn-back" id="prevBtn" style="display: none;">
        ← Back
      </button>
      <button type="button" class="btn" id="nextBtn" disabled>
        Continue →
      </button>
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
            <span class="service-icon">🎉</span>
            <div class="service-info">
              <strong>Nager.Date</strong> (public holidays)
              <a href="https://date.nager.at" target="_blank" class="service-link">date.nager.at</a>
            </div>
          </div>
          <div class="service-details">
            <p><strong>Data sent:</strong> Your country code and current year for holiday lookup.</p>
            <p><strong>Not sent:</strong> Any personal information or identifiers.</p>
            <p><strong>Note:</strong> Nager.Date is free, open-source, and requires no API key. 🎉</p>
            <p><strong>Privacy:</strong> <a href="https://date.nager.at" target="_blank">Nager.Date</a> - No personal data collected</p>
          </div>
        </div>
        
        <div class="service-card">
          <div class="service-header">
            <span class="service-icon">📜</span>
            <div class="service-info">
              <strong>Wikipedia</strong> (On This Day)
              <a href="https://api.wikimedia.org" target="_blank" class="service-link">api.wikimedia.org</a>
            </div>
          </div>
          <div class="service-details">
            <p><strong>Data sent:</strong> Current month and day for historical events.</p>
            <p><strong>Not sent:</strong> Any personal information or identifiers.</p>
            <p><strong>Note:</strong> Wikipedia's Feed API is free and requires no API key. 🎉</p>
            <p><strong>Privacy:</strong> <a href="https://foundation.wikimedia.org/wiki/Privacy_policy" target="_blank">Wikimedia Privacy Policy</a></p>
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
            <li><strong>Nager.Date</strong> - For free public holiday data worldwide</li>
            <li><strong>Wikimedia Foundation</strong> - For the On This Day historical events API</li>
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
        Watchwyrd v0.0.37 • 
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
            <button class="copy-btn" id="copyBtn" onclick="copyUrl()">📋 Copy</button>
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
