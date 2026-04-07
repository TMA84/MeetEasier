import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAdminSubmissions } from './useAdminSubmissions.js';

vi.mock('../services/admin-submissions.js', () => ({
  submitWiFiConfig: vi.fn(),
  submitLogoConfig: vi.fn(),
  uploadLogoFile: vi.fn(),
  submitSidebarConfig: vi.fn(),
  submitBookingConfig: vi.fn(),
  submitMaintenanceConfig: vi.fn(),
  submitSystemConfig: vi.fn(),
  submitGraphRuntimeConfig: vi.fn(),
  submitTranslationApiConfig: vi.fn(),
  submitOAuthConfig: vi.fn(),
  submitApiTokenConfig: vi.fn(),
  submitSearchConfig: vi.fn(),
  submitRateLimitConfig: vi.fn(),
  submitColorsConfig: vi.fn(),
  generateCertificate: vi.fn(),
  deleteCertificate: vi.fn(),
  downloadCertificate: vi.fn(),
  submitPowerManagement: vi.fn(),
  fetchPowerManagementConfig: vi.fn(),
  submitBackupExport: vi.fn(),
  submitBackupImport: vi.fn(),
  fetchAuditLogs: vi.fn(),
  fetchConnectedDisplays: vi.fn(),
  deleteDisplay: vi.fn()
}));

import {
  submitLogoConfig, uploadLogoFile,
  submitMaintenanceConfig, submitGraphRuntimeConfig,
  submitTranslationApiConfig, submitOAuthConfig,
  submitSearchConfig, submitRateLimitConfig, submitColorsConfig,
  generateCertificate, deleteCertificate, downloadCertificate,
  submitPowerManagement, fetchPowerManagementConfig,
  fetchAuditLogs, submitApiTokenConfig,
  submitBackupImport, deleteDisplay, fetchConnectedDisplays
} from '../services/admin-submissions.js';

describe('useAdminSubmissions - boost coverage', () => {
  let getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig, loadConfigLocks;

  const translations = {
    errorUnauthorized: 'Unauthorized', errorUnknown: 'Unknown error', errorPrefix: 'Error:',
    logoSuccessMessage: 'Logo saved', maintenanceSuccessMessage: 'Maintenance saved',
    graphRuntimeUpdateSuccess: 'Graph updated', translationApiSuccessMessage: 'Translation API saved',
    oauthConfigUpdateSuccess: 'OAuth saved', colorsSuccessMessage: 'Colors saved',
    certGenerateSuccess: 'Cert generated', certDeleteConfirm: 'Delete cert?', certDeleteSuccess: 'Cert deleted',
    backupSuccessImport: 'Imported', connectedDisplaysDeleteConfirm: 'Delete?',
    connectedDisplaysDeleteSuccess: 'Deleted', connectedDisplaysDeleteError: 'Delete failed',
    powerManagementSaveSuccess: 'PM saved', powerManagementSaveError: 'PM error',
    wifiApiTokenConfigUpdateSuccess: 'WiFi token updated',
    apiTokenConfigMinLengthError: 'Too short', apiTokenConfigMismatchError: 'Mismatch'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    getRequestHeaders = vi.fn(() => ({ 'Content-Type': 'application/json' }));
    handleUnauthorizedAccess = vi.fn();
    getTranslations = vi.fn(() => translations);
    configRef = { current: {
      logoDarkUrl: '/dark.png', logoLightUrl: '/light.png', logoDarkFile: null, logoLightFile: null, uploadMode: 'url',
      maintenanceEnabled: false, maintenanceMessage: 'test',
      systemGraphWebhookEnabled: false, systemGraphWebhookClientState: '', systemGraphWebhookAllowedIps: '1.2.3.4',
      systemGraphFetchTimeoutMs: 10000, systemGraphFetchRetryAttempts: 2, systemGraphFetchRetryBaseMs: 250,
      translationApiEnabled: true, translationApiUrl: 'https://api.test', translationApiTimeoutMs: 5000, translationApiApiKey: 'key123',
      oauthClientId: 'cid', oauthAuthority: 'tid', oauthClientSecret: 'secret',
      searchUseGraphAPI: true, searchMaxDays: 7, searchMaxRoomLists: 5, searchMaxRooms: 50, searchMaxItems: 100, searchPollIntervalMs: 15000,
      rateLimitApiWindowMs: 60000, rateLimitApiMax: 300, rateLimitWriteWindowMs: 60000, rateLimitWriteMax: 60, rateLimitAuthWindowMs: 60000, rateLimitAuthMax: 30,
      bookingButtonColor: '#334155', statusAvailableColor: '#22c55e', statusBusyColor: '#ef4444', statusUpcomingColor: '#f59e0b', statusNotFoundColor: '#6b7280',
      backupPayloadText: '{}',
      newApiToken: '', newApiTokenConfirm: '', newWifiApiToken: '', newWifiApiTokenConfirm: '',
      connectedDisplays: [{ id: 'd1', mqtt: { connected: true, deviceId: 'dev1' } }],
      powerManagementMode: 'browser', powerManagementScheduleEnabled: false,
      powerManagementStartTime: '20:00', powerManagementEndTime: '07:00',
      powerManagementWeekendMode: false, powerManagementClientId: 'd1', powerManagementMqttHostname: ''
    }};
    updateConfig = vi.fn((patch) => {
      if (typeof patch === 'function') Object.assign(configRef.current, patch(configRef.current));
      else Object.assign(configRef.current, patch);
    });
    loadCurrentConfig = vi.fn();
    loadConfigLocks = vi.fn();
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  const renderHk = () => renderHook(() => useAdminSubmissions(getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig, loadConfigLocks));

  // --- handleLogoSubmit (URL mode) ---
  it('handleLogoSubmit URL mode success', async () => {
    submitLogoConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleLogoSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ logoMessageType: 'success' }));
    expect(loadCurrentConfig).toHaveBeenCalled();
  });

  it('handleLogoSubmit URL mode 401', async () => {
    submitLogoConfig.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleLogoSubmit({ preventDefault: vi.fn() }); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ logoMessageType: 'error' }));
  });

  it('handleLogoSubmit file mode uploads both files', async () => {
    configRef.current.uploadMode = 'file';
    configRef.current.logoDarkFile = new Blob(['dark']);
    configRef.current.logoLightFile = new Blob(['light']);
    uploadLogoFile.mockResolvedValue({ ok: true, status: 200, data: { logoUrl: '/uploaded.png' } });
    submitLogoConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleLogoSubmit({ preventDefault: vi.fn() }); });
    expect(uploadLogoFile).toHaveBeenCalledTimes(2);
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ logoMessageType: 'success' }));
  });

  it('handleLogoSubmit file mode no files selected', async () => {
    configRef.current.uploadMode = 'file';
    const { result } = renderHk();
    await act(async () => { result.current.handleLogoSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ logoMessageType: 'error' }));
  });

  it('handleLogoSubmit file upload 401', async () => {
    configRef.current.uploadMode = 'file';
    configRef.current.logoDarkFile = new Blob(['dark']);
    uploadLogoFile.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleLogoSubmit({ preventDefault: vi.fn() }); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  // --- handleMaintenanceSubmit ---
  it('handleMaintenanceSubmit success', async () => {
    submitMaintenanceConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleMaintenanceSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ maintenanceMessageType: 'success' }));
  });

  it('handleMaintenanceSubmit 401', async () => {
    submitMaintenanceConfig.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleMaintenanceSubmit({ preventDefault: vi.fn() }); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleMaintenanceSubmit error response', async () => {
    submitMaintenanceConfig.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleMaintenanceSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ maintenanceMessageType: 'error' }));
  });

  it('handleMaintenanceSubmit network error', async () => {
    submitMaintenanceConfig.mockRejectedValue(new Error('Network'));
    const { result } = renderHk();
    await act(async () => { result.current.handleMaintenanceSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ maintenanceMessageType: 'error' }));
  });

  // --- handleGraphRuntimeSubmit ---
  it('handleGraphRuntimeSubmit success', async () => {
    submitGraphRuntimeConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleGraphRuntimeSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ graphRuntimeMessageType: 'success' }));
  });

  it('handleGraphRuntimeSubmit 401', async () => {
    submitGraphRuntimeConfig.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleGraphRuntimeSubmit({ preventDefault: vi.fn() }); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleGraphRuntimeSubmit error', async () => {
    submitGraphRuntimeConfig.mockRejectedValue(new Error('Fail'));
    const { result } = renderHk();
    await act(async () => { result.current.handleGraphRuntimeSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ graphRuntimeMessageType: 'error' }));
  });

  // --- handleTranslationApiSubmit ---
  it('handleTranslationApiSubmit success', async () => {
    submitTranslationApiConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleTranslationApiSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ translationApiMessageType: 'success' }));
  });

  it('handleTranslationApiSubmit 401', async () => {
    submitTranslationApiConfig.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleTranslationApiSubmit({ preventDefault: vi.fn() }); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleTranslationApiSubmit error', async () => {
    submitTranslationApiConfig.mockRejectedValue(new Error('Fail'));
    const { result } = renderHk();
    await act(async () => { result.current.handleTranslationApiSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ translationApiMessageType: 'error' }));
  });

  // --- handleOAuthSubmit ---
  it('handleOAuthSubmit success', async () => {
    submitOAuthConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleOAuthSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ oauthMessageType: 'success' }));
  });

  it('handleOAuthSubmit 401', async () => {
    submitOAuthConfig.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleOAuthSubmit({ preventDefault: vi.fn() }); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleOAuthSubmit error', async () => {
    submitOAuthConfig.mockRejectedValue(new Error('Fail'));
    const { result } = renderHk();
    await act(async () => { result.current.handleOAuthSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ oauthMessageType: 'error' }));
  });

  // --- handleSearchSubmit ---
  it('handleSearchSubmit success', async () => {
    submitSearchConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleSearchSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ searchMessageType: 'success' }));
  });

  it('handleSearchSubmit 401', async () => {
    submitSearchConfig.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleSearchSubmit({ preventDefault: vi.fn() }); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleSearchSubmit error', async () => {
    submitSearchConfig.mockRejectedValue(new Error('Fail'));
    const { result } = renderHk();
    await act(async () => { result.current.handleSearchSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ searchMessageType: 'error' }));
  });

  // --- handleRateLimitSubmit ---
  it('handleRateLimitSubmit success', async () => {
    submitRateLimitConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleRateLimitSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ rateLimitMessageType: 'success' }));
  });

  it('handleRateLimitSubmit 401', async () => {
    submitRateLimitConfig.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleRateLimitSubmit({ preventDefault: vi.fn() }); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleRateLimitSubmit error', async () => {
    submitRateLimitConfig.mockRejectedValue(new Error('Fail'));
    const { result } = renderHk();
    await act(async () => { result.current.handleRateLimitSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ rateLimitMessageType: 'error' }));
  });

  // --- handleColorsSubmit ---
  it('handleColorsSubmit success', async () => {
    submitColorsConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleColorsSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ colorMessageType: 'success' }));
  });

  it('handleColorsSubmit 401', async () => {
    submitColorsConfig.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleColorsSubmit({ preventDefault: vi.fn() }); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleColorsSubmit error', async () => {
    submitColorsConfig.mockRejectedValue(new Error('Fail'));
    const { result } = renderHk();
    await act(async () => { result.current.handleColorsSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ colorMessageType: 'error' }));
  });

  // --- handleGenerateCertificate ---
  it('handleGenerateCertificate success', async () => {
    generateCertificate.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleGenerateCertificate(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ certificateMessageType: 'success' }));
  });

  it('handleGenerateCertificate 401', async () => {
    generateCertificate.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleGenerateCertificate(); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleGenerateCertificate error', async () => {
    generateCertificate.mockRejectedValue(new Error('Fail'));
    const { result } = renderHk();
    await act(async () => { result.current.handleGenerateCertificate(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ certificateMessageType: 'error' }));
  });

  // --- handleDownloadCertificate ---
  it('handleDownloadCertificate success', async () => {
    const blob = new Blob(['cert']);
    downloadCertificate.mockResolvedValue({ blob, filename: 'cert.pem' });
    window.URL.createObjectURL = vi.fn(() => 'blob:url');
    window.URL.revokeObjectURL = vi.fn();
    const { result } = renderHk();
    await act(async () => { result.current.handleDownloadCertificate(); });
    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('handleDownloadCertificate error', async () => {
    downloadCertificate.mockRejectedValue(new Error('Fail'));
    const { result } = renderHk();
    await act(async () => { result.current.handleDownloadCertificate(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ certificateMessageType: 'error' }));
  });

  // --- handleDeleteCertificate ---
  it('handleDeleteCertificate success', async () => {
    deleteCertificate.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleDeleteCertificate(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ certificateMessageType: 'success' }));
  });

  it('handleDeleteCertificate cancelled', async () => {
    window.confirm = vi.fn(() => false);
    const { result } = renderHk();
    await act(async () => { result.current.handleDeleteCertificate(); });
    expect(deleteCertificate).not.toHaveBeenCalled();
  });

  it('handleDeleteCertificate 401', async () => {
    deleteCertificate.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleDeleteCertificate(); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleDeleteCertificate error', async () => {
    deleteCertificate.mockRejectedValue(new Error('Fail'));
    const { result } = renderHk();
    await act(async () => { result.current.handleDeleteCertificate(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ certificateMessageType: 'error' }));
  });

  // --- handleWiFiApiTokenSubmit ---
  it('handleWiFiApiTokenSubmit rejects short token', () => {
    configRef.current.newWifiApiToken = 'short';
    configRef.current.newWifiApiTokenConfirm = 'short';
    const { result } = renderHk();
    act(() => { result.current.handleWiFiApiTokenSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ wifiApiTokenConfigMessageType: 'error' }));
  });

  it('handleWiFiApiTokenSubmit rejects mismatch', () => {
    configRef.current.newWifiApiToken = 'longtoken123';
    configRef.current.newWifiApiTokenConfirm = 'different123';
    const { result } = renderHk();
    act(() => { result.current.handleWiFiApiTokenSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ wifiApiTokenConfigMessageType: 'error' }));
  });

  it('handleWiFiApiTokenSubmit success', async () => {
    configRef.current.newWifiApiToken = 'validtoken123';
    configRef.current.newWifiApiTokenConfirm = 'validtoken123';
    submitApiTokenConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleWiFiApiTokenSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ wifiApiTokenConfigMessageType: 'success' }));
  });

  it('handleWiFiApiTokenSubmit 401', async () => {
    configRef.current.newWifiApiToken = 'validtoken123';
    configRef.current.newWifiApiTokenConfirm = 'validtoken123';
    submitApiTokenConfig.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleWiFiApiTokenSubmit({ preventDefault: vi.fn() }); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleWiFiApiTokenSubmit error', async () => {
    configRef.current.newWifiApiToken = 'validtoken123';
    configRef.current.newWifiApiTokenConfirm = 'validtoken123';
    submitApiTokenConfig.mockRejectedValue(new Error('Fail'));
    const { result } = renderHk();
    await act(async () => { result.current.handleWiFiApiTokenSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ wifiApiTokenConfigMessageType: 'error' }));
  });

  // --- handleLoadAuditLogs ---
  it('handleLoadAuditLogs success', async () => {
    fetchAuditLogs.mockResolvedValue({ ok: true, status: 200, data: { logs: [{ id: 1 }] } });
    const { result } = renderHk();
    await act(async () => { result.current.handleLoadAuditLogs(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ auditLogs: [{ id: 1 }] }));
  });

  it('handleLoadAuditLogs 401', async () => {
    fetchAuditLogs.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleLoadAuditLogs(); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleLoadAuditLogs error', async () => {
    fetchAuditLogs.mockRejectedValue(new Error('Fail'));
    const { result } = renderHk();
    await act(async () => { result.current.handleLoadAuditLogs(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ auditMessageType: 'error' }));
  });

  // --- handleImportBackup error response ---
  it('handleImportBackup 401', async () => {
    configRef.current.backupPayloadText = '{"key":"value"}';
    submitBackupImport.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleImportBackup(); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleImportBackup error response', async () => {
    configRef.current.backupPayloadText = '{"key":"value"}';
    submitBackupImport.mockResolvedValue({ ok: false, status: 500, data: { error: 'Bad data' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleImportBackup(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ backupMessageType: 'error' }));
  });

  it('handleImportBackup network error', async () => {
    configRef.current.backupPayloadText = '{"key":"value"}';
    submitBackupImport.mockRejectedValue(new Error('Network'));
    const { result } = renderHk();
    await act(async () => { result.current.handleImportBackup(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ backupMessageType: 'error' }));
  });

  // --- handleDeleteDisplay error response ---
  it('handleDeleteDisplay error response', async () => {
    deleteDisplay.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleDeleteDisplay('client-1'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ connectedDisplaysMessageType: 'error' }));
  });

  it('handleDeleteDisplay network error', async () => {
    deleteDisplay.mockRejectedValue(new Error('Network'));
    const { result } = renderHk();
    await act(async () => { result.current.handleDeleteDisplay('client-1'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ connectedDisplaysMessageType: 'error' }));
  });

  // --- handleOpenPowerManagementModal ---
  it('handleOpenPowerManagementModal for specific client', async () => {
    fetchPowerManagementConfig.mockResolvedValue({ mode: 'mqtt', mqttHostname: 'host1', schedule: { enabled: true, startTime: '22:00', endTime: '06:00', weekendMode: true } });
    configRef.current.connectedDisplays = [{ id: 'd1', mqtt: { connected: true, deviceId: 'dev1', hostname: 'host1' } }];
    const { result } = renderHk();
    await act(async () => { result.current.handleOpenPowerManagementModal('d1'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ showPowerManagementModal: true, powerManagementClientId: 'd1' }));
  });

  it('handleOpenPowerManagementModal for __global__', async () => {
    fetchPowerManagementConfig.mockResolvedValue({ global: { mode: 'browser', schedule: { enabled: false } } });
    configRef.current.connectedDisplays = [{ id: 'd1', mqtt: { connected: true } }];
    const { result } = renderHk();
    await act(async () => { result.current.handleOpenPowerManagementModal('__global__'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ showPowerManagementModal: true, powerManagementClientId: '__global__' }));
  });

  it('handleOpenPowerManagementModal handles fetch error', async () => {
    fetchPowerManagementConfig.mockRejectedValue(new Error('Fail'));
    const { result } = renderHk();
    await act(async () => { result.current.handleOpenPowerManagementModal('d1'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ showPowerManagementModal: true }));
  });

  it('handleOpenPowerManagementModal auto-selects mqtt mode when hasMqtt and no mode', async () => {
    fetchPowerManagementConfig.mockResolvedValue({ schedule: {} });
    configRef.current.connectedDisplays = [{ id: 'd1', mqtt: { connected: true, hostname: 'host1' } }];
    const { result } = renderHk();
    await act(async () => { result.current.handleOpenPowerManagementModal('d1'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ powerManagementMode: 'mqtt' }));
  });

  // --- handleClosePowerManagementModal ---
  it('handleClosePowerManagementModal clears state', () => {
    const { result } = renderHk();
    act(() => { result.current.handleClosePowerManagementModal(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ showPowerManagementModal: false }));
  });

  // --- handleSavePowerManagement ---
  it('handleSavePowerManagement success', async () => {
    submitPowerManagement.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleSavePowerManagement(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ powerManagementMessageType: 'success' }));
  });

  it('handleSavePowerManagement 401', async () => {
    submitPowerManagement.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleSavePowerManagement(); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleSavePowerManagement error response', async () => {
    submitPowerManagement.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleSavePowerManagement(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ powerManagementMessageType: 'error' }));
  });

  it('handleSavePowerManagement with mqtt mode includes hostname', async () => {
    configRef.current.powerManagementMode = 'mqtt';
    configRef.current.powerManagementMqttHostname = 'host1';
    submitPowerManagement.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleSavePowerManagement(); });
    expect(submitPowerManagement).toHaveBeenCalledWith(expect.any(Function), 'd1', expect.objectContaining({ mqttHostname: 'host1' }));
  });

  // --- WiFi submit non-ok response ---
  it('handleWiFiSubmit non-ok response', async () => {
    const { submitWiFiConfig } = await import('../services/admin-submissions.js');
    submitWiFiConfig.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleWiFiSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ wifiMessageType: 'error' }));
  });

  // --- Sidebar submit errors ---
  it('handleSidebarSubmit 401', async () => {
    const { submitSidebarConfig } = await import('../services/admin-submissions.js');
    submitSidebarConfig.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleSidebarSubmit({ preventDefault: vi.fn() }); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleSidebarSubmit error', async () => {
    const { submitSidebarConfig } = await import('../services/admin-submissions.js');
    submitSidebarConfig.mockRejectedValue(new Error('Fail'));
    const { result } = renderHk();
    await act(async () => { result.current.handleSidebarSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ informationMessageType: 'error' }));
  });

  // --- Booking submit errors ---
  it('handleBookingSubmit 401', async () => {
    const { submitBookingConfig } = await import('../services/admin-submissions.js');
    submitBookingConfig.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleBookingSubmit({ preventDefault: vi.fn() }); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleBookingSubmit error', async () => {
    const { submitBookingConfig } = await import('../services/admin-submissions.js');
    submitBookingConfig.mockRejectedValue(new Error('Fail'));
    const { result } = renderHk();
    await act(async () => { result.current.handleBookingSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ bookingMessageType: 'error' }));
  });

  // --- System submit error ---
  it('handleSystemSubmit error', async () => {
    const { submitSystemConfig } = await import('../services/admin-submissions.js');
    submitSystemConfig.mockRejectedValue(new Error('Fail'));
    const { result } = renderHk();
    await act(async () => { result.current.handleSystemSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ systemMessageType: 'error' }));
  });

  // --- ApiToken submit error ---
  it('handleApiTokenSubmit error', async () => {
    configRef.current.newApiToken = 'validtoken123';
    configRef.current.newApiTokenConfirm = 'validtoken123';
    submitApiTokenConfig.mockRejectedValue(new Error('Fail'));
    const { result } = renderHk();
    await act(async () => { result.current.handleApiTokenSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ apiTokenConfigMessageType: 'error' }));
  });

  // --- ApiToken non-ok response ---
  it('handleApiTokenSubmit non-ok response', async () => {
    configRef.current.newApiToken = 'validtoken123';
    configRef.current.newApiTokenConfirm = 'validtoken123';
    submitApiTokenConfig.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleApiTokenSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ apiTokenConfigMessageType: 'error' }));
  });

  // --- handleLoadConnectedDisplays non-array data ---
  it('handleLoadConnectedDisplays with non-array data', async () => {
    fetchConnectedDisplays.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderHk();
    await act(async () => { await result.current.handleLoadConnectedDisplays(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ connectedDisplays: [] }));
  });
});
