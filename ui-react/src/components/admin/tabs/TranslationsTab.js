import React from 'react';

const TranslationsTab = ({
  t,
  availableTranslationLanguages,
  activeTranslationLanguage,
  currentTranslationApiHasApiKey,
  newTranslationLanguageCode,
  translationLanguageDraftError,
  i18nMessage,
  i18nMessageType,
  currentMaintenanceTranslations,
  currentAdminTranslations,
  i18nLastUpdated,
  collapsedTranslationGroups,
  selectedMaintenanceTranslation,
  selectedAdminTranslation,
  showAdvancedTranslationsEditor,
  maintenanceTranslationsText,
  adminTranslationsText,
  quickAdminTranslationGroups,
  getLanguageDisplayName,
  onTranslationLanguageChange,
  onNewTranslationLanguageChange,
  onAddTranslationLanguage,
  onRemoveTranslationLanguage,
  onToggleTranslationGroup,
  onMaintenanceTranslationFieldChange,
  onAdminTranslationFieldChange,
  onShowAdvancedEditorChange,
  onMaintenanceTranslationsTextChange,
  onAdminTranslationsTextChange,
  onSubmit
}) => {
  return (
    <div className={`admin-tab-content ${true ? 'active' : ''}`}>
      <div className="admin-tabs admin-submenu-tabs" role="tablist" aria-label={t.translationLanguageLabel}>
        {availableTranslationLanguages.map((language) => {
          const isActive = activeTranslationLanguage === language;
          return (
            <button
              key={language}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`admin-tab ${isActive ? 'active' : ''}`}
              onClick={() => onTranslationLanguageChange(language)}
            >
              {getLanguageDisplayName(language)}
            </button>
          );
        })}
      </div>

      {!currentTranslationApiHasApiKey && (
        <div className="admin-message admin-message-warning">
          {t.translationApiKeyLabel || 'Translation API Key'}: {(t.translationApiApiKeyNotConfigured || 'Not configured')}. {t.translationApiTabLabel || 'Translation API'} {(t.errorPrefix || 'Error:').replace(/:$/, '')} - Auto-Translate is disabled until an API key is set.
        </div>
      )}

      <div className="admin-section">
        <h2>{t.addLanguageButtonLabel}</h2>
        <div className="admin-form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="newTranslationLanguageCode">{t.addLanguageButtonLabel}</label>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="text"
              id="newTranslationLanguageCode"
              value={newTranslationLanguageCode}
              placeholder={t.addLanguagePlaceholder || 'z. B. fr oder en-gb'}
              onChange={(e) => onNewTranslationLanguageChange(e.target.value)}
            />
            <button
              type="button"
              className="admin-secondary-button"
              onClick={onAddTranslationLanguage}
            >
              {t.addLanguageButtonLabel}
            </button>
          </div>
          <small>{t.addLanguageHelp}</small>
          {translationLanguageDraftError && (
            <small style={{ color: '#f87171' }}>{translationLanguageDraftError}</small>
          )}
        </div>
        <div className="admin-form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
          <label>{t.removeLanguageButtonLabel || 'Language removal'}</label>
          <button
            type="button"
            className="admin-secondary-button"
            onClick={onRemoveTranslationLanguage}
            disabled={['en', 'de'].includes(activeTranslationLanguage)}
          >
            {t.removeLanguageButtonLabel || 'Remove selected language'}
          </button>
          <small>{t.removeLanguageHelp || 'English (en) and German (de) cannot be removed.'}</small>
        </div>

        {i18nMessage && (
          <div className={`admin-message admin-message-${i18nMessageType || 'success'}`} style={{ marginTop: '1rem' }}>
            {i18nMessage}
          </div>
        )}
      </div>

      <div className="admin-section">
        <h2>{t.translationsSectionTitle}</h2>

        <div className="admin-current-config">
          <h3>{t.currentConfigTitle}</h3>
          <div className="config-grid">
            <div className="config-item">
              <span className="config-label">{t.languagesLabel || 'Languages'}</span>
              <span className="config-value">{Object.keys(currentMaintenanceTranslations || {}).join(', ') || '-'}</span>
            </div>
            <div className="config-item">
              <span className="config-label">{t.adminLanguagesLabel || 'Admin Languages'}</span>
              <span className="config-value">{Object.keys(currentAdminTranslations || {}).join(', ') || '-'}</span>
            </div>
            <div className="config-item">
              <span className="config-label">{t.lastUpdatedLabel}</span>
              <span className="config-value">{i18nLastUpdated || '-'}</span>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="admin-current-config admin-collapsible-config" style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              className="admin-collapsible-header"
              onClick={() => onToggleTranslationGroup('maintenanceTranslationsSection')}
              aria-expanded={!collapsedTranslationGroups?.maintenanceTranslationsSection}
            >
              <h3>{t.maintenanceTranslationsLabel}</h3>
              <span className="admin-collapsible-chevron">{collapsedTranslationGroups?.maintenanceTranslationsSection ? '▸' : '▾'}</span>
            </button>
            {!collapsedTranslationGroups?.maintenanceTranslationsSection && (
              <>
                <div className="admin-form-group">
                  <small>{t.maintenanceTranslationsHelp}</small>
                </div>
                <div className="admin-form-group">
                  <label htmlFor="maintenanceTitleInput">{t.maintenanceTitleLabel}</label>
                  <input
                    type="text"
                    id="maintenanceTitleInput"
                    value={selectedMaintenanceTranslation.title || ''}
                    onChange={(e) => onMaintenanceTranslationFieldChange(activeTranslationLanguage, 'title', e.target.value)}
                  />
                </div>
                <div className="admin-form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="maintenanceBodyInput">{t.maintenanceBodyLabel}</label>
                  <textarea
                    id="maintenanceBodyInput"
                    value={selectedMaintenanceTranslation.body || ''}
                    onChange={(e) => onMaintenanceTranslationFieldChange(activeTranslationLanguage, 'body', e.target.value)}
                    rows={4}
                    className="admin-textarea"
                  />
                </div>
              </>
            )}
          </div>

          {quickAdminTranslationGroups.map((group) => (
            <div className="admin-current-config admin-collapsible-config" style={{ marginBottom: '1rem' }} key={group.labelKey}>
              <button
                type="button"
                className="admin-collapsible-header"
                onClick={() => onToggleTranslationGroup(group.labelKey)}
                aria-expanded={!collapsedTranslationGroups?.[group.labelKey]}
              >
                <h3>{t[group.labelKey] || group.labelKey}</h3>
                <span className="admin-collapsible-chevron">{collapsedTranslationGroups?.[group.labelKey] ? '▸' : '▾'}</span>
              </button>
              {!collapsedTranslationGroups?.[group.labelKey] && group.keys.map((key) => (
                <div className="admin-form-group" key={key}>
                  <label htmlFor={`adminTranslation-${key}`}>{key}</label>
                  <input
                    type="text"
                    id={`adminTranslation-${key}`}
                    value={selectedAdminTranslation[key] || ''}
                    onChange={(e) => onAdminTranslationFieldChange(activeTranslationLanguage, key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          ))}

          <div className="admin-current-config admin-collapsible-config" style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              className="admin-collapsible-header"
              onClick={() => onToggleTranslationGroup('advancedTranslationsSection')}
              aria-expanded={!collapsedTranslationGroups?.advancedTranslationsSection}
            >
              <h3>{t.advancedTranslationsToggleLabel}</h3>
              <span className="admin-collapsible-chevron">{collapsedTranslationGroups?.advancedTranslationsSection ? '▸' : '▾'}</span>
            </button>

            {!collapsedTranslationGroups?.advancedTranslationsSection && (
              <>
                <div className="admin-form-group">
                  <label className="inline-label">
                    <span className="label-text">{t.advancedTranslationsToggleLabel}</span>
                    <input
                      type="checkbox"
                      checked={showAdvancedTranslationsEditor}
                      onChange={(e) => onShowAdvancedEditorChange(e.target.checked)}
                    />
                  </label>
                  <small>{t.advancedTranslationsHelp}</small>
                </div>

                {showAdvancedTranslationsEditor && (
                  <>
                    <div className="admin-form-group">
                      <label htmlFor="maintenanceTranslationsText">{t.maintenanceJsonLabel}</label>
                      <textarea
                        id="maintenanceTranslationsText"
                        value={maintenanceTranslationsText}
                        onChange={(e) => onMaintenanceTranslationsTextChange(e.target.value)}
                        rows={10}
                        className="admin-textarea"
                      />
                    </div>

                    <div className="admin-form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="adminTranslationsText">{t.adminJsonLabel}</label>
                      <textarea
                        id="adminTranslationsText"
                        value={adminTranslationsText}
                        onChange={(e) => onAdminTranslationsTextChange(e.target.value)}
                        rows={12}
                        className="admin-textarea"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <button 
            type="submit" 
            className="admin-submit-button"
            disabled={
              maintenanceTranslationsText === JSON.stringify(currentMaintenanceTranslations, null, 2) &&
              adminTranslationsText === JSON.stringify(currentAdminTranslations, null, 2)
            }
          >
            {t.translationsSubmitButton}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TranslationsTab;
