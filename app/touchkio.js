/**
 * Touchkio Display Controller
 * Manages Touchkio displays via MQTT using Home Assistant MQTT Discovery format
 */

const mqttClient = require('./mqtt-client');
const configManager = require('./config-manager');

// Track display states
// Key: deviceId (e.g., "rpi_1A4187")
// Value: { hostname, power, brightness, kioskStatus, theme, ... }
const displayStates = new Map();

// Map deviceId to hostname for easier lookup
const deviceIdToHostname = new Map();

/**
 * Initialize Touchkio controller
 */
function init() {
  console.log('[Touchkio] Initializing display controller');
  
  // Wait for MQTT client to connect before subscribing
  mqttClient.onConnect(() => {
    console.log('[Touchkio] MQTT connected, subscribing to Home Assistant topics');
    subscribeTouchkioStates();
  });
  
  // Start periodic check for scheduled power management
  startScheduleChecker();
}

/**
 * Extract device ID from Home Assistant topic
 * Example: homeassistant/light/rpi_1A4187/display/status -> rpi_1A4187
 */
function extractDeviceId(topic) {
  const match = topic.match(/homeassistant\/[^/]+\/(rpi_[^/]+)/);
  return match ? match[1] : null;
}

/**
 * Subscribe to Touchkio display state topics (Home Assistant format)
 */
function subscribeTouchkioStates() {
  // Subscribe to hostname sensor to map deviceId to hostname
  mqttClient.subscribe('homeassistant/sensor/+/host_name/status', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const deviceId = extractDeviceId(topic);
      
      if (deviceId) {
        const hostname = payload.toString().trim();
        deviceIdToHostname.set(deviceId, hostname);
        
        // Initialize display state if not exists
        if (!displayStates.has(deviceId)) {
          displayStates.set(deviceId, {});
        }
        
        const displayState = displayStates.get(deviceId);
        displayState.hostname = hostname;
        displayState.deviceId = deviceId;
        
        console.log(`[Touchkio] Hostname mapped: ${deviceId} -> ${hostname}`);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse hostname:', error);
    }
  });
  
  // Subscribe to display power and brightness status
  mqttClient.subscribe('homeassistant/light/+/display/status', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const deviceId = extractDeviceId(topic);
      
      if (deviceId) {
        // Initialize display state if not exists
        if (!displayStates.has(deviceId)) {
          displayStates.set(deviceId, { deviceId });
        }
        
        const displayState = displayStates.get(deviceId);
        displayState.power = payload.toString().trim();
        displayState.lastUpdate = new Date().toISOString();
        
        console.log(`[Touchkio] Display power updated: ${deviceId} = ${displayState.power}`);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse display status:', error);
    }
  });
  
  // Subscribe to brightness status
  mqttClient.subscribe('homeassistant/light/+/display/brightness/status', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const deviceId = extractDeviceId(topic);
      
      if (deviceId) {
        if (!displayStates.has(deviceId)) {
          displayStates.set(deviceId, { deviceId });
        }
        
        const displayState = displayStates.get(deviceId);
        displayState.brightness = parseInt(payload, 10);
        
        console.log(`[Touchkio] Brightness updated: ${deviceId} = ${displayState.brightness}`);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse brightness:', error);
    }
  });
  
  // Subscribe to kiosk status (Home Assistant select entity)
  mqttClient.subscribe('homeassistant/select/+/kiosk/status', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const deviceId = extractDeviceId(topic);
      
      if (deviceId) {
        if (!displayStates.has(deviceId)) {
          displayStates.set(deviceId, { deviceId });
        }
        
        const displayState = displayStates.get(deviceId);
        displayState.kioskStatus = payload.toString().trim();
        
        console.log(`[Touchkio] Kiosk status updated: ${deviceId} = ${displayState.kioskStatus}`);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse kiosk status:', error);
    }
  });
  
  // Subscribe to CPU usage
  mqttClient.subscribe('homeassistant/sensor/+/processor_usage/status', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const deviceId = extractDeviceId(topic);
      
      if (deviceId) {
        if (!displayStates.has(deviceId)) {
          displayStates.set(deviceId, { deviceId });
        }
        
        const displayState = displayStates.get(deviceId);
        displayState.cpuUsage = parseFloat(payload);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse CPU usage:', error);
    }
  });
  
  // Subscribe to memory usage
  mqttClient.subscribe('homeassistant/sensor/+/memory_usage/status', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const deviceId = extractDeviceId(topic);
      
      if (deviceId) {
        if (!displayStates.has(deviceId)) {
          displayStates.set(deviceId, { deviceId });
        }
        
        const displayState = displayStates.get(deviceId);
        displayState.memoryUsage = parseFloat(payload);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse memory usage:', error);
    }
  });
  
  // Subscribe to temperature
  mqttClient.subscribe('homeassistant/sensor/+/processor_temperature/status', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const deviceId = extractDeviceId(topic);
      
      if (deviceId) {
        if (!displayStates.has(deviceId)) {
          displayStates.set(deviceId, { deviceId });
        }
        
        const displayState = displayStates.get(deviceId);
        displayState.temperature = parseFloat(payload);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse temperature:', error);
    }
  });
  
  // Subscribe to uptime
  mqttClient.subscribe('homeassistant/sensor/+/up_time/status', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const deviceId = extractDeviceId(topic);
      
      if (deviceId) {
        if (!displayStates.has(deviceId)) {
          displayStates.set(deviceId, { deviceId });
        }
        
        const displayState = displayStates.get(deviceId);
        displayState.uptime = parseFloat(payload);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse uptime:', error);
    }
  });
  
  // Subscribe to theme status
  mqttClient.subscribe('homeassistant/select/+/theme/state', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const deviceId = extractDeviceId(topic);
      
      if (deviceId) {
        if (!displayStates.has(deviceId)) {
          displayStates.set(deviceId, { deviceId });
        }
        
        const displayState = displayStates.get(deviceId);
        displayState.theme = payload.toString().trim();
        
        console.log(`[Touchkio] Theme updated: ${deviceId} = ${displayState.theme}`);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse theme:', error);
    }
  });
  
  // Subscribe to volume status
  mqttClient.subscribe('homeassistant/number/+/volume/state', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const deviceId = extractDeviceId(topic);
      
      if (deviceId) {
        if (!displayStates.has(deviceId)) {
          displayStates.set(deviceId, { deviceId });
        }
        
        const displayState = displayStates.get(deviceId);
        displayState.volume = parseInt(payload, 10);
        
        console.log(`[Touchkio] Volume updated: ${deviceId} = ${displayState.volume}`);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse volume:', error);
    }
  });
  
  // Subscribe to keyboard status
  mqttClient.subscribe('homeassistant/switch/+/keyboard/state', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const deviceId = extractDeviceId(topic);
      
      if (deviceId) {
        if (!displayStates.has(deviceId)) {
          displayStates.set(deviceId, { deviceId });
        }
        
        const displayState = displayStates.get(deviceId);
        displayState.keyboardVisible = payload.toString().trim() === 'ON';
        
        console.log(`[Touchkio] Keyboard visibility updated: ${deviceId} = ${displayState.keyboardVisible}`);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse keyboard status:', error);
    }
  });
  
  // Subscribe to page zoom status
  mqttClient.subscribe('homeassistant/number/+/page_zoom/state', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const deviceId = extractDeviceId(topic);
      
      if (deviceId) {
        if (!displayStates.has(deviceId)) {
          displayStates.set(deviceId, { deviceId });
        }
        
        const displayState = displayStates.get(deviceId);
        displayState.pageZoom = parseInt(payload, 10);
        
        console.log(`[Touchkio] Page zoom updated: ${deviceId} = ${displayState.pageZoom}%`);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse page zoom:', error);
    }
  });
  
  // Subscribe to page URL status
  mqttClient.subscribe('homeassistant/text/+/page_url/state', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const deviceId = extractDeviceId(topic);
      
      if (deviceId) {
        if (!displayStates.has(deviceId)) {
          displayStates.set(deviceId, { deviceId });
        }
        
        const displayState = displayStates.get(deviceId);
        displayState.pageUrl = payload.toString().trim();
        
        console.log(`[Touchkio] Page URL updated: ${deviceId} = ${displayState.pageUrl}`);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse page URL:', error);
    }
  });
}

/**
 * Get device ID from hostname
 * Returns the deviceId (e.g., "rpi_1A4187") for a given hostname
 */
function getDeviceIdFromHostname(hostname) {
  for (const [deviceId, mappedHostname] of deviceIdToHostname.entries()) {
    if (mappedHostname === hostname) {
      return deviceId;
    }
  }
  return null;
}

/**
 * Send power command to Touchkio display
 * @param {string} hostname - Display hostname (e.g., "piosk")
 * @param {boolean} powerState - true for ON, false for OFF
 * @param {number} brightness - Brightness level (0-100)
 */
function sendPowerCommand(hostname, powerState, brightness = 100) {
  const deviceId = getDeviceIdFromHostname(hostname);
  
  if (!deviceId) {
    console.error(`[Touchkio] Cannot send power command: hostname "${hostname}" not found`);
    return false;
  }
  
  const topic = `homeassistant/light/${deviceId}/display/set`;
  const payload = powerState ? 'ON' : 'OFF';
  
  const success = mqttClient.publish(topic, payload, { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent power command to ${hostname} (${deviceId}): ${payload}`);
  }
  
  return success;
}

/**
 * Send brightness command to Touchkio display
 * @param {string} hostname - Display hostname
 * @param {number} brightness - Brightness level (0-100)
 */
function sendBrightnessCommand(hostname, brightness) {
  const deviceId = getDeviceIdFromHostname(hostname);
  
  if (!deviceId) {
    console.error(`[Touchkio] Cannot send brightness command: hostname "${hostname}" not found`);
    return false;
  }
  
  const topic = `homeassistant/light/${deviceId}/display/brightness/set`;
  const value = Math.max(0, Math.min(100, brightness));
  
  const success = mqttClient.publish(topic, value.toString(), { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent brightness command to ${hostname} (${deviceId}): ${value}`);
  }
  
  return success;
}

/**
 * Send kiosk status command to Touchkio display
 * @param {string} hostname - Display hostname
 * @param {string} status - One of: Framed, Fullscreen, Maximized, Minimized
 */
function sendKioskCommand(hostname, status) {
  const deviceId = getDeviceIdFromHostname(hostname);
  
  if (!deviceId) {
    console.error(`[Touchkio] Cannot send kiosk command: hostname "${hostname}" not found`);
    return false;
  }
  
  const validStatuses = ['Framed', 'Fullscreen', 'Maximized', 'Minimized'];
  if (!validStatuses.includes(status)) {
    console.error(`[Touchkio] Invalid kiosk status: ${status}`);
    return false;
  }
  
  const topic = `homeassistant/select/${deviceId}/kiosk/set`;
  const success = mqttClient.publish(topic, status, { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent kiosk command to ${hostname} (${deviceId}): ${status}`);
  }
  
  return success;
}

/**
 * Send theme command to Touchkio display
 * @param {string} hostname - Display hostname
 * @param {string} theme - One of: Light, Dark
 */
function sendThemeCommand(hostname, theme) {
  const deviceId = getDeviceIdFromHostname(hostname);
  
  if (!deviceId) {
    console.error(`[Touchkio] Cannot send theme command: hostname "${hostname}" not found`);
    return false;
  }
  
  const validThemes = ['Light', 'Dark'];
  if (!validThemes.includes(theme)) {
    console.error(`[Touchkio] Invalid theme: ${theme}`);
    return false;
  }
  
  const topic = `homeassistant/select/${deviceId}/theme/set`;
  const success = mqttClient.publish(topic, theme, { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent theme command to ${hostname} (${deviceId}): ${theme}`);
  }
  
  return success;
}

/**
 * Send volume command to Touchkio display
 * @param {string} hostname - Display hostname
 * @param {number} volume - Volume level (0-100)
 */
function sendVolumeCommand(hostname, volume) {
  const deviceId = getDeviceIdFromHostname(hostname);
  
  if (!deviceId) {
    console.error(`[Touchkio] Cannot send volume command: hostname "${hostname}" not found`);
    return false;
  }
  
  const topic = `homeassistant/number/${deviceId}/volume/set`;
  const value = Math.max(0, Math.min(100, volume));
  
  const success = mqttClient.publish(topic, value.toString(), { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent volume command to ${hostname} (${deviceId}): ${value}`);
  }
  
  return success;
}

/**
 * Send keyboard visibility command to Touchkio display
 * @param {string} hostname - Display hostname
 * @param {boolean} visible - Keyboard visibility
 */
function sendKeyboardCommand(hostname, visible) {
  const deviceId = getDeviceIdFromHostname(hostname);
  
  if (!deviceId) {
    console.error(`[Touchkio] Cannot send keyboard command: hostname "${hostname}" not found`);
    return false;
  }
  
  const topic = `homeassistant/switch/${deviceId}/keyboard/set`;
  const value = visible ? 'ON' : 'OFF';
  
  const success = mqttClient.publish(topic, value, { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent keyboard command to ${hostname} (${deviceId}): ${value}`);
  }
  
  return success;
}

/**
 * Send page zoom command to Touchkio display
 * @param {string} hostname - Display hostname
 * @param {number} zoom - Zoom level (25-400%)
 */
function sendPageZoomCommand(hostname, zoom) {
  const deviceId = getDeviceIdFromHostname(hostname);
  
  if (!deviceId) {
    console.error(`[Touchkio] Cannot send page zoom command: hostname "${hostname}" not found`);
    return false;
  }
  
  const topic = `homeassistant/number/${deviceId}/page_zoom/set`;
  const value = Math.max(25, Math.min(400, zoom));
  
  const success = mqttClient.publish(topic, value.toString(), { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent page zoom command to ${hostname} (${deviceId}): ${value}%`);
  }
  
  return success;
}

/**
 * Send page URL command to Touchkio display
 * @param {string} hostname - Display hostname
 * @param {string} url - URL to navigate to
 */
function sendPageUrlCommand(hostname, url) {
  const deviceId = getDeviceIdFromHostname(hostname);
  
  if (!deviceId) {
    console.error(`[Touchkio] Cannot send page URL command: hostname "${hostname}" not found`);
    return false;
  }
  
  const topic = `homeassistant/text/${deviceId}/page_url/set`;
  
  const success = mqttClient.publish(topic, url, { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent page URL command to ${hostname} (${deviceId}): ${url}`);
  }
  
  return success;
}

/**
 * Send refresh command to Touchkio display
 */
function sendRefreshCommand(hostname) {
  const deviceId = getDeviceIdFromHostname(hostname);
  
  if (!deviceId) {
    console.error(`[Touchkio] Cannot send refresh command: hostname "${hostname}" not found`);
    return false;
  }
  
  const topic = `homeassistant/button/${deviceId}/refresh/execute`;
  const success = mqttClient.publish(topic, 'PRESS', { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent refresh command to ${hostname} (${deviceId})`);
  }
  
  return success;
}

/**
 * Send reboot command to Touchkio display
 */
function sendRebootCommand(hostname) {
  const deviceId = getDeviceIdFromHostname(hostname);
  
  if (!deviceId) {
    console.error(`[Touchkio] Cannot send reboot command: hostname "${hostname}" not found`);
    return false;
  }
  
  const topic = `homeassistant/button/${deviceId}/reboot/execute`;
  const success = mqttClient.publish(topic, 'PRESS', { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent reboot command to ${hostname} (${deviceId})`);
  }
  
  return success;
}

/**
 * Send shutdown command to Touchkio display
 */
function sendShutdownCommand(hostname) {
  const deviceId = getDeviceIdFromHostname(hostname);
  
  if (!deviceId) {
    console.error(`[Touchkio] Cannot send shutdown command: hostname "${hostname}" not found`);
    return false;
  }
  
  const topic = `homeassistant/button/${deviceId}/shutdown/execute`;
  const success = mqttClient.publish(topic, 'PRESS', { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent shutdown command to ${hostname} (${deviceId})`);
  }
  
  return success;
}

/**
 * Check if current time is in off-range
 */
function isTimeInRange(currentTime, startTime, endTime) {
  const [currentHour, currentMin] = currentTime.split(':').map(Number);
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const current = currentHour * 60 + currentMin;
  const start = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;
  
  // Handle overnight ranges (e.g., 20:00 to 07:00)
  if (start > end) {
    return current >= start || current < end;
  }
  
  // Handle same-day ranges (e.g., 12:00 to 14:00)
  return current >= start && current < end;
}

/**
 * Check schedule for a specific display
 */
function checkDisplaySchedule(clientId, config) {
  // Only process MQTT mode
  if (config.mode !== 'mqtt') {
    return;
  }
  
  if (!config.schedule || !config.schedule.enabled) {
    return;
  }
  
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  const { startTime, endTime, weekendMode } = config.schedule;
  
  let shouldBeOff = false;
  
  // Weekend mode: turn off all weekend
  if (weekendMode && isWeekend) {
    shouldBeOff = true;
  } else {
    // Check if current time is within off period
    shouldBeOff = isTimeInRange(currentTime, startTime, endTime);
  }
  
  // Extract hostname from clientId (format: IP_hostname or just hostname)
  let hostname = clientId;
  if (clientId.includes('_')) {
    const parts = clientId.split('_');
    hostname = parts[parts.length - 1]; // Take last part as hostname
  }
  
  // Send command to Touchkio
  if (shouldBeOff) {
    sendPowerCommand(hostname, false);
  } else {
    sendPowerCommand(hostname, true, 100);
  }
}

/**
 * Start periodic schedule checker
 */
function startScheduleChecker() {
  // Check every minute
  setInterval(() => {
    try {
      const powerConfig = configManager.getPowerManagementConfig();
      
      // Check display-specific configs
      if (powerConfig.displays) {
        Object.keys(powerConfig.displays).forEach(clientId => {
          const displayConfig = powerConfig.displays[clientId];
          checkDisplaySchedule(clientId, displayConfig);
        });
      }
    } catch (error) {
      console.error('[Touchkio] Schedule check error:', error);
    }
  }, 60000); // Every minute
  
  console.log('[Touchkio] Schedule checker started (60s interval)');
}

/**
 * Get display states
 * Returns array of displays with hostname as the primary identifier
 */
function getDisplayStates() {
  return Array.from(displayStates.entries()).map(([deviceId, state]) => ({
    hostname: state.hostname || deviceId,
    deviceId,
    ...state
  }));
}

/**
 * Get all displays (alias for getDisplayStates)
 */
function getAllDisplays() {
  return getDisplayStates();
}

/**
 * Manually trigger power command for a display
 */
function triggerPowerCommand(clientId) {
  try {
    const config = configManager.getPowerManagementConfigForDisplay(clientId);
    checkDisplaySchedule(clientId, config);
    return true;
  } catch (error) {
    console.error('[Touchkio] Failed to trigger power command:', error);
    return false;
  }
}

module.exports = {
  init,
  sendPowerCommand,
  sendBrightnessCommand,
  sendKioskCommand,
  sendThemeCommand,
  sendVolumeCommand,
  sendKeyboardCommand,
  sendPageZoomCommand,
  sendPageUrlCommand,
  sendRefreshCommand,
  sendRebootCommand,
  sendShutdownCommand,
  getDisplayStates,
  getAllDisplays,
  triggerPowerCommand
};
