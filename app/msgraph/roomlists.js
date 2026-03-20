/**
 * @file roomlists.js
 * @description Module for querying all room list names via the Microsoft Graph API.
 *              Returns an array of display names of all available room lists.
 *
 * @requires ./graph - Graph API helper functions
 */
var graph = require('./graph');

/**
 * Retrieves the display names of all available room lists.
 *
 * Uses the Graph API to load all room lists and extracts
 * only the displayName values as a flat string array.
 *
 * @param {Function} callback - Callback function (err, roomLists)
 * @param {Error|null} callback.err - Error object or null on success
 * @param {string[]|null} callback.roomLists - Array of room list display names or null on error
 * @param {Object} msalClient - MSAL client instance for authentication
 */
module.exports = function(callback, msalClient) {
	graph
		.getRoomList(msalClient)
		.then(
			(lists) => {
				// Extract display names from the room list objects
				var roomLists = [];
				lists.value.forEach(function(item, i, array) {
					roomLists.push(item.displayName);
				});
				callback(null, roomLists);
			},
			(err) => {
				callback(err, null);
			}
		)
		.catch((err) => callback(err, null));
};
