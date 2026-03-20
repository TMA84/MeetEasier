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
const graph = require('./graph');
const config = require('../../config/config');

/**
 * Books a meeting room via the Microsoft Graph API.
 *
 * Performs the following steps:
 * 1. Validation of required fields (subject, start and end time)
 * 2. Security check: Prevents adding attendees/resources
 * 3. Time range validation (format, order, maximum duration, past check)
 * 4. Conflict check: Checks for overlapping existing appointments
 * 5. Creation of the appointment in the room calendar
 *
 * @async
 * @param {Object} msalClient - MSAL client instance for authentication
 * @param {string} roomEmail - Email address of the room to book
 * @param {Object} bookingDetails - Booking details
 * @param {string} bookingDetails.subject - Subject of the appointment
 * @param {string} bookingDetails.startTime - Start time in ISO 8601 format
 * @param {string} bookingDetails.endTime - End time in ISO 8601 format
 * @param {string} [bookingDetails.description] - Optional description of the appointment
 * @returns {Promise<Object>} Result object with success, eventId, and message
 * @throws {Error} On missing required fields, invalid times, conflicts, or permission issues
 */
module.exports = async function(msalClient, roomEmail, bookingDetails) {
	const { subject, startTime, endTime, description } = bookingDetails;

	// Validate required fields – subject, start and end time are required
	if (!subject || !startTime || !endTime) {
		throw new Error('Subject, start time, and end time are required');
	}

	// Security check: Prevents adding attendees or
	// additional resources to room bookings to prevent misuse
	const disallowedFields = ['attendees', 'requiredAttendees', 'optionalAttendees', 'resources', 'locations'];
	for (const field of disallowedFields) {
		if (bookingDetails[field] !== undefined) {
			throw new Error('Cannot add attendees or additional resources to room bookings');
		}
	}

	// Validate time range – convert start and end time to Date objects
	const start = new Date(startTime);
	const end = new Date(endTime);

	// Check for valid ISO date format
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
		throw new Error('Invalid time format. Use valid ISO datetime values for startTime and endTime.');
	}
	
	// End time must be after start time
	if (start >= end) {
		throw new Error('End time must be after start time');
	}

	// Limit maximum booking duration to 24 hours
	const maxBookingDurationMs = 24 * 60 * 60 * 1000;
	if ((end.getTime() - start.getTime()) > maxBookingDurationMs) {
		throw new Error('Booking duration exceeds allowed maximum of 24 hours.');
	}

	// Allow a 2-minute tolerance in the past
	// to account for network latency and processing time
	const twoMinutesAgo = new Date(Date.now() - 2 * 60000);
	if (start < twoMinutesAgo) {
		throw new Error('Cannot book in the past');
	}

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
