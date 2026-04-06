import { describe, it, expect } from 'vitest';
import {
  toSentenceCase,
  getLanguageDisplayName,
  normalizeLanguageCode,
  toOverrideState,
  fromOverrideState
} from './translation-helpers';

describe('translation-helpers', () => {
  describe('toSentenceCase', () => {
    it('capitalizes first letter', () => {
      expect(toSentenceCase('hello')).toBe('Hello');
    });

    it('keeps rest of string unchanged', () => {
      expect(toSentenceCase('hello WORLD')).toBe('Hello WORLD');
    });

    it('returns empty string for empty input', () => {
      expect(toSentenceCase('')).toBe('');
    });

    it('returns empty string for null', () => {
      expect(toSentenceCase(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(toSentenceCase(undefined)).toBe('');
    });

    it('handles single character', () => {
      expect(toSentenceCase('a')).toBe('A');
    });

    it('trims leading whitespace', () => {
      expect(toSentenceCase('  hello')).toBe('Hello');
    });

    it('converts numbers to string', () => {
      expect(toSentenceCase(123)).toBe('123');
    });
  });

  describe('getLanguageDisplayName', () => {
    it('returns override for "de"', () => {
      expect(getLanguageDisplayName('de')).toBe('Deutsch (de)');
    });

    it('returns override for "en"', () => {
      expect(getLanguageDisplayName('en')).toBe('English (en)');
    });

    it('normalizes to lowercase before lookup', () => {
      expect(getLanguageDisplayName('DE')).toBe('Deutsch (de)');
    });

    it('returns empty string for empty input', () => {
      expect(getLanguageDisplayName('')).toBe('');
    });

    it('returns empty string for null', () => {
      expect(getLanguageDisplayName(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(getLanguageDisplayName(undefined)).toBe('');
    });

    it('uses Intl.DisplayNames for non-overridden languages', () => {
      const result = getLanguageDisplayName('fr');
      // Should contain the language code in parentheses
      expect(result).toContain('(fr)');
    });

    it('trims whitespace from input', () => {
      expect(getLanguageDisplayName('  en  ')).toBe('English (en)');
    });
  });

  describe('normalizeLanguageCode', () => {
    it('lowercases the code', () => {
      expect(normalizeLanguageCode('EN')).toBe('en');
    });

    it('trims whitespace', () => {
      expect(normalizeLanguageCode('  de  ')).toBe('de');
    });

    it('returns empty string for null', () => {
      expect(normalizeLanguageCode(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(normalizeLanguageCode(undefined)).toBe('');
    });

    it('converts numbers to string', () => {
      expect(normalizeLanguageCode(42)).toBe('42');
    });
  });

  describe('toOverrideState', () => {
    it('returns "enabled" for true', () => {
      expect(toOverrideState(true)).toBe('enabled');
    });

    it('returns "disabled" for false', () => {
      expect(toOverrideState(false)).toBe('disabled');
    });

    it('returns "inherit" for undefined', () => {
      expect(toOverrideState(undefined)).toBe('inherit');
    });

    it('returns "inherit" for null', () => {
      expect(toOverrideState(null)).toBe('inherit');
    });

    it('returns "inherit" for other values', () => {
      expect(toOverrideState('something')).toBe('inherit');
    });
  });

  describe('fromOverrideState', () => {
    it('returns true for "enabled"', () => {
      expect(fromOverrideState('enabled')).toBe(true);
    });

    it('returns false for "disabled"', () => {
      expect(fromOverrideState('disabled')).toBe(false);
    });

    it('returns undefined for "inherit"', () => {
      expect(fromOverrideState('inherit')).toBeUndefined();
    });

    it('returns undefined for unknown values', () => {
      expect(fromOverrideState('other')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(fromOverrideState('')).toBeUndefined();
    });
  });
});
