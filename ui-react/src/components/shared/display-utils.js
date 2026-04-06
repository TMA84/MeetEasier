/**
* @file display-utils.js
* @description Shared utilities for display components (Flightboard and single-room Display).
*              Extracts common patterns: maintenance status fetching and heartbeat setup.
*/

/**
* Fetch maintenance status from API and update component state.
*
* @param {Component} component - React component instance with setState
*/
export function fetchMaintenanceStatus(component) {
  return fetch('/api/maintenance-status')
    .then((response) => response.json())
    .then((data) => {
      component.setState({
        maintenanceConfig: {
          enabled: Boolean(data?.enabled),
          message: data?.message || ''
        }
      });
    })
    .catch((err) => {
      console.error('Error fetching maintenance status:', err);
    });
}

/**
* Creates a handler for the 'maintenanceConfigUpdated' socket event.
*
* @param {Component} component - React component instance with setState
* @returns {Function} Socket event handler
*/
export function createMaintenanceHandler(component) {
  return (maintenanceConfig) => {
    component.setState({
      maintenanceConfig: {
        enabled: Boolean(maintenanceConfig?.enabled),
        message: maintenanceConfig?.message || ''
      }
    });
  };
}

/**
* Set up a heartbeat interval that emits 'display-heartbeat' every 30 seconds.
*
* @param {Object} socket - Socket.IO socket instance
* @returns {number} Interval ID (for cleanup with clearInterval)
*/
export function setupHeartbeat(socket) {
  return setInterval(() => {
    if (socket && socket.connected) {
      socket.emit('display-heartbeat');
    }
  }, 30000);
}
