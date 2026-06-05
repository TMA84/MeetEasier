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
/** @type {number} Timeout for the entire batch API call in milliseconds */
const GRAPH_FETCH_TIMEOUT_MS = parseInt(process.env.GRAPH_FETCH_TIMEOUT_MS || '30000', 10);

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

      // Step 2: Fetch calendar views via Graph Batch API (max 20 per batch, sequential)
      const rooms = roomAddresses.map(r => ({ ...r, Appointments: [], Busy: false }));
      const emails = rooms.map(r => r.Email);

      let batchResults;
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Batch API timeout')), GRAPH_FETCH_TIMEOUT_MS)
        );
        batchResults = await Promise.race([
          graph.getCalendarViewBatch(msalClient, emails),
          timeoutPromise
        ]);
      } catch (batchError) {
        // Complete batch API failure (e.g. 401 Auth) - fall back to individual queries
        console.warn('Batch API failed, falling back to individual queries:', batchError.message);
        batchResults = new Map();
        const individualResults = await Promise.all(
          emails.map(async (email) => {
            try {
              const result = await graph.getCalendarView(msalClient, email);
              return { email, result };
            } catch (individualError) {
              return { email, error: individualError.message || 'Individual request failed' };
            }
          })
        );
        for (const item of individualResults) {
          if (item.error) {
            batchResults.set(item.email, { error: item.error });
          } else {
            batchResults.set(item.email, item.result);
          }
        }
      }

      for (const room of rooms) {
        const result = batchResults.get(room.Email);
        if (result?.error) {
          room.ErrorMessage = toClientRoomErrorMessage({ message: result.error });
        } else if (result?.value) {
          const appointments = result.value;
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
      }

      rooms.sort((a, b) => a.Name.toLowerCase().localeCompare(b.Name.toLowerCase()));
      callback(null, rooms);
    } catch (err) {
      callback(err, null);
    }
  })();
};
