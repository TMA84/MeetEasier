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
 * Subscribe to Touchkio display state topics
 */
function subscribeTouchkioStates() {
  // Subscribe to all Home Assistant config topics (for discovery only, not for states)
  mqttClient.subscribe('homeassistant/#', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      
      // Only process config topics for discovery
      if (topic.includes('/config')) {
        const deviceId = extractDeviceId(topic);
        if (deviceId) {
          // Initialize display state if not exists
          if (!displayStates.has(deviceId)) {
            displayStates.set(deviceId, { deviceId });
          }
          console.log(`[Touchkio] Discovered device via Home Assistant: ${deviceId}`);
        }
      }
      
    } catch (error) {
      console.error('[Touchkio] Failed to parse Home Assistant config:', error);
    }
  });
  
  // Subscribe to all Touchkio topics with a single wildcard (this is where states are published)
  mqttClient.subscribe('touchkio/#', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const match = topic.match(/touchkio\/(rpi_[^/]+)/);
      
      if (!match) return;
      
      const deviceId = match[1];
      const payloadStr = payload.toString().trim();
      
      // Initialize display state if not exists
      if (!displayStates.has(deviceId)) {
        displayStates.set(deviceId, { deviceId });
      }
      
      const displayState = displayStates.get(deviceId);
      
      // Update lastSeen on every message from this device
      displayState.lastSeen = new Date().toISOString();
      
      // Route based on topic pattern
      if (topic.includes('/host_name/state') || topic.includes('/host_name/status')) {
        displayState.hostname = payloadStr;
        deviceIdToHostname.set(deviceId, payloadStr);
        console.log(`[Touchkio] Hostname mapped: ${deviceId} -> ${payloadStr}`);
        
      } else if (topic.includes('/display/power/state') || topic.includes('/display/power/status')) {
        displayState.power = payloadStr;
        displayState.lastUpdate = new Date().toISOString();
        // If we receive 'ON', power is definitely supported
        if (payloadStr === 'ON') {
          displayState.powerUnsupported = false;
        }
        console.log(`[Touchkio] Display power updated: ${deviceId} = ${payloadStr}`);
        
      } else if (topic.includes('/display/brightness/state') || topic.includes('/display/brightness/status')) {
        displayState.brightness = parseInt(payload, 10);
        // If we receive a valid brightness value, brightness is supported
        if (!isNaN(displayState.brightness)) {
          displayState.brightnessUnsupported = false;
        }
        console.log(`[Touchkio] Brightness updated: ${deviceId} = ${displayState.brightness}`);
        
      } else if (topic.includes('/kiosk/state') || topic.includes('/kiosk/status')) {
        displayState.kioskStatus = payloadStr;
        console.log(`[Touchkio] Kiosk status updated: ${deviceId} = ${payloadStr}`);
        
      } else if (topic.includes('/theme/state') || topic.includes('/theme/status')) {
        displayState.theme = payloadStr;
        console.log(`[Touchkio] Theme updated: ${deviceId} = ${payloadStr}`);
        
      } else if (topic.includes('/volume/state') || topic.includes('/volume/status')) {
        displayState.volume = parseInt(payload, 10);
        console.log(`[Touchkio] Volume updated: ${deviceId} = ${displayState.volume}`);
        
      } else if (topic.includes('/keyboard/state') || topic.includes('/keyboard/status')) {
        displayState.keyboardVisible = payloadStr === 'ON';
        console.log(`[Touchkio] Keyboard visibility updated: ${deviceId} = ${displayState.keyboardVisible}`);
        
      } else if (topic.includes('/page_zoom/state') || topic.includes('/page_zoom/status')) {
        displayState.pageZoom = parseInt(payload, 10);
        console.log(`[Touchkio] Page zoom updated: ${deviceId} = ${displayState.pageZoom}%`);
        
      } else if (topic.includes('/page_url/state') || topic.includes('/page_url/status')) {
        displayState.pageUrl = payloadStr;
        // Extract room name from URL
        const roomMatch = payloadStr.match(/\/single-room\/([^/?#]+)/);
        if (roomMatch) {
          displayState.room = roomMatch[1];
          console.log(`[Touchkio] Page URL updated: ${deviceId} = ${payloadStr} (room: ${displayState.room})`);
        } else {
          console.log(`[Touchkio] Page URL updated: ${payloadStr}`);
        }
        
      } else if (topic.includes('/processor_usage/state') || topic.includes('/processor_usage/status')) {
        displayState.cpuUsage = Math.round(parseFloat(payload) * 10) / 10;
        
      } else if (topic.includes('/memory_usage/state') || topic.includes('/memory_usage/status')) {
        displayState.memoryUsage = Math.round(parseFloat(payload) * 10) / 10;
        
      } else if (topic.includes('/processor_temperature/state') || topic.includes('/processor_temperature/status')) {
        displayState.temperature = Math.round(parseFloat(payload) * 10) / 10;
        
      } else if (topic.includes('/up_time/state') || topic.includes('/up_time/status')) {
        displayState.uptime = parseFloat(payload);
        
      } else if (topic.includes('/network_address/state') || topic.includes('/network_address/status')) {
        displayState.networkAddress = payloadStr;
        console.log(`[Touchkio] Network address updated: ${deviceId} = ${payloadStr}`);
        
      } else if (topic.includes('/errors/attributes')) {
        // Parse error log
        try {
          const errorData = JSON.parse(payloadStr);
          displayState.errors = errorData;
          displayState.lastErrorUpdate = new Date().toISOString();
          
          // Check for unsupported hardware features
          Object.values(errorData).forEach(logs => {
            logs.forEach(log => {
              const msg = Object.values(log)[0];
              if (typeof msg === 'string') {
                if (msg.includes('Display Status [unsupported]')) {
                  displayState.powerUnsupported = true;
                }
                if (msg.includes('Display Brightness [unsupported]')) {
                  displayState.brightnessUnsupported = true;
                }
              }
            });
          });
          
          // Only log if there are actual errors, not just info messages
          const hasErrors = Object.values(errorData).some(logs => 
            logs.some(log => Object.keys(log)[0] === 'ERROR')
          );
          if (hasErrors) {
            console.log(`[Touchkio] Errors detected for ${deviceId}`);
          }
        } catch (e) {
          console.error(`[Touchkio] Failed to parse error data for ${deviceId}:`, e);
        }
      }
      
    } catch (error) {
      console.error('[Touchkio] Failed to parse Touchkio message:', error);
    }
  });
}

/**
 * Get device ID from hostname
 * Returns the deviceId (e.g., "rpi_1A4187") for a given hostname
 */
function getDeviceIdFromHostname(hostname) {
  // First, check if hostname is already a deviceId
  if (hostname && hostname.startsWith('rpi_')) {
    if (displayStates.has(hostname)) {
      return hostname;
    }
  }
  
  // Look up in the mapping — warn if hostname maps to multiple devices
  const matches = [];
  for (const [deviceId, mappedHostname] of deviceIdToHostname.entries()) {
    if (mappedHostname === hostname) {
      matches.push(deviceId);
    }
  }
  
  if (matches.length > 1) {
    console.warn(`[Touchkio] Hostname "${hostname}" maps to ${matches.length} devices: ${matches.join(', ')}. Use deviceId instead. Returning first match.`);
  }
  
  if (matches.length > 0) {
    return matches[0];
  }
  
  console.error(`[Touchkio] No deviceId found for "${hostname}". Available mappings:`, Array.from(deviceIdToHostname.entries()));
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
  
  const topic = `touchkio/${deviceId}/display/power/set`;
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
  
  const topic = `touchkio/${deviceId}/display/brightness/set`;
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
  
  const topic = `touchkio/${deviceId}/kiosk/set`;
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
  
  const topic = `touchkio/${deviceId}/theme/set`;
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
  
  const topic = `touchkio/${deviceId}/volume/set`;
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
  
  const topic = `touchkio/${deviceId}/keyboard/set`;
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
  
  const topic = `touchkio/${deviceId}/page_zoom/set`;
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
  
  const topic = `touchkio/${deviceId}/page_url/set`;
  
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
  
  const topic = `touchkio/${deviceId}/refresh/execute`;
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
  
  const topic = `touchkio/${deviceId}/reboot/execute`;
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
  
  const topic = `touchkio/${deviceId}/shutdown/execute`;
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
 * @param {string} clientId - Display identifier (deviceId or hostname)
 * @param {object} config - Power management configuration
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
  
  // Use deviceId directly (clientId is already deviceId from startScheduleChecker)
  // config.mqttHostname may contain a legacy hostname — ignore it if clientId is a deviceId
  let deviceIdOrHostname = clientId.startsWith('rpi_') ? clientId : (config.mqttHostname || clientId);
  
  // Send command to Touchkio (getDeviceIdFromHostname handles both deviceId and hostname)
  if (shouldBeOff) {
    sendPowerCommand(deviceIdOrHostname, false);
  } else {
    sendPowerCommand(deviceIdOrHostname, true, 100);
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
      const globalConfig = powerConfig.global || {};
      
      // Get all MQTT displays
      const mqttDisplays = Array.from(displayStates.entries())
        .filter(([deviceId, state]) => state.hostname || state.deviceId);
      
      // Check each MQTT display
      mqttDisplays.forEach(([deviceId, state]) => {
        // Check if display has specific config
        let displayConfig = null;
        if (powerConfig.displays) {
          // Try to find config by various identifiers (prefer deviceId)
          displayConfig = powerConfig.displays[deviceId] ||
                         powerConfig.displays[state.hostname] ||
                         powerConfig.displays[state.networkAddress];
        }
        
        // Use display-specific config if available, otherwise use global
        const configToUse = displayConfig || globalConfig;
        
        // Only process if mode is MQTT and schedule is enabled
        if (configToUse.mode === 'mqtt' && configToUse.schedule?.enabled) {
          // Use deviceId as clientId for consistent identification
          checkDisplaySchedule(deviceId, configToUse);
        }
      });
      
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
