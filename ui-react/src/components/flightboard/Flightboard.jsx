/**
* @file Flightboard.js
* @description Flightboard overview component. Displays all rooms and their
*              current meeting status in a grid/list layout. Connects to
*              Socket.IO for real-time room updates and supports room filtering
*              by room list. Fetches room data via /api/rooms.
*/
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';

import FlightboardRow from './FlightboardRow';
import Spinner from '../global/Spinner';
import { applyI18nConfig, getMaintenanceCopy, loadMaintenanceMessages } from '../../config/maintenance-messages.js';
import { getDisplayClientId } from '../../utils/display-client-id.js';
import { initPowerManagement } from '../../utils/power-management.js';
import { fetchMaintenanceStatus, setupHeartbeat, createMaintenanceHandler } from '../shared/display-utils.js';

/**
* Flightboard component - Main display showing all meeting rooms
* Displays a list of all rooms with their current status and meeting information
* Updates in real-time via Socket.IO connection
*/
class Flightboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      response: false,
      error: false,
      rooms: [],
      maintenanceConfig: {
        enabled: false,
        message: ''
      },
      i18nTick: 0,
      flightboardDarkMode: true
    };

    this.displayClientId = getDisplayClientId();
    this.socket = null;
  }

  /**
  * Fetch room data from the API
  * Called on component mount to get initial room data
  */
  getRoomData() {
    return fetch('/api/rooms')
      .then((response) => response.json())
      .then((data) => {
        if (!data.error) {
          this.setState({
            response: true,
            error: false,
            rooms: data
          });
        } else {
          this.setState({
            response: true,
            error: true,
            rooms: data
          });
        }
      })
      .catch((err) => {
        console.error('Error fetching room data:', err);
        this.setState({
          response: true,
          error: true,
          rooms: { error: 'Failed to fetch room data' }
        });
      });
  }

  fetchMaintenanceStatus() {
    return fetchMaintenanceStatus(this);
  }

  fetchSidebarConfig() {
    return fetch('/api/sidebar')
      .then((response) => response.json())
      .then((data) => {
        this.setState({
          flightboardDarkMode: data.flightboardDarkMode !== undefined ? data.flightboardDarkMode : true
        });
      })
      .catch((err) => {
        console.error('Error fetching sidebar config:', err);
      });
  }

  componentDidMount() {
    this.getRoomData();
    this.fetchMaintenanceStatus();
    this.fetchSidebarConfig();
    loadMaintenanceMessages().then(() => {
      this.setState({ i18nTick: Date.now() });
    });

    // Initialize power management
    initPowerManagement(this.displayClientId);

    this.socket = io({
      transports: ['websocket'],
      query: {
        displayClientId: this.displayClientId,
        displayType: 'flightboard',
        roomAlias: ''
      }
    });
    if (this.socket && this.socket.on) {
      this.socket.on('maintenanceConfigUpdated', createMaintenanceHandler(this));

      this.socket.on('i18nConfigUpdated', (i18nConfig) => {
        applyI18nConfig(i18nConfig);
        this.setState({ i18nTick: Date.now() });
      });

      this.socket.on('sidebarConfigUpdated', () => {
        this.fetchSidebarConfig();
      });

      this.socket.on('power-management-update', (data) => {
        if (data.clientId === this.displayClientId) {
          console.log('Power management config updated via Socket.IO:', data.config);
          // Reinitialize power management with new config
          initPowerManagement(this.displayClientId);
        }
      });

      // Listen for real-time room updates (replaces separate Socket component)
      this.socket.on('updatedRooms', (rooms) => {
        this.setState({ response: true, rooms });
      });
    }

    // Send heartbeat every 30 seconds to keep display status active
    this.heartbeatInterval = setupHeartbeat(this.socket);
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
    // Clean up heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  render() {
    const { error, response, rooms, maintenanceConfig, flightboardDarkMode } = this.state;
    const maintenanceCopy = getMaintenanceCopy();
    const wrapperClass = flightboardDarkMode ? '' : 'flightboard-light';

    if (maintenanceConfig.enabled) {
      return (
        <div className={`tracker-wrap ${wrapperClass}`}>
          <div className="container">
            <div className="credentials-error">
              {maintenanceConfig.message || `${maintenanceCopy.title}. ${maintenanceCopy.body}`}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`tracker-wrap ${wrapperClass}`}>

        {response ? (
          !error ? (
            // Display all rooms
            rooms.map((room, key) => (
              <FlightboardRow 
                room={room} 
                key={key} 
                filter={this.props.filter} 
              />
            ))
          ) : (
            // Display error message
            <div className="container">
              <div className="credentials-error">{rooms.error}</div>
            </div>
          )
        ) : (
          // Display loading spinner
          <Spinner />
        )}
      </div>
    );
  }
}

Flightboard.propTypes = {
  filter: PropTypes.string
};

Flightboard.defaultProps = {
  filter: ''
};

export default Flightboard;
