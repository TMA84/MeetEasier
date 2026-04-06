import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminApi } from './admin-api';

describe('admin-api extended coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Clear all cookies
    document.cookie.split(';').forEach(c => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });

  describe('CSRF token in headers', () => {
    it('includes CSRF token in POST headers when cookie exists', async () => {
      document.cookie = 'meeteasier_csrf=csrf-token-abc';
      await adminApi.updateLogoConfig('token', { dark: '/img/d.png' });
      const headers = global.fetch.mock.calls[0][1].headers;
      expect(headers['X-CSRF-Token']).toBe('csrf-token-abc');
    });

    it('does not include CSRF header when no cookie', async () => {
      await adminApi.updateLogoConfig('token', { dark: '/img/d.png' });
      const headers = global.fetch.mock.calls[0][1].headers;
      expect(headers['X-CSRF-Token']).toBeUndefined();
    });
  });

  describe('GET endpoints with auth', () => {
    it('getWiFiConfig includes auth header', async () => {
      await adminApi.getWiFiConfig('my-token');
      expect(global.fetch).toHaveBeenCalledWith('/api/wifi', expect.objectContaining({
        headers: expect.objectContaining({ 'Authorization': 'Bearer my-token' })
      }));
    });

    it('getSystemConfig includes auth header', async () => {
      await adminApi.getSystemConfig('my-token');
      expect(global.fetch).toHaveBeenCalledWith('/api/system-config', expect.objectContaining({
        headers: expect.objectContaining({ 'Authorization': 'Bearer my-token' })
      }));
    });

    it('getOAuthConfig includes auth header', async () => {
      await adminApi.getOAuthConfig('my-token');
      expect(global.fetch).toHaveBeenCalledWith('/api/oauth-config', expect.objectContaining({
        headers: expect.objectContaining({ 'Authorization': 'Bearer my-token' })
      }));
    });

    it('getApiTokenConfig includes auth header', async () => {
      await adminApi.getApiTokenConfig('my-token');
      expect(global.fetch).toHaveBeenCalledWith('/api/api-token-config', expect.objectContaining({
        headers: expect.objectContaining({ 'Authorization': 'Bearer my-token' })
      }));
    });

    it('getBookingConfig fetches without auth', async () => {
      await adminApi.getBookingConfig();
      expect(global.fetch).toHaveBeenCalledWith('/api/booking-config');
    });

    it('getSearchConfig fetches without auth', async () => {
      await adminApi.getSearchConfig();
      expect(global.fetch).toHaveBeenCalledWith('/api/search-config');
    });

    it('getRateLimitConfig fetches without auth', async () => {
      await adminApi.getRateLimitConfig();
      expect(global.fetch).toHaveBeenCalledWith('/api/rate-limit-config');
    });

    it('getTranslationApiConfig fetches without auth', async () => {
      await adminApi.getTranslationApiConfig();
      expect(global.fetch).toHaveBeenCalledWith('/api/translation-api-config');
    });

    it('getI18nConfig fetches /api/i18n', async () => {
      await adminApi.getI18nConfig();
      expect(global.fetch).toHaveBeenCalledWith('/api/i18n');
    });

    it('getColorsConfig fetches /api/colors', async () => {
      await adminApi.getColorsConfig();
      expect(global.fetch).toHaveBeenCalledWith('/api/colors');
    });

    it('getSyncStatus fetches /api/sync-status', async () => {
      await adminApi.getSyncStatus();
      expect(global.fetch).toHaveBeenCalledWith('/api/sync-status');
    });

    it('getConfigLocks fetches /api/config-locks', async () => {
      await adminApi.getConfigLocks();
      expect(global.fetch).toHaveBeenCalledWith('/api/config-locks');
    });

    it('getRoomlists fetches /api/roomlists', async () => {
      await adminApi.getRoomlists();
      expect(global.fetch).toHaveBeenCalledWith('/api/roomlists');
    });

    it('getRooms fetches /api/rooms', async () => {
      await adminApi.getRooms();
      expect(global.fetch).toHaveBeenCalledWith('/api/rooms');
    });

    it('getConnectedClients fetches /api/connected-clients', async () => {
      await adminApi.getConnectedClients();
      expect(global.fetch).toHaveBeenCalledWith('/api/connected-clients');
    });
  });

  describe('POST endpoints', () => {
    it('updateLogoConfig sends POST with data', async () => {
      await adminApi.updateLogoConfig('token', { dark: '/img/d.png' });
      expect(global.fetch).toHaveBeenCalledWith('/api/logo', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ dark: '/img/d.png' })
      }));
    });

    it('uploadLogo sends POST with FormData (no Content-Type)', async () => {
      const formData = new FormData();
      await adminApi.uploadLogo('token', formData);
      expect(global.fetch).toHaveBeenCalledWith('/api/logo/upload', expect.objectContaining({
        method: 'POST',
        body: formData
      }));
      // Should NOT include Content-Type (browser sets it for FormData)
      const headers = global.fetch.mock.calls[0][1].headers;
      expect(headers['Content-Type']).toBeUndefined();
    });

    it('updateSidebarConfig sends POST', async () => {
      await adminApi.updateSidebarConfig('token', { showWiFi: true });
      expect(global.fetch).toHaveBeenCalledWith('/api/sidebar', expect.objectContaining({ method: 'POST' }));
    });

    it('updateBookingConfig sends POST', async () => {
      await adminApi.updateBookingConfig('token', { enableBooking: true });
      expect(global.fetch).toHaveBeenCalledWith('/api/booking-config', expect.objectContaining({ method: 'POST' }));
    });

    it('updateMaintenanceConfig sends POST', async () => {
      await adminApi.updateMaintenanceConfig('token', { enabled: true });
      expect(global.fetch).toHaveBeenCalledWith('/api/maintenance', expect.objectContaining({ method: 'POST' }));
    });

    it('updateSystemConfig sends POST', async () => {
      await adminApi.updateSystemConfig('token', { strict: true });
      expect(global.fetch).toHaveBeenCalledWith('/api/system-config', expect.objectContaining({ method: 'POST' }));
    });

    it('updateTranslationApiConfig sends POST', async () => {
      await adminApi.updateTranslationApiConfig('token', { enabled: true });
      expect(global.fetch).toHaveBeenCalledWith('/api/translation-api-config', expect.objectContaining({ method: 'POST' }));
    });

    it('updateOAuthConfig sends POST', async () => {
      await adminApi.updateOAuthConfig('token', { clientId: 'abc' });
      expect(global.fetch).toHaveBeenCalledWith('/api/oauth-config', expect.objectContaining({ method: 'POST' }));
    });

    it('updateApiTokenConfig sends POST', async () => {
      await adminApi.updateApiTokenConfig('token', { newToken: 'abc' });
      expect(global.fetch).toHaveBeenCalledWith('/api/api-token-config', expect.objectContaining({ method: 'POST' }));
    });

    it('updateSearchConfig sends POST', async () => {
      await adminApi.updateSearchConfig('token', { maxDays: 7 });
      expect(global.fetch).toHaveBeenCalledWith('/api/search-config', expect.objectContaining({ method: 'POST' }));
    });

    it('updateRateLimitConfig sends POST', async () => {
      await adminApi.updateRateLimitConfig('token', { apiMax: 100 });
      expect(global.fetch).toHaveBeenCalledWith('/api/rate-limit-config', expect.objectContaining({ method: 'POST' }));
    });

    it('updateI18nConfig sends POST', async () => {
      await adminApi.updateI18nConfig('token', { lang: 'de' });
      expect(global.fetch).toHaveBeenCalledWith('/api/i18n', expect.objectContaining({ method: 'POST' }));
    });

    it('autoTranslate sends POST', async () => {
      await adminApi.autoTranslate('token', { text: 'hello' });
      expect(global.fetch).toHaveBeenCalledWith('/api/i18n/auto-translate', expect.objectContaining({ method: 'POST' }));
    });

    it('updateColorsConfig sends POST', async () => {
      await adminApi.updateColorsConfig('token', { primary: '#ff0000' });
      expect(global.fetch).toHaveBeenCalledWith('/api/colors', expect.objectContaining({ method: 'POST' }));
    });
  });

  describe('Bootstrap endpoints', () => {
    it('getBootstrapStatus fetches /api/admin/bootstrap-status', async () => {
      await adminApi.getBootstrapStatus();
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/bootstrap-status', expect.objectContaining({ method: 'GET' }));
    });

    it('bootstrapToken sends POST', async () => {
      await adminApi.bootstrapToken('new-token');
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/bootstrap-token', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ apiToken: 'new-token' })
      }));
    });
  });

  describe('Audit & Monitoring endpoints', () => {
    it('getAuditLogs fetches with limit', async () => {
      await adminApi.getAuditLogs('token', 50);
      expect(global.fetch).toHaveBeenCalledWith('/api/audit-logs?limit=50', expect.objectContaining({ method: 'GET' }));
    });

    it('getAuditLogs uses default limit of 200', async () => {
      await adminApi.getAuditLogs('token');
      expect(global.fetch).toHaveBeenCalledWith('/api/audit-logs?limit=200', expect.objectContaining({ method: 'GET' }));
    });

    it('getDisplays fetches /api/displays', async () => {
      await adminApi.getDisplays('token');
      expect(global.fetch).toHaveBeenCalledWith('/api/displays', expect.objectContaining({ method: 'GET' }));
    });

    it('deleteDisplay sends DELETE with encoded clientId', async () => {
      await adminApi.deleteDisplay('token', 'client/123');
      expect(global.fetch).toHaveBeenCalledWith('/api/displays/client%2F123', expect.objectContaining({ method: 'DELETE' }));
    });
  });

  describe('MQTT endpoints', () => {
    it('updateMqttConfig sends POST', async () => {
      await adminApi.updateMqttConfig('token', { enabled: true });
      expect(global.fetch).toHaveBeenCalledWith('/api/mqtt-config', expect.objectContaining({ method: 'POST' }));
    });

    it('getMqttDisplays fetches with auth', async () => {
      await adminApi.getMqttDisplays('token');
      expect(global.fetch).toHaveBeenCalledWith('/api/mqtt-displays', expect.objectContaining({
        headers: expect.objectContaining({ 'Authorization': 'Bearer token' })
      }));
    });
  });

  describe('Power Management endpoints', () => {
    it('getPowerManagement fetches with auth', async () => {
      await adminApi.getPowerManagement('token');
      expect(global.fetch).toHaveBeenCalledWith('/api/power-management', expect.objectContaining({
        headers: expect.objectContaining({ 'Authorization': 'Bearer token' })
      }));
    });

    it('updatePowerManagement sends POST', async () => {
      await adminApi.updatePowerManagement('token', { mode: 'dpms' });
      expect(global.fetch).toHaveBeenCalledWith('/api/power-management', expect.objectContaining({ method: 'POST' }));
    });
  });
});
