import React from 'react';

const PowerManagementModal = ({
  show,
  clientId,
  mode,
  mqttHostname,
  hasMqtt,
  scheduleEnabled,
  startTime,
  endTime,
  weekendMode,
  message,
  messageType,
  onClose,
  onSave,
  onModeChange,
  onMqttHostnameChange,
  onScheduleEnabledChange,
  onStartTimeChange,
  onEndTimeChange,
  onWeekendModeChange
}) => {
  if (!show) return null;

  // For global config, show all modes
  const isGlobal = clientId === '__global__';
  
  // For specific displays, only show MQTT if available
  const showMqttOption = isGlobal || hasMqtt;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>
            {clientId === '__global__' 
              ? 'Global Power Management Standard'
              : 'Power Management Configuration'
            }
          </h2>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="admin-modal-body">
          <div className="admin-form-group">
            <label>Display: {clientId}</label>
          </div>

          <div className="admin-form-group">
            <label>Power Management Mode</label>
            <div className="admin-radio-group">
              <label className="admin-radio-label">
                <input
                  type="radio"
                  name="powerManagementMode"
                  value="browser"
                  checked={mode === 'browser'}
                  onChange={(e) => onModeChange(e.target.value)}
                />
                <span>Browser (All devices)</span>
              </label>
              <label className="admin-radio-label">
                <input
                  type="radio"
                  name="powerManagementMode"
                  value="dpms"
                  checked={mode === 'dpms'}
                  onChange={(e) => onModeChange(e.target.value)}
                />
                <span>DPMS (Raspberry Pi only)</span>
              </label>
              {showMqttOption && (
                <label className="admin-radio-label">
                  <input
                    type="radio"
                    name="powerManagementMode"
                    value="mqtt"
                    checked={mode === 'mqtt'}
                    onChange={(e) => onModeChange(e.target.value)}
                  />
                  <span>MQTT (Touchkio Displays){hasMqtt && !isGlobal ? ' ✓' : ''}</span>
                </label>
              )}
            </div>
            <small>
              Browser: Black screen (works on all devices). DPMS: True power off (requires Raspberry Pi setup).
              {showMqttOption && ' MQTT: Touchkio display control via MQTT.'}
              {!showMqttOption && ' MQTT: Not available (display not connected via MQTT).'}
            </small>
          </div>

          {mode === 'mqtt' && !isGlobal && (
            <div className="admin-form-group">
              <label htmlFor="powerManagementMqttHostname">Touchkio Device ID</label>
              <input
                type="text"
                id="powerManagementMqttHostname"
                placeholder="e.g., rpi_1A4187"
                value={mqttHostname}
                onChange={(e) => onMqttHostnameChange(e.target.value)}
                readOnly={hasMqtt}
              />
              <small>
                {hasMqtt 
                  ? 'Device ID automatically detected from MQTT connection' 
                  : 'Device ID of the Touchkio display (e.g., "rpi_1A4187")'
                }
              </small>
            </div>
          )}

          {mode === 'mqtt' && isGlobal && (
            <div className="admin-form-group">
              <div className="admin-message admin-message-info">
                Global MQTT mode will apply to all connected Touchkio displays automatically. No hostname configuration needed.
              </div>
            </div>
          )}

          <div className="admin-form-group">
            <label className="inline-label">
              <span className="label-text">Enable Schedule</span>
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => onScheduleEnabledChange(e.target.checked)}
              />
            </label>
            <small>Automatically turn off display during specified hours</small>
          </div>

          {scheduleEnabled && (
            <>
              <div className="admin-form-group">
                <label htmlFor="powerManagementStartTime">Start Time (Display OFF)</label>
                <input
                  id="powerManagementStartTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => onStartTimeChange(e.target.value)}
                  style={{ width: '150px' }}
                />
                <small>Time when display turns off (e.g., 20:00)</small>
              </div>

              <div className="admin-form-group">
                <label htmlFor="powerManagementEndTime">End Time (Display ON)</label>
                <input
                  id="powerManagementEndTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => onEndTimeChange(e.target.value)}
                  style={{ width: '150px' }}
                />
                <small>Time when display turns on (e.g., 07:00)</small>
              </div>

              <div className="admin-form-group">
                <label className="inline-label">
                  <span className="label-text">Weekend Mode</span>
                  <input
                    type="checkbox"
                    checked={weekendMode}
                    onChange={(e) => onWeekendModeChange(e.target.checked)}
                  />
                </label>
                <small>Keep display off on weekends (Saturday & Sunday)</small>
              </div>
            </>
          )}

          {message && (
            <div className={`admin-message admin-message-${messageType || 'info'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="admin-modal-footer">
          <button type="button" className="admin-button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="admin-submit-button" onClick={onSave}>
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default PowerManagementModal;
