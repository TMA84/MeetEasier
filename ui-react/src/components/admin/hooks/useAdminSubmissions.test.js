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
  submitWiFiConfig, submitSidebarConfig, submitBookingConfig,
  submitSystemConfig, submitApiTokenConfig,
  submitBackupExport, submitBackupImport,
  fetchConnectedDisplays, deleteDisplay
} from '../services/admin-submissions.js';

describe('useAdminSubmissions', () => {
  let getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig, loadConfigLocks;

  const translations = {
    errorUnauthorized: 'Unauthorized',
    errorUnknown: 'Unknown error',
    errorPrefix: 'Error:',
    wifiSuccessMessage: 'WiFi saved',
    sidebarSuccessMessage: 'Sidebar saved',
    bookingSuccessMessage: 'Booking saved',
    systemConfigUpdateSuccess: 'System saved',
    apiTokenConfigMinLengthError: 'Token too short',
    apiTokenConfigMismatchError: 'Tokens do not match',
    apiTokenConfigUpdateSuccess: 'Token updated',
    backupSuccessExport: 'Backup exported',
    backupSuccessImport: 'Backup imported',
    connectedDisplaysDeleteConfirm: 'Delete display?',
    connectedDisplaysDeleteSuccess: 'Display deleted',
    connectedDisplaysDeleteError: 'Delete failed'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    getRequestHeaders = vi.fn(() => ({ 'Content-Type': 'application/json' }));
    handleUnauthorizedAccess = vi.fn();
    getTranslations = vi.fn(() => translations);
    configRef = { current: {
      ssid: 'TestNet', password: 'pass123',
      showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false,
      minimalHeaderStyle: 'filled', upcomingMeetingsCount: 3,
      singleRoomDarkMode: false, flightboardDarkMode: true, sidebarTargetClientId: '',
      enableBooking: true, enableExtendMeeting: false, bookingButtonColor: '#334155',
      checkInEnabled: true, checkInRequiredForExternalMeetings: true,
      checkInEarlyMinutes: 5, checkInWindowMinutes: 10, checkInAutoReleaseNoShow: true,
      roomFeatureFlags: {}, roomGroupFeatureFlags: {},
      systemStartupValidationStrict: false, systemExposeDetailedErrors: false,
      systemHstsMaxAge: 31536000, systemRateLimitMaxBuckets: 10000,
      systemDisplayTrackingMode: 'client-id', systemDisplayTrackingRetentionHours: 2,
      systemDisplayTrackingCleanupMinutes: 5, systemDisplayIpWhitelistEnabled: false,
      systemDisplayIpWhitelist: '', systemTrustReverseProxy: false, demoMode: false,
      newApiToken: '', newApiTokenConfirm: '',
      backupPayloadText: '{}',
      connectedDisplays: []
    }};
    updateConfig = vi.fn((patch) => {
      if (typeof patch === 'function') Object.assign(configRef.current, patch(configRef.current));
      else Object.assign(configRef.current, patch);
    });
    loadCurrentConfig = vi.fn();
    loadConfigLocks = vi.fn();
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const renderSubmissionsHook = () =>
    renderHook(() => useAdminSubmissions(getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig, loadConfigLocks));

  // --- handleWiFiSubmit ---
  it('handleWiFiSubmit success', async () => {
    submitWiFiConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderSubmissionsHook();
    const fakeEvent = { preventDefault: vi.fn() };
    await act(async () => { result.current.handleWiFiSubmit(fakeEvent); });
    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ wifiMessageType: 'success' }));
    expect(loadCurrentConfig).toHaveBeenCalled();
  });

  it('handleWiFiSubmit handles 401', async () => {
    submitWiFiConfig.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleWiFiSubmit({ preventDefault: vi.fn() }); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleWiFiSubmit handles error', async () => {
    submitWiFiConfig.mockRejectedValue(new Error('Network'));
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleWiFiSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ wifiMessageType: 'error' }));
  });

  // --- handleSidebarSubmit ---
  it('handleSidebarSubmit global success', async () => {
    submitSidebarConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleSidebarSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ informationMessageType: 'success' }));
  });

  it('handleSidebarSubmit per-client', async () => {
    configRef.current.sidebarTargetClientId = 'client-1';
    submitSidebarConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleSidebarSubmit({ preventDefault: vi.fn() }); });
    expect(submitSidebarConfig).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ targetClientId: 'client-1' }));
  });

  // --- handleBookingSubmit ---
  it('handleBookingSubmit success', async () => {
    submitBookingConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleBookingSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ bookingMessageType: 'success' }));
  });

  // --- handleSystemSubmit ---
  it('handleSystemSubmit success', async () => {
    submitSystemConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleSystemSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ systemMessageType: 'success' }));
  });

  it('handleSystemSubmit handles 401', async () => {
    submitSystemConfig.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleSystemSubmit({ preventDefault: vi.fn() }); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  // --- handleApiTokenSubmit ---
  it('handleApiTokenSubmit rejects short token', () => {
    configRef.current.newApiToken = 'short';
    configRef.current.newApiTokenConfirm = 'short';
    const { result } = renderSubmissionsHook();
    act(() => { result.current.handleApiTokenSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ apiTokenConfigMessageType: 'error' }));
    expect(submitApiTokenConfig).not.toHaveBeenCalled();
  });

  it('handleApiTokenSubmit rejects mismatched tokens', () => {
    configRef.current.newApiToken = 'longtoken123';
    configRef.current.newApiTokenConfirm = 'different123';
    const { result } = renderSubmissionsHook();
    act(() => { result.current.handleApiTokenSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ apiTokenConfigMessageType: 'error' }));
    expect(submitApiTokenConfig).not.toHaveBeenCalled();
  });

  it('handleApiTokenSubmit success', async () => {
    configRef.current.newApiToken = 'validtoken123';
    configRef.current.newApiTokenConfirm = 'validtoken123';
    submitApiTokenConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleApiTokenSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ apiTokenConfigMessageType: 'success' }));
    expect(loadConfigLocks).toHaveBeenCalled();
  });

  it('handleApiTokenSubmit handles 401', async () => {
    configRef.current.newApiToken = 'validtoken123';
    configRef.current.newApiTokenConfirm = 'validtoken123';
    submitApiTokenConfig.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleApiTokenSubmit({ preventDefault: vi.fn() }); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  // --- handleExportBackup ---
  it('handleExportBackup success', async () => {
    submitBackupExport.mockResolvedValue({ ok: true, status: 200, data: { config: {} } });
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleExportBackup(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ backupMessageType: 'success' }));
  });

  it('handleExportBackup handles 401', async () => {
    submitBackupExport.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleExportBackup(); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleExportBackup handles error', async () => {
    submitBackupExport.mockRejectedValue(new Error('Fail'));
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleExportBackup(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ backupMessageType: 'error' }));
  });

  // --- handleImportBackup ---
  it('handleImportBackup success', async () => {
    configRef.current.backupPayloadText = '{"key":"value"}';
    submitBackupImport.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleImportBackup(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ backupMessageType: 'success' }));
    expect(loadCurrentConfig).toHaveBeenCalled();
  });

  it('handleImportBackup handles invalid JSON', async () => {
    configRef.current.backupPayloadText = 'not-json';
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleImportBackup(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ backupMessageType: 'error' }));
    expect(submitBackupImport).not.toHaveBeenCalled();
  });

  // --- handleLoadConnectedDisplays ---
  it('handleLoadConnectedDisplays success', async () => {
    fetchConnectedDisplays.mockResolvedValue({ ok: true, status: 200, data: { displays: [{ id: 'd1' }] } });
    const { result } = renderSubmissionsHook();
    await act(async () => { await result.current.handleLoadConnectedDisplays(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ connectedDisplays: [{ id: 'd1' }] }));
  });

  it('handleLoadConnectedDisplays handles 401', async () => {
    fetchConnectedDisplays.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderSubmissionsHook();
    await act(async () => { await result.current.handleLoadConnectedDisplays(); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleLoadConnectedDisplays handles error', async () => {
    fetchConnectedDisplays.mockRejectedValue(new Error('Fail'));
    const { result } = renderSubmissionsHook();
    await act(async () => { await result.current.handleLoadConnectedDisplays(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ connectedDisplaysMessageType: 'error' }));
  });

  // --- handleDeleteDisplay ---
  it('handleDeleteDisplay confirm and success', async () => {
    deleteDisplay.mockResolvedValue({ ok: true, status: 200, data: {} });
    fetchConnectedDisplays.mockResolvedValue({ ok: true, status: 200, data: { displays: [] } });
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleDeleteDisplay('client-1'); });
    expect(window.confirm).toHaveBeenCalled();
    expect(deleteDisplay).toHaveBeenCalledWith(expect.any(Function), 'client-1');
  });

  it('handleDeleteDisplay cancel', async () => {
    window.confirm = vi.fn(() => false);
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleDeleteDisplay('client-1'); });
    expect(deleteDisplay).not.toHaveBeenCalled();
  });

  it('handleDeleteDisplay handles 401', async () => {
    deleteDisplay.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderSubmissionsHook();
    await act(async () => { result.current.handleDeleteDisplay('client-1'); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });
});
