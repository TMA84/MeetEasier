/**
 * Admin API Service
 * Centralized API calls for the Admin panel
 */

/**
 * Get CSRF token from cookie
 * @returns {string} CSRF token or empty string
 */
const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)meeteasier_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
};

/**
 * Create headers with authorization token
 * @param {string} apiToken - API token
 * @param {boolean} includeContentType - Whether to include Content-Type header
 * @returns {Object} Headers object
 */
const createHeaders = (apiToken, includeContentType = true) => {
  const headers = {};
  if (apiToken) {
    headers['Authorization'] = `Bearer ${apiToken}`;
  }
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  // Always include CSRF token for cookie-based auth fallback
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  return headers;
};

/**
 * Handle API response
 * @param {Response} response - Fetch response
 * @returns {Promise} Response data or error
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP ${response.status}`);
  }
  return response.json();
};

// ============================================================================
// Authentication
// ============================================================================

export const adminApi = {
  // Auth
  login: (apiToken) => 
    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiToken })
    }),

  logout: () =>
    fetch('/api/admin/logout', { method: 'POST' }),

  verifySession: () =>
    fetch('/api/admin/session', { method: 'GET' })
      .then(response => response.status === 200),

  getBootstrapStatus: () =>
    fetch('/api/admin/bootstrap-status', { method: 'GET' })
      .then(handleResponse),

  bootstrapToken: (apiToken) =>
    fetch('/api/admin/bootstrap-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiToken })
    }),

  // ============================================================================
  // Configuration - GET
  // ============================================================================

  getWiFiConfig: (apiToken) =>
    fetch('/api/wifi', {
      headers: createHeaders(apiToken, false)
    }).then(handleResponse),

  getLogoConfig: () =>
    fetch('/api/logo').then(handleResponse),

  getSidebarConfig: () =>
    fetch('/api/sidebar').then(handleResponse),

  getBookingConfig: () =>
    fetch('/api/booking-config').then(handleResponse),

  getSearchConfig: () =>
    fetch('/api/search-config').then(handleResponse),

  getRateLimitConfig: () =>
    fetch('/api/rate-limit-config').then(handleResponse),

  getTranslationApiConfig: () =>
    fetch('/api/translation-api-config').then(handleResponse),

  getSystemConfig: (apiToken) =>
    fetch('/api/system-config', {
      headers: createHeaders(apiToken, false)
    }).then(handleResponse),

  getOAuthConfig: (apiToken) =>
    fetch('/api/oauth-config', {
      headers: createHeaders(apiToken, false)
    }).then(handleResponse),

  getApiTokenConfig: (apiToken) =>
    fetch('/api/api-token-config', {
      headers: createHeaders(apiToken, false)
    }).then(handleResponse),

  getI18nConfig: () =>
    fetch('/api/i18n').then(handleResponse),

  getColorsConfig: () =>
    fetch('/api/colors').then(handleResponse),

  getMaintenanceStatus: () =>
    fetch('/api/maintenance-status').then(handleResponse),

  getSyncStatus: () =>
    fetch('/api/sync-status').then(handleResponse),

  getConfigLocks: () =>
    fetch('/api/config-locks').then(handleResponse),

  getVersion: () =>
    fetch('/api/version').then(handleResponse),

  getRoomlists: () =>
    fetch('/api/roomlists').then(handleResponse),

  getRooms: () =>
    fetch('/api/rooms').then(handleResponse),

  getConnectedClients: () =>
    fetch('/api/connected-clients').then(handleResponse),

  // ============================================================================
  // Configuration - POST
  // ============================================================================

  updateWiFiConfig: (apiToken, data) =>
    fetch('/api/wifi', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateLogoConfig: (apiToken, data) =>
    fetch('/api/logo', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse),

  uploadLogo: (apiToken, formData) =>
    fetch('/api/logo/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiToken}` },
      body: formData
    }).then(handleResponse),

  updateSidebarConfig: (apiToken, data) =>
    fetch('/api/sidebar', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateBookingConfig: (apiToken, data) =>
    fetch('/api/booking-config', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateMaintenanceConfig: (apiToken, data) =>
    fetch('/api/maintenance', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateSystemConfig: (apiToken, data) =>
    fetch('/api/system-config', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateTranslationApiConfig: (apiToken, data) =>
    fetch('/api/translation-api-config', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateOAuthConfig: (apiToken, data) =>
    fetch('/api/oauth-config', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateApiTokenConfig: (apiToken, data) =>
    fetch('/api/api-token-config', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateSearchConfig: (apiToken, data) =>
    fetch('/api/search-config', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateRateLimitConfig: (apiToken, data) =>
    fetch('/api/rate-limit-config', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateI18nConfig: (apiToken, data) =>
    fetch('/api/i18n', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse),

  autoTranslate: (apiToken, data) =>
    fetch('/api/i18n/auto-translate', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateColorsConfig: (apiToken, data) =>
    fetch('/api/colors', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse),

  // ============================================================================
  // Backup & Restore
  // ============================================================================

  exportBackup: (apiToken) =>
    fetch('/api/config/backup', {
      method: 'GET',
      headers: createHeaders(apiToken, false)
    }).then(handleResponse),

  importBackup: (apiToken, data) =>
    fetch('/api/config/restore', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse),

  // ============================================================================
  // Audit & Monitoring
  // ============================================================================

  getAuditLogs: (apiToken, limit = 200) =>
    fetch(`/api/audit-logs?limit=${limit}`, {
      method: 'GET',
      headers: createHeaders(apiToken, false)
    }).then(handleResponse),

  getDisplays: (apiToken) =>
    fetch('/api/displays', {
      method: 'GET',
      headers: createHeaders(apiToken, false)
    }).then(handleResponse),

  deleteDisplay: (apiToken, clientId) =>
    fetch(`/api/displays/${encodeURIComponent(clientId)}`, {
      method: 'DELETE',
      headers: createHeaders(apiToken, false)
    }).then(handleResponse),

  // ============================================================================
  // MQTT
  // ============================================================================

  getMqttConfig: (apiToken) =>
    fetch('/api/mqtt-config', {
      headers: createHeaders(apiToken, false)
    }).then(handleResponse),

  updateMqttConfig: (apiToken, data) =>
    fetch('/api/mqtt-config', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse),

  getMqttStatus: (apiToken) =>
    fetch('/api/mqtt-status', {
      headers: createHeaders(apiToken, false)
    }).then(handleResponse),

  getMqttDisplays: (apiToken) =>
    fetch('/api/mqtt-displays', {
      headers: createHeaders(apiToken, false)
    }).then(handleResponse),

  // ============================================================================
  // Power Management
  // ============================================================================

  getPowerManagement: (apiToken) =>
    fetch('/api/power-management', {
      headers: createHeaders(apiToken, false)
    }).then(handleResponse),

  updatePowerManagement: (apiToken, data) =>
    fetch('/api/power-management', {
      method: 'POST',
      headers: createHeaders(apiToken),
      body: JSON.stringify(data)
    }).then(handleResponse)
};

export { getCsrfToken };
export default adminApi;
