const msal = require('@azure/msal-node');
const config = require('../config/config');

const msalClient = new msal.ConfidentialClientApplication(config.msalConfig);

let isRunning = false;
let lastSyncTime = null;
let lastSyncSuccess = null;
let syncErrorMessage = null;
let socketIO = null;

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
          socketIO.of('/').emit('controllerDone', 'done');
          resolve(false);
          return;
        }

        lastSyncSuccess = true;
        syncErrorMessage = null;
        socketIO.of('/').emit('updatedRooms', result);
      } else {
        lastSyncSuccess = false;
        syncErrorMessage = 'No data returned from API';
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
  const configManager = require('./config-manager');
  configManager.setSocketIO(io);

  /**
   * Handle new Socket.IO connections
   * Starts the API polling loop on first connection
   */
  io.of('/').on('connection', function(socket) {
    console.log('Client connected to Socket.IO');

    // Start API polling loop only once
    if (!isRunning) {
      /**
       * Recursive function to poll calendar API
       * Fetches room data and broadcasts to all connected clients
        * Runs based on SEARCH_POLL_INTERVAL_MS (default: 15000 ms)
       */
      (function callAPI() {
        fetchAndBroadcastRooms();

        // Schedule next API call based on configured polling interval
        setTimeout(callAPI, config.calendarSearch.pollIntervalMs);
      })();
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
