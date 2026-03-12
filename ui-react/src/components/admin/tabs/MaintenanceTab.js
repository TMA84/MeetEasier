import React from 'react';

const MaintenanceTab = ({
  // Data
  maintenanceLocked,
  currentMaintenanceEnabled,
  currentMaintenanceMessage,
  maintenanceLastUpdated,
  maintenanceEnabled,
  maintenanceMessage,
  maintenanceMessageBanner,
  maintenanceMessageType,
  
  // Translations
  t,
  booleanLabel,
  
  // Handlers
  onEnabledChange,
  onMessageChange,
  onSubmit
}) => {
  return (
    <div className="admin-card" id="ops-maintenance">
      {!maintenanceLocked && (
        <>
          <div className="admin-current-config">
            <h3>{t.currentConfigTitle}</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-label">{t.maintenanceEnabledLabel}</span>
                <span className="config-value">{booleanLabel(currentMaintenanceEnabled)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.maintenanceMessageLabel}</span>
                <span className="config-value">{currentMaintenanceMessage || '-'}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.lastUpdatedLabel}</span>
                <span className="config-value">{maintenanceLastUpdated || '-'}</span>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit}>
            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">{t.maintenanceEnabledLabel}</span>
                <input
                  type="checkbox"
                  checked={maintenanceEnabled}
                  onChange={(e) => onEnabledChange(e.target.checked)}
                />
              </label>
            </div>

            <div className="admin-form-group">
              <label htmlFor="maintenanceMessage">{t.maintenanceMessageLabel}</label>
              <textarea
                id="maintenanceMessage"
                value={maintenanceMessage}
                onChange={(e) => onMessageChange(e.target.value)}
                rows={4}
                className="admin-textarea"
              />
            </div>

            <button 
              type="submit" 
              className="admin-submit-button"
              disabled={
                maintenanceEnabled === currentMaintenanceEnabled &&
                maintenanceMessage === currentMaintenanceMessage
              }
            >
              {t.maintenanceSubmitButton}
            </button>
          </form>
        </>
      )}

      {maintenanceLocked && (
        <div className="admin-locked-message">
          <p>{t.configuredViaEnv}</p>
        </div>
      )}

      {maintenanceMessageBanner && (
        <div className={`admin-message admin-message-${maintenanceMessageType}`}>
          {maintenanceMessageBanner}
        </div>
      )}
    </div>
  );
};

export default MaintenanceTab;
