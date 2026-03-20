/**
 * @file cachePlugin.js
 * @description MSAL Token Cache Plugin for file-system-based persistence.
 *              Implements the beforeCacheAccess and afterCacheAccess callbacks
 *              used by MSAL for serialization and deserialization of the token cache.
 *              Stores the cache as a JSON file on disk.
 *
 * @copyright Copyright (c) Microsoft Corporation. All rights reserved.
 * @license MIT
 *
 * @requires fs - Node.js file system module
 */
const fs = require('fs');

/**
 * Creates an MSAL cache plugin for file-system-based token persistence.
 *
 * The plugin provides two callbacks:
 * - beforeCacheAccess: Loads the cache from the file before MSAL accesses it
 * - afterCacheAccess: Writes the cache to the file when it has changed
 *
 * @param {string} cacheLocation - File path for the cache file
 * @returns {Object} Cache plugin object with beforeCacheAccess and afterCacheAccess callbacks
 */
module.exports = function(cacheLocation) {

	/**
	 * Called before each MSAL cache access.
	 *
	 * Reads the serialized token cache from the file and deserializes
	 * it into the MSAL cache context. If the file does not yet exist,
	 * it is created with the current (empty) cache content.
	 *
	 * @param {Object} cacheContext - MSAL cache context with tokenCache instance
	 * @returns {Promise<void>}
	 */
	const beforeCacheAccess = (cacheContext) => {
		return new Promise((resolve, reject) => {
			if (fs.existsSync(cacheLocation)) {
				// Cache file exists: read content and deserialize into the token cache
				fs.readFile(cacheLocation, 'utf-8', (err, data) => {
					if (err) {
						reject();
					} else {
						cacheContext.tokenCache.deserialize(data);
						resolve();
					}
				});
			} else {
				// Cache file does not exist yet: create with current cache content
				fs.writeFile(cacheLocation, cacheContext.tokenCache.serialize(), (err) => {
					if (err) {
						reject();
					}
				});
			}
		});
	};

	/**
	 * Called after each MSAL cache access.
	 *
	 * Writes the updated token cache to the file, but only when
	 * the cache has actually changed since the last access.
	 * This avoids unnecessary write operations to disk.
	 *
	 * @param {Object} cacheContext - MSAL cache context with cacheHasChanged flag
	 * @returns {Promise<void>}
	 */
	const afterCacheAccess = (cacheContext) => {
		return new Promise((resolve, reject) => {
			if (cacheContext.cacheHasChanged) {
				// Cache has changed: write updated content to the file
				fs.writeFile(cacheLocation, cacheContext.tokenCache.serialize(), (err) => {
					if (err) {
						reject(err);
					}
					resolve();
				});
			} else {
				// No changes: resolve directly without write operation
				resolve();
			}
		});
	};

	return {
		beforeCacheAccess,
		afterCacheAccess
	};
};
