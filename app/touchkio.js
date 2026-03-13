/**
 * Touchkio Display Controller
 * Manages Touchkio displays via MQTT (power, brightness, volume, kiosk mode, etc.)
 */

const mqttClient = require('./mqtt-client');
const configManager = require('./config-manager');

// Track display states
const displayStates = new Map();

/**
 * Initialize Touchkio controller
 */
function init() {
  console.log('[Touchkio] Initializing display controller');
  
  // Wait for MQTT client to connect before subscribing
  mqttClient.onConnect(() => {
    console.log('[Touchkio] MQTT connected, subscribing to display topics');
    subscribeTouchkioStates();
  });
  
  // Start periodic check for scheduled power management
  startScheduleChecker();
}

/**
 * Subscribe to Touchkio display state topics
 */
function subscribeTouchkioStates() {
  // Subscribe to all Touchkio display state topics
  // Format: homeassistant/light/touchkio_{hostname}/display/state
  mqttClient.subscribe('homeassistant/light/+/display/state', (payload, client) => {
    try {
      const state = JSON.parse(payload);
      const topic = client ? client.topic : 'unknown';
      
      // Extract hostname from topic
      const match = topic.match(/touchkio_([^/]+)/);
      if (match) {
        const hostname = match[1];
        
        // Initialize display state if not exists
        if (!displayStates.has(hostname)) {
          displayStates.set(hostname, {});
        }
        
        const displayState = displayStates.get(hostname);
        displayState.power = state.state;
        displayState.brightness = state.brightness;
        displayState.lastUpdate = new Date().toISOString();
        
        console.log(`[Touchkio] Display power state updated: ${hostname} = ${state.state}`);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse display state:', error);
    }
  });
  
  // Subscribe to kiosk status
  mqttClient.subscribe('touchkio/+/kiosk/state', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const match = topic.match(/touchkio\/rpi_([^/]+)/);
      if (match) {
        const hostname = match[1];
        if (!displayStates.has(hostname)) {
          displayStates.set(hostname, {});
        }
        const displayState = displayStates.get(hostname);
        displayState.kioskStatus = payload;
        console.log(`[Touchkio] Kiosk status updated: ${hostname} = ${payload}`);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse kiosk state:', error);
    }
  });
  
  // Subscribe to theme
  mqttClient.subscribe('touchkio/+/theme/state', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const match = topic.match(/touchkio\/rpi_([^/]+)/);
      if (match) {
        const hostname = match[1];
        if (!displayStates.has(hostname)) {
          displayStates.set(hostname, {});
        }
        const displayState = displayStates.get(hostname);
        displayState.theme = payload;
        console.log(`[Touchkio] Theme updated: ${hostname} = ${payload}`);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse theme state:', error);
    }
  });
  
  // Subscribe to volume
  mqttClient.subscribe('touchkio/+/volume/state', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const match = topic.match(/touchkio\/rpi_([^/]+)/);
      if (match) {
        const hostname = match[1];
        if (!displayStates.has(hostname)) {
          displayStates.set(hostname, {});
        }
        const displayState = displayStates.get(hostname);
        displayState.volume = parseInt(payload, 10);
        console.log(`[Touchkio] Volume updated: ${hostname} = ${payload}`);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse volume state:', error);
    }
  });
  
  // Subscribe to keyboard visibility
  mqttClient.subscribe('touchkio/+/keyboard/state', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const match = topic.match(/touchkio\/rpi_([^/]+)/);
      if (match) {
        const hostname = match[1];
        if (!displayStates.has(hostname)) {
          displayStates.set(hostname, {});
        }
        const displayState = displayStates.get(hostname);
        displayState.keyboardVisible = payload === 'ON';
        console.log(`[Touchkio] Keyboard visibility updated: ${hostname} = ${payload}`);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse keyboard state:', error);
    }
  });
  
  // Subscribe to page zoom
  mqttClient.subscribe('touchkio/+/page_zoom/state', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const match = topic.match(/touchkio\/rpi_([^/]+)/);
      if (match) {
        const hostname = match[1];
        if (!displayStates.has(hostname)) {
          displayStates.set(hostname, {});
        }
        const displayState = displayStates.get(hostname);
        displayState.pageZoom = parseInt(payload, 10);
        console.log(`[Touchkio] Page zoom updated: ${hostname} = ${payload}%`);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse page zoom state:', error);
    }
  });
  
  // Subscribe to page URL
  mqttClient.subscribe('touchkio/+/page_url/state', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const match = topic.match(/touchkio\/rpi_([^/]+)/);
      if (match) {
        const hostname = match[1];
        if (!displayStates.has(hostname)) {
          displayStates.set(hostname, {});
        }
        const displayState = displayStates.get(hostname);
        displayState.pageUrl = payload;
        console.log(`[Touchkio] Page URL updated: ${hostname} = ${payload}`);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse page URL state:', error);
    }
  });
  
  // Subscribe to system sensors
  mqttClient.subscribe('touchkio/+/processor_usage/state', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const match = topic.match(/touchkio\/rpi_([^/]+)/);
      if (match) {
        const hostname = match[1];
        if (!displayStates.has(hostname)) {
          displayStates.set(hostname, {});
        }
        const displayState = displayStates.get(hostname);
        displayState.cpuUsage = parseFloat(payload);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse CPU usage:', error);
    }
  });
  
  mqttClient.subscribe('touchkio/+/memory_usage/state', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const match = topic.match(/touchkio\/rpi_([^/]+)/);
      if (match) {
        const hostname = match[1];
        if (!displayStates.has(hostname)) {
          displayStates.set(hostname, {});
        }
        const displayState = displayStates.get(hostname);
        displayState.memoryUsage = parseFloat(payload);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse memory usage:', error);
    }
  });
  
  mqttClient.subscribe('touchkio/+/processor_temperature/state', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const match = topic.match(/touchkio\/rpi_([^/]+)/);
      if (match) {
        const hostname = match[1];
        if (!displayStates.has(hostname)) {
          displayStates.set(hostname, {});
        }
        const displayState = displayStates.get(hostname);
        displayState.temperature = parseFloat(payload);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse temperature:', error);
    }
  });
  
  mqttClient.subscribe('touchkio/+/network_address/state', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const match = topic.match(/touchkio\/rpi_([^/]+)/);
      if (match) {
        const hostname = match[1];
        if (!displayStates.has(hostname)) {
          displayStates.set(hostname, {});
        }
        const displayState = displayStates.get(hostname);
        displayState.networkAddress = payload;
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse network address:', error);
    }
  });
  
  mqttClient.subscribe('touchkio/+/up_time/state', (payload, client) => {
    try {
      const topic = client ? client.topic : 'unknown';
      const match = topic.match(/touchkio\/rpi_([^/]+)/);
      if (match) {
        const hostname = match[1];
        if (!displayStates.has(hostname)) {
          displayStates.set(hostname, {});
        }
        const displayState = displayStates.get(hostname);
        displayState.uptime = parseFloat(payload);
      }
    } catch (error) {
      console.error('[Touchkio] Failed to parse uptime:', error);
    }
  });
}

/**
 * Send power command to Touchkio display
 */
function sendPowerCommand(hostname, powerState, brightness = 255) {
  const topic = `homeassistant/light/touchkio_${hostname}/display/set`;
  
  const payload = {
    state: powerState ? 'ON' : 'OFF'
  };
  
  if (powerState && brightness !== undefined) {
    payload.brightness = Math.max(0, Math.min(255, brightness));
  }
  
  const success = mqttClient.publish(topic, payload, { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent power command to ${hostname}: ${powerState ? 'ON' : 'OFF'}`);
  }
  
  return success;
}

/**
 * Send brightness command to Touchkio display
 */
function sendBrightnessCommand(hostname, brightness) {
  const topic = `homeassistant/light/touchkio_${hostname}/display/brightness/set`;
  const value = Math.max(0, Math.min(100, brightness));
  
  const success = mqttClient.publish(topic, value.toString(), { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent brightness command to ${hostname}: ${value}`);
  }
  
  return success;
}

/**
 * Send kiosk status command to Touchkio display
 * @param {string} hostname - Touchkio hostname
 * @param {string} status - One of: Framed, Fullscreen, Maximized, Minimized
 */
function sendKioskCommand(hostname, status) {
  const validStatuses = ['Framed', 'Fullscreen', 'Maximized', 'Minimized'];
  if (!validStatuses.includes(status)) {
    console.error(`[Touchkio] Invalid kiosk status: ${status}`);
    return false;
  }
  
  const topic = `touchkio/rpi_${hostname}/kiosk/set`;
  const success = mqttClient.publish(topic, status, { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent kiosk command to ${hostname}: ${status}`);
  }
  
  return success;
}

/**
 * Send theme command to Touchkio display
 * @param {string} hostname - Touchkio hostname
 * @param {string} theme - One of: Light, Dark
 */
function sendThemeCommand(hostname, theme) {
  const validThemes = ['Light', 'Dark'];
  if (!validThemes.includes(theme)) {
    console.error(`[Touchkio] Invalid theme: ${theme}`);
    return false;
  }
  
  const topic = `touchkio/rpi_${hostname}/theme/set`;
  const success = mqttClient.publish(topic, theme, { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent theme command to ${hostname}: ${theme}`);
  }
  
  return success;
}

/**
 * Send volume command to Touchkio display
 * @param {string} hostname - Touchkio hostname
 * @param {number} volume - Volume level (0-100)
 */
function sendVolumeCommand(hostname, volume) {
  const topic = `touchkio/rpi_${hostname}/volume/set`;
  const value = Math.max(0, Math.min(100, volume));
  
  const success = mqttClient.publish(topic, value.toString(), { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent volume command to ${hostname}: ${value}`);
  }
  
  return success;
}

/**
 * Send keyboard visibility command to Touchkio display
 * @param {string} hostname - Touchkio hostname
 * @param {boolean} visible - Keyboard visibility
 */
function sendKeyboardCommand(hostname, visible) {
  const topic = `touchkio/rpi_${hostname}/keyboard/set`;
  const value = visible ? 'ON' : 'OFF';
  
  const success = mqttClient.publish(topic, value, { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent keyboard command to ${hostname}: ${value}`);
  }
  
  return success;
}

/**
 * Send page zoom command to Touchkio display
 * @param {string} hostname - Touchkio hostname
 * @param {number} zoom - Zoom level (25-400%)
 */
function sendPageZoomCommand(hostname, zoom) {
  const topic = `touchkio/rpi_${hostname}/page_zoom/set`;
  const value = Math.max(25, Math.min(400, zoom));
  
  const success = mqttClient.publish(topic, value.toString(), { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent page zoom command to ${hostname}: ${value}%`);
  }
  
  return success;
}

/**
 * Send page URL command to Touchkio display
 * @param {string} hostname - Touchkio hostname
 * @param {string} url - URL to navigate to
 */
function sendPageUrlCommand(hostname, url) {
  const topic = `touchkio/rpi_${hostname}/page_url/set`;
  
  const success = mqttClient.publish(topic, url, { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent page URL command to ${hostname}: ${url}`);
  }
  
  return success;
}

/**
 * Send refresh command to Touchkio display
 */
function sendRefreshCommand(hostname) {
  const topic = `touchkio/rpi_${hostname}/refresh/execute`;
  
  const success = mqttClient.publish(topic, 'PRESS', { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent refresh command to ${hostname}`);
  }
  
  return success;
}

/**
 * Send reboot command to Touchkio display
 */
function sendRebootCommand(hostname) {
  const topic = `touchkio/rpi_${hostname}/reboot/execute`;
  
  const success = mqttClient.publish(topic, 'PRESS', { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent reboot command to ${hostname}`);
  }
  
  return success;
}

/**
 * Send shutdown command to Touchkio display
 */
function sendShutdownCommand(hostname) {
  const topic = `touchkio/rpi_${hostname}/shutdown/execute`;
  
  const success = mqttClient.publish(topic, 'PRESS', { qos: 1, retain: false });
  
  if (success) {
    console.log(`[Touchkio] Sent shutdown command to ${hostname}`);
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
    sendPowerCommand(hostname, true, 255);
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
      
      // Check global config for all displays without specific config
      if (powerConfig.global && powerConfig.global.mode === 'mqtt') {
        // This would require knowing all Touchkio hostnames
        // For now, we rely on display-specific configs
      }
      
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
 */
function getDisplayStates() {
  return Array.from(displayStates.entries()).map(([hostname, state]) => ({
    hostname,
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
