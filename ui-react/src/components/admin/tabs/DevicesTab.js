import React from 'react';

const DevicesTab = ({
  // Data
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
  systemMessage,
  systemMessageType,
  
  // Translations
  t,
  
  // Handlers
  onLoadDisplays,
  onOpenPowerManagement,
  onOpenTouchkioModal,
  onMqttRefresh,
  onMqttRefreshAll,
  onMqttRebootAll,
  onDeleteDisplay,
  onTrackingModeChange,
  onRetentionHoursChange,
  onCleanupMinutesChange,
  onSaveSettings
}) => {
  const hasMqttDisplays = connectedDisplays && connectedDisplays.filter(d => d.mqtt).length > 0;

  return (
    <div className="admin-card" id="ops-connected-displays">
      <div className="admin-form-divider"></div>

      <h3>{t.connectedDisplaysSectionTitle || 'Connected Displays'}</h3>
      
      {/* Action Buttons */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button 
          type="button" 
          className="admin-secondary-button" 
          onClick={onLoadDisplays}
          disabled={connectedDisplaysLoading}
        >
          {connectedDisplaysLoading ? t.loading : (t.connectedDisplaysRefreshButton || 'Refresh')}
        </button>
        <button 
          type="button" 
          className="admin-primary-button" 
          onClick={() => onOpenPowerManagement('__global__')}
        >
          {t.powerManagementGlobalButton || 'Global Standard'}
        </button>
        <button 
          type="button" 
          className="admin-secondary-button" 
          onClick={onMqttRefreshAll}
          disabled={connectedDisplaysLoading || !hasMqttDisplays}
          style={{ 
            background: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgba(59, 130, 246, 0.5)',
            color: '#3b82f6'
          }}
        >
          Refresh All Touchkio
        </button>
        <button 
          type="button" 
          className="admin-secondary-button" 
          onClick={onMqttRebootAll}
          disabled={connectedDisplaysLoading || !hasMqttDisplays}
          style={{ 
            background: 'rgba(251, 191, 36, 0.2)',
            borderColor: 'rgba(251, 191, 36, 0.5)',
            color: '#fbbf24'
          }}
        >
          Reboot All Touchkio
        </button>
      </div>

      {/* Messages */}
      {connectedDisplaysMessage && (
        <div className={`admin-message admin-message-${connectedDisplaysMessageType}`}>
          {connectedDisplaysMessage}
        </div>
      )}

      {/* Displays Table */}
      {connectedDisplays.length === 0 ? (
        <div className="admin-locked-message">
          <p>{t.connectedDisplaysEmpty || 'No displays connected.'}</p>
        </div>
      ) : (
        <div className="admin-displays-table-wrapper" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>Status</th>
                <th>Name</th>
                <th>Type</th>
                <th>Connection</th>
                <th>IP Address</th>
                <th>Details</th>
                <th style={{ minWidth: '200px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {connectedDisplays.map((display) => {
                const hasSocketIO = display.socketIO && display.socketIO.connected;
                const hasMQTT = display.mqtt && display.mqtt.connected;
                
                // Determine overall status
                let status, statusColor, statusDotColor;
                
                if (hasSocketIO && hasMQTT) {
                  const socketActive = display.socketIO.status === 'active';
                  const mqttOn = display.mqtt.power === 'ON' || display.mqtt.power === undefined;
                  
                  if (socketActive && mqttOn) {
                    status = 'Active';
                    statusColor = '#86efac';
                    statusDotColor = '#22c55e';
                  } else {
                    status = 'Partial';
                    statusColor = '#fcd34d';
                    statusDotColor = '#f59e0b';
                  }
                } else if (hasSocketIO) {
                  if (display.socketIO.status === 'active') {
                    status = 'Active';
                    statusColor = '#86efac';
                    statusDotColor = '#22c55e';
                  } else {
                    status = 'Inactive';
                    statusColor = '#fcd34d';
                    statusDotColor = '#f59e0b';
                  }
                } else if (hasMQTT) {
                  if (display.mqtt.power === 'ON') {
                    status = 'ON';
                    statusColor = '#86efac';
                    statusDotColor = '#22c55e';
                  } else {
                    status = 'OFF';
                    statusColor = '#fca5a5';
                    statusDotColor = '#ef4444';
                  }
                } else {
                  status = 'Disconnected';
                  statusColor = '#fca5a5';
                  statusDotColor = '#ef4444';
                }
                
                // Connection badges
                const connectionBadges = [];
                if (hasSocketIO) {
                  connectionBadges.push(
                    <span key="socket" style={{
                      display: 'inline-block',
                      padding: '0.125rem 0.5rem',
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      color: '#3b82f6',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      marginRight: '0.25rem',
                      whiteSpace: 'nowrap'
                    }}>
                      Socket.IO
                    </span>
                  );
                }
                if (hasMQTT) {
                  connectionBadges.push(
                    <span key="mqtt" style={{
                      display: 'inline-block',
                      padding: '0.125rem 0.5rem',
                      backgroundColor: 'rgba(34, 197, 94, 0.2)',
                      color: '#22c55e',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap'
                    }}>
                      MQTT
                    </span>
                  );
                }
                
                return (
                  <tr key={display.id}>
                    <td className="status-cell" style={{ textAlign: 'center', padding: '0.5rem' }}>
                      <span 
                        style={{
                          display: 'inline-block',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: statusDotColor,
                        }}
                        title={status}
                      ></span>
                    </td>
                    <td><strong>{display.name}</strong></td>
                    <td>{display.type || 'unknown'}</td>
                    <td>{connectionBadges}</td>
                    <td className="ip-address">{display.ipAddress || '-'}</td>
                    <td style={{ fontSize: '0.85rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {hasMQTT && (
                        <div>
                          CPU: {display.mqtt.cpuUsage !== undefined ? `${display.mqtt.cpuUsage}%` : '-'} | 
                          Mem: {display.mqtt.memoryUsage !== undefined ? `${display.mqtt.memoryUsage}%` : '-'} | 
                          Temp: {display.mqtt.temperature !== undefined ? `${display.mqtt.temperature}°C` : '-'}
                        </div>
                      )}
                      {hasSocketIO && (
                        <div>
                          Connected: {display.socketIO.connectedAt ? new Date(display.socketIO.connectedAt).toLocaleTimeString() : '-'}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'nowrap' }}>
                        <button
                          type="button"
                          className="admin-secondary-button"
                          onClick={() => onOpenPowerManagement(display.id)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.875rem',
                            height: '36px'
                          }}
                          title="Power Management"
                        >
                          ⚡
                        </button>
                        {hasMQTT && (
                          <>
                            <button
                              type="button"
                              className="admin-secondary-button"
                              onClick={() => onMqttRefresh(display.mqtt.hostname)}
                              style={{
                                padding: '0.5rem 0.75rem',
                                fontSize: '0.875rem',
                                height: '36px'
                              }}
                              title="Refresh Page"
                            >
                              🔄
                            </button>
                            <button
                              type="button"
                              className="admin-primary-button"
                              onClick={() => onOpenTouchkioModal(display)}
                              style={{
                                padding: '0.5rem 1rem',
                                fontSize: '0.875rem',
                                height: '36px'
                              }}
                            >
                              Details
                            </button>
                          </>
                        )}
                        {!hasSocketIO && !hasMQTT && (
                          <button
                            type="button"
                            className="admin-secondary-button"
                            onClick={() => onDeleteDisplay(display.id)}
                            style={{
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.875rem',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              height: '36px'
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tracking Settings */}
      <div className="admin-form-divider"></div>

      <h3>{t.systemDisplayTrackingSectionTitle || 'Tracking Settings'}</h3>
      
      <div className="admin-form-group">
        <label htmlFor="systemDisplayTrackingMode">{t.systemDisplayTrackingModeLabel || 'Tracking Mode'}</label>
        <div className="admin-radio-group">
          <label className="admin-radio-label">
            <input
              type="radio"
              name="systemDisplayTrackingMode"
              value="client-id"
              checked={systemDisplayTrackingMode === 'client-id'}
              onChange={(e) => onTrackingModeChange(e.target.value)}
            />
            <span>{t.systemDisplayTrackingModeClientId || 'Client ID (each browser tab separately)'}</span>
          </label>
          <label className="admin-radio-label">
            <input
              type="radio"
              name="systemDisplayTrackingMode"
              value="ip-room"
              checked={systemDisplayTrackingMode === 'ip-room'}
              onChange={(e) => onTrackingModeChange(e.target.value)}
            />
            <span>{t.systemDisplayTrackingModeIpRoom || 'IP + Room (one entry per physical display)'}</span>
          </label>
        </div>
        <small className="admin-help-text">{t.systemDisplayTrackingModeHelp || 'Client ID: Each browser tab is tracked separately. IP+Room: Displays are grouped by IP address and room.'}</small>
      </div>

      <div className="admin-form-group">
        <label htmlFor="systemDisplayTrackingRetentionHours">{t.systemDisplayTrackingRetentionLabel || 'Retention Time (hours)'}</label>
        <input
          type="number"
          id="systemDisplayTrackingRetentionHours"
          value={systemDisplayTrackingRetentionHours}
          onChange={(e) => onRetentionHoursChange(e.target.value)}
          min="1"
          max="168"
        />
        <small className="admin-help-text">{t.systemDisplayTrackingRetentionHelp || 'How long disconnected displays remain visible (1-168 hours)'}</small>
      </div>

      <div className="admin-form-group">
        <label htmlFor="systemDisplayTrackingCleanupMinutes">{t.systemDisplayTrackingCleanupLabel || 'Cleanup Delay (minutes)'}</label>
        <input
          type="number"
          id="systemDisplayTrackingCleanupMinutes"
          value={systemDisplayTrackingCleanupMinutes}
          onChange={(e) => onCleanupMinutesChange(e.target.value)}
          min="0"
          max="60"
        />
        <small className="admin-help-text">{t.systemDisplayTrackingCleanupHelp || 'Wait time after disconnect before automatic cleanup (0-60 minutes)'}</small>
      </div>

      <button 
        type="submit" 
        className="admin-submit-button" 
        onClick={onSaveSettings}
        disabled={
          systemDisplayTrackingMode === currentSystemDisplayTrackingMode &&
          parseInt(systemDisplayTrackingRetentionHours, 10) === currentSystemDisplayTrackingRetentionHours &&
          parseInt(systemDisplayTrackingCleanupMinutes, 10) === currentSystemDisplayTrackingCleanupMinutes
        }
      >
        {t.systemSaveButton || 'Save System Configuration'}
      </button>

      {systemMessage && (
        <div className={`admin-message admin-message-${systemMessageType}`}>
          {systemMessage}
        </div>
      )}
    </div>
  );
};

export default DevicesTab;
