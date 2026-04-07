import { renderHook, act } from '@testing-library/react';
import { useAdminMqtt } from './useAdminMqtt.js';

vi.mock('../services/mqtt-commands.js', () => ({
  sendMqttPowerCommand: vi.fn(),
  sendMqttBrightnessCommand: vi.fn(),
  sendMqttKioskCommand: vi.fn(),
  sendMqttThemeCommand: vi.fn(),
  sendMqttVolumeCommand: vi.fn(),
  sendMqttPageZoomCommand: vi.fn(),
  sendMqttRefreshCommand: vi.fn(),
  sendMqttRebootCommand: vi.fn(),
  sendMqttShutdownCommand: vi.fn(),
  sendMqttRefreshAll: vi.fn(),
  sendMqttRebootAll: vi.fn(),
  sendMqttPageUrlCommand: vi.fn(),
  fetchMqttDisplays: vi.fn(),
  submitMqttConfig: vi.fn()
}));

import {
  sendMqttPowerCommand, sendMqttKioskCommand,
  sendMqttThemeCommand, sendMqttPageUrlCommand,
  fetchMqttDisplays
} from '../services/mqtt-commands.js';

describe('useAdminMqtt - coverage gaps', () => {
  let getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, handleLoadConnectedDisplays;

  const translations = {
    errorUnauthorized: 'Unauthorized', errorUnknown: 'Unknown', errorPrefix: 'Error:',
    mqttConfigUpdateSuccess: 'Updated', mqttConfigUpdateError: 'Error',
    mqttDisplaysPowerSuccess: 'Power sent', mqttDisplaysPowerError: 'Power failed'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    getRequestHeaders = vi.fn(() => ({}));
    handleUnauthorizedAccess = vi.fn();
    getTranslations = vi.fn(() => translations);
    configRef = { current: { activeTab: 'mqtt', touchkioModalDisplay: null, connectedDisplays: [] } };
    updateConfig = vi.fn((patch) => {
      if (typeof patch === 'function') Object.assign(configRef.current, patch(configRef.current));
      else Object.assign(configRef.current, patch);
    });
    handleLoadConnectedDisplays = vi.fn().mockResolvedValue(undefined);
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  const renderMqttHook = () => renderHook(() => useAdminMqtt(getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, handleLoadConnectedDisplays));

  // --- handleMqttPowerCommandModal: timer callback finds updated display ---
  it('handleMqttPowerCommandModal timer finds updated display by deviceId', async () => {
    sendMqttPowerCommand.mockResolvedValue({ ok: true, status: 200 });
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    configRef.current.touchkioModalDisplay = { id: 'd1', mqtt: { power: 'OFF', deviceId: 'dev1', hostname: 'host1' } };
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPowerCommandModal('dev1', true); });
    // Set up connectedDisplays for the timer callback to find
    configRef.current.connectedDisplays = [{ id: 'd1', mqtt: { deviceId: 'dev1', hostname: 'host1', power: 'ON' } }];
    await act(async () => { vi.advanceTimersByTime(2000); });
    // The timer should have called handleLoadConnectedDisplays and found the updated display
    expect(handleLoadConnectedDisplays).toHaveBeenCalled();
  });

  it('handleMqttPowerCommandModal timer finds display by hostname', async () => {
    sendMqttPowerCommand.mockResolvedValue({ ok: true, status: 200 });
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    configRef.current.touchkioModalDisplay = { id: 'd1', mqtt: { power: 'OFF', hostname: 'host1' } };
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPowerCommandModal('host1', false); });
    configRef.current.connectedDisplays = [{ id: 'd1', mqtt: { hostname: 'host1', power: 'OFF' } }];
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(handleLoadConnectedDisplays).toHaveBeenCalled();
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalDisplay: expect.objectContaining({ mqtt: expect.objectContaining({ hostname: 'host1' }) }) }));
  });

  // --- handleMqttKioskCommandModal: timer callback finds updated display ---
  it('handleMqttKioskCommandModal timer finds updated display', async () => {
    sendMqttKioskCommand.mockResolvedValue({ ok: true, status: 200 });
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    configRef.current.touchkioModalDisplay = { id: 'd1', mqtt: { kioskStatus: 'unlocked', deviceId: 'dev1' } };
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttKioskCommandModal('dev1', 'locked'); });
    configRef.current.connectedDisplays = [{ id: 'd1', mqtt: { deviceId: 'dev1', kioskStatus: 'locked' } }];
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(handleLoadConnectedDisplays).toHaveBeenCalled();
  });

  // --- handleMqttThemeCommandModal: timer callback finds updated display ---
  it('handleMqttThemeCommandModal timer finds updated display', async () => {
    sendMqttThemeCommand.mockResolvedValue({ ok: true, status: 200 });
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    configRef.current.touchkioModalDisplay = { id: 'd1', mqtt: { theme: 'light', deviceId: 'dev1' } };
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttThemeCommandModal('dev1', 'dark'); });
    configRef.current.connectedDisplays = [{ id: 'd1', mqtt: { deviceId: 'dev1', theme: 'dark' } }];
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(handleLoadConnectedDisplays).toHaveBeenCalled();
  });

  // --- handleMqttPageUrlCommandModal: timer callback finds updated display ---
  it('handleMqttPageUrlCommandModal timer finds updated display', async () => {
    sendMqttPageUrlCommand.mockResolvedValue({ ok: true, status: 200 });
    configRef.current.touchkioModalDisplay = { id: 'd1', mqtt: { deviceId: 'dev1', pageUrl: '/old' } };
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPageUrlCommandModal('dev1', '/new'); });
    configRef.current.connectedDisplays = [{ id: 'd1', mqtt: { deviceId: 'dev1', pageUrl: '/new' } }];
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(handleLoadConnectedDisplays).toHaveBeenCalled();
  });

  // --- handleLoadMqttDisplays: auto-refresh when activeTab is NOT mqtt ---
  it('auto-refresh interval skips reload when activeTab is not mqtt', async () => {
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleLoadMqttDisplays(true); });
    configRef.current.activeTab = 'wifi'; // switch away from mqtt tab
    fetchMqttDisplays.mockClear();
    await act(async () => { vi.advanceTimersByTime(10000); });
    // fetchMqttDisplays should NOT have been called since activeTab != 'mqtt'
    expect(fetchMqttDisplays).not.toHaveBeenCalled();
    clearInterval(result.current.mqttDisplaysIntervalRef.current);
  });

  // --- handleLoadMqttDisplays: auto-refresh does not start twice ---
  it('auto-refresh does not create duplicate intervals', async () => {
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleLoadMqttDisplays(true); });
    const firstInterval = result.current.mqttDisplaysIntervalRef.current;
    await act(async () => { await result.current.handleLoadMqttDisplays(true); });
    expect(result.current.mqttDisplaysIntervalRef.current).toBe(firstInterval);
    clearInterval(result.current.mqttDisplaysIntervalRef.current);
  });

  // --- handleMqttPowerCommandModal: display without mqtt property ---
  it('handleMqttPowerCommandModal with display missing mqtt property', async () => {
    sendMqttPowerCommand.mockResolvedValue({ ok: true, status: 200 });
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    configRef.current.touchkioModalDisplay = { id: 'd1' }; // no mqtt property
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPowerCommandModal('host1', true); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Power command sent: ON' }));
  });

  // --- handleMqttKioskCommandModal: display without mqtt property ---
  it('handleMqttKioskCommandModal with display missing mqtt property', async () => {
    sendMqttKioskCommand.mockResolvedValue({ ok: true, status: 200 });
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    configRef.current.touchkioModalDisplay = { id: 'd1' }; // no mqtt
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttKioskCommandModal('host1', 'locked'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Kiosk mode set to locked' }));
  });

  // --- handleMqttThemeCommandModal: display without mqtt property ---
  it('handleMqttThemeCommandModal with display missing mqtt property', async () => {
    sendMqttThemeCommand.mockResolvedValue({ ok: true, status: 200 });
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    configRef.current.touchkioModalDisplay = { id: 'd1' }; // no mqtt
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttThemeCommandModal('host1', 'dark'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Theme set to dark' }));
  });

  // --- handleMqttPageUrlCommandModal: display without mqtt property ---
  it('handleMqttPageUrlCommandModal with display missing mqtt property', async () => {
    sendMqttPageUrlCommand.mockResolvedValue({ ok: true, status: 200 });
    configRef.current.touchkioModalDisplay = { id: 'd1' }; // no mqtt
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPageUrlCommandModal('host1', '/url'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Page URL updated successfully' }));
  });
});
