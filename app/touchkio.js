/**
 * @file touchkio.js
 * @description MQTT Power Bridge for Touchkio displays.
 *
 * This module controls Touchkio displays (Raspberry Pi-based kiosk displays)
 * via MQTT using the Home Assistant MQTT Discovery format.
 * It receives status messages from the displays and sends control commands back.
 *
 * Main features:
 * - Automatic detection of Touchkio displays via MQTT Discovery
 * - Real-time tracking of display states (power, brightness, kiosk status, etc.)
 * - Control of display properties (power, brightness, theme, volume, etc.)
 * - Scheduled power management (night shutdown, weekend mode)
 * - System monitoring (CPU, RAM, temperature, uptime)
 * - Error log analysis and hardware compatibility detection
 *
 * MQTT topic structure:
 * - touchkio/{deviceId}/... – Touchkio-native status and control topics
 * - homeassistant/.../{deviceId}/... – Home Assistant Discovery topics
 *
 * @requires ./mqtt-client - MQTT client for broker communication
 * @requires ./config-manager - Central configuration management
 */

const mqttClient = require('./mqtt-client');
const configManager = require('./config-manager');

/**
 * Stores the current states of all detected displays.
 * Key: deviceId (e.g. "rpi_1A4187")
 * Value: Object with hostname, power, brightness, kioskStatus, theme, etc.
 * @type {Map<string, Object>}
 */
const displayStates = new Map();

/**
 * Mapping of deviceId to hostname for fast reverse lookup.
 * @type {Map<string, string>}
 */
const deviceIdToHostname = new Map();

/**
 * Initializes the Touchkio display controller.
 * Waits for the MQTT connection and then subscribes to the relevant topics.
 * Also starts the periodic schedule checker for power management.
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
 * Extracts the device ID from a Home Assistant MQTT topic.
 * Expects the format: homeassistant/{type}/{deviceId}/...
 * @param {string} topic - The MQTT topic
 * @returns {string|null} The extracted device ID (e.g. "rpi_1A4187") or null
 * @example
 * extractDeviceId('homeassistant/light/rpi_1A4187/display/status') // => 'rpi_1A4187'
 */
function extractDeviceId(topic) {
  const match = topic.match(/homeassistant\/[^/]+\/(rpi_[^/]+)/);
  return match ? match[1] : null;
}

/**
 * Subscribes to all relevant MQTT topics for Touchkio display states.
 * Processes two topic hierarchies:
 * 1. homeassistant/# – For automatic device discovery
 * 2. touchkio/# – For the actual status messages from the displays
 *
 * Updates the displayStates map with each incoming message.
 */
function subscribeTouchkioStates() {
  // Subscribe to all Home Assistant config topics (only for discovery, not for states)
  mqttClient.subscribe('homeassistant/#', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      
      // Only process config topics for device discovery
      if (topic.includes('/config')) {
        const deviceId = extractDeviceId(topic);
        if (deviceId) {
            // Initialize display state if not already present
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
  
  // Subscribe to all Touchkio topics with a wildcard (states are published here)
  mqttClient.subscribe('touchkio/#', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const match = topic.match(/touchkio\/(rpi_[^/]+)/);
      
      if (!match) return;
      
      const deviceId = match[1];
      const payloadStr = payload.toString().trim();
      
      // Initialize display state if not already present
      if (!displayStates.has(deviceId)) {
        displayStates.set(deviceId, { deviceId });
      }
      
      const displayState = displayStates.get(deviceId);
      
      // Update lastSeen on every message from this device
      displayState.lastSeen = new Date().toISOString();
      
      // Route message to the correct handler based on topic pattern
      if (topic.includes('/host_name/state') || topic.includes('/host_name/status')) {
        displayState.hostname = payloadStr;
        deviceIdToHostname.set(deviceId, payloadStr);
        console.log(`[Touchkio] Hostname mapped: ${deviceId} -> ${payloadStr}`);
        
      } else if (topic.includes('/display/power/state') || topic.includes('/display/power/status')) {
        displayState.power = payloadStr;
        displayState.lastUpdate = new Date().toISOString();
        // When 'ON', power is definitely supported
        if (payloadStr === 'ON') {
          displayState.powerUnsupported = false;
        }
        console.log(`[Touchkio] Display power updated: ${deviceId} = ${payloadStr}`);
        
      } else if (topic.includes('/display/brightness/state') || topic.includes('/display/brightness/status')) {
        displayState.brightness = parseInt(payload, 10);
        // When brightness value is valid, brightness is supported
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
        // Extract room name from the URL
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
        // Parse error log and check for unsupported hardware features
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
          
          // Only log when actual errors are present, not just info messages
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
 * Determines the device ID from a hostname.
 * Accepts both hostnames and direct device IDs (rpi_...).
 * Warns on ambiguous mappings (one hostname → multiple devices).
 * @param {string} hostname - Hostname or device ID of the display
 * @returns {string|null} The device ID or null if not found
 */
function getDeviceIdFromHostname(hostname) {
  // Check if the hostname is already a device ID
  if (hostname && hostname.startsWith('rpi_')) {
    if (displayStates.has(hostname)) {
      return hostname;
    }
  }
  
  // Search in the mapping table — warn if hostname maps to multiple devices
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
 * Sends a power command to a Touchkio display.
 * Publishes ON/OFF to the MQTT topic touchkio/{deviceId}/display/power/set.
 * @param {string} hostname - Display hostname or device ID (e.g. "piosk" or "rpi_1A4187")
 * @param {boolean} powerState - true for ON, false for OFF
 * @param {number} [brightness=100] - Brightness level (0-100), currently not used in the power command
 * @returns {boolean} true if the command was sent successfully
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
 * Sends a brightness command to a Touchkio display.
 * The value is clamped to the range 0-100.
 * @param {string} hostname - Display hostname or device ID
 * @param {number} brightness - Brightness level (0-100)
 * @returns {boolean} true if the command was sent successfully
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
 * Sends a kiosk status command to a Touchkio display.
 * Validates the status against the allowed values.
 * @param {string} hostname - Display hostname or device ID
 * @param {string} status - One of: Framed, Fullscreen, Maximized, Minimized
 * @returns {boolean} true if the command was sent successfully
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
 * Sends a theme command to a Touchkio display.
 * Validates the theme against the allowed values (Light, Dark).
 * @param {string} hostname - Display hostname or device ID
 * @param {string} theme - One of: Light, Dark
 * @returns {boolean} true if the command was sent successfully
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
 * Sends a volume command to a Touchkio display.
 * The value is clamped to the range 0-100.
 * @param {string} hostname - Display hostname or device ID
 * @param {number} volume - Volume level (0-100)
 * @returns {boolean} true if the command was sent successfully
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
 * Sends a keyboard visibility command to a Touchkio display.
 * @param {string} hostname - Display hostname or device ID
 * @param {boolean} visible - true for visible, false for hidden
 * @returns {boolean} true if the command was sent successfully
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
 * Sends a page zoom command to a Touchkio display.
 * The value is clamped to the range 25-400%.
 * @param {string} hostname - Display hostname or device ID
 * @param {number} zoom - Zoom level (25-400%)
 * @returns {boolean} true if the command was sent successfully
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
 * Sends a page URL command to a Touchkio display.
 * Navigates the display to the specified URL.
 * @param {string} hostname - Display hostname or device ID
 * @param {string} url - The target URL
 * @returns {boolean} true if the command was sent successfully
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
 * Sends a refresh command to a Touchkio display.
 * Reloads the current page in the kiosk browser.
 * @param {string} hostname - Display hostname or device ID
 * @returns {boolean} true if the command was sent successfully
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
 * Sends a reboot command to a Touchkio display.
 * Reboots the entire device (Raspberry Pi).
 * @param {string} hostname - Display hostname or device ID
 * @returns {boolean} true if the command was sent successfully
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
 * Sends a shutdown command to a Touchkio display.
 * Shuts down the entire device (Raspberry Pi).
 * @param {string} hostname - Display hostname or device ID
 * @returns {boolean} true if the command was sent successfully
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
 * Checks whether a time falls within a time range.
 * Supports both daytime ranges (e.g. 12:00-14:00) and
 * overnight ranges crossing midnight (e.g. 20:00-07:00).
 * @param {string} currentTime - Current time in "HH:MM" format
 * @param {string} startTime - Start time of the range in "HH:MM" format
 * @param {string} endTime - End time of the range in "HH:MM" format
 * @returns {boolean} true if the current time falls within the range
 */
function isTimeInRange(currentTime, startTime, endTime) {
  const [currentHour, currentMin] = currentTime.split(':').map(Number);
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  // Convert times to minutes for easier comparison
  const current = currentHour * 60 + currentMin;
  const start = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;
  
  // Handle overnight ranges crossing midnight (e.g. 20:00 to 07:00)
  if (start > end) {
    return current >= start || current < end;
  }
  
  // Handle daytime ranges (e.g. 12:00 to 14:00)
  return current >= start && current < end;
}

/**
 * Checks the schedule for a specific display and sends power commands if needed.
 * Takes into account weekend mode and configured off-times.
 * Only processes displays in MQTT mode.
 * @param {string} clientId - Display identifier (device ID or hostname)
 * @param {Object} config - Power management configuration
 * @param {string} config.mode - Mode ('mqtt', 'browser', 'dpms')
 * @param {Object} config.schedule - Schedule configuration
 * @param {boolean} config.schedule.enabled - Schedule enabled
 * @param {string} config.schedule.startTime - Start time of the off period (HH:MM)
 * @param {string} config.schedule.endTime - End time of the off period (HH:MM)
 * @param {boolean} config.schedule.weekendMode - Turn off completely on weekends
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
  
  // Weekend mode: turn off for the entire weekend
  if (weekendMode && isWeekend) {
    shouldBeOff = true;
  } else {
    // Check if current time is within off period
    shouldBeOff = isTimeInRange(currentTime, startTime, endTime);
  }
  
  // Use deviceId directly (clientId is already deviceId from startScheduleChecker)
  // config.mqttHostname may contain an outdated hostname — ignore if clientId is a deviceId
  let deviceIdOrHostname = clientId.startsWith('rpi_') ? clientId : (config.mqttHostname || clientId);
  
  // Send command to Touchkio (getDeviceIdFromHostname handles both deviceId and hostname)
  if (shouldBeOff) {
    sendPowerCommand(deviceIdOrHostname, false);
  } else {
    sendPowerCommand(deviceIdOrHostname, true, 100);
  }
}

/**
 * Starts the periodic schedule checker for power management.
 * Checks all MQTT displays against their configured schedules every minute
 * and sends corresponding power commands.
 */
function startScheduleChecker() {
  // Check every minute
  setInterval(() => {
    try {
      const powerConfig = configManager.getPowerManagementConfig();
      const globalConfig = powerConfig.global || {};
      
      // Determine all MQTT displays
      const mqttDisplays = Array.from(displayStates.entries())
        .filter(([deviceId, state]) => state.hostname || state.deviceId);
      
      // Check each MQTT display
      mqttDisplays.forEach(([deviceId, state]) => {
        // Check if the display has a specific configuration
        let displayConfig = null;
        if (powerConfig.displays) {
          // Search for configuration via different identifiers (deviceId preferred)
          displayConfig = powerConfig.displays[deviceId] ||
                         powerConfig.displays[state.hostname] ||
                         powerConfig.displays[state.networkAddress];
        }
        
        // Use display-specific configuration if available, otherwise global
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
 * Returns the states of all detected displays.
 * The hostname is used as the primary identifier, with deviceId as fallback.
 * @returns {Array<Object>} Array of display states with all available information
 */
function getDisplayStates() {
  return Array.from(displayStates.entries()).map(([deviceId, state]) => ({
    hostname: state.hostname || deviceId,
    deviceId,
    ...state
  }));
}

/**
 * Returns all displays (alias for getDisplayStates).
 * @returns {Array<Object>} Array of display states
 */
function getAllDisplays() {
  return getDisplayStates();
}

/**
 * Manually triggers a power command for a display based on its schedule.
 * @param {string} clientId - Display identifier (device ID or hostname)
 * @returns {boolean} true if the command was triggered successfully
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
