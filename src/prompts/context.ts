/**
 * Watchwyrd - Context Builder
 *
 * Builds context strings from ContextSignals for use in prompts.
 * Shared by all prompt types (catalog and search).
 */

import type { ContextSignals } from '../types/index.js';

// Context Block Builder

/**
 * Build a human-readable context block from signals
 * Used in both catalog and search prompts
 */
export function buildContextBlock(context: ContextSignals): string {
  const parts: string[] = [];

  // Time context (always available)
  if (context.timeOfDay) {
    const timeDesc = getTimeDescription(context.timeOfDay);
    parts.push(`Time: ${context.localTime} (${timeDesc})`);
  }

  // Day context
  if (context.dayOfWeek) {
    const dayDesc = context.dayType === 'weekend' ? 'weekend' : 'weekday';
    parts.push(`Day: ${context.dayOfWeek} (${dayDesc})`);
  }

  // Weather (optional, only if enabled and available)
  if (context.weather) {
    const weatherDesc = context.weather.description || context.weather.condition;
    parts.push(`Weather: ${weatherDesc}, ${context.weather.temperature}°C`);
  }

  return parts.length > 0 ? parts.join('\n') : 'No specific context available.';
}

/**
 * Get human-readable time description
 */
function getTimeDescription(timeOfDay: string): string {
  switch (timeOfDay) {
    case 'morning':
      return 'morning hours';
    case 'afternoon':
      return 'afternoon';
    case 'evening':
      return 'evening';
    case 'latenight':
      return 'late night';
    default:
      return timeOfDay;
  }
}

/**
 * Build a compact context string for cache keys
 */
export function buildContextKey(context: ContextSignals): string {
  const parts: string[] = [context.timeOfDay, context.dayType];

  if (context.weather) {
    parts.push(context.weather.condition);
  }

  return parts.join('-');
}
