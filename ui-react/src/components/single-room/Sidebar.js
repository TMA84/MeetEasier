import React, { Component } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';

import Clock from './Clock';
import { uses12HourFormat } from '../../utils/timeFormat';

/**
 * Sidebar component for single room display
 * Shows logo, clock, upcoming meetings, and WiFi information
 * Supports real-time updates via Socket.IO for all configurations
 */
class Sidebar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      wifiConfig: {
        ssid: 'Loading...',
        password: ''
      },
      logoUrl: '../img/logo.B.png',
      sidebarConfig: {
        showWiFi: true,
        showUpcomingMeetings: false,
        showMeetingTitles: false
      }
    };
    this.socket = null;
  }

  componentDidMount() {
    this.fetchWiFiConfig();
    this.fetchLogoConfig();
    this.fetchSidebarConfig();
    
    // Connect to Socket.IO for real-time updates
    this.socket = io();
    
    // Listen for WiFi config updates
    this.socket.on('wifiConfigUpdated', (config) => {
      console.log('WiFi config updated via Socket.IO:', config);
      this.setState({ wifiConfig: config });
      // Force QR code image reload
      const qrImage = document.querySelector('.wifi-qr img');
      if (qrImage) {
        qrImage.src = `../img/wifi-qr.png?t=${Date.now()}`;
      }
    });
    
    // Listen for Logo config updates
    this.socket.on('logoConfigUpdated', (config) => {
      console.log('Logo config updated via Socket.IO:', config);
      this.setState({ logoUrl: config.logoDarkUrl });
    });
    
    // Listen for Sidebar config updates
    this.socket.on('sidebarConfigUpdated', (config) => {
      console.log('Sidebar config updated via Socket.IO:', config);
      this.setState({ sidebarConfig: config });
    });
    
    // Refresh configs every 5 minutes as backup
    this.wifiInterval = setInterval(() => {
      this.fetchWiFiConfig();
      this.fetchLogoConfig();
      this.fetchSidebarConfig();
    }, 300000);
  }

  componentWillUnmount() {
    // Clean up interval and socket connection
    if (this.wifiInterval) {
      clearInterval(this.wifiInterval);
    }
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * Fetch WiFi configuration from API
   * Gets SSID and password for display and QR code
   */
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

  /**
   * Fetch logo configuration from API
   * Uses logoDarkUrl for single room (light background)
   */
  fetchLogoConfig = () => {
    fetch('/api/logo')
      .then(response => response.json())
      .then(data => {
        this.setState({ logoUrl: data.logoDarkUrl || '../img/logo.B.png' });
      })
      .catch(err => {
        console.error('Error fetching logo config:', err);
      });
  }

  /**
   * Fetch sidebar configuration from API
   * Gets settings for WiFi, upcoming meetings, and meeting titles display
   */
  fetchSidebarConfig = () => {
    fetch('/api/sidebar')
      .then(response => response.json())
      .then(data => {
        this.setState({ 
          sidebarConfig: {
            showWiFi: data.showWiFi !== undefined ? data.showWiFi : true,
            showUpcomingMeetings: data.showUpcomingMeetings !== undefined ? data.showUpcomingMeetings : false,
            showMeetingTitles: data.showMeetingTitles !== undefined ? data.showMeetingTitles : false
          }
        });
      })
      .catch(err => {
        console.error('Error fetching sidebar config:', err);
      });
  }

  render() {
    const { config, room } = this.props;
    const { wifiConfig, logoUrl, sidebarConfig } = this.state;

    // Get upcoming appointments (skip the current one if room is busy)
    const upcomingAppointments = room && room.Appointments ? 
      (room.Busy ? room.Appointments.slice(1, 4) : room.Appointments.slice(0, 3)) : [];

    return (
      <div className="modern-room-sidebar">
        
        {/* Logo and Clock Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img 
              src={logoUrl} 
              alt="Logo" 
              onError={(e) => { e.target.src = '../img/logo.B.png'; }} 
            />
          </div>
          
          <div className="sidebar-clock">
            <Clock />
          </div>
        </div>
        
        {/* Upcoming Meetings Section */}
        {sidebarConfig.showUpcomingMeetings && (
          <div className="sidebar-upcoming">
            <div className="upcoming-title">
              {config && config.upcomingMeetingsTitle ? config.upcomingMeetingsTitle : 'Upcoming Meetings'}
            </div>
            <div className="upcoming-list">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appointment, index) => {
                  // Format timestamps to human-readable time
                  let timeDisplay = 'Time not available';
                  if (appointment.Start && appointment.End) {
                    try {
                      const hour12 = uses12HourFormat();
                      const startTime = new Date(parseInt(appointment.Start, 10)).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: hour12
                      });
                      const endTime = new Date(parseInt(appointment.End, 10)).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: hour12
                      });
                      timeDisplay = `${startTime} - ${endTime}`;
                    } catch (err) {
                      console.error('Error formatting time:', err);
                    }
                  }
                  
                  // Get subject with translation for private meetings
                  const subject = appointment.Private 
                    ? (config && config.privateMeeting ? config.privateMeeting : 'Private')
                    : (appointment.Subject || 'No Subject');
                  
                  return (
                    <div key={index} className="upcoming-item">
                      {/* Meeting subject (optional based on config) */}
                      {sidebarConfig.showMeetingTitles && (
                        <div className="upcoming-subject">
                          {subject}
                        </div>
                      )}
                      
                      {/* Organizer and time row */}
                      <div className="upcoming-row">
                        <div className="upcoming-organizer">
                          {appointment.Organizer || 'No Organizer'}
                        </div>
                        <div className="upcoming-time">
                          {timeDisplay}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Empty state
                <div className="upcoming-empty">
                  {config && config.noUpcomingMeetings ? config.noUpcomingMeetings : 'No upcoming meetings'}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Spacer to push WiFi to bottom when upcoming meetings are hidden */}
        {!sidebarConfig.showUpcomingMeetings && <div className="sidebar-spacer"></div>}
        
        {/* Bottom section - WiFi and Booking button grouped together */}
        <div className="sidebar-bottom">
          {/* WiFi Section */}
          {sidebarConfig.showWiFi && wifiConfig && wifiConfig.ssid && (
            <div className="sidebar-wifi">
              <div className="wifi-title">
                WiFi
              </div>
              <div className="wifi-qr">
                <img 
                  src={`../img/wifi-qr.png?t=${Date.now()}`} 
                  alt="WiFi QR Code"
                />
              </div>
              <div className="wifi-info">
                <div className="wifi-ssid">{wifiConfig.ssid}</div>
                {wifiConfig.password && (
                  <div className="wifi-password">{wifiConfig.password}</div>
                )}
              </div>
            </div>
          )}
          
          {/* Action Button - Extend when busy, Book when available */}
          {room && room.Busy && this.props.onExtendMeeting ? (
            <div className="sidebar-booking">
              <button className="sidebar-book-btn" onClick={this.props.onExtendMeeting}>
                {this.props.extendButtonText || 'Extend Meeting'}
              </button>
            </div>
          ) : room && !room.Busy && this.props.bookingConfig && this.props.bookingConfig.enableBooking && this.props.onBookRoom ? (
            <div className="sidebar-booking">
              <button className="sidebar-book-btn" onClick={this.props.onBookRoom}>
                {this.props.bookButtonText || 'Book This Room'}
              </button>
            </div>
          ) : (
            <div className="sidebar-booking sidebar-booking--hidden">
              <button className="sidebar-book-btn" disabled style={{ visibility: 'hidden' }}>
                Placeholder
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}

Sidebar.propTypes = {
  room: PropTypes.shape({
    Busy: PropTypes.bool,
    Appointments: PropTypes.arrayOf(PropTypes.shape({
      Subject: PropTypes.string,
      Organizer: PropTypes.string,
      Start: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      End: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      Private: PropTypes.bool
    }))
  }),
  details: PropTypes.object,
  config: PropTypes.object,
  bookingConfig: PropTypes.shape({
    enableBooking: PropTypes.bool
  }),
  onBookRoom: PropTypes.func,
  bookButtonText: PropTypes.string,
  onExtendMeeting: PropTypes.func,
  extendButtonText: PropTypes.string
};

Sidebar.defaultProps = {
  room: {
    Busy: false,
    Appointments: []
  },
  details: {},
  config: {}
};

export default Sidebar;
