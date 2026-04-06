/**
 * @file Admin config loading service functions.
 * Pure async functions that fetch configuration from the server.
 * Each returns the parsed data — setState is handled by the caller.
 */

/**
 * Generic GET helper with optional auth headers.
 * @param {string} url - API endpoint
 * @param {Object} [headers] - Optional headers
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
async function getConfig(url, headers) {
  const options = headers ? { headers } : {};
  const response = await fetch(url, options);
  if (response.status === 401) {
    return { ok: false, status: 401 };
  }
  if (!response.ok) {
    return { ok: false, status: response.status };
  }
  const data = await response.json();
  return { ok: true, data, status: response.status };
}

/**
 * Load WiFi configuration.
 * @param {Object} headers - Auth headers
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadWiFiConfig(headers) {
  return getConfig('/api/wifi', headers);
}

/**
 * Load logo configuration.
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadLogoConfig() {
  return getConfig('/api/logo');
}

/**
 * Load sidebar configuration, optionally for a specific display client.
 * @param {string} [targetClientId] - Optional display client ID
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadSidebarConfig(targetClientId) {
  const url = targetClientId
    ? `/api/sidebar?displayClientId=${encodeURIComponent(targetClientId)}`
    : '/api/sidebar';
  return getConfig(url);
}

/**
 * Load booking configuration.
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadBookingConfig() {
  return getConfig('/api/booking-config');
}

/**
 * Load search configuration.
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadSearchConfig() {
  return getConfig('/api/search-config');
}

/**
 * Load rate limit configuration.
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadRateLimitConfig() {
  return getConfig('/api/rate-limit-config');
}

/**
 * Load translation API configuration.
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadTranslationApiConfig() {
  return getConfig('/api/translation-api-config');
}

/**
 * Load maintenance status.
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadMaintenanceStatus() {
  return getConfig('/api/maintenance-status');
}

/**
 * Load system configuration.
 * @param {Object} headers - Auth headers
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadSystemConfig(headers) {
  return getConfig('/api/system-config', headers);
}

/**
 * Load OAuth configuration.
 * @param {Object} headers - Auth headers
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadOAuthConfig(headers) {
  return getConfig('/api/oauth-config', headers);
}

/**
 * Load OAuth certificate information.
 * @param {Object} headers - Auth headers
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadCertificateInfo(headers) {
  return getConfig('/api/oauth-certificate', headers);
}

/**
 * Load API token configuration.
 * @param {Object} headers - Auth headers
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadApiTokenConfig(headers) {
  return getConfig('/api/api-token-config', headers);
}

/**
 * Load i18n configuration.
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadI18nConfig() {
  return getConfig('/api/i18n');
}

/**
 * Load colors configuration.
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadColorsConfig() {
  return getConfig('/api/colors');
}

/**
 * Load room lists from the server.
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadRoomLists() {
  return getConfig('/api/roomlists');
}

/**
 * Load rooms from the server.
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadRooms() {
  return getConfig('/api/rooms');
}

/**
 * Load configuration lock states.
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadConfigLocks() {
  return getConfig('/api/config-locks');
}

/**
 * Load connected clients list.
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadConnectedClients() {
  return getConfig('/api/connected-clients');
}

/**
 * Load sync status.
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadSyncStatus() {
  return getConfig('/api/sync-status');
}

/**
 * Load application version.
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadVersion() {
  return getConfig('/api/version');
}

/**
 * Load bootstrap status for initial setup.
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function loadBootstrapStatus() {
  return getConfig('/api/admin/bootstrap-status');
}

/**
 * Verify if the current admin session is valid.
 * @returns {Promise<boolean>} True if session is valid
 */
export async function verifyAdminSession() {
  const response = await fetch('/api/admin/session', { method: 'GET' });
  return response.status === 200;
}
