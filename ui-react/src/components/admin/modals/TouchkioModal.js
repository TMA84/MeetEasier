import React from 'react';

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
  onShutdownCommand
}) => {
  if (!show || !display) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '950px', maxHeight: '90vh', overflowY: 'auto', background: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div className="admin-modal-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.5rem' }}>
          <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.25rem' }}>Touchkio Display: {display.hostname}</h3>
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
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: display.power === 'ON' ? '#22c55e' : '#ef4444', marginBottom: '0.5rem' }}>
                {display.power || 'UNKNOWN'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
                Brightness: <strong>{display.brightness || '-'}</strong>
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
                <div>CPU: <strong style={{ color: '#f1f5f9' }}>{display.cpuUsage !== undefined ? `${display.cpuUsage}%` : '-'}</strong></div>
                <div>Memory: <strong style={{ color: '#f1f5f9' }}>{display.memoryUsage !== undefined ? `${display.memoryUsage}%` : '-'}</strong></div>
                <div>Temp: <strong style={{ color: '#f1f5f9' }}>{display.temperature !== undefined ? `${display.temperature}°C` : '-'}</strong></div>
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
                <div>Kiosk: <strong style={{ color: '#f1f5f9' }}>{display.kioskStatus || '-'}</strong></div>
                <div>Theme: <strong style={{ color: '#f1f5f9' }}>{display.theme || '-'}</strong></div>
                <div>Volume: <strong style={{ color: '#f1f5f9' }}>{display.volume !== undefined ? `${display.volume}%` : '-'}</strong></div>
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
                {display.networkAddress || '-'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
                Uptime: <strong style={{ color: '#f1f5f9' }}>{display.uptime !== undefined ? `${Math.floor(display.uptime / 60)}h ${display.uptime % 60}m` : '-'}</strong>
              </div>
            </div>
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
                    onClick={() => onPowerCommand(display.hostname, true)}
                    style={{ width: '100%', fontSize: '0.875rem', padding: '0.625rem' }}
                  >
                    Turn On
                  </button>
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => onPowerCommand(display.hostname, false)}
                    style={{ width: '100%', fontSize: '0.875rem', padding: '0.625rem' }}
                  >
                    Turn Off
                  </button>
                </div>
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() => onRefreshCommand(display.hostname)}
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
                    value={brightness !== undefined ? brightness : display.brightness || 200}
                    onChange={(e) => onBrightnessChange(parseInt(e.target.value, 10), false)}
                    onMouseUp={(e) => onBrightnessChange(parseInt(e.target.value, 10), true)}
                    onTouchEnd={(e) => onBrightnessChange(parseInt(e.target.value, 10), true)}
                    style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.2)', outline: 'none', cursor: 'pointer' }}
                  />
                  <span style={{ minWidth: '50px', fontWeight: 'bold', fontSize: '1.125rem', color: '#3b82f6', textAlign: 'right' }}>
                    {brightness !== undefined ? brightness : display.brightness || 200}
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
                    value={volume !== undefined ? volume : display.volume || 50}
                    onChange={(e) => onVolumeChange(parseInt(e.target.value, 10), false)}
                    onMouseUp={(e) => onVolumeChange(parseInt(e.target.value, 10), true)}
                    onTouchEnd={(e) => onVolumeChange(parseInt(e.target.value, 10), true)}
                    style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.2)', outline: 'none', cursor: 'pointer' }}
                  />
                  <span style={{ minWidth: '50px', fontWeight: 'bold', fontSize: '1.125rem', color: '#3b82f6', textAlign: 'right' }}>
                    {volume !== undefined ? volume : display.volume || 50}%
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
                    value={zoom !== undefined ? zoom : display.pageZoom || 100}
                    onChange={(e) => onZoomChange(parseInt(e.target.value, 10), false)}
                    onMouseUp={(e) => onZoomChange(parseInt(e.target.value, 10), true)}
                    onTouchEnd={(e) => onZoomChange(parseInt(e.target.value, 10), true)}
                    style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.2)', outline: 'none', cursor: 'pointer' }}
                  />
                  <span style={{ minWidth: '60px', fontWeight: 'bold', fontSize: '1.125rem', color: '#3b82f6', textAlign: 'right' }}>
                    {zoom !== undefined ? zoom : display.pageZoom || 100}%
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
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Kiosk Mode</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {['Fullscreen', 'Maximized', 'Framed', 'Minimized'].map(mode => (
                    <button
                      key={mode}
                      type="button"
                      className={display.kioskStatus === mode ? 'admin-primary-button' : 'admin-secondary-button'}
                      onClick={() => onKioskCommand(display.hostname, mode)}
                      style={{ 
                        width: '100%',
                        fontSize: '0.875rem',
                        padding: '0.625rem'
                      }}
                    >
                      {mode}
                    </button>
                  ))}
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
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Theme</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={display.theme === 'Light' ? 'admin-primary-button' : 'admin-secondary-button'}
                    onClick={() => onThemeCommand(display.hostname, 'Light')}
                    style={{ 
                      width: '100%',
                      fontSize: '0.875rem',
                      padding: '0.625rem'
                    }}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    className={display.theme === 'Dark' ? 'admin-primary-button' : 'admin-secondary-button'}
                    onClick={() => onThemeCommand(display.hostname, 'Dark')}
                    style={{ 
                      width: '100%',
                      fontSize: '0.875rem',
                      padding: '0.625rem'
                    }}
                  >
                    Dark
                  </button>
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
                    if (window.confirm(`Reboot ${display.hostname}?`)) {
                      onRebootCommand(display.hostname);
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
                    if (window.confirm(`Shutdown ${display.hostname}? This will turn off the device!`)) {
                      onShutdownCommand(display.hostname);
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
