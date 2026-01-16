/**
 * Watchwyrd - Configure Page Styles
 *
 * Modern glassmorphic CSS for the configuration wizard.
 * Features: glass effects, smooth animations, gradient accents.
 */

export const CSS_VARIABLES = `
  :root {
    /* Core colors */
    --bg-dark: #0a0a0f;
    --bg-gradient: linear-gradient(135deg, #0d0d14 0%, #0a0a0f 50%, #12121a 100%);
    --glass-bg: rgba(20, 20, 30, 0.7);
    --glass-border: rgba(255, 255, 255, 0.08);
    --glass-highlight: rgba(255, 255, 255, 0.05);
    
    /* Text */
    --text: #e8e8ed;
    --text-muted: #9898a8;
    --text-dim: #5a5a6e;
    
    /* Accent gradient */
    --accent: #8b5cf6;
    --accent-secondary: #6366f1;
    --accent-tertiary: #a855f7;
    --accent-gradient: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #a855f7 100%);
    --accent-glow: rgba(139, 92, 246, 0.4);
    
    /* Status colors */
    --success: #22c55e;
    --success-glow: rgba(34, 197, 94, 0.3);
    --error: #ef4444;
    --error-glow: rgba(239, 68, 68, 0.3);
    --warning: #f59e0b;
    
    /* Effects */
    --blur: blur(20px);
    --transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-smooth: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-bounce: 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 8px 32px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.5);
    --shadow-glow: 0 0 40px var(--accent-glow);
    
    /* Spacing */
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 20px;
    --radius-xl: 28px;
  }
`;

export const CSS_RESET = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    scroll-behavior: smooth;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg-gradient);
    background-attachment: fixed;
    color: var(--text);
    min-height: 100vh;
    line-height: 1.6;
    overflow-x: hidden;
  }

  /* Animated background orbs */
  body::before,
  body::after {
    content: '';
    position: fixed;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.15;
    pointer-events: none;
    z-index: -1;
  }

  body::before {
    width: 600px;
    height: 600px;
    background: var(--accent);
    top: -200px;
    right: -200px;
    animation: float-orb 20s ease-in-out infinite;
  }

  body::after {
    width: 500px;
    height: 500px;
    background: var(--accent-tertiary);
    bottom: -150px;
    left: -150px;
    animation: float-orb 25s ease-in-out infinite reverse;
  }

  @keyframes float-orb {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -30px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
  }
`;

export const CSS_WIZARD_LAYOUT = `
  .wizard-container {
    max-width: 680px;
    margin: 0 auto;
    padding: 2rem 1.5rem 3rem;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .wizard-header {
    text-align: center;
    margin-bottom: 2.5rem;
    padding-top: 1rem;
  }

  .wizard-logo {
    width: 88px;
    height: 88px;
    margin-bottom: 1rem;
    filter: drop-shadow(0 8px 24px var(--accent-glow));
    animation: logo-float 4s ease-in-out infinite;
  }

  @keyframes logo-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .wizard-title {
    font-size: 2.25rem;
    font-weight: 800;
    background: var(--accent-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.02em;
    margin-bottom: 0.5rem;
  }

  .wizard-tagline {
    color: var(--text-muted);
    font-size: 1rem;
    font-weight: 400;
    letter-spacing: 0.02em;
  }
`;

export const CSS_PROGRESS = `
  .progress-container {
    margin-bottom: 2rem;
    padding: 0 1rem;
  }

  .progress-steps {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
  }

  .progress-line {
    position: absolute;
    top: 20px;
    left: 40px;
    right: 40px;
    height: 3px;
    background: var(--glass-border);
    border-radius: 2px;
    z-index: 0;
  }

  .progress-line-fill {
    position: absolute;
    top: 20px;
    left: 40px;
    height: 3px;
    background: var(--accent-gradient);
    border-radius: 2px;
    z-index: 1;
    transition: width var(--transition-smooth);
    box-shadow: 0 0 12px var(--accent-glow);
  }

  .progress-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 2;
    cursor: pointer;
    transition: transform var(--transition-fast);
  }

  .progress-step:hover:not(.disabled) {
    transform: translateY(-2px);
  }

  .progress-step.disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .step-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--glass-bg);
    backdrop-filter: var(--blur);
    border: 2px solid var(--glass-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    font-weight: 700;
    transition: all var(--transition-smooth);
    color: var(--text-dim);
  }

  .progress-step.active .step-circle {
    border-color: var(--accent);
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.1));
    color: var(--accent);
    box-shadow: 0 0 20px var(--accent-glow), inset 0 0 20px rgba(139, 92, 246, 0.1);
  }

  .progress-step.complete .step-circle {
    border-color: var(--success);
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1));
    color: var(--success);
    box-shadow: 0 0 16px var(--success-glow);
  }

  .progress-step.complete .step-circle::after {
    content: '✓';
    font-size: 1rem;
  }

  .progress-step.complete .step-circle span {
    display: none;
  }

  .step-label {
    font-size: 0.75rem;
    color: var(--text-dim);
    margin-top: 0.75rem;
    font-weight: 500;
    text-align: center;
    transition: color var(--transition-fast);
  }

  .progress-step.active .step-label {
    color: var(--accent);
  }

  .progress-step.complete .step-label {
    color: var(--success);
  }

  @media (max-width: 500px) {
    .step-label { display: none; }
    .progress-line, .progress-line-fill { left: 20px; right: 20px; }
    .step-circle { width: 36px; height: 36px; font-size: 0.85rem; }
  }
`;

export const CSS_CARD = `
  .wizard-card {
    background: var(--glass-bg);
    backdrop-filter: var(--blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    padding: 2rem;
    margin-bottom: 1rem;
    box-shadow: var(--shadow-md);
    position: relative;
    overflow: hidden;
    flex: 1;
  }

  .wizard-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--glass-highlight), transparent);
  }

  .wizard-step {
    animation: step-enter 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes step-enter {
    from { 
      opacity: 0; 
      transform: translateX(20px);
    }
    to { 
      opacity: 1; 
      transform: translateX(0);
    }
  }

  .card-header {
    margin-bottom: 2rem;
    text-align: center;
  }

  .card-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
  }

  .card-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    letter-spacing: -0.01em;
  }

  .card-subtitle {
    color: var(--text-muted);
    font-size: 0.95rem;
  }
`;

export const CSS_FORMS = `
  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-label {
    display: block;
    margin-bottom: 0.75rem;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text);
  }

  .form-label .required {
    color: var(--error);
    margin-left: 3px;
  }

  .form-input,
  .form-select {
    width: 100%;
    padding: 1rem 1.25rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--text);
    font-size: 1rem;
    transition: all var(--transition-fast);
    backdrop-filter: blur(8px);
  }

  .form-input:hover,
  .form-select:hover {
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.05);
  }

  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15), 0 0 20px rgba(139, 92, 246, 0.1);
    background: rgba(255, 255, 255, 0.05);
  }

  .form-input::placeholder {
    color: var(--text-dim);
  }

  .form-input.error {
    border-color: var(--error);
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
  }

  .form-input.success {
    border-color: var(--success);
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
  }

  .form-help {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: 0.5rem;
  }

  .form-help a {
    color: var(--accent);
    text-decoration: none;
    transition: opacity var(--transition-fast);
  }

  .form-help a:hover {
    opacity: 0.8;
    text-decoration: underline;
  }

  .form-status {
    margin-top: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    display: none;
    backdrop-filter: blur(8px);
  }

  .form-status.visible { display: flex; align-items: center; gap: 0.5rem; }
  .form-status.loading { background: rgba(139, 92, 246, 0.1); color: var(--accent); }
  .form-status.success { background: rgba(34, 197, 94, 0.1); color: var(--success); }
  .form-status.error { background: rgba(239, 68, 68, 0.1); color: var(--error); }
`;

export const CSS_BUTTONS = `
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem 2rem;
    background: var(--accent-gradient);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
    text-decoration: none;
    position: relative;
    overflow: hidden;
  }

  .btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%);
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  .btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow), var(--shadow-md);
  }

  .btn:hover:not(:disabled)::before {
    opacity: 1;
  }

  .btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    color: var(--text);
    backdrop-filter: var(--blur);
  }

  .btn-secondary:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: var(--shadow-sm);
  }

  .btn-success {
    background: linear-gradient(135deg, #22c55e, #16a34a);
  }

  .btn-success:hover:not(:disabled) {
    box-shadow: 0 0 30px var(--success-glow), var(--shadow-md);
  }

  .wizard-nav {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--glass-border);
  }

  .wizard-nav .btn { flex: 1; }
  .wizard-nav .btn-back { flex: 0 0 auto; padding: 1rem 1.5rem; }
`;

export const CSS_SELECTIONS = `
  .selection-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .selection-card {
    background: rgba(255, 255, 255, 0.02);
    border: 2px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    cursor: pointer;
    transition: all var(--transition-smooth);
    position: relative;
    overflow: hidden;
  }

  .selection-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--accent-gradient);
    opacity: 0;
    transition: opacity var(--transition-smooth);
  }

  .selection-card:hover {
    border-color: var(--accent);
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(139, 92, 246, 0.15);
  }

  .selection-card:hover::before {
    opacity: 0.05;
  }

  .selection-card.selected {
    border-color: var(--accent);
    background: rgba(139, 92, 246, 0.1);
  }

  .selection-card.selected::before {
    opacity: 0.1;
  }

  .selection-card input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .selection-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    position: relative;
    z-index: 1;
  }

  .selection-title {
    font-weight: 700;
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
    position: relative;
    z-index: 1;
  }

  .selection-desc {
    font-size: 0.85rem;
    color: var(--text-muted);
    position: relative;
    z-index: 1;
    line-height: 1.5;
  }

  .selection-features {
    margin-top: 1rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    position: relative;
    z-index: 1;
  }

  .feature-tag {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    color: var(--text-muted);
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
    gap: 1rem;
    padding: 1rem 1.25rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .checkbox-item:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .checkbox-item input[type="checkbox"] {
    width: 20px;
    height: 20px;
    accent-color: var(--accent);
    cursor: pointer;
    flex-shrink: 0;
  }

  .checkbox-item label {
    flex: 1;
    cursor: pointer;
  }

  .checkbox-item .label-main {
    font-weight: 600;
    display: block;
  }

  .checkbox-item .label-sub {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
    display: block;
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
    margin-bottom: 1rem;
  }

  .slider-label {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .slider-value {
    background: rgba(139, 92, 246, 0.15);
    color: var(--accent);
    padding: 0.35rem 0.85rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 700;
    min-width: 60px;
    text-align: center;
  }

  .slider-input {
    width: 100%;
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    background: var(--glass-border);
    border-radius: 3px;
    outline: none;
  }

  .slider-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    background: var(--accent-gradient);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 16px var(--accent-glow);
    transition: transform var(--transition-fast);
  }

  .slider-input::-webkit-slider-thumb:hover {
    transform: scale(1.15);
  }

  .slider-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 0.75rem;
    font-size: 0.75rem;
    color: var(--text-dim);
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
    padding: 0.5rem 0.9rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--glass-border);
    border-radius: 24px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all var(--transition-fast);
    user-select: none;
  }

  .tag-item:hover {
    border-color: var(--accent);
    background: rgba(139, 92, 246, 0.1);
  }

  .tag-item.selected {
    background: rgba(139, 92, 246, 0.15);
    border-color: var(--accent);
    color: var(--accent);
  }

  .tag-item.excluded {
    background: rgba(239, 68, 68, 0.1);
    border-color: var(--error);
    color: var(--error);
  }

  .tag-item input { display: none; }
  .tag-icon { font-size: 0.75rem; }
`;

export const CSS_ALERTS = `
  .alert {
    padding: 1.25rem;
    border-radius: var(--radius-md);
    margin-bottom: 1rem;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    backdrop-filter: blur(8px);
  }

  .alert-icon { font-size: 1.5rem; flex-shrink: 0; }
  .alert-content { flex: 1; }
  .alert-title { font-weight: 700; margin-bottom: 0.25rem; }
  .alert-message { font-size: 0.9rem; opacity: 0.9; line-height: 1.5; }

  .alert-success { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); color: var(--success); }
  .alert-error { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--error); }
  .alert-warning { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); color: var(--warning); }
  .alert-info { background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); color: var(--accent); }
`;

export const CSS_SUCCESS_PAGE = `
  .success-container {
    max-width: 560px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    text-align: center;
  }

  .success-icon {
    font-size: 5rem;
    margin-bottom: 1.5rem;
    animation: success-bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  @keyframes success-bounce {
    0% { transform: scale(0) rotate(-180deg); opacity: 0; }
    60% { transform: scale(1.2) rotate(10deg); }
    100% { transform: scale(1) rotate(0); opacity: 1; }
  }

  .success-title {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #22c55e, #16a34a);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .success-subtitle {
    color: var(--text-muted);
    margin-bottom: 2.5rem;
    font-size: 1.1rem;
  }

  .install-card {
    background: var(--glass-bg);
    backdrop-filter: var(--blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    padding: 2rem;
    margin-bottom: 1.5rem;
    text-align: left;
  }

  .install-card h3 {
    margin-bottom: 1.25rem;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .url-box {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .url-input {
    flex: 1;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    padding: 1rem;
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .copy-btn {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    padding: 0 1.5rem;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .copy-btn:hover {
    box-shadow: 0 0 24px var(--success-glow);
    transform: translateY(-1px);
  }

  .copy-btn.copied {
    background: var(--glass-bg);
    color: var(--text);
  }

  .install-steps {
    list-style: none;
    text-align: left;
  }

  .install-steps li {
    padding: 0.75rem 0;
    padding-left: 2.5rem;
    position: relative;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .install-steps li::before {
    content: attr(data-step);
    position: absolute;
    left: 0;
    width: 1.75rem;
    height: 1.75rem;
    background: rgba(139, 92, 246, 0.15);
    color: var(--accent);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 700;
  }
`;

export const CSS_LOADING = `
  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--glass-border);
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
    font-size: 0.9rem;
  }
`;

export const CSS_FOOTER = `
  .wizard-footer {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--text-dim);
    font-size: 0.8rem;
    margin-top: auto;
  }

  .wizard-footer a {
    color: var(--accent);
    text-decoration: none;
    transition: opacity var(--transition-fast);
  }

  .wizard-footer a:hover { opacity: 0.8; }

  .footer-disclaimer {
    margin-top: 0.75rem;
    font-size: 0.75rem;
    opacity: 0.7;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.5;
  }
`;

export const CSS_CATALOG_SELECTION = `
  .catalog-selection {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .catalog-category {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
  }

  .category-label {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--accent);
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--glass-border);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .catalog-toggles {
    display: grid;
    gap: 0.5rem;
  }

  .catalog-toggle {
    padding: 0.875rem 1rem !important;
    background: transparent;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
  }

  .catalog-toggle:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  @media (min-width: 500px) {
    .catalog-toggles { grid-template-columns: repeat(2, 1fr); }
  }
`;

export const CSS_THIRD_PARTY = `
  .third-party-section {
    max-width: 680px;
    margin: 2rem auto 0;
    padding: 0 1rem;
  }

  .third-party-toggle {
    width: 100%;
    background: var(--glass-bg);
    backdrop-filter: var(--blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 1rem 1.5rem;
    color: var(--text);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transition: all var(--transition-fast);
  }

  .third-party-toggle:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--accent);
  }

  .toggle-icon {
    transition: transform 0.2s ease;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .third-party-toggle.expanded .toggle-icon {
    transform: rotate(90deg);
  }

  .third-party-content {
    display: none;
    background: var(--glass-bg);
    backdrop-filter: var(--blur);
    border: 1px solid var(--glass-border);
    border-top: none;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    padding: 1.5rem;
    margin-top: -1px;
  }

  .third-party-content.visible {
    display: block;
    animation: slide-down 0.3s ease;
  }

  @keyframes slide-down {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .third-party-intro {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
    line-height: 1.6;
  }

  .service-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    padding: 1.25rem;
    margin-bottom: 1rem;
  }

  .service-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .service-icon { font-size: 1.75rem; }

  .service-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .service-info strong { color: var(--text); font-size: 1rem; }

  .service-link {
    font-size: 0.8rem;
    color: var(--accent);
    text-decoration: none;
  }

  .service-link:hover { text-decoration: underline; }

  .service-details {
    font-size: 0.85rem;
    color: var(--text-muted);
    line-height: 1.6;
  }

  .service-details a { color: var(--accent); text-decoration: none; }
  .service-details a:hover { text-decoration: underline; }

  .privacy-note {
    display: flex;
    gap: 1rem;
    background: rgba(34, 197, 94, 0.08);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: var(--radius-sm);
    padding: 1.25rem;
    margin: 1.5rem 0;
  }

  .privacy-note .note-icon { font-size: 1.5rem; flex-shrink: 0; }
  .privacy-note p { margin: 0; font-size: 0.85rem; line-height: 1.6; color: var(--text); }

  .credits-section {
    margin-top: 1.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--glass-border);
  }

  .credits-section h4 {
    color: var(--text);
    font-size: 0.95rem;
    margin-bottom: 1rem;
    font-weight: 700;
  }

  .credits-section ul { list-style: none; }
  .credits-section li { font-size: 0.85rem; color: var(--text-muted); padding: 0.4rem 0; }
  .credits-section li strong { color: var(--text); }
`;

export const CSS_RESPONSIVE = `
  @media (max-width: 600px) {
    .wizard-container { padding: 1rem 1rem 2rem; }
    .wizard-card { padding: 1.5rem; border-radius: var(--radius-lg); }
    .wizard-title { font-size: 1.75rem; }
    .wizard-logo { width: 72px; height: 72px; }
    .card-title { font-size: 1.25rem; }
    .card-icon { font-size: 2.5rem; }
    .selection-grid { grid-template-columns: 1fr; }
    .wizard-nav { flex-direction: column; }
    .wizard-nav .btn-back { order: 2; }
    .url-box { flex-direction: column; }
    .copy-btn { padding: 0.875rem; }
  }
`;

export const CSS_ACCESSIBILITY = `
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
    body::before, body::after { animation: none; }
  }

  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }

  .skip-link {
    position: absolute;
    top: -50px;
    left: 0;
    background: var(--accent);
    color: white;
    padding: 12px 16px;
    z-index: 100;
    border-radius: 0 0 8px 0;
    font-weight: 600;
    transition: top 0.3s;
  }

  .skip-link:focus { top: 0; }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
`;

export const CSS_ENHANCEMENTS = `
  /* Shake animation for errors */
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-8px); }
    40%, 80% { transform: translateX(8px); }
  }

  .shake { animation: shake 0.4s ease-in-out; }

  /* Pulse for loading states */
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .pulse { animation: pulse 1.5s ease-in-out infinite; }

  /* Glow effect on focus for cards */
  .provider-card:focus-visible,
  .selection-card:focus-visible {
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  /* Smooth transitions for all interactive elements */
  button, input, select, a, .selection-card, .checkbox-item, .tag-item {
    transition: all var(--transition-fast);
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

  /* Selection highlight */
  ::selection {
    background: rgba(139, 92, 246, 0.3);
    color: white;
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
    ${CSS_CATALOG_SELECTION}
    ${CSS_THIRD_PARTY}
    ${CSS_RESPONSIVE}
    ${CSS_ACCESSIBILITY}
    ${CSS_ENHANCEMENTS}
  `;
}
