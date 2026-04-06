import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminApi, getCsrfToken } from './admin-api';

describe('admin-api', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.cookie = '';
  });

  describe('getCsrfToken', () => {
    it('returns empty string when no CSRF cookie exists', () => {
      expect(getCsrfToken()).toBe('');
    });

    it('extracts CSRF token from cookie', () => {
      document.cookie = 'meeteasier_csrf=test-token-123';
      expect(getCsrfToken()).toBe('test-token-123');
    });
  });

  describe('adminApi.login', () => {
    it('sends POST to /api/admin/login with token', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      await adminApi.login('my-token');
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/login', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ apiToken: 'my-token' })
      }));
    });
  });

  describe('adminApi.logout', () => {
    it('sends POST to /api/admin/logout', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      await adminApi.logout();
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/logout', { method: 'POST' });
    });
  });

  describe('adminApi.verifySession', () => {
    it('returns true for 200 status', async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 200 });
      const result = await adminApi.verifySession();
      expect(result).toBe(true);
    });

    it('returns false for non-200 status', async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 401 });
      const result = await adminApi.verifySession();
      expect(result).toBe(false);
    });
  });

  describe('adminApi GET endpoints', () => {
    it('getLogoConfig fetches /api/logo', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ dark: '/img/d.png' }) });
      const result = await adminApi.getLogoConfig();
      expect(result.dark).toBe('/img/d.png');
    });

    it('getSidebarConfig fetches /api/sidebar', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ showWifi: true }) });
      const result = await adminApi.getSidebarConfig();
      expect(result.showWifi).toBe(true);
    });

    it('getVersion fetches /api/version', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ version: '1.0.0' }) });
      const result = await adminApi.getVersion();
      expect(result.version).toBe('1.0.0');
    });

    it('getMaintenanceStatus fetches /api/maintenance-status', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ enabled: false }) });
      const result = await adminApi.getMaintenanceStatus();
      expect(result.enabled).toBe(false);
    });
  });

  describe('adminApi POST endpoints', () => {
    it('updateWiFiConfig sends POST with auth header', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
      await adminApi.updateWiFiConfig('token123', { ssid: 'Test' });
      expect(global.fetch).toHaveBeenCalledWith('/api/wifi', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ssid: 'Test' })
      }));
      const headers = global.fetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer token123');
    });
  });

  describe('handleResponse error handling', () => {
    it('throws on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server Error')
      });
      await expect(adminApi.getLogoConfig()).rejects.toThrow('Server Error');
    });

    it('throws HTTP status when no error text', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('')
      });
      await expect(adminApi.getLogoConfig()).rejects.toThrow('HTTP 404');
    });
  });

  describe('adminApi backup endpoints', () => {
    it('exportBackup sends GET with auth', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: {} }) });
      await adminApi.exportBackup('token');
      expect(global.fetch).toHaveBeenCalledWith('/api/config/backup', expect.objectContaining({ method: 'GET' }));
    });

    it('importBackup sends POST with data', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
      await adminApi.importBackup('token', { wifi: {} });
      expect(global.fetch).toHaveBeenCalledWith('/api/config/restore', expect.objectContaining({ method: 'POST' }));
    });
  });

  describe('adminApi MQTT endpoints', () => {
    it('getMqttConfig fetches with auth', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ enabled: false }) });
      await adminApi.getMqttConfig('token');
      expect(global.fetch).toHaveBeenCalledWith('/api/mqtt-config', expect.objectContaining({}));
    });

    it('getMqttStatus fetches status', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ connected: true }) });
      const result = await adminApi.getMqttStatus('token');
      expect(result.connected).toBe(true);
    });
  });
});
