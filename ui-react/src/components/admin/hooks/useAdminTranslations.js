/**
 * @file useAdminTranslations.js
 * @description Hook for translation management handlers.
 */
import { useCallback } from 'react';
import defaultAdminTranslations from '../../../config/admin-translations.js';
import { submitI18nConfig, submitAutoTranslate } from '../services/admin-submissions.js';
import { normalizeLanguageCode } from '../helpers/translation-helpers.js';

/**
 * @param {Function} getRequestHeaders
 * @param {Function} handleUnauthorizedAccess
 * @param {Function} getTranslations
 * @param {Object} configRef
 * @param {Function} updateConfig
 * @param {Function} loadCurrentConfig
 */
export function useAdminTranslations(getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig) {

  const saveI18nConfig = useCallback((maintenanceMessages, adminTranslations, successMessage) => {
    const t = getTranslations();
    return submitI18nConfig(getRequestHeaders, { maintenanceMessages, adminTranslations })
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); }
        if (!r.ok) throw new Error(r.data?.error || t.errorUnknown);
        const saved = r.data.config?.maintenanceMessages || maintenanceMessages;
        const savedAdmin = r.data.config?.adminTranslations || adminTranslations;
        updateConfig({ i18nMessage: successMessage || t.translationsSuccessMessage, i18nMessageType: 'success', currentMaintenanceTranslations: saved, maintenanceTranslationsText: JSON.stringify(saved, null, 2), currentAdminTranslations: savedAdmin, adminTranslationsText: JSON.stringify(savedAdmin, null, 2) });
        loadCurrentConfig();
      })
      .catch(err => { updateConfig({ i18nMessage: `${t.errorPrefix} ${err.message}`, i18nMessageType: 'error' }); });
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, updateConfig, loadCurrentConfig]);

  const autoTranslateLanguageFromEnglish = useCallback(async (targetLanguage) => {
    const t = getTranslations();
    const s = configRef.current;
    const sourceMaintenance = s.currentMaintenanceTranslations?.en || { title: '', body: '' };
    const sourceAdmin = { ...(defaultAdminTranslations.en || {}), ...(s.currentAdminTranslations?.en || {}) };
    try {
      const r = await submitAutoTranslate(getRequestHeaders, { sourceLanguage: 'en', targetLanguage, maintenanceSource: sourceMaintenance, adminSource: sourceAdmin });
      if (r.status === 401) { handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); }
      if (!r.ok || !r.data?.success) throw new Error(r.data?.error || t.errorUnknown);
      updateConfig(prev => {
        const nextMT = { ...(prev.currentMaintenanceTranslations || {}), [targetLanguage]: { title: String(r.data.maintenance?.title || sourceMaintenance.title || ''), body: String(r.data.maintenance?.body || sourceMaintenance.body || '') } };
        const nextAT = { ...(prev.currentAdminTranslations || {}), [targetLanguage]: { ...sourceAdmin, ...(r.data.admin || {}) } };
        return { ...prev, currentMaintenanceTranslations: nextMT, maintenanceTranslationsText: JSON.stringify(nextMT, null, 2), currentAdminTranslations: nextAT, adminTranslationsText: JSON.stringify(nextAT, null, 2) };
      });
      // Save after state update
      const nextS = configRef.current;
      saveI18nConfig(nextS.currentMaintenanceTranslations, nextS.currentAdminTranslations, t.languageAddedSuccessMessage || t.translationsSuccessMessage);
    } catch (error) {
      updateConfig({ i18nMessage: `${t.errorPrefix} ${error.message}`, i18nMessageType: 'error' });
      const nextS = configRef.current;
      saveI18nConfig(nextS.currentMaintenanceTranslations, nextS.currentAdminTranslations, t.languageAddedSuccessMessage || t.translationsSuccessMessage);
    }
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, saveI18nConfig]);

  const handleTranslationLanguageChange = useCallback((language) => {
    updateConfig({ translationLanguage: String(language || '').trim().toLowerCase() || 'en', translationLanguageDraftError: null });
  }, [updateConfig]);

  const handleNewTranslationLanguageChange = useCallback((value) => {
    updateConfig({ newTranslationLanguageCode: value, translationLanguageDraftError: null });
  }, [updateConfig]);

  const handleAddTranslationLanguage = useCallback(() => {
    const t = getTranslations();
    const newLang = normalizeLanguageCode(configRef.current.newTranslationLanguageCode);
    if (!newLang || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(newLang)) { updateConfig({ translationLanguageDraftError: t.invalidLanguageCodeMessage || 'Ungültiger Sprachcode' }); return; }
    updateConfig(prev => {
      const nextMT = { ...(prev.currentMaintenanceTranslations || {}) };
      const nextAT = { ...(prev.currentAdminTranslations || {}) };
      const ms = nextMT.en || {}; const as = { ...(defaultAdminTranslations.en || {}), ...(nextAT.en || {}) };
      const em = nextMT[newLang] || {}; nextMT[newLang] = { title: String(em.title || ms.title || ''), body: String(em.body || ms.body || '') };
      const ea = nextAT[newLang] || {}; nextAT[newLang] = { ...as, ...ea };
      return { ...prev, currentMaintenanceTranslations: nextMT, maintenanceTranslationsText: JSON.stringify(nextMT, null, 2), currentAdminTranslations: nextAT, adminTranslationsText: JSON.stringify(nextAT, null, 2), translationLanguage: newLang, newTranslationLanguageCode: '', translationLanguageDraftError: null };
    });
    // After state update, save or auto-translate
    setTimeout(() => {
      if (newLang === 'en') {
        const s = configRef.current;
        saveI18nConfig(s.currentMaintenanceTranslations, s.currentAdminTranslations, t.languageAddedSuccessMessage || t.translationsSuccessMessage);
      } else {
        autoTranslateLanguageFromEnglish(newLang);
      }
    }, 0);
  }, [getTranslations, configRef, updateConfig, saveI18nConfig, autoTranslateLanguageFromEnglish]);

  const handleRemoveTranslationLanguage = useCallback(() => {
    const t = getTranslations();
    const s = configRef.current;
    const lang = normalizeLanguageCode(s.translationLanguage);
    if (!lang) return;
    if (['en', 'de'].includes(lang)) { updateConfig({ translationLanguageDraftError: t.removeLanguageDefaultError || 'English (en) and German (de) cannot be removed' }); return; }
    updateConfig(prev => {
      const nextMT = { ...(prev.currentMaintenanceTranslations || {}) }; const nextAT = { ...(prev.currentAdminTranslations || {}) };
      delete nextMT[lang]; delete nextAT[lang];
      const nextLangs = Array.from(new Set([...Object.keys(defaultAdminTranslations || {}), ...Object.keys(nextMT), ...Object.keys(nextAT)])).map(l => String(l || '').trim().toLowerCase()).filter(Boolean).sort();
      return { ...prev, currentMaintenanceTranslations: nextMT, maintenanceTranslationsText: JSON.stringify(nextMT, null, 2), currentAdminTranslations: nextAT, adminTranslationsText: JSON.stringify(nextAT, null, 2), translationLanguage: nextLangs.includes('en') ? 'en' : (nextLangs[0] || 'en'), translationLanguageDraftError: null };
    });
    setTimeout(() => {
      const ns = configRef.current;
      saveI18nConfig(ns.currentMaintenanceTranslations, ns.currentAdminTranslations, t.languageRemovedSuccessMessage || t.translationsSuccessMessage);
    }, 0);
  }, [getTranslations, configRef, updateConfig, saveI18nConfig]);

  const toggleTranslationGroup = useCallback((labelKey) => {
    updateConfig(prev => ({ ...prev, collapsedTranslationGroups: { ...(prev.collapsedTranslationGroups || {}), [labelKey]: !prev.collapsedTranslationGroups?.[labelKey] } }));
  }, [updateConfig]);

  const handleMaintenanceTranslationFieldChange = useCallback((language, field, value) => {
    updateConfig(prev => { const next = { ...prev.currentMaintenanceTranslations, [language]: { ...(prev.currentMaintenanceTranslations?.[language] || {}), [field]: value } }; return { ...prev, currentMaintenanceTranslations: next, maintenanceTranslationsText: JSON.stringify(next, null, 2) }; });
  }, [updateConfig]);

  const handleAdminTranslationFieldChange = useCallback((language, key, value) => {
    updateConfig(prev => { const next = { ...prev.currentAdminTranslations, [language]: { ...(prev.currentAdminTranslations?.[language] || {}), [key]: value } }; return { ...prev, currentAdminTranslations: next, adminTranslationsText: JSON.stringify(next, null, 2) }; });
  }, [updateConfig]);

  const handleI18nSubmit = useCallback((e) => {
    e.preventDefault();
    const t = getTranslations();
    const s = configRef.current;
    let mm = s.currentMaintenanceTranslations, at = s.currentAdminTranslations;
    if (s.showAdvancedTranslationsEditor) {
      try { mm = JSON.parse(s.maintenanceTranslationsText || '{}'); if (!mm || typeof mm !== 'object' || Array.isArray(mm)) throw new Error('maintenanceMessages must be an object'); at = JSON.parse(s.adminTranslationsText || '{}'); if (!at || typeof at !== 'object' || Array.isArray(at)) throw new Error('adminTranslations must be an object'); }
      catch (error) { updateConfig({ i18nMessage: `${t.errorPrefix} ${error.message}`, i18nMessageType: 'error' }); return; }
    }
    saveI18nConfig(mm, at, t.translationsSuccessMessage);
  }, [getTranslations, configRef, updateConfig, saveI18nConfig]);

  return {
    handleTranslationLanguageChange, handleNewTranslationLanguageChange,
    handleAddTranslationLanguage, handleRemoveTranslationLanguage,
    toggleTranslationGroup, handleMaintenanceTranslationFieldChange,
    handleAdminTranslationFieldChange, handleI18nSubmit,
    autoTranslateLanguageFromEnglish
  };
}
