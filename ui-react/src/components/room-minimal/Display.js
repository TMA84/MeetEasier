import React, { Component } from 'react';
import PropTypes from 'prop-types';
import config from '../../config/singleRoom.config.js';
import io from 'socket.io-client';
import { formatTimeRange } from '../../utils/timeFormat.js';

import Socket from '../global/Socket';
import Spinner from '../global/Spinner';
import BookingModal from '../booking/BookingModal';

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
        enableBooking: true
      },
      colorsConfig: {
        bookingButtonColor: '#334155',
        statusAvailableColor: '#22c55e',
        statusBusyColor: '#ef4444',
        statusUpcomingColor: '#f59e0b'
      },
      roomDetails: {
        appointmentExists: false,
        timesPresent: false,
        upcomingAppointments: false,
        nextUp: ''
      },
      showBookingModal: false
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

    let roomArray = rooms.filter(item => item.RoomAlias === roomAlias);
    let room = roomArray[0];

    if (!room) {
      this.setState({
        response: true,
        room: { Name: 'Room not found', Appointments: [] }
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
              nextUp: config.nextUp + ': '
            }
          }));
        }
      }
    }

    this.setState({
      response: true,
      room: room
    });
  }

  handleSocket = (socketResponse) => {
    this.setState({
      rooms: socketResponse.rooms
    }, () => this.processRoomDetails());
  }

  componentDidMount = () => {
    this.getRoomsData();
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

      this.socket.on('bookingConfigUpdated', (config) => {
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

  getLanguage = () => {
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.split('-')[0];
  }

  render() {
    const { response, room, roomDetails, currentTime, wifiConfig, logoConfig, sidebarConfig, bookingConfig, showBookingModal } = this.state;
    const lang = this.getLanguage();

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
    if(room.Busy) { 
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
              <div className={`minimal-room-header minimal-room-header--${sidebarConfig.minimalHeaderStyle}`}>
                <div className="minimal-room-name">{room.Name}</div>
                <div className="minimal-room-status">
                  {room.Busy ? config.statusBusy : config.statusAvailable}
                </div>
              </div>

              {/* Meeting Cards Container */}
              <div className="minimal-meetings-container">
                {/* Current/Next Meeting */}
                {roomDetails.appointmentExists && room.Appointments && room.Appointments[0] && (
                  <div className="minimal-meeting-card">
                    <div className="minimal-meeting-label">
                      {room.Busy ? config.currentMeeting : (roomDetails.nextUp || config.nextUp)}
                    </div>
                    {sidebarConfig.showMeetingTitles && room.Appointments[0].Subject && (
                      <div className="minimal-meeting-subject">
                        {room.Appointments[0].Private 
                          ? (config.privateMeeting || 'Private')
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
                      {config.upcomingTitle || lang === 'de' ? 'Nächster Termin' : 'Next Meeting'}
                    </div>
                    {sidebarConfig.showMeetingTitles && room.Appointments[1].Subject && (
                      <div className="minimal-meeting-subject">
                        {room.Appointments[1].Private 
                          ? (config.privateMeeting || 'Private')
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
                    {lang === 'de' ? 'Anstehende Termine' : 'Upcoming Meetings'}
                  </div>
                  <div className="minimal-upcoming-list">
                    {(() => {
                      const upcomingAppointments = room.Busy 
                        ? room.Appointments.slice(1, 4) 
                        : room.Appointments.slice(0, 3);
                      
                      if (upcomingAppointments.length > 0) {
                        return upcomingAppointments.map((appointment, index) => {
                          let timeDisplay = 'Time not available';
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
                            ? (config.privateMeeting || 'Private')
                            : (appointment.Subject || 'No Subject');
                          
                          return (
                            <div key={index} className="minimal-upcoming-item">
                              {sidebarConfig.showMeetingTitles && (
                                <div className="minimal-upcoming-subject">
                                  {subject}
                                </div>
                              )}
                              <div className="minimal-upcoming-row">
                                <div className="minimal-upcoming-organizer">
                                  {appointment.Organizer || 'No Organizer'}
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
                            {lang === 'de' ? 'Keine anstehenden Termine' : 'No upcoming meetings'}
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
                      {lang === 'de' ? 'WiFi' : 'WiFi'}
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

                {/* Book Room Button - Only show when room is available */}
                {!room.Busy && bookingConfig.enableBooking ? (
                  <div className="minimal-sidebar-booking">
                    <button 
                      className="minimal-sidebar-book-btn" 
                      onClick={() => this.setState({ showBookingModal: true })}
                    >
                      {lang === 'de' ? 'Raum buchen' : 'Book This Room'}
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
      </div>
    );
  }
}

Display.propTypes = {
  alias: PropTypes.string
}

export default Display;
