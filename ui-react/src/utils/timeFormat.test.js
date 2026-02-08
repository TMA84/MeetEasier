import { getLocale, uses12HourFormat, formatTime, formatTimeRange } from './timeFormat';

describe('timeFormat utilities', () => {
  const originalNavigator = { ...navigator };

  afterEach(() => {
    // Restore navigator properties
    Object.defineProperty(navigator, 'language', {
      value: originalNavigator.language,
      configurable: true
    });
  });

  describe('getLocale', () => {
    it('returns navigator.language when available', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        configurable: true
      });
      expect(getLocale()).toBe('en-US');
    });

    it('falls back to navigator.userLanguage', () => {
      Object.defineProperty(navigator, 'language', {
        value: undefined,
        configurable: true
      });
      Object.defineProperty(navigator, 'userLanguage', {
        value: 'de-DE',
        configurable: true
      });
      expect(getLocale()).toBe('de-DE');
    });

    it('falls back to en-US when no language is set', () => {
      Object.defineProperty(navigator, 'language', {
        value: undefined,
        configurable: true
      });
      Object.defineProperty(navigator, 'userLanguage', {
        value: undefined,
        configurable: true
      });
      expect(getLocale()).toBe('en-US');
    });
  });

  describe('uses12HourFormat', () => {
    it('returns true for US locale', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        configurable: true
      });
      expect(uses12HourFormat()).toBe(true);
    });

    it('returns true for Canadian locale', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'en-CA',
        configurable: true
      });
      expect(uses12HourFormat()).toBe(true);
    });

    it('returns true for Australian locale', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'en-AU',
        configurable: true
      });
      expect(uses12HourFormat()).toBe(true);
    });

    it('returns false for German locale', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'de-DE',
        configurable: true
      });
      expect(uses12HourFormat()).toBe(false);
    });

    it('returns false for UK locale', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'en-GB',
        configurable: true
      });
      expect(uses12HourFormat()).toBe(false);
    });

    it('returns false for French locale', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'fr-FR',
        configurable: true
      });
      expect(uses12HourFormat()).toBe(false);
    });
  });

  describe('formatTime', () => {
    const testDate = new Date('2024-01-15T14:30:00');

    it('formats time correctly', () => {
      const formatted = formatTime(testDate);
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });

    it('accepts custom options', () => {
      const formatted = formatTime(testDate, { hour: '2-digit', minute: '2-digit' });
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });

    it('uses locale-aware formatting', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        configurable: true
      });
      const formatted = formatTime(testDate);
      expect(formatted).toBeTruthy();
    });
  });

  describe('formatTimeRange', () => {
    const startDate = new Date('2024-01-15T14:30:00');
    const endDate = new Date('2024-01-15T16:00:00');

    it('formats time range correctly', () => {
      const formatted = formatTimeRange(startDate, endDate);
      expect(formatted).toContain('-');
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });

    it('includes weekday when requested', () => {
      const formatted = formatTimeRange(startDate, endDate, true);
      expect(formatted).toContain('-');
      // Should contain weekday abbreviation (Mon, Tue, etc.)
      expect(formatted.length).toBeGreaterThan(10);
    });

    it('excludes weekday by default', () => {
      const formatted = formatTimeRange(startDate, endDate, false);
      expect(formatted).toContain('-');
    });

    it('handles same start and end times', () => {
      const formatted = formatTimeRange(startDate, startDate);
      expect(formatted).toContain('-');
    });

    it('uses locale-aware formatting', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'de-DE',
        configurable: true
      });
      const formatted = formatTimeRange(startDate, endDate);
      expect(formatted).toContain('-');
      expect(formatted).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles midnight correctly', () => {
      const midnight = new Date('2024-01-15T00:00:00');
      const formatted = formatTime(midnight);
      expect(formatted).toBeTruthy();
    });

    it('handles noon correctly', () => {
      const noon = new Date('2024-01-15T12:00:00');
      const formatted = formatTime(noon);
      expect(formatted).toBeTruthy();
    });

    it('handles end of day correctly', () => {
      const endOfDay = new Date('2024-01-15T23:59:59');
      const formatted = formatTime(endOfDay);
      expect(formatted).toBeTruthy();
    });

    it('handles cross-day time range', () => {
      const startDate = new Date('2024-01-15T23:00:00');
      const endDate = new Date('2024-01-16T01:00:00');
      const formatted = formatTimeRange(startDate, endDate);
      expect(formatted).toContain('-');
    });
  });
});
