/**
* @file rooms.js
* @description Module for querying all meeting rooms and their appointments
*              via the Microsoft Graph API. Uses room list caching and
*              JSON batching for efficient API usage.
*
* @requires ./graph - Graph API helper functions
* @requires ../../config/room-blacklist.js - List of blocked room email addresses
* @requires ../roomlist-alias-helper - Helper function for generating room list aliases
*/
const graph = require('./graph');
const blacklist = require('../../config/room-blacklist.js');
const roomlistAliasHelper = require('../roomlist-alias-helper');

/** @type {Array|null} Cached room addresses (room list + room metadata) */
let cachedRoomAddresses = null;
/** @type {number} Timestamp of last room list refresh */
let roomCacheTime = 0;
/** @type {number} Cache duration for room lists (5 minutes) */
const ROOM_CACHE_TTL = 5 * 60 * 1000;

/**
* Converts Graph API error messages into user-friendly error texts.
* @param {Error|string} error - The original error
* @returns {string} User-friendly error message
*/
function toClientRoomErrorMessage(error) {
  const baseMessage = String(error?.message || error || '').trim();
  if (!baseMessage) return 'Calendar backend unavailable';
  const normalized = baseMessage.toLowerCase();
  if (normalized.includes('aadsts7000215') || normalized.includes('invalid_client')) {
    return 'Graph authentication failed: invalid OAuth client secret.';
  }
  if (normalized.includes('url_parse_error')) {
    return 'Graph configuration error: invalid OAuth authority URL.';
  }
  return baseMessage;
}

/**
* Checks whether a room email address is on the blacklist.
* @param {string} email - Email address of the room
* @returns {boolean} true if the room is blocked
*/
function isRoomInBlacklist(email) {
  return blacklist.roomEmails.includes(email);
}

/**
* Converts a UTC time string to a local timestamp.
* @param {string} appointmentTime - Appointment time as UTC string
* @returns {number} Local timestamp in milliseconds
*/
function processTime(appointmentTime) {
  const date = new Date(appointmentTime);
  const localOffset = -1 * date.getTimezoneOffset() * 60000;
  return date.getTime() + localOffset;
}

/**
* Retrieves room lists and rooms, using a 5-minute cache.
* Only re-fetches from Graph API when cache is expired.
* @param {Object} msalClient - MSAL client instance
* @returns {Promise<Array>} Array of room objects with metadata
*/
async function getRoomAddresses(msalClient) {
  const now = Date.now();
  if (cachedRoomAddresses && (now - roomCacheTime) < ROOM_CACHE_TTL) {
    return cachedRoomAddresses;
  }

  // Fetch room lists
  const lists = await graph.getRoomList(msalClient);
  const roomLists = lists.value;

  // Fetch rooms from each list
  const roomAddresses = [];
  for (const item of roomLists) {
    const rooms = await graph.getRooms(msalClient, item.emailAddress);
    for (const roomItem of rooms.value) {
      if (isRoomInBlacklist(roomItem.emailAddress)) continue;

      const roomAlias = roomItem.displayName.toLowerCase().replace(/\s+/g, '-');
      roomAddresses.push({
        Roomlist: item.displayName,
        RoomlistAlias: roomlistAliasHelper.getAlias(item.displayName),
        Name: roomItem.displayName,
        RoomAlias: roomAlias,
        Email: roomItem.emailAddress,
        Capacity: roomItem.capacity || 0
      });
    }
  }

  cachedRoomAddresses = roomAddresses;
  roomCacheTime = now;
  return roomAddresses;
}

/**
* Enriches room objects with appointment data from a batch response.
* @param {Array} roomAddresses - Array of room objects
* @param {Map} batchResults - Map of email → { value: appointments[] } or { error }
* @returns {Array} Enriched room objects sorted alphabetically
*/
function enrichRoomsWithAppointments(roomAddresses, batchResults) {
  for (const room of roomAddresses) {
    room.Appointments = [];
    room.Busy = false;

    const result = batchResults.get(room.Email);
    if (!result) continue;

    if (result.error) {
      room.ErrorMessage = toClientRoomErrorMessage(result.error);
      continue;
    }

    const appointments = result.value || [];
    for (let index = 0; index < appointments.length; index++) {
      const appt = appointments[index];
      const start = processTime(appt.start.dateTime);
      const end = processTime(appt.end.dateTime);
      const now = Date.now();

      if (index === 0) {
        room.Busy = start < now && now < end;
      }

      const isPrivate = appt.sensitivity !== 'Normal';
      room.Appointments.push({
        Id: appt.id,
        Subject: isPrivate ? 'Private' : appt.subject,
        Organizer: appt.organizer.emailAddress.name,
        Start: start,
        End: end,
        Private: isPrivate
      });
    }
  }

  roomAddresses.sort((a, b) => a.Name.toLowerCase().localeCompare(b.Name.toLowerCase()));
  return roomAddresses;
}

/**
* Main function: Loads all rooms with their appointments via the Graph API.
* Uses room list caching (5 min) and JSON batching for calendar views.
*
* @param {Function} callback - Callback function (err, rooms)
* @param {Object} msalClient - MSAL client instance for authentication
*/
module.exports = function(callback, msalClient) {
  (async () => {
    try {
      // Step 1: Get room addresses (cached for 5 minutes)
      const roomAddresses = await getRoomAddresses(msalClient);

      if (roomAddresses.length === 0) {
        callback(null, []);
        return;
      }

      // Step 2: Fetch all calendar views in batches of 20
      const emails = roomAddresses.map(r => r.Email);
      const batchResults = await graph.getCalendarViewBatch(msalClient, emails);

      // Log batch results summary
      let roomsWithData = 0;
      let roomsWithErrors = 0;
      for (const [, result] of batchResults) {
        if (result.error) roomsWithErrors++;
        else if (result.value && result.value.length > 0) roomsWithData++;
      }
      console.log(`[Rooms] Batch results: ${batchResults.size} rooms, ${roomsWithData} with appointments, ${roomsWithErrors} errors`);

      // Step 3: Enrich rooms with appointment data
      // Clone room objects so cached metadata isn't mutated
      const rooms = roomAddresses.map(r => ({ ...r }));
      const enriched = enrichRoomsWithAppointments(rooms, batchResults);

      callback(null, enriched);
    } catch (err) {
      callback(err, null);
    }
  })();
};
