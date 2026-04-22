/**
* @file Display.jsx
* @description Single-room display component. Shows real-time meeting status,
*              current and upcoming appointments, booking controls, and check-in
*              functionality for a specific room. Connects to Socket.IO for
*              live updates and fetches room data via /api/rooms/:alias.
*
* Business logic extracted to ./display-logic.js
* Data fetching extracted to ./display-service.js
*/
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';

import RoomStatusBlock from './RoomStatusBlock';
import Sidebar from './Sidebar';
import Spinner from '../global/Spinner.jsx';
import BookingModal from '../booking/BookingModal.jsx';
import ExtendMeetingModal from '../booking/ExtendMeetingModal.jsx';
import { applyI18nConfig, getMaintenanceCopy, loadMaintenanceMessages } from '../../config/maintenance-messages.js';
import { getSingleRoomDisplayTranslations, getMeetingActionModalTranslations, getCheckInTranslations } from '../../config/display-translations.js';
import { getDisplayClientId } from '../../utils/display-client-id.js';
import { initPowerManagement } from '../../utils/power-management.js';
import { getDeviceTypeString } from '../../utils/device-detection.js';
import { fetchMaintenanceStatus as fetchMaintenanceStatusUtil, setupHeartbeat, createMaintenanceHandler } from '../shared/display-utils.js';
import { applyAutoReload, stopAutoReload } from '../../utils/auto-reload.js';

import { getInitialState, processRoomDetails, normalizeSidebarConfig, normalizeBookingConfig, normalizeColorsConfig, applyColorsToCSS, resolveBookingButtonColor, contrastTextColor, normalizeCheckInStatus, getEmptyCheckInStatus, isExtendMeetingAllowed, isExtendBlockedByOverbooking } from './display-logic.js';
import { fetchRoomData, fetchSidebarConfig as fetchSidebarConfigAPI, fetchBookingConfig as fetchBookingConfigAPI, fetchColorsConfig as fetchColorsConfigAPI, fetchCheckInStatus as fetchCheckInStatusAPI, performCheckIn, performExtendMeeting } from './display-service.js';

/**
* Display component for single room view
* Shows detailed status and meeting information for a specific room
* Updates in real-time via Socket.IO
*/
class Display extends Component {
  /**
  * Error boundary - show error state instead of crashing
  */
  componentDidCatch(error, info) {
    console.error('Display component error:', error, info);
    this.setState({
      showErrorModal: true,
      errorMessage: 'A display error occurred. The page will recover automatically.'
    });
    setTimeout(() => { window.location.reload(); }, 10000);
  }

  constructor(props) {
    super(props);
    this.state = getInitialState(this.props.alias);
    this.displayClientId = getDisplayClientId();
    this.socket = null;
  }

  /**
  * Fetch single room data from API
  */
  getRoomsData = () => {
    const alias = this.state.roomAlias;
    if (!alias) return Promise.resolve();

    return fetchRoomData(alias)
      .then((room) => {
        if (!room) return;
        if (room.NotFound) {
          this.setState({ response: true, room });
          return;
        }
        this.setState({ rooms: [room], room }, () => this.processRoomDetails());
      })
      .catch((err) => {
        console.error('Error fetching room data:', err);
        this.setState({ response: true, room: { Name: '', Appointments: [] } });
      });
  }

  /**
  * Process room details and determine display state
  */
  processRoomDetails = () => {
    const { rooms, roomAlias } = this.state;
    const displayTranslations = getSingleRoomDisplayTranslations();
    const result = processRoomDetails(rooms, roomAlias, displayTranslations);

    if (result.room.NotFound) {
      this.setState({ response: true, room: result.room });
      return;
    }

    this.setState({
      response: true,
      room: result.room,
      roomDetails: result.roomDetails
    }, () => {
      this.fetchBookingConfig(result.room.Email, result.room.RoomlistAlias);
      this.fetchCheckInStatus(result.room);
    });
  }

  componentDidMount() {
    this.getRoomsData();
    this.fetchMaintenanceStatus();
    loadMaintenanceMessages().then(() => {
      this.setState({ i18nTick: Date.now() });
    });
    this.fetchSidebarConfig();
    this.fetchBookingConfig();
    // Colors are fetched after sidebar config to ensure dark mode state is known
    this.setupSocket();
    this.heartbeatInterval = setupHeartbeat(this.socket);
  }

  componentWillUnmount() {
    if (this.socket) this.socket.disconnect();
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this._disconnectReloadTimer) clearTimeout(this._disconnectReloadTimer);
    stopAutoReload();
  }

  setupSocket = () => {
    this.socket = io({
      transports: ['websocket', 'polling'],  // fallback to polling if websocket drops
      upgrade: true,                          // upgrade polling to websocket when possible
      reconnection: true,
      reconnectionAttempts: Infinity,         // never stop trying on kiosk displays
      reconnectionDelay: 1000,               // start with 1s
      reconnectionDelayMax: 30000,           // cap at 30s
      timeout: 45000,                        // connection timeout
      query: {
        displayClientId: this.displayClientId,
        displayType: getDeviceTypeString('single-room'),
        roomAlias: this.state.roomAlias || ''
      }
    });
    if (!this.socket || !this.socket.on) return;

    this.socket.on('connect', () => {
      console.log('[Display] Socket connected');

      // If we were disconnected, refresh all data
      if (this._wasDisconnected) {
        console.log('[Display] Reconnected — refreshing data');
        this._wasDisconnected = false;
        this.getRoomsData();
        this.fetchSidebarConfig();
        this.fetchBookingConfig();
      }

      this.socket.emit('request-identifier', (serverIdentifier) => {
        if (serverIdentifier) {
          console.log('[Display] Server-assigned identifier:', serverIdentifier);
          this.serverIdentifier = serverIdentifier;
          initPowerManagement(serverIdentifier);
        } else {
          console.log('[Display] Using client-side identifier for power management');
          initPowerManagement(this.displayClientId);
        }
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Display] Socket disconnected:', reason);
      this._wasDisconnected = true;
      this._disconnectedAt = Date.now();

      // If disconnected for more than 2 minutes, force a full page reload
      // This handles cases where the browser is too sluggish to reconnect properly
      this._disconnectReloadTimer = setTimeout(() => {
        console.log('[Display] Disconnected for 2 minutes — reloading page');
        window.location.reload();
      }, 2 * 60 * 1000);
    });

    this.socket.on('reconnect', () => {
      // Clear the reload timer since we reconnected successfully
      if (this._disconnectReloadTimer) {
        clearTimeout(this._disconnectReloadTimer);
        this._disconnectReloadTimer = null;
      }
    });

    this.socket.on('sidebarConfigUpdated', () => {
      // Re-fetch client-specific config instead of using the broadcast
      // (broadcast contains global config without client overrides)
      this.fetchSidebarConfig();
    });

    this.socket.on('maintenanceConfigUpdated', createMaintenanceHandler(this));

    this.socket.on('i18nConfigUpdated', (i18nConfig) => {
      applyI18nConfig(i18nConfig);
      this.setState({ i18nTick: Date.now() });
    });

    this.socket.on('power-management-update', (data) => {
      const targetId = this.serverIdentifier || this.displayClientId;
      console.log('[Display] Power management update received:', {
        eventClientId: data.clientId, myServerIdentifier: this.serverIdentifier,
        myDisplayClientId: this.displayClientId, targetId, matches: data.clientId === targetId
      });
      if (data.clientId === targetId) {
        console.log('[Display] Power management config updated via Socket.IO:', data.config);
        const pm = initPowerManagement(targetId);
        if (pm) { pm.destroy(); pm.initialized = false; pm.init(); }
      }
    });

    this.socket.on('power-management-global-update', (data) => {
      console.log('[Display] Global power management update received:', data.config);
      const targetId = this.serverIdentifier || this.displayClientId;
      const pm = initPowerManagement(targetId);
      if (pm) { pm.destroy(); pm.initialized = false; pm.init(); }
    });

    this.socket.on('bookingConfigUpdated', (config) => {
      console.log('Booking config updated via Socket.IO:', config);
      const normalized = normalizeBookingConfig(config);
      this.setState({ bookingConfig: normalized });
      const isDark = !!this.state.sidebarConfig.singleRoomDarkMode || (typeof window !== 'undefined' && window.location.pathname.includes('/room-minimal/'));
      const btnColor = resolveBookingButtonColor(normalized.buttonColor, isDark);
      document.documentElement.style.setProperty('--booking-button-color', btnColor);
      document.documentElement.style.setProperty('--booking-button-text', contrastTextColor(btnColor));
    });

    this.socket.on('colorsConfigUpdated', (config) => {
      console.log('Colors config updated via Socket.IO:', config);
      const normalized = normalizeColorsConfig(config);
      this.setState({ colorsConfig: normalized });
      const isDark = !!this.state.sidebarConfig.singleRoomDarkMode || (typeof window !== 'undefined' && window.location.pathname.includes('/room-minimal/'));
      applyColorsToCSS(normalized, isDark);
    });

    this.socket.on('updatedRoom', (room) => {
      if (room && room.RoomAlias === this.state.roomAlias) {
        this.setState({ rooms: [room], room }, () => this.processRoomDetails());
      }
    });

    this.socket.on('updatedRooms', (rooms) => {
      if (Array.isArray(rooms)) {
        const room = rooms.find(r => r.RoomAlias === this.state.roomAlias);
        if (room) {
          this.setState({ rooms: [room], room }, () => this.processRoomDetails());
        }
      }
    });
  }

  fetchSidebarConfig = () => {
    fetchSidebarConfigAPI(this.displayClientId)
      .then(data => {
        const config = normalizeSidebarConfig(data);
        this.setState({ sidebarConfig: config }, () => {
          applyAutoReload(config);
          const isDark = !!config.singleRoomDarkMode || (typeof window !== 'undefined' && window.location.pathname.includes('/room-minimal/'));
          // On initial load, fetch colors; on subsequent updates, just re-apply
          if (this._colorsLoaded) {
            applyColorsToCSS(this.state.colorsConfig, isDark);
          } else {
            this._colorsLoaded = true;
            this.fetchColorsConfig();
          }
        });
      })
      .catch(err => { console.error('Error fetching sidebar config:', err); });
  }

  fetchMaintenanceStatus = () => {
    fetchMaintenanceStatusUtil(this);
  }

  fetchBookingConfig = (roomEmail, roomGroup) => {
    fetchBookingConfigAPI(roomEmail, roomGroup)
      .then(data => {
        const normalized = normalizeBookingConfig(data);
        this.setState({ bookingConfig: normalized });
        const isDark = !!this.state.sidebarConfig.singleRoomDarkMode || (typeof window !== 'undefined' && window.location.pathname.includes('/room-minimal/'));
        const btnColor = resolveBookingButtonColor(normalized.buttonColor, isDark);
        document.documentElement.style.setProperty('--booking-button-color', btnColor);
        document.documentElement.style.setProperty('--booking-button-text', contrastTextColor(btnColor));
      })
      .catch(err => { console.error('Error fetching booking config:', err); });
  }

  fetchColorsConfig = () => {
    fetchColorsConfigAPI()
      .then(data => {
        const normalized = normalizeColorsConfig(data);
        this.setState({ colorsConfig: normalized });
        const isDark = !!this.state.sidebarConfig.singleRoomDarkMode || (typeof window !== 'undefined' && window.location.pathname.includes('/room-minimal/'));
        applyColorsToCSS(normalized, isDark);
      })
      .catch(err => { console.error('Error fetching colors config:', err); });
  }

  fetchCheckInStatus = (room) => {
    if (!room || !Array.isArray(room.Appointments) || room.Appointments.length === 0) {
      this.setState({ checkInStatus: getEmptyCheckInStatus() });
      return;
    }

    this.setState((prevState) => ({
      checkInStatus: { ...prevState.checkInStatus, loading: true }
    }));

    fetchCheckInStatusAPI(room)
      .then((status) => { this.setState({ checkInStatus: normalizeCheckInStatus(status) }); })
      .catch((err) => {
        console.error('Error loading check-in status:', err);
        this.setState((prevState) => ({
          checkInStatus: { ...prevState.checkInStatus, loading: false }
        }));
      });
  }

  handleCheckIn = () => {
    const { room } = this.state;
    const currentAppointment = room?.Appointments?.[0];
    if (!room || !currentAppointment || !currentAppointment.Id) return;

    performCheckIn({
      roomEmail: room.Email,
      appointmentId: currentAppointment.Id,
      organizer: currentAppointment.Organizer || '',
      roomName: room.Name || '',
      startTimestamp: currentAppointment.Start
    })
      .then(({ ok, status, data }) => {
        if (!ok || !data?.success) {
          const mt = getMeetingActionModalTranslations();
          const ct = getCheckInTranslations();
          if (status === 403) {
            if (data?.error === 'ip_not_whitelisted') throw new Error(mt.ipNotWhitelistedError);
            if (data?.error === 'origin_not_allowed') throw new Error(mt.originNotAllowedError);
          }
          throw new Error(data?.message || data?.error || ct.checkInFailed);
        }
        this.fetchCheckInStatus(room);
      })
      .catch((err) => {
        const ct = getCheckInTranslations();
        this.setState({ showErrorModal: true, errorMessage: err.message || ct.checkInFailed });
      });
  }

  handleExtendMeeting = (minutes) => {
    if (!isExtendMeetingAllowed(this.state.bookingConfig)) {
      console.warn('Extend meeting is disabled for this display');
      return;
    }

    const { room } = this.state;
    if (!room || !room.Appointments || room.Appointments.length === 0 || !room.Busy) {
      console.error('Cannot extend meeting: no active meeting');
      return;
    }

    const currentAppointment = room.Appointments[0];

    performExtendMeeting({
      roomEmail: room.Email,
      appointmentId: currentAppointment.Id,
      minutes
    })
      .then(({ status, data }) => {
        if (status === 200 && data.success) {
          console.log(`Meeting extended by ${minutes} minutes`);
          setTimeout(() => this.getRoomsData(), 1000);
        } else {
          const mt = getMeetingActionModalTranslations();
          if (status === 403) {
            if (data.error === 'ip_not_whitelisted') {
              this.setState({ showErrorModal: true, errorMessage: mt.ipNotWhitelistedError });
              return;
            }
            if (data.error === 'origin_not_allowed') {
              this.setState({ showErrorModal: true, errorMessage: mt.originNotAllowedError });
              return;
            }
          }
          const errorMsg = data.error || data.message || 'Failed to extend meeting';
          console.error('Failed to extend meeting:', errorMsg);
          this.setState({ showErrorModal: true, errorMessage: errorMsg });
        }
      })
      .catch(err => {
        console.error('Error extending meeting:', err);
        const mt = getMeetingActionModalTranslations();
        this.setState({ showErrorModal: true, errorMessage: mt.genericError });
      });
  }

  // Delegate to pure functions from display-logic.js
  isExtendMeetingAllowed = () => isExtendMeetingAllowed(this.state.bookingConfig);
  isExtendBlockedByOverbooking = () => isExtendBlockedByOverbooking(this.state.room);

  render() {
    const { response, room, roomDetails, sidebarConfig, bookingConfig, showBookingModal, showExtendModal, showErrorModal, errorMessage, maintenanceConfig, checkInStatus } = this.state;
    const forceDarkModeFromLegacyRoute = typeof window !== 'undefined' && window.location.pathname.includes('/room-minimal/');
    const isDarkModeActive = forceDarkModeFromLegacyRoute || !!sidebarConfig.singleRoomDarkMode;
    const canExtendMeeting = this.isExtendMeetingAllowed();
    const extendBlockedByOverbooking = canExtendMeeting && this.isExtendBlockedByOverbooking();
    const displayTranslations = getSingleRoomDisplayTranslations();
    
    const bookButtonText = displayTranslations.bookButtonText;
    const extendButtonText = displayTranslations.extendButtonText;
    const checkInTexts = getCheckInTranslations();
    const checkInButtonText = checkInTexts.checkInButton;
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

    const isModalOpen = showBookingModal || showExtendModal || showErrorModal;

    return (
      <div style={{ position: 'relative' }}>

        {response ? (
          <div className={`single-room-layout ${isDarkModeActive ? 'single-room-layout--dark' : ''}`} style={{ display: 'flex', height: '100vh', visibility: isModalOpen ? 'hidden' : 'visible' }}>
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
              socket={this.socket}
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
              checkInExpiredTitle={checkInTexts.checkInExpiredTitle}
              checkInTooEarlyTitle={checkInTexts.checkInTooEarlyTitle}
              extendDisabledTitle={extendDisabledTitle}
            />
          </div>
        ) : (
          <Spinner />
        )}
        
        {showBookingModal && bookingConfig.enableBooking && (
          <BookingModal
            room={room}
            theme={isDarkModeActive ? 'dark' : 'light'}
            onClose={() => this.setState({ showBookingModal: false })}
            onSuccess={() => { this.getRoomsData(); }}
          />
        )}

        {showExtendModal && canExtendMeeting && (
          <ExtendMeetingModal
            room={room}
            theme={isDarkModeActive ? 'dark' : 'light'}
            onClose={() => this.setState({ showExtendModal: false })}
            onSuccess={() => { this.getRoomsData(); }}
          />
        )}
        
        {showErrorModal && (
          <div 
            className={`booking-modal-overlay ${isDarkModeActive ? 'minimal-display' : ''}`}
            onClick={() => this.setState({ showErrorModal: false })}
          >
            <div 
              className={`booking-modal ${isDarkModeActive ? 'minimal-display' : ''}`}
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
