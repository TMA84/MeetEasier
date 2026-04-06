/**
* @file TranslationApiTab.js
* @description Admin panel tab for configuring the external translation API, including enabling auto-translation, setting the API URL, API key, and request timeout.
*/
import React from 'react';

/** Default translation labels for the Translation API tab */
const defaultLabels = {
  translationApiSectionTitle: 'Translation API Configuration',
  translationApiEnabledLabel: 'Auto Translation Enabled',
  translationApiUrlLabel: 'Translation API URL',
  translationApiKeyLabel: 'Translation API Key',
  translationApiApiKeyConfigured: 'Configured',
  translationApiApiKeyNotConfigured: 'Not configured',
  translationApiTimeoutLabel: 'Timeout (ms)',
  translationApiEnableToggleLabel: 'Enable auto translation',
  translationApiKeyPlaceholder: 'Leave empty to keep existing API key',
  translationApiTimeoutHelp: 'Minimum: 3000 ms',
  translationApiSaveButton: 'Save Translation API Configuration',
};

/** Resolves a translation key with fallback to default */
function label(t, key) {
  return t[key] || defaultLabels[key] || '';
}

const TranslationApiTab = ({
  // Data
  isActive,
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
  const l = (key) => label(t, key);
  return (
    <div className={`admin-tab-content ${isActive ? 'active' : ''}`}>
    <div className="admin-card" id="ops-translation-api">
      {!translationApiLocked && (
        <>
          <h3>{l('translationApiSectionTitle')}</h3>
          <div className="admin-current-config">
            <h3>{t.currentConfigTitle}</h3>
            <div className="config-grid">
              <div className="config-item">
                <span className="config-label">{l('translationApiEnabledLabel')}</span>
                <span className="config-value">{booleanLabel(currentTranslationApiEnabled)}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{l('translationApiUrlLabel')}</span>
                <span className="config-value">{currentTranslationApiUrl || '-'}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{l('translationApiKeyLabel')}</span>
                <span className="config-value">{currentTranslationApiHasApiKey ? l('translationApiApiKeyConfigured') : l('translationApiApiKeyNotConfigured')}</span>
              </div>
              <div className="config-item">
                <span className="config-label">{l('translationApiTimeoutLabel')}</span>
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
                <span className="label-text">{l('translationApiEnableToggleLabel')}</span>
                <input
                  type="checkbox"
                  checked={translationApiEnabled}
                  onChange={(e) => onEnabledChange(e.target.checked)}
                />
              </label>
            </div>

            <div className="admin-form-group">
              <label htmlFor="translationApiUrl">{l('translationApiUrlLabel')}</label>
              <input
                type="text"
                id="translationApiUrl"
                value={translationApiUrl}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://translation.googleapis.com/language/translate/v2"
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="translationApiKey">{l('translationApiKeyLabel')}</label>
              <input
                type="password"
                id="translationApiKey"
                value={translationApiApiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder={l('translationApiKeyPlaceholder')}
                autoComplete="new-password"
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="translationApiTimeoutMs">{l('translationApiTimeoutLabel')}</label>
              <input
                type="number"
                id="translationApiTimeoutMs"
                min="3000"
                step="1000"
                value={translationApiTimeoutMs}
                onChange={(e) => onTimeoutChange(Math.max(parseInt(e.target.value, 10) || 3000, 3000))}
              />
              <small>{l('translationApiTimeoutHelp')}</small>
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
              {l('translationApiSaveButton')}
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
          <h3>{l('translationApiSectionTitle')}</h3>
          <div className="admin-locked-message">
            <p>{t.configuredViaEnv}</p>
          </div>
        </>
      )}
    </div>
    </div>
  );
};

export default TranslationApiTab;
