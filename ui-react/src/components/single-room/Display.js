import React, { Component } from 'react';
import PropTypes from 'prop-types';
import config from '../../config/singleRoom.config.js';
import io from 'socket.io-client';

import RoomStatusBlock from './RoomStatusBlock';
import Sidebar from './Sidebar';
import Socket from '../global/Socket';
import Spinner from '../global/Spinner';
import BookingModal from '../booking/BookingModal';

/**
 * Display component for single room view
 * Shows detailed status and meeting information for a specific room
 * Updates in real-time via Socket.IO
 */
class Display extends Component {
  /**
   * Error boundary - reload page on component error
   * Provides graceful recovery from rendering errors
   */
  componentDidCatch(error, info) {
    console.error('Display component error:', error, info);
    window.location.reload();
  }

  constructor(props) {
    super(props);
    this.state = {
      response: false,
      roomAlias: this.props.alias,
      rooms: [],
      room: {},
      roomDetails: {
        appointmentExists: false,
        timesPresent: false,
        upcomingAppointments: false,
        nextUp: '',
        upcomingTitle: ''
      },
      sidebarConfig: {
        showMeetingTitles: false
      },
      bookingConfig: {
        enableBooking: true
      },
      showBookingModal: false
    };
    this.socket = null;
  }

  /**
   * Fetch all rooms data from API
   * Called on component mount and when data needs refresh
   */
  getRoomsData = () => {
    return fetch('/api/rooms')
      .then((response) => response.json())
      .then((data) => {
        this.setState({
          rooms: data
        }, () => this.processRoomDetails());
      })
      .catch((err) => {
        console.error('Error fetching rooms data:', err);
        this.setState({
          response: true,
          room: { Name: 'Error loading room', Appointments: [] }
        });
      });
  }

  /**
   * Process room details and determine display state
   * Filters rooms by alias and sets up appointment information
   */
  processRoomDetails = () => {
    const { rooms, roomAlias } = this.state;

    // Find the specific room by alias
    const roomArray = rooms.filter(item => item.RoomAlias === roomAlias);
    const room = roomArray[0];

    // Safety check: if room is not found, set empty room object
    if (!room) {
      this.setState({
        response: true,
        room: { Name: 'Room not found', Appointments: [] }
      });
      return;
    }

    // Initialize room details object
    const roomDetails = {
      appointmentExists: false,
      timesPresent: false,
      upcomingAppointments: false,
      nextUp: '',
      upcomingTitle: ''
    };

    // Check if appointments exist for the room
    if (typeof room.Appointments !== 'undefined' && room.Appointments.length > 0) {
      roomDetails.appointmentExists = true;

      // Check if there are multiple upcoming appointments
      if (room.Appointments.length > 1) {
        roomDetails.upcomingAppointments = true;
      }

      // Check if start and end times are present
      if (room.Appointments[0].Start && room.Appointments[0].End) {
        roomDetails.timesPresent = true;

        // Set appropriate labels based on room busy status
        if (!room.Busy) {
          roomDetails.nextUp = `${config.nextUp}: `;
        } else {
          roomDetails.nextUp = '';
          roomDetails.upcomingTitle = `${config.upcomingTitle}: `;
        }
      }
    }

    this.setState({
      response: true,
      room: room,
      roomDetails: roomDetails
    });
  }

  /**
   * Handle Socket.IO updates
   * Updates rooms data when received via websocket
   * @param {Object} socketResponse - Response from Socket.IO containing rooms data
   */
  handleSocket = (socketResponse) => {
    this.setState({
      rooms: socketResponse.rooms
    }, () => this.processRoomDetails());
  }

  componentDidMount() {
    this.getRoomsData();
    this.fetchSidebarConfig();
    this.fetchBookingConfig();
    
    // Connect to Socket.IO for real-time sidebar config updates
    this.socket = io();
    if (this.socket && this.socket.on) {
      this.socket.on('sidebarConfigUpdated', (config) => {
        console.log('Sidebar config updated via Socket.IO:', config);
        this.setState({ 
          sidebarConfig: {
            showMeetingTitles: config.showMeetingTitles !== undefined ? config.showMeetingTitles : false
          }
        });
      });
      
      this.socket.on('bookingConfigUpdated', (config) => {
        console.log('Booking config updated via Socket.IO:', config);
        const buttonColor = config.buttonColor || '#334155';
        this.setState({ 
          bookingConfig: {
            enableBooking: config.enableBooking !== undefined ? config.enableBooking : true,
            buttonColor: buttonColor
          }
        });
        // Apply button color as CSS custom property
        document.documentElement.style.setProperty('--booking-button-color', buttonColor);
      });
    }
  }

  componentWillUnmount() {
    // Clean up socket connection
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * Fetch sidebar configuration from API
   * Gets settings for meeting titles display
   */
  fetchSidebarConfig = () => {
    fetch('/api/sidebar')
      .then(response => response.json())
      .then(data => {
        this.setState({ 
          sidebarConfig: {
            showMeetingTitles: data.showMeetingTitles !== undefined ? data.showMeetingTitles : false
          }
        });
      })
      .catch(err => {
        console.error('Error fetching sidebar config:', err);
      });
  }

  /**
   * Fetch booking configuration from API
   * Gets settings for booking feature enable/disable
   */
  fetchBookingConfig = () => {
    fetch('/api/booking-config')
      .then(response => response.json())
      .then(data => {
        const buttonColor = data.buttonColor || '#334155';
        this.setState({ 
          bookingConfig: {
            enableBooking: data.enableBooking !== undefined ? data.enableBooking : true,
            buttonColor: buttonColor
          }
        });
        // Apply button color as CSS custom property
        document.documentElement.style.setProperty('--booking-button-color', buttonColor);
      })
      .catch(err => {
        console.error('Error fetching booking config:', err);
      });
  }

  render() {
    const { response, room, roomDetails, sidebarConfig, bookingConfig, showBookingModal } = this.state;
    
    // Detect browser language for button translation
    const browserLang = navigator.language || navigator.userLanguage;
    const lang = browserLang.split('-')[0];
    const bookButtonText = lang === 'de' ? 'Raum buchen' : 'Book This Room';

    return (
      <div>
        {/* Socket.IO connection for real-time updates */}
        <Socket response={this.handleSocket} />

        {response ? (
          <div style={{ display: 'flex', height: '100vh' }}>
            <RoomStatusBlock 
              room={room} 
              details={roomDetails} 
              config={config} 
              sidebarConfig={sidebarConfig}
            />
            <Sidebar 
              room={room} 
              details={roomDetails} 
              config={config}
              bookingConfig={bookingConfig}
              onBookRoom={() => this.setState({ showBookingModal: true })}
              bookButtonText={bookButtonText}
            />
            
            {/* Booking Modal */}
            {showBookingModal && bookingConfig.enableBooking && (
              <BookingModal
                room={room}
                onClose={() => this.setState({ showBookingModal: false })}
                onSuccess={() => {
                  // Refresh room data after successful booking
                  this.getRoomsData();
                }}
              />
            )}
          </div>
        ) : (
          <Spinner />
        )}
      </div>
    );
  }
}

Display.propTypes = {
  alias: PropTypes.string.isRequired
};

export default Display;
