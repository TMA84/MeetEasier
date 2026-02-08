const graph = require('./graph');
const config = require('../../config/config');

/**
 * Book a room using Microsoft Graph API
 * @param {Object} msalClient - MSAL client instance
 * @param {string} roomEmail - Room email address
 * @param {Object} bookingDetails - Booking details
 * @returns {Promise} - Booking result
 */
module.exports = async function(msalClient, roomEmail, bookingDetails) {
	const { subject, startTime, endTime, description } = bookingDetails;

	// Validate required fields
	if (!subject || !startTime || !endTime) {
		throw new Error('Subject, start time, and end time are required');
	}

	// Validate time range
	const start = new Date(startTime);
	const end = new Date(endTime);
	
	if (start >= end) {
		throw new Error('End time must be after start time');
	}

	// Allow bookings that start within the last 2 minutes (to account for network latency and processing time)
	const twoMinutesAgo = new Date(Date.now() - 2 * 60000);
	if (start < twoMinutesAgo) {
		throw new Error('Cannot book in the past');
	}

	// Get authenticated Graph client
	const client = getAuthenticatedClient(msalClient);

	// Create event object
	// Since we're creating this directly in the room's calendar,
	// the room is automatically the organizer
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
		// Create the event directly in the room's calendar
		// This requires Calendars.ReadWrite application permission
		// The room mailbox must allow direct booking or have appropriate permissions
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
		
		// Provide helpful error message if permission issue
		if (error.statusCode === 403 || error.statusCode === 401) {
			throw new Error('Insufficient permissions to book room. Ensure the application has Calendars.ReadWrite permission and the room allows direct booking.');
		}
		
		throw new Error(error.message || 'Failed to book room');
	}
};

function getAuthenticatedClient(msalClient) {
	if (!msalClient) {
		throw new Error('Invalid MSAL client');
	}

	const graphModule = require('@microsoft/microsoft-graph-client');
	
	const clientCredentialRequest = {
		scopes: ['.default'],
		skipCache: true
	};

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
