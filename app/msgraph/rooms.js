/**
* @file rooms.js
* @description Module for querying all meeting rooms and their appointments
*              via the Microsoft Graph API. Loads room lists, determines the
*              associated rooms, filters out blacklisted entries, and
*              enriches each room with its current appointments.
*
* @requires ./graph - Graph API helper functions
* @requires ../../config/room-blacklist.js - List of blocked room email addresses
* @requires ../roomlist-alias-helper - Helper function for generating room list aliases
*/
const graph = require('./graph');
const blacklist = require('../../config/room-blacklist.js');
const roomlistAliasHelper = require('../roomlist-alias-helper');

/**
* Converts Graph API error messages into user-friendly error texts.
*
* Detects known error patterns (invalid client secret, invalid
* authority URL) and returns correspondingly understandable messages.
*
* @param {Error|string} error - The original error
* @returns {string} User-friendly error message
*/
function toClientRoomErrorMessage(error) {
  const baseMessage = String(error?.message || error || '').trim();
  if (!baseMessage) {
    return 'Calendar backend unavailable';
  }

  const normalized = baseMessage.toLowerCase();

  // Detect invalid OAuth client secret
  if (normalized.includes('aadsts7000215') || normalized.includes('invalid_client')) {
    return 'Graph authentication failed: invalid OAuth client secret.';
  }

  // Detect invalid OAuth authority URL
  if (normalized.includes('url_parse_error')) {
    return 'Graph configuration error: invalid OAuth authority URL.';
  }

  return baseMessage;
}

/**
* Main function: Loads all rooms with their appointments via the Graph API.
*
* Flow (promise chain):
* 1. Retrieve all room lists
* 2. Load rooms from each room list (blacklist filtering)
* 3. Query appointments for each room and enrich
*
* @param {Function} callback - Callback function (err, rooms)
* @param {Object} msalClient - MSAL client instance for authentication
*/
module.exports = function(callback, msalClient) {

  /**
  * Retrieves all available room lists from the Graph API.
  *
  * @returns {Promise<Array>} Array of room list objects
  */
  const getListOfRooms = () => {
    var promise = new Promise(function(resolve, _reject) {
      graph
        .getRoomList(msalClient)
        .then(
          (lists) => {
            var roomLists = lists.value;
            resolve(roomLists);
          },
          (err) => {
            callback(err, null);
          }
        )
        .catch((err) => callback(err, null));
    });

    return promise;
  };

  /**
  * Determines all rooms from the provided room lists.
  *
  * Iterates over each room list, retrieves its rooms, and filters
  * out rooms that are on the blacklist. For each valid room,
  * a normalized room object is created.
  *
  * @param {Array} roomLists - Array of room list objects
  * @returns {Promise<Array>} Array of room objects with metadata
  */
  const getRoomsInLists = (roomLists) => {
    var promise = new Promise(function(resolve, _reject) {
      let roomAddresses = [];
      let counter = 0;

      roomLists.forEach(function(item, i, array) {
        graph.getRooms(msalClient, item.emailAddress).then((rooms) => {
          rooms.value.forEach(function(roomItem, _roomIndex, _roomsArray) {
            // Check if the room is on the blacklist
            let inBlacklist = isRoomInBlacklist(roomItem.emailAddress);

            // Only process rooms that are not on the blacklist
            if (!inBlacklist) {
              let room = {};

              // Copy the room's email address
              // Note: Commented-out code below allows domain replacement
              let email = roomItem.emailAddress;
              /* email = email.substring(0, email.indexOf('@'));
              email = email + '@' + auth.domain; */

              // Generate URL-friendly alias from the display name
              let roomAlias = roomItem.displayName.toLowerCase().replace(/\s+/g, '-');

              room.Roomlist = item.displayName;
              room.RoomlistAlias = roomlistAliasHelper.getAlias(item.displayName);
              room.Name = roomItem.displayName;
              room.RoomAlias = roomAlias;
              room.Email = email;
              room.Capacity = roomItem.capacity || 0;
              roomAddresses.push(room);
            }
          });
          counter++;

          // Only resolve when all room lists have been processed
          if (counter === array.length) {
            resolve(roomAddresses);
          }
        });
      });
    });
    return promise;
  };

  /**
  * Enriches a room object with appointment data.
  *
  * Processes the appointments of a room, marks the room as busy
  * if the first appointment is currently active, and handles private appointments.
  * Triggers the overall callback once all rooms have been processed.
  *
  * @param {Object} context - Processing context with callback and counter
  * @param {Object} room - The room object to enrich
  * @param {Array} [appointments=[]] - Array of appointments from the Graph API
  * @param {Object} [option={}] - Optional additional information (e.g., error message)
  */
  const fillRoomData = (context, room, appointments = [], option = {}) => {
    room.Appointments = [];
    appointments.forEach(function(appt, index) {
      // Convert appointment start and end times to timestamps
      const start = processTime(appt.start.dateTime),
        end = processTime(appt.end.dateTime),
        now = Date.now();

      // Mark room as "busy" if the first appointment is currently active
      room.Busy = index === 0 ? start < now && now < end : room.Busy;

      // Detect private appointments and mask the subject accordingly
      let isAppointmentPrivate = appt.sensitivity === 'Normal' ? false : true;
      let subject = isAppointmentPrivate ? 'Private' : appt.subject;

      room.Appointments.push({
        Id: appt.id,
        Subject: subject,
        Organizer: appt.organizer.emailAddress.name,
        Start: start,
        End: end,
        Private: isAppointmentPrivate
      });
    });

    // Append error message if an error occurred during retrieval
    if (option.errorMessage) room.ErrorMessage = toClientRoomErrorMessage(option.errorMessage);
    context.itemsProcessed++;

    // When all rooms are processed: sort alphabetically and trigger callback
    if (context.itemsProcessed === context.roomAddresses.length) {
      context.roomAddresses.sort((a, b) => a.Name.toLowerCase().localeCompare(b.Name.toLowerCase()));
      context.callback(context.roomAddresses);
    }
  };

  /**
  * Retrieves the current and upcoming appointments for all rooms.
  *
  * Queries the calendar view via the Graph API for each room
  * and enriches the room objects with appointment data.
  *
  * @param {Array} roomAddresses - Array of room objects
  * @returns {Promise<Array>} Array of enriched room objects
  */
  const getAppointmentsForRooms = (roomAddresses) => {
    var promise = new Promise(function(resolve, _reject) {
      // Context object for tracking progress across all rooms
      var context = {
        callback: resolve,
        itemsProcessed: 0,
        roomAddresses
      };

      roomAddresses.forEach(function(room, _index, _array) {
        // Retrieve calendar view for the respective room
        graph.getCalendarView(msalClient, room.Email).then(
          (response) => {
            fillRoomData(context, room, response.value);
          },
          (error) => {
            // On error, still process the room but with an error message
            fillRoomData(context, room, undefined, { errorMessage: error });
          }
        );
      });
    });
    return promise;
  };

  /**
  * Checks whether a room email address is on the blacklist.
  *
  * @param {string} email - Email address of the room
  * @returns {boolean} true if the room is blocked
  */
  const isRoomInBlacklist = (email) => blacklist.roomEmails.includes(email);

  /**
  * Converts a UTC time string to a local timestamp.
  *
  * Calculates the local time offset and adds it to the UTC timestamp.
  *
  * @param {string} appointmentTime - Appointment time as UTC string
  * @returns {number} Local timestamp in milliseconds
  */
  const processTime = (appointmentTime) => {
    const date = new Date(appointmentTime);
    // Calculate local time offset (getTimezoneOffset returns minutes, negated)
    const localOffset = -1 * date.getTimezoneOffset() * 60000;
    const timestamp = date.getTime() + localOffset;

    return timestamp;
  };

  // Execute promise chain: room lists → rooms → appointments → callback
  getListOfRooms()
    .then(getRoomsInLists)
    .then(getAppointmentsForRooms)
    .then((rooms) => callback(null, rooms))
    .catch((err) => callback(err, null));
};
