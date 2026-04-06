import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadWiFiConfig, loadLogoConfig, loadSidebarConfig, loadBookingConfig,
  loadSearchConfig, loadRateLimitConfig,
  loadSystemConfig,
  loadConfigLocks, loadVersion,
  loadBootstrapStatus, verifyAdminSession, loadRoomLists, loadRooms
} from './admin-config-loader.js';

describe('admin-config-loader', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  const okJson = (data) => ({ ok: true, status: 200, json: async () => data });
  const authHeaders = { 'Authorization': 'Bearer test' };

  describe('loadWiFiConfig', () => {
    it('returns data on success', async () => {
      global.fetch.mockResolvedValue(okJson({ ssid: 'TestNet', password: 'pass' }));
      const r = await loadWiFiConfig(authHeaders);
      expect(r.ok).toBe(true);
      expect(r.data.ssid).toBe('TestNet');
    });

    it('returns 401 on unauthorized', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 401 });
      const r = await loadWiFiConfig(authHeaders);
      expect(r.ok).toBe(false);
      expect(r.status).toBe(401);
    });
  });

  describe('loadLogoConfig', () => {
    it('returns logo data', async () => {
      global.fetch.mockResolvedValue(okJson({ logoDarkUrl: '/dark.png' }));
      const r = await loadLogoConfig();
      expect(r.ok).toBe(true);
      expect(r.data.logoDarkUrl).toBe('/dark.png');
    });
  });

  describe('loadSidebarConfig', () => {
    it('fetches without target client', async () => {
      global.fetch.mockResolvedValue(okJson({ showWiFi: true }));
      await loadSidebarConfig();
      expect(global.fetch.mock.calls[0][0]).toBe('/api/sidebar');
    });

    it('fetches with target client', async () => {
      global.fetch.mockResolvedValue(okJson({ showWiFi: true }));
      await loadSidebarConfig('client-1');
      expect(global.fetch.mock.calls[0][0]).toContain('displayClientId=client-1');
    });
  });

  describe('loadBookingConfig', () => {
    it('returns booking data', async () => {
      global.fetch.mockResolvedValue(okJson({ enableBooking: true }));
      const r = await loadBookingConfig();
      expect(r.ok).toBe(true);
    });
  });

  describe('loadSearchConfig', () => {
    it('returns search data', async () => {
      global.fetch.mockResolvedValue(okJson({ useGraphAPI: true }));
      const r = await loadSearchConfig();
      expect(r.ok).toBe(true);
    });
  });

  describe('loadRateLimitConfig', () => {
    it('returns rate limit data', async () => {
      global.fetch.mockResolvedValue(okJson({ apiMax: 300 }));
      const r = await loadRateLimitConfig();
      expect(r.ok).toBe(true);
    });
  });

  describe('loadSystemConfig', () => {
    it('passes auth headers', async () => {
      global.fetch.mockResolvedValue(okJson({ demoMode: false }));
      await loadSystemConfig(authHeaders);
      expect(global.fetch.mock.calls[0][0]).toBe('/api/system-config');
    });
  });

  describe('loadConfigLocks', () => {
    it('returns lock data', async () => {
      global.fetch.mockResolvedValue(okJson({ wifiLocked: true }));
      const r = await loadConfigLocks();
      expect(r.ok).toBe(true);
      expect(r.data.wifiLocked).toBe(true);
    });
  });

  describe('loadVersion', () => {
    it('returns version data', async () => {
      global.fetch.mockResolvedValue(okJson({ version: '1.5.0' }));
      const r = await loadVersion();
      expect(r.data.version).toBe('1.5.0');
    });
  });

  describe('verifyAdminSession', () => {
    it('returns true on 200', async () => {
      global.fetch.mockResolvedValue({ status: 200 });
      const result = await verifyAdminSession();
      expect(result).toBe(true);
    });

    it('returns false on 401', async () => {
      global.fetch.mockResolvedValue({ status: 401 });
      const result = await verifyAdminSession();
      expect(result).toBe(false);
    });
  });

  describe('loadRoomLists', () => {
    it('returns room lists', async () => {
      global.fetch.mockResolvedValue(okJson([{ alias: 'room1', name: 'Room 1' }]));
      const r = await loadRoomLists();
      expect(r.ok).toBe(true);
    });
  });

  describe('loadRooms', () => {
    it('returns rooms', async () => {
      global.fetch.mockResolvedValue(okJson([{ Email: 'room@test.com', Name: 'Room' }]));
      const r = await loadRooms();
      expect(r.ok).toBe(true);
    });
  });

  describe('loadBootstrapStatus', () => {
    it('returns bootstrap data', async () => {
      global.fetch.mockResolvedValue(okJson({ requiresSetup: true }));
      const r = await loadBootstrapStatus();
      expect(r.ok).toBe(true);
      expect(r.data.requiresSetup).toBe(true);
    });
  });
});
