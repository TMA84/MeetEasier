/**
 * @file MQTT command service functions.
 * Pure async functions that perform MQTT-related API calls.
 * Each function returns the fetch response data — setState is handled by the caller.
 */

/**
 * Send power command to a specific MQTT display.
 * @param {Function} getHeaders - Returns request headers
 * @param {string} hostname - Display hostname/deviceId
 * @param {boolean} powerOn - Whether to power on
 * @returns {Promise<Response>} Fetch response
 */
export async function sendMqttPowerCommand(getHeaders, hostname, powerOn) {
  return fetch(`/api/mqtt-power-trigger/${hostname}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ powerState: powerOn, brightness: powerOn ? 255 : 0 })
  });
}

/**
 * Send brightness command to a specific MQTT display.
 * @param {Function} getHeaders - Returns request headers
 * @param {string} hostname - Display hostname/deviceId
 * @param {number} brightness - Brightness value
 * @returns {Promise<Response>} Fetch response
 */
export async function sendMqttBrightnessCommand(getHeaders, hostname, brightness) {
  return fetch(`/api/mqtt-brightness/${hostname}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ brightness })
  });
}

/**
 * Send kiosk mode command to a specific MQTT display.
 * @param {Function} getHeaders - Returns request headers
 * @param {string} hostname - Display hostname/deviceId
 * @param {string} status - Kiosk status
 * @returns {Promise<Response>} Fetch response
 */
export async function sendMqttKioskCommand(getHeaders, hostname, status) {
  return fetch(`/api/mqtt-kiosk/${hostname}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ status })
  });
}

/**
 * Send theme command to a specific MQTT display.
 * @param {Function} getHeaders - Returns request headers
 * @param {string} hostname - Display hostname/deviceId
 * @param {string} theme - Theme name
 * @returns {Promise<Response>} Fetch response
 */
export async function sendMqttThemeCommand(getHeaders, hostname, theme) {
  return fetch(`/api/mqtt-theme/${hostname}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ theme })
  });
}

/**
 * Send volume command to a specific MQTT display.
 * @param {Function} getHeaders - Returns request headers
 * @param {string} hostname - Display hostname/deviceId
 * @param {number} volume - Volume level
 * @returns {Promise<Response>} Fetch response
 */
export async function sendMqttVolumeCommand(getHeaders, hostname, volume) {
  return fetch(`/api/mqtt-volume/${hostname}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ volume })
  });
}

/**
 * Send page zoom command to a specific MQTT display.
 * @param {Function} getHeaders - Returns request headers
 * @param {string} hostname - Display hostname/deviceId
 * @param {number} zoom - Zoom percentage
 * @returns {Promise<Response>} Fetch response
 */
export async function sendMqttPageZoomCommand(getHeaders, hostname, zoom) {
  return fetch(`/api/mqtt-page-zoom/${hostname}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ zoom })
  });
}

/**
 * Send refresh command to a specific MQTT display.
 * @param {Function} getHeaders - Returns request headers
 * @param {string} hostname - Display hostname/deviceId
 * @returns {Promise<Response>} Fetch response
 */
export async function sendMqttRefreshCommand(getHeaders, hostname) {
  return fetch(`/api/mqtt-refresh/${hostname}`, {
    method: 'POST',
    headers: getHeaders()
  });
}

/**
 * Send reboot command to a specific MQTT display.
 * @param {Function} getHeaders - Returns request headers
 * @param {string} hostname - Display hostname/deviceId
 * @returns {Promise<Response>} Fetch response
 */
export async function sendMqttRebootCommand(getHeaders, hostname) {
  return fetch(`/api/mqtt-reboot/${hostname}`, {
    method: 'POST',
    headers: getHeaders()
  });
}

/**
 * Send shutdown command to a specific MQTT display.
 * @param {Function} getHeaders - Returns request headers
 * @param {string} hostname - Display hostname/deviceId
 * @returns {Promise<Response>} Fetch response
 */
export async function sendMqttShutdownCommand(getHeaders, hostname) {
  return fetch(`/api/mqtt-shutdown/${hostname}`, {
    method: 'POST',
    headers: getHeaders()
  });
}

/**
 * Send Touchkio app update command to a specific display.
 * @param {Function} getHeaders - Returns request headers
 * @param {string} hostname - Display hostname/deviceId
 * @returns {Promise<Response>} Fetch response
 */
export async function sendMqttUpdateCommand(getHeaders, hostname) {
  return fetch(`/api/mqtt-update/${hostname}`, {
    method: 'POST',
    headers: getHeaders()
  });
}

/**
 * Fetch Touchkio update info for all devices.
 * @param {Function} getHeaders - Returns request headers (no content-type)
 * @returns {Promise<{ok: boolean, updates?: Object}>} Result
 */
export async function fetchMqttUpdateInfo(getHeaders) {
  const response = await fetch('/api/mqtt-update-info', {
    headers: getHeaders()
  });
  if (response.ok) {
    const data = await response.json();
    return { ok: true, updates: data.updates || {} };
  }
  return { ok: false };
}

/**
 * Send refresh command to all MQTT displays.
 * @param {Function} getHeaders - Returns request headers
 * @returns {Promise<{ok: boolean, data?: Object}>} Result
 */
export async function sendMqttRefreshAll(getHeaders) {
  const response = await fetch('/api/mqtt-refresh-all', {
    method: 'POST',
    headers: getHeaders()
  });
  if (response.ok) {
    const data = await response.json();
    return { ok: true, data };
  }
  return { ok: false, status: response.status };
}

/**
 * Send reboot command to all MQTT displays.
 * @param {Function} getHeaders - Returns request headers
 * @returns {Promise<{ok: boolean, data?: Object}>} Result
 */
export async function sendMqttRebootAll(getHeaders) {
  const response = await fetch('/api/mqtt-reboot-all', {
    method: 'POST',
    headers: getHeaders()
  });
  if (response.ok) {
    const data = await response.json();
    return { ok: true, data };
  }
  return { ok: false, status: response.status };
}

/**
 * Send page URL command to a specific MQTT display.
 * @param {Function} getHeaders - Returns request headers
 * @param {string} identifier - Display identifier
 * @param {string} url - New page URL
 * @returns {Promise<Response>} Fetch response
 */
export async function sendMqttPageUrlCommand(getHeaders, identifier, url) {
  return fetch(`/api/mqtt-page-url/${identifier}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ url })
  });
}

/**
 * Load MQTT configuration.
 * @param {Function} getHeaders - Returns request headers (no content-type)
 * @returns {Promise<Object|null>} Config data or null
 */
export async function fetchMqttConfig(getHeaders) {
  const response = await fetch('/api/mqtt-config', {
    headers: getHeaders()
  });
  if (response.ok) {
    return response.json();
  }
  return null;
}

/**
 * Load MQTT connection status.
 * @param {Function} getHeaders - Returns request headers (no content-type)
 * @returns {Promise<Object|null>} Status data or null
 */
export async function fetchMqttStatus(getHeaders) {
  const response = await fetch('/api/mqtt-status', {
    headers: getHeaders()
  });
  if (response.ok) {
    return response.json();
  }
  return null;
}

/**
 * Load MQTT displays list.
 * @param {Function} getHeaders - Returns request headers (no content-type)
 * @returns {Promise<{ok: boolean, displays?: Array, status?: number}>} Result
 */
export async function fetchMqttDisplays(getHeaders) {
  const response = await fetch('/api/mqtt-displays', {
    headers: getHeaders()
  });
  if (response.status === 401) {
    return { ok: false, status: 401 };
  }
  if (response.ok) {
    const data = await response.json();
    return { ok: true, displays: data.displays || [] };
  }
  return { ok: false };
}

/**
 * Submit MQTT configuration.
 * @param {Function} getHeaders - Returns request headers
 * @param {Object} config - MQTT config payload
 * @returns {Promise<{ok: boolean, data?: Object, status?: number}>} Result
 */
export async function submitMqttConfig(getHeaders, config) {
  const response = await fetch('/api/mqtt-config', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(config)
  });
  if (response.status === 401) {
    return { ok: false, status: 401 };
  }
  const data = await response.json();
  return { ok: !!data.success, data };
}
