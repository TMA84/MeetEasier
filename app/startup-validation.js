/**
* @file Startup Validation – Server configuration check at startup.
*
* Validates the configuration before server startup and categorizes
* issues into errors (blocking), warnings, and informational messages.
* In strict mode, warnings also cause an abort.
*
* @module startup-validation
*/

const fs = require('fs');
const path = require('path');
const certGenerator = require('./cert-generator');

/**
* Checks whether a value is considered "truthy" (boolean `true` or string `'true'`).
*
* @param {*} value – The value to check.
* @returns {boolean} `true` if the value is truthy.
*/
function _isTruthy(value) {
  return value === true || value === 'true';
}

/**
* Validates the server configuration and returns a report.
*
* Checks OAuth configuration, API token, polling interval, webhook
* settings, and the existence of the cache file. Issues are
* categorized into three groups:
* - `errors`: Critical errors that should prevent startup.
* - `warnings`: Potential issues that should be noted.
* - `info`: Informational notes about the current configuration status.
*
* @param {Object} config – The server configuration object.
* @returns {Object} Validation report with errors, warnings, info, hasErrors, and hasWarnings.
*/
/**
 * Validates OAuth / Graph API configuration.
 * @param {Object} config
 * @returns {{ errors: string[], warnings: string[], info: string[] }}
 */
function _validateOAuthConfig(config) {
  const info = [];
  const hasGraphClientId = config?.msalConfig?.auth?.clientId && config.msalConfig.auth.clientId !== 'OAUTH_CLIENT_ID_NOT_SET';
  const hasGraphAuthority = config?.msalConfig?.auth?.authority && config.msalConfig.auth.authority !== 'OAUTH_AUTHORITY_NOT_SET';
  const hasGraphSecret = config?.msalConfig?.auth?.clientSecret && config.msalConfig.auth.clientSecret !== 'OAUTH_CLIENT_SECRET_NOT_SET';
  const hasCertificate = !!certGenerator.getCertificateInfo();

  const missingOAuthValues = [];
  if (!hasGraphClientId) { missingOAuthValues.push('OAUTH_CLIENT_ID'); }
  if (!hasGraphAuthority) { missingOAuthValues.push('OAUTH_AUTHORITY'); }
  if (!hasGraphSecret && !hasCertificate) { missingOAuthValues.push('OAUTH_CLIENT_SECRET or Certificate'); }

  if (missingOAuthValues.length > 0) {
    info.push(`OAuth is not fully configured yet (${missingOAuthValues.join(', ')} missing). Server starts so credentials can be set via Admin panel.`);
  }
  return { errors: [], warnings: [], info };
}

/**
 * Validates API token configuration.
 * @param {Object} config
 * @returns {{ errors: string[], warnings: string[], info: string[] }}
 */
function _validateApiToken(config) {
  const warnings = [];
  const info = [];
  if (!config.apiToken) {
    info.push('Admin API token is not configured yet. First admin login will require creating an initial token.');
  } else if (config.apiToken === 'change-me-admin-token') {
    warnings.push('Legacy default API token is active. Change it in Admin panel or set API_TOKEN in environment.');
  }
  return { errors: [], warnings, info };
}

/**
 * Validates search and webhook configuration.
 * @param {Object} config
 * @returns {{ errors: string[], warnings: string[], info: string[] }}
 */
function _validateSearchAndWebhook(config) {
  const errors = [];
  const warnings = [];
  const info = [];

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

  return { errors, warnings, info };
}

function validateStartupConfig(config) {
  const errors = [];
  const warnings = [];
  const info = [];

  const groups = [
    _validateOAuthConfig(config),
    _validateApiToken(config),
    _validateSearchAndWebhook(config)
  ];

  for (const group of groups) {
    errors.push(...group.errors);
    warnings.push(...group.warnings);
    info.push(...group.info);
  }

  return {
    errors,
    warnings,
    info,
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0
  };
}

/**
* Prints the validation report to the console and aborts on errors.
*
* Errors are output via `console.error`, warnings via `console.warn`, and
* informational messages via `console.log`. If errors are present,
* an Error is thrown. In strict mode (`strictMode`), warnings also
* cause an abort.
*
* @param {Object} report – The validation report from {@link validateStartupConfig}.
* @param {boolean} strictMode – If `true`, warnings also cause an abort.
* @throws {Error} On validation errors or (in strict mode) on warnings.
*/
function printStartupValidation(report, strictMode) {
  // Output errors
  if (report.errors.length) {
    console.error('Startup validation errors:');
    report.errors.forEach(item => console.error(`  - ${item}`));
  }

  // Output warnings
  if (report.warnings.length) {
    console.warn('Startup validation warnings:');
    report.warnings.forEach(item => console.warn(`  - ${item}`));
  }

  // Output informational messages
  if (report.info.length) {
    report.info.forEach(item => console.log(`Startup info: ${item}`));
  }

  // Abort server startup on errors
  if (report.errors.length) {
    throw new Error('Startup validation failed. Resolve required configuration errors and restart.');
  }

  // In strict mode, also abort on warnings
  if (strictMode && report.warnings.length) {
    throw new Error('Startup validation failed in strict mode.');
  }
}

module.exports = {
  validateStartupConfig,
  printStartupValidation
};
