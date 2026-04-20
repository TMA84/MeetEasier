/**
* @file DevicesTab.js
* @description Admin panel tab for managing connected displays and devices. Shows a table of displays with status, connection type, metrics, and actions (power management, MQTT refresh/reboot). Also provides tracking settings, IP whitelist configuration, and reverse proxy options.
*/
import React from 'react';

function getDisplayStatus(display) {
  const hasSocketIO = display.socketIO && display.socketIO.connected;
  const hasMQTT = display.mqtt && display.mqtt.connected;
  let status, statusDotColor;

  if (hasSocketIO && hasMQTT) {
    const socketActive = display.socketIO.status === 'active';
    const powerExplicitlySupported = display.mqtt.powerUnsupported === false;
    const mqttPowerKnown = powerExplicitlySupported && (display.mqtt.power === 'ON' || display.mqtt.power === 'OFF');
    if (!mqttPowerKnown) {
      status = socketActive ? 'Active' : 'Inactive';
      statusDotColor = socketActive ? '#22c55e' : '#f59e0b';
    } else {
      const mqttOn = display.mqtt.power === 'ON';
      if (mqttOn) { status = 'Active'; statusDotColor = '#22c55e'; }
      else if (socketActive && !mqttOn) { status = 'Partial'; statusDotColor = '#f59e0b'; }
      else { status = 'OFF'; statusDotColor = '#ef4444'; }
    }
  } else if (hasSocketIO) {
    status = display.socketIO.status === 'active' ? 'Active' : 'Inactive';
    statusDotColor = display.socketIO.status === 'active' ? '#22c55e' : '#f59e0b';
  } else if (hasMQTT) {
    if (display.mqtt.powerUnsupported === true || display.mqtt.powerUnsupported === undefined) { status = 'MQTT Only'; statusDotColor = '#f59e0b'; }
    else if (display.mqtt.power === 'ON') { status = 'MQTT Only'; statusDotColor = '#f59e0b'; }
    else if (display.mqtt.power === 'OFF') { status = 'OFF'; statusDotColor = '#ef4444'; }
    else { status = 'MQTT Only'; statusDotColor = '#f59e0b'; }
  } else {
    status = 'Disconnected'; statusDotColor = '#ef4444';
  }
  return { status, statusDotColor, hasSocketIO, hasMQTT };
}

const DisplayRow = ({ display, onOpenPowerManagement, onOpenTouchkioModal, onMqttRefresh, onDeleteDisplay }) => {
  const { status, statusDotColor, hasSocketIO, hasMQTT } = getDisplayStatus(display);
  const mqttUpdate = display.mqtt?.updateInfo;
  const swVersion = mqttUpdate?.installedVersion || display.mqtt?.swVersion;
  const hasUpdate = mqttUpdate && mqttUpdate.latestVersion && mqttUpdate.installedVersion && mqttUpdate.latestVersion !== mqttUpdate.installedVersion;
  return (
    <tr key={display.id}>
      <td className="status-cell" style={{ textAlign: 'center', padding: '0.5rem' }}>
        <span className="devices-status-dot" style={{ backgroundColor: statusDotColor }} title={status}></span>
      </td>
      <td className="devices-name-cell">
        <div>
          <strong>{display.name}</strong>
          {display.mqtt && !display.mqtt.hasDesiredConfig && (
            <span className="devices-badge devices-badge--new" style={{ marginLeft: '0.5em', backgroundColor: '#8b5cf6', color: '#fff', fontSize: '0.7em', padding: '0.15em 0.5em', borderRadius: '4px', verticalAlign: 'middle' }}>NEW</span>
          )}
          {hasUpdate && (
            <span className="devices-badge devices-badge--update" style={{ marginLeft: '0.5em', backgroundColor: '#22c55e', color: '#fff', fontSize: '0.7em', padding: '0.15em 0.5em', borderRadius: '4px', verticalAlign: 'middle' }}>UPDATE</span>
          )}
          {(display.mqtt?.deviceId || display.mqtt?.hostname) && (<div className="devices-sub-info">{display.mqtt?.deviceId || display.mqtt?.hostname}</div>)}
          {swVersion && <div className="devices-sub-info">Touchkio v{swVersion}{hasUpdate ? ` → v${mqttUpdate.latestVersion}` : ''}</div>}
          {display.ipAddress && <div className="devices-sub-info">{display.ipAddress}</div>}
        </div>
      </td>
      <td className="devices-type-cell">{display.type === 'single-room' && display.mqtt?.room ? display.mqtt.room : (display.type || 'unknown')}</td>
      <td>
        <div className="devices-connection-cell">
          {hasSocketIO && <span className="devices-badge devices-badge--socketio">Socket.IO</span>}
          {hasMQTT && <span className="devices-badge devices-badge--mqtt">MQTT</span>}
        </div>
      </td>
      <td className="devices-metrics-cell">
        {hasMQTT && (<div><div>CPU: {display.mqtt.cpuUsage !== undefined ? `${display.mqtt.cpuUsage.toFixed(1)}%` : '-'}</div><div>Mem: {display.mqtt.memoryUsage !== undefined ? `${display.mqtt.memoryUsage.toFixed(1)}%` : '-'}</div><div>Temp: {display.mqtt.temperature !== undefined ? `${display.mqtt.temperature.toFixed(1)}°C` : '-'}</div></div>)}
        {hasSocketIO && !hasMQTT && (<div className="devices-timestamp">{display.socketIO.connectedAt ? new Date(display.socketIO.connectedAt).toLocaleTimeString() : '-'}</div>)}
      </td>
      <td>
        <div className="devices-actions-cell">
          <button type="button" className="admin-secondary-button devices-icon-button" onClick={() => onOpenPowerManagement(display.id)} title="Power Management">⚡</button>
          {hasMQTT && (<><button type="button" className="admin-secondary-button devices-icon-button" onClick={() => onMqttRefresh(display.mqtt.deviceId || display.mqtt.hostname)} title="Refresh Page">🔄</button><button type="button" className="admin-primary-button devices-details-button" onClick={() => onOpenTouchkioModal(display)}>Details</button></>)}
          {!hasSocketIO && !hasMQTT && (<button type="button" className="admin-secondary-button devices-delete-button" onClick={() => onDeleteDisplay(display.id)}>Delete</button>)}
        </div>
      </td>
    </tr>
  );
};

const TrackingSettings = ({ t, systemDisplayTrackingMode, systemDisplayTrackingRetentionHours, systemDisplayTrackingCleanupMinutes, onTrackingModeChange, onRetentionHoursChange, onCleanupMinutesChange }) => (
  <div>
    <div className="admin-form-group">
      <label htmlFor="systemDisplayTrackingMode">{t.systemDisplayTrackingModeLabel || 'Tracking Mode'}</label>
      <div className="admin-radio-group">
        <label className="admin-radio-label"><input type="radio" name="systemDisplayTrackingMode" value="client-id" checked={systemDisplayTrackingMode === 'client-id'} onChange={(e) => onTrackingModeChange(e.target.value)} /><span>{t.systemDisplayTrackingModeClientId || 'Client ID (each browser tab separately)'}</span></label>
        <label className="admin-radio-label"><input type="radio" name="systemDisplayTrackingMode" value="ip-room" checked={systemDisplayTrackingMode === 'ip-room'} onChange={(e) => onTrackingModeChange(e.target.value)} /><span>{t.systemDisplayTrackingModeIpRoom || 'IP + Room (one entry per physical display)'}</span></label>
      </div>
      <small className="admin-help-text">{t.systemDisplayTrackingModeHelp || 'Client ID: Each browser tab is tracked separately. IP+Room: Displays are grouped by IP address and room.'}</small>
    </div>
    <div className="admin-form-group">
      <label htmlFor="systemDisplayTrackingRetentionHours">{t.systemDisplayTrackingRetentionLabel || 'Retention Time (hours)'}</label>
      <input type="number" id="systemDisplayTrackingRetentionHours" value={systemDisplayTrackingRetentionHours} onChange={(e) => onRetentionHoursChange(e.target.value)} min="1" max="168" />
      <small className="admin-help-text">{t.systemDisplayTrackingRetentionHelp || 'How long disconnected displays remain visible (1-168 hours)'}</small>
    </div>
    <div className="admin-form-group">
      <label htmlFor="systemDisplayTrackingCleanupMinutes">{t.systemDisplayTrackingCleanupLabel || 'Cleanup Delay (minutes)'}</label>
      <input type="number" id="systemDisplayTrackingCleanupMinutes" value={systemDisplayTrackingCleanupMinutes} onChange={(e) => onCleanupMinutesChange(e.target.value)} min="0" max="60" />
      <small className="admin-help-text">{t.systemDisplayTrackingCleanupHelp || 'Wait time after disconnect before automatic cleanup (0-60 minutes)'}</small>
    </div>
  </div>
);

const IpWhitelistSettings = ({ t, systemDisplayIpWhitelistEnabled, systemDisplayIpWhitelist, systemTrustReverseProxy, onIpWhitelistEnabledChange, onIpWhitelistChange, onTrustReverseProxyChange }) => (
  <div>
    <div className="admin-form-group">
      <label className="inline-label"><span className="label-text">{t.displayIpWhitelistEnabledLabel || 'Enable IP Whitelist'}</span><input type="checkbox" checked={systemDisplayIpWhitelistEnabled} onChange={(e) => onIpWhitelistEnabledChange(e.target.checked)} /></label>
      <small className="admin-help-text">{t.displayIpWhitelistEnabledHelp || 'When enabled, only whitelisted IPs can access display pages (flightboard, room displays) and their APIs. Admin and WiFi pages remain open to all.'}</small>
    </div>
    {systemDisplayIpWhitelistEnabled && (
      <>
        <div className="admin-form-group">
          <label htmlFor="systemDisplayIpWhitelist">{t.displayIpWhitelistLabel || 'Allowed IP Addresses (one per line)'}</label>
          <textarea id="systemDisplayIpWhitelist" value={systemDisplayIpWhitelist} onChange={(e) => onIpWhitelistChange(e.target.value)} rows={6} placeholder={"192.168.3.0/24\n10.5.5.0/24\n192.168.1.100"} style={{ fontFamily: 'monospace', fontSize: '0.85rem' }} />
          <small className="admin-help-text">{t.displayIpWhitelistHelp || 'Enter one IP address or CIDR range per line (e.g., 192.168.3.0/24). IPv4 and IPv6 are supported. localhost/127.0.0.1/::1 are treated as equivalent.'}</small>
        </div>
        <div className="admin-form-group">
          <label className="inline-label"><span className="label-text">{t.trustReverseProxyLabel || 'Behind Reverse Proxy (ALB, Nginx, etc.)'}</span><input type="checkbox" checked={systemTrustReverseProxy} onChange={(e) => onTrustReverseProxyChange(e.target.checked)} /></label>
          <small className="admin-help-text">{t.trustReverseProxyHelp || 'Enable this if the server runs behind a reverse proxy (e.g., AWS ALB, Nginx). Uses X-Forwarded-For header to determine the real client IP. Do not enable without a reverse proxy — clients could spoof their IP.'}</small>
        </div>
      </>
    )}
  </div>
);

const DevicesTab = ({
  isActive,
  connectedDisplays,
  connectedDisplaysLoading,
  connectedDisplaysMessage,
  connectedDisplaysMessageType,
  systemDisplayTrackingMode,
  currentSystemDisplayTrackingMode,
  systemDisplayTrackingRetentionHours,
  currentSystemDisplayTrackingRetentionHours,
  systemDisplayTrackingCleanupMinutes,
  currentSystemDisplayTrackingCleanupMinutes,
  systemDisplayIpWhitelistEnabled,
  currentSystemDisplayIpWhitelistEnabled,
  systemDisplayIpWhitelist,
  currentSystemDisplayIpWhitelist,
  systemTrustReverseProxy,
  currentSystemTrustReverseProxy,
  systemMessage,
  systemMessageType,
  t,
  onLoadDisplays,
  onOpenPowerManagement,
  onOpenTouchkioModal,
  onMqttRefresh,
  onMqttRefreshAll,
  onMqttRebootAll,
  onMqttUpdateAll,
  onDeleteDisplay,
  onTrackingModeChange,
  onRetentionHoursChange,
  onCleanupMinutesChange,
  onIpWhitelistEnabledChange,
  onIpWhitelistChange,
  onTrustReverseProxyChange,
  onSaveSettings
}) => {
  const hasMqttDisplays = connectedDisplays && connectedDisplays.filter(d => d.mqtt).length > 0;

  return (
    <div className={`admin-tab-content ${isActive ? 'active' : ''}`}>
    <div className="admin-card" id="ops-connected-displays">
      <div className="admin-form-divider"></div>
      <h3>{t.connectedDisplaysSectionTitle || 'Connected Displays'}</h3>
      
      <div className="devices-action-bar">
        <button type="button" className="admin-secondary-button" onClick={onLoadDisplays} disabled={connectedDisplaysLoading}>
          {connectedDisplaysLoading ? t.loading : (t.connectedDisplaysRefreshButton || 'Refresh')}
        </button>
        <button type="button" className="admin-primary-button" onClick={() => onOpenPowerManagement('__global__')}>
          {t.powerManagementGlobalButton || 'Global Standard'}
        </button>
        <button type="button" className="admin-secondary-button devices-refresh-all-button" onClick={onMqttRefreshAll} disabled={connectedDisplaysLoading || !hasMqttDisplays}>
          Refresh All Touchkio
        </button>
        <button type="button" className="admin-secondary-button devices-reboot-all-button" onClick={onMqttRebootAll} disabled={connectedDisplaysLoading || !hasMqttDisplays}>
          Reboot All Touchkio
        </button>
        <button type="button" className="admin-secondary-button devices-update-all-button" onClick={onMqttUpdateAll} disabled={connectedDisplaysLoading || !hasMqttDisplays}>
          Update All Touchkio
        </button>
      </div>

      {connectedDisplaysMessage && (
        <div className={`admin-message admin-message-${connectedDisplaysMessageType}`}>{connectedDisplaysMessage}</div>
      )}

      {connectedDisplays.length === 0 ? (
        <div className="admin-locked-message">
          <p>{t.connectedDisplaysEmpty || 'No displays connected.'}</p>
        </div>
      ) : (
        <div className="admin-displays-table-wrapper" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: '30px', textAlign: 'center' }}></th>
                <th style={{ width: '20%' }}>Name</th>
                <th style={{ width: '12%' }}>Type</th>
                <th style={{ width: '12%' }}>Connection</th>
                <th style={{ width: '18%' }}>Metrics</th>
                <th style={{ width: '28%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {connectedDisplays.map((display) => (
                <DisplayRow key={display.id} display={display} onOpenPowerManagement={onOpenPowerManagement} onOpenTouchkioModal={onOpenTouchkioModal} onMqttRefresh={onMqttRefresh} onDeleteDisplay={onDeleteDisplay} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-form-divider"></div>
      <h3>{t.systemDisplayTrackingSectionTitle || 'Tracking Settings'}</h3>
      <TrackingSettings t={t} systemDisplayTrackingMode={systemDisplayTrackingMode} systemDisplayTrackingRetentionHours={systemDisplayTrackingRetentionHours} systemDisplayTrackingCleanupMinutes={systemDisplayTrackingCleanupMinutes} onTrackingModeChange={onTrackingModeChange} onRetentionHoursChange={onRetentionHoursChange} onCleanupMinutesChange={onCleanupMinutesChange} />

      <div className="admin-form-divider"></div>
      <h3>{t.displayIpWhitelistSectionTitle || 'Display IP Whitelist'}</h3>
      <IpWhitelistSettings t={t} systemDisplayIpWhitelistEnabled={systemDisplayIpWhitelistEnabled} systemDisplayIpWhitelist={systemDisplayIpWhitelist} systemTrustReverseProxy={systemTrustReverseProxy} onIpWhitelistEnabledChange={onIpWhitelistEnabledChange} onIpWhitelistChange={onIpWhitelistChange} onTrustReverseProxyChange={onTrustReverseProxyChange} />

      <button 
        type="submit" 
        className="admin-submit-button" 
        onClick={onSaveSettings}
        disabled={
          systemDisplayTrackingMode === currentSystemDisplayTrackingMode &&
          parseInt(systemDisplayTrackingRetentionHours, 10) === currentSystemDisplayTrackingRetentionHours &&
          parseInt(systemDisplayTrackingCleanupMinutes, 10) === currentSystemDisplayTrackingCleanupMinutes &&
          systemDisplayIpWhitelistEnabled === currentSystemDisplayIpWhitelistEnabled &&
          systemDisplayIpWhitelist === currentSystemDisplayIpWhitelist &&
          systemTrustReverseProxy === currentSystemTrustReverseProxy
        }
      >
        {t.systemSaveButton || 'Save System Configuration'}
      </button>

      {systemMessage && (
        <div className={`admin-message admin-message-${systemMessageType}`}>{systemMessage}</div>
      )}
    </div>
    </div>
  );
};

export default DevicesTab;
