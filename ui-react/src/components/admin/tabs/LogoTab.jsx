/**
* @file LogoTab.js
* @description Admin panel tab for uploading and configuring dark and light logo variants. Supports both URL-based and file-upload modes, with a live preview of the current logos.
*/
import React from 'react';

const LogoTab = ({
  isActive,
  logoLocked,
  t,
  currentLogoDarkUrl,
  currentLogoLightUrl,
  logoLastUpdated,
  uploadMode,
  logoDarkUrl,
  logoLightUrl,
  logoDarkFile,
  logoLightFile,
  logoMessage,
  logoMessageType,
  onUploadModeChange,
  onFieldChange,
  onFileChange,
  onSubmit
}) => {
  return (
    <div className={`admin-tab-content ${isActive ? 'active' : ''}`}>
      {!logoLocked && (
        <div className="admin-section">
          <h2>{t.logoSectionTitle}</h2>
          
          <div className="admin-current-config">
            <h3>{t.currentConfigTitle}</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-label">{t.logoDarkUrlLabel}</span>
                <span className="config-value">{currentLogoDarkUrl}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.logoLightUrlLabel}</span>
                <span className="config-value">{currentLogoLightUrl}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.lastUpdatedLabel}</span>
                <span className="config-value">{logoLastUpdated}</span>
              </div>
            </div>
          </div>

          {/* Upload Mode Toggle */}
          <div className="admin-upload-mode">
            <button 
              type="button"
              className={`admin-mode-button ${uploadMode === 'url' ? 'active' : ''}`}
              onClick={() => onUploadModeChange('url')}
            >
              {t.uploadModeUrl}
            </button>
            <button 
              type="button"
              className={`admin-mode-button ${uploadMode === 'file' ? 'active' : ''}`}
              onClick={() => onUploadModeChange('file')}
            >
              {t.uploadModeFile}
            </button>
          </div>

          <form onSubmit={onSubmit}>
            {uploadMode === 'url' ? (
              <>
                <div className="admin-form-group">
                  <label htmlFor="logoDarkUrl">{t.logoDarkUrlLabel}</label>
                  <input
                    type="text"
                    id="logoDarkUrl"
                    value={logoDarkUrl}
                    onChange={(e) => onFieldChange('logoDarkUrl', e.target.value)}
                    placeholder={t.logoUrlPlaceholder}
                  />
                  <small>{t.logoUrlHelp}</small>
                </div>
                <div className="admin-form-group">
                  <label htmlFor="logoLightUrl">{t.logoLightUrlLabel}</label>
                  <input
                    type="text"
                    id="logoLightUrl"
                    value={logoLightUrl}
                    onChange={(e) => onFieldChange('logoLightUrl', e.target.value)}
                    placeholder={t.logoUrlPlaceholder}
                  />
                  <small>{t.logoUrlHelp}</small>
                </div>
              </>
            ) : (
              <>
                <div className="admin-form-group">
                  <label htmlFor="logoDarkFile">{t.logoDarkFileLabel}</label>
                  <input
                    type="file"
                    id="logoDarkFile"
                    accept="image/*"
                    onChange={(e) => onFileChange('logoDarkFile', e.target.files[0])}
                    className="admin-file-input"
                  />
                  <small>{t.logoFileHelp}</small>
                  {logoDarkFile && (
                    <div className="admin-file-preview">
                      Selected: {logoDarkFile.name} ({(logoDarkFile.size / 1024).toFixed(2)} KB)
                    </div>
                  )}
                </div>
                <div className="admin-form-group">
                  <label htmlFor="logoLightFile">{t.logoLightFileLabel}</label>
                  <input
                    type="file"
                    id="logoLightFile"
                    accept="image/*"
                    onChange={(e) => onFileChange('logoLightFile', e.target.files[0])}
                    className="admin-file-input"
                  />
                  <small>{t.logoFileHelp}</small>
                  {logoLightFile && (
                    <div className="admin-file-preview">
                      Selected: {logoLightFile.name} ({(logoLightFile.size / 1024).toFixed(2)} KB)
                    </div>
                  )}
                </div>
              </>
            )}
            
            <button 
              type="submit" 
              className="admin-submit-button"
              disabled={
                uploadMode === 'file' 
                  ? (!logoDarkFile && !logoLightFile)
                  : (logoDarkUrl === currentLogoDarkUrl && logoLightUrl === currentLogoLightUrl)
              }
            >
              {t.submitLogoButton}
            </button>
          </form>

          {logoMessage && (
            <div className={`admin-message admin-message-${logoMessageType}`}>
              {logoMessage}
            </div>
          )}

          <div className="admin-logo-preview">
            <h3>Preview:</h3>
            <div className="preview-grid">
              <div className="preview-item">
                <p>Dark Logo:</p>
                <img 
                  src={logoDarkUrl || currentLogoDarkUrl} 
                  alt="Dark Logo Preview" 
                  onError={(e) => { e.target.src = "/img/logo.B.png"; }}
                />
              </div>
              <div className="preview-item">
                <p>Light Logo:</p>
                <img 
                  src={logoLightUrl || currentLogoLightUrl} 
                  alt="Light Logo Preview" 
                  onError={(e) => { e.target.src = "/img/logo.W.png"; }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {logoLocked && (
        <div className="admin-section">
          <h2>{t.logoSectionTitle}</h2>
          <div className="admin-locked-message">
            <p>{t.configuredViaEnv}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogoTab;
