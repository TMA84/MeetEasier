import React, { Component } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';

import RoomStatusBlock from './RoomStatusBlock';
import Sidebar from './Sidebar';
import Socket from '../global/Socket';
import Spinner from '../global/Spinner';
import BookingModal from '../booking/BookingModal';
import ExtendMeetingModal from '../booking/ExtendMeetingModal';
import { applyI18nConfig, getMaintenanceCopy, loadMaintenanceMessages } from '../../config/maintenanceMessages.js';
import { getSingleRoomDisplayTranslations } from '../../config/displayTranslations.js';
import { getDisplayClientId } from '../../utils/displayClientId.js';

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
      maintenanceConfig: {
        enabled: false,
        message: ''
      },
      i18nTick: 0,
      roomDetails: {
        appointmentExists: false,
        timesPresent: false,
        upcomingAppointments: false,
        nextUp: '',
        upcomingTitle: ''
      },
      sidebarConfig: {
        showMeetingTitles: false,
        singleRoomDarkMode: false,
        minimalHeaderStyle: 'filled'
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
        statusUpcomingColor: '#f59e0b',
        statusNotFoundColor: '#6b7280'
      },
      showBookingModal: false,
      showExtendModal: false,
      showErrorModal: false,
      errorMessage: '',
      checkInStatus: {
        required: false,
        checkedIn: false,
        expired: false,
        loading: false,
        windowMinutes: 10
      }
    };
    this.displayClientId = getDisplayClientId();
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
    const displayTranslations = getSingleRoomDisplayTranslations();

    // Find the specific room by alias
    const roomArray = rooms.filter(item => item.RoomAlias === roomAlias);
    const room = roomArray[0];

    // Safety check: if room is not found, set empty room object
    if (!room) {
      this.setState({
        response: true,
        room: { Name: '', Busy: true, NotFound: true, Appointments: [] }
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
          roomDetails.nextUp = `${displayTranslations.nextUp}: `;
        } else {
          roomDetails.nextUp = '';
          roomDetails.upcomingTitle = `${displayTranslations.upcomingTitle}: `;
        }
      }
    }

    this.setState({
      response: true,
      room: room,
      roomDetails: roomDetails
    }, () => {
      this.fetchBookingConfig(room.Email, room.RoomlistAlias);
      this.fetchCheckInStatus(room);
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
    this.fetchMaintenanceStatus();
    loadMaintenanceMessages().then(() => {
      this.setState({ i18nTick: Date.now() });
    });
    this.fetchSidebarConfig();
    this.fetchBookingConfig();
    this.fetchColorsConfig();
    
    // Connect to Socket.IO for real-time sidebar config updates
    this.socket = io({
      query: {
        displayClientId: this.displayClientId,
        displayType: 'single-room',
        roomAlias: this.state.roomAlias || ''
      }
    });
    if (this.socket && this.socket.on) {
      this.socket.on('sidebarConfigUpdated', (config) => {
        console.log('Sidebar config updated via Socket.IO:', config);
        this.setState({ 
          sidebarConfig: {
            showMeetingTitles: config.showMeetingTitles !== undefined ? config.showMeetingTitles : false,
            singleRoomDarkMode: config.singleRoomDarkMode !== undefined ? config.singleRoomDarkMode : false,
            minimalHeaderStyle: config.minimalHeaderStyle === 'transparent' ? 'transparent' : 'filled'
          }
        });
      });

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
            statusUpcomingColor: config.statusUpcomingColor || '#f59e0b',
            statusNotFoundColor: config.statusNotFoundColor || '#6b7280'
          }
        });
        // Apply all colors as CSS custom properties
        document.documentElement.style.setProperty('--booking-button-color', config.bookingButtonColor || '#334155');
        document.documentElement.style.setProperty('--status-available-color', config.statusAvailableColor || '#22c55e');
        document.documentElement.style.setProperty('--status-busy-color', config.statusBusyColor || '#ef4444');
        document.documentElement.style.setProperty('--status-upcoming-color', config.statusUpcomingColor || '#f59e0b');
        document.documentElement.style.setProperty('--status-not-found-color', config.statusNotFoundColor || '#6b7280');
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
    fetch(`/api/sidebar?displayClientId=${encodeURIComponent(this.displayClientId)}`)
      .then(response => response.json())
      .then(data => {
        this.setState({ 
          sidebarConfig: {
            showMeetingTitles: data.showMeetingTitles !== undefined ? data.showMeetingTitles : false,
            singleRoomDarkMode: data.singleRoomDarkMode !== undefined ? data.singleRoomDarkMode : false,
            minimalHeaderStyle: data.minimalHeaderStyle === 'transparent' ? 'transparent' : 'filled'
          }
        });
      })
      .catch(err => {
        console.error('Error fetching sidebar config:', err);
      });
  }

  fetchMaintenanceStatus = () => {
    fetch('/api/maintenance-status')
      .then(response => response.json())
      .then(data => {
        this.setState({
          maintenanceConfig: {
            enabled: Boolean(data?.enabled),
            message: data?.message || ''
          }
        });
      })
      .catch(err => {
        console.error('Error fetching maintenance status:', err);
      });
  }

  /**
   * Fetch booking configuration from API
   * Gets settings for booking feature enable/disable
   */
  fetchBookingConfig = (roomEmail, roomGroup) => {
    const endpoint = roomEmail
      ? `/api/booking-config?roomEmail=${encodeURIComponent(roomEmail)}${roomGroup ? `&roomGroup=${encodeURIComponent(roomGroup)}` : ''}`
      : '/api/booking-config';

    fetch(endpoint)
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
            statusUpcomingColor: data.statusUpcomingColor || '#f59e0b',
            statusNotFoundColor: data.statusNotFoundColor || '#6b7280'
          }
        });
        // Apply all colors as CSS custom properties
        document.documentElement.style.setProperty('--booking-button-color', data.bookingButtonColor || '#334155');
        document.documentElement.style.setProperty('--status-available-color', data.statusAvailableColor || '#22c55e');
        document.documentElement.style.setProperty('--status-busy-color', data.statusBusyColor || '#ef4444');
        document.documentElement.style.setProperty('--status-upcoming-color', data.statusUpcomingColor || '#f59e0b');
        document.documentElement.style.setProperty('--status-not-found-color', data.statusNotFoundColor || '#6b7280');
      })
      .catch(err => {
        console.error('Error fetching colors config:', err);
      });
  }

  fetchCheckInStatus = (room) => {
    if (!room || !Array.isArray(room.Appointments) || room.Appointments.length === 0) {
      this.setState({
        checkInStatus: {
          required: false,
          checkedIn: false,
          expired: false,
          tooEarly: false,
          canCheckInNow: false,
          loading: false,
          earlyCheckInMinutes: 5,
          windowMinutes: 10
        }
      });
      return;
    }

    const currentAppointment = room.Appointments[0];
    const query = new URLSearchParams({
      roomEmail: room.Email || '',
      appointmentId: currentAppointment.Id || '',
      organizer: currentAppointment.Organizer || '',
      roomName: room.Name || '',
      startTimestamp: String(currentAppointment.Start || '')
    }).toString();

    this.setState((prevState) => ({
      checkInStatus: {
        ...prevState.checkInStatus,
        loading: true
      }
    }));

    fetch(`/api/check-in-status?${query}`)
      .then((response) => response.json())
      .then((status) => {
        this.setState({
          checkInStatus: {
            required: !!status.required,
            checkedIn: !!status.checkedIn,
            expired: !!status.expired,
            tooEarly: !!status.tooEarly,
            canCheckInNow: !!status.canCheckInNow,
            loading: false,
            earlyCheckInMinutes: Number.isFinite(status.earlyCheckInMinutes) ? status.earlyCheckInMinutes : 5,
            windowMinutes: Number.isFinite(status.windowMinutes) ? status.windowMinutes : 10
          }
        });
      })
      .catch((err) => {
        console.error('Error loading check-in status:', err);
        this.setState((prevState) => ({
          checkInStatus: {
            ...prevState.checkInStatus,
            loading: false
          }
        }));
      });
  }

  handleCheckIn = () => {
    const { room } = this.state;
    const currentAppointment = room?.Appointments?.[0];

    if (!room || !currentAppointment || !currentAppointment.Id) {
      return;
    }

    fetch('/api/check-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roomEmail: room.Email,
        appointmentId: currentAppointment.Id,
        organizer: currentAppointment.Organizer || '',
        roomName: room.Name || '',
        startTimestamp: currentAppointment.Start
      })
    })
      .then((response) => response.json().then((data) => ({ ok: response.ok, status: response.status, data })))
      .then(({ ok, data }) => {
        if (!ok || !data?.success) {
          throw new Error(data?.message || data?.error || 'Check-in failed');
        }

        this.fetchCheckInStatus(room);
      })
      .catch((err) => {
        this.setState({
          showErrorModal: true,
          errorMessage: err.message || 'Check-in failed'
        });
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

  isExtendBlockedByOverbooking = () => {
    const { room } = this.state;

    if (!room || !room.Busy || !Array.isArray(room.Appointments) || room.Appointments.length < 2) {
      return false;
    }

    const currentAppointmentEnd = Number(room.Appointments[0]?.End);
    const nextAppointmentStart = Number(room.Appointments[1]?.Start);

    if (!Number.isFinite(currentAppointmentEnd) || !Number.isFinite(nextAppointmentStart)) {
      return false;
    }

    const minimumExtendWindowMs = 5 * 60 * 1000;
    return (nextAppointmentStart - currentAppointmentEnd) < minimumExtendWindowMs;
  }

  render() {
    const { response, room, roomDetails, sidebarConfig, bookingConfig, showBookingModal, showExtendModal, showErrorModal, errorMessage, maintenanceConfig, checkInStatus } = this.state;
    const forceDarkModeFromLegacyRoute = typeof window !== 'undefined' && window.location.pathname.includes('/room-minimal/');
    const isDarkModeActive = forceDarkModeFromLegacyRoute || !!sidebarConfig.singleRoomDarkMode;
    const canExtendMeeting = this.isExtendMeetingAllowed();
    const extendBlockedByOverbooking = canExtendMeeting && this.isExtendBlockedByOverbooking();
    const displayTranslations = getSingleRoomDisplayTranslations();
    
    console.log('Render - showErrorModal:', showErrorModal, 'errorMessage:', errorMessage);
    
    const bookButtonText = displayTranslations.bookButtonText;
    const extendButtonText = displayTranslations.extendButtonText;
    const checkInButtonText = 'Check-in';
    const extendDisabledTitle = displayTranslations.extendDisabledTitle;
    const errorText = displayTranslations.errorTitle;
    const maintenanceCopy = getMaintenanceCopy();
    const maintenanceTitle = maintenanceCopy.title;
    const maintenanceMessage = maintenanceConfig.message || maintenanceCopy.body;

    if (maintenanceConfig.enabled) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <div>
            <h1>{maintenanceTitle}</h1>
            <p>{maintenanceMessage}</p>
          </div>
        </div>
      );
    }

    return (
      <div style={{ position: 'relative' }}>
        {/* Socket.IO connection for real-time updates */}
        <Socket response={this.handleSocket} />

        {response ? (
          <div className={`single-room-layout ${isDarkModeActive ? 'single-room-layout--dark' : ''}`} style={{ display: 'flex', height: '100vh' }}>
            <RoomStatusBlock 
              room={room} 
              details={roomDetails} 
              config={displayTranslations} 
              sidebarConfig={sidebarConfig}
            />
            <Sidebar 
              room={room} 
              displayAlias={this.state.roomAlias}
              forceDarkMode={isDarkModeActive}
              details={roomDetails} 
              config={displayTranslations}
              bookingConfig={bookingConfig}
              onBookRoom={() => this.setState({ showBookingModal: true })}
              onExtendMeeting={canExtendMeeting && !extendBlockedByOverbooking ? () => this.setState({ showExtendModal: true }) : null}
              onExtendMeetingDisabled={extendBlockedByOverbooking}
              onCheckIn={checkInStatus.canCheckInNow ? this.handleCheckIn : null}
              checkInRequired={checkInStatus.required}
              checkInCompleted={checkInStatus.checkedIn}
              checkInExpired={checkInStatus.expired}
              checkInTooEarly={checkInStatus.tooEarly}
              checkInEarlyMinutes={checkInStatus.earlyCheckInMinutes}
              bookButtonText={bookButtonText}
              extendButtonText={extendButtonText}
              checkInButtonText={checkInButtonText}
              extendDisabledTitle={extendDisabledTitle}
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
                  {errorMessage || displayTranslations.errorOccurred}
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
