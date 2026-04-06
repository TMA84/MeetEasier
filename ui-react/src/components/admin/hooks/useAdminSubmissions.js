/**
 * @file useAdminSubmissions.js
 * @description Hook for all admin form submission handlers.
 */
import { useCallback } from 'react';
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
} from '../services/admin-submissions.js';

/**
 * @param {Function} getRequestHeaders
 * @param {Function} handleUnauthorizedAccess
 * @param {Function} getTranslations
 * @param {Object} configRef - ref to current config state
 * @param {Function} updateConfig
 * @param {Function} loadCurrentConfig
 * @param {Function} loadConfigLocks
 */
export function useAdminSubmissions(getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig, loadConfigLocks) {

  const handleWiFiSubmit = useCallback((e) => {
    e.preventDefault();
    const t = getTranslations();
    const { ssid, password } = configRef.current;
    submitWiFiConfig(getRequestHeaders, { ssid, password })
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); return; }
        if (r.ok) { updateConfig({ wifiMessage: t.wifiSuccessMessage, wifiMessageType: 'success' }); loadCurrentConfig(); setTimeout(() => updateConfig({ wifiMessage: null, wifiMessageType: null }), 5000); }
        else updateConfig({ wifiMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, wifiMessageType: 'error' });
      }).catch(err => updateConfig({ wifiMessage: `${t.errorPrefix} ${err.message}`, wifiMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig]);

  const handleLogoSubmit = useCallback(async (e) => {
    e.preventDefault();
    const t = getTranslations();
    const { logoDarkUrl, logoLightUrl, logoDarkFile, logoLightFile, uploadMode } = configRef.current;
    try {
      let finalDark = logoDarkUrl, finalLight = logoLightUrl;
      if (uploadMode === 'file') {
        if (logoDarkFile) { const formData = new FormData(); formData.append('logo', logoDarkFile); formData.append('logoType', 'dark'); const r = await uploadLogoFile(getRequestHeaders, formData); if (r.status === 401) { handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); } if (!r.ok) throw new Error(r.data?.error || t.errorUnknown); finalDark = r.data.logoUrl; }
        if (logoLightFile) { const formData = new FormData(); formData.append('logo', logoLightFile); formData.append('logoType', 'light'); const r = await uploadLogoFile(getRequestHeaders, formData); if (r.status === 401) { handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); } if (!r.ok) throw new Error(r.data?.error || t.errorUnknown); finalLight = r.data.logoUrl; }
        if (!logoDarkFile && !logoLightFile) throw new Error('Please select at least one logo file to upload');
      }
      const r = await submitLogoConfig(getRequestHeaders, { logoDarkUrl: finalDark, logoLightUrl: finalLight });
      if (r.status === 401) { handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); }
      if (!r.ok) throw new Error(r.data?.error || t.errorUnknown);
      updateConfig({ logoMessage: t.logoSuccessMessage, logoMessageType: 'success', logoDarkFile: null, logoLightFile: null });
      loadCurrentConfig();
      const darkInput = document.getElementById('logoDarkFile'); const lightInput = document.getElementById('logoLightFile');
      if (darkInput) darkInput.value = ''; if (lightInput) lightInput.value = '';
      setTimeout(() => updateConfig({ logoMessage: null, logoMessageType: null }), 5000);
    } catch (err) { updateConfig({ logoMessage: `${t.errorPrefix} ${err.message}`, logoMessageType: 'error' }); }
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig]);

  const handleSidebarSubmit = useCallback((e) => {
    e.preventDefault();
    const t = getTranslations();
    const { showWiFi, showUpcomingMeetings, showMeetingTitles, minimalHeaderStyle, upcomingMeetingsCount, singleRoomDarkMode, flightboardDarkMode, sidebarTargetClientId } = configRef.current;
    const count = Number.isFinite(Number(upcomingMeetingsCount)) ? Math.min(Math.max(parseInt(upcomingMeetingsCount, 10), 1), 10) : 3;
    const targetId = String(sidebarTargetClientId || '').trim();
    const payload = targetId ? { targetClientId: targetId, singleRoomDarkMode } : { showWiFi, showUpcomingMeetings, showMeetingTitles, minimalHeaderStyle, upcomingMeetingsCount: count, singleRoomDarkMode, flightboardDarkMode };
    submitSidebarConfig(getRequestHeaders, payload)
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); return; }
        if (r.ok) { updateConfig({ informationMessage: t.sidebarSuccessMessage, informationMessageType: 'success' }); loadCurrentConfig(); setTimeout(() => updateConfig({ informationMessage: null, informationMessageType: null }), 5000); }
        else updateConfig({ informationMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, informationMessageType: 'error' });
      }).catch(err => updateConfig({ informationMessage: `${t.errorPrefix} ${err.message}`, informationMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig]);

  const handleBookingSubmit = useCallback((e) => {
    e.preventDefault();
    const t = getTranslations();
    const { enableBooking, enableExtendMeeting, bookingButtonColor, checkInEnabled, checkInRequiredForExternalMeetings, checkInEarlyMinutes, checkInWindowMinutes, checkInAutoReleaseNoShow, roomFeatureFlags, roomGroupFeatureFlags } = configRef.current;
    submitBookingConfig(getRequestHeaders, { enableBooking, enableExtendMeeting, buttonColor: bookingButtonColor, checkIn: { enabled: !!checkInEnabled, requiredForExternalMeetings: !!checkInRequiredForExternalMeetings, earlyCheckInMinutes: Math.max(parseInt(checkInEarlyMinutes, 10) || 0, 0), windowMinutes: Math.max(parseInt(checkInWindowMinutes, 10) || 1, 1), autoReleaseNoShow: !!checkInAutoReleaseNoShow }, roomFeatureFlags, roomGroupFeatureFlags })
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); return; }
        if (r.ok) { updateConfig({ bookingMessage: t.bookingSuccessMessage, bookingMessageType: 'success' }); loadCurrentConfig(); setTimeout(() => updateConfig({ bookingMessage: null, bookingMessageType: null }), 5000); }
        else updateConfig({ bookingMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, bookingMessageType: 'error' });
      }).catch(err => updateConfig({ bookingMessage: `${t.errorPrefix} ${err.message}`, bookingMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig]);

  const handleMaintenanceSubmit = useCallback((e) => {
    e.preventDefault();
    const t = getTranslations();
    const { maintenanceEnabled, maintenanceMessage } = configRef.current;
    submitMaintenanceConfig(getRequestHeaders, { enabled: maintenanceEnabled, message: maintenanceMessage })
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); return; }
        if (r.ok) { updateConfig({ maintenanceMessageBanner: t.maintenanceSuccessMessage, maintenanceMessageType: 'success' }); loadCurrentConfig(); }
        else updateConfig({ maintenanceMessageBanner: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, maintenanceMessageType: 'error' });
      }).catch(err => updateConfig({ maintenanceMessageBanner: `${t.errorPrefix} ${err.message}`, maintenanceMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig]);

  const handleSystemSubmit = useCallback((e) => {
    e.preventDefault();
    const t = getTranslations();
    const s = configRef.current;
    submitSystemConfig(getRequestHeaders, {
      startupValidationStrict: !!s.systemStartupValidationStrict, exposeDetailedErrors: !!s.systemExposeDetailedErrors,
      hstsMaxAge: Math.max(parseInt(s.systemHstsMaxAge, 10) || 0, 0), rateLimitMaxBuckets: Math.max(parseInt(s.systemRateLimitMaxBuckets, 10) || 1000, 1000),
      displayTrackingMode: s.systemDisplayTrackingMode, displayTrackingRetentionHours: Math.max(Math.min(parseInt(s.systemDisplayTrackingRetentionHours, 10) || 2, 168), 1),
      displayTrackingCleanupMinutes: Math.max(Math.min(parseInt(s.systemDisplayTrackingCleanupMinutes, 10) || 5, 60), 0),
      displayIpWhitelistEnabled: !!s.systemDisplayIpWhitelistEnabled, displayIpWhitelist: String(s.systemDisplayIpWhitelist || '').split('\n').map(x => x.trim()).filter(Boolean),
      trustReverseProxy: !!s.systemTrustReverseProxy, demoMode: !!s.demoMode
    }).then(r => {
      if (r.status === 401) { handleUnauthorizedAccess(); return; }
      if (r.ok) { updateConfig({ systemMessage: t.systemConfigUpdateSuccess || 'System configuration updated successfully.', systemMessageType: 'success' }); loadCurrentConfig(); setTimeout(() => updateConfig({ systemMessage: null, systemMessageType: null }), 5000); }
      else updateConfig({ systemMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, systemMessageType: 'error' });
    }).catch(err => updateConfig({ systemMessage: `${t.errorPrefix} ${err.message}`, systemMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig]);

  const handleGraphRuntimeSubmit = useCallback((e) => {
    e.preventDefault();
    const t = getTranslations();
    const s = configRef.current;
    const webhookIps = String(s.systemGraphWebhookAllowedIps || '').split(',').map(x => x.trim()).filter(Boolean);
    submitGraphRuntimeConfig(getRequestHeaders, {
      graphWebhookEnabled: !!s.systemGraphWebhookEnabled, graphWebhookClientState: String(s.systemGraphWebhookClientState || '').trim(), graphWebhookAllowedIps: webhookIps,
      graphFetchTimeoutMs: Math.max(parseInt(s.systemGraphFetchTimeoutMs, 10) || 1000, 1000), graphFetchRetryAttempts: Math.max(parseInt(s.systemGraphFetchRetryAttempts, 10) || 0, 0), graphFetchRetryBaseMs: Math.max(parseInt(s.systemGraphFetchRetryBaseMs, 10) || 50, 50)
    }).then(r => {
      if (r.status === 401) { handleUnauthorizedAccess(); return; }
      if (r.ok) { updateConfig({ graphRuntimeMessage: t.graphRuntimeUpdateSuccess || 'Graph runtime configuration updated successfully.', graphRuntimeMessageType: 'success' }); loadCurrentConfig(); setTimeout(() => updateConfig({ graphRuntimeMessage: null, graphRuntimeMessageType: null }), 5000); }
      else updateConfig({ graphRuntimeMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, graphRuntimeMessageType: 'error' });
    }).catch(err => updateConfig({ graphRuntimeMessage: `${t.errorPrefix} ${err.message}`, graphRuntimeMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig]);

  const handleTranslationApiSubmit = useCallback((e) => {
    e.preventDefault();
    const t = getTranslations();
    const s = configRef.current;
    const payload = { enabled: !!s.translationApiEnabled, url: String(s.translationApiUrl || '').trim(), timeoutMs: Math.max(parseInt(s.translationApiTimeoutMs, 10) || 3000, 3000) };
    if (String(s.translationApiApiKey || '').trim()) payload.apiKey = String(s.translationApiApiKey || '').trim();
    submitTranslationApiConfig(getRequestHeaders, payload)
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); return; }
        if (r.ok) { updateConfig({ translationApiMessage: t.translationApiSuccessMessage || 'Translation API configuration updated successfully.', translationApiMessageType: 'success', translationApiApiKey: '' }); loadCurrentConfig(); setTimeout(() => updateConfig({ translationApiMessage: null, translationApiMessageType: null }), 5000); }
        else updateConfig({ translationApiMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, translationApiMessageType: 'error' });
      }).catch(err => updateConfig({ translationApiMessage: `${t.errorPrefix} ${err.message}`, translationApiMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig]);

  const handleOAuthSubmit = useCallback((e) => {
    e.preventDefault();
    const t = getTranslations();
    const s = configRef.current;
    submitOAuthConfig(getRequestHeaders, { clientId: String(s.oauthClientId || '').trim(), tenantId: String(s.oauthAuthority || '').trim(), clientSecret: s.oauthClientSecret })
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); return; }
        if (r.ok) { updateConfig({ oauthMessage: t.oauthConfigUpdateSuccess || 'OAuth configuration updated successfully.', oauthMessageType: 'success', oauthClientSecret: '', oauthFormDirty: false }); loadCurrentConfig(); setTimeout(() => updateConfig({ oauthMessage: null, oauthMessageType: null }), 5000); }
        else updateConfig({ oauthMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, oauthMessageType: 'error' });
      }).catch(err => updateConfig({ oauthMessage: `${t.errorPrefix} ${err.message}`, oauthMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig]);

  const handleGenerateCertificate = useCallback(() => {
    const t = getTranslations();
    updateConfig({ certificateLoading: true, certificateMessage: null, oauthFormDirty: true });
    generateCertificate(getRequestHeaders, { validityYears: 3 })
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); }
        if (!r.ok) throw new Error(r.data?.error || t.errorUnknown);
        updateConfig({ certificateMessage: t.certGenerateSuccess || 'Certificate generated successfully. Download the .pem file and upload it to Azure AD.', certificateMessageType: 'success', certificateLoading: false });
        loadCurrentConfig(); setTimeout(() => updateConfig({ certificateMessage: null, certificateMessageType: null }), 8000);
      }).catch(err => updateConfig({ certificateMessage: `${t.errorPrefix} ${err.message}`, certificateMessageType: 'error', certificateLoading: false }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, updateConfig, loadCurrentConfig]);

  const handleDownloadCertificate = useCallback(() => {
    downloadCertificate(getRequestHeaders)
      .then(({ blob, filename }) => { const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url); })
      .catch(err => { const t = getTranslations(); updateConfig({ certificateMessage: `${t.errorPrefix} ${err.message}`, certificateMessageType: 'error' }); });
  }, [getRequestHeaders, getTranslations, updateConfig]);

  const handleDeleteCertificate = useCallback(() => {
    const t = getTranslations();
    if (!window.confirm(t.certDeleteConfirm || 'Delete the certificate? Authentication will revert to Client Secret.')) return;
    deleteCertificate(getRequestHeaders)
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); }
        if (!r.ok) throw new Error(r.data?.error || t.errorUnknown);
        updateConfig({ certificateMessage: t.certDeleteSuccess || 'Certificate deleted. Reverted to Client Secret authentication.', certificateMessageType: 'success' });
        loadCurrentConfig(); setTimeout(() => updateConfig({ certificateMessage: null, certificateMessageType: null }), 5000);
      }).catch(err => updateConfig({ certificateMessage: `${t.errorPrefix} ${err.message}`, certificateMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, updateConfig, loadCurrentConfig]);

  const handleApiTokenSubmit = useCallback((e) => {
    e.preventDefault();
    const t = getTranslations();
    const s = configRef.current;
    const trimmed = String(s.newApiToken || '').trim();
    const confirm = String(s.newApiTokenConfirm || '').trim();
    if (!trimmed || trimmed.length < 8) { updateConfig({ apiTokenConfigMessage: `${t.errorPrefix} ${t.apiTokenConfigMinLengthError || 'API token must have at least 8 characters.'}`, apiTokenConfigMessageType: 'error' }); return; }
    if (trimmed !== confirm) { updateConfig({ apiTokenConfigMessage: `${t.errorPrefix} ${t.apiTokenConfigMismatchError || 'New API token and confirmation do not match.'}`, apiTokenConfigMessageType: 'error' }); return; }
    submitApiTokenConfig(getRequestHeaders, { newToken: trimmed })
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); return; }
        if (r.ok) { updateConfig({ newApiToken: '', newApiTokenConfirm: '', apiTokenConfigMessage: t.apiTokenConfigUpdateSuccess || 'API token updated successfully.', apiTokenConfigMessageType: 'success' }); loadConfigLocks(); loadCurrentConfig(); }
        else updateConfig({ apiTokenConfigMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, apiTokenConfigMessageType: 'error' });
      }).catch(err => updateConfig({ apiTokenConfigMessage: `${t.errorPrefix} ${err.message}`, apiTokenConfigMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig, loadConfigLocks]);

  const handleWiFiApiTokenSubmit = useCallback((e) => {
    e.preventDefault();
    const t = getTranslations();
    const s = configRef.current;
    const trimmed = String(s.newWifiApiToken || '').trim();
    const confirm = String(s.newWifiApiTokenConfirm || '').trim();
    if (!trimmed || trimmed.length < 8) { updateConfig({ wifiApiTokenConfigMessage: `${t.errorPrefix} ${t.apiTokenConfigMinLengthError || 'API token must have at least 8 characters.'}`, wifiApiTokenConfigMessageType: 'error' }); return; }
    if (trimmed !== confirm) { updateConfig({ wifiApiTokenConfigMessage: `${t.errorPrefix} ${t.apiTokenConfigMismatchError || 'New API token and confirmation do not match.'}`, wifiApiTokenConfigMessageType: 'error' }); return; }
    submitApiTokenConfig(getRequestHeaders, { newWifiToken: trimmed })
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); return; }
        if (r.ok) { updateConfig({ newWifiApiToken: '', newWifiApiTokenConfirm: '', wifiApiTokenConfigMessage: t.wifiApiTokenConfigUpdateSuccess || 'WiFi API token updated successfully.', wifiApiTokenConfigMessageType: 'success' }); loadConfigLocks(); loadCurrentConfig(); }
        else updateConfig({ wifiApiTokenConfigMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, wifiApiTokenConfigMessageType: 'error' });
      }).catch(err => updateConfig({ wifiApiTokenConfigMessage: `${t.errorPrefix} ${err.message}`, wifiApiTokenConfigMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig, loadConfigLocks]);

  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault();
    const t = getTranslations();
    const s = configRef.current;
    submitSearchConfig(getRequestHeaders, { useGraphAPI: !!s.searchUseGraphAPI, maxDays: Math.max(parseInt(s.searchMaxDays, 10) || 1, 1), maxRoomLists: Math.max(parseInt(s.searchMaxRoomLists, 10) || 1, 1), maxRooms: Math.max(parseInt(s.searchMaxRooms, 10) || 1, 1), maxItems: Math.max(parseInt(s.searchMaxItems, 10) || 1, 1), pollIntervalMs: Math.max(parseInt(s.searchPollIntervalMs, 10) || 5000, 5000) })
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); return; }
        if (r.ok) { updateConfig({ searchMessage: 'Search configuration updated successfully.', searchMessageType: 'success' }); loadCurrentConfig(); setTimeout(() => updateConfig({ searchMessage: null, searchMessageType: null }), 5000); }
        else updateConfig({ searchMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, searchMessageType: 'error' });
      }).catch(err => updateConfig({ searchMessage: `${t.errorPrefix} ${err.message}`, searchMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig]);

  const handleRateLimitSubmit = useCallback((e) => {
    e.preventDefault();
    const t = getTranslations();
    const s = configRef.current;
    submitRateLimitConfig(getRequestHeaders, { apiWindowMs: Math.max(parseInt(s.rateLimitApiWindowMs, 10) || 1000, 1000), apiMax: Math.max(parseInt(s.rateLimitApiMax, 10) || 1, 1), writeWindowMs: Math.max(parseInt(s.rateLimitWriteWindowMs, 10) || 1000, 1000), writeMax: Math.max(parseInt(s.rateLimitWriteMax, 10) || 1, 1), authWindowMs: Math.max(parseInt(s.rateLimitAuthWindowMs, 10) || 1000, 1000), authMax: Math.max(parseInt(s.rateLimitAuthMax, 10) || 1, 1) })
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); return; }
        if (r.ok) { updateConfig({ rateLimitMessage: 'Rate limit configuration updated successfully.', rateLimitMessageType: 'success' }); loadCurrentConfig(); setTimeout(() => updateConfig({ rateLimitMessage: null, rateLimitMessageType: null }), 5000); }
        else updateConfig({ rateLimitMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, rateLimitMessageType: 'error' });
      }).catch(err => updateConfig({ rateLimitMessage: `${t.errorPrefix} ${err.message}`, rateLimitMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig]);

  const handleColorsSubmit = useCallback((e) => {
    e.preventDefault();
    const t = getTranslations();
    const { bookingButtonColor, statusAvailableColor, statusBusyColor, statusUpcomingColor, statusNotFoundColor } = configRef.current;
    submitColorsConfig(getRequestHeaders, { bookingButtonColor, statusAvailableColor, statusBusyColor, statusUpcomingColor, statusNotFoundColor })
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); return; }
        updateConfig({ colorMessage: t.colorsSuccessMessage, colorMessageType: 'success', currentBookingButtonColor: bookingButtonColor, currentStatusAvailableColor: statusAvailableColor, currentStatusBusyColor: statusBusyColor, currentStatusUpcomingColor: statusUpcomingColor, currentStatusNotFoundColor: statusNotFoundColor });
        setTimeout(() => updateConfig({ colorMessage: null }), 3000);
      }).catch(err => updateConfig({ colorMessage: `${t.errorPrefix} ${err.message}`, colorMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig]);

  const handleExportBackup = useCallback(() => {
    const t = getTranslations();
    submitBackupExport(getRequestHeaders)
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); return; }
        updateConfig({ backupPayloadText: JSON.stringify(r.data, null, 2), backupMessage: t.backupSuccessExport, backupMessageType: 'success' });
      }).catch(err => updateConfig({ backupMessage: `${t.errorPrefix} ${err.message}`, backupMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, updateConfig]);

  const handleImportBackup = useCallback(() => {
    const t = getTranslations();
    let parsed;
    try { parsed = JSON.parse(configRef.current.backupPayloadText || '{}'); } catch (error) { updateConfig({ backupMessage: `${t.errorPrefix} ${error.message}`, backupMessageType: 'error' }); return; }
    submitBackupImport(getRequestHeaders, parsed)
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); return; }
        if (r.ok) { updateConfig({ backupMessage: t.backupSuccessImport, backupMessageType: 'success' }); loadCurrentConfig(); }
        else updateConfig({ backupMessage: `${t.errorPrefix} ${r.data?.error || t.errorUnknown}`, backupMessageType: 'error' });
      }).catch(err => updateConfig({ backupMessage: `${t.errorPrefix} ${err.message}`, backupMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, loadCurrentConfig]);

  const handleLoadAuditLogs = useCallback(() => {
    const t = getTranslations();
    fetchAuditLogs(getRequestHeaders)
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); return; }
        updateConfig({ auditLogs: Array.isArray(r.data?.logs) ? r.data.logs : [], auditMessage: null, auditMessageType: null });
      }).catch(err => updateConfig({ auditMessage: `${t.errorPrefix} ${err.message}`, auditMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, updateConfig]);

  const handleLoadConnectedDisplays = useCallback(() => {
    const t = getTranslations();
    updateConfig({ connectedDisplaysLoading: true });
    return fetchConnectedDisplays(getRequestHeaders)
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); return; }
        updateConfig({ connectedDisplays: Array.isArray(r.data?.displays) ? r.data.displays : [], connectedDisplaysMessage: null, connectedDisplaysMessageType: null, connectedDisplaysLoading: false });
      }).catch(err => updateConfig({ connectedDisplaysMessage: `${t.errorPrefix} ${err.message}`, connectedDisplaysMessageType: 'error', connectedDisplaysLoading: false }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, updateConfig]);

  const handleDeleteDisplay = useCallback((clientId) => {
    const t = getTranslations();
    if (!window.confirm(t.connectedDisplaysDeleteConfirm || 'Are you sure you want to remove this display?')) return;
    apiDeleteDisplay(getRequestHeaders, clientId)
      .then(r => {
        if (r.status === 401) { handleUnauthorizedAccess(); return; }
        if (r.ok) { updateConfig({ connectedDisplaysMessage: t.connectedDisplaysDeleteSuccess || 'Display removed successfully.', connectedDisplaysMessageType: 'success' }); handleLoadConnectedDisplays(); }
        else updateConfig({ connectedDisplaysMessage: `${t.errorPrefix} ${r.data?.error || t.connectedDisplaysDeleteError}`, connectedDisplaysMessageType: 'error' });
      }).catch(err => updateConfig({ connectedDisplaysMessage: `${t.errorPrefix} ${err.message}`, connectedDisplaysMessageType: 'error' }));
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, updateConfig, handleLoadConnectedDisplays]);

  const handleOpenPowerManagementModal = useCallback(async (clientId) => {
    const s = configRef.current;
    let display = null, hasMqtt = false;
    if (clientId === '__global__') { hasMqtt = s.connectedDisplays.some(d => d.mqtt && d.mqtt.connected); }
    else { display = s.connectedDisplays.find(d => d.id === clientId); hasMqtt = display && display.mqtt && display.mqtt.connected; }
    try {
      const config = clientId === '__global__'
        ? ((await fetchPowerManagementConfig(getRequestHeaders, clientId)).global || { mode: 'browser', schedule: { enabled: false, startTime: '20:00', endTime: '07:00', weekendMode: false } })
        : await fetchPowerManagementConfig(getRequestHeaders, clientId);
      let selectedMode = config.mode || 'browser';
      if (!config.mode && hasMqtt && clientId !== '__global__') selectedMode = 'mqtt';
      let mqttHostname = config.mqttHostname || '';
      if (hasMqtt && !mqttHostname && display && display.mqtt) mqttHostname = display.mqtt.deviceId || display.mqtt.hostname || '';
      updateConfig({ showPowerManagementModal: true, powerManagementClientId: clientId, powerManagementMode: selectedMode, powerManagementMqttHostname: mqttHostname, powerManagementScheduleEnabled: config.schedule?.enabled || false, powerManagementStartTime: config.schedule?.startTime || '20:00', powerManagementEndTime: config.schedule?.endTime || '07:00', powerManagementWeekendMode: config.schedule?.weekendMode || false, powerManagementMessage: null, powerManagementHasMqtt: hasMqtt });
    } catch (err) {
      console.error('Error loading power management config:', err);
      updateConfig({ showPowerManagementModal: true, powerManagementClientId: clientId, powerManagementMode: hasMqtt && clientId !== '__global__' ? 'mqtt' : 'browser', powerManagementMqttHostname: display?.mqtt?.deviceId || display?.mqtt?.hostname || '', powerManagementScheduleEnabled: false, powerManagementStartTime: '20:00', powerManagementEndTime: '07:00', powerManagementWeekendMode: false, powerManagementMessage: null, powerManagementHasMqtt: hasMqtt });
    }
  }, [getRequestHeaders, configRef, updateConfig]);

  const handleClosePowerManagementModal = useCallback(() => {
    updateConfig({ showPowerManagementModal: false, powerManagementClientId: null, powerManagementMessage: null });
  }, [updateConfig]);

  const handleSavePowerManagement = useCallback(async () => {
    const t = getTranslations();
    const s = configRef.current;
    const payload = { mode: s.powerManagementMode, schedule: { enabled: s.powerManagementScheduleEnabled, startTime: s.powerManagementStartTime, endTime: s.powerManagementEndTime, weekendMode: s.powerManagementWeekendMode } };
    if (s.powerManagementMode === 'mqtt') payload.mqttHostname = s.powerManagementMqttHostname || '';
    try {
      const r = await submitPowerManagement(getRequestHeaders, s.powerManagementClientId, payload);
      if (r.status === 401) { handleUnauthorizedAccess(); throw new Error(t.errorUnauthorized); }
      if (r.ok) { updateConfig({ powerManagementMessage: t.powerManagementSaveSuccess || 'Power management configuration saved successfully.', powerManagementMessageType: 'success' }); setTimeout(() => handleClosePowerManagementModal(), 2000); }
      else throw new Error(r.data?.error || t.powerManagementSaveError);
    } catch (err) { updateConfig({ powerManagementMessage: `${t.errorPrefix} ${err.message}`, powerManagementMessageType: 'error' }); }
  }, [getRequestHeaders, handleUnauthorizedAccess, getTranslations, configRef, updateConfig, handleClosePowerManagementModal]);

  return {
    handleWiFiSubmit, handleLogoSubmit, handleSidebarSubmit, handleBookingSubmit,
    handleMaintenanceSubmit, handleSystemSubmit, handleGraphRuntimeSubmit,
    handleTranslationApiSubmit, handleOAuthSubmit,
    handleGenerateCertificate, handleDownloadCertificate, handleDeleteCertificate,
    handleApiTokenSubmit, handleWiFiApiTokenSubmit,
    handleSearchSubmit, handleRateLimitSubmit, handleColorsSubmit,
    handleExportBackup, handleImportBackup, handleLoadAuditLogs,
    handleLoadConnectedDisplays, handleDeleteDisplay,
    handleOpenPowerManagementModal, handleClosePowerManagementModal, handleSavePowerManagement
  };
}
