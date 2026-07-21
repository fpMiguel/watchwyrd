import { describe, it, expect } from 'vitest';
import { getCatalogId } from '../src/addon/manifest.js';

describe('getCatalogId', () => {
  it('should return search catalog id for search variant', () => {
    const id = getCatalogId('search', 'movie');
    expect(id).toBe('watchwyrd-search');
  });

  it('should return search catalog id for search variant with series', () => {
    const id = getCatalogId('search', 'series');
    expect(id).toBe('watchwyrd-search');
  });
});
