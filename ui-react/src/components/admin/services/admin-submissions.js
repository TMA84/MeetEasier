/**
 * @file Admin form submission service functions.
 * Pure async functions that POST config updates to the server.
 * Each returns { ok, data, status } — setState is handled by the caller.
 */

/**
 * Generic POST helper. Returns parsed result with ok/status/data.
 * @param {string} url - API endpoint
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - JSON body
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
async function postConfig(url, getHeaders, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const status = response.status;
  if (status === 401) {
    return { ok: false, status: 401 };
  }
  const data = await response.json();
  return { ok: !!data.success, data, status };
}

/**
 * Submit WiFi configuration.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - WiFi config data
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitWiFiConfig(getHeaders, payload) {
  return postConfig('/api/wifi', getHeaders, payload);
}

/**
 * Submit logo configuration.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - Logo config data
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitLogoConfig(getHeaders, payload) {
  return postConfig('/api/logo', getHeaders, payload);
}

/**
 * Upload a logo image file via FormData.
 * @param {Function} getHeaders - Returns request headers
 * @param {FormData} formData - Form data with logo file
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function uploadLogoFile(getHeaders, formData) {
  const headers = getHeaders();
  // Remove Content-Type for FormData — browser sets it with boundary
  delete headers['Content-Type'];
  const response = await fetch('/api/logo/upload', {
    method: 'POST',
    headers,
    body: formData
  });
  if (response.status === 401) {
    return { ok: false, status: 401 };
  }
  const data = await response.json();
  return { ok: !!data.success, data, status: response.status };
}

/**
 * Submit sidebar configuration.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - Sidebar config data
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitSidebarConfig(getHeaders, payload) {
  return postConfig('/api/sidebar', getHeaders, payload);
}

/**
 * Submit booking configuration.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - Booking config data
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitBookingConfig(getHeaders, payload) {
  return postConfig('/api/booking-config', getHeaders, payload);
}

/**
 * Submit maintenance configuration.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - Maintenance config data
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitMaintenanceConfig(getHeaders, payload) {
  return postConfig('/api/maintenance', getHeaders, payload);
}

/**
 * Submit system configuration.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - System config data
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitSystemConfig(getHeaders, payload) {
  return postConfig('/api/system-config', getHeaders, payload);
}

/**
 * Submit Graph runtime configuration.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - Graph runtime config data
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitGraphRuntimeConfig(getHeaders, payload) {
  return postConfig('/api/system-config', getHeaders, payload);
}

/**
 * Submit translation API configuration.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - Translation API config data
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitTranslationApiConfig(getHeaders, payload) {
  return postConfig('/api/translation-api-config', getHeaders, payload);
}

/**
 * Submit OAuth configuration.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - OAuth config data
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitOAuthConfig(getHeaders, payload) {
  return postConfig('/api/oauth-config', getHeaders, payload);
}

/**
 * Submit API token configuration.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - API token config data
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitApiTokenConfig(getHeaders, payload) {
  return postConfig('/api/api-token-config', getHeaders, payload);
}

/**
 * Submit search configuration.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - Search config data
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitSearchConfig(getHeaders, payload) {
  return postConfig('/api/search-config', getHeaders, payload);
}

/**
 * Submit rate limit configuration.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - Rate limit config data
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitRateLimitConfig(getHeaders, payload) {
  return postConfig('/api/rate-limit-config', getHeaders, payload);
}

/**
 * Submit colors configuration.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - Colors config data
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitColorsConfig(getHeaders, payload) {
  return postConfig('/api/colors', getHeaders, payload);
}

/**
 * Submit i18n configuration.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - i18n config data
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitI18nConfig(getHeaders, payload) {
  return postConfig('/api/i18n', getHeaders, payload);
}

/**
 * Submit auto-translate request.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - Auto-translate parameters
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitAutoTranslate(getHeaders, payload) {
  return postConfig('/api/i18n/auto-translate', getHeaders, payload);
}

/**
 * Generate an OAuth certificate.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - Certificate generation parameters
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function generateCertificate(getHeaders, payload) {
  return postConfig('/api/oauth-certificate/generate', getHeaders, payload);
}

/**
 * Delete the OAuth certificate.
 * @param {Function} getHeaders - Returns request headers
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function deleteCertificate(getHeaders) {
  const response = await fetch('/api/oauth-certificate', {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (response.status === 401) {
    return { ok: false, status: 401 };
  }
  const data = await response.json();
  return { ok: !!data.success, data, status: response.status };
}

/**
 * Download the OAuth certificate file.
 * @param {Function} getHeaders - Returns request headers
 * @returns {Promise<{blob: Blob, filename: string}>}
 */
export async function downloadCertificate(getHeaders) {
  const response = await fetch('/api/oauth-certificate/download', {
    headers: getHeaders()
  });
  if (!response.ok) {
    throw new Error('Download failed');
  }
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="(.+)"/);
  const filename = match ? match[1] : 'meeteasier-oauth.pem';
  const blob = await response.blob();
  return { blob, filename };
}

/**
 * Submit power management configuration for a display.
 * @param {Function} getHeaders - Returns request headers
 * @param {string} clientId - Display client ID or '__global__'
 * @param {Object} payload - Power management config
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitPowerManagement(getHeaders, clientId, payload) {
  const url = clientId === '__global__'
    ? '/api/power-management'
    : `/api/power-management/${encodeURIComponent(clientId)}`;
  return postConfig(url, getHeaders, payload);
}

/**
 * Fetch power management configuration for a display.
 * @param {Function} getHeaders - Returns request headers
 * @param {string} clientId - Display client ID or '__global__'
 * @returns {Promise<Object>} Power management config data
 */
export async function fetchPowerManagementConfig(getHeaders, clientId) {
  const url = clientId === '__global__'
    ? '/api/power-management'
    : `/api/power-management/${encodeURIComponent(clientId)}`;
  const response = await fetch(url, {
    headers: getHeaders()
  });
  return response.json();
}

/**
 * Export full configuration backup.
 * @param {Function} getHeaders - Returns request headers
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitBackupExport(getHeaders) {
  const response = await fetch('/api/config/backup', {
    method: 'GET',
    headers: getHeaders()
  });
  if (response.status === 401) {
    return { ok: false, status: 401 };
  }
  const data = await response.json();
  return { ok: true, data, status: response.status };
}

/**
 * Import configuration backup.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} payload - Backup data to restore
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function submitBackupImport(getHeaders, payload) {
  return postConfig('/api/config/restore', getHeaders, payload);
}

/**
 * Fetch audit logs from the server.
 * @param {Function} getHeaders - Returns request headers
 * @param {number} [limit=200] - Maximum number of log entries
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function fetchAuditLogs(getHeaders, limit = 200) {
  const response = await fetch(`/api/audit-logs?limit=${limit}`, {
    method: 'GET',
    headers: getHeaders()
  });
  if (response.status === 401) {
    return { ok: false, status: 401 };
  }
  const data = await response.json();
  return { ok: true, data, status: response.status };
}

/**
 * Fetch list of connected displays.
 * @param {Function} getHeaders - Returns request headers
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function fetchConnectedDisplays(getHeaders) {
  const response = await fetch('/api/displays', {
    method: 'GET',
    headers: getHeaders()
  });
  if (response.status === 401) {
    return { ok: false, status: 401 };
  }
  const data = await response.json();
  return { ok: true, data, status: response.status };
}

/**
 * Delete a connected display by client ID.
 * @param {Function} getHeaders - Returns request headers
 * @param {string} clientId - Display client ID to delete
 * @returns {Promise<{ok: boolean, data?: Object, status: number}>}
 */
export async function deleteDisplay(getHeaders, clientId) {
  const response = await fetch(`/api/connected-clients/${encodeURIComponent(clientId)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (response.status === 401) {
    return { ok: false, status: 401 };
  }
  const data = await response.json();
  return { ok: !!data.success, data, status: response.status };
}
