import React, { Component } from 'react';
import PropTypes from 'prop-types';
import config from '../../config/singleRoom.config.js';
import io from 'socket.io-client';

import RoomStatusBlock from './RoomStatusBlock';
import Sidebar from './Sidebar';
import Socket from '../global/Socket';
import Spinner from '../global/Spinner';
import BookingModal from '../booking/BookingModal';
import ExtendMeetingModal from '../booking/ExtendMeetingModal';

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
        enableBooking: true,
        enableExtendMeeting: false,
        extendMeetingUrlAllowlist: []
      },
      colorsConfig: {
        bookingButtonColor: '#334155',
        statusAvailableColor: '#22c55e',
        statusBusyColor: '#ef4444',
        statusUpcomingColor: '#f59e0b'
      },
      showBookingModal: false,
      showExtendModal: false,
      showErrorModal: false,
      errorMessage: ''
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
    this.fetchColorsConfig();
    
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
            buttonColor: buttonColor,
            enableExtendMeeting: config.enableExtendMeeting !== undefined ? config.enableExtendMeeting : false,
            extendMeetingUrlAllowlist: Array.isArray(config.extendMeetingUrlAllowlist) ? config.extendMeetingUrlAllowlist : []
          }
        });
        // Apply button color as CSS custom property
        document.documentElement.style.setProperty('--booking-button-color', buttonColor);
      });
      
      this.socket.on('colorsConfigUpdated', (config) => {
        console.log('Colors config updated via Socket.IO:', config);
        this.setState({ 
          colorsConfig: {
            bookingButtonColor: config.bookingButtonColor || '#334155',
            statusAvailableColor: config.statusAvailableColor || '#22c55e',
            statusBusyColor: config.statusBusyColor || '#ef4444',
            statusUpcomingColor: config.statusUpcomingColor || '#f59e0b'
          }
        });
        // Apply all colors as CSS custom properties
        document.documentElement.style.setProperty('--booking-button-color', config.bookingButtonColor || '#334155');
        document.documentElement.style.setProperty('--status-available-color', config.statusAvailableColor || '#22c55e');
        document.documentElement.style.setProperty('--status-busy-color', config.statusBusyColor || '#ef4444');
        document.documentElement.style.setProperty('--status-upcoming-color', config.statusUpcomingColor || '#f59e0b');
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
            buttonColor: buttonColor,
            enableExtendMeeting: data.enableExtendMeeting !== undefined ? data.enableExtendMeeting : false,
            extendMeetingUrlAllowlist: Array.isArray(data.extendMeetingUrlAllowlist) ? data.extendMeetingUrlAllowlist : []
          }
        });
        // Apply button color as CSS custom property
        document.documentElement.style.setProperty('--booking-button-color', buttonColor);
      })
      .catch(err => {
        console.error('Error fetching booking config:', err);
      });
  }

  fetchColorsConfig = () => {
    fetch('/api/colors')
      .then(response => response.json())
      .then(data => {
        this.setState({ 
          colorsConfig: {
            bookingButtonColor: data.bookingButtonColor || '#334155',
            statusAvailableColor: data.statusAvailableColor || '#22c55e',
            statusBusyColor: data.statusBusyColor || '#ef4444',
            statusUpcomingColor: data.statusUpcomingColor || '#f59e0b'
          }
        });
        // Apply all colors as CSS custom properties
        document.documentElement.style.setProperty('--booking-button-color', data.bookingButtonColor || '#334155');
        document.documentElement.style.setProperty('--status-available-color', data.statusAvailableColor || '#22c55e');
        document.documentElement.style.setProperty('--status-busy-color', data.statusBusyColor || '#ef4444');
        document.documentElement.style.setProperty('--status-upcoming-color', data.statusUpcomingColor || '#f59e0b');
      })
      .catch(err => {
        console.error('Error fetching colors config:', err);
      });
  }

  /**
   * Handle extending current meeting
   * @param {number} minutes - Number of minutes to extend (15 or 30)
   */
  handleExtendMeeting = (minutes) => {
    if (!this.isExtendMeetingAllowed()) {
      console.warn('Extend meeting is disabled for this display');
      return;
    }

    const { room } = this.state;
    
    if (!room || !room.Appointments || room.Appointments.length === 0 || !room.Busy) {
      console.error('Cannot extend meeting: no active meeting');
      return;
    }
    
    const currentAppointment = room.Appointments[0];
    
    fetch('/api/extend-meeting', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roomEmail: room.Email,
        appointmentId: currentAppointment.Id,
        minutes: minutes
      })
    })
      .then(response => {
        return response.json().then(data => ({ status: response.status, data }));
      })
      .then(({ status, data }) => {
        if (status === 200 && data.success) {
          console.log(`Meeting extended by ${minutes} minutes`);
          // Refresh room data to show updated meeting end time
          setTimeout(() => this.getRoomsData(), 1000);
        } else {
          const errorMsg = data.error || data.message || 'Failed to extend meeting';
          console.error('Failed to extend meeting:', errorMsg);
          console.log('Setting error modal state:', { showErrorModal: true, errorMessage: errorMsg });
          this.setState({ 
            showErrorModal: true, 
            errorMessage: errorMsg
          }, () => {
            console.log('State after setting:', { showErrorModal: this.state.showErrorModal, errorMessage: this.state.errorMessage });
          });
        }
      })
      .catch(err => {
        console.error('Error extending meeting:', err);
        this.setState({ 
          showErrorModal: true, 
          errorMessage: 'Network error. Please try again.' 
        });
      });
  }

  isExtendMeetingAllowed = () => {
    const { bookingConfig } = this.state;
    const allowlist = bookingConfig.extendMeetingUrlAllowlist;

    if (!bookingConfig.enableExtendMeeting) {
      return false;
    }

    const params = new URLSearchParams(window.location.search);
    const enabledByParam = params.get('extendbooking') === 'true';
    if (!enabledByParam) {
      return false;
    }

    if (!Array.isArray(allowlist) || allowlist.length === 0) {
      return true;
    }

    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;

    return allowlist.some((entry) => {
      if (!entry) return false;
      if (entry.startsWith('/') && entry.endsWith('/') && entry.length > 2) {
        try {
          const regex = new RegExp(entry.slice(1, -1));
          return regex.test(currentUrl) || regex.test(currentPath);
        } catch (err) {
          console.warn('Invalid extendMeetingUrlAllowlist regex:', entry);
          return false;
        }
      }
      return currentUrl.includes(entry) || currentPath.includes(entry);
    });
  }

  render() {
    const { response, room, roomDetails, sidebarConfig, bookingConfig, showBookingModal, showExtendModal, showErrorModal, errorMessage } = this.state;
    const canExtendMeeting = this.isExtendMeetingAllowed();
    
    console.log('Render - showErrorModal:', showErrorModal, 'errorMessage:', errorMessage);
    
    // Detect browser language for button translation
    const browserLang = navigator.language || navigator.userLanguage;
    const lang = browserLang.split('-')[0];
    const bookButtonText = lang === 'de' ? 'Raum buchen' : 'Book This Room';
    const extendButtonText = lang === 'de' ? 'Meeting verlängern' : 'Extend Meeting';
    const errorText = lang === 'de' ? 'Fehler' : 'Error';

    return (
      <div style={{ position: 'relative' }}>
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
              onExtendMeeting={canExtendMeeting ? () => this.setState({ showExtendModal: true }) : null}
              bookButtonText={bookButtonText}
              extendButtonText={extendButtonText}
            />
          </div>
        ) : (
          <Spinner />
        )}
        
        {/* Booking Modal - Outside the flex container */}
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

        {showExtendModal && canExtendMeeting && (
          <ExtendMeetingModal
            room={room}
            onClose={() => this.setState({ showExtendModal: false })}
            onSuccess={() => {
              this.getRoomsData();
            }}
          />
        )}
        
        {/* Error Modal - Outside the flex container */}
        {showErrorModal && (
          <div 
            className="booking-modal-overlay" 
            onClick={() => this.setState({ showErrorModal: false })}
          >
            <div 
              className="booking-modal" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="booking-modal-header">
                <h2 className="error-title">{errorText}</h2>
                <button 
                  className="booking-modal-close" 
                  onClick={() => this.setState({ showErrorModal: false })}
                >
                  ×
                </button>
              </div>
              <div className="booking-modal-body">
                <p className="error-message">
                  {errorMessage || 'An error occurred'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

Display.propTypes = {
  alias: PropTypes.string.isRequired
};

export default Display;
