import { describe, it, expect } from 'vitest';
import {
  applyDisplayI18nConfig,
  getSingleRoomDisplayTranslations,
  getFlightboardDisplayTranslations,
  getMeetingActionModalTranslations,
  getBookingModalTranslations,
  getWiFiInfoTranslations,
  getCheckInTranslations
} from './display-translations';

describe('display-translations', () => {
  describe('getSingleRoomDisplayTranslations', () => {
    it('returns object with all expected keys', () => {
      const t = getSingleRoomDisplayTranslations();
      expect(t).toHaveProperty('nextUp');
      expect(t).toHaveProperty('currentMeeting');
      expect(t).toHaveProperty('statusAvailable');
      expect(t).toHaveProperty('statusBusy');
      expect(t).toHaveProperty('statusNotFound');
      expect(t).toHaveProperty('bookButtonText');
      expect(t).toHaveProperty('extendButtonText');
      expect(t).toHaveProperty('noSubject');
    });

    it('returns non-empty string values', () => {
      const t = getSingleRoomDisplayTranslations();
      expect(t.nextUp.length).toBeGreaterThan(0);
      expect(t.statusAvailable.length).toBeGreaterThan(0);
    });
  });

  describe('getFlightboardDisplayTranslations', () => {
    it('returns nested object with board and navbar keys', () => {
      const t = getFlightboardDisplayTranslations();
      expect(t).toHaveProperty('board');
      expect(t).toHaveProperty('navbar');
      expect(t).toHaveProperty('roomFilter');
      expect(t.board).toHaveProperty('statusAvailable');
      expect(t.navbar).toHaveProperty('title');
    });
  });

  describe('getMeetingActionModalTranslations', () => {
    it('returns object with modal action keys', () => {
      const t = getMeetingActionModalTranslations();
      expect(t).toHaveProperty('title');
      expect(t).toHaveProperty('extend');
      expect(t).toHaveProperty('cancel');
      expect(t).toHaveProperty('endNow');
      expect(t).toHaveProperty('genericError');
    });
  });

  describe('getBookingModalTranslations', () => {
    it('returns object with booking modal keys', () => {
      const t = getBookingModalTranslations();
      expect(t).toHaveProperty('title');
      expect(t).toHaveProperty('quickBook');
      expect(t).toHaveProperty('bookRoom');
      expect(t).toHaveProperty('conflictError');
      expect(t).toHaveProperty('cancel');
    });
  });

  describe('getWiFiInfoTranslations', () => {
    it('returns object with wifi info keys', () => {
      const t = getWiFiInfoTranslations();
      expect(t).toHaveProperty('title');
      expect(t).toHaveProperty('ssidLabel');
      expect(t).toHaveProperty('passwordLabel');
      expect(t).toHaveProperty('loading');
    });
  });

  describe('getCheckInTranslations', () => {
    it('returns object with check-in keys', () => {
      const t = getCheckInTranslations();
      expect(t).toHaveProperty('checkInButton');
      expect(t).toHaveProperty('checkInCompleted');
      expect(t).toHaveProperty('checkInFailed');
    });
  });

  describe('applyDisplayI18nConfig', () => {
    it('applies admin translation overrides', () => {
      const overrides = applyDisplayI18nConfig({
        adminTranslations: { displayNextUpLabel: 'Custom Next' }
      });
      expect(overrides).toHaveProperty('displayNextUpLabel', 'Custom Next');
    });

    it('ignores invalid config', () => {
      const result = applyDisplayI18nConfig(null);
      expect(result).toBeDefined();
    });

    it('ignores config without adminTranslations', () => {
      const result = applyDisplayI18nConfig({ other: 'data' });
      expect(result).toBeDefined();
    });
  });
});
