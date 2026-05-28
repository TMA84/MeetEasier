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
      .select('displayName,emailAddress,capacity')
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
  },

  /**
  * Retrieves calendar views for multiple rooms in a single batched request.
  * Uses Microsoft Graph JSON Batching (up to 20 requests per batch).
  *
  * @async
  * @param {Object} msalClient - MSAL client instance for authentication
  * @param {string[]} emails - Array of room email addresses
  * @returns {Promise<Map<string, Object>>} Map of email → { value: appointments[] } or { error: message }
  */
  getCalendarViewBatch: async (msalClient, emails) => {
    if (!emails || emails.length === 0) return new Map();

    const maxItems = parseInt(config.calendarSearch.maxItems);
    const start_datetime = new Date();
    const end_datetime = addDays(start_datetime, parseInt(config.calendarSearch.maxDays));
    const startISO = start_datetime.toISOString();
    const endISO = end_datetime.toISOString();

    const results = new Map();
    const BATCH_SIZE = 20; // Graph API limit per batch

    // Process in chunks of 20
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const chunk = emails.slice(i, i + BATCH_SIZE);

      const batchRequests = chunk.map((email, idx) => ({
        id: String(i + idx),
        method: 'GET',
        url: `/users/${email}/calendar/calendarView?startDateTime=${startISO}&endDateTime=${endISO}&$select=id,organizer,subject,start,end,sensitivity&$orderby=Start/DateTime&$top=${Math.min(30, maxItems)}`
      }));

      try {
        const client = getAuthenticatedClient(msalClient);
        const batchResponse = await client
          .api('/$batch')
          .post({ requests: batchRequests });

        if (batchResponse && batchResponse.responses) {
          let hasAuthError = false;
          for (const resp of batchResponse.responses) {
            const idx = parseInt(resp.id, 10);
            const email = emails[idx];
            if (!email) {
              console.warn(`[Graph Batch] Response id=${resp.id} has no matching email (idx=${idx}, emails.length=${emails.length})`);
              continue;
            }
            if (resp.status === 200 && resp.body && resp.body.value) {
              results.set(email, { value: resp.body.value.slice(0, maxItems) });
            } else {
              if (resp.status === 401 || resp.status === 403) hasAuthError = true;
              const errMsg = resp.body?.error?.message || `HTTP ${resp.status}`;
              console.warn(`[Graph Batch] Error for ${email}: ${errMsg}`);
              results.set(email, { error: errMsg });
            }
          }
          // If auth errors occurred, invalidate token cache so next poll gets a fresh token
          if (hasAuthError) {
            console.warn('[Graph Batch] Auth error detected — invalidating token cache');
            _cachedToken = null;
            _tokenExpiresAt = 0;
          }
        } else {
          console.warn('[Graph Batch] No responses in batch result:', JSON.stringify(batchResponse).substring(0, 200));
          // Invalidate token in case the batch itself failed due to auth
          _cachedToken = null;
          _tokenExpiresAt = 0;
        }
      } catch (err) {
        // On batch failure, invalidate token and mark all rooms as errored
        console.error('[Graph Batch] Request failed:', err.message);
        _cachedToken = null;
        _tokenExpiresAt = 0;
        for (const email of chunk) {
          if (!results.has(email)) {
            results.set(email, { error: err.message || 'Batch request failed' });
          }
        }
      }
    }

    return results;
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
* client credentials flow from Azure AD. MSAL automatically
* caches tokens and only requests a new one when expired.
*
* @param {Object} msalClient - MSAL client instance for token acquisition
* @returns {Object} Authenticated Microsoft Graph client
* @throws {Error} If the MSAL client is invalid or missing
*/
function getAuthenticatedClient(msalClient) {
  if (!msalClient) {
    throw new Error(`Invalid MSAL state. Client: ${msalClient ? 'present' : 'missing'}`);
  }

  // Initialize Graph client with custom auth provider
  // Uses application-level token cache to avoid redundant Azure AD calls
  const client = graph.Client.init({
    authProvider: async (done) => {
      try {
        const token = await _getAccessToken(msalClient);
        done(null, token);
      } catch (err) {
        console.log(JSON.stringify(err, Object.getOwnPropertyNames(err)));
        done(err, null);
      }
    },
    defaultVersion: 'v1.0',
    fetchOptions: {
      timeout: 15000
    }
  });

  return client;
}

/** @type {string|null} Application-level cached access token */
let _cachedToken = null;
/** @type {number} Token expiry timestamp (ms) */
let _tokenExpiresAt = 0;
/** @type {Promise|null} Pending token refresh (prevents concurrent refreshes) */
let _tokenRefreshPromise = null;

/**
* Gets an access token, using an application-level cache.
* Only calls Azure AD when the token is expired or about to expire (5 min buffer).
* Prevents concurrent refresh calls via a shared promise.
* @param {Object} msalClient - MSAL client instance
* @returns {Promise<string>} Access token
*/
async function _getAccessToken(msalClient) {
  const now = Date.now();
  // Return cached token if still valid (with 5 min buffer before expiry)
  if (_cachedToken && _tokenExpiresAt > now + 5 * 60 * 1000) {
    return _cachedToken;
  }

  // If a refresh is already in progress, wait for it
  if (_tokenRefreshPromise) {
    return _tokenRefreshPromise;
  }

  // Start a new refresh
  _tokenRefreshPromise = (async () => {
    try {
      const response = await msalClient.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default']
      });

      _cachedToken = response.accessToken;
      _tokenExpiresAt = response.expiresOn ? response.expiresOn.getTime() : (now + 3600 * 1000);
      console.log(`[Graph] New token acquired, expires at ${new Date(_tokenExpiresAt).toISOString()}`);
      return _cachedToken;
    } finally {
      _tokenRefreshPromise = null;
    }
  })();

  return _tokenRefreshPromise;
}

// Export token accessor for shared use by booking.js
module.exports._getAccessToken = _getAccessToken;
