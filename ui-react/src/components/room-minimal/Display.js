import React, { Component } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';
import { formatTimeRange } from '../../utils/timeFormat.js';

import Socket from '../global/Socket';
import Spinner from '../global/Spinner';
import BookingModal from '../booking/BookingModal';
import ExtendMeetingModal from '../booking/ExtendMeetingModal';
import { applyI18nConfig, getMaintenanceCopy, loadMaintenanceMessages } from '../../config/maintenanceMessages.js';
import { getSingleRoomDisplayTranslations } from '../../config/displayTranslations.js';

/**
 * Helper function to convert hex color to RGBA
 * @param {string} hex - Hex color value (e.g., '#22c55e')
 * @param {number} alpha - Alpha/opacity value (0-1)
 * @returns {string} RGBA string (e.g., 'rgba(34, 197, 94, 0.6)')
 */
const hexToRgba = (hex, alpha = 1) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Apply custom color styles to CSS for room-minimal display
 * Creates CSS rules that override the default hardcoded colors with configured colors
 */
const applyColorsToCSS = (colors) => {
  const styleId = 'room-minimal-colors-style';
  let styleElement = document.getElementById(styleId);
  
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }
  
  const availColor = colors.statusAvailableColor || '#22c55e';
  const busyColor = colors.statusBusyColor || '#ef4444';
  const upcomColor = colors.statusUpcomingColor || '#f59e0b';
  const notFoundColor = colors.statusNotFoundColor || '#6b7280';
  
  const css = `
    .room-minimal--available::before {
      background: radial-gradient(circle, ${hexToRgba(availColor, 0.4)} 0%, transparent 70%) !important;
    }
    .room-minimal--busy::before {
      background: radial-gradient(circle, ${hexToRgba(busyColor, 0.4)} 0%, transparent 70%) !important;
    }
    .room-minimal--upcoming::before {
      background: radial-gradient(circle, ${hexToRgba(upcomColor, 0.4)} 0%, transparent 70%) !important;
    }
    .room-minimal--not-found::before {
      background: transparent !important;
      opacity: 0 !important;
    }
    .room-minimal--available .minimal-glow-container {
      box-shadow: inset 0 0 100px ${hexToRgba(availColor, 0.3)} !important;
    }
    .room-minimal--busy .minimal-glow-container {
      box-shadow: inset 0 0 100px ${hexToRgba(busyColor, 0.3)} !important;
    }
    .room-minimal--upcoming .minimal-glow-container {
      box-shadow: inset 0 0 100px ${hexToRgba(upcomColor, 0.3)} !important;
    }
    .room-minimal--not-found .minimal-glow-container {
      box-shadow: none !important;
    }
    .room-minimal--available .minimal-room-header--filled {
      background: ${availColor} !important;
      border-color: ${hexToRgba(availColor, 0.1)} !important;
      box-shadow: 
        0 0 40px ${hexToRgba(availColor, 0.5)},
        0 0 80px ${hexToRgba(availColor, 0.3)},
        0 0 120px ${hexToRgba(availColor, 0.2)},
        inset 0 0 10px ${hexToRgba(availColor, 0.2)} !important;
    }
    .room-minimal--busy .minimal-room-header--filled {
      background: ${busyColor} !important;
      border-color: ${hexToRgba(busyColor, 0.1)} !important;
      box-shadow: 
        0 0 40px ${hexToRgba(busyColor, 0.5)},
        0 0 80px ${hexToRgba(busyColor, 0.3)},
        0 0 120px ${hexToRgba(busyColor, 0.2)},
        inset 0 0 10px ${hexToRgba(busyColor, 0.2)} !important;
    }
    .room-minimal--upcoming .minimal-room-header--filled {
      background: ${upcomColor} !important;
      border-color: ${hexToRgba(upcomColor, 0.1)} !important;
      box-shadow: 
        0 0 40px ${hexToRgba(upcomColor, 0.5)},
        0 0 80px ${hexToRgba(upcomColor, 0.3)},
        0 0 120px ${hexToRgba(upcomColor, 0.2)},
        inset 0 0 10px ${hexToRgba(upcomColor, 0.2)} !important;
    }
    .room-minimal--not-found .minimal-room-header--filled {
      background: transparent !important;
      border-color: ${hexToRgba(notFoundColor, 0.35)} !important;
      box-shadow: none !important;
    }
    .room-minimal--available .minimal-room-header--transparent {
      background: transparent !important;
      border-color: ${hexToRgba(availColor, 0.3)} !important;
      box-shadow: 
        0 0 40px ${hexToRgba(availColor, 0.5)},
        0 0 80px ${hexToRgba(availColor, 0.3)},
        0 0 120px ${hexToRgba(availColor, 0.2)} !important;
    }
    .room-minimal--busy .minimal-room-header--transparent {
      background: transparent !important;
      border-color: ${hexToRgba(busyColor, 0.3)} !important;
      box-shadow: 
        0 0 40px ${hexToRgba(busyColor, 0.5)},
        0 0 80px ${hexToRgba(busyColor, 0.3)},
        0 0 120px ${hexToRgba(busyColor, 0.2)} !important;
    }
    .room-minimal--upcoming .minimal-room-header--transparent {
      background: transparent !important;
      border-color: ${hexToRgba(upcomColor, 0.3)} !important;
      box-shadow: 
        0 0 40px ${hexToRgba(upcomColor, 0.5)},
        0 0 80px ${hexToRgba(upcomColor, 0.3)},
        0 0 120px ${hexToRgba(upcomColor, 0.2)} !important;
    }
    .room-minimal--not-found .minimal-room-header--transparent {
      background: transparent !important;
      border-color: ${hexToRgba(notFoundColor, 0.3)} !important;
      box-shadow: none !important;
    }
    .room-minimal--available .minimal-room-header--transparent .minimal-room-status {
      color: ${availColor} !important;
    }
    .room-minimal--busy .minimal-room-header--transparent .minimal-room-status {
      color: ${busyColor} !important;
    }
    .room-minimal--upcoming .minimal-room-header--transparent .minimal-room-status {
      color: ${upcomColor} !important;
    }
    .room-minimal--not-found .minimal-room-header--transparent .minimal-room-status {
      color: ${notFoundColor} !important;
    }
    .room-minimal--available .minimal-room-header--filled .minimal-room-status {
      color: #ffffff !important;
    }
    .room-minimal--busy .minimal-room-header--filled .minimal-room-status {
      color: #ffffff !important;
    }
    .room-minimal--upcoming .minimal-room-header--filled .minimal-room-status {
      color: #ffffff !important;
    }
    .room-minimal--not-found .minimal-room-header--filled .minimal-room-status {
      color: #ffffff !important;
    }
  `;
  
  styleElement.textContent = css;
};

class Display extends Component {

  componentDidCatch(error, info) {
    window.location.reload();
  }

  constructor(props) {
    super(props);
    this.state = {
      response: false,
      roomAlias: this.props.alias,
      rooms: [],
      room: [],
      maintenanceConfig: {
        enabled: false,
        message: ''
      },
      i18nTick: 0,
      currentTime: new Date(),
      wifiConfig: null,
      logoConfig: null,
      sidebarConfig: {
        showMeetingTitles: false,
        showWiFi: true,
        showUpcomingMeetings: false,
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
      roomDetails: {
        appointmentExists: false,
        timesPresent: false,
        upcomingAppointments: false,
        nextUp: ''
      },
      checkInStatus: {
        required: false,
        checkedIn: false,
        expired: false,
        loading: false,
        windowMinutes: 10
      },
      showBookingModal: false,
      showExtendModal: false
    };
    this.socket = null;
    this.timeInterval = null;
  }

  getRoomsData = () => {
    return fetch('/api/rooms')
      .then((response) => response.json())
      .then((data) => {
        this.setState({
          rooms: data
        }, () => this.processRoomDetails());
      })
  }

  processRoomDetails = () => {
    const { rooms, roomAlias } = this.state;
    const displayTranslations = getSingleRoomDisplayTranslations();

    let roomArray = rooms.filter(item => item.RoomAlias === roomAlias);
    let room = roomArray[0];

    if (!room) {
      this.setState({
        response: true,
        room: { Name: '', Busy: true, NotFound: true, Appointments: [] }
      });
      return;
    }

    // Process room details like other displays
    if (typeof room.Appointments !== 'undefined' && room.Appointments.length > 0) {
      this.setState(prevState => ({
        roomDetails: {
          ...prevState.roomDetails,
          appointmentExists: true
        }
      }));

      if (room.Appointments.length > 1) {
        this.setState(prevState => ({
          roomDetails: {
            ...prevState.roomDetails,
            upcomingAppointments: true
          }
        }));
      }

      if (room.Appointments[0] && room.Appointments[0].Start && room.Appointments[0].End) {
        this.setState(prevState => ({
          roomDetails: {
            ...prevState.roomDetails,
            timesPresent: true
          }
        }));

        if (!room.Busy) {
          this.setState(prevState => ({
            roomDetails: {
              ...prevState.roomDetails,
              nextUp: `${displayTranslations.nextUp}: `
            }
          }));
        }
      }
    }

    this.setState({
      response: true,
      room: room
    }, () => {
      this.fetchBookingConfig(room.Email, room.RoomlistAlias);
      this.fetchCheckInStatus(room);
    });
  }

  handleSocket = (socketResponse) => {
    this.setState({
      rooms: socketResponse.rooms
    }, () => this.processRoomDetails());
  }

  componentDidMount = () => {
    this.getRoomsData();
    this.fetchMaintenanceStatus();
    loadMaintenanceMessages().then(() => {
      this.setState({ i18nTick: Date.now() });
    });
    this.fetchWiFiConfig();
    this.fetchLogoConfig();
    this.fetchSidebarConfig();
    this.fetchBookingConfig();
    this.fetchColorsConfig();
    
    // Update time every second
    this.timeInterval = setInterval(() => {
      this.setState({ currentTime: new Date() });
    }, 1000);
    
    // Connect to Socket.IO for real-time updates
    this.socket = io();
    
    if (this.socket && this.socket.on) {
      this.socket.on('sidebarConfigUpdated', (config) => {
        this.setState({ 
          sidebarConfig: {
            showMeetingTitles: config.showMeetingTitles !== undefined ? config.showMeetingTitles : false,
            showWiFi: config.showWiFi !== undefined ? config.showWiFi : true,
            showUpcomingMeetings: config.showUpcomingMeetings !== undefined ? config.showUpcomingMeetings : false,
            minimalHeaderStyle: config.minimalHeaderStyle || 'filled'
          }
        });
      });

      this.socket.on('wifiConfigUpdated', (config) => {
        this.setState({ wifiConfig: config });
      });

      this.socket.on('logoConfigUpdated', (config) => {
        this.setState({ logoConfig: config });
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
        const colorsConfig = {
          bookingButtonColor: config.bookingButtonColor || '#334155',
          statusAvailableColor: config.statusAvailableColor || '#22c55e',
          statusBusyColor: config.statusBusyColor || '#ef4444',
          statusUpcomingColor: config.statusUpcomingColor || '#f59e0b',
          statusNotFoundColor: config.statusNotFoundColor || '#6b7280'
        };
        this.setState({ colorsConfig });
        
        // Apply all colors as CSS custom properties
        const availableColor = config.statusAvailableColor || '#22c55e';
        const busyColor = config.statusBusyColor || '#ef4444';
        const upcomingColor = config.statusUpcomingColor || '#f59e0b';
        const notFoundColor = config.statusNotFoundColor || '#6b7280';
        
        document.documentElement.style.setProperty('--booking-button-color', config.bookingButtonColor || '#334155');
        document.documentElement.style.setProperty('--status-available-color', availableColor);
        document.documentElement.style.setProperty('--status-busy-color', busyColor);
        document.documentElement.style.setProperty('--status-upcoming-color', upcomingColor);
        document.documentElement.style.setProperty('--status-not-found-color', notFoundColor);
        
        // Also set short names used in SCSS
        document.documentElement.style.setProperty('--available-color', availableColor);
        document.documentElement.style.setProperty('--busy-color', busyColor);
        document.documentElement.style.setProperty('--upcoming-color', upcomingColor);
        document.documentElement.style.setProperty('--not-found-color', notFoundColor);
        
        // Apply custom colors to CSS rules
        applyColorsToCSS(colorsConfig);
      });
    }
  }

  componentWillUnmount = () => {
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  fetchWiFiConfig = () => {
    fetch('/api/wifi')
      .then(response => response.json())
      .then(data => {
        this.setState({ wifiConfig: data });
      })
      .catch(err => {
        console.error('Error fetching WiFi config:', err);
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

  fetchLogoConfig = () => {
    fetch('/api/logo')
      .then(response => response.json())
      .then(data => {
        this.setState({ logoConfig: data });
      })
      .catch(err => {
        console.error('Error fetching logo config:', err);
      });
  }

  fetchSidebarConfig = () => {
    fetch('/api/sidebar')
      .then(response => response.json())
      .then(data => {
        this.setState({ 
          sidebarConfig: {
            showMeetingTitles: data.showMeetingTitles !== undefined ? data.showMeetingTitles : false,
            showWiFi: data.showWiFi !== undefined ? data.showWiFi : true,
            showUpcomingMeetings: data.showUpcomingMeetings !== undefined ? data.showUpcomingMeetings : false,
            minimalHeaderStyle: data.minimalHeaderStyle || 'filled'
          }
        });
      })
      .catch(err => {
        console.error('Error fetching sidebar config:', err);
      });
  }

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
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
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

  fetchColorsConfig = () => {
    fetch('/api/colors')
      .then(response => response.json())
      .then(data => {
        const colorsConfig = {
          bookingButtonColor: data.bookingButtonColor || '#334155',
          statusAvailableColor: data.statusAvailableColor || '#22c55e',
          statusBusyColor: data.statusBusyColor || '#ef4444',
          statusUpcomingColor: data.statusUpcomingColor || '#f59e0b',
          statusNotFoundColor: data.statusNotFoundColor || '#6b7280'
        };
        this.setState({ colorsConfig });
        
        // Apply all colors as CSS custom properties
        const availableColor = data.statusAvailableColor || '#22c55e';
        const busyColor = data.statusBusyColor || '#ef4444';
        const upcomingColor = data.statusUpcomingColor || '#f59e0b';
        const notFoundColor = data.statusNotFoundColor || '#6b7280';
        
        document.documentElement.style.setProperty('--booking-button-color', data.bookingButtonColor || '#334155');
        document.documentElement.style.setProperty('--status-available-color', availableColor);
        document.documentElement.style.setProperty('--status-busy-color', busyColor);
        document.documentElement.style.setProperty('--status-upcoming-color', upcomingColor);
        document.documentElement.style.setProperty('--status-not-found-color', notFoundColor);
        
        // Also set short names used in SCSS
        document.documentElement.style.setProperty('--available-color', availableColor);
        document.documentElement.style.setProperty('--busy-color', busyColor);
        document.documentElement.style.setProperty('--upcoming-color', upcomingColor);
        document.documentElement.style.setProperty('--not-found-color', notFoundColor);
        
        // Apply custom colors to CSS rules
        applyColorsToCSS(colorsConfig);
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
          this.setState({ 
            showErrorModal: true, 
            errorMessage: errorMsg
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

  getLanguage = () => {
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.split('-')[0];
  }

  render() {
    const { response, room, roomDetails, currentTime, wifiConfig, logoConfig, sidebarConfig, bookingConfig, showBookingModal, showExtendModal, showErrorModal, errorMessage, maintenanceConfig, checkInStatus } = this.state;
    const canExtendMeeting = this.isExtendMeetingAllowed();
    const extendBlockedByOverbooking = canExtendMeeting && this.isExtendBlockedByOverbooking();
    const displayTranslations = getSingleRoomDisplayTranslations();
    const lang = this.getLanguage();
    const extendDisabledTitle = displayTranslations.extendDisabledTitle;
    const errorText = displayTranslations.errorTitle;

    if (maintenanceConfig.enabled) {
      const maintenanceCopy = getMaintenanceCopy();
      const maintenanceTitle = maintenanceCopy.title;
      const maintenanceMessage = maintenanceConfig.message || maintenanceCopy.body;

      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <div>
            <h1>{maintenanceTitle}</h1>
            <p>{maintenanceMessage}</p>
          </div>
        </div>
      );
    }

    if (!response) {
      return <Spinner />;
    }

    const currentTimeObj = new Date();
    let nextAppointmentStartTime = null;
    let minutesDiff = null;

    if(room.Appointments !== null && room.Appointments.length > 0) {
      nextAppointmentStartTime = room.Appointments[0].Start;
      minutesDiff = (nextAppointmentStartTime - currentTimeObj) / 60000;
    }

    // Determine status class
    let statusClass = 'room-minimal';
    if (room.NotFound) {
      statusClass += ' room-minimal--not-found';
    } else if(room.Busy) { 
      statusClass += ' room-minimal--busy';
    } else if (minutesDiff < 15 && minutesDiff > 0 && room.Appointments !== null && (room.Appointments.length > 0)) {
      statusClass += ' room-minimal--upcoming';
    } else {
      statusClass += ' room-minimal--available';
    }

    return (
      <div>
        <Socket response={this.handleSocket}/>
        
        <div className={statusClass}>
          <div className="minimal-glow-container">
            
            {/* Main Content Area */}
            <div className="minimal-main-content">
              
              {/* Room Name and Status */}
              <div className={`minimal-room-header minimal-room-header--${room.NotFound ? 'transparent' : sidebarConfig.minimalHeaderStyle}`}>
                <div className="minimal-room-name">{room.Name}</div>
                <div className="minimal-room-status">
                  {room.NotFound ? (displayTranslations.statusNotFound || 'Not Found') : (room.Busy ? displayTranslations.statusBusy : displayTranslations.statusAvailable)}
                </div>
              </div>

              {/* Meeting Cards Container */}
              <div className="minimal-meetings-container">
                {/* Current/Next Meeting */}
                {roomDetails.appointmentExists && room.Appointments && room.Appointments[0] && (
                  <div className="minimal-meeting-card">
                    <div className="minimal-meeting-label">
                      {room.Busy ? displayTranslations.currentMeeting : (roomDetails.nextUp || displayTranslations.nextUp)}
                    </div>
                    {sidebarConfig.showMeetingTitles && room.Appointments[0].Subject && (
                      <div className="minimal-meeting-subject">
                        {room.Appointments[0].Private 
                          ? (displayTranslations.privateMeeting || 'Private')
                          : room.Appointments[0].Subject}
                      </div>
                    )}
                    {room.Appointments[0].Organizer && (
                      <div className={`minimal-meeting-organizer ${!sidebarConfig.showMeetingTitles ? 'minimal-meeting-organizer--primary' : ''}`}>
                        {room.Appointments[0].Organizer}
                      </div>
                    )}
                    {roomDetails.timesPresent && (
                      <div className="minimal-meeting-time">
                        {formatTimeRange(
                          new Date(parseInt(room.Appointments[0].Start, 10)),
                          new Date(parseInt(room.Appointments[0].End, 10)),
                          true
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Next Meeting (when busy and there's another meeting) */}
                {room.Busy && room.Appointments && room.Appointments.length > 1 && room.Appointments[1] && (
                  <div className="minimal-meeting-card minimal-meeting-card--next">
                    <div className="minimal-meeting-label">
                      {displayTranslations.upcomingTitle}
                    </div>
                    {sidebarConfig.showMeetingTitles && room.Appointments[1].Subject && (
                      <div className="minimal-meeting-subject">
                        {room.Appointments[1].Private 
                          ? (displayTranslations.privateMeeting || 'Private')
                          : room.Appointments[1].Subject}
                      </div>
                    )}
                    {room.Appointments[1].Organizer && (
                      <div className={`minimal-meeting-organizer ${!sidebarConfig.showMeetingTitles ? 'minimal-meeting-organizer--primary' : ''}`}>
                        {room.Appointments[1].Organizer}
                      </div>
                    )}
                    <div className="minimal-meeting-time">
                      {formatTimeRange(
                        new Date(parseInt(room.Appointments[1].Start, 10)),
                        new Date(parseInt(room.Appointments[1].End, 10)),
                        true
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Sidebar with WiFi */}
            <div className="minimal-sidebar">
              
              {/* Logo and Time */}
              <div className="minimal-sidebar-header">
                {logoConfig && logoConfig.logoLightUrl && (
                  <div className="minimal-logo">
                    <img src={logoConfig.logoLightUrl} alt="Logo" onError={(e) => { e.target.src = "/img/logo.W.png"; }} />
                  </div>
                )}
                <div className="minimal-clock">
                  <div className="minimal-time">
                    {currentTime.toLocaleTimeString(navigator.language || 'en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: navigator.language?.startsWith('en-US') || navigator.language?.startsWith('en-CA')
                    })}
                  </div>
                  <div className="minimal-date">
                    {currentTime.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { 
                      weekday: 'long', 
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              </div>

              {/* Upcoming Meetings Section */}
              {sidebarConfig.showUpcomingMeetings && room.Appointments && (
                <div className="minimal-upcoming">
                  <div className="minimal-upcoming-title">
                    {displayTranslations.upcomingMeetingsTitle}
                  </div>
                  <div className="minimal-upcoming-list">
                    {(() => {
                      const upcomingAppointments = room.Busy 
                        ? room.Appointments.slice(1, 4) 
                        : room.Appointments.slice(0, 3);
                      
                      if (upcomingAppointments.length > 0) {
                        return upcomingAppointments.map((appointment, index) => {
                          let timeDisplay = displayTranslations.timeNotAvailable;
                          if (appointment.Start && appointment.End) {
                            try {
                              const startTime = new Date(parseInt(appointment.Start, 10)).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: navigator.language?.startsWith('en-US') || navigator.language?.startsWith('en-CA')
                              });
                              const endTime = new Date(parseInt(appointment.End, 10)).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: navigator.language?.startsWith('en-US') || navigator.language?.startsWith('en-CA')
                              });
                              timeDisplay = `${startTime} - ${endTime}`;
                            } catch (err) {
                              console.error('Error formatting time:', err);
                            }
                          }
                          
                          const subject = appointment.Private 
                            ? (displayTranslations.privateMeeting || 'Private')
                            : (appointment.Subject || displayTranslations.noSubject);
                          
                          return (
                            <div key={index} className="minimal-upcoming-item">
                              {sidebarConfig.showMeetingTitles && (
                                <div className="minimal-upcoming-subject">
                                  {subject}
                                </div>
                              )}
                              <div className="minimal-upcoming-row">
                                <div className="minimal-upcoming-organizer">
                                  {appointment.Organizer || displayTranslations.noOrganizer}
                                </div>
                                <div className="minimal-upcoming-time">
                                  {timeDisplay}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      } else {
                        return (
                          <div className="minimal-upcoming-empty">
                            {displayTranslations.noUpcomingMeetings}
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Spacer when upcoming meetings are not shown */}
              {!sidebarConfig.showUpcomingMeetings && <div className="minimal-sidebar-spacer"></div>}

              {/* Bottom section - WiFi and Booking button grouped together */}
              <div className="minimal-sidebar-bottom">
                {/* WiFi Section */}
                {sidebarConfig.showWiFi && wifiConfig && wifiConfig.ssid && (
                  <div className="minimal-wifi">
                    <div className="minimal-wifi-title">
                      {displayTranslations.wifiTitle}
                    </div>
                    <div className="minimal-qr">
                      <img 
                        src={`/img/wifi-qr.png?t=${Date.now()}`}
                        alt="WiFi QR Code"
                      />
                    </div>
                    <div className="minimal-wifi-info">
                      <div className="minimal-wifi-ssid">{wifiConfig.ssid}</div>
                      {wifiConfig.password && (
                        <div className="minimal-wifi-password">{wifiConfig.password}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Button - Extend when busy, Book when available */}
                {checkInStatus.required && !checkInStatus.checkedIn && !checkInStatus.expired && checkInStatus.canCheckInNow ? (
                  <div className="minimal-sidebar-booking">
                    <button
                      className="minimal-sidebar-book-btn"
                    onClick={this.handleCheckIn}
                    >
                      Check-in
                    </button>
                  </div>
                ) : room.Busy && canExtendMeeting ? (
                  <div className="minimal-sidebar-booking">
                    <button 
                      className="minimal-sidebar-book-btn" 
                      disabled={extendBlockedByOverbooking}
                      title={extendBlockedByOverbooking ? extendDisabledTitle : undefined}
                      onClick={() => this.setState({ showExtendModal: true })}
                    >
                      {displayTranslations.extendButtonText}
                    </button>
                  </div>
                ) : !room.Busy && bookingConfig.enableBooking ? (
                  <div className="minimal-sidebar-booking">
                    <button 
                      className="minimal-sidebar-book-btn" 
                      onClick={() => this.setState({ showBookingModal: true })}
                    >
                      {displayTranslations.bookButtonText}
                    </button>
                  </div>
                ) : (
                  <div className="minimal-sidebar-booking minimal-sidebar-booking--hidden">
                    <button 
                      className="minimal-sidebar-book-btn" 
                      disabled 
                      style={{ visibility: 'hidden' }}
                    >
                      Placeholder
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

        {/* Booking Modal */}
        {showBookingModal && bookingConfig.enableBooking && (
          <BookingModal
            room={room}
            theme="dark"
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
            theme="dark"
            onClose={() => this.setState({ showExtendModal: false })}
            onSuccess={() => {
              this.getRoomsData();
            }}
          />
        )}
        
        {/* Error Modal */}
        {showErrorModal && (
          <div 
            className="booking-modal-overlay minimal-display" 
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
                <p className="error-message">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

Display.propTypes = {
  alias: PropTypes.string
}

export default Display;
