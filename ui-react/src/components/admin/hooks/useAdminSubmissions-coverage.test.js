import { renderHook, act } from '@testing-library/react';
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
  submitSystemConfig, submitGraphRuntimeConfig,
  submitApiTokenConfig, submitSearchConfig, submitRateLimitConfig,
  submitBookingConfig, submitSidebarConfig,
  fetchPowerManagementConfig, submitPowerManagement,
  fetchConnectedDisplays
} from '../services/admin-submissions.js';

describe('useAdminSubmissions - coverage gaps', () => {
  let getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig, loadConfigLocks;

  const translations = {
    errorUnauthorized: 'Unauthorized', errorUnknown: 'Unknown', errorPrefix: 'Error:',
    logoSuccessMessage: 'Logo saved', sidebarSuccessMessage: 'Sidebar saved',
    bookingSuccessMessage: 'Booking saved', systemConfigUpdateSuccess: 'System saved',
    graphRuntimeUpdateSuccess: 'Graph updated', connectedDisplaysDeleteConfirm: 'Delete?',
    connectedDisplaysDeleteSuccess: 'Deleted', connectedDisplaysDeleteError: 'Delete failed',
    powerManagementSaveSuccess: 'PM saved', powerManagementSaveError: 'PM error',
    apiTokenConfigMinLengthError: 'Too short', apiTokenConfigMismatchError: 'Mismatch',
    wifiApiTokenConfigUpdateSuccess: 'WiFi token updated'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    getRequestHeaders = vi.fn(() => ({}));
    handleUnauthorizedAccess = vi.fn();
    getTranslations = vi.fn(() => translations);
    configRef = { current: {
      ssid: 'Net', password: 'pw',
      logoDarkUrl: '/d.png', logoLightUrl: '/l.png', logoDarkFile: null, logoLightFile: null, uploadMode: 'url',
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
      systemGraphWebhookEnabled: false, systemGraphWebhookClientState: '', systemGraphWebhookAllowedIps: '',
      systemGraphFetchTimeoutMs: 10000, systemGraphFetchRetryAttempts: 2, systemGraphFetchRetryBaseMs: 250,
      translationApiEnabled: true, translationApiUrl: 'https://api.test', translationApiTimeoutMs: 5000, translationApiApiKey: '',
      oauthClientId: 'cid', oauthAuthority: 'tid', oauthClientSecret: '',
      searchUseGraphAPI: true, searchMaxDays: 7, searchMaxRoomLists: 5, searchMaxRooms: 50, searchMaxItems: 100, searchPollIntervalMs: 15000,
      rateLimitApiWindowMs: 60000, rateLimitApiMax: 300, rateLimitWriteWindowMs: 60000, rateLimitWriteMax: 60, rateLimitAuthWindowMs: 60000, rateLimitAuthMax: 30,
      statusAvailableColor: '#22c55e', statusBusyColor: '#ef4444', statusUpcomingColor: '#f59e0b', statusNotFoundColor: '#6b7280',
      newApiToken: '', newApiTokenConfirm: '', newWifiApiToken: '', newWifiApiTokenConfirm: '',
      backupPayloadText: '{}',
      connectedDisplays: [],
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

  // --- handleLogoSubmit: file upload light file 401 ---
  it('handleLogoSubmit file mode light file upload 401', async () => {
    configRef.current.uploadMode = 'file';
    configRef.current.logoDarkFile = null;
    configRef.current.logoLightFile = new Blob(['light']);
    uploadLogoFile.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleLogoSubmit({ preventDefault: vi.fn() }); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleLogoSubmit file mode light file upload non-ok', async () => {
    configRef.current.uploadMode = 'file';
    configRef.current.logoDarkFile = null;
    configRef.current.logoLightFile = new Blob(['light']);
    uploadLogoFile.mockResolvedValue({ ok: false, status: 500, data: { error: 'Upload failed' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleLogoSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ logoMessageType: 'error' }));
  });

  it('handleLogoSubmit URL mode non-ok response', async () => {
    submitLogoConfig.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleLogoSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ logoMessageType: 'error' }));
  });

  // --- handleSystemSubmit: non-ok non-401 response ---
  it('handleSystemSubmit non-ok non-401 response', async () => {
    submitSystemConfig.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleSystemSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ systemMessageType: 'error' }));
  });

  it('handleSystemSubmit network error', async () => {
    submitSystemConfig.mockRejectedValue(new Error('Network'));
    const { result } = renderHk();
    await act(async () => { result.current.handleSystemSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ systemMessageType: 'error' }));
  });

  // --- handleGraphRuntimeSubmit: non-ok non-401 response ---
  it('handleGraphRuntimeSubmit non-ok non-401 response', async () => {
    submitGraphRuntimeConfig.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleGraphRuntimeSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ graphRuntimeMessageType: 'error' }));
  });

  // --- handleApiTokenSubmit: non-ok non-401 response ---
  it('handleApiTokenSubmit non-ok non-401 response', async () => {
    configRef.current.newApiToken = 'validtoken123';
    configRef.current.newApiTokenConfirm = 'validtoken123';
    submitApiTokenConfig.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleApiTokenSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ apiTokenConfigMessageType: 'error' }));
  });

  it('handleApiTokenSubmit network error', async () => {
    configRef.current.newApiToken = 'validtoken123';
    configRef.current.newApiTokenConfirm = 'validtoken123';
    submitApiTokenConfig.mockRejectedValue(new Error('Network'));
    const { result } = renderHk();
    await act(async () => { result.current.handleApiTokenSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ apiTokenConfigMessageType: 'error' }));
  });

  // --- handleWiFiApiTokenSubmit: non-ok non-401 response ---
  it('handleWiFiApiTokenSubmit non-ok non-401 response', async () => {
    configRef.current.newWifiApiToken = 'validtoken123';
    configRef.current.newWifiApiTokenConfirm = 'validtoken123';
    submitApiTokenConfig.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleWiFiApiTokenSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ wifiApiTokenConfigMessageType: 'error' }));
  });

  // --- handleSearchSubmit: non-ok non-401 response ---
  it('handleSearchSubmit non-ok non-401 response', async () => {
    submitSearchConfig.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleSearchSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ searchMessageType: 'error' }));
  });

  // --- handleRateLimitSubmit: non-ok non-401 response ---
  it('handleRateLimitSubmit non-ok non-401 response', async () => {
    submitRateLimitConfig.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleRateLimitSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ rateLimitMessageType: 'error' }));
  });

  // --- handleBookingSubmit: non-ok non-401 response ---
  it('handleBookingSubmit non-ok non-401 response', async () => {
    submitBookingConfig.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleBookingSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ bookingMessageType: 'error' }));
  });

  it('handleBookingSubmit network error', async () => {
    submitBookingConfig.mockRejectedValue(new Error('Network'));
    const { result } = renderHk();
    await act(async () => { result.current.handleBookingSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ bookingMessageType: 'error' }));
  });

  // --- handleSidebarSubmit: non-ok non-401 response ---
  it('handleSidebarSubmit non-ok non-401 response', async () => {
    submitSidebarConfig.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleSidebarSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ informationMessageType: 'error' }));
  });

  // --- handleOpenPowerManagementModal: __global__ with no mqtt displays ---
  it('handleOpenPowerManagementModal __global__ no mqtt displays', async () => {
    fetchPowerManagementConfig.mockResolvedValue({ global: { mode: 'browser', schedule: {} } });
    configRef.current.connectedDisplays = [{ id: 'd1' }]; // no mqtt
    const { result } = renderHk();
    await act(async () => { result.current.handleOpenPowerManagementModal('__global__'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ powerManagementHasMqtt: false }));
  });

  // --- handleOpenPowerManagementModal: error fallback with mqtt ---
  it('handleOpenPowerManagementModal error fallback with mqtt display', async () => {
    fetchPowerManagementConfig.mockRejectedValue(new Error('fail'));
    configRef.current.connectedDisplays = [{ id: 'd1', mqtt: { connected: true, deviceId: 'dev1', hostname: 'host1' } }];
    const { result } = renderHk();
    await act(async () => { result.current.handleOpenPowerManagementModal('d1'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({
      showPowerManagementModal: true,
      powerManagementMode: 'mqtt',
      powerManagementMqttHostname: 'dev1'
    }));
  });

  // --- handleOpenPowerManagementModal: error fallback __global__ ---
  it('handleOpenPowerManagementModal error fallback __global__', async () => {
    fetchPowerManagementConfig.mockRejectedValue(new Error('fail'));
    configRef.current.connectedDisplays = [{ id: 'd1', mqtt: { connected: true } }];
    const { result } = renderHk();
    await act(async () => { result.current.handleOpenPowerManagementModal('__global__'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({
      showPowerManagementModal: true,
      powerManagementMode: 'browser' // __global__ always browser
    }));
  });

  // --- handleSavePowerManagement: network error ---
  it('handleSavePowerManagement network error', async () => {
    submitPowerManagement.mockRejectedValue(new Error('Network'));
    const { result } = renderHk();
    await act(async () => { result.current.handleSavePowerManagement(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ powerManagementMessageType: 'error' }));
  });

  // --- handleLoadConnectedDisplays: non-array displays ---
  it('handleLoadConnectedDisplays handles non-array displays data', async () => {
    fetchConnectedDisplays.mockResolvedValue({ ok: true, status: 200, data: { displays: null } });
    const { result } = renderHk();
    await act(async () => { await result.current.handleLoadConnectedDisplays(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ connectedDisplays: [] }));
  });

  // --- handleTranslationApiSubmit: without apiKey ---
  it('handleTranslationApiSubmit without apiKey', async () => {
    const { submitTranslationApiConfig } = await import('../services/admin-submissions.js');
    configRef.current.translationApiApiKey = '';
    submitTranslationApiConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderHk();
    await act(async () => { result.current.handleTranslationApiSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ translationApiMessageType: 'success' }));
  });

  // --- handleTranslationApiSubmit: non-ok non-401 ---
  it('handleTranslationApiSubmit non-ok non-401', async () => {
    const { submitTranslationApiConfig } = await import('../services/admin-submissions.js');
    submitTranslationApiConfig.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleTranslationApiSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ translationApiMessageType: 'error' }));
  });

  // --- handleOAuthSubmit: non-ok non-401 ---
  it('handleOAuthSubmit non-ok non-401', async () => {
    const { submitOAuthConfig } = await import('../services/admin-submissions.js');
    submitOAuthConfig.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderHk();
    await act(async () => { result.current.handleOAuthSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ oauthMessageType: 'error' }));
  });
});
