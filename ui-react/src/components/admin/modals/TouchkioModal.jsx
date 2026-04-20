/** @file TouchkioModal.js
*  @description Modal dialog for managing Touchkio displays, providing controls for power, brightness, volume, zoom, kiosk mode, theme, page URL, and system operations like reboot and shutdown.
*/
import React, { useState, useEffect, useRef } from 'react';

const HardwareWarning = ({ powerSupported, brightnessSupported }) => {
  if (powerSupported && brightnessSupported) return null;
  return (
    <div className="touchkio-hw-warning">
      <span className="touchkio-hw-warning-icon">⚠️</span>
      <div>
        <div className="touchkio-hw-warning-title">Hardware Not Supported</div>
        <div className="touchkio-hw-warning-text">
          {!powerSupported && !brightnessSupported && 'Display power and brightness control are not supported by this hardware.'}
          {!powerSupported && brightnessSupported && 'Display power control is not supported by this hardware.'}
          {powerSupported && !brightnessSupported && 'Display brightness control is not supported by this hardware.'}
          {' '}Your HDMI display may not support DDC/CI or CEC protocols. Status shown is from Socket.IO connection.
        </div>
      </div>
    </div>
  );
};

const StatusGrid = ({ displayData, powerSupported, brightnessSupported, powerColorClass }) => (
  <div className="touchkio-status-grid">
    <div className="touchkio-status-card">
      <div className="touchkio-status-label">Display Power</div>
      <div className={`touchkio-power-value ${powerColorClass}`}>
        {powerSupported ? (displayData.power || 'UNKNOWN') : 'UNSUPPORTED'}
      </div>
      <div className="touchkio-status-detail">
        Brightness: <strong>{brightnessSupported ? (displayData.brightness || '-') : 'N/A'}</strong>
      </div>
    </div>
    <div className="touchkio-status-card">
      <div className="touchkio-status-label">System Resources</div>
      <div className="touchkio-status-details">
        <div>CPU: <strong>{displayData.cpuUsage !== undefined ? `${displayData.cpuUsage.toFixed(1)}%` : '-'}</strong></div>
        <div>Mem: <strong>{displayData.memoryUsage !== undefined ? `${displayData.memoryUsage.toFixed(1)}%` : '-'}</strong></div>
        <div>Temp: <strong>{displayData.temperature !== undefined ? `${displayData.temperature.toFixed(1)}°C` : '-'}</strong></div>
      </div>
    </div>
    <div className="touchkio-status-card">
      <div className="touchkio-status-label">Display Mode</div>
      <div className="touchkio-status-details">
        <div>Kiosk: <strong>{displayData.kioskStatus || '-'}</strong></div>
        <div>Theme: <strong>{displayData.theme || '-'}</strong></div>
        <div>Zoom: <strong>{displayData.pageZoom !== undefined ? `${displayData.pageZoom}%` : '-'}</strong></div>
      </div>
    </div>
    <div className="touchkio-status-card">
      <div className="touchkio-status-label">Network</div>
      <div className="touchkio-network-address">{displayData.networkAddress || '-'}</div>
      <div className="touchkio-status-detail">
        Uptime: <strong>{displayData.uptime !== undefined ? `${Math.floor(displayData.uptime / 60)}h ${Math.floor(displayData.uptime % 60)}m` : '-'}</strong>
      </div>
    </div>
  </div>
);

const ScreenshotSection = ({ hasMqttConnection, screenshotUrl, screenshotLoading, screenshotError, screenshotExpanded, setScreenshotExpanded, loadScreenshot }) => {
  if (!hasMqttConnection) return null;
  return (
    <div className="touchkio-section">
      <div className="touchkio-section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        📸 Live Screenshot
        <button type="button" className="admin-secondary-button admin-btn-sm" onClick={loadScreenshot} disabled={screenshotLoading} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
          {screenshotLoading ? '...' : '🔄'}
        </button>
      </div>
      {screenshotUrl && (
        <div className="touchkio-screenshot-container" style={{ cursor: 'pointer' }} onClick={() => setScreenshotExpanded(!screenshotExpanded)}>
          <img src={screenshotUrl} alt="Display screenshot" className="touchkio-screenshot-img" style={{ width: '100%', maxHeight: screenshotExpanded ? 'none' : '200px', objectFit: screenshotExpanded ? 'contain' : 'cover', borderRadius: '6px', border: '1px solid var(--admin-border, #e2e8f0)' }} />
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem', textAlign: 'center' }}>
            {screenshotExpanded ? 'Click to collapse' : 'Click to expand'}
          </div>
        </div>
      )}
      {screenshotLoading && !screenshotUrl && (<div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Loading screenshot...</div>)}
      {screenshotError && !screenshotUrl && !screenshotLoading && (<div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{screenshotError}</div>)}
    </div>
  );
};

const PageUrlSection = ({ currentPageUrl, editingUrl, urlInput, setUrlInput, handleStartEditUrl, handleSaveUrl, handleCancelEditUrl }) => (
  <div className="touchkio-section">
    <div className="touchkio-section-label">Page URL</div>
    {!editingUrl ? (
      <div className="touchkio-url-display">
        <div className={`touchkio-url-text ${currentPageUrl ? 'touchkio-url-text--filled' : 'touchkio-url-text--empty'}`}>
          {currentPageUrl || 'No URL configured'}
        </div>
        <button type="button" className="admin-secondary-button admin-btn-sm admin-btn-nowrap" onClick={handleStartEditUrl}>
          {currentPageUrl ? 'Edit URL' : 'Set URL'}
        </button>
      </div>
    ) : (
      <div>
        <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://example.com/room/display" className="touchkio-url-input" />
        <div className="touchkio-url-actions">
          <button type="button" className="admin-primary-button admin-btn-sm" onClick={handleSaveUrl}>Save &amp; Apply</button>
          <button type="button" className="admin-secondary-button admin-btn-sm" onClick={handleCancelEditUrl}>Cancel</button>
        </div>
      </div>
    )}
  </div>
);

const QuickControls = ({ displayData, powerSupported, mqttIdentifier, onPowerCommand, onThemeCommand, onRefreshCommand }) => (
  <div className="touchkio-control-section">
    <h4 className="touchkio-control-title">Quick Controls</h4>
    <div className={`touchkio-toggle-row ${!powerSupported ? 'touchkio-toggle-row--disabled' : ''}`}>
      <div>
        <div className="touchkio-toggle-label">Display Power {!powerSupported && <span className="touchkio-toggle-unsupported">(Unsupported)</span>}</div>
        <div className={`touchkio-toggle-status ${powerSupported ? (displayData.power === 'ON' ? 'touchkio-toggle-status--on' : 'touchkio-toggle-status--off') : 'touchkio-toggle-status--na'}`}>
          {powerSupported ? (displayData.power === 'ON' ? 'ON' : displayData.power === 'OFF' ? 'OFF' : 'Unknown') : 'N/A'}
        </div>
      </div>
      <label className="touchkio-toggle-switch" style={{ cursor: powerSupported ? 'pointer' : 'not-allowed' }}>
        <input type="checkbox" checked={displayData.power === 'ON'} onChange={(e) => powerSupported && onPowerCommand(mqttIdentifier, e.target.checked)} disabled={!powerSupported} />
        <span className={`touchkio-toggle-track ${displayData.power === 'ON' ? 'touchkio-toggle-track--on' : 'touchkio-toggle-track--off'}`}>
          <span className={`touchkio-toggle-thumb ${displayData.power === 'ON' ? 'touchkio-toggle-thumb--on' : 'touchkio-toggle-thumb--off'}`}></span>
        </span>
      </label>
    </div>
    <div className="touchkio-toggle-row">
      <div>
        <div className="touchkio-toggle-label">Theme</div>
        <div className="touchkio-toggle-status touchkio-toggle-status--info">{displayData.theme || 'Unknown'}</div>
      </div>
      <label className="touchkio-toggle-switch" style={{ cursor: 'pointer' }}>
        <input type="checkbox" checked={displayData.theme === 'Dark'} onChange={(e) => onThemeCommand(mqttIdentifier, e.target.checked ? 'Dark' : 'Light')} />
        <span className={`touchkio-toggle-track ${displayData.theme === 'Dark' ? 'touchkio-toggle-track--dark' : 'touchkio-toggle-track--light'}`}>
          <span className={`touchkio-toggle-thumb-theme ${displayData.theme === 'Dark' ? 'touchkio-toggle-thumb--on' : 'touchkio-toggle-thumb--off'}`}>
            {displayData.theme === 'Dark' ? '🌙' : '☀️'}
          </span>
        </span>
      </label>
    </div>
    <button type="button" className="admin-secondary-button admin-w-full admin-btn-sm" onClick={() => onRefreshCommand(mqttIdentifier)}>🔄 Refresh Page</button>
  </div>
);

const SliderControls = ({ displayData, brightnessSupported, brightness, volume, zoom, onBrightnessChange, onVolumeChange, onZoomChange }) => (
  <div className="touchkio-control-section">
    <h4 className="touchkio-control-title">Adjustments</h4>
    <div className={`touchkio-slider-group ${!brightnessSupported ? 'touchkio-slider-group--disabled' : ''}`}>
      <div className="touchkio-slider-header">
        <span className="touchkio-slider-label">Brightness {!brightnessSupported && <span className="touchkio-toggle-unsupported">(Unsupported)</span>}</span>
        <span className="touchkio-slider-value">{brightnessSupported ? (brightness !== undefined ? brightness : displayData.brightness || 200) : 'N/A'}</span>
      </div>
      <input type="range" min="0" max="255" value={brightness !== undefined ? brightness : displayData.brightness || 200} onChange={(e) => brightnessSupported && onBrightnessChange(parseInt(e.target.value, 10), false)} onMouseUp={(e) => brightnessSupported && onBrightnessChange(parseInt(e.target.value, 10), true)} onTouchEnd={(e) => brightnessSupported && onBrightnessChange(parseInt(e.target.value, 10), true)} disabled={!brightnessSupported} className="touchkio-slider" />
    </div>
    <div className="touchkio-slider-group">
      <div className="touchkio-slider-header">
        <span className="touchkio-slider-label">Volume</span>
        <span className="touchkio-slider-value">{volume !== undefined ? volume : displayData.volume || 50}%</span>
      </div>
      <input type="range" min="0" max="100" value={volume !== undefined ? volume : displayData.volume || 50} onChange={(e) => onVolumeChange(parseInt(e.target.value, 10), false)} onMouseUp={(e) => onVolumeChange(parseInt(e.target.value, 10), true)} onTouchEnd={(e) => onVolumeChange(parseInt(e.target.value, 10), true)} className="touchkio-slider" />
    </div>
    <div className="touchkio-slider-group">
      <div className="touchkio-slider-header">
        <span className="touchkio-slider-label">Page Zoom</span>
        <span className="touchkio-slider-value">{zoom !== undefined ? zoom : displayData.pageZoom || 100}%</span>
      </div>
      <input type="range" min="25" max="400" step="5" value={zoom !== undefined ? zoom : displayData.pageZoom || 100} onChange={(e) => onZoomChange(parseInt(e.target.value, 10), false)} onMouseUp={(e) => onZoomChange(parseInt(e.target.value, 10), true)} onTouchEnd={(e) => onZoomChange(parseInt(e.target.value, 10), true)} className="touchkio-slider" />
    </div>
  </div>
);

const KioskSection = ({ displayData, mqttIdentifier, onKioskCommand }) => (
  <div className="touchkio-control-section">
    <h4 className="touchkio-control-title" style={{ marginBottom: '0.25rem' }}>Kiosk Mode</h4>
    <div className="touchkio-kiosk-current">Current: <span>{displayData.kioskStatus || 'unknown'}</span></div>
    <div className="touchkio-kiosk-grid">
      {['Fullscreen', 'Maximized', 'Framed', 'Minimized'].map(mode => {
        const isActive = displayData.kioskStatus === mode;
        return (
          <button key={mode} type="button" className={`${isActive ? 'admin-primary-button' : 'admin-secondary-button'} touchkio-kiosk-button ${isActive ? 'touchkio-kiosk-button--active' : ''}`} onClick={() => onKioskCommand(mqttIdentifier, mode)}>
            {isActive ? `✓ ${mode}` : mode}
          </button>
        );
      })}
    </div>
  </div>
);

const SystemControls = ({ hostname, mqttIdentifier, displayData, updateInfo, onRebootCommand, onShutdownCommand, onUpdateCommand }) => {
  const hasUpdate = updateInfo && updateInfo.latestVersion && updateInfo.installedVersion && updateInfo.latestVersion !== updateInfo.installedVersion;
  const currentVersion = updateInfo?.installedVersion || displayData?.swVersion || null;
  const canUpdate = !!currentVersion;
  return (
    <div className="touchkio-danger-section">
      <h4 className="touchkio-danger-title">System Controls</h4>
      {currentVersion && (
        <div className="touchkio-update-info">
          <span>Touchkio: v{currentVersion}</span>
          {hasUpdate && <span className="touchkio-update-available"> → v{updateInfo.latestVersion} available</span>}
          {!hasUpdate && updateInfo?.latestVersion && <span className="touchkio-update-current"> (up to date)</span>}
          {updateInfo?.inProgress && <span className="touchkio-update-progress"> (updating...{updateInfo.updatePercentage !== null && updateInfo.updatePercentage !== undefined ? ` ${updateInfo.updatePercentage}%` : ''})</span>}
        </div>
      )}
      {canUpdate && onUpdateCommand && (
        <button
          type="button"
          className={`admin-secondary-button touchkio-update-button ${!hasUpdate ? 'touchkio-update-button--current' : ''}`}
          onClick={() => {
            const msg = hasUpdate
              ? `Update Touchkio on ${hostname} to v${updateInfo.latestVersion}?`
              : `Reinstall Touchkio v${currentVersion} on ${hostname}?`;
            if (window.confirm(msg)) onUpdateCommand(mqttIdentifier);
          }}
        >
          {hasUpdate ? `Update to v${updateInfo.latestVersion}` : 'Reinstall Touchkio'}
        </button>
      )}
      <button type="button" className="admin-secondary-button touchkio-reboot-button" onClick={() => { if (window.confirm(`Reboot ${hostname}?`)) onRebootCommand(mqttIdentifier); }}>Reboot Device</button>
      <button type="button" className="admin-secondary-button touchkio-shutdown-button" onClick={() => { if (window.confirm(`Shutdown ${hostname}? This will turn off the device!`)) onShutdownCommand(mqttIdentifier); }}>Shutdown Device</button>
    </div>
  );
};

const RecentErrors = ({ recentErrors }) => {
  if (recentErrors.length === 0) return null;
  return (
    <div className="touchkio-errors-section">
      <div className="touchkio-errors-title">Recent Errors (Last Hour)</div>
      <div className="touchkio-errors-list">
        {recentErrors.map((error, idx) => (
          <div key={idx} className="touchkio-error-entry">
            <div className="touchkio-error-timestamp">{error.timestamp}</div>
            {error.message.length > 300 ? error.message.substring(0, 300) + '...' : error.message}
          </div>
        ))}
      </div>
    </div>
  );
};

function getRecentErrors(displayData) {
  if (!displayData.errors || Object.keys(displayData.errors).length === 0) return [];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const errors = [];
  Object.entries(displayData.errors).forEach(([timestamp, logs]) => {
    const logDate = new Date(timestamp);
    if (logDate >= oneHourAgo) {
      logs.forEach((log) => {
        const logType = Object.keys(log)[0];
        if (logType === 'ERROR') {
          errors.push({ timestamp, message: log[logType] });
        }
      });
    }
  });
  return errors;
}

const TouchkioModal = ({ show, display, getRequestHeaders, message, messageType, brightness, volume, zoom, updateInfo, onClose, onBrightnessChange, onVolumeChange, onZoomChange, onPowerCommand, onRefreshCommand, onKioskCommand, onThemeCommand, onRebootCommand, onShutdownCommand, onUpdateCommand, onPageUrlChange, onRefreshDisplay }) => {
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState(null);
  const [screenshotExpanded, setScreenshotExpanded] = useState(false);
  const screenshotUrlRef = useRef(null);
  const prevDeviceIdRef = useRef(null);

  const currentDeviceId = display?.mqtt?.deviceId || display?.deviceId || null;
  useEffect(() => {
    if (currentDeviceId === prevDeviceIdRef.current) return;
    prevDeviceIdRef.current = currentDeviceId;
    setEditingUrl(false);
    setUrlInput('');
    if (screenshotUrlRef.current) URL.revokeObjectURL(screenshotUrlRef.current);
    screenshotUrlRef.current = null;
    setScreenshotUrl(null);
    setScreenshotError(null);
    setScreenshotExpanded(false);
  }, [currentDeviceId]);

  const loadScreenshot = () => {
    if (!display || !getRequestHeaders) return;
    const deviceId = display.mqtt?.deviceId || display.deviceId;
    if (!deviceId) return;
    setScreenshotLoading(true);
    setScreenshotError(null);
    fetch(`/api/mqtt-screenshot/${deviceId}`, { headers: getRequestHeaders(false) })
      .then(response => { if (!response.ok) throw new Error('No screenshot available'); return response.blob(); })
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (screenshotUrlRef.current && screenshotUrlRef.current.startsWith('blob:')) URL.revokeObjectURL(screenshotUrlRef.current);
          screenshotUrlRef.current = reader.result;
          setScreenshotUrl(reader.result);
          setScreenshotLoading(false);
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => { setScreenshotUrl(null); setScreenshotError('No screenshot available — requires Touchkio v1.4.1+'); setScreenshotLoading(false); });
  };

  useEffect(() => {
    if (!show || !display) return;
    loadScreenshot();
    const interval = setInterval(loadScreenshot, 30000);
    return () => clearInterval(interval);
  }, [show, display?.mqtt?.deviceId, getRequestHeaders]);

  useEffect(() => {
    if (!show || !display) return;
    const interval = setInterval(() => { if (!editingUrl && onRefreshDisplay) onRefreshDisplay(); }, 5000);
    return () => clearInterval(interval);
  }, [show, display, editingUrl, onRefreshDisplay]);

  if (!show || !display) return null;

  const displayData = display.mqtt || display;
  const hostname = displayData.hostname;
  const mqttIdentifier = displayData.deviceId || displayData.hostname;
  const currentPageUrl = display.mqtt?.pageUrl || display.pageUrl || '';
  const hasMqttConnection = displayData.connected === true;
  const powerSupported = hasMqttConnection && displayData.powerUnsupported === false && (displayData.power === 'ON' || displayData.power === 'OFF');
  const brightnessSupported = hasMqttConnection && displayData.brightnessUnsupported === false && typeof displayData.brightness === 'number';
  const recentErrors = getRecentErrors(displayData);
  const powerColorClass = powerSupported ? (displayData.power === 'ON' ? 'touchkio-power-value--on' : 'touchkio-power-value--off') : 'touchkio-power-value--unsupported';

  const handleStartEditUrl = () => { setUrlInput(currentPageUrl); setEditingUrl(true); };
  const handleSaveUrl = () => { if (onPageUrlChange) { onPageUrlChange(mqttIdentifier, urlInput); } setEditingUrl(false); };
  const handleCancelEditUrl = () => { setEditingUrl(false); setUrlInput(''); };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content touchkio-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="touchkio-modal-header">
          <h3>Touchkio Display: {displayData.hostname}</h3>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="touchkio-modal-body">
          {message && (<div className={`admin-message admin-message-${messageType} admin-mb-15`}>{message}</div>)}
          <HardwareWarning powerSupported={powerSupported} brightnessSupported={brightnessSupported} />
          <StatusGrid displayData={displayData} powerSupported={powerSupported} brightnessSupported={brightnessSupported} powerColorClass={powerColorClass} />
          <ScreenshotSection hasMqttConnection={hasMqttConnection} screenshotUrl={screenshotUrl} screenshotLoading={screenshotLoading} screenshotError={screenshotError} screenshotExpanded={screenshotExpanded} setScreenshotExpanded={setScreenshotExpanded} loadScreenshot={loadScreenshot} />
          <PageUrlSection currentPageUrl={currentPageUrl} editingUrl={editingUrl} urlInput={urlInput} setUrlInput={setUrlInput} handleStartEditUrl={handleStartEditUrl} handleSaveUrl={handleSaveUrl} handleCancelEditUrl={handleCancelEditUrl} />
          <div className="touchkio-controls-grid">
            <div>
              <QuickControls displayData={displayData} powerSupported={powerSupported} mqttIdentifier={mqttIdentifier} onPowerCommand={onPowerCommand} onThemeCommand={onThemeCommand} onRefreshCommand={onRefreshCommand} />
              <SliderControls displayData={displayData} brightnessSupported={brightnessSupported} brightness={brightness} volume={volume} zoom={zoom} onBrightnessChange={onBrightnessChange} onVolumeChange={onVolumeChange} onZoomChange={onZoomChange} />
            </div>
            <div>
              <KioskSection displayData={displayData} mqttIdentifier={mqttIdentifier} onKioskCommand={onKioskCommand} />
              <SystemControls hostname={hostname} mqttIdentifier={mqttIdentifier} displayData={displayData} updateInfo={updateInfo || displayData?.updateInfo} onRebootCommand={onRebootCommand} onShutdownCommand={onShutdownCommand} onUpdateCommand={onUpdateCommand} />
            </div>
          </div>
          <RecentErrors recentErrors={recentErrors} />
        </div>
        <div className="touchkio-modal-footer">
          <button type="button" className="admin-secondary-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default TouchkioModal;
