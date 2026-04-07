import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAdminConfig } from './useAdminConfig.js';

vi.mock('../../../config/admin-translations.js', () => ({
  default: { en: { title: 'Admin Panel' }, de: { title: 'Admin Panel' } },
  getAdminTranslations: () => ({ title: 'Admin Panel' })
}));

vi.mock('../services/admin-config-loader.js', () => ({
  loadWiFiConfig: vi.fn().mockResolvedValue({ ok: true, data: { ssid: 'Net', password: 'pw' } }),
  loadLogoConfig: vi.fn().mockResolvedValue({ ok: true, data: { logoDarkUrl: '/d.png', logoLightUrl: '/l.png' } }),
  loadSidebarConfig: vi.fn().mockResolvedValue({ ok: true, data: { showWiFi: true } }),
  loadBookingConfig: vi.fn().mockResolvedValue({ ok: true, data: { enableBooking: true, checkIn: {} } }),
  loadSearchConfig: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  loadRateLimitConfig: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  loadTranslationApiConfig: vi.fn().mockResolvedValue({ ok: true, data: { enabled: true } }),
  loadMaintenanceStatus: vi.fn().mockResolvedValue({ ok: true, data: { enabled: false } }),
  loadSystemConfig: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  loadOAuthConfig: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  loadCertificateInfo: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  loadApiTokenConfig: vi.fn().mockResolvedValue({ ok: true, data: { source: 'default' } }),
  loadI18nConfig: vi.fn().mockResolvedValue({ ok: true, data: { maintenanceMessages: {}, adminTranslations: {} } }),
  loadColorsConfig: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  loadRoomLists: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  loadRooms: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  loadConfigLocks: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  loadConnectedClients: vi.fn().mockResolvedValue({ ok: true, data: { clients: [] } }),
  loadSyncStatus: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  loadVersion: vi.fn().mockResolvedValue({ ok: true, data: { version: '1.0.0' } }),
  loadBootstrapStatus: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  verifyAdminSession: vi.fn().mockResolvedValue(true)
}));

vi.mock('../services/mqtt-commands.js', () => ({
  fetchMqttConfig: vi.fn().mockResolvedValue(null),
  fetchMqttStatus: vi.fn().mockResolvedValue(null)
}));

describe('useAdminConfig - boost coverage', () => {
  const getRequestHeaders = vi.fn(() => ({ 'Content-Type': 'application/json' }));
  const handleUnauthorizedAccess = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('loadVersion handles error gracefully', async () => {
    const { loadVersion } = await import('../services/admin-config-loader.js');
    loadVersion.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadVersion(); });
    expect(result.current.config).toBeDefined();
  });

  it('loadVersion ignores response without version', async () => {
    const { loadVersion } = await import('../services/admin-config-loader.js');
    loadVersion.mockResolvedValue({ ok: true, data: {} });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadVersion(); });
    expect(result.current.config.appVersion).toBeNull();
  });

  it('loadConfigLocks handles error gracefully', async () => {
    const { loadConfigLocks } = await import('../services/admin-config-loader.js');
    loadConfigLocks.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadConfigLocks(); });
    expect(result.current.config).toBeDefined();
  });

  it('loadConfigLocks ignores non-ok response', async () => {
    const { loadConfigLocks } = await import('../services/admin-config-loader.js');
    loadConfigLocks.mockResolvedValue({ ok: false, data: {} });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadConfigLocks(); });
    expect(result.current.config.wifiLocked).toBe(false);
  });

  it('loadConnectedClients handles non-ok response', async () => {
    const { loadConnectedClients } = await import('../services/admin-config-loader.js');
    loadConnectedClients.mockResolvedValue({ ok: false, data: {} });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadConnectedClients(); });
    expect(result.current.config.connectedClientsLoading).toBe(false);
  });

  it('loadMqttConfig handles error gracefully', async () => {
    const { fetchMqttConfig } = await import('../services/mqtt-commands.js');
    fetchMqttConfig.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadMqttConfig(); });
    expect(result.current.config).toBeDefined();
  });

  it('loadMqttStatus handles error gracefully', async () => {
    const { fetchMqttStatus } = await import('../services/mqtt-commands.js');
    fetchMqttStatus.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadMqttStatus(); });
    expect(result.current.config).toBeDefined();
  });

  it('loadCurrentConfig handles system config 401', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadSystemConfig.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('loadCurrentConfig handles oauth config 401', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadSystemConfig.mockResolvedValue({ ok: true, data: {} });
    loaders.loadOAuthConfig.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('loadCurrentConfig handles api token config 401', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadSystemConfig.mockResolvedValue({ ok: true, data: {} });
    loaders.loadOAuthConfig.mockResolvedValue({ ok: true, data: {} });
    loaders.loadApiTokenConfig.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('loadCurrentConfig loads rooms with dedup', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadRooms.mockResolvedValue({ ok: true, data: [
      { Email: 'room1@test.com', Name: 'Room 1', RoomAlias: 'r1' },
      { Email: 'room1@test.com', Name: 'Room 1 Dup' },
      { Email: 'room2@test.com', Name: 'Room 2' }
    ]});
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config.availableRoomOptions).toHaveLength(2);
  });

  it('loadCurrentConfig loads room lists with aliases', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadRoomLists.mockResolvedValue({ ok: true, data: [
      { alias: 'floor1', name: 'Floor 1' },
      { alias: 'floor2', name: 'Floor 2' },
      { name: 'No Alias' }
    ]});
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config.availableRoomGroupOptions).toHaveLength(2);
  });

  it('loadCurrentConfig loads booking config with checkIn data', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadBookingConfig.mockResolvedValue({ ok: true, data: {
      enableBooking: false, enableExtendMeeting: true, permissionMissing: true,
      buttonColor: '#ff0000',
      checkIn: { enabled: true, requiredForExternalMeetings: false, earlyCheckInMinutes: 10, windowMinutes: 15, autoReleaseNoShow: false },
      roomFeatureFlags: { room1: { booking: true } },
      roomGroupFeatureFlags: { group1: { booking: false } }
    }});
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config.enableBooking).toBe(false);
    expect(result.current.config.checkInEnabled).toBe(true);
    expect(result.current.config.bookingPermissionMissing).toBe(true);
  });

  it('loadCurrentConfig loads system config with all fields', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadSystemConfig.mockResolvedValue({ ok: true, data: {
      startupValidationStrict: true, exposeDetailedErrors: true,
      graphWebhookEnabled: true, graphWebhookClientState: 'state1',
      graphWebhookAllowedIps: ['1.2.3.4', '5.6.7.8'],
      graphFetchTimeoutMs: 5000, graphFetchRetryAttempts: 3, graphFetchRetryBaseMs: 100,
      hstsMaxAge: 86400, rateLimitMaxBuckets: 5000,
      displayTrackingMode: 'ip', displayTrackingRetentionHours: 4, displayTrackingCleanupMinutes: 10,
      displayIpWhitelistEnabled: true, displayIpWhitelist: ['10.0.0.1'],
      trustReverseProxy: true, demoMode: true, lastUpdated: '2024-01-01'
    }});
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config.systemStartupValidationStrict).toBe(true);
    expect(result.current.config.systemDisplayTrackingMode).toBe('ip');
    expect(result.current.config.demoMode).toBe(true);
  });

  it('loadCurrentConfig loads i18n with existing translations', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadI18nConfig.mockResolvedValue({ ok: true, data: {
      maintenanceMessages: { en: { title: 'Maint' }, de: { title: 'Wartung' } },
      adminTranslations: { en: { title: 'Admin' } },
      lastUpdated: '2024-01-01'
    }});
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config.currentMaintenanceTranslations).toEqual({ en: { title: 'Maint' }, de: { title: 'Wartung' } });
  });

  it('loadCurrentConfig loads colors config', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadColorsConfig.mockResolvedValue({ ok: true, data: {
      bookingButtonColor: '#111', statusAvailableColor: '#222',
      statusBusyColor: '#333', statusUpcomingColor: '#444', statusNotFoundColor: '#555'
    }});
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config.bookingButtonColor).toBe('#111');
  });

  it('loadCurrentConfig loads oauth config preserving dirty form', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadOAuthConfig.mockResolvedValue({ ok: true, data: { clientId: 'cid', tenantId: 'tid', hasClientSecret: true } });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    act(() => { result.current.updateConfig({ oauthFormDirty: true, oauthClientId: 'edited' }); });
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config.currentOauthClientId).toBe('cid');
    expect(result.current.config.oauthClientId).toBe('edited');
  });

  it('updateConfig with function returning same prev returns prev', () => {
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    const before = result.current.config;
    act(() => { result.current.updateConfig(prev => prev); });
    expect(result.current.config).toBe(before);
  });
});
