/** @file Socket.js
*  @description Legacy Socket.IO wrapper component that establishes a real-time connection to the server and forwards room data updates to its parent via a callback prop.
*/
import { Component } from 'react';
import PropTypes from 'prop-types';
import socketIOClient from 'socket.io-client';

/**
* Socket component - Manages Socket.IO connection for real-time updates
* Listens for room data updates and passes them to parent component
* Automatically connects on mount and disconnects on unmount
*/
class Socket extends Component {
  constructor(props) {
    super(props);
    this.socket = null;
  }

  componentDidMount() {
    // Establish Socket.IO connection
    this.socket = socketIOClient();

    // Listen for room updates from server
    this.socket.on('updatedRooms', (rooms) => {
      this.props.response({
        response: true,
        rooms: rooms
      });
    });
  }

  componentWillUnmount() {
    // Clean up socket connection
    if (this.socket) {
      this.socket.close();
    }
  }

  render() {
    // This component doesn't render anything
    return null;
  }
}

Socket.propTypes = {
  response: PropTypes.func.isRequired
};

export default Socket;
