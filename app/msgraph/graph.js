/**
 * @file graph.js
 * @description Central helper functions for the Microsoft Graph API.
 *              Provides authenticated API calls to query room lists,
 *              rooms, and calendar views. Supports automatic
 *              pagination of Graph API results.
 *
 * @requires @microsoft/microsoft-graph-client - Microsoft Graph SDK
 * @requires ../../config/config - Application configuration
 * @requires isomorphic-fetch - Fetch polyfill for Node.js (required by Graph SDK)
 */
const graph = require('@microsoft/microsoft-graph-client');
const config = require('../../config/config');
require('isomorphic-fetch');

/**
 * Adds a specified number of days to a date.
 *
 * @param {Date} date - Starting date
 * @param {number} days - Number of days to add
 * @returns {Date} New date with added days
 */
function addDays(date, days) {
	const result = new Date(date.valueOf());
	result.setDate(result.getDate() + days);
	return result;
}

module.exports = {
	/**
	 * Retrieves all available room lists from Microsoft Graph.
	 *
	 * Uses the /places/microsoft.graph.roomlist endpoint and
	 * automatically paginates until the configured maximum count is reached.
	 *
	 * @async
	 * @param {Object} msalClient - MSAL client instance for authentication
	 * @returns {Promise<Object>} Object with value array of room lists (displayName, emailAddress)
	 */
	getRoomList: async (msalClient) => {
		const client = getAuthenticatedClient(msalClient);
		const maxItems = parseInt(config.calendarSearch.maxRoomLists);

		// Configure Graph API request for room lists
		const request = client
			.api('/places/microsoft.graph.roomlist')
			.select('displayName, emailAddress')
			.orderby('displayName')
			.top(Math.min(30, maxItems));

		const roomlist = await getPaginatedResults(request, maxItems);
		return { value: roomlist };
	},

	/**
	 * Retrieves all rooms of a specific room list.
	 *
	 * @async
	 * @param {Object} msalClient - MSAL client instance for authentication
	 * @param {string} email - Email address of the room list
	 * @returns {Promise<Object>} Object with value array of rooms (displayName, emailAddress)
	 */
	getRooms: async (msalClient, email) => {
		const client = getAuthenticatedClient(msalClient);
		const maxItems = parseInt(config.calendarSearch.maxRooms);

		// Configure Graph API request for rooms within a room list
		const request = client
			.api(`/places/${email}/microsoft.graph.roomlist/rooms`)
			.select('displayName,emailAddress')
			.orderby('displayName')
			.top(Math.min(30, maxItems));

		const rooms = await getPaginatedResults(request, maxItems);
		return { value: rooms };
	},

	/**
	 * Retrieves the calendar view (appointments) for a specific room.
	 *
	 * The time range extends from now until the configured
	 * maximum number of days (config.calendarSearch.maxDays).
	 *
	 * @async
	 * @param {Object} msalClient - MSAL client instance for authentication
	 * @param {string} email - Email address of the room
	 * @returns {Promise<Object>} Object with value array of appointments (organizer, subject, start, end, sensitivity)
	 */
	getCalendarView: async (msalClient, email) => {
		const client = getAuthenticatedClient(msalClient);
		const maxItems = parseInt(config.calendarSearch.maxItems);

		// Calculate time range: from now until maxDays in the future
		const start_datetime = new Date();
		const end_datetime = addDays(start_datetime, parseInt(config.calendarSearch.maxDays));

		// Configure Graph API request for the calendar view
		const request = client
			.api(`/users/${email}/calendar/calendarView`)
			.query(`startDateTime=${start_datetime.toISOString()}&endDateTime=${end_datetime.toISOString()}`)
			.select('organizer,subject,start,end,sensitivity')
			.orderby('Start/DateTime')
			.top(Math.min(30, maxItems));

		const events = await getPaginatedResults(request, maxItems);
		return { value: events };
	}
};

/**
 * Collects paginated results from the Microsoft Graph API.
 *
 * Automatically follows @odata.nextLink references until either
 * the desired maximum number of items is reached or
 * no more pages are available.
 *
 * @async
 * @param {Object} request - Configured Graph API request object
 * @param {number} maxItems - Maximum number of items to load
 * @returns {Promise<Array>} Array with the collected results
 */
async function getPaginatedResults(request, maxItems) {
	let results = [];
	let response = await request.get();
	
	// Add first page of results
	if (response.value) {
		results = results.concat(response.value);
	}
	
	// Follow pagination links until enough items are collected or no more pages remain
	while (response['@odata.nextLink'] && results.length < maxItems) {
		const remainingItems = maxItems - results.length;
		const nextPageSize = Math.min(30, remainingItems);
		
		// Extract nextLink and adjust the $top parameter for the remaining amount
		let nextUrl = response['@odata.nextLink'];
		nextUrl = nextUrl.replace(/\$top=\d+/, `$top=${nextPageSize}`);
		
		response = await request.client.api(nextUrl).get();
		
		if (response.value) {
			// Only add as many items as still needed
			const itemsToAdd = response.value.slice(0, remainingItems);
			results = results.concat(itemsToAdd);
		}
	}
	
	// Ensure maxItems is not exceeded
	return results.slice(0, maxItems);
}

/**
 * Creates an authenticated Microsoft Graph API client.
 *
 * Uses the MSAL client to obtain an access token via the
 * client credentials flow from Azure AD. The token is
 * requested fresh for each call (skipCache: true).
 *
 * @param {Object} msalClient - MSAL client instance for token acquisition
 * @returns {Object} Authenticated Microsoft Graph client
 * @throws {Error} If the MSAL client is invalid or missing
 */
function getAuthenticatedClient(msalClient) {
	if (!msalClient) {
		throw new Error(`Invalid MSAL state. Client: ${msalClient ? 'present' : 'missing'}`);
	}

	// Configure client credentials request
	// .default scope requests all configured app permissions
	const clientCredentialRequest = {
		scopes: [ 'https://graph.microsoft.com/.default' ],
		skipCache: true // (optional) Skip cache and force a new token from Azure AD
	};

	// Initialize Graph client with custom auth provider
	// that obtains the token via the application's MSAL instance
	const client = graph.Client.init({
		authProvider: async (done) => {
			try {
				const response = await msalClient.acquireTokenByClientCredential(clientCredentialRequest);

				// First parameter of the callback is the error,
				// set to null on success
				done(null, response.accessToken);
			} catch (err) {
				console.log(JSON.stringify(err, Object.getOwnPropertyNames(err)));
				done(err, null);
			}
		}
	});

	return client;
}
