/**
 * Watchwyrd - Prompt System
 *
 * Unified prompt construction for all AI interactions.
 * Re-exports all prompt-related utilities.
 */

// System prompts
export { SYSTEM_PROMPT, SYSTEM_PROMPT_SINGLE_TYPE } from './system.js';

// Context building
export { buildContextBlock, buildContextKey } from './context.js';

// Catalog prompts
export {
  buildCatalogPrompt,
  CATALOG_VARIANTS,
  type CatalogVariant,
  type CatalogPromptOptions,
} from './catalog.js';

// Search prompts
export { buildSearchPrompt, normalizeSearchQuery, type SearchPromptOptions } from './search.js';
