/**
 * @file Admin.jsx
 * @description Main admin panel component (function component with hooks).
 *              Provides a tabbed interface for managing all application settings.
 *              Connects to Socket.IO for real-time config update broadcasts.
 */
import React, { useEffect, useCallback, useRef } from 'react';
import defaultAdminTranslations, { getAdminTranslations } from '../../config/admin-translations.js';
import { toOverrideState, fromOverrideState, getLanguageDisplayName } from './helpers/translation-helpers.js';
import { hexToHSL, hslToHex } from './helpers/color-helpers.js';
import { normalizeOverrideKey, ADMIN_TAB_SECTIONS, TAB_TO_SECTION, BASE_TRANSLATION_GROUP_COLLAPSE_STATE } from './helpers/admin-utils.js';
import { loadSidebarConfig } from './services/admin-config-loader.js';

import { useAdminAuth } from './hooks/useAdminAuth.js';
import { useAdminConfig } from './hooks/useAdminConfig.js';
import { useAdminSubmissions } from './hooks/useAdminSubmissions.js';
import { useAdminMqtt } from './hooks/useAdminMqtt.js';
import { useAdminTranslations } from './hooks/useAdminTranslations.js';
import { useAdminSocket } from './hooks/useAdminSocket.js';
import { useAdminIntervals } from './hooks/useAdminIntervals.js';

import PowerManagementModal from './modals/PowerManagementModal';
import TouchkioModal from './modals/TouchkioModal';
import DevicesTab from './tabs/DevicesTab';
import MqttTab from './tabs/MqttTab';
import AuditTab from './tabs/AuditTab';
import BackupTab from './tabs/BackupTab';
import SystemTab from './tabs/SystemTab';
import TranslationApiTab from './tabs/TranslationApiTab';
import MaintenanceTab from './tabs/MaintenanceTab';
import OAuthTab from './tabs/OAuthTab';
import SearchTab from './tabs/SearchTab';
import RateLimitTab from './tabs/RateLimitTab';
import ApiTokenTab from './tabs/ApiTokenTab';
import DisplayTab from './tabs/DisplayTab';
import WiFiTab from './tabs/WiFiTab';
import LogoTab from './tabs/LogoTab';
import BookingTab from './tabs/BookingTab';
import ColorsTab from './tabs/ColorsTab';
import TranslationsTab from './tabs/TranslationsTab';

const QUICK_ADMIN_TRANSLATION_GROUPS = [
  { labelKey: 'adminTranslationGroupGeneralLabel', keys: ['title'] },
  { labelKey: 'adminTranslationGroupTabsLabel', keys: ['displayTabLabel','wifiTabLabel','logoTabLabel','colorsTabLabel','bookingTabLabel','translationsTabLabel','operationsTabLabel'] },
  { labelKey: 'adminTranslationGroupAuthLabel', keys: ['apiTokenLabel','apiTokenPlaceholder'] },
  { labelKey: 'adminTranslationGroupActionsLabel', keys: ['translationsSubmitButton','addLanguageButtonLabel','removeLanguageButtonLabel','removeLanguageHelp','languageAddedSuccessMessage','languageRemovedSuccessMessage','translationApiSectionTitle','translationApiEnableToggleLabel','translationApiUrlLabel','translationApiKeyLabel','translationApiTimeoutLabel','translationApiSaveButton','translationApiTimeoutHelp','translationApiSuccessMessage'] },
  { labelKey: 'adminTranslationGroupErrorsLabel', keys: ['errorPrefix','errorUnauthorized','removeLanguageDefaultError'] },
  { labelKey: 'adminTranslationGroupDisplaysLabel', keys: [
    'displayNextUpLabel','displayCurrentMeetingLabel','displayNavbarTitleLabel','displayFilterAllRoomsLabel',
    'displayStatusAvailableLabel','displayStatusBusyLabel','displayStatusUpcomingLabel','displayStatusNotFoundLabel','displayStatusErrorLabel',
    'displayUpcomingTitleLabel','displayUpcomingMeetingsTitleLabel','displayNoUpcomingMeetingsLabel',
    'displayNoSubjectLabel','displayNoOrganizerLabel','displayPrivateMeetingLabel','displaySeatsLabel','displayNoMeetingDaysLabel',
    'displayErrorTitleLabel','displayErrorOccurredLabel','displayTimeNotAvailableLabel','displayWifiTitleLabel',
    'displayBookRoomButtonLabel','displayExtendMeetingButtonLabel','displayExtendMeetingDisabledLabel',
    'displayMeetingModalTitleLabel','displayMeetingModalExtendByLabel','displayMeetingModalCustomLabel',
    'displayMeetingModalMinutesLabel','displayMeetingModalCancelLabel','displayMeetingModalExtendButtonLabel',
    'displayMeetingModalExtendingLabel','displayMeetingModalEndButtonLabel','displayMeetingModalEndingLabel',
    'displayMeetingModalNoActiveExtendLabel','displayMeetingModalNoActiveEndLabel',
    'displayMeetingModalExtendErrorLabel','displayMeetingModalEndErrorLabel',
    'displayIpNotWhitelistedErrorLabel','displayOriginNotAllowedErrorLabel','displayBookingDisabledErrorLabel',
    'displayBookingModalTitleLabel','displayBookingModalQuickBookLabel','displayBookingModalCustomLabel',
    'displayBookingModalDateLabel','displayBookingModalStartTimeLabel','displayBookingModalDurationLabel',
    'displayBookingModalEndTimeLabel','displayBookingModalTodayLabel','displayBookingModalTomorrowLabel',
    'displayBookingModalMinutesLabel','displayBookingModalHoursLabel','displayBookingModalCancelLabel',
    'displayBookingModalBookButtonLabel','displayBookingModalBookingLabel','displayBookingModalDefaultSubjectLabel',
    'displayBookingModalConflictErrorLabel','displayBookingModalGenericErrorLabel',
    'displayWifiInfoTitleLabel','displayWifiInfoSsidLabel','displayWifiInfoPasswordLabel',
    'displayWifiInfoLoadingLabel','displayWifiInfoErrorPrefixLabel',
    'displayCheckInButtonLabel','displayCheckInExpiredTitleLabel','displayCheckInTooEarlyTitleLabel',
    'displayCheckInCompletedLabel','displayCheckInFailedLabel'
  ] }
];

const DEFAULT_TRANSLATION_GROUP_COLLAPSE_STATE = QUICK_ADMIN_TRANSLATION_GROUPS.reduce((acc, group) => {
  acc[group.labelKey] = true;
  return acc;
}, { ...BASE_TRANSLATION_GROUP_COLLAPSE_STATE });

// Inject default collapse state into initial config on first load
const COLLAPSE_PATCH = { collapsedTranslationGroups: { ...DEFAULT_TRANSLATION_GROUP_COLLAPSE_STATE } };

const Admin = () => {
  // ---- Translation helper (stable ref) ----
  const getTranslationsRef = useRef(null);
  const getTranslations = useCallback(() => {
    return getTranslationsRef.current ? getTranslationsRef.current() : getAdminTranslations({});
  }, []);

  // ---- Auth ----
  const auth = useAdminAuth(getTranslations, {
    onLoginSuccess: () => {
      configHooks.loadConfigLocks();
      configHooks.loadCurrentConfig();
      configHooks.loadSyncStatus();
      intervals.startSyncIntervals();
    },
    onLogout: () => {
      intervals.clearAllIntervals();
      if (mqtt.mqttDisplaysIntervalRef.current) { clearInterval(mqtt.mqttDisplaysIntervalRef.current); mqtt.mqttDisplaysIntervalRef.current = null; }
    }
  });

  // ---- Config ----
  const configHooks = useAdminConfig(auth.getRequestHeaders, auth.handleUnauthorizedAccess);
  const { config, updateConfig, setField, configRef } = configHooks;

  // Apply default collapse state once
  const collapseApplied = useRef(false);
  useEffect(() => {
    if (!collapseApplied.current) {
      collapseApplied.current = true;
      updateConfig(COLLAPSE_PATCH);
    }
  }, [updateConfig]);

  // Keep getTranslations in sync with current admin translations
  getTranslationsRef.current = () => getAdminTranslations(config.currentAdminTranslations);

  // ---- Intervals ----
  const intervals = useAdminIntervals(auth.state.isAuthenticated, configHooks.loadSyncStatus, configHooks.loadConfigLocks, updateConfig);

  // ---- Submissions ----
  const submissions = useAdminSubmissions(
    auth.getRequestHeaders, auth.handleUnauthorizedAccess, getTranslations,
    configRef, updateConfig, configHooks.loadCurrentConfig, configHooks.loadConfigLocks
  );

  // ---- MQTT ----
  const mqtt = useAdminMqtt(
    auth.getRequestHeaders, auth.handleUnauthorizedAccess, getTranslations,
    configRef, updateConfig, submissions.handleLoadConnectedDisplays
  );

  // ---- Translations ----
  const translations = useAdminTranslations(
    auth.getRequestHeaders, auth.handleUnauthorizedAccess, getTranslations,
    configRef, updateConfig, configHooks.loadCurrentConfig
  );

  // ---- Socket.IO ----
  useAdminSocket(auth.state.isAuthenticated, configHooks.loadCurrentConfig, configHooks.loadConfigLocks, configHooks.loadConnectedClients);

  // ---- UI state ----
  const activeTabRef = useRef(config.activeTab);
  activeTabRef.current = config.activeTab;

  const switchTab = useCallback((tabName) => {
    updateConfig({ activeTab: tabName, activeSection: TAB_TO_SECTION[tabName] || 'displays' });
  }, [updateConfig]);

  const switchSection = useCallback((sectionName) => {
    const tabs = ADMIN_TAB_SECTIONS[sectionName] || [];
    const fallbackTab = tabs[0] || 'display';
    updateConfig(prev => ({ ...prev, activeSection: sectionName, activeTab: tabs.includes(prev.activeTab) ? prev.activeTab : fallbackTab }));
  }, [updateConfig]);

  // ---- Lifecycle: mount ----
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const t = getTranslations();
    document.title = t.title;
    configHooks.loadVersion();
    configHooks.loadLogoConfig();
    auth.verifySession().then((valid) => {
      if (valid) {
        configHooks.loadConfigLocks();
        configHooks.loadCurrentConfig();
        configHooks.loadSyncStatus();
        intervals.startSyncIntervals();
      }
    });
    // eslint-disable-next-line -- mount-only effect
  }, []);

  // ---- Tab change effects (replaces componentDidUpdate) ----
  const prevTabRef = useRef(config.activeTab);
  useEffect(() => {
    const prevTab = prevTabRef.current;
    const currentTab = config.activeTab;
    prevTabRef.current = currentTab;

    if (currentTab === 'connectedDisplays' && prevTab !== 'connectedDisplays') {
      submissions.handleLoadConnectedDisplays();
      if (!intervals.connectedDisplaysIntervalRef.current) {
        intervals.connectedDisplaysIntervalRef.current = setInterval(() => {
          if (activeTabRef.current === 'connectedDisplays') submissions.handleLoadConnectedDisplays();
        }, 10000);
      }
    }
    if (prevTab === 'connectedDisplays' && currentTab !== 'connectedDisplays') {
      if (intervals.connectedDisplaysIntervalRef.current) { clearInterval(intervals.connectedDisplaysIntervalRef.current); intervals.connectedDisplaysIntervalRef.current = null; }
    }
    if (currentTab === 'mqtt' && prevTab !== 'mqtt') {
      mqtt.handleLoadMqttDisplays(true);
    }
    if (prevTab === 'mqtt' && currentTab !== 'mqtt') {
      if (mqtt.mqttDisplaysIntervalRef.current) { clearInterval(mqtt.mqttDisplaysIntervalRef.current); mqtt.mqttDisplaysIntervalRef.current = null; }
    }
  }, [config.activeTab, submissions, mqtt, intervals]);

  // Update touchkio modal display when mqttDisplays changes
  useEffect(() => {
    if (config.showTouchkioModal && config.touchkioModalDisplay) {
      const currentHostname = config.touchkioModalDisplay.mqtt?.hostname || config.touchkioModalDisplay.hostname;
      const updatedDisplay = config.mqttDisplays.find(d => (d.mqtt?.hostname || d.hostname) === currentHostname);
      if (updatedDisplay) updateConfig({ touchkioModalDisplay: updatedDisplay });
    }
  }, [config.mqttDisplays, config.showTouchkioModal, config.touchkioModalDisplay, updateConfig]);

  // ---- Override handlers ----
  const handleOverrideDraftChange = useCallback((scope, value) => {
    scope === 'group' ? setField('newRoomGroupOverrideKey', value) : setField('newRoomOverrideKey', value);
  }, [setField]);

  const handleAddOverride = useCallback((scope) => {
    const t = getTranslations();
    const draftValue = scope === 'group' ? configRef.current.newRoomGroupOverrideKey : configRef.current.newRoomOverrideKey;
    const key = normalizeOverrideKey(draftValue);
    if (!key) { updateConfig({ bookingMessage: `${t.errorPrefix} ${t.overrideKeyRequiredLabel || 'Bitte einen Schlüssel eingeben.'}`, bookingMessageType: 'error' }); return; }
    updateConfig(prev => {
      const targetKey = scope === 'group' ? 'roomGroupFeatureFlags' : 'roomFeatureFlags';
      const existing = { ...(prev[targetKey] || {}) }; if (!existing[key]) existing[key] = {};
      return { ...prev, [targetKey]: existing, newRoomOverrideKey: scope === 'room' ? '' : prev.newRoomOverrideKey, newRoomGroupOverrideKey: scope === 'group' ? '' : prev.newRoomGroupOverrideKey, bookingMessage: null, bookingMessageType: null };
    });
  }, [getTranslations, configRef, updateConfig]);

  const handleRemoveOverride = useCallback((scope, key) => {
    updateConfig(prev => {
      const targetKey = scope === 'group' ? 'roomGroupFeatureFlags' : 'roomFeatureFlags';
      const next = { ...(prev[targetKey] || {}) }; delete next[key];
      return { ...prev, [targetKey]: next };
    });
  }, [updateConfig]);

  const handleOverrideStateChange = useCallback((scope, key, field, stateValue) => {
    const parsedValue = fromOverrideState(stateValue);
    updateConfig(prev => {
      const targetKey = scope === 'group' ? 'roomGroupFeatureFlags' : 'roomFeatureFlags';
      const next = { ...(prev[targetKey] || {}) }; const nextEntry = { ...(next[key] || {}), [field]: parsedValue };
      if (nextEntry.enableBooking === undefined && nextEntry.enableExtendMeeting === undefined) delete next[key]; else next[key] = nextEntry;
      return { ...prev, [targetKey]: next };
    });
  }, [updateConfig]);

  // ---- Derived values for render ----
  const t = getTranslations();
  const { isAuthenticated, authChecking, authMessage, authMessageType, apiToken, requiresInitialTokenSetup, initialTokenSetupLockedByEnv } = auth.state;
  const { activeTab, activeSection } = config;

  const booleanLabel = (value) => (value ? (t.yesLabel || 'Yes') : (t.noLabel || 'No'));

  const getAvailableTranslationLanguages = () => {
    const ml = Object.keys(config.currentMaintenanceTranslations || {});
    const al = Object.keys(config.currentAdminTranslations || {});
    const dl = Object.keys(defaultAdminTranslations || {});
    return Array.from(new Set([...dl, ...ml, ...al])).map(l => String(l || '').trim().toLowerCase()).filter(Boolean).sort();
  };
  const availableTranslationLanguages = getAvailableTranslationLanguages();
  const normalizedSelectedLanguage = String(config.translationLanguage || '').trim().toLowerCase();
  const activeTranslationLanguage = availableTranslationLanguages.includes(normalizedSelectedLanguage) ? normalizedSelectedLanguage : (availableTranslationLanguages[0] || 'en');
  const selectedMaintenanceTranslation = config.currentMaintenanceTranslations?.[activeTranslationLanguage] || {};
  const selectedAdminTranslation = { ...(defaultAdminTranslations.en || {}), ...(defaultAdminTranslations[activeTranslationLanguage] || {}), ...(config.currentAdminTranslations?.[activeTranslationLanguage] || {}) };
  const roomOverrideEntries = Object.entries(config.roomFeatureFlags || {}).sort(([a], [b]) => a.localeCompare(b));
  const roomGroupOverrideEntries = Object.entries(config.roomGroupFeatureFlags || {}).sort(([a], [b]) => a.localeCompare(b));
  const browserLang = navigator.language || navigator.userLanguage;
  const lang = browserLang.split('-')[0];
  const apiTokenSourceLabelMap = { unset: t.apiTokenSourceUnset || 'Not configured', default: t.apiTokenSourceDefault || 'Default', runtime: t.apiTokenSourceRuntime || 'Admin Runtime', env: t.apiTokenSourceEnv || 'Environment (.env)' };

  const sectionDefinitions = [
    { key: 'displays', label: t.displayTabLabel || 'Display', tabs: [{ key: 'display', label: t.displaySubTabLabel || 'Allgemein' }, { key: 'wifi', label: t.wifiTabLabel || 'WiFi' }, { key: 'logo', label: t.logoTabLabel || 'Logo' }, { key: 'colors', label: t.colorsTabLabel || 'Colors' }, { key: 'booking', label: t.bookingTabLabel || 'Booking' }] },
    { key: 'operations', label: t.operationsTabLabel || 'Operations', tabs: [{ key: 'system', label: 'System' }, { key: 'translationApi', label: t.translationApiTabLabel || 'Translation API' }, { key: 'oauth', label: t.oauthTabLabel || 'Graph-API' }, { key: 'maintenance', label: t.maintenanceTabLabel || 'Wartungsmodus' }, { key: 'apiToken', label: t.apiTokenTabLabel || 'API-Token' }, { key: 'search', label: t.searchTabLabel || 'Suche' }, { key: 'ratelimit', label: t.rateLimitTabLabel || 'Rate-Limits' }, { key: 'backup', label: t.backupPayloadLabel || 'Backup' }, { key: 'audit', label: t.auditTabLabel || 'Audit-Log' }, { key: 'mqtt', label: 'MQTT' }, { key: 'connectedDisplays', label: t.connectedDisplaysSectionTitle || 'Displays' }] },
    { key: 'content', label: t.translationsTabLabel || 'Translations', tabs: [{ key: 'translations', label: t.translationsTabLabel || 'Translations' }] }
  ];
  const selectedSection = sectionDefinitions.find(s => s.key === activeSection) || sectionDefinitions[0];
  const visibleTabs = selectedSection.tabs;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-header-content">
          <div className="admin-logo">
            <img src={config.currentLogoLightUrl || "/img/logo-admin.svg"} alt="Logo" onError={(e) => { if (!e.target.src.includes('logo-admin.svg')) e.target.src = "/img/logo-admin.svg"; }} />
          </div>
          <div className="admin-flex-1">
            <h1>{t.title}</h1>
            {config.appVersion && <div className="admin-version">Version {config.appVersion}</div>}
          </div>
        </div>
      </div>

      <div className="admin-container">
        {!isAuthenticated && (
          <div className="admin-token-banner admin-mb-2">
            <div className="admin-token-content">
              <form onSubmit={auth.handleAdminLogin} className="token-input-wrapper">
                <label htmlFor="apiToken">{t.apiTokenLabel}</label>
                <input type="password" id="apiToken" value={apiToken} onChange={(e) => auth.setApiToken(e.target.value)} placeholder={t.apiTokenPlaceholder} autoComplete="off" disabled={authChecking} />
                <small>{requiresInitialTokenSetup ? (initialTokenSetupLockedByEnv ? (t.apiTokenHelp || 'Required to update settings') : (t.apiTokenBootstrapHelp || 'No admin token is configured yet. Enter a new token (min. 8 chars) to create the initial admin token.')) : (t.apiTokenHelp || 'Required to update settings')}</small>
                <button type="submit" className="admin-submit-button admin-login-button" disabled={authChecking}>
                  {authChecking ? (requiresInitialTokenSetup ? (t.apiTokenBootstrapButtonBusy || 'Creating token...') : 'Logging in...') : (requiresInitialTokenSetup ? (t.apiTokenBootstrapButton || 'Create Token') : 'Login')}
                </button>
              </form>
            </div>
          </div>
        )}

        {!isAuthenticated && authMessage && <div className={`admin-message admin-message-${authMessageType || 'error'} admin-mb-2`}>{authMessage}</div>}
        {!isAuthenticated && <div className="admin-section"><h2>{t.title}</h2><p>{t.apiTokenHelp}</p></div>}
        {isAuthenticated && <div className="admin-flex-end"><button type="button" className="admin-submit-button" onClick={auth.handleAdminLogout}>Logout</button></div>}

        {!isAuthenticated ? null : (
          <>
          {config.syncStatus && !config.syncStatusLoading && (
            <div className={`admin-message admin-mb-2 ${(() => { const lst = config.syncStatus.lastSyncTime ? new Date(config.syncStatus.lastSyncTime) : null; const sss = lst ? Math.floor((config.syncStatusTick - lst.getTime()) / 1000) : null; const stale = sss !== null && sss > 180; return stale || !config.syncStatus.lastSyncSuccess ? 'admin-message-warning' : 'admin-message-success'; })()}`}>
              <strong>{t.syncStatusTitle}:</strong> {' '}
              {config.syncStatus.hasNeverSynced ? <span>{t.syncStatusNever}</span> : (
                <>
                  {t.syncStatusLastSync} {' '}
                  {(() => { const lst = config.syncStatus.lastSyncTime ? new Date(config.syncStatus.lastSyncTime) : null; const sss = lst ? Math.floor((config.syncStatusTick - lst.getTime()) / 1000) : config.syncStatus.secondsSinceSync; return sss !== null ? <span>{lang === 'de' ? `${t.syncStatusMinutesAgo} ${sss} ${t.syncStatusMinutes}` : `${sss} ${t.syncStatusMinutes} ${t.syncStatusMinutesAgo}`}</span> : null; })()} {' - '}
                  {config.syncStatus.lastSyncSuccess ? <span>{t.syncStatusSuccess}</span> : <span>{t.syncStatusFailed}</span>}
                  {(() => { const lst = config.syncStatus.lastSyncTime ? new Date(config.syncStatus.lastSyncTime) : null; const sss = lst ? Math.floor((config.syncStatusTick - lst.getTime()) / 1000) : null; return sss !== null && sss > 180 ? <span> - {t.syncStatusStale}</span> : null; })()}
                  {config.syncStatus.syncErrorMessage && <div className="admin-mt-05">{t.syncStatusError} {config.syncStatus.syncErrorMessage}</div>}
                </>
              )}
            </div>
          )}

          {isAuthenticated && config.currentMaintenanceEnabled && (
            <div className="admin-message admin-message-warning admin-mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
              <span style={{ fontSize: '1.2em' }}>⚠️</span>
              <span>{t.maintenanceBannerText || 'Maintenance mode is active. Some write operations may be blocked.'}</span>
            </div>
          )}

          <div className="admin-section-tabs">
            {sectionDefinitions.map(section => <button key={section.key} className={`admin-section-tab ${activeSection === section.key ? 'active' : ''}`} onClick={() => switchSection(section.key)}>{section.label}</button>)}
          </div>

          {visibleTabs.length > 1 && (
            <div className="admin-tabs admin-submenu-tabs">
              {visibleTabs.map(tab => <button key={tab.key} className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => switchTab(tab.key)}>{tab.label}</button>)}
            </div>
          )}

          <DisplayTab isActive={activeTab === 'display'} informationLocked={config.informationLocked} t={t}
            currentShowWiFi={config.currentShowWiFi} currentShowUpcomingMeetings={config.currentShowUpcomingMeetings} currentShowMeetingTitles={config.currentShowMeetingTitles}
            currentUpcomingMeetingsCount={config.currentUpcomingMeetingsCount} currentMinimalHeaderStyle={config.currentMinimalHeaderStyle}
            currentSingleRoomDarkMode={config.currentSingleRoomDarkMode} currentFlightboardDarkMode={config.currentFlightboardDarkMode}
            currentAutoReloadEnabled={config.currentAutoReloadEnabled} currentAutoReloadTime={config.currentAutoReloadTime}
            informationLastUpdated={config.informationLastUpdated}
            sidebarTargetClientId={config.sidebarTargetClientId} connectedClients={config.connectedClients} connectedClientsLoading={config.connectedClientsLoading}
            showWiFi={config.showWiFi} showUpcomingMeetings={config.showUpcomingMeetings} showMeetingTitles={config.showMeetingTitles}
            upcomingMeetingsCount={config.upcomingMeetingsCount} minimalHeaderStyle={config.minimalHeaderStyle}
            singleRoomDarkMode={config.singleRoomDarkMode} flightboardDarkMode={config.flightboardDarkMode}
            autoReloadEnabled={config.autoReloadEnabled} autoReloadTime={config.autoReloadTime}
            informationMessage={config.informationMessage} informationMessageType={config.informationMessageType} booleanLabel={booleanLabel}
            onTargetClientChange={(e) => {
              const nextTargetClientId = e.target.value;
              setField('sidebarTargetClientId', nextTargetClientId);
              if (nextTargetClientId) {
                loadSidebarConfig(nextTargetClientId).then(r => { if (r.ok) setField('singleRoomDarkMode', r.data.singleRoomDarkMode !== undefined ? !!r.data.singleRoomDarkMode : config.currentSingleRoomDarkMode); }).catch(err => console.error('Error loading selected client sidebar config:', err));
              } else { setField('singleRoomDarkMode', config.currentSingleRoomDarkMode); }
            }}
            onFieldChange={(key, value) => setField(key, value)} onSubmit={submissions.handleSidebarSubmit} />

          <WiFiTab isActive={activeTab === 'wifi'} wifiLocked={config.wifiLocked} t={t}
            currentSsid={config.currentSsid} currentPassword={config.currentPassword} wifiLastUpdated={config.wifiLastUpdated}
            ssid={config.ssid} password={config.password} wifiMessage={config.wifiMessage} wifiMessageType={config.wifiMessageType}
            onFieldChange={(key, value) => setField(key, value)} onSubmit={submissions.handleWiFiSubmit} />

          <LogoTab isActive={activeTab === 'logo'} logoLocked={config.logoLocked} t={t}
            currentLogoDarkUrl={config.currentLogoDarkUrl} currentLogoLightUrl={config.currentLogoLightUrl} logoLastUpdated={config.logoLastUpdated}
            uploadMode={config.uploadMode} logoDarkUrl={config.logoDarkUrl} logoLightUrl={config.logoLightUrl}
            logoDarkFile={config.logoDarkFile} logoLightFile={config.logoLightFile} logoMessage={config.logoMessage} logoMessageType={config.logoMessageType}
            onUploadModeChange={(mode) => updateConfig({ uploadMode: mode, logoDarkFile: null, logoLightFile: null })}
            onFieldChange={(key, value) => setField(key, value)} onFileChange={(key, file) => setField(key, file)} onSubmit={submissions.handleLogoSubmit} />

          <BookingTab isActive={activeTab === 'booking'} bookingLocked={config.bookingLocked} t={t}
            bookingPermissionMissing={config.bookingPermissionMissing}
            currentEnableBooking={config.currentEnableBooking} currentEnableExtendMeeting={config.currentEnableExtendMeeting}
            currentCheckInEnabled={config.currentCheckInEnabled} currentCheckInRequiredForExternalMeetings={config.currentCheckInRequiredForExternalMeetings}
            currentCheckInEarlyMinutes={config.currentCheckInEarlyMinutes} currentCheckInWindowMinutes={config.currentCheckInWindowMinutes}
            currentCheckInAutoReleaseNoShow={config.currentCheckInAutoReleaseNoShow} bookingLastUpdated={config.bookingLastUpdated}
            currentRoomFeatureFlags={config.currentRoomFeatureFlags} currentRoomGroupFeatureFlags={config.currentRoomGroupFeatureFlags}
            enableBooking={config.enableBooking} enableExtendMeeting={config.enableExtendMeeting}
            checkInEnabled={config.checkInEnabled} checkInRequiredForExternalMeetings={config.checkInRequiredForExternalMeetings}
            checkInEarlyMinutes={config.checkInEarlyMinutes} checkInWindowMinutes={config.checkInWindowMinutes} checkInAutoReleaseNoShow={config.checkInAutoReleaseNoShow}
            roomFeatureFlags={config.roomFeatureFlags} roomGroupFeatureFlags={config.roomGroupFeatureFlags}
            availableRoomGroupOptions={config.availableRoomGroupOptions} newRoomGroupOverrideKey={config.newRoomGroupOverrideKey}
            roomGroupOverrideEntries={roomGroupOverrideEntries}
            availableRoomOptions={config.availableRoomOptions} newRoomOverrideKey={config.newRoomOverrideKey} roomOverrideEntries={roomOverrideEntries}
            bookingMessage={config.bookingMessage} bookingMessageType={config.bookingMessageType} booleanLabel={booleanLabel} toOverrideState={toOverrideState}
            onFieldChange={(key, value) => setField(key, value)}
            onOverrideDraftChange={(type, value) => handleOverrideDraftChange(type, value)}
            onAddOverride={(type) => handleAddOverride(type)}
            onOverrideStateChange={(type, key, field, value) => handleOverrideStateChange(type, key, field, value)}
            onRemoveOverride={(type, key) => handleRemoveOverride(type, key)} onSubmit={submissions.handleBookingSubmit} />

          <TranslationsTab isActive={activeTab === 'translations'} t={t}
            availableTranslationLanguages={availableTranslationLanguages} activeTranslationLanguage={activeTranslationLanguage}
            currentTranslationApiHasApiKey={config.currentTranslationApiHasApiKey}
            newTranslationLanguageCode={config.newTranslationLanguageCode} translationLanguageDraftError={config.translationLanguageDraftError}
            i18nMessage={config.i18nMessage} i18nMessageType={config.i18nMessageType}
            currentMaintenanceTranslations={config.currentMaintenanceTranslations} currentAdminTranslations={config.currentAdminTranslations}
            i18nLastUpdated={config.i18nLastUpdated} collapsedTranslationGroups={config.collapsedTranslationGroups}
            selectedMaintenanceTranslation={selectedMaintenanceTranslation} selectedAdminTranslation={selectedAdminTranslation}
            showAdvancedTranslationsEditor={config.showAdvancedTranslationsEditor}
            maintenanceTranslationsText={config.maintenanceTranslationsText} adminTranslationsText={config.adminTranslationsText}
            quickAdminTranslationGroups={QUICK_ADMIN_TRANSLATION_GROUPS} getLanguageDisplayName={getLanguageDisplayName}
            onTranslationLanguageChange={translations.handleTranslationLanguageChange}
            onNewTranslationLanguageChange={translations.handleNewTranslationLanguageChange}
            onAddTranslationLanguage={translations.handleAddTranslationLanguage}
            onRemoveTranslationLanguage={translations.handleRemoveTranslationLanguage}
            onToggleTranslationGroup={translations.toggleTranslationGroup}
            onMaintenanceTranslationFieldChange={translations.handleMaintenanceTranslationFieldChange}
            onAdminTranslationFieldChange={translations.handleAdminTranslationFieldChange}
            onShowAdvancedEditorChange={(checked) => setField('showAdvancedTranslationsEditor', checked)}
            onMaintenanceTranslationsTextChange={(value) => setField('maintenanceTranslationsText', value)}
            onAdminTranslationsTextChange={(value) => setField('adminTranslationsText', value)}
            onSubmit={translations.handleI18nSubmit} />

          <ColorsTab isActive={activeTab === 'colors'} t={t}
            currentBookingButtonColor={config.currentBookingButtonColor} currentStatusAvailableColor={config.currentStatusAvailableColor}
            currentStatusBusyColor={config.currentStatusBusyColor} currentStatusUpcomingColor={config.currentStatusUpcomingColor}
            currentStatusNotFoundColor={config.currentStatusNotFoundColor}
            bookingButtonColor={config.bookingButtonColor} statusAvailableColor={config.statusAvailableColor}
            statusBusyColor={config.statusBusyColor} statusUpcomingColor={config.statusUpcomingColor} statusNotFoundColor={config.statusNotFoundColor}
            colorMessage={config.colorMessage} colorMessageType={config.colorMessageType}
            hexToHSL={hexToHSL} hslToHex={hslToHex}
            onColorChange={(key, value) => setField(key, value)}
            onResetColor={(key, defaultValue) => setField(key, defaultValue)} onSubmit={submissions.handleColorsSubmit} />

          <SystemTab isActive={activeTab === 'system'} systemLocked={config.systemLocked}
            currentSystemStartupValidationStrict={config.currentSystemStartupValidationStrict}
            currentSystemExposeDetailedErrors={config.currentSystemExposeDetailedErrors}
            currentSystemHstsMaxAge={config.currentSystemHstsMaxAge} currentSystemRateLimitMaxBuckets={config.currentSystemRateLimitMaxBuckets}
            currentSystemDisplayTrackingMode={config.currentSystemDisplayTrackingMode}
            currentSystemDisplayTrackingRetentionHours={config.currentSystemDisplayTrackingRetentionHours}
            currentSystemDisplayTrackingCleanupMinutes={config.currentSystemDisplayTrackingCleanupMinutes}
            systemLastUpdated={config.systemLastUpdated}
            systemStartupValidationStrict={config.systemStartupValidationStrict} systemExposeDetailedErrors={config.systemExposeDetailedErrors}
            systemHstsMaxAge={config.systemHstsMaxAge} systemRateLimitMaxBuckets={config.systemRateLimitMaxBuckets}
            demoMode={config.demoMode} currentDemoMode={config.currentDemoMode}
            systemMessage={config.systemMessage} systemMessageType={config.systemMessageType} t={t} booleanLabel={booleanLabel}
            onStartupValidationChange={(checked) => setField('systemStartupValidationStrict', checked)}
            onExposeErrorsChange={(checked) => setField('systemExposeDetailedErrors', checked)}
            onHstsMaxAgeChange={(value) => setField('systemHstsMaxAge', value)}
            onRateLimitMaxBucketsChange={(value) => setField('systemRateLimitMaxBuckets', value)}
            onSubmit={submissions.handleSystemSubmit} />

          <TranslationApiTab isActive={activeTab === 'translationApi'} translationApiLocked={config.translationApiLocked}
            currentTranslationApiEnabled={config.currentTranslationApiEnabled} currentTranslationApiUrl={config.currentTranslationApiUrl}
            currentTranslationApiHasApiKey={config.currentTranslationApiHasApiKey} currentTranslationApiTimeoutMs={config.currentTranslationApiTimeoutMs}
            translationApiLastUpdated={config.translationApiLastUpdated}
            translationApiEnabled={config.translationApiEnabled} translationApiUrl={config.translationApiUrl}
            translationApiApiKey={config.translationApiApiKey} translationApiTimeoutMs={config.translationApiTimeoutMs}
            translationApiMessage={config.translationApiMessage} translationApiMessageType={config.translationApiMessageType}
            t={t} booleanLabel={booleanLabel}
            onEnabledChange={(checked) => setField('translationApiEnabled', checked)}
            onUrlChange={(value) => setField('translationApiUrl', value)}
            onApiKeyChange={(value) => setField('translationApiApiKey', value)}
            onTimeoutChange={(value) => setField('translationApiTimeoutMs', value)}
            onSubmit={submissions.handleTranslationApiSubmit} />

          <OAuthTab isActive={activeTab === 'oauth'} oauthLocked={config.oauthLocked} systemLocked={config.systemLocked} t={t}
            currentOauthClientId={config.currentOauthClientId} currentOauthAuthority={config.currentOauthAuthority}
            currentOauthHasClientSecret={config.currentOauthHasClientSecret} oauthLastUpdated={config.oauthLastUpdated}
            oauthClientId={config.oauthClientId} oauthAuthority={config.oauthAuthority} oauthClientSecret={config.oauthClientSecret}
            oauthMessage={config.oauthMessage} oauthMessageType={config.oauthMessageType}
            currentSystemGraphWebhookEnabled={config.currentSystemGraphWebhookEnabled}
            currentSystemGraphWebhookClientState={config.currentSystemGraphWebhookClientState}
            currentSystemGraphWebhookAllowedIps={config.currentSystemGraphWebhookAllowedIps}
            currentSystemGraphFetchTimeoutMs={config.currentSystemGraphFetchTimeoutMs}
            currentSystemGraphFetchRetryAttempts={config.currentSystemGraphFetchRetryAttempts}
            currentSystemGraphFetchRetryBaseMs={config.currentSystemGraphFetchRetryBaseMs}
            systemLastUpdated={config.systemLastUpdated}
            systemGraphWebhookEnabled={config.systemGraphWebhookEnabled} systemGraphWebhookClientState={config.systemGraphWebhookClientState}
            systemGraphWebhookAllowedIps={config.systemGraphWebhookAllowedIps}
            systemGraphFetchTimeoutMs={config.systemGraphFetchTimeoutMs} systemGraphFetchRetryAttempts={config.systemGraphFetchRetryAttempts}
            systemGraphFetchRetryBaseMs={config.systemGraphFetchRetryBaseMs}
            graphRuntimeMessage={config.graphRuntimeMessage} graphRuntimeMessageType={config.graphRuntimeMessageType} booleanLabel={booleanLabel}
            onOAuthChange={(key, value) => updateConfig({ [key]: value, oauthFormDirty: true })} onOAuthSubmit={submissions.handleOAuthSubmit}
            onGraphRuntimeChange={(key, value) => setField(key, value)} onGraphRuntimeSubmit={submissions.handleGraphRuntimeSubmit}
            certificateInfo={config.certificateInfo} certificateLoading={config.certificateLoading}
            certificateMessage={config.certificateMessage} certificateMessageType={config.certificateMessageType}
            onGenerateCertificate={submissions.handleGenerateCertificate} onDownloadCertificate={submissions.handleDownloadCertificate} onDeleteCertificate={submissions.handleDeleteCertificate} />

          <MaintenanceTab isActive={activeTab === 'maintenance'} maintenanceLocked={config.maintenanceLocked}
            currentMaintenanceEnabled={config.currentMaintenanceEnabled} currentMaintenanceMessage={config.currentMaintenanceMessage}
            maintenanceLastUpdated={config.maintenanceLastUpdated}
            maintenanceEnabled={config.maintenanceEnabled} maintenanceMessage={config.maintenanceMessage}
            maintenanceMessageBanner={config.maintenanceMessageBanner} maintenanceMessageType={config.maintenanceMessageType}
            t={t} booleanLabel={booleanLabel}
            onEnabledChange={(checked) => setField('maintenanceEnabled', checked)}
            onMessageChange={(value) => setField('maintenanceMessage', value)} onSubmit={submissions.handleMaintenanceSubmit} />

          <ApiTokenTab isActive={activeTab === 'apiToken'} apiTokenLocked={config.apiTokenLocked} wifiApiTokenLocked={config.wifiApiTokenLocked} t={t}
            apiTokenSourceLabelMap={apiTokenSourceLabelMap}
            currentApiTokenSource={config.currentApiTokenSource} currentApiTokenIsDefault={config.currentApiTokenIsDefault} apiTokenConfigLastUpdated={config.apiTokenConfigLastUpdated}
            currentWifiApiTokenSource={config.currentWifiApiTokenSource} currentWifiApiTokenConfigured={config.currentWifiApiTokenConfigured} wifiApiTokenConfigLastUpdated={config.wifiApiTokenConfigLastUpdated}
            newApiToken={config.newApiToken} newApiTokenConfirm={config.newApiTokenConfirm}
            newWifiApiToken={config.newWifiApiToken} newWifiApiTokenConfirm={config.newWifiApiTokenConfirm}
            apiTokenConfigMessage={config.apiTokenConfigMessage} apiTokenConfigMessageType={config.apiTokenConfigMessageType}
            wifiApiTokenConfigMessage={config.wifiApiTokenConfigMessage} wifiApiTokenConfigMessageType={config.wifiApiTokenConfigMessageType}
            booleanLabel={booleanLabel}
            onApiTokenChange={(key, value) => setField(key, value)} onApiTokenSubmit={submissions.handleApiTokenSubmit}
            onWifiApiTokenChange={(key, value) => setField(key, value)} onWifiApiTokenSubmit={submissions.handleWiFiApiTokenSubmit} />

          <SearchTab isActive={activeTab === 'search'} searchLocked={config.searchLocked} t={t}
            currentSearchUseGraphAPI={config.currentSearchUseGraphAPI} currentSearchMaxDays={config.currentSearchMaxDays}
            currentSearchMaxRoomLists={config.currentSearchMaxRoomLists} currentSearchMaxRooms={config.currentSearchMaxRooms}
            currentSearchMaxItems={config.currentSearchMaxItems} currentSearchPollIntervalMs={config.currentSearchPollIntervalMs} searchLastUpdated={config.searchLastUpdated}
            searchUseGraphAPI={config.searchUseGraphAPI} searchMaxDays={config.searchMaxDays} searchMaxRoomLists={config.searchMaxRoomLists}
            searchMaxRooms={config.searchMaxRooms} searchMaxItems={config.searchMaxItems} searchPollIntervalMs={config.searchPollIntervalMs}
            searchMessage={config.searchMessage} searchMessageType={config.searchMessageType} booleanLabel={booleanLabel}
            onSearchChange={(key, value) => setField(key, value)} onSearchSubmit={submissions.handleSearchSubmit} />

          <RateLimitTab isActive={activeTab === 'ratelimit'} rateLimitLocked={config.rateLimitLocked} t={t}
            currentRateLimitApiWindowMs={config.currentRateLimitApiWindowMs} currentRateLimitApiMax={config.currentRateLimitApiMax}
            currentRateLimitWriteWindowMs={config.currentRateLimitWriteWindowMs} currentRateLimitWriteMax={config.currentRateLimitWriteMax}
            currentRateLimitAuthWindowMs={config.currentRateLimitAuthWindowMs} currentRateLimitAuthMax={config.currentRateLimitAuthMax} rateLimitLastUpdated={config.rateLimitLastUpdated}
            rateLimitApiWindowMs={config.rateLimitApiWindowMs} rateLimitApiMax={config.rateLimitApiMax}
            rateLimitWriteWindowMs={config.rateLimitWriteWindowMs} rateLimitWriteMax={config.rateLimitWriteMax}
            rateLimitAuthWindowMs={config.rateLimitAuthWindowMs} rateLimitAuthMax={config.rateLimitAuthMax}
            rateLimitMessage={config.rateLimitMessage} rateLimitMessageType={config.rateLimitMessageType}
            onRateLimitChange={(key, value) => setField(key, value)} onRateLimitSubmit={submissions.handleRateLimitSubmit} />

          <BackupTab isActive={activeTab === 'backup'} backupPayloadText={config.backupPayloadText}
            backupMessage={config.backupMessage} backupMessageType={config.backupMessageType} t={t}
            onPayloadChange={(value) => setField('backupPayloadText', value)}
            onExport={submissions.handleExportBackup} onImport={submissions.handleImportBackup} />

          <AuditTab isActive={activeTab === 'audit'} auditLogs={config.auditLogs}
            auditMessage={config.auditMessage} auditMessageType={config.auditMessageType} t={t} onLoadLogs={submissions.handleLoadAuditLogs} />

          <MqttTab isActive={activeTab === 'mqtt'}
            mqttEnabled={config.mqttEnabled} mqttBrokerUrl={config.mqttBrokerUrl}
            mqttAuthentication={config.mqttAuthentication} mqttUsername={config.mqttUsername}
            mqttPassword={config.mqttPassword} mqttDiscovery={config.mqttDiscovery}
            mqttConfigSaving={config.mqttConfigSaving} mqttConfigMessage={config.mqttConfigMessage}
            mqttConfigMessageType={config.mqttConfigMessageType} mqttStatus={config.mqttStatus} t={t}
            onEnabledChange={(checked) => setField('mqttEnabled', checked)}
            onBrokerUrlChange={(value) => setField('mqttBrokerUrl', value)}
            onAuthenticationChange={(checked) => setField('mqttAuthentication', checked)}
            onUsernameChange={(value) => setField('mqttUsername', value)}
            onPasswordChange={(value) => setField('mqttPassword', value)}
            onDiscoveryChange={(value) => setField('mqttDiscovery', value)}
            onSubmit={mqtt.handleMqttConfigSubmit} />

          <DevicesTab isActive={activeTab === 'connectedDisplays'}
            connectedDisplays={config.connectedDisplays} connectedDisplaysLoading={config.connectedDisplaysLoading}
            connectedDisplaysMessage={config.connectedDisplaysMessage} connectedDisplaysMessageType={config.connectedDisplaysMessageType}
            systemDisplayTrackingMode={config.systemDisplayTrackingMode} currentSystemDisplayTrackingMode={config.currentSystemDisplayTrackingMode}
            systemDisplayTrackingRetentionHours={config.systemDisplayTrackingRetentionHours} currentSystemDisplayTrackingRetentionHours={config.currentSystemDisplayTrackingRetentionHours}
            systemDisplayTrackingCleanupMinutes={config.systemDisplayTrackingCleanupMinutes} currentSystemDisplayTrackingCleanupMinutes={config.currentSystemDisplayTrackingCleanupMinutes}
            systemDisplayIpWhitelistEnabled={config.systemDisplayIpWhitelistEnabled} currentSystemDisplayIpWhitelistEnabled={config.currentSystemDisplayIpWhitelistEnabled}
            systemDisplayIpWhitelist={config.systemDisplayIpWhitelist} currentSystemDisplayIpWhitelist={config.currentSystemDisplayIpWhitelist}
            systemTrustReverseProxy={config.systemTrustReverseProxy} currentSystemTrustReverseProxy={config.currentSystemTrustReverseProxy}
            systemMessage={config.systemMessage} systemMessageType={config.systemMessageType} t={t}
            onLoadDisplays={submissions.handleLoadConnectedDisplays}
            onOpenPowerManagement={(clientId) => submissions.handleOpenPowerManagementModal(clientId)}
            onOpenTouchkioModal={mqtt.handleOpenTouchkioModal}
            onMqttRefresh={mqtt.handleMqttRefreshCommand} onMqttRefreshAll={mqtt.handleMqttRefreshAll} onMqttRebootAll={mqtt.handleMqttRebootAll} onMqttUpdateAll={mqtt.handleMqttUpdateAll}
            onDeleteDisplay={submissions.handleDeleteDisplay}
            onTrackingModeChange={(value) => setField('systemDisplayTrackingMode', value)}
            onRetentionHoursChange={(value) => setField('systemDisplayTrackingRetentionHours', value)}
            onCleanupMinutesChange={(value) => setField('systemDisplayTrackingCleanupMinutes', value)}
            onIpWhitelistEnabledChange={(checked) => setField('systemDisplayIpWhitelistEnabled', checked)}
            onIpWhitelistChange={(value) => setField('systemDisplayIpWhitelist', value)}
            onTrustReverseProxyChange={(checked) => setField('systemTrustReverseProxy', checked)}
            onSaveSettings={submissions.handleSystemSubmit} />

          <PowerManagementModal show={config.showPowerManagementModal} clientId={config.powerManagementClientId} mode={config.powerManagementMode}
            mqttHostname={config.powerManagementMqttHostname || ''} hasMqtt={config.powerManagementHasMqtt || false}
            scheduleEnabled={config.powerManagementScheduleEnabled} startTime={config.powerManagementStartTime} endTime={config.powerManagementEndTime}
            weekendMode={config.powerManagementWeekendMode} message={config.powerManagementMessage} messageType={config.powerManagementMessageType}
            onClose={submissions.handleClosePowerManagementModal} onSave={submissions.handleSavePowerManagement}
            onModeChange={(value) => setField('powerManagementMode', value)}
            onMqttHostnameChange={(value) => setField('powerManagementMqttHostname', value)}
            onScheduleEnabledChange={(value) => setField('powerManagementScheduleEnabled', value)}
            onStartTimeChange={(value) => setField('powerManagementStartTime', value)}
            onEndTimeChange={(value) => setField('powerManagementEndTime', value)}
            onWeekendModeChange={(value) => setField('powerManagementWeekendMode', value)} />

          <TouchkioModal show={config.showTouchkioModal} display={config.touchkioModalDisplay}
            getRequestHeaders={auth.getRequestHeaders}
            message={config.touchkioModalMessage} messageType={config.touchkioModalMessageType}
            brightness={config.touchkioModalBrightness} volume={config.touchkioModalVolume} zoom={config.touchkioModalZoom}
            onClose={mqtt.handleCloseTouchkioModal}
            onBrightnessChange={(value, apply) => {
              setField('touchkioModalBrightness', value);
              if (apply) { const id = config.touchkioModalDisplay.mqtt?.deviceId || config.touchkioModalDisplay.mqtt?.hostname || config.touchkioModalDisplay.hostname; mqtt.handleMqttBrightnessCommandModal(id, value); }
            }}
            onVolumeChange={(value, apply) => {
              setField('touchkioModalVolume', value);
              if (apply) { const id = config.touchkioModalDisplay.mqtt?.deviceId || config.touchkioModalDisplay.mqtt?.hostname || config.touchkioModalDisplay.hostname; mqtt.handleMqttVolumeCommandModal(id, value); }
            }}
            onZoomChange={(value, apply) => {
              setField('touchkioModalZoom', value);
              if (apply) { const id = config.touchkioModalDisplay.mqtt?.deviceId || config.touchkioModalDisplay.mqtt?.hostname || config.touchkioModalDisplay.hostname; mqtt.handleMqttPageZoomCommandModal(id, value); }
            }}
            onPowerCommand={mqtt.handleMqttPowerCommandModal} onRefreshCommand={mqtt.handleMqttRefreshCommandModal}
            onKioskCommand={mqtt.handleMqttKioskCommandModal} onThemeCommand={mqtt.handleMqttThemeCommandModal}
            onRebootCommand={mqtt.handleMqttRebootCommandModal} onShutdownCommand={mqtt.handleMqttShutdownCommandModal}
            onUpdateCommand={mqtt.handleMqttUpdateCommandModal}
            updateInfo={config.mqttUpdateInfo?.[config.touchkioModalDisplay?.mqtt?.deviceId]}
            onPageUrlChange={mqtt.handleMqttPageUrlCommandModal}
            onRefreshDisplay={async () => {
              await submissions.handleLoadConnectedDisplays();
              const s = configRef.current;
              if (s.touchkioModalDisplay) {
                const deviceId = s.touchkioModalDisplay.mqtt?.deviceId;
                const hostname = s.touchkioModalDisplay.mqtt?.hostname || s.touchkioModalDisplay.hostname;
                const ud = s.connectedDisplays.find(d => (deviceId && d.mqtt?.deviceId === deviceId) || d.mqtt?.hostname === hostname || d.hostname === hostname);
                if (ud) updateConfig({ touchkioModalDisplay: ud });
              }
            }} />
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
