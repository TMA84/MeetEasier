const fs = require('fs');
const path = require('path');

function isTruthy(value) {
	return value === true || value === 'true';
}

function validateStartupConfig(config) {
	const errors = [];
	const warnings = [];
	const info = [];

	const useGraphApi = true;
	const hasGraphClientId = config?.msalConfig?.auth?.clientId && config.msalConfig.auth.clientId !== 'OAUTH_CLIENT_ID_NOT_SET';
	const hasGraphAuthority = config?.msalConfig?.auth?.authority && config.msalConfig.auth.authority !== 'OAUTH_AUTHORITY_NOT_SET';
	const hasGraphSecret = config?.msalConfig?.auth?.clientSecret && config.msalConfig.auth.clientSecret !== 'OAUTH_CLIENT_SECRET_NOT_SET';

	if (useGraphApi) {
		const missingOAuthValues = [];
		if (!hasGraphClientId) {
			missingOAuthValues.push('OAUTH_CLIENT_ID');
		}
		if (!hasGraphAuthority) {
			missingOAuthValues.push('OAUTH_AUTHORITY');
		}
		if (!hasGraphSecret) {
			missingOAuthValues.push('OAUTH_CLIENT_SECRET');
		}

		if (missingOAuthValues.length > 0) {
			info.push(`OAuth is not fully configured yet (${missingOAuthValues.join(', ')} missing). Server starts so credentials can be set via Admin panel.`);
		}
	}

	if (!config.apiToken) {
		errors.push('Admin API token is not configured.');
	} else if (config.apiToken === 'change-me-admin-token') {
		warnings.push('Default API token is active. Change it in Admin panel or set API_TOKEN in environment.');
	}

	if (!Number.isFinite(config.calendarSearch.pollIntervalMs) || config.calendarSearch.pollIntervalMs < 5000) {
		errors.push('SEARCH_POLL_INTERVAL_MS must be a number >= 5000.');
	}

	if (config.graphWebhook.enabled && !config.graphWebhook.clientState) {
		warnings.push('GRAPH_WEBHOOK_ENABLED is true but GRAPH_WEBHOOK_CLIENT_STATE is empty. Signature validation is weakened.');
	}

	if (config.graphWebhook.enabled && (!Array.isArray(config.graphWebhook.allowedIps) || config.graphWebhook.allowedIps.length === 0)) {
		warnings.push('GRAPH_WEBHOOK_ENABLED is true but GRAPH_WEBHOOK_ALLOWED_IPS is empty. Origin filtering is disabled.');
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
