/**
 * Watchwyrd - Configure Page Client Scripts
 *
 * Client-side JavaScript for the configuration wizard.
 * Handles step navigation, validation, and interactivity.
 */

import { TIMEZONES_BY_REGION, COUNTRIES, TZ_TO_COUNTRY } from './data.js';
import { VALID_GENRES } from '../../config/schema.js';

/**
 * Generate the client-side JavaScript for the wizard
 */
export function getWizardScript(
  devGeminiKey: string,
  devPerplexityKey: string,
  devOpenAIKey: string
): string {
  return `
<script>
(function() {
  'use strict';

  // Configuration State
  
  const state = {
    currentStep: 1,
    totalSteps: 4,
    isValidating: false,
    config: {
      aiProvider: '',
      geminiApiKey: '${devGeminiKey}',
      geminiModel: '',
      perplexityApiKey: '${devPerplexityKey}',
      perplexityModel: 'sonar',
      openaiApiKey: '${devOpenAIKey}',
      openaiModel: 'gpt-4o-mini',
      timezone: '',
      country: '',
      presetProfile: 'casual',
      includeMovies: true,
      includeSeries: true,
      enableWeatherContext: false,
      enableGrounding: false,
      weatherLocation: null,
      showExplanations: true,
      rpdbApiKey: '',
      catalogSize: 20,
      requestTimeout: 30,
      excludedGenres: []
    },
    validation: {
      apiKeyValid: false,
      apiKeyChecked: false,
      availableModels: []
    }
  };

  // Security: HTML Escaping (attribute-safe)
  
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // DOM Elements
  
  const wizard = {
    steps: document.querySelectorAll('.wizard-step'),
    progressSteps: document.querySelectorAll('.progress-step'),
    progressFill: document.querySelector('.progress-line-fill'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    form: document.getElementById('wizardForm')
  };

  // Step Navigation
  
  function updateProgressBar() {
    const progress = ((state.currentStep - 1) / (state.totalSteps - 1)) * 100;
    if (wizard.progressFill) {
      wizard.progressFill.style.width = progress + '%';
    }
    
    wizard.progressSteps.forEach((step, index) => {
      const stepNum = index + 1;
      step.classList.remove('active', 'complete', 'disabled');
      
      if (stepNum < state.currentStep) {
        step.classList.add('complete');
      } else if (stepNum === state.currentStep) {
        step.classList.add('active');
      } else if (!canNavigateToStep(stepNum)) {
        step.classList.add('disabled');
      }
    });
  }

  function canNavigateToStep(stepNum) {
    // Can always go back
    if (stepNum < state.currentStep) return true;
    
    // Step 1 (AI Setup): need provider selected AND valid API key
    if (stepNum > 1 && (!state.config.aiProvider || !state.validation.apiKeyValid)) return false;
    
    // Can only go one step forward
    if (stepNum > state.currentStep + 1) return false;
    
    return true;
  }

  function validateCurrentStep() {
    switch (state.currentStep) {
      case 1: // AI Setup (provider + API key combined)
        return !!state.config.aiProvider && state.validation.apiKeyValid;
      
      case 2: // Location
        return !!state.config.timezone && !!state.config.country;
      
      case 3: // Preferences
        return state.config.includeMovies || state.config.includeSeries;
      
      case 4: // Review
        return true;
      
      default:
        return true;
    }
  }

  function showStep(stepNum) {
    wizard.steps.forEach((step, index) => {
      step.style.display = (index + 1 === stepNum) ? 'block' : 'none';
    });
    
    state.currentStep = stepNum;
    updateProgressBar();
    updateNavButtons();
    
    // Scroll to top of the step for clear overview
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Announce step change to screen readers
    const stepNames = ['AI Setup', 'Location', 'Preferences', 'Review'];
    const announcer = document.getElementById('stepAnnouncer');
    if (announcer) {
      announcer.textContent = 'Step ' + stepNum + ' of 4: ' + stepNames[stepNum - 1];
    }
    
    // Focus first input in new step
    setTimeout(() => {
      const firstInput = wizard.steps[stepNum - 1]?.querySelector('input, select, [tabindex="0"]');
      if (firstInput && !firstInput.disabled) {
        firstInput.focus();
      }
    }, 100);
  }

  function updateNavButtons() {
    if (wizard.prevBtn) {
      wizard.prevBtn.style.display = state.currentStep > 1 ? 'flex' : 'none';
    }
    
    if (wizard.nextBtn) {
      const isLastStep = state.currentStep === state.totalSteps;
      wizard.nextBtn.textContent = isLastStep ? '🚀 Generate Install Link' : 'Continue →';
      wizard.nextBtn.disabled = !validateCurrentStep() || state.isValidating;
      
      if (isLastStep) {
        wizard.nextBtn.classList.add('btn-success');
      } else {
        wizard.nextBtn.classList.remove('btn-success');
      }
    }
  }

  function goToStep(stepNum) {
    if (!canNavigateToStep(stepNum)) return;
    showStep(stepNum);
  }

  function nextStep() {
    if (!validateCurrentStep()) {
      showStepError();
      return;
    }
    
    if (state.currentStep === state.totalSteps) {
      submitConfiguration();
      return;
    }
    
    if (state.currentStep < state.totalSteps) {
      showStep(state.currentStep + 1);
    }
  }

  function prevStep() {
    if (state.currentStep > 1) {
      showStep(state.currentStep - 1);
    }
  }

  function showStepError() {
    const currentCard = wizard.steps[state.currentStep - 1];
    currentCard?.classList.add('shake');
    setTimeout(() => currentCard?.classList.remove('shake'), 500);
  }

  // Provider Selection (Step 1 - now combined with API key)
  
  function initProviderSelection() {
    const cards = document.querySelectorAll('.provider-card');
    const apiKeySection = document.getElementById('apiKeySection');
    const geminiSection = document.getElementById('geminiKeySection');
    const perplexitySection = document.getElementById('perplexityKeySection');
    const openaiSection = document.getElementById('openaiKeySection');
    
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const provider = card.dataset.provider;
        
        // Update UI
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        
        // Update state
        state.config.aiProvider = provider;
        
        // Reset validation when provider changes
        state.validation.apiKeyValid = false;
        state.validation.apiKeyChecked = false;
        
        // Show API key section and correct provider fields
        if (apiKeySection) {
          apiKeySection.style.display = 'block';
        }
        if (geminiSection) {
          geminiSection.style.display = provider === 'gemini' ? 'block' : 'none';
        }
        if (perplexitySection) {
          perplexitySection.style.display = provider === 'perplexity' ? 'block' : 'none';
        }
        if (openaiSection) {
          openaiSection.style.display = provider === 'openai' ? 'block' : 'none';
        }
        
        // Auto-validate if we have dev keys
        let input = null;
        if (provider === 'gemini') {
          input = document.getElementById('geminiApiKey');
        } else if (provider === 'perplexity') {
          input = document.getElementById('perplexityApiKey');
        } else if (provider === 'openai') {
          input = document.getElementById('openaiApiKey');
        }
        if (input && input.value.length >= 20 && !state.validation.apiKeyChecked) {
          validateApiKey(input.value);
        }
        
        updateNavButtons();
      });
    });
    
    // Pre-select if we have a dev key
    if ('${devOpenAIKey}') {
      const openaiCard = document.querySelector('[data-provider="openai"]');
      if (openaiCard) {
        openaiCard.click();
      }
    } else if ('${devPerplexityKey}') {
      const perplexityCard = document.querySelector('[data-provider="perplexity"]');
      if (perplexityCard) {
        perplexityCard.click();
      }
    } else if ('${devGeminiKey}') {
      const geminiCard = document.querySelector('[data-provider="gemini"]');
      if (geminiCard) {
        geminiCard.click();
      }
    }
  }

  // API Key Validation (now part of Step 1)
  
  let validationTimeout = null;
  
  function initApiKeyValidation() {
    const geminiInput = document.getElementById('geminiApiKey');
    const perplexityInput = document.getElementById('perplexityApiKey');
    const openaiInput = document.getElementById('openaiApiKey');
    
    // Gemini key input
    if (geminiInput) {
      geminiInput.addEventListener('input', (e) => {
        state.config.geminiApiKey = e.target.value;
        debouncedValidation(e.target.value);
      });
    }
    
    // Perplexity key input
    if (perplexityInput) {
      perplexityInput.addEventListener('input', (e) => {
        state.config.perplexityApiKey = e.target.value;
        debouncedValidation(e.target.value);
      });
    }
    
    // OpenAI key input
    if (openaiInput) {
      openaiInput.addEventListener('input', (e) => {
        state.config.openaiApiKey = e.target.value;
        debouncedValidation(e.target.value);
      });
    }
    
    // Grounding checkbox - DISABLED (incompatible with structured output)
    // const groundingCheckbox = document.getElementById('enableGrounding');
    // if (groundingCheckbox) {
    //   groundingCheckbox.addEventListener('change', () => {
    //     state.config.enableGrounding = groundingCheckbox.checked;
    //   });
    // }
  }

  function debouncedValidation(value) {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }
    
    if (value.length < 20) {
      updateKeyStatus('', '');
      state.validation.apiKeyValid = false;
      updateNavButtons();
      return;
    }
    
    updateKeyStatus('loading', '⏳ Validating API key...');
    
    validationTimeout = setTimeout(() => {
      validateApiKey(value);
    }, 600);
  }

  async function validateApiKey(key) {
    state.isValidating = true;
    updateNavButtons();
    
    try {
      const response = await fetch('/configure/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: state.config.aiProvider,
          apiKey: key
        })
      });
      
      const result = await response.json();
      
      state.validation.apiKeyChecked = true;
      
      if (result.valid) {
        state.validation.apiKeyValid = true;
        
        if (result.models) {
          state.validation.availableModels = result.models;
          updateModelDropdown(result.models, state.config.aiProvider);
          const modelCount = result.models.filter(m => m.available !== false).length;
          updateKeyStatus('success', '✓ API key valid! ' + modelCount + ' models available.');
        } else {
          updateKeyStatus('success', '✓ API key valid!');
        }
      } else {
        state.validation.apiKeyValid = false;
        updateKeyStatus('error', '✗ ' + (result.error || 'Invalid API key'));
      }
    } catch (err) {
      state.validation.apiKeyValid = false;
      updateKeyStatus('error', '✗ Network error. Check your connection.');
    } finally {
      state.isValidating = false;
      updateNavButtons();
    }
  }

  function updateKeyStatus(type, message) {
    const statusEl = document.getElementById('keyStatus');
    if (!statusEl) return;
    
    statusEl.className = 'form-status';
    if (type && message) {
      statusEl.classList.add('visible', type);
      
      // Add skeleton loader for loading state
      if (type === 'loading') {
        statusEl.innerHTML = '<span class="loading-spinner-small"></span> ' + message;
      } else if (type === 'success') {
        // Add pulse animation for success
        statusEl.innerHTML = message;
        statusEl.classList.add('pulse-success');
        setTimeout(() => statusEl.classList.remove('pulse-success'), 600);
      } else {
        statusEl.innerHTML = message;
      }
      
      // Announce to screen readers
      statusEl.setAttribute('role', 'status');
      statusEl.setAttribute('aria-live', 'polite');
    }
  }

  function updateModelDropdown(models, provider) {
    let selectId, configKey, defaultModel;
    
    if (provider === 'gemini') {
      selectId = 'geminiModel';
      configKey = 'geminiModel';
      defaultModel = 'gemini-2.5-flash-lite';
    } else if (provider === 'perplexity') {
      selectId = 'perplexityModel';
      configKey = 'perplexityModel';
      defaultModel = 'sonar-pro';
    } else if (provider === 'openai') {
      selectId = 'openaiModel';
      configKey = 'openaiModel';
      defaultModel = 'gpt-4o-mini';
    } else {
      return;
    }
    
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '';
    select.disabled = false;
    
    let firstAvailable = null;
    let hasDefaultModel = false;
    
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      
      let label = model.name;
      const isAvailable = model.available !== false;
      
      if (isAvailable) {
        if (!firstAvailable) firstAvailable = model.id;
        if (model.id === defaultModel || model.id.startsWith(defaultModel)) hasDefaultModel = true;
        
        if (provider === 'gemini') {
          label += model.freeTier ? ' ✓ Free' : ' 💰 Paid';
        } else if (provider === 'openai') {
          if (model.tier === 'premium') {
            label += ' 💎';
          }
        } else if (model.tier === 'reasoning') {
          label += ' 🧠';
        } else if (model.tier === 'research') {
          label += ' 🔬';
        }
      } else {
        label += ' ❌ Unavailable';
        option.disabled = true;
      }
      
      option.textContent = label;
      select.appendChild(option);
    });
    
    // Select default model if available, otherwise first available
    const selectedModel = hasDefaultModel ? defaultModel : firstAvailable;
    if (selectedModel) {
      select.value = selectedModel;
      state.config[configKey] = selectedModel;
    }
    
    // Remove old listener and add new one
    const newSelect = select.cloneNode(true);
    select.parentNode.replaceChild(newSelect, select);
    
    newSelect.addEventListener('change', (e) => {
      state.config[configKey] = e.target.value;
    });
  }

  // Location Setup (Step 3)
  
  function initLocationSetup() {
    const tzSelect = document.getElementById('timezone');
    const countrySelect = document.getElementById('country');
    
    if (tzSelect) {
      // Populate timezones
      populateTimezones(tzSelect);
      
      // Auto-detect timezone
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        // Try to select it, or add it
        let found = false;
        for (const opt of tzSelect.options) {
          if (opt.value === detected) {
            opt.selected = true;
            found = true;
            break;
          }
        }
        
        if (!found) {
          const option = document.createElement('option');
          option.value = detected;
          option.textContent = formatTimezone(detected) + ' (Detected)';
          option.selected = true;
          tzSelect.insertBefore(option, tzSelect.firstChild);
        }
        
        state.config.timezone = detected;
      }
      
      tzSelect.addEventListener('change', (e) => {
        state.config.timezone = e.target.value;
        // Auto-update country based on timezone
        const guessedCountry = tzToCountryMap[e.target.value];
        if (guessedCountry && countrySelect) {
          countrySelect.value = guessedCountry;
          state.config.country = guessedCountry;
        }
        updateNavButtons();
      });
    }
    
    if (countrySelect) {
      // Populate countries
      populateCountries(countrySelect);
      
      // Set default based on timezone
      const detected = state.config.timezone;
      const guessedCountry = tzToCountryMap[detected] || 'US';
      countrySelect.value = guessedCountry;
      state.config.country = guessedCountry;
      
      countrySelect.addEventListener('change', (e) => {
        state.config.country = e.target.value;
        updateNavButtons();
      });
    }
    
    // Weather location search
    initWeatherLocationSearch();
  }

  const tzToCountryMap = ${JSON.stringify(TZ_TO_COUNTRY)};

  function populateTimezones(select) {
    const regions = ${JSON.stringify(TIMEZONES_BY_REGION)};
    
    select.innerHTML = '';
    
    for (const [region, zones] of Object.entries(regions)) {
      const group = document.createElement('optgroup');
      group.label = region;
      
      zones.forEach(tz => {
        const option = document.createElement('option');
        option.value = tz;
        option.textContent = formatTimezone(tz);
        group.appendChild(option);
      });
      
      select.appendChild(group);
    }
  }

  function formatTimezone(tz) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'short'
      });
      const parts = formatter.formatToParts(new Date());
      const tzName = parts.find(p => p.type === 'timeZoneName')?.value || '';
      const cityName = tz.split('/').pop().replace(/_/g, ' ');
      return cityName + ' (' + tzName + ')';
    } catch {
      return tz;
    }
  }

  function populateCountries(select) {
    const countries = ${JSON.stringify(COUNTRIES)};
    
    select.innerHTML = '';
    
    countries.forEach(c => {
      const option = document.createElement('option');
      option.value = c.code;
      option.textContent = c.name;
      select.appendChild(option);
    });
  }

  let locationSearchTimeout = null;
  
  function initWeatherLocationSearch() {
    const toggle = document.getElementById('weatherToggle');
    const section = document.getElementById('weatherLocationSection');
    const searchInput = document.getElementById('locationSearch');
    const resultsEl = document.getElementById('locationResults');
    const useLocationBtn = document.getElementById('useMyLocationBtn');
    
    if (toggle && section) {
      toggle.addEventListener('change', () => {
        state.config.enableWeatherContext = toggle.checked;
        section.style.display = toggle.checked ? 'block' : 'none';
      });
    }
    
    // "Use My Location" button handler
    if (useLocationBtn) {
      useLocationBtn.addEventListener('click', useMyLocation);
    }
    
    if (searchInput && resultsEl) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        
        if (locationSearchTimeout) {
          clearTimeout(locationSearchTimeout);
        }
        
        if (query.length < 2) {
          resultsEl.style.display = 'none';
          return;
        }
        
        locationSearchTimeout = setTimeout(async () => {
          try {
            const response = await fetch('/configure/search-locations?q=' + encodeURIComponent(query));
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
              resultsEl.innerHTML = data.results.map(loc => 
                '<div class="location-result" data-name="' + escapeHtml(loc.name) + '" data-country="' + escapeHtml(loc.country) + 
                '" data-lat="' + escapeHtml(loc.latitude) + '" data-lon="' + escapeHtml(loc.longitude) + 
                '" data-admin1="' + escapeHtml(loc.admin1 || '') + '" data-label="' + escapeHtml(loc.label) + '">' +
                '📍 ' + escapeHtml(loc.label) + '</div>'
              ).join('');
              
              resultsEl.style.display = 'block';
              
              // Add click handlers
              resultsEl.querySelectorAll('.location-result').forEach(item => {
                item.addEventListener('click', () => selectLocation(item));
              });
            } else {
              resultsEl.innerHTML = '<div class="location-result" style="color: var(--text-muted);">No results</div>';
              resultsEl.style.display = 'block';
            }
          } catch (err) {
            resultsEl.style.display = 'none';
          }
        }, 300);
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsEl.contains(e.target)) {
          resultsEl.style.display = 'none';
        }
      });
    }
  }

  function selectLocation(item) {
    const searchInput = document.getElementById('locationSearch');
    const resultsEl = document.getElementById('locationResults');
    const selectedEl = document.getElementById('selectedLocation');
    
    state.config.weatherLocation = {
      name: item.dataset.name,
      country: item.dataset.country,
      latitude: parseFloat(item.dataset.lat),
      longitude: parseFloat(item.dataset.lon),
      admin1: item.dataset.admin1 || ''
    };
    
    if (searchInput) {
      searchInput.value = item.dataset.label;
    }
    
    if (selectedEl) {
      selectedEl.textContent = '✓ Weather location set';
      selectedEl.style.color = 'var(--success)';
    }
    
    if (resultsEl) {
      resultsEl.style.display = 'none';
    }
  }

  async function useMyLocation() {
    const btn = document.getElementById('useMyLocationBtn');
    const searchInput = document.getElementById('locationSearch');
    const selectedEl = document.getElementById('selectedLocation');
    
    if (!navigator.geolocation) {
      if (selectedEl) {
        selectedEl.textContent = '⚠️ Geolocation not supported by your browser';
        selectedEl.style.color = 'var(--error)';
      }
      return;
    }
    
    // Update button state
    if (btn) {
      btn.disabled = true;
      btn.textContent = '📍 Getting location...';
    }
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000
        });
      });
      
      const { latitude, longitude } = position.coords;
      
      // Reverse geocode using OpenStreetMap Nominatim
      const response = await fetch(
        'https://nominatim.openstreetmap.org/reverse?lat=' + latitude + 
        '&lon=' + longitude + '&format=json&accept-language=en',
        { headers: { 'User-Agent': 'Watchwyrd-Stremio-Addon' } }
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      const addr = data.address || {};
      
      // Extract city name (try multiple fields)
      const cityName = addr.city || addr.town || addr.village || addr.municipality || addr.county || 'Unknown';
      const countryCode = addr.country_code ? addr.country_code.toUpperCase() : '';
      const addrState = addr.state || '';
      
      // Set the location
      const label = cityName + (addrState ? ', ' + addrState : '') + (countryCode ? ', ' + countryCode : '');
      
      state.config.weatherLocation = {
        name: cityName,
        country: countryCode,
        latitude: latitude,
        longitude: longitude,
        admin1: addrState
      };
      
      if (searchInput) {
        searchInput.value = label;
      }
      
      if (selectedEl) {
        selectedEl.textContent = '✓ Location detected: ' + label;
        selectedEl.style.color = 'var(--success)';
      }
      
    } catch (err) {
      let message = '⚠️ Could not get location';
      if (err.code === 1) {
        message = '⚠️ Location access denied. Please allow access in your browser.';
      } else if (err.code === 2) {
        message = '⚠️ Location unavailable';
      } else if (err.code === 3) {
        message = '⚠️ Location request timed out';
      }
      
      if (selectedEl) {
        selectedEl.textContent = message;
        selectedEl.style.color = 'var(--error)';
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '📍 Use My Location';
      }
    }
  }

  // Content Preferences (Step 4)
  
  function initContentPreferences() {
    // Profile selection
    const profileCards = document.querySelectorAll('.profile-card');
    profileCards.forEach(card => {
      card.addEventListener('click', () => {
        profileCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        state.config.presetProfile = card.dataset.profile;
        
        // Show/hide custom options
        const customSection = document.getElementById('customOptions');
        if (customSection) {
          customSection.style.display = card.dataset.profile === 'custom' ? 'block' : 'none';
        }
      });
    });
    
    // Content type toggles
    const moviesToggle = document.getElementById('includeMovies');
    const seriesToggle = document.getElementById('includeSeries');
    
    if (moviesToggle) {
      moviesToggle.addEventListener('change', () => {
        state.config.includeMovies = moviesToggle.checked;
        updateNavButtons();
      });
    }
    
    if (seriesToggle) {
      seriesToggle.addEventListener('change', () => {
        state.config.includeSeries = seriesToggle.checked;
        updateNavButtons();
      });
    }
    
    // Feature toggles
    const showExplanationsToggle = document.getElementById('showExplanations');
    if (showExplanationsToggle) {
      showExplanationsToggle.addEventListener('change', () => {
        state.config.showExplanations = showExplanationsToggle.checked;
      });
    }
    
    // RPDB API Key
    const rpdbApiKeyInput = document.getElementById('rpdbApiKey');
    if (rpdbApiKeyInput) {
      // Initialize state with pre-filled value (from env in dev mode)
      if (rpdbApiKeyInput.value) {
        state.config.rpdbApiKey = rpdbApiKeyInput.value.trim();
      }
      rpdbApiKeyInput.addEventListener('input', () => {
        state.config.rpdbApiKey = rpdbApiKeyInput.value.trim();
      });
    }
    
    // Catalog size
    const catalogSizeSelect = document.getElementById('catalogSize');
    if (catalogSizeSelect) {
      catalogSizeSelect.addEventListener('change', () => {
        state.config.catalogSize = parseInt(catalogSizeSelect.value);
      });
    }
    
    // Request timeout
    const requestTimeoutSelect = document.getElementById('requestTimeout');
    if (requestTimeoutSelect) {
      requestTimeoutSelect.addEventListener('change', () => {
        state.config.requestTimeout = parseInt(requestTimeoutSelect.value);
      });
    }
    
    // Genre tags
    initGenreTags();
  }

  function initGenreTags() {
    const tags = document.querySelectorAll('.genre-tag');
    
    tags.forEach(tag => {
      // Click handler
      tag.addEventListener('click', () => toggleGenreTag(tag));
      
      // Keyboard handler for accessibility
      tag.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleGenreTag(tag);
        }
      });
    });
  }
  
  function toggleGenreTag(tag) {
    const isSelected = tag.classList.contains('selected');
    const icon = tag.querySelector('.tag-icon');
    
    if (isSelected) {
      // Exclude it: remove selected, add excluded, show X
      tag.classList.remove('selected');
      tag.classList.add('excluded');
      tag.setAttribute('aria-checked', 'false');
      if (icon) icon.textContent = '✕';
    } else {
      // Include it: remove excluded, add selected, show checkmark
      tag.classList.remove('excluded');
      tag.classList.add('selected');
      tag.setAttribute('aria-checked', 'true');
      if (icon) icon.textContent = '✓';
    }
    
    // Update excluded genres (inverted: selected = included)
    const allTags = document.querySelectorAll('.genre-tag');
    const allGenres = Array.from(allTags).map(t => t.dataset.genre);
    const selectedGenres = Array.from(allTags)
      .filter(t => t.classList.contains('selected'))
      .map(t => t.dataset.genre);
    
    state.config.excludedGenres = allGenres.filter(g => !selectedGenres.includes(g));
    updateNavButtons();
  }

  // Review & Submit (Step 4)
  
  function initReviewStep() {
    // Update review summary when step 4 is shown
    const observer = new MutationObserver(() => {
      if (wizard.steps[3]?.style.display !== 'none') {
        updateReviewSummary();
      }
    });
    
    wizard.steps.forEach(step => {
      observer.observe(step, { attributes: true, attributeFilter: ['style'] });
    });
  }

  function updateReviewSummary() {
    const summaryEl = document.getElementById('configSummary');
    if (!summaryEl) return;
    
    const c = state.config;
    
    summaryEl.innerHTML = \`
      <div class="summary-group">
        <div class="summary-label">AI Provider</div>
        <div class="summary-value">\${c.aiProvider === 'gemini' ? '✨ Google Gemini' : '🔮 Perplexity AI'}</div>
      </div>
      <div class="summary-group">
        <div class="summary-label">Model</div>
        <div class="summary-value">\${c.aiProvider === 'gemini' ? c.geminiModel : c.perplexityModel}</div>
      </div>
      <div class="summary-group">
        <div class="summary-label">Location</div>
        <div class="summary-value">\${formatTimezone(c.timezone)}, \${c.country}</div>
      </div>
      <div class="summary-group">
        <div class="summary-label">Content</div>
        <div class="summary-value">
          \${[c.includeMovies && '🎬 Movies', c.includeSeries && '📺 Series'].filter(Boolean).join(', ')}
        </div>
      </div>
      <div class="summary-group">
        <div class="summary-label">Items per catalog</div>
        <div class="summary-value">\${c.catalogSize}</div>
      </div>
      \${c.enableWeatherContext && c.weatherLocation ? \`
        <div class="summary-group">
          <div class="summary-label">Weather</div>
          <div class="summary-value">🌤️ \${c.weatherLocation.name}, \${c.weatherLocation.country}</div>
        </div>
      \` : ''}
    \`;
  }

  async function submitConfiguration() {
    wizard.nextBtn.disabled = true;
    wizard.nextBtn.innerHTML = '<span class="loading-spinner-small"></span> Generating...';
    
    try {
      // Build form data for POST
      const formData = new URLSearchParams();
      const c = state.config;
      
      formData.append('aiProvider', c.aiProvider);
      formData.append('geminiApiKey', c.geminiApiKey);
      formData.append('geminiModel', c.geminiModel);
      formData.append('perplexityApiKey', c.perplexityApiKey);
      formData.append('perplexityModel', c.perplexityModel);
      formData.append('timezone', c.timezone);
      formData.append('country', c.country);
      formData.append('presetProfile', c.presetProfile);
      formData.append('includeMovies', c.includeMovies ? 'true' : 'false');
      formData.append('includeSeries', c.includeSeries ? 'true' : 'false');
      formData.append('enableWeatherContext', c.enableWeatherContext ? 'true' : 'false');
      // enableGrounding disabled - incompatible with structured output
      formData.append('showExplanations', c.showExplanations ? 'true' : 'false');
      formData.append('catalogSize', c.catalogSize.toString());
      formData.append('requestTimeout', c.requestTimeout.toString());
      
      if (c.rpdbApiKey) {
        formData.append('rpdbApiKey', c.rpdbApiKey);
      }
      
      if (c.weatherLocation) {
        formData.append('weatherLocationName', c.weatherLocation.name);
        formData.append('weatherLocationCountry', c.weatherLocation.country);
        formData.append('weatherLocationLat', c.weatherLocation.latitude.toString());
        formData.append('weatherLocationLon', c.weatherLocation.longitude.toString());
        formData.append('weatherLocationAdmin1', c.weatherLocation.admin1);
      }
      
      // Selected genres (those NOT excluded)
      const allGenres = ${JSON.stringify(VALID_GENRES)};
      const selectedGenres = allGenres.filter(g => !c.excludedGenres.includes(g));
      selectedGenres.forEach(g => formData.append('genres', g));
      
      // Submit
      const response = await fetch('/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      
      if (response.ok) {
        // Replace page with success page
        const html = await response.text();
        document.body.innerHTML = html;
        
        // Execute any scripts in the new content
        const scripts = document.body.querySelectorAll('script');
        scripts.forEach(script => {
          const newScript = document.createElement('script');
          newScript.textContent = script.textContent;
          script.parentNode.replaceChild(newScript, script);
        });
      } else {
        throw new Error('Server error');
      }
    } catch (err) {
      wizard.nextBtn.disabled = false;
      wizard.nextBtn.textContent = '🚀 Generate Install Link';
      alert('Failed to generate configuration. Please try again.');
    }
  }

  // Event Listeners
  
  function initEventListeners() {
    // Navigation buttons
    if (wizard.prevBtn) {
      wizard.prevBtn.addEventListener('click', prevStep);
    }
    
    if (wizard.nextBtn) {
      wizard.nextBtn.addEventListener('click', nextStep);
    }
    
    // Progress step clicks
    wizard.progressSteps.forEach((step, index) => {
      step.addEventListener('click', () => goToStep(index + 1));
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      // Enter to continue (not in textareas or when validating)
      if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
        if (!wizard.nextBtn.disabled && !state.isValidating) {
          e.preventDefault();
          nextStep();
        }
      }
      // Escape to go back
      if (e.key === 'Escape' && state.currentStep > 1) {
        e.preventDefault();
        prevStep();
      }
    });
    
    // Save state to localStorage on changes
    initFormPersistence();
  }
  
  // Form Persistence (localStorage)
  
  const STORAGE_KEY = 'watchwyrd_wizard_state';
  
  function initFormPersistence() {
    // Try to restore from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only restore non-sensitive data (not API keys)
        if (parsed.config) {
          state.config.aiProvider = parsed.config.aiProvider || '';
          state.config.timezone = parsed.config.timezone || '';
          state.config.country = parsed.config.country || '';
          state.config.includeMovies = parsed.config.includeMovies ?? true;
          state.config.includeSeries = parsed.config.includeSeries ?? true;
          state.config.enableWeatherContext = parsed.config.enableWeatherContext ?? false;
          state.config.catalogSize = parsed.config.catalogSize || 20;
          state.config.requestTimeout = parsed.config.requestTimeout || 30;
          state.config.showExplanations = parsed.config.showExplanations ?? true;
          state.config.excludedGenres = parsed.config.excludedGenres || [];
          
          // Restore UI based on saved state
          restoreUIFromState();
          showPersistenceIndicator('✓ Restored previous settings');
        }
      }
    } catch (e) {
      console.log('Could not restore wizard state:', e);
    }
    
    // Save on every change (debounced)
    let saveTimeout = null;
    const originalUpdateNavButtons = updateNavButtons;
    updateNavButtons = function() {
      originalUpdateNavButtons();
      // Debounce save
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveState, 500);
    };
  }
  
  function saveState() {
    try {
      // Don't save API keys!
      const toSave = {
        config: {
          aiProvider: state.config.aiProvider,
          timezone: state.config.timezone,
          country: state.config.country,
          includeMovies: state.config.includeMovies,
          includeSeries: state.config.includeSeries,
          enableWeatherContext: state.config.enableWeatherContext,
          catalogSize: state.config.catalogSize,
          requestTimeout: state.config.requestTimeout,
          showExplanations: state.config.showExplanations,
          excludedGenres: state.config.excludedGenres,
        },
        savedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.log('Could not save wizard state:', e);
    }
  }
  
  function restoreUIFromState() {
    // Restore provider selection
    if (state.config.aiProvider) {
      const card = document.querySelector('[data-provider="' + state.config.aiProvider + '"]');
      if (card) {
        document.querySelectorAll('.provider-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      }
    }
    
    // Restore content types
    const moviesToggle = document.getElementById('includeMovies');
    const seriesToggle = document.getElementById('includeSeries');
    if (moviesToggle) moviesToggle.checked = state.config.includeMovies;
    if (seriesToggle) seriesToggle.checked = state.config.includeSeries;
    
    // Restore catalog size
    const catalogSizeSelect = document.getElementById('catalogSize');
    if (catalogSizeSelect) catalogSizeSelect.value = state.config.catalogSize.toString();
    
    // Restore request timeout
    const timeoutSelect = document.getElementById('requestTimeout');
    if (timeoutSelect) timeoutSelect.value = state.config.requestTimeout.toString();
    
    // Restore genre tags
    if (state.config.excludedGenres.length > 0) {
      const tags = document.querySelectorAll('.genre-tag');
      tags.forEach(tag => {
        const genre = tag.dataset.genre;
        if (state.config.excludedGenres.includes(genre)) {
          tag.classList.remove('selected');
          tag.classList.add('excluded');
          const icon = tag.querySelector('.tag-icon');
          if (icon) icon.textContent = '✕';
          tag.setAttribute('aria-checked', 'false');
        }
      });
    }
    
    // Restore explanations toggle
    const showExplanationsToggle = document.getElementById('showExplanations');
    if (showExplanationsToggle) showExplanationsToggle.checked = state.config.showExplanations;
    
    // Restore weather toggle
    const weatherToggle = document.getElementById('weatherToggle');
    if (weatherToggle && state.config.enableWeatherContext) {
      weatherToggle.checked = true;
      const section = document.getElementById('weatherLocationSection');
      if (section) section.style.display = 'block';
    }
  }
  
  function showPersistenceIndicator(message) {
    const indicator = document.createElement('div');
    indicator.className = 'persistence-indicator';
    indicator.textContent = message;
    document.body.appendChild(indicator);
    
    setTimeout(() => indicator.classList.add('visible'), 100);
    setTimeout(() => {
      indicator.classList.remove('visible');
      setTimeout(() => indicator.remove(), 300);
    }, 2500);
  }

  // Initialize
  
  function init() {
    // Check for URL query params (deep linking)
    initDeepLinking();
    
    initProviderSelection();
    initApiKeyValidation();
    initLocationSetup();
    initContentPreferences();
    initReviewStep();
    initEventListeners();
    
    // Show first step
    showStep(1);
    
    console.log('🔮 Watchwyrd wizard initialized');
  }
  
  // Deep Linking Support
  
  function initDeepLinking() {
    const params = new URLSearchParams(window.location.search);
    
    // Pre-select provider from URL
    const provider = params.get('provider');
    if (provider && (provider === 'gemini' || provider === 'perplexity')) {
      state.config.aiProvider = provider;
    }
    
    // Pre-fill other settings from URL
    const movies = params.get('movies');
    if (movies !== null) {
      state.config.includeMovies = movies !== 'false' && movies !== '0';
    }
    
    const series = params.get('series');
    if (series !== null) {
      state.config.includeSeries = series !== 'false' && series !== '0';
    }
    
    const size = params.get('size');
    if (size) {
      const parsed = parseInt(size);
      if ([5, 10, 20, 30, 50].includes(parsed)) {
        state.config.catalogSize = parsed;
      }
    }
    
    // Clear URL params after reading (cleaner URL)
    if (params.toString()) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  // Third-party section toggle (global function)
  window.toggleThirdParty = function() {
    const toggle = document.querySelector('.third-party-toggle');
    const content = document.getElementById('thirdPartyContent');
    if (toggle && content) {
      toggle.classList.toggle('expanded');
      content.classList.toggle('visible');
    }
  };

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>
`;
}

/**
 * Generate the success page script
 */
export function getSuccessPageScript(): string {
  return `
<script>
// Confetti celebration animation
function createConfetti() {
  const container = document.getElementById('confettiContainer');
  if (!container) return;
  
  const colors = ['#7c3aed', '#a78bfa', '#238636', '#f59e0b', '#ef4444', '#3b82f6'];
  const confettiCount = 50;
  
  for (let i = 0; i < confettiCount; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = (Math.random() * 2) + 's';
    piece.style.animationDuration = (2 + Math.random() * 2) + 's';
    
    // Random shapes
    const shapes = ['circle', 'square', 'triangle'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    if (shape === 'circle') {
      piece.style.borderRadius = '50%';
    } else if (shape === 'triangle') {
      piece.style.width = '0';
      piece.style.height = '0';
      piece.style.backgroundColor = 'transparent';
      piece.style.borderLeft = '5px solid transparent';
      piece.style.borderRight = '5px solid transparent';
      piece.style.borderBottom = '10px solid ' + colors[Math.floor(Math.random() * colors.length)];
    }
    
    container.appendChild(piece);
  }
  
  // Clean up after animation
  setTimeout(() => {
    container.innerHTML = '';
  }, 5000);
}

function copyUrl() {
  const url = document.getElementById('installUrl').textContent;
  const btn = document.getElementById('copyBtn');
  
  async function doCopy() {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        return true;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }
  
  doCopy().then(success => {
    if (success) {
      btn.textContent = '✅ Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = '📋 Copy';
        btn.classList.remove('copied');
      }, 2000);
    }
  }).catch(() => {
    btn.textContent = '❌ Failed';
    setTimeout(() => {
      btn.textContent = '📋 Copy';
    }, 2000);
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  createConfetti();
});

// Also run if already loaded
if (document.readyState !== 'loading') {
  createConfetti();
}
</script>
`;
}
