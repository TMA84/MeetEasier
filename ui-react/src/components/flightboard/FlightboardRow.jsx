/** @file FlightboardRow.js
*  @description Single row component for the flightboard grid, displaying a room's availability status, current meeting organizer and time, next meeting details, and seating capacity.
*/
import React from 'react';
import PropTypes from 'prop-types';
import seats from '../../config/flightboard.seats.js';
import { formatTimeRange } from '../../utils/time-format.js';
import { getFlightboardDisplayTranslations } from '../../config/display-translations.js';
import { AppointmentShape } from '../shared/prop-types.js';

/**
* Determine if a room has an upcoming meeting (within next 15 minutes and not currently busy)
* @param {Object} room - Room object with Appointments array
* @returns {boolean} True if room has an upcoming meeting
*/
const isUpcomingMeeting = (room) => {
  if (room.Busy || room.Appointments.length === 0) {
    return false;
  }

  const now = new Date().getTime();
  const upcomingThreshold = 15 * 60 * 1000; // 15 minutes in milliseconds
  const nextAppointmentStart = parseInt(room.Appointments[0].Start, 10);

  return nextAppointmentStart - now > 0 && nextAppointmentStart - now <= upcomingThreshold;
};

/**
* Status indicator component showing room availability
* Displays Available, Busy, Upcoming, or Error status based on room state
*/
const Status = ({ room }) => {
  const config = getFlightboardDisplayTranslations();
  const isUpcoming = isUpcomingMeeting(room);
  
  const statusClass = room.ErrorMessage
    ? 'meeting-error'
    : room.Busy
      ? 'meeting-busy'
      : isUpcoming
        ? 'meeting-upcoming'
        : 'meeting-open';

  const statusText = room.ErrorMessage
    ? config.board.statusError
    : room.Busy
      ? config.board.statusBusy
      : isUpcoming
        ? config.board.statusUpcoming || 'Upcoming'
        : config.board.statusAvailable;

  return (
    <div 
      className={`${room.RoomAlias}-meeting-status ${statusClass}`} 
      title={room.ErrorMessage || ''}
    >
      {statusText}
    </div>
  );
};

Status.propTypes = {
  room: PropTypes.shape({
    RoomAlias: PropTypes.string.isRequired,
    Busy: PropTypes.bool.isRequired,
    ErrorMessage: PropTypes.string
  }).isRequired
};

/**
* Meeting organizer display component
* Shows meeting organizer with optional "Next Up" prefix
* @param {Object} props.room - Room object
* @param {number} props.appointmentIndex - Index of the appointment to display (0 or 1)
* @param {boolean} props.showPrefix - Whether to show the "Next Up" prefix
*/
const MeetingOrganizer = ({ room, appointmentIndex, showPrefix }) => {
  const config = getFlightboardDisplayTranslations();
  if (room.Appointments.length <= appointmentIndex) return null;

  return (
    <div className={`${room.RoomAlias}-organizer meeting-organizer`}>
      <div>
        <span className={`${room.RoomAlias}-meeting-upcoming meeting-upcoming`}>
          {showPrefix ? `${config.board.nextUp}: ` : ''}
        </span>
        <span className={`${room.RoomAlias}-subject meeting-organizer`}>
          {room.Appointments[appointmentIndex].Organizer}
        </span>
      </div>
    </div>
  );
};

MeetingOrganizer.propTypes = {
  room: PropTypes.shape({
    RoomAlias: PropTypes.string.isRequired,
    Busy: PropTypes.bool.isRequired,
    Appointments: PropTypes.arrayOf(PropTypes.shape({
      Organizer: PropTypes.string
    })).isRequired
  }).isRequired,
  appointmentIndex: PropTypes.number.isRequired,
  showPrefix: PropTypes.bool.isRequired
};

/**
* Meeting time display component
* Shows formatted time range for a specific appointment
* @param {Object} props.room - Room object
* @param {number} props.appointmentIndex - Index of the appointment to display (0 or 1)
*/
const MeetingTime = ({ room, appointmentIndex }) => {
  if (room.Appointments.length <= appointmentIndex) return null;

  return (
    <div className={`${room.RoomAlias}-time meeting-time`}>
      {formatTimeRange(
        new Date(parseInt(room.Appointments[appointmentIndex].Start, 10)),
        new Date(parseInt(room.Appointments[appointmentIndex].End, 10)),
        true
      )}
    </div>
  );
};

MeetingTime.propTypes = {
  room: PropTypes.shape({
    RoomAlias: PropTypes.string.isRequired,
    Appointments: PropTypes.arrayOf(PropTypes.shape({
      Start: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      End: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
    })).isRequired
  }).isRequired,
  appointmentIndex: PropTypes.number.isRequired
};

/**
* Room seating capacity display
* Shows configured seat count or 'xx' if not configured
*/
const Seats = ({ room }) => {
  return seats.capacity[room.Name] === undefined ? 'xx' : seats.capacity[room.Name];
};

Seats.propTypes = {
  room: PropTypes.shape({
    Name: PropTypes.string.isRequired
  }).isRequired
};

/**
* Flightboard row component displaying room status and meeting information
* Shows room availability, current meeting, and next meeting in a responsive row layout
*/
const FlightboardRow = ({ room, filter = '' }) => {
  const config = getFlightboardDisplayTranslations();
  // Use the RoomlistAlias from the room object, or generate a default one
  const roomlistAlias = room.RoomlistAlias || `${room.Roomlist.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  const roomlist = `roomlist-${roomlistAlias}`;

  // Determine if this row should be visible based on filter
  const isVisible = filter === roomlist || filter === 'roomlist-all' || filter === '';

  // Determine upcoming status
  const isUpcoming = isUpcomingMeeting(room);

  // Build room status class names
  const roomStatusClass = [
    room.RoomAlias,
    'meeting-room',
    room.Busy && 'meeting-room-busy',
    isUpcoming && 'meeting-room-upcoming',
    room.ErrorMessage && 'meeting-room-error'
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={`meeting-room__row row-padder ${roomlist}`} 
      style={{ display: isVisible ? 'flex' : 'none' }}
    >
      <div className="row">
        <div className="medium-12 columns">
          <div className={roomStatusClass}>
            <div className="row valign-middle">
              
              {/* Status indicator */}
              <div className={`${room.RoomAlias}-status meeting-room__status medium-1 columns`}>
                <Status room={room} />
              </div>

              {/* Room name */}
              <div className="medium-3 columns">
                <div className={`${room.RoomAlias}-name meeting-room__name`}>
                  {room.Name}
                </div>
              </div>

              {/* Seating capacity */}
              <div className="medium-1 columns">
                <div className="seats-capacity">
                  <Seats room={room} />
                </div>
                <div className="seats">
                  {config.board.seats}
                </div>
              </div>

              {/* Current meeting info */}
              <div className="medium-3 columns">
                <MeetingOrganizer room={room} appointmentIndex={0} showPrefix={!room.Busy} />
                <MeetingTime room={room} appointmentIndex={0} />
              </div>

              {/* Next meeting info (only shown when room is busy) */}
              <div className="medium-4 columns">
                {room.Busy && (
                  <div>
                    <MeetingOrganizer room={room} appointmentIndex={1} showPrefix={room.Busy} />
                    <MeetingTime room={room} appointmentIndex={1} />
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

FlightboardRow.propTypes = {
  room: PropTypes.shape({
    Name: PropTypes.string.isRequired,
    RoomAlias: PropTypes.string.isRequired,
    Roomlist: PropTypes.string.isRequired,
    Busy: PropTypes.bool.isRequired,
    ErrorMessage: PropTypes.string,
    Appointments: PropTypes.arrayOf(AppointmentShape).isRequired
  }).isRequired,
  filter: PropTypes.string
};

export default FlightboardRow;
