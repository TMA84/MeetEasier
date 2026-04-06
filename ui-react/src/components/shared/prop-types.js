/**
* @file propTypes.js
* @description Shared PropTypes shapes used across multiple components.
*/
import PropTypes from 'prop-types';

/**
* Shared appointment shape used by RoomStatusBlock, Sidebar, FlightboardRow, etc.
*/
export const AppointmentShape = PropTypes.shape({
  Subject: PropTypes.string,
  Organizer: PropTypes.string,
  Start: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  End: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  Private: PropTypes.bool
});
