#!/usr/bin/env node

/**
 * Patch Script für Touchkio UI
 * Ersetzt die Card-Ansicht durch eine kompakte Tabelle mit Modal
 */

const fs = require('fs');
const path = require('path');

const adminFilePath = path.join(__dirname, 'ui-react/src/components/admin/Admin.js');

console.log('📝 Patching Touchkio UI...');
console.log('File:', adminFilePath);

// Lese die Datei
let content = fs.readFileSync(adminFilePath, 'utf8');

// Finde und ersetze die MQTT Displays Sektion
const searchStart = `<h3>{t.mqttDisplaysSectionTitle || 'Touchkio Displays'}</h3>`;
const searchEnd = `)}

              </div>
              )}

              {activeTab === 'connectedDisplays'`;

const startIndex = content.indexOf(searchStart);
const endIndex = content.indexOf(searchEnd, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.error('❌ Could not find MQTT Displays section!');
  process.exit(1);
}

console.log('✅ Found MQTT Displays section');
console.log('   Start:', startIndex);
console.log('   End:', endIndex);

// Neue UI (kompakte Tabelle + Modal)
const newUI = `<h3>{t.mqttDisplaysSectionTitle || 'Touchkio Displays'}</h3>
              <button 
                type="button" 
                className="admin-secondary-button" 
                onClick={this.handleLoadMqttDisplays}
                disabled={this.state.mqttDisplaysLoading}
                style={{ marginBottom: '1rem' }}
              >
                {this.state.mqttDisplaysLoading ? t.loading : (t.mqttDisplaysRefreshButton || 'Refresh')}
              </button>

              {this.state.mqttDisplays && this.state.mqttDisplays.length === 0 ? (
                <div className="admin-locked-message">
                  <p>{t.mqttDisplaysEmpty || 'No Touchkio displays connected.'}</p>
                </div>
              ) : (
                <div className="admin-displays-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Hostname</th>
                        <th>Status</th>
                        <th>CPU</th>
                        <th>Memory</th>
                        <th>Temp</th>
                        <th>Last Update</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(this.state.mqttDisplays || []).map((display) => (
                        <tr key={display.hostname}>
                          <td>
                            <strong>{display.hostname}</strong>
                          </td>
                          <td>
                            <span style={{ 
                              color: display.power === 'ON' ? '#28a745' : '#dc3545',
                              fontWeight: 'bold'
                            }}>
                              {display.power === 'ON' ? '● ON' : '● OFF'}
                            </span>
                          </td>
                          <td>{display.cpuUsage !== undefined ? \`\${display.cpuUsage}%\` : '-'}</td>
                          <td>{display.memoryUsage !== undefined ? \`\${display.memoryUsage}%\` : '-'}</td>
                          <td>{display.temperature !== undefined ? \`\${display.temperature}°C\` : '-'}</td>
                          <td style={{ fontSize: '0.85rem' }}>
                            {display.lastUpdate ? new Date(display.lastUpdate).toLocaleString('de-DE', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }) : '-'}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="admin-secondary-button"
                              onClick={() => this.handleMqttRefreshCommand(display.hostname)}
                              style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', fontSize: '0.85rem' }}
                              title="Refresh"
                            >
                              🔄
                            </button>
                            <button
                              type="button"
                              className="admin-secondary-button"
                              onClick={() => {
                                if (window.confirm(\`Reboot \${display.hostname}?\`)) {
                                  this.handleMqttRebootCommand(display.hostname);
                                }
                              }}
                              style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', fontSize: '0.85rem', backgroundColor: '#ffc107' }}
                              title="Reboot"
                            >
                              ⚡
                            </button>
                            <button
                              type="button"
                              className="admin-primary-button"
                              onClick={() => this.handleOpenTouchkioModal(display)}
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Touchkio Details Modal */}
              {this.state.showTouchkioModal && this.state.touchkioModalDisplay && (
                <div className="admin-modal-overlay" onClick={this.handleCloseTouchkioModal}>
                  <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div className="admin-modal-header">
                      <h3>🖥️ {this.state.touchkioModalDisplay.hostname}</h3>
                      <button className="admin-modal-close" onClick={this.handleCloseTouchkioModal}>×</button>
                    </div>

                    <div className="admin-modal-body">
                      {this.state.touchkioModalMessage && (
                        <div className={\`admin-message admin-message-\${this.state.touchkioModalMessageType}\`} style={{ marginBottom: '1rem' }}>
                          {this.state.touchkioModalMessage}
                        </div>
                      )}

                      {/* Status Overview */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(2, 1fr)', 
                        gap: '1rem',
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '4px'
                      }}>
                        <div>
                          <strong>📺 Display</strong>
                          <div>Power: <span style={{ color: this.state.touchkioModalDisplay.power === 'ON' ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>{this.state.touchkioModalDisplay.power || 'UNKNOWN'}</span></div>
                          <div>Brightness: {this.state.touchkioModalDisplay.brightness || '-'}</div>
                        </div>
                        <div>
                          <strong>🖼️ Kiosk & Theme</strong>
                          <div>Mode: {this.state.touchkioModalDisplay.kioskStatus || '-'}</div>
                          <div>Theme: {this.state.touchkioModalDisplay.theme || '-'}</div>
                        </div>
                        <div>
                          <strong>💻 System</strong>
                          <div>CPU: {this.state.touchkioModalDisplay.cpuUsage !== undefined ? \`\${this.state.touchkioModalDisplay.cpuUsage}%\` : '-'}</div>
                          <div>Memory: {this.state.touchkioModalDisplay.memoryUsage !== undefined ? \`\${this.state.touchkioModalDisplay.memoryUsage}%\` : '-'}</div>
                          <div>Temp: {this.state.touchkioModalDisplay.temperature !== undefined ? \`\${this.state.touchkioModalDisplay.temperature}°C\` : '-'}</div>
                        </div>
                        <div>
                          <strong>🌐 Network</strong>
                          <div style={{ fontSize: '0.9rem' }}>IP: {this.state.touchkioModalDisplay.networkAddress || '-'}</div>
                          <div>Uptime: {this.state.touchkioModalDisplay.uptime !== undefined ? \`\${Math.floor(this.state.touchkioModalDisplay.uptime / 60)}h \${this.state.touchkioModalDisplay.uptime % 60}m\` : '-'}</div>
                        </div>
                      </div>

                      {/* Power Controls */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>⚡ Power Control</h4>
                        <button
                          type="button"
                          className="admin-secondary-button"
                          onClick={() => this.handleMqttPowerCommandModal(this.state.touchkioModalDisplay.hostname, true)}
                          style={{ marginRight: '0.5rem' }}
                        >
                          Turn On
                        </button>
                        <button
                          type="button"
                          className="admin-secondary-button"
                          onClick={() => this.handleMqttPowerCommandModal(this.state.touchkioModalDisplay.hostname, false)}
                          style={{ marginRight: '0.5rem' }}
                        >
                          Turn Off
                        </button>
                        <button
                          type="button"
                          className="admin-secondary-button"
                          onClick={() => this.handleMqttRefreshCommandModal(this.state.touchkioModalDisplay.hostname)}
                        >
                          🔄 Refresh
                        </button>
                      </div>

                      {/* Brightness Control */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>💡 Brightness</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={this.state.touchkioModalBrightness !== undefined ? this.state.touchkioModalBrightness : this.state.touchkioModalDisplay.brightness || 100}
                            onChange={(e) => this.setState({ touchkioModalBrightness: parseInt(e.target.value, 10) })}
                            onMouseUp={(e) => this.handleMqttBrightnessCommandModal(this.state.touchkioModalDisplay.hostname, parseInt(e.target.value, 10))}
                            onTouchEnd={(e) => this.handleMqttBrightnessCommandModal(this.state.touchkioModalDisplay.hostname, parseInt(e.target.value, 10))}
                            style={{ flex: 1 }}
                          />
                          <span style={{ minWidth: '50px' }}>
                            {this.state.touchkioModalBrightness !== undefined ? this.state.touchkioModalBrightness : this.state.touchkioModalDisplay.brightness || 100}
                          </span>
                        </div>
                      </div>

                      {/* Kiosk Mode */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>🖥️ Kiosk Mode</h4>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {['Fullscreen', 'Maximized', 'Framed', 'Minimized'].map(mode => (
                            <button
                              key={mode}
                              type="button"
                              className="admin-secondary-button"
                              onClick={() => this.handleMqttKioskCommandModal(this.state.touchkioModalDisplay.hostname, mode)}
                              style={{ 
                                backgroundColor: this.state.touchkioModalDisplay.kioskStatus === mode ? '#007bff' : undefined,
                                color: this.state.touchkioModalDisplay.kioskStatus === mode ? 'white' : undefined
                              }}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Theme */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>🎨 Theme</h4>
                        <button
                          type="button"
                          className="admin-secondary-button"
                          onClick={() => this.handleMqttThemeCommandModal(this.state.touchkioModalDisplay.hostname, 'Light')}
                          style={{ 
                            marginRight: '0.5rem',
                            backgroundColor: this.state.touchkioModalDisplay.theme === 'Light' ? '#007bff' : undefined,
                            color: this.state.touchkioModalDisplay.theme === 'Light' ? 'white' : undefined
                          }}
                        >
                          ☀️ Light
                        </button>
                        <button
                          type="button"
                          className="admin-secondary-button"
                          onClick={() => this.handleMqttThemeCommandModal(this.state.touchkioModalDisplay.hostname, 'Dark')}
                          style={{ 
                            backgroundColor: this.state.touchkioModalDisplay.theme === 'Dark' ? '#007bff' : undefined,
                            color: this.state.touchkioModalDisplay.theme === 'Dark' ? 'white' : undefined
                          }}
                        >
                          🌙 Dark
                        </button>
                      </div>

                      {/* Volume Control */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>🔊 Volume</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={this.state.touchkioModalVolume !== undefined ? this.state.touchkioModalVolume : this.state.touchkioModalDisplay.volume || 50}
                            onChange={(e) => this.setState({ touchkioModalVolume: parseInt(e.target.value, 10) })}
                            onMouseUp={(e) => this.handleMqttVolumeCommandModal(this.state.touchkioModalDisplay.hostname, parseInt(e.target.value, 10))}
                            onTouchEnd={(e) => this.handleMqttVolumeCommandModal(this.state.touchkioModalDisplay.hostname, parseInt(e.target.value, 10))}
                            style={{ flex: 1 }}
                          />
                          <span style={{ minWidth: '50px' }}>
                            {this.state.touchkioModalVolume !== undefined ? this.state.touchkioModalVolume : this.state.touchkioModalDisplay.volume || 50}%
                          </span>
                        </div>
                      </div>

                      {/* Page Zoom */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>🔍 Page Zoom</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <input
                            type="range"
                            min="25"
                            max="400"
                            step="5"
                            value={this.state.touchkioModalZoom !== undefined ? this.state.touchkioModalZoom : this.state.touchkioModalDisplay.pageZoom || 100}
                            onChange={(e) => this.setState({ touchkioModalZoom: parseInt(e.target.value, 10) })}
                            onMouseUp={(e) => this.handleMqttPageZoomCommandModal(this.state.touchkioModalDisplay.hostname, parseInt(e.target.value, 10))}
                            onTouchEnd={(e) => this.handleMqttPageZoomCommandModal(this.state.touchkioModalDisplay.hostname, parseInt(e.target.value, 10))}
                            style={{ flex: 1 }}
                          />
                          <span style={{ minWidth: '60px' }}>
                            {this.state.touchkioModalZoom !== undefined ? this.state.touchkioModalZoom : this.state.touchkioModalDisplay.pageZoom || 100}%
                          </span>
                        </div>
                      </div>

                      {/* System Controls */}
                      <div style={{ marginBottom: '1rem', paddingTop: '1rem', borderTop: '1px solid #ddd' }}>
                        <h4 style={{ marginBottom: '0.5rem', color: '#dc3545' }}>⚠️ System Controls</h4>
                        <button
                          type="button"
                          className="admin-secondary-button"
                          onClick={() => {
                            if (window.confirm(\`Reboot \${this.state.touchkioModalDisplay.hostname}?\`)) {
                              this.handleMqttRebootCommandModal(this.state.touchkioModalDisplay.hostname);
                            }
                          }}
                          style={{ marginRight: '0.5rem', backgroundColor: '#ffc107' }}
                        >
                          🔄 Reboot
                        </button>
                        <button
                          type="button"
                          className="admin-secondary-button"
                          onClick={() => {
                            if (window.confirm(\`Shutdown \${this.state.touchkioModalDisplay.hostname}? This will turn off the device!\`)) {
                              this.handleMqttShutdownCommandModal(this.state.touchkioModalDisplay.hostname);
                            }
                          }}
                          style={{ backgroundColor: '#dc3545', color: 'white' }}
                        >
                          ⚡ Shutdown
                        </button>
                      </div>
                    </div>

                    <div className="admin-modal-footer">
                      <button type="button" className="admin-secondary-button" onClick={this.handleCloseTouchkioModal}>
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              </div>
              )}

              {activeTab === 'connectedDisplays'`;

// Ersetze den Inhalt
const before = content.substring(0, startIndex);
const after = content.substring(endIndex);
const newContent = before + newUI + after;

// Schreibe die Datei
fs.writeFileSync(adminFilePath, newContent, 'utf8');

console.log('✅ Successfully patched Touchkio UI!');
console.log('');
console.log('Next steps:');
console.log('1. Add Modal handler functions to Admin.js');
console.log('2. Add Modal state to constructor');
console.log('3. Rebuild: cd ui-react && npm run build');
