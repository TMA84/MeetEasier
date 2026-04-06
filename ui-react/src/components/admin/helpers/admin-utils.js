/**
 * @file Admin utility functions.
 * Pure helper functions used across the Admin panel.
 */

/**
 * Normalize an override key to lowercase trimmed string.
 * @param {string} value - Raw key value
 * @returns {string} Normalized key
 */
export const normalizeOverrideKey = (value) => String(value || '').trim().toLowerCase();

/**
 * Admin tab section definitions.
 */
export const ADMIN_TAB_SECTIONS = {
  displays: ['display', 'wifi', 'logo', 'colors', 'booking'],
  operations: ['system', 'translationApi', 'oauth', 'maintenance', 'apiToken', 'search', 'ratelimit', 'backup', 'audit', 'mqtt', 'connectedDisplays'],
  content: ['translations']
};

/**
 * Reverse mapping from tab key to section key.
 */
export const TAB_TO_SECTION = Object.entries(ADMIN_TAB_SECTIONS).reduce((acc, [section, tabs]) => {
  tabs.forEach((tab) => {
    acc[tab] = section;
  });
  return acc;
}, {});

/**
 * Base translation group collapse state.
 */
export const BASE_TRANSLATION_GROUP_COLLAPSE_STATE = {
  maintenanceTranslationsSection: true,
  advancedTranslationsSection: true
};

/**
 * Language label overrides for known languages.
 */
export const LANGUAGE_LABEL_OVERRIDES = {
  de: 'Deutsch (de)',
  en: 'English (en)'
};
