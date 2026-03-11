import React, { Component } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';

import FlightboardRow from './FlightboardRow';
import Socket from '../global/Socket';
import Spinner from '../global/Spinner';
import { applyI18nConfig, getMaintenanceCopy, loadMaintenanceMessages } from '../../config/maintenanceMessages.js';
import { getDisplayClientId } from '../../utils/displayClientId.js';

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
    this.handleSocket = this.handleSocket.bind(this);
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

  /**
   * Handle Socket.IO updates
   * Updates component state when new room data is received via websocket
   * @param {Object} socketResponse - Response from Socket.IO containing room data
   */
  handleSocket(socketResponse) {
    this.setState({
      response: socketResponse.response,
      rooms: socketResponse.rooms
    });
  }

  fetchMaintenanceStatus() {
    return fetch('/api/maintenance-status')
      .then((response) => response.json())
      .then((data) => {
        this.setState({
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

    this.socket = io({
      query: {
        displayClientId: this.displayClientId,
        displayType: 'flightboard',
        roomAlias: ''
      }
    });
    if (this.socket && this.socket.on) {
      this.socket.on('maintenanceConfigUpdated', (maintenanceConfig) => {
        this.setState({
          maintenanceConfig: {
            enabled: Boolean(maintenanceConfig?.enabled),
            message: maintenanceConfig?.message || ''
          }
        });
      });

      this.socket.on('i18nConfigUpdated', (i18nConfig) => {
        applyI18nConfig(i18nConfig);
        this.setState({ i18nTick: Date.now() });
      });

      this.socket.on('sidebarConfigUpdated', () => {
        this.fetchSidebarConfig();
      });
    }

    // Send heartbeat every 30 seconds to keep display status active
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('display-heartbeat');
      }
    }, 30000);
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
        {/* Socket.IO connection for real-time updates */}
        <Socket response={this.handleSocket} />

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
