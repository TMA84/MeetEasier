import React from 'react';

const ApiTokenTab = ({
  apiTokenLocked,
  wifiApiTokenLocked,
  t,
  apiTokenSourceLabelMap,
  currentApiTokenSource,
  currentApiTokenIsDefault,
  apiTokenConfigLastUpdated,
  currentWifiApiTokenSource,
  currentWifiApiTokenConfigured,
  wifiApiTokenConfigLastUpdated,
  newApiToken,
  newApiTokenConfirm,
  newWifiApiToken,
  newWifiApiTokenConfirm,
  apiTokenConfigMessage,
  apiTokenConfigMessageType,
  wifiApiTokenConfigMessage,
  wifiApiTokenConfigMessageType,
  booleanLabel,
  onApiTokenChange,
  onApiTokenSubmit,
  onWifiApiTokenChange,
  onWifiApiTokenSubmit
}) => {
  return (
    <div className="admin-card" id="ops-api-token">
      <h3>{t.apiTokenConfigSectionTitle || 'API Tokens'}</h3>
      <div className="admin-current-config">
        <h3>{t.currentConfigTitle}</h3>
        <div className="config-grid">
          <div className="config-item">
            <span className="config-label">{t.apiTokenSourceLabel || 'Token Source'}</span>
            <span className="config-value">{apiTokenSourceLabelMap[currentApiTokenSource] || currentApiTokenSource || '-'}</span>
          </div>
          <div className="config-item">
            <span className="config-label">{t.apiTokenDefaultActiveLabel || 'Default Token Active'}</span>
            <span className="config-value">{booleanLabel(currentApiTokenIsDefault)}</span>
          </div>
          <div className="config-item">
            <span className="config-label">{t.apiTokenDefaultValueLabel || 'Default Token'}</span>
            <span className="config-value">{t.apiTokenDefaultValue || 'change-me-admin-token'}</span>
          </div>
          <div className="config-item">
            <span className="config-label">{t.lastUpdatedLabel}</span>
            <span className="config-value">{apiTokenConfigLastUpdated || '-'}</span>
          </div>
          <div className="config-item">
            <span className="config-label">{t.wifiApiTokenSourceLabel || 'WiFi Token Source'}</span>
            <span className="config-value">{apiTokenSourceLabelMap[currentWifiApiTokenSource] || currentWifiApiTokenSource || '-'}</span>
          </div>
          <div className="config-item">
            <span className="config-label">{t.wifiApiTokenConfiguredLabel || 'WiFi Token Configured'}</span>
            <span className="config-value">{booleanLabel(currentWifiApiTokenConfigured)}</span>
          </div>
          <div className="config-item">
            <span className="config-label">{t.wifiApiTokenLastUpdatedLabel || 'WiFi Token Last Updated'}</span>
            <span className="config-value">{wifiApiTokenConfigLastUpdated || '-'}</span>
          </div>
        </div>
      </div>

      {!apiTokenLocked && (
        <form onSubmit={onApiTokenSubmit}>
          <div className="admin-form-group">
            <label htmlFor="newApiToken">{t.apiTokenNewLabel || 'New API Token'}</label>
            <input
              type="password"
              id="newApiToken"
              value={newApiToken}
              onChange={(e) => onApiTokenChange('newApiToken', e.target.value)}
              placeholder={t.apiTokenMinLengthPlaceholder || 'At least 8 characters'}
              autoComplete="new-password"
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="newApiTokenConfirm">{t.apiTokenNewConfirmLabel || 'Confirm New API Token'}</label>
            <input
              type="password"
              id="newApiTokenConfirm"
              value={newApiTokenConfirm}
              onChange={(e) => onApiTokenChange('newApiTokenConfirm', e.target.value)}
              placeholder={t.apiTokenConfirmPlaceholder || 'Repeat new token'}
              autoComplete="new-password"
            />
            <small>{t.apiTokenConfigHelp || 'After saving, use the new token for future logins.'}</small>
          </div>

          <button 
            type="submit" 
            className="admin-submit-button"
            disabled={!newApiToken || !newApiTokenConfirm || newApiToken !== newApiTokenConfirm}
          >
            {t.apiTokenConfigSaveButton || 'Save API Token'}
          </button>
        </form>
      )}

      {apiTokenLocked && (
        <div className="admin-locked-message">
          <p>{t.adminApiTokenConfiguredViaEnv || 'Admin API token is configured via environment (.env).'}</p>
        </div>
      )}

      {apiTokenConfigMessage && (
        <div className={`admin-message admin-message-${apiTokenConfigMessageType || 'error'}`}>
          {apiTokenConfigMessage}
        </div>
      )}

      <div className="admin-form-divider"></div>

      <h3>{t.wifiApiTokenConfigSectionTitle || 'WiFi API Token'}</h3>

      {!wifiApiTokenLocked && (
        <form onSubmit={onWifiApiTokenSubmit}>
          <div className="admin-form-group">
            <label htmlFor="newWifiApiToken">{t.wifiApiTokenNewLabel || 'New WiFi API Token'}</label>
            <input
              type="password"
              id="newWifiApiToken"
              value={newWifiApiToken}
              onChange={(e) => onWifiApiTokenChange('newWifiApiToken', e.target.value)}
              placeholder={t.apiTokenMinLengthPlaceholder || 'At least 8 characters'}
              autoComplete="new-password"
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="newWifiApiTokenConfirm">{t.wifiApiTokenNewConfirmLabel || 'Confirm New WiFi API Token'}</label>
            <input
              type="password"
              id="newWifiApiTokenConfirm"
              value={newWifiApiTokenConfirm}
              onChange={(e) => onWifiApiTokenChange('newWifiApiTokenConfirm', e.target.value)}
              placeholder={t.apiTokenConfirmPlaceholder || 'Repeat new token'}
              autoComplete="new-password"
            />
            <small>{t.wifiApiTokenConfigHelp || 'Use this token for external WiFi API integrations.'}</small>
          </div>

          <button 
            type="submit" 
            className="admin-submit-button"
            disabled={!newWifiApiToken || !newWifiApiTokenConfirm || newWifiApiToken !== newWifiApiTokenConfirm}
          >
            {t.wifiApiTokenConfigSaveButton || 'Save WiFi API Token'}
          </button>
        </form>
      )}

      {wifiApiTokenLocked && (
        <div className="admin-locked-message">
          <p>{t.wifiApiTokenConfiguredViaEnv || 'WiFi API token is configured via environment (.env).'}</p>
        </div>
      )}

      {wifiApiTokenConfigMessage && (
        <div className={`admin-message admin-message-${wifiApiTokenConfigMessageType || 'error'}`}>
          {wifiApiTokenConfigMessage}
        </div>
      )}

      <div className="admin-form-divider"></div>
    </div>
  );
};

export default ApiTokenTab;
