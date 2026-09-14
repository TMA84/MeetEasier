import { getLanguageOverride, getAppLanguage, getAppLocale } from './app-language';

describe('app-language utilities', () => {
  const originalNavigator = { ...navigator };

  afterEach(() => {
    Object.defineProperty(navigator, 'language', {
      value: originalNavigator.language,
      configurable: true
    });
    window.history.pushState({}, '', '/');
  });

  describe('getLanguageOverride', () => {
    it('returns null when no ?lang= param is present', () => {
      window.history.pushState({}, '', '/single-room/venus');
      expect(getLanguageOverride()).toBeNull();
    });

    it('returns the ?lang= value when valid', () => {
      window.history.pushState({}, '', '/single-room/venus?lang=fr');
      expect(getLanguageOverride()).toBe('fr');
    });

    it('accepts a region-qualified value (e.g. fr-FR)', () => {
      window.history.pushState({}, '', '/single-room/venus?lang=fr-FR');
      expect(getLanguageOverride()).toBe('fr-FR');
    });

    it('ignores an invalid ?lang= value', () => {
      window.history.pushState({}, '', '/single-room/venus?lang=<script>');
      expect(getLanguageOverride()).toBeNull();
    });
  });

  describe('getAppLanguage', () => {
    it('prefers the ?lang= override over the browser language', () => {
      Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
      window.history.pushState({}, '', '/?lang=fr');
      expect(getAppLanguage()).toBe('fr');
    });

    it('falls back to navigator.language when no override is present', () => {
      Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
      window.history.pushState({}, '', '/');
      expect(getAppLanguage()).toBe('de');
    });
  });

  describe('getAppLocale', () => {
    it('prefers the ?lang= override over the browser locale', () => {
      Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
      window.history.pushState({}, '', '/?lang=fr');
      expect(getAppLocale()).toBe('fr');
    });

    it('falls back to navigator.language when no override is present', () => {
      Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
      window.history.pushState({}, '', '/');
      expect(getAppLocale()).toBe('de-DE');
    });
  });
});
