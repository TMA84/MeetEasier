import React, { Component } from 'react';
import io from 'socket.io-client';
import defaultAdminTranslations, { getAdminTranslations } from '../../config/adminTranslations.js';
import PowerManagementModal from './modals/PowerManagementModal.js';
import TouchkioModal from './modals/TouchkioModal.js';
import DevicesTab from './tabs/DevicesTab.js';
import MqttTab from './tabs/MqttTab.js';
import AuditTab from './tabs/AuditTab.js';
import BackupTab from './tabs/BackupTab.js';
import SystemTab from './tabs/SystemTab.js';
import TranslationApiTab from './tabs/TranslationApiTab.js';
import MaintenanceTab from './tabs/MaintenanceTab.js';

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
      'displayNavbarTitleLabel',
      'displayFilterAllRoomsLabel',
      'displayStatusAvailableLabel',
      'displayStatusBusyLabel',
      'displayStatusUpcomingLabel',
      'displayUpcomingTitleLabel',
      'displayUpcomingMeetingsTitleLabel',
      'displayNoUpcomingMeetingsLabel',
      'displayBookRoomButtonLabel',
      'displayExtendMeetingButtonLabel',
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
      'displayMeetingModalEndErrorLabel'
    ]
  }
];

const BASE_TRANSLATION_GROUP_COLLAPSE_STATE = {
  maintenanceTranslationsSection: true,
  advancedTranslationsSection: true
};

const DEFAULT_TRANSLATION_GROUP_COLLAPSE_STATE = QUICK_ADMIN_TRANSLATION_GROUPS.reduce((acc, group) => {
  acc[group.labelKey] = true;
  return acc;
}, { ...BASE_TRANSLATION_GROUP_COLLAPSE_STATE });

const LANGUAGE_LABEL_OVERRIDES = {
  de: 'Deutsch (de)',
  en: 'English (en)'
};

const toSentenceCase = (value) => {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }

  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
};

const getLanguageDisplayName = (languageCode) => {
  const normalizedCode = String(languageCode || '').trim().toLowerCase();
  if (!normalizedCode) {
    return '';
  }

  if (LANGUAGE_LABEL_OVERRIDES[normalizedCode]) {
    return LANGUAGE_LABEL_OVERRIDES[normalizedCode];
  }

  try {
    const displayNames = new Intl.DisplayNames([normalizedCode], { type: 'language' });
    const label = displayNames.of(normalizedCode);
    return label ? `${toSentenceCase(label)} (${normalizedCode})` : normalizedCode;
  } catch (error) {
    return normalizedCode;
  }
};

const normalizeLanguageCode = (value) => String(value || '').trim().toLowerCase();

const toOverrideState = (value) => {
  if (value === true) {
    return 'enabled';
  }
  if (value === false) {
    return 'disabled';
  }
  return 'inherit';
};

const fromOverrideState = (value) => {
  if (value === 'enabled') {
    return true;
  }
  if (value === 'disabled') {
    return false;
  }
  return undefined;
};

const ADMIN_TAB_SECTIONS = {
  displays: ['display', 'wifi', 'logo', 'colors', 'booking'],
  operations: ['system', 'translationApi', 'oauth', 'maintenance', 'apiToken', 'search', 'ratelimit', 'backup', 'audit', 'mqtt', 'connectedDisplays'],
  content: ['translations']
};

const TAB_TO_SECTION = Object.entries(ADMIN_TAB_SECTIONS).reduce((acc, [section, tabs]) => {
  tabs.forEach((tab) => {
    acc[tab] = section;
  });
  return acc;
}, {});

class Admin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // WiFi state
      currentSsid: '',
      currentPassword: '',
      wifiLastUpdated: '',
      ssid: '',
      password: '',
      wifiMessage: null,
      wifiMessageType: null,
      
      // Logo state
      currentLogoDarkUrl: '',
      currentLogoLightUrl: '',
      logoLastUpdated: '',
      logoDarkUrl: '',
      logoLightUrl: '',
      logoDarkFile: null,
      logoLightFile: null,
      logoMessage: null,
      logoMessageType: null,
      uploadMode: 'url', // 'url' or 'file'
      
      // Information state
      currentShowWiFi: true,
      currentShowUpcomingMeetings: false,
      currentShowMeetingTitles: false,
      currentUpcomingMeetingsCount: 3,
      currentMinimalHeaderStyle: 'filled',
      currentSingleRoomDarkMode: false,
      currentFlightboardDarkMode: true,
      informationLastUpdated: '',
      showWiFi: true,
      showUpcomingMeetings: false,
      showMeetingTitles: false,
      upcomingMeetingsCount: 3,
      minimalHeaderStyle: 'filled',
      singleRoomDarkMode: false,
      flightboardDarkMode: true,
      sidebarTargetClientId: '',
      connectedClients: [],
      connectedClientsLoading: false,
      informationMessage: null,
      informationMessageType: null,
      
      // Config locks (which settings are configured via .env)
      wifiLocked: false,
      logoLocked: false,
      informationLocked: false,
      bookingLocked: false,
      searchLocked: false,
      rateLimitLocked: false,
      apiTokenLocked: false,
      wifiApiTokenLocked: false,
      oauthLocked: false,
      systemLocked: false,
      maintenanceLocked: false,
      translationApiLocked: false,
      
      // Booking state
      currentEnableBooking: true,
      bookingLastUpdated: '',
      enableBooking: true,
      bookingMessage: null,
      bookingMessageType: null,
      bookingPermissionMissing: false,
      currentEnableExtendMeeting: false,
      enableExtendMeeting: false,
      currentCheckInEnabled: true,
      checkInEnabled: true,
      currentCheckInRequiredForExternalMeetings: true,
      checkInRequiredForExternalMeetings: true,
      currentCheckInEarlyMinutes: 5,
      checkInEarlyMinutes: 5,
      currentCheckInWindowMinutes: 10,
      checkInWindowMinutes: 10,
      currentCheckInAutoReleaseNoShow: true,
      checkInAutoReleaseNoShow: true,
      currentRoomFeatureFlags: {},
      roomFeatureFlags: {},
      currentRoomGroupFeatureFlags: {},
      roomGroupFeatureFlags: {},
      newRoomOverrideKey: '',
      newRoomGroupOverrideKey: '',
      availableRoomOptions: [],
      availableRoomGroupOptions: [],

      // Operations / maintenance state
      currentMaintenanceEnabled: false,
      currentMaintenanceMessage: '',
      maintenanceLastUpdated: '',
      maintenanceEnabled: false,
      maintenanceMessage: '',
      maintenanceMessageBanner: null,
      maintenanceMessageType: null,
      i18nLastUpdated: '',
      currentMaintenanceTranslations: {},
      maintenanceTranslationsText: '{\n  "en": {\n    "title": "Maintenance mode active",\n    "body": "This display is temporarily unavailable."\n  },\n  "de": {\n    "title": "Wartungsmodus aktiv",\n    "body": "Diese Anzeige ist vorübergehend nicht verfügbar."\n  }\n}',
      currentAdminTranslations: {},
      adminTranslationsText: JSON.stringify(defaultAdminTranslations, null, 2),
      translationLanguage: 'en',
      newTranslationLanguageCode: '',
      translationLanguageDraftError: null,
      collapsedTranslationGroups: { ...DEFAULT_TRANSLATION_GROUP_COLLAPSE_STATE },
      showAdvancedTranslationsEditor: false,
      i18nMessage: null,
      i18nMessageType: null,
      backupPayloadText: '',
      backupMessage: null,
      backupMessageType: null,
      auditLogs: [],
      auditMessage: null,
      auditMessageType: null,
      connectedDisplays: [],
      connectedDisplaysMessage: null,
      connectedDisplaysMessageType: null,
      connectedDisplaysLoading: false,
      showPowerManagementModal: false,
      powerManagementClientId: null,
      powerManagementMode: 'browser',
      powerManagementScheduleEnabled: false,
      powerManagementStartTime: '20:00',
      powerManagementEndTime: '07:00',
      powerManagementWeekendMode: false,
      powerManagementMessage: null,
      powerManagementMessageType: null,
      apiTokenConfigMessage: null,
      apiTokenConfigMessageType: null,
      currentApiTokenSource: 'default',
      currentApiTokenIsDefault: true,
      apiTokenConfigLastUpdated: '',
      newApiToken: '',
      newApiTokenConfirm: '',
      wifiApiTokenConfigMessage: null,
      wifiApiTokenConfigMessageType: null,
      currentWifiApiTokenSource: 'default',
      currentWifiApiTokenConfigured: false,
      wifiApiTokenConfigLastUpdated: '',
      newWifiApiToken: '',
      newWifiApiTokenConfirm: '',
      oauthMessage: null,
      oauthMessageType: null,
      graphRuntimeMessage: null,
      graphRuntimeMessageType: null,
      systemMessage: null,
      systemMessageType: null,
      translationApiMessage: null,
      translationApiMessageType: null,
      currentSystemStartupValidationStrict: false,
      systemStartupValidationStrict: false,
      currentSystemGraphWebhookEnabled: false,
      systemGraphWebhookEnabled: false,
      currentSystemGraphWebhookClientState: '',
      systemGraphWebhookClientState: '',
      currentSystemGraphWebhookAllowedIps: '',
      systemGraphWebhookAllowedIps: '',
      currentSystemExposeDetailedErrors: false,
      systemExposeDetailedErrors: false,
      currentSystemGraphFetchTimeoutMs: 10000,
      systemGraphFetchTimeoutMs: 10000,
      currentSystemGraphFetchRetryAttempts: 2,
      systemGraphFetchRetryAttempts: 2,
      currentSystemGraphFetchRetryBaseMs: 250,
      systemGraphFetchRetryBaseMs: 250,
      currentSystemHstsMaxAge: 31536000,
      systemHstsMaxAge: 31536000,
      currentSystemRateLimitMaxBuckets: 10000,
      systemRateLimitMaxBuckets: 10000,
      currentSystemDisplayTrackingMode: 'client-id',
      systemDisplayTrackingMode: 'client-id',
      currentSystemDisplayTrackingRetentionHours: 2,
      systemDisplayTrackingRetentionHours: 2,
      currentSystemDisplayTrackingCleanupMinutes: 5,
      systemDisplayTrackingCleanupMinutes: 5,
      systemLastUpdated: '',
      currentTranslationApiEnabled: true,
      translationApiEnabled: true,
      currentTranslationApiUrl: 'https://translation.googleapis.com/language/translate/v2',
      translationApiUrl: 'https://translation.googleapis.com/language/translate/v2',
      currentTranslationApiTimeoutMs: 20000,
      translationApiTimeoutMs: 20000,
      currentTranslationApiHasApiKey: false,
      translationApiApiKey: '',
      translationApiLastUpdated: '',
      currentOauthClientId: '',
      oauthClientId: '',
      currentOauthAuthority: '',
      oauthAuthority: '',
      currentOauthHasClientSecret: false,
      oauthClientSecret: '',
      oauthLastUpdated: '',
      oauthFormDirty: false,
      searchMessage: null,
      searchMessageType: null,
      rateLimitMessage: null,
      rateLimitMessageType: null,
      currentSearchUseGraphAPI: true,
      searchUseGraphAPI: true,
      currentSearchMaxDays: 7,
      searchMaxDays: 7,
      currentSearchMaxRoomLists: 5,
      searchMaxRoomLists: 5,
      currentSearchMaxRooms: 50,
      searchMaxRooms: 50,
      currentSearchMaxItems: 100,
      searchMaxItems: 100,
      currentSearchPollIntervalMs: 15000,
      searchPollIntervalMs: 15000,
      searchLastUpdated: '',
      currentRateLimitApiWindowMs: 60000,
      rateLimitApiWindowMs: 60000,
      currentRateLimitApiMax: 300,
      rateLimitApiMax: 300,
      currentRateLimitWriteWindowMs: 60000,
      rateLimitWriteWindowMs: 60000,
      currentRateLimitWriteMax: 60,
      rateLimitWriteMax: 60,
      currentRateLimitAuthWindowMs: 60000,
      rateLimitAuthWindowMs: 60000,
      currentRateLimitAuthMax: 30,
      rateLimitAuthMax: 30,
      rateLimitLastUpdated: '',
      
      // Color state
      bookingButtonColor: '#334155',
      currentBookingButtonColor: '#334155',
      statusAvailableColor: '#22c55e',
      currentStatusAvailableColor: '#22c55e',
      statusBusyColor: '#ef4444',
      currentStatusBusyColor: '#ef4444',
      statusUpcomingColor: '#f59e0b',
      currentStatusUpcomingColor: '#f59e0b',
      statusNotFoundColor: '#6b7280',
      currentStatusNotFoundColor: '#6b7280',
      colorMessage: null,
      colorMessageType: null,
      colorsLastUpdated: '',
      
      // Auth
      apiToken: '',
      isAuthenticated: false,
      authChecking: true,
      authMessage: null,
      authMessageType: null,
      requiresInitialTokenSetup: false,
      initialTokenSetupLockedByEnv: false,
      
      // Sync status
      syncStatus: null,
      syncStatusLoading: true,
      syncStatusTick: Date.now(),
      
      // UI state
      activeTab: 'display',
      activeSection: 'displays',
      
      // MQTT Displays (Touchkio)
      mqttDisplays: [],
      mqttDisplaysLoading: false,
      showTouchkioModal: false,
      touchkioModalDisplay: null,
      touchkioModalMessage: null,
      touchkioModalMessageType: null,
      touchkioModalBrightness: undefined,
      touchkioModalVolume: undefined,
      touchkioModalZoom: undefined,
      
      // Version
      appVersion: null
    };
  }

  componentDidMount() {
    // Set page title
    const t = this.getTranslations();
    document.title = t.title;

    // Load version
    this.loadVersion();

    // Load logo config (public endpoint, no auth required)
    this.loadLogoConfig();

    this.verifyAdminSession()
      .then((valid) => {
        if (!valid) {
          this.loadAdminBootstrapStatus().finally(() => {
            this.setState({
              apiToken: '',
              isAuthenticated: false,
              authChecking: false,
              authMessage: null,
              authMessageType: null
            });
          });
          return;
        }

        this.setState({
          apiToken: '',
          isAuthenticated: true,
          authChecking: false,
          authMessage: null,
          authMessageType: null
        }, () => {
          this.loadConfigLocks();
          this.loadCurrentConfig();
          this.loadSyncStatus();
          this.startSyncIntervals();
          this.startRealtimeConfigUpdates();
        });
      })
      .catch(() => {
        this.loadAdminBootstrapStatus().finally(() => {
          this.setState({
            apiToken: '',
            isAuthenticated: false,
            authChecking: false,
            authMessage: null,
            authMessageType: null
          });
        });
      });
  }

  loadLogoConfig = () => {
    // Load logo config without authentication (public endpoint)
    fetch('/api/logo')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch logo config');
        }
        return response.json();
      })
      .then((data) => {
        console.log('[Admin] Logo config loaded:', data);
        if (data) {
          this.setState({
            currentLogoDarkUrl: data.logoDarkUrl || '',
            currentLogoLightUrl: data.logoLightUrl || ''
          });
        }
      })
      .catch((err) => {
        console.error('[Admin] Failed to load logo config:', err);
      });
  }

  loadVersion = () => {
    // Load application version (public endpoint)
    fetch('/api/version')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch version');
        }
        return response.json();
      })
      .then((data) => {
        console.log('[Admin] Version loaded:', data);
        if (data && data.version) {
          this.setState({ appVersion: data.version });
        }
      })
      .catch((err) => {
        console.error('[Admin] Failed to load version:', err);
      });
  }

  loadAdminBootstrapStatus = () => {
    return fetch('/api/admin/bootstrap-status', {
      method: 'GET'
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data) {
          return;
        }

        this.setState({
          requiresInitialTokenSetup: !!data.requiresSetup,
          initialTokenSetupLockedByEnv: !!data.lockedByEnv
        });
      })
      .catch(() => {
        // ignore bootstrap status errors, login can still proceed
      });
  }

  componentWillUnmount() {
    if (this.syncStatusInterval) {
      clearInterval(this.syncStatusInterval);
    }
    if (this.syncStatusClockInterval) {
      clearInterval(this.syncStatusClockInterval);
    }
    if (this.configRefreshInterval) {
      clearInterval(this.configRefreshInterval);
    }
    if (this.connectedDisplaysInterval) {
      clearInterval(this.connectedDisplaysInterval);
    }
    if (this.mqttDisplaysInterval) {
      clearInterval(this.mqttDisplaysInterval);
    }
    if (this.adminSocket) {
      this.adminSocket.disconnect();
      this.adminSocket = null;
    }
  }

  componentDidUpdate(prevProps, prevState) {
    // Auto-load connected displays when switching to that tab
    if (this.state.activeTab === 'connectedDisplays' && prevState.activeTab !== 'connectedDisplays') {
      this.handleLoadConnectedDisplays();
      this.startConnectedDisplaysAutoRefresh();
    }

    // Stop auto-refresh when leaving the tab
    if (prevState.activeTab === 'connectedDisplays' && this.state.activeTab !== 'connectedDisplays') {
      this.stopConnectedDisplaysAutoRefresh();
    }

    // Auto-load MQTT displays when switching to that tab
    if (this.state.activeTab === 'mqtt' && prevState.activeTab !== 'mqtt') {
      this.handleLoadMqttDisplays(true); // true = start auto-refresh
    }

    // Stop auto-refresh when leaving the MQTT tab
    if (prevState.activeTab === 'mqtt' && this.state.activeTab !== 'mqtt') {
      if (this.mqttDisplaysInterval) {
        clearInterval(this.mqttDisplaysInterval);
        this.mqttDisplaysInterval = null;
      }
    }
  }

  startConnectedDisplaysAutoRefresh = () => {
    if (this.connectedDisplaysInterval) {
      return;
    }
    // Refresh every 10 seconds
    this.connectedDisplaysInterval = setInterval(() => {
      if (this.state.activeTab === 'connectedDisplays') {
        this.handleLoadConnectedDisplays();
      }
    }, 10000);
  }

  stopConnectedDisplaysAutoRefresh = () => {
    if (this.connectedDisplaysInterval) {
      clearInterval(this.connectedDisplaysInterval);
      this.connectedDisplaysInterval = null;
    }
  }

  startRealtimeConfigUpdates = () => {
    if (this.adminSocket) {
      return;
    }

    this.adminSocket = io();
    if (!this.adminSocket || !this.adminSocket.on) {
      return;
    }

    const refreshConfig = () => {
      this.loadCurrentConfig();
      this.loadConfigLocks();
    };

    this.adminSocket.on('wifiConfigUpdated', refreshConfig);
    this.adminSocket.on('logoConfigUpdated', refreshConfig);
    this.adminSocket.on('sidebarConfigUpdated', refreshConfig);
    this.adminSocket.on('bookingConfigUpdated', refreshConfig);
    this.adminSocket.on('maintenanceConfigUpdated', refreshConfig);
    this.adminSocket.on('i18nConfigUpdated', refreshConfig);
    this.adminSocket.on('colorsConfigUpdated', refreshConfig);
    this.adminSocket.on('searchConfigUpdated', refreshConfig);
    this.adminSocket.on('rateLimitConfigUpdated', refreshConfig);
    this.adminSocket.on('oauthConfigUpdated', refreshConfig);
    this.adminSocket.on('systemConfigUpdated', refreshConfig);
    this.adminSocket.on('translationApiConfigUpdated', refreshConfig);
    this.adminSocket.on('apiTokenUpdated', refreshConfig);
    this.adminSocket.on('wifiApiTokenUpdated', refreshConfig);
    this.adminSocket.on('connectedClientsUpdated', () => this.loadConnectedClients());
  }

  startSyncIntervals = () => {
    if (!this.syncStatusInterval) {
      this.syncStatusInterval = setInterval(() => {
        this.loadSyncStatus();
      }, 30000);
    }

    if (!this.syncStatusClockInterval) {
      this.syncStatusClockInterval = setInterval(() => {
        this.setState({ syncStatusTick: Date.now() });
      }, 1000);
    }

    if (!this.configRefreshInterval) {
      this.configRefreshInterval = setInterval(() => {
        this.loadConfigLocks();
      }, 5000);
    }
  }

  verifyAdminSession = () => {
    return fetch('/api/admin/session', {
      method: 'GET'
    }).then((response) => response.status === 200);
  }

  handleAdminLogin = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const token = String(this.state.apiToken || '').trim();

    if (!token) {
      this.setState({
        authMessage: t.errorUnauthorized,
        authMessageType: 'error'
      });
      return;
    }

    this.setState({ authChecking: true, authMessage: null, authMessageType: null });

    const completeLoginSuccess = () => {
      this.setState({
        apiToken: '',
        isAuthenticated: true,
        authChecking: false,
        authMessage: null,
        authMessageType: null
      }, () => {
        this.loadConfigLocks();
        this.loadCurrentConfig();
        this.loadSyncStatus();
        this.startSyncIntervals();
        this.startRealtimeConfigUpdates();
      });
    };

    fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    })
      .then(async (response) => {
        if (response.status === 428) {
          const bootstrapResponse = await fetch('/api/admin/bootstrap-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
          });

          if (!bootstrapResponse.ok) {
            const errorPayload = await bootstrapResponse.json().catch(() => ({}));
            throw new Error(errorPayload?.message || errorPayload?.error || t.errorUnauthorized);
          }

          completeLoginSuccess();
          return;
        }

        if (response.status === 401) {
          throw new Error(t.errorUnauthorized);
        }
        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload?.message || errorPayload?.error || t.errorUnknown || 'Login failed');
        }

        completeLoginSuccess();
      })
      .catch((error) => {
        this.setState({
          isAuthenticated: false,
          authChecking: false,
          authMessage: error?.message || t.errorUnauthorized,
          authMessageType: 'error'
        });
      });
  }

  handleAdminLogout = () => {
    fetch('/api/admin/logout', {
      method: 'POST'
    }).catch(() => {
      // ignore logout network errors and continue local cleanup
    });

    if (this.syncStatusInterval) {
      clearInterval(this.syncStatusInterval);
      this.syncStatusInterval = null;
    }
    if (this.syncStatusClockInterval) {
      clearInterval(this.syncStatusClockInterval);
      this.syncStatusClockInterval = null;
    }
    if (this.configRefreshInterval) {
      clearInterval(this.configRefreshInterval);
      this.configRefreshInterval = null;
    }
    if (this.connectedDisplaysInterval) {
      clearInterval(this.connectedDisplaysInterval);
      this.connectedDisplaysInterval = null;
    }
    if (this.adminSocket) {
      this.adminSocket.disconnect();
      this.adminSocket = null;
    }

    this.setState({
      apiToken: '',
      isAuthenticated: false,
      authChecking: false,
      authMessage: null,
      authMessageType: null,
      syncStatus: null,
      syncStatusLoading: true
    });
  }

  handleUnauthorizedAccess = () => {
    const t = this.getTranslations();
    this.handleAdminLogout();
    this.setState({
      authMessage: t.errorUnauthorized,
      authMessageType: 'error'
    });
  }

  loadSyncStatus = () => {
    fetch('/api/sync-status')
      .then(response => response.json())
      .then(data => {
        this.setState({
          syncStatus: data,
          syncStatusLoading: false
        });
      })
      .catch(err => {
        console.error('Error loading sync status:', err);
        this.setState({
          syncStatus: null,
          syncStatusLoading: false
        });
      });
  }

  loadConfigLocks = () => {
    fetch('/api/config-locks')
      .then(response => response.json())
      .then(data => {
        this.setState({
          wifiLocked: data.wifiLocked || false,
          logoLocked: data.logoLocked || false,
          informationLocked: data.sidebarLocked || false,
          bookingLocked: data.bookingLocked || false,
          searchLocked: data.searchLocked || false,
          rateLimitLocked: data.rateLimitLocked || false,
          apiTokenLocked: data.apiTokenLocked || false,
          wifiApiTokenLocked: data.wifiApiTokenLocked || false,
          oauthLocked: data.oauthLocked || false,
          systemLocked: data.systemLocked || false,
          maintenanceLocked: data.maintenanceLocked || false,
          translationApiLocked: data.translationApiLocked || false
        });
      })
      .catch(err => {
        console.error('Error loading config locks:', err);
      });
  }

  loadConnectedClients = () => {
    this.setState({ connectedClientsLoading: true });

    fetch('/api/connected-clients')
      .then((response) => response.json())
      .then((data) => {
        const clients = Array.isArray(data?.clients) ? data.clients : [];
        this.setState((prevState) => {
          const currentTarget = String(prevState.sidebarTargetClientId || '');
          const stillExists = clients.some((client) => String(client?.clientId || '') === currentTarget);
          return {
            connectedClients: clients,
            connectedClientsLoading: false,
            sidebarTargetClientId: stillExists ? currentTarget : ''
          };
        });
      })
      .catch((err) => {
        console.error('Error loading connected clients:', err);
        this.setState({ connectedClientsLoading: false });
      });
  }

  // Convert hex to HSL
  hexToHSL = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 0, l: 50 };
    
    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    
    let h, s;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
        default:
          h = 0;
      }
    }
    
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  // Convert HSL to hex
  hslToHex = (h, s, l) => {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = (x) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  getTranslations() {
    return getAdminTranslations(this.state.currentAdminTranslations);
  }

  getAvailableTranslationLanguages = () => {
    const maintenanceLanguages = Object.keys(this.state.currentMaintenanceTranslations || {});
    const adminLanguages = Object.keys(this.state.currentAdminTranslations || {});
    const defaultLanguages = Object.keys(defaultAdminTranslations || {});

    return Array.from(new Set([...defaultLanguages, ...maintenanceLanguages, ...adminLanguages]))
      .map((language) => String(language || '').trim().toLowerCase())
      .filter(Boolean)
      .sort();
  }

  handleTranslationLanguageChange = (language) => {
    this.setState({
      translationLanguage: String(language || '').trim().toLowerCase() || 'en',
      translationLanguageDraftError: null
    });
  }

  autoTranslateLanguageFromEnglish = async (targetLanguage) => {
    const t = this.getTranslations();
    const {
      apiToken,
      currentMaintenanceTranslations,
      currentAdminTranslations
    } = this.state;

    const sourceMaintenance = currentMaintenanceTranslations?.en || {
      title: '',
      body: ''
    };

    const sourceAdmin = {
      ...(defaultAdminTranslations.en || {}),
      ...(currentAdminTranslations?.en || {})
    };

    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

    try {
      const response = await fetch('/api/i18n/auto-translate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sourceLanguage: 'en',
          targetLanguage,
          maintenanceSource: sourceMaintenance,
          adminSource: sourceAdmin
        })
      });

      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        throw new Error(t.errorUnauthorized);
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || t.errorUnknown);
      }

      this.setState((prevState) => {
        const nextMaintenanceTranslations = {
          ...(prevState.currentMaintenanceTranslations || {}),
          [targetLanguage]: {
            title: String(data.maintenance?.title || sourceMaintenance.title || ''),
            body: String(data.maintenance?.body || sourceMaintenance.body || '')
          }
        };

        const nextAdminTranslations = {
          ...(prevState.currentAdminTranslations || {}),
          [targetLanguage]: {
            ...sourceAdmin,
            ...(data.admin || {})
          }
        };

        return {
          currentMaintenanceTranslations: nextMaintenanceTranslations,
          maintenanceTranslationsText: JSON.stringify(nextMaintenanceTranslations, null, 2),
          currentAdminTranslations: nextAdminTranslations,
          adminTranslationsText: JSON.stringify(nextAdminTranslations, null, 2)
        };
      }, () => {
        this.saveI18nConfig(
          this.state.currentMaintenanceTranslations,
          this.state.currentAdminTranslations,
          t.languageAddedSuccessMessage || t.translationsSuccessMessage
        );
      });
    } catch (error) {
      this.setState({
        i18nMessage: `${t.errorPrefix} ${error.message}`,
        i18nMessageType: 'error'
      }, () => {
        this.saveI18nConfig(
          this.state.currentMaintenanceTranslations,
          this.state.currentAdminTranslations,
          t.languageAddedSuccessMessage || t.translationsSuccessMessage
        );
      });
    }
  }

  saveI18nConfig = (maintenanceMessages, adminTranslations, successMessage) => {
    const t = this.getTranslations();
    const { apiToken } = this.state;
    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

    return fetch('/api/i18n', {
      method: 'POST',
      headers,
      body: JSON.stringify({ maintenanceMessages, adminTranslations })
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          throw new Error(t.errorUnauthorized);
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          throw new Error(data.error || t.errorUnknown);
        }

        const savedMessages = data.config && data.config.maintenanceMessages ? data.config.maintenanceMessages : maintenanceMessages;
        const savedAdminTranslations = data.config && data.config.adminTranslations ? data.config.adminTranslations : adminTranslations;
        this.setState({
          i18nMessage: successMessage || t.translationsSuccessMessage,
          i18nMessageType: 'success',
          currentMaintenanceTranslations: savedMessages,
          maintenanceTranslationsText: JSON.stringify(savedMessages, null, 2),
          currentAdminTranslations: savedAdminTranslations,
          adminTranslationsText: JSON.stringify(savedAdminTranslations, null, 2)
        });
        this.loadCurrentConfig();
      })
      .catch(err => {
        this.setState({
          i18nMessage: `${t.errorPrefix} ${err.message}`,
          i18nMessageType: 'error'
        });
      });
  }

  handleNewTranslationLanguageChange = (value) => {
    this.setState({
      newTranslationLanguageCode: value,
      translationLanguageDraftError: null
    });
  }

  handleAddTranslationLanguage = () => {
    const t = this.getTranslations();
    const newLanguageCode = normalizeLanguageCode(this.state.newTranslationLanguageCode);
    const validLanguagePattern = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/;

    if (!newLanguageCode || !validLanguagePattern.test(newLanguageCode)) {
      this.setState({
        translationLanguageDraftError: t.invalidLanguageCodeMessage || 'Ungültiger Sprachcode'
      });
      return;
    }

    this.setState((prevState) => {
      const nextMaintenanceTranslations = {
        ...(prevState.currentMaintenanceTranslations || {})
      };
      const nextAdminTranslations = {
        ...(prevState.currentAdminTranslations || {})
      };

      const maintenanceSource = nextMaintenanceTranslations.en || {};
      const adminSource = {
        ...(defaultAdminTranslations.en || {}),
        ...(nextAdminTranslations.en || {})
      };

      const existingMaintenance = nextMaintenanceTranslations[newLanguageCode] || {};
      nextMaintenanceTranslations[newLanguageCode] = {
        title: String(existingMaintenance.title || maintenanceSource.title || ''),
        body: String(existingMaintenance.body || maintenanceSource.body || '')
      };

      const existingAdmin = nextAdminTranslations[newLanguageCode] || {};
      nextAdminTranslations[newLanguageCode] = {
        ...adminSource,
        ...existingAdmin
      };

      return {
        currentMaintenanceTranslations: nextMaintenanceTranslations,
        maintenanceTranslationsText: JSON.stringify(nextMaintenanceTranslations, null, 2),
        currentAdminTranslations: nextAdminTranslations,
        adminTranslationsText: JSON.stringify(nextAdminTranslations, null, 2),
        translationLanguage: newLanguageCode,
        newTranslationLanguageCode: '',
        translationLanguageDraftError: null
      };
    }, () => {
      if (newLanguageCode === 'en') {
        this.saveI18nConfig(
          this.state.currentMaintenanceTranslations,
          this.state.currentAdminTranslations,
          t.languageAddedSuccessMessage || t.translationsSuccessMessage
        );
        return;
      }

      this.autoTranslateLanguageFromEnglish(newLanguageCode);
    });
  }

  handleRemoveTranslationLanguage = () => {
    const t = this.getTranslations();

    this.setState((prevState) => {
      const languageToRemove = normalizeLanguageCode(prevState.translationLanguage);

      if (!languageToRemove) {
        return null;
      }

      if (['en', 'de'].includes(languageToRemove)) {
        return {
          translationLanguageDraftError: t.removeLanguageDefaultError || 'English (en) and German (de) cannot be removed'
        };
      }

      const nextMaintenanceTranslations = {
        ...(prevState.currentMaintenanceTranslations || {})
      };
      const nextAdminTranslations = {
        ...(prevState.currentAdminTranslations || {})
      };

      delete nextMaintenanceTranslations[languageToRemove];
      delete nextAdminTranslations[languageToRemove];

      const nextAvailableLanguages = Array.from(new Set([
        ...Object.keys(defaultAdminTranslations || {}),
        ...Object.keys(nextMaintenanceTranslations || {}),
        ...Object.keys(nextAdminTranslations || {})
      ]))
        .map((language) => String(language || '').trim().toLowerCase())
        .filter(Boolean)
        .sort();

      const nextSelectedLanguage = nextAvailableLanguages.includes('en')
        ? 'en'
        : (nextAvailableLanguages[0] || 'en');

      return {
        currentMaintenanceTranslations: nextMaintenanceTranslations,
        maintenanceTranslationsText: JSON.stringify(nextMaintenanceTranslations, null, 2),
        currentAdminTranslations: nextAdminTranslations,
        adminTranslationsText: JSON.stringify(nextAdminTranslations, null, 2),
        translationLanguage: nextSelectedLanguage,
        translationLanguageDraftError: null
      };
    }, () => {
      this.saveI18nConfig(
        this.state.currentMaintenanceTranslations,
        this.state.currentAdminTranslations,
        t.languageRemovedSuccessMessage || t.translationsSuccessMessage
      );
    });
  }

  toggleTranslationGroup = (labelKey) => {
    this.setState((prevState) => ({
      collapsedTranslationGroups: {
        ...(prevState.collapsedTranslationGroups || {}),
        [labelKey]: !prevState.collapsedTranslationGroups?.[labelKey]
      }
    }));
  }

  handleMaintenanceTranslationFieldChange = (language, field, value) => {
    this.setState((prevState) => {
      const nextMaintenanceTranslations = {
        ...prevState.currentMaintenanceTranslations,
        [language]: {
          ...(prevState.currentMaintenanceTranslations?.[language] || {}),
          [field]: value
        }
      };

      return {
        currentMaintenanceTranslations: nextMaintenanceTranslations,
        maintenanceTranslationsText: JSON.stringify(nextMaintenanceTranslations, null, 2)
      };
    });
  }

  handleAdminTranslationFieldChange = (language, key, value) => {
    this.setState((prevState) => {
      const nextAdminTranslations = {
        ...prevState.currentAdminTranslations,
        [language]: {
          ...(prevState.currentAdminTranslations?.[language] || {}),
          [key]: value
        }
      };

      return {
        currentAdminTranslations: nextAdminTranslations,
        adminTranslationsText: JSON.stringify(nextAdminTranslations, null, 2)
      };
    });
  }

  loadCurrentConfig = () => {
	const { apiToken } = this.state;
	const wifiHeaders = {};
	if (apiToken) {
	  wifiHeaders['Authorization'] = `Bearer ${apiToken}`;
	}

    this.loadConnectedClients();

    // Load WiFi config
    fetch('/api/wifi', {
	  headers: wifiHeaders
	})
      .then(response => response.json())
      .then(data => {
        this.setState({
          currentSsid: data.ssid || '-',
          currentPassword: data.password || '-',
          wifiLastUpdated: data.lastUpdated 
            ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-',
          ssid: data.ssid || '',
          password: data.password || ''
        });
      })
      .catch(err => {
        console.error('Error loading WiFi config:', err);
      });
    
    // Load Logo config
    fetch('/api/logo')
      .then(response => response.json())
      .then(data => {
        this.setState({
          currentLogoDarkUrl: data.logoDarkUrl || '-',
          currentLogoLightUrl: data.logoLightUrl || '-',
          logoLastUpdated: data.lastUpdated 
            ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-',
          logoDarkUrl: data.logoDarkUrl || '',
          logoLightUrl: data.logoLightUrl || ''
        });
      })
      .catch(err => {
        console.error('Error loading logo config:', err);
      });
    
    // Load Information config
    fetch('/api/sidebar')
      .then(response => response.json())
      .then(data => {
        const globalSingleRoomDarkMode = data.singleRoomDarkMode !== undefined ? data.singleRoomDarkMode : false;
        const globalFlightboardDarkMode = data.flightboardDarkMode !== undefined ? data.flightboardDarkMode : true;
        this.setState({
          currentShowWiFi: data.showWiFi !== undefined ? data.showWiFi : true,
          currentShowUpcomingMeetings: data.showUpcomingMeetings !== undefined ? data.showUpcomingMeetings : false,
          currentShowMeetingTitles: data.showMeetingTitles !== undefined ? data.showMeetingTitles : false,
          currentUpcomingMeetingsCount: Number.isFinite(Number(data.upcomingMeetingsCount))
            ? Math.min(Math.max(parseInt(data.upcomingMeetingsCount, 10), 1), 10)
            : 3,
          currentMinimalHeaderStyle: data.minimalHeaderStyle || 'filled',
          currentSingleRoomDarkMode: globalSingleRoomDarkMode,
          currentFlightboardDarkMode: globalFlightboardDarkMode,
          informationLastUpdated: data.lastUpdated 
            ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-',
          showWiFi: data.showWiFi !== undefined ? data.showWiFi : true,
          showUpcomingMeetings: data.showUpcomingMeetings !== undefined ? data.showUpcomingMeetings : false,
          showMeetingTitles: data.showMeetingTitles !== undefined ? data.showMeetingTitles : false,
          upcomingMeetingsCount: Number.isFinite(Number(data.upcomingMeetingsCount))
            ? Math.min(Math.max(parseInt(data.upcomingMeetingsCount, 10), 1), 10)
            : 3,
          minimalHeaderStyle: data.minimalHeaderStyle || 'filled',
          singleRoomDarkMode: this.state.sidebarTargetClientId
            ? this.state.singleRoomDarkMode
            : globalSingleRoomDarkMode,
          flightboardDarkMode: globalFlightboardDarkMode
        });

        const targetClientId = String(this.state.sidebarTargetClientId || '').trim();
        if (targetClientId) {
          fetch(`/api/sidebar?displayClientId=${encodeURIComponent(targetClientId)}`)
            .then((targetResponse) => targetResponse.json())
            .then((targetData) => {
              this.setState({
                singleRoomDarkMode: targetData.singleRoomDarkMode !== undefined
                  ? !!targetData.singleRoomDarkMode
                  : globalSingleRoomDarkMode
              });
            })
            .catch((targetErr) => {
              console.error('Error loading target sidebar config:', targetErr);
            });
        }
      })
      .catch(err => {
        console.error('Error loading information config:', err);
      });
    
    // Load Booking config
    fetch('/api/booking-config')
      .then(response => response.json())
      .then(data => {
        const roomFeatureFlags = data.roomFeatureFlags && typeof data.roomFeatureFlags === 'object'
          ? data.roomFeatureFlags
          : {};
        const roomGroupFeatureFlags = data.roomGroupFeatureFlags && typeof data.roomGroupFeatureFlags === 'object'
          ? data.roomGroupFeatureFlags
          : {};
        const checkIn = data.checkIn && typeof data.checkIn === 'object'
          ? data.checkIn
          : {};

        const checkInEnabled = checkIn.enabled !== undefined ? !!checkIn.enabled : true;
        const checkInRequiredForExternalMeetings = checkIn.requiredForExternalMeetings !== undefined
          ? !!checkIn.requiredForExternalMeetings
          : true;
        const checkInEarlyMinutes = Number.isFinite(Number(checkIn.earlyCheckInMinutes))
          ? Math.max(parseInt(checkIn.earlyCheckInMinutes, 10), 0)
          : 5;
        const checkInWindowMinutes = Number.isFinite(Number(checkIn.windowMinutes))
          ? Math.max(parseInt(checkIn.windowMinutes, 10), 1)
          : 10;
        const checkInAutoReleaseNoShow = checkIn.autoReleaseNoShow !== undefined
          ? !!checkIn.autoReleaseNoShow
          : true;

        this.setState({
          currentEnableBooking: data.enableBooking !== undefined ? data.enableBooking : true,
          bookingLastUpdated: data.lastUpdated 
            ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-',
          enableBooking: data.enableBooking !== undefined ? data.enableBooking : true,
          currentEnableExtendMeeting: data.enableExtendMeeting !== undefined ? data.enableExtendMeeting : false,
          enableExtendMeeting: data.enableExtendMeeting !== undefined ? data.enableExtendMeeting : false,
          bookingPermissionMissing: data.permissionMissing || false,
          bookingButtonColor: data.buttonColor || '#334155',
          currentBookingButtonColor: data.buttonColor || '#334155',
          currentCheckInEnabled: checkInEnabled,
          checkInEnabled,
          currentCheckInRequiredForExternalMeetings: checkInRequiredForExternalMeetings,
          checkInRequiredForExternalMeetings,
          currentCheckInEarlyMinutes: checkInEarlyMinutes,
          checkInEarlyMinutes,
          currentCheckInWindowMinutes: checkInWindowMinutes,
          checkInWindowMinutes,
          currentCheckInAutoReleaseNoShow: checkInAutoReleaseNoShow,
          checkInAutoReleaseNoShow,
          currentRoomFeatureFlags: roomFeatureFlags,
          roomFeatureFlags,
          currentRoomGroupFeatureFlags: roomGroupFeatureFlags,
          roomGroupFeatureFlags
        });
      })
      .catch(err => {
        console.error('Error loading booking config:', err);
      });

    fetch('/api/search-config')
      .then(response => response.json())
      .then(data => {
        const useGraphAPI = data.useGraphAPI !== undefined ? !!data.useGraphAPI : true;
        const maxDays = Number.isFinite(Number(data.maxDays)) ? Math.max(parseInt(data.maxDays, 10), 1) : 7;
        const maxRoomLists = Number.isFinite(Number(data.maxRoomLists)) ? Math.max(parseInt(data.maxRoomLists, 10), 1) : 5;
        const maxRooms = Number.isFinite(Number(data.maxRooms)) ? Math.max(parseInt(data.maxRooms, 10), 1) : 50;
        const maxItems = Number.isFinite(Number(data.maxItems)) ? Math.max(parseInt(data.maxItems, 10), 1) : 100;
        const pollIntervalMs = Number.isFinite(Number(data.pollIntervalMs)) ? Math.max(parseInt(data.pollIntervalMs, 10), 5000) : 15000;

        this.setState({
          currentSearchUseGraphAPI: useGraphAPI,
          searchUseGraphAPI: useGraphAPI,
          currentSearchMaxDays: maxDays,
          searchMaxDays: maxDays,
          currentSearchMaxRoomLists: maxRoomLists,
          searchMaxRoomLists: maxRoomLists,
          currentSearchMaxRooms: maxRooms,
          searchMaxRooms: maxRooms,
          currentSearchMaxItems: maxItems,
          searchMaxItems: maxItems,
          currentSearchPollIntervalMs: pollIntervalMs,
          searchPollIntervalMs: pollIntervalMs,
          searchLastUpdated: data.lastUpdated
            ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-'
        });
      })
      .catch(err => {
        console.error('Error loading search config:', err);
      });

    fetch('/api/rate-limit-config')
      .then(response => response.json())
      .then(data => {
        const apiWindowMs = Number.isFinite(Number(data.apiWindowMs)) ? Math.max(parseInt(data.apiWindowMs, 10), 1000) : 60000;
        const apiMax = Number.isFinite(Number(data.apiMax)) ? Math.max(parseInt(data.apiMax, 10), 1) : 300;
        const writeWindowMs = Number.isFinite(Number(data.writeWindowMs)) ? Math.max(parseInt(data.writeWindowMs, 10), 1000) : 60000;
        const writeMax = Number.isFinite(Number(data.writeMax)) ? Math.max(parseInt(data.writeMax, 10), 1) : 60;
        const authWindowMs = Number.isFinite(Number(data.authWindowMs)) ? Math.max(parseInt(data.authWindowMs, 10), 1000) : 60000;
        const authMax = Number.isFinite(Number(data.authMax)) ? Math.max(parseInt(data.authMax, 10), 1) : 30;

        this.setState({
          currentRateLimitApiWindowMs: apiWindowMs,
          rateLimitApiWindowMs: apiWindowMs,
          currentRateLimitApiMax: apiMax,
          rateLimitApiMax: apiMax,
          currentRateLimitWriteWindowMs: writeWindowMs,
          rateLimitWriteWindowMs: writeWindowMs,
          currentRateLimitWriteMax: writeMax,
          rateLimitWriteMax: writeMax,
          currentRateLimitAuthWindowMs: authWindowMs,
          rateLimitAuthWindowMs: authWindowMs,
          currentRateLimitAuthMax: authMax,
          rateLimitAuthMax: authMax,
          rateLimitLastUpdated: data.lastUpdated
            ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-'
        });
      })
      .catch(err => {
        console.error('Error loading rate-limit config:', err);
      });

    fetch('/api/translation-api-config')
      .then(response => response.json())
      .then(data => {
        const enabled = data.enabled !== undefined ? !!data.enabled : true;
        const url = String(data.url || '').trim() || 'https://translation.googleapis.com/language/translate/v2';
        const timeoutMs = Number.isFinite(Number(data.timeoutMs)) ? Math.max(parseInt(data.timeoutMs, 10), 3000) : 20000;
        const hasApiKey = !!data.hasApiKey;

        this.setState({
          currentTranslationApiEnabled: enabled,
          translationApiEnabled: enabled,
          currentTranslationApiUrl: url,
          translationApiUrl: url,
          currentTranslationApiTimeoutMs: timeoutMs,
          translationApiTimeoutMs: timeoutMs,
          currentTranslationApiHasApiKey: hasApiKey,
          translationApiLastUpdated: data.lastUpdated
            ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-',
          translationApiApiKey: ''
        });
      })
      .catch(err => {
        console.error('Error loading translation API config:', err);
      });

    fetch('/api/roomlists')
      .then(response => response.json())
      .then(data => {
        const options = Array.isArray(data)
          ? data
              .filter(item => item && item.alias)
              .map(item => ({
                value: String(item.alias).trim().toLowerCase(),
                label: `${item.name || item.alias} (${String(item.alias).trim().toLowerCase()})`
              }))
              .sort((a, b) => a.label.localeCompare(b.label))
          : [];

        this.setState({ availableRoomGroupOptions: options });
      })
      .catch(err => {
        console.error('Error loading roomlists for booking overrides:', err);
        this.setState({ availableRoomGroupOptions: [] });
      });

    fetch('/api/rooms')
      .then(response => response.json())
      .then(data => {
        const dedup = new Map();

        if (Array.isArray(data)) {
          data.forEach((room) => {
            const email = String(room?.Email || '').trim().toLowerCase();
            if (!email) {
              return;
            }

            if (!dedup.has(email)) {
              const roomName = room?.Name ? String(room.Name) : email;
              const roomAlias = room?.RoomAlias ? String(room.RoomAlias) : '';
              dedup.set(email, {
                value: email,
                label: roomAlias ? `${roomName} (${email}) - ${roomAlias}` : `${roomName} (${email})`
              });
            }
          });
        }

        const options = Array.from(dedup.values()).sort((a, b) => a.label.localeCompare(b.label));
        this.setState({ availableRoomOptions: options });
      })
      .catch(err => {
        console.error('Error loading rooms for booking overrides:', err);
        this.setState({ availableRoomOptions: [] });
      });

    fetch('/api/maintenance-status')
      .then(response => response.json())
      .then(data => {
        this.setState({
          currentMaintenanceEnabled: data.enabled === true,
          currentMaintenanceMessage: data.message || '',
          maintenanceLastUpdated: data.lastUpdated
            ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-',
          maintenanceEnabled: data.enabled === true,
          maintenanceMessage: data.message || ''
        });
      })
      .catch(err => {
        console.error('Error loading maintenance config:', err);
      });

    const systemHeaders = {};
    if (this.state.apiToken) {
      systemHeaders.Authorization = `Bearer ${this.state.apiToken}`;
    }

    fetch('/api/system-config', {
      method: 'GET',
      headers: systemHeaders
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          return null;
        }
        return response.json();
      })
      .then(data => {
        if (!data) {
          return;
        }

        const webhookIpsText = Array.isArray(data.graphWebhookAllowedIps)
          ? data.graphWebhookAllowedIps.join(', ')
          : '';

        this.setState({
          currentSystemStartupValidationStrict: !!data.startupValidationStrict,
          systemStartupValidationStrict: !!data.startupValidationStrict,
          currentSystemGraphWebhookEnabled: !!data.graphWebhookEnabled,
          systemGraphWebhookEnabled: !!data.graphWebhookEnabled,
          currentSystemGraphWebhookClientState: data.graphWebhookClientState || '',
          systemGraphWebhookClientState: data.graphWebhookClientState || '',
          currentSystemGraphWebhookAllowedIps: webhookIpsText,
          systemGraphWebhookAllowedIps: webhookIpsText,
          currentSystemExposeDetailedErrors: !!data.exposeDetailedErrors,
          systemExposeDetailedErrors: !!data.exposeDetailedErrors,
          currentSystemGraphFetchTimeoutMs: parseInt(data.graphFetchTimeoutMs, 10) || 10000,
          systemGraphFetchTimeoutMs: parseInt(data.graphFetchTimeoutMs, 10) || 10000,
          currentSystemGraphFetchRetryAttempts: parseInt(data.graphFetchRetryAttempts, 10) || 2,
          systemGraphFetchRetryAttempts: parseInt(data.graphFetchRetryAttempts, 10) || 2,
          currentSystemGraphFetchRetryBaseMs: parseInt(data.graphFetchRetryBaseMs, 10) || 250,
          systemGraphFetchRetryBaseMs: parseInt(data.graphFetchRetryBaseMs, 10) || 250,
          currentSystemHstsMaxAge: Math.max(parseInt(data.hstsMaxAge, 10) || 0, 0),
          systemHstsMaxAge: Math.max(parseInt(data.hstsMaxAge, 10) || 0, 0),
          currentSystemRateLimitMaxBuckets: parseInt(data.rateLimitMaxBuckets, 10) || 10000,
          systemRateLimitMaxBuckets: parseInt(data.rateLimitMaxBuckets, 10) || 10000,
          currentSystemDisplayTrackingMode: data.displayTrackingMode || 'client-id',
          systemDisplayTrackingMode: data.displayTrackingMode || 'client-id',
          currentSystemDisplayTrackingRetentionHours: parseInt(data.displayTrackingRetentionHours, 10) || 2,
          systemDisplayTrackingRetentionHours: parseInt(data.displayTrackingRetentionHours, 10) || 2,
          currentSystemDisplayTrackingCleanupMinutes: parseInt(data.displayTrackingCleanupMinutes, 10) || 5,
          systemDisplayTrackingCleanupMinutes: parseInt(data.displayTrackingCleanupMinutes, 10) || 5,
          systemLastUpdated: data.lastUpdated
            ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-'
        });
      })
      .catch(err => {
        console.error('Error loading system config:', err);
      });

    const oauthHeaders = {};
    if (this.state.apiToken) {
      oauthHeaders.Authorization = `Bearer ${this.state.apiToken}`;
    }

    fetch('/api/oauth-config', {
      method: 'GET',
      headers: oauthHeaders
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          return null;
        }
        return response.json();
      })
      .then(data => {
        if (!data) {
          return;
        }

        const tenantId = data.tenantId || '';

        this.setState((prevState) => {
          const nextState = {
            currentOauthClientId: data.clientId || '',
            currentOauthAuthority: tenantId,
            currentOauthHasClientSecret: !!data.hasClientSecret,
            oauthLastUpdated: data.lastUpdated
              ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
              : '-'
          };

          if (!prevState.oauthFormDirty) {
            nextState.oauthClientId = data.clientId || '';
            nextState.oauthAuthority = tenantId;
            nextState.oauthClientSecret = '';
          }

          return nextState;
        });
      })
      .catch(err => {
        console.error('Error loading oauth config:', err);
      });

    const apiTokenHeaders = {};
    if (this.state.apiToken) {
      apiTokenHeaders.Authorization = `Bearer ${this.state.apiToken}`;
    }

    fetch('/api/api-token-config', {
      method: 'GET',
      headers: apiTokenHeaders
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          return null;
        }
        return response.json();
      })
      .then(data => {
        if (!data) {
          return;
        }

        this.setState({
          currentApiTokenSource: data.source || 'default',
          currentApiTokenIsDefault: !!data.isDefault,
          apiTokenConfigLastUpdated: data.lastUpdated
            ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-',
          currentWifiApiTokenSource: data.wifiSource || 'default',
          currentWifiApiTokenConfigured: !!data.wifiConfigured,
          wifiApiTokenConfigLastUpdated: data.wifiLastUpdated
            ? new Date(data.wifiLastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-'
        });
      })
      .catch(err => {
        console.error('Error loading API token config:', err);
      });

    fetch('/api/i18n')
      .then(response => response.json())
      .then(data => {
        const maintenanceMessages = data && data.maintenanceMessages && typeof data.maintenanceMessages === 'object'
          ? data.maintenanceMessages
          : {};
        const adminTranslations = data && data.adminTranslations && typeof data.adminTranslations === 'object'
          ? data.adminTranslations
          : {};
        const languages = Array.from(new Set([
          ...Object.keys(defaultAdminTranslations || {}),
          ...Object.keys(maintenanceMessages || {}),
          ...Object.keys(adminTranslations || {})
        ])).map((language) => String(language || '').trim().toLowerCase()).filter(Boolean).sort();

        this.setState((prevState) => {
          const previouslySelectedLanguage = String(prevState.translationLanguage || '').trim().toLowerCase();
          const nextSelectedLanguage = languages.includes(previouslySelectedLanguage)
            ? previouslySelectedLanguage
            : (languages[0] || 'en');

          return {
            currentMaintenanceTranslations: maintenanceMessages,
            maintenanceTranslationsText: JSON.stringify(maintenanceMessages, null, 2),
            currentAdminTranslations: adminTranslations,
            adminTranslationsText: JSON.stringify(
              Object.keys(adminTranslations).length > 0 ? adminTranslations : defaultAdminTranslations,
              null,
              2
            ),
            translationLanguage: nextSelectedLanguage,
            i18nLastUpdated: data.lastUpdated
              ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
              : '-'
          };
        });
      })
      .catch(err => {
        console.error('Error loading i18n config:', err);
      });
    
    // Load Colors config
    fetch('/api/colors')
      .then(response => response.json())
      .then(data => {
        this.setState({
          bookingButtonColor: data.bookingButtonColor || '#334155',
          currentBookingButtonColor: data.bookingButtonColor || '#334155',
          statusAvailableColor: data.statusAvailableColor || '#22c55e',
          currentStatusAvailableColor: data.statusAvailableColor || '#22c55e',
          statusBusyColor: data.statusBusyColor || '#ef4444',
          currentStatusBusyColor: data.statusBusyColor || '#ef4444',
          statusUpcomingColor: data.statusUpcomingColor || '#f59e0b',
          currentStatusUpcomingColor: data.statusUpcomingColor || '#f59e0b',
          statusNotFoundColor: data.statusNotFoundColor || '#6b7280',
          currentStatusNotFoundColor: data.statusNotFoundColor || '#6b7280',
          colorsLastUpdated: data.lastUpdated 
            ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-'
        });
      })
      .catch(err => {
        console.error('Error loading colors config:', err);
      });
    
    // Load MQTT config
    this.loadMqttConfig();
    this.loadMqttStatus();
  }

  handleWiFiSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { apiToken, ssid, password } = this.state;
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }
    
    fetch('/api/wifi', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ ssid, password })
    })
    .then(response => {
      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        throw new Error(t.errorUnauthorized);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        this.setState({
          wifiMessage: t.wifiSuccessMessage,
          wifiMessageType: 'success'
        });
        this.loadCurrentConfig();
        
        setTimeout(() => {
          this.setState({ wifiMessage: null, wifiMessageType: null });
        }, 5000);
      } else {
        this.setState({
          wifiMessage: `${t.errorPrefix} ${data.error || t.errorUnknown}`,
          wifiMessageType: 'error'
        });
      }
    })
    .catch(err => {
      this.setState({
        wifiMessage: `${t.errorPrefix} ${err.message}`,
        wifiMessageType: 'error'
      });
    });
  }

  handleLogoSubmit = async (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { apiToken, logoDarkUrl, logoLightUrl, logoDarkFile, logoLightFile, uploadMode } = this.state;
    
    const headers = {};
    
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }
    
    try {
      let finalLogoDarkUrl = logoDarkUrl;
      let finalLogoLightUrl = logoLightUrl;
      
      // Handle file uploads
      if (uploadMode === 'file') {
        // Upload dark logo if provided
        if (logoDarkFile) {
          const formData = new FormData();
          formData.append('logo', logoDarkFile);
          formData.append('logoType', 'dark');
          
          const response = await fetch('/api/logo/upload', {
            method: 'POST',
            headers: headers,
            body: formData
          });
          
          if (response.status === 401) {
            this.handleUnauthorizedAccess();
            throw new Error(t.errorUnauthorized);
          }
          
          const data = await response.json();
          if (data.success) {
            finalLogoDarkUrl = data.logoUrl;
          } else {
            throw new Error(data.error || t.errorUnknown);
          }
        }
        
        // Upload light logo if provided
        if (logoLightFile) {
          const formData = new FormData();
          formData.append('logo', logoLightFile);
          formData.append('logoType', 'light');
          
          const response = await fetch('/api/logo/upload', {
            method: 'POST',
            headers: headers,
            body: formData
          });
          
          if (response.status === 401) {
            this.handleUnauthorizedAccess();
            throw new Error(t.errorUnauthorized);
          }
          
          const data = await response.json();
          if (data.success) {
            finalLogoLightUrl = data.logoUrl;
          } else {
            throw new Error(data.error || t.errorUnknown);
          }
        }
        
        if (!logoDarkFile && !logoLightFile) {
          throw new Error('Please select at least one logo file to upload');
        }
      }
      
      // Update logo configuration with URLs (either from input or from uploads)
      headers['Content-Type'] = 'application/json';
      
      const response = await fetch('/api/logo', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ 
          logoDarkUrl: finalLogoDarkUrl, 
          logoLightUrl: finalLogoLightUrl 
        })
      });
      
      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        throw new Error(t.errorUnauthorized);
      }
      
      const data = await response.json();
      
      if (data.success) {
        this.setState({
          logoMessage: t.logoSuccessMessage,
          logoMessageType: 'success',
          logoDarkFile: null,
          logoLightFile: null
        });
        this.loadCurrentConfig();
        
        // Reset file inputs
        const darkFileInput = document.getElementById('logoDarkFile');
        const lightFileInput = document.getElementById('logoLightFile');
        if (darkFileInput) darkFileInput.value = '';
        if (lightFileInput) lightFileInput.value = '';
        
        setTimeout(() => {
          this.setState({ logoMessage: null, logoMessageType: null });
        }, 5000);
      } else {
        throw new Error(data.error || t.errorUnknown);
      }
    } catch (err) {
      this.setState({
        logoMessage: `${t.errorPrefix} ${err.message}`,
        logoMessageType: 'error'
      });
    }
  }

  handleSidebarSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const {
      apiToken,
      showWiFi,
      showUpcomingMeetings,
      showMeetingTitles,
      minimalHeaderStyle,
      upcomingMeetingsCount,
      singleRoomDarkMode,
      flightboardDarkMode,
      sidebarTargetClientId
    } = this.state;
    const sanitizedUpcomingMeetingsCount = Number.isFinite(Number(upcomingMeetingsCount))
      ? Math.min(Math.max(parseInt(upcomingMeetingsCount, 10), 1), 10)
      : 3;
    const targetClientId = String(sidebarTargetClientId || '').trim();
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }
    
    const payload = targetClientId
      ? {
          targetClientId,
          singleRoomDarkMode
        }
      : {
          showWiFi,
          showUpcomingMeetings,
          showMeetingTitles,
          minimalHeaderStyle,
          upcomingMeetingsCount: sanitizedUpcomingMeetingsCount,
          singleRoomDarkMode,
          flightboardDarkMode
        };

    fetch('/api/sidebar', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        throw new Error(t.errorUnauthorized);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        this.setState({
          informationMessage: t.sidebarSuccessMessage,
          informationMessageType: 'success'
        });
        this.loadCurrentConfig();
        
        setTimeout(() => {
          this.setState({ informationMessage: null, informationMessageType: null });
        }, 5000);
      } else {
        this.setState({
          informationMessage: `${t.errorPrefix} ${data.error || t.errorUnknown}`,
          informationMessageType: 'error'
        });
      }
    })
    .catch(err => {
      this.setState({
        informationMessage: `${t.errorPrefix} ${err.message}`,
        informationMessageType: 'error'
      });
    });
  }

  handleBookingSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const {
      apiToken,
      enableBooking,
      enableExtendMeeting,
      bookingButtonColor,
      checkInEnabled,
      checkInRequiredForExternalMeetings,
      checkInEarlyMinutes,
      checkInWindowMinutes,
      checkInAutoReleaseNoShow,
      roomFeatureFlags,
      roomGroupFeatureFlags
    } = this.state;
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }
    
    fetch('/api/booking-config', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        enableBooking,
        enableExtendMeeting,
        buttonColor: bookingButtonColor,
        checkIn: {
          enabled: !!checkInEnabled,
          requiredForExternalMeetings: !!checkInRequiredForExternalMeetings,
          earlyCheckInMinutes: Math.max(parseInt(checkInEarlyMinutes, 10) || 0, 0),
          windowMinutes: Math.max(parseInt(checkInWindowMinutes, 10) || 1, 1),
          autoReleaseNoShow: !!checkInAutoReleaseNoShow
        },
        roomFeatureFlags,
        roomGroupFeatureFlags
      })
    })
    .then(response => {
      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        throw new Error(t.errorUnauthorized);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        this.setState({
          bookingMessage: t.bookingSuccessMessage,
          bookingMessageType: 'success'
        });
        this.loadCurrentConfig();
        
        setTimeout(() => {
          this.setState({ bookingMessage: null, bookingMessageType: null });
        }, 5000);
      } else {
        this.setState({
          bookingMessage: `${t.errorPrefix} ${data.error || t.errorUnknown}`,
          bookingMessageType: 'error'
        });
      }
    })
    .catch(err => {
      this.setState({
        bookingMessage: `${t.errorPrefix} ${err.message}`,
        bookingMessageType: 'error'
      });
    });
  }

  normalizeOverrideKey = (value) => String(value || '').trim().toLowerCase();

  handleOverrideDraftChange = (scope, value) => {
    if (scope === 'group') {
      this.setState({ newRoomGroupOverrideKey: value });
      return;
    }
    this.setState({ newRoomOverrideKey: value });
  }

  handleAddOverride = (scope) => {
    const t = this.getTranslations();
    const draftValue = scope === 'group' ? this.state.newRoomGroupOverrideKey : this.state.newRoomOverrideKey;
    const normalizedKey = this.normalizeOverrideKey(draftValue);

    if (!normalizedKey) {
      this.setState({
        bookingMessage: `${t.errorPrefix} ${t.overrideKeyRequiredLabel || 'Bitte einen Schlüssel eingeben.'}`,
        bookingMessageType: 'error'
      });
      return;
    }

    this.setState((prevState) => {
      const targetKey = scope === 'group' ? 'roomGroupFeatureFlags' : 'roomFeatureFlags';
      const existing = { ...(prevState[targetKey] || {}) };
      if (!existing[normalizedKey]) {
        existing[normalizedKey] = {};
      }

      return {
        [targetKey]: existing,
        newRoomOverrideKey: scope === 'room' ? '' : prevState.newRoomOverrideKey,
        newRoomGroupOverrideKey: scope === 'group' ? '' : prevState.newRoomGroupOverrideKey,
        bookingMessage: null,
        bookingMessageType: null
      };
    });
  }

  handleRemoveOverride = (scope, key) => {
    this.setState((prevState) => {
      const targetKey = scope === 'group' ? 'roomGroupFeatureFlags' : 'roomFeatureFlags';
      const next = { ...(prevState[targetKey] || {}) };
      delete next[key];
      return { [targetKey]: next };
    });
  }

  handleOverrideStateChange = (scope, key, field, stateValue) => {
    const parsedValue = fromOverrideState(stateValue);

    this.setState((prevState) => {
      const targetKey = scope === 'group' ? 'roomGroupFeatureFlags' : 'roomFeatureFlags';
      const next = { ...(prevState[targetKey] || {}) };
      const nextEntry = {
        ...(next[key] || {}),
        [field]: parsedValue
      };

      if (nextEntry.enableBooking === undefined && nextEntry.enableExtendMeeting === undefined) {
        delete next[key];
      } else {
        next[key] = nextEntry;
      }

      return { [targetKey]: next };
    });
  }

  handleMaintenanceSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { apiToken, maintenanceEnabled, maintenanceMessage } = this.state;

    const headers = {
      'Content-Type': 'application/json',
    };

    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

    fetch('/api/maintenance', {
      method: 'POST',
      headers,
      body: JSON.stringify({ enabled: maintenanceEnabled, message: maintenanceMessage })
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          throw new Error(t.errorUnauthorized);
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          throw new Error(data.error || t.errorUnknown);
        }

        this.setState({
          maintenanceMessageBanner: t.maintenanceSuccessMessage,
          maintenanceMessageType: 'success'
        });
        this.loadCurrentConfig();
      })
      .catch(err => {
        this.setState({
          maintenanceMessageBanner: `${t.errorPrefix} ${err.message}`,
          maintenanceMessageType: 'error'
        });
      });
  }

  handleSystemSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const {
      apiToken,
      systemStartupValidationStrict,
      systemExposeDetailedErrors,
      systemHstsMaxAge,
      systemRateLimitMaxBuckets,
      systemDisplayTrackingMode,
      systemDisplayTrackingRetentionHours,
      systemDisplayTrackingCleanupMinutes
    } = this.state;

    const headers = {
      'Content-Type': 'application/json',
    };

    if (apiToken) {
      headers.Authorization = `Bearer ${apiToken}`;
    }

    fetch('/api/system-config', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        startupValidationStrict: !!systemStartupValidationStrict,
        exposeDetailedErrors: !!systemExposeDetailedErrors,
        hstsMaxAge: Math.max(parseInt(systemHstsMaxAge, 10) || 0, 0),
        rateLimitMaxBuckets: Math.max(parseInt(systemRateLimitMaxBuckets, 10) || 1000, 1000),
        displayTrackingMode: systemDisplayTrackingMode,
        displayTrackingRetentionHours: Math.max(Math.min(parseInt(systemDisplayTrackingRetentionHours, 10) || 2, 168), 1),
        displayTrackingCleanupMinutes: Math.max(Math.min(parseInt(systemDisplayTrackingCleanupMinutes, 10) || 5, 60), 0)
      })
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          throw new Error(t.errorUnauthorized);
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          throw new Error(data.error || t.errorUnknown);
        }

        this.setState({
          systemMessage: t.systemConfigUpdateSuccess || 'System configuration updated successfully.',
          systemMessageType: 'success'
        });
        this.loadCurrentConfig();

        setTimeout(() => {
          this.setState({ systemMessage: null, systemMessageType: null });
        }, 5000);
      })
      .catch(err => {
        this.setState({
          systemMessage: `${t.errorPrefix} ${err.message}`,
          systemMessageType: 'error'
        });
      });
  }

  handleGraphRuntimeSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const {
      apiToken,
      systemGraphWebhookEnabled,
      systemGraphWebhookClientState,
      systemGraphWebhookAllowedIps,
      systemGraphFetchTimeoutMs,
      systemGraphFetchRetryAttempts,
      systemGraphFetchRetryBaseMs
    } = this.state;

    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiToken) {
      headers.Authorization = `Bearer ${apiToken}`;
    }

    const webhookAllowedIps = String(systemGraphWebhookAllowedIps || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    fetch('/api/system-config', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        graphWebhookEnabled: !!systemGraphWebhookEnabled,
        graphWebhookClientState: String(systemGraphWebhookClientState || '').trim(),
        graphWebhookAllowedIps: webhookAllowedIps,
        graphFetchTimeoutMs: Math.max(parseInt(systemGraphFetchTimeoutMs, 10) || 1000, 1000),
        graphFetchRetryAttempts: Math.max(parseInt(systemGraphFetchRetryAttempts, 10) || 0, 0),
        graphFetchRetryBaseMs: Math.max(parseInt(systemGraphFetchRetryBaseMs, 10) || 50, 50)
      })
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          throw new Error(t.errorUnauthorized);
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          throw new Error(data.error || t.errorUnknown);
        }

        this.setState({
          graphRuntimeMessage: t.graphRuntimeUpdateSuccess || 'Graph runtime configuration updated successfully.',
          graphRuntimeMessageType: 'success'
        });
        this.loadCurrentConfig();

        setTimeout(() => {
          this.setState({ graphRuntimeMessage: null, graphRuntimeMessageType: null });
        }, 5000);
      })
      .catch(err => {
        this.setState({
          graphRuntimeMessage: `${t.errorPrefix} ${err.message}`,
          graphRuntimeMessageType: 'error'
        });
      });
  }

  handleTranslationApiSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const {
      apiToken,
      translationApiEnabled,
      translationApiUrl,
      translationApiTimeoutMs,
      translationApiApiKey
    } = this.state;

    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiToken) {
      headers.Authorization = `Bearer ${apiToken}`;
    }

    const payload = {
      enabled: !!translationApiEnabled,
      url: String(translationApiUrl || '').trim(),
      timeoutMs: Math.max(parseInt(translationApiTimeoutMs, 10) || 3000, 3000)
    };

    if (String(translationApiApiKey || '').trim()) {
      payload.apiKey = String(translationApiApiKey || '').trim();
    }

    fetch('/api/translation-api-config', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          throw new Error(t.errorUnauthorized);
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          throw new Error(data.error || t.errorUnknown);
        }

        this.setState({
          translationApiMessage: t.translationApiSuccessMessage || 'Translation API configuration updated successfully.',
          translationApiMessageType: 'success',
          translationApiApiKey: ''
        });
        this.loadCurrentConfig();

        setTimeout(() => {
          this.setState({ translationApiMessage: null, translationApiMessageType: null });
        }, 5000);
      })
      .catch(err => {
        this.setState({
          translationApiMessage: `${t.errorPrefix} ${err.message}`,
          translationApiMessageType: 'error'
        });
      });
  }

  handleOAuthSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { apiToken, oauthClientId, oauthAuthority, oauthClientSecret } = this.state;

    const headers = {
      'Content-Type': 'application/json',
    };

    if (apiToken) {
      headers.Authorization = `Bearer ${apiToken}`;
    }

    fetch('/api/oauth-config', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        clientId: String(oauthClientId || '').trim(),
        tenantId: String(oauthAuthority || '').trim(),
        clientSecret: oauthClientSecret
      })
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          throw new Error(t.errorUnauthorized);
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          throw new Error(data.error || t.errorUnknown);
        }

        this.setState({
          oauthMessage: t.oauthConfigUpdateSuccess || 'OAuth configuration updated successfully.',
          oauthMessageType: 'success',
          oauthClientSecret: '',
          oauthFormDirty: false
        });

        this.loadCurrentConfig();

        setTimeout(() => {
          this.setState({ oauthMessage: null, oauthMessageType: null });
        }, 5000);
      })
      .catch(err => {
        this.setState({
          oauthMessage: `${t.errorPrefix} ${err.message}`,
          oauthMessageType: 'error'
        });
      });
  }

  handleApiTokenSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { apiToken, newApiToken, newApiTokenConfirm } = this.state;
    const trimmedNewToken = String(newApiToken || '').trim();
    const trimmedConfirmToken = String(newApiTokenConfirm || '').trim();

    if (!trimmedNewToken || trimmedNewToken.length < 8) {
      this.setState({
        apiTokenConfigMessage: `${t.errorPrefix} ${t.apiTokenConfigMinLengthError || 'API token must have at least 8 characters.'}`,
        apiTokenConfigMessageType: 'error'
      });
      return;
    }

    if (trimmedNewToken !== trimmedConfirmToken) {
      this.setState({
        apiTokenConfigMessage: `${t.errorPrefix} ${t.apiTokenConfigMismatchError || 'New API token and confirmation do not match.'}`,
        apiTokenConfigMessageType: 'error'
      });
      return;
    }

    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiToken) {
      headers.Authorization = `Bearer ${apiToken}`;
    }

    fetch('/api/api-token-config', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        newToken: trimmedNewToken
      })
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          throw new Error(t.errorUnauthorized);
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          throw new Error(data.error || t.errorUnknown);
        }

        this.setState({
          apiToken: '',
          newApiToken: '',
          newApiTokenConfirm: '',
          apiTokenConfigMessage: t.apiTokenConfigUpdateSuccess || 'API token updated successfully.',
          apiTokenConfigMessageType: 'success'
        });

        this.loadConfigLocks();
        this.loadCurrentConfig();
      })
      .catch(err => {
        this.setState({
          apiTokenConfigMessage: `${t.errorPrefix} ${err.message}`,
          apiTokenConfigMessageType: 'error'
        });
      });
  }

  handleWiFiApiTokenSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { apiToken, newWifiApiToken, newWifiApiTokenConfirm } = this.state;
    const trimmedNewToken = String(newWifiApiToken || '').trim();
    const trimmedConfirmToken = String(newWifiApiTokenConfirm || '').trim();

    if (!trimmedNewToken || trimmedNewToken.length < 8) {
      this.setState({
        wifiApiTokenConfigMessage: `${t.errorPrefix} ${t.apiTokenConfigMinLengthError || 'API token must have at least 8 characters.'}`,
        wifiApiTokenConfigMessageType: 'error'
      });
      return;
    }

    if (trimmedNewToken !== trimmedConfirmToken) {
      this.setState({
        wifiApiTokenConfigMessage: `${t.errorPrefix} ${t.apiTokenConfigMismatchError || 'New API token and confirmation do not match.'}`,
        wifiApiTokenConfigMessageType: 'error'
      });
      return;
    }

    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiToken) {
      headers.Authorization = `Bearer ${apiToken}`;
    }

    fetch('/api/api-token-config', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        newWifiToken: trimmedNewToken
      })
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          throw new Error(t.errorUnauthorized);
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          throw new Error(data.error || t.errorUnknown);
        }

        this.setState({
          newWifiApiToken: '',
          newWifiApiTokenConfirm: '',
          wifiApiTokenConfigMessage: t.wifiApiTokenConfigUpdateSuccess || 'WiFi API token updated successfully.',
          wifiApiTokenConfigMessageType: 'success'
        });

        this.loadConfigLocks();
        this.loadCurrentConfig();
      })
      .catch(err => {
        this.setState({
          wifiApiTokenConfigMessage: `${t.errorPrefix} ${err.message}`,
          wifiApiTokenConfigMessageType: 'error'
        });
      });
  }

  handleSearchSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const {
      apiToken,
      searchUseGraphAPI,
      searchMaxDays,
      searchMaxRoomLists,
      searchMaxRooms,
      searchMaxItems,
      searchPollIntervalMs
    } = this.state;

    const headers = {
      'Content-Type': 'application/json',
    };

    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

    fetch('/api/search-config', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        useGraphAPI: !!searchUseGraphAPI,
        maxDays: Math.max(parseInt(searchMaxDays, 10) || 1, 1),
        maxRoomLists: Math.max(parseInt(searchMaxRoomLists, 10) || 1, 1),
        maxRooms: Math.max(parseInt(searchMaxRooms, 10) || 1, 1),
        maxItems: Math.max(parseInt(searchMaxItems, 10) || 1, 1),
        pollIntervalMs: Math.max(parseInt(searchPollIntervalMs, 10) || 5000, 5000)
      })
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          throw new Error(t.errorUnauthorized);
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          throw new Error(data.error || t.errorUnknown);
        }

        this.setState({
          searchMessage: 'Search configuration updated successfully.',
          searchMessageType: 'success'
        });
        this.loadCurrentConfig();

        setTimeout(() => {
          this.setState({ searchMessage: null, searchMessageType: null });
        }, 5000);
      })
      .catch(err => {
        this.setState({
          searchMessage: `${t.errorPrefix} ${err.message}`,
          searchMessageType: 'error'
        });
      });
  }

  handleRateLimitSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const {
      apiToken,
      rateLimitApiWindowMs,
      rateLimitApiMax,
      rateLimitWriteWindowMs,
      rateLimitWriteMax,
      rateLimitAuthWindowMs,
      rateLimitAuthMax
    } = this.state;

    const headers = {
      'Content-Type': 'application/json',
    };

    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

    fetch('/api/rate-limit-config', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        apiWindowMs: Math.max(parseInt(rateLimitApiWindowMs, 10) || 1000, 1000),
        apiMax: Math.max(parseInt(rateLimitApiMax, 10) || 1, 1),
        writeWindowMs: Math.max(parseInt(rateLimitWriteWindowMs, 10) || 1000, 1000),
        writeMax: Math.max(parseInt(rateLimitWriteMax, 10) || 1, 1),
        authWindowMs: Math.max(parseInt(rateLimitAuthWindowMs, 10) || 1000, 1000),
        authMax: Math.max(parseInt(rateLimitAuthMax, 10) || 1, 1)
      })
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          throw new Error(t.errorUnauthorized);
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          throw new Error(data.error || t.errorUnknown);
        }

        this.setState({
          rateLimitMessage: 'Rate limit configuration updated successfully.',
          rateLimitMessageType: 'success'
        });
        this.loadCurrentConfig();

        setTimeout(() => {
          this.setState({ rateLimitMessage: null, rateLimitMessageType: null });
        }, 5000);
      })
      .catch(err => {
        this.setState({
          rateLimitMessage: `${t.errorPrefix} ${err.message}`,
          rateLimitMessageType: 'error'
        });
      });
  }

  handleExportBackup = () => {
    const t = this.getTranslations();
    const { apiToken } = this.state;
    const headers = {};

    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

    fetch('/api/config/backup', {
      method: 'GET',
      headers
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          throw new Error(t.errorUnauthorized);
        }
        return response.json();
      })
      .then(data => {
        this.setState({
          backupPayloadText: JSON.stringify(data, null, 2),
          backupMessage: t.backupSuccessExport,
          backupMessageType: 'success'
        });
      })
      .catch(err => {
        this.setState({
          backupMessage: `${t.errorPrefix} ${err.message}`,
          backupMessageType: 'error'
        });
      });
  }

  handleImportBackup = () => {
    const t = this.getTranslations();
    const { apiToken, backupPayloadText } = this.state;
    const headers = {
      'Content-Type': 'application/json',
    };

    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

    let parsed;
    try {
      parsed = JSON.parse(backupPayloadText || '{}');
    } catch (error) {
      this.setState({
        backupMessage: `${t.errorPrefix} ${error.message}`,
        backupMessageType: 'error'
      });
      return;
    }

    fetch('/api/config/restore', {
      method: 'POST',
      headers,
      body: JSON.stringify(parsed)
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          throw new Error(t.errorUnauthorized);
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          throw new Error(data.error || t.errorUnknown);
        }

        this.setState({
          backupMessage: t.backupSuccessImport,
          backupMessageType: 'success'
        });
        this.loadCurrentConfig();
      })
      .catch(err => {
        this.setState({
          backupMessage: `${t.errorPrefix} ${err.message}`,
          backupMessageType: 'error'
        });
      });
  }

  handleLoadAuditLogs = () => {
    const t = this.getTranslations();
    const { apiToken } = this.state;
    const headers = {};

    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

    fetch('/api/audit-logs?limit=200', {
      method: 'GET',
      headers
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          throw new Error(t.errorUnauthorized);
        }
        return response.json();
      })
      .then(data => {
        this.setState({
          auditLogs: Array.isArray(data.logs) ? data.logs : [],
          auditMessage: null,
          auditMessageType: null
        });
      })
      .catch(err => {
        this.setState({
          auditMessage: `${t.errorPrefix} ${err.message}`,
          auditMessageType: 'error'
        });
      });
  }

  handleLoadConnectedDisplays = () => {
    const t = this.getTranslations();
    const { apiToken } = this.state;
    const headers = {};

    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

    this.setState({ connectedDisplaysLoading: true });

    fetch('/api/displays', {
      method: 'GET',
      headers
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          throw new Error(t.errorUnauthorized);
        }
        return response.json();
      })
      .then(data => {
        this.setState({
          connectedDisplays: Array.isArray(data.displays) ? data.displays : [],
          connectedDisplaysMessage: null,
          connectedDisplaysMessageType: null,
          connectedDisplaysLoading: false
        });
      })
      .catch(err => {
        this.setState({
          connectedDisplaysMessage: `${t.errorPrefix} ${err.message}`,
          connectedDisplaysMessageType: 'error',
          connectedDisplaysLoading: false
        });
      });
  }

  handleDeleteDisplay = (clientId) => {
    const t = this.getTranslations();
    
    if (!window.confirm(t.connectedDisplaysDeleteConfirm || 'Are you sure you want to remove this display?')) {
      return;
    }

    const { apiToken } = this.state;
    const headers = {};

    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

    fetch(`/api/connected-clients/${encodeURIComponent(clientId)}`, {
      method: 'DELETE',
      headers
    })
      .then(response => {
        if (response.status === 401) {
          this.handleUnauthorizedAccess();
          throw new Error(t.errorUnauthorized);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          this.setState({
            connectedDisplaysMessage: t.connectedDisplaysDeleteSuccess || 'Display removed successfully.',
            connectedDisplaysMessageType: 'success'
          });
          // Reload the list
          this.handleLoadConnectedDisplays();
        } else {
          throw new Error(data.error || t.connectedDisplaysDeleteError);
        }
      })
      .catch(err => {
        this.setState({
          connectedDisplaysMessage: `${t.errorPrefix} ${err.message}`,
          connectedDisplaysMessageType: 'error'
        });
      });
  }

  handleOpenPowerManagementModal = async (clientId) => {
    const { apiToken } = this.state;
    const t = this.getTranslations();
    
    try {
      let config;
      
      if (clientId === '__global__') {
        // Fetch global power management config
        const response = await fetch('/api/power-management', {
          headers: {
            'Authorization': `Bearer ${apiToken}`
          }
        });
        const data = await response.json();
        config = data.global || {
          mode: 'browser',
          schedule: {
            enabled: false,
            startTime: '20:00',
            endTime: '07:00',
            weekendMode: false
          }
        };
      } else {
        // Fetch display-specific power management config
        const response = await fetch(`/api/power-management/${encodeURIComponent(clientId)}`);
        config = await response.json();
      }
      
      this.setState({
        showPowerManagementModal: true,
        powerManagementClientId: clientId,
        powerManagementMode: config.mode || 'browser',
        powerManagementMqttHostname: config.mqttHostname || '',
        powerManagementScheduleEnabled: config.schedule?.enabled || false,
        powerManagementStartTime: config.schedule?.startTime || '20:00',
        powerManagementEndTime: config.schedule?.endTime || '07:00',
        powerManagementWeekendMode: config.schedule?.weekendMode || false,
        powerManagementMessage: null
      });
    } catch (err) {
      console.error('Error loading power management config:', err);
      // Open modal with defaults
      this.setState({
        showPowerManagementModal: true,
        powerManagementClientId: clientId,
        powerManagementMode: 'browser',
        powerManagementMqttHostname: '',
        powerManagementScheduleEnabled: false,
        powerManagementStartTime: '20:00',
        powerManagementEndTime: '07:00',
        powerManagementWeekendMode: false,
        powerManagementMessage: null
      });
    }
  }

  handleClosePowerManagementModal = () => {
    this.setState({
      showPowerManagementModal: false,
      powerManagementClientId: null,
      powerManagementMessage: null
    });
  }

  handleSavePowerManagement = async () => {
    const t = this.getTranslations();
    const {
      apiToken,
      powerManagementClientId,
      powerManagementMode,
      powerManagementMqttHostname,
      powerManagementScheduleEnabled,
      powerManagementStartTime,
      powerManagementEndTime,
      powerManagementWeekendMode
    } = this.state;

    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

    try {
      let url, method;
      
      if (powerManagementClientId === '__global__') {
        // Update global config
        url = '/api/power-management';
        method = 'POST';
      } else {
        // Update display-specific config
        url = `/api/power-management/${encodeURIComponent(powerManagementClientId)}`;
        method = 'POST';
      }
      
      const payload = {
        mode: powerManagementMode,
        schedule: {
          enabled: powerManagementScheduleEnabled,
          startTime: powerManagementStartTime,
          endTime: powerManagementEndTime,
          weekendMode: powerManagementWeekendMode
        }
      };
      
      // Add MQTT hostname if mode is mqtt
      if (powerManagementMode === 'mqtt') {
        payload.mqttHostname = powerManagementMqttHostname || '';
      }
      
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        throw new Error(t.errorUnauthorized);
      }

      const data = await response.json();

      if (data.success) {
        this.setState({
          powerManagementMessage: t.powerManagementSaveSuccess || 'Power management configuration saved successfully.',
          powerManagementMessageType: 'success'
        });
        
        // Close modal after 2 seconds
        setTimeout(() => {
          this.handleClosePowerManagementModal();
        }, 2000);
      } else {
        throw new Error(data.error || t.powerManagementSaveError);
      }
    } catch (err) {
      this.setState({
        powerManagementMessage: `${t.errorPrefix} ${err.message}`,
        powerManagementMessageType: 'error'
      });
    }
  }

  handleMqttConfigSubmit = async (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { apiToken } = this.state;

    this.setState({ mqttConfigSaving: true, mqttConfigMessage: null });

    try {
      const response = await fetch('/api/mqtt-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          enabled: this.state.mqttEnabled || false,
          brokerUrl: this.state.mqttBrokerUrl || 'mqtt://localhost:1883',
          authentication: this.state.mqttAuthentication || false,
          username: this.state.mqttUsername || '',
          password: this.state.mqttPassword || '',
          discovery: this.state.mqttDiscovery || ''
        })
      });

      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        throw new Error(t.errorUnauthorized);
      }

      const data = await response.json();

      if (data.success) {
        this.setState({
          mqttConfigMessage: t.mqttConfigUpdateSuccess || 'MQTT configuration updated successfully.',
          mqttConfigMessageType: 'success',
          mqttConfigSaving: false
        });
        
        // Reload MQTT status
        this.loadMqttStatus();
      } else {
        throw new Error(data.error || t.mqttConfigUpdateError);
      }
    } catch (err) {
      this.setState({
        mqttConfigMessage: `${t.errorPrefix} ${err.message}`,
        mqttConfigMessageType: 'error',
        mqttConfigSaving: false
      });
    }
  }

  loadMqttConfig = async () => {
    const { apiToken } = this.state;

    try {
      const response = await fetch('/api/mqtt-config', {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.setState({
          mqttEnabled: data.enabled || false,
          mqttBrokerUrl: data.brokerUrl || 'mqtt://localhost:1883',
          mqttAuthentication: data.authentication || false,
          mqttUsername: data.username || '',
          mqttPassword: data.password || '',
          mqttDiscovery: data.discovery || ''
        });
      }
    } catch (err) {
      console.error('Failed to load MQTT config:', err);
    }
  }

  loadMqttStatus = async () => {
    const { apiToken } = this.state;

    try {
      const response = await fetch('/api/mqtt-status', {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.setState({ mqttStatus: data });
      }
    } catch (err) {
      console.error('Failed to load MQTT status:', err);
    }
  }

  handleLoadMqttDisplays = async (startAutoRefresh = false) => {
    const { apiToken } = this.state;
    const t = this.getTranslations();

    this.setState({ mqttDisplaysLoading: true });

    try {
      const response = await fetch('/api/mqtt-displays', {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        this.setState({
          mqttDisplays: data.displays || [],
          mqttDisplaysLoading: false
        });

        // Start auto-refresh if requested and not already running
        if (startAutoRefresh && !this.mqttDisplaysInterval) {
          console.log('[MQTT] Starting auto-refresh interval');
          this.mqttDisplaysInterval = setInterval(() => {
            // Only refresh if we're on the MQTT tab
            if (this.state.activeTab === 'mqtt') {
              console.log('[MQTT] Auto-refreshing displays');
              this.handleLoadMqttDisplays(false);
            }
          }, 10000); // Refresh every 10 seconds
        }
      } else {
        throw new Error('Failed to load MQTT displays');
      }
    } catch (err) {
      console.error('Failed to load MQTT displays:', err);
      this.setState({
        mqttDisplays: [],
        mqttDisplaysLoading: false
      });
    }
  }

  handleMqttPowerCommand = async (hostname, powerOn) => {
    const { apiToken } = this.state;
    const t = this.getTranslations();

    try {
      const response = await fetch(`/api/mqtt-power-trigger/${hostname}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          powerState: powerOn,
          brightness: powerOn ? 255 : 0
        })
      });

      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        return;
      }

      if (response.ok) {
        this.setState({
          mqttConfigMessage: t.mqttDisplaysPowerSuccess || 'Power command sent successfully.',
          mqttConfigMessageType: 'success'
        });
        
        // Reload displays after a short delay
        setTimeout(() => {
          this.handleLoadMqttDisplays();
        }, 1000);
      } else {
        throw new Error('Failed to send power command');
      }
    } catch (err) {
      console.error('Failed to send MQTT power command:', err);
      this.setState({
        mqttConfigMessage: `${t.errorPrefix} ${t.mqttDisplaysPowerError || 'Failed to send power command.'}`,
        mqttConfigMessageType: 'error'
      });
    }
  }

  handleMqttBrightnessCommand = async (hostname, brightness) => {
    const { apiToken } = this.state;
    const t = this.getTranslations();

    try {
      const response = await fetch(`/api/mqtt-brightness/${hostname}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({ brightness })
      });

      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        return;
      }

      if (response.ok) {
        console.log(`Brightness set to ${brightness} for ${hostname}`);
      }
    } catch (err) {
      console.error('Failed to send brightness command:', err);
    }
  }

  handleMqttKioskCommand = async (hostname, status) => {
    const { apiToken } = this.state;
    const t = this.getTranslations();

    try {
      const response = await fetch(`/api/mqtt-kiosk/${hostname}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({ status })
      });

      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        return;
      }

      if (response.ok) {
        this.setState({
          mqttConfigMessage: `Kiosk mode set to ${status}`,
          mqttConfigMessageType: 'success'
        });
        setTimeout(() => this.handleLoadMqttDisplays(), 1000);
      }
    } catch (err) {
      console.error('Failed to send kiosk command:', err);
    }
  }

  handleMqttThemeCommand = async (hostname, theme) => {
    const { apiToken } = this.state;

    try {
      const response = await fetch(`/api/mqtt-theme/${hostname}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({ theme })
      });

      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        return;
      }

      if (response.ok) {
        this.setState({
          mqttConfigMessage: `Theme set to ${theme}`,
          mqttConfigMessageType: 'success'
        });
        setTimeout(() => this.handleLoadMqttDisplays(), 1000);
      }
    } catch (err) {
      console.error('Failed to send theme command:', err);
    }
  }

  handleMqttVolumeCommand = async (hostname, volume) => {
    const { apiToken } = this.state;

    try {
      const response = await fetch(`/api/mqtt-volume/${hostname}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({ volume })
      });

      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        return;
      }

      if (response.ok) {
        console.log(`Volume set to ${volume} for ${hostname}`);
      }
    } catch (err) {
      console.error('Failed to send volume command:', err);
    }
  }

  handleMqttPageZoomCommand = async (hostname, zoom) => {
    const { apiToken } = this.state;

    try {
      const response = await fetch(`/api/mqtt-page-zoom/${hostname}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({ zoom })
      });

      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        return;
      }

      if (response.ok) {
        console.log(`Page zoom set to ${zoom}% for ${hostname}`);
      }
    } catch (err) {
      console.error('Failed to send page zoom command:', err);
    }
  }

  handleMqttRefreshCommand = async (hostname) => {
    const { apiToken } = this.state;
    const t = this.getTranslations();

    try {
      const response = await fetch(`/api/mqtt-refresh/${hostname}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        return;
      }

      if (response.ok) {
        this.setState({
          connectedDisplaysMessage: `Refresh command sent to ${hostname}`,
          connectedDisplaysMessageType: 'success',
          mqttConfigMessage: 'Refresh command sent',
          mqttConfigMessageType: 'success'
        });
        // Clear message after 3 seconds
        setTimeout(() => {
          this.setState({
            connectedDisplaysMessage: null,
            connectedDisplaysMessageType: null
          });
        }, 3000);
      }
    } catch (err) {
      console.error('Failed to send refresh command:', err);
      this.setState({
        connectedDisplaysMessage: `Failed to send refresh command: ${err.message}`,
        connectedDisplaysMessageType: 'error'
      });
    }
  }

  handleMqttRebootCommand = async (hostname) => {
    const { apiToken } = this.state;
    const t = this.getTranslations();

    try {
      const response = await fetch(`/api/mqtt-reboot/${hostname}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        return;
      }

      if (response.ok) {
        this.setState({
          connectedDisplaysMessage: `Reboot command sent to ${hostname}`,
          connectedDisplaysMessageType: 'success',
          mqttConfigMessage: `Reboot command sent to ${hostname}`,
          mqttConfigMessageType: 'success'
        });
        // Clear message after 3 seconds
        setTimeout(() => {
          this.setState({
            connectedDisplaysMessage: null,
            connectedDisplaysMessageType: null
          });
        }, 3000);
      }
    } catch (err) {
      console.error('Failed to send reboot command:', err);
      this.setState({
        connectedDisplaysMessage: `Failed to send reboot command: ${err.message}`,
        connectedDisplaysMessageType: 'error'
      });
    }
  }

  handleMqttShutdownCommand = async (hostname) => {
    const { apiToken } = this.state;
    const t = this.getTranslations();

    try {
      const response = await fetch(`/api/mqtt-shutdown/${hostname}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        return;
      }

      if (response.ok) {
        this.setState({
          mqttConfigMessage: `Shutdown command sent to ${hostname}`,
          mqttConfigMessageType: 'warning'
        });
      }
    } catch (err) {
      console.error('Failed to send shutdown command:', err);
    }
  }

  handleMqttRefreshAll = async () => {
    const { apiToken } = this.state;
    const t = this.getTranslations();

    if (!window.confirm('Refresh all Touchkio displays?')) {
      return;
    }

    try {
      const response = await fetch('/api/mqtt-refresh-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        this.setState({
          connectedDisplaysMessage: data.message || 'Refresh command sent to all displays',
          connectedDisplaysMessageType: 'success',
          mqttConfigMessage: data.message || 'Refresh command sent to all displays',
          mqttConfigMessageType: 'success'
        });
        // Clear message after 3 seconds
        setTimeout(() => {
          this.setState({
            connectedDisplaysMessage: null,
            connectedDisplaysMessageType: null
          });
        }, 3000);
      }
    } catch (err) {
      console.error('Failed to send refresh all command:', err);
      this.setState({
        connectedDisplaysMessage: `Failed to send refresh all command: ${err.message}`,
        connectedDisplaysMessageType: 'error'
      });
    }
  }

  handleMqttRebootAll = async () => {
    const { apiToken } = this.state;
    const t = this.getTranslations();

    if (!window.confirm('⚠️ Reboot ALL Touchkio displays? This will restart all devices!')) {
      return;
    }

    try {
      const response = await fetch('/api/mqtt-reboot-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        this.setState({
          connectedDisplaysMessage: data.message || 'Reboot command sent to all displays',
          connectedDisplaysMessageType: 'warning',
          mqttConfigMessage: data.message || 'Reboot command sent to all displays',
          mqttConfigMessageType: 'warning'
        });
        // Clear message after 3 seconds
        setTimeout(() => {
          this.setState({
            connectedDisplaysMessage: null,
            connectedDisplaysMessageType: null
          });
        }, 3000);
      }
    } catch (err) {
      console.error('Failed to send reboot-all command:', err);
      this.setState({
        connectedDisplaysMessage: `Failed to send reboot-all command: ${err.message}`,
        connectedDisplaysMessageType: 'error',
        mqttConfigMessage: 'Failed to send reboot-all command',
        mqttConfigMessageType: 'error'
      });
    }
  }

  // Touchkio Modal Handlers
  handleOpenTouchkioModal = (display) => {
    this.setState({
      showTouchkioModal: true,
      touchkioModalDisplay: display,
      touchkioModalMessage: null,
      touchkioModalMessageType: null,
      touchkioModalBrightness: undefined,
      touchkioModalVolume: undefined,
      touchkioModalZoom: undefined
    });
  }

  handleCloseTouchkioModal = () => {
    this.setState({
      showTouchkioModal: false,
      touchkioModalDisplay: null,
      touchkioModalMessage: null,
      touchkioModalMessageType: null,
      touchkioModalBrightness: undefined,
      touchkioModalVolume: undefined,
      touchkioModalZoom: undefined
    });
  }

  handleMqttPowerCommandModal = async (hostname, powerOn) => {
    await this.handleMqttPowerCommand(hostname, powerOn);
    this.setState({
      touchkioModalMessage: `Power command sent: ${powerOn ? 'ON' : 'OFF'}`,
      touchkioModalMessageType: 'success'
    });
    setTimeout(() => {
      this.handleLoadMqttDisplays();
      if (this.state.touchkioModalDisplay) {
        const updatedDisplay = this.state.mqttDisplays.find(d => d.hostname === hostname);
        if (updatedDisplay) {
          this.setState({ touchkioModalDisplay: updatedDisplay });
        }
      }
    }, 1000);
  }

  handleMqttBrightnessCommandModal = async (hostname, brightness) => {
    await this.handleMqttBrightnessCommand(hostname, brightness);
    this.setState({
      touchkioModalMessage: `Brightness set to ${brightness}`,
      touchkioModalMessageType: 'success'
    });
  }

  handleMqttKioskCommandModal = async (hostname, status) => {
    await this.handleMqttKioskCommand(hostname, status);
    this.setState({
      touchkioModalMessage: `Kiosk mode set to ${status}`,
      touchkioModalMessageType: 'success'
    });
    setTimeout(() => {
      this.handleLoadMqttDisplays();
      if (this.state.touchkioModalDisplay) {
        const updatedDisplay = this.state.mqttDisplays.find(d => d.hostname === hostname);
        if (updatedDisplay) {
          this.setState({ touchkioModalDisplay: updatedDisplay });
        }
      }
    }, 1000);
  }

  handleMqttThemeCommandModal = async (hostname, theme) => {
    await this.handleMqttThemeCommand(hostname, theme);
    this.setState({
      touchkioModalMessage: `Theme set to ${theme}`,
      touchkioModalMessageType: 'success'
    });
    setTimeout(() => {
      this.handleLoadMqttDisplays();
      if (this.state.touchkioModalDisplay) {
        const updatedDisplay = this.state.mqttDisplays.find(d => d.hostname === hostname);
        if (updatedDisplay) {
          this.setState({ touchkioModalDisplay: updatedDisplay });
        }
      }
    }, 1000);
  }

  handleMqttVolumeCommandModal = async (hostname, volume) => {
    await this.handleMqttVolumeCommand(hostname, volume);
    this.setState({
      touchkioModalMessage: `Volume set to ${volume}%`,
      touchkioModalMessageType: 'success'
    });
  }

  handleMqttPageZoomCommandModal = async (hostname, zoom) => {
    await this.handleMqttPageZoomCommand(hostname, zoom);
    this.setState({
      touchkioModalMessage: `Page zoom set to ${zoom}%`,
      touchkioModalMessageType: 'success'
    });
  }

  handleMqttRefreshCommandModal = async (hostname) => {
    await this.handleMqttRefreshCommand(hostname);
    this.setState({
      touchkioModalMessage: 'Refresh command sent',
      touchkioModalMessageType: 'success'
    });
  }

  handleMqttRebootCommandModal = async (hostname) => {
    await this.handleMqttRebootCommand(hostname);
    this.setState({
      touchkioModalMessage: 'Reboot command sent',
      touchkioModalMessageType: 'warning'
    });
  }

  handleMqttShutdownCommandModal = async (hostname) => {
    await this.handleMqttShutdownCommand(hostname);
    this.setState({
      touchkioModalMessage: 'Shutdown command sent',
      touchkioModalMessageType: 'warning'
    });
  }

  handleI18nSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const {
      maintenanceTranslationsText,
      adminTranslationsText,
      currentMaintenanceTranslations,
      currentAdminTranslations,
      showAdvancedTranslationsEditor
    } = this.state;

    let maintenanceMessages = currentMaintenanceTranslations;
    let adminTranslations = currentAdminTranslations;

    if (showAdvancedTranslationsEditor) {
      try {
        maintenanceMessages = JSON.parse(maintenanceTranslationsText || '{}');
        if (!maintenanceMessages || typeof maintenanceMessages !== 'object' || Array.isArray(maintenanceMessages)) {
          throw new Error('maintenanceMessages must be an object');
        }

        adminTranslations = JSON.parse(adminTranslationsText || '{}');
        if (!adminTranslations || typeof adminTranslations !== 'object' || Array.isArray(adminTranslations)) {
          throw new Error('adminTranslations must be an object');
        }
      } catch (error) {
        this.setState({
          i18nMessage: `${t.errorPrefix} ${error.message}`,
          i18nMessageType: 'error'
        });
        return;
      }
    }

    this.saveI18nConfig(maintenanceMessages, adminTranslations, t.translationsSuccessMessage);
  }

  switchTab = (tabName) => {
    this.setState({
      activeTab: tabName,
      activeSection: TAB_TO_SECTION[tabName] || 'displays'
    });
  }

  switchSection = (sectionName) => {
    const tabs = ADMIN_TAB_SECTIONS[sectionName] || [];
    const fallbackTab = tabs[0] || 'display';

    this.setState((prevState) => {
      const activeTabInSection = tabs.includes(prevState.activeTab)
        ? prevState.activeTab
        : fallbackTab;

      return {
        activeSection: sectionName,
        activeTab: activeTabInSection
      };
    });
  }

  handleColorsSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const { apiToken, bookingButtonColor, statusAvailableColor, statusBusyColor, statusUpcomingColor, statusNotFoundColor } = this.state;
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }
    
    fetch('/api/colors', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ 
        bookingButtonColor, 
        statusAvailableColor, 
        statusBusyColor, 
        statusUpcomingColor,
        statusNotFoundColor
      })
    })
    .then(response => {
      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        throw new Error(t.errorUnauthorized);
      }
      return response.json();
    })
    .then(data => {
      this.setState({
        colorMessage: t.colorsSuccessMessage,
        colorMessageType: 'success',
        currentBookingButtonColor: bookingButtonColor,
        currentStatusAvailableColor: statusAvailableColor,
        currentStatusBusyColor: statusBusyColor,
        currentStatusUpcomingColor: statusUpcomingColor,
        currentStatusNotFoundColor: statusNotFoundColor
      });
      setTimeout(() => this.setState({ colorMessage: null }), 3000);
    })
    .catch(err => {
      this.setState({
        colorMessage: `${t.errorPrefix} ${err.message}`,
        colorMessageType: 'error'
      });
    });
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
      currentMaintenanceEnabled, currentMaintenanceMessage, maintenanceLastUpdated,
      maintenanceEnabled, maintenanceMessage,
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
      currentSystemDisplayTrackingMode, systemDisplayTrackingMode,
      currentSystemDisplayTrackingRetentionHours, systemDisplayTrackingRetentionHours,
      currentSystemDisplayTrackingCleanupMinutes, systemDisplayTrackingCleanupMinutes,
      systemLastUpdated,
      currentTranslationApiEnabled, translationApiEnabled,
      currentTranslationApiUrl, translationApiUrl,
      currentTranslationApiTimeoutMs, translationApiTimeoutMs,
      currentTranslationApiHasApiKey, translationApiApiKey,
      translationApiLastUpdated,
      currentOauthClientId, oauthClientId,
      currentOauthAuthority, oauthAuthority,
      currentOauthHasClientSecret, oauthClientSecret, oauthLastUpdated,
      currentSearchUseGraphAPI, currentSearchMaxDays, currentSearchMaxRoomLists, currentSearchMaxRooms, currentSearchMaxItems, currentSearchPollIntervalMs, searchLastUpdated,
      searchUseGraphAPI, searchMaxDays, searchMaxRoomLists, searchMaxRooms, searchMaxItems, searchPollIntervalMs,
      currentRateLimitApiWindowMs, currentRateLimitApiMax, currentRateLimitWriteWindowMs, currentRateLimitWriteMax, currentRateLimitAuthWindowMs, currentRateLimitAuthMax, rateLimitLastUpdated,
      rateLimitApiWindowMs, rateLimitApiMax, rateLimitWriteWindowMs, rateLimitWriteMax, rateLimitAuthWindowMs, rateLimitAuthMax,
      maintenanceMessageBanner, maintenanceMessageType,
      requiresInitialTokenSetup,
      initialTokenSetupLockedByEnv,
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
      bookingPermissionMissing,
      activeTab,
      activeSection,
      syncStatus,
      syncStatusLoading,
      syncStatusTick
    } = this.state;
    const t = this.getTranslations();
    const booleanLabel = (value) => (value ? (t.yesLabel || 'Yes') : (t.noLabel || 'No'));
    const availableTranslationLanguages = this.getAvailableTranslationLanguages();
    const normalizedSelectedLanguage = String(translationLanguage || '').trim().toLowerCase();
    const activeTranslationLanguage = availableTranslationLanguages.includes(normalizedSelectedLanguage)
      ? normalizedSelectedLanguage
      : (availableTranslationLanguages[0] || 'en');
    const selectedMaintenanceTranslation = currentMaintenanceTranslations?.[activeTranslationLanguage] || {};
    const selectedAdminTranslation = {
      ...(defaultAdminTranslations.en || {}),
      ...(defaultAdminTranslations[activeTranslationLanguage] || {}),
      ...(currentAdminTranslations?.[activeTranslationLanguage] || {})
    };
    const roomOverrideEntries = Object.entries(roomFeatureFlags || {}).sort(([a], [b]) => a.localeCompare(b));
    const roomGroupOverrideEntries = Object.entries(roomGroupFeatureFlags || {}).sort(([a], [b]) => a.localeCompare(b));
    
    // Detect browser language for word order
    const browserLang = navigator.language || navigator.userLanguage;
    const lang = browserLang.split('-')[0];
    const apiTokenSourceLabelMap = {
	  unset: t.apiTokenSourceUnset || 'Not configured',
      default: t.apiTokenSourceDefault || 'Default',
      runtime: t.apiTokenSourceRuntime || 'Admin Runtime',
      env: t.apiTokenSourceEnv || 'Environment (.env)'
    };
    const sectionDefinitions = [
      {
        key: 'displays',
        label: t.displayTabLabel || 'Display',
        tabs: [
          { key: 'display', label: t.displaySubTabLabel || 'Allgemein' },
          { key: 'wifi', label: t.wifiTabLabel || 'WiFi' },
          { key: 'logo', label: t.logoTabLabel || 'Logo' },
          { key: 'colors', label: t.colorsTabLabel || 'Colors' },
          { key: 'booking', label: t.bookingTabLabel || 'Booking' }
        ]
      },
      {
        key: 'operations',
        label: t.operationsTabLabel || 'Operations',
        tabs: [
          { key: 'system', label: 'System' },
          { key: 'translationApi', label: t.translationApiTabLabel || 'Translation API' },
          { key: 'oauth', label: t.oauthTabLabel || 'Graph-API' },
          { key: 'maintenance', label: t.maintenanceTabLabel || 'Wartungsmodus' },
          { key: 'apiToken', label: t.apiTokenTabLabel || 'API-Token' },
          { key: 'search', label: t.searchTabLabel || 'Suche' },
          { key: 'ratelimit', label: t.rateLimitTabLabel || 'Rate-Limits' },
          { key: 'backup', label: t.backupPayloadLabel || 'Backup' },
          { key: 'audit', label: t.auditTabLabel || 'Audit-Log' },
          { key: 'mqtt', label: 'MQTT' },
          { key: 'connectedDisplays', label: t.connectedDisplaysSectionTitle || 'Displays' }
        ]
      },
      {
        key: 'content',
        label: t.translationsTabLabel || 'Translations',
        tabs: [
          { key: 'translations', label: t.translationsTabLabel || 'Translations' }
        ]
      }
    ];
    const selectedSection = sectionDefinitions.find((section) => section.key === activeSection)
      || sectionDefinitions[0];
    const visibleTabs = selectedSection.tabs;

    return (
      <div className="admin-page">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-content">
            <div className="admin-logo">
              <img 
                src={currentLogoLightUrl || "/img/logo-admin.svg"} 
                alt="Logo" 
                onError={(e) => { 
                  // Fallback to admin logo if custom logo fails
                  if (!e.target.src.includes('logo-admin.svg')) {
                    e.target.src = "/img/logo-admin.svg";
                  }
                }} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <h1>{t.title}</h1>
              {this.state.appVersion && (
                <div className="admin-version">
                  Version {this.state.appVersion}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="admin-container">
          {!isAuthenticated && (
            <div className="admin-token-banner" style={{ marginBottom: '2rem' }}>
              <div className="admin-token-content">
                <form onSubmit={this.handleAdminLogin} className="token-input-wrapper">
                  <label htmlFor="apiToken">{t.apiTokenLabel}</label>
                  <input
                    type="password"
                    id="apiToken"
                    value={apiToken}
                    onChange={(e) => this.setState({ apiToken: e.target.value })}
                    placeholder={t.apiTokenPlaceholder}
                    autoComplete="off"
                    disabled={authChecking}
                  />
                  <small>
                    {requiresInitialTokenSetup
                      ? (initialTokenSetupLockedByEnv
                          ? (t.apiTokenHelp || 'Required to update settings')
                          : (t.apiTokenBootstrapHelp || 'No admin token is configured yet. Enter a new token (min. 8 chars) to create the initial admin token.'))
                      : (t.apiTokenHelp || 'Required to update settings')}
                  </small>
                  <button type="submit" className="admin-submit-button admin-login-button" disabled={authChecking}>
                    {authChecking
                      ? (requiresInitialTokenSetup ? (t.apiTokenBootstrapButtonBusy || 'Creating token...') : 'Logging in...')
                      : (requiresInitialTokenSetup ? (t.apiTokenBootstrapButton || 'Create Token') : 'Login')}
                  </button>
                </form>
              </div>
            </div>
          )}

          {!isAuthenticated && authMessage && (
            <div className={`admin-message admin-message-${authMessageType || 'error'}`} style={{ marginBottom: '2rem' }}>
              {authMessage}
            </div>
          )}

          {!isAuthenticated && (
            <div className="admin-section">
              <h2>{t.title}</h2>
              <p>{t.apiTokenHelp}</p>
            </div>
          )}

          {isAuthenticated && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button type="button" className="admin-submit-button" onClick={this.handleAdminLogout}>
                Logout
              </button>
            </div>
          )}

          {!isAuthenticated ? null : (
            <>

          {/* Sync Status Banner */}
          {syncStatus && !syncStatusLoading && (
            <div className={`admin-message ${(() => {
              const lastSyncTime = syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime) : null;
              const secondsSinceSync = lastSyncTime ? Math.floor((syncStatusTick - lastSyncTime.getTime()) / 1000) : null;
              const isStale = secondsSinceSync !== null && secondsSinceSync > 180;
              return isStale || !syncStatus.lastSyncSuccess ? 'admin-message-warning' : 'admin-message-success';
            })()}`}
                 style={{ marginBottom: '2rem' }}>
              <strong>{t.syncStatusTitle}:</strong> {' '}
              {syncStatus.hasNeverSynced ? (
                <span>{t.syncStatusNever}</span>
              ) : (
                <>
                  {t.syncStatusLastSync} {' '}
                  {(() => {
                    const lastSyncTime = syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime) : null;
                    const secondsSinceSync = lastSyncTime ? Math.floor((syncStatusTick - lastSyncTime.getTime()) / 1000) : syncStatus.secondsSinceSync;
                    return secondsSinceSync !== null ? (
                    <span>
                      {lang === 'de' 
                        ? `${t.syncStatusMinutesAgo} ${secondsSinceSync} ${t.syncStatusMinutes}`
                        : `${secondsSinceSync} ${t.syncStatusMinutes} ${t.syncStatusMinutesAgo}`
                      }
                    </span>
                    ) : null;
                  })()} {' - '}
                  {syncStatus.lastSyncSuccess ? (
                    <span>{t.syncStatusSuccess}</span>
                  ) : (
                    <span>{t.syncStatusFailed}</span>
                  )}
                  {(() => {
                    const lastSyncTime = syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime) : null;
                    const secondsSinceSync = lastSyncTime ? Math.floor((syncStatusTick - lastSyncTime.getTime()) / 1000) : null;
                    const isStale = secondsSinceSync !== null && secondsSinceSync > 180;
                    return isStale ? <span> - {t.syncStatusStale}</span> : null;
                  })()}
                  {syncStatus.syncErrorMessage && (
                    <div style={{ marginTop: '0.5rem' }}>
                      {t.syncStatusError} {syncStatus.syncErrorMessage}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Section Navigation */}
          <div className="admin-section-tabs">
            {sectionDefinitions.map((section) => (
              <button
                key={section.key}
                className={`admin-section-tab ${activeSection === section.key ? 'active' : ''}`}
                onClick={() => this.switchSection(section.key)}
              >
                {section.label}
              </button>
            ))}
          </div>

          {/* Tabs */}
          {visibleTabs.length > 1 && (
            <div className="admin-tabs admin-submenu-tabs">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => this.switchTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Display Configuration Tab */}
          <div className={`admin-tab-content ${activeTab === 'display' ? 'active' : ''}`}>
            {!informationLocked && (
            <div className="admin-section">
              <h2>{t.sidebarSectionTitle}</h2>
              
              <div className="admin-current-config">
                <h3>{t.currentConfigTitle}</h3>
                <div className="config-grid">
                  <div className="config-item">
                    <span className="config-label">{t.showWiFiLabel}</span>
                    <span className="config-value">{booleanLabel(currentShowWiFi)}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.showUpcomingMeetingsLabel}</span>
                    <span className="config-value">{booleanLabel(currentShowUpcomingMeetings)}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.showMeetingTitlesLabel}</span>
                    <span className="config-value">{booleanLabel(currentShowMeetingTitles)}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.upcomingMeetingsCountLabel}</span>
                    <span className="config-value">{currentUpcomingMeetingsCount}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.minimalHeaderStyleLabel}</span>
                    <span className="config-value">{currentMinimalHeaderStyle === 'filled' ? t.minimalHeaderStyleFilled : t.minimalHeaderStyleTransparent}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.singleRoomDarkModeLabel || 'Single-Room Dark Mode'}</span>
                    <span className="config-value">{booleanLabel(currentSingleRoomDarkMode)}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.flightboardDarkModeLabel || 'Flightboard Dark Mode'}</span>
                    <span className="config-value">{booleanLabel(currentFlightboardDarkMode)}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.lastUpdatedLabel}</span>
                    <span className="config-value">{informationLastUpdated}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={this.handleSidebarSubmit}>
                <div className="admin-form-group">
                  <label htmlFor="sidebarTargetClientId" style={{ display: 'block', marginBottom: '0.5rem' }}>
                    {t.sidebarTargetClientLabel || 'Target Client'}
                  </label>
                  <select
                    id="sidebarTargetClientId"
                    value={sidebarTargetClientId}
                    onChange={(e) => {
                      const nextTargetClientId = e.target.value;
                      this.setState({ sidebarTargetClientId: nextTargetClientId }, () => {
                        if (nextTargetClientId) {
                          fetch(`/api/sidebar?displayClientId=${encodeURIComponent(nextTargetClientId)}`)
                            .then((response) => response.json())
                            .then((data) => {
                              this.setState({
                                singleRoomDarkMode: data.singleRoomDarkMode !== undefined
                                  ? !!data.singleRoomDarkMode
                                  : this.state.currentSingleRoomDarkMode
                              });
                            })
                            .catch((err) => {
                              console.error('Error loading selected client sidebar config:', err);
                            });
                        } else {
                          this.setState({ singleRoomDarkMode: this.state.currentSingleRoomDarkMode });
                        }
                      });
                    }}
                    style={{ width: '100%' }}
                  >
                    <option value="">{t.sidebarTargetGlobalOption || 'Global default (all displays)'}</option>
                    {(connectedClients || []).map((client) => {
                      const clientId = String(client?.clientId || '');
                      const displayType = String(client?.displayType || 'unknown');
                      const roomAlias = String(client?.roomAlias || '').trim();
                      const roomInfo = roomAlias ? ` · ${roomAlias}` : '';
                      return (
                        <option key={clientId} value={clientId}>
                          {`${clientId} (${displayType}${roomInfo})`}
                        </option>
                      );
                    })}
                  </select>
                  <small style={{ display: 'block', marginTop: '0.5rem' }}>
                    {connectedClientsLoading
                      ? (t.sidebarTargetLoading || 'Loading connected clients...')
                      : (t.sidebarTargetHelp || 'Select a connected client to override Single-Room dark mode only for that client.')}
                  </small>
                </div>

                <hr className="admin-form-divider" />

                <div className="admin-form-group">
                  <label className="inline-label">
                    <span className="label-text">{t.showWiFiLabel}</span>
                    <input
                      type="checkbox"
                      checked={showWiFi}
                      disabled={!!sidebarTargetClientId}
                      onChange={(e) => this.setState({ showWiFi: e.target.checked })}
                    />
                  </label>
                </div>
                
                <div className="admin-form-group">
                  <label className="inline-label">
                    <span className="label-text">{t.showUpcomingMeetingsLabel}</span>
                    <input
                      type="checkbox"
                      checked={showUpcomingMeetings}
                      disabled={!!sidebarTargetClientId}
                      onChange={(e) => this.setState({ showUpcomingMeetings: e.target.checked })}
                    />
                  </label>
                </div>
                
                <hr className="admin-form-divider" />
                
                <div className="admin-form-group">
                  <label className="inline-label">
                    <span className="label-text">{t.showMeetingTitlesLabel}</span>
                    <input
                      type="checkbox"
                      checked={showMeetingTitles}
                      disabled={!!sidebarTargetClientId}
                      onChange={(e) => this.setState({ showMeetingTitles: e.target.checked })}
                    />
                  </label>
                  <small>{t.showMeetingTitlesHelp}</small>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="upcomingMeetingsCount" style={{ display: 'block', marginBottom: '0.5rem' }}>
                    {t.upcomingMeetingsCountLabel}
                  </label>
                  <input
                    id="upcomingMeetingsCount"
                    type="number"
                    min="1"
                    max="10"
                    value={upcomingMeetingsCount}
                    disabled={!!sidebarTargetClientId}
                    onChange={(e) => this.setState({ upcomingMeetingsCount: e.target.value })}
                    style={{ width: '120px' }}
                  />
                  <small style={{ display: 'block', marginTop: '0.5rem' }}>{t.upcomingMeetingsCountHelp}</small>
                </div>
                
                <hr className="admin-form-divider" />
                
                <div className="admin-form-group">
                  <label className="inline-label">
                    <span className="label-text">{t.singleRoomDarkModeLabel || 'Single-Room Dark Mode'}</span>
                    <input
                      type="checkbox"
                      checked={singleRoomDarkMode}
                      onChange={(e) => this.setState({ singleRoomDarkMode: e.target.checked })}
                    />
                  </label>
                  <small>{t.singleRoomDarkModeHelp || 'Uses the dark visual style for single-room displays.'}</small>
                </div>

                {singleRoomDarkMode && (
                  <div className="admin-form-group">
                    <label style={{ display: 'block', marginBottom: '0.75rem' }}>
                      {t.minimalHeaderStyleLabel}
                    </label>
                    <small style={{ display: 'block', marginBottom: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                      {t.minimalHeaderStyleHelp}
                    </small>
                    <label className="inline-label">
                      <span className="label-text">{t.minimalHeaderStyleFilled}</span>
                      <input
                        type="radio"
                        name="minimalHeaderStyle"
                        value="filled"
                        checked={minimalHeaderStyle === 'filled'}
                        disabled={!!sidebarTargetClientId}
                        onChange={(e) => this.setState({ minimalHeaderStyle: e.target.value })}
                      />
                    </label>
                    <label className="inline-label" style={{ marginTop: '0.5rem' }}>
                      <span className="label-text">{t.minimalHeaderStyleTransparent}</span>
                      <input
                        type="radio"
                        name="minimalHeaderStyle"
                        value="transparent"
                        checked={minimalHeaderStyle === 'transparent'}
                        disabled={!!sidebarTargetClientId}
                        onChange={(e) => this.setState({ minimalHeaderStyle: e.target.value })}
                      />
                    </label>
                  </div>
                )}

                {!singleRoomDarkMode && (
                  <div className="admin-form-group">
                    <small style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                      {t.minimalHeaderStyleDarkModeRequired}
                    </small>
                  </div>
                )}

                <hr className="admin-form-divider" />

                <div className="admin-form-group">
                  <label className="inline-label">
                    <span className="label-text">{t.flightboardDarkModeLabel || 'Flightboard Dark Mode'}</span>
                    <input
                      type="checkbox"
                      checked={flightboardDarkMode}
                      onChange={(e) => this.setState({ flightboardDarkMode: e.target.checked })}
                    />
                  </label>
                  <small>{t.flightboardDarkModeHelp || 'Enables the dark visual style for flightboard displays.'}</small>
                </div>
                
                <button 
                  type="submit" 
                  className="admin-submit-button"
                  disabled={
                    showWiFi === currentShowWiFi &&
                    showUpcomingMeetings === currentShowUpcomingMeetings &&
                    showMeetingTitles === currentShowMeetingTitles &&
                    parseInt(upcomingMeetingsCount, 10) === currentUpcomingMeetingsCount &&
                    minimalHeaderStyle === currentMinimalHeaderStyle &&
                    singleRoomDarkMode === currentSingleRoomDarkMode &&
                    flightboardDarkMode === currentFlightboardDarkMode
                  }
                >
                  {t.submitSidebarButton}
                </button>
              </form>

              {informationMessage && (
                <div className={`admin-message admin-message-${informationMessageType}`}>
                  {informationMessage}
                </div>
              )}
            </div>
            )}

            {informationLocked && (
            <div className="admin-section">
              <h2>{t.sidebarSectionTitle}</h2>
              <div className="admin-locked-message">
                <p>{t.configuredViaEnv}</p>
              </div>
            </div>
            )}
          </div>

          {/* WiFi Configuration Tab */}
          <div className={`admin-tab-content ${activeTab === 'wifi' ? 'active' : ''}`}>
          {!wifiLocked && (
          <div className="admin-section">
            <h2>{t.wifiSectionTitle}</h2>
            
            <div className="admin-current-config">
              <h3>{t.currentConfigTitle}</h3>
              <div className="config-grid">
                <div className="config-item">
                  <span className="config-label">{t.ssidLabel}</span>
                  <span className="config-value">{currentSsid}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">{t.passwordLabel}</span>
                  <span className="config-value">{currentPassword}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">{t.lastUpdatedLabel}</span>
                  <span className="config-value">{wifiLastUpdated}</span>
                </div>
              </div>
            </div>

            <form onSubmit={this.handleWiFiSubmit}>
              <div className="admin-form-group">
                <label htmlFor="ssid">{t.wifiSsidLabel}</label>
                <input
                  type="text"
                  id="ssid"
                  value={ssid}
                  onChange={(e) => this.setState({ ssid: e.target.value })}
                  required
                  placeholder={t.wifiSsidPlaceholder}
                />
              </div>
              
              <div className="admin-form-group">
                <label htmlFor="password">{t.wifiPasswordLabel}</label>
                <input
                  type="text"
                  id="password"
                  value={password}
                  onChange={(e) => this.setState({ password: e.target.value })}
                  placeholder={t.wifiPasswordPlaceholder}
                />
              </div>
              
              <button 
                type="submit" 
                className="admin-submit-button"
                disabled={
                  ssid === currentSsid &&
                  password === currentPassword
                }
              >
                {t.submitWifiButton}
              </button>
            </form>

            {wifiMessage && (
              <div className={`admin-message admin-message-${wifiMessageType}`}>
                {wifiMessage}
              </div>
            )}

            <div className="admin-qr-preview">
              <img 
                src={`/img/wifi-qr.png?t=${Date.now()}`} 
                alt="WiFi QR Code" 
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
          </div>
          )}

          {wifiLocked && (
          <div className="admin-section">
            <h2>{t.wifiSectionTitle}</h2>
            <div className="admin-locked-message">
              <p>{t.configuredViaEnv}</p>
            </div>
          </div>
          )}
          </div>

          {/* Logo Configuration Tab */}
          <div className={`admin-tab-content ${activeTab === 'logo' ? 'active' : ''}`}>
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
                onClick={() => this.setState({ uploadMode: 'url', logoDarkFile: null, logoLightFile: null })}
              >
                {t.uploadModeUrl}
              </button>
              <button 
                type="button"
                className={`admin-mode-button ${uploadMode === 'file' ? 'active' : ''}`}
                onClick={() => this.setState({ uploadMode: 'file' })}
              >
                {t.uploadModeFile}
              </button>
            </div>

            <form onSubmit={this.handleLogoSubmit}>
              {uploadMode === 'url' ? (
                <>
                  <div className="admin-form-group">
                    <label htmlFor="logoDarkUrl">{t.logoDarkUrlLabel}</label>
                    <input
                      type="text"
                      id="logoDarkUrl"
                      value={logoDarkUrl}
                      onChange={(e) => this.setState({ logoDarkUrl: e.target.value })}
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
                      onChange={(e) => this.setState({ logoLightUrl: e.target.value })}
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
                      onChange={(e) => this.setState({ logoDarkFile: e.target.files[0] })}
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
                      onChange={(e) => this.setState({ logoLightFile: e.target.files[0] })}
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

          {/* Booking Configuration Tab */}
          <div className={`admin-tab-content ${activeTab === 'booking' ? 'active' : ''}`}>
          {!bookingLocked && (
          <div className="admin-section">
            <h2>{t.bookingSectionTitle}</h2>
            
            {bookingPermissionMissing && (
              <div className="admin-message admin-message-warning" style={{ marginBottom: '1rem' }}>
                <div>
                  <strong>Permission Missing:</strong> Calendars.ReadWrite permission is not granted in Azure AD. 
                  The booking feature is automatically disabled. Please grant this permission to enable room booking.
                </div>
              </div>
            )}
            
            <div className="admin-current-config">
              <h3>{t.currentConfigTitle}</h3>
              <div className="config-grid">
                <div className="config-item">
                  <span className="config-label">{t.enableBookingLabel}</span>
                  <span className="config-value">{booleanLabel(currentEnableBooking)}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">{t.enableExtendMeetingLabel}</span>
                  <span className="config-value">{booleanLabel(currentEnableExtendMeeting)}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Check-in enabled</span>
                  <span className="config-value">{booleanLabel(currentCheckInEnabled)}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Check-in external only</span>
                  <span className="config-value">{booleanLabel(currentCheckInRequiredForExternalMeetings)}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Check-in starts before meeting</span>
                  <span className="config-value">{currentCheckInEarlyMinutes} min</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Check-in window after start</span>
                  <span className="config-value">{currentCheckInWindowMinutes} min</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Auto-release on no-show</span>
                  <span className="config-value">{booleanLabel(currentCheckInAutoReleaseNoShow)}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">{t.bookingButtonColorLabel}</span>
                  <span className="config-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      display: 'inline-block', 
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: currentBookingButtonColor,
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}></span>
                    {currentBookingButtonColor}
                  </span>
                </div>
                {bookingPermissionMissing && (
                  <div className="config-item">
                    <span className="config-label">Status</span>
                    <span className="config-value" style={{ color: '#f59e0b' }}>Disabled (Permission Missing)</span>
                  </div>
                )}
                <div className="config-item">
                  <span className="config-label">{t.lastUpdatedLabel}</span>
                  <span className="config-value">{bookingLastUpdated}</span>
                </div>
              </div>
            </div>

            <form onSubmit={this.handleBookingSubmit}>
              <div className="admin-form-group">
                <label className="inline-label">
                  <span className="label-text">{t.enableBookingLabel}</span>
                  <input
                    type="checkbox"
                    checked={enableBooking}
                    onChange={(e) => this.setState({ enableBooking: e.target.checked })}
                    disabled={bookingPermissionMissing}
                  />
                </label>
                <small>
                  {bookingPermissionMissing 
                    ? 'Cannot enable: Calendars.ReadWrite permission is missing'
                    : t.enableBookingHelp
                  }
                </small>
              </div>

              <div className="admin-form-group">
                <label className="inline-label">
                  <span className="label-text">{t.enableExtendMeetingLabel}</span>
                  <input
                    type="checkbox"
                    checked={enableExtendMeeting}
                    onChange={(e) => this.setState({ enableExtendMeeting: e.target.checked })}
                  />
                </label>
                <small>{t.enableExtendMeetingHelp}</small>
              </div>

              <div className="admin-form-divider"></div>

              <div className="admin-form-group">
                <label className="inline-label">
                  <span className="label-text">Check-in aktivieren</span>
                  <input
                    type="checkbox"
                    checked={checkInEnabled}
                    onChange={(e) => this.setState({ checkInEnabled: e.target.checked })}
                  />
                </label>
                <small>Aktiviert den Check-in-Button für relevante Meetings.</small>
              </div>

              <div className="admin-form-group">
                <label className="inline-label">
                  <span className="label-text">Nur externe Meetings benötigen Check-in</span>
                  <input
                    type="checkbox"
                    checked={checkInRequiredForExternalMeetings}
                    onChange={(e) => this.setState({ checkInRequiredForExternalMeetings: e.target.checked })}
                    disabled={!checkInEnabled}
                  />
                </label>
                <small>Empfohlen: Display-erstellte Buchungen bleiben ohne Check-in/no-show.</small>
              </div>

              <div className="admin-form-group">
                <label htmlFor="checkInEarlyMinutes">Check-in ab Minuten vor Start</label>
                <input
                  id="checkInEarlyMinutes"
                  type="number"
                  min="0"
                  value={checkInEarlyMinutes}
                  onChange={(e) => this.setState({ checkInEarlyMinutes: Math.max(parseInt(e.target.value, 10) || 0, 0) })}
                  disabled={!checkInEnabled}
                />
                <small>Standard: 5 Minuten vor Terminbeginn.</small>
              </div>

              <div className="admin-form-group">
                <label htmlFor="checkInWindowMinutes">Check-in-Fenster nach Start (Minuten)</label>
                <input
                  id="checkInWindowMinutes"
                  type="number"
                  min="1"
                  value={checkInWindowMinutes}
                  onChange={(e) => this.setState({ checkInWindowMinutes: Math.max(parseInt(e.target.value, 10) || 1, 1) })}
                  disabled={!checkInEnabled}
                />
                <small>Nach Ablauf gilt das Meeting als No-Show (wenn aktiviert).</small>
              </div>

              <div className="admin-form-group">
                <label className="inline-label">
                  <span className="label-text">No-Show automatisch freigeben</span>
                  <input
                    type="checkbox"
                    checked={checkInAutoReleaseNoShow}
                    onChange={(e) => this.setState({ checkInAutoReleaseNoShow: e.target.checked })}
                    disabled={!checkInEnabled}
                  />
                </label>
                <small>Löscht nicht bestätigte externe Meetings automatisch nach Ablauf des Fensters.</small>
              </div>

              <div className="admin-form-group">
                <label>{t.roomGroupFeatureFlagsLabel || 'Room Group Overrides'}</label>
                <small>{t.roomGroupFeatureFlagsHelp || 'Optional: Override booking/extend per room group alias (e.g. roomlist-building-a).'}</small>

                {availableRoomGroupOptions.length > 0 && (
                  <div style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                    <select
                      value={newRoomGroupOverrideKey}
                      onChange={(e) => this.handleOverrideDraftChange('group', e.target.value)}
                      style={{ minHeight: '2.25rem' }}
                    >
                      <option value="">{t.selectRoomGroupLabel || 'Select room group'}</option>
                      {availableRoomGroupOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    value={newRoomGroupOverrideKey}
                    onChange={(e) => this.handleOverrideDraftChange('group', e.target.value)}
                    placeholder={t.roomGroupOverridePlaceholder || 'room group alias'}
                  />
                  <button type="button" className="admin-secondary-button" onClick={() => this.handleAddOverride('group')}>
                    {t.addOverrideButtonLabel || 'Add'}
                  </button>
                </div>

                {roomGroupOverrideEntries.length === 0 ? (
                  <div className="admin-locked-message" style={{ marginBottom: '1rem' }}>
                    <p>{t.noRoomGroupOverridesLabel || 'No room-group overrides configured.'}</p>
                  </div>
                ) : roomGroupOverrideEntries.map(([groupKey, groupValue]) => (
                  <div key={groupKey} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <input type="text" value={groupKey} readOnly />
                    <select
                      value={toOverrideState(groupValue?.enableBooking)}
                      onChange={(e) => this.handleOverrideStateChange('group', groupKey, 'enableBooking', e.target.value)}
                    >
                      <option value="inherit">{t.inheritOverrideLabel || 'Inherit'}</option>
                      <option value="enabled">{t.enabledOverrideLabel || 'Enabled'}</option>
                      <option value="disabled">{t.disabledOverrideLabel || 'Disabled'}</option>
                    </select>
                    <select
                      value={toOverrideState(groupValue?.enableExtendMeeting)}
                      onChange={(e) => this.handleOverrideStateChange('group', groupKey, 'enableExtendMeeting', e.target.value)}
                    >
                      <option value="inherit">{t.inheritOverrideLabel || 'Inherit'}</option>
                      <option value="enabled">{t.enabledOverrideLabel || 'Enabled'}</option>
                      <option value="disabled">{t.disabledOverrideLabel || 'Disabled'}</option>
                    </select>
                    <button type="button" className="admin-secondary-button" onClick={() => this.handleRemoveOverride('group', groupKey)}>
                      {t.removeOverrideButtonLabel || 'Remove'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="admin-form-group">
                <label>{t.roomFeatureFlagsLabel || 'Room Overrides'}</label>
                <small>{t.roomFeatureFlagsHelp || 'Optional: Override booking/extend per room email.'}</small>

                {availableRoomOptions.length > 0 && (
                  <div style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                    <select
                      value={newRoomOverrideKey}
                      onChange={(e) => this.handleOverrideDraftChange('room', e.target.value)}
                      style={{ minHeight: '2.25rem' }}
                    >
                      <option value="">{t.selectRoomLabel || 'Select room'}</option>
                      {availableRoomOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    value={newRoomOverrideKey}
                    onChange={(e) => this.handleOverrideDraftChange('room', e.target.value)}
                    placeholder={t.roomOverridePlaceholder || 'room@domain.com'}
                  />
                  <button type="button" className="admin-secondary-button" onClick={() => this.handleAddOverride('room')}>
                    {t.addOverrideButtonLabel || 'Add'}
                  </button>
                </div>

                {roomOverrideEntries.length === 0 ? (
                  <div className="admin-locked-message" style={{ marginBottom: '1rem' }}>
                    <p>{t.noRoomOverridesLabel || 'No room overrides configured.'}</p>
                  </div>
                ) : roomOverrideEntries.map(([roomKey, roomValue]) => (
                  <div key={roomKey} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <input type="text" value={roomKey} readOnly />
                    <select
                      value={toOverrideState(roomValue?.enableBooking)}
                      onChange={(e) => this.handleOverrideStateChange('room', roomKey, 'enableBooking', e.target.value)}
                    >
                      <option value="inherit">{t.inheritOverrideLabel || 'Inherit'}</option>
                      <option value="enabled">{t.enabledOverrideLabel || 'Enabled'}</option>
                      <option value="disabled">{t.disabledOverrideLabel || 'Disabled'}</option>
                    </select>
                    <select
                      value={toOverrideState(roomValue?.enableExtendMeeting)}
                      onChange={(e) => this.handleOverrideStateChange('room', roomKey, 'enableExtendMeeting', e.target.value)}
                    >
                      <option value="inherit">{t.inheritOverrideLabel || 'Inherit'}</option>
                      <option value="enabled">{t.enabledOverrideLabel || 'Enabled'}</option>
                      <option value="disabled">{t.disabledOverrideLabel || 'Disabled'}</option>
                    </select>
                    <button type="button" className="admin-secondary-button" onClick={() => this.handleRemoveOverride('room', roomKey)}>
                      {t.removeOverrideButtonLabel || 'Remove'}
                    </button>
                  </div>
                ))}
              </div>

              {(currentRoomFeatureFlags && Object.keys(currentRoomFeatureFlags).length > 0) || (currentRoomGroupFeatureFlags && Object.keys(currentRoomGroupFeatureFlags).length > 0) ? (
                <div className="admin-current-config" style={{ marginBottom: '1.5rem' }}>
                  <h3>{t.currentConfigTitle} - {t.overridePreviewLabel || 'Override Preview'}</h3>
                  <pre className="admin-json-pre">{JSON.stringify({ roomGroupFeatureFlags: currentRoomGroupFeatureFlags, roomFeatureFlags: currentRoomFeatureFlags }, null, 2)}</pre>
                </div>
              ) : null}

              <button 
                type="submit" 
                className="admin-submit-button"
                disabled={
                  bookingPermissionMissing ||
                  (enableBooking === currentEnableBooking &&
                   enableExtendMeeting === currentEnableExtendMeeting &&
                   checkInEnabled === currentCheckInEnabled &&
                   checkInRequiredForExternalMeetings === currentCheckInRequiredForExternalMeetings &&
                   parseInt(checkInEarlyMinutes, 10) === currentCheckInEarlyMinutes &&
                   parseInt(checkInWindowMinutes, 10) === currentCheckInWindowMinutes &&
                   checkInAutoReleaseNoShow === currentCheckInAutoReleaseNoShow &&
                   JSON.stringify(roomFeatureFlags) === JSON.stringify(currentRoomFeatureFlags) &&
                   JSON.stringify(roomGroupFeatureFlags) === JSON.stringify(currentRoomGroupFeatureFlags))
                }
              >
                {t.submitBookingButton}
              </button>
            </form>

            {bookingMessage && (
              <div className={`admin-message admin-message-${bookingMessageType}`}>
                {bookingMessage}
              </div>
            )}
          </div>
          )}

          {bookingLocked && (
            <div className="admin-section">
              <h2>{t.bookingSectionTitle}</h2>
              <div className="admin-locked-message">
                <p>{t.configuredViaEnv}</p>
              </div>
            </div>
          )}
          </div>

          {/* Translations Tab */}
          <div className={`admin-tab-content ${activeTab === 'translations' ? 'active' : ''}`}>
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
                    onClick={() => this.handleTranslationLanguageChange(language)}
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
                    onChange={(e) => this.handleNewTranslationLanguageChange(e.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={this.handleAddTranslationLanguage}
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
                  onClick={this.handleRemoveTranslationLanguage}
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

              <form onSubmit={this.handleI18nSubmit}>
                <div className="admin-current-config admin-collapsible-config" style={{ marginBottom: '1rem' }}>
                  <button
                    type="button"
                    className="admin-collapsible-header"
                    onClick={() => this.toggleTranslationGroup('maintenanceTranslationsSection')}
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
                          onChange={(e) => this.handleMaintenanceTranslationFieldChange(activeTranslationLanguage, 'title', e.target.value)}
                        />
                      </div>
                      <div className="admin-form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="maintenanceBodyInput">{t.maintenanceBodyLabel}</label>
                        <textarea
                          id="maintenanceBodyInput"
                          value={selectedMaintenanceTranslation.body || ''}
                          onChange={(e) => this.handleMaintenanceTranslationFieldChange(activeTranslationLanguage, 'body', e.target.value)}
                          rows={4}
                          className="admin-textarea"
                        />
                      </div>
                    </>
                  )}
                </div>

                {QUICK_ADMIN_TRANSLATION_GROUPS.map((group) => (
                  <div className="admin-current-config admin-collapsible-config" style={{ marginBottom: '1rem' }} key={group.labelKey}>
                    <button
                      type="button"
                      className="admin-collapsible-header"
                      onClick={() => this.toggleTranslationGroup(group.labelKey)}
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
                          onChange={(e) => this.handleAdminTranslationFieldChange(activeTranslationLanguage, key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                ))}

                <div className="admin-current-config admin-collapsible-config" style={{ marginBottom: '1rem' }}>
                  <button
                    type="button"
                    className="admin-collapsible-header"
                    onClick={() => this.toggleTranslationGroup('advancedTranslationsSection')}
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
                            onChange={(e) => this.setState({ showAdvancedTranslationsEditor: e.target.checked })}
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
                              onChange={(e) => this.setState({ maintenanceTranslationsText: e.target.value })}
                              rows={10}
                              className="admin-textarea"
                            />
                          </div>

                          <div className="admin-form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor="adminTranslationsText">{t.adminJsonLabel}</label>
                            <textarea
                              id="adminTranslationsText"
                              value={adminTranslationsText}
                              onChange={(e) => this.setState({ adminTranslationsText: e.target.value })}
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

          {/* Operations Tab */}
          <div className={`admin-tab-content ${ADMIN_TAB_SECTIONS.operations.includes(activeTab) ? 'active' : ''}`}>
            <div className="admin-section">
              <h2>{t.operationsSectionTitle}</h2>

              {activeTab === 'apiToken' && (
              <div className="admin-card" id="ops-api-token">

              <h3>{t.apiTokenConfigSectionTitle || 'API Tokens'}</h3>
              <div className="admin-current-config">
                <h3>{t.currentConfigTitle}</h3>
                <div className="config-grid">
                  <div className="config-item">
                    <span className="config-label">{t.apiTokenSourceLabel || 'Token Source'}</span>
                    <span className="config-value">{apiTokenSourceLabelMap[currentApiTokenSource] || currentApiTokenSource || '-'}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.apiTokenDefaultActiveLabel || 'Default Token Active'}</span>
                    <span className="config-value">{booleanLabel(currentApiTokenIsDefault)}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.apiTokenDefaultValueLabel || 'Default Token'}</span>
                    <span className="config-value">{t.apiTokenDefaultValue || 'change-me-admin-token'}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.lastUpdatedLabel}</span>
                    <span className="config-value">{apiTokenConfigLastUpdated || '-'}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.wifiApiTokenSourceLabel || 'WiFi Token Source'}</span>
                    <span className="config-value">{apiTokenSourceLabelMap[currentWifiApiTokenSource] || currentWifiApiTokenSource || '-'}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.wifiApiTokenConfiguredLabel || 'WiFi Token Configured'}</span>
                    <span className="config-value">{booleanLabel(currentWifiApiTokenConfigured)}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.wifiApiTokenLastUpdatedLabel || 'WiFi Token Last Updated'}</span>
                    <span className="config-value">{wifiApiTokenConfigLastUpdated || '-'}</span>
                  </div>
                </div>
              </div>

              {!apiTokenLocked && (
                <form onSubmit={this.handleApiTokenSubmit}>
                  <div className="admin-form-group">
                    <label htmlFor="newApiToken">{t.apiTokenNewLabel || 'New API Token'}</label>
                    <input
                      type="password"
                      id="newApiToken"
                      value={newApiToken}
                      onChange={(e) => this.setState({ newApiToken: e.target.value })}
                      placeholder={t.apiTokenMinLengthPlaceholder || 'At least 8 characters'}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="newApiTokenConfirm">{t.apiTokenNewConfirmLabel || 'Confirm New API Token'}</label>
                    <input
                      type="password"
                      id="newApiTokenConfirm"
                      value={newApiTokenConfirm}
                      onChange={(e) => this.setState({ newApiTokenConfirm: e.target.value })}
                      placeholder={t.apiTokenConfirmPlaceholder || 'Repeat new token'}
                      autoComplete="new-password"
                    />
                    <small>{t.apiTokenConfigHelp || 'After saving, use the new token for future logins.'}</small>
                  </div>

                  <button 
                    type="submit" 
                    className="admin-submit-button"
                    disabled={!newApiToken || !newApiTokenConfirm || newApiToken !== newApiTokenConfirm}
                  >
                    {t.apiTokenConfigSaveButton || 'Save API Token'}
                  </button>
                </form>
              )}

              {apiTokenLocked && (
                <div className="admin-locked-message">
                  <p>{t.adminApiTokenConfiguredViaEnv || 'Admin API token is configured via environment (.env).'}</p>
                </div>
              )}

              {apiTokenConfigMessage && (
                <div className={`admin-message admin-message-${apiTokenConfigMessageType || 'error'}`}>
                  {apiTokenConfigMessage}
                </div>
              )}

              <div className="admin-form-divider"></div>

              <h3>{t.wifiApiTokenConfigSectionTitle || 'WiFi API Token'}</h3>

              {!wifiApiTokenLocked && (
                <form onSubmit={this.handleWiFiApiTokenSubmit}>
                  <div className="admin-form-group">
                    <label htmlFor="newWifiApiToken">{t.wifiApiTokenNewLabel || 'New WiFi API Token'}</label>
                    <input
                      type="password"
                      id="newWifiApiToken"
                      value={newWifiApiToken}
                      onChange={(e) => this.setState({ newWifiApiToken: e.target.value })}
                      placeholder={t.apiTokenMinLengthPlaceholder || 'At least 8 characters'}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="newWifiApiTokenConfirm">{t.wifiApiTokenNewConfirmLabel || 'Confirm New WiFi API Token'}</label>
                    <input
                      type="password"
                      id="newWifiApiTokenConfirm"
                      value={newWifiApiTokenConfirm}
                      onChange={(e) => this.setState({ newWifiApiTokenConfirm: e.target.value })}
                      placeholder={t.apiTokenConfirmPlaceholder || 'Repeat new token'}
                      autoComplete="new-password"
                    />
                    <small>{t.wifiApiTokenConfigHelp || 'Use this token for external WiFi API integrations.'}</small>
                  </div>

                  <button 
                    type="submit" 
                    className="admin-submit-button"
                    disabled={!newWifiApiToken || !newWifiApiTokenConfirm || newWifiApiToken !== newWifiApiTokenConfirm}
                  >
                    {t.wifiApiTokenConfigSaveButton || 'Save WiFi API Token'}
                  </button>
                </form>
              )}

              {wifiApiTokenLocked && (
                <div className="admin-locked-message">
                  <p>{t.wifiApiTokenConfiguredViaEnv || 'WiFi API token is configured via environment (.env).'}</p>
                </div>
              )}

              {wifiApiTokenConfigMessage && (
                <div className={`admin-message admin-message-${wifiApiTokenConfigMessageType || 'error'}`}>
                  {wifiApiTokenConfigMessage}
                </div>
              )}

              <div className="admin-form-divider"></div>

              </div>
              )}

              {activeTab === 'system' && (
                <SystemTab
                  systemLocked={systemLocked}
                  currentSystemStartupValidationStrict={currentSystemStartupValidationStrict}
                  currentSystemExposeDetailedErrors={currentSystemExposeDetailedErrors}
                  currentSystemHstsMaxAge={currentSystemHstsMaxAge}
                  currentSystemRateLimitMaxBuckets={currentSystemRateLimitMaxBuckets}
                  currentSystemDisplayTrackingMode={currentSystemDisplayTrackingMode}
                  currentSystemDisplayTrackingRetentionHours={currentSystemDisplayTrackingRetentionHours}
                  currentSystemDisplayTrackingCleanupMinutes={currentSystemDisplayTrackingCleanupMinutes}
                  systemLastUpdated={systemLastUpdated}
                  systemStartupValidationStrict={systemStartupValidationStrict}
                  systemExposeDetailedErrors={systemExposeDetailedErrors}
                  systemHstsMaxAge={systemHstsMaxAge}
                  systemRateLimitMaxBuckets={systemRateLimitMaxBuckets}
                  systemMessage={systemMessage}
                  systemMessageType={systemMessageType}
                  t={t}
                  booleanLabel={booleanLabel}
                  onStartupValidationChange={(value) => this.setState({ systemStartupValidationStrict: value })}
                  onExposeErrorsChange={(value) => this.setState({ systemExposeDetailedErrors: value })}
                  onHstsMaxAgeChange={(value) => this.setState({ systemHstsMaxAge: value })}
                  onRateLimitMaxBucketsChange={(value) => this.setState({ systemRateLimitMaxBuckets: value })}
                  onSubmit={this.handleSystemSubmit}
                />
              )}

              {activeTab === 'translationApi' && (
                <TranslationApiTab
                  translationApiLocked={translationApiLocked}
                  currentTranslationApiEnabled={currentTranslationApiEnabled}
                  currentTranslationApiUrl={currentTranslationApiUrl}
                  currentTranslationApiHasApiKey={currentTranslationApiHasApiKey}
                  currentTranslationApiTimeoutMs={currentTranslationApiTimeoutMs}
                  translationApiLastUpdated={translationApiLastUpdated}
                  translationApiEnabled={translationApiEnabled}
                  translationApiUrl={translationApiUrl}
                  translationApiApiKey={translationApiApiKey}
                  translationApiTimeoutMs={translationApiTimeoutMs}
                  translationApiMessage={translationApiMessage}
                  translationApiMessageType={translationApiMessageType}
                  t={t}
                  booleanLabel={booleanLabel}
                  onEnabledChange={(value) => this.setState({ translationApiEnabled: value })}
                  onUrlChange={(value) => this.setState({ translationApiUrl: value })}
                  onApiKeyChange={(value) => this.setState({ translationApiApiKey: value })}
                  onTimeoutChange={(value) => this.setState({ translationApiTimeoutMs: value })}
                  onSubmit={this.handleTranslationApiSubmit}
                />
              )}

              {activeTab === 'oauth' && (
              <div className="admin-card" id="ops-oauth">

              {!oauthLocked && (
                <>
                  <h3>{t.oauthSectionTitle || 'OAuth Configuration'}</h3>
                  <div className="admin-current-config">
                    <h3>{t.currentConfigTitle}</h3>
                    <div className="config-grid">
                      <div className="config-item">
                        <span className="config-label">{t.oauthClientIdLabel || 'Client ID'}</span>
                        <span className="config-value">{currentOauthClientId || '-'}</span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">{t.oauthTenantIdLabel || 'Tenant ID'}</span>
                        <span className="config-value">{currentOauthAuthority || '-'}</span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">{t.oauthClientSecretLabel || 'Client Secret'}</span>
                        <span className="config-value">{currentOauthHasClientSecret ? (t.oauthClientSecretConfigured || 'Configured') : (t.oauthClientSecretNotConfigured || 'Not configured')}</span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">{t.lastUpdatedLabel}</span>
                        <span className="config-value">{oauthLastUpdated || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={this.handleOAuthSubmit}>
                    <div className="admin-form-group">
                      <label htmlFor="oauthClientId">{t.oauthClientIdInputLabel || 'OAuth Client ID'}</label>
                      <input
                        type="text"
                        id="oauthClientId"
                        value={oauthClientId}
                        onChange={(e) => this.setState({ oauthClientId: e.target.value, oauthFormDirty: true })}
                        placeholder={t.oauthClientIdPlaceholder || 'Application (client) ID'}
                      />
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="oauthAuthority">{t.oauthTenantIdInputLabel || 'OAuth Tenant ID'}</label>
                      <input
                        type="text"
                        id="oauthAuthority"
                        value={oauthAuthority}
                        onChange={(e) => this.setState({ oauthAuthority: e.target.value, oauthFormDirty: true })}
                        placeholder={t.oauthTenantIdPlaceholder || 'Directory (tenant) ID'}
                      />
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="oauthClientSecret">{t.oauthClientSecretInputLabel || 'OAuth Client Secret'}</label>
                      <input
                        type="password"
                        id="oauthClientSecret"
                        value={oauthClientSecret}
                        onChange={(e) => this.setState({ oauthClientSecret: e.target.value, oauthFormDirty: true })}
                        placeholder={t.oauthClientSecretPlaceholder || 'Leave empty to keep existing secret'}
                        autoComplete="new-password"
                      />
                      <small>{t.oauthClientSecretHelp || 'Secret is encrypted before it is written to disk.'}</small>
                    </div>

                    <button 
                      type="submit" 
                      className="admin-submit-button"
                      disabled={
                        oauthClientId === currentOauthClientId &&
                        oauthAuthority === currentOauthAuthority &&
                        oauthClientSecret === ''
                      }
                    >
                      {t.oauthSaveButton || 'Save OAuth Configuration'}
                    </button>
                  </form>

                  {oauthMessage && (
                    <div className={`admin-message admin-message-${oauthMessageType}`}>
                      {oauthMessage}
                    </div>
                  )}

                  <div className="admin-form-divider"></div>

                  {!systemLocked && (
                    <>
                      <h3>{t.graphRuntimeSectionTitle || 'Graph Runtime Configuration'}</h3>
                      <div className="admin-current-config">
                        <h3>{t.currentConfigTitle}</h3>
                        <div className="config-grid">
                          <div className="config-item">
                            <span className="config-label">{t.graphWebhookEnabledLabel || 'Graph Webhook Enabled'}</span>
                            <span className="config-value">{booleanLabel(currentSystemGraphWebhookEnabled)}</span>
                          </div>
                          <div className="config-item">
                            <span className="config-label">{t.graphWebhookClientStateLabel || 'Graph Webhook Client State'}</span>
                            <span className="config-value">{currentSystemGraphWebhookClientState || '-'}</span>
                          </div>
                          <div className="config-item">
                            <span className="config-label">{t.graphWebhookAllowedIpsLabel || 'Graph Webhook Allowed IPs'}</span>
                            <span className="config-value">{currentSystemGraphWebhookAllowedIps || '-'}</span>
                          </div>
                          <div className="config-item">
                            <span className="config-label">{t.graphFetchTimeoutLabel || 'Graph Fetch Timeout (ms)'}</span>
                            <span className="config-value">{currentSystemGraphFetchTimeoutMs}</span>
                          </div>
                          <div className="config-item">
                            <span className="config-label">{t.graphFetchRetryAttemptsLabel || 'Graph Fetch Retry Attempts'}</span>
                            <span className="config-value">{currentSystemGraphFetchRetryAttempts}</span>
                          </div>
                          <div className="config-item">
                            <span className="config-label">{t.graphFetchRetryBaseLabel || 'Graph Fetch Retry Base (ms)'}</span>
                            <span className="config-value">{currentSystemGraphFetchRetryBaseMs}</span>
                          </div>
                          <div className="config-item">
                            <span className="config-label">{t.lastUpdatedLabel}</span>
                            <span className="config-value">{systemLastUpdated || '-'}</span>
                          </div>
                        </div>
                      </div>

                      <form onSubmit={this.handleGraphRuntimeSubmit}>
                        <div className="admin-form-group">
                          <label className="inline-label">
                            <span className="label-text">{t.graphWebhookEnabledLabel || 'Graph Webhook Enabled'}</span>
                            <input
                              type="checkbox"
                              checked={systemGraphWebhookEnabled}
                              onChange={(e) => this.setState({ systemGraphWebhookEnabled: e.target.checked })}
                            />
                          </label>
                          <small>{t.graphWebhookEnabledHelp || 'Enable Microsoft Graph webhook endpoint handling.'}</small>
                        </div>

                        <div className="admin-form-group">
                          <label htmlFor="systemGraphWebhookClientState">{t.graphWebhookClientStateLabel || 'Graph Webhook Client State'}</label>
                          <input
                            type="text"
                            id="systemGraphWebhookClientState"
                            value={systemGraphWebhookClientState}
                            onChange={(e) => this.setState({ systemGraphWebhookClientState: e.target.value })}
                            placeholder={t.graphWebhookClientStatePlaceholder || 'Shared secret value for webhook notifications'}
                          />
                        </div>

                        <div className="admin-form-group">
                          <label htmlFor="systemGraphWebhookAllowedIps">{t.graphWebhookAllowedIpsLabel || 'Graph Webhook Allowed IPs'}</label>
                          <input
                            type="text"
                            id="systemGraphWebhookAllowedIps"
                            value={systemGraphWebhookAllowedIps}
                            onChange={(e) => this.setState({ systemGraphWebhookAllowedIps: e.target.value })}
                            placeholder={t.graphWebhookAllowedIpsPlaceholder || 'Comma-separated IP addresses'}
                          />
                        </div>

                        <div className="admin-form-group">
                          <label htmlFor="systemGraphFetchTimeoutMs">{t.graphFetchTimeoutLabel || 'Graph Fetch Timeout (ms)'}</label>
                          <input
                            type="number"
                            id="systemGraphFetchTimeoutMs"
                            value={systemGraphFetchTimeoutMs}
                            onChange={(e) => this.setState({ systemGraphFetchTimeoutMs: e.target.value })}
                            min="1000"
                            step="100"
                          />
                        </div>

                        <div className="admin-form-group">
                          <label htmlFor="systemGraphFetchRetryAttempts">{t.graphFetchRetryAttemptsLabel || 'Graph Fetch Retry Attempts'}</label>
                          <input
                            type="number"
                            id="systemGraphFetchRetryAttempts"
                            value={systemGraphFetchRetryAttempts}
                            onChange={(e) => this.setState({ systemGraphFetchRetryAttempts: e.target.value })}
                            min="0"
                            step="1"
                          />
                        </div>

                        <div className="admin-form-group">
                          <label htmlFor="systemGraphFetchRetryBaseMs">{t.graphFetchRetryBaseLabel || 'Graph Fetch Retry Base (ms)'}</label>
                          <input
                            type="number"
                            id="systemGraphFetchRetryBaseMs"
                            value={systemGraphFetchRetryBaseMs}
                            onChange={(e) => this.setState({ systemGraphFetchRetryBaseMs: e.target.value })}
                            min="50"
                            step="50"
                          />
                        </div>

                        <button 
                          type="submit" 
                          className="admin-submit-button"
                          disabled={
                            systemGraphWebhookEnabled === currentSystemGraphWebhookEnabled &&
                            systemGraphWebhookClientState === currentSystemGraphWebhookClientState &&
                            systemGraphWebhookAllowedIps === currentSystemGraphWebhookAllowedIps &&
                            parseInt(systemGraphFetchTimeoutMs, 10) === currentSystemGraphFetchTimeoutMs &&
                            parseInt(systemGraphFetchRetryAttempts, 10) === currentSystemGraphFetchRetryAttempts &&
                            parseInt(systemGraphFetchRetryBaseMs, 10) === currentSystemGraphFetchRetryBaseMs
                          }
                        >
                          {t.graphRuntimeSaveButton || 'Save Graph Runtime Configuration'}
                        </button>
                      </form>

                      {graphRuntimeMessage && (
                        <div className={`admin-message admin-message-${graphRuntimeMessageType}`}>
                          {graphRuntimeMessage}
                        </div>
                      )}
                    </>
                  )}

                  {systemLocked && (
                    <>
                      <h3>{t.graphRuntimeSectionTitle || 'Graph Runtime Configuration'}</h3>
                      <div className="admin-locked-message">
                        <p>{t.configuredViaEnv}</p>
                      </div>
                    </>
                  )}

                  <div className="admin-form-divider"></div>
                </>
              )}

              {oauthLocked && (
                <>
                  <h3>{t.oauthSectionTitle || 'OAuth Configuration'}</h3>
                  <div className="admin-locked-message">
                    <p>{t.configuredViaEnv}</p>
                  </div>
                  <div className="admin-form-divider"></div>
                </>
              )}

              </div>
              )}

              {activeTab === 'maintenance' && (
                <MaintenanceTab
                  maintenanceLocked={maintenanceLocked}
                  currentMaintenanceEnabled={currentMaintenanceEnabled}
                  currentMaintenanceMessage={currentMaintenanceMessage}
                  maintenanceLastUpdated={maintenanceLastUpdated}
                  maintenanceEnabled={maintenanceEnabled}
                  maintenanceMessage={maintenanceMessage}
                  maintenanceMessageBanner={maintenanceMessageBanner}
                  maintenanceMessageType={maintenanceMessageType}
                  t={t}
                  booleanLabel={booleanLabel}
                  onEnabledChange={(value) => this.setState({ maintenanceEnabled: value })}
                  onMessageChange={(value) => this.setState({ maintenanceMessage: value })}
                  onSubmit={this.handleMaintenanceSubmit}
                />
              )}

              {activeTab === 'search' && (
              <div className="admin-card" id="ops-search">

              <div className="admin-form-divider"></div>

              {!searchLocked && (
                <>
                  <h3>Search Configuration</h3>
                  <div className="admin-current-config">
                    <h3>{t.currentConfigTitle}</h3>
                    <div className="config-grid">
                      <div className="config-item">
                        <span className="config-label">Use Microsoft Graph API</span>
                        <span className="config-value">{booleanLabel(currentSearchUseGraphAPI)}</span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">Max days</span>
                        <span className="config-value">{currentSearchMaxDays}</span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">Max room lists</span>
                        <span className="config-value">{currentSearchMaxRoomLists}</span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">Max rooms</span>
                        <span className="config-value">{currentSearchMaxRooms}</span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">Max items</span>
                        <span className="config-value">{currentSearchMaxItems}</span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">Poll interval (ms)</span>
                        <span className="config-value">{currentSearchPollIntervalMs}</span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">{t.lastUpdatedLabel}</span>
                        <span className="config-value">{searchLastUpdated || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={this.handleSearchSubmit}>
                    <div className="admin-form-group">
                      <label className="inline-label">
                        <span className="label-text">Use Microsoft Graph API</span>
                        <input
                          type="checkbox"
                          checked={searchUseGraphAPI}
                          onChange={(e) => this.setState({ searchUseGraphAPI: e.target.checked })}
                        />
                      </label>
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="searchMaxDays">Max days</label>
                      <input
                        id="searchMaxDays"
                        type="number"
                        min="1"
                        value={searchMaxDays}
                        onChange={(e) => this.setState({ searchMaxDays: Math.max(parseInt(e.target.value, 10) || 1, 1) })}
                      />
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="searchMaxRoomLists">Max room lists</label>
                      <input
                        id="searchMaxRoomLists"
                        type="number"
                        min="1"
                        value={searchMaxRoomLists}
                        onChange={(e) => this.setState({ searchMaxRoomLists: Math.max(parseInt(e.target.value, 10) || 1, 1) })}
                      />
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="searchMaxRooms">Max rooms</label>
                      <input
                        id="searchMaxRooms"
                        type="number"
                        min="1"
                        value={searchMaxRooms}
                        onChange={(e) => this.setState({ searchMaxRooms: Math.max(parseInt(e.target.value, 10) || 1, 1) })}
                      />
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="searchMaxItems">Max items</label>
                      <input
                        id="searchMaxItems"
                        type="number"
                        min="1"
                        value={searchMaxItems}
                        onChange={(e) => this.setState({ searchMaxItems: Math.max(parseInt(e.target.value, 10) || 1, 1) })}
                      />
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="searchPollIntervalMs">Poll interval (ms)</label>
                      <input
                        id="searchPollIntervalMs"
                        type="number"
                        min="5000"
                        step="1000"
                        value={searchPollIntervalMs}
                        onChange={(e) => this.setState({ searchPollIntervalMs: Math.max(parseInt(e.target.value, 10) || 5000, 5000) })}
                      />
                      <small>Minimum: 5000 ms</small>
                    </div>

                    <button 
                      type="submit" 
                      className="admin-submit-button"
                      disabled={
                        searchUseGraphAPI === currentSearchUseGraphAPI &&
                        parseInt(searchMaxDays, 10) === currentSearchMaxDays &&
                        parseInt(searchMaxRoomLists, 10) === currentSearchMaxRoomLists &&
                        parseInt(searchMaxRooms, 10) === currentSearchMaxRooms &&
                        parseInt(searchMaxItems, 10) === currentSearchMaxItems &&
                        parseInt(searchPollIntervalMs, 10) === currentSearchPollIntervalMs
                      }
                    >
                      Save Search Configuration
                    </button>
                  </form>

                  {searchMessage && (
                    <div className={`admin-message admin-message-${searchMessageType}`}>
                      {searchMessage}
                    </div>
                  )}

                  <div className="admin-form-divider"></div>
                </>
              )}

              {searchLocked && (
                <>
                  <h3>Search Configuration</h3>
                  <div className="admin-locked-message">
                    <p>{t.configuredViaEnv}</p>
                  </div>
                  <div className="admin-form-divider"></div>
                </>
              )}

              </div>
              )}

              {activeTab === 'ratelimit' && (
              <div className="admin-card" id="ops-ratelimit">

              {!rateLimitLocked && (
                <>
                  <h3>Rate Limit Configuration</h3>
                  <div className="admin-current-config">
                    <h3>{t.currentConfigTitle}</h3>
                    <div className="config-grid">
                      <div className="config-item">
                        <span className="config-label">API window (ms)</span>
                        <span className="config-value">{currentRateLimitApiWindowMs}</span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">API max</span>
                        <span className="config-value">{currentRateLimitApiMax}</span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">Write window (ms)</span>
                        <span className="config-value">{currentRateLimitWriteWindowMs}</span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">Write max</span>
                        <span className="config-value">{currentRateLimitWriteMax}</span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">Auth window (ms)</span>
                        <span className="config-value">{currentRateLimitAuthWindowMs}</span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">Auth max</span>
                        <span className="config-value">{currentRateLimitAuthMax}</span>
                      </div>
                      <div className="config-item">
                        <span className="config-label">{t.lastUpdatedLabel}</span>
                        <span className="config-value">{rateLimitLastUpdated || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={this.handleRateLimitSubmit}>
                    <div className="admin-form-group">
                      <label htmlFor="rateLimitApiWindowMs">API window (ms)</label>
                      <input
                        id="rateLimitApiWindowMs"
                        type="number"
                        min="1000"
                        step="1000"
                        value={rateLimitApiWindowMs}
                        onChange={(e) => this.setState({ rateLimitApiWindowMs: Math.max(parseInt(e.target.value, 10) || 1000, 1000) })}
                      />
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="rateLimitApiMax">API max requests</label>
                      <input
                        id="rateLimitApiMax"
                        type="number"
                        min="1"
                        value={rateLimitApiMax}
                        onChange={(e) => this.setState({ rateLimitApiMax: Math.max(parseInt(e.target.value, 10) || 1, 1) })}
                      />
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="rateLimitWriteWindowMs">Write window (ms)</label>
                      <input
                        id="rateLimitWriteWindowMs"
                        type="number"
                        min="1000"
                        step="1000"
                        value={rateLimitWriteWindowMs}
                        onChange={(e) => this.setState({ rateLimitWriteWindowMs: Math.max(parseInt(e.target.value, 10) || 1000, 1000) })}
                      />
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="rateLimitWriteMax">Write max requests</label>
                      <input
                        id="rateLimitWriteMax"
                        type="number"
                        min="1"
                        value={rateLimitWriteMax}
                        onChange={(e) => this.setState({ rateLimitWriteMax: Math.max(parseInt(e.target.value, 10) || 1, 1) })}
                      />
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="rateLimitAuthWindowMs">Auth window (ms)</label>
                      <input
                        id="rateLimitAuthWindowMs"
                        type="number"
                        min="1000"
                        step="1000"
                        value={rateLimitAuthWindowMs}
                        onChange={(e) => this.setState({ rateLimitAuthWindowMs: Math.max(parseInt(e.target.value, 10) || 1000, 1000) })}
                      />
                    </div>

                    <div className="admin-form-group">
                      <label htmlFor="rateLimitAuthMax">Auth max requests</label>
                      <input
                        id="rateLimitAuthMax"
                        type="number"
                        min="1"
                        value={rateLimitAuthMax}
                        onChange={(e) => this.setState({ rateLimitAuthMax: Math.max(parseInt(e.target.value, 10) || 1, 1) })}
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="admin-submit-button"
                      disabled={
                        parseInt(rateLimitApiWindowMs, 10) === currentRateLimitApiWindowMs &&
                        parseInt(rateLimitApiMax, 10) === currentRateLimitApiMax &&
                        parseInt(rateLimitWriteWindowMs, 10) === currentRateLimitWriteWindowMs &&
                        parseInt(rateLimitWriteMax, 10) === currentRateLimitWriteMax &&
                        parseInt(rateLimitAuthWindowMs, 10) === currentRateLimitAuthWindowMs &&
                        parseInt(rateLimitAuthMax, 10) === currentRateLimitAuthMax
                      }
                    >
                      Save Rate Limit Configuration
                    </button>
                  </form>

                  {rateLimitMessage && (
                    <div className={`admin-message admin-message-${rateLimitMessageType}`}>
                      {rateLimitMessage}
                    </div>
                  )}

                  <div className="admin-form-divider"></div>
                </>
              )}

              {rateLimitLocked && (
                <>
                  <h3>Rate Limit Configuration</h3>
                  <div className="admin-locked-message">
                    <p>{t.configuredViaEnv}</p>
                  </div>
                  <div className="admin-form-divider"></div>
                </>
              )}

              </div>
              )}

              {activeTab === 'backup' && (
                <BackupTab
                  backupPayloadText={backupPayloadText}
                  backupMessage={backupMessage}
                  backupMessageType={backupMessageType}
                  t={t}
                  onPayloadChange={(value) => this.setState({ backupPayloadText: value })}
                  onExport={this.handleExportBackup}
                  onImport={this.handleImportBackup}
                />
              )}

              {activeTab === 'connectedDisplays' && (
                <DevicesTab
                  connectedDisplays={connectedDisplays}
                  connectedDisplaysLoading={connectedDisplaysLoading}
                  connectedDisplaysMessage={connectedDisplaysMessage}
                  connectedDisplaysMessageType={connectedDisplaysMessageType}
                  systemDisplayTrackingMode={systemDisplayTrackingMode}
                  currentSystemDisplayTrackingMode={currentSystemDisplayTrackingMode}
                  systemDisplayTrackingRetentionHours={systemDisplayTrackingRetentionHours}
                  currentSystemDisplayTrackingRetentionHours={currentSystemDisplayTrackingRetentionHours}
                  systemDisplayTrackingCleanupMinutes={systemDisplayTrackingCleanupMinutes}
                  currentSystemDisplayTrackingCleanupMinutes={currentSystemDisplayTrackingCleanupMinutes}
                  systemMessage={systemMessage}
                  systemMessageType={systemMessageType}
                  t={t}
                  onLoadDisplays={this.handleLoadConnectedDisplays}
                  onOpenPowerManagement={this.handleOpenPowerManagementModal}
                  onOpenTouchkioModal={this.handleOpenTouchkioModal}
                  onMqttRefresh={this.handleMqttRefreshCommand}
                  onMqttRefreshAll={this.handleMqttRefreshAll}
                  onMqttRebootAll={this.handleMqttRebootAll}
                  onDeleteDisplay={this.handleDeleteDisplay}
                  onTrackingModeChange={(value) => this.setState({ systemDisplayTrackingMode: value })}
                  onRetentionHoursChange={(value) => this.setState({ systemDisplayTrackingRetentionHours: value })}
                  onCleanupMinutesChange={(value) => this.setState({ systemDisplayTrackingCleanupMinutes: value })}
                  onSaveSettings={this.handleSystemSubmit}
                />
              )}

              {activeTab === 'mqtt' && (
                <MqttTab
                  mqttEnabled={this.state.mqttEnabled}
                  mqttBrokerUrl={this.state.mqttBrokerUrl}
                  mqttAuthentication={this.state.mqttAuthentication}
                  mqttUsername={this.state.mqttUsername}
                  mqttPassword={this.state.mqttPassword}
                  mqttDiscovery={this.state.mqttDiscovery}
                  mqttConfigSaving={this.state.mqttConfigSaving}
                  mqttConfigMessage={this.state.mqttConfigMessage}
                  mqttConfigMessageType={this.state.mqttConfigMessageType}
                  mqttStatus={this.state.mqttStatus}
                  t={t}
                  onEnabledChange={(value) => this.setState({ mqttEnabled: value })}
                  onBrokerUrlChange={(value) => this.setState({ mqttBrokerUrl: value })}
                  onAuthenticationChange={(value) => this.setState({ mqttAuthentication: value })}
                  onUsernameChange={(value) => this.setState({ mqttUsername: value })}
                  onPasswordChange={(value) => this.setState({ mqttPassword: value })}
                  onDiscoveryChange={(value) => this.setState({ mqttDiscovery: value })}
                  onSubmit={this.handleMqttConfigSubmit}
                />
              )}

              {activeTab === 'audit' && (
                <AuditTab
                  auditLogs={auditLogs}
                  auditMessage={auditMessage}
                  auditMessageType={auditMessageType}
                  t={t}
                  onLoadLogs={this.handleLoadAuditLogs}
                />
              )}
            </div>
          </div>

          {/* Colors Configuration Tab */}
          <div className={`admin-tab-content ${activeTab === 'colors' ? 'active' : ''}`}>
            <div className="admin-section">
              <h2>{t.colorsSectionTitle}</h2>
              
              <div className="admin-current-config">
                <h3>{t.currentConfigTitle}</h3>
                <div className="config-grid">
                  <div className="config-item">
                    <span className="config-label">{t.bookingButtonColorLabel}</span>
                    <span className="config-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        width: '20px', 
                        height: '20px', 
                        backgroundColor: currentBookingButtonColor,
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}></span>
                      {currentBookingButtonColor}
                    </span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.statusAvailableColorLabel}</span>
                    <span className="config-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        width: '20px', 
                        height: '20px', 
                        backgroundColor: currentStatusAvailableColor,
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}></span>
                      {currentStatusAvailableColor}
                    </span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.statusBusyColorLabel}</span>
                    <span className="config-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        width: '20px', 
                        height: '20px', 
                        backgroundColor: currentStatusBusyColor,
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}></span>
                      {currentStatusBusyColor}
                    </span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.statusUpcomingColorLabel}</span>
                    <span className="config-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        width: '20px', 
                        height: '20px', 
                        backgroundColor: currentStatusUpcomingColor,
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}></span>
                      {currentStatusUpcomingColor}
                    </span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.statusNotFoundColorLabel}</span>
                    <span className="config-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        width: '20px', 
                        height: '20px', 
                        backgroundColor: currentStatusNotFoundColor,
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}></span>
                      {currentStatusNotFoundColor}
                    </span>
                  </div>
                </div>
              </div>

              <form onSubmit={this.handleColorsSubmit}>
                <div className="admin-form-group">
                  <label>{t.bookingButtonColorLabel}</label>
                  <div style={{ display: 'flex', alignItems: 'stretch', gap: '10px', marginTop: '8px' }}>
                    <input
                      type="color"
                      value={bookingButtonColor}
                      onChange={(e) => this.setState({ bookingButtonColor: e.target.value })}
                      style={{ width: '60px', height: '40px', cursor: 'pointer', border: '2px solid #ddd', borderRadius: '4px', flexShrink: 0 }}
                    />
                    <input
                      type="text"
                      value={bookingButtonColor}
                      onChange={(e) => this.setState({ bookingButtonColor: e.target.value })}
                      placeholder="#334155"
                      style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace', fontSize: '14px' }}
                    />
                    <button
                      type="button"
                      onClick={() => this.setState({ bookingButtonColor: '#334155' })}
                      className="admin-secondary-button"
                    >
                      {t.resetToDefaultButton}
                    </button>
                  </div>
                  <small>{t.bookingButtonColorHelp}</small>
                </div>

                <div className="admin-form-group">
                  <label>{t.statusAvailableColorLabel} - {t.colorPickerGreenVariations}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px', marginBottom: '12px' }}>
                    {['#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => this.setState({ statusAvailableColor: color })}
                        style={{
                          width: '45px',
                          height: '45px',
                          backgroundColor: color,
                          border: statusAvailableColor === color ? '3px solid #000' : '2px solid #999',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          padding: '0'
                        }}
                        title={color}
                      >
                        {statusAvailableColor === color ? '✓' : ''}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const hsl = this.hexToHSL(statusAvailableColor);
                    return (
                      <div>
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '12px', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                              {t.colorPickerHue}: {hsl.h}°
                            </label>
                            <input
                              type="range"
                              min="80"
                              max="150"
                              value={hsl.h}
                              onChange={(e) => {
                                const newHsl = { h: parseInt(e.target.value), s: hsl.s, l: hsl.l };
                                this.setState({ statusAvailableColor: this.hslToHex(newHsl.h, newHsl.s, newHsl.l) });
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>
                          <div style={{ width: '60px', height: '50px', backgroundColor: statusAvailableColor, border: '2px solid #ddd', borderRadius: '4px' }}></div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                              {t.colorPickerSaturation}: {hsl.s}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={hsl.s}
                              onChange={(e) => {
                                const newHsl = { h: hsl.h, s: parseInt(e.target.value), l: hsl.l };
                                this.setState({ statusAvailableColor: this.hslToHex(newHsl.h, newHsl.s, newHsl.l) });
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                              {t.colorPickerLightness}: {hsl.l}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={hsl.l}
                              onChange={(e) => {
                                const newHsl = { h: hsl.h, s: hsl.s, l: parseInt(e.target.value) };
                                this.setState({ statusAvailableColor: this.hslToHex(newHsl.h, newHsl.s, newHsl.l) });
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => this.setState({ statusAvailableColor: '#22c55e' })}
                    className="admin-secondary-button"
                    style={{ marginTop: '8px' }}
                  >
                    {t.resetToDefaultButton}
                  </button>
                  <small>{t.statusAvailableColorHelp}</small>
                </div>

                <div className="admin-form-group">
                  <label>{t.statusBusyColorLabel} - {t.colorPickerRedVariations}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px', marginBottom: '12px' }}>
                    {['#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => this.setState({ statusBusyColor: color })}
                        style={{
                          width: '45px',
                          height: '45px',
                          backgroundColor: color,
                          border: statusBusyColor === color ? '3px solid #000' : '2px solid #999',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          padding: '0'
                        }}
                        title={color}
                      >
                        {statusBusyColor === color ? '✓' : ''}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const hsl = this.hexToHSL(statusBusyColor);
                    return (
                      <div>
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '12px', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                              {t.colorPickerHue}: {hsl.h}°
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="20"
                              value={hsl.h <= 20 ? hsl.h : 0}
                              onChange={(e) => {
                                const newHsl = { h: parseInt(e.target.value), s: hsl.s, l: hsl.l };
                                this.setState({ statusBusyColor: this.hslToHex(newHsl.h, newHsl.s, newHsl.l) });
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>
                          <div style={{ width: '60px', height: '50px', backgroundColor: statusBusyColor, border: '2px solid #ddd', borderRadius: '4px' }}></div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                              {t.colorPickerSaturation}: {hsl.s}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={hsl.s}
                              onChange={(e) => {
                                const newHsl = { h: hsl.h, s: parseInt(e.target.value), l: hsl.l };
                                this.setState({ statusBusyColor: this.hslToHex(newHsl.h, newHsl.s, newHsl.l) });
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                              {t.colorPickerLightness}: {hsl.l}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={hsl.l}
                              onChange={(e) => {
                                const newHsl = { h: hsl.h, s: hsl.s, l: parseInt(e.target.value) };
                                this.setState({ statusBusyColor: this.hslToHex(newHsl.h, newHsl.s, newHsl.l) });
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => this.setState({ statusBusyColor: '#ef4444' })}
                    className="admin-secondary-button"
                    style={{ marginTop: '8px' }}
                  >
                    {t.resetToDefaultButton}
                  </button>
                  <small>{t.statusBusyColorHelp}</small>
                </div>

                <div className="admin-form-group">
                  <label>{t.statusUpcomingColorLabel} - {t.colorPickerYellowVariations}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px', marginBottom: '12px' }}>
                    {['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#a16207', '#854d0e'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => this.setState({ statusUpcomingColor: color })}
                        style={{
                          width: '45px',
                          height: '45px',
                          backgroundColor: color,
                          border: statusUpcomingColor === color ? '3px solid #000' : '2px solid #999',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          padding: '0'
                        }}
                        title={color}
                      >
                        {statusUpcomingColor === color ? '✓' : ''}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const hsl = this.hexToHSL(statusUpcomingColor);
                    return (
                      <div>
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '12px', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                              {t.colorPickerHue}: {hsl.h}°
                            </label>
                            <input
                              type="range"
                              min="20"
                              max="60"
                              value={hsl.h}
                              onChange={(e) => {
                                const newHsl = { h: parseInt(e.target.value), s: hsl.s, l: hsl.l };
                                this.setState({ statusUpcomingColor: this.hslToHex(newHsl.h, newHsl.s, newHsl.l) });
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>
                          <div style={{ width: '60px', height: '50px', backgroundColor: statusUpcomingColor, border: '2px solid #ddd', borderRadius: '4px' }}></div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                              {t.colorPickerSaturation}: {hsl.s}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={hsl.s}
                              onChange={(e) => {
                                const newHsl = { h: hsl.h, s: parseInt(e.target.value), l: hsl.l };
                                this.setState({ statusUpcomingColor: this.hslToHex(newHsl.h, newHsl.s, newHsl.l) });
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                              {t.colorPickerLightness}: {hsl.l}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={hsl.l}
                              onChange={(e) => {
                                const newHsl = { h: hsl.h, s: hsl.s, l: parseInt(e.target.value) };
                                this.setState({ statusUpcomingColor: this.hslToHex(newHsl.h, newHsl.s, newHsl.l) });
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => this.setState({ statusUpcomingColor: '#f59e0b' })}
                    className="admin-secondary-button"
                    style={{ marginTop: '8px' }}
                  >
                    {t.resetToDefaultButton}
                  </button>
                  <small>{t.statusUpcomingColorHelp}</small>
                </div>

                <div className="admin-form-group">
                  <label>{t.statusNotFoundColorLabel} - {t.colorPickerGrayVariations}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px', marginBottom: '12px' }}>
                    {['#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => this.setState({ statusNotFoundColor: color })}
                        style={{
                          width: '45px',
                          height: '45px',
                          backgroundColor: color,
                          border: statusNotFoundColor === color ? '3px solid #000' : '2px solid #999',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          padding: '0'
                        }}
                        title={color}
                      >
                        {statusNotFoundColor === color ? '✓' : ''}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const hsl = this.hexToHSL(statusNotFoundColor);
                    return (
                      <div>
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '12px', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                              {t.colorPickerHue}: {hsl.h}°
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="360"
                              value={hsl.h}
                              onChange={(e) => {
                                const newHsl = { h: parseInt(e.target.value), s: hsl.s, l: hsl.l };
                                this.setState({ statusNotFoundColor: this.hslToHex(newHsl.h, newHsl.s, newHsl.l) });
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>
                          <div style={{ width: '60px', height: '50px', backgroundColor: statusNotFoundColor, border: '2px solid #ddd', borderRadius: '4px' }}></div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                              {t.colorPickerSaturation}: {hsl.s}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={hsl.s}
                              onChange={(e) => {
                                const newHsl = { h: hsl.h, s: parseInt(e.target.value), l: hsl.l };
                                this.setState({ statusNotFoundColor: this.hslToHex(newHsl.h, newHsl.s, newHsl.l) });
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginBottom: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                              {t.colorPickerLightness}: {hsl.l}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={hsl.l}
                              onChange={(e) => {
                                const newHsl = { h: hsl.h, s: hsl.s, l: parseInt(e.target.value) };
                                this.setState({ statusNotFoundColor: this.hslToHex(newHsl.h, newHsl.s, newHsl.l) });
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => this.setState({ statusNotFoundColor: '#6b7280' })}
                    className="admin-secondary-button"
                    style={{ marginTop: '8px' }}
                  >
                    {t.resetToDefaultButton}
                  </button>
                  <small>{t.statusNotFoundColorHelp}</small>
                </div>

                <button 
                  type="submit" 
                  className="admin-submit-button"
                  disabled={
                    bookingButtonColor === currentBookingButtonColor &&
                    statusAvailableColor === currentStatusAvailableColor &&
                    statusBusyColor === currentStatusBusyColor &&
                    statusUpcomingColor === currentStatusUpcomingColor &&
                    statusNotFoundColor === currentStatusNotFoundColor
                  }
                >
                  {t.submitColorsButton}
                </button>
              </form>

              {colorMessage && (
                <div className={`admin-message admin-message-${colorMessageType}`}>
                  {colorMessage}
                </div>
              )}
            </div>
          </div>

          {/* Power Management Modal */}
          <PowerManagementModal
            show={showPowerManagementModal}
            clientId={powerManagementClientId}
            mode={powerManagementMode}
            mqttHostname={this.state.powerManagementMqttHostname || ''}
            scheduleEnabled={powerManagementScheduleEnabled}
            startTime={powerManagementStartTime}
            endTime={powerManagementEndTime}
            weekendMode={powerManagementWeekendMode}
            message={powerManagementMessage}
            messageType={powerManagementMessageType}
            onClose={this.handleClosePowerManagementModal}
            onSave={this.handleSavePowerManagement}
            onModeChange={(value) => this.setState({ powerManagementMode: value })}
            onMqttHostnameChange={(value) => this.setState({ powerManagementMqttHostname: value })}
            onScheduleEnabledChange={(value) => this.setState({ powerManagementScheduleEnabled: value })}
            onStartTimeChange={(value) => this.setState({ powerManagementStartTime: value })}
            onEndTimeChange={(value) => this.setState({ powerManagementEndTime: value })}
            onWeekendModeChange={(value) => this.setState({ powerManagementWeekendMode: value })}
          />


      {/* Touchkio Display Modal */}
      <TouchkioModal
        show={this.state.showTouchkioModal}
        display={this.state.touchkioModalDisplay}
        message={this.state.touchkioModalMessage}
        messageType={this.state.touchkioModalMessageType}
        brightness={this.state.touchkioModalBrightness}
        volume={this.state.touchkioModalVolume}
        zoom={this.state.touchkioModalZoom}
        onClose={this.handleCloseTouchkioModal}
        onBrightnessChange={(value, apply) => {
          this.setState({ touchkioModalBrightness: value });
          if (apply) {
            this.handleMqttBrightnessCommandModal(this.state.touchkioModalDisplay.hostname, value);
          }
        }}
        onVolumeChange={(value, apply) => {
          this.setState({ touchkioModalVolume: value });
          if (apply) {
            this.handleMqttVolumeCommandModal(this.state.touchkioModalDisplay.hostname, value);
          }
        }}
        onZoomChange={(value, apply) => {
          this.setState({ touchkioModalZoom: value });
          if (apply) {
            this.handleMqttPageZoomCommandModal(this.state.touchkioModalDisplay.hostname, value);
          }
        }}
        onPowerCommand={this.handleMqttPowerCommandModal}
        onRefreshCommand={this.handleMqttRefreshCommandModal}
        onKioskCommand={this.handleMqttKioskCommandModal}
        onThemeCommand={this.handleMqttThemeCommandModal}
        onRebootCommand={this.handleMqttRebootCommandModal}
        onShutdownCommand={this.handleMqttShutdownCommandModal}
      />
      </>
      )}

        </div>
      </div>
    );
  }
}

export default Admin;
