/**
 * Watchwyrd - Configure Page Styles
 *
 * CSS variables and styles for the configuration wizard.
 * Separated for maintainability and reusability.
 */

export const CSS_VARIABLES = `
  :root {
    --bg-dark: #0d1117;
    --bg-card: #161b22;
    --bg-input: #21262d;
    --bg-hover: #30363d;
    --border: #30363d;
    --border-focus: #7c3aed;
    --text: #c9d1d9;
    --text-muted: #8b949e;
    --text-dim: #6e7681;
    --accent: #7c3aed;
    --accent-hover: #8b5cf6;
    --accent-light: rgba(124, 58, 237, 0.1);
    --success: #238636;
    --success-light: rgba(35, 134, 54, 0.1);
    --error: #f85149;
    --error-light: rgba(248, 81, 73, 0.1);
    --warning: #d29922;
    --warning-light: rgba(210, 153, 34, 0.1);
    
    /* Wizard specific */
    --step-inactive: #30363d;
    --step-active: #7c3aed;
    --step-complete: #238636;
    --transition-fast: 0.15s ease;
    --transition-normal: 0.3s ease;
    --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    --shadow-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
  }
`;

export const CSS_RESET = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: var(--bg-dark);
    color: var(--text);
    min-height: 100vh;
    line-height: 1.6;
  }
`;

export const CSS_WIZARD_LAYOUT = `
  .wizard-container {
    max-width: 720px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .wizard-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .wizard-logo {
    width: 80px;
    height: 80px;
    margin-bottom: 0.75rem;
    filter: drop-shadow(0 4px 6px rgba(124, 58, 237, 0.3));
  }

  .wizard-title {
    font-size: 1.75rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--accent), #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.25rem;
  }

  .wizard-tagline {
    color: var(--text-muted);
    font-size: 0.9rem;
    font-style: italic;
  }
`;

export const CSS_PROGRESS = `
  .progress-container {
    margin-bottom: 2rem;
  }

  .progress-steps {
    display: flex;
    justify-content: space-between;
    position: relative;
    margin-bottom: 0.5rem;
  }

  .progress-line {
    position: absolute;
    top: 16px;
    left: 32px;
    right: 32px;
    height: 2px;
    background: var(--step-inactive);
    z-index: 0;
  }

  .progress-line-fill {
    position: absolute;
    top: 16px;
    left: 32px;
    height: 2px;
    background: var(--step-complete);
    z-index: 1;
    transition: width var(--transition-normal);
  }

  .progress-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 2;
    cursor: pointer;
    transition: transform var(--transition-fast);
  }

  .progress-step:hover {
    transform: scale(1.05);
  }

  .progress-step.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .progress-step.disabled:hover {
    transform: none;
  }

  .step-circle {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--bg-card);
    border: 2px solid var(--step-inactive);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all var(--transition-normal);
    color: var(--text-muted);
  }

  .progress-step.active .step-circle {
    border-color: var(--step-active);
    background: var(--accent-light);
    color: var(--accent);
    box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.2);
  }

  .progress-step.complete .step-circle {
    border-color: var(--step-complete);
    background: var(--step-complete);
    color: white;
  }

  .step-label {
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-top: 0.5rem;
    text-align: center;
    max-width: 80px;
    transition: color var(--transition-fast);
  }

  .progress-step.active .step-label {
    color: var(--accent);
    font-weight: 500;
  }

  .progress-step.complete .step-label {
    color: var(--success);
  }

  @media (max-width: 600px) {
    .step-label {
      display: none;
    }
    .progress-line, .progress-line-fill {
      left: 16px;
      right: 16px;
    }
  }
`;

export const CSS_CARD = `
  .wizard-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 2rem;
    margin-bottom: 1.5rem;
    box-shadow: var(--shadow-card);
    flex: 1;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .card-header {
    margin-bottom: 1.5rem;
  }

  .card-icon {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
  }

  .card-title {
    font-size: 1.35rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .card-subtitle {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .card-content {
    /* Form content */
  }
`;

export const CSS_FORMS = `
  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.9rem;
  }

  .form-label .required {
    color: var(--error);
    margin-left: 2px;
  }

  .form-input,
  .form-select {
    width: 100%;
    padding: 0.875rem 1rem;
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    font-size: 1rem;
    transition: all var(--transition-fast);
  }

  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  }

  .form-input::placeholder {
    color: var(--text-dim);
  }

  .form-input.error {
    border-color: var(--error);
  }

  .form-input.success {
    border-color: var(--success);
  }

  .form-help {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: 0.5rem;
  }

  .form-help a {
    color: var(--accent);
    text-decoration: none;
  }

  .form-help a:hover {
    text-decoration: underline;
  }

  .form-status {
    margin-top: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.85rem;
    display: none;
  }

  .form-status.visible {
    display: block;
  }

  .form-status.loading {
    background: var(--accent-light);
    color: var(--accent);
  }

  .form-status.success {
    background: var(--success-light);
    color: var(--success);
  }

  .form-status.error {
    background: var(--error-light);
    color: var(--error);
  }
`;

export const CSS_BUTTONS = `
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 1.75rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
    text-decoration: none;
  }

  .btn:hover:not(:disabled) {
    background: var(--accent-hover);
    transform: translateY(-1px);
  }

  .btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--bg-input);
    border: 1px solid var(--border);
    color: var(--text);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  .btn-success {
    background: var(--success);
  }

  .btn-success:hover:not(:disabled) {
    background: #2ea043;
  }

  .btn-lg {
    padding: 1rem 2rem;
    font-size: 1.1rem;
  }

  .btn-block {
    width: 100%;
  }

  .wizard-nav {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
  }

  .wizard-nav .btn {
    flex: 1;
  }

  .wizard-nav .btn-back {
    flex: 0 0 auto;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }
`;

export const CSS_SELECTIONS = `
  .selection-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .selection-card {
    background: var(--bg-input);
    border: 2px solid var(--border);
    border-radius: 12px;
    padding: 1.25rem;
    cursor: pointer;
    transition: all var(--transition-fast);
    position: relative;
  }

  .selection-card:hover {
    border-color: var(--accent);
    background: var(--accent-light);
  }

  .selection-card.selected {
    border-color: var(--accent);
    background: var(--accent-light);
  }

  .selection-card input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .selection-icon {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }

  .selection-title {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .selection-desc {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .selection-badge {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: var(--success);
    color: white;
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
  }

  .selection-badge.paid {
    background: var(--warning);
  }
`;

export const CSS_CHECKBOX = `
  .checkbox-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .checkbox-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--bg-input);
    border-radius: 8px;
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .checkbox-item:hover {
    background: var(--bg-hover);
  }

  .checkbox-item input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .checkbox-item label {
    flex: 1;
    cursor: pointer;
  }

  .checkbox-item .label-main {
    font-weight: 500;
  }

  .checkbox-item .label-sub {
    font-size: 0.8rem;
    color: var(--text-muted);
  }
`;

export const CSS_SLIDER = `
  .slider-group {
    margin-bottom: 1.5rem;
  }

  .slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .slider-label {
    font-weight: 500;
  }

  .slider-value {
    background: var(--accent-light);
    color: var(--accent);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .slider-input {
    width: 100%;
    -webkit-appearance: none;
    appearance: none;
    height: 8px;
    background: var(--bg-input);
    border-radius: 4px;
    outline: none;
  }

  .slider-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 22px;
    height: 22px;
    background: var(--accent);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    transition: transform var(--transition-fast);
  }

  .slider-input::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  .slider-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }
`;

export const CSS_TAGS = `
  .tag-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag-item {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 20px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all var(--transition-fast);
    user-select: none;
  }

  .tag-item:hover {
    border-color: var(--accent);
  }

  .tag-item.selected {
    background: var(--accent-light);
    border-color: var(--accent);
    color: var(--accent);
  }

  .tag-item input {
    display: none;
  }

  .tag-check {
    font-size: 0.7rem;
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  .tag-item.selected .tag-check {
    opacity: 1;
  }
`;

export const CSS_ALERTS = `
  .alert {
    padding: 1rem 1.25rem;
    border-radius: 10px;
    margin-bottom: 1rem;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .alert-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .alert-content {
    flex: 1;
  }

  .alert-title {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .alert-message {
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .alert-success {
    background: var(--success-light);
    border: 1px solid var(--success);
    color: var(--success);
  }

  .alert-error {
    background: var(--error-light);
    border: 1px solid var(--error);
    color: var(--error);
  }

  .alert-warning {
    background: var(--warning-light);
    border: 1px solid var(--warning);
    color: var(--warning);
  }

  .alert-info {
    background: var(--accent-light);
    border: 1px solid var(--accent);
    color: var(--accent);
  }
`;

export const CSS_SUCCESS_PAGE = `
  .success-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 3rem 1.5rem;
    text-align: center;
  }

  .success-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    animation: bounce 0.5s ease;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  .success-title {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: var(--success);
  }

  .success-subtitle {
    color: var(--text-muted);
    margin-bottom: 2rem;
  }

  .install-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 2rem;
    margin-bottom: 1.5rem;
    text-align: left;
  }

  .install-card h3 {
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  .url-box {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .url-input {
    flex: 1;
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.875rem 1rem;
    color: var(--text);
    font-family: monospace;
    font-size: 0.8rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .copy-btn {
    background: var(--success);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0 1.25rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .copy-btn:hover {
    background: #2ea043;
  }

  .copy-btn.copied {
    background: var(--bg-hover);
    color: var(--text);
  }

  .install-steps {
    list-style: none;
    text-align: left;
  }

  .install-steps li {
    padding: 0.5rem 0;
    padding-left: 2rem;
    position: relative;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .install-steps li::before {
    content: attr(data-step);
    position: absolute;
    left: 0;
    width: 1.5rem;
    height: 1.5rem;
    background: var(--accent-light);
    color: var(--accent);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
  }
`;

export const CSS_LOADING = `
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 2rem auto;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-text {
    text-align: center;
    color: var(--text-muted);
    margin-top: 1rem;
  }
`;

export const CSS_FOOTER = `
  .wizard-footer {
    text-align: center;
    padding: 1.5rem;
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .wizard-footer a {
    color: var(--accent);
    text-decoration: none;
  }

  .wizard-footer a:hover {
    text-decoration: underline;
  }

  .footer-disclaimer {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    opacity: 0.8;
  }
`;

export const CSS_THIRD_PARTY = `
  .third-party-section {
    max-width: 700px;
    margin: 2rem auto 0;
    padding: 0 1rem;
  }

  .third-party-toggle {
    width: 100%;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1rem 1.25rem;
    color: var(--text);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transition: all var(--transition-fast);
  }

  .third-party-toggle:hover {
    background: var(--bg-hover);
    border-color: var(--accent);
  }

  .toggle-icon {
    transition: transform 0.2s ease;
    font-size: 0.8rem;
  }

  .third-party-toggle.expanded .toggle-icon {
    transform: rotate(90deg);
  }

  .third-party-content {
    display: none;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 10px 10px;
    padding: 1.5rem;
    margin-top: -5px;
  }

  .third-party-content.visible {
    display: block;
    animation: slideDown 0.3s ease;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .third-party-intro {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }

  .service-card {
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .service-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .service-icon {
    font-size: 1.5rem;
  }

  .service-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .service-info strong {
    color: var(--text);
  }

  .service-link {
    font-size: 0.8rem;
    color: var(--accent);
    text-decoration: none;
  }

  .service-link:hover {
    text-decoration: underline;
  }

  .service-details {
    font-size: 0.85rem;
    color: var(--text-muted);
    line-height: 1.6;
  }

  .service-details p {
    margin: 0.5rem 0;
  }

  .service-details a {
    color: var(--accent);
    text-decoration: none;
  }

  .service-details a:hover {
    text-decoration: underline;
  }

  .privacy-note {
    display: flex;
    gap: 0.75rem;
    background: rgba(52, 211, 153, 0.1);
    border: 1px solid rgba(52, 211, 153, 0.3);
    border-radius: 8px;
    padding: 1rem;
    margin: 1.5rem 0;
  }

  .privacy-note .note-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .privacy-note p {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.5;
    color: var(--text);
  }

  .credits-section {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .credits-section h4 {
    color: var(--text);
    font-size: 0.95rem;
    margin-bottom: 0.75rem;
  }

  .credits-section ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .credits-section li {
    font-size: 0.85rem;
    color: var(--text-muted);
    padding: 0.35rem 0;
  }

  .credits-section li strong {
    color: var(--text);
  }
`;

export const CSS_RESPONSIVE = `
  @media (max-width: 600px) {
    .wizard-container {
      padding: 1rem;
    }

    .wizard-card {
      padding: 1.5rem;
    }

    .selection-grid {
      grid-template-columns: 1fr;
    }

    .wizard-nav {
      flex-direction: column;
    }

    .wizard-nav .btn-back {
      order: 2;
    }

    .url-box {
      flex-direction: column;
    }
  }
`;

/**
 * Get all CSS combined
 */
export function getAllStyles(): string {
  return `
    ${CSS_VARIABLES}
    ${CSS_RESET}
    ${CSS_WIZARD_LAYOUT}
    ${CSS_PROGRESS}
    ${CSS_CARD}
    ${CSS_FORMS}
    ${CSS_BUTTONS}
    ${CSS_SELECTIONS}
    ${CSS_CHECKBOX}
    ${CSS_SLIDER}
    ${CSS_TAGS}
    ${CSS_ALERTS}
    ${CSS_SUCCESS_PAGE}
    ${CSS_LOADING}
    ${CSS_FOOTER}
    ${CSS_THIRD_PARTY}
    ${CSS_RESPONSIVE}
  `;
}
