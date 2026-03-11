const msal = require('@azure/msal-node');
const config = require('../config/config');
const configManager = require('./config-manager');
const checkinManager = require('./checkin-manager');

let msalClient = null;

function refreshMsalClient() {
  msalClient = new msal.ConfidentialClientApplication(config.msalConfig);
  return msalClient;
}

refreshMsalClient();

let isRunning = false;
let lastSyncTime = null;
let lastSyncSuccess = null;
let syncErrorMessage = null;
let socketIO = null;
let pollTimerHandle = null;
let autoMaintenanceOwned = false;
const connectedDisplayClients = new Map();

const GRAPH_FAILURE_MAINTENANCE_MESSAGE = process.env.GRAPH_FAILURE_MAINTENANCE_MESSAGE
  || 'Calendar backend currently unavailable. Display is temporarily in fallback mode.';

function getGraphFetchSettings() {
  return {
    timeoutMs: Math.max(Number.parseInt(config.systemDefaults?.graphFetchTimeoutMs, 10) || 10000, 1000),
    retryAttempts: Math.max(Number.parseInt(config.systemDefaults?.graphFetchRetryAttempts, 10) || 2, 0),
    retryBaseMs: Math.max(Number.parseInt(config.systemDefaults?.graphFetchRetryBaseMs, 10) || 250, 50)
  };
}

function sanitizeErrorForLog(error) {
  if (!error || typeof error !== 'object') {
    return {
      message: String(error || 'Unknown error')
    };
  }

  return {
    name: error.name,
    message: error.message,
    code: error.code || error.body?.error?.code,
    status: error.status || error.statusCode
  };
}

function logSanitizedError(label, error, extra = undefined) {
  if (extra) {
    console.error(label, {
      error: sanitizeErrorForLog(error),
      extra
    });
    return;
  }

  console.error(label, sanitizeErrorForLog(error));
}

function isRetryableGraphError(error) {
  if (!error) {
    return false;
  }

  const message = String(error?.message || '').toLowerCase();
  if (message.includes('aborted') || message.includes('timeout') || message.includes('network')) {
    return true;
  }

  const status = Number(error?.status || error?.statusCode || 0);
  return status === 429 || status >= 500;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function graphFetch(url, options = {}) {
  const settings = getGraphFetchSettings();
  let lastError = null;

  for (let attempt = 0; attempt <= settings.retryAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), settings.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      if (!response.ok && (response.status === 429 || response.status >= 500)) {
        const retryError = new Error(`Graph HTTP ${response.status}`);
        retryError.status = response.status;
        if (attempt < settings.retryAttempts) {
          await delay(settings.retryBaseMs * Math.pow(2, attempt));
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < settings.retryAttempts && isRetryableGraphError(error)) {
        await delay(settings.retryBaseMs * Math.pow(2, attempt));
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  throw lastError || new Error('Graph request failed');
}

function isGraphModeEnabled() {
  return true;
}

function hasValidGraphCredentials() {
  const clientId = String(config?.msalConfig?.auth?.clientId || '').trim();
  const authority = String(config?.msalConfig?.auth?.authority || '').trim();
  const clientSecret = String(config?.msalConfig?.auth?.clientSecret || '').trim();

  if (!clientId || clientId === 'OAUTH_CLIENT_ID_NOT_SET') {
    return false;
  }
  if (!authority || authority === 'OAUTH_AUTHORITY_NOT_SET') {
    return false;
  }
  if (!clientSecret || clientSecret === 'OAUTH_CLIENT_SECRET_NOT_SET') {
    return false;
  }

  try {
    const parsed = new URL(authority);
    return !!parsed.protocol && !!parsed.hostname;
  } catch (error) {
    return false;
  }
}

function ensureGraphFailureMaintenance() {
  if (!isGraphModeEnabled()) {
    return;
  }

  try {
    const currentMaintenance = configManager.getMaintenanceConfig();

    if (currentMaintenance.enabled) {
      const isAutoMessage = String(currentMaintenance.message || '').startsWith(GRAPH_FAILURE_MAINTENANCE_MESSAGE);
      if (isAutoMessage) {
        autoMaintenanceOwned = true;
        if (currentMaintenance.message !== GRAPH_FAILURE_MAINTENANCE_MESSAGE) {
          configManager.updateMaintenanceConfig(true, GRAPH_FAILURE_MAINTENANCE_MESSAGE).catch((err) => {
            logSanitizedError('Failed to normalize maintenance fallback message:', err);
          });
        }
      }
      return;
    }

    autoMaintenanceOwned = true;
    configManager.updateMaintenanceConfig(true, GRAPH_FAILURE_MAINTENANCE_MESSAGE).catch((err) => {
      logSanitizedError('Failed to auto-enable maintenance fallback:', err);
    });
  } catch (err) {
    logSanitizedError('Failed to read maintenance config:', err);
  }
}

function clearGraphFailureMaintenance() {
  if (!autoMaintenanceOwned) {
    return;
  }

  try {
    const currentMaintenance = configManager.getMaintenanceConfig();
    if (!currentMaintenance.enabled) {
      autoMaintenanceOwned = false;
      return;
    }

    const isAutoMessage = String(currentMaintenance.message || '').startsWith(GRAPH_FAILURE_MAINTENANCE_MESSAGE);
    if (!isAutoMessage) {
      autoMaintenanceOwned = false;
      return;
    }

    configManager.updateMaintenanceConfig(false, currentMaintenance.message).catch((err) => {
      logSanitizedError('Failed to auto-disable maintenance fallback:', err);
    });
    autoMaintenanceOwned = false;
  } catch (err) {
    logSanitizedError('Failed to read maintenance config:', err);
  }
}

function formatSyncError(error) {
  if (!error) {
    return 'Unknown error';
  }

  const baseMessage = error.message || String(error);

  if (String(baseMessage).includes('AADSTS7000215') || String(baseMessage).toLowerCase().includes('invalid_client')) {
    return 'Microsoft Graph authentication failed: invalid OAuth client secret. Update the client secret value in Admin → Operations → Graph-API.';
  }

  const graphMessage = error.body?.error?.message;
  const graphCode = error.body?.error?.code || error.code;
  const statusCode = error.statusCode || error.status;

  const parts = [];
  if (statusCode) {
    parts.push(`HTTP ${statusCode}`);
  }
  if (graphCode) {
    parts.push(graphCode);
  }

  const detail = graphMessage || baseMessage;
  return parts.length > 0 ? `${parts.join(' ')}: ${detail}` : detail;
}

function normalizeDisplayClientId(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  // Allow longer IDs with underscores for session-based IDs
  if (!/^[a-zA-Z0-9._:-]{3,250}$/.test(normalized)) {
    return '';
  }

  return normalized;
}

function emitConnectedClientsUpdated() {
  if (!socketIO) {
    return;
  }

  socketIO.of('/').emit('connectedClientsUpdated', getConnectedDisplayClients());
}

function normalizeIpAddress(rawIp) {
  if (!rawIp || rawIp === 'unknown') {
    return 'unknown';
  }

  const ip = String(rawIp).trim();
  
  // Extract IPv4 from IPv6-mapped IPv4 address (::ffff:192.168.1.1 -> 192.168.1.1)
  const ipv6MappedMatch = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (ipv6MappedMatch) {
    return ipv6MappedMatch[1];
  }

  // Also handle format with brackets [::ffff:192.168.1.1]
  const ipv6BracketMatch = ip.match(/^\[?::ffff:(\d+\.\d+\.\d+\.\d+)\]?$/i);
  if (ipv6BracketMatch) {
    return ipv6BracketMatch[1];
  }

  // Handle localhost IPv6 (::1 -> localhost)
  if (ip === '::1' || ip === '[::1]') {
    return 'localhost (::1)';
  }

  return ip;
}

function getDisplayTrackingConfig() {
  const systemConfig = configManager.getSystemConfig();
  return {
    mode: systemConfig.displayTrackingMode || 'client-id',
    retentionHours: systemConfig.displayTrackingRetentionHours || 2,
    cleanupMinutes: systemConfig.displayTrackingCleanupMinutes || 5
  };
}

function generateDisplayIdentifier(socket) {
  const trackingConfig = getDisplayTrackingConfig();
  
  if (trackingConfig.mode === 'ip-room') {
    // IP + Room based tracking
    const rawIpAddress = socket?.handshake?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
      || socket?.handshake?.headers?.['x-real-ip']
      || socket?.handshake?.address
      || 'unknown';
    const ipAddress = normalizeIpAddress(rawIpAddress);
    const roomAlias = String(socket?.handshake?.query?.roomAlias || '').trim();
    const displayType = String(socket?.handshake?.query?.displayType || '').trim().toLowerCase() || 'unknown';
    
    // Normalize displayType for flightboard components (flightboard, flightboard-navbar, etc.)
    const normalizedDisplayType = displayType.startsWith('flightboard') ? 'flightboard' : displayType;
    
    // Create identifier: ip_room or ip_displayType if no room
    const roomPart = roomAlias || normalizedDisplayType;
    return `${ipAddress}_${roomPart}`;
  } else {
    // Client ID based tracking (default)
    const rawClientId = socket?.handshake?.query?.displayClientId;
    return normalizeDisplayClientId(rawClientId);
  }
}

function registerConnectedClient(socket) {
  const identifier = generateDisplayIdentifier(socket);
  if (!identifier) {
    return;
  }

  const rawDisplayType = String(socket?.handshake?.query?.displayType || '').trim().toLowerCase();
  const displayType = rawDisplayType || 'unknown';
  const roomAlias = String(socket?.handshake?.query?.roomAlias || '').trim();
  const nowIso = new Date().toISOString();
  
  // Extract IP address from socket
  const rawIpAddress = socket?.handshake?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || socket?.handshake?.headers?.['x-real-ip']
    || socket?.handshake?.address
    || 'unknown';
  
  console.log(`Raw IP address for client ${identifier}: ${rawIpAddress}`);
  const ipAddress = normalizeIpAddress(rawIpAddress);
  console.log(`Normalized IP address for client ${identifier}: ${ipAddress}`);

  const existing = connectedDisplayClients.get(identifier) || {
    clientId: identifier,
    displayType,
    roomAlias,
    ipAddress,
    connectedAt: nowIso,
    lastSeenAt: nowIso,
    socketIds: new Set()
  };

  existing.displayType = displayType || existing.displayType;
  existing.roomAlias = roomAlias || existing.roomAlias;
  existing.ipAddress = ipAddress; // Update IP on reconnect
  existing.lastSeenAt = nowIso;
  existing.socketIds.add(socket.id);
  connectedDisplayClients.set(identifier, existing);
  socket.data.displayIdentifier = identifier;

  emitConnectedClientsUpdated();
}

function unregisterConnectedClient(socket) {
  const identifier = socket?.data?.displayIdentifier;
  if (!identifier || !connectedDisplayClients.has(identifier)) {
    return;
  }

  const entry = connectedDisplayClients.get(identifier);
  entry.socketIds.delete(socket.id);
  entry.lastSeenAt = new Date().toISOString();

  // Keep disconnected displays for configured retention time before removing them
  if (entry.socketIds.size === 0) {
    // Don't delete immediately, just update lastSeenAt
    connectedDisplayClients.set(identifier, entry);
    
    // Schedule cleanup after configured delay
    const trackingConfig = getDisplayTrackingConfig();
    const cleanupDelayMs = trackingConfig.cleanupMinutes * 60 * 1000;
    
    if (cleanupDelayMs > 0) {
      setTimeout(() => {
        const currentEntry = connectedDisplayClients.get(identifier);
        // Only delete if still disconnected (no sockets)
        if (currentEntry && currentEntry.socketIds.size === 0) {
          const lastSeen = new Date(currentEntry.lastSeenAt);
          const now = new Date();
          const minutesSinceLastSeen = (now - lastSeen) / (60 * 1000);
          
          if (minutesSinceLastSeen >= trackingConfig.cleanupMinutes) {
            connectedDisplayClients.delete(identifier);
            console.log(`Auto-removed disconnected display: ${identifier} (disconnected for ${Math.round(minutesSinceLastSeen)} minutes)`);
            emitConnectedClientsUpdated();
          }
        }
      }, cleanupDelayMs);
    }
  } else {
    connectedDisplayClients.set(identifier, entry);
  }

  emitConnectedClientsUpdated();
}

function cleanupOldDisplays() {
  const trackingConfig = getDisplayTrackingConfig();
  const now = new Date();
  const retentionMs = trackingConfig.retentionHours * 60 * 60 * 1000;
  const cutoffTime = new Date(now.getTime() - retentionMs);
  
  for (const [identifier, entry] of connectedDisplayClients.entries()) {
    const lastSeen = new Date(entry.lastSeenAt);
    if (lastSeen < cutoffTime) {
      connectedDisplayClients.delete(identifier);
      console.log(`Removed old display client: ${identifier} (last seen: ${entry.lastSeenAt}, retention: ${trackingConfig.retentionHours}h)`);
    }
  }
}

function getConnectedDisplayClients() {
  // Clean up old displays before returning the list
  cleanupOldDisplays();
  
  return Array.from(connectedDisplayClients.values())
    .map((entry) => ({
      clientId: entry.clientId,
      displayType: entry.displayType,
      roomAlias: entry.roomAlias,
      ipAddress: entry.ipAddress,
      connectedAt: entry.connectedAt,
      lastSeenAt: entry.lastSeenAt,
      sockets: entry.socketIds.size
    }))
    .sort((a, b) => a.clientId.localeCompare(b.clientId));
}

function emitToDisplayClient(clientId, eventName, payload) {
  const normalizedClientId = normalizeDisplayClientId(clientId);
  if (!normalizedClientId || !socketIO) {
    return false;
  }

  const entry = connectedDisplayClients.get(normalizedClientId);
  if (!entry || entry.socketIds.size === 0) {
    return false;
  }

  for (const socketId of entry.socketIds) {
    socketIO.of('/').to(socketId).emit(eventName, payload);
  }

  return true;
}

function removeDisplayClient(clientId) {
  const normalizedClientId = normalizeDisplayClientId(clientId);
  if (!normalizedClientId) {
    return false;
  }

  const entry = connectedDisplayClients.get(normalizedClientId);
  if (!entry) {
    return false;
  }

  // Only allow deletion if no active sockets
  if (entry.socketIds.size > 0) {
    return false;
  }

  connectedDisplayClients.delete(normalizedClientId);
  emitConnectedClientsUpdated();
  console.log(`Manually removed display client: ${normalizedClientId}`);
  return true;
}

function fetchAndBroadcastRooms() {
  return new Promise((resolve) => {
    if (!socketIO) {
      resolve(false);
      return;
    }

    if (!hasValidGraphCredentials()) {
      lastSyncTime = new Date().toISOString();
      lastSyncSuccess = false;
      syncErrorMessage = 'Microsoft Graph is not fully configured yet. Please complete Graph-API settings in Admin.';

      try {
        const currentMaintenance = configManager.getMaintenanceConfig();
        const isAutoMessage = String(currentMaintenance?.message || '').startsWith(GRAPH_FAILURE_MAINTENANCE_MESSAGE);
        if (currentMaintenance?.enabled && isAutoMessage) {
          configManager.updateMaintenanceConfig(false, currentMaintenance.message).catch((err) => {
            logSanitizedError('Failed to auto-disable maintenance fallback for unconfigured Graph:', err);
          });
        }
      } catch (err) {
        logSanitizedError('Failed to inspect maintenance config:', err);
      }

      autoMaintenanceOwned = false;
      socketIO.of('/').emit('controllerDone', 'done');
      resolve(false);
      return;
    }

    const api = require('./msgraph/rooms.js');

    api(function(err, result) {
      lastSyncTime = new Date().toISOString();

      if (result) {
        if (err) {
          logSanitizedError('Error fetching room data:', err);
          lastSyncSuccess = false;
          syncErrorMessage = formatSyncError(err);
          ensureGraphFailureMaintenance();
          socketIO.of('/').emit('controllerDone', 'done');
          resolve(false);
          return;
        }

        lastSyncSuccess = true;
        syncErrorMessage = null;
        clearGraphFailureMaintenance();
        socketIO.of('/').emit('updatedRooms', result);

        releaseNoShowAppointments(result)
          .then((releasedCount) => {
            if (releasedCount > 0) {
              setTimeout(() => {
                fetchAndBroadcastRooms();
              }, 1000);
            }
          })
          .catch((releaseError) => {
            logSanitizedError('No-show auto-release failed:', releaseError);
          });
      } else {
        lastSyncSuccess = false;
        syncErrorMessage = err
          ? formatSyncError(err)
          : 'No data returned from API';
        ensureGraphFailureMaintenance();
      }

      socketIO.of('/').emit('controllerDone', 'done');
      resolve(true);
    }, msalClient);
  });
}

async function deleteGraphEvent(roomEmail, appointmentId) {
  const tokenRequest = {
    scopes: ['https://graph.microsoft.com/.default']
  };

  const authResult = await msalClient.acquireTokenByClientCredential(tokenRequest);
  const accessToken = authResult.accessToken;
  const deleteUrl = `https://graph.microsoft.com/v1.0/users/${roomEmail}/events/${appointmentId}`;

  const response = await graphFetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Graph delete failed (${response.status}): ${errorText}`);
  }
}

async function releaseNoShowAppointments(rooms) {
  const bookingConfig = configManager.getBookingConfig();
  const checkInSettings = checkinManager.resolveCheckInSettings(bookingConfig?.checkIn);

  if (!checkInSettings.enabled || !checkInSettings.autoReleaseNoShow) {
    return 0;
  }

  if (!Array.isArray(rooms) || rooms.length === 0) {
    return 0;
  }

  let releasedCount = 0;
  for (const room of rooms) {
    if (!room || !room.Busy || !Array.isArray(room.Appointments) || room.Appointments.length === 0) {
      continue;
    }

    const currentAppointment = room.Appointments[0];
    if (!currentAppointment || !currentAppointment.Id) {
      continue;
    }

    const status = checkinManager.getCheckInStatus({
      roomEmail: room.Email,
      appointmentId: currentAppointment.Id,
      organizer: currentAppointment.Organizer,
      roomName: room.Name,
      startTimestamp: currentAppointment.Start,
      checkInConfig: checkInSettings
    });

    if (!status.required || status.checkedIn || !status.expired) {
      continue;
    }

    try {
      await deleteGraphEvent(room.Email, currentAppointment.Id);

      checkinManager.clearCheckedIn({ roomEmail: room.Email, appointmentId: currentAppointment.Id });
      releasedCount += 1;
      console.log(`No-show auto-release applied for room ${room.Email}, appointment ${currentAppointment.Id}`);
    } catch (error) {
      logSanitizedError('Failed no-show auto-release for room appointment:', error, {
        roomEmail: room.Email,
        appointmentId: currentAppointment.Id
      });
    }
  }

  return releasedCount;
}

function getSyncStatus() {
  const now = new Date();
  const lastSync = lastSyncTime ? new Date(lastSyncTime) : null;
  const secondsSinceSync = lastSync ? Math.floor((now - lastSync) / 1000) : null;

  return {
    lastSyncTime: lastSyncTime,
    lastSyncSuccess: lastSyncSuccess,
    syncErrorMessage: syncErrorMessage,
    secondsSinceSync: secondsSinceSync,
    isStale: secondsSinceSync !== null && secondsSinceSync > 180,
    hasNeverSynced: lastSyncTime === null
  };
}

function getEffectivePollIntervalMs() {
  const webhookModeEnabled = !!config.graphWebhook?.enabled;
  return webhookModeEnabled
    ? Math.max(config.calendarSearch.pollIntervalMs, 300000)
    : config.calendarSearch.pollIntervalMs;
}

function startPollingLoop() {
  const pollInterval = getEffectivePollIntervalMs();

  fetchAndBroadcastRooms();

  if (pollTimerHandle) {
    clearInterval(pollTimerHandle);
  }

  pollTimerHandle = setInterval(() => {
    fetchAndBroadcastRooms();
  }, pollInterval);

  if (config.graphWebhook?.enabled) {
    console.log(`Graph webhook mode enabled. Polling fallback active every ${pollInterval} ms.`);
  }
}

function refreshPollingSchedule() {
  if (!isRunning) {
    return false;
  }

  startPollingLoop();
  return true;
}

async function triggerImmediateRefresh() {
  if (!socketIO) {
    return false;
  }

  return fetchAndBroadcastRooms();
}

/**
 * Socket Controller - Manages Socket.IO connections and room data updates
 * Polls the calendar API at a configurable interval and broadcasts updates to all connected clients
 * Uses Microsoft Graph API
 * 
 * @param {Object} io - Socket.IO server instance
 */
module.exports = function(io) {
  socketIO = io;

  // Pass Socket.IO instance to config-manager for real-time configuration updates
  configManager.setSocketIO(io);

  // Run cleanup of old displays every 24 hours
  setInterval(() => {
    cleanupOldDisplays();
  }, 24 * 60 * 60 * 1000);

  /**
   * Handle new Socket.IO connections
   * Starts the API polling loop on first connection
   */
  io.of('/').on('connection', function(socket) {
    console.log('Client connected to Socket.IO');
    registerConnectedClient(socket);

    // Start API polling loop only once
    if (!isRunning) {
    startPollingLoop();
    }

    isRunning = true;

    // Handle heartbeat to update lastSeenAt
    socket.on('display-heartbeat', function() {
      const identifier = socket?.data?.displayIdentifier;
      if (identifier && connectedDisplayClients.has(identifier)) {
        const entry = connectedDisplayClients.get(identifier);
        entry.lastSeenAt = new Date().toISOString();
        connectedDisplayClients.set(identifier, entry);
      }
    });

    // Handle client disconnection
    socket.on('disconnect', function() {
      unregisterConnectedClient(socket);
      console.log('Client disconnected from Socket.IO');
    });
  });

  // Export sync status getter for routes to use
  module.exports.getSyncStatus = getSyncStatus;
  module.exports.triggerImmediateRefresh = triggerImmediateRefresh;
  module.exports.refreshPollingSchedule = refreshPollingSchedule;
  module.exports.refreshMsalClient = refreshMsalClient;
  module.exports.getConnectedDisplayClients = getConnectedDisplayClients;
  module.exports.emitToDisplayClient = emitToDisplayClient;
  module.exports.removeDisplayClient = removeDisplayClient;
};

module.exports.getSyncStatus = getSyncStatus;
module.exports.triggerImmediateRefresh = triggerImmediateRefresh;
module.exports.refreshPollingSchedule = refreshPollingSchedule;
module.exports.refreshMsalClient = refreshMsalClient;
module.exports.getConnectedDisplayClients = getConnectedDisplayClients;
module.exports.emitToDisplayClient = emitToDisplayClient;
module.exports.removeDisplayClient = removeDisplayClient;
