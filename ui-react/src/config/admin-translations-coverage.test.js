import { describe, it, expect, afterEach } from 'vitest';
import { getAdminTranslations, getAdminLanguage, getDefaultAdminTranslations } from './admin-translations';

describe('admin-translations coverage', () => {
  const originalLanguage = navigator.language;

  afterEach(() => {
    Object.defineProperty(navigator, 'language', { value: originalLanguage, configurable: true });
  });

  describe('getAdminLanguage', () => {
    it('returns en for English browser', () => {
      Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
      expect(getAdminLanguage()).toBe('en');
    });

    it('returns de for German browser', () => {
      Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
      expect(getAdminLanguage()).toBe('de');
    });

    it('returns fr for French browser', () => {
      Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true });
      expect(getAdminLanguage()).toBe('fr');
    });

    it('handles language without region code', () => {
      Object.defineProperty(navigator, 'language', { value: 'es', configurable: true });
      expect(getAdminLanguage()).toBe('es');
    });
  });

  describe('getDefaultAdminTranslations', () => {
    it('returns an object with en and de keys', () => {
      const defaults = getDefaultAdminTranslations();
      expect(defaults).toHaveProperty('en');
      expect(defaults).toHaveProperty('de');
    });

    it('en translations have expected keys', () => {
      const defaults = getDefaultAdminTranslations();
      expect(defaults.en.title).toBe('Admin Panel');
    });
  });

  describe('getAdminTranslations - German browser', () => {
    it('returns German translations for de browser', () => {
      Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
      const t = getAdminTranslations();
      // German translations should override English
      expect(t.title).toBeTruthy();
    });

    it('applies German overrides', () => {
      Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
      const overrides = { de: { title: 'Verwaltung' } };
      const t = getAdminTranslations(overrides);
      expect(t.title).toBe('Verwaltung');
    });
  });

  describe('getAdminTranslations - normalizeAdminTranslations edge cases', () => {
    it('handles array as rawOverrides', () => {
      const t = getAdminTranslations([1, 2, 3]);
      expect(t.title).toBe('Admin Panel');
    });

    it('handles string as rawOverrides', () => {
      const t = getAdminTranslations('invalid');
      expect(t.title).toBe('Admin Panel');
    });

    it('handles nested array values', () => {
      const t = getAdminTranslations({ en: [1, 2] });
      expect(t.title).toBe('Admin Panel');
    });

    it('handles null language values', () => {
      const t = getAdminTranslations({ en: null });
      expect(t.title).toBe('Admin Panel');
    });

    it('handles empty string language key', () => {
      const t = getAdminTranslations({ '': { title: 'Empty' } });
      expect(t.title).toBe('Admin Panel');
    });

    it('handles numeric values in translations', () => {
      const t = getAdminTranslations({ en: { title: 123 } });
      expect(t.title).toBe('123');
    });

    it('handles null values in translation entries', () => {
      const t = getAdminTranslations({ en: { title: null } });
      expect(t.title).toBe('');
    });

    it('handles undefined values in translation entries', () => {
      const t = getAdminTranslations({ en: { title: undefined } });
      expect(t.title).toBe('');
    });

    it('merges English base with selected language', () => {
      Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
      const overrides = { en: { customKey: 'English Custom' }, de: { title: 'German Title' } };
      const t = getAdminTranslations(overrides);
      expect(t.customKey).toBe('English Custom');
      expect(t.title).toBe('German Title');
    });

    it('falls back to English for unknown language', () => {
      Object.defineProperty(navigator, 'language', { value: 'xx-XX', configurable: true });
      const t = getAdminTranslations();
      // Should still have English defaults
      expect(t.title).toBeTruthy();
    });
  });
});
