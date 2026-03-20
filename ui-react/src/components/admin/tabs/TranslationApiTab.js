/**
 * @file TranslationApiTab.js
 * @description Admin panel tab for configuring the external translation API, including enabling auto-translation, setting the API URL, API key, and request timeout.
 */
import React from 'react';

const TranslationApiTab = ({
  // Data
  translationApiLocked,
  currentTranslationApiEnabled,
  currentTranslationApiUrl,
  currentTranslationApiHasApiKey,
  currentTranslationApiTimeoutMs,
  translationApiLastUpdated,
  translationApiEnabled,
  translationApiUrl,
  translationApiApiKey,
  translationApiTimeoutMs,
  translationApiMessage,
  translationApiMessageType,
  
  // Translations
  t,
  booleanLabel,
  
  // Handlers
  onEnabledChange,
  onUrlChange,
  onApiKeyChange,
  onTimeoutChange,
  onSubmit
}) => {
  return (
    <div className="admin-card" id="ops-translation-api">
      {!translationApiLocked && (
        <>
          <h3>{t.translationApiSectionTitle || 'Translation API Configuration'}</h3>
          <div className="admin-current-config">
            <h3>{t.currentConfigTitle}</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-label">{t.translationApiEnabledLabel || 'Auto Translation Enabled'}</span>
                <span className="config-value">{booleanLabel(currentTranslationApiEnabled)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.translationApiUrlLabel || 'API URL'}</span>
                <span className="config-value">{currentTranslationApiUrl || '-'}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.translationApiKeyLabel || 'API Key'}</span>
                <span className="config-value">{currentTranslationApiHasApiKey ? (t.translationApiApiKeyConfigured || 'Configured') : (t.translationApiApiKeyNotConfigured || 'Not configured')}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.translationApiTimeoutLabel || 'Timeout (ms)'}</span>
                <span className="config-value">{currentTranslationApiTimeoutMs}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{t.lastUpdatedLabel}</span>
                <span className="config-value">{translationApiLastUpdated || '-'}</span>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit}>
            <div className="admin-form-group">
              <label className="inline-label">
                <span className="label-text">{t.translationApiEnableToggleLabel || 'Enable auto translation'}</span>
                <input
                  type="checkbox"
                  checked={translationApiEnabled}
                  onChange={(e) => onEnabledChange(e.target.checked)}
                />
              </label>
            </div>

            <div className="admin-form-group">
              <label htmlFor="translationApiUrl">{t.translationApiUrlLabel || 'Translation API URL'}</label>
              <input
                type="text"
                id="translationApiUrl"
                value={translationApiUrl}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://translation.googleapis.com/language/translate/v2"
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="translationApiKey">{t.translationApiKeyLabel || 'Translation API Key'}</label>
              <input
                type="password"
                id="translationApiKey"
                value={translationApiApiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder={t.translationApiKeyPlaceholder || 'Leave empty to keep existing API key'}
                autoComplete="new-password"
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="translationApiTimeoutMs">{t.translationApiTimeoutLabel || 'Request timeout (ms)'}</label>
              <input
                type="number"
                id="translationApiTimeoutMs"
                min="3000"
                step="1000"
                value={translationApiTimeoutMs}
                onChange={(e) => onTimeoutChange(Math.max(parseInt(e.target.value, 10) || 3000, 3000))}
              />
              <small>{t.translationApiTimeoutHelp || 'Minimum: 3000 ms'}</small>
            </div>

            <button 
              type="submit" 
              className="admin-submit-button"
              disabled={
                translationApiEnabled === currentTranslationApiEnabled &&
                translationApiUrl === currentTranslationApiUrl &&
                parseInt(translationApiTimeoutMs, 10) === currentTranslationApiTimeoutMs &&
                translationApiApiKey === ''
              }
            >
              {t.translationApiSaveButton || 'Save Translation API Configuration'}
            </button>
          </form>

          {translationApiMessage && (
            <div className={`admin-message admin-message-${translationApiMessageType}`}>
              {translationApiMessage}
            </div>
          )}
        </>
      )}

      {translationApiLocked && (
        <>
          <h3>{t.translationApiSectionTitle || 'Translation API Configuration'}</h3>
          <div className="admin-locked-message">
            <p>{t.configuredViaEnv}</p>
          </div>
        </>
      )}
    </div>
  );
};

export default TranslationApiTab;
