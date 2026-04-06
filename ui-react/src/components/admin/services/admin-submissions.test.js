import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  submitWiFiConfig, submitLogoConfig, submitSidebarConfig, submitBookingConfig,
  submitMaintenanceConfig, submitSystemConfig, submitTranslationApiConfig,
  submitOAuthConfig, submitApiTokenConfig, submitSearchConfig, submitRateLimitConfig,
  submitColorsConfig, submitI18nConfig, submitAutoTranslate,
  submitBackupExport, submitBackupImport, fetchAuditLogs, fetchConnectedDisplays,
  deleteDisplay, submitPowerManagement, uploadLogoFile
} from './admin-submissions.js';

describe('admin-submissions', () => {
  let mockHeaders;

  beforeEach(() => {
    global.fetch = vi.fn();
    mockHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': 'Bearer test' });
  });

  const successResponse = () => ({ ok: true, status: 200, json: async () => ({ success: true }) });
  const unauthorizedResponse = () => ({ ok: false, status: 401, json: async () => ({}) });

  describe('submitWiFiConfig', () => {
    it('posts to /api/wifi and returns success', async () => {
      global.fetch.mockResolvedValue(successResponse());
      const r = await submitWiFiConfig(mockHeaders, { ssid: 'Test', password: '123' });
      expect(r.ok).toBe(true);
      expect(global.fetch.mock.calls[0][0]).toBe('/api/wifi');
    });

    it('returns status 401 on unauthorized', async () => {
      global.fetch.mockResolvedValue(unauthorizedResponse());
      const r = await submitWiFiConfig(mockHeaders, { ssid: 'Test' });
      expect(r.ok).toBe(false);
      expect(r.status).toBe(401);
    });
  });

  describe('submitLogoConfig', () => {
    it('posts to /api/logo', async () => {
      global.fetch.mockResolvedValue(successResponse());
      const r = await submitLogoConfig(mockHeaders, { logoDarkUrl: '/dark.png' });
      expect(r.ok).toBe(true);
      expect(global.fetch.mock.calls[0][0]).toBe('/api/logo');
    });
  });

  describe('submitSidebarConfig', () => {
    it('posts to /api/sidebar', async () => {
      global.fetch.mockResolvedValue(successResponse());
      const r = await submitSidebarConfig(mockHeaders, { showWiFi: true });
      expect(r.ok).toBe(true);
    });
  });

  describe('submitBookingConfig', () => {
    it('posts to /api/booking-config', async () => {
      global.fetch.mockResolvedValue(successResponse());
      const r = await submitBookingConfig(mockHeaders, { enableBooking: true });
      expect(r.ok).toBe(true);
    });
  });

  describe('submitMaintenanceConfig', () => {
    it('posts to /api/maintenance', async () => {
      global.fetch.mockResolvedValue(successResponse());
      const r = await submitMaintenanceConfig(mockHeaders, { enabled: false });
      expect(r.ok).toBe(true);
    });
  });

  describe('submitSystemConfig', () => {
    it('posts to /api/system-config', async () => {
      global.fetch.mockResolvedValue(successResponse());
      const r = await submitSystemConfig(mockHeaders, { demoMode: false });
      expect(r.ok).toBe(true);
    });
  });

  describe('submitTranslationApiConfig', () => {
    it('posts to /api/translation-api-config', async () => {
      global.fetch.mockResolvedValue(successResponse());
      const r = await submitTranslationApiConfig(mockHeaders, { enabled: true });
      expect(r.ok).toBe(true);
    });
  });

  describe('submitOAuthConfig', () => {
    it('posts to /api/oauth-config', async () => {
      global.fetch.mockResolvedValue(successResponse());
      const r = await submitOAuthConfig(mockHeaders, { clientId: 'abc' });
      expect(r.ok).toBe(true);
    });
  });

  describe('submitApiTokenConfig', () => {
    it('posts to /api/api-token-config', async () => {
      global.fetch.mockResolvedValue(successResponse());
      const r = await submitApiTokenConfig(mockHeaders, { newToken: 'secret123' });
      expect(r.ok).toBe(true);
    });
  });

  describe('submitSearchConfig', () => {
    it('posts to /api/search-config', async () => {
      global.fetch.mockResolvedValue(successResponse());
      const r = await submitSearchConfig(mockHeaders, { maxDays: 7 });
      expect(r.ok).toBe(true);
    });
  });

  describe('submitRateLimitConfig', () => {
    it('posts to /api/rate-limit-config', async () => {
      global.fetch.mockResolvedValue(successResponse());
      const r = await submitRateLimitConfig(mockHeaders, { apiMax: 300 });
      expect(r.ok).toBe(true);
    });
  });

  describe('submitColorsConfig', () => {
    it('posts to /api/colors', async () => {
      global.fetch.mockResolvedValue(successResponse());
      const r = await submitColorsConfig(mockHeaders, { bookingButtonColor: '#000' });
      expect(r.ok).toBe(true);
    });
  });

  describe('submitI18nConfig', () => {
    it('posts to /api/i18n', async () => {
      global.fetch.mockResolvedValue(successResponse());
      const r = await submitI18nConfig(mockHeaders, { maintenanceMessages: {} });
      expect(r.ok).toBe(true);
    });
  });

  describe('submitAutoTranslate', () => {
    it('posts to /api/i18n/auto-translate', async () => {
      global.fetch.mockResolvedValue(successResponse());
      const r = await submitAutoTranslate(mockHeaders, { sourceLanguage: 'en', targetLanguage: 'de' });
      expect(r.ok).toBe(true);
    });
  });

  describe('submitBackupExport', () => {
    it('GETs /api/config/backup', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ wifi: {}, logo: {} }) });
      const r = await submitBackupExport(mockHeaders);
      expect(r.ok).toBe(true);
      expect(r.data).toHaveProperty('wifi');
    });
  });

  describe('submitBackupImport', () => {
    it('posts to /api/config/restore', async () => {
      global.fetch.mockResolvedValue(successResponse());
      const r = await submitBackupImport(mockHeaders, { wifi: {} });
      expect(r.ok).toBe(true);
    });
  });

  describe('fetchAuditLogs', () => {
    it('GETs /api/audit-logs', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ logs: [{ action: 'test' }] }) });
      const r = await fetchAuditLogs(mockHeaders);
      expect(r.ok).toBe(true);
      expect(r.data.logs).toHaveLength(1);
    });
  });

  describe('fetchConnectedDisplays', () => {
    it('GETs /api/displays', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ displays: [] }) });
      const r = await fetchConnectedDisplays(mockHeaders);
      expect(r.ok).toBe(true);
    });
  });

  describe('deleteDisplay', () => {
    it('DELETEs display by clientId', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });
      const r = await deleteDisplay(mockHeaders, 'client-123');
      expect(r.ok).toBe(true);
      expect(global.fetch.mock.calls[0][0]).toContain('client-123');
    });
  });

  describe('submitPowerManagement', () => {
    it('posts to global endpoint for __global__', async () => {
      global.fetch.mockResolvedValue(successResponse());
      await submitPowerManagement(mockHeaders, '__global__', { mode: 'browser' });
      expect(global.fetch.mock.calls[0][0]).toBe('/api/power-management');
    });

    it('posts to display-specific endpoint', async () => {
      global.fetch.mockResolvedValue(successResponse());
      await submitPowerManagement(mockHeaders, 'display-1', { mode: 'mqtt' });
      expect(global.fetch.mock.calls[0][0]).toContain('display-1');
    });
  });

  describe('uploadLogoFile', () => {
    it('removes Content-Type header for FormData', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, logoUrl: '/uploaded.png' }) });
      const formData = new FormData();
      const r = await uploadLogoFile(mockHeaders, formData);
      expect(r.ok).toBe(true);
      // Content-Type should be removed for FormData
      const headers = global.fetch.mock.calls[0][1].headers;
      expect(headers['Content-Type']).toBeUndefined();
    });
  });
});
