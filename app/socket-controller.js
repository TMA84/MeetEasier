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

  /**
   * Handle new Socket.IO connections
   * Starts the API polling loop on first connection
   */
  io.of('/').on('connection', function(socket) {
    console.log('Client connected to Socket.IO');

    // Start API polling loop only once
    if (!isRunning) {
    startPollingLoop();
    }

    isRunning = true;

    // Handle client disconnection
    socket.on('disconnect', function() {
      console.log('Client disconnected from Socket.IO');
    });
  });

  // Export sync status getter for routes to use
  module.exports.getSyncStatus = getSyncStatus;
  module.exports.triggerImmediateRefresh = triggerImmediateRefresh;
  module.exports.refreshPollingSchedule = refreshPollingSchedule;
  module.exports.refreshMsalClient = refreshMsalClient;
};

module.exports.getSyncStatus = getSyncStatus;
module.exports.triggerImmediateRefresh = triggerImmediateRefresh;
module.exports.refreshPollingSchedule = refreshPollingSchedule;
module.exports.refreshMsalClient = refreshMsalClient;
