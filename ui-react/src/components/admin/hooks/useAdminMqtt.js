/**
 * @file useAdminMqtt.js
 * @description Hook for MQTT display commands and Touchkio modal handlers.
 */
import { useCallback, useRef } from 'react';
import {
  sendMqttPowerCommand, sendMqttBrightnessCommand, sendMqttKioskCommand,
  sendMqttThemeCommand, sendMqttVolumeCommand, sendMqttPageZoomCommand,
  sendMqttRefreshCommand, sendMqttRebootCommand, sendMqttShutdownCommand,
  sendMqttRefreshAll, sendMqttRebootAll, sendMqttPageUrlCommand,
  fetchMqttDisplays, submitMqttConfig
} from '../services/mqtt-commands.js';

/**
 * @param {Function} getRequestHeaders
 * @param {Function} handleUnauthorizedAccess
 * @param {Function} getTranslations
 * @param {Object} configRef
 * @param {Function} updateConfig
 * @param {Function} handleLoadConnectedDisplays
 */
export function useAdminMqtt(getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, handleLoadConnectedDisplays) {
  const mqttDisplaysIntervalRef = useRef(null);

  const handleLoadMqttDisplays = useCallback(async (startAutoRefresh = false) => {
    updateConfig({ mqttDisplaysLoading: true });
    try {
      const r = await fetchMqttDisplays(() => getRequestHeaders(false));
      if (r.status === 401) { handleUnauthorizedAccess(); return; }
      if (r.ok) {
        updateConfig({ mqttDisplays: r.displays, mqttDisplaysLoading: false });
        if (startAutoRefresh && !mqttDisplaysIntervalRef.current) {
          mqttDisplaysIntervalRef.current = setInterval(() => {
            if (configRef.current.activeTab === 'mqtt') handleLoadMqttDisplays(false);
          }, 10000);
        }
      } else throw new Error('Failed to load MQTT displays');
    } catch (err) { console.error('Failed to load MQTT displays:', err); updateConfig({ mqttDisplays: [], mqttDisplaysLoading: false }); }
  }, [getRequestHeaders, handleUnauthorizedAccess, updateConfig, configRef]);

  const handleMqttConfigSubmit = useCallback(async (e) => {
    e.preventDefault();
    const t = getTranslations();
    const s = configRef.current;
    updateConfig({ mqttConfigSaving: true, mqttConfigMessage: null });
    try {
      const r = await submitMqttConfig(() => getRequestHeaders(), { enabled: s.mqttEnabled || false, brokerUrl: s.mqttBrokerUrl || 'mqtt://localhost:1883', authentication: s.mqttAuthentication || false, username: s.mqttUsername || '', password: s.mqttPassword || '', discovery: s.mqttDiscovery || '' });
      if (r.status === 401) { handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); }
      if (r.ok) { updateConfig({ mqttConfigMessage: t.mqttConfigUpdateSuccess || 'MQTT configuration updated successfully.', mqttConfigMessageType: 'success', mqttConfigSaving: false }); }
      else throw new Error(r.data?.error || t.mqttConfigUpdateError);
    } catch (err) { updateConfig({ mqttConfigMessage: `${t.errorPrefix} ${err.message}`, mqttConfigMessageType: 'error', mqttConfigSaving: false }); }
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig]);

  const handleMqttPowerCommand = useCallback(async (hostname, powerOn) => {
    const t = getTranslations();
    try {
      const response = await sendMqttPowerCommand(() => getRequestHeaders(), hostname, powerOn);
      if (response.status === 401) { handleUnauthorizedAccess(); return; }
      if (response.ok) { updateConfig({ mqttConfigMessage: t.mqttDisplaysPowerSuccess || 'Power command sent successfully.', mqttConfigMessageType: 'success' }); setTimeout(() => handleLoadMqttDisplays(), 1000); }
      else throw new Error('Failed to send power command');
    } catch (err) { console.error('Failed to send MQTT power command:', err); updateConfig({ mqttConfigMessage: `${t.errorPrefix} ${t.mqttDisplaysPowerError || 'Failed to send power command.'}`, mqttConfigMessageType: 'error' }); }
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, updateConfig, handleLoadMqttDisplays]);

  const handleMqttBrightnessCommand = useCallback(async (hostname, brightness) => {
    try { const r = await sendMqttBrightnessCommand(() => getRequestHeaders(), hostname, brightness); if (r.status === 401) { handleUnauthorizedAccess(); return; } }
    catch (err) { console.error('Failed to send brightness command:', err); }
  }, [getRequestHeaders, handleUnauthorizedAccess]);

  const handleMqttKioskCommand = useCallback(async (hostname, status) => {
    try { const r = await sendMqttKioskCommand(() => getRequestHeaders(), hostname, status); if (r.status === 401) { handleUnauthorizedAccess(); return; } if (r.ok) { updateConfig({ mqttConfigMessage: `Kiosk mode set to ${status}`, mqttConfigMessageType: 'success' }); setTimeout(() => handleLoadMqttDisplays(), 1000); } }
    catch (err) { console.error('Failed to send kiosk command:', err); }
  }, [getRequestHeaders, handleUnauthorizedAccess, updateConfig, handleLoadMqttDisplays]);

  const handleMqttThemeCommand = useCallback(async (hostname, theme) => {
    try { const r = await sendMqttThemeCommand(() => getRequestHeaders(), hostname, theme); if (r.status === 401) { handleUnauthorizedAccess(); return; } if (r.ok) { updateConfig({ mqttConfigMessage: `Theme set to ${theme}`, mqttConfigMessageType: 'success' }); setTimeout(() => handleLoadMqttDisplays(), 1000); } }
    catch (err) { console.error('Failed to send theme command:', err); }
  }, [getRequestHeaders, handleUnauthorizedAccess, updateConfig, handleLoadMqttDisplays]);

  const handleMqttVolumeCommand = useCallback(async (hostname, volume) => {
    try { const r = await sendMqttVolumeCommand(() => getRequestHeaders(), hostname, volume); if (r.status === 401) { handleUnauthorizedAccess(); return; } }
    catch (err) { console.error('Failed to send volume command:', err); }
  }, [getRequestHeaders, handleUnauthorizedAccess]);

  const handleMqttPageZoomCommand = useCallback(async (hostname, zoom) => {
    try { const r = await sendMqttPageZoomCommand(() => getRequestHeaders(), hostname, zoom); if (r.status === 401) { handleUnauthorizedAccess(); return; } }
    catch (err) { console.error('Failed to send page zoom command:', err); }
  }, [getRequestHeaders, handleUnauthorizedAccess]);

  const handleMqttRefreshCommand = useCallback(async (hostname) => {
    try { const r = await sendMqttRefreshCommand(() => getRequestHeaders(), hostname); if (r.status === 401) { handleUnauthorizedAccess(); return; } if (r.ok) { updateConfig({ connectedDisplaysMessage: `Refresh command sent to ${hostname}`, connectedDisplaysMessageType: 'success', mqttConfigMessage: 'Refresh command sent', mqttConfigMessageType: 'success' }); setTimeout(() => updateConfig({ connectedDisplaysMessage: null, connectedDisplaysMessageType: null }), 3000); } }
    catch (err) { console.error('Failed to send refresh command:', err); updateConfig({ connectedDisplaysMessage: `Failed to send refresh command: ${err.message}`, connectedDisplaysMessageType: 'error' }); }
  }, [getRequestHeaders, handleUnauthorizedAccess, updateConfig]);

  const handleMqttRebootCommand = useCallback(async (hostname) => {
    try { const r = await sendMqttRebootCommand(() => getRequestHeaders(), hostname); if (r.status === 401) { handleUnauthorizedAccess(); return; } if (r.ok) { updateConfig({ connectedDisplaysMessage: `Reboot command sent to ${hostname}`, connectedDisplaysMessageType: 'success', mqttConfigMessage: `Reboot command sent to ${hostname}`, mqttConfigMessageType: 'success' }); setTimeout(() => updateConfig({ connectedDisplaysMessage: null, connectedDisplaysMessageType: null }), 3000); } }
    catch (err) { console.error('Failed to send reboot command:', err); }
  }, [getRequestHeaders, handleUnauthorizedAccess, updateConfig]);

  const handleMqttShutdownCommand = useCallback(async (hostname) => {
    try { const r = await sendMqttShutdownCommand(() => getRequestHeaders(), hostname); if (r.status === 401) { handleUnauthorizedAccess(); return; } if (r.ok) updateConfig({ mqttConfigMessage: `Shutdown command sent to ${hostname}`, mqttConfigMessageType: 'warning' }); }
    catch (err) { console.error('Failed to send shutdown command:', err); }
  }, [getRequestHeaders, handleUnauthorizedAccess, updateConfig]);

  const handleMqttRefreshAll = useCallback(async () => {
    if (!window.confirm('Refresh all Touchkio displays?')) return;
    try { const r = await sendMqttRefreshAll(() => getRequestHeaders()); if (r.status === 401) { handleUnauthorizedAccess(); return; } if (r.ok) { updateConfig({ connectedDisplaysMessage: r.data.message || 'Refresh command sent to all displays', connectedDisplaysMessageType: 'success', mqttConfigMessage: r.data.message || 'Refresh command sent to all displays', mqttConfigMessageType: 'success' }); setTimeout(() => updateConfig({ connectedDisplaysMessage: null, connectedDisplaysMessageType: null }), 3000); } }
    catch (err) { console.error('Failed to send refresh all command:', err); updateConfig({ connectedDisplaysMessage: `Failed to send refresh all command: ${err.message}`, connectedDisplaysMessageType: 'error' }); }
  }, [getRequestHeaders, handleUnauthorizedAccess, updateConfig]);

  const handleMqttRebootAll = useCallback(async () => {
    if (!window.confirm('⚠️ Reboot ALL Touchkio displays? This will restart all devices!')) return;
    try { const r = await sendMqttRebootAll(() => getRequestHeaders()); if (r.status === 401) { handleUnauthorizedAccess(); return; } if (r.ok) { updateConfig({ connectedDisplaysMessage: r.data.message || 'Reboot command sent to all displays', connectedDisplaysMessageType: 'warning', mqttConfigMessage: r.data.message || 'Reboot command sent to all displays', mqttConfigMessageType: 'warning' }); setTimeout(() => updateConfig({ connectedDisplaysMessage: null, connectedDisplaysMessageType: null }), 3000); } }
    catch (err) { console.error('Failed to send reboot-all command:', err); updateConfig({ connectedDisplaysMessage: `Failed to send reboot-all command: ${err.message}`, connectedDisplaysMessageType: 'error', mqttConfigMessage: 'Failed to send reboot-all command', mqttConfigMessageType: 'error' }); }
  }, [getRequestHeaders, handleUnauthorizedAccess, updateConfig]);

  // ---- Touchkio Modal ----
  const handleOpenTouchkioModal = useCallback((display) => { updateConfig({ showTouchkioModal: true, touchkioModalDisplay: display, touchkioModalMessage: null, touchkioModalMessageType: null, touchkioModalBrightness: undefined, touchkioModalVolume: undefined, touchkioModalZoom: undefined }); }, [updateConfig]);
  const handleCloseTouchkioModal = useCallback(() => { updateConfig({ showTouchkioModal: false, touchkioModalDisplay: null, touchkioModalMessage: null, touchkioModalMessageType: null, touchkioModalBrightness: undefined, touchkioModalVolume: undefined, touchkioModalZoom: undefined }); }, [updateConfig]);

  const handleMqttPowerCommandModal = useCallback(async (identifier, powerOn) => {
    await handleMqttPowerCommand(identifier, powerOn);
    const s = configRef.current;
    if (s.touchkioModalDisplay) { const o = { ...s.touchkioModalDisplay }; if (o.mqtt) o.mqtt = { ...o.mqtt, power: powerOn ? 'ON' : 'OFF' }; updateConfig({ touchkioModalDisplay: o, touchkioModalMessage: `Power command sent: ${powerOn ? 'ON' : 'OFF'}`, touchkioModalMessageType: 'success' }); }
    else updateConfig({ touchkioModalMessage: `Power command sent: ${powerOn ? 'ON' : 'OFF'}`, touchkioModalMessageType: 'success' });
    setTimeout(async () => { await handleLoadConnectedDisplays(); const ud = (configRef.current.connectedDisplays || []).find(d => d.mqtt?.deviceId === identifier || d.mqtt?.hostname === identifier); if (ud) updateConfig({ touchkioModalDisplay: ud }); }, 2000);
  }, [handleMqttPowerCommand, configRef, updateConfig, handleLoadConnectedDisplays]);

  const handleMqttBrightnessCommandModal = useCallback(async (hostname, brightness) => { await handleMqttBrightnessCommand(hostname, brightness); updateConfig({ touchkioModalMessage: `Brightness set to ${brightness}`, touchkioModalMessageType: 'success' }); }, [handleMqttBrightnessCommand, updateConfig]);

  const handleMqttKioskCommandModal = useCallback(async (identifier, status) => {
    await handleMqttKioskCommand(identifier, status);
    const s = configRef.current;
    if (s.touchkioModalDisplay) { const o = { ...s.touchkioModalDisplay }; if (o.mqtt) o.mqtt = { ...o.mqtt, kioskStatus: status }; updateConfig({ touchkioModalDisplay: o, touchkioModalMessage: `Kiosk mode set to ${status}`, touchkioModalMessageType: 'success' }); }
    else updateConfig({ touchkioModalMessage: `Kiosk mode set to ${status}`, touchkioModalMessageType: 'success' });
    setTimeout(async () => { await handleLoadConnectedDisplays(); const ud = (configRef.current.connectedDisplays || []).find(d => d.mqtt?.deviceId === identifier || d.mqtt?.hostname === identifier); if (ud) updateConfig({ touchkioModalDisplay: ud }); }, 2000);
  }, [handleMqttKioskCommand, configRef, updateConfig, handleLoadConnectedDisplays]);

  const handleMqttThemeCommandModal = useCallback(async (identifier, theme) => {
    await handleMqttThemeCommand(identifier, theme);
    const s = configRef.current;
    if (s.touchkioModalDisplay) { const o = { ...s.touchkioModalDisplay }; if (o.mqtt) o.mqtt = { ...o.mqtt, theme }; updateConfig({ touchkioModalDisplay: o, touchkioModalMessage: `Theme set to ${theme}`, touchkioModalMessageType: 'success' }); }
    else updateConfig({ touchkioModalMessage: `Theme set to ${theme}`, touchkioModalMessageType: 'success' });
    setTimeout(async () => { await handleLoadConnectedDisplays(); const ud = (configRef.current.connectedDisplays || []).find(d => d.mqtt?.deviceId === identifier || d.mqtt?.hostname === identifier); if (ud) updateConfig({ touchkioModalDisplay: ud }); }, 2000);
  }, [handleMqttThemeCommand, configRef, updateConfig, handleLoadConnectedDisplays]);

  const handleMqttVolumeCommandModal = useCallback(async (hostname, volume) => { await handleMqttVolumeCommand(hostname, volume); updateConfig({ touchkioModalMessage: `Volume set to ${volume}%`, touchkioModalMessageType: 'success' }); }, [handleMqttVolumeCommand, updateConfig]);
  const handleMqttPageZoomCommandModal = useCallback(async (hostname, zoom) => { await handleMqttPageZoomCommand(hostname, zoom); updateConfig({ touchkioModalMessage: `Page zoom set to ${zoom}%`, touchkioModalMessageType: 'success' }); }, [handleMqttPageZoomCommand, updateConfig]);

  const handleMqttPageUrlCommandModal = useCallback(async (identifier, url) => {
    try {
      const response = await sendMqttPageUrlCommand(() => getRequestHeaders(), identifier, url);
      if (response.ok) {
        const s = configRef.current;
        if (s.touchkioModalDisplay) { const o = { ...s.touchkioModalDisplay }; if (o.mqtt) o.mqtt = { ...o.mqtt, pageUrl: url }; updateConfig({ touchkioModalDisplay: o, touchkioModalMessage: 'Page URL updated successfully', touchkioModalMessageType: 'success' }); }
        else updateConfig({ touchkioModalMessage: 'Page URL updated successfully', touchkioModalMessageType: 'success' });
        setTimeout(async () => { await handleLoadConnectedDisplays(); const displays = configRef.current.connectedDisplays || []; const ud = displays.find(d => d.mqtt?.deviceId === identifier || d.mqtt?.hostname === identifier); if (ud) updateConfig({ touchkioModalDisplay: ud }); }, 2000);
      } else throw new Error('Failed to update page URL');
    } catch (err) { console.error('Failed to send page URL command:', err); updateConfig({ touchkioModalMessage: 'Failed to update page URL', touchkioModalMessageType: 'error' }); }
  }, [getRequestHeaders, configRef, updateConfig, handleLoadConnectedDisplays]);

  const handleMqttRefreshCommandModal = useCallback(async (hostname) => { await handleMqttRefreshCommand(hostname); updateConfig({ touchkioModalMessage: 'Refresh command sent', touchkioModalMessageType: 'success' }); }, [handleMqttRefreshCommand, updateConfig]);
  const handleMqttRebootCommandModal = useCallback(async (hostname) => { await handleMqttRebootCommand(hostname); updateConfig({ touchkioModalMessage: 'Reboot command sent', touchkioModalMessageType: 'warning' }); }, [handleMqttRebootCommand, updateConfig]);
  const handleMqttShutdownCommandModal = useCallback(async (hostname) => { await handleMqttShutdownCommand(hostname); updateConfig({ touchkioModalMessage: 'Shutdown command sent', touchkioModalMessageType: 'warning' }); }, [handleMqttShutdownCommand, updateConfig]);

  return {
    mqttDisplaysIntervalRef,
    handleLoadMqttDisplays, handleMqttConfigSubmit,
    handleMqttPowerCommand, handleMqttBrightnessCommand, handleMqttKioskCommand,
    handleMqttThemeCommand, handleMqttVolumeCommand, handleMqttPageZoomCommand,
    handleMqttRefreshCommand, handleMqttRebootCommand, handleMqttShutdownCommand,
    handleMqttRefreshAll, handleMqttRebootAll,
    handleOpenTouchkioModal, handleCloseTouchkioModal,
    handleMqttPowerCommandModal, handleMqttBrightnessCommandModal,
    handleMqttKioskCommandModal, handleMqttThemeCommandModal,
    handleMqttVolumeCommandModal, handleMqttPageZoomCommandModal,
    handleMqttPageUrlCommandModal, handleMqttRefreshCommandModal,
    handleMqttRebootCommandModal, handleMqttShutdownCommandModal
  };
}
