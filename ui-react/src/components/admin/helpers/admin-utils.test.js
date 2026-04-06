import { describe, it, expect } from 'vitest';
import { normalizeOverrideKey, ADMIN_TAB_SECTIONS, TAB_TO_SECTION } from './admin-utils.js';

describe('admin-utils', () => {
  describe('normalizeOverrideKey', () => {
    it('lowercases and trims input', () => {
      expect(normalizeOverrideKey('  Room@Test.COM  ')).toBe('room@test.com');
    });

    it('handles null/undefined', () => {
      expect(normalizeOverrideKey(null)).toBe('');
      expect(normalizeOverrideKey(undefined)).toBe('');
    });

    it('handles empty string', () => {
      expect(normalizeOverrideKey('')).toBe('');
    });
  });

  describe('ADMIN_TAB_SECTIONS', () => {
    it('has displays section with expected tabs', () => {
      expect(ADMIN_TAB_SECTIONS.displays).toContain('display');
      expect(ADMIN_TAB_SECTIONS.displays).toContain('wifi');
      expect(ADMIN_TAB_SECTIONS.displays).toContain('booking');
    });

    it('has operations section with expected tabs', () => {
      expect(ADMIN_TAB_SECTIONS.operations).toContain('system');
      expect(ADMIN_TAB_SECTIONS.operations).toContain('mqtt');
      expect(ADMIN_TAB_SECTIONS.operations).toContain('audit');
    });

    it('has content section with translations', () => {
      expect(ADMIN_TAB_SECTIONS.content).toContain('translations');
    });
  });

  describe('TAB_TO_SECTION', () => {
    it('maps display tabs to displays section', () => {
      expect(TAB_TO_SECTION['display']).toBe('displays');
      expect(TAB_TO_SECTION['wifi']).toBe('displays');
      expect(TAB_TO_SECTION['booking']).toBe('displays');
    });

    it('maps operations tabs to operations section', () => {
      expect(TAB_TO_SECTION['system']).toBe('operations');
      expect(TAB_TO_SECTION['mqtt']).toBe('operations');
    });

    it('maps translations to content section', () => {
      expect(TAB_TO_SECTION['translations']).toBe('content');
    });
  });
});
