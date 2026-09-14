/**
* @file app-language.js
* @description Resolves the UI language/locale used across the app (text
* translations and date/time formatting), with a `?lang=` URL query param
* taking priority over the browser's language so a language can be forced
* per-display (e.g. kiosk URLs) independent of the device's OS locale.
*/

/**
* Reads a `?lang=` override from the current URL, if present and valid.
* @returns {string|null} The raw override value (e.g. "fr", "fr-FR"), or null
*/
export function getLanguageOverride() {
  try {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get('lang');
    if (lang && /^[a-zA-Z]{2}(-[a-zA-Z]{2})?$/.test(lang.trim())) {
      return lang.trim();
    }
  } catch (_) {
    // window/URLSearchParams unavailable - fall through
  }
  return null;
}

/**
* Resolves the bare language code (e.g. "en", "de", "fr") used to look up
* translated UI text. Priority: `?lang=` override, then browser language.
* @returns {string} Two-letter language code
*/
export function getAppLanguage() {
  const override = getLanguageOverride();
  if (override) return override.split('-')[0].toLowerCase();

  const browserLang = navigator.language || navigator.userLanguage || 'en';
  return browserLang.split('-')[0].toLowerCase();
}

/**
* Resolves the full locale (e.g. "en-US", "fr") used for Intl date/time
* formatting, so dates stay in sync with the translated UI text instead of
* silently following the browser's/OS's locale. Priority: `?lang=` override,
* then browser locale.
* @returns {string} BCP-47 locale tag
*/
export function getAppLocale() {
  const override = getLanguageOverride();
  if (override) return override;

  return navigator.language || navigator.userLanguage || 'en-US';
}
