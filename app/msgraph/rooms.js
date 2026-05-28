/**
* @file rooms.js
* @description Module for querying all meeting rooms and their appointments
*              via the Microsoft Graph API. Uses room list caching (5 min)
*              and individual calendar view calls for reliable data.
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

function isRoomInBlacklist(email) {
  return blacklist.roomEmails.includes(email);
}

function processTime(appointmentTime) {
  // Graph API returns dateTime in UTC without 'Z' suffix
  // Append 'Z' to ensure correct UTC parsing regardless of server timezone
  const isoStr = appointmentTime.endsWith('Z') ? appointmentTime : appointmentTime + 'Z';
  const date = new Date(isoStr);
  return date.getTime();
}

/**
* Retrieves room lists and rooms, using a 5-minute cache.
*/
async function getRoomAddresses(msalClient) {
  const now = Date.now();
  if (cachedRoomAddresses && (now - roomCacheTime) < ROOM_CACHE_TTL) {
    return cachedRoomAddresses;
  }

  const lists = await graph.getRoomList(msalClient);
  const roomLists = lists.value;
  const roomAddresses = [];

  for (const item of roomLists) {
    const rooms = await graph.getRooms(msalClient, item.emailAddress);
    for (const roomItem of rooms.value) {
      if (isRoomInBlacklist(roomItem.emailAddress)) continue;
      roomAddresses.push({
        Roomlist: item.displayName,
        RoomlistAlias: roomlistAliasHelper.getAlias(item.displayName),
        Name: roomItem.displayName,
        RoomAlias: roomItem.displayName.toLowerCase().replace(/\s+/g, '-'),
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
* Main function: Loads all rooms with their appointments via the Graph API.
* Uses room list caching (5 min) and individual calendar view calls.
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

      // Step 2: Fetch calendar views individually (reliable, no batch consistency issues)
      const rooms = roomAddresses.map(r => ({ ...r, Appointments: [], Busy: false }));

      await Promise.all(rooms.map(async (room) => {
        try {
          // Timeout wrapper: abort if Graph API doesn't respond within 10 seconds
          const response = await Promise.race([
            graph.getCalendarView(msalClient, room.Email),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Calendar fetch timeout')), 10000))
          ]);
          const appointments = response.value || [];

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
        } catch (error) {
          room.ErrorMessage = toClientRoomErrorMessage(error);
        }
      }));

      rooms.sort((a, b) => a.Name.toLowerCase().localeCompare(b.Name.toLowerCase()));
      callback(null, rooms);
    } catch (err) {
      callback(err, null);
    }
  })();
};
