import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAdminTranslations } from './useAdminTranslations.js';

vi.mock('../../../config/admin-translations.js', () => ({
  default: { en: { title: 'Admin Panel', loginButton: 'Login' }, de: { title: 'Admin-Bereich', loginButton: 'Anmelden' } }
}));

vi.mock('../services/admin-submissions.js', () => ({
  submitI18nConfig: vi.fn(),
  submitAutoTranslate: vi.fn()
}));

vi.mock('../helpers/translation-helpers.js', () => ({
  normalizeLanguageCode: vi.fn((v) => String(v || '').trim().toLowerCase())
}));

import { submitI18nConfig, submitAutoTranslate } from '../services/admin-submissions.js';

describe('useAdminTranslations', () => {
  let getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig;
  let _capturedUpdater;

  const translations = {
    errorUnauthorized: 'Unauthorized',
    errorUnknown: 'Unknown error',
    errorPrefix: 'Error:',
    translationsSuccessMessage: 'Translations saved',
    languageAddedSuccessMessage: 'Language added',
    languageRemovedSuccessMessage: 'Language removed',
    invalidLanguageCodeMessage: 'Invalid language code',
    removeLanguageDefaultError: 'Cannot remove en/de'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    getRequestHeaders = vi.fn(() => ({ 'Content-Type': 'application/json' }));
    handleUnauthorizedAccess = vi.fn();
    getTranslations = vi.fn(() => translations);
    configRef = { current: {
      newTranslationLanguageCode: '',
      translationLanguage: 'en',
      currentMaintenanceTranslations: { en: { title: 'Maintenance', body: 'Unavailable' }, de: { title: 'Wartung', body: 'Nicht verfügbar' } },
      currentAdminTranslations: { en: { title: 'Admin' }, de: { title: 'Admin-Bereich' } },
      maintenanceTranslationsText: '{}',
      adminTranslationsText: '{}',
      showAdvancedTranslationsEditor: false,
      collapsedTranslationGroups: {}
    }};
    _capturedUpdater = null;
    updateConfig = vi.fn((patch) => {
      if (typeof patch === 'function') {
        const result = patch(configRef.current);
        Object.assign(configRef.current, result);
        _capturedUpdater = patch;
      } else {
        Object.assign(configRef.current, patch);
      }
    });
    loadCurrentConfig = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const renderTranslationsHook = () =>
    renderHook(() => useAdminTranslations(getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig));

  // --- handleTranslationLanguageChange ---
  it('handleTranslationLanguageChange sets language', () => {
    const { result } = renderTranslationsHook();
    act(() => { result.current.handleTranslationLanguageChange('fr'); });
    expect(updateConfig).toHaveBeenCalledWith({ translationLanguage: 'fr', translationLanguageDraftError: null });
  });

  it('handleTranslationLanguageChange defaults to en for empty', () => {
    const { result } = renderTranslationsHook();
    act(() => { result.current.handleTranslationLanguageChange(''); });
    expect(updateConfig).toHaveBeenCalledWith({ translationLanguage: 'en', translationLanguageDraftError: null });
  });

  it('handleTranslationLanguageChange trims and lowercases', () => {
    const { result } = renderTranslationsHook();
    act(() => { result.current.handleTranslationLanguageChange('  FR  '); });
    expect(updateConfig).toHaveBeenCalledWith({ translationLanguage: 'fr', translationLanguageDraftError: null });
  });

  // --- handleNewTranslationLanguageChange ---
  it('handleNewTranslationLanguageChange updates code', () => {
    const { result } = renderTranslationsHook();
    act(() => { result.current.handleNewTranslationLanguageChange('es'); });
    expect(updateConfig).toHaveBeenCalledWith({ newTranslationLanguageCode: 'es', translationLanguageDraftError: null });
  });

  // --- handleAddTranslationLanguage ---
  it('handleAddTranslationLanguage rejects invalid code', () => {
    configRef.current.newTranslationLanguageCode = '123';
    const { result } = renderTranslationsHook();
    act(() => { result.current.handleAddTranslationLanguage(); });
    expect(updateConfig).toHaveBeenCalledWith({ translationLanguageDraftError: 'Invalid language code' });
  });

  it('handleAddTranslationLanguage rejects empty code', () => {
    configRef.current.newTranslationLanguageCode = '';
    const { result } = renderTranslationsHook();
    act(() => { result.current.handleAddTranslationLanguage(); });
    expect(updateConfig).toHaveBeenCalledWith({ translationLanguageDraftError: 'Invalid language code' });
  });

  it('handleAddTranslationLanguage adds en and calls saveI18nConfig', async () => {
    configRef.current.newTranslationLanguageCode = 'en';
    submitI18nConfig.mockResolvedValue({ ok: true, status: 200, data: { config: {} } });
    const { result } = renderTranslationsHook();
    act(() => { result.current.handleAddTranslationLanguage(); });
    // The updater function should have been called
    expect(updateConfig).toHaveBeenCalled();
    // Run the setTimeout
    await act(async () => { vi.runAllTimers(); });
    expect(submitI18nConfig).toHaveBeenCalled();
  });

  it('handleAddTranslationLanguage adds non-en and calls autoTranslate', async () => {
    configRef.current.newTranslationLanguageCode = 'fr';
    submitAutoTranslate.mockResolvedValue({ ok: true, status: 200, data: { success: true, maintenance: { title: 'Titre', body: 'Corps' }, admin: { title: 'Admin' } } });
    submitI18nConfig.mockResolvedValue({ ok: true, status: 200, data: { config: {} } });
    const { result } = renderTranslationsHook();
    act(() => { result.current.handleAddTranslationLanguage(); });
    await act(async () => { vi.runAllTimers(); });
    expect(submitAutoTranslate).toHaveBeenCalled();
  });

  // --- handleRemoveTranslationLanguage ---
  it('handleRemoveTranslationLanguage rejects en', () => {
    configRef.current.translationLanguage = 'en';
    const { result } = renderTranslationsHook();
    act(() => { result.current.handleRemoveTranslationLanguage(); });
    expect(updateConfig).toHaveBeenCalledWith({ translationLanguageDraftError: 'Cannot remove en/de' });
  });

  it('handleRemoveTranslationLanguage rejects de', () => {
    configRef.current.translationLanguage = 'de';
    const { result } = renderTranslationsHook();
    act(() => { result.current.handleRemoveTranslationLanguage(); });
    expect(updateConfig).toHaveBeenCalledWith({ translationLanguageDraftError: 'Cannot remove en/de' });
  });

  it('handleRemoveTranslationLanguage removes valid language', async () => {
    configRef.current.translationLanguage = 'fr';
    configRef.current.currentMaintenanceTranslations = { en: {}, de: {}, fr: {} };
    configRef.current.currentAdminTranslations = { en: {}, de: {}, fr: {} };
    submitI18nConfig.mockResolvedValue({ ok: true, status: 200, data: { config: {} } });
    const { result } = renderTranslationsHook();
    act(() => { result.current.handleRemoveTranslationLanguage(); });
    expect(updateConfig).toHaveBeenCalled();
    await act(async () => { vi.runAllTimers(); });
    expect(submitI18nConfig).toHaveBeenCalled();
  });

  it('handleRemoveTranslationLanguage does nothing for empty language', () => {
    configRef.current.translationLanguage = '';
    const { result } = renderTranslationsHook();
    act(() => { result.current.handleRemoveTranslationLanguage(); });
    // Should not call updateConfig with error since it returns early
    expect(updateConfig).not.toHaveBeenCalled();
  });

  // --- toggleTranslationGroup ---
  it('toggleTranslationGroup toggles group state', () => {
    const { result } = renderTranslationsHook();
    act(() => { result.current.toggleTranslationGroup('general'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.any(Function));
    // Verify the updater function works
    const updater = updateConfig.mock.calls[0][0];
    const newState = updater({ collapsedTranslationGroups: {} });
    expect(newState.collapsedTranslationGroups.general).toBe(true);
  });

  it('toggleTranslationGroup untoggles already-collapsed group', () => {
    const { result } = renderTranslationsHook();
    act(() => { result.current.toggleTranslationGroup('general'); });
    const updater = updateConfig.mock.calls[0][0];
    const newState = updater({ collapsedTranslationGroups: { general: true } });
    expect(newState.collapsedTranslationGroups.general).toBe(false);
  });

  // --- handleMaintenanceTranslationFieldChange ---
  it('handleMaintenanceTranslationFieldChange updates field', () => {
    const { result } = renderTranslationsHook();
    act(() => { result.current.handleMaintenanceTranslationFieldChange('en', 'title', 'New Title'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.any(Function));
    const updater = updateConfig.mock.calls[0][0];
    const newState = updater({ currentMaintenanceTranslations: { en: { title: 'Old', body: 'Body' } } });
    expect(newState.currentMaintenanceTranslations.en.title).toBe('New Title');
  });

  // --- handleAdminTranslationFieldChange ---
  it('handleAdminTranslationFieldChange updates field', () => {
    const { result } = renderTranslationsHook();
    act(() => { result.current.handleAdminTranslationFieldChange('de', 'loginButton', 'Einloggen'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.any(Function));
    const updater = updateConfig.mock.calls[0][0];
    const newState = updater({ currentAdminTranslations: { de: { loginButton: 'Anmelden' } } });
    expect(newState.currentAdminTranslations.de.loginButton).toBe('Einloggen');
  });

  // --- handleI18nSubmit ---
  it('handleI18nSubmit in normal mode calls saveI18nConfig', async () => {
    configRef.current.showAdvancedTranslationsEditor = false;
    submitI18nConfig.mockResolvedValue({ ok: true, status: 200, data: { config: {} } });
    const { result } = renderTranslationsHook();
    const fakeEvent = { preventDefault: vi.fn() };
    await act(async () => { result.current.handleI18nSubmit(fakeEvent); });
    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(submitI18nConfig).toHaveBeenCalled();
  });

  it('handleI18nSubmit in advanced mode parses JSON', async () => {
    configRef.current.showAdvancedTranslationsEditor = true;
    configRef.current.maintenanceTranslationsText = '{"en":{"title":"Test"}}';
    configRef.current.adminTranslationsText = '{"en":{"loginButton":"Login"}}';
    submitI18nConfig.mockResolvedValue({ ok: true, status: 200, data: { config: {} } });
    const { result } = renderTranslationsHook();
    const fakeEvent = { preventDefault: vi.fn() };
    await act(async () => { result.current.handleI18nSubmit(fakeEvent); });
    expect(submitI18nConfig).toHaveBeenCalled();
  });

  it('handleI18nSubmit in advanced mode shows error for invalid JSON', async () => {
    configRef.current.showAdvancedTranslationsEditor = true;
    configRef.current.maintenanceTranslationsText = 'not-json';
    const { result } = renderTranslationsHook();
    const fakeEvent = { preventDefault: vi.fn() };
    await act(async () => { result.current.handleI18nSubmit(fakeEvent); });
    expect(submitI18nConfig).not.toHaveBeenCalled();
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ i18nMessageType: 'error' }));
  });

  it('handleI18nSubmit in advanced mode rejects array JSON', async () => {
    configRef.current.showAdvancedTranslationsEditor = true;
    configRef.current.maintenanceTranslationsText = '[]';
    const { result } = renderTranslationsHook();
    const fakeEvent = { preventDefault: vi.fn() };
    await act(async () => { result.current.handleI18nSubmit(fakeEvent); });
    expect(submitI18nConfig).not.toHaveBeenCalled();
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ i18nMessageType: 'error' }));
  });

  // --- saveI18nConfig (tested through handleI18nSubmit) ---
  it('saveI18nConfig handles 401', async () => {
    configRef.current.showAdvancedTranslationsEditor = false;
    submitI18nConfig.mockResolvedValue({ ok: false, status: 401, data: {} });
    const { result } = renderTranslationsHook();
    const fakeEvent = { preventDefault: vi.fn() };
    await act(async () => { result.current.handleI18nSubmit(fakeEvent); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('saveI18nConfig handles non-ok response', async () => {
    configRef.current.showAdvancedTranslationsEditor = false;
    submitI18nConfig.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server error' } });
    const { result } = renderTranslationsHook();
    const fakeEvent = { preventDefault: vi.fn() };
    await act(async () => { result.current.handleI18nSubmit(fakeEvent); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ i18nMessageType: 'error' }));
  });

  it('saveI18nConfig handles success and updates config', async () => {
    configRef.current.showAdvancedTranslationsEditor = false;
    submitI18nConfig.mockResolvedValue({
      ok: true, status: 200,
      data: { config: { maintenanceMessages: { en: { title: 'Saved' } }, adminTranslations: { en: { title: 'Saved Admin' } } } }
    });
    const { result } = renderTranslationsHook();
    const fakeEvent = { preventDefault: vi.fn() };
    await act(async () => { result.current.handleI18nSubmit(fakeEvent); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ i18nMessageType: 'success' }));
    expect(loadCurrentConfig).toHaveBeenCalled();
  });

  // --- autoTranslateLanguageFromEnglish ---
  it('autoTranslateLanguageFromEnglish handles 401', async () => {
    submitAutoTranslate.mockResolvedValue({ ok: false, status: 401, data: {} });
    submitI18nConfig.mockResolvedValue({ ok: true, status: 200, data: { config: {} } });
    const { result } = renderTranslationsHook();
    await act(async () => { await result.current.autoTranslateLanguageFromEnglish('fr'); });
    expect(handleUnauthorizedAccess).toHaveBeenCalled();
  });

  it('autoTranslateLanguageFromEnglish handles error and still saves', async () => {
    submitAutoTranslate.mockRejectedValue(new Error('Network error'));
    submitI18nConfig.mockResolvedValue({ ok: true, status: 200, data: { config: {} } });
    const { result } = renderTranslationsHook();
    await act(async () => { await result.current.autoTranslateLanguageFromEnglish('fr'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ i18nMessageType: 'error' }));
    expect(submitI18nConfig).toHaveBeenCalled();
  });

  it('autoTranslateLanguageFromEnglish handles success', async () => {
    submitAutoTranslate.mockResolvedValue({
      ok: true, status: 200,
      data: { success: true, maintenance: { title: 'Titre', body: 'Corps' }, admin: { title: 'Admin FR' } }
    });
    submitI18nConfig.mockResolvedValue({ ok: true, status: 200, data: { config: {} } });
    const { result } = renderTranslationsHook();
    await act(async () => { await result.current.autoTranslateLanguageFromEnglish('fr'); });
    expect(updateConfig).toHaveBeenCalledWith(expect.any(Function));
    expect(submitI18nConfig).toHaveBeenCalled();
  });
});
