import { describe, it, expect } from 'vitest';
import { isRaspberryPi, getRecommendedPowerMode, getDeviceTypeString, getDeviceInfo } from './device-detection';

describe('device-detection', () => {
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

  describe('isRaspberryPi', () => {
    it('returns true when userAgent contains raspberry', () => {
      mockNavigator('Mozilla/5.0 Raspberry Pi', 'Linux');
      expect(isRaspberryPi()).toBe(true);
    });

    it('returns true when userAgent contains raspbian', () => {
      mockNavigator('Mozilla/5.0 Raspbian', 'Linux');
      expect(isRaspberryPi()).toBe(true);
    });

    it('returns true for ARM Linux platform', () => {
      mockNavigator('Mozilla/5.0', 'linux armv7l');
      expect(isRaspberryPi()).toBe(true);
    });

    it('returns true for ARM in userAgent on Linux', () => {
      mockNavigator('Mozilla/5.0 (Linux; arm)', 'linux');
      expect(isRaspberryPi()).toBe(true);
    });

    it('returns false for standard desktop browser', () => {
      mockNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel');
      expect(isRaspberryPi()).toBe(false);
    });

    it('returns false for Windows browser', () => {
      mockNavigator('Mozilla/5.0 (Windows NT 10.0)', 'Win32');
      expect(isRaspberryPi()).toBe(false);
    });
  });

  describe('getRecommendedPowerMode', () => {
    it('returns dpms for Raspberry Pi', () => {
      mockNavigator('Mozilla/5.0 Raspberry Pi', 'Linux');
      expect(getRecommendedPowerMode()).toBe('dpms');
    });

    it('returns browser for non-RPi devices', () => {
      mockNavigator('Mozilla/5.0 (Macintosh)', 'MacIntel');
      expect(getRecommendedPowerMode()).toBe('browser');
    });
  });

  describe('getDeviceTypeString', () => {
    it('returns rpi suffix for Raspberry Pi', () => {
      mockNavigator('Mozilla/5.0 Raspberry Pi', 'Linux');
      expect(getDeviceTypeString('single-room')).toBe('single-room-rpi');
    });

    it('returns chrome suffix for Chrome browser', () => {
      mockNavigator('Mozilla/5.0 Chrome/120.0', 'MacIntel');
      expect(getDeviceTypeString('flightboard')).toBe('flightboard-chrome');
    });

    it('returns firefox suffix for Firefox', () => {
      mockNavigator('Mozilla/5.0 Firefox/120.0', 'MacIntel');
      expect(getDeviceTypeString('single-room')).toBe('single-room-firefox');
    });

    it('returns safari suffix for Safari', () => {
      mockNavigator('Mozilla/5.0 Safari/605.1', 'MacIntel');
      expect(getDeviceTypeString('single-room')).toBe('single-room-safari');
    });

    it('returns edge suffix for Edge', () => {
      mockNavigator('Mozilla/5.0 Chrome/120.0 Edg/120.0', 'Win32');
      expect(getDeviceTypeString('single-room')).toBe('single-room-edge');
    });

    it('returns browser suffix for unknown browsers', () => {
      mockNavigator('Mozilla/5.0 UnknownBrowser', 'MacIntel');
      expect(getDeviceTypeString('single-room')).toBe('single-room-browser');
    });

    it('uses unknown when displayType is not provided', () => {
      mockNavigator('Mozilla/5.0 Chrome/120.0', 'MacIntel');
      expect(getDeviceTypeString()).toBe('unknown-chrome');
    });
  });

  describe('getDeviceInfo', () => {
    it('returns an object with expected properties', () => {
      const info = getDeviceInfo();
      expect(info).toHaveProperty('userAgent');
      expect(info).toHaveProperty('platform');
      expect(info).toHaveProperty('isRaspberryPi');
      expect(info).toHaveProperty('recommendedPowerMode');
      expect(info).toHaveProperty('screenResolution');
      expect(info).toHaveProperty('devicePixelRatio');
    });

    it('screenResolution matches window.screen dimensions', () => {
      const info = getDeviceInfo();
      expect(info.screenResolution).toBe(`${window.screen.width}x${window.screen.height}`);
    });
  });
});
