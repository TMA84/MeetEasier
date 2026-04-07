import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAdminConfig, INITIAL_CONFIG } from './useAdminConfig.js';

vi.mock('../../../config/admin-translations.js', () => ({
  default: { en: { title: 'Admin Panel' }, de: { title: 'Admin Panel' } },
  getAdminTranslations: () => ({ title: 'Admin Panel' })
}));

vi.mock('../services/admin-config-loader.js', () => ({
  loadWiFiConfig: vi.fn().mockResolvedValue({ ok: true, data: { ssid: 'TestNet', password: 'pass123', lastUpdated: '2024-01-01' } }),
  loadLogoConfig: vi.fn().mockResolvedValue({ ok: true, data: { logoDarkUrl: '/dark.png', logoLightUrl: '/light.png' } }),
  loadSidebarConfig: vi.fn().mockResolvedValue({ ok: true, data: { showWiFi: true, showUpcomingMeetings: false } }),
  loadBookingConfig: vi.fn().mockResolvedValue({ ok: true, data: { enableBooking: true, checkIn: {} } }),
  loadSearchConfig: vi.fn().mockResolvedValue({ ok: true, data: { useGraphAPI: true } }),
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

describe('useAdminConfig', () => {
  const getRequestHeaders = () => ({ 'Content-Type': 'application/json' });
  const handleUnauthorizedAccess = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('initializes with default config state', () => {
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    expect(result.current.config.ssid).toBe('');
    expect(result.current.config.isAuthenticated).toBeUndefined();
    expect(result.current.config.wifiLocked).toBe(false);
    expect(result.current.config.syncStatusLoading).toBe(true);
  });

  it('setField updates a single config field', () => {
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    act(() => { result.current.setField('ssid', 'NewNetwork'); });
    expect(result.current.config.ssid).toBe('NewNetwork');
  });

  it('updateConfig batch-updates multiple fields', () => {
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    act(() => { result.current.updateConfig({ ssid: 'Net1', password: 'Pass1' }); });
    expect(result.current.config.ssid).toBe('Net1');
    expect(result.current.config.password).toBe('Pass1');
  });

  it('loadVersion updates appVersion', async () => {
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadVersion(); });
    expect(result.current.config.appVersion).toBe('1.0.0');
  });

  it('loadConfigLocks updates lock state', async () => {
    const { loadConfigLocks } = await import('../services/admin-config-loader.js');
    loadConfigLocks.mockResolvedValue({ ok: true, data: { wifiLocked: true, logoLocked: false } });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadConfigLocks(); });
    expect(result.current.config.wifiLocked).toBe(true);
    expect(result.current.config.logoLocked).toBe(false);
  });

  it('loadSyncStatus updates sync state', async () => {
    const { loadSyncStatus } = await import('../services/admin-config-loader.js');
    loadSyncStatus.mockResolvedValue({ ok: true, data: { lastSyncSuccess: true } });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadSyncStatus(); });
    expect(result.current.config.syncStatus).toEqual({ lastSyncSuccess: true });
    expect(result.current.config.syncStatusLoading).toBe(false);
  });

  it('INITIAL_CONFIG is exported for testing', () => {
    expect(INITIAL_CONFIG).toBeDefined();
    expect(INITIAL_CONFIG.ssid).toBe('');
    expect(INITIAL_CONFIG.syncStatusLoading).toBe(true);
  });

  it('updateConfig with function updater', () => {
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    act(() => { result.current.updateConfig(prev => ({ ...prev, ssid: 'FuncNet' })); });
    expect(result.current.config.ssid).toBe('FuncNet');
  });

  it('loadLogoConfig updates logo URLs', async () => {
    const { loadLogoConfig } = await import('../services/admin-config-loader.js');
    loadLogoConfig.mockResolvedValue({ ok: true, data: { logoDarkUrl: '/new-dark.png', logoLightUrl: '/new-light.png' } });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadLogoConfig(); });
    expect(result.current.config.currentLogoDarkUrl).toBe('/new-dark.png');
    expect(result.current.config.currentLogoLightUrl).toBe('/new-light.png');
  });

  it('loadLogoConfig handles error gracefully', async () => {
    const { loadLogoConfig } = await import('../services/admin-config-loader.js');
    loadLogoConfig.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadLogoConfig(); });
    // Should not throw
    expect(result.current.config).toBeDefined();
  });

  it('loadSyncStatus handles error gracefully', async () => {
    const { loadSyncStatus } = await import('../services/admin-config-loader.js');
    loadSyncStatus.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadSyncStatus(); });
    expect(result.current.config.syncStatus).toBeNull();
    expect(result.current.config.syncStatusLoading).toBe(false);
  });

  it('loadCurrentConfig calls all sub-loaders', async () => {
    const loaders = await import('../services/admin-config-loader.js');
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadCurrentConfig(); });
    expect(loaders.loadWiFiConfig).toHaveBeenCalled();
    expect(loaders.loadSidebarConfig).toHaveBeenCalled();
    expect(loaders.loadBookingConfig).toHaveBeenCalled();
    expect(loaders.loadI18nConfig).toHaveBeenCalled();
    expect(loaders.loadConnectedClients).toHaveBeenCalled();
  });

  it('loadConnectedClients updates clients list', async () => {
    const { loadConnectedClients } = await import('../services/admin-config-loader.js');
    loadConnectedClients.mockResolvedValue({ ok: true, data: { clients: [{ clientId: 'c1' }] } });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadConnectedClients(); });
    expect(result.current.config.connectedClients).toEqual([{ clientId: 'c1' }]);
  });

  it('loadConnectedClients handles error', async () => {
    const { loadConnectedClients } = await import('../services/admin-config-loader.js');
    loadConnectedClients.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadConnectedClients(); });
    expect(result.current.config.connectedClientsLoading).toBe(false);
  });

  it('loadMqttConfig updates mqtt state', async () => {
    const { fetchMqttConfig } = await import('../services/mqtt-commands.js');
    fetchMqttConfig.mockResolvedValue({ enabled: true, brokerUrl: 'mqtt://test:1883' });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadMqttConfig(); });
    expect(result.current.config.mqttEnabled).toBe(true);
    expect(result.current.config.mqttBrokerUrl).toBe('mqtt://test:1883');
  });

  it('loadMqttStatus updates mqtt status', async () => {
    const { fetchMqttStatus } = await import('../services/mqtt-commands.js');
    fetchMqttStatus.mockResolvedValue({ connected: true });
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    await act(async () => { result.current.loadMqttStatus(); });
    expect(result.current.config.mqttStatus).toEqual({ connected: true });
  });

  it('configRef tracks latest config', () => {
    const { result } = renderHook(() => useAdminConfig(getRequestHeaders, handleUnauthorizedAccess));
    act(() => { result.current.setField('ssid', 'RefTest'); });
    expect(result.current.configRef.current.ssid).toBe('RefTest');
  });
});
