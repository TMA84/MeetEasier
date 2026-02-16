const msal = require('@azure/msal-node');
const config = require('../config/config');

const msalClient = new msal.ConfidentialClientApplication(config.msalConfig);

/**
 * Socket Controller - Manages Socket.IO connections and room data updates
 * Polls the calendar API every 60 seconds and broadcasts updates to all connected clients
 * Supports both Microsoft Graph API and Exchange Web Services (EWS)
 * 
 * @param {Object} io - Socket.IO server instance
 */
module.exports = function(io) {
  let isRunning = false;
  let lastSyncTime = null;
  let lastSyncSuccess = null;
  let syncErrorMessage = null;

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
       * Runs every 60 seconds
       */
      (function callAPI() {
        // Select API based on configuration
        let api;
        if (config.calendarSearch.useGraphAPI === 'true') {
          api = require('./msgraph/rooms.js');
        } else {
          api = require('./ews/rooms.js');
        }

        // Call the API and broadcast results
        api(function(err, result) {
          // Update sync status
          lastSyncTime = new Date().toISOString();
          
          if (result) {
            if (err) {
              console.error('Error fetching room data:', err);
              lastSyncSuccess = false;
              syncErrorMessage = err.message || 'Unknown error';
              return;
            }
            
            lastSyncSuccess = true;
            syncErrorMessage = null;
            
            // Broadcast updated room data to all connected clients
            io.of('/').emit('updatedRooms', result);
          } else {
            lastSyncSuccess = false;
            syncErrorMessage = 'No data returned from API';
          }

          // Notify that controller cycle is complete
          io.of('/').emit('controllerDone', 'done');
        }, msalClient);

        // Schedule next API call in 60 seconds
        setTimeout(callAPI, 60000);
      })();
    }

    isRunning = true;

    // Handle client disconnection
    socket.on('disconnect', function() {
      console.log('Client disconnected from Socket.IO');
    });
  });

  /**
   * Get current sync status
   * Returns information about the last calendar sync
   */
  function getSyncStatus() {
    const now = new Date();
    const lastSync = lastSyncTime ? new Date(lastSyncTime) : null;
    const secondsSinceSync = lastSync ? Math.floor((now - lastSync) / 1000) : null;
    
    return {
      lastSyncTime: lastSyncTime,
      lastSyncSuccess: lastSyncSuccess,
      syncErrorMessage: syncErrorMessage,
      secondsSinceSync: secondsSinceSync,
      isStale: secondsSinceSync !== null && secondsSinceSync > 180, // Stale if > 3 minutes (180 seconds)
      hasNeverSynced: lastSyncTime === null
    };
  }

  // Export sync status getter for routes to use
  module.exports.getSyncStatus = getSyncStatus;
};
