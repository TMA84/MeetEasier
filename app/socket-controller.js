const msal = require('@azure/msal-node');
const config = require('../config/config');
const configManager = require('./config-manager');

const msalClient = new msal.ConfidentialClientApplication(config.msalConfig);

let isRunning = false;
let lastSyncTime = null;
let lastSyncSuccess = null;
let syncErrorMessage = null;
let socketIO = null;
let pollTimerHandle = null;
let autoMaintenanceOwned = false;

const GRAPH_FAILURE_MAINTENANCE_MESSAGE = process.env.GRAPH_FAILURE_MAINTENANCE_MESSAGE
  || 'Calendar backend currently unavailable. Display is temporarily in fallback mode.';

function isGraphModeEnabled() {
  return config.calendarSearch.useGraphAPI === 'true' || config.calendarSearch.useGraphAPI === true;
}

function ensureGraphFailureMaintenance(errorMessage) {
  if (!isGraphModeEnabled()) {
    return;
  }

  try {
    const currentMaintenance = configManager.getMaintenanceConfig();

    if (currentMaintenance.enabled && currentMaintenance.message === GRAPH_FAILURE_MAINTENANCE_MESSAGE) {
      autoMaintenanceOwned = true;
      return;
    }

    if (currentMaintenance.enabled) {
      return;
    }

    autoMaintenanceOwned = true;
    const reason = errorMessage ? `${GRAPH_FAILURE_MAINTENANCE_MESSAGE} (${errorMessage})` : GRAPH_FAILURE_MAINTENANCE_MESSAGE;
    configManager.updateMaintenanceConfig(true, reason).catch((err) => {
      console.error('Failed to auto-enable maintenance fallback:', err.message);
    });
  } catch (err) {
    console.error('Failed to read maintenance config:', err.message);
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
      console.error('Failed to auto-disable maintenance fallback:', err.message);
    });
    autoMaintenanceOwned = false;
  } catch (err) {
    console.error('Failed to read maintenance config:', err.message);
  }
}

function fetchAndBroadcastRooms() {
  return new Promise((resolve) => {
    if (!socketIO) {
      resolve(false);
      return;
    }

    let api;
    if (config.calendarSearch.useGraphAPI === 'true') {
      api = require('./msgraph/rooms.js');
    } else {
      api = require('./ews/rooms.js');
    }

    api(function(err, result) {
      lastSyncTime = new Date().toISOString();

      if (result) {
        if (err) {
          console.error('Error fetching room data:', err);
          lastSyncSuccess = false;
          syncErrorMessage = err.message || 'Unknown error';
          ensureGraphFailureMaintenance(syncErrorMessage);
          socketIO.of('/').emit('controllerDone', 'done');
          resolve(false);
          return;
        }

        lastSyncSuccess = true;
        syncErrorMessage = null;
        clearGraphFailureMaintenance();
        socketIO.of('/').emit('updatedRooms', result);
      } else {
        lastSyncSuccess = false;
        syncErrorMessage = 'No data returned from API';
        ensureGraphFailureMaintenance(syncErrorMessage);
      }

      socketIO.of('/').emit('controllerDone', 'done');
      resolve(true);
    }, msalClient);
  });
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

async function triggerImmediateRefresh() {
  if (!socketIO) {
    return false;
  }

  return fetchAndBroadcastRooms();
}

/**
 * Socket Controller - Manages Socket.IO connections and room data updates
 * Polls the calendar API at a configurable interval and broadcasts updates to all connected clients
 * Supports both Microsoft Graph API and Exchange Web Services (EWS)
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
      const webhookModeEnabled = !!config.graphWebhook?.enabled;
      const pollInterval = webhookModeEnabled
        ? Math.max(config.calendarSearch.pollIntervalMs, 300000)
        : config.calendarSearch.pollIntervalMs;

      fetchAndBroadcastRooms();
      pollTimerHandle = setInterval(() => {
        fetchAndBroadcastRooms();
      }, pollInterval);

      if (webhookModeEnabled) {
        console.log(`Graph webhook mode enabled. Polling fallback active every ${pollInterval} ms.`);
      }
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
};

module.exports.getSyncStatus = getSyncStatus;
module.exports.triggerImmediateRefresh = triggerImmediateRefresh;
