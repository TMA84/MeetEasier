import React, { Component } from 'react';
import defaultAdminTranslations, { getAdminTranslations } from '../../config/adminTranslations.js';

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
    keys: ['translationsSubmitButton']
  },
  {
    labelKey: 'adminTranslationGroupErrorsLabel',
    keys: ['errorPrefix', 'errorUnauthorized']
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
  translationLanguageSection: true,
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
      currentMinimalHeaderStyle: 'filled',
      informationLastUpdated: '',
      showWiFi: true,
      showUpcomingMeetings: false,
      showMeetingTitles: false,
      minimalHeaderStyle: 'filled',
      informationMessage: null,
      informationMessageType: null,
      
      // Config locks (which settings are configured via .env)
      wifiLocked: false,
      logoLocked: false,
      informationLocked: false,
      bookingLocked: false,
      searchLocked: false,
      rateLimitLocked: false,
      
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
      
      // Sync status
      syncStatus: null,
      syncStatusLoading: true,
      syncStatusTick: Date.now(),
      
      // UI state
      activeTab: 'display'
    };
  }

  componentDidMount() {
    this.loadConfigLocks();
    this.loadCurrentConfig();
    this.loadSyncStatus();
    
    // Set page title
    const t = this.getTranslations();
    document.title = t.title;
    
    // Refresh sync status every 30 seconds
    this.syncStatusInterval = setInterval(() => {
      this.loadSyncStatus();
    }, 30000);

    // Update sync status timer every second for real-time display
    this.syncStatusClockInterval = setInterval(() => {
      this.setState({ syncStatusTick: Date.now() });
    }, 1000);
  }

  componentWillUnmount() {
    if (this.syncStatusInterval) {
      clearInterval(this.syncStatusInterval);
    }
    if (this.syncStatusClockInterval) {
      clearInterval(this.syncStatusClockInterval);
    }
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
          rateLimitLocked: data.rateLimitLocked || false
        });
      })
      .catch(err => {
        console.error('Error loading config locks:', err);
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
    this.setState({ translationLanguage: String(language || '').trim().toLowerCase() || 'en' });
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

      if (!nextMaintenanceTranslations[newLanguageCode]) {
        nextMaintenanceTranslations[newLanguageCode] = {
          title: '',
          body: ''
        };
      }

      if (!nextAdminTranslations[newLanguageCode]) {
        nextAdminTranslations[newLanguageCode] = {};
      }

      return {
        currentMaintenanceTranslations: nextMaintenanceTranslations,
        maintenanceTranslationsText: JSON.stringify(nextMaintenanceTranslations, null, 2),
        currentAdminTranslations: nextAdminTranslations,
        adminTranslationsText: JSON.stringify(nextAdminTranslations, null, 2),
        translationLanguage: newLanguageCode,
        newTranslationLanguageCode: '',
        translationLanguageDraftError: null
      };
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
    // Load WiFi config
    fetch('/api/wifi')
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
        this.setState({
          currentShowWiFi: data.showWiFi !== undefined ? data.showWiFi : true,
          currentShowUpcomingMeetings: data.showUpcomingMeetings !== undefined ? data.showUpcomingMeetings : false,
          currentShowMeetingTitles: data.showMeetingTitles !== undefined ? data.showMeetingTitles : false,
          currentMinimalHeaderStyle: data.minimalHeaderStyle || 'filled',
          informationLastUpdated: data.lastUpdated 
            ? new Date(data.lastUpdated).toLocaleString(navigator.language || 'de-DE')
            : '-',
          showWiFi: data.showWiFi !== undefined ? data.showWiFi : true,
          showUpcomingMeetings: data.showUpcomingMeetings !== undefined ? data.showUpcomingMeetings : false,
          showMeetingTitles: data.showMeetingTitles !== undefined ? data.showMeetingTitles : false,
          minimalHeaderStyle: data.minimalHeaderStyle || 'filled'
        });
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
    const { apiToken, showWiFi, showUpcomingMeetings, showMeetingTitles, minimalHeaderStyle } = this.state;
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }
    
    fetch('/api/sidebar', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ showWiFi, showUpcomingMeetings, showMeetingTitles, minimalHeaderStyle })
    })
    .then(response => {
      if (response.status === 401) {
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

  handleI18nSubmit = (e) => {
    e.preventDefault();
    const t = this.getTranslations();
    const {
      apiToken,
      maintenanceTranslationsText,
      adminTranslationsText,
      currentMaintenanceTranslations,
      currentAdminTranslations,
      showAdvancedTranslationsEditor
    } = this.state;
    const headers = {
      'Content-Type': 'application/json'
    };

    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

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

    fetch('/api/i18n', {
      method: 'POST',
      headers,
      body: JSON.stringify({ maintenanceMessages, adminTranslations })
    })
      .then(response => {
        if (response.status === 401) {
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
          i18nMessage: t.translationsSuccessMessage,
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

  switchTab = (tabName) => {
    this.setState({ activeTab: tabName });
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
      currentShowWiFi, currentShowUpcomingMeetings, currentShowMeetingTitles, currentMinimalHeaderStyle, informationLastUpdated,
      currentEnableBooking, currentEnableExtendMeeting, bookingLastUpdated,
      currentCheckInEnabled, currentCheckInRequiredForExternalMeetings,
      currentCheckInEarlyMinutes, currentCheckInWindowMinutes, currentCheckInAutoReleaseNoShow,
      apiToken, ssid, password, logoDarkUrl, logoLightUrl, logoDarkFile, logoLightFile, uploadMode,
      showWiFi, showUpcomingMeetings, showMeetingTitles, minimalHeaderStyle,
      enableBooking, enableExtendMeeting,
      checkInEnabled, checkInRequiredForExternalMeetings,
      checkInEarlyMinutes, checkInWindowMinutes, checkInAutoReleaseNoShow,
      currentRoomFeatureFlags, roomFeatureFlags,
      currentRoomGroupFeatureFlags, roomGroupFeatureFlags,
      newRoomOverrideKey, newRoomGroupOverrideKey,
      availableRoomOptions, availableRoomGroupOptions,
      currentMaintenanceEnabled, currentMaintenanceMessage, maintenanceLastUpdated,
      maintenanceEnabled, maintenanceMessage,
      currentSearchUseGraphAPI, currentSearchMaxDays, currentSearchMaxRoomLists, currentSearchMaxRooms, currentSearchMaxItems, currentSearchPollIntervalMs, searchLastUpdated,
      searchUseGraphAPI, searchMaxDays, searchMaxRoomLists, searchMaxRooms, searchMaxItems, searchPollIntervalMs,
      currentRateLimitApiWindowMs, currentRateLimitApiMax, currentRateLimitWriteWindowMs, currentRateLimitWriteMax, currentRateLimitAuthWindowMs, currentRateLimitAuthMax, rateLimitLastUpdated,
      rateLimitApiWindowMs, rateLimitApiMax, rateLimitWriteWindowMs, rateLimitWriteMax, rateLimitAuthWindowMs, rateLimitAuthMax,
      maintenanceMessageBanner, maintenanceMessageType,
      i18nLastUpdated, currentMaintenanceTranslations, maintenanceTranslationsText, currentAdminTranslations, adminTranslationsText, translationLanguage, newTranslationLanguageCode, translationLanguageDraftError, collapsedTranslationGroups, showAdvancedTranslationsEditor, i18nMessage, i18nMessageType,
      backupPayloadText, backupMessage, backupMessageType,
      auditLogs, auditMessage, auditMessageType,
      bookingButtonColor, currentBookingButtonColor,
      statusAvailableColor, currentStatusAvailableColor,
      statusBusyColor, currentStatusBusyColor,
      statusUpcomingColor, currentStatusUpcomingColor,
      statusNotFoundColor, currentStatusNotFoundColor,
      wifiMessage, wifiMessageType, logoMessage, logoMessageType, informationMessage, informationMessageType,
      bookingMessage, bookingMessageType, colorMessage, colorMessageType,
      searchMessage, searchMessageType, rateLimitMessage, rateLimitMessageType,
      wifiLocked, logoLocked, informationLocked, bookingLocked, searchLocked, rateLimitLocked,
      bookingPermissionMissing,
      activeTab,
      syncStatus,
      syncStatusLoading,
      syncStatusTick
    } = this.state;
    const t = this.getTranslations();
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

    return (
      <div className="admin-page">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-content">
            <div className="admin-logo">
              <img src={currentLogoLightUrl || "/img/logo.W.png"} alt="Logo" onError={(e) => { e.target.src = "/img/logo.W.png"; }} />
            </div>
            <h1>{t.title}</h1>
          </div>
        </div>

        <div className="admin-container">
          {/* API Token Banner */}
          <div className="admin-token-banner">
            <div className="admin-token-content">
              <div className="token-input-wrapper">
                <label htmlFor="apiToken">{t.apiTokenLabel}</label>
                <input
                  type="password"
                  id="apiToken"
                  value={apiToken}
                  onChange={(e) => this.setState({ apiToken: e.target.value })}
                  placeholder={t.apiTokenPlaceholder}
                  autoComplete="off"
                />
                <small>{t.apiTokenHelp}</small>
              </div>
            </div>
          </div>

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

          {/* Tabs */}
          <div className="admin-tabs">
            <button 
              className={`admin-tab ${activeTab === 'display' ? 'active' : ''}`}
              onClick={() => this.switchTab('display')}
            >
              {t.displayTabLabel || 'Display'}
            </button>
            <button 
              className={`admin-tab ${activeTab === 'wifi' ? 'active' : ''}`}
              onClick={() => this.switchTab('wifi')}
            >
              {t.wifiTabLabel || 'WiFi'}
            </button>
            <button 
              className={`admin-tab ${activeTab === 'logo' ? 'active' : ''}`}
              onClick={() => this.switchTab('logo')}
            >
              {t.logoTabLabel || 'Logo'}
            </button>
            <button 
              className={`admin-tab ${activeTab === 'colors' ? 'active' : ''}`}
              onClick={() => this.switchTab('colors')}
            >
              {t.colorsTabLabel || 'Colors'}
            </button>
            <button 
              className={`admin-tab ${activeTab === 'booking' ? 'active' : ''}`}
              onClick={() => this.switchTab('booking')}
            >
              {t.bookingTabLabel || 'Booking'}
            </button>
            <button 
              className={`admin-tab ${activeTab === 'translations' ? 'active' : ''}`}
              onClick={() => this.switchTab('translations')}
            >
              {t.translationsTabLabel || 'Translations'}
            </button>
            <button 
              className={`admin-tab ${activeTab === 'operations' ? 'active' : ''}`}
              onClick={() => this.switchTab('operations')}
            >
              {t.operationsTabLabel || 'Operations'}
            </button>
          </div>

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
                    <span className="config-value">{currentShowWiFi ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.showUpcomingMeetingsLabel}</span>
                    <span className="config-value">{currentShowUpcomingMeetings ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.showMeetingTitlesLabel}</span>
                    <span className="config-value">{currentShowMeetingTitles ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.minimalHeaderStyleLabel}</span>
                    <span className="config-value">{currentMinimalHeaderStyle === 'filled' ? t.minimalHeaderStyleFilled : t.minimalHeaderStyleTransparent}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.lastUpdatedLabel}</span>
                    <span className="config-value">{informationLastUpdated}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={this.handleSidebarSubmit}>
                <div className="admin-form-group">
                  <label className="inline-label">
                    <span className="label-text">{t.showWiFiLabel}</span>
                    <input
                      type="radio"
                      name="sidebarDisplay"
                      checked={showWiFi && !showUpcomingMeetings}
                      onChange={() => this.setState({ showWiFi: true, showUpcomingMeetings: false })}
                    />
                  </label>
                </div>
                
                <div className="admin-form-group">
                  <label className="inline-label">
                    <span className="label-text">{t.showUpcomingMeetingsLabel}</span>
                    <input
                      type="radio"
                      name="sidebarDisplay"
                      checked={!showWiFi && showUpcomingMeetings}
                      onChange={() => this.setState({ showWiFi: false, showUpcomingMeetings: true })}
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
                      onChange={(e) => this.setState({ showMeetingTitles: e.target.checked })}
                    />
                  </label>
                  <small>{t.showMeetingTitlesHelp}</small>
                </div>
                
                <hr className="admin-form-divider" />
                
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
                      onChange={(e) => this.setState({ minimalHeaderStyle: e.target.value })}
                    />
                  </label>
                </div>
                
                <button type="submit" className="admin-submit-button">
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
              
              <button type="submit" className="admin-submit-button">
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
              
              <button type="submit" className="admin-submit-button">
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
                  <span className="config-value">{currentEnableBooking ? 'Yes' : 'No'}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">{t.enableExtendMeetingLabel}</span>
                  <span className="config-value">{currentEnableExtendMeeting ? 'Yes' : 'No'}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Check-in enabled</span>
                  <span className="config-value">{currentCheckInEnabled ? 'Yes' : 'No'}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Check-in external only</span>
                  <span className="config-value">{currentCheckInRequiredForExternalMeetings ? 'Yes' : 'No'}</span>
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
                  <span className="config-value">{currentCheckInAutoReleaseNoShow ? 'Yes' : 'No'}</span>
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
                disabled={bookingPermissionMissing}
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
                    onClick={() => this.toggleTranslationGroup('translationLanguageSection')}
                    aria-expanded={!collapsedTranslationGroups?.translationLanguageSection}
                  >
                    <h3>{t.translationLanguageLabel}</h3>
                    <span className="admin-collapsible-chevron">{collapsedTranslationGroups?.translationLanguageSection ? '▸' : '▾'}</span>
                  </button>
                  {!collapsedTranslationGroups?.translationLanguageSection && (
                    <>
                      <div className="admin-form-group">
                        <label htmlFor="translationLanguage">{t.translationLanguageLabel}</label>
                        <select
                          id="translationLanguage"
                          value={activeTranslationLanguage}
                          onChange={(e) => this.handleTranslationLanguageChange(e.target.value)}
                        >
                          {availableTranslationLanguages.map((language) => (
                            <option key={language} value={language}>{getLanguageDisplayName(language)}</option>
                          ))}
                        </select>
                      </div>
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
                    </>
                  )}
                </div>

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

                <button type="submit" className="admin-submit-button">
                  {t.translationsSubmitButton}
                </button>
              </form>

              {i18nMessage && (
                <div className={`admin-message admin-message-${i18nMessageType}`}>
                  {i18nMessage}
                </div>
              )}
            </div>
          </div>

          {/* Operations Tab */}
          <div className={`admin-tab-content ${activeTab === 'operations' ? 'active' : ''}`}>
            <div className="admin-section">
              <h2>{t.operationsSectionTitle}</h2>

              <div className="admin-current-config">
                <h3>{t.currentConfigTitle}</h3>
                <div className="config-grid">
                  <div className="config-item">
                    <span className="config-label">{t.maintenanceEnabledLabel}</span>
                    <span className="config-value">{currentMaintenanceEnabled ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.maintenanceMessageLabel}</span>
                    <span className="config-value">{currentMaintenanceMessage || '-'}</span>
                  </div>
                  <div className="config-item">
                    <span className="config-label">{t.lastUpdatedLabel}</span>
                    <span className="config-value">{maintenanceLastUpdated || '-'}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={this.handleMaintenanceSubmit}>
                <div className="admin-form-group">
                  <label className="inline-label">
                    <span className="label-text">{t.maintenanceEnabledLabel}</span>
                    <input
                      type="checkbox"
                      checked={maintenanceEnabled}
                      onChange={(e) => this.setState({ maintenanceEnabled: e.target.checked })}
                    />
                  </label>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="maintenanceMessage">{t.maintenanceMessageLabel}</label>
                  <textarea
                    id="maintenanceMessage"
                    value={maintenanceMessage}
                    onChange={(e) => this.setState({ maintenanceMessage: e.target.value })}
                    rows={4}
                    className="admin-textarea"
                  />
                </div>

                <button type="submit" className="admin-submit-button">
                  {t.maintenanceSubmitButton}
                </button>
              </form>

              {maintenanceMessageBanner && (
                <div className={`admin-message admin-message-${maintenanceMessageType}`}>
                  {maintenanceMessageBanner}
                </div>
              )}

              <div className="admin-form-divider"></div>

              {!searchLocked && (
                <>
                  <h3>Search Configuration</h3>
                  <div className="admin-current-config">
                    <h3>{t.currentConfigTitle}</h3>
                    <div className="config-grid">
                      <div className="config-item">
                        <span className="config-label">Use Microsoft Graph API</span>
                        <span className="config-value">{currentSearchUseGraphAPI ? 'Yes' : 'No'}</span>
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

                    <button type="submit" className="admin-submit-button">
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

                    <button type="submit" className="admin-submit-button">
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

              <div className="admin-form-group">
                <label htmlFor="backupPayloadText">{t.backupPayloadLabel}</label>
                <textarea
                  id="backupPayloadText"
                  value={backupPayloadText}
                  onChange={(e) => this.setState({ backupPayloadText: e.target.value })}
                  rows={12}
                  className="admin-textarea"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button type="button" className="admin-secondary-button" onClick={this.handleExportBackup}>
                  {t.backupExportButton}
                </button>
                <button type="button" className="admin-secondary-button" onClick={this.handleImportBackup}>
                  {t.backupImportButton}
                </button>
              </div>

              {backupMessage && (
                <div className={`admin-message admin-message-${backupMessageType}`}>
                  {backupMessage}
                </div>
              )}

              <div className="admin-form-divider"></div>

              <h3>{t.auditSectionTitle}</h3>
              <div style={{ marginBottom: '1rem' }}>
                <button type="button" className="admin-secondary-button" onClick={this.handleLoadAuditLogs}>
                  {t.auditLoadButton}
                </button>
              </div>

              {auditMessage && (
                <div className={`admin-message admin-message-${auditMessageType}`}>
                  {auditMessage}
                </div>
              )}

              {auditLogs.length === 0 ? (
                <div className="admin-locked-message">
                  <p>{t.auditEmpty}</p>
                </div>
              ) : (
                <div className="admin-current-config">
                  <pre className="admin-json-pre">{JSON.stringify(auditLogs, null, 2)}</pre>
                </div>
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

        </div>
      </div>
    );
  }
}

export default Admin;
