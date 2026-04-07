import { describe, it, expect, afterEach } from 'vitest';
import { isRaspberryPi, getDeviceTypeString, getDeviceInfo } from './device-detection';

describe('device-detection coverage', () => {
  const originalUserAgent = navigator.userAgent;
  const originalPlatform = navigator.platform;

  function mockNavigator(userAgent, platform) {
    Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true });
    Object.defineProperty(navigator, 'platform', { value: platform, configurable: true });
  }

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { value: originalUserAgent, configurable: true });
    Object.defineProperty(navigator, 'platform', { value: originalPlatform, configurable: true });
  });

  describe('isRaspberryPi - Chromium on Linux with RPi resolutions', () => {
    it('returns true for Chromium on Linux with 800x480 resolution', () => {
      mockNavigator('Mozilla/5.0 Chromium/120.0', 'linux');
      Object.defineProperty(window.screen, 'width', { value: 800, configurable: true });
      Object.defineProperty(window.screen, 'height', { value: 480, configurable: true });
      expect(isRaspberryPi()).toBe(true);
      // Restore
      Object.defineProperty(window.screen, 'width', { value: 1024, configurable: true });
      Object.defineProperty(window.screen, 'height', { value: 768, configurable: true });
    });

    it('returns true for Chromium on Linux with 1024x600 resolution', () => {
      mockNavigator('Mozilla/5.0 Chromium/120.0', 'linux');
      Object.defineProperty(window.screen, 'width', { value: 1024, configurable: true });
      Object.defineProperty(window.screen, 'height', { value: 600, configurable: true });
      expect(isRaspberryPi()).toBe(true);
      Object.defineProperty(window.screen, 'width', { value: 1024, configurable: true });
      Object.defineProperty(window.screen, 'height', { value: 768, configurable: true });
    });

    it('returns true for Chromium on Linux with 1280x720 resolution', () => {
      mockNavigator('Mozilla/5.0 Chromium/120.0', 'linux');
      Object.defineProperty(window.screen, 'width', { value: 1280, configurable: true });
      Object.defineProperty(window.screen, 'height', { value: 720, configurable: true });
      expect(isRaspberryPi()).toBe(true);
      Object.defineProperty(window.screen, 'width', { value: 1024, configurable: true });
      Object.defineProperty(window.screen, 'height', { value: 768, configurable: true });
    });

    it('returns true for Chromium on Linux with 1920x1080 resolution', () => {
      mockNavigator('Mozilla/5.0 Chromium/120.0', 'linux');
      Object.defineProperty(window.screen, 'width', { value: 1920, configurable: true });
      Object.defineProperty(window.screen, 'height', { value: 1080, configurable: true });
      expect(isRaspberryPi()).toBe(true);
      Object.defineProperty(window.screen, 'width', { value: 1024, configurable: true });
      Object.defineProperty(window.screen, 'height', { value: 768, configurable: true });
    });

    it('returns true for Chromium on Linux with rotated resolution (480x800)', () => {
      mockNavigator('Mozilla/5.0 Chromium/120.0', 'linux');
      Object.defineProperty(window.screen, 'width', { value: 480, configurable: true });
      Object.defineProperty(window.screen, 'height', { value: 800, configurable: true });
      expect(isRaspberryPi()).toBe(true);
      Object.defineProperty(window.screen, 'width', { value: 1024, configurable: true });
      Object.defineProperty(window.screen, 'height', { value: 768, configurable: true });
    });

    it('returns false for Chromium on Linux with non-RPi resolution', () => {
      mockNavigator('Mozilla/5.0 Chromium/120.0', 'linux');
      Object.defineProperty(window.screen, 'width', { value: 2560, configurable: true });
      Object.defineProperty(window.screen, 'height', { value: 1440, configurable: true });
      expect(isRaspberryPi()).toBe(false);
      Object.defineProperty(window.screen, 'width', { value: 1024, configurable: true });
      Object.defineProperty(window.screen, 'height', { value: 768, configurable: true });
    });
  });

  describe('isRaspberryPi - platform edge cases', () => {
    it('handles undefined platform gracefully', () => {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0', configurable: true });
      Object.defineProperty(navigator, 'platform', { value: undefined, configurable: true });
      // Should not throw
      expect(typeof isRaspberryPi()).toBe('boolean');
    });
  });

  describe('getDeviceTypeString - empty displayType', () => {
    it('returns unknown-browser for empty string displayType', () => {
      mockNavigator('Mozilla/5.0 UnknownBrowser', 'MacIntel');
      expect(getDeviceTypeString('')).toBe('unknown-browser');
    });
  });

  describe('getDeviceInfo - detailed checks', () => {
    it('returns correct devicePixelRatio', () => {
      const info = getDeviceInfo();
      expect(info.devicePixelRatio).toBe(window.devicePixelRatio);
    });

    it('returns correct platform', () => {
      const info = getDeviceInfo();
      expect(info.platform).toBe(navigator.platform);
    });
  });
});
