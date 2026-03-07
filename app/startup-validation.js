const fs = require('fs');
const path = require('path');

function isTruthy(value) {
	return value === true || value === 'true';
}

function validateStartupConfig(config) {
	const errors = [];
	const warnings = [];
	const info = [];

	const useGraphApi = isTruthy(config.calendarSearch.useGraphAPI);

	if (useGraphApi) {
		if (!process.env.OAUTH_CLIENT_ID) {
			errors.push('OAUTH_CLIENT_ID is required when SEARCH_USE_GRAPHAPI=true.');
		}
		if (!process.env.OAUTH_AUTHORITY) {
			errors.push('OAUTH_AUTHORITY is required when SEARCH_USE_GRAPHAPI=true.');
		}
		if (!process.env.OAUTH_CLIENT_SECRET) {
			errors.push('OAUTH_CLIENT_SECRET is required when SEARCH_USE_GRAPHAPI=true.');
		}
	} else {
		if (!process.env.EWS_USERNAME) {
			errors.push('EWS_USERNAME is required when SEARCH_USE_GRAPHAPI=false.');
		}
		if (!process.env.EWS_PASSWORD) {
			errors.push('EWS_PASSWORD is required when SEARCH_USE_GRAPHAPI=false.');
		}
		if (!process.env.EWS_URI) {
			errors.push('EWS_URI is required when SEARCH_USE_GRAPHAPI=false.');
		}
	}

	if (!config.apiToken) {
		errors.push('API_TOKEN is required for protected admin operations.');
	}

	if (!Number.isFinite(config.calendarSearch.pollIntervalMs) || config.calendarSearch.pollIntervalMs < 5000) {
		errors.push('SEARCH_POLL_INTERVAL_MS must be a number >= 5000.');
	}

	if (config.graphWebhook.enabled && !config.graphWebhook.clientState) {
		warnings.push('GRAPH_WEBHOOK_ENABLED is true but GRAPH_WEBHOOK_CLIENT_STATE is empty. Signature validation is weakened.');
	}

	const cacheFile = path.join(__dirname, '../data/cache.json');
	if (!fs.existsSync(cacheFile)) {
		info.push('MS Graph cache file does not exist yet (data/cache.json). It will be created on first token caching event.');
	}

	return {
		errors,
		warnings,
		info,
		hasErrors: errors.length > 0,
		hasWarnings: warnings.length > 0
	};
}

function printStartupValidation(report, strictMode) {
	if (report.errors.length) {
		console.error('Startup validation errors:');
		report.errors.forEach(item => console.error(`  - ${item}`));
	}

	if (report.warnings.length) {
		console.warn('Startup validation warnings:');
		report.warnings.forEach(item => console.warn(`  - ${item}`));
	}

	if (report.info.length) {
		report.info.forEach(item => console.log(`Startup info: ${item}`));
	}

	if (report.errors.length) {
		throw new Error('Startup validation failed. Resolve required configuration errors and restart.');
	}

	if (strictMode && report.warnings.length) {
		throw new Error('Startup validation failed in strict mode.');
	}
}

module.exports = {
	validateStartupConfig,
	printStartupValidation
};
