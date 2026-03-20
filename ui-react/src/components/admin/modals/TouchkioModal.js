/** @file TouchkioModal.js
 *  @description Modal dialog for managing Touchkio displays, providing controls for power, brightness, volume, zoom, kiosk mode, theme, page URL, and system operations like reboot and shutdown.
 */
import React, { useState, useEffect } from 'react';

const TouchkioModal = ({
  show,
  display,
  message,
  messageType,
  brightness,
  volume,
  zoom,
  onClose,
  onBrightnessChange,
  onVolumeChange,
  onZoomChange,
  onPowerCommand,
  onRefreshCommand,
  onKioskCommand,
  onThemeCommand,
  onRebootCommand,
  onShutdownCommand,
  onPageUrlChange,
  onRefreshDisplay
}) => {
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  // Reset editing state when display changes
  useEffect(() => {
    setEditingUrl(false);
    setUrlInput('');
  }, [display]);

  // Auto-refresh display data every 5 seconds
  useEffect(() => {
    if (!show || !display) return;
    
    const interval = setInterval(() => {
      if (!editingUrl && onRefreshDisplay) {
        onRefreshDisplay();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [show, display, editingUrl, onRefreshDisplay]);

  if (!show || !display) return null;

  const currentPageUrl = display.mqtt?.pageUrl || display.pageUrl || '';

  const handleStartEditUrl = () => {
    setUrlInput(currentPageUrl);
    setEditingUrl(true);
  };

  const handleSaveUrl = () => {
    if (onPageUrlChange) {
      const identifier = displayData.deviceId || displayData.hostname;
      onPageUrlChange(identifier, urlInput);
    }
    setEditingUrl(false);
  };

  const handleCancelEditUrl = () => {
    setEditingUrl(false);
    setUrlInput('');
  };

  const displayData = display.mqtt || display;
  const hostname = displayData.hostname;
  const mqttIdentifier = displayData.deviceId || displayData.hostname;

  const hasMqttConnection = displayData.connected === true;
  const powerSupported = hasMqttConnection && displayData.powerUnsupported === false && (displayData.power === 'ON' || displayData.power === 'OFF');
  const brightnessSupported = hasMqttConnection && displayData.brightnessUnsupported === false && typeof displayData.brightness === 'number';

  const getRecentErrors = () => {
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
  };

  const recentErrors = getRecentErrors();

  const powerColorClass = powerSupported
    ? (displayData.power === 'ON' ? 'touchkio-power-value--on' : 'touchkio-power-value--off')
    : 'touchkio-power-value--unsupported';

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content touchkio-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="touchkio-modal-header">
          <h3>Touchkio Display: {displayData.hostname}</h3>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="touchkio-modal-body">
          {message && (
            <div className={`admin-message admin-message-${messageType} admin-mb-15`}>
              {message}
            </div>
          )}

          {/* Unsupported Hardware Warning */}
          {(!powerSupported || !brightnessSupported) && (
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
          )}

          {/* System Status Grid */}
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

          {/* Page URL Section */}
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
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/room/display"
                  className="touchkio-url-input"
                />
                <div className="touchkio-url-actions">
                  <button type="button" className="admin-primary-button admin-btn-sm" onClick={handleSaveUrl}>Save &amp; Apply</button>
                  <button type="button" className="admin-secondary-button admin-btn-sm" onClick={handleCancelEditUrl}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Control Sections in 2 Columns */}
          <div className="touchkio-controls-grid">
            {/* Left Column */}
            <div>
              {/* Power & Theme Toggles */}
              <div className="touchkio-control-section">
                <h4 className="touchkio-control-title">Quick Controls</h4>
                
                {/* Power Toggle */}
                <div className={`touchkio-toggle-row ${!powerSupported ? 'touchkio-toggle-row--disabled' : ''}`}>
                  <div>
                    <div className="touchkio-toggle-label">
                      Display Power {!powerSupported && <span className="touchkio-toggle-unsupported">(Unsupported)</span>}
                    </div>
                    <div className={`touchkio-toggle-status ${powerSupported ? (displayData.power === 'ON' ? 'touchkio-toggle-status--on' : 'touchkio-toggle-status--off') : 'touchkio-toggle-status--na'}`}>
                      {powerSupported ? (displayData.power === 'ON' ? 'ON' : displayData.power === 'OFF' ? 'OFF' : 'Unknown') : 'N/A'}
                    </div>
                  </div>
                  <label className="touchkio-toggle-switch" style={{ cursor: powerSupported ? 'pointer' : 'not-allowed' }}>
                    <input
                      type="checkbox"
                      checked={displayData.power === 'ON'}
                      onChange={(e) => powerSupported && onPowerCommand(mqttIdentifier, e.target.checked)}
                      disabled={!powerSupported}
                    />
                    <span className={`touchkio-toggle-track ${displayData.power === 'ON' ? 'touchkio-toggle-track--on' : 'touchkio-toggle-track--off'}`}>
                      <span className={`touchkio-toggle-thumb ${displayData.power === 'ON' ? 'touchkio-toggle-thumb--on' : 'touchkio-toggle-thumb--off'}`}></span>
                    </span>
                  </label>
                </div>

                {/* Theme Toggle */}
                <div className="touchkio-toggle-row">
                  <div>
                    <div className="touchkio-toggle-label">Theme</div>
                    <div className="touchkio-toggle-status touchkio-toggle-status--info">{displayData.theme || 'Unknown'}</div>
                  </div>
                  <label className="touchkio-toggle-switch" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={displayData.theme === 'Dark'}
                      onChange={(e) => onThemeCommand(mqttIdentifier, e.target.checked ? 'Dark' : 'Light')}
                    />
                    <span className={`touchkio-toggle-track ${displayData.theme === 'Dark' ? 'touchkio-toggle-track--dark' : 'touchkio-toggle-track--light'}`}>
                      <span className={`touchkio-toggle-thumb-theme ${displayData.theme === 'Dark' ? 'touchkio-toggle-thumb--on' : 'touchkio-toggle-thumb--off'}`}>
                        {displayData.theme === 'Dark' ? '🌙' : '☀️'}
                      </span>
                    </span>
                  </label>
                </div>

                {/* Refresh Button */}
                <button type="button" className="admin-secondary-button admin-w-full admin-btn-sm" onClick={() => onRefreshCommand(mqttIdentifier)}>
                  🔄 Refresh Page
                </button>
              </div>

              {/* Sliders */}
              <div className="touchkio-control-section">
                <h4 className="touchkio-control-title">Adjustments</h4>
                
                {/* Brightness */}
                <div className={`touchkio-slider-group ${!brightnessSupported ? 'touchkio-slider-group--disabled' : ''}`}>
                  <div className="touchkio-slider-header">
                    <span className="touchkio-slider-label">
                      Brightness {!brightnessSupported && <span className="touchkio-toggle-unsupported">(Unsupported)</span>}
                    </span>
                    <span className="touchkio-slider-value">
                      {brightnessSupported ? (brightness !== undefined ? brightness : displayData.brightness || 200) : 'N/A'}
                    </span>
                  </div>
                  <input
                    type="range" min="0" max="255"
                    value={brightness !== undefined ? brightness : displayData.brightness || 200}
                    onChange={(e) => brightnessSupported && onBrightnessChange(parseInt(e.target.value, 10), false)}
                    onMouseUp={(e) => brightnessSupported && onBrightnessChange(parseInt(e.target.value, 10), true)}
                    onTouchEnd={(e) => brightnessSupported && onBrightnessChange(parseInt(e.target.value, 10), true)}
                    disabled={!brightnessSupported}
                    className="touchkio-slider"
                  />
                </div>

                {/* Volume */}
                <div className="touchkio-slider-group">
                  <div className="touchkio-slider-header">
                    <span className="touchkio-slider-label">Volume</span>
                    <span className="touchkio-slider-value">{volume !== undefined ? volume : displayData.volume || 50}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100"
                    value={volume !== undefined ? volume : displayData.volume || 50}
                    onChange={(e) => onVolumeChange(parseInt(e.target.value, 10), false)}
                    onMouseUp={(e) => onVolumeChange(parseInt(e.target.value, 10), true)}
                    onTouchEnd={(e) => onVolumeChange(parseInt(e.target.value, 10), true)}
                    className="touchkio-slider"
                  />
                </div>

                {/* Page Zoom */}
                <div className="touchkio-slider-group">
                  <div className="touchkio-slider-header">
                    <span className="touchkio-slider-label">Page Zoom</span>
                    <span className="touchkio-slider-value">{zoom !== undefined ? zoom : displayData.pageZoom || 100}%</span>
                  </div>
                  <input
                    type="range" min="25" max="400" step="5"
                    value={zoom !== undefined ? zoom : displayData.pageZoom || 100}
                    onChange={(e) => onZoomChange(parseInt(e.target.value, 10), false)}
                    onMouseUp={(e) => onZoomChange(parseInt(e.target.value, 10), true)}
                    onTouchEnd={(e) => onZoomChange(parseInt(e.target.value, 10), true)}
                    className="touchkio-slider"
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              {/* Kiosk Mode */}
              <div className="touchkio-control-section">
                <h4 className="touchkio-control-title" style={{ marginBottom: '0.25rem' }}>Kiosk Mode</h4>
                <div className="touchkio-kiosk-current">
                  Current: <span>{displayData.kioskStatus || 'unknown'}</span>
                </div>
                <div className="touchkio-kiosk-grid">
                  {['Fullscreen', 'Maximized', 'Framed', 'Minimized'].map(mode => {
                    const isActive = displayData.kioskStatus === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        className={`${isActive ? 'admin-primary-button' : 'admin-secondary-button'} touchkio-kiosk-button ${isActive ? 'touchkio-kiosk-button--active' : ''}`}
                        onClick={() => onKioskCommand(mqttIdentifier, mode)}
                      >
                        {isActive ? `✓ ${mode}` : mode}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* System Controls */}
              <div className="touchkio-danger-section">
                <h4 className="touchkio-danger-title">System Controls</h4>
                <button
                  type="button"
                  className="admin-secondary-button touchkio-reboot-button"
                  onClick={() => { if (window.confirm(`Reboot ${hostname}?`)) onRebootCommand(mqttIdentifier); }}
                >
                  Reboot Device
                </button>
                <button
                  type="button"
                  className="admin-secondary-button touchkio-shutdown-button"
                  onClick={() => { if (window.confirm(`Shutdown ${hostname}? This will turn off the device!`)) onShutdownCommand(mqttIdentifier); }}
                >
                  Shutdown Device
                </button>
              </div>
            </div>
          </div>

          {/* Recent Errors */}
          {recentErrors.length > 0 && (
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
          )}
        </div>

        <div className="touchkio-modal-footer">
          <button type="button" className="admin-secondary-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default TouchkioModal;
