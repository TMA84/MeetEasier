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

  // Pass Socket.IO instance to wifi-manager for real-time configuration updates
  const wifiManager = require('./wifi-manager');
  wifiManager.setSocketIO(io);

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
          if (result) {
            if (err) {
              console.error('Error fetching room data:', err);
              return;
            }
            
            // Broadcast updated room data to all connected clients
            io.of('/').emit('updatedRooms', result);
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
};
