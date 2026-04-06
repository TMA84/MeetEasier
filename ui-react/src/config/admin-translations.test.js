import { describe, it, expect } from 'vitest';
import { getAdminTranslations } from './admin-translations';

describe('admin-translations', () => {
  describe('getAdminTranslations', () => {
    it('returns default translations when no overrides', () => {
      const t = getAdminTranslations();
      expect(t).toHaveProperty('title');
      expect(t.title).toBe('Admin Panel');
    });

    it('returns translations with expected keys', () => {
      const t = getAdminTranslations();
      expect(t).toHaveProperty('wifiSectionTitle');
      expect(t).toHaveProperty('logoSectionTitle');
      expect(t).toHaveProperty('submitWifiButton');
      expect(t).toHaveProperty('apiTokenLabel');
    });

    it('applies overrides to default translations', () => {
      Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
      const overrides = { en: { title: 'Custom Admin' } };
      const t = getAdminTranslations(overrides);
      expect(t.title).toBe('Custom Admin');
    });

    it('preserves defaults for non-overridden keys', () => {
      const overrides = { en: { title: 'Custom' } };
      const t = getAdminTranslations(overrides);
      expect(t.wifiSectionTitle).toBeTruthy();
    });

    it('handles empty overrides', () => {
      const t = getAdminTranslations({});
      expect(t.title).toBe('Admin Panel');
    });

    it('handles null/undefined overrides', () => {
      const t1 = getAdminTranslations(null);
      expect(t1.title).toBe('Admin Panel');
      const t2 = getAdminTranslations(undefined);
      expect(t2.title).toBe('Admin Panel');
    });
  });
});
