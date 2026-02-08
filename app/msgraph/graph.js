const graph = require('@microsoft/microsoft-graph-client');
const config = require('../../config/config');
require('isomorphic-fetch');

// TODO: Move this somewhere else?
Date.prototype.addDays = function(days) {
	const date = new Date(this.valueOf());
	date.setDate(date.getDate() + days);
	return date;
};

module.exports = {
	getRoomList: async (msalClient) => {
		const client = getAuthenticatedClient(msalClient);
		const maxItems = parseInt(config.calendarSearch.maxRoomLists);

		const request = client
			.api('/places/microsoft.graph.roomlist')
			.select('displayName, emailAddress')
			.orderby('displayName')
			.top(Math.min(30, maxItems));

		const roomlist = await getPaginatedResults(request, maxItems);
		return { value: roomlist };
	},

	getRooms: async (msalClient, email) => {
		const client = getAuthenticatedClient(msalClient);
		const maxItems = parseInt(config.calendarSearch.maxRooms);

		const request = client
			.api(`/places/${email}/microsoft.graph.roomlist/rooms`)
			.select('displayName,emailAddress')
			.orderby('displayName')
			.top(Math.min(30, maxItems));

		const rooms = await getPaginatedResults(request, maxItems);
		return { value: rooms };
	},

	getCalendarView: async (msalClient, email) => {
		const client = getAuthenticatedClient(msalClient);
		const maxItems = parseInt(config.calendarSearch.maxItems);

		const start_datetime = new Date();
		const end_datetime = start_datetime.addDays(parseInt(config.calendarSearch.maxDays));

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

async function getPaginatedResults(request, maxItems) {
	let results = [];
	let response = await request.get();
	
	// Add initial results
	if (response.value) {
		results = results.concat(response.value);
	}
	
	// Follow pagination links until we have enough items or no more pages
	while (response['@odata.nextLink'] && results.length < maxItems) {
		const remainingItems = maxItems - results.length;
		const nextPageSize = Math.min(30, remainingItems);
		
		// Extract the nextLink and modify the $top parameter
		let nextUrl = response['@odata.nextLink'];
		nextUrl = nextUrl.replace(/\$top=\d+/, `$top=${nextPageSize}`);
		
		response = await request.client.api(nextUrl).get();
		
		if (response.value) {
			const itemsToAdd = response.value.slice(0, remainingItems);
			results = results.concat(itemsToAdd);
		}
	}
	
	// Ensure we don't exceed maxItems
	return results.slice(0, maxItems);
}

function getAuthenticatedClient(msalClient) {
	if (!msalClient) {
		throw new Error(`Invalid MSAL state. Client: ${msalClient ? 'present' : 'missing'}`);
	}

	const clientCredentialRequest = {
		scopes: [ '.default' ],
		skipCache: true // (optional) this skips the cache and forces MSAL to get a new token from Azure AD
	};

	// Initialize Graph client
	const client = graph.Client.init({
		// Implement an auth provider that gets a token
		// from the app's MSAL instance
		authProvider: async (done) => {
			try {
				const response = await msalClient.acquireTokenByClientCredential(clientCredentialRequest);

				// First param to callback is the error,
				// Set to null in success case
				done(null, response.accessToken);
			} catch (err) {
				console.log(JSON.stringify(err, Object.getOwnPropertyNames(err)));
				done(err, null);
			}
		}
	});

	return client;
}
