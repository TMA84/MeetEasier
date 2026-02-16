import React from 'react';
import PropTypes from 'prop-types';
import config from '../../config/flightboard.config.js';
import seats from '../../config/flightboard.seats.js';
import { formatTimeRange } from '../../utils/timeFormat.js';

/**
 * Status indicator component showing room availability
 * Displays Available, Busy, or Error status based on room state
 */
const Status = ({ room }) => {
  const statusClass = room.ErrorMessage
    ? 'meeting-error'
    : room.Busy
      ? 'meeting-busy'
      : 'meeting-open';

  const statusText = room.ErrorMessage
    ? config.board.statusError
    : room.Busy
      ? config.board.statusBusy
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
 * Shows current meeting organizer or next upcoming meeting
 */
const Organizer = ({ room }) => {
  if (room.Appointments.length === 0) return null;

  return (
    <div className={`${room.RoomAlias}-organizer meeting-organizer`}>
      <div>
        <span className={`${room.RoomAlias}-meeting-upcoming meeting-upcoming`}>
          {room.Busy ? '' : `${config.board.nextUp}: `}
        </span>
        <span className={`${room.RoomAlias}-subject meeting-organizer`}>
          {room.Appointments[0].Organizer}
        </span>
      </div>
    </div>
  );
};

Organizer.propTypes = {
  room: PropTypes.shape({
    RoomAlias: PropTypes.string.isRequired,
    Busy: PropTypes.bool.isRequired,
    Appointments: PropTypes.arrayOf(PropTypes.shape({
      Organizer: PropTypes.string
    })).isRequired
  }).isRequired
};

/**
 * Next meeting organizer display component
 * Shows the organizer of the second appointment in the list
 */
const NextOrganizer = ({ room }) => {
  if (room.Appointments.length <= 1) return null;

  return (
    <div className={`${room.RoomAlias}-organizer meeting-organizer`}>
      <div>
        <span className={`${room.RoomAlias}-meeting-upcoming meeting-upcoming`}>
          {room.Busy ? `${config.board.nextUp}: ` : ''}
        </span>
        <span className={`${room.RoomAlias}-subject meeting-organizer`}>
          {room.Appointments[1].Organizer}
        </span>
      </div>
    </div>
  );
};

NextOrganizer.propTypes = {
  room: PropTypes.shape({
    RoomAlias: PropTypes.string.isRequired,
    Busy: PropTypes.bool.isRequired,
    Appointments: PropTypes.arrayOf(PropTypes.shape({
      Organizer: PropTypes.string
    })).isRequired
  }).isRequired
};

/**
 * Meeting time display component
 * Shows formatted time range for current/next meeting
 */
const Time = ({ room }) => {
  if (room.Appointments.length === 0) return null;

  return (
    <div className={`${room.RoomAlias}-time meeting-time`}>
      {formatTimeRange(
        new Date(parseInt(room.Appointments[0].Start, 10)),
        new Date(parseInt(room.Appointments[0].End, 10)),
        true
      )}
    </div>
  );
};

Time.propTypes = {
  room: PropTypes.shape({
    RoomAlias: PropTypes.string.isRequired,
    Appointments: PropTypes.arrayOf(PropTypes.shape({
      Start: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      End: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
    })).isRequired
  }).isRequired
};

/**
 * Next meeting time display component
 * Shows formatted time range for the second appointment
 */
const NextTime = ({ room }) => {
  if (room.Appointments.length <= 1) return null;

  return (
    <div className={`${room.RoomAlias}-time meeting-time`}>
      {formatTimeRange(
        new Date(parseInt(room.Appointments[1].Start, 10)),
        new Date(parseInt(room.Appointments[1].End, 10)),
        true
      )}
    </div>
  );
};

NextTime.propTypes = {
  room: PropTypes.shape({
    RoomAlias: PropTypes.string.isRequired,
    Appointments: PropTypes.arrayOf(PropTypes.shape({
      Start: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      End: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
    })).isRequired
  }).isRequired
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
  // Use the RoomlistAlias from the room object, or generate a default one
  const roomlistAlias = room.RoomlistAlias || `${room.Roomlist.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  const roomlist = `roomlist-${roomlistAlias}`;

  // Determine if this row should be visible based on filter
  const isVisible = filter === roomlist || filter === 'roomlist-all' || filter === '';

  // Build room status class names
  const roomStatusClass = [
    room.RoomAlias,
    'meeting-room',
    room.Busy && 'meeting-room-busy',
    room.ErrorMessage && 'meeting-room-error'
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={`meeting-room__row row-padder ${roomlist}`} 
      style={{ display: isVisible ? 'block' : 'none' }}
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
                <Organizer room={room} />
                <Time room={room} />
              </div>

              {/* Next meeting info (only shown when room is busy) */}
              <div className="medium-4 columns">
                {room.Busy && (
                  <div>
                    <NextOrganizer room={room} />
                    <NextTime room={room} />
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
    Appointments: PropTypes.arrayOf(PropTypes.shape({
      Subject: PropTypes.string,
      Organizer: PropTypes.string,
      Start: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      End: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })).isRequired
  }).isRequired,
  filter: PropTypes.string
};

export default FlightboardRow;
