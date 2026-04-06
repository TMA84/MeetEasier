/** @file RoomStatusBlock.js
*  @description Main status indicator block for the single-room view, showing room availability, current meeting details, and the next upcoming meeting with color-coded status.
*/
import React from 'react';
import PropTypes from 'prop-types';
import { formatTimeRange } from '../../utils/time-format.js';
import { AppointmentShape } from '../shared/prop-types.js';

const MeetingCard = ({ appointment, label, sidebarConfig, config, isNext }) => (
  <div className={`meeting-card${isNext ? ' meeting-card--next' : ''}`}>
    <div className="meeting-label">{label}</div>
    {sidebarConfig && sidebarConfig.showMeetingTitles && (
      <div className="meeting-subject">
        {appointment.Private ? (config.privateMeeting || 'Private') : appointment.Subject}
      </div>
    )}
    <div className={`meeting-organizer ${!sidebarConfig || !sidebarConfig.showMeetingTitles ? 'meeting-organizer--primary' : ''}`}>
      {appointment.Organizer}
    </div>
    <div className="meeting-time">
      {formatTimeRange(new Date(parseInt(appointment.Start, 10)), new Date(parseInt(appointment.End, 10)), true)}
    </div>
  </div>
);

function getStatusClass(room, minutesDiff) {
  if (room.NotFound) return ' modern-room-status--not-found';
  if (room.Busy) return ' modern-room-status--busy';
  if (minutesDiff < 15 && minutesDiff > 0 && room.Appointments !== null && room.Appointments.length > 0) return ' modern-room-status--upcoming';
  return ' modern-room-status--available';
}

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
    showMeetingTitles: false,
    minimalHeaderStyle: 'filled'
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

  const statusClass = 'modern-room-status' + getStatusClass(room, minutesDiff);

  const headerStyle = room.NotFound
    ? 'transparent'
    : (sidebarConfig?.minimalHeaderStyle === 'transparent' ? 'transparent' : 'filled');

  return (
    <div className={statusClass}>
      <div className="status-content">
        {/* Main content area */}
        <div className="status-main">
          {/* Room name and status header */}
          <div className={`status-header status-header--${headerStyle}`}>
            <div className="room-name">{room.Name}</div>
            <div className="room-status">
              {room.NotFound ? (config.statusNotFound || 'Not Found') : (room.Busy ? config.statusBusy : config.statusAvailable)}
            </div>
          </div>

          {/* Meeting cards container */}
          <div className="meetings-container">
            {details.appointmentExists && (
              <MeetingCard appointment={room.Appointments[0]} label={details.nextUp || config.currentMeeting} sidebarConfig={sidebarConfig} config={config} isNext={false} />
            )}

            {room.Busy && room.Appointments && room.Appointments.length > 1 && (
              <MeetingCard appointment={room.Appointments[1]} label={config.upcomingTitle || 'Next Meeting'} sidebarConfig={sidebarConfig} config={config} isNext={true} />
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
    NotFound: PropTypes.bool,
    Appointments: PropTypes.arrayOf(AppointmentShape)
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
    showMeetingTitles: PropTypes.bool,
    minimalHeaderStyle: PropTypes.oneOf(['filled', 'transparent'])
  })
};

export default RoomStatusBlock;
