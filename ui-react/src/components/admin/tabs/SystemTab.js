import React from 'react';

const SystemTab = ({
  // Data
  systemLocked,
  currentSystemStartupValidationStrict,
  currentSystemExposeDetailedErrors,
  currentSystemHstsMaxAge,
  currentSystemRateLimitMaxBuckets,
  currentSystemDisplayTrackingMode,
  currentSystemDisplayTrackingRetentionHours,
  currentSystemDisplayTrackingCleanupMinutes,
  systemLastUpdated,
  systemStartupValidationStrict,
  systemExposeDetailedErrors,
  systemHstsMaxAge,
  systemRateLimitMaxBuckets,
  demoMode,
  currentDemoMode,
  systemMessage,
  systemMessageType,
  
  // Translations
  t,
  booleanLabel,
  
  // Handlers
  onStartupValidationChange,
  onExposeErrorsChange,
  onHstsMaxAgeChange,
  onRateLimitMaxBucketsChange,
  onSubmit
}) => {
  return (
    <div className="admin-card" id="ops-system">
      {!systemLocked && (
        <>
          <h3>{t.systemConfigSectionTitle || 'System Configuration'}</h3>
          <div className="admin-current-config">
            <h3>{t.currentConfigTitle}</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-label">{t.systemStartupValidationStrictLabel || 'Startup Validation Strict'}</span>
                <span className="config-value">{booleanLabel(currentSystemStartupValidationStrict)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.systemExposeDetailedErrorsLabel || 'Expose Detailed Errors'}</span>
                <span className="config-value">{booleanLabel(currentSystemExposeDetailedErrors)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.systemHstsMaxAgeLabel || 'HSTS Max Age (s)'}</span>
                <span className="config-value">{currentSystemHstsMaxAge}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.systemRateLimitMaxBucketsLabel || 'Rate Limiter Max Buckets'}</span>
                <span className="config-value">{currentSystemRateLimitMaxBuckets}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.systemDisplayTrackingModeLabel || 'Tracking Mode'}</span>
                <span className="config-value">
                  {currentSystemDisplayTrackingMode === 'ip-room' 
                    ? (t.systemDisplayTrackingModeIpRoom || 'IP + Room')
                    : (t.systemDisplayTrackingModeClientId || 'Client ID')}
                </span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.systemDisplayTrackingRetentionLabel || 'Retention Time'}</span>
                <span className="config-value">{currentSystemDisplayTrackingRetentionHours}h</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.systemDisplayTrackingCleanupLabel || 'Cleanup Delay'}</span>
                <span className="config-value">{currentSystemDisplayTrackingCleanupMinutes}min</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.lastUpdatedLabel}</span>
                <span className="config-value">{systemLastUpdated || '-'}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.demoModeEnabledLabel || 'Demo Mode'}</span>
                <span className="config-value">{booleanLabel(currentDemoMode)}</span>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit}>
            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">{t.systemStartupValidationStrictLabel || 'Startup Validation Strict'}</span>
                <input
                  type="checkbox"
                  checked={systemStartupValidationStrict}
                  onChange={(e) => onStartupValidationChange(e.target.checked)}
                />
              </label>
              <small>{t.systemStartupValidationStrictHelp || 'Stop startup when warnings are present.'}</small>
            </div>

            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">{t.systemExposeDetailedErrorsLabel || 'Expose Detailed Errors'}</span>
                <input
                  type="checkbox"
                  checked={systemExposeDetailedErrors}
                  onChange={(e) => onExposeErrorsChange(e.target.checked)}
                />
              </label>
              <small>{t.systemExposeDetailedErrorsHelp || 'Only enable for trusted debugging environments.'}</small>
            </div>

            <div className="admin-form-group">
              <label htmlFor="systemHstsMaxAge">{t.systemHstsMaxAgeInputLabel || 'HSTS Max Age (seconds)'}</label>
              <input
                type="number"
                id="systemHstsMaxAge"
                value={systemHstsMaxAge}
                onChange={(e) => onHstsMaxAgeChange(e.target.value)}
                min="0"
                step="300"
              />
              <small>{t.systemHstsMaxAgeHelp || 'Set to 0 to disable HSTS header.'}</small>
            </div>

            <div className="admin-form-group">
              <label htmlFor="systemRateLimitMaxBuckets">{t.systemRateLimitMaxBucketsLabel || 'Rate Limiter Max Buckets'}</label>
              <input
                type="number"
                id="systemRateLimitMaxBuckets"
                value={systemRateLimitMaxBuckets}
                onChange={(e) => onRateLimitMaxBucketsChange(e.target.value)}
                min="1000"
                step="500"
              />
            </div>

            <div className="admin-form-divider"></div>
            <h3>{t.demoModeSectionTitle || 'Demo Mode'}</h3>

            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">{t.demoModeEnabledLabel || 'Demo Mode'}</span>
                <input
                  type="checkbox"
                  checked={demoMode}
                  disabled={true}
                />
              </label>
              <small className="admin-help-text">
                {demoMode
                  ? (t.demoModeActiveHelp || 'Demo mode is active because OAuth is not configured. Configure OAuth credentials to switch to live data.')
                  : (t.demoModeDisabledByOauth || 'Demo mode is not available when OAuth is configured.')}
              </small>
            </div>

            <button 
              type="submit" 
              className="admin-submit-button"
              disabled={
                systemStartupValidationStrict === currentSystemStartupValidationStrict &&
                systemExposeDetailedErrors === currentSystemExposeDetailedErrors &&
                parseInt(systemHstsMaxAge, 10) === currentSystemHstsMaxAge &&
                parseInt(systemRateLimitMaxBuckets, 10) === currentSystemRateLimitMaxBuckets
              }
            >
              {t.systemSaveButton || 'Save System Configuration'}
            </button>
          </form>

          {systemMessage && (
            <div className={`admin-message admin-message-${systemMessageType}`}>
              {systemMessage}
            </div>
          )}

          <div className="admin-form-divider"></div>
        </>
      )}

      {systemLocked && (
        <>
          <h3>{t.systemConfigSectionTitle || 'System Configuration'}</h3>
          <div className="admin-locked-message">
            <p>{t.configuredViaEnv}</p>
          </div>
          <div className="admin-form-divider"></div>
        </>
      )}
    </div>
  );
};

export default SystemTab;
