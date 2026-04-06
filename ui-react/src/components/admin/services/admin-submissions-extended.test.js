import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateCertificate, deleteCertificate, downloadCertificate,
  submitGraphRuntimeConfig, fetchPowerManagementConfig,
  submitBackupExport, fetchAuditLogs, fetchConnectedDisplays,
  deleteDisplay, uploadLogoFile
} from './admin-submissions.js';

describe('admin-submissions extended coverage', () => {
  let mockHeaders;

  beforeEach(() => {
    global.fetch = vi.fn();
    mockHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': 'Bearer test' });
  });

  describe('generateCertificate', () => {
    it('posts to /api/oauth-certificate/generate and returns success', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, thumbprint: 'abc123' }) });
      const r = await generateCertificate(mockHeaders, { commonName: 'test' });
      expect(r.ok).toBe(true);
      expect(global.fetch.mock.calls[0][0]).toBe('/api/oauth-certificate/generate');
    });

    it('returns 401 on unauthorized', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
      const r = await generateCertificate(mockHeaders, {});
      expect(r.ok).toBe(false);
      expect(r.status).toBe(401);
    });

    it('returns ok false when success is false', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: false, error: 'failed' }) });
      const r = await generateCertificate(mockHeaders, {});
      expect(r.ok).toBe(false);
    });
  });

  describe('deleteCertificate', () => {
    it('sends DELETE to /api/oauth-certificate', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });
      const r = await deleteCertificate(mockHeaders);
      expect(r.ok).toBe(true);
      expect(global.fetch.mock.calls[0][0]).toBe('/api/oauth-certificate');
      expect(global.fetch.mock.calls[0][1].method).toBe('DELETE');
    });

    it('returns 401 on unauthorized', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
      const r = await deleteCertificate(mockHeaders);
      expect(r.ok).toBe(false);
      expect(r.status).toBe(401);
    });

    it('returns ok false when success is false', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: false }) });
      const r = await deleteCertificate(mockHeaders);
      expect(r.ok).toBe(false);
    });
  });

  describe('downloadCertificate', () => {
    it('downloads from /api/oauth-certificate/download', async () => {
      const mockBlob = new Blob(['cert-data']);
      global.fetch.mockResolvedValue({
        ok: true,
        headers: { get: (h) => h === 'Content-Disposition' ? 'attachment; filename="test.pem"' : null },
        blob: async () => mockBlob
      });
      const r = await downloadCertificate(mockHeaders);
      expect(r.blob).toBe(mockBlob);
      expect(r.filename).toBe('test.pem');
    });

    it('uses default filename when Content-Disposition is missing', async () => {
      const mockBlob = new Blob(['cert-data']);
      global.fetch.mockResolvedValue({
        ok: true,
        headers: { get: () => '' },
        blob: async () => mockBlob
      });
      const r = await downloadCertificate(mockHeaders);
      expect(r.filename).toBe('meeteasier-oauth.pem');
    });

    it('throws error when download fails', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 500 });
      await expect(downloadCertificate(mockHeaders)).rejects.toThrow('Download failed');
    });
  });

  describe('submitGraphRuntimeConfig', () => {
    it('posts to /api/system-config', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });
      const r = await submitGraphRuntimeConfig(mockHeaders, { webhookEnabled: true });
      expect(r.ok).toBe(true);
      expect(global.fetch.mock.calls[0][0]).toBe('/api/system-config');
    });
  });

  describe('fetchPowerManagementConfig', () => {
    it('fetches global config for __global__', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: async () => ({ mode: 'browser' }) });
      const r = await fetchPowerManagementConfig(mockHeaders, '__global__');
      expect(r.mode).toBe('browser');
      expect(global.fetch.mock.calls[0][0]).toBe('/api/power-management');
    });

    it('fetches display-specific config', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: async () => ({ mode: 'mqtt' }) });
      const r = await fetchPowerManagementConfig(mockHeaders, 'display-1');
      expect(r.mode).toBe('mqtt');
      expect(global.fetch.mock.calls[0][0]).toContain('display-1');
    });
  });

  describe('submitBackupExport - 401', () => {
    it('returns 401 on unauthorized', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
      const r = await submitBackupExport(mockHeaders);
      expect(r.ok).toBe(false);
      expect(r.status).toBe(401);
    });
  });

  describe('fetchAuditLogs - 401', () => {
    it('returns 401 on unauthorized', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
      const r = await fetchAuditLogs(mockHeaders);
      expect(r.ok).toBe(false);
      expect(r.status).toBe(401);
    });

    it('uses custom limit parameter', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ logs: [] }) });
      await fetchAuditLogs(mockHeaders, 50);
      expect(global.fetch.mock.calls[0][0]).toBe('/api/audit-logs?limit=50');
    });
  });

  describe('fetchConnectedDisplays - 401', () => {
    it('returns 401 on unauthorized', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
      const r = await fetchConnectedDisplays(mockHeaders);
      expect(r.ok).toBe(false);
      expect(r.status).toBe(401);
    });
  });

  describe('deleteDisplay - 401', () => {
    it('returns 401 on unauthorized', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
      const r = await deleteDisplay(mockHeaders, 'client-1');
      expect(r.ok).toBe(false);
      expect(r.status).toBe(401);
    });

    it('returns ok false when success is false', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: false }) });
      const r = await deleteDisplay(mockHeaders, 'client-1');
      expect(r.ok).toBe(false);
    });
  });

  describe('uploadLogoFile - 401', () => {
    it('returns 401 on unauthorized', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
      const formData = new FormData();
      const r = await uploadLogoFile(mockHeaders, formData);
      expect(r.ok).toBe(false);
      expect(r.status).toBe(401);
    });

    it('returns ok false when success is false', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: false }) });
      const formData = new FormData();
      const r = await uploadLogoFile(mockHeaders, formData);
      expect(r.ok).toBe(false);
    });
  });
});
