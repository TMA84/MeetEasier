import React from 'react';
import PropTypes from 'prop-types';
import { formatTimeRange } from '../../utils/timeFormat.js';

/**
 * RoomStatusBlock component - Main status display for single room view
 * Shows room availability status and current/upcoming meeting information
 * Displays different colors based on room status (available/busy/upcoming)
 */
const RoomStatusBlock = ({ 
  config, 
  details = {
    appointmentExists: false,
    timesPresent: false,
    upcomingAppointments: false,
    nextUp: '',
    upcomingTitle: ''
  }, 
  room, 
  sidebarConfig = {
    showMeetingTitles: false
  }
}) => {
  const currentTime = new Date();
  let nextAppointmentStartTime = null;
  let minutesDiff = null;

  // Calculate time until next appointment
  if (room.Appointments !== null && room.Appointments.length > 0) {
    nextAppointmentStartTime = room.Appointments[0].Start;
    minutesDiff = (nextAppointmentStartTime - currentTime) / 60000;
  }

  // Determine status class based on room state
  let statusClass = 'modern-room-status';
  if (room.Busy) { 
    statusClass += ' modern-room-status--busy';
  } else if (minutesDiff < 15 && minutesDiff > 0 && room.Appointments !== null && room.Appointments.length > 0) {
    // Show "upcoming" status if meeting starts within 15 minutes
    statusClass += ' modern-room-status--upcoming';
  } else {
    statusClass += ' modern-room-status--available';
  }

  return (
    <div className={statusClass}>
      <div className="status-content">
        {/* Main content area */}
        <div className="status-main">
          {/* Room name and status header */}
          <div className="status-header">
            <div className="room-name">{room.Name}</div>
            <div className="room-status">
              {room.Busy ? config.statusBusy : config.statusAvailable}
            </div>
          </div>

          {/* Meeting cards container */}
          <div className="meetings-container">
            {/* Current/Next meeting card */}
            {details.appointmentExists && (
              <div className="meeting-card">
                <div className="meeting-label">
                  {details.nextUp || config.currentMeeting}
                </div>
                
                {/* Meeting subject (optional based on config) */}
                {sidebarConfig && sidebarConfig.showMeetingTitles && (
                  <div className="meeting-subject">
                    {room.Appointments[0].Private 
                      ? (config.privateMeeting || 'Private')
                      : room.Appointments[0].Subject}
                  </div>
                )}
                
                {/* Meeting organizer */}
                <div className={`meeting-organizer ${!sidebarConfig || !sidebarConfig.showMeetingTitles ? 'meeting-organizer--primary' : ''}`}>
                  {room.Appointments[0].Organizer}
                </div>
                
                {/* Meeting time range */}
                <div className="meeting-time">
                  {formatTimeRange(
                    new Date(parseInt(room.Appointments[0].Start, 10)),
                    new Date(parseInt(room.Appointments[0].End, 10)),
                    true
                  )}
                </div>
                
              </div>
            )}

            {/* Next meeting card (only shown when room is busy and has multiple appointments) */}
            {room.Busy && room.Appointments && room.Appointments.length > 1 && (
              <div className="meeting-card meeting-card--next">
                <div className="meeting-label">
                  {config.upcomingTitle || 'Next Meeting'}
                </div>
                
                {/* Meeting subject (optional based on config) */}
                {sidebarConfig && sidebarConfig.showMeetingTitles && (
                  <div className="meeting-subject">
                    {room.Appointments[1].Private 
                      ? (config.privateMeeting || 'Private')
                      : room.Appointments[1].Subject}
                  </div>
                )}
                
                {/* Meeting organizer */}
                <div className={`meeting-organizer ${!sidebarConfig || !sidebarConfig.showMeetingTitles ? 'meeting-organizer--primary' : ''}`}>
                  {room.Appointments[1].Organizer}
                </div>
                
                {/* Meeting time range */}
                <div className="meeting-time">
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
      </div>
    </div>
  );
};

RoomStatusBlock.propTypes = {
  room: PropTypes.shape({
    Name: PropTypes.string.isRequired,
    Busy: PropTypes.bool.isRequired,
    Appointments: PropTypes.arrayOf(PropTypes.shape({
      Subject: PropTypes.string,
      Organizer: PropTypes.string,
      Start: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      End: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      Private: PropTypes.bool
    }))
  }).isRequired,
  details: PropTypes.shape({
    appointmentExists: PropTypes.bool,
    timesPresent: PropTypes.bool,
    upcomingAppointments: PropTypes.bool,
    nextUp: PropTypes.string,
    upcomingTitle: PropTypes.string
  }),
  config: PropTypes.object.isRequired,
  sidebarConfig: PropTypes.shape({
    showMeetingTitles: PropTypes.bool
  })
};

export default RoomStatusBlock;
