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
  sendMqttRefreshAll, sendMqttRebootAll,
  fetchMqttDisplays, submitMqttConfig
} from '../services/mqtt-commands.js';

describe('useAdminMqtt - boost coverage', () => {
  let getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, handleLoadConnectedDisplays;

  const translations = {
    errorUnauthorized: 'Unauthorized', errorUnknown: 'Unknown error', errorPrefix: 'Error:',
    mqttConfigUpdateSuccess: 'MQTT updated', mqttConfigUpdateError: 'MQTT error',
    mqttDisplaysPowerSuccess: 'Power sent', mqttDisplaysPowerError: 'Power failed'
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

  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  const renderMqttHook = () => renderHook(() => useAdminMqtt(getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, handleLoadConnectedDisplays));

  // --- handleLoadMqttDisplays non-ok response ---
  it('handleLoadMqttDisplays non-ok throws', async () => {
    fetchMqttDisplays.mockResolvedValue({ ok: false, status: 500 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleLoadMqttDisplays(); });
    expect(updateConfig).toHaveBeenCalledWith({ mqttDisplays: [], mqttDisplaysLoading: false });
  });

  // --- handleMqttConfigSubmit non-ok response ---
  it('handleMqttConfigSubmit non-ok response', async () => {
    submitMqttConfig.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttConfigSubmit({ preventDefault: vi.fn() }); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ mqttConfigMessageType: 'error' }));
  });

  // --- handleMqttPowerCommand non-ok response ---
  it('handleMqttPowerCommand non-ok response', async () => {
    sendMqttPowerCommand.mockResolvedValue({ ok: false, status: 500 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPowerCommand('host1', true); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ mqttConfigMessageType: 'error' }));
  });

  // --- handleMqttBrightnessCommand error ---
  it('handleMqttBrightnessCommand error', async () => {
    sendMqttBrightnessCommand.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttBrightnessCommand('host1', 80); });
    // Should not throw, just logs error
    expect(sendMqttBrightnessCommand).toHaveBeenCalled();
  });

  // --- handleMqttKioskCommand 401 ---
  it('handleMqttKioskCommand 401', async () => {
    sendMqttKioskCommand.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttKioskCommand('host1', 'locked'); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleMqttKioskCommand error', async () => {
    sendMqttKioskCommand.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttKioskCommand('host1', 'locked'); });
    expect(sendMqttKioskCommand).toHaveBeenCalled();
  });

  // --- handleMqttThemeCommand 401 ---
  it('handleMqttThemeCommand 401', async () => {
    sendMqttThemeCommand.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttThemeCommand('host1', 'dark'); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleMqttThemeCommand error', async () => {
    sendMqttThemeCommand.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttThemeCommand('host1', 'dark'); });
    expect(sendMqttThemeCommand).toHaveBeenCalled();
  });

  // --- handleMqttVolumeCommand 401 ---
  it('handleMqttVolumeCommand 401', async () => {
    sendMqttVolumeCommand.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttVolumeCommand('host1', 50); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleMqttVolumeCommand error', async () => {
    sendMqttVolumeCommand.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttVolumeCommand('host1', 50); });
    expect(sendMqttVolumeCommand).toHaveBeenCalled();
  });

  // --- handleMqttPageZoomCommand 401 ---
  it('handleMqttPageZoomCommand 401', async () => {
    sendMqttPageZoomCommand.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPageZoomCommand('host1', 125); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleMqttPageZoomCommand error', async () => {
    sendMqttPageZoomCommand.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPageZoomCommand('host1', 125); });
    expect(sendMqttPageZoomCommand).toHaveBeenCalled();
  });

  // --- handleMqttRefreshCommand 401 ---
  it('handleMqttRefreshCommand 401', async () => {
    sendMqttRefreshCommand.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRefreshCommand('host1'); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  // --- handleMqttRebootCommand 401 ---
  it('handleMqttRebootCommand 401', async () => {
    sendMqttRebootCommand.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRebootCommand('host1'); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleMqttRebootCommand error', async () => {
    sendMqttRebootCommand.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRebootCommand('host1'); });
    expect(sendMqttRebootCommand).toHaveBeenCalled();
  });

  // --- handleMqttShutdownCommand 401 ---
  it('handleMqttShutdownCommand 401', async () => {
    sendMqttShutdownCommand.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttShutdownCommand('host1'); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('handleMqttShutdownCommand error', async () => {
    sendMqttShutdownCommand.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttShutdownCommand('host1'); });
    expect(sendMqttShutdownCommand).toHaveBeenCalled();
  });

  // --- handleMqttRefreshAll 401 ---
  it('handleMqttRefreshAll 401', async () => {
    sendMqttRefreshAll.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRefreshAll(); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  // --- handleMqttRebootAll 401 ---
  it('handleMqttRebootAll 401', async () => {
    sendMqttRebootAll.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRebootAll(); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  // --- Modal commands without touchkioModalDisplay ---
  it('handleMqttKioskCommandModal without modal display', async () => {
    sendMqttKioskCommand.mockResolvedValue({ ok: true, status: 200 });
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    configRef.current.touchkioModalDisplay = null;
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttKioskCommandModal('host1', 'locked'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Kiosk mode set to locked' }));
  });

  it('handleMqttThemeCommandModal without modal display', async () => {
    sendMqttThemeCommand.mockResolvedValue({ ok: true, status: 200 });
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    configRef.current.touchkioModalDisplay = null;
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttThemeCommandModal('host1', 'dark'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Theme set to dark' }));
  });

  // --- Modal command error paths ---
  it('handleMqttBrightnessCommandModal handles error', async () => {
    sendMqttBrightnessCommand.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttBrightnessCommandModal('host1', 75); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Brightness set to 75' }));
  });

  it('handleMqttVolumeCommandModal handles error', async () => {
    sendMqttVolumeCommand.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttVolumeCommandModal('host1', 60); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Volume set to 60%' }));
  });

  it('handleMqttPageZoomCommandModal handles error', async () => {
    sendMqttPageZoomCommand.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttPageZoomCommandModal('host1', 150); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Page zoom set to 150%' }));
  });

  it('handleMqttRefreshCommandModal handles error', async () => {
    sendMqttRefreshCommand.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRefreshCommandModal('host1'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Refresh command sent' }));
  });

  it('handleMqttRebootCommandModal handles error', async () => {
    sendMqttRebootCommand.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttRebootCommandModal('host1'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Reboot command sent' }));
  });

  it('handleMqttShutdownCommandModal handles error', async () => {
    sendMqttShutdownCommand.mockRejectedValue(new Error('Fail'));
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleMqttShutdownCommandModal('host1'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ touchkioModalMessage: 'Shutdown command sent' }));
  });

  // --- Auto-refresh timer fires and reloads ---
  it('auto-refresh interval calls handleLoadMqttDisplays', async () => {
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [{ id: 'd1' }] });
    const { result } = renderMqttHook();
    await act(async () => { await result.current.handleLoadMqttDisplays(true); });
    expect(result.current.mqttDisplaysIntervalRef.current).not.toBeNull();
    // Advance timer to trigger interval
    fetchMqttDisplays.mockClear();
    fetchMqttDisplays.mockResolvedValue({ ok: true, status: 200, displays: [] });
    await act(async () => { vi.advanceTimersByTime(10000); });
    expect(fetchMqttDisplays).toHaveBeenCalled();
    clearInterval(result.current.mqttDisplaysIntervalRef.current);
  });
});
