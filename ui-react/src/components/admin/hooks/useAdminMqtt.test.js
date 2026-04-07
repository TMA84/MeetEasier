import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
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
  sendMqttPowerCommand, sendMqttBrightnessCommand, sendMqttKioskCommand,
  sendMqttThemeCommand, sendMqttVolumeCommand, sendMqttPageZoomCommand,
  sendMqttRefreshCommand, sendMqttRebootCommand, sendMqttShutdownCommand,
  sendMqttRefreshAll, sendMqttRebootAll, sendMqttPageUrlCommand,
  fetchMqttDisplays, submitMqttConfig
} from '../services/mqtt-commands.js';

describe('useAdminMqtt', () => {
  let getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, handleLoadConnectedDisplays;

  const translations = {
    errorUnauthorized: 'Unauthorized',
    errorUnknown: 'Unknown error',
    errorPrefix: 'Error:',
    mqttConfigUpdateSuccess: 'MQTT config updated',
    mqttConfigUpdateError: 'MQTT config error',
    mqttDisplaysPowerSuccess: 'Power sent',
    mqttDisplaysPowerError: 'Power failed'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    getRequestHeaders = vi.fn((includeContentType = true) => {
      const h = {};
      if (includeContentType) h['Content-Type'] = 'application/json';
      return h;
    });
    handleUnauthorizedAccess = vi.fn();
    getTranslations = vi.fn(() => translations);
    configRef = { current: { activeTab: 'mqtt', mqttEnabled: true, mqttBrokerUrl: 'mqtt://localhost', mqttAuthentication: false, mqttUsername: '', mqttPassword: '', mqttDiscovery: '', touchkioModalDisplay: null, connectedDisplays: [] } };
    updateConfig = vi.fn((patch) => {
      if (typeof patch === 'function') Object.assign(configRef.current, patch(configRef.current));
      else Object.assign(configRef.current, patch);
    });
    handleLoadConnectedDisplays = vi.fn().mockResolvedValue(undefined);
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const renderMqttHook = () =>
    renderHook(() => useAdminMqtt(getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, handleLoadConnectedDisplays));

  // --- handleLoadMqttDisplays ---
  it('handleLoadMqttDisplays loads displays successfully', async () => {
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [{ id: 'd1' }] });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleLoadMqttDisplays(); });
    expect(updateConfig).toHaveBeenCalledWith({ mqttDisplaysLoading: true });
    expect(updateConfig).toHaveBeenCalledWith({ mqttDisplays: [{ id: 'd1' }], mqttDisplaysLoading: false });
  });

  it('handleLoadMqttDisplays handles 401', async () => {
    fetchMqttDisplays.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleLoadMqttDisplays(); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleLoadMqttDisplays handles error', async () => {
    fetchMqttDisplays.mockRejectedValue(new Error('Network'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleLoadMqttDisplays(); });
    expect(updateConfig).toHaveBeenCalledWith({ mqttDisplays: [], mqttDisplaysLoading: false });
  });

  it('handleLoadMqttDisplays starts auto-refresh when requested', async () => {
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleLoadMqttDisplays(true); });
    expect(result.current.mqttDisplaysIntervalRef.current).not.toBeNull();
    // Cleanup
    clearInterval(result.current.mqttDisplaysIntervalRef.current);
  });

  // --- handleMqttConfigSubmit ---
  it('handleMqttConfigSubmit success', async () => {
    submitMqttConfig.mockResolvedValue({ ok: true, status: 200, data: {} });
    const { result } = renderMqttHook();
    const fakeEvent = { preventDefault: vi.fn() };
    await act(async () => { await result.current.handleMqttConfigSubmit(fakeEvent); });
    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ mqttConfigMessageType: 'success' }));
  });

  it('handleMqttConfigSubmit handles 401', async () => {
    submitMqttConfig.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderMqttHook();
    const fakeEvent = { preventDefault: vi.fn() };
    await act(async () => { await result.current.handleMqttConfigSubmit(fakeEvent); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleMqttConfigSubmit handles error', async () => {
    submitMqttConfig.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    const fakeEvent = { preventDefault: vi.fn() };
    await act(async () => { await result.current.handleMqttConfigSubmit(fakeEvent); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ mqttConfigMessageType: 'error' }));
  });

  // --- handleMqttPowerCommand ---
  it('handleMqttPowerCommand success', async () => {
    sendMqttPowerCommand.mockResolvedValue({ ok: true, status: 200 });
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPowerCommand('host1', true); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ mqttConfigMessageType: 'success' }));
  });

  it('handleMqttPowerCommand handles 401', async () => {
    sendMqttPowerCommand.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPowerCommand('host1', true); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleMqttPowerCommand handles error', async () => {
    sendMqttPowerCommand.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPowerCommand('host1', true); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ mqttConfigMessageType: 'error' }));
  });

  // --- handleOpenTouchkioModal / handleCloseTouchkioModal ---
  it('handleOpenTouchkioModal sets modal state', () => {
    const { result } = renderMqttHook();
    const display = { id: 'd1', mqtt: { hostname: 'host1' } };
    act(() => { result.current.handleOpenTouchkioModal(display); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ showTouchkioModal: true, touchkioModalDisplay: display }));
  });

  it('handleCloseTouchkioModal clears modal state', () => {
    const { result } = renderMqttHook();
    act(() => { result.current.handleCloseTouchkioModal(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ showTouchkioModal: false, touchkioModalDisplay: null }));
  });

  // --- handleMqttPowerCommandModal (optimistic update) ---
  it('handleMqttPowerCommandModal with modal display does optimistic update', async () => {
    sendMqttPowerCommand.mockResolvedValue({ ok: true, status: 200 });
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    configRef.current.touchkioModalDisplay = { id: 'd1', mqtt: { power: 'OFF', hostname: 'host1' } };
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPowerCommandModal('host1', true); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Power command sent: ON' }));
  });

  it('handleMqttPowerCommandModal without modal display', async () => {
    sendMqttPowerCommand.mockResolvedValue({ ok: true, status: 200 });
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    configRef.current.touchkioModalDisplay = null;
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPowerCommandModal('host1', false); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Power command sent: OFF' }));
  });

  // --- handleMqttBrightnessCommand ---
  it('handleMqttBrightnessCommand success', async () => {
    sendMqttBrightnessCommand.mockResolvedValue({ ok: true, status: 200 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttBrightnessCommand('host1', 80); });
    expect(sendMqttBrightnessCommand).toHaveBeenCalled();
  });

  it('handleMqttBrightnessCommand handles 401', async () => {
    sendMqttBrightnessCommand.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttBrightnessCommand('host1', 80); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  // --- handleMqttKioskCommand ---
  it('handleMqttKioskCommand success', async () => {
    sendMqttKioskCommand.mockResolvedValue({ ok: true, status: 200 });
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttKioskCommand('host1', 'locked'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ mqttConfigMessageType: 'success' }));
  });

  // --- handleMqttThemeCommand ---
  it('handleMqttThemeCommand success', async () => {
    sendMqttThemeCommand.mockResolvedValue({ ok: true, status: 200 });
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttThemeCommand('host1', 'dark'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ mqttConfigMessageType: 'success' }));
  });

  // --- handleMqttVolumeCommand ---
  it('handleMqttVolumeCommand success', async () => {
    sendMqttVolumeCommand.mockResolvedValue({ ok: true, status: 200 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttVolumeCommand('host1', 50); });
    expect(sendMqttVolumeCommand).toHaveBeenCalled();
  });

  // --- handleMqttPageZoomCommand ---
  it('handleMqttPageZoomCommand success', async () => {
    sendMqttPageZoomCommand.mockResolvedValue({ ok: true, status: 200 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPageZoomCommand('host1', 125); });
    expect(sendMqttPageZoomCommand).toHaveBeenCalled();
  });

  // --- handleMqttRefreshCommand ---
  it('handleMqttRefreshCommand success', async () => {
    sendMqttRefreshCommand.mockResolvedValue({ ok: true, status: 200 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRefreshCommand('host1'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ mqttConfigMessage: 'Refresh command sent' }));
  });

  it('handleMqttRefreshCommand handles error', async () => {
    sendMqttRefreshCommand.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRefreshCommand('host1'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ connectedDisplaysMessageType: 'error' }));
  });

  // --- handleMqttRebootCommand ---
  it('handleMqttRebootCommand success', async () => {
    sendMqttRebootCommand.mockResolvedValue({ ok: true, status: 200 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRebootCommand('host1'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ mqttConfigMessageType: 'success' }));
  });

  // --- handleMqttShutdownCommand ---
  it('handleMqttShutdownCommand success', async () => {
    sendMqttShutdownCommand.mockResolvedValue({ ok: true, status: 200 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttShutdownCommand('host1'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ mqttConfigMessageType: 'warning' }));
  });

  // --- handleMqttRefreshAll ---
  it('handleMqttRefreshAll success', async () => {
    sendMqttRefreshAll.mockResolvedValue({ ok: true, status: 200, data: { message: 'All refreshed' } });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRefreshAll(); });
    expect(window.confirm).toHaveBeenCalled();
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ mqttConfigMessageType: 'success' }));
  });

  it('handleMqttRefreshAll cancelled by user', async () => {
    window.confirm = vi.fn(() => false);
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRefreshAll(); });
    expect(sendMqttRefreshAll).not.toHaveBeenCalled();
  });

  it('handleMqttRefreshAll handles error', async () => {
    sendMqttRefreshAll.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRefreshAll(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ connectedDisplaysMessageType: 'error' }));
  });

  // --- handleMqttRebootAll ---
  it('handleMqttRebootAll success', async () => {
    sendMqttRebootAll.mockResolvedValue({ ok: true, status: 200, data: { message: 'All rebooted' } });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRebootAll(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ mqttConfigMessageType: 'warning' }));
  });

  it('handleMqttRebootAll cancelled by user', async () => {
    window.confirm = vi.fn(() => false);
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRebootAll(); });
    expect(sendMqttRebootAll).not.toHaveBeenCalled();
  });

  it('handleMqttRebootAll handles error', async () => {
    sendMqttRebootAll.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRebootAll(); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ mqttConfigMessageType: 'error' }));
  });

  // --- Modal command wrappers ---
  it('handleMqttBrightnessCommandModal sets message', async () => {
    sendMqttBrightnessCommand.mockResolvedValue({ ok: true, status: 200 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttBrightnessCommandModal('host1', 75); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Brightness set to 75' }));
  });

  it('handleMqttKioskCommandModal with modal display does optimistic update', async () => {
    sendMqttKioskCommand.mockResolvedValue({ ok: true, status: 200 });
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    configRef.current.touchkioModalDisplay = { id: 'd1', mqtt: { kioskStatus: 'unlocked', hostname: 'host1' } };
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttKioskCommandModal('host1', 'locked'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Kiosk mode set to locked' }));
  });

  it('handleMqttThemeCommandModal with modal display does optimistic update', async () => {
    sendMqttThemeCommand.mockResolvedValue({ ok: true, status: 200 });
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    configRef.current.touchkioModalDisplay = { id: 'd1', mqtt: { theme: 'light', hostname: 'host1' } };
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttThemeCommandModal('host1', 'dark'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Theme set to dark' }));
  });

  it('handleMqttVolumeCommandModal sets message', async () => {
    sendMqttVolumeCommand.mockResolvedValue({ ok: true, status: 200 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttVolumeCommandModal('host1', 60); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Volume set to 60%' }));
  });

  it('handleMqttPageZoomCommandModal sets message', async () => {
    sendMqttPageZoomCommand.mockResolvedValue({ ok: true, status: 200 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPageZoomCommandModal('host1', 150); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Page zoom set to 150%' }));
  });

  it('handleMqttRefreshCommandModal sets message', async () => {
    sendMqttRefreshCommand.mockResolvedValue({ ok: true, status: 200 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRefreshCommandModal('host1'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Refresh command sent' }));
  });

  it('handleMqttRebootCommandModal sets message', async () => {
    sendMqttRebootCommand.mockResolvedValue({ ok: true, status: 200 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRebootCommandModal('host1'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Reboot command sent' }));
  });

  it('handleMqttShutdownCommandModal sets message', async () => {
    sendMqttShutdownCommand.mockResolvedValue({ ok: true, status: 200 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttShutdownCommandModal('host1'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Shutdown command sent' }));
  });

  // --- handleMqttPageUrlCommandModal ---
  it('handleMqttPageUrlCommandModal success with modal display', async () => {
    sendMqttPageUrlCommand.mockResolvedValue({ ok: true, status: 200 });
    configRef.current.touchkioModalDisplay = { id: 'd1', mqtt: { hostname: 'host1' } };
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPageUrlCommandModal('host1', 'https://example.com'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Page URL updated successfully' }));
  });

  it('handleMqttPageUrlCommandModal success without modal display', async () => {
    sendMqttPageUrlCommand.mockResolvedValue({ ok: true, status: 200 });
    configRef.current.touchkioModalDisplay = null;
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPageUrlCommandModal('host1', 'https://example.com'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Page URL updated successfully' }));
  });

  it('handleMqttPageUrlCommandModal handles failure', async () => {
    sendMqttPageUrlCommand.mockResolvedValue({ ok: false, status: 500 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPageUrlCommandModal('host1', 'https://example.com'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessageType: 'error' }));
  });

  it('handleMqttPageUrlCommandModal handles exception', async () => {
    sendMqttPageUrlCommand.mockRejectedValue(new Error('Network'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPageUrlCommandModal('host1', 'https://example.com'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessageType: 'error' }));
  });
});
