import React from 'react';

const MqttTab = ({
  // Data
  mqttEnabled,
  mqttBrokerUrl,
  mqttAuthentication,
  mqttUsername,
  mqttPassword,
  mqttDiscovery,
  mqttConfigSaving,
  mqttConfigMessage,
  mqttConfigMessageType,
  mqttStatus,
  
  // Translations
  t,
  
  // Handlers
  onEnabledChange,
  onBrokerUrlChange,
  onAuthenticationChange,
  onUsernameChange,
  onPasswordChange,
  onDiscoveryChange,
  onSubmit
}) => {
  return (
    <div className="admin-card" id="ops-mqtt">
      <h3>{t.mqttSectionTitle || 'MQTT Broker Configuration'}</h3>
      
      <form onSubmit={onSubmit}>
        <div className="admin-form-group">
          <label className="inline-label">
            <span className="label-text">{t.mqttEnabledLabel || 'MQTT Broker Enabled'}</span>
            <input
              type="checkbox"
              checked={mqttEnabled || false}
              onChange={(e) => onEnabledChange(e.target.checked)}
            />
          </label>
          <small>{t.mqttEnabledHelp || 'Connects to an external MQTT broker for Touchkio display control'}</small>
        </div>

        <div className="admin-form-group">
          <label htmlFor="mqttBrokerUrl">{t.mqttBrokerUrlLabel || 'MQTT Broker URL'}</label>
          <input
            type="text"
            id="mqttBrokerUrl"
            value={mqttBrokerUrl || ''}
            onChange={(e) => onBrokerUrlChange(e.target.value)}
            placeholder={t.mqttBrokerUrlPlaceholder || 'mqtt://localhost:1883'}
          />
          <small>{t.mqttBrokerUrlHelp || 'URL of the MQTT broker (e.g., mqtt://localhost:1883)'}</small>
        </div>

        <div className="admin-form-group">
          <label className="inline-label">
            <span className="label-text">{t.mqttAuthenticationLabel || 'Enable Authentication'}</span>
            <input
              type="checkbox"
              checked={mqttAuthentication || false}
              onChange={(e) => onAuthenticationChange(e.target.checked)}
            />
          </label>
          <small>{t.mqttAuthenticationHelp || 'Requires username and password for MQTT connections'}</small>
        </div>

        {mqttAuthentication && (
          <>
            <div className="admin-form-group">
              <label htmlFor="mqttUsername">{t.mqttUsernameLabel || 'MQTT Username'}</label>
              <input
                type="text"
                id="mqttUsername"
                value={mqttUsername || ''}
                onChange={(e) => onUsernameChange(e.target.value)}
                placeholder={t.mqttUsernamePlaceholder || 'Username'}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="mqttPassword">{t.mqttPasswordLabel || 'MQTT Password'}</label>
              <input
                type="password"
                id="mqttPassword"
                value={mqttPassword || ''}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder={t.mqttPasswordPlaceholder || 'Password'}
              />
            </div>
          </>
        )}

        <div className="admin-form-group">
          <label className="inline-label">
            <span className="label-text">{t.mqttDiscoveryLabel || 'Home Assistant Discovery'}</span>
            <input
              type="checkbox"
              checked={mqttDiscovery === 'homeassistant'}
              onChange={(e) => onDiscoveryChange(e.target.checked ? 'homeassistant' : '')}
            />
          </label>
          <small>{t.mqttDiscoveryHelp || 'Enables Home Assistant MQTT Discovery protocol'}</small>
        </div>

        <button 
          type="submit" 
          className="admin-submit-button"
          disabled={mqttConfigSaving}
        >
          {mqttConfigSaving ? t.loading : (t.mqttSaveButton || 'Save MQTT Configuration')}
        </button>
      </form>

      {mqttConfigMessage && (
        <div className={`admin-message admin-message-${mqttConfigMessageType || 'error'}`}>
          {mqttConfigMessage}
        </div>
      )}

      <div className="admin-form-divider"></div>

      <h3>{t.mqttStatusSectionTitle || 'MQTT Broker Status'}</h3>
      <div className="admin-current-config">
        <div className="config-grid">
          <div className="config-item">
            <span className="config-label">{t.mqttStatusLabel || 'Status:'}</span>
            <span className="config-value">
              {mqttStatus?.running ? 
                <span className="mqtt-status-running">{t.mqttStatusRunning || 'Running'}</span> : 
                <span className="mqtt-status-stopped">{t.mqttStatusStopped || 'Stopped'}</span>
              }
            </span>
          </div>
          <div className="config-item">
            <span className="config-label">{t.mqttConnectedClientsLabel || 'Connected Clients:'}</span>
            <span className="config-value">{mqttStatus?.clients || 0}</span>
          </div>
        </div>
      </div>

      <div className="admin-form-divider"></div>
    </div>
  );
};

export default MqttTab;
