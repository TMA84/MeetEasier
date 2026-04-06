/**
* @file Admin.js
* @description Main admin panel component. Provides a tabbed interface for
*              managing all application settings: OAuth, display configuration,
*              booking, translations, devices, MQTT, system config, and more.
*              Connects to Socket.IO for real-time config update broadcasts.
*/
import React, { Component } from 'react';
import io from 'socket.io-client';
import defaultAdminTranslations, { getAdminTranslations } from '../../config/admin-translations.js';
import { getCsrfToken } from './services/admin-api.js';
import {
  sendMqttPowerCommand, sendMqttBrightnessCommand, sendMqttKioskCommand,
  sendMqttThemeCommand, sendMqttVolumeCommand, sendMqttPageZoomCommand,
  sendMqttRefreshCommand, sendMqttRebootCommand, sendMqttShutdownCommand,
  sendMqttRefreshAll, sendMqttRebootAll, sendMqttPageUrlCommand,
  fetchMqttConfig, fetchMqttStatus, fetchMqttDisplays, submitMqttConfig
} from './services/mqtt-commands.js';
import {
  submitWiFiConfig, submitLogoConfig, uploadLogoFile, submitSidebarConfig,
  submitBookingConfig, submitMaintenanceConfig, submitSystemConfig,
  submitGraphRuntimeConfig, submitTranslationApiConfig, submitOAuthConfig,
  submitApiTokenConfig, submitSearchConfig, submitRateLimitConfig,
  submitColorsConfig, submitI18nConfig, submitAutoTranslate,
  generateCertificate, deleteCertificate, downloadCertificate,
  submitPowerManagement, fetchPowerManagementConfig,
  submitBackupExport, submitBackupImport, fetchAuditLogs,
  fetchConnectedDisplays, deleteDisplay as apiDeleteDisplay
} from './services/admin-submissions.js';
import {
  loadWiFiConfig, loadLogoConfig as fetchLogoConfig, loadSidebarConfig,
  loadBookingConfig, loadSearchConfig, loadRateLimitConfig,
  loadTranslationApiConfig, loadMaintenanceStatus, loadSystemConfig,
  loadOAuthConfig, loadCertificateInfo, loadApiTokenConfig,
  loadI18nConfig, loadColorsConfig, loadRoomLists, loadRooms,
  loadConfigLocks as fetchConfigLocks, loadConnectedClients as fetchClients,
  loadSyncStatus as fetchSyncStatus, loadVersion as fetchVersion,
  loadBootstrapStatus, verifyAdminSession
} from './services/admin-config-loader.js';
import { toOverrideState, fromOverrideState, normalizeLanguageCode, getLanguageDisplayName } from './helpers/translation-helpers.js';
import { hexToHSL, hslToHex } from './helpers/color-helpers.js';
import { normalizeOverrideKey, ADMIN_TAB_SECTIONS, TAB_TO_SECTION, BASE_TRANSLATION_GROUP_COLLAPSE_STATE } from './helpers/admin-utils.js';
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
  {
    labelKey: 'adminTranslationGroupGeneralLabel',
    keys: ['title']
  },
  {
    labelKey: 'adminTranslationGroupTabsLabel',
    keys: [
      'displayTabLabel',
      'wifiTabLabel',
      'logoTabLabel',
      'colorsTabLabel',
      'bookingTabLabel',
      'translationsTabLabel',
      'operationsTabLabel'
    ]
  },
  {
    labelKey: 'adminTranslationGroupAuthLabel',
    keys: ['apiTokenLabel', 'apiTokenPlaceholder']
  },
  {
    labelKey: 'adminTranslationGroupActionsLabel',
    keys: [
      'translationsSubmitButton',
      'addLanguageButtonLabel',
      'removeLanguageButtonLabel',
      'removeLanguageHelp',
      'languageAddedSuccessMessage',
      'languageRemovedSuccessMessage',
      'translationApiSectionTitle',
      'translationApiEnableToggleLabel',
      'translationApiUrlLabel',
      'translationApiKeyLabel',
      'translationApiTimeoutLabel',
      'translationApiSaveButton',
      'translationApiTimeoutHelp',
      'translationApiSuccessMessage'
    ]
  },
  {
    labelKey: 'adminTranslationGroupErrorsLabel',
    keys: ['errorPrefix', 'errorUnauthorized', 'removeLanguageDefaultError']
  },
  {
    labelKey: 'adminTranslationGroupDisplaysLabel',
    keys: [
      'displayNextUpLabel',
      'displayCurrentMeetingLabel',
      'displayNavbarTitleLabel',
      'displayFilterAllRoomsLabel',
      'displayStatusAvailableLabel',
      'displayStatusBusyLabel',
      'displayStatusUpcomingLabel',
      'displayStatusNotFoundLabel',
      'displayStatusErrorLabel',
      'displayUpcomingTitleLabel',
      'displayUpcomingMeetingsTitleLabel',
      'displayNoUpcomingMeetingsLabel',
      'displayNoSubjectLabel',
      'displayNoOrganizerLabel',
      'displayPrivateMeetingLabel',
      'displaySeatsLabel',
      'displayNoMeetingDaysLabel',
      'displayErrorTitleLabel',
      'displayErrorOccurredLabel',
      'displayTimeNotAvailableLabel',
      'displayWifiTitleLabel',
      'displayBookRoomButtonLabel',
      'displayExtendMeetingButtonLabel',
      'displayExtendMeetingDisabledLabel',
      'displayMeetingModalTitleLabel',
      'displayMeetingModalExtendByLabel',
      'displayMeetingModalCustomLabel',
      'displayMeetingModalMinutesLabel',
      'displayMeetingModalCancelLabel',
      'displayMeetingModalExtendButtonLabel',
      'displayMeetingModalExtendingLabel',
      'displayMeetingModalEndButtonLabel',
      'displayMeetingModalEndingLabel',
      'displayMeetingModalNoActiveExtendLabel',
      'displayMeetingModalNoActiveEndLabel',
      'displayMeetingModalExtendErrorLabel',
      'displayMeetingModalEndErrorLabel',
      'displayIpNotWhitelistedErrorLabel',
      'displayOriginNotAllowedErrorLabel',
      'displayBookingDisabledErrorLabel',
      'displayBookingModalTitleLabel',
      'displayBookingModalQuickBookLabel',
      'displayBookingModalCustomLabel',
      'displayBookingModalDateLabel',
      'displayBookingModalStartTimeLabel',
      'displayBookingModalDurationLabel',
      'displayBookingModalEndTimeLabel',
      'displayBookingModalTodayLabel',
      'displayBookingModalTomorrowLabel',
      'displayBookingModalMinutesLabel',
      'displayBookingModalHoursLabel',
      'displayBookingModalCancelLabel',
      'displayBookingModalBookButtonLabel',
      'displayBookingModalBookingLabel',
      'displayBookingModalDefaultSubjectLabel',
      'displayBookingModalConflictErrorLabel',
      'displayBookingModalGenericErrorLabel',
      'displayWifiInfoTitleLabel',
      'displayWifiInfoSsidLabel',
      'displayWifiInfoPasswordLabel',
      'displayWifiInfoLoadingLabel',
      'displayWifiInfoErrorPrefixLabel',
      'displayCheckInButtonLabel',
      'displayCheckInExpiredTitleLabel',
      'displayCheckInTooEarlyTitleLabel',
      'displayCheckInCompletedLabel',
      'displayCheckInFailedLabel'
    ]
  }
];

const DEFAULT_TRANSLATION_GROUP_COLLAPSE_STATE = QUICK_ADMIN_TRANSLATION_GROUPS.reduce((acc, group) => {
  acc[group.labelKey] = true;
  return acc;
}, { ...BASE_TRANSLATION_GROUP_COLLAPSE_STATE });

class Admin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // WiFi state
      currentSsid: '', currentPassword: '', wifiLastUpdated: '', ssid: '', password: '',
      wifiMessage: null, wifiMessageType: null,
      // Logo state
      currentLogoDarkUrl: '', currentLogoLightUrl: '', logoLastUpdated: '',
      logoDarkUrl: '', logoLightUrl: '', logoDarkFile: null, logoLightFile: null,
      logoMessage: null, logoMessageType: null, uploadMode: 'url',
      // Information state
      currentShowWiFi: true, currentShowUpcomingMeetings: false, currentShowMeetingTitles: false,
      currentUpcomingMeetingsCount: 3, currentMinimalHeaderStyle: 'filled',
      currentSingleRoomDarkMode: false, currentFlightboardDarkMode: true, informationLastUpdated: '',
      showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false,
      upcomingMeetingsCount: 3, minimalHeaderStyle: 'filled',
      singleRoomDarkMode: false, flightboardDarkMode: true,
      sidebarTargetClientId: '', connectedClients: [], connectedClientsLoading: false,
      informationMessage: null, informationMessageType: null,
      // Config locks
      wifiLocked: false, logoLocked: false, informationLocked: false, bookingLocked: false,
      searchLocked: false, rateLimitLocked: false, apiTokenLocked: false, wifiApiTokenLocked: false,
      oauthLocked: false, systemLocked: false, maintenanceLocked: false, translationApiLocked: false,
      // Booking state
      currentEnableBooking: true, bookingLastUpdated: '', enableBooking: true,
      bookingMessage: null, bookingMessageType: null, bookingPermissionMissing: false,
      currentEnableExtendMeeting: false, enableExtendMeeting: false,
      currentCheckInEnabled: true, checkInEnabled: true,
      currentCheckInRequiredForExternalMeetings: true, checkInRequiredForExternalMeetings: true,
      currentCheckInEarlyMinutes: 5, checkInEarlyMinutes: 5,
      currentCheckInWindowMinutes: 10, checkInWindowMinutes: 10,
      currentCheckInAutoReleaseNoShow: true, checkInAutoReleaseNoShow: true,
      currentRoomFeatureFlags: {}, roomFeatureFlags: {},
      currentRoomGroupFeatureFlags: {}, roomGroupFeatureFlags: {},
      newRoomOverrideKey: '', newRoomGroupOverrideKey: '',
      availableRoomOptions: [], availableRoomGroupOptions: [],
      // Operations / maintenance state
      currentMaintenanceEnabled: false, currentMaintenanceMessage: '', maintenanceLastUpdated: '',
      maintenanceEnabled: false, maintenanceMessage: '',
      maintenanceMessageBanner: null, maintenanceMessageType: null,
      i18nLastUpdated: '', currentMaintenanceTranslations: {},
      maintenanceTranslationsText: '{\n  "en": {\n    "title": "Maintenance mode active",\n    "body": "This display is temporarily unavailable."\n  },\n  "de": {\n    "title": "Wartungsmodus aktiv",\n    "body": "Diese Anzeige ist vorübergehend nicht verfügbar."\n  }\n}',
      currentAdminTranslations: {},
      adminTranslationsText: JSON.stringify(defaultAdminTranslations, null, 2),
      translationLanguage: 'en', newTranslationLanguageCode: '',
      translationLanguageDraftError: null,
      collapsedTranslationGroups: { ...DEFAULT_TRANSLATION_GROUP_COLLAPSE_STATE },
      showAdvancedTranslationsEditor: false, i18nMessage: null, i18nMessageType: null,
      backupPayloadText: '', backupMessage: null, backupMessageType: null,
      auditLogs: [], auditMessage: null, auditMessageType: null,
      connectedDisplays: [], connectedDisplaysMessage: null, connectedDisplaysMessageType: null,
      connectedDisplaysLoading: false,
      showPowerManagementModal: false, powerManagementClientId: null,
      powerManagementMode: 'browser', powerManagementScheduleEnabled: false,
      powerManagementStartTime: '20:00', powerManagementEndTime: '07:00',
      powerManagementWeekendMode: false, powerManagementMessage: null, powerManagementMessageType: null,
      apiTokenConfigMessage: null, apiTokenConfigMessageType: null,
      currentApiTokenSource: 'default', currentApiTokenIsDefault: true, apiTokenConfigLastUpdated: '',
      newApiToken: '', newApiTokenConfirm: '',
      wifiApiTokenConfigMessage: null, wifiApiTokenConfigMessageType: null,
      currentWifiApiTokenSource: 'default', currentWifiApiTokenConfigured: false,
      wifiApiTokenConfigLastUpdated: '', newWifiApiToken: '', newWifiApiTokenConfirm: '',
      oauthMessage: null, oauthMessageType: null,
      graphRuntimeMessage: null, graphRuntimeMessageType: null,
      systemMessage: null, systemMessageType: null,
      translationApiMessage: null, translationApiMessageType: null,
      currentSystemStartupValidationStrict: false, systemStartupValidationStrict: false,
      currentSystemGraphWebhookEnabled: false, systemGraphWebhookEnabled: false,
      currentSystemGraphWebhookClientState: '', systemGraphWebhookClientState: '',
      currentSystemGraphWebhookAllowedIps: '', systemGraphWebhookAllowedIps: '',
      currentSystemExposeDetailedErrors: false, systemExposeDetailedErrors: false,
      currentSystemGraphFetchTimeoutMs: 10000, systemGraphFetchTimeoutMs: 10000,
      currentSystemGraphFetchRetryAttempts: 2, systemGraphFetchRetryAttempts: 2,
      currentSystemGraphFetchRetryBaseMs: 250, systemGraphFetchRetryBaseMs: 250,
      currentSystemHstsMaxAge: 31536000, systemHstsMaxAge: 31536000,
      currentSystemRateLimitMaxBuckets: 10000, systemRateLimitMaxBuckets: 10000,
      currentSystemDisplayTrackingMode: 'client-id', systemDisplayTrackingMode: 'client-id',
      currentSystemDisplayTrackingRetentionHours: 2, systemDisplayTrackingRetentionHours: 2,
      currentSystemDisplayTrackingCleanupMinutes: 5, systemDisplayTrackingCleanupMinutes: 5,
      currentSystemDisplayIpWhitelistEnabled: false, systemDisplayIpWhitelistEnabled: false,
      currentSystemDisplayIpWhitelist: '', systemDisplayIpWhitelist: '',
      currentSystemTrustReverseProxy: false, systemTrustReverseProxy: false,
      currentDemoMode: false, demoMode: false, systemLastUpdated: '',
      currentTranslationApiEnabled: true, translationApiEnabled: true,
      currentTranslationApiUrl: 'https://translation.googleapis.com/language/translate/v2',
      translationApiUrl: 'https://translation.googleapis.com/language/translate/v2',
      currentTranslationApiTimeoutMs: 20000, translationApiTimeoutMs: 20000,
      currentTranslationApiHasApiKey: false, translationApiApiKey: '', translationApiLastUpdated: '',
      currentOauthClientId: '', oauthClientId: '',
      currentOauthAuthority: '', oauthAuthority: '',
      currentOauthHasClientSecret: false, oauthClientSecret: '', oauthLastUpdated: '',
      oauthFormDirty: false,
      certificateInfo: null, certificateLoading: false,
      certificateMessage: null, certificateMessageType: null,
      searchMessage: null, searchMessageType: null,
      rateLimitMessage: null, rateLimitMessageType: null,
      currentSearchUseGraphAPI: true, searchUseGraphAPI: true,
      currentSearchMaxDays: 7, searchMaxDays: 7,
      currentSearchMaxRoomLists: 5, searchMaxRoomLists: 5,
      currentSearchMaxRooms: 50, searchMaxRooms: 50,
      currentSearchMaxItems: 100, searchMaxItems: 100,
      currentSearchPollIntervalMs: 15000, searchPollIntervalMs: 15000, searchLastUpdated: '',
      currentRateLimitApiWindowMs: 60000, rateLimitApiWindowMs: 60000,
      currentRateLimitApiMax: 300, rateLimitApiMax: 300,
      currentRateLimitWriteWindowMs: 60000, rateLimitWriteWindowMs: 60000,
      currentRateLimitWriteMax: 60, rateLimitWriteMax: 60,
      currentRateLimitAuthWindowMs: 60000, rateLimitAuthWindowMs: 60000,
      currentRateLimitAuthMax: 30, rateLimitAuthMax: 30, rateLimitLastUpdated: '',
      // Color state
      bookingButtonColor: '#334155', currentBookingButtonColor: '#334155',
      statusAvailableColor: '#22c55e', currentStatusAvailableColor: '#22c55e',
      statusBusyColor: '#ef4444', currentStatusBusyColor: '#ef4444',
      statusUpcomingColor: '#f59e0b', currentStatusUpcomingColor: '#f59e0b',
      statusNotFoundColor: '#6b7280', currentStatusNotFoundColor: '#6b7280',
      colorMessage: null, colorMessageType: null, colorsLastUpdated: '',
      // Auth
      apiToken: '', isAuthenticated: false, authChecking: true,
      authMessage: null, authMessageType: null,
      requiresInitialTokenSetup: false, initialTokenSetupLockedByEnv: false,
      // Sync status
      syncStatus: null, syncStatusLoading: true, syncStatusTick: Date.now(),
      // UI state
      activeTab: 'display', activeSection: 'displays',
      // MQTT Displays (Touchkio)
      mqttDisplays: [], mqttDisplaysLoading: false,
      showTouchkioModal: false, touchkioModalDisplay: null,
      touchkioModalMessage: null, touchkioModalMessageType: null,
      touchkioModalBrightness: undefined, touchkioModalVolume: undefined, touchkioModalZoom: undefined,
      // Version
      appVersion: null
    };
  }

  getRequestHeaders = (includeContentType = true) => {
    const headers = {};
    if (includeContentType) { headers['Content-Type'] = 'application/json'; }
    const { apiToken } = this.state;
    if (apiToken) { headers['Authorization'] = `Bearer ${apiToken}`; }
    const csrfToken = getCsrfToken();
    if (csrfToken) { headers['X-CSRF-Token'] = csrfToken; }
    return headers;
  }

  componentDidMount() {
    const t = this.getTranslations();
    document.title = t.title;
    this.loadVersion();
    this.loadLogoConfig();
    verifyAdminSession()
      .then((valid) => {
        if (!valid) {
          this.loadAdminBootstrapStatus().finally(() => {
            this.setState({ apiToken: '', isAuthenticated: false, authChecking: false, authMessage: null, authMessageType: null });
          });
          return;
        }
        this.setState({ apiToken: '', isAuthenticated: true, authChecking: false, authMessage: null, authMessageType: null }, () => {
          this.loadConfigLocks();
          this.loadCurrentConfig();
          this.loadSyncStatus();
          this.startSyncIntervals();
          this.startRealtimeConfigUpdates();
        });
      })
      .catch(() => {
        this.loadAdminBootstrapStatus().finally(() => {
          this.setState({ apiToken: '', isAuthenticated: false, authChecking: false, authMessage: null, authMessageType: null });
        });
      });
  }

  componentWillUnmount() {
    if (this.syncStatusInterval) clearInterval(this.syncStatusInterval);
    if (this.syncStatusClockInterval) clearInterval(this.syncStatusClockInterval);
    if (this.configRefreshInterval) clearInterval(this.configRefreshInterval);
    if (this.connectedDisplaysInterval) clearInterval(this.connectedDisplaysInterval);
    if (this.mqttDisplaysInterval) clearInterval(this.mqttDisplaysInterval);
    if (this.adminSocket) { this.adminSocket.disconnect(); this.adminSocket = null; }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.activeTab === 'connectedDisplays' && prevState.activeTab !== 'connectedDisplays') {
      this.handleLoadConnectedDisplays();
      this.startConnectedDisplaysAutoRefresh();
    }
    if (prevState.activeTab === 'connectedDisplays' && this.state.activeTab !== 'connectedDisplays') {
      this.stopConnectedDisplaysAutoRefresh();
    }
    if (this.state.activeTab === 'mqtt' && prevState.activeTab !== 'mqtt') {
      this.handleLoadMqttDisplays(true);
    }
    if (prevState.activeTab === 'mqtt' && this.state.activeTab !== 'mqtt') {
      if (this.mqttDisplaysInterval) { clearInterval(this.mqttDisplaysInterval); this.mqttDisplaysInterval = null; }
    }
    if (this.state.showTouchkioModal && this.state.touchkioModalDisplay && this.state.mqttDisplays !== prevState.mqttDisplays) {
      const currentHostname = this.state.touchkioModalDisplay.mqtt?.hostname || this.state.touchkioModalDisplay.hostname;
      const updatedDisplay = this.state.mqttDisplays.find(d => (d.mqtt?.hostname || d.hostname) === currentHostname);
      if (updatedDisplay) { this.setState({ touchkioModalDisplay: updatedDisplay }); }
    }
  }

  // ============================================================================
  // Intervals & Socket.IO
  // ============================================================================

  startConnectedDisplaysAutoRefresh = () => {
    if (this.connectedDisplaysInterval) return;
    this.connectedDisplaysInterval = setInterval(() => {
      if (this.state.activeTab === 'connectedDisplays') this.handleLoadConnectedDisplays();
    }, 10000);
  }

  stopConnectedDisplaysAutoRefresh = () => {
    if (this.connectedDisplaysInterval) { clearInterval(this.connectedDisplaysInterval); this.connectedDisplaysInterval = null; }
  }

  startRealtimeConfigUpdates = () => {
    if (this.adminSocket) return;
    this.adminSocket = io({ transports: ['websocket'] });
    if (!this.adminSocket || !this.adminSocket.on) return;
    const refreshConfig = () => { this.loadCurrentConfig(); this.loadConfigLocks(); };
    ['wifiConfigUpdated','logoConfigUpdated','sidebarConfigUpdated','bookingConfigUpdated',
     'maintenanceConfigUpdated','i18nConfigUpdated','colorsConfigUpdated','searchConfigUpdated',
     'rateLimitConfigUpdated','oauthConfigUpdated','systemConfigUpdated','translationApiConfigUpdated',
     'apiTokenUpdated','wifiApiTokenUpdated'].forEach(evt => this.adminSocket.on(evt, refreshConfig));
    this.adminSocket.on('connectedClientsUpdated', () => this.loadConnectedClients());
  }

  startSyncIntervals = () => {
    if (!this.syncStatusInterval) { this.syncStatusInterval = setInterval(() => this.loadSyncStatus(), 30000); }
    if (!this.syncStatusClockInterval) { this.syncStatusClockInterval = setInterval(() => this.setState({ syncStatusTick: Date.now() }), 1000); }
    if (!this.configRefreshInterval) { this.configRefreshInterval = setInterval(() => this.loadConfigLocks(), 5000); }
  }

  // ============================================================================
  // Auth
  // ============================================================================

  handleAdminLogin = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const token = String(this.state.apiToken || '').trim();
    if (!token) { this.setState({ authMessage: t.errorUnauthorized, authMessageType: 'error' }); return; }
    this.setState({ authChecking: true, authMessage: null, authMessageType: null });
    const completeLoginSuccess = () => {
      this.setState({ apiToken: '', isAuthenticated: true, authChecking: false, authMessage: null, authMessageType: null }, () => {
        this.loadConfigLocks(); this.loadCurrentConfig(); this.loadSyncStatus(); this.startSyncIntervals(); this.startRealtimeConfigUpdates();
      });
    };
    fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      .then(async (response) => {
        if (response.status === 428) {
          const bootstrapResponse = await fetch('/api/admin/bootstrap-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
          if (!bootstrapResponse.ok) { const errorPayload = await bootstrapResponse.json().catch(() => ({})); throw new Error(errorPayload?.message || errorPayload?.error || t.errorUnauthorized); }
          completeLoginSuccess(); return;
        }
        if (response.status === 401) throw new Error(t.errorUnauthorized);
        if (!response.ok) { const errorPayload = await response.json().catch(() => ({})); throw new Error(errorPayload?.message || errorPayload?.error || t.errorUnknown || 'Login failed'); }
        completeLoginSuccess();
      })
      .catch((error) => { this.setState({ isAuthenticated: false, authChecking: false, authMessage: error?.message || t.errorUnauthorized, authMessageType: 'error' }); });
  }

  handleAdminLogout = () => {
    fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    if (this.syncStatusInterval) { clearInterval(this.syncStatusInterval); this.syncStatusInterval = null; }
    if (this.syncStatusClockInterval) { clearInterval(this.syncStatusClockInterval); this.syncStatusClockInterval = null; }
    if (this.configRefreshInterval) { clearInterval(this.configRefreshInterval); this.configRefreshInterval = null; }
    if (this.connectedDisplaysInterval) { clearInterval(this.connectedDisplaysInterval); this.connectedDisplaysInterval = null; }
    if (this.adminSocket) { this.adminSocket.disconnect(); this.adminSocket = null; }
    this.setState({ apiToken: '', isAuthenticated: false, authChecking: false, authMessage: null, authMessageType: null, syncStatus: null, syncStatusLoading: true });
  }

  handleUnauthorizedAccess = () => {
    const t = this.getTranslations();
    this.handleAdminLogout();
    this.setState({ authMessage: t.errorUnauthorized, authMessageType: 'error' });
  }

  // ============================================================================
  // Config Loading (thin wrappers around extracted service functions)
  // ============================================================================

  loadVersion = () => {
    fetchVersion().then(r => { if (r.ok && r.data?.version) this.setState({ appVersion: r.data.version }); }).catch(err => console.error('[Admin] Failed to load version:', err));
  }

  loadLogoConfig = () => {
    fetchLogoConfig().then(r => {
      if (r.ok && r.data) this.setState({ currentLogoDarkUrl: r.data.logoDarkUrl || '', currentLogoLightUrl: r.data.logoLightUrl || '' });
    }).catch(err => console.error('[Admin] Failed to load logo config:', err));
  }

  loadAdminBootstrapStatus = () => {
    return loadBootstrapStatus()
      .then(r => { if (r.ok && r.data) this.setState({ requiresInitialTokenSetup: !!r.data.requiresSetup, initialTokenSetupLockedByEnv: !!r.data.lockedByEnv }); })
      .catch(() => {});
  }

  loadSyncStatus = () => {
    fetchSyncStatus().then(r => { this.setState({ syncStatus: r.ok ? r.data : null, syncStatusLoading: false }); }).catch(err => { console.error('Error loading sync status:', err); this.setState({ syncStatus: null, syncStatusLoading: false }); });
  }

  loadConfigLocks = () => {
    fetchConfigLocks().then(r => {
      if (!r.ok) return;
      const d = r.data;
      this.setState({
        wifiLocked: d.wifiLocked || false, logoLocked: d.logoLocked || false,
        informationLocked: d.sidebarLocked || false, bookingLocked: d.bookingLocked || false,
        searchLocked: d.searchLocked || false, rateLimitLocked: d.rateLimitLocked || false,
        apiTokenLocked: d.apiTokenLocked || false, wifiApiTokenLocked: d.wifiApiTokenLocked || false,
        oauthLocked: d.oauthLocked || false, systemLocked: d.systemLocked || false,
        maintenanceLocked: d.maintenanceLocked || false, translationApiLocked: d.translationApiLocked || false
      });
    }).catch(err => console.error('Error loading config locks:', err));
  }

  loadConnectedClients = () => {
    this.setState({ connectedClientsLoading: true });
    fetchClients().then(r => {
      if (!r.ok) { this.setState({ connectedClientsLoading: false }); return; }
      const clients = Array.isArray(r.data?.clients) ? r.data.clients : [];
      this.setState((prevState) => {
        const currentTarget = String(prevState.sidebarTargetClientId || '');
        const stillExists = clients.some(c => String(c?.clientId || '') === currentTarget);
        return { connectedClients: clients, connectedClientsLoading: false, sidebarTargetClientId: stillExists ? currentTarget : '' };
      });
    }).catch(err => { console.error('Error loading connected clients:', err); this.setState({ connectedClientsLoading: false }); });
  }

  loadCurrentConfig = () => {
    const wifiHeaders = this.getRequestHeaders(false);
    this.loadConnectedClients();

    loadWiFiConfig(wifiHeaders).then(r => {
      if (!r.ok) return;
      const d = r.data;
      this.setState({
        currentSsid: d.ssid || '-', currentPassword: d.password || '-',
        wifiLastUpdated: d.lastUpdated ? new Date(d.lastUpdated).toLocaleString(navigator.language || 'de-DE') : '-',
        ssid: d.ssid || '', password: d.password || ''
      });
    }).catch(err => console.error('Error loading WiFi config:', err));

    fetchLogoConfig().then(r => {
      if (!r.ok) return;
      const d = r.data;
      this.setState({
        currentLogoDarkUrl: d.logoDarkUrl || '-', currentLogoLightUrl: d.logoLightUrl || '-',
        logoLastUpdated: d.lastUpdated ? new Date(d.lastUpdated).toLocaleString(navigator.language || 'de-DE') : '-',
        logoDarkUrl: d.logoDarkUrl || '', logoLightUrl: d.logoLightUrl || ''
      });
    }).catch(err => console.error('Error loading logo config:', err));

    loadSidebarConfig().then(r => {
      if (!r.ok) return;
      const d = r.data;
      const globalSingleRoomDarkMode = d.singleRoomDarkMode !== undefined ? d.singleRoomDarkMode : false;
      const globalFlightboardDarkMode = d.flightboardDarkMode !== undefined ? d.flightboardDarkMode : true;
      this.setState({
        currentShowWiFi: d.showWiFi !== undefined ? d.showWiFi : true,
        currentShowUpcomingMeetings: d.showUpcomingMeetings !== undefined ? d.showUpcomingMeetings : false,
        currentShowMeetingTitles: d.showMeetingTitles !== undefined ? d.showMeetingTitles : false,
        currentUpcomingMeetingsCount: Number.isFinite(Number(d.upcomingMeetingsCount)) ? Math.min(Math.max(parseInt(d.upcomingMeetingsCount, 10), 1), 10) : 3,
        currentMinimalHeaderStyle: d.minimalHeaderStyle || 'filled',
        currentSingleRoomDarkMode: globalSingleRoomDarkMode,
        currentFlightboardDarkMode: globalFlightboardDarkMode,
        informationLastUpdated: d.lastUpdated ? new Date(d.lastUpdated).toLocaleString(navigator.language || 'de-DE') : '-',
        showWiFi: d.showWiFi !== undefined ? d.showWiFi : true,
        showUpcomingMeetings: d.showUpcomingMeetings !== undefined ? d.showUpcomingMeetings : false,
        showMeetingTitles: d.showMeetingTitles !== undefined ? d.showMeetingTitles : false,
        upcomingMeetingsCount: Number.isFinite(Number(d.upcomingMeetingsCount)) ? Math.min(Math.max(parseInt(d.upcomingMeetingsCount, 10), 1), 10) : 3,
        minimalHeaderStyle: d.minimalHeaderStyle || 'filled',
        singleRoomDarkMode: this.state.sidebarTargetClientId ? this.state.singleRoomDarkMode : globalSingleRoomDarkMode,
        flightboardDarkMode: globalFlightboardDarkMode
      });
      const targetClientId = String(this.state.sidebarTargetClientId || '').trim();
      if (targetClientId) {
        loadSidebarConfig(targetClientId).then(tr => {
          if (tr.ok) this.setState({ singleRoomDarkMode: tr.data.singleRoomDarkMode !== undefined ? !!tr.data.singleRoomDarkMode : globalSingleRoomDarkMode });
        }).catch(err => console.error('Error loading target sidebar config:', err));
      }
    }).catch(err => console.error('Error loading information config:', err));

    loadBookingConfig().then(r => {
      if (!r.ok) return;
      const d = r.data;
      const roomFF = d.roomFeatureFlags && typeof d.roomFeatureFlags === 'object' ? d.roomFeatureFlags : {};
      const roomGroupFF = d.roomGroupFeatureFlags && typeof d.roomGroupFeatureFlags === 'object' ? d.roomGroupFeatureFlags : {};
      const ci = d.checkIn && typeof d.checkIn === 'object' ? d.checkIn : {};
      this.setState({
        currentEnableBooking: d.enableBooking !== undefined ? d.enableBooking : true,
        bookingLastUpdated: d.lastUpdated ? new Date(d.lastUpdated).toLocaleString(navigator.language || 'de-DE') : '-',
        enableBooking: d.enableBooking !== undefined ? d.enableBooking : true,
        currentEnableExtendMeeting: d.enableExtendMeeting !== undefined ? d.enableExtendMeeting : false,
        enableExtendMeeting: d.enableExtendMeeting !== undefined ? d.enableExtendMeeting : false,
        bookingPermissionMissing: d.permissionMissing || false,
        bookingButtonColor: d.buttonColor || '#334155', currentBookingButtonColor: d.buttonColor || '#334155',
        currentCheckInEnabled: ci.enabled !== undefined ? !!ci.enabled : true, checkInEnabled: ci.enabled !== undefined ? !!ci.enabled : true,
        currentCheckInRequiredForExternalMeetings: ci.requiredForExternalMeetings !== undefined ? !!ci.requiredForExternalMeetings : true,
        checkInRequiredForExternalMeetings: ci.requiredForExternalMeetings !== undefined ? !!ci.requiredForExternalMeetings : true,
        currentCheckInEarlyMinutes: Number.isFinite(Number(ci.earlyCheckInMinutes)) ? Math.max(parseInt(ci.earlyCheckInMinutes, 10), 0) : 5,
        checkInEarlyMinutes: Number.isFinite(Number(ci.earlyCheckInMinutes)) ? Math.max(parseInt(ci.earlyCheckInMinutes, 10), 0) : 5,
        currentCheckInWindowMinutes: Number.isFinite(Number(ci.windowMinutes)) ? Math.max(parseInt(ci.windowMinutes, 10), 1) : 10,
        checkInWindowMinutes: Number.isFinite(Number(ci.windowMinutes)) ? Math.max(parseInt(ci.windowMinutes, 10), 1) : 10,
        currentCheckInAutoReleaseNoShow: ci.autoReleaseNoShow !== undefined ? !!ci.autoReleaseNoShow : true,
        checkInAutoReleaseNoShow: ci.autoReleaseNoShow !== undefined ? !!ci.autoReleaseNoShow : true,
        currentRoomFeatureFlags: roomFF, roomFeatureFlags: roomFF,
        currentRoomGroupFeatureFlags: roomGroupFF, roomGroupFeatureFlags: roomGroupFF
      });
    }).catch(err => console.error('Error loading booking config:', err));

    loadSearchConfig().then(r => {
      if (!r.ok) return;
      const d = r.data;
      this.setState({
        currentSearchUseGraphAPI: d.useGraphAPI !== undefined ? !!d.useGraphAPI : true, searchUseGraphAPI: d.useGraphAPI !== undefined ? !!d.useGraphAPI : true,
        currentSearchMaxDays: Number.isFinite(Number(d.maxDays)) ? Math.max(parseInt(d.maxDays, 10), 1) : 7, searchMaxDays: Number.isFinite(Number(d.maxDays)) ? Math.max(parseInt(d.maxDays, 10), 1) : 7,
        currentSearchMaxRoomLists: Number.isFinite(Number(d.maxRoomLists)) ? Math.max(parseInt(d.maxRoomLists, 10), 1) : 5, searchMaxRoomLists: Number.isFinite(Number(d.maxRoomLists)) ? Math.max(parseInt(d.maxRoomLists, 10), 1) : 5,
        currentSearchMaxRooms: Number.isFinite(Number(d.maxRooms)) ? Math.max(parseInt(d.maxRooms, 10), 1) : 50, searchMaxRooms: Number.isFinite(Number(d.maxRooms)) ? Math.max(parseInt(d.maxRooms, 10), 1) : 50,
        currentSearchMaxItems: Number.isFinite(Number(d.maxItems)) ? Math.max(parseInt(d.maxItems, 10), 1) : 100, searchMaxItems: Number.isFinite(Number(d.maxItems)) ? Math.max(parseInt(d.maxItems, 10), 1) : 100,
        currentSearchPollIntervalMs: Number.isFinite(Number(d.pollIntervalMs)) ? Math.max(parseInt(d.pollIntervalMs, 10), 5000) : 15000, searchPollIntervalMs: Number.isFinite(Number(d.pollIntervalMs)) ? Math.max(parseInt(d.pollIntervalMs, 10), 5000) : 15000,
        searchLastUpdated: d.lastUpdated ? new Date(d.lastUpdated).toLocaleString(navigator.language || 'de-DE') : '-'
      });
    }).catch(err => console.error('Error loading search config:', err));

    loadRateLimitConfig().then(r => {
      if (!r.ok) return;
      const d = r.data;
      const p = (v, min, def) => Number.isFinite(Number(v)) ? Math.max(parseInt(v, 10), min) : def;
      this.setState({
        currentRateLimitApiWindowMs: p(d.apiWindowMs, 1000, 60000), rateLimitApiWindowMs: p(d.apiWindowMs, 1000, 60000),
        currentRateLimitApiMax: p(d.apiMax, 1, 300), rateLimitApiMax: p(d.apiMax, 1, 300),
        currentRateLimitWriteWindowMs: p(d.writeWindowMs, 1000, 60000), rateLimitWriteWindowMs: p(d.writeWindowMs, 1000, 60000),
        currentRateLimitWriteMax: p(d.writeMax, 1, 60), rateLimitWriteMax: p(d.writeMax, 1, 60),
        currentRateLimitAuthWindowMs: p(d.authWindowMs, 1000, 60000), rateLimitAuthWindowMs: p(d.authWindowMs, 1000, 60000),
        currentRateLimitAuthMax: p(d.authMax, 1, 30), rateLimitAuthMax: p(d.authMax, 1, 30),
        rateLimitLastUpdated: d.lastUpdated ? new Date(d.lastUpdated).toLocaleString(navigator.language || 'de-DE') : '-'
      });
    }).catch(err => console.error('Error loading rate-limit config:', err));

    loadTranslationApiConfig().then(r => {
      if (!r.ok) return;
      const d = r.data;
      this.setState({
        currentTranslationApiEnabled: d.enabled !== undefined ? !!d.enabled : true, translationApiEnabled: d.enabled !== undefined ? !!d.enabled : true,
        currentTranslationApiUrl: String(d.url || '').trim() || 'https://translation.googleapis.com/language/translate/v2',
        translationApiUrl: String(d.url || '').trim() || 'https://translation.googleapis.com/language/translate/v2',
        currentTranslationApiTimeoutMs: Number.isFinite(Number(d.timeoutMs)) ? Math.max(parseInt(d.timeoutMs, 10), 3000) : 20000,
        translationApiTimeoutMs: Number.isFinite(Number(d.timeoutMs)) ? Math.max(parseInt(d.timeoutMs, 10), 3000) : 20000,
        currentTranslationApiHasApiKey: !!d.hasApiKey,
        translationApiLastUpdated: d.lastUpdated ? new Date(d.lastUpdated).toLocaleString(navigator.language || 'de-DE') : '-',
        translationApiApiKey: ''
      });
    }).catch(err => console.error('Error loading translation API config:', err));

    loadRoomLists().then(r => {
      if (!r.ok) return;
      const options = Array.isArray(r.data) ? r.data.filter(i => i && i.alias).map(i => ({ value: String(i.alias).trim().toLowerCase(), label: `${i.name || i.alias} (${String(i.alias).trim().toLowerCase()})` })).sort((a, b) => a.label.localeCompare(b.label)) : [];
      this.setState({ availableRoomGroupOptions: options });
    }).catch(err => { console.error('Error loading roomlists:', err); this.setState({ availableRoomGroupOptions: [] }); });

    loadRooms().then(r => {
      if (!r.ok) return;
      const dedup = new Map();
      if (Array.isArray(r.data)) {
        r.data.forEach(room => {
          const email = String(room?.Email || '').trim().toLowerCase();
          if (!email || dedup.has(email)) return;
          const roomName = room?.Name ? String(room.Name) : email;
          const roomAlias = room?.RoomAlias ? String(room.RoomAlias) : '';
          dedup.set(email, { value: email, label: roomAlias ? `${roomName} (${email}) - ${roomAlias}` : `${roomName} (${email})` });
        });
      }
      this.setState({ availableRoomOptions: Array.from(dedup.values()).sort((a, b) => a.label.localeCompare(b.label)) });
    }).catch(err => { console.error('Error loading rooms:', err); this.setState({ availableRoomOptions: [] }); });

    loadMaintenanceStatus().then(r => {
      if (!r.ok) return;
      const d = r.data;
      this.setState({
        currentMaintenanceEnabled: d.enabled === true, currentMaintenanceMessage: d.message || '',
        maintenanceLastUpdated: d.lastUpdated ? new Date(d.lastUpdated).toLocaleString(navigator.language || 'de-DE') : '-',
        maintenanceEnabled: d.enabled === true, maintenanceMessage: d.message || ''
      });
    }).catch(err => console.error('Error loading maintenance config:', err));

    const authHeaders = this.getRequestHeaders(false);

    loadSystemConfig(authHeaders).then(r => {
      if (!r.ok) { if (r.status === 401) this.handleUnauthorizedAccess(); return; }
      const d = r.data;
      const wips = Array.isArray(d.graphWebhookAllowedIps) ? d.graphWebhookAllowedIps.join(', ') : '';
      this.setState({
        currentSystemStartupValidationStrict: !!d.startupValidationStrict, systemStartupValidationStrict: !!d.startupValidationStrict,
        currentSystemGraphWebhookEnabled: !!d.graphWebhookEnabled, systemGraphWebhookEnabled: !!d.graphWebhookEnabled,
        currentSystemGraphWebhookClientState: d.graphWebhookClientState || '', systemGraphWebhookClientState: d.graphWebhookClientState || '',
        currentSystemGraphWebhookAllowedIps: wips, systemGraphWebhookAllowedIps: wips,
        currentSystemExposeDetailedErrors: !!d.exposeDetailedErrors, systemExposeDetailedErrors: !!d.exposeDetailedErrors,
        currentSystemGraphFetchTimeoutMs: parseInt(d.graphFetchTimeoutMs, 10) || 10000, systemGraphFetchTimeoutMs: parseInt(d.graphFetchTimeoutMs, 10) || 10000,
        currentSystemGraphFetchRetryAttempts: parseInt(d.graphFetchRetryAttempts, 10) || 2, systemGraphFetchRetryAttempts: parseInt(d.graphFetchRetryAttempts, 10) || 2,
        currentSystemGraphFetchRetryBaseMs: parseInt(d.graphFetchRetryBaseMs, 10) || 250, systemGraphFetchRetryBaseMs: parseInt(d.graphFetchRetryBaseMs, 10) || 250,
        currentSystemHstsMaxAge: Math.max(parseInt(d.hstsMaxAge, 10) || 0, 0), systemHstsMaxAge: Math.max(parseInt(d.hstsMaxAge, 10) || 0, 0),
        currentSystemRateLimitMaxBuckets: parseInt(d.rateLimitMaxBuckets, 10) || 10000, systemRateLimitMaxBuckets: parseInt(d.rateLimitMaxBuckets, 10) || 10000,
        currentSystemDisplayTrackingMode: d.displayTrackingMode || 'client-id', systemDisplayTrackingMode: d.displayTrackingMode || 'client-id',
        currentSystemDisplayTrackingRetentionHours: parseInt(d.displayTrackingRetentionHours, 10) || 2, systemDisplayTrackingRetentionHours: parseInt(d.displayTrackingRetentionHours, 10) || 2,
        currentSystemDisplayTrackingCleanupMinutes: parseInt(d.displayTrackingCleanupMinutes, 10) || 5, systemDisplayTrackingCleanupMinutes: parseInt(d.displayTrackingCleanupMinutes, 10) || 5,
        currentSystemDisplayIpWhitelistEnabled: !!d.displayIpWhitelistEnabled, systemDisplayIpWhitelistEnabled: !!d.displayIpWhitelistEnabled,
        currentSystemDisplayIpWhitelist: Array.isArray(d.displayIpWhitelist) ? d.displayIpWhitelist.join('\n') : '', systemDisplayIpWhitelist: Array.isArray(d.displayIpWhitelist) ? d.displayIpWhitelist.join('\n') : '',
        currentSystemTrustReverseProxy: !!d.trustReverseProxy, systemTrustReverseProxy: !!d.trustReverseProxy,
        currentDemoMode: !!d.demoMode, demoMode: !!d.demoMode,
        systemLastUpdated: d.lastUpdated ? new Date(d.lastUpdated).toLocaleString(navigator.language || 'de-DE') : '-'
      });
    }).catch(err => console.error('Error loading system config:', err));

    loadOAuthConfig(authHeaders).then(r => {
      if (!r.ok) { if (r.status === 401) this.handleUnauthorizedAccess(); return; }
      const d = r.data;
      const tenantId = d.tenantId || '';
      this.setState((prevState) => {
        const nextState = { currentOauthClientId: d.clientId || '', currentOauthAuthority: tenantId, currentOauthHasClientSecret: !!d.hasClientSecret, oauthLastUpdated: d.lastUpdated ? new Date(d.lastUpdated).toLocaleString(navigator.language || 'de-DE') : '-' };
        if (!prevState.oauthFormDirty) { nextState.oauthClientId = d.clientId || ''; nextState.oauthAuthority = tenantId; nextState.oauthClientSecret = ''; }
        return nextState;
      });
    }).catch(err => console.error('Error loading oauth config:', err));

    loadCertificateInfo(authHeaders).then(r => {
      if (r.ok && r.data) this.setState({ certificateInfo: r.data.certificate || null });
    }).catch(err => console.error('Error loading certificate info:', err));

    loadApiTokenConfig(authHeaders).then(r => {
      if (!r.ok) { if (r.status === 401) this.handleUnauthorizedAccess(); return; }
      const d = r.data;
      this.setState({
        currentApiTokenSource: d.source || 'default', currentApiTokenIsDefault: !!d.isDefault,
        apiTokenConfigLastUpdated: d.lastUpdated ? new Date(d.lastUpdated).toLocaleString(navigator.language || 'de-DE') : '-',
        currentWifiApiTokenSource: d.wifiSource || 'default', currentWifiApiTokenConfigured: !!d.wifiConfigured,
        wifiApiTokenConfigLastUpdated: d.wifiLastUpdated ? new Date(d.wifiLastUpdated).toLocaleString(navigator.language || 'de-DE') : '-'
      });
    }).catch(err => console.error('Error loading API auth config:', err));

    loadI18nConfig().then(r => {
      if (!r.ok) return;
      const d = r.data;
      const mm = d && d.maintenanceMessages && typeof d.maintenanceMessages === 'object' ? d.maintenanceMessages : {};
      const at = d && d.adminTranslations && typeof d.adminTranslations === 'object' ? d.adminTranslations : {};
      const languages = Array.from(new Set([...Object.keys(defaultAdminTranslations || {}), ...Object.keys(mm || {}), ...Object.keys(at || {})])).map(l => String(l || '').trim().toLowerCase()).filter(Boolean).sort();
      this.setState((prevState) => {
        const prev = String(prevState.translationLanguage || '').trim().toLowerCase();
        return {
          currentMaintenanceTranslations: mm, maintenanceTranslationsText: JSON.stringify(mm, null, 2),
          currentAdminTranslations: at, adminTranslationsText: JSON.stringify(Object.keys(at).length > 0 ? at : defaultAdminTranslations, null, 2),
          translationLanguage: languages.includes(prev) ? prev : (languages[0] || 'en'),
          i18nLastUpdated: d.lastUpdated ? new Date(d.lastUpdated).toLocaleString(navigator.language || 'de-DE') : '-'
        };
      });
    }).catch(err => console.error('Error loading i18n config:', err));

    loadColorsConfig().then(r => {
      if (!r.ok) return;
      const d = r.data;
      this.setState({
        bookingButtonColor: d.bookingButtonColor || '#334155', currentBookingButtonColor: d.bookingButtonColor || '#334155',
        statusAvailableColor: d.statusAvailableColor || '#22c55e', currentStatusAvailableColor: d.statusAvailableColor || '#22c55e',
        statusBusyColor: d.statusBusyColor || '#ef4444', currentStatusBusyColor: d.statusBusyColor || '#ef4444',
        statusUpcomingColor: d.statusUpcomingColor || '#f59e0b', currentStatusUpcomingColor: d.statusUpcomingColor || '#f59e0b',
        statusNotFoundColor: d.statusNotFoundColor || '#6b7280', currentStatusNotFoundColor: d.statusNotFoundColor || '#6b7280',
        colorsLastUpdated: d.lastUpdated ? new Date(d.lastUpdated).toLocaleString(navigator.language || 'de-DE') : '-'
      });
    }).catch(err => console.error('Error loading colors config:', err));

    this.loadMqttConfig();
    this.loadMqttStatus();
  }

  // ============================================================================
  // Translation Management
  // ============================================================================

  getTranslations() { return getAdminTranslations(this.state.currentAdminTranslations); }

  getAvailableTranslationLanguages = () => {
    const ml = Object.keys(this.state.currentMaintenanceTranslations || {});
    const al = Object.keys(this.state.currentAdminTranslations || {});
    const dl = Object.keys(defaultAdminTranslations || {});
    return Array.from(new Set([...dl, ...ml, ...al])).map(l => String(l || '').trim().toLowerCase()).filter(Boolean).sort();
  }

  handleTranslationLanguageChange = (language) => { this.setState({ translationLanguage: String(language || '').trim().toLowerCase() || 'en', translationLanguageDraftError: null }); }

  autoTranslateLanguageFromEnglish = async (targetLanguage) => {
    const t = this.getTranslations();
    const { currentMaintenanceTranslations, currentAdminTranslations } = this.state;
    const sourceMaintenance = currentMaintenanceTranslations?.en || { title: '', body: '' };
    const sourceAdmin = { ...(defaultAdminTranslations.en || {}), ...(currentAdminTranslations?.en || {}) };
    try {
      const r = await submitAutoTranslate(this.getRequestHeaders, { sourceLanguage: 'en', targetLanguage, maintenanceSource: sourceMaintenance, adminSource: sourceAdmin });
      if (r.status === 401) { this.handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); }
      if (!r.ok || !r.data?.success) throw new Error(r.data?.error || t.errorUnknown);
      this.setState((prev) => {
        const nextMT = { ...(prev.currentMaintenanceTranslations || {}), [targetLanguage]: { title: String(r.data.maintenance?.title || sourceMaintenance.title || ''), body: String(r.data.maintenance?.body || sourceMaintenance.body || '') } };
        const nextAT = { ...(prev.currentAdminTranslations || {}), [targetLanguage]: { ...sourceAdmin, ...(r.data.admin || {}) } };
        return { currentMaintenanceTranslations: nextMT, maintenanceTranslationsText: JSON.stringify(nextMT, null, 2), currentAdminTranslations: nextAT, adminTranslationsText: JSON.stringify(nextAT, null, 2) };
      }, () => { this.saveI18nConfig(this.state.currentMaintenanceTranslations, this.state.currentAdminTranslations, t.languageAddedSuccessMessage || t.translationsSuccessMessage); });
    } catch (error) {
      this.setState({ i18nMessage: `${t.errorPrefix} ${error.message}`, i18nMessageType: 'error' }, () => {
        this.saveI18nConfig(this.state.currentMaintenanceTranslations, this.state.currentAdminTranslations, t.languageAddedSuccessMessage || t.translationsSuccessMessage);
      });
    }
  }

  saveI18nConfig = (maintenanceMessages, adminTranslations, successMessage) => {
    const t = this.getTranslations();
    return submitI18nConfig(this.getRequestHeaders, { maintenanceMessages, adminTranslations })
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); }
        if (!r.ok) throw new Error(r.data?.error || t.errorUnknown);
        const saved = r.data.config?.maintenanceMessages || maintenanceMessages;
        const savedAdmin = r.data.config?.adminTranslations || adminTranslations;
        this.setState({ i18nMessage: successMessage || t.translationsSuccessMessage, i18nMessageType: 'success', currentMaintenanceTranslations: saved, maintenanceTranslationsText: JSON.stringify(saved, null, 2), currentAdminTranslations: savedAdmin, adminTranslationsText: JSON.stringify(savedAdmin, null, 2) });
        this.loadCurrentConfig();
      })
      .catch(err => { this.setState({ i18nMessage: `${t.errorPrefix} ${err.message}`, i18nMessageType: 'error' }); });
  }

  handleNewTranslationLanguageChange = (value) => { this.setState({ newTranslationLanguageCode: value, translationLanguageDraftError: null }); }

  handleAddTranslationLanguage = () => {
    const t = this.getTranslations();
    const newLang = normalizeLanguageCode(this.state.newTranslationLanguageCode);
    if (!newLang || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(newLang)) { this.setState({ translationLanguageDraftError: t.invalidLanguageCodeMessage || 'Ungültiger Sprachcode' }); return; }
    this.setState((prev) => {
      const nextMT = { ...(prev.currentMaintenanceTranslations || {}) };
      const nextAT = { ...(prev.currentAdminTranslations || {}) };
      const ms = nextMT.en || {}; const as = { ...(defaultAdminTranslations.en || {}), ...(nextAT.en || {}) };
      const em = nextMT[newLang] || {}; nextMT[newLang] = { title: String(em.title || ms.title || ''), body: String(em.body || ms.body || '') };
      const ea = nextAT[newLang] || {}; nextAT[newLang] = { ...as, ...ea };
      return { currentMaintenanceTranslations: nextMT, maintenanceTranslationsText: JSON.stringify(nextMT, null, 2), currentAdminTranslations: nextAT, adminTranslationsText: JSON.stringify(nextAT, null, 2), translationLanguage: newLang, newTranslationLanguageCode: '', translationLanguageDraftError: null };
    }, () => {
      if (newLang === 'en') { this.saveI18nConfig(this.state.currentMaintenanceTranslations, this.state.currentAdminTranslations, t.languageAddedSuccessMessage || t.translationsSuccessMessage); return; }
      this.autoTranslateLanguageFromEnglish(newLang);
    });
  }

  handleRemoveTranslationLanguage = () => {
    const t = this.getTranslations();
    this.setState((prev) => {
      const lang = normalizeLanguageCode(prev.translationLanguage);
      if (!lang) return null;
      if (['en', 'de'].includes(lang)) return { translationLanguageDraftError: t.removeLanguageDefaultError || 'English (en) and German (de) cannot be removed' };
      const nextMT = { ...(prev.currentMaintenanceTranslations || {}) }; const nextAT = { ...(prev.currentAdminTranslations || {}) };
      delete nextMT[lang]; delete nextAT[lang];
      const nextLangs = Array.from(new Set([...Object.keys(defaultAdminTranslations || {}), ...Object.keys(nextMT), ...Object.keys(nextAT)])).map(l => String(l || '').trim().toLowerCase()).filter(Boolean).sort();
      return { currentMaintenanceTranslations: nextMT, maintenanceTranslationsText: JSON.stringify(nextMT, null, 2), currentAdminTranslations: nextAT, adminTranslationsText: JSON.stringify(nextAT, null, 2), translationLanguage: nextLangs.includes('en') ? 'en' : (nextLangs[0] || 'en'), translationLanguageDraftError: null };
    }, () => { this.saveI18nConfig(this.state.currentMaintenanceTranslations, this.state.currentAdminTranslations, t.languageRemovedSuccessMessage || t.translationsSuccessMessage); });
  }

  toggleTranslationGroup = (labelKey) => { this.setState((prev) => ({ collapsedTranslationGroups: { ...(prev.collapsedTranslationGroups || {}), [labelKey]: !prev.collapsedTranslationGroups?.[labelKey] } })); }

  handleMaintenanceTranslationFieldChange = (language, field, value) => {
    this.setState((prev) => { const next = { ...prev.currentMaintenanceTranslations, [language]: { ...(prev.currentMaintenanceTranslations?.[language] || {}), [field]: value } }; return { currentMaintenanceTranslations: next, maintenanceTranslationsText: JSON.stringify(next, null, 2) }; });
  }

  handleAdminTranslationFieldChange = (language, key, value) => {
    this.setState((prev) => { const next = { ...prev.currentAdminTranslations, [language]: { ...(prev.currentAdminTranslations?.[language] || {}), [key]: value } }; return { currentAdminTranslations: next, adminTranslationsText: JSON.stringify(next, null, 2) }; });
  }

  // ============================================================================
  // Form Submission Handlers (thin wrappers around extracted service functions)
  // ============================================================================

  handleWiFiSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    submitWiFiConfig(this.getRequestHeaders, { ssid: this.state.ssid, password: this.state.password })
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
        if (r.ok) { this.setState({ wifiMessage: t.wifiSuccessMessage, wifiMessageType: 'success' }); this.loadCurrentConfig(); setTimeout(() => this.setState({ wifiMessage: null, wifiMessageType: null }), 5000); }
        else this.setState({ wifiMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, wifiMessageType: 'error' });
      }).catch(err => this.setState({ wifiMessage: `${t.errorPrefix} ${err.message}`, wifiMessageType: 'error' }));
  }

  handleLogoSubmit = async (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { logoDarkUrl, logoLightUrl, logoDarkFile, logoLightFile, uploadMode } = this.state;
    try {
      let finalDark = logoDarkUrl, finalLight = logoLightUrl;
      if (uploadMode === 'file') {
        if (logoDarkFile) { const formData = new FormData(); formData.append('logo', logoDarkFile); formData.append('logoType', 'dark'); const r = await uploadLogoFile(this.getRequestHeaders, formData); if (r.status === 401) { this.handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); } if (!r.ok) throw new Error(r.data?.error || t.errorUnknown); finalDark = r.data.logoUrl; }
        if (logoLightFile) { const formData = new FormData(); formData.append('logo', logoLightFile); formData.append('logoType', 'light'); const r = await uploadLogoFile(this.getRequestHeaders, formData); if (r.status === 401) { this.handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); } if (!r.ok) throw new Error(r.data?.error || t.errorUnknown); finalLight = r.data.logoUrl; }
        if (!logoDarkFile && !logoLightFile) throw new Error('Please select at least one logo file to upload');
      }
      const r = await submitLogoConfig(this.getRequestHeaders, { logoDarkUrl: finalDark, logoLightUrl: finalLight });
      if (r.status === 401) { this.handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); }
      if (!r.ok) throw new Error(r.data?.error || t.errorUnknown);
      this.setState({ logoMessage: t.logoSuccessMessage, logoMessageType: 'success', logoDarkFile: null, logoLightFile: null });
      this.loadCurrentConfig();
      const darkInput = document.getElementById('logoDarkFile'); const lightInput = document.getElementById('logoLightFile');
      if (darkInput) darkInput.value = ''; if (lightInput) lightInput.value = '';
      setTimeout(() => this.setState({ logoMessage: null, logoMessageType: null }), 5000);
    } catch (err) { this.setState({ logoMessage: `${t.errorPrefix} ${err.message}`, logoMessageType: 'error' }); }
  }

  handleSidebarSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { showWiFi, showUpcomingMeetings, showMeetingTitles, minimalHeaderStyle, upcomingMeetingsCount, singleRoomDarkMode, flightboardDarkMode, sidebarTargetClientId } = this.state;
    const count = Number.isFinite(Number(upcomingMeetingsCount)) ? Math.min(Math.max(parseInt(upcomingMeetingsCount, 10), 1), 10) : 3;
    const targetId = String(sidebarTargetClientId || '').trim();
    const payload = targetId ? { targetClientId: targetId, singleRoomDarkMode } : { showWiFi, showUpcomingMeetings, showMeetingTitles, minimalHeaderStyle, upcomingMeetingsCount: count, singleRoomDarkMode, flightboardDarkMode };
    submitSidebarConfig(this.getRequestHeaders, payload)
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
        if (r.ok) { this.setState({ informationMessage: t.sidebarSuccessMessage, informationMessageType: 'success' }); this.loadCurrentConfig(); setTimeout(() => this.setState({ informationMessage: null, informationMessageType: null }), 5000); }
        else this.setState({ informationMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, informationMessageType: 'error' });
      }).catch(err => this.setState({ informationMessage: `${t.errorPrefix} ${err.message}`, informationMessageType: 'error' }));
  }

  handleBookingSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { enableBooking, enableExtendMeeting, bookingButtonColor, checkInEnabled, checkInRequiredForExternalMeetings, checkInEarlyMinutes, checkInWindowMinutes, checkInAutoReleaseNoShow, roomFeatureFlags, roomGroupFeatureFlags } = this.state;
    submitBookingConfig(this.getRequestHeaders, { enableBooking, enableExtendMeeting, buttonColor: bookingButtonColor, checkIn: { enabled: !!checkInEnabled, requiredForExternalMeetings: !!checkInRequiredForExternalMeetings, earlyCheckInMinutes: Math.max(parseInt(checkInEarlyMinutes, 10) || 0, 0), windowMinutes: Math.max(parseInt(checkInWindowMinutes, 10) || 1, 1), autoReleaseNoShow: !!checkInAutoReleaseNoShow }, roomFeatureFlags, roomGroupFeatureFlags })
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
        if (r.ok) { this.setState({ bookingMessage: t.bookingSuccessMessage, bookingMessageType: 'success' }); this.loadCurrentConfig(); setTimeout(() => this.setState({ bookingMessage: null, bookingMessageType: null }), 5000); }
        else this.setState({ bookingMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, bookingMessageType: 'error' });
      }).catch(err => this.setState({ bookingMessage: `${t.errorPrefix} ${err.message}`, bookingMessageType: 'error' }));
  }

  handleOverrideDraftChange = (scope, value) => { scope === 'group' ? this.setState({ newRoomGroupOverrideKey: value }) : this.setState({ newRoomOverrideKey: value }); }

  handleAddOverride = (scope) => {
    const t = this.getTranslations();
    const draftValue = scope === 'group' ? this.state.newRoomGroupOverrideKey : this.state.newRoomOverrideKey;
    const key = normalizeOverrideKey(draftValue);
    if (!key) { this.setState({ bookingMessage: `${t.errorPrefix} ${t.overrideKeyRequiredLabel || 'Bitte einen Schlüssel eingeben.'}`, bookingMessageType: 'error' }); return; }
    this.setState((prev) => {
      const targetKey = scope === 'group' ? 'roomGroupFeatureFlags' : 'roomFeatureFlags';
      const existing = { ...(prev[targetKey] || {}) }; if (!existing[key]) existing[key] = {};
      return { [targetKey]: existing, newRoomOverrideKey: scope === 'room' ? '' : prev.newRoomOverrideKey, newRoomGroupOverrideKey: scope === 'group' ? '' : prev.newRoomGroupOverrideKey, bookingMessage: null, bookingMessageType: null };
    });
  }

  handleRemoveOverride = (scope, key) => { this.setState((prev) => { const targetKey = scope === 'group' ? 'roomGroupFeatureFlags' : 'roomFeatureFlags'; const next = { ...(prev[targetKey] || {}) }; delete next[key]; return { [targetKey]: next }; }); }

  handleOverrideStateChange = (scope, key, field, stateValue) => {
    const parsedValue = fromOverrideState(stateValue);
    this.setState((prev) => {
      const targetKey = scope === 'group' ? 'roomGroupFeatureFlags' : 'roomFeatureFlags';
      const next = { ...(prev[targetKey] || {}) }; const nextEntry = { ...(next[key] || {}), [field]: parsedValue };
      if (nextEntry.enableBooking === undefined && nextEntry.enableExtendMeeting === undefined) delete next[key]; else next[key] = nextEntry;
      return { [targetKey]: next };
    });
  }

  handleMaintenanceSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    submitMaintenanceConfig(this.getRequestHeaders, { enabled: this.state.maintenanceEnabled, message: this.state.maintenanceMessage })
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
        if (r.ok) { this.setState({ maintenanceMessageBanner: t.maintenanceSuccessMessage, maintenanceMessageType: 'success' }); this.loadCurrentConfig(); }
        else this.setState({ maintenanceMessageBanner: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, maintenanceMessageType: 'error' });
      }).catch(err => this.setState({ maintenanceMessageBanner: `${t.errorPrefix} ${err.message}`, maintenanceMessageType: 'error' }));
  }

  handleSystemSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const s = this.state;
    submitSystemConfig(this.getRequestHeaders, {
      startupValidationStrict: !!s.systemStartupValidationStrict, exposeDetailedErrors: !!s.systemExposeDetailedErrors,
      hstsMaxAge: Math.max(parseInt(s.systemHstsMaxAge, 10) || 0, 0), rateLimitMaxBuckets: Math.max(parseInt(s.systemRateLimitMaxBuckets, 10) || 1000, 1000),
      displayTrackingMode: s.systemDisplayTrackingMode, displayTrackingRetentionHours: Math.max(Math.min(parseInt(s.systemDisplayTrackingRetentionHours, 10) || 2, 168), 1),
      displayTrackingCleanupMinutes: Math.max(Math.min(parseInt(s.systemDisplayTrackingCleanupMinutes, 10) || 5, 60), 0),
      displayIpWhitelistEnabled: !!s.systemDisplayIpWhitelistEnabled, displayIpWhitelist: String(s.systemDisplayIpWhitelist || '').split('\n').map(x => x.trim()).filter(Boolean),
      trustReverseProxy: !!s.systemTrustReverseProxy, demoMode: !!s.demoMode
    }).then(r => {
      if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
      if (r.ok) { this.setState({ systemMessage: t.systemConfigUpdateSuccess || 'System configuration updated successfully.', systemMessageType: 'success' }); this.loadCurrentConfig(); setTimeout(() => this.setState({ systemMessage: null, systemMessageType: null }), 5000); }
      else this.setState({ systemMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, systemMessageType: 'error' });
    }).catch(err => this.setState({ systemMessage: `${t.errorPrefix} ${err.message}`, systemMessageType: 'error' }));
  }

  handleGraphRuntimeSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const s = this.state;
    const webhookIps = String(s.systemGraphWebhookAllowedIps || '').split(',').map(x => x.trim()).filter(Boolean);
    submitGraphRuntimeConfig(this.getRequestHeaders, {
      graphWebhookEnabled: !!s.systemGraphWebhookEnabled, graphWebhookClientState: String(s.systemGraphWebhookClientState || '').trim(), graphWebhookAllowedIps: webhookIps,
      graphFetchTimeoutMs: Math.max(parseInt(s.systemGraphFetchTimeoutMs, 10) || 1000, 1000), graphFetchRetryAttempts: Math.max(parseInt(s.systemGraphFetchRetryAttempts, 10) || 0, 0), graphFetchRetryBaseMs: Math.max(parseInt(s.systemGraphFetchRetryBaseMs, 10) || 50, 50)
    }).then(r => {
      if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
      if (r.ok) { this.setState({ graphRuntimeMessage: t.graphRuntimeUpdateSuccess || 'Graph runtime configuration updated successfully.', graphRuntimeMessageType: 'success' }); this.loadCurrentConfig(); setTimeout(() => this.setState({ graphRuntimeMessage: null, graphRuntimeMessageType: null }), 5000); }
      else this.setState({ graphRuntimeMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, graphRuntimeMessageType: 'error' });
    }).catch(err => this.setState({ graphRuntimeMessage: `${t.errorPrefix} ${err.message}`, graphRuntimeMessageType: 'error' }));
  }

  handleTranslationApiSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const payload = { enabled: !!this.state.translationApiEnabled, url: String(this.state.translationApiUrl || '').trim(), timeoutMs: Math.max(parseInt(this.state.translationApiTimeoutMs, 10) || 3000, 3000) };
    if (String(this.state.translationApiApiKey || '').trim()) payload.apiKey = String(this.state.translationApiApiKey || '').trim();
    submitTranslationApiConfig(this.getRequestHeaders, payload)
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
        if (r.ok) { this.setState({ translationApiMessage: t.translationApiSuccessMessage || 'Translation API configuration updated successfully.', translationApiMessageType: 'success', translationApiApiKey: '' }); this.loadCurrentConfig(); setTimeout(() => this.setState({ translationApiMessage: null, translationApiMessageType: null }), 5000); }
        else this.setState({ translationApiMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, translationApiMessageType: 'error' });
      }).catch(err => this.setState({ translationApiMessage: `${t.errorPrefix} ${err.message}`, translationApiMessageType: 'error' }));
  }

  handleOAuthSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    submitOAuthConfig(this.getRequestHeaders, { clientId: String(this.state.oauthClientId || '').trim(), tenantId: String(this.state.oauthAuthority || '').trim(), clientSecret: this.state.oauthClientSecret })
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
        if (r.ok) { this.setState({ oauthMessage: t.oauthConfigUpdateSuccess || 'OAuth configuration updated successfully.', oauthMessageType: 'success', oauthClientSecret: '', oauthFormDirty: false }); this.loadCurrentConfig(); setTimeout(() => this.setState({ oauthMessage: null, oauthMessageType: null }), 5000); }
        else this.setState({ oauthMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, oauthMessageType: 'error' });
      }).catch(err => this.setState({ oauthMessage: `${t.errorPrefix} ${err.message}`, oauthMessageType: 'error' }));
  }

  handleGenerateCertificate = () => {
    const t = this.getTranslations();
    this.setState({ certificateLoading: true, certificateMessage: null, oauthFormDirty: true });
    generateCertificate(this.getRequestHeaders, { validityYears: 3 })
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); }
        if (!r.ok) throw new Error(r.data?.error || t.errorUnknown);
        this.setState({ certificateMessage: t.certGenerateSuccess || 'Certificate generated successfully. Download the .pem file and upload it to Azure AD.', certificateMessageType: 'success', certificateLoading: false });
        this.loadCurrentConfig(); setTimeout(() => this.setState({ certificateMessage: null, certificateMessageType: null }), 8000);
      }).catch(err => this.setState({ certificateMessage: `${t.errorPrefix} ${err.message}`, certificateMessageType: 'error', certificateLoading: false }));
  }

  handleDownloadCertificate = () => {
    downloadCertificate(this.getRequestHeaders)
      .then(({ blob, filename }) => { const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url); })
      .catch(err => { const t = this.getTranslations(); this.setState({ certificateMessage: `${t.errorPrefix} ${err.message}`, certificateMessageType: 'error' }); });
  }

  handleDeleteCertificate = () => {
    const t = this.getTranslations();
    if (!window.confirm(t.certDeleteConfirm || 'Delete the certificate? Authentication will revert to Client Secret.')) return;
    deleteCertificate(this.getRequestHeaders)
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); }
        if (!r.ok) throw new Error(r.data?.error || t.errorUnknown);
        this.setState({ certificateMessage: t.certDeleteSuccess || 'Certificate deleted. Reverted to Client Secret authentication.', certificateMessageType: 'success' });
        this.loadCurrentConfig(); setTimeout(() => this.setState({ certificateMessage: null, certificateMessageType: null }), 5000);
      }).catch(err => this.setState({ certificateMessage: `${t.errorPrefix} ${err.message}`, certificateMessageType: 'error' }));
  }

  handleApiTokenSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const trimmed = String(this.state.newApiToken || '').trim();
    const confirm = String(this.state.newApiTokenConfirm || '').trim();
    if (!trimmed || trimmed.length < 8) { this.setState({ apiTokenConfigMessage: `${t.errorPrefix} ${t.apiTokenConfigMinLengthError || 'API token must have at least 8 characters.'}`, apiTokenConfigMessageType: 'error' }); return; }
    if (trimmed !== confirm) { this.setState({ apiTokenConfigMessage: `${t.errorPrefix} ${t.apiTokenConfigMismatchError || 'New API token and confirmation do not match.'}`, apiTokenConfigMessageType: 'error' }); return; }
    submitApiTokenConfig(this.getRequestHeaders, { newToken: trimmed })
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
        if (r.ok) { this.setState({ apiToken: '', newApiToken: '', newApiTokenConfirm: '', apiTokenConfigMessage: t.apiTokenConfigUpdateSuccess || 'API token updated successfully.', apiTokenConfigMessageType: 'success' }); this.loadConfigLocks(); this.loadCurrentConfig(); }
        else this.setState({ apiTokenConfigMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, apiTokenConfigMessageType: 'error' });
      }).catch(err => this.setState({ apiTokenConfigMessage: `${t.errorPrefix} ${err.message}`, apiTokenConfigMessageType: 'error' }));
  }

  handleWiFiApiTokenSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const trimmed = String(this.state.newWifiApiToken || '').trim();
    const confirm = String(this.state.newWifiApiTokenConfirm || '').trim();
    if (!trimmed || trimmed.length < 8) { this.setState({ wifiApiTokenConfigMessage: `${t.errorPrefix} ${t.apiTokenConfigMinLengthError || 'API token must have at least 8 characters.'}`, wifiApiTokenConfigMessageType: 'error' }); return; }
    if (trimmed !== confirm) { this.setState({ wifiApiTokenConfigMessage: `${t.errorPrefix} ${t.apiTokenConfigMismatchError || 'New API token and confirmation do not match.'}`, wifiApiTokenConfigMessageType: 'error' }); return; }
    submitApiTokenConfig(this.getRequestHeaders, { newWifiToken: trimmed })
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
        if (r.ok) { this.setState({ newWifiApiToken: '', newWifiApiTokenConfirm: '', wifiApiTokenConfigMessage: t.wifiApiTokenConfigUpdateSuccess || 'WiFi API token updated successfully.', wifiApiTokenConfigMessageType: 'success' }); this.loadConfigLocks(); this.loadCurrentConfig(); }
        else this.setState({ wifiApiTokenConfigMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, wifiApiTokenConfigMessageType: 'error' });
      }).catch(err => this.setState({ wifiApiTokenConfigMessage: `${t.errorPrefix} ${err.message}`, wifiApiTokenConfigMessageType: 'error' }));
  }

  handleSearchSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const s = this.state;
    submitSearchConfig(this.getRequestHeaders, { useGraphAPI: !!s.searchUseGraphAPI, maxDays: Math.max(parseInt(s.searchMaxDays, 10) || 1, 1), maxRoomLists: Math.max(parseInt(s.searchMaxRoomLists, 10) || 1, 1), maxRooms: Math.max(parseInt(s.searchMaxRooms, 10) || 1, 1), maxItems: Math.max(parseInt(s.searchMaxItems, 10) || 1, 1), pollIntervalMs: Math.max(parseInt(s.searchPollIntervalMs, 10) || 5000, 5000) })
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
        if (r.ok) { this.setState({ searchMessage: 'Search configuration updated successfully.', searchMessageType: 'success' }); this.loadCurrentConfig(); setTimeout(() => this.setState({ searchMessage: null, searchMessageType: null }), 5000); }
        else this.setState({ searchMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, searchMessageType: 'error' });
      }).catch(err => this.setState({ searchMessage: `${t.errorPrefix} ${err.message}`, searchMessageType: 'error' }));
  }

  handleRateLimitSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const s = this.state;
    submitRateLimitConfig(this.getRequestHeaders, { apiWindowMs: Math.max(parseInt(s.rateLimitApiWindowMs, 10) || 1000, 1000), apiMax: Math.max(parseInt(s.rateLimitApiMax, 10) || 1, 1), writeWindowMs: Math.max(parseInt(s.rateLimitWriteWindowMs, 10) || 1000, 1000), writeMax: Math.max(parseInt(s.rateLimitWriteMax, 10) || 1, 1), authWindowMs: Math.max(parseInt(s.rateLimitAuthWindowMs, 10) || 1000, 1000), authMax: Math.max(parseInt(s.rateLimitAuthMax, 10) || 1, 1) })
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
        if (r.ok) { this.setState({ rateLimitMessage: 'Rate limit configuration updated successfully.', rateLimitMessageType: 'success' }); this.loadCurrentConfig(); setTimeout(() => this.setState({ rateLimitMessage: null, rateLimitMessageType: null }), 5000); }
        else this.setState({ rateLimitMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, rateLimitMessageType: 'error' });
      }).catch(err => this.setState({ rateLimitMessage: `${t.errorPrefix} ${err.message}`, rateLimitMessageType: 'error' }));
  }

  handleColorsSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { bookingButtonColor, statusAvailableColor, statusBusyColor, statusUpcomingColor, statusNotFoundColor } = this.state;
    submitColorsConfig(this.getRequestHeaders, { bookingButtonColor, statusAvailableColor, statusBusyColor, statusUpcomingColor, statusNotFoundColor })
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
        this.setState({ colorMessage: t.colorsSuccessMessage, colorMessageType: 'success', currentBookingButtonColor: bookingButtonColor, currentStatusAvailableColor: statusAvailableColor, currentStatusBusyColor: statusBusyColor, currentStatusUpcomingColor: statusUpcomingColor, currentStatusNotFoundColor: statusNotFoundColor });
        setTimeout(() => this.setState({ colorMessage: null }), 3000);
      }).catch(err => this.setState({ colorMessage: `${t.errorPrefix} ${err.message}`, colorMessageType: 'error' }));
  }

  handleExportBackup = () => {
    const t = this.getTranslations();
    submitBackupExport(this.getRequestHeaders)
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
        this.setState({ backupPayloadText: JSON.stringify(r.data, null, 2), backupMessage: t.backupSuccessExport, backupMessageType: 'success' });
      }).catch(err => this.setState({ backupMessage: `${t.errorPrefix} ${err.message}`, backupMessageType: 'error' }));
  }

  handleImportBackup = () => {
    const t = this.getTranslations();
    let parsed;
    try { parsed = JSON.parse(this.state.backupPayloadText || '{}'); } catch (error) { this.setState({ backupMessage: `${t.errorPrefix} ${error.message}`, backupMessageType: 'error' }); return; }
    submitBackupImport(this.getRequestHeaders, parsed)
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
        if (r.ok) { this.setState({ backupMessage: t.backupSuccessImport, backupMessageType: 'success' }); this.loadCurrentConfig(); }
        else this.setState({ backupMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, backupMessageType: 'error' });
      }).catch(err => this.setState({ backupMessage: `${t.errorPrefix} ${err.message}`, backupMessageType: 'error' }));
  }

  handleLoadAuditLogs = () => {
    const t = this.getTranslations();
    fetchAuditLogs(this.getRequestHeaders)
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
        this.setState({ auditLogs: Array.isArray(r.data?.logs) ? r.data.logs : [], auditMessage: null, auditMessageType: null });
      }).catch(err => this.setState({ auditMessage: `${t.errorPrefix} ${err.message}`, auditMessageType: 'error' }));
  }

  handleLoadConnectedDisplays = () => {
    const t = this.getTranslations();
    this.setState({ connectedDisplaysLoading: true });
    return fetchConnectedDisplays(this.getRequestHeaders)
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
        this.setState({ connectedDisplays: Array.isArray(r.data?.displays) ? r.data.displays : [], connectedDisplaysMessage: null, connectedDisplaysMessageType: null, connectedDisplaysLoading: false });
      }).catch(err => this.setState({ connectedDisplaysMessage: `${t.errorPrefix} ${err.message}`, connectedDisplaysMessageType: 'error', connectedDisplaysLoading: false }));
  }

  handleDeleteDisplay = (clientId) => {
    const t = this.getTranslations();
    if (!window.confirm(t.connectedDisplaysDeleteConfirm || 'Are you sure you want to remove this display?')) return;
    apiDeleteDisplay(this.getRequestHeaders, clientId)
      .then(r => {
        if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
        if (r.ok) { this.setState({ connectedDisplaysMessage: t.connectedDisplaysDeleteSuccess || 'Display removed successfully.', connectedDisplaysMessageType: 'success' }); this.handleLoadConnectedDisplays(); }
        else this.setState({ connectedDisplaysMessage: `${t.errorPrefix} ${r.data?.error || t.connectedDisplaysDeleteError}`, connectedDisplaysMessageType: 'error' });
      }).catch(err => this.setState({ connectedDisplaysMessage: `${t.errorPrefix} ${err.message}`, connectedDisplaysMessageType: 'error' }));
  }

  handleI18nSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { maintenanceTranslationsText, adminTranslationsText, currentMaintenanceTranslations, currentAdminTranslations, showAdvancedTranslationsEditor } = this.state;
    let mm = currentMaintenanceTranslations, at = currentAdminTranslations;
    if (showAdvancedTranslationsEditor) {
      try { mm = JSON.parse(maintenanceTranslationsText || '{}'); if (!mm || typeof mm !== 'object' || Array.isArray(mm)) throw new Error('maintenanceMessages must be an object'); at = JSON.parse(adminTranslationsText || '{}'); if (!at || typeof at !== 'object' || Array.isArray(at)) throw new Error('adminTranslations must be an object'); }
      catch (error) { this.setState({ i18nMessage: `${t.errorPrefix} ${error.message}`, i18nMessageType: 'error' }); return; }
    }
    this.saveI18nConfig(mm, at, t.translationsSuccessMessage);
  }

  // ============================================================================
  // Power Management
  // ============================================================================

  handleOpenPowerManagementModal = async (clientId) => {
    const { connectedDisplays } = this.state;
    let display = null, hasMqtt = false;
    if (clientId === '__global__') { hasMqtt = connectedDisplays.some(d => d.mqtt && d.mqtt.connected); }
    else { display = connectedDisplays.find(d => d.id === clientId); hasMqtt = display && display.mqtt && display.mqtt.connected; }
    try {
      const config = clientId === '__global__'
        ? ((await fetchPowerManagementConfig(this.getRequestHeaders, clientId)).global || { mode: 'browser', schedule: { enabled: false, startTime: '20:00', endTime: '07:00', weekendMode: false } })
        : await fetchPowerManagementConfig(this.getRequestHeaders, clientId);
      let selectedMode = config.mode || 'browser';
      if (!config.mode && hasMqtt && clientId !== '__global__') selectedMode = 'mqtt';
      let mqttHostname = config.mqttHostname || '';
      if (hasMqtt && !mqttHostname && display && display.mqtt) mqttHostname = display.mqtt.deviceId || display.mqtt.hostname || '';
      this.setState({ showPowerManagementModal: true, powerManagementClientId: clientId, powerManagementMode: selectedMode, powerManagementMqttHostname: mqttHostname, powerManagementScheduleEnabled: config.schedule?.enabled || false, powerManagementStartTime: config.schedule?.startTime || '20:00', powerManagementEndTime: config.schedule?.endTime || '07:00', powerManagementWeekendMode: config.schedule?.weekendMode || false, powerManagementMessage: null, powerManagementHasMqtt: hasMqtt });
    } catch (err) {
      console.error('Error loading power management config:', err);
      this.setState({ showPowerManagementModal: true, powerManagementClientId: clientId, powerManagementMode: hasMqtt && clientId !== '__global__' ? 'mqtt' : 'browser', powerManagementMqttHostname: display?.mqtt?.deviceId || display?.mqtt?.hostname || '', powerManagementScheduleEnabled: false, powerManagementStartTime: '20:00', powerManagementEndTime: '07:00', powerManagementWeekendMode: false, powerManagementMessage: null, powerManagementHasMqtt: hasMqtt });
    }
  }

  handleClosePowerManagementModal = () => { this.setState({ showPowerManagementModal: false, powerManagementClientId: null, powerManagementMessage: null }); }

  handleSavePowerManagement = async () => {
    const t = this.getTranslations();
    const s = this.state;
    const payload = { mode: s.powerManagementMode, schedule: { enabled: s.powerManagementScheduleEnabled, startTime: s.powerManagementStartTime, endTime: s.powerManagementEndTime, weekendMode: s.powerManagementWeekendMode } };
    if (s.powerManagementMode === 'mqtt') payload.mqttHostname = s.powerManagementMqttHostname || '';
    try {
      const r = await submitPowerManagement(this.getRequestHeaders, s.powerManagementClientId, payload);
      if (r.status === 401) { this.handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); }
      if (r.ok) { this.setState({ powerManagementMessage: t.powerManagementSaveSuccess || 'Power management configuration saved successfully.', powerManagementMessageType: 'success' }); setTimeout(() => this.handleClosePowerManagementModal(), 2000); }
      else throw new Error(r.data?.error || t.powerManagementSaveError);
    } catch (err) { this.setState({ powerManagementMessage: `${t.errorPrefix} ${err.message}`, powerManagementMessageType: 'error' }); }
  }

  // ============================================================================
  // MQTT Handlers (thin wrappers around extracted service functions)
  // ============================================================================

  loadMqttConfig = async () => {
    try { const data = await fetchMqttConfig(() => this.getRequestHeaders(false)); if (data) this.setState({ mqttEnabled: data.enabled || false, mqttBrokerUrl: data.brokerUrl || 'mqtt://localhost:1883', mqttAuthentication: data.authentication || false, mqttUsername: data.username || '', mqttPassword: data.password || '', mqttDiscovery: data.discovery || '' }); }
    catch (err) { console.error('Failed to load MQTT config:', err); }
  }

  loadMqttStatus = async () => {
    try { const data = await fetchMqttStatus(() => this.getRequestHeaders(false)); if (data) this.setState({ mqttStatus: data }); }
    catch (err) { console.error('Failed to load MQTT status:', err); }
  }

  handleLoadMqttDisplays = async (startAutoRefresh = false) => {
    this.setState({ mqttDisplaysLoading: true });
    try {
      const r = await fetchMqttDisplays(() => this.getRequestHeaders(false));
      if (r.status === 401) { this.handleUnauthorizedAccess(); return; }
      if (r.ok) {
        this.setState({ mqttDisplays: r.displays, mqttDisplaysLoading: false });
        if (startAutoRefresh && !this.mqttDisplaysInterval) {
          this.mqttDisplaysInterval = setInterval(() => { if (this.state.activeTab === 'mqtt') this.handleLoadMqttDisplays(false); }, 10000);
        }
      } else throw new Error('Failed to load MQTT displays');
    } catch (err) { console.error('Failed to load MQTT displays:', err); this.setState({ mqttDisplays: [], mqttDisplaysLoading: false }); }
  }

  handleMqttConfigSubmit = async (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    this.setState({ mqttConfigSaving: true, mqttConfigMessage: null });
    try {
      const r = await submitMqttConfig(() => this.getRequestHeaders(), { enabled: this.state.mqttEnabled || false, brokerUrl: this.state.mqttBrokerUrl || 'mqtt://localhost:1883', authentication: this.state.mqttAuthentication || false, username: this.state.mqttUsername || '', password: this.state.mqttPassword || '', discovery: this.state.mqttDiscovery || '' });
      if (r.status === 401) { this.handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); }
      if (r.ok) { this.setState({ mqttConfigMessage: t.mqttConfigUpdateSuccess || 'MQTT configuration updated successfully.', mqttConfigMessageType: 'success', mqttConfigSaving: false }); this.loadMqttStatus(); }
      else throw new Error(r.data?.error || t.mqttConfigUpdateError);
    } catch (err) { this.setState({ mqttConfigMessage: `${t.errorPrefix} ${err.message}`, mqttConfigMessageType: 'error', mqttConfigSaving: false }); }
  }

  handleMqttPowerCommand = async (hostname, powerOn) => {
    const t = this.getTranslations();
    try {
      const response = await sendMqttPowerCommand(() => this.getRequestHeaders(), hostname, powerOn);
      if (response.status === 401) { this.handleUnauthorizedAccess(); return; }
      if (response.ok) { this.setState({ mqttConfigMessage: t.mqttDisplaysPowerSuccess || 'Power command sent successfully.', mqttConfigMessageType: 'success' }); setTimeout(() => this.handleLoadMqttDisplays(), 1000); }
      else throw new Error('Failed to send power command');
    } catch (err) { console.error('Failed to send MQTT power command:', err); this.setState({ mqttConfigMessage: `${t.errorPrefix} ${t.mqttDisplaysPowerError || 'Failed to send power command.'}`, mqttConfigMessageType: 'error' }); }
  }

  handleMqttBrightnessCommand = async (hostname, brightness) => {
    try { const r = await sendMqttBrightnessCommand(() => this.getRequestHeaders(), hostname, brightness); if (r.status === 401) { this.handleUnauthorizedAccess(); return; } if (r.ok) console.log(`Brightness set to ${brightness} for ${hostname}`); }
    catch (err) { console.error('Failed to send brightness command:', err); }
  }

  handleMqttKioskCommand = async (hostname, status) => {
    try { const r = await sendMqttKioskCommand(() => this.getRequestHeaders(), hostname, status); if (r.status === 401) { this.handleUnauthorizedAccess(); return; } if (r.ok) { this.setState({ mqttConfigMessage: `Kiosk mode set to ${status}`, mqttConfigMessageType: 'success' }); setTimeout(() => this.handleLoadMqttDisplays(), 1000); } }
    catch (err) { console.error('Failed to send kiosk command:', err); }
  }

  handleMqttThemeCommand = async (hostname, theme) => {
    try { const r = await sendMqttThemeCommand(() => this.getRequestHeaders(), hostname, theme); if (r.status === 401) { this.handleUnauthorizedAccess(); return; } if (r.ok) { this.setState({ mqttConfigMessage: `Theme set to ${theme}`, mqttConfigMessageType: 'success' }); setTimeout(() => this.handleLoadMqttDisplays(), 1000); } }
    catch (err) { console.error('Failed to send theme command:', err); }
  }

  handleMqttVolumeCommand = async (hostname, volume) => {
    try { const r = await sendMqttVolumeCommand(() => this.getRequestHeaders(), hostname, volume); if (r.status === 401) { this.handleUnauthorizedAccess(); return; } if (r.ok) console.log(`Volume set to ${volume} for ${hostname}`); }
    catch (err) { console.error('Failed to send volume command:', err); }
  }

  handleMqttPageZoomCommand = async (hostname, zoom) => {
    try { const r = await sendMqttPageZoomCommand(() => this.getRequestHeaders(), hostname, zoom); if (r.status === 401) { this.handleUnauthorizedAccess(); return; } if (r.ok) console.log(`Page zoom set to ${zoom}% for ${hostname}`); }
    catch (err) { console.error('Failed to send page zoom command:', err); }
  }

  handleMqttRefreshCommand = async (hostname) => {
    try { const r = await sendMqttRefreshCommand(() => this.getRequestHeaders(), hostname); if (r.status === 401) { this.handleUnauthorizedAccess(); return; } if (r.ok) { this.setState({ connectedDisplaysMessage: `Refresh command sent to ${hostname}`, connectedDisplaysMessageType: 'success', mqttConfigMessage: 'Refresh command sent', mqttConfigMessageType: 'success' }); setTimeout(() => this.setState({ connectedDisplaysMessage: null, connectedDisplaysMessageType: null }), 3000); } }
    catch (err) { console.error('Failed to send refresh command:', err); this.setState({ connectedDisplaysMessage: `Failed to send refresh command: ${err.message}`, connectedDisplaysMessageType: 'error' }); }
  }

  handleMqttRebootCommand = async (hostname) => {
    try { const r = await sendMqttRebootCommand(() => this.getRequestHeaders(), hostname); if (r.status === 401) { this.handleUnauthorizedAccess(); return; } if (r.ok) { this.setState({ connectedDisplaysMessage: `Reboot command sent to ${hostname}`, connectedDisplaysMessageType: 'success', mqttConfigMessage: `Reboot command sent to ${hostname}`, mqttConfigMessageType: 'success' }); setTimeout(() => this.setState({ connectedDisplaysMessage: null, connectedDisplaysMessageType: null }), 3000); } }
    catch (err) { console.error('Failed to send reboot command:', err); this.setState({ connectedDisplaysMessage: `Failed to send reboot command: ${err.message}`, connectedDisplaysMessageType: 'error' }); }
  }

  handleMqttShutdownCommand = async (hostname) => {
    try { const r = await sendMqttShutdownCommand(() => this.getRequestHeaders(), hostname); if (r.status === 401) { this.handleUnauthorizedAccess(); return; } if (r.ok) this.setState({ mqttConfigMessage: `Shutdown command sent to ${hostname}`, mqttConfigMessageType: 'warning' }); }
    catch (err) { console.error('Failed to send shutdown command:', err); }
  }

  handleMqttRefreshAll = async () => {
    if (!window.confirm('Refresh all Touchkio displays?')) return;
    try { const r = await sendMqttRefreshAll(() => this.getRequestHeaders()); if (r.status === 401) { this.handleUnauthorizedAccess(); return; } if (r.ok) { this.setState({ connectedDisplaysMessage: r.data.message || 'Refresh command sent to all displays', connectedDisplaysMessageType: 'success', mqttConfigMessage: r.data.message || 'Refresh command sent to all displays', mqttConfigMessageType: 'success' }); setTimeout(() => this.setState({ connectedDisplaysMessage: null, connectedDisplaysMessageType: null }), 3000); } }
    catch (err) { console.error('Failed to send refresh all command:', err); this.setState({ connectedDisplaysMessage: `Failed to send refresh all command: ${err.message}`, connectedDisplaysMessageType: 'error' }); }
  }

  handleMqttRebootAll = async () => {
    if (!window.confirm('⚠️ Reboot ALL Touchkio displays? This will restart all devices!')) return;
    try { const r = await sendMqttRebootAll(() => this.getRequestHeaders()); if (r.status === 401) { this.handleUnauthorizedAccess(); return; } if (r.ok) { this.setState({ connectedDisplaysMessage: r.data.message || 'Reboot command sent to all displays', connectedDisplaysMessageType: 'warning', mqttConfigMessage: r.data.message || 'Reboot command sent to all displays', mqttConfigMessageType: 'warning' }); setTimeout(() => this.setState({ connectedDisplaysMessage: null, connectedDisplaysMessageType: null }), 3000); } }
    catch (err) { console.error('Failed to send reboot-all command:', err); this.setState({ connectedDisplaysMessage: `Failed to send reboot-all command: ${err.message}`, connectedDisplaysMessageType: 'error', mqttConfigMessage: 'Failed to send reboot-all command', mqttConfigMessageType: 'error' }); }
  }

  // ============================================================================
  // Touchkio Modal Handlers
  // ============================================================================

  handleOpenTouchkioModal = (display) => { this.setState({ showTouchkioModal: true, touchkioModalDisplay: display, touchkioModalMessage: null, touchkioModalMessageType: null, touchkioModalBrightness: undefined, touchkioModalVolume: undefined, touchkioModalZoom: undefined }); }
  handleCloseTouchkioModal = () => { this.setState({ showTouchkioModal: false, touchkioModalDisplay: null, touchkioModalMessage: null, touchkioModalMessageType: null, touchkioModalBrightness: undefined, touchkioModalVolume: undefined, touchkioModalZoom: undefined }); }

  handleMqttPowerCommandModal = async (identifier, powerOn) => {
    await this.handleMqttPowerCommand(identifier, powerOn);
    if (this.state.touchkioModalDisplay) { const o = { ...this.state.touchkioModalDisplay }; if (o.mqtt) o.mqtt = { ...o.mqtt, power: powerOn ? 'ON' : 'OFF' }; this.setState({ touchkioModalDisplay: o, touchkioModalMessage: `Power command sent: ${powerOn ? 'ON' : 'OFF'}`, touchkioModalMessageType: 'success' }); }
    else this.setState({ touchkioModalMessage: `Power command sent: ${powerOn ? 'ON' : 'OFF'}`, touchkioModalMessageType: 'success' });
    setTimeout(async () => { await this.handleLoadConnectedDisplays(); if (this.state.touchkioModalDisplay) { const ud = (this.state.connectedDisplays || []).find(d => d.mqtt?.deviceId === identifier || d.mqtt?.hostname === identifier); if (ud) this.setState({ touchkioModalDisplay: ud }); } }, 2000);
  }

  handleMqttBrightnessCommandModal = async (hostname, brightness) => { await this.handleMqttBrightnessCommand(hostname, brightness); this.setState({ touchkioModalMessage: `Brightness set to ${brightness}`, touchkioModalMessageType: 'success' }); }

  handleMqttKioskCommandModal = async (identifier, status) => {
    await this.handleMqttKioskCommand(identifier, status);
    if (this.state.touchkioModalDisplay) { const o = { ...this.state.touchkioModalDisplay }; if (o.mqtt) o.mqtt = { ...o.mqtt, kioskStatus: status }; this.setState({ touchkioModalDisplay: o, touchkioModalMessage: `Kiosk mode set to ${status}`, touchkioModalMessageType: 'success' }); }
    else this.setState({ touchkioModalMessage: `Kiosk mode set to ${status}`, touchkioModalMessageType: 'success' });
    setTimeout(async () => { await this.handleLoadConnectedDisplays(); if (this.state.touchkioModalDisplay) { const ud = (this.state.connectedDisplays || []).find(d => d.mqtt?.deviceId === identifier || d.mqtt?.hostname === identifier); if (ud) this.setState({ touchkioModalDisplay: ud }); } }, 2000);
  }

  handleMqttThemeCommandModal = async (identifier, theme) => {
    await this.handleMqttThemeCommand(identifier, theme);
    if (this.state.touchkioModalDisplay) { const o = { ...this.state.touchkioModalDisplay }; if (o.mqtt) o.mqtt = { ...o.mqtt, theme }; this.setState({ touchkioModalDisplay: o, touchkioModalMessage: `Theme set to ${theme}`, touchkioModalMessageType: 'success' }); }
    else this.setState({ touchkioModalMessage: `Theme set to ${theme}`, touchkioModalMessageType: 'success' });
    setTimeout(async () => { await this.handleLoadConnectedDisplays(); if (this.state.touchkioModalDisplay) { const ud = (this.state.connectedDisplays || []).find(d => d.mqtt?.deviceId === identifier || d.mqtt?.hostname === identifier); if (ud) this.setState({ touchkioModalDisplay: ud }); } }, 2000);
  }

  handleMqttVolumeCommandModal = async (hostname, volume) => { await this.handleMqttVolumeCommand(hostname, volume); this.setState({ touchkioModalMessage: `Volume set to ${volume}%`, touchkioModalMessageType: 'success' }); }
  handleMqttPageZoomCommandModal = async (hostname, zoom) => { await this.handleMqttPageZoomCommand(hostname, zoom); this.setState({ touchkioModalMessage: `Page zoom set to ${zoom}%`, touchkioModalMessageType: 'success' }); }

  handleMqttPageUrlCommandModal = async (identifier, url) => {
    try {
      const response = await sendMqttPageUrlCommand(() => this.getRequestHeaders(), identifier, url);
      if (response.ok) {
        if (this.state.touchkioModalDisplay) { const o = { ...this.state.touchkioModalDisplay }; if (o.mqtt) o.mqtt = { ...o.mqtt, pageUrl: url }; this.setState({ touchkioModalDisplay: o, touchkioModalMessage: 'Page URL updated successfully', touchkioModalMessageType: 'success' }); }
        else this.setState({ touchkioModalMessage: 'Page URL updated successfully', touchkioModalMessageType: 'success' });
        setTimeout(async () => { await this.handleLoadConnectedDisplays(); const displays = this.state.connectedDisplays || []; const ud = displays.find(d => d.mqtt?.deviceId === identifier || d.mqtt?.hostname === identifier); if (ud) this.setState({ touchkioModalDisplay: ud }); }, 2000);
      } else throw new Error('Failed to update page URL');
    } catch (err) { console.error('Failed to send page URL command:', err); this.setState({ touchkioModalMessage: 'Failed to update page URL', touchkioModalMessageType: 'error' }); }
  }

  handleMqttRefreshCommandModal = async (hostname) => { await this.handleMqttRefreshCommand(hostname); this.setState({ touchkioModalMessage: 'Refresh command sent', touchkioModalMessageType: 'success' }); }
  handleMqttRebootCommandModal = async (hostname) => { await this.handleMqttRebootCommand(hostname); this.setState({ touchkioModalMessage: 'Reboot command sent', touchkioModalMessageType: 'warning' }); }
  handleMqttShutdownCommandModal = async (hostname) => { await this.handleMqttShutdownCommand(hostname); this.setState({ touchkioModalMessage: 'Shutdown command sent', touchkioModalMessageType: 'warning' }); }

  // ============================================================================
  // Tab Navigation
  // ============================================================================

  switchTab = (tabName) => { this.setState({ activeTab: tabName, activeSection: TAB_TO_SECTION[tabName] || 'displays' }); }

  switchSection = (sectionName) => {
    const tabs = ADMIN_TAB_SECTIONS[sectionName] || [];
    const fallbackTab = tabs[0] || 'display';
    this.setState((prev) => ({ activeSection: sectionName, activeTab: tabs.includes(prev.activeTab) ? prev.activeTab : fallbackTab }));
  }

  render() {
    const {
      currentSsid, currentPassword, wifiLastUpdated,
      currentLogoDarkUrl, currentLogoLightUrl, logoLastUpdated,
      currentShowWiFi, currentShowUpcomingMeetings, currentShowMeetingTitles, currentUpcomingMeetingsCount, currentMinimalHeaderStyle, currentSingleRoomDarkMode, currentFlightboardDarkMode, informationLastUpdated,
      currentEnableBooking, currentEnableExtendMeeting, bookingLastUpdated,
      currentCheckInEnabled, currentCheckInRequiredForExternalMeetings,
      currentCheckInEarlyMinutes, currentCheckInWindowMinutes, currentCheckInAutoReleaseNoShow,
      apiToken, ssid, password, logoDarkUrl, logoLightUrl, logoDarkFile, logoLightFile, uploadMode,
      showWiFi, showUpcomingMeetings, showMeetingTitles, upcomingMeetingsCount, minimalHeaderStyle, singleRoomDarkMode, flightboardDarkMode, sidebarTargetClientId, connectedClients, connectedClientsLoading,
      enableBooking, enableExtendMeeting,
      checkInEnabled, checkInRequiredForExternalMeetings,
      checkInEarlyMinutes, checkInWindowMinutes, checkInAutoReleaseNoShow,
      currentRoomFeatureFlags, roomFeatureFlags,
      currentRoomGroupFeatureFlags, roomGroupFeatureFlags,
      newRoomOverrideKey, newRoomGroupOverrideKey,
      availableRoomOptions, availableRoomGroupOptions,
      currentMaintenanceEnabled,
      currentSystemStartupValidationStrict, systemStartupValidationStrict,
      currentSystemGraphWebhookEnabled, systemGraphWebhookEnabled,
      currentSystemGraphWebhookClientState, systemGraphWebhookClientState,
      currentSystemGraphWebhookAllowedIps, systemGraphWebhookAllowedIps,
      currentSystemExposeDetailedErrors, systemExposeDetailedErrors,
      currentSystemGraphFetchTimeoutMs, systemGraphFetchTimeoutMs,
      currentSystemGraphFetchRetryAttempts, systemGraphFetchRetryAttempts,
      currentSystemGraphFetchRetryBaseMs, systemGraphFetchRetryBaseMs,
      currentSystemHstsMaxAge, systemHstsMaxAge,
      currentSystemRateLimitMaxBuckets, systemRateLimitMaxBuckets,
      currentSystemDisplayTrackingMode,
      currentSystemDisplayTrackingRetentionHours,
      currentSystemDisplayTrackingCleanupMinutes,
      currentSystemDisplayIpWhitelistEnabled,
      currentSystemDisplayIpWhitelist,
      currentSystemTrustReverseProxy,
      currentDemoMode, demoMode, systemLastUpdated,
      currentTranslationApiEnabled, translationApiEnabled,
      currentTranslationApiUrl, translationApiUrl,
      currentTranslationApiTimeoutMs, translationApiTimeoutMs,
      currentTranslationApiHasApiKey, translationApiApiKey, translationApiLastUpdated,
      currentOauthClientId, oauthClientId,
      currentOauthAuthority, oauthAuthority,
      currentOauthHasClientSecret, oauthClientSecret, oauthLastUpdated,
      currentSearchUseGraphAPI, currentSearchMaxDays, currentSearchMaxRoomLists, currentSearchMaxRooms, currentSearchMaxItems, currentSearchPollIntervalMs, searchLastUpdated,
      searchUseGraphAPI, searchMaxDays, searchMaxRoomLists, searchMaxRooms, searchMaxItems, searchPollIntervalMs,
      currentRateLimitApiWindowMs, currentRateLimitApiMax, currentRateLimitWriteWindowMs, currentRateLimitWriteMax, currentRateLimitAuthWindowMs, currentRateLimitAuthMax, rateLimitLastUpdated,
      rateLimitApiWindowMs, rateLimitApiMax, rateLimitWriteWindowMs, rateLimitWriteMax, rateLimitAuthWindowMs, rateLimitAuthMax,
      maintenanceMessageBanner, maintenanceMessageType,
      requiresInitialTokenSetup, initialTokenSetupLockedByEnv,
      i18nLastUpdated, currentMaintenanceTranslations, maintenanceTranslationsText, currentAdminTranslations, adminTranslationsText, translationLanguage, newTranslationLanguageCode, translationLanguageDraftError, collapsedTranslationGroups, showAdvancedTranslationsEditor, i18nMessage, i18nMessageType,
      backupPayloadText, backupMessage, backupMessageType,
      auditLogs, auditMessage, auditMessageType,
      connectedDisplays, connectedDisplaysMessage, connectedDisplaysMessageType, connectedDisplaysLoading,
      showPowerManagementModal, powerManagementClientId, powerManagementMode,
      powerManagementScheduleEnabled, powerManagementStartTime, powerManagementEndTime,
      powerManagementWeekendMode, powerManagementMessage, powerManagementMessageType,
      apiTokenConfigMessage, apiTokenConfigMessageType,
      currentApiTokenSource, currentApiTokenIsDefault, apiTokenConfigLastUpdated,
      newApiToken, newApiTokenConfirm,
      wifiApiTokenConfigMessage, wifiApiTokenConfigMessageType,
      currentWifiApiTokenSource, currentWifiApiTokenConfigured, wifiApiTokenConfigLastUpdated,
      newWifiApiToken, newWifiApiTokenConfirm,
      bookingButtonColor, currentBookingButtonColor,
      statusAvailableColor, currentStatusAvailableColor,
      statusBusyColor, currentStatusBusyColor,
      statusUpcomingColor, currentStatusUpcomingColor,
      statusNotFoundColor, currentStatusNotFoundColor,
      wifiMessage, wifiMessageType, logoMessage, logoMessageType, informationMessage, informationMessageType,
      bookingMessage, bookingMessageType, colorMessage, colorMessageType,
      systemMessage, systemMessageType, translationApiMessage, translationApiMessageType, oauthMessage, oauthMessageType, searchMessage, searchMessageType, rateLimitMessage, rateLimitMessageType,
      graphRuntimeMessage, graphRuntimeMessageType,
      wifiLocked, logoLocked, informationLocked, bookingLocked, searchLocked, rateLimitLocked, apiTokenLocked, wifiApiTokenLocked, oauthLocked, systemLocked, maintenanceLocked, translationApiLocked,
      isAuthenticated, authChecking, authMessage, authMessageType,
      bookingPermissionMissing, activeTab, activeSection,
      syncStatus, syncStatusLoading, syncStatusTick
    } = this.state;
    const t = this.getTranslations();
    const booleanLabel = (value) => (value ? (t.yesLabel || 'Yes') : (t.noLabel || 'No'));
    const availableTranslationLanguages = this.getAvailableTranslationLanguages();
    const normalizedSelectedLanguage = String(translationLanguage || '').trim().toLowerCase();
    const activeTranslationLanguage = availableTranslationLanguages.includes(normalizedSelectedLanguage) ? normalizedSelectedLanguage : (availableTranslationLanguages[0] || 'en');
    const selectedMaintenanceTranslation = currentMaintenanceTranslations?.[activeTranslationLanguage] || {};
    const selectedAdminTranslation = { ...(defaultAdminTranslations.en || {}), ...(defaultAdminTranslations[activeTranslationLanguage] || {}), ...(currentAdminTranslations?.[activeTranslationLanguage] || {}) };
    const roomOverrideEntries = Object.entries(roomFeatureFlags || {}).sort(([a], [b]) => a.localeCompare(b));
    const roomGroupOverrideEntries = Object.entries(roomGroupFeatureFlags || {}).sort(([a], [b]) => a.localeCompare(b));
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
              <img src={currentLogoLightUrl || "/img/logo-admin.svg"} alt="Logo" onError={(e) => { if (!e.target.src.includes('logo-admin.svg')) e.target.src = "/img/logo-admin.svg"; }} />
            </div>
            <div className="admin-flex-1">
              <h1>{t.title}</h1>
              {this.state.appVersion && <div className="admin-version">Version {this.state.appVersion}</div>}
            </div>
          </div>
        </div>

        <div className="admin-container">
          {!isAuthenticated && (
            <div className="admin-token-banner admin-mb-2">
              <div className="admin-token-content">
                <form onSubmit={this.handleAdminLogin} className="token-input-wrapper">
                  <label htmlFor="apiToken">{t.apiTokenLabel}</label>
                  <input type="password" id="apiToken" value={apiToken} onChange={(e) => this.setState({ apiToken: e.target.value })} placeholder={t.apiTokenPlaceholder} autoComplete="off" disabled={authChecking} />
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
          {isAuthenticated && <div className="admin-flex-end"><button type="button" className="admin-submit-button" onClick={this.handleAdminLogout}>Logout</button></div>}

          {!isAuthenticated ? null : (
            <>
          {syncStatus && !syncStatusLoading && (
            <div className={`admin-message admin-mb-2 ${(() => { const lst = syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime) : null; const sss = lst ? Math.floor((syncStatusTick - lst.getTime()) / 1000) : null; const stale = sss !== null && sss > 180; return stale || !syncStatus.lastSyncSuccess ? 'admin-message-warning' : 'admin-message-success'; })()}`}>
              <strong>{t.syncStatusTitle}:</strong> {' '}
              {syncStatus.hasNeverSynced ? <span>{t.syncStatusNever}</span> : (
                <>
                  {t.syncStatusLastSync} {' '}
                  {(() => { const lst = syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime) : null; const sss = lst ? Math.floor((syncStatusTick - lst.getTime()) / 1000) : syncStatus.secondsSinceSync; return sss !== null ? <span>{lang === 'de' ? `${t.syncStatusMinutesAgo} ${sss} ${t.syncStatusMinutes}` : `${sss} ${t.syncStatusMinutes} ${t.syncStatusMinutesAgo}`}</span> : null; })()} {' - '}
                  {syncStatus.lastSyncSuccess ? <span>{t.syncStatusSuccess}</span> : <span>{t.syncStatusFailed}</span>}
                  {(() => { const lst = syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime) : null; const sss = lst ? Math.floor((syncStatusTick - lst.getTime()) / 1000) : null; return sss !== null && sss > 180 ? <span> - {t.syncStatusStale}</span> : null; })()}
                  {syncStatus.syncErrorMessage && <div className="admin-mt-05">{t.syncStatusError} {syncStatus.syncErrorMessage}</div>}
                </>
              )}
            </div>
          )}

          {isAuthenticated && currentMaintenanceEnabled && (
            <div className="admin-message admin-message-warning admin-mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
              <span style={{ fontSize: '1.2em' }}>⚠️</span>
              <span>{t.maintenanceBannerText || 'Maintenance mode is active. Some write operations may be blocked.'}</span>
            </div>
          )}

          <div className="admin-section-tabs">
            {sectionDefinitions.map(section => <button key={section.key} className={`admin-section-tab ${activeSection === section.key ? 'active' : ''}`} onClick={() => this.switchSection(section.key)}>{section.label}</button>)}
          </div>

          {visibleTabs.length > 1 && (
            <div className="admin-tabs admin-submenu-tabs">
              {visibleTabs.map(tab => <button key={tab.key} className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => this.switchTab(tab.key)}>{tab.label}</button>)}
            </div>
          )}

          <DisplayTab isActive={activeTab === 'display'} informationLocked={informationLocked} t={t}
            currentShowWiFi={currentShowWiFi} currentShowUpcomingMeetings={currentShowUpcomingMeetings} currentShowMeetingTitles={currentShowMeetingTitles}
            currentUpcomingMeetingsCount={currentUpcomingMeetingsCount} currentMinimalHeaderStyle={currentMinimalHeaderStyle}
            currentSingleRoomDarkMode={currentSingleRoomDarkMode} currentFlightboardDarkMode={currentFlightboardDarkMode} informationLastUpdated={informationLastUpdated}
            sidebarTargetClientId={sidebarTargetClientId} connectedClients={connectedClients} connectedClientsLoading={connectedClientsLoading}
            showWiFi={showWiFi} showUpcomingMeetings={showUpcomingMeetings} showMeetingTitles={showMeetingTitles}
            upcomingMeetingsCount={upcomingMeetingsCount} minimalHeaderStyle={minimalHeaderStyle}
            singleRoomDarkMode={singleRoomDarkMode} flightboardDarkMode={flightboardDarkMode}
            informationMessage={informationMessage} informationMessageType={informationMessageType} booleanLabel={booleanLabel}
            onTargetClientChange={(e) => {
              const nextTargetClientId = e.target.value;
              this.setState({ sidebarTargetClientId: nextTargetClientId }, () => {
                if (nextTargetClientId) {
                  loadSidebarConfig(nextTargetClientId).then(r => { if (r.ok) this.setState({ singleRoomDarkMode: r.data.singleRoomDarkMode !== undefined ? !!r.data.singleRoomDarkMode : this.state.currentSingleRoomDarkMode }); }).catch(err => console.error('Error loading selected client sidebar config:', err));
                } else { this.setState({ singleRoomDarkMode: this.state.currentSingleRoomDarkMode }); }
              });
            }}
            onFieldChange={(key, value) => this.setState({ [key]: value })} onSubmit={this.handleSidebarSubmit} />

          <WiFiTab isActive={activeTab === 'wifi'} wifiLocked={wifiLocked} t={t}
            currentSsid={currentSsid} currentPassword={currentPassword} wifiLastUpdated={wifiLastUpdated}
            ssid={ssid} password={password} wifiMessage={wifiMessage} wifiMessageType={wifiMessageType}
            onFieldChange={(key, value) => this.setState({ [key]: value })} onSubmit={this.handleWiFiSubmit} />

          <LogoTab isActive={activeTab === 'logo'} logoLocked={logoLocked} t={t}
            currentLogoDarkUrl={currentLogoDarkUrl} currentLogoLightUrl={currentLogoLightUrl} logoLastUpdated={logoLastUpdated}
            uploadMode={uploadMode} logoDarkUrl={logoDarkUrl} logoLightUrl={logoLightUrl}
            logoDarkFile={logoDarkFile} logoLightFile={logoLightFile} logoMessage={logoMessage} logoMessageType={logoMessageType}
            onUploadModeChange={(mode) => this.setState({ uploadMode: mode, logoDarkFile: null, logoLightFile: null })}
            onFieldChange={(key, value) => this.setState({ [key]: value })} onFileChange={(key, file) => this.setState({ [key]: file })} onSubmit={this.handleLogoSubmit} />

          <BookingTab isActive={activeTab === 'booking'} bookingLocked={bookingLocked} t={t}
            bookingPermissionMissing={bookingPermissionMissing}
            currentEnableBooking={currentEnableBooking} currentEnableExtendMeeting={currentEnableExtendMeeting}
            currentCheckInEnabled={currentCheckInEnabled} currentCheckInRequiredForExternalMeetings={currentCheckInRequiredForExternalMeetings}
            currentCheckInEarlyMinutes={currentCheckInEarlyMinutes} currentCheckInWindowMinutes={currentCheckInWindowMinutes}
            currentCheckInAutoReleaseNoShow={currentCheckInAutoReleaseNoShow} bookingLastUpdated={bookingLastUpdated}
            currentRoomFeatureFlags={currentRoomFeatureFlags} currentRoomGroupFeatureFlags={currentRoomGroupFeatureFlags}
            enableBooking={enableBooking} enableExtendMeeting={enableExtendMeeting}
            checkInEnabled={checkInEnabled} checkInRequiredForExternalMeetings={checkInRequiredForExternalMeetings}
            checkInEarlyMinutes={checkInEarlyMinutes} checkInWindowMinutes={checkInWindowMinutes} checkInAutoReleaseNoShow={checkInAutoReleaseNoShow}
            roomFeatureFlags={roomFeatureFlags} roomGroupFeatureFlags={roomGroupFeatureFlags}
            availableRoomGroupOptions={availableRoomGroupOptions} newRoomGroupOverrideKey={newRoomGroupOverrideKey}
            roomGroupOverrideEntries={roomGroupOverrideEntries}
            availableRoomOptions={availableRoomOptions} newRoomOverrideKey={newRoomOverrideKey} roomOverrideEntries={roomOverrideEntries}
            bookingMessage={bookingMessage} bookingMessageType={bookingMessageType} booleanLabel={booleanLabel} toOverrideState={toOverrideState}
            onFieldChange={(key, value) => this.setState({ [key]: value })}
            onOverrideDraftChange={(type, value) => this.handleOverrideDraftChange(type, value)}
            onAddOverride={(type) => this.handleAddOverride(type)}
            onOverrideStateChange={(type, key, field, value) => this.handleOverrideStateChange(type, key, field, value)}
            onRemoveOverride={(type, key) => this.handleRemoveOverride(type, key)} onSubmit={this.handleBookingSubmit} />

          <TranslationsTab isActive={activeTab === 'translations'} t={t}
            availableTranslationLanguages={availableTranslationLanguages} activeTranslationLanguage={activeTranslationLanguage}
            currentTranslationApiHasApiKey={currentTranslationApiHasApiKey}
            newTranslationLanguageCode={newTranslationLanguageCode} translationLanguageDraftError={translationLanguageDraftError}
            i18nMessage={i18nMessage} i18nMessageType={i18nMessageType}
            currentMaintenanceTranslations={currentMaintenanceTranslations} currentAdminTranslations={currentAdminTranslations}
            i18nLastUpdated={i18nLastUpdated} collapsedTranslationGroups={collapsedTranslationGroups}
            selectedMaintenanceTranslation={selectedMaintenanceTranslation} selectedAdminTranslation={selectedAdminTranslation}
            showAdvancedTranslationsEditor={showAdvancedTranslationsEditor}
            maintenanceTranslationsText={maintenanceTranslationsText} adminTranslationsText={adminTranslationsText}
            quickAdminTranslationGroups={QUICK_ADMIN_TRANSLATION_GROUPS} getLanguageDisplayName={getLanguageDisplayName}
            onTranslationLanguageChange={this.handleTranslationLanguageChange}
            onNewTranslationLanguageChange={this.handleNewTranslationLanguageChange}
            onAddTranslationLanguage={this.handleAddTranslationLanguage}
            onRemoveTranslationLanguage={this.handleRemoveTranslationLanguage}
            onToggleTranslationGroup={this.toggleTranslationGroup}
            onMaintenanceTranslationFieldChange={this.handleMaintenanceTranslationFieldChange}
            onAdminTranslationFieldChange={this.handleAdminTranslationFieldChange}
            onShowAdvancedEditorChange={(checked) => this.setState({ showAdvancedTranslationsEditor: checked })}
            onMaintenanceTranslationsTextChange={(value) => this.setState({ maintenanceTranslationsText: value })}
            onAdminTranslationsTextChange={(value) => this.setState({ adminTranslationsText: value })}
            onSubmit={this.handleI18nSubmit} />

          <ColorsTab isActive={activeTab === 'colors'} t={t}
            currentBookingButtonColor={currentBookingButtonColor} currentStatusAvailableColor={currentStatusAvailableColor}
            currentStatusBusyColor={currentStatusBusyColor} currentStatusUpcomingColor={currentStatusUpcomingColor}
            currentStatusNotFoundColor={currentStatusNotFoundColor}
            bookingButtonColor={bookingButtonColor} statusAvailableColor={statusAvailableColor}
            statusBusyColor={statusBusyColor} statusUpcomingColor={statusUpcomingColor} statusNotFoundColor={statusNotFoundColor}
            colorMessage={colorMessage} colorMessageType={colorMessageType}
            hexToHSL={hexToHSL} hslToHex={hslToHex}
            onColorChange={(key, value) => this.setState({ [key]: value })}
            onResetColor={(key, defaultValue) => this.setState({ [key]: defaultValue })} onSubmit={this.handleColorsSubmit} />

          <SystemTab isActive={activeTab === 'system'} systemLocked={systemLocked}
            currentSystemStartupValidationStrict={currentSystemStartupValidationStrict}
            currentSystemExposeDetailedErrors={currentSystemExposeDetailedErrors}
            currentSystemHstsMaxAge={currentSystemHstsMaxAge} currentSystemRateLimitMaxBuckets={currentSystemRateLimitMaxBuckets}
            currentSystemDisplayTrackingMode={currentSystemDisplayTrackingMode}
            currentSystemDisplayTrackingRetentionHours={currentSystemDisplayTrackingRetentionHours}
            currentSystemDisplayTrackingCleanupMinutes={currentSystemDisplayTrackingCleanupMinutes}
            systemLastUpdated={systemLastUpdated}
            systemStartupValidationStrict={systemStartupValidationStrict} systemExposeDetailedErrors={systemExposeDetailedErrors}
            systemHstsMaxAge={systemHstsMaxAge} systemRateLimitMaxBuckets={systemRateLimitMaxBuckets}
            demoMode={demoMode} currentDemoMode={currentDemoMode}
            systemMessage={systemMessage} systemMessageType={systemMessageType} t={t} booleanLabel={booleanLabel}
            onStartupValidationChange={(checked) => this.setState({ systemStartupValidationStrict: checked })}
            onExposeErrorsChange={(checked) => this.setState({ systemExposeDetailedErrors: checked })}
            onHstsMaxAgeChange={(value) => this.setState({ systemHstsMaxAge: value })}
            onRateLimitMaxBucketsChange={(value) => this.setState({ systemRateLimitMaxBuckets: value })}
            onSubmit={this.handleSystemSubmit} />

          <TranslationApiTab isActive={activeTab === 'translationApi'} translationApiLocked={translationApiLocked}
            currentTranslationApiEnabled={currentTranslationApiEnabled} currentTranslationApiUrl={currentTranslationApiUrl}
            currentTranslationApiHasApiKey={currentTranslationApiHasApiKey} currentTranslationApiTimeoutMs={currentTranslationApiTimeoutMs}
            translationApiLastUpdated={translationApiLastUpdated}
            translationApiEnabled={translationApiEnabled} translationApiUrl={translationApiUrl}
            translationApiApiKey={translationApiApiKey} translationApiTimeoutMs={translationApiTimeoutMs}
            translationApiMessage={translationApiMessage} translationApiMessageType={translationApiMessageType}
            t={t} booleanLabel={booleanLabel}
            onEnabledChange={(checked) => this.setState({ translationApiEnabled: checked })}
            onUrlChange={(value) => this.setState({ translationApiUrl: value })}
            onApiKeyChange={(value) => this.setState({ translationApiApiKey: value })}
            onTimeoutChange={(value) => this.setState({ translationApiTimeoutMs: value })}
            onSubmit={this.handleTranslationApiSubmit} />

          <OAuthTab isActive={activeTab === 'oauth'} oauthLocked={oauthLocked} systemLocked={systemLocked} t={t}
            currentOauthClientId={currentOauthClientId} currentOauthAuthority={currentOauthAuthority}
            currentOauthHasClientSecret={currentOauthHasClientSecret} oauthLastUpdated={oauthLastUpdated}
            oauthClientId={oauthClientId} oauthAuthority={oauthAuthority} oauthClientSecret={oauthClientSecret}
            oauthMessage={oauthMessage} oauthMessageType={oauthMessageType}
            currentSystemGraphWebhookEnabled={currentSystemGraphWebhookEnabled}
            currentSystemGraphWebhookClientState={currentSystemGraphWebhookClientState}
            currentSystemGraphWebhookAllowedIps={currentSystemGraphWebhookAllowedIps}
            currentSystemGraphFetchTimeoutMs={currentSystemGraphFetchTimeoutMs}
            currentSystemGraphFetchRetryAttempts={currentSystemGraphFetchRetryAttempts}
            currentSystemGraphFetchRetryBaseMs={currentSystemGraphFetchRetryBaseMs}
            systemLastUpdated={systemLastUpdated}
            systemGraphWebhookEnabled={systemGraphWebhookEnabled} systemGraphWebhookClientState={systemGraphWebhookClientState}
            systemGraphWebhookAllowedIps={systemGraphWebhookAllowedIps}
            systemGraphFetchTimeoutMs={systemGraphFetchTimeoutMs} systemGraphFetchRetryAttempts={systemGraphFetchRetryAttempts}
            systemGraphFetchRetryBaseMs={systemGraphFetchRetryBaseMs}
            graphRuntimeMessage={graphRuntimeMessage} graphRuntimeMessageType={graphRuntimeMessageType} booleanLabel={booleanLabel}
            onOAuthChange={(key, value) => this.setState({ [key]: value, oauthFormDirty: true })} onOAuthSubmit={this.handleOAuthSubmit}
            onGraphRuntimeChange={(key, value) => this.setState({ [key]: value })} onGraphRuntimeSubmit={this.handleGraphRuntimeSubmit}
            certificateInfo={this.state.certificateInfo} certificateLoading={this.state.certificateLoading}
            certificateMessage={this.state.certificateMessage} certificateMessageType={this.state.certificateMessageType}
            onGenerateCertificate={this.handleGenerateCertificate} onDownloadCertificate={this.handleDownloadCertificate} onDeleteCertificate={this.handleDeleteCertificate} />

          <MaintenanceTab isActive={activeTab === 'maintenance'} maintenanceLocked={maintenanceLocked}
            currentMaintenanceEnabled={currentMaintenanceEnabled} currentMaintenanceMessage={this.state.currentMaintenanceMessage}
            maintenanceLastUpdated={this.state.maintenanceLastUpdated}
            maintenanceEnabled={this.state.maintenanceEnabled} maintenanceMessage={this.state.maintenanceMessage}
            maintenanceMessageBanner={maintenanceMessageBanner} maintenanceMessageType={maintenanceMessageType}
            t={t} booleanLabel={booleanLabel}
            onEnabledChange={(checked) => this.setState({ maintenanceEnabled: checked })}
            onMessageChange={(value) => this.setState({ maintenanceMessage: value })} onSubmit={this.handleMaintenanceSubmit} />

          <ApiTokenTab isActive={activeTab === 'apiToken'} apiTokenLocked={apiTokenLocked} wifiApiTokenLocked={wifiApiTokenLocked} t={t}
            apiTokenSourceLabelMap={apiTokenSourceLabelMap}
            currentApiTokenSource={currentApiTokenSource} currentApiTokenIsDefault={currentApiTokenIsDefault} apiTokenConfigLastUpdated={apiTokenConfigLastUpdated}
            currentWifiApiTokenSource={currentWifiApiTokenSource} currentWifiApiTokenConfigured={currentWifiApiTokenConfigured} wifiApiTokenConfigLastUpdated={wifiApiTokenConfigLastUpdated}
            newApiToken={newApiToken} newApiTokenConfirm={newApiTokenConfirm}
            newWifiApiToken={newWifiApiToken} newWifiApiTokenConfirm={newWifiApiTokenConfirm}
            apiTokenConfigMessage={apiTokenConfigMessage} apiTokenConfigMessageType={apiTokenConfigMessageType}
            wifiApiTokenConfigMessage={wifiApiTokenConfigMessage} wifiApiTokenConfigMessageType={wifiApiTokenConfigMessageType}
            booleanLabel={booleanLabel}
            onApiTokenChange={(key, value) => this.setState({ [key]: value })} onApiTokenSubmit={this.handleApiTokenSubmit}
            onWifiApiTokenChange={(key, value) => this.setState({ [key]: value })} onWifiApiTokenSubmit={this.handleWiFiApiTokenSubmit} />

          <SearchTab isActive={activeTab === 'search'} searchLocked={searchLocked} t={t}
            currentSearchUseGraphAPI={currentSearchUseGraphAPI} currentSearchMaxDays={currentSearchMaxDays}
            currentSearchMaxRoomLists={currentSearchMaxRoomLists} currentSearchMaxRooms={currentSearchMaxRooms}
            currentSearchMaxItems={currentSearchMaxItems} currentSearchPollIntervalMs={currentSearchPollIntervalMs} searchLastUpdated={searchLastUpdated}
            searchUseGraphAPI={searchUseGraphAPI} searchMaxDays={searchMaxDays} searchMaxRoomLists={searchMaxRoomLists}
            searchMaxRooms={searchMaxRooms} searchMaxItems={searchMaxItems} searchPollIntervalMs={searchPollIntervalMs}
            searchMessage={searchMessage} searchMessageType={searchMessageType} booleanLabel={booleanLabel}
            onSearchChange={(key, value) => this.setState({ [key]: value })} onSearchSubmit={this.handleSearchSubmit} />

          <RateLimitTab isActive={activeTab === 'ratelimit'} rateLimitLocked={rateLimitLocked} t={t}
            currentRateLimitApiWindowMs={currentRateLimitApiWindowMs} currentRateLimitApiMax={currentRateLimitApiMax}
            currentRateLimitWriteWindowMs={currentRateLimitWriteWindowMs} currentRateLimitWriteMax={currentRateLimitWriteMax}
            currentRateLimitAuthWindowMs={currentRateLimitAuthWindowMs} currentRateLimitAuthMax={currentRateLimitAuthMax} rateLimitLastUpdated={rateLimitLastUpdated}
            rateLimitApiWindowMs={rateLimitApiWindowMs} rateLimitApiMax={rateLimitApiMax}
            rateLimitWriteWindowMs={rateLimitWriteWindowMs} rateLimitWriteMax={rateLimitWriteMax}
            rateLimitAuthWindowMs={rateLimitAuthWindowMs} rateLimitAuthMax={rateLimitAuthMax}
            rateLimitMessage={rateLimitMessage} rateLimitMessageType={rateLimitMessageType}
            onRateLimitChange={(key, value) => this.setState({ [key]: value })} onRateLimitSubmit={this.handleRateLimitSubmit} />

          <BackupTab isActive={activeTab === 'backup'} backupPayloadText={backupPayloadText}
            backupMessage={backupMessage} backupMessageType={backupMessageType} t={t}
            onPayloadChange={(value) => this.setState({ backupPayloadText: value })}
            onExport={this.handleExportBackup} onImport={this.handleImportBackup} />

          <AuditTab isActive={activeTab === 'audit'} auditLogs={auditLogs}
            auditMessage={auditMessage} auditMessageType={auditMessageType} t={t} onLoadLogs={this.handleLoadAuditLogs} />

          <MqttTab isActive={activeTab === 'mqtt'}
            mqttEnabled={this.state.mqttEnabled} mqttBrokerUrl={this.state.mqttBrokerUrl}
            mqttAuthentication={this.state.mqttAuthentication} mqttUsername={this.state.mqttUsername}
            mqttPassword={this.state.mqttPassword} mqttDiscovery={this.state.mqttDiscovery}
            mqttConfigSaving={this.state.mqttConfigSaving} mqttConfigMessage={this.state.mqttConfigMessage}
            mqttConfigMessageType={this.state.mqttConfigMessageType} mqttStatus={this.state.mqttStatus} t={t}
            onEnabledChange={(checked) => this.setState({ mqttEnabled: checked })}
            onBrokerUrlChange={(value) => this.setState({ mqttBrokerUrl: value })}
            onAuthenticationChange={(checked) => this.setState({ mqttAuthentication: checked })}
            onUsernameChange={(value) => this.setState({ mqttUsername: value })}
            onPasswordChange={(value) => this.setState({ mqttPassword: value })}
            onDiscoveryChange={(value) => this.setState({ mqttDiscovery: value })}
            onSubmit={this.handleMqttConfigSubmit} />

          <DevicesTab isActive={activeTab === 'connectedDisplays'}
            connectedDisplays={connectedDisplays} connectedDisplaysLoading={connectedDisplaysLoading}
            connectedDisplaysMessage={connectedDisplaysMessage} connectedDisplaysMessageType={connectedDisplaysMessageType}
            systemDisplayTrackingMode={this.state.systemDisplayTrackingMode} currentSystemDisplayTrackingMode={currentSystemDisplayTrackingMode}
            systemDisplayTrackingRetentionHours={this.state.systemDisplayTrackingRetentionHours} currentSystemDisplayTrackingRetentionHours={currentSystemDisplayTrackingRetentionHours}
            systemDisplayTrackingCleanupMinutes={this.state.systemDisplayTrackingCleanupMinutes} currentSystemDisplayTrackingCleanupMinutes={currentSystemDisplayTrackingCleanupMinutes}
            systemDisplayIpWhitelistEnabled={this.state.systemDisplayIpWhitelistEnabled} currentSystemDisplayIpWhitelistEnabled={currentSystemDisplayIpWhitelistEnabled}
            systemDisplayIpWhitelist={this.state.systemDisplayIpWhitelist} currentSystemDisplayIpWhitelist={currentSystemDisplayIpWhitelist}
            systemTrustReverseProxy={this.state.systemTrustReverseProxy} currentSystemTrustReverseProxy={currentSystemTrustReverseProxy}
            systemMessage={systemMessage} systemMessageType={systemMessageType} t={t}
            onLoadDisplays={this.handleLoadConnectedDisplays}
            onOpenPowerManagement={(clientId) => this.handleOpenPowerManagementModal(clientId)}
            onOpenTouchkioModal={this.handleOpenTouchkioModal}
            onMqttRefresh={this.handleMqttRefreshCommand} onMqttRefreshAll={this.handleMqttRefreshAll} onMqttRebootAll={this.handleMqttRebootAll}
            onDeleteDisplay={this.handleDeleteDisplay}
            onTrackingModeChange={(value) => this.setState({ systemDisplayTrackingMode: value })}
            onRetentionHoursChange={(value) => this.setState({ systemDisplayTrackingRetentionHours: value })}
            onCleanupMinutesChange={(value) => this.setState({ systemDisplayTrackingCleanupMinutes: value })}
            onIpWhitelistEnabledChange={(checked) => this.setState({ systemDisplayIpWhitelistEnabled: checked })}
            onIpWhitelistChange={(value) => this.setState({ systemDisplayIpWhitelist: value })}
            onTrustReverseProxyChange={(checked) => this.setState({ systemTrustReverseProxy: checked })}
            onSaveSettings={this.handleSystemSubmit} />

          <PowerManagementModal show={showPowerManagementModal} clientId={powerManagementClientId} mode={powerManagementMode}
            mqttHostname={this.state.powerManagementMqttHostname || ''} hasMqtt={this.state.powerManagementHasMqtt || false}
            scheduleEnabled={powerManagementScheduleEnabled} startTime={powerManagementStartTime} endTime={powerManagementEndTime}
            weekendMode={powerManagementWeekendMode} message={powerManagementMessage} messageType={powerManagementMessageType}
            onClose={this.handleClosePowerManagementModal} onSave={this.handleSavePowerManagement}
            onModeChange={(value) => this.setState({ powerManagementMode: value })}
            onMqttHostnameChange={(value) => this.setState({ powerManagementMqttHostname: value })}
            onScheduleEnabledChange={(value) => this.setState({ powerManagementScheduleEnabled: value })}
            onStartTimeChange={(value) => this.setState({ powerManagementStartTime: value })}
            onEndTimeChange={(value) => this.setState({ powerManagementEndTime: value })}
            onWeekendModeChange={(value) => this.setState({ powerManagementWeekendMode: value })} />

          <TouchkioModal show={this.state.showTouchkioModal} display={this.state.touchkioModalDisplay}
            getRequestHeaders={this.getRequestHeaders}
            message={this.state.touchkioModalMessage} messageType={this.state.touchkioModalMessageType}
            brightness={this.state.touchkioModalBrightness} volume={this.state.touchkioModalVolume} zoom={this.state.touchkioModalZoom}
            onClose={this.handleCloseTouchkioModal}
            onBrightnessChange={(value, apply) => {
              this.setState({ touchkioModalBrightness: value });
              if (apply) { const id = this.state.touchkioModalDisplay.mqtt?.deviceId || this.state.touchkioModalDisplay.mqtt?.hostname || this.state.touchkioModalDisplay.hostname; this.handleMqttBrightnessCommandModal(id, value); }
            }}
            onVolumeChange={(value, apply) => {
              this.setState({ touchkioModalVolume: value });
              if (apply) { const id = this.state.touchkioModalDisplay.mqtt?.deviceId || this.state.touchkioModalDisplay.mqtt?.hostname || this.state.touchkioModalDisplay.hostname; this.handleMqttVolumeCommandModal(id, value); }
            }}
            onZoomChange={(value, apply) => {
              this.setState({ touchkioModalZoom: value });
              if (apply) { const id = this.state.touchkioModalDisplay.mqtt?.deviceId || this.state.touchkioModalDisplay.mqtt?.hostname || this.state.touchkioModalDisplay.hostname; this.handleMqttPageZoomCommandModal(id, value); }
            }}
            onPowerCommand={this.handleMqttPowerCommandModal} onRefreshCommand={this.handleMqttRefreshCommandModal}
            onKioskCommand={this.handleMqttKioskCommandModal} onThemeCommand={this.handleMqttThemeCommandModal}
            onRebootCommand={this.handleMqttRebootCommandModal} onShutdownCommand={this.handleMqttShutdownCommandModal}
            onPageUrlChange={this.handleMqttPageUrlCommandModal}
            onRefreshDisplay={async () => {
              await this.handleLoadConnectedDisplays();
              if (this.state.touchkioModalDisplay) {
                const deviceId = this.state.touchkioModalDisplay.mqtt?.deviceId;
                const hostname = this.state.touchkioModalDisplay.mqtt?.hostname || this.state.touchkioModalDisplay.hostname;
                const ud = this.state.connectedDisplays.find(d => (deviceId && d.mqtt?.deviceId === deviceId) || d.mqtt?.hostname === hostname || d.hostname === hostname);
                if (ud) this.setState({ touchkioModalDisplay: ud });
              }
            }} />
          </>
          )}
        </div>
      </div>
    );
  }
}

export default Admin;
