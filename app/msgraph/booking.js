/**
* @file booking.js
* @description Room booking module via the Microsoft Graph API.
*              Enables creating calendar events directly in the
*              calendar of a meeting room. Includes comprehensive validation
*              of booking parameters and conflict checking before booking.
*
* @requires ./graph - Graph API helper functions
* @requires ../../config/config - Application configuration
*/
const _graph = require('./graph');
const _config = require('../../config/config');

/**
 * Validates booking details: required fields, disallowed fields, and time range.
 * @param {Object} bookingDetails
 * @throws {Error} On validation failure
 */
function validateBookingDetails(bookingDetails) {
  const { subject, startTime, endTime } = bookingDetails;

  if (!subject || !startTime || !endTime) {
    throw new Error('Subject, start time, and end time are required');
  }

  const disallowedFields = ['attendees', 'requiredAttendees', 'optionalAttendees', 'resources', 'locations'];
  for (const field of disallowedFields) {
    if (bookingDetails[field] !== undefined) {
      throw new Error('Cannot add attendees or additional resources to room bookings');
    }
  }
}

/**
 * Validates and parses start/end times, checking format, order, duration, and past booking.
 * @param {string} startTime
 * @param {string} endTime
 * @returns {{ start: Date, end: Date }}
 * @throws {Error} On invalid times
 */
function validateTimeRange(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid time format. Use valid ISO datetime values for startTime and endTime.');
  }
  if (start >= end) {
    throw new Error('End time must be after start time');
  }
  const maxBookingDurationMs = 24 * 60 * 60 * 1000;
  if ((end.getTime() - start.getTime()) > maxBookingDurationMs) {
    throw new Error('Booking duration exceeds allowed maximum of 24 hours.');
  }
  const twoMinutesAgo = new Date(Date.now() - 2 * 60000);
  if (start < twoMinutesAgo) {
    throw new Error('Cannot book in the past');
  }
  return { start, end };
}

/**
 * Books a meeting room via the Microsoft Graph API.
 *
 * @async
 * @param {Object} msalClient - MSAL client instance for authentication
 * @param {string} roomEmail - Email address of the room to book
 * @param {Object} bookingDetails - Booking details
 * @returns {Promise<Object>} Result object with success, eventId, and message
 */
module.exports = async function(msalClient, roomEmail, bookingDetails) {
  const { subject, startTime, endTime, description } = bookingDetails;

  validateBookingDetails(bookingDetails);
  const { start, end } = validateTimeRange(startTime, endTime);

  // Create authenticated Graph client
  const client = getAuthenticatedClient(msalClient);

  // Conflict check: Query existing appointments in the desired time range.
  // calendarView is used to also resolve recurring appointments.
  try {
    const conflicts = await client
      .api(`/users/${roomEmail}/calendarView`)
      .query({ startDateTime: start.toISOString(), endDateTime: end.toISOString() })
      .get();

    // If appointments exist in the time range, the room is occupied
    if (conflicts && conflicts.value && conflicts.value.length > 0) {
      throw new Error('Room is already booked during the requested time range');
    }
  } catch (err) {
    // On authentication/permission errors, provide a helpful message
    console.error('Graph API conflict check error:', err);
    if (err.statusCode === 403 || err.statusCode === 401) {
      throw new Error('Insufficient permissions to check room calendar. Ensure the application has Calendars.Read or Calendars.Read.Shared permission.');
    }
    throw err;
  }

  // Create appointment object for the Graph API.
  // Since the appointment is created directly in the room calendar,
  // the room is automatically the organizer.
  const event = {
    subject: subject,
    body: {
      contentType: 'Text',
      content: description || ''
    },
    start: {
      dateTime: start.toISOString(),
      timeZone: 'UTC'
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: 'UTC'
    },
    location: {
      displayName: roomEmail
    }
  };

  try {
    // Create appointment directly in the room calendar.
    // Requires the application permission Calendars.ReadWrite.
    // The room mailbox must allow direct bookings or
    // have the appropriate permissions.
    const result = await client
      .api(`/users/${roomEmail}/events`)
      .post(event);

    return {
      success: true,
      eventId: result.id,
      message: 'Room booked successfully'
    };
  } catch (error) {
    console.error('Graph API booking error:', error);
    
    // On permission issues, provide a helpful error message
    if (error.statusCode === 403 || error.statusCode === 401) {
      throw new Error('Insufficient permissions to book room. Ensure the application has Calendars.ReadWrite permission and the room allows direct booking.');
    }
    
    throw new Error(error.message || 'Failed to book room');
  }
};

/**
* Creates an authenticated Microsoft Graph API client.
*
* Uses the MSAL client to obtain an access token via the
* client credentials flow and initializes the Graph client with it.
*
* @param {Object} msalClient - MSAL client instance for token acquisition
* @returns {Object} Authenticated Microsoft Graph client
* @throws {Error} If the MSAL client is invalid
*/
function getAuthenticatedClient(msalClient) {
  if (!msalClient) {
    throw new Error('Invalid MSAL client');
  }

  const graphModule = require('@microsoft/microsoft-graph-client');
  
  // Configure client credentials request – .default scope for app permissions
  const clientCredentialRequest = {
    scopes: ['.default'],
    skipCache: true
  };

  // Initialize Graph client with custom auth provider
  const client = graphModule.Client.init({
    authProvider: async (done) => {
      try {
        const response = await msalClient.acquireTokenByClientCredential(clientCredentialRequest);
        done(null, response.accessToken);
      } catch (err) {
        console.error('Auth error:', err);
        done(err, null);
      }
    }
  });

  return client;
}
