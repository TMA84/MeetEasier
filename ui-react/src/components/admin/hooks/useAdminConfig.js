/**
 * @file useAdminConfig.js
 * @description Hook for loading and managing all admin configuration state.
 */
import { useState, useCallback, useRef } from 'react';
import defaultAdminTranslations from '../../../config/admin-translations.js';
import {
  loadWiFiConfig, loadLogoConfig as fetchLogoConfig, loadSidebarConfig,
  loadBookingConfig, loadSearchConfig, loadRateLimitConfig,
  loadTranslationApiConfig, loadMaintenanceStatus, loadSystemConfig,
  loadOAuthConfig, loadCertificateInfo, loadApiTokenConfig,
  loadI18nConfig, loadColorsConfig, loadRoomLists, loadRooms,
  loadConfigLocks as fetchConfigLocks, loadConnectedClients as fetchClients,
  loadSyncStatus as fetchSyncStatus, loadVersion as fetchVersion
} from '../services/admin-config-loader.js';
import { fetchMqttConfig, fetchMqttStatus } from '../services/mqtt-commands.js';

const fmtDate = (d) => d ? new Date(d).toLocaleString(navigator.language || 'de-DE') : '-';
const pInt = (v, min, def) => Number.isFinite(Number(v)) ? Math.max(parseInt(v, 10), min) : def;

/** Initial config state — all domain state in one object for batch updates. */
const INITIAL_CONFIG = {
  // WiFi
  currentSsid: '', currentPassword: '', wifiLastUpdated: '', ssid: '', password: '',
  wifiMessage: null, wifiMessageType: null,
  // Logo
  currentLogoDarkUrl: '', currentLogoLightUrl: '', logoLastUpdated: '',
  logoDarkUrl: '', logoLightUrl: '', logoDarkFile: null, logoLightFile: null,
  logoMessage: null, logoMessageType: null, uploadMode: 'url',
  // Sidebar / Information
  currentShowWiFi: true, currentShowUpcomingMeetings: false, currentShowMeetingTitles: false,
  currentUpcomingMeetingsCount: 3, currentMinimalHeaderStyle: 'filled',
  currentSingleRoomDarkMode: false, currentFlightboardDarkMode: true, informationLastUpdated: '',
  currentAutoReloadEnabled: false, currentAutoReloadTime: '03:00',
  showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false,
  upcomingMeetingsCount: 3, minimalHeaderStyle: 'filled',
  singleRoomDarkMode: false, flightboardDarkMode: true,
  autoReloadEnabled: false, autoReloadTime: '03:00',
  sidebarTargetClientId: '', connectedClients: [], connectedClientsLoading: false,
  informationMessage: null, informationMessageType: null,
  // Config locks
  wifiLocked: false, logoLocked: false, informationLocked: false, bookingLocked: false,
  searchLocked: false, rateLimitLocked: false, apiTokenLocked: false, wifiApiTokenLocked: false,
  oauthLocked: false, systemLocked: false, maintenanceLocked: false, translationApiLocked: false,
  // Booking
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
  // Maintenance
  currentMaintenanceEnabled: false, currentMaintenanceMessage: '', maintenanceLastUpdated: '',
  maintenanceEnabled: false, maintenanceMessage: '',
  maintenanceMessageBanner: null, maintenanceMessageType: null,
  // i18n
  i18nLastUpdated: '', currentMaintenanceTranslations: {},
  maintenanceTranslationsText: '{\n  "en": {\n    "title": "Maintenance mode active",\n    "body": "This display is temporarily unavailable."\n  },\n  "de": {\n    "title": "Wartungsmodus aktiv",\n    "body": "Diese Anzeige ist vorübergehend nicht verfügbar."\n  }\n}',
  currentAdminTranslations: {},
  adminTranslationsText: JSON.stringify(defaultAdminTranslations, null, 2),
  i18nMessage: null, i18nMessageType: null,
  // Backup
  backupPayloadText: '', backupMessage: null, backupMessageType: null,
  // Audit
  auditLogs: [], auditMessage: null, auditMessageType: null,
  // Connected displays
  connectedDisplays: [], connectedDisplaysMessage: null, connectedDisplaysMessageType: null, connectedDisplaysLoading: false,
  // Power management
  showPowerManagementModal: false, powerManagementClientId: null,
  powerManagementMode: 'browser', powerManagementScheduleEnabled: false,
  powerManagementStartTime: '20:00', powerManagementEndTime: '07:00',
  powerManagementWeekendMode: false, powerManagementMessage: null, powerManagementMessageType: null,
  // API Token config
  apiTokenConfigMessage: null, apiTokenConfigMessageType: null,
  currentApiTokenSource: 'default', currentApiTokenIsDefault: true, apiTokenConfigLastUpdated: '',
  newApiToken: '', newApiTokenConfirm: '',
  wifiApiTokenConfigMessage: null, wifiApiTokenConfigMessageType: null,
  currentWifiApiTokenSource: 'default', currentWifiApiTokenConfigured: false,
  wifiApiTokenConfigLastUpdated: '', newWifiApiToken: '', newWifiApiTokenConfirm: '',
  // OAuth
  oauthMessage: null, oauthMessageType: null,
  graphRuntimeMessage: null, graphRuntimeMessageType: null,
  currentOauthClientId: '', oauthClientId: '',
  currentOauthAuthority: '', oauthAuthority: '',
  currentOauthHasClientSecret: false, oauthClientSecret: '', oauthLastUpdated: '',
  oauthFormDirty: false,
  certificateInfo: null, certificateLoading: false,
  certificateMessage: null, certificateMessageType: null,
  // System
  systemMessage: null, systemMessageType: null,
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
  // Translation API
  translationApiMessage: null, translationApiMessageType: null,
  currentTranslationApiEnabled: true, translationApiEnabled: true,
  currentTranslationApiUrl: 'https://translation.googleapis.com/language/translate/v2',
  translationApiUrl: 'https://translation.googleapis.com/language/translate/v2',
  currentTranslationApiTimeoutMs: 20000, translationApiTimeoutMs: 20000,
  currentTranslationApiHasApiKey: false, translationApiApiKey: '', translationApiLastUpdated: '',
  // Search
  searchMessage: null, searchMessageType: null,
  currentSearchUseGraphAPI: true, searchUseGraphAPI: true,
  currentSearchMaxDays: 7, searchMaxDays: 7,
  currentSearchMaxRoomLists: 5, searchMaxRoomLists: 5,
  currentSearchMaxRooms: 50, searchMaxRooms: 50,
  currentSearchMaxItems: 100, searchMaxItems: 100,
  currentSearchPollIntervalMs: 15000, searchPollIntervalMs: 15000, searchLastUpdated: '',
  // Rate limit
  rateLimitMessage: null, rateLimitMessageType: null,
  currentRateLimitApiWindowMs: 60000, rateLimitApiWindowMs: 60000,
  currentRateLimitApiMax: 300, rateLimitApiMax: 300,
  currentRateLimitWriteWindowMs: 60000, rateLimitWriteWindowMs: 60000,
  currentRateLimitWriteMax: 60, rateLimitWriteMax: 60,
  currentRateLimitAuthWindowMs: 60000, rateLimitAuthWindowMs: 60000,
  currentRateLimitAuthMax: 30, rateLimitAuthMax: 30, rateLimitLastUpdated: '',
  // Colors
  bookingButtonColor: '#334155', currentBookingButtonColor: '#334155',
  statusAvailableColor: '#22c55e', currentStatusAvailableColor: '#22c55e',
  statusBusyColor: '#ef4444', currentStatusBusyColor: '#ef4444',
  statusUpcomingColor: '#f59e0b', currentStatusUpcomingColor: '#f59e0b',
  statusNotFoundColor: '#6b7280', currentStatusNotFoundColor: '#6b7280',
  colorMessage: null, colorMessageType: null, colorsLastUpdated: '',
  // Sync
  syncStatus: null, syncStatusLoading: true, syncStatusTick: Date.now(),
  // MQTT
  mqttEnabled: false, mqttBrokerUrl: 'mqtt://localhost:1883', mqttAuthentication: false,
  mqttUsername: '', mqttPassword: '', mqttDiscovery: '',
  mqttStatus: null, mqttConfigSaving: false, mqttConfigMessage: null, mqttConfigMessageType: null,
  mqttDisplays: [], mqttDisplaysLoading: false,
  mqttUpdateInfo: {},
  showTouchkioModal: false, touchkioModalDisplay: null,
  touchkioModalMessage: null, touchkioModalMessageType: null,
  touchkioModalBrightness: undefined, touchkioModalVolume: undefined, touchkioModalZoom: undefined,
  // Version
  appVersion: null
};

/**
 * Hook for loading and managing all admin configuration state.
 * @param {Function} getRequestHeaders - Returns request headers for API calls
 * @param {Function} handleUnauthorizedAccess - Handler for 401 responses
 * @returns {{ config, updateConfig, setField, configRef, loadVersion, loadLogoConfig, loadSyncStatus, loadConfigLocks, loadConnectedClients, loadCurrentConfig, loadMqttConfig, loadMqttStatus }}
 */
export function useAdminConfig(getRequestHeaders, handleUnauthorizedAccess) {
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const configRef = useRef(config);
  configRef.current = config;

  /** Batch-update helper — mirrors this.setState({ key: value }) */
  const updateConfig = useCallback((patch) => {
    setConfig(prev => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      return next === prev ? prev : (typeof patch === 'function' ? next : { ...prev, ...patch });
    });
  }, []);

  /** Setter for a single field — used by onFieldChange callbacks */
  const setField = useCallback((key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // ---- Loaders ----

  const loadVersion = useCallback(() => {
    fetchVersion().then(r => {
      if (r.ok && r.data?.version) updateConfig({ appVersion: r.data.version });
    }).catch(err => console.error('[Admin] Failed to load version:', err));
  }, [updateConfig]);

  const loadLogoConfig = useCallback(() => {
    fetchLogoConfig().then(r => {
      if (r.ok && r.data) updateConfig({ currentLogoDarkUrl: r.data.logoDarkUrl || '', currentLogoLightUrl: r.data.logoLightUrl || '' });
    }).catch(err => console.error('[Admin] Failed to load logo config:', err));
  }, [updateConfig]);

  const loadSyncStatus = useCallback(() => {
    fetchSyncStatus().then(r => {
      updateConfig({ syncStatus: r.ok ? r.data : null, syncStatusLoading: false });
    }).catch(err => {
      console.error('Error loading sync status:', err);
      updateConfig({ syncStatus: null, syncStatusLoading: false });
    });
  }, [updateConfig]);

  const loadConfigLocks = useCallback(() => {
    fetchConfigLocks().then(r => {
      if (!r.ok) return;
      const d = r.data;
      updateConfig({
        wifiLocked: d.wifiLocked || false, logoLocked: d.logoLocked || false,
        informationLocked: d.sidebarLocked || false, bookingLocked: d.bookingLocked || false,
        searchLocked: d.searchLocked || false, rateLimitLocked: d.rateLimitLocked || false,
        apiTokenLocked: d.apiTokenLocked || false, wifiApiTokenLocked: d.wifiApiTokenLocked || false,
        oauthLocked: d.oauthLocked || false, systemLocked: d.systemLocked || false,
        maintenanceLocked: d.maintenanceLocked || false, translationApiLocked: d.translationApiLocked || false
      });
    }).catch(err => console.error('Error loading config locks:', err));
  }, [updateConfig]);

  const loadConnectedClients = useCallback(() => {
    updateConfig({ connectedClientsLoading: true });
    fetchClients().then(r => {
      if (!r.ok) { updateConfig({ connectedClientsLoading: false }); return; }
      const clients = Array.isArray(r.data?.clients) ? r.data.clients : [];
      setConfig(prev => {
        const currentTarget = String(prev.sidebarTargetClientId || '');
        const stillExists = clients.some(c => String(c?.clientId || '') === currentTarget);
        return { ...prev, connectedClients: clients, connectedClientsLoading: false, sidebarTargetClientId: stillExists ? currentTarget : '' };
      });
    }).catch(err => { console.error('Error loading connected clients:', err); updateConfig({ connectedClientsLoading: false }); });
  }, [updateConfig]);

  const loadMqttConfig = useCallback(async () => {
    try {
      const data = await fetchMqttConfig(() => getRequestHeaders(false));
      if (data) updateConfig({ mqttEnabled: data.enabled || false, mqttBrokerUrl: data.brokerUrl || 'mqtt://localhost:1883', mqttAuthentication: data.authentication || false, mqttUsername: data.username || '', mqttPassword: data.password || '', mqttDiscovery: data.discovery || '' });
    } catch (err) { console.error('Failed to load MQTT config:', err); }
  }, [getRequestHeaders, updateConfig]);

  const loadMqttStatus = useCallback(async () => {
    try {
      const data = await fetchMqttStatus(() => getRequestHeaders(false));
      if (data) updateConfig({ mqttStatus: data });
    } catch (err) { console.error('Failed to load MQTT status:', err); }
  }, [getRequestHeaders, updateConfig]);

  const loadCurrentConfig = useCallback(() => {
    const wifiHeaders = getRequestHeaders(false);
    loadConnectedClients();

    loadWiFiConfig(wifiHeaders).then(r => {
      if (!r.ok) return;
      const d = r.data;
      updateConfig({
        currentSsid: d.ssid || '-', currentPassword: d.password || '-',
        wifiLastUpdated: fmtDate(d.lastUpdated), ssid: d.ssid || '', password: d.password || ''
      });
    }).catch(err => console.error('Error loading WiFi config:', err));

    fetchLogoConfig().then(r => {
      if (!r.ok) return;
      const d = r.data;
      updateConfig({
        currentLogoDarkUrl: d.logoDarkUrl || '-', currentLogoLightUrl: d.logoLightUrl || '-',
        logoLastUpdated: fmtDate(d.lastUpdated), logoDarkUrl: d.logoDarkUrl || '', logoLightUrl: d.logoLightUrl || ''
      });
    }).catch(err => console.error('Error loading logo config:', err));

    loadSidebarConfig().then(r => {
      if (!r.ok) return;
      const d = r.data;
      const globalSingleRoomDarkMode = d.singleRoomDarkMode !== undefined ? d.singleRoomDarkMode : false;
      const globalFlightboardDarkMode = d.flightboardDarkMode !== undefined ? d.flightboardDarkMode : true;
      setConfig(prev => {
        const patch = {
          currentShowWiFi: d.showWiFi !== undefined ? d.showWiFi : true,
          currentShowUpcomingMeetings: d.showUpcomingMeetings !== undefined ? d.showUpcomingMeetings : false,
          currentShowMeetingTitles: d.showMeetingTitles !== undefined ? d.showMeetingTitles : false,
          currentUpcomingMeetingsCount: pInt(d.upcomingMeetingsCount, 1, 3),
          currentMinimalHeaderStyle: d.minimalHeaderStyle || 'filled',
          currentSingleRoomDarkMode: globalSingleRoomDarkMode,
          currentFlightboardDarkMode: globalFlightboardDarkMode,
          currentAutoReloadEnabled: !!d.autoReloadEnabled,
          currentAutoReloadTime: d.autoReloadTime || '03:00',
          informationLastUpdated: fmtDate(d.lastUpdated),
          showWiFi: d.showWiFi !== undefined ? d.showWiFi : true,
          showUpcomingMeetings: d.showUpcomingMeetings !== undefined ? d.showUpcomingMeetings : false,
          showMeetingTitles: d.showMeetingTitles !== undefined ? d.showMeetingTitles : false,
          upcomingMeetingsCount: pInt(d.upcomingMeetingsCount, 1, 3),
          minimalHeaderStyle: d.minimalHeaderStyle || 'filled',
          singleRoomDarkMode: prev.sidebarTargetClientId ? prev.singleRoomDarkMode : globalSingleRoomDarkMode,
          flightboardDarkMode: globalFlightboardDarkMode,
          autoReloadEnabled: !!d.autoReloadEnabled,
          autoReloadTime: d.autoReloadTime || '03:00'
        };
        const targetClientId = String(prev.sidebarTargetClientId || '').trim();
        if (targetClientId) {
          loadSidebarConfig(targetClientId).then(tr => {
            if (tr.ok) setConfig(p => ({ ...p, singleRoomDarkMode: tr.data.singleRoomDarkMode !== undefined ? !!tr.data.singleRoomDarkMode : globalSingleRoomDarkMode }));
          }).catch(err => console.error('Error loading target sidebar config:', err));
        }
        return { ...prev, ...patch };
      });
    }).catch(err => console.error('Error loading information config:', err));

    loadBookingConfig().then(r => {
      if (!r.ok) return;
      const d = r.data;
      const roomFF = d.roomFeatureFlags && typeof d.roomFeatureFlags === 'object' ? d.roomFeatureFlags : {};
      const roomGroupFF = d.roomGroupFeatureFlags && typeof d.roomGroupFeatureFlags === 'object' ? d.roomGroupFeatureFlags : {};
      const ci = d.checkIn && typeof d.checkIn === 'object' ? d.checkIn : {};
      updateConfig({
        currentEnableBooking: d.enableBooking !== undefined ? d.enableBooking : true,
        bookingLastUpdated: fmtDate(d.lastUpdated),
        enableBooking: d.enableBooking !== undefined ? d.enableBooking : true,
        currentEnableExtendMeeting: d.enableExtendMeeting !== undefined ? d.enableExtendMeeting : false,
        enableExtendMeeting: d.enableExtendMeeting !== undefined ? d.enableExtendMeeting : false,
        bookingPermissionMissing: d.permissionMissing || false,
        bookingButtonColor: d.buttonColor || '#334155', currentBookingButtonColor: d.buttonColor || '#334155',
        currentCheckInEnabled: ci.enabled !== undefined ? !!ci.enabled : true, checkInEnabled: ci.enabled !== undefined ? !!ci.enabled : true,
        currentCheckInRequiredForExternalMeetings: ci.requiredForExternalMeetings !== undefined ? !!ci.requiredForExternalMeetings : true,
        checkInRequiredForExternalMeetings: ci.requiredForExternalMeetings !== undefined ? !!ci.requiredForExternalMeetings : true,
        currentCheckInEarlyMinutes: pInt(ci.earlyCheckInMinutes, 0, 5), checkInEarlyMinutes: pInt(ci.earlyCheckInMinutes, 0, 5),
        currentCheckInWindowMinutes: pInt(ci.windowMinutes, 1, 10), checkInWindowMinutes: pInt(ci.windowMinutes, 1, 10),
        currentCheckInAutoReleaseNoShow: ci.autoReleaseNoShow !== undefined ? !!ci.autoReleaseNoShow : true,
        checkInAutoReleaseNoShow: ci.autoReleaseNoShow !== undefined ? !!ci.autoReleaseNoShow : true,
        currentRoomFeatureFlags: roomFF, roomFeatureFlags: roomFF,
        currentRoomGroupFeatureFlags: roomGroupFF, roomGroupFeatureFlags: roomGroupFF
      });
    }).catch(err => console.error('Error loading booking config:', err));

    loadSearchConfig().then(r => {
      if (!r.ok) return;
      const d = r.data;
      updateConfig({
        currentSearchUseGraphAPI: d.useGraphAPI !== undefined ? !!d.useGraphAPI : true, searchUseGraphAPI: d.useGraphAPI !== undefined ? !!d.useGraphAPI : true,
        currentSearchMaxDays: pInt(d.maxDays, 1, 7), searchMaxDays: pInt(d.maxDays, 1, 7),
        currentSearchMaxRoomLists: pInt(d.maxRoomLists, 1, 5), searchMaxRoomLists: pInt(d.maxRoomLists, 1, 5),
        currentSearchMaxRooms: pInt(d.maxRooms, 1, 50), searchMaxRooms: pInt(d.maxRooms, 1, 50),
        currentSearchMaxItems: pInt(d.maxItems, 1, 100), searchMaxItems: pInt(d.maxItems, 1, 100),
        currentSearchPollIntervalMs: pInt(d.pollIntervalMs, 5000, 15000), searchPollIntervalMs: pInt(d.pollIntervalMs, 5000, 15000),
        searchLastUpdated: fmtDate(d.lastUpdated)
      });
    }).catch(err => console.error('Error loading search config:', err));

    loadRateLimitConfig().then(r => {
      if (!r.ok) return;
      const d = r.data;
      updateConfig({
        currentRateLimitApiWindowMs: pInt(d.apiWindowMs, 1000, 60000), rateLimitApiWindowMs: pInt(d.apiWindowMs, 1000, 60000),
        currentRateLimitApiMax: pInt(d.apiMax, 1, 300), rateLimitApiMax: pInt(d.apiMax, 1, 300),
        currentRateLimitWriteWindowMs: pInt(d.writeWindowMs, 1000, 60000), rateLimitWriteWindowMs: pInt(d.writeWindowMs, 1000, 60000),
        currentRateLimitWriteMax: pInt(d.writeMax, 1, 60), rateLimitWriteMax: pInt(d.writeMax, 1, 60),
        currentRateLimitAuthWindowMs: pInt(d.authWindowMs, 1000, 60000), rateLimitAuthWindowMs: pInt(d.authWindowMs, 1000, 60000),
        currentRateLimitAuthMax: pInt(d.authMax, 1, 30), rateLimitAuthMax: pInt(d.authMax, 1, 30),
        rateLimitLastUpdated: fmtDate(d.lastUpdated)
      });
    }).catch(err => console.error('Error loading rate-limit config:', err));

    loadTranslationApiConfig().then(r => {
      if (!r.ok) return;
      const d = r.data;
      updateConfig({
        currentTranslationApiEnabled: d.enabled !== undefined ? !!d.enabled : true, translationApiEnabled: d.enabled !== undefined ? !!d.enabled : true,
        currentTranslationApiUrl: String(d.url || '').trim() || 'https://translation.googleapis.com/language/translate/v2',
        translationApiUrl: String(d.url || '').trim() || 'https://translation.googleapis.com/language/translate/v2',
        currentTranslationApiTimeoutMs: pInt(d.timeoutMs, 3000, 20000), translationApiTimeoutMs: pInt(d.timeoutMs, 3000, 20000),
        currentTranslationApiHasApiKey: !!d.hasApiKey,
        translationApiLastUpdated: fmtDate(d.lastUpdated), translationApiApiKey: ''
      });
    }).catch(err => console.error('Error loading translation API config:', err));

    loadRoomLists().then(r => {
      if (!r.ok) return;
      const options = Array.isArray(r.data) ? r.data.filter(i => i && i.alias).map(i => ({ value: String(i.alias).trim().toLowerCase(), label: `${i.name || i.alias} (${String(i.alias).trim().toLowerCase()})` })).sort((a, b) => a.label.localeCompare(b.label)) : [];
      updateConfig({ availableRoomGroupOptions: options });
    }).catch(err => { console.error('Error loading roomlists:', err); updateConfig({ availableRoomGroupOptions: [] }); });

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
      updateConfig({ availableRoomOptions: Array.from(dedup.values()).sort((a, b) => a.label.localeCompare(b.label)) });
    }).catch(err => { console.error('Error loading rooms:', err); updateConfig({ availableRoomOptions: [] }); });

    loadMaintenanceStatus().then(r => {
      if (!r.ok) return;
      const d = r.data;
      updateConfig({
        currentMaintenanceEnabled: d.enabled === true, currentMaintenanceMessage: d.message || '',
        maintenanceLastUpdated: fmtDate(d.lastUpdated),
        maintenanceEnabled: d.enabled === true, maintenanceMessage: d.message || ''
      });
    }).catch(err => console.error('Error loading maintenance config:', err));

    const authHeaders = getRequestHeaders(false);

    loadSystemConfig(authHeaders).then(r => {
      if (!r.ok) { if (r.status === 401) handleUnauthorizedAccess(); return; }
      const d = r.data;
      const wips = Array.isArray(d.graphWebhookAllowedIps) ? d.graphWebhookAllowedIps.join(', ') : '';
      updateConfig({
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
        systemLastUpdated: fmtDate(d.lastUpdated)
      });
    }).catch(err => console.error('Error loading system config:', err));

    loadOAuthConfig(authHeaders).then(r => {
      if (!r.ok) { if (r.status === 401) handleUnauthorizedAccess(); return; }
      const d = r.data;
      const tenantId = d.tenantId || '';
      setConfig(prev => {
        const nextState = { ...prev, currentOauthClientId: d.clientId || '', currentOauthAuthority: tenantId, currentOauthHasClientSecret: !!d.hasClientSecret, oauthLastUpdated: fmtDate(d.lastUpdated) };
        if (!prev.oauthFormDirty) { nextState.oauthClientId = d.clientId || ''; nextState.oauthAuthority = tenantId; nextState.oauthClientSecret = ''; }
        return nextState;
      });
    }).catch(err => console.error('Error loading oauth config:', err));

    loadCertificateInfo(authHeaders).then(r => {
      if (r.ok && r.data) updateConfig({ certificateInfo: r.data.certificate || null });
    }).catch(err => console.error('Error loading certificate info:', err));

    loadApiTokenConfig(authHeaders).then(r => {
      if (!r.ok) { if (r.status === 401) handleUnauthorizedAccess(); return; }
      const d = r.data;
      updateConfig({
        currentApiTokenSource: d.source || 'default', currentApiTokenIsDefault: !!d.isDefault,
        apiTokenConfigLastUpdated: fmtDate(d.lastUpdated),
        currentWifiApiTokenSource: d.wifiSource || 'default', currentWifiApiTokenConfigured: !!d.wifiConfigured,
        wifiApiTokenConfigLastUpdated: fmtDate(d.wifiLastUpdated)
      });
    }).catch(err => console.error('Error loading API auth config:', err));

    loadI18nConfig().then(r => {
      if (!r.ok) return;
      const d = r.data;
      const mm = d && d.maintenanceMessages && typeof d.maintenanceMessages === 'object' ? d.maintenanceMessages : {};
      const at = d && d.adminTranslations && typeof d.adminTranslations === 'object' ? d.adminTranslations : {};
      const languages = Array.from(new Set([...Object.keys(defaultAdminTranslations || {}), ...Object.keys(mm || {}), ...Object.keys(at || {})])).map(l => String(l || '').trim().toLowerCase()).filter(Boolean).sort();
      setConfig(prev => {
        const prevLang = String(prev.translationLanguage || '').trim().toLowerCase();
        return {
          ...prev,
          currentMaintenanceTranslations: mm, maintenanceTranslationsText: JSON.stringify(mm, null, 2),
          currentAdminTranslations: at, adminTranslationsText: JSON.stringify(Object.keys(at).length > 0 ? at : defaultAdminTranslations, null, 2),
          translationLanguage: languages.includes(prevLang) ? prevLang : (languages[0] || 'en'),
          i18nLastUpdated: fmtDate(d.lastUpdated)
        };
      });
    }).catch(err => console.error('Error loading i18n config:', err));

    loadColorsConfig().then(r => {
      if (!r.ok) return;
      const d = r.data;
      updateConfig({
        bookingButtonColor: d.bookingButtonColor || '#334155', currentBookingButtonColor: d.bookingButtonColor || '#334155',
        statusAvailableColor: d.statusAvailableColor || '#22c55e', currentStatusAvailableColor: d.statusAvailableColor || '#22c55e',
        statusBusyColor: d.statusBusyColor || '#ef4444', currentStatusBusyColor: d.statusBusyColor || '#ef4444',
        statusUpcomingColor: d.statusUpcomingColor || '#f59e0b', currentStatusUpcomingColor: d.statusUpcomingColor || '#f59e0b',
        statusNotFoundColor: d.statusNotFoundColor || '#6b7280', currentStatusNotFoundColor: d.statusNotFoundColor || '#6b7280',
        colorsLastUpdated: fmtDate(d.lastUpdated)
      });
    }).catch(err => console.error('Error loading colors config:', err));

    loadMqttConfig();
    loadMqttStatus();
  }, [getRequestHeaders, handleUnauthorizedAccess, updateConfig, loadConnectedClients, loadMqttConfig, loadMqttStatus]);

  return {
    config, updateConfig, setField, configRef,
    loadVersion, loadLogoConfig, loadSyncStatus, loadConfigLocks,
    loadConnectedClients, loadCurrentConfig, loadMqttConfig, loadMqttStatus
  };
}

export { INITIAL_CONFIG };
