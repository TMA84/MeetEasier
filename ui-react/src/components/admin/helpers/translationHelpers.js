/**
 * Translation and language utilities for Admin panel
 */

const LANGUAGE_LABEL_OVERRIDES = {
  de: 'Deutsch (de)',
  en: 'English (en)'
};

/**
 * Convert string to sentence case
 * @param {string} value - String to convert
 * @returns {string} Sentence case string
 */
export const toSentenceCase = (value) => {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
};

/**
 * Get display name for a language code
 * @param {string} languageCode - Language code (e.g., "en", "de", "fr")
 * @returns {string} Display name (e.g., "English (en)")
 */
export const getLanguageDisplayName = (languageCode) => {
  const normalizedCode = String(languageCode || '').trim().toLowerCase();
  if (!normalizedCode) {
    return '';
  }

  if (LANGUAGE_LABEL_OVERRIDES[normalizedCode]) {
    return LANGUAGE_LABEL_OVERRIDES[normalizedCode];
  }

  try {
    const displayNames = new Intl.DisplayNames([normalizedCode], { type: 'language' });
    const label = displayNames.of(normalizedCode);
    return label ? `${toSentenceCase(label)} (${normalizedCode})` : normalizedCode;
  } catch (error) {
    return normalizedCode;
  }
};

/**
 * Normalize language code to lowercase
 * @param {string} value - Language code
 * @returns {string} Normalized language code
 */
export const normalizeLanguageCode = (value) => String(value || '').trim().toLowerCase();

/**
 * Convert boolean to override state string
 * @param {boolean|undefined} value - Boolean value
 * @returns {string} "enabled", "disabled", or "inherit"
 */
export const toOverrideState = (value) => {
  if (value === true) {
    return 'enabled';
  }
  if (value === false) {
    return 'disabled';
  }
  return 'inherit';
};

/**
 * Convert override state string to boolean
 * @param {string} value - "enabled", "disabled", or "inherit"
 * @returns {boolean|undefined} Boolean value or undefined
 */
export const fromOverrideState = (value) => {
  if (value === 'enabled') {
    return true;
  }
  if (value === 'disabled') {
    return false;
  }
  return undefined;
};
