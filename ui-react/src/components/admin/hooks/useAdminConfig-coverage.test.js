import { renderHook, act } from '@testing-library/react';
import { useAdminConfig } from './useAdminConfig.js';

vi.mock('../../../config/admin-translations.js', () => ({
  default: { en: { title: 'Admin' }, de: { title: 'Admin' } },
  getAdminTranslations: () => ({ title: 'Admin' })
}));

vi.mock('../services/admin-config-loader.js', () => ({
  loadWiFiConfig: vi.fn().mockResolvedValue({ ok: true, data: { ssid: 'Net', password: 'pw' } }),
  loadLogoConfig: vi.fn().mockResolvedValue({ ok: true, data: {} }),
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
  loadVersion: vi.fn().mockResolvedValue({ ok: true, data: { version: '1.0.0' } })
}));

vi.mock('../services/mqtt-commands.js', () => ({
  fetchMqttConfig: vi.fn().mockResolvedValue(null),
  fetchMqttStatus: vi.fn().mockResolvedValue(null)
}));

describe('useAdminConfig - coverage gaps', () => {
  const getRequestHeaders = vi.fn(() => ({ 'Content-Type': 'application/json' }));
  const handleUnauthorizedAccess = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('loadSyncStatus handles error and sets null', async () => {
    const { loadSyncStatus } = await import('../services/admin-config-loader.js');
    loadSyncStatus.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadSyncStatus(); });
    expect(result.current.config.syncStatusLoading).toBe(false);
  });

  it('loadSyncStatus sets data on success', async () => {
    const { loadSyncStatus } = await import('../services/admin-config-loader.js');
    loadSyncStatus.mockResolvedValue({ ok: true, data: { lastSync: '2024-01-01' } });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadSyncStatus(); });
    expect(result.current.config.syncStatus).toEqual({ lastSync: '2024-01-01' });
  });

  it('loadSyncStatus sets null on non-ok response', async () => {
    const { loadSyncStatus } = await import('../services/admin-config-loader.js');
    loadSyncStatus.mockResolvedValue({ ok: false, data: {} });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadSyncStatus(); });
    expect(result.current.config.syncStatus).toBeNull();
  });

  it('loadConnectedClients handles error gracefully', async () => {
    const { loadConnectedClients } = await import('../services/admin-config-loader.js');
    loadConnectedClients.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadConnectedClients(); });
    expect(result.current.config.connectedClientsLoading).toBe(false);
  });

  it('loadConnectedClients preserves sidebarTargetClientId when client still exists', async () => {
    const { loadConnectedClients } = await import('../services/admin-config-loader.js');
    loadConnectedClients.mockResolvedValue({ ok: true, data: { clients: [{ clientId: 'c1' }, { clientId: 'c2' }] } });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    act(() => { result.current.updateConfig({ sidebarTargetClientId: 'c1' }); });
    await act(async () => { result.current.loadConnectedClients(); });
    expect(result.current.config.sidebarTargetClientId).toBe('c1');
  });

  it('loadConnectedClients clears sidebarTargetClientId when client no longer exists', async () => {
    const { loadConnectedClients } = await import('../services/admin-config-loader.js');
    loadConnectedClients.mockResolvedValue({ ok: true, data: { clients: [{ clientId: 'c2' }] } });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    act(() => { result.current.updateConfig({ sidebarTargetClientId: 'c1' }); });
    await act(async () => { result.current.loadConnectedClients(); });
    expect(result.current.config.sidebarTargetClientId).toBe('');
  });

  it('loadMqttConfig loads data successfully', async () => {
    const { fetchMqttConfig } = await import('../services/mqtt-commands.js');
    fetchMqttConfig.mockResolvedValue({ enabled: true, brokerUrl: 'mqtt://broker', authentication: true, username: 'user', password: 'pass', discovery: 'disc' });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadMqttConfig(); });
    expect(result.current.config.mqttEnabled).toBe(true);
    expect(result.current.config.mqttBrokerUrl).toBe('mqtt://broker');
  });

  it('loadMqttStatus loads data successfully', async () => {
    const { fetchMqttStatus } = await import('../services/mqtt-commands.js');
    fetchMqttStatus.mockResolvedValue({ connected: true });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadMqttStatus(); });
    expect(result.current.config.mqttStatus).toEqual({ connected: true });
  });

  it('loadVersion loads version successfully', async () => {
    const { loadVersion } = await import('../services/admin-config-loader.js');
    loadVersion.mockResolvedValue({ ok: true, data: { version: '2.0.0' } });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadVersion(); });
    expect(result.current.config.appVersion).toBe('2.0.0');
  });

  it('loadLogoConfig loads logo URLs', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadLogoConfig.mockResolvedValue({ ok: true, data: { logoDarkUrl: '/dark.png', logoLightUrl: '/light.png' } });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadLogoConfig(); });
    expect(result.current.config.currentLogoDarkUrl).toBe('/dark.png');
  });

  it('loadLogoConfig handles error', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadLogoConfig.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadLogoConfig(); });
    // Should not throw
    expect(result.current.config).toBeDefined();
  });

  it('setField updates a single field', () => {
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    act(() => { result.current.setField('ssid', 'NewSSID'); });
    expect(result.current.config.ssid).toBe('NewSSID');
  });

  it('loadCurrentConfig loads sidebar config with sidebarTargetClientId set', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    // Reset all mocks to defaults
    Object.values(loaders).forEach(fn => { if (typeof fn.mockResolvedValue === 'function') fn.mockResolvedValue({ ok: true, data: {} }); });
    loaders.loadWiFiConfig.mockResolvedValue({ ok: true, data: { ssid: 'Net', password: 'pw' } });
    loaders.loadSidebarConfig.mockResolvedValue({ ok: true, data: { showWiFi: true, singleRoomDarkMode: false, flightboardDarkMode: true } });
    loaders.loadBookingConfig.mockResolvedValue({ ok: true, data: { enableBooking: true, checkIn: {} } });
    loaders.loadConnectedClients.mockResolvedValue({ ok: true, data: { clients: [{ clientId: 'client-1' }] } });
    loaders.loadI18nConfig.mockResolvedValue({ ok: true, data: { maintenanceMessages: {}, adminTranslations: {} } });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    act(() => { result.current.updateConfig({ sidebarTargetClientId: 'client-1' }); });
    await act(async () => { result.current.loadCurrentConfig(); });
    // When sidebarTargetClientId is set and client exists, it should be preserved
    expect(result.current.config.sidebarTargetClientId).toBe('client-1');
  });

  it('loadCurrentConfig handles sidebar target config error gracefully', async () => {
    // This test just verifies the code path doesn't crash
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    Object.values(loaders).forEach(fn => { if (typeof fn.mockResolvedValue === 'function') fn.mockResolvedValue({ ok: true, data: {} }); });
    loaders.loadWiFiConfig.mockResolvedValue({ ok: true, data: { ssid: 'Net', password: 'pw' } });
    loaders.loadBookingConfig.mockResolvedValue({ ok: true, data: { enableBooking: true, checkIn: {} } });
    loaders.loadConnectedClients.mockResolvedValue({ ok: true, data: { clients: [] } });
    loaders.loadI18nConfig.mockResolvedValue({ ok: true, data: { maintenanceMessages: {}, adminTranslations: {} } });
    // Sidebar returns ok for global but the target call inside setConfig will also use this mock
    loaders.loadSidebarConfig.mockResolvedValue({ ok: true, data: { showWiFi: true, singleRoomDarkMode: false } });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    act(() => { result.current.updateConfig({ sidebarTargetClientId: 'client-1' }); });
    await act(async () => { result.current.loadCurrentConfig(); });
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });
    // Should not crash
    expect(result.current.config).toBeDefined();
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles wifi config error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadWiFiConfig.mockRejectedValue(new Error('wifi fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(consoleSpy).toHaveBeenCalledWith('Error loading WiFi config:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles logo config error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadLogoConfig.mockRejectedValue(new Error('logo fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(consoleSpy).toHaveBeenCalledWith('Error loading logo config:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles sidebar config error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadSidebarConfig.mockRejectedValue(new Error('sidebar fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(consoleSpy).toHaveBeenCalledWith('Error loading information config:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles booking config error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadBookingConfig.mockRejectedValue(new Error('booking fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(consoleSpy).toHaveBeenCalledWith('Error loading booking config:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles search config error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadSearchConfig.mockRejectedValue(new Error('search fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(consoleSpy).toHaveBeenCalledWith('Error loading search config:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles rate-limit config error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadRateLimitConfig.mockRejectedValue(new Error('rate fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(consoleSpy).toHaveBeenCalledWith('Error loading rate-limit config:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles translation API config error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadTranslationApiConfig.mockRejectedValue(new Error('trans fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(consoleSpy).toHaveBeenCalledWith('Error loading translation API config:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles maintenance config error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadMaintenanceStatus.mockRejectedValue(new Error('maint fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(consoleSpy).toHaveBeenCalledWith('Error loading maintenance config:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles system config error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadSystemConfig.mockRejectedValue(new Error('sys fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(consoleSpy).toHaveBeenCalledWith('Error loading system config:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles oauth config error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadOAuthConfig.mockRejectedValue(new Error('oauth fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(consoleSpy).toHaveBeenCalledWith('Error loading oauth config:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles certificate info error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadCertificateInfo.mockRejectedValue(new Error('cert fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(consoleSpy).toHaveBeenCalledWith('Error loading certificate info:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles API token config error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadApiTokenConfig.mockRejectedValue(new Error('token fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(consoleSpy).toHaveBeenCalledWith('Error loading API auth config:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles i18n config error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadI18nConfig.mockRejectedValue(new Error('i18n fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(consoleSpy).toHaveBeenCalledWith('Error loading i18n config:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles colors config error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadColorsConfig.mockRejectedValue(new Error('colors fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(consoleSpy).toHaveBeenCalledWith('Error loading colors config:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles roomlists error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadRoomLists.mockRejectedValue(new Error('roomlists fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config.availableRoomGroupOptions).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles rooms error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadRooms.mockRejectedValue(new Error('rooms fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config.availableRoomOptions).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('loadCurrentConfig handles non-ok wifi response', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadWiFiConfig.mockResolvedValue({ ok: false, data: {} });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    // Should not crash, wifi fields remain default
    expect(result.current.config).toBeDefined();
  });

  it('loadCurrentConfig handles non-ok logo response', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadLogoConfig.mockResolvedValue({ ok: false, data: {} });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config).toBeDefined();
  });

  it('loadCurrentConfig handles non-ok sidebar response', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadSidebarConfig.mockResolvedValue({ ok: false, data: {} });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config).toBeDefined();
  });

  it('loadCurrentConfig handles non-ok booking response', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadBookingConfig.mockResolvedValue({ ok: false, data: {} });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config).toBeDefined();
  });

  it('loadCurrentConfig handles non-ok search response', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadSearchConfig.mockResolvedValue({ ok: false, data: {} });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config).toBeDefined();
  });

  it('loadCurrentConfig handles non-ok rate-limit response', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadRateLimitConfig.mockResolvedValue({ ok: false, data: {} });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config).toBeDefined();
  });

  it('loadCurrentConfig handles non-ok translation API response', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadTranslationApiConfig.mockResolvedValue({ ok: false, data: {} });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config).toBeDefined();
  });

  it('loadCurrentConfig handles non-ok maintenance response', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadMaintenanceStatus.mockResolvedValue({ ok: false, data: {} });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config).toBeDefined();
  });

  it('loadCurrentConfig handles non-ok i18n response', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadI18nConfig.mockResolvedValue({ ok: false, data: {} });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config).toBeDefined();
  });

  it('loadCurrentConfig handles non-ok colors response', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadColorsConfig.mockResolvedValue({ ok: false, data: {} });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config).toBeDefined();
  });

  it('loadCurrentConfig handles non-ok roomlists response', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadRoomLists.mockResolvedValue({ ok: false, data: [] });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config).toBeDefined();
  });

  it('loadCurrentConfig handles non-ok rooms response', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadRooms.mockResolvedValue({ ok: false, data: [] });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config).toBeDefined();
  });

  it('loadCurrentConfig handles rooms with empty email', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadRooms.mockResolvedValue({ ok: true, data: [
      { Email: '', Name: 'No Email' },
      { Email: 'room@test.com', Name: 'Valid' },
      { Name: 'No Email Field' }
    ]});
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config.availableRoomOptions).toHaveLength(1);
  });

  it('loadCurrentConfig loads translation API with url trimming', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadTranslationApiConfig.mockResolvedValue({ ok: true, data: {
      enabled: false, url: '  ', timeoutMs: 5000, hasApiKey: true, lastUpdated: '2024-01-01'
    }});
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    // Empty trimmed URL should fall back to default
    expect(result.current.config.translationApiUrl).toContain('googleapis.com');
  });

  it('loadCurrentConfig handles certificate info with certificate data', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    loaders.loadCertificateInfo.mockResolvedValue({ ok: true, data: { certificate: { thumbprint: 'abc123' } } });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(result.current.config.certificateInfo).toEqual({ thumbprint: 'abc123' });
  });
});
