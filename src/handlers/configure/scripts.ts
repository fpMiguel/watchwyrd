/**
 * Watchwyrd - Configure Page Client Scripts
 *
 * Client-side JavaScript for the configuration wizard.
 * Handles step navigation, validation, and interactivity.
 */

import { TIMEZONES_BY_REGION, COUNTRIES, TZ_TO_COUNTRY, ALL_GENRES } from './data.js';

/**
 * Generate the client-side JavaScript for the wizard
 */
export function getWizardScript(devGeminiKey: string, devPerplexityKey: string): string {
  return `
<script>
(function() {
  'use strict';

  // =========================================================================
  // Configuration State
  // =========================================================================
  
  const state = {
    currentStep: 1,
    totalSteps: 5,
    isValidating: false,
    config: {
      aiProvider: '',
      geminiApiKey: '${devGeminiKey}',
      geminiModel: '',
      perplexityApiKey: '${devPerplexityKey}',
      perplexityModel: 'sonar',
      timezone: '',
      country: '',
      presetProfile: 'casual',
      includeMovies: true,
      includeSeries: true,
      maxRating: 'R',
      noveltyBias: 50,
      popularityBias: 50,
      includeNewReleases: true,
      enableSeasonalThemes: true,
      enableTimeContext: true,
      enableWeatherContext: false,
      enableHolidayContext: true,
      enableOnThisDayContext: true,
      weatherLocation: null,
      showExplanations: true,
      catalogSize: 20,
      preferredLanguages: ['en'],
      excludedGenres: []
    },
    validation: {
      apiKeyValid: false,
      apiKeyChecked: false,
      availableModels: []
    }
  };

  // =========================================================================
  // DOM Elements
  // =========================================================================
  
  const wizard = {
    steps: document.querySelectorAll('.wizard-step'),
    progressSteps: document.querySelectorAll('.progress-step'),
    progressFill: document.querySelector('.progress-line-fill'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    form: document.getElementById('wizardForm')
  };

  // =========================================================================
  // Step Navigation
  // =========================================================================
  
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
    
    // Step 1 (provider) -> Step 2 (API key): need provider selected
    if (stepNum === 2 && !state.config.aiProvider) return false;
    
    // Step 2 (API key) -> Step 3+: need valid API key
    if (stepNum > 2 && !state.validation.apiKeyValid) return false;
    
    // Can only go one step forward
    if (stepNum > state.currentStep + 1) return false;
    
    return true;
  }

  function validateCurrentStep() {
    switch (state.currentStep) {
      case 1: // Provider selection
        return !!state.config.aiProvider;
      
      case 2: // API Key
        return state.validation.apiKeyValid;
      
      case 3: // Location
        return !!state.config.timezone && !!state.config.country;
      
      case 4: // Preferences
        return state.config.includeMovies || state.config.includeSeries;
      
      case 5: // Review
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
    
    // Focus first input in new step
    setTimeout(() => {
      const firstInput = wizard.steps[stepNum - 1]?.querySelector('input, select');
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

  // =========================================================================
  // Provider Selection (Step 1)
  // =========================================================================
  
  function initProviderSelection() {
    const cards = document.querySelectorAll('.provider-card');
    
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
        
        updateNavButtons();
      });
    });
    
    // Pre-select if we have a dev key
    if ('${devPerplexityKey}') {
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

  // =========================================================================
  // API Key Validation (Step 2)
  // =========================================================================
  
  let validationTimeout = null;
  
  function initApiKeyValidation() {
    const geminiInput = document.getElementById('geminiApiKey');
    const perplexityInput = document.getElementById('perplexityApiKey');
    const geminiSection = document.getElementById('geminiKeySection');
    const perplexitySection = document.getElementById('perplexityKeySection');
    
    // Show correct section based on provider
    function updateKeySection() {
      if (geminiSection) {
        geminiSection.style.display = state.config.aiProvider === 'gemini' ? 'block' : 'none';
      }
      if (perplexitySection) {
        perplexitySection.style.display = state.config.aiProvider === 'perplexity' ? 'block' : 'none';
      }
    }
    
    // Observer to detect when step 2 becomes visible
    const observer = new MutationObserver(() => {
      if (wizard.steps[1]?.style.display !== 'none') {
        updateKeySection();
        
        // Auto-validate if we have dev keys
        const input = state.config.aiProvider === 'gemini' ? geminiInput : perplexityInput;
        if (input && input.value.length >= 20 && !state.validation.apiKeyChecked) {
          validateApiKey(input.value);
        }
      }
    });
    
    wizard.steps.forEach(step => {
      observer.observe(step, { attributes: true, attributeFilter: ['style'] });
    });
    
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
          updateModelDropdown(result.models);
          updateKeyStatus('success', '✓ API key valid! ' + result.models.filter(m => m.available).length + ' models available.');
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
      statusEl.innerHTML = message;
    }
  }

  function updateModelDropdown(models) {
    const select = document.getElementById('geminiModel');
    if (!select || state.config.aiProvider !== 'gemini') return;
    
    select.innerHTML = '';
    select.disabled = false;
    
    let firstAvailable = null;
    
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      
      let label = model.name;
      if (model.available) {
        if (!firstAvailable) firstAvailable = model.id;
        label += model.freeTier ? ' ✓ Free' : ' 💰 Paid';
      } else {
        label += ' ❌ Unavailable';
        option.disabled = true;
      }
      
      option.textContent = label;
      select.appendChild(option);
    });
    
    if (firstAvailable) {
      select.value = firstAvailable;
      state.config.geminiModel = firstAvailable;
    }
    
    select.addEventListener('change', (e) => {
      state.config.geminiModel = e.target.value;
    });
  }

  // =========================================================================
  // Location Setup (Step 3)
  // =========================================================================
  
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
    
    // Holiday toggle
    initHolidayToggle();
    
    // On This Day toggle
    initOnThisDayToggle();
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
  
  function initHolidayToggle() {
    const toggle = document.getElementById('holidayToggle');
    if (toggle) {
      toggle.checked = state.config.enableHolidayContext;
      toggle.addEventListener('change', () => {
        state.config.enableHolidayContext = toggle.checked;
      });
    }
  }
  
  function initOnThisDayToggle() {
    const toggle = document.getElementById('onThisDayToggle');
    if (toggle) {
      toggle.checked = state.config.enableOnThisDayContext;
      toggle.addEventListener('change', () => {
        state.config.enableOnThisDayContext = toggle.checked;
      });
    }
  }
  
  function initWeatherLocationSearch() {
    const toggle = document.getElementById('weatherToggle');
    const section = document.getElementById('weatherLocationSection');
    const searchInput = document.getElementById('locationSearch');
    const resultsEl = document.getElementById('locationResults');
    
    if (toggle && section) {
      toggle.addEventListener('change', () => {
        state.config.enableWeatherContext = toggle.checked;
        section.style.display = toggle.checked ? 'block' : 'none';
      });
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
                '<div class="location-result" data-name="' + loc.name + '" data-country="' + loc.country + 
                '" data-lat="' + loc.latitude + '" data-lon="' + loc.longitude + 
                '" data-admin1="' + (loc.admin1 || '') + '" data-label="' + loc.label + '">' +
                '📍 ' + loc.label + '</div>'
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

  // =========================================================================
  // Content Preferences (Step 4)
  // =========================================================================
  
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
    
    // Rating select
    const ratingSelect = document.getElementById('maxRating');
    if (ratingSelect) {
      ratingSelect.addEventListener('change', () => {
        state.config.maxRating = ratingSelect.value;
      });
    }
    
    // Sliders
    initSlider('noveltyBias', (val) => { state.config.noveltyBias = val; });
    initSlider('popularityBias', (val) => { state.config.popularityBias = val; });
    
    // Feature toggles
    const features = ['includeNewReleases', 'enableSeasonalThemes', 'enableTimeContext', 'showExplanations'];
    features.forEach(id => {
      const toggle = document.getElementById(id);
      if (toggle) {
        toggle.addEventListener('change', () => {
          state.config[id] = toggle.checked;
        });
      }
    });
    
    // Catalog size
    const catalogSizeSelect = document.getElementById('catalogSize');
    if (catalogSizeSelect) {
      catalogSizeSelect.addEventListener('change', () => {
        state.config.catalogSize = parseInt(catalogSizeSelect.value);
      });
    }
    
    // Genre tags
    initGenreTags();
  }

  function initSlider(id, onChange) {
    const slider = document.getElementById(id);
    const valueEl = document.getElementById(id + 'Value');
    
    if (slider && valueEl) {
      slider.addEventListener('input', () => {
        const val = parseInt(slider.value);
        valueEl.textContent = val;
        onChange(val);
      });
    }
  }

  function initGenreTags() {
    const tags = document.querySelectorAll('.genre-tag');
    
    tags.forEach(tag => {
      tag.addEventListener('click', () => {
        tag.classList.toggle('selected');
        
        // Update excluded genres (inverted: selected = included)
        const allGenres = Array.from(tags).map(t => t.dataset.genre);
        const selectedGenres = Array.from(tags)
          .filter(t => t.classList.contains('selected'))
          .map(t => t.dataset.genre);
        
        state.config.excludedGenres = allGenres.filter(g => !selectedGenres.includes(g));
      });
    });
  }

  // =========================================================================
  // Review & Submit (Step 5)
  // =========================================================================
  
  function initReviewStep() {
    // Update review summary when step 5 is shown
    const observer = new MutationObserver(() => {
      if (wizard.steps[4]?.style.display !== 'none') {
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
          (Max: \${c.maxRating})
        </div>
      </div>
      <div class="summary-group">
        <div class="summary-label">Profile</div>
        <div class="summary-value">\${c.presetProfile.charAt(0).toUpperCase() + c.presetProfile.slice(1)}</div>
      </div>
      <div class="summary-group">
        <div class="summary-label">Items per catalog</div>
        <div class="summary-value">\${c.catalogSize}</div>
      </div>
      \${c.enableHolidayContext ? \`
        <div class="summary-group">
          <div class="summary-label">Holidays</div>
          <div class="summary-value">🎉 Enabled for \${c.country}</div>
        </div>
      \` : ''}
      \${c.enableOnThisDayContext ? \`
        <div class="summary-group">
          <div class="summary-label">Historical Context</div>
          <div class="summary-value">📜 On This Day enabled</div>
        </div>
      \` : ''}
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
      formData.append('maxRating', c.maxRating);
      formData.append('noveltyBias', c.noveltyBias.toString());
      formData.append('popularityBias', c.popularityBias.toString());
      formData.append('includeNewReleases', c.includeNewReleases ? 'true' : 'false');
      formData.append('enableSeasonalThemes', c.enableSeasonalThemes ? 'true' : 'false');
      formData.append('enableTimeContext', c.enableTimeContext ? 'true' : 'false');
      formData.append('enableWeatherContext', c.enableWeatherContext ? 'true' : 'false');
      formData.append('enableHolidayContext', c.enableHolidayContext ? 'true' : 'false');
      formData.append('enableOnThisDayContext', c.enableOnThisDayContext ? 'true' : 'false');
      formData.append('showExplanations', c.showExplanations ? 'true' : 'false');
      formData.append('catalogSize', c.catalogSize.toString());
      
      if (c.weatherLocation) {
        formData.append('weatherLocationName', c.weatherLocation.name);
        formData.append('weatherLocationCountry', c.weatherLocation.country);
        formData.append('weatherLocationLat', c.weatherLocation.latitude.toString());
        formData.append('weatherLocationLon', c.weatherLocation.longitude.toString());
        formData.append('weatherLocationAdmin1', c.weatherLocation.admin1);
      }
      
      // Selected genres (those NOT excluded)
      const allGenres = ${JSON.stringify(ALL_GENRES)};
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
        document.body.innerHTML = await response.text();
      } else {
        throw new Error('Server error');
      }
    } catch (err) {
      wizard.nextBtn.disabled = false;
      wizard.nextBtn.textContent = '🚀 Generate Install Link';
      alert('Failed to generate configuration. Please try again.');
    }
  }

  // =========================================================================
  // Event Listeners
  // =========================================================================
  
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
      if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        nextStep();
      }
    });
  }

  // =========================================================================
  // Initialize
  // =========================================================================
  
  function init() {
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
function copyUrl() {
  const url = document.getElementById('installUrl').textContent;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✅ Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '📋 Copy';
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    // Fallback
    const textArea = document.createElement('textarea');
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✅ Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '📋 Copy';
      btn.classList.remove('copied');
    }, 2000);
  });
}
</script>
`;
}
