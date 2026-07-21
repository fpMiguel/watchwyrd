/**
 * Watchwyrd - Configure Components Tests
 *
 * Tests for the HTML component template functions.
 */

import { describe, it, expect } from 'vitest';
import { renderSuccessPage } from '../src/handlers/configure/components.js';

describe('renderSuccessPage', () => {
  it('should return a string containing the stremio install URL', () => {
    const stremioUrl = 'stremio://install-addon?url=http://test.com/manifest.json';
    const httpUrl = 'http://test.com/manifest.json';
    const html = renderSuccessPage(stremioUrl, httpUrl);

    expect(html).toContain(stremioUrl);
    expect(html).toContain(httpUrl);
    expect(html).toContain('Your Fate is Sealed!');
    expect(html).toContain('success-container');
  });

  it('should include the install card structure', () => {
    const html = renderSuccessPage('stremio://test', 'http://test.com');

    expect(html).toContain('One-Click Install');
    expect(html).toContain('Install in Stremio');
    expect(html).toContain('install-card');
    expect(html).toContain('confetti-container');
  });
});