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

  // Auto-refresh display data every 5 seconds
  useEffect(() => {
    if (!show || !display) return;
    
    const interval = setInterval(() => {
      if (onRefreshDisplay) {
        onRefreshDisplay();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [show, display, onRefreshDisplay]);

  if (!show || !display) return null;

  // Get pageUrl from either mqtt object or direct property
  const currentPageUrl = display.mqtt?.pageUrl || display.pageUrl || '';

  const handleStartEditUrl = () => {
    setUrlInput(currentPageUrl);
    setEditingUrl(true);
  };

  const handleSaveUrl = () => {
    if (onPageUrlChange) {
      // Use deviceId if available, otherwise fall back to hostname
      const identifier = displayData.deviceId || displayData.hostname;
      console.log('[TouchkioModal] Sending page URL command for:', identifier, 'URL:', urlInput);
      onPageUrlChange(identifier, urlInput);
    }
    setEditingUrl(false);
  };

  const handleCancelEditUrl = () => {
    setEditingUrl(false);
    setUrlInput('');
  };

  // Get display data from either mqtt object or direct properties
  const displayData = display.mqtt || display;
  const hostname = displayData.hostname;

  // Filter errors to only show ERROR entries from last hour
  const getRecentErrors = () => {
    if (!displayData.errors || Object.keys(displayData.errors).length === 0) {
      return [];
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const errors = [];

    Object.entries(displayData.errors).forEach(([timestamp, logs]) => {
      // Parse timestamp (format: "2026-03-13T13:45")
      const logDate = new Date(timestamp);
      
      if (logDate >= oneHourAgo) {
        logs.forEach((log) => {
          const logType = Object.keys(log)[0];
          if (logType === 'ERROR') {
            errors.push({
              timestamp,
              message: log[logType]
            });
          }
        });
      }
    });

    return errors;
  };

  const recentErrors = getRecentErrors();

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '950px', maxHeight: '90vh', overflowY: 'auto', background: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div className="admin-modal-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.5rem' }}>
          <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.25rem' }}>Touchkio Display: {displayData.hostname}</h3>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="admin-modal-body" style={{ padding: '1.5rem' }}>
          {message && (
            <div className={`admin-message admin-message-${messageType}`} style={{ marginBottom: '1.5rem' }}>
              {message}
            </div>
          )}

          {/* System Status Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ 
              padding: '1.25rem', 
              background: '#2d3142',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Display Status</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: displayData.power === 'ON' ? '#22c55e' : '#ef4444', marginBottom: '0.5rem' }}>
                {displayData.power || 'UNKNOWN'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
                Brightness: <strong>{displayData.brightness || '-'}</strong>
              </div>
            </div>

            <div style={{ 
              padding: '1.25rem', 
              background: '#2d3142',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>System Resources</div>
              <div style={{ fontSize: '0.875rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div>CPU: <strong style={{ color: '#f1f5f9' }}>{displayData.cpuUsage !== undefined ? `${displayData.cpuUsage}%` : '-'}</strong></div>
                <div>Memory: <strong style={{ color: '#f1f5f9' }}>{displayData.memoryUsage !== undefined ? `${displayData.memoryUsage}%` : '-'}</strong></div>
                <div>Temp: <strong style={{ color: '#f1f5f9' }}>{displayData.temperature !== undefined ? `${displayData.temperature}°C` : '-'}</strong></div>
              </div>
            </div>

            <div style={{ 
              padding: '1.25rem', 
              background: '#2d3142',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Display Mode</div>
              <div style={{ fontSize: '0.875rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div>Kiosk: <strong style={{ color: '#f1f5f9' }}>{displayData.kioskStatus || '-'}</strong></div>
                <div>Theme: <strong style={{ color: '#f1f5f9' }}>{displayData.theme || '-'}</strong></div>
                <div>Volume: <strong style={{ color: '#f1f5f9' }}>{displayData.volume !== undefined ? `${displayData.volume}%` : '-'}</strong></div>
              </div>
            </div>

            <div style={{ 
              padding: '1.25rem', 
              background: '#2d3142',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Network</div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', wordBreak: 'break-all', marginBottom: '0.5rem' }}>
                {displayData.networkAddress || '-'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
                Uptime: <strong style={{ color: '#f1f5f9' }}>{displayData.uptime !== undefined ? `${Math.floor(displayData.uptime / 60)}h ${displayData.uptime % 60}m` : '-'}</strong>
              </div>
            </div>
          </div>

          {/* Error Log Section */}
          {displayData.errors && Object.keys(displayData.errors).length > 0 && (
            <div style={{ 
              marginBottom: '2rem',
              padding: '1.25rem',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Recent Errors & Logs
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {Object.entries(displayData.errors).map(([timestamp, logs]) => (
                  <div key={timestamp} style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>{timestamp}</div>
                    {logs.map((log, idx) => {
                      const logType = Object.keys(log)[0];
                      const logMessage = log[logType];
                      const isError = logType === 'ERROR';
                      const isWarning = logType === 'WARN';
                      
                      return (
                        <div 
                          key={idx} 
                          style={{ 
                            fontSize: '0.75rem', 
                            color: isError ? '#fca5a5' : isWarning ? '#fbbf24' : '#cbd5e1',
                            marginBottom: '0.25rem',
                            paddingLeft: '0.5rem',
                            borderLeft: `2px solid ${isError ? '#ef4444' : isWarning ? '#f59e0b' : '#475569'}`,
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}
                        >
                          <strong>[{logType}]</strong> {logMessage.length > 200 ? logMessage.substring(0, 200) + '...' : logMessage}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Page URL Section */}
          <div style={{ 
            marginBottom: '2rem',
            padding: '1.25rem',
            background: '#2d3142',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Page URL
            </div>
            {!editingUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ 
                  flex: 1, 
                  fontSize: '0.875rem', 
                  color: currentPageUrl ? '#cbd5e1' : '#94a3b8',
                  fontStyle: currentPageUrl ? 'normal' : 'italic',
                  wordBreak: 'break-all',
                  padding: '0.5rem',
                  background: '#1e293b',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  {currentPageUrl || 'No URL configured'}
                </div>
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={handleStartEditUrl}
                  style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}
                >
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
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    fontSize: '0.875rem',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    color: '#f1f5f9',
                    marginBottom: '0.75rem'
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="admin-primary-button"
                    onClick={handleSaveUrl}
                    style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                  >
                    Save & Apply
                  </button>
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={handleCancelEditUrl}
                    style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Control Sections in 2 Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            {/* Left Column */}
            <div>
              {/* Display Controls */}
              <div style={{ 
                marginBottom: '1.5rem',
                padding: '1.25rem',
                background: '#2d3142',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Display Controls</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    className="admin-primary-button"
                    onClick={() => onPowerCommand(hostname, true)}
                    style={{ width: '100%', fontSize: '0.875rem', padding: '0.625rem' }}
                  >
                    Turn On
                  </button>
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => onPowerCommand(hostname, false)}
                    style={{ width: '100%', fontSize: '0.875rem', padding: '0.625rem' }}
                  >
                    Turn Off
                  </button>
                </div>
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() => onRefreshCommand(hostname)}
                  style={{ width: '100%', fontSize: '0.875rem', padding: '0.625rem' }}
                >
                  Refresh Page
                </button>
              </div>

              {/* Brightness Control */}
              <div style={{ 
                marginBottom: '1.5rem',
                padding: '1.25rem',
                background: '#2d3142',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Brightness</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={brightness !== undefined ? brightness : displayData.brightness || 200}
                    onChange={(e) => onBrightnessChange(parseInt(e.target.value, 10), false)}
                    onMouseUp={(e) => onBrightnessChange(parseInt(e.target.value, 10), true)}
                    onTouchEnd={(e) => onBrightnessChange(parseInt(e.target.value, 10), true)}
                    style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.2)', outline: 'none', cursor: 'pointer' }}
                  />
                  <span style={{ minWidth: '50px', fontWeight: 'bold', fontSize: '1.125rem', color: '#3b82f6', textAlign: 'right' }}>
                    {brightness !== undefined ? brightness : displayData.brightness || 200}
                  </span>
                </div>
              </div>

              {/* Volume Control */}
              <div style={{ 
                marginBottom: '1.5rem',
                padding: '1.25rem',
                background: '#2d3142',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Volume</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume !== undefined ? volume : displayData.volume || 50}
                    onChange={(e) => onVolumeChange(parseInt(e.target.value, 10), false)}
                    onMouseUp={(e) => onVolumeChange(parseInt(e.target.value, 10), true)}
                    onTouchEnd={(e) => onVolumeChange(parseInt(e.target.value, 10), true)}
                    style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.2)', outline: 'none', cursor: 'pointer' }}
                  />
                  <span style={{ minWidth: '50px', fontWeight: 'bold', fontSize: '1.125rem', color: '#3b82f6', textAlign: 'right' }}>
                    {volume !== undefined ? volume : displayData.volume || 50}%
                  </span>
                </div>
              </div>

              {/* Page Zoom */}
              <div style={{ 
                padding: '1.25rem',
                background: '#2d3142',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Page Zoom</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="range"
                    min="25"
                    max="400"
                    step="5"
                    value={zoom !== undefined ? zoom : displayData.pageZoom || 100}
                    onChange={(e) => onZoomChange(parseInt(e.target.value, 10), false)}
                    onMouseUp={(e) => onZoomChange(parseInt(e.target.value, 10), true)}
                    onTouchEnd={(e) => onZoomChange(parseInt(e.target.value, 10), true)}
                    style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.2)', outline: 'none', cursor: 'pointer' }}
                  />
                  <span style={{ minWidth: '60px', fontWeight: 'bold', fontSize: '1.125rem', color: '#3b82f6', textAlign: 'right' }}>
                    {zoom !== undefined ? zoom : displayData.pageZoom || 100}%
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              {/* Kiosk Mode */}
              <div style={{ 
                marginBottom: '1.5rem',
                padding: '1.25rem',
                background: '#2d3142',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px'
              }}>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Kiosk Mode</h4>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                  Current: <span style={{ color: displayData.kioskStatus ? '#3b82f6' : '#94a3b8', fontWeight: 600 }}>{displayData.kioskStatus || 'unknown'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {['Fullscreen', 'Maximized', 'Framed', 'Minimized'].map(mode => {
                    const isActive = displayData.kioskStatus === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        className={isActive ? 'admin-primary-button' : 'admin-secondary-button'}
                        onClick={() => onKioskCommand(hostname, mode)}
                        style={{ 
                          width: '100%',
                          fontSize: '0.875rem',
                          padding: '0.625rem',
                          ...(isActive ? { boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)' } : {})
                        }}
                      >
                        {isActive ? `✓ ${mode}` : mode}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Theme */}
              <div style={{ 
                marginBottom: '1.5rem',
                padding: '1.25rem',
                background: '#2d3142',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px'
              }}>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Theme</h4>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                  Current: <span style={{ color: displayData.theme ? '#3b82f6' : '#94a3b8', fontWeight: 600 }}>{displayData.theme || 'unknown'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {['Light', 'Dark'].map(theme => {
                    const isActive = displayData.theme === theme;
                    return (
                      <button
                        key={theme}
                        type="button"
                        className={isActive ? 'admin-primary-button' : 'admin-secondary-button'}
                        onClick={() => onThemeCommand(hostname, theme)}
                        style={{ 
                          width: '100%',
                          fontSize: '0.875rem',
                          padding: '0.625rem',
                          ...(isActive ? { boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)' } : {})
                        }}
                      >
                        {isActive ? `✓ ${theme}` : theme}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* System Controls */}
              <div style={{ 
                padding: '1.25rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>System Controls</h4>
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() => {
                    if (window.confirm(`Reboot ${hostname}?`)) {
                      onRebootCommand(hostname);
                    }
                  }}
                  style={{ 
                    width: '100%',
                    marginBottom: '0.5rem',
                    background: 'rgba(251, 191, 36, 0.2)',
                    borderColor: 'rgba(251, 191, 36, 0.5)',
                    color: '#fbbf24',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    padding: '0.625rem'
                  }}
                >
                  Reboot Device
                </button>
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() => {
                    if (window.confirm(`Shutdown ${hostname}? This will turn off the device!`)) {
                      onShutdownCommand(hostname);
                    }
                  }}
                  style={{ 
                    width: '100%',
                    background: 'rgba(239, 68, 68, 0.2)',
                    borderColor: 'rgba(239, 68, 68, 0.5)',
                    color: '#ef4444',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    padding: '0.625rem'
                  }}
                >
                  Shutdown Device
                </button>
              </div>
            </div>
          </div>

          {/* Recent Errors Section (Last Hour Only) */}
          {recentErrors.length > 0 && (
            <div style={{ 
              marginTop: '2rem',
              padding: '1.25rem',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Recent Errors (Last Hour)
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {recentErrors.map((error, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      fontSize: '0.75rem', 
                      color: '#fca5a5',
                      marginBottom: '0.75rem',
                      paddingLeft: '0.5rem',
                      borderLeft: '2px solid #ef4444',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>{error.timestamp}</div>
                    {error.message.length > 300 ? error.message.substring(0, 300) + '...' : error.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="admin-modal-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="admin-secondary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TouchkioModal;
