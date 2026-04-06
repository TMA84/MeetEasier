/**
* @file WiFiTab.js
* @description Admin panel tab for configuring WiFi credentials (SSID and password) used to generate a WiFi QR code displayed on room screens.
*/
import React from 'react';

const WiFiTab = ({
  isActive,
  wifiLocked,
  t,
  currentSsid,
  currentPassword,
  wifiLastUpdated,
  ssid,
  password,
  wifiMessage,
  wifiMessageType,
  onFieldChange,
  onSubmit
}) => {
  return (
    <div className={`admin-tab-content ${isActive ? 'active' : ''}`}>
      {!wifiLocked && (
        <div className="admin-section">
          <h2>{t.wifiSectionTitle}</h2>
          
          <div className="admin-current-config">
            <h3>{t.currentConfigTitle}</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-label">{t.ssidLabel}</span>
                <span className="config-value">{currentSsid}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.passwordLabel}</span>
                <span className="config-value">{currentPassword}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.lastUpdatedLabel}</span>
                <span className="config-value">{wifiLastUpdated}</span>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit}>
            <div className="admin-form-group">
              <label htmlFor="ssid">{t.wifiSsidLabel}</label>
              <input
                type="text"
                id="ssid"
                value={ssid}
                onChange={(e) => onFieldChange('ssid', e.target.value)}
                required
                placeholder={t.wifiSsidPlaceholder}
              />
            </div>
            
            <div className="admin-form-group">
              <label htmlFor="password">{t.wifiPasswordLabel}</label>
              <input
                type="text"
                id="password"
                value={password}
                onChange={(e) => onFieldChange('password', e.target.value)}
                placeholder={t.wifiPasswordPlaceholder}
              />
            </div>
            
            <button 
              type="submit" 
              className="admin-submit-button"
              disabled={
                ssid === currentSsid &&
                password === currentPassword
              }
            >
              {t.submitWifiButton}
            </button>
          </form>

          {wifiMessage && (
            <div className={`admin-message admin-message-${wifiMessageType}`}>
              {wifiMessage}
            </div>
          )}

          <div className="admin-qr-preview">
            <img 
              src={`/img/wifi-qr.png?t=${Date.now()}`} 
              alt="WiFi QR Code" 
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        </div>
      )}

      {wifiLocked && (
        <div className="admin-section">
          <h2>{t.wifiSectionTitle}</h2>
          <div className="admin-locked-message">
            <p>{t.configuredViaEnv}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WiFiTab;
