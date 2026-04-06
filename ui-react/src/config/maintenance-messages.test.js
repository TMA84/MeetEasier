import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyMaintenanceMessages,
  applyI18nConfig,
  getMaintenanceLanguage,
  getMaintenanceMessages,
  getMaintenanceCopy
} from './maintenance-messages';

describe('maintenance-messages', () => {
  beforeEach(() => {
    // Reset to defaults
    applyMaintenanceMessages({});
  });

  describe('getMaintenanceMessages', () => {
    it('returns default messages with expected languages', () => {
      const messages = getMaintenanceMessages();
      expect(messages).toHaveProperty('en');
      expect(messages).toHaveProperty('de');
      expect(messages).toHaveProperty('fr');
      expect(messages.en.title).toBe('Maintenance mode active');
      expect(messages.de.title).toBe('Wartungsmodus aktiv');
    });
  });

  describe('applyMaintenanceMessages', () => {
    it('merges custom messages with defaults', () => {
      applyMaintenanceMessages({
        en: { title: 'Custom Title', body: 'Custom Body' }
      });
      const messages = getMaintenanceMessages();
      expect(messages.en.title).toBe('Custom Title');
      expect(messages.de.title).toBe('Wartungsmodus aktiv'); // unchanged
    });

    it('handles null input gracefully', () => {
      const result = applyMaintenanceMessages(null);
      expect(result.en.title).toBe('Maintenance mode active');
    });

    it('handles array input gracefully', () => {
      const result = applyMaintenanceMessages([]);
      expect(result.en).toBeDefined();
    });

    it('ignores invalid language entries', () => {
      applyMaintenanceMessages({
        en: 'not an object',
        de: null,
        fr: { title: 'Nouveau titre', body: 'Nouveau corps' }
      });
      const messages = getMaintenanceMessages();
      expect(messages.fr.title).toBe('Nouveau titre');
    });

    it('converts non-string values to strings', () => {
      applyMaintenanceMessages({
        en: { title: 123, body: true }
      });
      const messages = getMaintenanceMessages();
      expect(messages.en.title).toBe('123');
      expect(messages.en.body).toBe('true');
    });

    it('handles undefined title/body with empty strings', () => {
      applyMaintenanceMessages({
        en: {}
      });
      const messages = getMaintenanceMessages();
      expect(messages.en.title).toBe('');
      expect(messages.en.body).toBe('');
    });
  });

  describe('getMaintenanceLanguage', () => {
    it('returns en for English browser', () => {
      Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
      expect(getMaintenanceLanguage()).toBe('en');
    });

    it('returns de for German browser', () => {
      Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
      expect(getMaintenanceLanguage()).toBe('de');
    });

    it('falls back to en for unsupported language', () => {
      Object.defineProperty(navigator, 'language', { value: 'ja-JP', configurable: true });
      expect(getMaintenanceLanguage()).toBe('en');
    });
  });

  describe('getMaintenanceCopy', () => {
    it('returns title and body for detected language', () => {
      Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
      const copy = getMaintenanceCopy();
      expect(copy).toHaveProperty('title');
      expect(copy).toHaveProperty('body');
    });
  });

  describe('applyI18nConfig', () => {
    it('applies maintenance messages from i18n config', () => {
      applyI18nConfig({
        maintenanceMessages: {
          en: { title: 'i18n Title', body: 'i18n Body' }
        }
      });
      const messages = getMaintenanceMessages();
      expect(messages.en.title).toBe('i18n Title');
    });

    it('handles null config gracefully', () => {
      const result = applyI18nConfig(null);
      expect(result).toBeDefined();
    });

    it('handles non-object config gracefully', () => {
      const result = applyI18nConfig('invalid');
      expect(result).toBeDefined();
    });
  });
});
