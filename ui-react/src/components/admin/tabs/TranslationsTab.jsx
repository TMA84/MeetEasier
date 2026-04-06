/**
* @file TranslationsTab.js
* @description Admin panel tab for managing UI translations across multiple languages. Supports adding/removing languages, editing maintenance and admin translation strings per language, and an advanced JSON editor for bulk edits.
*/
import React from 'react';

const LanguageTabs = ({ availableTranslationLanguages, activeTranslationLanguage, t, getLanguageDisplayName, onTranslationLanguageChange }) => (
  <div className="admin-tabs admin-submenu-tabs" role="tablist" aria-label={t.translationLanguageLabel}>
    {availableTranslationLanguages.map((language) => {
      const active = activeTranslationLanguage === language;
      return (<button key={language} type="button" role="tab" aria-selected={active} className={`admin-tab ${active ? 'active' : ''}`} onClick={() => onTranslationLanguageChange(language)}>{getLanguageDisplayName(language)}</button>);
    })}
  </div>
);

const LanguageManagement = ({ t, newTranslationLanguageCode, translationLanguageDraftError, activeTranslationLanguage, i18nMessage, i18nMessageType, onNewTranslationLanguageChange, onAddTranslationLanguage, onRemoveTranslationLanguage }) => (
  <div className="admin-section">
    <h2>{t.addLanguageButtonLabel}</h2>
    <div className="admin-form-group admin-mb-0">
      <label htmlFor="newTranslationLanguageCode">{t.addLanguageButtonLabel}</label>
      <div className="admin-flex-row">
        <input type="text" id="newTranslationLanguageCode" value={newTranslationLanguageCode} placeholder={t.addLanguagePlaceholder || 'z. B. fr oder en-gb'} onChange={(e) => onNewTranslationLanguageChange(e.target.value)} />
        <button type="button" className="admin-secondary-button" onClick={onAddTranslationLanguage}>{t.addLanguageButtonLabel}</button>
      </div>
      <small>{t.addLanguageHelp}</small>
      {translationLanguageDraftError && (<small className="translation-error-text">{translationLanguageDraftError}</small>)}
    </div>
    <div className="admin-form-group admin-mt-1 admin-mb-0">
      <label>{t.removeLanguageButtonLabel || 'Language removal'}</label>
      <button type="button" className="admin-secondary-button" onClick={onRemoveTranslationLanguage} disabled={['en', 'de'].includes(activeTranslationLanguage)}>{t.removeLanguageButtonLabel || 'Remove selected language'}</button>
      <small>{t.removeLanguageHelp || 'English (en) and German (de) cannot be removed.'}</small>
    </div>
    {i18nMessage && (<div className={`admin-message admin-message-${i18nMessageType || 'success'} admin-mt-1`}>{i18nMessage}</div>)}
  </div>
);

const MaintenanceSection = ({ t, collapsedTranslationGroups, selectedMaintenanceTranslation, activeTranslationLanguage, onToggleTranslationGroup, onMaintenanceTranslationFieldChange }) => (
  <div className="admin-current-config admin-collapsible-config admin-mb-1">
    <button type="button" className="admin-collapsible-header" onClick={() => onToggleTranslationGroup('maintenanceTranslationsSection')} aria-expanded={!collapsedTranslationGroups?.maintenanceTranslationsSection}>
      <h3>{t.maintenanceTranslationsLabel}</h3>
      <span className="admin-collapsible-chevron">{collapsedTranslationGroups?.maintenanceTranslationsSection ? '▸' : '▾'}</span>
    </button>
    {!collapsedTranslationGroups?.maintenanceTranslationsSection && (
      <>
        <div className="admin-form-group"><small>{t.maintenanceTranslationsHelp}</small></div>
        <div className="admin-form-group"><label htmlFor="maintenanceTitleInput">{t.maintenanceTitleLabel}</label><input type="text" id="maintenanceTitleInput" value={selectedMaintenanceTranslation.title || ''} onChange={(e) => onMaintenanceTranslationFieldChange(activeTranslationLanguage, 'title', e.target.value)} /></div>
        <div className="admin-form-group admin-mb-0"><label htmlFor="maintenanceBodyInput">{t.maintenanceBodyLabel}</label><textarea id="maintenanceBodyInput" value={selectedMaintenanceTranslation.body || ''} onChange={(e) => onMaintenanceTranslationFieldChange(activeTranslationLanguage, 'body', e.target.value)} rows={4} className="admin-textarea" /></div>
      </>
    )}
  </div>
);

const AdminTranslationGroup = ({ group, t, collapsedTranslationGroups, selectedAdminTranslation, activeTranslationLanguage, onToggleTranslationGroup, onAdminTranslationFieldChange }) => (
  <div className="admin-current-config admin-collapsible-config admin-mb-1" key={group.labelKey}>
    <button type="button" className="admin-collapsible-header" onClick={() => onToggleTranslationGroup(group.labelKey)} aria-expanded={!collapsedTranslationGroups?.[group.labelKey]}>
      <h3>{t[group.labelKey] || group.labelKey}</h3>
      <span className="admin-collapsible-chevron">{collapsedTranslationGroups?.[group.labelKey] ? '▸' : '▾'}</span>
    </button>
    {!collapsedTranslationGroups?.[group.labelKey] && group.keys.map((key) => (
      <div className="admin-form-group" key={key}><label htmlFor={`adminTranslation-${key}`}>{key}</label><input type="text" id={`adminTranslation-${key}`} value={selectedAdminTranslation[key] || ''} onChange={(e) => onAdminTranslationFieldChange(activeTranslationLanguage, key, e.target.value)} /></div>
    ))}
  </div>
);

const AdvancedEditor = ({ t, collapsedTranslationGroups, showAdvancedTranslationsEditor, maintenanceTranslationsText, adminTranslationsText, onToggleTranslationGroup, onShowAdvancedEditorChange, onMaintenanceTranslationsTextChange, onAdminTranslationsTextChange }) => (
  <div className="admin-current-config admin-collapsible-config admin-mb-1">
    <button type="button" className="admin-collapsible-header" onClick={() => onToggleTranslationGroup('advancedTranslationsSection')} aria-expanded={!collapsedTranslationGroups?.advancedTranslationsSection}>
      <h3>{t.advancedTranslationsToggleLabel}</h3>
      <span className="admin-collapsible-chevron">{collapsedTranslationGroups?.advancedTranslationsSection ? '▸' : '▾'}</span>
    </button>
    {!collapsedTranslationGroups?.advancedTranslationsSection && (
      <>
        <div className="admin-form-group"><label className="inline-label"><span className="label-text">{t.advancedTranslationsToggleLabel}</span><input type="checkbox" checked={showAdvancedTranslationsEditor} onChange={(e) => onShowAdvancedEditorChange(e.target.checked)} /></label><small>{t.advancedTranslationsHelp}</small></div>
        {showAdvancedTranslationsEditor && (
          <>
            <div className="admin-form-group"><label htmlFor="maintenanceTranslationsText">{t.maintenanceJsonLabel}</label><textarea id="maintenanceTranslationsText" value={maintenanceTranslationsText} onChange={(e) => onMaintenanceTranslationsTextChange(e.target.value)} rows={10} className="admin-textarea" /></div>
            <div className="admin-form-group admin-mb-0"><label htmlFor="adminTranslationsText">{t.adminJsonLabel}</label><textarea id="adminTranslationsText" value={adminTranslationsText} onChange={(e) => onAdminTranslationsTextChange(e.target.value)} rows={12} className="admin-textarea" /></div>
          </>
        )}
      </>
    )}
  </div>
);

const TranslationsTab = ({
  isActive,
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
    <div className={`admin-tab-content ${isActive ? 'active' : ''}`}>
      <LanguageTabs availableTranslationLanguages={availableTranslationLanguages} activeTranslationLanguage={activeTranslationLanguage} t={t} getLanguageDisplayName={getLanguageDisplayName} onTranslationLanguageChange={onTranslationLanguageChange} />

      {!currentTranslationApiHasApiKey && (
        <div className="admin-message admin-message-warning">
          {t.translationApiKeyLabel || 'Translation API Key'}: {(t.translationApiApiKeyNotConfigured || 'Not configured')}. {t.translationApiTabLabel || 'Translation API'} {(t.errorPrefix || 'Error:').replace(/:$/, '')} - Auto-Translate is disabled until an API key is set.
        </div>
      )}

      <LanguageManagement t={t} newTranslationLanguageCode={newTranslationLanguageCode} translationLanguageDraftError={translationLanguageDraftError} activeTranslationLanguage={activeTranslationLanguage} i18nMessage={i18nMessage} i18nMessageType={i18nMessageType} onNewTranslationLanguageChange={onNewTranslationLanguageChange} onAddTranslationLanguage={onAddTranslationLanguage} onRemoveTranslationLanguage={onRemoveTranslationLanguage} />

      <div className="admin-section">
        <h2>{t.translationsSectionTitle}</h2>
        <div className="admin-current-config">
          <h3>{t.currentConfigTitle}</h3>
          <div className="config-grid">
            <div className="config-item"><span className="config-label">{t.languagesLabel || 'Languages'}</span><span className="config-value">{Object.keys(currentMaintenanceTranslations || {}).join(', ') || '-'}</span></div>
            <div className="config-item"><span className="config-label">{t.adminLanguagesLabel || 'Admin Languages'}</span><span className="config-value">{Object.keys(currentAdminTranslations || {}).join(', ') || '-'}</span></div>
            <div className="config-item"><span className="config-label">{t.lastUpdatedLabel}</span><span className="config-value">{i18nLastUpdated || '-'}</span></div>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <MaintenanceSection t={t} collapsedTranslationGroups={collapsedTranslationGroups} selectedMaintenanceTranslation={selectedMaintenanceTranslation} activeTranslationLanguage={activeTranslationLanguage} onToggleTranslationGroup={onToggleTranslationGroup} onMaintenanceTranslationFieldChange={onMaintenanceTranslationFieldChange} />

          {quickAdminTranslationGroups.map((group) => (
            <AdminTranslationGroup key={group.labelKey} group={group} t={t} collapsedTranslationGroups={collapsedTranslationGroups} selectedAdminTranslation={selectedAdminTranslation} activeTranslationLanguage={activeTranslationLanguage} onToggleTranslationGroup={onToggleTranslationGroup} onAdminTranslationFieldChange={onAdminTranslationFieldChange} />
          ))}

          <AdvancedEditor t={t} collapsedTranslationGroups={collapsedTranslationGroups} showAdvancedTranslationsEditor={showAdvancedTranslationsEditor} maintenanceTranslationsText={maintenanceTranslationsText} adminTranslationsText={adminTranslationsText} onToggleTranslationGroup={onToggleTranslationGroup} onShowAdvancedEditorChange={onShowAdvancedEditorChange} onMaintenanceTranslationsTextChange={onMaintenanceTranslationsTextChange} onAdminTranslationsTextChange={onAdminTranslationsTextChange} />

          <button type="submit" className="admin-submit-button" disabled={maintenanceTranslationsText === JSON.stringify(currentMaintenanceTranslations, null, 2) && adminTranslationsText === JSON.stringify(currentAdminTranslations, null, 2)}>{t.translationsSubmitButton}</button>
        </form>
      </div>
    </div>
  );
};

export default TranslationsTab;
