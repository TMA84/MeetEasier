import React, { Component } from 'react';
import PropTypes from 'prop-types';

import FlightboardRow from './FlightboardRow';
import Socket from '../global/Socket';
import Spinner from '../global/Spinner';

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
      rooms: []
    };

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

  componentDidMount() {
    this.getRoomData();
  }

  render() {
    const { error, response, rooms } = this.state;

    return (
      <div className="tracker-wrap">
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
