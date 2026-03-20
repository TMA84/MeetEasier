/**
 * @file app/routes.js
 * @description Central route definitions for the Meet-Easier application.
 *
 * This file defines all Express API endpoints, middleware functions
 * and helper functions for:
 * - Microsoft Graph API communication (calendars, rooms, room lists)
 * - Room booking, meeting extension and early termination
 * - Check-in management for meetings
 * - Admin authentication (token, cookie, CSRF)
 * - Configuration management (OAuth, system, MQTT, WiFi, logo, sidebar, etc.)
 * - Power management and display control via MQTT
 * - Maintenance mode, audit logging and configuration backup/restore
 * - IP whitelisting and rate limiting
 * - Automatic translation via external translation API
 */

const msal = require('@azure/msal-node');
const config = require('../config/config');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const roomlistAliasHelper = require('./roomlist-alias-helper');
const configManager = require('./config-manager');
const certGenerator = require('./cert-generator');
const { createRateLimiter } = require('./rate-limiter');
const { appendAuditLog, getAuditLogs } = require('./audit-logger');
const checkinManager = require('./checkin-manager');
const demoData = require('./demo-data');

/** @type {msal.ConfidentialClientApplication|null} MSAL client instance for Microsoft Graph authentication */
let msalClient = null;

/** @type {boolean} Indicates whether the application is running in production mode */
const isProductionEnv = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

/**
 * Returns a safe error message for the client.
 * In production mode or when detailed errors are disabled,
 * the fallback message is returned to hide internal details.
 * @param {Error} error - The error object that occurred
 * @param {string} fallbackMessage - Safe default message for the client
 * @returns {string} The safe error message
 */
function getClientSafeErrorMessage(error, fallbackMessage) {
	if (isProductionEnv || config.systemDefaults?.exposeDetailedErrors !== true) {
		return fallbackMessage;
	}

	const message = String(error?.message || '').trim();
	return message || fallbackMessage;
}

/**
 * Sanitizes an error object for safe logging.
 * Extracts only relevant fields (name, message, code, status)
 * and prevents logging of sensitive data.
 * @param {Error|*} error - The error object to sanitize
 * @returns {Object} Sanitized error object with safe fields
 */
function sanitizeErrorForLog(error) {
	if (!error || typeof error !== 'object') {
		return {
			message: String(error || 'Unknown error')
		};
	}

	return {
		name: error.name,
		message: error.message,
		code: error.code || error.body?.error?.code,
		status: error.status || error.statusCode
	};
}

/**
 * Logs a sanitized error with optional additional information.
 * @param {string} label - Descriptive label for the error context
 * @param {Error} error - The error object that occurred
 * @param {*} [extra] - Optional additional information about the error context
 */
function logSanitizedError(label, error, extra = undefined) {
	if (extra) {
		console.error(label, {
			error: sanitizeErrorForLog(error),
			extra
		});
		return;
	}

	console.error(label, sanitizeErrorForLog(error));
}

/**
 * Checks whether a value is a valid email address.
 * Validates format and maximum length (320 characters).
 * @param {string} value - The value to check
 * @returns {boolean} true if valid email address
 */
function isValidEmailAddress(value) {
	const normalized = String(value || '').trim();
	if (!normalized || normalized.length > 320) {
		return false;
	}

	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

/**
 * Checks whether a value is a valid GUID (UUID v1-v5).
 * @param {string} value - The value to check
 * @returns {boolean} true if valid GUID
 */
function isValidGuid(value) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

/**
 * Checks whether a URL is a valid Microsoft authority URL.
 * Only accepts login.microsoftonline.com with a tenant segment in the path.
 * @param {string} authorityValue - The authority URL to check
 * @returns {boolean} true if valid Microsoft authority
 */
function isValidMicrosoftAuthority(authorityValue) {
	const normalized = String(authorityValue || '').trim();
	if (!normalized) {
		return false;
	}

	try {
		const parsed = new URL(normalized);
		const host = String(parsed.hostname || '').toLowerCase();
		if (host !== 'login.microsoftonline.com') {
			return false;
		}

		const tenantSegment = String(parsed.pathname || '').split('/').filter(Boolean)[0] || '';
		return !!tenantSegment;
	} catch (error) {
		return false;
	}
}

/**
 * Returns the configured settings for Graph API requests.
 * Includes timeout, retry attempts and base wait time.
 * @returns {{timeoutMs: number, retryAttempts: number, retryBaseMs: number}} Graph fetch settings
 */
function getGraphFetchSettings() {
	return {
		timeoutMs: Math.max(Number.parseInt(config.systemDefaults?.graphFetchTimeoutMs, 10) || 10000, 1000),
		retryAttempts: Math.max(Number.parseInt(config.systemDefaults?.graphFetchRetryAttempts, 10) || 2, 0),
		retryBaseMs: Math.max(Number.parseInt(config.systemDefaults?.graphFetchRetryBaseMs, 10) || 250, 50)
	};
}

/**
 * Checks whether a Graph API error is retryable.
 * Retryable errors are: aborts, timeouts, network errors, HTTP 429 and 5xx.
 * @param {Error} error - The error object to check
 * @returns {boolean} true if the error is retryable
 */
function isRetryableGraphError(error) {
	if (!error) {
		return false;
	}

	const message = String(error?.message || '').toLowerCase();
	if (message.includes('aborted') || message.includes('timeout') || message.includes('network')) {
		return true;
	}

	const status = Number(error?.status || error?.statusCode || 0);
	return status === 429 || status >= 500;
}

/**
 * Creates a delay (Promise-based).
 * @param {number} ms - Wait time in milliseconds
 * @returns {Promise<void>}
 */
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Performs an HTTP fetch against the Microsoft Graph API.
 * Supports automatic retries with exponential backoff
 * for timeouts, network errors, HTTP 429 (rate limit) and 5xx errors.
 * @param {string} url - The Graph API URL
 * @param {Object} [options={}] - Fetch options (headers, method, body etc.)
 * @returns {Promise<Response>} The HTTP response
 * @throws {Error} When all retry attempts fail
 */
async function graphFetch(url, options = {}) {
	const settings = getGraphFetchSettings();
	let lastError = null;

	for (let attempt = 0; attempt <= settings.retryAttempts; attempt += 1) {
		const controller = new AbortController();
		const timeoutHandle = setTimeout(() => controller.abort(), settings.timeoutMs);

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal
			});

			if (!response.ok && (response.status === 429 || response.status >= 500)) {
				const retryError = new Error(`Graph HTTP ${response.status}`);
				retryError.status = response.status;
				if (attempt < settings.retryAttempts) {
					await delay(settings.retryBaseMs * Math.pow(2, attempt));
					continue;
				}
			}

			return response;
		} catch (error) {
			lastError = error;
			if (attempt < settings.retryAttempts && isRetryableGraphError(error)) {
				await delay(settings.retryBaseMs * Math.pow(2, attempt));
				continue;
			}
			throw error;
		} finally {
			clearTimeout(timeoutHandle);
		}
	}

	throw lastError || new Error('Graph request failed');
}

/**
 * Creates a new MSAL client instance with the current configuration.
 * Uses certificate-based auth if available, otherwise falls back to client secret.
 * Called at startup and after OAuth configuration changes.
 * @returns {msal.ConfidentialClientApplication} The new MSAL client instance
 */
function refreshMsalClient() {
	// Try certificate-based auth first
	const encryptionKey = configManager.getEffectiveApiToken();
	if (encryptionKey) {
		const certConfig = certGenerator.getMsalCertificateConfig(encryptionKey);
		if (certConfig) {
			const msalConfigCopy = {
				auth: {
					clientId: config.msalConfig.auth.clientId,
					authority: config.msalConfig.auth.authority,
					clientCertificate: certConfig
				},
				system: config.msalConfig.system
			};
			msalClient = new msal.ConfidentialClientApplication(msalConfigCopy);
			console.log('[Routes] MSAL client initialized with certificate authentication');
			return msalClient;
		}
	}
	msalClient = new msal.ConfidentialClientApplication(config.msalConfig);
	return msalClient;
}

refreshMsalClient();

/** @type {boolean|null} Cache for Calendars.ReadWrite permission (null = not yet checked) */
let hasCalendarWritePermission = null;

/** @type {{checkedAt: number, result: Object|null}} Cache for Graph auth health check */
let graphAuthHealthCache = {
	checkedAt: 0,
	result: null
};

/** @const {string} Name of the admin authentication cookie */
const ADMIN_AUTH_COOKIE_NAME = 'meeteasier_admin_auth';
/** @const {string} Name of the CSRF protection cookie */
const CSRF_COOKIE_NAME = 'meeteasier_csrf';

/**
 * Checks whether an environment variable is defined.
 * @param {string} name - Name of the environment variable
 * @returns {boolean} true if the variable is defined
 */
function isEnvDefined(name) {
	return process.env[name] !== undefined;
}

/**
 * Checks whether OAuth configuration is set via environment variables.
 * @returns {boolean} true if at least one OAuth environment variable is defined
 */
function isOAuthEnvConfigured() {
	return isEnvDefined('OAUTH_CLIENT_ID')
		|| isEnvDefined('OAUTH_AUTHORITY')
		|| isEnvDefined('OAUTH_CLIENT_SECRET');
}

/**
 * Checks whether the system configuration is locked via environment variables.
 * @returns {boolean} true if system configuration is locked by env
 */
function isSystemEnvConfigured() {
	return configManager.isSystemEnvLocked();
}

/**
 * Checks whether the maintenance mode configuration is set via environment variables.
 * @returns {boolean} true if maintenance mode is configured by env
 */
function isMaintenanceEnvConfigured() {
	return isEnvDefined('MAINTENANCE_MODE')
		|| isEnvDefined('MAINTENANCE_MESSAGE');
}

/**
 * Checks whether the translation API configuration is set via environment variables.
 * @returns {boolean} true if at least one AUTO_TRANSLATE environment variable is defined
 */
function isTranslationApiEnvConfigured() {
	return isEnvDefined('AUTO_TRANSLATE_ENABLED')
		|| isEnvDefined('AUTO_TRANSLATE_URL')
		|| isEnvDefined('AUTO_TRANSLATE_API_KEY')
		|| isEnvDefined('AUTO_TRANSLATE_TIMEOUT_MS');
}

/**
 * Normalizes an auth token: removes "Bearer " prefix and whitespace.
 * @param {string} rawToken - The raw token from the header
 * @returns {string} The sanitized token
 */
function normalizeAuthToken(rawToken) {
	if (typeof rawToken !== 'string') {
		return '';
	}

	return rawToken.replace(/^Bearer\s+/i, '').trim();
}

/**
 * Parses the cookies from the request header into a key-value object.
 * @param {Object} req - Express request object
 * @returns {Object.<string, string>} Object with cookie name as key and cookie value as value
 */
function parseCookies(req) {
	const rawCookie = String(req?.headers?.cookie || '').trim();
	if (!rawCookie) {
		return {};
	}

	return rawCookie.split(';').reduce((cookies, pair) => {
		const [namePart, ...valueParts] = pair.split('=');
		const name = String(namePart || '').trim();
		if (!name) {
			return cookies;
		}

		const value = valueParts.join('=').trim();
		try {
			cookies[name] = decodeURIComponent(value);
		} catch (error) {
			cookies[name] = value;
		}

		return cookies;
	}, {});
}

/**
 * Reads the admin authentication cookie from the request.
 * @param {Object} req - Express request object
 * @returns {string} The cookie value or empty string
 */
function getAdminAuthCookie(req) {
	const cookies = parseCookies(req);
	return cookies[ADMIN_AUTH_COOKIE_NAME] || '';
}

/**
 * Returns the cookie options for the admin auth cookie.
 * In production mode the secure flag is set.
 * @returns {Object} Cookie options (httpOnly, sameSite, secure, path, maxAge)
 */
function getAdminCookieOptions() {
	const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
	return {
		httpOnly: true,
		sameSite: 'strict',
		secure: isProduction,
		path: '/',
		maxAge: 60 * 60 * 1000 // 1 hour validity
	};
}

/**
 * Sets the admin authentication cookie in the response.
 * @param {Object} res - Express response object
 * @param {string} token - The auth token to set
 */
function setAdminAuthCookie(res, token) {
	res.cookie(ADMIN_AUTH_COOKIE_NAME, String(token || ''), getAdminCookieOptions());
}

/**
 * Clears the admin auth cookie and the CSRF cookie from the response.
 * @param {Object} res - Express response object
 */
function clearAdminAuthCookie(res) {
	res.clearCookie(ADMIN_AUTH_COOKIE_NAME, getAdminCookieOptions());
	res.clearCookie(CSRF_COOKIE_NAME, getCsrfCookieOptions());
}

/**
 * Generates a cryptographically secure CSRF token (64 hex characters).
 * @returns {string} The generated CSRF token
 */
function generateCsrfToken() {
	return crypto.randomBytes(32).toString('hex');
}

/**
 * Returns the cookie options for the CSRF cookie.
 * httpOnly is false so that JavaScript can read the cookie.
 * @returns {Object} Cookie options
 */
function getCsrfCookieOptions() {
	const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
	return {
		httpOnly: false, // Must be readable by JavaScript
		sameSite: 'strict',
		secure: isProduction,
		path: '/',
		maxAge: 60 * 60 * 1000 // 1 hour validity
	};
}

/**
 * Sets a new CSRF cookie in the response and returns the token.
 * @param {Object} res - Express response object
 * @returns {string} The generated CSRF token
 */
function setCsrfCookie(res) {
	const token = generateCsrfToken();
	res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
	return token;
}

/**
 * Validates CSRF protection for a request.
 * CSRF protection only applies to cookie-based authentication.
 * Token-based auth (Authorization/X-API-Token header) is not vulnerable to CSRF.
 * @param {Object} req - Express request object
 * @returns {boolean} true if CSRF validation passed
 */
function validateCsrf(req) {
	// CSRF only applies to cookie-based authentication
	const hasAuthHeader = !!(req.headers['authorization'] || req.headers['x-api-token']);
	if (hasAuthHeader) {
		return true; // Token-based auth is not vulnerable to CSRF
	}

	// For cookie-based auth: validate CSRF token
	const cookies = parseCookies(req);
	const csrfCookie = cookies[CSRF_COOKIE_NAME] || '';
	const csrfHeader = req.headers['x-csrf-token'] || '';

	if (!csrfCookie || !csrfHeader) {
		return false;
	}

	return csrfCookie === csrfHeader;
}

/**
 * Checks whether the request contains a valid admin auth cookie.
 * @param {Object} req - Express request object
 * @returns {boolean} true if valid admin cookie is present
 */
function hasValidAdminAuthCookie(req) {
	const providedToken = normalizeAuthToken(getAdminAuthCookie(req));
	const expectedToken = configManager.getEffectiveApiToken();
	return secureTokenEquals(providedToken, expectedToken);
}

/**
 * Compares two tokens in constant time (timing-safe) to prevent timing attacks.
 * @param {string} providedToken - The token provided by the client
 * @param {string} expectedToken - The expected token
 * @returns {boolean} true if the tokens match
 */
function secureTokenEquals(providedToken, expectedToken) {
	const providedBuffer = Buffer.from(String(providedToken || ''), 'utf8');
	const expectedBuffer = Buffer.from(String(expectedToken || ''), 'utf8');

	if (!providedBuffer.length || !expectedBuffer.length || providedBuffer.length !== expectedBuffer.length) {
		return false;
	}

	return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

/**
 * Checks whether the request contains a valid admin API token.
 * Accepts token from Authorization header, X-API-Token header or admin cookie.
 * @param {Object} req - Express request object
 * @returns {boolean} true if valid API token is present
 */
function hasValidApiToken(req) {
	const token = req.headers['authorization'] || req.headers['x-api-token'];
	const providedToken = normalizeAuthToken(token);
	const expectedToken = configManager.getEffectiveApiToken();
	if (secureTokenEquals(providedToken, expectedToken)) {
		return true;
	}

	return hasValidAdminAuthCookie(req);
}

/**
 * Checks whether the request contains a valid WiFi API token or admin token.
 * Accepts both the WiFi-specific token and the admin token.
 * @param {Object} req - Express request object
 * @returns {boolean} true if valid WiFi or admin token is present
 */
function hasValidWiFiApiToken(req) {
	if (hasValidAdminAuthCookie(req)) {
		return true;
	}

	const token = req.headers['authorization'] || req.headers['x-api-token'];
	const providedToken = normalizeAuthToken(token);
	if (!providedToken) {
		return false;
	}

	const adminToken = configManager.getEffectiveApiToken();
	if (secureTokenEquals(providedToken, adminToken)) {
		return true;
	}

	const wifiToken = configManager.getEffectiveWifiApiToken
		? configManager.getEffectiveWifiApiToken()
		: '';
	return secureTokenEquals(providedToken, wifiToken);
}

/**
 * Checks whether the initial admin token setup is required.
 * Returns true if no token is locked by env and no token has been configured yet.
 * @returns {boolean} true if initial admin token setup is needed
 */
function isInitialAdminTokenSetupRequired() {
	if (configManager.isApiTokenEnvLocked()) {
		return false;
	}

	const effectiveToken = normalizeAuthToken(configManager.getEffectiveApiToken());
	return !effectiveToken;
}

/**
 * Validates whether a request originates from the application itself (same-origin)
 * or carries a valid API token. When IP whitelisting is enabled,
 * the client IP is additionally checked against the configured whitelist.
 * Protects display endpoints (booking, check-in, power management)
 * from external/scripted access, while the embedded display UI
 * functions normally.
 * @param {Object} req - Express request object
 * @returns {{allowed: boolean, reason?: string}} Result of the check
 */
function isDisplayOriginAllowed(req) {
	// Always allow if a valid admin or WiFi API token is present
	if (hasValidApiToken(req) || hasValidWiFiApiToken(req)) {
		return { allowed: true };
	}

	// Always allow if admin session cookie is present (logged-in admin)
	if (hasValidAdminAuthCookie(req)) {
		return { allowed: true };
	}

	// Same-origin check via Origin header (set by browsers on fetch requests)
	const origin = req.headers['origin'];
	if (origin) {
		try {
			const originHost = new URL(origin).host;
			const requestHost = req.headers['host'];
			if (originHost === requestHost) {
				return { allowed: true };
			}
		} catch (_) {
			// invalid origin
		}
		return { allowed: false, reason: 'origin_mismatch' };
	}

	// Same-origin check via Referer header (fallback for GET requests)
	const referer = req.headers['referer'];
	if (referer) {
		try {
			const refererHost = new URL(referer).host;
			const requestHost = req.headers['host'];
			if (refererHost === requestHost) {
				return { allowed: true };
			}
		} catch (_) {
			// invalid referer
		}
		return { allowed: false, reason: 'origin_mismatch' };
	}

	// No Origin, no Referer — check IP whitelist as last resort
	if (isClientIpWhitelisted(req)) {
		return { allowed: true };
	}

	// No Origin, no Referer, no token, not on whitelist → reject
	return { allowed: false, reason: 'origin_not_allowed' };
}

/**
 * Checks whether an IP address is within a CIDR range (e.g. 192.168.3.0/24).
 * @param {string} ip - The IP address to check
 * @param {string} cidr - The CIDR range (e.g. "192.168.1.0/24")
 * @returns {boolean} true if the IP is within the CIDR range
 */
function ipMatchesCidr(ip, cidr) {
	const [range, bits] = cidr.split('/');
	if (!bits) return false;
	const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1) >>> 0;
	const ipNum = ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
	const rangeNum = range.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
	return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Normalizes an IP address for comparison.
 * Handles IPv4-mapped IPv6 addresses (e.g. ::ffff:192.168.1.1)
 * and normalizes localhost variants to 127.0.0.1.
 * @param {string} ip - The IP address to normalize
 * @returns {string} The normalized IP address
 */
function normalizeIpForWhitelist(ip) {
	if (!ip || typeof ip !== 'string') return '';
	let normalized = ip.trim();
	// Remove IPv4-mapped IPv6 prefix
	if (normalized.startsWith('::ffff:')) {
		normalized = normalized.substring(7);
	}
	// Normalize localhost variants
	if (normalized === '::1' || normalized === '127.0.0.1' || normalized === 'localhost') {
		return '127.0.0.1';
	}
	return normalized;
}

/**
 * Determines the client IP address from the request.
 * When trustReverseProxy is enabled, the X-Forwarded-For header is evaluated.
 * Uses the rightmost entry to prevent spoofing via client-set headers.
 * @param {Object} req - Express request object
 * @returns {string} The determined client IP address
 */
function getClientIp(req) {
	// When trustReverseProxy is enabled, use the X-Forwarded-For header (set by ALB, Nginx etc.)
	// ALB appends the real client IP as the last entry — always use the rightmost IP,
	// to prevent spoofing via client-set X-Forwarded-For values.
	const systemConfig = configManager.getSystemConfig();
	if (systemConfig.trustReverseProxy) {
		const forwarded = req.headers['x-forwarded-for'];
		if (forwarded) {
			const parts = forwarded.split(',').map(s => s.trim()).filter(Boolean);
			if (parts.length > 0) return parts[parts.length - 1];
		}
	}
	return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Checks whether the client IP is on the whitelist.
 * Returns true if the whitelist is disabled or the IP matches an entry.
 * Supports both individual IPs and CIDR ranges.
 * @param {Object} req - Express request object
 * @returns {boolean} true if IP is allowed or whitelist is disabled
 */
function isClientIpWhitelisted(req) {
	const systemConfig = configManager.getSystemConfig();
	if (!systemConfig.displayIpWhitelistEnabled || !Array.isArray(systemConfig.displayIpWhitelist) || systemConfig.displayIpWhitelist.length === 0) {
		return true;
	}
	const clientIp = getClientIp(req);
	const normalizedClientIp = normalizeIpForWhitelist(clientIp);
	return systemConfig.displayIpWhitelist.some(allowedIp => {
		const normalizedAllowed = normalizeIpForWhitelist(allowedIp);
		if (normalizedAllowed.includes('/')) {
			return ipMatchesCidr(normalizedClientIp, normalizedAllowed);
		}
		return normalizedClientIp === normalizedAllowed;
	});
}

/**
 * Reduces room data to minimal fields for the flightboard view.
 * Removes email, appointment ID, subject and private flag.
 * Limits to a maximum of 2 appointments per room.
 * @param {Array} rooms - Array of room objects
 * @returns {Array} Reduced room objects for the flightboard
 */
function stripRoomsForFlightboard(rooms) {
	if (!Array.isArray(rooms)) return rooms;
	return rooms.map(room => ({
		Roomlist: room.Roomlist,
		RoomlistAlias: room.RoomlistAlias,
		Name: room.Name,
		RoomAlias: room.RoomAlias,
		Busy: room.Busy,
		ErrorMessage: room.ErrorMessage,
		Appointments: Array.isArray(room.Appointments)
			? room.Appointments.slice(0, 2).map(a => ({
				Organizer: a.Organizer,
				Start: a.Start,
				End: a.End
			}))
			: []
	}));
}

/**
 * Checks whether the webhook sender's IP is in the allowed IP list.
 * @param {Object} req - Express request object
 * @returns {boolean} true if IP is allowed or no IP restriction is configured
 */
function isWebhookIpAllowed(req) {
	if (!Array.isArray(config.graphWebhook.allowedIps) || config.graphWebhook.allowedIps.length === 0) {
		return true;
	}

	const ip = getClientIp(req);
	return config.graphWebhook.allowedIps.includes(ip);
}

/**
 * Checks whether the webhook security configuration is complete.
 * Requires both clientState and allowedIps when webhooks are enabled.
 * @returns {boolean} true if security configuration is complete or webhooks are disabled
 */
function hasWebhookSecurityConfig() {
	if (!config.graphWebhook.enabled) {
		return true;
	}

	const hasClientState = !!String(config.graphWebhook.clientState || '').trim();
	const hasAllowedIps = Array.isArray(config.graphWebhook.allowedIps) && config.graphWebhook.allowedIps.length > 0;

	return hasClientState && hasAllowedIps;
}

/**
 * Normalizes a room email address as a key (lowercase, trimmed).
 * @param {string} roomEmail - The room email address
 * @returns {string} Normalized key
 */
function normalizeRoomKey(roomEmail) {
	return String(roomEmail || '').trim().toLowerCase();
}

/**
 * Normalizes a room group name as a key (lowercase, trimmed).
 * @param {string} roomGroup - The room group name
 * @returns {string} Normalized key
 */
function normalizeRoomGroupKey(roomGroup) {
	return String(roomGroup || '').trim().toLowerCase();
}

/**
 * Normalizes a language code (lowercase, trimmed).
 * @param {string} value - The language code (e.g. "DE", "en-US")
 * @returns {string} Normalized language code
 */
function normalizeLanguageCode(value) {
	return String(value || '').trim().toLowerCase();
}

/**
 * Returns the effective configuration of the automatic translation API.
 * Combines runtime configuration with the API key.
 * @returns {{enabled: boolean, url: string, apiKey: string, timeoutMs: number}} Translation API configuration
 */
function getAutoTranslateConfig() {
	const runtimeConfig = configManager.getTranslationApiConfig();
	const runtimeSecret = configManager.getTranslationApiRuntimeConfig
		? configManager.getTranslationApiRuntimeConfig()
		: null;
	const hasApiKey = !!String(runtimeSecret?.apiKey || '').trim();

	return {
		enabled: runtimeConfig.enabled && hasApiKey,
		url: runtimeConfig.url,
		apiKey: runtimeSecret?.apiKey || '',
		timeoutMs: runtimeConfig.timeoutMs
	};
}

/**
 * Translates an array of texts via the configured translation API.
 * Supports Google Translate API and LibreTranslate-compatible APIs.
 * Tries different source/target language combinations as fallback.
 * On error, the original text is returned.
 * @param {string[]} texts - Array of texts to translate
 * @param {string} sourceLanguage - Source language (e.g. "en")
 * @param {string} targetLanguage - Target language (e.g. "de")
 * @returns {Promise<string[]>} Array of translated texts
 */
async function translateTextBatch(texts, sourceLanguage, targetLanguage) {
	if (!Array.isArray(texts) || texts.length === 0) {
		return [];
	}

	const source = normalizeLanguageCode(sourceLanguage) || 'en';
	const target = normalizeLanguageCode(targetLanguage);
	if (!target || source === target) {
		return texts.map((text) => String(text || ''));
	}

	const translatorConfig = getAutoTranslateConfig();
	if (!translatorConfig.enabled) {
		return texts.map((text) => String(text || ''));
	}

	const sourceTexts = texts.map((text) => String(text || ''));
	const sourceCandidates = Array.from(new Set([source, source.split('-')[0], 'auto'].filter(Boolean)));
	const targetCandidates = Array.from(new Set([target, target.split('-')[0]].filter(Boolean)));

	const parseTranslatedPayload = (payload, originals) => {
		if (Array.isArray(payload?.data?.translations)) {
			return payload.data.translations.map((entry, index) => String(entry?.translatedText || originals[index] || ''));
		}

		if (Array.isArray(payload)) {
			return payload.map((entry, index) => String(entry?.translatedText || originals[index] || ''));
		}

		if (Array.isArray(payload?.translatedText)) {
			return payload.translatedText.map((entry, index) => String(entry || originals[index] || ''));
		}

		if (typeof payload?.translatedText === 'string' && originals.length === 1) {
			return [payload.translatedText];
		}

		throw new Error('Unexpected translation payload');
	};

	const requestTranslation = async (q, sourceCode, targetCode) => {
		const abortController = new AbortController();
		const timeout = setTimeout(() => abortController.abort(), translatorConfig.timeoutMs);

		try {
			const isGoogleTranslateApi = /translation\.googleapis\.com/i.test(String(translatorConfig.url || ''));
			const requestUrl = new URL(String(translatorConfig.url));

			if (isGoogleTranslateApi && translatorConfig.apiKey) {
				requestUrl.searchParams.set('key', translatorConfig.apiKey);
			}

			const requestBody = isGoogleTranslateApi
				? {
					q,
					target: targetCode,
					format: 'text',
					...(sourceCode !== 'auto' ? { source: sourceCode } : {})
				}
				: {
					q,
					source: sourceCode,
					target: targetCode,
					format: 'text',
					...(translatorConfig.apiKey ? { api_key: translatorConfig.apiKey } : {})
				};

			const response = await fetch(requestUrl.toString(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody),
				signal: abortController.signal
			});

			if (!response.ok) {
				let errorDetail = '';
				try {
					errorDetail = await response.text();
				} catch (error) {
					errorDetail = '';
				}
				throw new Error(`Translation request failed with status ${response.status}${errorDetail ? `: ${errorDetail}` : ''}`);
			}

			return response.json();
		} finally {
			clearTimeout(timeout);
		}
	};

	let lastError = null;

	for (const sourceCandidate of sourceCandidates) {
		for (const targetCandidate of targetCandidates) {
			try {
				const batchPayload = await requestTranslation(sourceTexts, sourceCandidate, targetCandidate);
				return parseTranslatedPayload(batchPayload, sourceTexts);
			} catch (error) {
				lastError = error;
				try {
					const translatedValues = [];
					for (const value of sourceTexts) {
						const singlePayload = await requestTranslation(value, sourceCandidate, targetCandidate);
						const parsedSingle = parseTranslatedPayload(singlePayload, [value]);
						translatedValues.push(parsedSingle[0] || value);
					}
					return translatedValues;
				} catch (fallbackError) {
					lastError = fallbackError;
				}
			}
		}
	}

	console.warn('Auto-translation fallback to source text:', lastError?.message || lastError);
	return sourceTexts;
}

/**
 * Translates all values of an object into the target language.
 * Processes entries in chunks of 40.
 * @param {Object} sourceObject - Object with values to translate
 * @param {string} sourceLanguage - Source language
 * @param {string} targetLanguage - Target language
 * @returns {Promise<Object>} Object with translated values
 */
async function translateObjectValues(sourceObject, sourceLanguage, targetLanguage) {
	const entries = Object.entries(sourceObject || {});
	if (entries.length === 0) {
		return {};
	}

	const translated = {};
	const chunkSize = 40;

	for (let index = 0; index < entries.length; index += chunkSize) {
		const chunk = entries.slice(index, index + chunkSize);
		const keys = chunk.map(([key]) => key);
		const values = chunk.map(([, value]) => String(value || ''));
		const translatedValues = await translateTextBatch(values, sourceLanguage, targetLanguage);

		for (let i = 0; i < keys.length; i += 1) {
			translated[keys[i]] = translatedValues[i] || values[i] || '';
		}
	}

	return translated;
}

/**
 * Calculates the effective booking configuration for a specific room.
 * Takes into account global settings, room group overrides and room-specific overrides.
 * Room overrides take precedence over group overrides, which in turn take precedence over global settings.
 * @param {Object} bookingConfig - The global booking configuration
 * @param {string} roomEmail - Email address of the room
 * @param {string} roomGroup - Name of the room group
 * @param {boolean} hasPermission - Whether Calendars.ReadWrite permission is available
 * @returns {{enableBooking: boolean, enableExtendMeeting: boolean, groupOverrideApplied: boolean, roomOverrideApplied: boolean}}
 */
function getEffectiveBookingConfig(bookingConfig, roomEmail, roomGroup, hasPermission) {
	const roomKey = normalizeRoomKey(roomEmail);
	const roomGroupKey = normalizeRoomGroupKey(roomGroup);
	const roomFeatureFlags = bookingConfig.roomFeatureFlags || {};
	const roomGroupFeatureFlags = bookingConfig.roomGroupFeatureFlags || {};
	const groupOverride = roomGroupKey ? roomGroupFeatureFlags[roomGroupKey] : undefined;
	const roomOverride = roomKey ? roomFeatureFlags[roomKey] : undefined;

	const scopedEnableBooking = roomOverride?.enableBooking !== undefined
		? roomOverride.enableBooking
		: (groupOverride?.enableBooking !== undefined ? groupOverride.enableBooking : true);

	const scopedEnableExtendMeeting = roomOverride?.enableExtendMeeting !== undefined
		? roomOverride.enableExtendMeeting
		: (groupOverride?.enableExtendMeeting !== undefined ? groupOverride.enableExtendMeeting : true);

	const enableBooking = !!(bookingConfig.enableBooking && hasPermission && scopedEnableBooking);
	const enableExtendMeeting = !!(bookingConfig.enableExtendMeeting && enableBooking && scopedEnableExtendMeeting);

	return {
		enableBooking,
		enableExtendMeeting,
		groupOverrideApplied: !!groupOverride,
		roomOverrideApplied: !!roomOverride
	};
}

/**
 * Checks the health status of the Graph API authentication.
 * Result is cached for 60 seconds.
 * @param {boolean} [forceRefresh=false] - Ignore cache and re-check
 * @returns {Promise<{status: string, message: string}>} Health status
 */
async function getGraphAuthHealth(forceRefresh = false) {
	const ttlMs = 60000;
	const now = Date.now();

	if (!forceRefresh && graphAuthHealthCache.result && now - graphAuthHealthCache.checkedAt < ttlMs) {
		return graphAuthHealthCache.result;
	}

	try {
		const tokenRequest = {
			scopes: ['https://graph.microsoft.com/.default']
		};
		const response = await msalClient.acquireTokenByClientCredential(tokenRequest);
		const result = {
			status: response?.accessToken ? 'ok' : 'error',
			message: response?.accessToken ? 'Graph token acquisition successful.' : 'Graph token acquisition failed.'
		};
		graphAuthHealthCache = { checkedAt: now, result };
		return result;
	} catch (error) {
		const result = {
			status: 'error',
			message: getClientSafeErrorMessage(error, 'Graph token acquisition failed.')
		};
		graphAuthHealthCache = { checkedAt: now, result };
		return result;
	}
}

/**
 * Checks the health status of the cache file (data/cache.json).
 * @returns {{exists: boolean, readable: boolean, lastModified: string|null, sizeBytes?: number}} Cache status
 */
function getCacheHealth() {
	const cachePath = path.join(__dirname, '../data/cache.json');
	if (!fs.existsSync(cachePath)) {
		return {
			exists: false,
			readable: false,
			lastModified: null
		};
	}

	try {
		const stats = fs.statSync(cachePath);
		return {
			exists: true,
			readable: true,
			lastModified: stats.mtime.toISOString(),
			sizeBytes: stats.size
		};
	} catch (error) {
		return {
			exists: true,
			readable: false,
			lastModified: null,
			error: getClientSafeErrorMessage(error, 'Unable to read cache metadata')
		};
	}
}

/**
 * Checks whether the Calendars.ReadWrite permission is available in Azure AD.
 * The result is cached so the check is only performed once.
 * @returns {Promise<boolean>} true if write permission is available
 */
async function checkCalendarWritePermission() {
	if (hasCalendarWritePermission !== null) {
		return hasCalendarWritePermission;
	}

	try {
		// Try to acquire token with Calendars.ReadWrite scope
		const tokenRequest = {
			scopes: ['https://graph.microsoft.com/.default']
		};
		
		const response = await msalClient.acquireTokenByClientCredential(tokenRequest);
		
		if (response && response.accessToken) {
			// Token successfully obtained - permission available
			hasCalendarWritePermission = true;
			console.log('✓ Calendars.ReadWrite permission detected - Booking feature enabled');
		} else {
			hasCalendarWritePermission = false;
			console.log('✗ Calendars.ReadWrite permission missing - Booking feature disabled');
		}
	} catch (error) {
		// If no token can be obtained, assume no write permission
		hasCalendarWritePermission = false;
		console.log('✗ Unable to verify Calendars.ReadWrite permission - Booking feature disabled');
		console.log('  Error:', error.message);
	}
	
	return hasCalendarWritePermission;
}

/**
 * Triggers an immediate room data refresh via the socket controller.
 */
function triggerImmediateRoomRefresh() {
	try {
		const socketController = require('./socket-controller');
		if (typeof socketController.triggerImmediateRefresh === 'function') {
			socketController.triggerImmediateRefresh();
		}
	} catch (error) {
		console.warn('Unable to trigger immediate room refresh:', error.message);
	}
}

/**
 * Triggers an immediate room refresh, followed by a second one after 4 seconds.
 * The delayed second refresh ensures that Graph API changes
 * have fully propagated.
 */
function triggerRoomRefreshWithFollowUp() {
	triggerImmediateRoomRefresh();
	setTimeout(() => {
		triggerImmediateRoomRefresh();
	}, 4000);
}

/**
 * Formats a Date object as a UTC time string for the Graph API.
 * Format: YYYY-MM-DDTHH:MM:SS
 * @param {Date} date - The date to format
 * @returns {string} Formatted time string
 */
function formatDateForGraphUtc(date) {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');
	const hours = String(date.getUTCHours()).padStart(2, '0');
	const minutes = String(date.getUTCMinutes()).padStart(2, '0');
	const seconds = String(date.getUTCSeconds()).padStart(2, '0');
	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Formats a Date object as a time string in a specific timezone for the Graph API.
 * Uses Intl.DateTimeFormat for timezone conversion.
 * Falls back to UTC formatting on error.
 * @param {Date} date - The date to format
 * @param {string} timeZone - IANA timezone name (e.g. "Europe/Berlin")
 * @returns {string} Formatted time string in the specified timezone
 */
function formatDateForGraphInTimeZone(date, timeZone) {
	const zone = String(timeZone || '').trim() || 'UTC';

	try {
		const formatter = new Intl.DateTimeFormat('en-GB', {
			timeZone: zone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23'
		});

		const parts = formatter.formatToParts(date).reduce((acc, part) => {
			acc[part.type] = part.value;
			return acc;
		}, {});

		return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
	} catch (error) {
		return formatDateForGraphUtc(date);
	}
}

/**
 * Parses a Graph API DateTime value into a JavaScript Date object.
 * Takes into account explicit timezones (Z, +/-offset) and UTC specifications.
 * @param {string} dateTimeValue - The DateTime string from the Graph API
 * @param {string} timeZoneValue - The associated timezone
 * @returns {Date|null} The parsed Date object or null for invalid values
 */
function parseGraphDateTime(dateTimeValue, timeZoneValue) {
	const dateTimeString = String(dateTimeValue || '').trim();
	if (!dateTimeString) {
		return null;
	}

	const hasExplicitZone = /Z$|[+-]\d{2}:?\d{2}$/.test(dateTimeString);
	if (hasExplicitZone) {
		const explicitDate = new Date(dateTimeString);
		return Number.isNaN(explicitDate.getTime()) ? null : explicitDate;
	}

	if (String(timeZoneValue || '').toUpperCase() === 'UTC') {
		const utcDate = new Date(`${dateTimeString}Z`);
		return Number.isNaN(utcDate.getTime()) ? null : utcDate;
	}

	const localDate = new Date(dateTimeString);
	return Number.isNaN(localDate.getTime()) ? null : localDate;
}

/**
 * Calculates the new end time when ending a meeting early.
 * If the meeting has not started yet, sets to 1 minute after start.
 * Otherwise uses the current time.
 * @param {Date} startDate - Start time of the meeting
 * @param {Date} [nowDate=new Date()] - Current time
 * @returns {Date} The calculated new end time
 */
function calculateEarlyEndTime(startDate, nowDate = new Date()) {
	if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
		return nowDate;
	}

	if (nowDate <= startDate) {
		return new Date(startDate.getTime() + 60 * 1000);
	}

	return nowDate;
}

/**
 * Ends a Graph calendar event early by setting the end time to now.
 * First loads the event, calculates the new end time and updates it via PATCH.
 * @param {string} roomEmail - Email address of the room
 * @param {string} appointmentId - ID of the calendar entry
 * @returns {Promise<Date>} The new end time
 * @throws {Error} If the event cannot be loaded or updated
 */
async function endGraphEventEarly(roomEmail, appointmentId) {
	const tokenRequest = {
		scopes: ['https://graph.microsoft.com/.default']
	};

	const authResult = await msalClient.acquireTokenByClientCredential(tokenRequest);
	const accessToken = authResult.accessToken;
	const eventUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(roomEmail)}/events/${encodeURIComponent(appointmentId)}`;

	const eventResponse = await graphFetch(eventUrl, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		}
	});

	if (!eventResponse.ok) {
		const errorText = await eventResponse.text();
		throw new Error(`Failed to load meeting before ending (${eventResponse.status}): ${errorText}`);
	}

	const event = await eventResponse.json();
	const startDate = parseGraphDateTime(event?.start?.dateTime, event?.start?.timeZone);
	const newEnd = calculateEarlyEndTime(startDate, new Date());

	const response = await graphFetch(eventUrl, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			end: {
				dateTime: formatDateForGraphUtc(newEnd),
				timeZone: 'UTC'
			}
		})
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to update meeting end time (${response.status}): ${errorText}`);
	}

	return newEnd;
}

/**
 * Moves the start time of a Graph calendar entry to the current time.
 * Used during check-in before meeting start to start the meeting immediately.
 * @param {string} roomEmail - Email address of the room
 * @param {string} appointmentId - ID of the calendar entry
 * @param {Date} [nowDate=new Date()] - Current time
 * @throws {Error} If the start time cannot be updated
 */
async function moveGraphEventStartToNow(roomEmail, appointmentId, nowDate = new Date()) {
	const tokenRequest = {
		scopes: ['https://graph.microsoft.com/.default']
	};

	const authResult = await msalClient.acquireTokenByClientCredential(tokenRequest);
	const accessToken = authResult.accessToken;
	const eventUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(roomEmail)}/events/${encodeURIComponent(appointmentId)}`;

	const response = await graphFetch(eventUrl, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			start: {
				dateTime: formatDateForGraphUtc(nowDate),
				timeZone: 'UTC'
			}
		})
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to update meeting start time (${response.status}): ${errorText}`);
	}
}

// Multer configuration for logo uploads
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		const uploadDir = path.join(__dirname, '../static/img/uploads');
		// Create upload directory if it doesn't exist
		if (!fs.existsSync(uploadDir)) {
			fs.mkdirSync(uploadDir, { recursive: true });
		}
		cb(null, uploadDir);
	},
	filename: function (req, file, cb) {
		// Generate unique filename with timestamp
		const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
		const ext = path.extname(file.originalname);
		cb(null, 'logo-' + uniqueSuffix + ext);
	}
});

/** Multer upload instance with size limit and file type filter */
const upload = multer({
	storage: storage,
	limits: {
		fileSize: 5 * 1024 * 1024 // 5MB Limit
	},
	fileFilter: function (req, file, cb) {
		// Only accept safe raster image files (SVG excluded - XSS vector)
		const allowedTypes = /jpeg|jpg|png|gif|webp/;
		const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
		const mimetype = allowedTypes.test(file.mimetype);
		
		if (mimetype && extname) {
			return cb(null, true);
		} else {
			cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
		}
	}
});

/**
 * Main function: Registers all Express routes and middleware.
 * @param {import('express').Application} app - The Express application instance
 */
module.exports = function(app) {
	var path = require('path');

	/** @type {Function|null} Rate limiter for general API requests */
	let apiRateLimiter = null;
	/** @type {Function|null} Rate limiter for write operations (POST, PUT, PATCH, DELETE) */
	let writeRateLimiter = null;
	/** @type {Function|null} Rate limiter for authentication endpoints */
	let authRateLimiter = null;
	/** @type {Function|null} Rate limiter for booking endpoints */
	let bookingRateLimiter = null;

	/**
	 * Recreates all rate limiters with the current configuration.
	 * Called at startup and after configuration changes.
	 */
	const rebuildRateLimiters = () => {
		const maxBuckets = config.systemDefaults?.rateLimitMaxBuckets;

		apiRateLimiter = createRateLimiter({
			windowMs: config.rateLimit.apiWindowMs,
			max: config.rateLimit.apiMax,
			keyGenerator: req => `${getClientIp(req)}:${req.path}`,
			maxBuckets
		});

		writeRateLimiter = createRateLimiter({
			windowMs: config.rateLimit.writeWindowMs,
			max: config.rateLimit.writeMax,
			keyGenerator: req => `${getClientIp(req)}:${req.path}:${req.method}`,
			maxBuckets
		});

		authRateLimiter = createRateLimiter({
			windowMs: config.rateLimit.authWindowMs,
			max: config.rateLimit.authMax,
			keyGenerator: req => `${getClientIp(req)}:auth`,
			maxBuckets
		});

		bookingRateLimiter = createRateLimiter({
			windowMs: config.rateLimit.bookingWindowMs,
			max: config.rateLimit.bookingMax,
			keyGenerator: req => `${getClientIp(req)}:booking`,
			maxBuckets
		});
	};

	rebuildRateLimiters();

	// Middleware: General API rate limiter for all /api routes
	app.use('/api', function(req, res, next) {
		return apiRateLimiter(req, res, next);
	});

	// Middleware: Additional rate limiter for write /api operations
	app.use('/api', function(req, res, next) {
		if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
			return writeRateLimiter(req, res, next);
		}
		next();
	});

	// Middleware: Maintenance mode check for /api routes
	// In maintenance mode only read requests and certain paths are allowed
	app.use('/api', function(req, res, next) {
		const maintenanceConfig = configManager.getMaintenanceConfig();
		if (!maintenanceConfig.enabled) {
			return next();
		}

		const isReadonlyRequest = req.method === 'GET';
		const requestPath = req.path;
		const allowedPaths = new Set([
			'/heartbeat',
			'/health',
			'/readiness',
			'/sync-status',
			'/maintenance-status',
			'/maintenance',
			'/api-token-config',
			'/oauth-config',
			'/system-config',
			'/graph/webhook'
		]);

		if (allowedPaths.has(requestPath) || isReadonlyRequest) {
			return next();
		}

		res.status(503).json({
			error: 'Maintenance mode enabled',
			message: maintenanceConfig.message,
			maintenance: maintenanceConfig
		});
	});

	// Health check: HEAD endpoint for connection monitoring (no auth required)
	app.head('/api/health', function(req, res) {
		res.status(200).end();
	});

	// GET /api/graph/webhook — Webhook validation for Microsoft Graph notifications
	// Returns the validationToken to confirm the webhook subscription
	app.get('/api/graph/webhook', function(req, res) {
		if (!config.graphWebhook.enabled) {
			return res.status(503).json({
				error: 'Webhook disabled',
				message: 'GRAPH_WEBHOOK_ENABLED is false'
			});
		}

		if (!hasWebhookSecurityConfig()) {
			return res.status(503).json({
				error: 'Webhook security configuration incomplete',
				message: 'Set GRAPH_WEBHOOK_CLIENT_STATE and GRAPH_WEBHOOK_ALLOWED_IPS before enabling webhooks.'
			});
		}

		if (!isWebhookIpAllowed(req)) {
			return res.status(403).json({ error: 'Webhook origin not allowed' });
		}

		const validationToken = req.query.validationToken;
		if (validationToken) {
			res.setHeader('Content-Type', 'text/plain');
			return res.status(200).send(validationToken);
		}

		res.status(400).json({ error: 'Missing validationToken query parameter' });
	});

	// POST /api/graph/webhook — Receives Graph webhook notifications on calendar changes
	// Validates clientState and triggers room refresh
	app.post('/api/graph/webhook', function(req, res) {
		if (!config.graphWebhook.enabled) {
			return res.status(503).json({
				error: 'Webhook disabled',
				message: 'GRAPH_WEBHOOK_ENABLED is false'
			});
		}

		if (!hasWebhookSecurityConfig()) {
			return res.status(503).json({
				error: 'Webhook security configuration incomplete',
				message: 'Set GRAPH_WEBHOOK_CLIENT_STATE and GRAPH_WEBHOOK_ALLOWED_IPS before enabling webhooks.'
			});
		}

		if (!isWebhookIpAllowed(req)) {
			return res.status(403).json({ error: 'Webhook origin not allowed' });
		}

		const payload = req.body;
		const notifications = Array.isArray(payload?.value) ? payload.value : [];
		const expectedClientState = String(config.graphWebhook.clientState || '').trim();

		const validNotifications = notifications.filter(item => String(item?.clientState || '').trim() === expectedClientState);

		if (validNotifications.length > 0) {
			triggerRoomRefreshWithFollowUp();
		}

		res.status(202).json({ accepted: true, processed: validNotifications.length });
	});

	// GET /api/maintenance-status — Returns the current maintenance mode status (public)
	app.get('/api/maintenance-status', function(req, res) {
		const maintenanceConfig = configManager.getMaintenanceConfig();
		res.json(maintenanceConfig);
	});

	// GET /api/debug/socket-disconnects — Debug endpoint for Socket.IO disconnections (auth required)
	app.get('/api/debug/socket-disconnects', function(req, res, next) {
		if (!hasValidWiFiApiToken(req)) {
			return res.status(401).json({ error: 'Unauthorized', message: 'Valid API token required.' });
		}
		next();
	}, function(req, res) {
		const socketController = require('./socket-controller');
		res.json({ disconnects: socketController.getRecentDisconnects() });
	});

	// GET /api/health — Comprehensive health check with Graph auth, cache, MQTT and display status
	app.get('/api/health', function(req, res, next) {
		if (!hasValidWiFiApiToken(req)) {
			return res.status(401).json({ error: 'Unauthorized', message: 'Valid API token required.' });
		}
		next();
	}, async function(req, res) {
		const syncStatus = require('./socket-controller').getSyncStatus();
		const graphAuth = await getGraphAuthHealth();
		const cacheHealth = getCacheHealth();
		const maintenance = configManager.getMaintenanceConfig();
		const mqttClient = require('./mqtt-client');
		const mqttStatus = mqttClient.getStatus();
		const touchkio = require('./touchkio');
		const displays = touchkio.getDisplayStates();

		// Count displays that reported a status within the last 5 minutes
		const fiveMinAgo = Date.now() - 5 * 60 * 1000;
		const onlineDisplays = displays.filter(d => d.lastSeen && new Date(d.lastSeen).getTime() > fiveMinAgo);

		res.json({
			status: 'ok',
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			graphAuth,
			syncStatus,
			cache: cacheHealth,
			maintenance,
			mqtt: {
				connected: mqttStatus.connected,
				brokerUrl: mqttStatus.brokerUrl,
				subscribedTopics: mqttStatus.subscribedTopics.length,
				displays: {
					total: displays.length,
					online: onlineDisplays.length
				}
			}
		});
	});

	// GET /api/readiness — Readiness check: Returns 503 if system is not ready
	app.get('/api/readiness', async function(req, res) {
		const graphAuth = await getGraphAuthHealth();
		const syncStatus = require('./socket-controller').getSyncStatus();
		const maintenance = configManager.getMaintenanceConfig();

		const graphOk = graphAuth.status === 'ok' || graphAuth.status === 'skipped';
		const syncOk = !syncStatus.hasNeverSynced || syncStatus.lastSyncSuccess === true;
		const ready = graphOk && syncOk && !maintenance.enabled;

		if (!ready) {
			return res.status(503).json({
				status: 'not-ready',
				reasons: {
					graphAuth,
					syncStatus,
					maintenance
				}
			});
		}

		res.json({ status: 'ready' });
	});

	// GET /api/version — Returns the application version from package.json (auth required)
	app.get('/api/version', function(req, res, next) {
		if (!hasValidWiFiApiToken(req)) {
			return res.status(401).json({ error: 'Unauthorized', message: 'Valid API token required.' });
		}
		next();
	}, function(req, res) {
		const packageJson = require('../package.json');
		res.json({
			version: packageJson.version || 'unknown',
			name: packageJson.name || 'meet-easier'
		});
	});

	// ======================== API Routes ========================

	/**
	 * Middleware: Checks whether the request originates from the application UI (same-origin)
	 * or carries a valid API token. Protects display endpoints.
	 */
	const checkDisplayOrigin = (req, res, next) => {
		const result = isDisplayOriginAllowed(req);
		if (result.allowed) {
			return next();
		}

		if (result.reason === 'ip_not_whitelisted') {
			return res.status(403).json({
				error: 'ip_not_whitelisted',
				message: 'Your device IP is not whitelisted. Contact your administrator to add this device.'
			});
		}

		res.status(403).json({
			error: 'origin_not_allowed',
			message: 'This endpoint is only accessible from the application UI or with a valid API token.'
		});
	};

	/**
	 * Middleware: Loose origin check for data endpoints (/api/rooms, /api/roomlists).
	 * Blocks cross-origin requests. When IP whitelist is enabled, the client IP is also checked.
	 */
	const checkDisplayOriginLoose = (req, res, next) => {
		// Always allow tokens and admin cookies
		if (hasValidApiToken(req) || hasValidWiFiApiToken(req) || hasValidAdminAuthCookie(req)) {
			return next();
		}

		// If Origin is present, it must match
		const origin = req.headers['origin'];
		if (origin) {
			try {
				if (new URL(origin).host !== req.headers['host']) {
					return res.status(403).json({ error: 'origin_mismatch', message: 'Cross-origin access is not allowed.' });
				}
			} catch (_) {
				return res.status(403).json({ error: 'origin_mismatch', message: 'Cross-origin access is not allowed.' });
			}
		}

		// If Referer is present (and no Origin), it must match
		if (!origin) {
			const referer = req.headers['referer'];
			if (referer) {
				try {
					if (new URL(referer).host !== req.headers['host']) {
						return res.status(403).json({ error: 'origin_mismatch', message: 'Cross-origin access is not allowed.' });
					}
				} catch (_) {
					return res.status(403).json({ error: 'origin_mismatch', message: 'Cross-origin access is not allowed.' });
				}
			}
		}

		// Check IP whitelist
		if (!isClientIpWhitelisted(req)) {
			return res.status(403).json({ error: 'ip_not_whitelisted', message: 'Your device IP is not whitelisted.' });
		}

		next();
	};

	// GET /api/rooms — Returns all rooms (minimal fields for flightboard)
	// Full room data available via /api/rooms/:alias for single-room displays
	app.get('/api/rooms', checkDisplayOriginLoose, function(req, res) {
		// Demo mode: Return generated demo rooms
		const systemConfig = configManager.getSystemConfig();
		if (systemConfig.demoMode) {
			return res.json(stripRoomsForFlightboard(demoData.getDemoRoomsSnapshot()));
		}

		const hasRequiredCreds = (
			!!config.msalConfig.auth.clientId
			&& config.msalConfig.auth.clientId !== 'OAUTH_CLIENT_ID_NOT_SET'
			&& !!config.msalConfig.auth.authority
			&& config.msalConfig.auth.authority !== 'OAUTH_AUTHORITY_NOT_SET'
			&& (
				(!!config.msalConfig.auth.clientSecret && config.msalConfig.auth.clientSecret !== 'OAUTH_CLIENT_SECRET_NOT_SET')
				|| !!certGenerator.getCertificateInfo()
			)
		);
		
		if (!hasRequiredCreds) {
			return res.status(503).json({
				error: 'Calendar backend is not configured',
				message: 'Microsoft Graph credentials are missing. Configure OAUTH_CLIENT_ID, OAUTH_AUTHORITY, and OAUTH_CLIENT_SECRET.'
			});
		}

		const api = require('./msgraph/rooms.js');

		api(function(err, rooms) {
			if (err) {
				console.error('API Error:', err);
				if (err.responseCode === 127) {
					res.json({
						error:
							'Oops, there seems to be an issue with the credentials you have supplied.  Make sure you typed them correctly and that you have access to Exchange Roomlists.'
					});
				} else {
					res.json({
						error: 'Hmm, there seems to be a weird issue occuring.'
					});
				}
			} else {
				res.json(stripRoomsForFlightboard(rooms));
			}
		}, msalClient);
	});

	// GET /api/rooms/:alias — Returns a single room by alias (for single-room displays)
	app.get('/api/rooms/:alias', checkDisplayOriginLoose, function(req, res) {
		const alias = String(req.params.alias || '').trim().toLowerCase();
		if (!alias || !/^[a-z0-9 _.\-]{1,100}$/.test(alias)) {
			return res.status(400).json({ error: 'Invalid room alias' });
		}

		// Demo mode
		const systemConfig = configManager.getSystemConfig();
		if (systemConfig.demoMode) {
			const demoRooms = demoData.getDemoRoomsSnapshot();
			const room = demoRooms.find(r => String(r.RoomAlias || '').toLowerCase() === alias);
			return room ? res.json(room) : res.status(404).json({ error: 'Room not found' });
		}

		const api = require('./msgraph/rooms.js');
		api(function(err, rooms) {
			if (err || !Array.isArray(rooms)) {
				return res.status(503).json({ error: 'Failed to fetch room data' });
			}
			const room = rooms.find(r => String(r.RoomAlias || '').toLowerCase() === alias);
			if (!room) {
				return res.status(404).json({ error: 'Room not found' });
			}
			res.json(room);
		}, msalClient);
	});

	// GET /api/roomlists — Returns all room lists with aliases
	app.get('/api/roomlists', checkDisplayOriginLoose, function(req, res) {
		// Demo mode: Return demo room lists
		const systemConfig = configManager.getSystemConfig();
		if (systemConfig.demoMode) {
			return res.json(demoData.getDemoRoomlists());
		}

		const api = require('./msgraph/roomlists.js');

		api(function(err, roomlists) {
			if (err) {
				if (err.responseCode === 127) {
					res.json({
						error:
							'Oops, there seems to be an issue with the credentials you have supplied.  Make sure you typed them correctly and that you have access to Exchange Roomlists.'
					});
				} else {
					res.json({
						error: 'Hmm, there seems to be a weird issue occuring.'
					});
				}
			} else {
				// Add aliases to each room list
				const roomlistsWithAliases = roomlists.map(name => {
					return roomlistAliasHelper.getRoomlistWithAlias(name);
				});
				res.json(roomlistsWithAliases);
			}
		}, msalClient);
	});

	// GET /api/heartbeat — Simple heartbeat endpoint to check if the server is reachable
	app.get('/api/heartbeat', function(req, res) {
		res.json({ status: 'OK' });
	});

	// GET /api/sync-status — Returns the calendar synchronization status
	app.get('/api/sync-status', function(req, res) {
		try {
			const socketController = require('./socket-controller');
			if (socketController.getSyncStatus) {
				const syncStatus = socketController.getSyncStatus();
				res.json(syncStatus);
			} else {
				res.json({
					hasNeverSynced: true,
					error: 'Sync status not available'
				});
			}
		} catch (err) {
			res.status(500).json({ 
				error: 'Failed to retrieve sync status',
				message: getClientSafeErrorMessage(err, 'Unable to retrieve sync status')
			});
		}
	});

	// POST /api/rooms/:roomEmail/book — Books a room via the Graph API
	// Validates inputs, checks booking permission and creates the calendar entry
	app.post('/api/rooms/:roomEmail/book', checkDisplayOrigin, function(req, res, next) {
		return bookingRateLimiter(req, res, next);
	}, async function(req, res) {
		const { roomEmail } = req.params;
		const { subject, startTime, endTime, description, roomGroup } = req.body;

		// Demo mode: Simulate booking
		const systemConfig = configManager.getSystemConfig();
		if (systemConfig.demoMode && demoData.isDemoEmail(roomEmail)) {
			const result = demoData.bookDemoRoom(roomEmail, subject, startTime, endTime);
			if (result.error) {
				return res.status(result.status).json({ error: 'Room not available', message: result.message });
			}
			// Trigger room refresh for demo
			const io = configManager.getSocketIO();
			if (io) {
				io.of('/').emit('updatedRooms', demoData.getDemoRoomsSnapshot());
			}
			return res.json({ success: true, id: result.id, subject: result.subject });
		}

		const bookingConfig = configManager.getBookingConfig();
		const hasPermission = await checkCalendarWritePermission();
		const effectiveBooking = getEffectiveBookingConfig(bookingConfig, roomEmail, roomGroup, hasPermission);

		if (!effectiveBooking.enableBooking) {
			return res.status(403).json({
				error: 'Booking disabled',
				message: 'Booking is disabled for this room or globally.'
			});
		}

		// Input validation
		if (!subject || !startTime || !endTime) {
			return res.status(400).json({ 
				error: 'Missing required fields',
				message: 'Subject, start time, and end time are required'
			});
		}

		if (!isValidEmailAddress(roomEmail)) {
			return res.status(400).json({
				error: 'Invalid room email',
				message: 'The room email format is invalid.'
			});
		}

		const normalizedSubject = String(subject || '').trim();
		if (!normalizedSubject || normalizedSubject.length > 160) {
			return res.status(400).json({
				error: 'Invalid subject',
				message: 'Subject is required and must not exceed 160 characters.'
			});
		}

		const normalizedDescription = description === undefined || description === null
			? ''
			: String(description);
		if (normalizedDescription.length > 2000) {
			return res.status(400).json({
				error: 'Invalid description',
				message: 'Description must not exceed 2000 characters.'
			});
		}

		const normalizedStartTime = String(startTime || '').trim();
		const normalizedEndTime = String(endTime || '').trim();
		if (!normalizedStartTime || !normalizedEndTime || normalizedStartTime.length > 64 || normalizedEndTime.length > 64) {
			return res.status(400).json({
				error: 'Invalid date range',
				message: 'Start and end time values are invalid.'
			});
		}

		// Security: Prevent booking with attendees or additional resources
		// Only allow the specifically needed fields
		const disallowedFields = ['attendees', 'requiredAttendees', 'optionalAttendees', 'resources', 'locations'];
		for (const field of disallowedFields) {
			if (req.body[field] !== undefined) {
				return res.status(400).json({
					error: 'Invalid fields',
					message: 'Cannot add attendees or additional resources to room bookings'
				});
			}
		}

		const bookingDetails = {
			subject: normalizedSubject,
			startTime: normalizedStartTime,
			endTime: normalizedEndTime,
			description: normalizedDescription
		};

		try {
			const bookRoom = require('./msgraph/booking.js');
			const result = await bookRoom(msalClient, roomEmail, bookingDetails);
			triggerRoomRefreshWithFollowUp();
			res.json(result);
		} catch (error) {
			logSanitizedError('Booking error:', error, { roomEmail });
			const rawErrorMessage = String(error?.message || '').toLowerCase();
			if (rawErrorMessage.includes('already booked')) {
				return res.status(409).json({
					error: 'Room not available',
					message: getClientSafeErrorMessage(error, 'Room is already booked')
				});
			}
			res.status(500).json({ 
				error: 'Booking failed',
				message: 'Failed to book room'
			});
		}
	});

	// POST /api/extend-meeting — Extends an existing meeting by a specified number of minutes
	// Checks for conflicts with subsequent appointments and end of day
	app.post('/api/extend-meeting', checkDisplayOrigin, function(req, res, next) {
		return bookingRateLimiter(req, res, next);
	}, async function(req, res) {
		const { roomEmail, appointmentId, minutes, roomGroup } = req.body;

		// Demo mode: Simulate meeting extension
		const systemConfig = configManager.getSystemConfig();
		if (systemConfig.demoMode && demoData.isDemoEmail(roomEmail)) {
			const minutesValue = Number(minutes);
			const result = demoData.extendDemoMeeting(roomEmail, appointmentId, minutesValue);
			if (result.error) {
				return res.status(result.status).json({ success: false, error: result.message });
			}
			const io = configManager.getSocketIO();
			if (io) {
				io.of('/').emit('updatedRooms', demoData.getDemoRoomsSnapshot());
			}
			return res.json({ success: true, newEnd: result.newEnd });
		}

		// Determine language from Accept-Language header
		const acceptLanguage = req.headers['accept-language'] || 'en';
		const lang = acceptLanguage.split(',')[0].split('-')[0]; // Extract primary language code
		const isGerman = lang === 'de';

		// Translation helper for error messages
		const t = {
			missingFields: isGerman ? 'Fehlende erforderliche Felder' : 'Missing required fields',
			missingFieldsDetails: isGerman 
				? 'Raum-E-Mail, Termin-ID und Minuten sind erforderlich' 
				: 'Room email, appointment ID, and minutes are required',
			extendDisabled: isGerman ? 'Meeting-Verlängerung deaktiviert' : 'Extend meeting disabled',
			extendDisabledDetails: isGerman
				? 'Die Meeting-Verlängerung ist in der Admin-Konfiguration deaktiviert'
				: 'Extend meeting is disabled in the admin configuration',
			invalidMinutes: isGerman ? 'Ungültiger Minutenwert' : 'Invalid minutes value',
			invalidMinutesDetails: isGerman 
				? 'Minuten müssen zwischen 5 und 240 liegen (Schritte von 5)' 
				: 'Minutes must be between 5 and 240 (steps of 5)',
			conflictError: isGerman
				? 'Meeting kann nicht verlängert werden - ein weiterer Termin ist zu bald geplant. Bitte überprüfen Sie den Raumkalender.'
				: 'Cannot extend meeting - another meeting is scheduled too soon. Please check the room calendar.',
			endOfDayError: isGerman
				? 'Meeting kann nicht über das Tagesende hinaus verlängert werden'
				: 'Cannot extend meeting beyond end of day',
			fetchError: isGerman ? 'Fehler beim Abrufen der Termindetails' : 'Failed to fetch event details',
			updateError: isGerman ? 'Fehler beim Aktualisieren des Termins' : 'Failed to update event',
			generalError: isGerman ? 'Fehler beim Verlängern des Meetings' : 'Error extending meeting'
		};
		// Input validation
		if (!roomEmail || !appointmentId || !minutes) {
			return res.status(400).json({ 
				error: t.missingFields,
				message: t.missingFieldsDetails
			});
		}

		const bookingConfig = configManager.getBookingConfig();
		const hasPermission = await checkCalendarWritePermission();
		const effectiveBooking = getEffectiveBookingConfig(bookingConfig, roomEmail, roomGroup, hasPermission);

		if (!effectiveBooking.enableExtendMeeting) {
			return res.status(403).json({
				success: false,
				error: t.extendDisabled,
				message: t.extendDisabledDetails
			});
		}

		// Validate minutes value (5..240, steps of 5)
		const minutesValue = Number(minutes);
		if (!Number.isFinite(minutesValue) || minutesValue < 5 || minutesValue > 240 || minutesValue % 5 !== 0) {
			return res.status(400).json({ 
				error: t.invalidMinutes,
				message: t.invalidMinutesDetails
			});
		}

		try {
			const graphApi = require('./msgraph/graph.js');
				
			// Get the access token
			const tokenRequest = {
				scopes: ['https://graph.microsoft.com/.default']
			};
			const authResult = await msalClient.acquireTokenByClientCredential(tokenRequest);
			const accessToken = authResult.accessToken;

			// Load current event
			const eventUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(roomEmail)}/events/${encodeURIComponent(appointmentId)}`;
			const eventResponse = await graphFetch(eventUrl, {
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				}
			});

			if (!eventResponse.ok) {
				throw new Error(t.fetchError);
			}

			const event = await eventResponse.json();
			const eventStartTimeZone = event?.start?.timeZone || 'UTC';
			const eventEndTimeZone = event?.end?.timeZone || eventStartTimeZone || 'UTC';
			const currentStart = parseGraphDateTime(event?.start?.dateTime, eventStartTimeZone);
			const currentEnd = parseGraphDateTime(event?.end?.dateTime, eventEndTimeZone);

			if (!currentStart || !currentEnd) {
				throw new Error(t.fetchError);
			}

			const newEnd = new Date(currentEnd.getTime() + (minutesValue * 60 * 1000));

			// Check for conflicts with the extension
			// Check if the extension from currentEnd to newEnd overlaps with another meeting
			const calendarView = await graphApi.getCalendarView(msalClient, roomEmail);
			const calendarEvents = calendarView.value || [];

			const hasConflict = calendarEvents.some(e => {
				if (e.id === appointmentId) return false; // Skip current meeting
				const eventStart = new Date(e.start.dateTime);
				const eventEnd = new Date(e.end.dateTime);
				
				// Check for overlap: (extendedStart < eventEnd) AND (extendedEnd > eventStart)
				// The extended meeting runs from currentStart to newEnd
				return currentStart < eventEnd && newEnd > eventStart;
			});

			if (hasConflict) {
				return res.status(409).json({
					success: false,
					error: t.conflictError
				});
			}

			// Additional check: Extension must not go beyond end of day
			const maxEndTime = new Date(currentStart);
			maxEndTime.setHours(23, 59, 59, 999); // End of day
			
			if (newEnd > maxEndTime) {
				return res.status(400).json({
					success: false,
					error: t.endOfDayError
				});
			}

			// Update event end time
			const updateUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(roomEmail)}/events/${encodeURIComponent(appointmentId)}`;
			const updateResponse = await graphFetch(updateUrl, {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					end: {
						dateTime: formatDateForGraphInTimeZone(newEnd, eventEndTimeZone),
						timeZone: eventEndTimeZone
					}
				})
			});

			if (!updateResponse.ok) {
				const errorText = await updateResponse.text();
				throw new Error(`${t.updateError}: ${errorText}`);
			}

			res.json({ 
				success: true,
				message: `Meeting extended by ${minutesValue} minutes`,
				newEndTime: newEnd.toISOString()
			});
			triggerRoomRefreshWithFollowUp();
		} catch (error) {
			logSanitizedError('Extend meeting error:', error, { roomEmail, appointmentId });
			res.status(500).json({ 
				success: false,
				error: getClientSafeErrorMessage(error, t.generalError)
			});
		}
	});

	// POST /api/end-meeting — Ends a running meeting early
	app.post('/api/end-meeting', checkDisplayOrigin, function(req, res, next) {
		return bookingRateLimiter(req, res, next);
	}, async function(req, res) {
		const { roomEmail, appointmentId, roomGroup } = req.body || {};

		// Demo mode: Simulate early termination
		const systemConfig = configManager.getSystemConfig();
		if (systemConfig.demoMode && demoData.isDemoEmail(roomEmail)) {
			const result = demoData.endDemoMeetingEarly(roomEmail, appointmentId);
			if (result.error) {
				return res.status(result.status).json({ success: false, error: result.message });
			}
			const io = configManager.getSocketIO();
			if (io) {
				io.of('/').emit('updatedRooms', demoData.getDemoRoomsSnapshot());
			}
			return res.json({ success: true, endedAt: result.endedAt });
		}

		const acceptLanguage = req.headers['accept-language'] || 'en';
		const lang = acceptLanguage.split(',')[0].split('-')[0];
		const isGerman = lang === 'de';

		const t = {
			missingFields: isGerman ? 'Fehlende erforderliche Felder' : 'Missing required fields',
			missingFieldsDetails: isGerman
				? 'Raum-E-Mail und Termin-ID sind erforderlich'
				: 'Room email and appointment ID are required',
			endDisabled: isGerman ? 'Meeting-Beenden deaktiviert' : 'End meeting disabled',
			endDisabledDetails: isGerman
				? 'Meeting-Verwaltung ist in der Admin-Konfiguration deaktiviert'
				: 'Meeting management is disabled in the admin configuration',
			genericError: isGerman ? 'Fehler beim Beenden des Meetings' : 'Error ending meeting'
		};

		if (!roomEmail || !appointmentId) {
			return res.status(400).json({
				success: false,
				error: t.missingFields,
				message: t.missingFieldsDetails
			});
		}

		const bookingConfig = configManager.getBookingConfig();
		const hasPermission = await checkCalendarWritePermission();
		const effectiveBooking = getEffectiveBookingConfig(bookingConfig, roomEmail, roomGroup, hasPermission);

		if (!effectiveBooking.enableExtendMeeting) {
			return res.status(403).json({
				success: false,
				error: t.endDisabled,
				message: t.endDisabledDetails
			});
		}

		try {
			const endedAt = await endGraphEventEarly(roomEmail, appointmentId);

			checkinManager.clearCheckedIn({ roomEmail, appointmentId });
			triggerRoomRefreshWithFollowUp();

			return res.json({
				success: true,
				message: isGerman ? 'Meeting wurde vorzeitig beendet.' : 'Meeting was ended early.',
				newEndTime: endedAt instanceof Date ? endedAt.toISOString() : null
			});
		} catch (error) {
			logSanitizedError('End meeting error:', error, { roomEmail, appointmentId });
			return res.status(500).json({
				success: false,
				error: getClientSafeErrorMessage(error, t.genericError)
			});
		}
	});

	// GET /api/check-in-status — Returns the check-in status for a meeting
	app.get('/api/check-in-status', checkDisplayOrigin, function(req, res) {
		const { roomEmail, appointmentId, organizer, roomName, startTimestamp } = req.query;

		if (!roomEmail || !appointmentId) {
			return res.status(400).json({
				error: 'Missing required fields',
				message: 'roomEmail and appointmentId are required'
			});
		}

		const bookingConfig = configManager.getBookingConfig();
		const status = checkinManager.getCheckInStatus({
			roomEmail,
			appointmentId,
			organizer,
			roomName,
			startTimestamp,
			checkInConfig: bookingConfig.checkIn
		});

		res.json(status);
	});

	// POST /api/check-in — Performs the check-in for a meeting
	// Can move the meeting start time to now on early check-in
	app.post('/api/check-in', checkDisplayOrigin, async function(req, res) {
		const { roomEmail, appointmentId, organizer, roomName, startTimestamp } = req.body || {};

		if (!roomEmail || !appointmentId) {
			return res.status(400).json({
				success: false,
				error: 'Missing required fields',
				message: 'roomEmail and appointmentId are required'
			});
		}

		const bookingConfig = configManager.getBookingConfig();
		const status = checkinManager.getCheckInStatus({
			roomEmail,
			appointmentId,
			organizer,
			roomName,
			startTimestamp,
			checkInConfig: bookingConfig.checkIn
		});

		if (!status.required) {
			return res.status(400).json({
				success: false,
				error: 'Check-in not required',
				message: 'This meeting does not require check-in.'
			});
		}

		if (status.tooEarly) {
			return res.status(409).json({
				success: false,
				error: 'Check-in not open yet',
				message: `Check-in is available ${status.earlyCheckInMinutes} minutes before meeting start.`
			});
		}

		if (status.expired) {
			return res.status(409).json({
				success: false,
				error: 'Check-in window expired',
				message: 'The check-in window has already expired.'
			});
		}

		const shouldMoveMeetingStart = Number.isFinite(status.startTimestamp) && Date.now() < status.startTimestamp;

		if (shouldMoveMeetingStart) {
			try {
				await moveGraphEventStartToNow(roomEmail, appointmentId, new Date());
				triggerRoomRefreshWithFollowUp();
			} catch (error) {
				console.error('Check-in pre-start meeting update error:', error);
				return res.status(500).json({
					success: false,
					error: 'Failed to update meeting start time',
					message: getClientSafeErrorMessage(error, 'Could not move meeting start to current time.')
				});
			}
		}

		checkinManager.markCheckedIn({ roomEmail, appointmentId });

		res.json({
			success: true,
			status: checkinManager.getCheckInStatus({
				roomEmail,
				appointmentId,
				organizer,
				roomName,
				startTimestamp,
				checkInConfig: bookingConfig.checkIn
			})
		});
	});

	/**
	 * Middleware: Checks whether a valid admin API token is present.
	 * Logs failed authentication attempts in the audit log.
	 * Additionally validates CSRF token on state-changing requests with cookie auth.
	 */
	const checkApiToken = (req, res, next) => {
		if (!hasValidApiToken(req)) {
			appendAuditLog({
				event: 'auth.failure',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null
			});

			return res.status(401).json({ 
				error: 'Unauthorized',
				message: 'Valid API token required. Provide token in Authorization header or X-API-Token header.'
			});
		}

		// CSRF validation for state-changing requests with cookie authentication
		if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !validateCsrf(req)) {
			return res.status(403).json({
				error: 'CSRF validation failed',
				message: 'Missing or invalid CSRF token.'
			});
		}

		return next();
	};

	/**
	 * Middleware: Checks whether a valid WiFi API token or admin token is present.
	 * Logs failed attempts in the audit log.
	 */
	const checkWiFiApiToken = (req, res, next) => {
		if (hasValidWiFiApiToken(req)) {
			return next();
		}

		appendAuditLog({
			event: 'auth.failure',
			path: req.path,
			method: req.method,
			ip: getClientIp(req),
			userAgent: req.headers['user-agent'] || null
		});

		res.status(401).json({
			error: 'Unauthorized',
			message: 'Valid API token required. Provide token in Authorization header or X-API-Token header.'
		});
	};

	// GET /api/admin/bootstrap-status — Checks whether the initial admin token setup is needed
	app.get('/api/admin/bootstrap-status', function(req, res) {
		res.json({
			requiresSetup: isInitialAdminTokenSetupRequired(),
			lockedByEnv: configManager.isApiTokenEnvLocked()
		});
	});

	// POST /api/admin/bootstrap-token — Creates the initial admin API token during first setup
	app.post('/api/admin/bootstrap-token', function(req, res) {
		authRateLimiter(req, res, () => {});
		if (res.headersSent) {
			return;
		}

		if (configManager.isApiTokenEnvLocked()) {
			return res.status(403).json({
				error: 'API token is locked by environment variable',
				message: 'Set API_TOKEN in environment or remove it to use bootstrap setup.'
			});
		}

		if (!isInitialAdminTokenSetupRequired()) {
			return res.status(409).json({
				error: 'Admin token already configured',
				message: 'Initial setup is not required anymore.'
			});
		}

		const providedToken = String(req.body?.token || '').trim();
		if (!providedToken || providedToken.length < 8) {
			return res.status(400).json({
				error: 'Invalid API token',
				message: 'Please provide an API token with at least 8 characters.'
			});
		}

		configManager.updateApiToken(providedToken)
			.then(() => {
				appendAuditLog({
					event: 'auth.bootstrap_token_created',
					path: req.path,
					method: req.method,
					ip: getClientIp(req),
					userAgent: req.headers['user-agent'] || null
				});

				setAdminAuthCookie(res, providedToken);
				const csrfToken = setCsrfCookie(res);
				res.json({ success: true, message: 'Initial admin API token created.', csrfToken });
			})
			.catch((err) => {
				console.error('Error creating initial admin API token:', err);
				res.status(500).json({ error: getClientSafeErrorMessage(err, 'Failed to create initial admin API token') });
			});
	});

	// POST /api/admin/login — Admin login: Validates token and sets auth cookie + CSRF cookie
	app.post('/api/admin/login', function(req, res) {
		authRateLimiter(req, res, () => {});
		if (res.headersSent) {
			return;
		}

		if (isInitialAdminTokenSetupRequired()) {
			return res.status(428).json({
				error: 'Admin token setup required',
				message: 'No admin API token is configured yet. Create one first.'
			});
		}

		const providedToken = String(req.body?.token || '').trim();
		if (!providedToken) {
			return res.status(400).json({
				error: 'Missing token',
				message: 'API token is required.'
			});
		}

		if (!secureTokenEquals(providedToken, configManager.getEffectiveApiToken())) {
			appendAuditLog({
				event: 'auth.failure',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null
			});

			return res.status(401).json({
				error: 'Unauthorized',
				message: 'Invalid API token.'
			});
		}

		setAdminAuthCookie(res, providedToken);
		const csrfToken = setCsrfCookie(res);
		return res.json({ success: true, csrfToken });
	});

	// POST /api/admin/logout — Admin logout: Clears auth and CSRF cookies
	app.post('/api/admin/logout', function(req, res) {
		clearAdminAuthCookie(res);
		res.json({ success: true });
	});

	// GET /api/admin/session — Checks whether the current admin session is valid
	app.get('/api/admin/session', checkApiToken, function(req, res) {
		res.json({ authenticated: true });
	});

	// GET /api/wifi — Returns the current WiFi configuration (public, no auth required)
	app.get('/api/wifi', function(req, res) {
		try {
			const wifiConfig = configManager.getWiFiConfig();
			res.json(wifiConfig);
		} catch (err) {
			res.status(500).json({ error: 'Failed to retrieve WiFi configuration' });
		}
	});

	// GET /api/logo — Returns the current logo configuration (public, no auth required)
	app.get('/api/logo', function(req, res) {
		try {
			const logoConfig = configManager.getLogoConfig();
			res.json(logoConfig);
		} catch (err) {
			res.status(500).json({ error: 'Failed to retrieve logo configuration' });
		}
	});

	// GET /api/oauth-config — Returns the OAuth configuration (auth required)
	app.get('/api/oauth-config', checkApiToken, function(req, res) {
		try {
			const oauthConfig = configManager.getOAuthConfig();
			res.json(oauthConfig);
		} catch (err) {
			console.error('Error retrieving OAuth config:', err);
			res.status(500).json({ error: 'Failed to retrieve OAuth configuration' });
		}
	});

	// GET /api/api-token-config — Returns the API token configuration (auth required)
	app.get('/api/api-token-config', checkApiToken, function(req, res) {
		try {
			res.json(configManager.getApiTokenConfig());
		} catch (err) {
			console.error('Error retrieving API token config:', err);
			res.status(500).json({ error: 'Failed to retrieve API token configuration' });
		}
	});

	// POST /api/api-token-config — Updates admin and/or WiFi API token
	app.post('/api/api-token-config', checkApiToken, async function(req, res) {
		try {
			const { newToken, newWifiToken } = req.body || {};
			const hasNewAdminToken = newToken !== undefined;
			const hasNewWiFiToken = newWifiToken !== undefined;

			if (!hasNewAdminToken && !hasNewWiFiToken) {
				return res.status(400).json({
					error: 'Invalid token update payload',
					message: 'Please provide newToken and/or newWifiToken.'
				});
			}

			const normalizedToken = String(newToken || '').trim();
			const normalizedWiFiToken = String(newWifiToken || '').trim();

			if (hasNewAdminToken) {
				if (configManager.isApiTokenEnvLocked()) {
					return res.status(403).json({
						error: 'API token is locked by environment variable',
						message: 'Remove API_TOKEN from environment to edit via admin panel.'
					});
				}

				if (!normalizedToken || normalizedToken.length < 8) {
					return res.status(400).json({
						error: 'Invalid API token',
						message: 'Please provide an API token with at least 8 characters.'
					});
				}
			}

			if (hasNewWiFiToken) {
				if (configManager.isWifiApiTokenEnvLocked && configManager.isWifiApiTokenEnvLocked()) {
					return res.status(403).json({
						error: 'WiFi API token is locked by environment variable',
						message: 'Remove WIFI_API_TOKEN from environment to edit via admin panel.'
					});
				}

				if (!normalizedWiFiToken || normalizedWiFiToken.length < 8) {
					return res.status(400).json({
						error: 'Invalid WiFi API token',
						message: 'Please provide a WiFi API token with at least 8 characters.'
					});
				}
			}

			const beforeConfig = configManager.getApiTokenConfig();
			if (hasNewAdminToken) {
				await configManager.updateApiToken(normalizedToken);
				setAdminAuthCookie(res, normalizedToken);
			}
			if (hasNewWiFiToken && configManager.updateWifiApiToken) {
				await configManager.updateWifiApiToken(normalizedWiFiToken);
			}
			const updatedConfig = configManager.getApiTokenConfig();

			appendAuditLog({
				event: 'config.apiToken.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				tokensUpdated: {
					admin: hasNewAdminToken,
					wifi: hasNewWiFiToken
				},
				before: beforeConfig,
				after: updatedConfig
			});

			res.json({
				success: true,
				config: updatedConfig,
				message: hasNewAdminToken && hasNewWiFiToken
					? 'API tokens updated'
					: (hasNewAdminToken ? 'API token updated' : 'WiFi API token updated')
			});
		} catch (err) {
			console.error('Error updating API token:', err);
			res.status(500).json({ error: getClientSafeErrorMessage(err, 'Failed to update API token') });
		}
	});

	// POST /api/oauth-config — Updates the OAuth configuration (client ID, authority, secret)
	// Locked when OAuth is configured via environment variables
	app.post('/api/oauth-config', checkApiToken, async function(req, res) {
		try {
			if (isOAuthEnvConfigured()) {
				return res.status(403).json({
					error: 'OAuth configuration is locked by environment variables',
					message: 'Remove OAUTH_CLIENT_ID/OAUTH_AUTHORITY/OAUTH_CLIENT_SECRET from environment to edit via admin panel.'
				});
			}

			const { clientId, authority, tenantId, clientSecret } = req.body || {};
			const invalidSentinelValues = new Set([
				'OAUTH_CLIENT_ID_NOT_SET',
				'OAUTH_AUTHORITY_NOT_SET',
				'OAUTH_CLIENT_SECRET_NOT_SET'
			]);

			if (typeof clientId === 'string' && invalidSentinelValues.has(clientId.trim())) {
				return res.status(400).json({
					error: 'Invalid OAuth client ID',
					message: 'Please provide a real OAuth Client ID (placeholder values are not allowed).'
				});
			}

			if (typeof authority === 'string' && invalidSentinelValues.has(authority.trim())) {
				return res.status(400).json({
					error: 'Invalid OAuth authority',
					message: 'Please provide a real OAuth Tenant ID or Authority URL (placeholder values are not allowed).'
				});
			}

			if (typeof tenantId === 'string' && invalidSentinelValues.has(tenantId.trim())) {
				return res.status(400).json({
					error: 'Invalid OAuth tenant ID',
					message: 'Please provide a real OAuth Tenant ID (placeholder values are not allowed).'
				});
			}

			if (typeof clientSecret === 'string' && invalidSentinelValues.has(clientSecret.trim())) {
				return res.status(400).json({
					error: 'Invalid OAuth client secret',
					message: 'Please provide a real OAuth Client Secret (placeholder values are not allowed).'
				});
			}

			if (clientId === undefined && authority === undefined && tenantId === undefined && clientSecret === undefined) {
				return res.status(400).json({ error: 'At least one OAuth configuration option is required' });
			}

			if (clientId !== undefined) {
				const normalizedClientId = String(clientId || '').trim();
				if (!isValidGuid(normalizedClientId)) {
					return res.status(400).json({
						error: 'Invalid OAuth client ID',
						message: 'Client ID must be a valid GUID.'
					});
				}
			}

			if (tenantId !== undefined) {
				const normalizedTenantId = String(tenantId || '').trim();
				if (!isValidGuid(normalizedTenantId)) {
					return res.status(400).json({
						error: 'Invalid OAuth tenant ID',
						message: 'Tenant ID must be a valid GUID.'
					});
				}
			}

			if (authority !== undefined && tenantId === undefined) {
				const normalizedAuthority = String(authority || '').trim();
				if (!isValidMicrosoftAuthority(normalizedAuthority)) {
					return res.status(400).json({
						error: 'Invalid OAuth authority',
						message: 'Authority must be a valid login.microsoftonline.com URL with tenant segment.'
					});
				}
			}

			// Treat empty clientSecret as "do not change" (user may only update clientId/tenantId)
			const hasNewSecret = clientSecret !== undefined && String(clientSecret || '').trim().length > 0;

			if (hasNewSecret) {
				const normalizedClientSecret = String(clientSecret);
				if (normalizedClientSecret.length > 4096) {
					return res.status(400).json({
						error: 'Invalid OAuth client secret',
						message: 'Client secret exceeds maximum allowed length.'
					});
				}
			}

			const beforeConfig = configManager.getOAuthConfig();
			const updatePayload = {
				clientId,
				authority: tenantId !== undefined ? tenantId : authority
			};
			// Only include clientSecret when a new non-empty value was provided
			if (hasNewSecret) {
				updatePayload.clientSecret = clientSecret;
			}
			const updatedConfig = await configManager.updateOAuthConfig(updatePayload);

			refreshMsalClient();
			require('./socket-controller').refreshMsalClient();
			triggerRoomRefreshWithFollowUp();

			// Automatically disable demo mode when OAuth is configured
			const systemConfig = configManager.getSystemConfig();
			if (systemConfig.demoMode) {
				const normalizedClientId = String(clientId || updatedConfig.clientId || '').trim();
				if (normalizedClientId && normalizedClientId !== 'OAUTH_CLIENT_ID_NOT_SET') {
					configManager.updateSystemConfig({ demoMode: false }).catch(() => {});
					require('./socket-controller').triggerImmediateRefresh();
				}
			}

			appendAuditLog({
				event: 'config.oauth.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: updatedConfig
			});

			res.json({
				success: true,
				config: updatedConfig,
				message: 'OAuth configuration updated'
			});
		} catch (err) {
			logSanitizedError('Error updating OAuth config:', err);
			res.status(500).json({ error: getClientSafeErrorMessage(err, 'Failed to update OAuth configuration') });
		}
	});

	// ============================================================================
	// OAuth Certificate Management
	// ============================================================================

	// GET /api/oauth-certificate — Returns certificate metadata (thumbprint, expiry, etc.)
	app.get('/api/oauth-certificate', checkApiToken, function(req, res) {
		try {
			const info = certGenerator.getCertificateInfo();
			res.json({ certificate: info });
		} catch (err) {
			logSanitizedError('Error retrieving certificate info:', err);
			res.status(500).json({ error: 'Failed to retrieve certificate information' });
		}
	});

	// POST /api/oauth-certificate/generate — Generates a new self-signed certificate
	app.post('/api/oauth-certificate/generate', checkApiToken, function(req, res) {
		try {
			const encryptionKey = configManager.getEffectiveApiToken();
			if (!encryptionKey) {
				return res.status(400).json({
					error: 'API token required',
					message: 'An API token must be configured before generating a certificate.'
				});
			}

			const { commonName, validityYears } = req.body || {};
			const certData = certGenerator.generateCertificate({
				commonName: commonName || 'MeetEasier OAuth',
				validityYears: validityYears || 3
			});

			certGenerator.saveCertificate(certData, encryptionKey);

			// Refresh MSAL clients to use the new certificate
			try {
				refreshMsalClient();
				require('./socket-controller').refreshMsalClient();
			} catch (msalErr) {
				console.warn('[CertGenerate] MSAL client refresh after cert generation failed (will retry on next poll):', msalErr.message);
			}

			appendAuditLog({
				event: 'config.oauth-certificate.generate',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				details: {
					thumbprintSHA256: certData.thumbprintSHA256,
					commonName: certData.commonName,
					notBefore: certData.notBefore,
					notAfter: certData.notAfter
				}
			});

			res.json({
				success: true,
				certificate: {
					thumbprintSHA256: certData.thumbprintSHA256,
					commonName: certData.commonName,
					notBefore: certData.notBefore,
					notAfter: certData.notAfter
				}
			});
		} catch (err) {
			logSanitizedError('Error generating certificate:', err);
			res.status(500).json({ error: getClientSafeErrorMessage(err, 'Failed to generate certificate') });
		}
	});

	// GET /api/oauth-certificate/download — Downloads the public certificate as .pem file
	app.get('/api/oauth-certificate/download', checkApiToken, function(req, res) {
		try {
			const stored = certGenerator.loadCertificate();
			if (!stored || !stored.publicCertPem) {
				return res.status(404).json({ error: 'No certificate found' });
			}

			const filename = `meeteasier-oauth-${stored.thumbprintSHA256.substring(0, 8).toLowerCase()}.pem`;
			res.setHeader('Content-Type', 'application/x-pem-file');
			res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
			res.send(stored.publicCertPem);
		} catch (err) {
			logSanitizedError('Error downloading certificate:', err);
			res.status(500).json({ error: 'Failed to download certificate' });
		}
	});

	// DELETE /api/oauth-certificate — Deletes the stored certificate
	app.delete('/api/oauth-certificate', checkApiToken, function(req, res) {
		try {
			const info = certGenerator.getCertificateInfo();
			const deleted = certGenerator.deleteCertificate();

			if (!deleted) {
				return res.status(404).json({ error: 'No certificate found to delete' });
			}

			// Refresh MSAL clients to fall back to client secret
			try {
				refreshMsalClient();
				require('./socket-controller').refreshMsalClient();
			} catch (msalErr) {
				console.warn('[CertDelete] MSAL client refresh after cert deletion failed (will retry on next poll):', msalErr.message);
			}

			appendAuditLog({
				event: 'config.oauth-certificate.delete',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				details: info
			});

			res.json({ success: true, message: 'Certificate deleted. Reverted to client secret authentication.' });
		} catch (err) {
			logSanitizedError('Error deleting certificate:', err);
			res.status(500).json({ error: getClientSafeErrorMessage(err, 'Failed to delete certificate') });
		}
	});

	// GET /api/system-config — Returns the system configuration (auth required)
	app.get('/api/system-config', checkApiToken, function(req, res) {
		try {
			const systemConfig = configManager.getSystemConfig();
			res.json(systemConfig);
		} catch (err) {
			console.error('Error retrieving system config:', err);
			res.status(500).json({ error: 'Failed to retrieve system configuration' });
		}
	});

	// POST /api/system-config — Updates the system configuration
	// Includes: webhook, graph fetch, HSTS, rate limit, display tracking, IP whitelist, demo mode
	app.post('/api/system-config', checkApiToken, async function(req, res) {
		try {
			if (isSystemEnvConfigured()) {
				return res.status(403).json({
					error: 'System configuration is locked by environment variables',
					message: 'Remove STARTUP_VALIDATION/GRAPH_WEBHOOK env variables to edit via admin panel.'
				});
			}

			const {
				startupValidationStrict,
				graphWebhookEnabled,
				graphWebhookClientState,
				graphWebhookAllowedIps,
				exposeDetailedErrors,
				graphFetchTimeoutMs,
				graphFetchRetryAttempts,
				graphFetchRetryBaseMs,
				hstsMaxAge,
				rateLimitMaxBuckets,
				displayTrackingMode,
				displayTrackingRetentionHours,
				displayTrackingCleanupMinutes,
				displayIpWhitelistEnabled,
				displayIpWhitelist,
				trustReverseProxy,
				demoMode
			} = req.body || {};

			if (
				startupValidationStrict === undefined
				&& graphWebhookEnabled === undefined
				&& graphWebhookClientState === undefined
				&& graphWebhookAllowedIps === undefined
				&& exposeDetailedErrors === undefined
				&& graphFetchTimeoutMs === undefined
				&& graphFetchRetryAttempts === undefined
				&& graphFetchRetryBaseMs === undefined
				&& hstsMaxAge === undefined
				&& rateLimitMaxBuckets === undefined
				&& displayTrackingMode === undefined
				&& displayTrackingRetentionHours === undefined
				&& displayTrackingCleanupMinutes === undefined
				&& displayIpWhitelistEnabled === undefined
				&& displayIpWhitelist === undefined
				&& trustReverseProxy === undefined
				&& demoMode === undefined
			) {
				return res.status(400).json({ error: 'At least one system configuration option is required' });
			}

			const beforeConfig = configManager.getSystemConfig();
			const updatedConfig = await configManager.updateSystemConfig({
				startupValidationStrict,
				graphWebhookEnabled,
				graphWebhookClientState,
				graphWebhookAllowedIps,
				exposeDetailedErrors,
				graphFetchTimeoutMs,
				graphFetchRetryAttempts,
				graphFetchRetryBaseMs,
				hstsMaxAge,
				rateLimitMaxBuckets,
				displayTrackingMode,
				displayTrackingRetentionHours,
				displayTrackingCleanupMinutes,
				displayIpWhitelistEnabled,
				displayIpWhitelist,
				trustReverseProxy,
				demoMode
			});

			require('./socket-controller').refreshPollingSchedule();
			// If demo mode changed, trigger immediate room data refresh
			if (beforeConfig.demoMode !== updatedConfig.demoMode) {
				require('./socket-controller').triggerImmediateRefresh();
			}
			rebuildRateLimiters();

			appendAuditLog({
				event: 'config.system.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: updatedConfig
			});

			res.json({
				success: true,
				config: updatedConfig,
				message: 'System configuration updated'
			});
		} catch (err) {
			console.error('Error updating system config:', err);
			res.status(500).json({ error: getClientSafeErrorMessage(err, 'Failed to update system configuration') });
		}
	});

	// GET /api/power-management — Returns the power management configuration (auth required)
	app.get('/api/power-management', checkApiToken, function(req, res) {
		try {
			const config = configManager.getPowerManagementConfig();
			res.json(config);
		} catch (err) {
			console.error('Error retrieving power management config:', err);
			res.status(500).json({ error: 'Failed to retrieve power management configuration' });
		}
	});

	// POST /api/power-management — Updates the global power management configuration (auth required)
	app.post('/api/power-management', checkApiToken, function(req, res) {
		try {
			const { mode, schedule, mqttHostname } = req.body;

			if (!mode || !['dpms', 'browser', 'mqtt'].includes(mode)) {
				return res.status(400).json({ error: 'Invalid mode. Must be "dpms", "browser", or "mqtt"' });
			}

			const configData = {
				mode,
				schedule: schedule || {
					enabled: false,
					startTime: '20:00',
					endTime: '07:00',
					weekendMode: false
				}
			};
			
			// Add MQTT hostname when mode is mqtt
			if (mode === 'mqtt' && mqttHostname) {
				configData.mqttHostname = mqttHostname;
			}

			const config = configManager.updateGlobalPowerManagementConfig(configData);

			appendAuditLog({
				event: 'config.power-management.global.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				config
			});

			res.json({ 
				success: true, 
				config,
				message: 'Global power management configuration updated'
			});
		} catch (err) {
			console.error('Error updating global power management config:', err);
			res.status(500).json({ error: 'Failed to update global power management configuration' });
		}
	});

	// GET /api/power-management/:clientId — Returns the power management configuration for a specific display
	app.get('/api/power-management/:clientId', checkDisplayOrigin, function(req, res) {
		try {
			const { clientId } = req.params;
			
			// Security: Validate clientId format to prevent injection attacks
			if (!clientId || typeof clientId !== 'string') {
				return res.status(400).json({ error: 'Invalid client ID' });
			}
			
			const sanitizedClientId = String(clientId).trim();
			
			// Prevent prototype pollution and path traversal
			if (sanitizedClientId.includes('__proto__') || 
			    sanitizedClientId.includes('constructor') || 
			    sanitizedClientId.includes('prototype') ||
			    sanitizedClientId.includes('..') ||
			    sanitizedClientId.includes('/') ||
			    sanitizedClientId.includes('\\')) {
				return res.status(400).json({ error: 'Invalid client ID format' });
			}
			
			// Validate length and allowed characters
			if (sanitizedClientId.length < 3 || sanitizedClientId.length > 250) {
				return res.status(400).json({ error: 'Client ID length must be between 3 and 250 characters' });
			}
			
			// Allowed: Alphanumeric, dots, underscores, colons, hyphens, parentheses, spaces
			if (!/^[a-zA-Z0-9._:\-() ]{3,250}$/.test(sanitizedClientId)) {
				return res.status(400).json({ error: 'Client ID contains invalid characters' });
			}
			
			// Returns display-specific configuration or falls back to global configuration
			const config = configManager.getPowerManagementConfigForDisplay(sanitizedClientId);
			res.json(config);
		} catch (err) {
			console.error('Error retrieving power management config for display:', err);
			res.status(500).json({ error: 'Failed to retrieve power management configuration' });
		}
	});

	// POST /api/power-management/:clientId — Updates the power management configuration for a display
	app.post('/api/power-management/:clientId', checkApiToken, function(req, res) {
		try {
			const { clientId } = req.params;
			const { mode, schedule, mqttHostname } = req.body;

			if (!mode || !['dpms', 'browser', 'mqtt'].includes(mode)) {
				return res.status(400).json({ error: 'Invalid mode. Must be "dpms", "browser", or "mqtt"' });
			}

			const configData = {
				mode,
				schedule: schedule || {
					enabled: false,
					startTime: '20:00',
					endTime: '07:00',
					weekendMode: false
				}
			};
			
			// Add MQTT hostname when mode is mqtt
			if (mode === 'mqtt' && mqttHostname) {
				configData.mqttHostname = mqttHostname;
			}

			const config = configManager.updatePowerManagementConfig(clientId, configData);

			appendAuditLog({
				event: 'config.power-management.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				clientId,
				config
			});

			res.json({ 
				success: true, 
				config,
				message: 'Power management configuration updated'
			});
		} catch (err) {
			console.error('Error updating power management config:', err);
			res.status(500).json({ error: 'Failed to update power management configuration' });
		}
	});

	// DELETE /api/power-management/:clientId — Deletes the power management configuration of a display
	app.delete('/api/power-management/:clientId', checkApiToken, function(req, res) {
		try {
			const { clientId } = req.params;
			configManager.deletePowerManagementConfig(clientId);

			appendAuditLog({
				event: 'config.power-management.delete',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				clientId
			});

			res.json({ 
				success: true,
				message: 'Power management configuration deleted'
			});
		} catch (err) {
			console.error('Error deleting power management config:', err);
			res.status(500).json({ error: 'Failed to delete power management configuration' });
		}
	});

	// ======================== MQTT Configuration Endpoints ========================
	
	// GET /api/mqtt-config — Returns the MQTT configuration (without password, auth required)
	app.get('/api/mqtt-config', checkApiToken, function(req, res) {
		try {
			const mqttConfig = configManager.getMqttConfig();
			// Don't send password to the client
			const safeConfig = { ...mqttConfig };
			if (safeConfig.password) {
				safeConfig.hasPassword = true;
				delete safeConfig.password;
			}
			res.json(safeConfig);
		} catch (err) {
			console.error('Error retrieving MQTT config:', err);
			res.status(500).json({ error: 'Failed to retrieve MQTT configuration' });
		}
	});

	// POST /api/mqtt-config — Updates the MQTT configuration and restarts the client if needed
	app.post('/api/mqtt-config', checkApiToken, function(req, res) {
		try {
			const { enabled, brokerUrl, authentication, username, password, discovery } = req.body;
			const beforeConfig = configManager.getMqttConfig();

			const updatedConfig = configManager.updateMqttConfig({
				enabled,
				brokerUrl,
				authentication,
				username,
				password,
				discovery
			});

			appendAuditLog({
				event: 'config.mqtt.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: { ...beforeConfig, password: beforeConfig.password ? '***' : '' },
				after: { ...updatedConfig, password: updatedConfig.password ? '***' : '' }
			});

			// Restart MQTT client if enabled status changed
			if (enabled !== beforeConfig.enabled) {
				const mqttClient = require('./mqtt-client');
				if (enabled) {
					mqttClient.restart();
				} else {
					mqttClient.stop();
				}
			}

			// Don't send password to the client
			if (safeConfig.password) {
				safeConfig.hasPassword = true;
				delete safeConfig.password;
			}

			res.json({
				success: true,
				config: safeConfig,
				message: 'MQTT configuration updated'
			});
		} catch (err) {
			console.error('Error updating MQTT config:', err);
			res.status(500).json({ error: getClientSafeErrorMessage(err, 'Failed to update MQTT configuration') });
		}
	});

	// GET /api/mqtt-status — Returns the MQTT client connection status (auth required)
	app.get('/api/mqtt-status', checkApiToken, function(req, res) {
		try {
			const mqttClient = require('./mqtt-client');
			const status = mqttClient.getStatus();
			res.json(status);
		} catch (err) {
			console.error('Error retrieving MQTT status:', err);
			res.status(500).json({ error: 'Failed to retrieve MQTT status' });
		}
	});

	// GET /api/mqtt-displays — Returns the MQTT display states (auth required)
	app.get('/api/mqtt-displays', checkApiToken, function(req, res) {
		try {
			const mqttPowerBridge = require('./touchkio');
			const displays = mqttPowerBridge.getDisplayStates();
			res.json({ displays });
		} catch (err) {
			console.error('Error retrieving MQTT displays:', err);
			res.status(500).json({ error: 'Failed to retrieve MQTT displays' });
		}
	});

	// POST /api/mqtt-power-trigger/:hostname — Sends a power command to a display (auth required)
	app.post('/api/mqtt-power-trigger/:hostname', checkApiToken, function(req, res) {
		try {
			const { hostname } = req.params;
			const { powerState, brightness } = req.body;
			const mqttPowerBridge = require('./touchkio');
			
			// Send power command directly to the hostname
			const success = mqttPowerBridge.sendPowerCommand(
				hostname, 
				powerState !== undefined ? powerState : true,
				brightness !== undefined ? brightness : 255
			);

			if (success) {
				res.json({ 
					success: true,
					message: 'Power command triggered'
				});
			} else {
				res.status(500).json({ error: 'Failed to trigger power command' });
			}
		} catch (err) {
			console.error('Error triggering power command:', err);
			res.status(500).json({ error: 'Failed to trigger power command' });
		}
	});

	// POST /api/mqtt-brightness/:hostname — Sends a brightness command to a display
	app.post('/api/mqtt-brightness/:hostname', checkApiToken, function(req, res) {
		try {
			const { hostname } = req.params;
			const { brightness } = req.body;
			const mqttPowerBridge = require('./touchkio');
			
			const success = mqttPowerBridge.sendBrightnessCommand(hostname, brightness);

			if (success) {
				res.json({ success: true, message: 'Brightness command sent' });
			} else {
				res.status(500).json({ error: 'Failed to send brightness command' });
			}
		} catch (err) {
			console.error('Error sending brightness command:', err);
			res.status(500).json({ error: 'Failed to send brightness command' });
		}
	});

	// POST /api/mqtt-kiosk/:hostname — Sends a kiosk status command to a display
	app.post('/api/mqtt-kiosk/:hostname', checkApiToken, function(req, res) {
		try {
			const { hostname } = req.params;
			const { status } = req.body;
			const mqttPowerBridge = require('./touchkio');
			
			const success = mqttPowerBridge.sendKioskCommand(hostname, status);

			if (success) {
				res.json({ success: true, message: 'Kiosk command sent' });
			} else {
				res.status(500).json({ error: 'Failed to send kiosk command' });
			}
		} catch (err) {
			console.error('Error sending kiosk command:', err);
			res.status(500).json({ error: 'Failed to send kiosk command' });
		}
	});

	// POST /api/mqtt-theme/:hostname — Sends a theme command to a display
	app.post('/api/mqtt-theme/:hostname', checkApiToken, function(req, res) {
		try {
			const { hostname } = req.params;
			const { theme } = req.body;
			const mqttPowerBridge = require('./touchkio');
			
			const success = mqttPowerBridge.sendThemeCommand(hostname, theme);

			if (success) {
				res.json({ success: true, message: 'Theme command sent' });
			} else {
				res.status(500).json({ error: 'Failed to send theme command' });
			}
		} catch (err) {
			console.error('Error sending theme command:', err);
			res.status(500).json({ error: 'Failed to send theme command' });
		}
	});

	// POST /api/mqtt-volume/:hostname — Sends a volume command to a display
	app.post('/api/mqtt-volume/:hostname', checkApiToken, function(req, res) {
		try {
			const { hostname } = req.params;
			const { volume } = req.body;
			const mqttPowerBridge = require('./touchkio');
			
			const success = mqttPowerBridge.sendVolumeCommand(hostname, volume);

			if (success) {
				res.json({ success: true, message: 'Volume command sent' });
			} else {
				res.status(500).json({ error: 'Failed to send volume command' });
			}
		} catch (err) {
			console.error('Error sending volume command:', err);
			res.status(500).json({ error: 'Failed to send volume command' });
		}
	});

	// POST /api/mqtt-keyboard/:hostname — Sends a keyboard visibility command to a display
	app.post('/api/mqtt-keyboard/:hostname', checkApiToken, function(req, res) {
		try {
			const { hostname } = req.params;
			const { visible } = req.body;
			const mqttPowerBridge = require('./touchkio');
			
			const success = mqttPowerBridge.sendKeyboardCommand(hostname, visible);

			if (success) {
				res.json({ success: true, message: 'Keyboard command sent' });
			} else {
				res.status(500).json({ error: 'Failed to send keyboard command' });
			}
		} catch (err) {
			console.error('Error sending keyboard command:', err);
			res.status(500).json({ error: 'Failed to send keyboard command' });
		}
	});

	// POST /api/mqtt-page-zoom/:hostname — Sends a page zoom command to a display
	app.post('/api/mqtt-page-zoom/:hostname', checkApiToken, function(req, res) {
		try {
			const { hostname } = req.params;
			const { zoom } = req.body;
			const mqttPowerBridge = require('./touchkio');
			
			const success = mqttPowerBridge.sendPageZoomCommand(hostname, zoom);

			if (success) {
				res.json({ success: true, message: 'Page zoom command sent' });
			} else {
				res.status(500).json({ error: 'Failed to send page zoom command' });
			}
		} catch (err) {
			console.error('Error sending page zoom command:', err);
			res.status(500).json({ error: 'Failed to send page zoom command' });
		}
	});

	// POST /api/mqtt-page-url/:hostname — Sends a page URL command to a display
	app.post('/api/mqtt-page-url/:hostname', checkApiToken, function(req, res) {
		try {
			const { hostname } = req.params;
			const { url } = req.body;
			const mqttPowerBridge = require('./touchkio');
			
			const success = mqttPowerBridge.sendPageUrlCommand(hostname, url);

			if (success) {
				res.json({ success: true, message: 'Page URL command sent' });
			} else {
				res.status(500).json({ error: 'Failed to send page URL command' });
			}
		} catch (err) {
			console.error('Error sending page URL command:', err);
			res.status(500).json({ error: 'Failed to send page URL command' });
		}
	});

	// POST /api/mqtt-refresh/:hostname — Sends a refresh command to a display
	app.post('/api/mqtt-refresh/:hostname', checkApiToken, function(req, res) {
		try {
			const { hostname } = req.params;
			const mqttPowerBridge = require('./touchkio');
			
			const success = mqttPowerBridge.sendRefreshCommand(hostname);

			if (success) {
				res.json({ success: true, message: 'Refresh command sent' });
			} else {
				res.status(500).json({ error: 'Failed to send refresh command' });
			}
		} catch (err) {
			console.error('Error sending refresh command:', err);
			res.status(500).json({ error: 'Failed to send refresh command' });
		}
	});

	// POST /api/mqtt-reboot/:hostname — Sends a reboot command to a display
	app.post('/api/mqtt-reboot/:hostname', checkApiToken, function(req, res) {
		try {
			const { hostname } = req.params;
			const mqttPowerBridge = require('./touchkio');
			
			const success = mqttPowerBridge.sendRebootCommand(hostname);

			if (success) {
				res.json({ success: true, message: 'Reboot command sent' });
			} else {
				res.status(500).json({ error: 'Failed to send reboot command' });
			}
		} catch (err) {
			console.error('Error sending reboot command:', err);
			res.status(500).json({ error: 'Failed to send reboot command' });
		}
	});

	// POST /api/mqtt-shutdown/:hostname — Sends a shutdown command to a display
	app.post('/api/mqtt-shutdown/:hostname', checkApiToken, function(req, res) {
		try {
			const { hostname } = req.params;
			const mqttPowerBridge = require('./touchkio');
			
			const success = mqttPowerBridge.sendShutdownCommand(hostname);

			if (success) {
				res.json({ success: true, message: 'Shutdown command sent' });
			} else {
				res.status(500).json({ error: 'Failed to send shutdown command' });
			}
		} catch (err) {
			console.error('Error sending shutdown command:', err);
			res.status(500).json({ error: 'Failed to send shutdown command' });
		}
	});

	// POST /api/mqtt-refresh-all — Sends a refresh command to ALL displays
	app.post('/api/mqtt-refresh-all', checkApiToken, function(req, res) {
		try {
			const mqttPowerBridge = require('./touchkio');
			const displays = mqttPowerBridge.getAllDisplays();
			
			let successCount = 0;
			let failCount = 0;

			displays.forEach(display => {
				const identifier = display.deviceId || display.hostname;
				const success = mqttPowerBridge.sendRefreshCommand(identifier);
				if (success) {
					successCount++;
				} else {
					failCount++;
				}
			});

			res.json({ 
				success: true, 
				message: `Refresh command sent to ${successCount} display(s)`,
				successCount,
				failCount,
				total: displays.length
			});
		} catch (err) {
			console.error('Error sending refresh-all command:', err);
			res.status(500).json({ error: 'Failed to send refresh-all command' });
		}
	});

	// POST /api/mqtt-reboot-all — Sends a reboot command to ALL displays
	app.post('/api/mqtt-reboot-all', checkApiToken, function(req, res) {
		try {
			const mqttPowerBridge = require('./touchkio');
			const displays = mqttPowerBridge.getAllDisplays();
			
			let successCount = 0;
			let failCount = 0;

			displays.forEach(display => {
				const identifier = display.deviceId || display.hostname;
				const success = mqttPowerBridge.sendRebootCommand(identifier);
				if (success) {
					successCount++;
				} else {
					failCount++;
				}
			});

			res.json({ 
				success: true, 
				message: `Reboot command sent to ${successCount} display(s)`,
				successCount,
				failCount,
				total: displays.length
			});
		} catch (err) {
			console.error('Error sending reboot-all command:', err);
			res.status(500).json({ error: 'Failed to send reboot-all command' });
		}
	});

	// POST /api/wifi — Updates the WiFi configuration and regenerates QR code (WiFi token required)
	app.post('/api/wifi', checkWiFiApiToken, async function(req, res) {
		try {
			const { ssid, password } = req.body;
			const beforeConfig = configManager.getWiFiConfig();
			
			if (!ssid) {
				return res.status(400).json({ error: 'SSID is required' });
			}

			const config = await configManager.updateWiFiConfig(ssid, password || '');
			appendAuditLog({
				event: 'config.wifi.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: config
			});
			res.json({ 
				success: true, 
				config,
				message: 'WiFi configuration updated and QR code generated'
			});
		} catch (err) {
			console.error('Error updating WiFi config:', err);
			res.status(500).json({ error: 'Failed to update WiFi configuration' });
		}
	});

	// POST /api/logo — Updates the logo configuration (auth required)
	app.post('/api/logo', checkApiToken, async function(req, res) {
		try {
			const { logoDarkUrl, logoLightUrl } = req.body;
			const beforeConfig = configManager.getLogoConfig();
			
			if (!logoDarkUrl && !logoLightUrl) {
				return res.status(400).json({ error: 'At least one logo URL is required' });
			}

			const config = await configManager.updateLogoConfig(logoDarkUrl, logoLightUrl);
			appendAuditLog({
				event: 'config.logo.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: config
			});
			res.json({ 
				success: true, 
				config,
				message: 'Logo configuration updated'
			});
		} catch (err) {
			console.error('Error updating logo config:', err);
			res.status(500).json({ error: 'Failed to update logo configuration' });
		}
	});

	// POST /api/logo/upload — Uploads a logo file and updates the configuration (auth required)
	app.post('/api/logo/upload', checkApiToken, upload.single('logo'), async function(req, res) {
		try {
			if (!req.file) {
				return res.status(400).json({ error: 'No file uploaded' });
			}

			const { logoType } = req.body; // 'dark' or 'light'
			
			if (!logoType || (logoType !== 'dark' && logoType !== 'light')) {
				return res.status(400).json({ error: 'Logo type must be "dark" or "light"' });
			}

			// Generate URL path for the uploaded file
			const logoUrl = `/img/uploads/${req.file.filename}`;
			
			// Load current configuration
			const currentConfig = configManager.getLogoConfig();
			
			// Only update the specified logo
			const logoDarkUrl = logoType === 'dark' ? logoUrl : currentConfig.logoDarkUrl;
			const logoLightUrl = logoType === 'light' ? logoUrl : currentConfig.logoLightUrl;
			
			// Update logo configuration with the new file path
			const config = await configManager.updateLogoConfig(logoDarkUrl, logoLightUrl);
			
			res.json({ 
				success: true, 
				config,
				logoUrl: logoUrl,
				message: `${logoType === 'dark' ? 'Dark' : 'Light'} logo uploaded and configuration updated`
			});
		} catch (err) {
			console.error('Error uploading logo:', err);
			// Clean up uploaded file on error
			if (req.file) {
				fs.unlink(req.file.path, (unlinkErr) => {
					if (unlinkErr) console.error('Error deleting file:', unlinkErr);
				});
			}
			res.status(500).json({ error: getClientSafeErrorMessage(err, 'Failed to upload logo') });
		}
	});

	// GET /api/sidebar — Returns the current sidebar/information configuration (public)
	// Supports optional displayClientId parameter for client-specific configuration
	app.get('/api/sidebar', function(req, res) {
		try {
			const displayClientId = String(req.query.displayClientId || '').trim();
			const sidebarConfig = displayClientId
				? configManager.getSidebarConfigForClient(displayClientId)
				: configManager.getSidebarConfig();
			res.json(sidebarConfig);
		} catch (err) {
			res.status(500).json({ error: 'Failed to retrieve information configuration' });
		}
	});

	// GET /api/connected-clients — Returns the connected display clients (auth required)
	app.get('/api/connected-clients', checkApiToken, function(req, res) {
		try {
			const socketController = require('./socket-controller');
			const clients = typeof socketController.getConnectedDisplayClients === 'function'
				? socketController.getConnectedDisplayClients()
				: [];
			res.json({ clients });
		} catch (err) {
			console.error('Error retrieving connected clients:', err);
			res.status(500).json({ error: 'Failed to retrieve connected clients' });
		}
	});

	// GET /api/displays — Returns merged displays (Socket.IO + MQTT) (auth required)
	// Combines Socket.IO-connected displays with MQTT displays via different matching strategies
	app.get('/api/displays', checkApiToken, function(req, res) {
		try {
			// Demo mode: Return demo displays
			const systemConfig = configManager.getSystemConfig();
			if (systemConfig.demoMode) {
				return res.json({ displays: demoData.getDemoDisplays() });
			}

			const socketController = require('./socket-controller');
			const mqttPowerBridge = require('./touchkio');
			
			// Load Socket.IO-connected displays
			const socketDisplays = typeof socketController.getConnectedDisplayClients === 'function'
				? socketController.getConnectedDisplayClients()
				: [];
			
			// Load MQTT displays
			const mqttDisplays = mqttPowerBridge.getDisplayStates();
			
			// Create map for fast lookup
			const displayMap = new Map();
			
			// Add Socket.IO displays first
			socketDisplays.forEach(display => {
				const key = display.clientId.toLowerCase();
				// Remove IP prefix from clientId for display name (e.g. "192.168.3.220_flightboard" → "flightboard")
				let displayName = display.roomAlias || display.clientId;
				if (!display.roomAlias && /^\d+\.\d+\.\d+\.\d+_/.test(displayName)) {
					displayName = displayName.replace(/^\d+\.\d+\.\d+\.\d+_/, '');
				}
				displayMap.set(key, {
					id: display.clientId,
					name: displayName,
					type: display.displayType || 'unknown',
					ipAddress: display.ipAddress,
					socketIO: {
						connected: true,
						status: display.sockets > 0 ? 'active' : 'disconnected',
						connectedAt: display.connectedAt,
						lastSeenAt: display.lastSeenAt,
						sockets: display.sockets
					},
					mqtt: null
				});
			});
			
			// Merge or add MQTT displays
			mqttDisplays.forEach(mqtt => {
				const deviceKey = (mqtt.deviceId || mqtt.hostname).toLowerCase();
				const mqttIp = mqtt.networkAddress ? mqtt.networkAddress.toLowerCase() : null;
				const mqttRoom = mqtt.room ? mqtt.room.toLowerCase() : null;
				
				let existingDisplay = null;
				
				// Try multiple matching strategies (only match same physical device, not same room!)
				for (const [key, display] of displayMap.entries()) {
					// Strategy 1: Exact IP address match (most reliable method for same physical device)
					if (mqttIp && display.ipAddress) {
						const socketIp = display.ipAddress.toLowerCase();
						if (socketIp === mqttIp || socketIp.includes(mqttIp)) {
							existingDisplay = display;
							break;
						}
					}
					
					// Strategy 2: clientId contains deviceId (e.g. "192.168.1.10_rpi_1A4187")
					if (mqtt.deviceId && display.id.toLowerCase().includes(mqtt.deviceId.toLowerCase())) {
						existingDisplay = display;
						break;
					}
				}
				
				const mqttData = {
					connected: !!(mqtt.lastSeen && (Date.now() - new Date(mqtt.lastSeen).getTime()) < 5 * 60 * 1000),
					hostname: mqtt.hostname,
					deviceId: mqtt.deviceId,
					room: mqtt.room,
					power: mqtt.powerUnsupported === true ? undefined : (mqtt.powerUnsupported === false ? mqtt.power : undefined),
					brightness: mqtt.brightness,
					powerUnsupported: mqtt.powerUnsupported === true ? true : (mqtt.powerUnsupported === false ? false : undefined),
					brightnessUnsupported: mqtt.brightnessUnsupported === true ? true : (mqtt.brightnessUnsupported === false ? false : undefined),
					kioskStatus: mqtt.kioskStatus,
					theme: mqtt.theme,
					volume: mqtt.volume,
					pageUrl: mqtt.pageUrl,
					cpuUsage: mqtt.cpuUsage,
					memoryUsage: mqtt.memoryUsage,
					temperature: mqtt.temperature,
					networkAddress: mqtt.networkAddress,
					uptime: mqtt.uptime,
					lastUpdate: mqtt.lastUpdate,
					lastSeen: mqtt.lastSeen,
					errors: mqtt.errors,
					lastErrorUpdate: mqtt.lastErrorUpdate
				};
				
				if (existingDisplay) {
					// Merge MQTT data into existing Socket.IO display
					existingDisplay.mqtt = mqttData;
					// Update IP if available from MQTT
					if (mqtt.networkAddress && !existingDisplay.ipAddress) {
						existingDisplay.ipAddress = mqtt.networkAddress;
					}
					// Use MQTT room name as display name if current name contains an IP (raw clientId)
					if (mqtt.room && existingDisplay.name && /\d+\.\d+\.\d+\.\d+/.test(existingDisplay.name)) {
						existingDisplay.name = mqtt.room;
					}
				} else {
					// Add as MQTT-only display
					// Use room name if available, otherwise hostname
					const displayName = mqtt.room || mqtt.hostname;
					const displayType = mqtt.room ? 'single-room' : 'unknown';
					
					displayMap.set(deviceKey, {
						id: mqtt.deviceId || mqtt.hostname,
						name: displayName,
						type: displayType,
						ipAddress: mqtt.networkAddress,
						socketIO: null,
						mqtt: mqttData
					});
				}
			});
			
			// Convert map to array
			const displays = Array.from(displayMap.values());
			
			res.json({ displays });
		} catch (err) {
			console.error('Error retrieving merged displays:', err);
			res.status(500).json({ error: 'Failed to retrieve displays' });
		}
	});

	// DELETE /api/connected-clients/:clientId — Removes a disconnected display client
	app.delete('/api/connected-clients/:clientId', checkApiToken, function(req, res) {
		try {
			const socketController = require('./socket-controller');
			const clientId = req.params.clientId;
			
			if (!clientId) {
				return res.status(400).json({ error: 'Client ID is required' });
			}

			if (typeof socketController.removeDisplayClient === 'function') {
				const removed = socketController.removeDisplayClient(clientId);
				if (removed) {
					res.json({ success: true, message: 'Display client removed successfully' });
				} else {
					res.status(404).json({ error: 'Display client not found or still connected' });
				}
			} else {
				res.status(500).json({ error: 'Remove function not available' });
			}
		} catch (err) {
			console.error('Error removing display client:', err);
			res.status(500).json({ error: 'Failed to remove display client' });
		}
	});

	// GET /api/config-locks — Returns the lock status of configurations
	// Shows which settings are configured via environment variables (.env) and thus locked
	app.get('/api/config-locks', function(req, res) {
		try {
			const isEnvConfigured = (name) => process.env[name] !== undefined;

			const locks = {
				wifiLocked: isEnvConfigured('WIFI_SSID') || isEnvConfigured('WIFI_PASSWORD'),
				logoLocked: isEnvConfigured('LOGO_DARK_URL') || isEnvConfigured('LOGO_LIGHT_URL'),
				sidebarLocked: isEnvConfigured('SIDEBAR_SHOW_WIFI') || isEnvConfigured('SIDEBAR_SHOW_UPCOMING') || isEnvConfigured('SIDEBAR_SHOW_TITLES') || isEnvConfigured('SIDEBAR_UPCOMING_COUNT') || isEnvConfigured('SIDEBAR_SINGLE_ROOM_DARK_MODE'),
				bookingLocked: isEnvConfigured('ENABLE_BOOKING')
					|| isEnvConfigured('CHECKIN_ENABLED')
					|| isEnvConfigured('CHECKIN_REQUIRED_FOR_EXTERNAL')
					|| isEnvConfigured('CHECKIN_EARLY_MINUTES')
					|| isEnvConfigured('CHECKIN_WINDOW_MINUTES')
					|| isEnvConfigured('CHECKIN_AUTO_RELEASE_NO_SHOW'),
				searchLocked: !!(
					isEnvConfigured('SEARCH_USE_GRAPHAPI')
					|| isEnvConfigured('SEARCH_MAXDAYS')
					|| isEnvConfigured('SEARCH_MAXROOMLISTS')
					|| isEnvConfigured('SEARCH_MAXROOMS')
					|| isEnvConfigured('SEARCH_MAXITEMS')
					|| isEnvConfigured('SEARCH_POLL_INTERVAL_MS')
				),
				rateLimitLocked: !!(
					isEnvConfigured('RATE_LIMIT_API_WINDOW_MS')
					|| isEnvConfigured('RATE_LIMIT_API_MAX')
					|| isEnvConfigured('RATE_LIMIT_WRITE_WINDOW_MS')
					|| isEnvConfigured('RATE_LIMIT_WRITE_MAX')
					|| isEnvConfigured('RATE_LIMIT_AUTH_WINDOW_MS')
					|| isEnvConfigured('RATE_LIMIT_AUTH_MAX')
				),
				apiTokenLocked: configManager.isApiTokenEnvLocked(),
				wifiApiTokenLocked: configManager.isWifiApiTokenEnvLocked ? configManager.isWifiApiTokenEnvLocked() : false,
				oauthLocked: isOAuthEnvConfigured(),
				systemLocked: isSystemEnvConfigured(),
				maintenanceLocked: isMaintenanceEnvConfigured()
				,
				translationApiLocked: isTranslationApiEnvConfigured()
			};
			res.json(locks);
		} catch (err) {
			res.status(500).json({ error: 'Failed to retrieve configuration locks' });
		}
	});

	// GET /api/translation-api-config — Returns the translation API configuration
	app.get('/api/translation-api-config', function(req, res) {
		try {
			const translationApiConfig = configManager.getTranslationApiConfig();
			res.json(translationApiConfig);
		} catch (err) {
			console.error('Error retrieving translation API config:', err);
			res.status(500).json({ error: 'Failed to retrieve translation API configuration' });
		}
	});

	// POST /api/translation-api-config — Updates the translation API configuration
	app.post('/api/translation-api-config', checkApiToken, async function(req, res) {
		try {
			if (isTranslationApiEnvConfigured()) {
				return res.status(403).json({
					error: 'Translation API configuration is locked by environment variables',
					message: 'Remove AUTO_TRANSLATE_* env variables to edit via admin panel.'
				});
			}

			const {
				enabled,
				url,
				apiKey,
				timeoutMs
			} = req.body || {};

			if (
				enabled === undefined
				&& url === undefined
				&& apiKey === undefined
				&& timeoutMs === undefined
			) {
				return res.status(400).json({ error: 'At least one translation API configuration option is required' });
			}

			const beforeConfig = configManager.getTranslationApiConfig();
			const updatedConfig = await configManager.updateTranslationApiConfig({
				enabled,
				url,
				apiKey,
				timeoutMs
			});

			appendAuditLog({
				event: 'config.translation_api.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: updatedConfig
			});

			res.json({
				success: true,
				config: updatedConfig,
				message: 'Translation API configuration updated'
			});
		} catch (err) {
			console.error('Error updating translation API config:', err);
			res.status(500).json({ error: getClientSafeErrorMessage(err, 'Failed to update translation API configuration') });
		}
	});

	// GET /api/search-config — Returns the search configuration
	app.get('/api/search-config', function(req, res) {
		try {
			const searchConfig = configManager.getSearchConfig();
			res.json(searchConfig);
		} catch (err) {
			console.error('Error retrieving search config:', err);
			res.status(500).json({ error: 'Failed to retrieve search configuration' });
		}
	});

	// POST /api/search-config — Updates the search configuration (Graph API, limits, polling interval)
	app.post('/api/search-config', checkApiToken, async function(req, res) {
		try {
			const {
				useGraphAPI,
				maxDays,
				maxRoomLists,
				maxRooms,
				maxItems,
				pollIntervalMs
			} = req.body || {};

			if (
				useGraphAPI === undefined
				&& maxDays === undefined
				&& maxRoomLists === undefined
				&& maxRooms === undefined
				&& maxItems === undefined
				&& pollIntervalMs === undefined
			) {
				return res.status(400).json({ error: 'At least one search configuration option is required' });
			}

			const beforeConfig = configManager.getSearchConfig();
			const updatedConfig = await configManager.updateSearchConfig({
				useGraphAPI,
				maxDays,
				maxRoomLists,
				maxRooms,
				maxItems,
				pollIntervalMs
			});

			require('./socket-controller').refreshPollingSchedule();
			triggerRoomRefreshWithFollowUp();

			appendAuditLog({
				event: 'config.search.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: updatedConfig
			});

			res.json({
				success: true,
				config: updatedConfig,
				message: 'Search configuration updated'
			});
		} catch (err) {
			console.error('Error updating search config:', err);
			res.status(500).json({ error: 'Failed to update search configuration' });
		}
	});

	// GET /api/rate-limit-config — Returns the rate limit configuration
	app.get('/api/rate-limit-config', function(req, res) {
		try {
			const rateLimitConfig = configManager.getRateLimitConfig();
			res.json(rateLimitConfig);
		} catch (err) {
			console.error('Error retrieving rate limit config:', err);
			res.status(500).json({ error: 'Failed to retrieve rate limit configuration' });
		}
	});

	// POST /api/rate-limit-config — Updates the rate limit configuration and rebuilds limiters
	app.post('/api/rate-limit-config', checkApiToken, async function(req, res) {
		try {
			const {
				apiWindowMs,
				apiMax,
				writeWindowMs,
				writeMax,
				authWindowMs,
				authMax,
				bookingWindowMs,
				bookingMax
			} = req.body || {};

			if (
				apiWindowMs === undefined
				&& apiMax === undefined
				&& writeWindowMs === undefined
				&& writeMax === undefined
				&& authWindowMs === undefined
				&& authMax === undefined
				&& bookingWindowMs === undefined
				&& bookingMax === undefined
			) {
				return res.status(400).json({ error: 'At least one rate limit configuration option is required' });
			}

			const beforeConfig = configManager.getRateLimitConfig();
			const updatedConfig = await configManager.updateRateLimitConfig({
				apiWindowMs,
				apiMax,
				writeWindowMs,
				writeMax,
				authWindowMs,
				authMax,
				bookingWindowMs,
				bookingMax
			});

			rebuildRateLimiters();

			appendAuditLog({
				event: 'config.rate_limit.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: updatedConfig
			});

			res.json({
				success: true,
				config: updatedConfig,
				message: 'Rate limit configuration updated'
			});
		} catch (err) {
			console.error('Error updating rate limit config:', err);
			res.status(500).json({ error: 'Failed to update rate limit configuration' });
		}
	});

	// POST /api/sidebar — Updates the sidebar/information configuration
	// Supports global and client-specific settings
	app.post('/api/sidebar', checkApiToken, async function(req, res) {
		try {
			const {
				showWiFi,
				showUpcomingMeetings,
				showMeetingTitles,
				minimalHeaderStyle,
				upcomingMeetingsCount,
				singleRoomDarkMode,
				flightboardDarkMode,
				targetClientId,
				clearClientOverride
			} = req.body || {};
			const beforeConfig = configManager.getSidebarConfig();
			const normalizedTargetClientId = String(targetClientId || '').trim();
			
			if (normalizedTargetClientId) {
				if (!/^[a-zA-Z0-9._:-]{3,120}$/.test(normalizedTargetClientId)) {
					return res.status(400).json({ error: 'Invalid targetClientId format' });
				}

				if (singleRoomDarkMode === undefined && !clearClientOverride) {
					return res.status(400).json({ error: 'singleRoomDarkMode or clearClientOverride is required for client-specific update' });
				}
			} else if (showWiFi === undefined && showUpcomingMeetings === undefined && showMeetingTitles === undefined && minimalHeaderStyle === undefined && upcomingMeetingsCount === undefined && singleRoomDarkMode === undefined && flightboardDarkMode === undefined) {
				return res.status(400).json({ error: 'At least one configuration option is required' });
			}

			const config = await configManager.updateSidebarConfig(
				showWiFi,
				showUpcomingMeetings,
				showMeetingTitles,
				minimalHeaderStyle,
				upcomingMeetingsCount,
				{
					singleRoomDarkMode,
					flightboardDarkMode,
					targetClientId: normalizedTargetClientId || undefined,
					clearClientOverride: !!clearClientOverride
				}
			);

			if (normalizedTargetClientId) {
				try {
					const socketController = require('./socket-controller');
					if (typeof socketController.emitToDisplayClient === 'function') {
						const effectiveConfig = configManager.getSidebarConfigForClient(normalizedTargetClientId);
						socketController.emitToDisplayClient(normalizedTargetClientId, 'sidebarConfigUpdated', effectiveConfig);
					}
				} catch (emitErr) {
					console.warn('Failed to emit targeted sidebar update:', emitErr.message);
				}
			}

			appendAuditLog({
				event: 'config.sidebar.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: config,
				targetClientId: normalizedTargetClientId || null,
				clientOverrideCleared: normalizedTargetClientId ? !!clearClientOverride : false
			});
			res.json({ 
				success: true, 
				config,
				message: normalizedTargetClientId
					? (clearClientOverride ? 'Client-specific information override cleared' : 'Client-specific information configuration updated')
					: 'Information configuration updated'
			});
		} catch (err) {
			console.error('Error updating information config:', err);
			res.status(500).json({ error: 'Failed to update information configuration' });
		}
	});

	// GET /api/booking-config — Returns the effective booking configuration (public)
	// Takes into account room/group overrides and Calendars.ReadWrite permission
	app.get('/api/booking-config', async function(req, res) {
		try {
			const bookingConfig = configManager.getBookingConfig();
			const roomEmail = req.query.roomEmail;
			const roomGroup = req.query.roomGroup;
			
			// Check whether Calendars.ReadWrite permission is available
			const hasPermission = await checkCalendarWritePermission();
			const effectiveBooking = getEffectiveBookingConfig(bookingConfig, roomEmail, roomGroup, hasPermission);
			
			// If permission is missing, disable booking regardless of configuration
			const effectiveConfig = {
				...bookingConfig,
				enableBooking: effectiveBooking.enableBooking,
				enableExtendMeeting: effectiveBooking.enableExtendMeeting,
				groupOverrideApplied: effectiveBooking.groupOverrideApplied,
				roomOverrideApplied: effectiveBooking.roomOverrideApplied,
				permissionMissing: !hasPermission
			};
			
			res.json(effectiveConfig);
		} catch (err) {
			console.error('Error retrieving booking config:', err);
			res.status(500).json({ error: 'Failed to retrieve booking configuration' });
		}
	});

	// GET /api/colors — Returns the color configuration
	app.get('/api/colors', async function(req, res) {
		try {
			const colorsConfig = configManager.getColorsConfig();
			res.json(colorsConfig);
		} catch (err) {
			console.error('Error retrieving colors config:', err);
			res.status(500).json({ error: 'Failed to retrieve colors configuration' });
		}
	});

	// GET /api/i18n — Returns the internationalization configuration
	app.get('/api/i18n', function(req, res) {
		try {
			const i18nConfig = configManager.getI18nConfig();
			res.json(i18nConfig);
		} catch (err) {
			console.error('Error retrieving i18n config:', err);
			res.status(500).json({ error: 'Failed to retrieve i18n configuration' });
		}
	});

	// POST /api/booking-config — Updates the booking configuration (auth required)
	// Includes: enable booking, button color, meeting extension, feature flags, check-in
	app.post('/api/booking-config', checkApiToken, async function(req, res) {
		try {
			const { enableBooking, buttonColor, enableExtendMeeting, extendMeetingUrlAllowlist, roomFeatureFlags, roomGroupFeatureFlags, checkIn } = req.body;
			const beforeConfig = configManager.getBookingConfig();
			
			if (enableBooking === undefined && buttonColor === undefined && enableExtendMeeting === undefined && extendMeetingUrlAllowlist === undefined && roomFeatureFlags === undefined && roomGroupFeatureFlags === undefined && checkIn === undefined) {
				return res.status(400).json({ error: 'At least one booking configuration option is required' });
			}

			// Check whether Calendars.ReadWrite permission is available
			const hasPermission = await checkCalendarWritePermission();
			
			if (enableBooking === true && !hasPermission) {
				return res.status(403).json({ 
					error: 'Cannot enable booking: Calendars.ReadWrite permission is missing',
					message: 'Please grant Calendars.ReadWrite permission in Azure AD to enable the booking feature'
				});
			}

			const config = await configManager.updateBookingConfig(enableBooking, buttonColor, enableExtendMeeting, extendMeetingUrlAllowlist, roomFeatureFlags, roomGroupFeatureFlags, checkIn);

			appendAuditLog({
				event: 'config.booking.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: config
			});
			res.json({ 
				success: true, 
				config,
				message: 'Booking configuration updated'
			});
		} catch (err) {
			console.error('Error updating booking config:', err);
			res.status(500).json({ error: 'Failed to update booking configuration' });
		}
	});

	// POST /api/colors — Updates the color configuration (booking button, status colors)
	app.post('/api/colors', checkApiToken, async function(req, res) {
		try {
			const { bookingButtonColor, statusAvailableColor, statusBusyColor, statusUpcomingColor, statusNotFoundColor } = req.body;
			const beforeConfig = configManager.getColorsConfig();
			
			const config = await configManager.updateColorsConfig(
				bookingButtonColor,
				statusAvailableColor,
				statusBusyColor,
				statusUpcomingColor,
				statusNotFoundColor
			);

			appendAuditLog({
				event: 'config.colors.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: config
			});
			
			res.json({ 
				success: true, 
				config,
				message: 'Colors configuration updated'
			});
		} catch (err) {
			console.error('Error updating colors config:', err);
			res.status(500).json({ error: 'Failed to update colors configuration' });
		}
	});

	// POST /api/maintenance — Updates the maintenance mode configuration
	app.post('/api/maintenance', checkApiToken, async function(req, res) {
		try {
			if (isMaintenanceEnvConfigured()) {
				return res.status(403).json({
					error: 'Maintenance configuration is locked by environment variables',
					message: 'Remove MAINTENANCE_MODE/MAINTENANCE_MESSAGE from environment to edit via admin panel.'
				});
			}

			const { enabled, message } = req.body;
			const beforeConfig = configManager.getMaintenanceConfig();
			if (enabled === undefined && message === undefined) {
				return res.status(400).json({ error: 'At least one maintenance configuration option is required' });
			}

			const maintenanceConfig = await configManager.updateMaintenanceConfig(enabled, message);
			appendAuditLog({
				event: 'config.maintenance.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: maintenanceConfig
			});

			res.json({
				success: true,
				config: maintenanceConfig,
				message: 'Maintenance configuration updated'
			});
		} catch (err) {
			console.error('Error updating maintenance config:', err);
			res.status(500).json({ error: 'Failed to update maintenance configuration' });
		}
	});

	// POST /api/i18n — Updates the internationalization configuration (maintenance texts, admin translations)
	app.post('/api/i18n', checkApiToken, async function(req, res) {
		try {
			const { maintenanceMessages, adminTranslations } = req.body || {};
			const hasMaintenanceMessages = maintenanceMessages && typeof maintenanceMessages === 'object' && !Array.isArray(maintenanceMessages);
			const hasAdminTranslations = adminTranslations && typeof adminTranslations === 'object' && !Array.isArray(adminTranslations);

			if (!hasMaintenanceMessages && !hasAdminTranslations) {
				return res.status(400).json({ error: 'At least one of maintenanceMessages or adminTranslations object is required' });
			}

			const beforeConfig = configManager.getI18nConfig();
			const i18nConfig = await configManager.updateI18nConfig({
				maintenanceMessages,
				adminTranslations
			});

			appendAuditLog({
				event: 'config.i18n.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: i18nConfig
			});

			res.json({
				success: true,
				config: i18nConfig,
				message: 'i18n configuration updated'
			});
		} catch (err) {
			console.error('Error updating i18n config:', err);
			res.status(500).json({ error: 'Failed to update i18n configuration' });
		}
	});

	// POST /api/i18n/auto-translate — Automatically translates maintenance and admin texts into the target language
	app.post('/api/i18n/auto-translate', checkApiToken, async function(req, res) {
		try {
			const { targetLanguage, sourceLanguage, maintenanceSource, adminSource } = req.body || {};
			const normalizedTargetLanguage = normalizeLanguageCode(targetLanguage);
			const normalizedSourceLanguage = normalizeLanguageCode(sourceLanguage) || 'en';

			if (!normalizedTargetLanguage || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(normalizedTargetLanguage)) {
				return res.status(400).json({ error: 'Invalid target language code' });
			}

			if (!maintenanceSource || typeof maintenanceSource !== 'object' || Array.isArray(maintenanceSource)) {
				return res.status(400).json({ error: 'maintenanceSource must be an object' });
			}

			if (!adminSource || typeof adminSource !== 'object' || Array.isArray(adminSource)) {
				return res.status(400).json({ error: 'adminSource must be an object' });
			}

			const translatedMaintenance = await translateObjectValues(
				{
					title: maintenanceSource.title || '',
					body: maintenanceSource.body || ''
				},
				normalizedSourceLanguage,
				normalizedTargetLanguage
			);

			const translatedAdmin = await translateObjectValues(
				adminSource,
				normalizedSourceLanguage,
				normalizedTargetLanguage
			);

			return res.json({
				success: true,
				maintenance: translatedMaintenance,
				admin: translatedAdmin
			});
		} catch (err) {
			console.error('Error auto-translating i18n:', err);
			return res.status(500).json({ error: 'Failed to auto-translate language content' });
		}
	});

	// GET /api/audit-logs — Returns the audit logs (auth required, default: 200 entries)
	app.get('/api/audit-logs', checkApiToken, function(req, res) {
		const limit = req.query.limit ? parseInt(req.query.limit, 10) : 200;
		res.json({
			logs: getAuditLogs(limit)
		});
	});

	// GET /api/config/backup — Exports the entire configuration as a backup (auth required)
	app.get('/api/config/backup', checkApiToken, function(req, res) {
		const backup = {
			createdAt: new Date().toISOString(),
			version: '1.0',
			wifi: configManager.getWiFiConfig(),
			logo: configManager.getLogoConfig(),
			sidebar: configManager.getSidebarConfig(),
			booking: configManager.getBookingConfig(),
			system: configManager.getSystemConfig(),
			oauth: configManager.getOAuthConfig(),
			search: configManager.getSearchConfig(),
			rateLimit: configManager.getRateLimitConfig(),
			colors: configManager.getColorsConfig(),
			maintenance: configManager.getMaintenanceConfig(),
			i18n: configManager.getI18nConfig()
		};

		appendAuditLog({
			event: 'config.backup.export',
			path: req.path,
			method: req.method,
			ip: getClientIp(req),
			userAgent: req.headers['user-agent'] || null
		});

		res.json(backup);
	});

	// POST /api/config/restore — Restores a configuration from a backup (auth required)
	// Updates all configuration areas and triggers necessary restarts/refreshes
	app.post('/api/config/restore', checkApiToken, async function(req, res) {
		try {
			const payload = req.body;
			if (!payload || typeof payload !== 'object') {
				return res.status(400).json({ error: 'Invalid restore payload' });
			}

			const beforeState = {
				wifi: configManager.getWiFiConfig(),
				logo: configManager.getLogoConfig(),
				sidebar: configManager.getSidebarConfig(),
				booking: configManager.getBookingConfig(),
				system: configManager.getSystemConfig(),
				oauth: configManager.getOAuthConfig(),
				search: configManager.getSearchConfig(),
				rateLimit: configManager.getRateLimitConfig(),
				colors: configManager.getColorsConfig(),
				maintenance: configManager.getMaintenanceConfig(),
				i18n: configManager.getI18nConfig()
			};

			if (payload.wifi && payload.wifi.ssid !== undefined) {
				await configManager.updateWiFiConfig(payload.wifi.ssid, payload.wifi.password || '');
			}

			if (payload.logo) {
				await configManager.updateLogoConfig(payload.logo.logoDarkUrl, payload.logo.logoLightUrl);
			}

			if (payload.sidebar) {
				await configManager.updateSidebarConfig(
					payload.sidebar.showWiFi,
					payload.sidebar.showUpcomingMeetings,
					payload.sidebar.showMeetingTitles,
					payload.sidebar.minimalHeaderStyle
				);
			}

			if (payload.booking) {
				await configManager.updateBookingConfig(
					payload.booking.enableBooking,
					payload.booking.buttonColor,
					payload.booking.enableExtendMeeting,
					payload.booking.extendMeetingUrlAllowlist,
					payload.booking.roomFeatureFlags,
					payload.booking.roomGroupFeatureFlags,
					payload.booking.checkIn
				);
			}

			if (payload.system && !isSystemEnvConfigured()) {
				await configManager.updateSystemConfig({
					startupValidationStrict: payload.system.startupValidationStrict,
					graphWebhookEnabled: payload.system.graphWebhookEnabled,
					graphWebhookClientState: payload.system.graphWebhookClientState,
					graphWebhookAllowedIps: payload.system.graphWebhookAllowedIps
				});
				require('./socket-controller').refreshPollingSchedule();
			}

			if (payload.oauth && !isOAuthEnvConfigured()) {
				await configManager.updateOAuthConfig({
					clientId: payload.oauth.clientId,
					authority: payload.oauth.authority
				});
				refreshMsalClient();
				require('./socket-controller').refreshMsalClient();
			}

			if (payload.search) {
				await configManager.updateSearchConfig({
					useGraphAPI: payload.search.useGraphAPI,
					maxDays: payload.search.maxDays,
					maxRoomLists: payload.search.maxRoomLists,
					maxRooms: payload.search.maxRooms,
					maxItems: payload.search.maxItems,
					pollIntervalMs: payload.search.pollIntervalMs
				});
				require('./socket-controller').refreshPollingSchedule();
			}

			if (payload.rateLimit) {
				await configManager.updateRateLimitConfig({
					apiWindowMs: payload.rateLimit.apiWindowMs,
					apiMax: payload.rateLimit.apiMax,
					writeWindowMs: payload.rateLimit.writeWindowMs,
					writeMax: payload.rateLimit.writeMax,
					authWindowMs: payload.rateLimit.authWindowMs,
					authMax: payload.rateLimit.authMax
				});
				rebuildRateLimiters();
			}

			if (payload.colors) {
				await configManager.updateColorsConfig(
					payload.colors.bookingButtonColor,
					payload.colors.statusAvailableColor,
					payload.colors.statusBusyColor,
					payload.colors.statusUpcomingColor,
					payload.colors.statusNotFoundColor
				);
			}

			if (payload.maintenance) {
				await configManager.updateMaintenanceConfig(payload.maintenance.enabled, payload.maintenance.message);
			}

			if (payload.i18n && (payload.i18n.maintenanceMessages || payload.i18n.adminTranslations)) {
				await configManager.updateI18nConfig({
					maintenanceMessages: payload.i18n.maintenanceMessages,
					adminTranslations: payload.i18n.adminTranslations
				});
			}

			const afterState = {
				wifi: configManager.getWiFiConfig(),
				logo: configManager.getLogoConfig(),
				sidebar: configManager.getSidebarConfig(),
				booking: configManager.getBookingConfig(),
				system: configManager.getSystemConfig(),
				oauth: configManager.getOAuthConfig(),
				search: configManager.getSearchConfig(),
				rateLimit: configManager.getRateLimitConfig(),
				colors: configManager.getColorsConfig(),
				maintenance: configManager.getMaintenanceConfig(),
				i18n: configManager.getI18nConfig()
			};

			appendAuditLog({
				event: 'config.restore.import',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeState,
				after: afterState
			});

			res.json({ success: true, config: afterState, message: 'Configuration restore applied' });
		} catch (err) {
			console.error('Error restoring configuration backup:', err);
			res.status(500).json({ error: 'Failed to restore configuration backup' });
		}
	});

	/**
	 * Middleware: IP whitelist check for display pages (flightboard, single room).
	 * When IP whitelisting is enabled, only approved IPs can access display pages.
	 * Admin and WiFi pages remain accessible to everyone.
	 * Shows a localized error page (DE/EN) with the client IP on rejection.
	 */
	const checkDisplayPageAccess = (req, res, next) => {
		if (hasValidApiToken(req) || hasValidWiFiApiToken(req) || hasValidAdminAuthCookie(req)) {
			return next();
		}

		if (!isClientIpWhitelisted(req)) {
			const clientIp = getClientIp(req);
			const acceptLang = String(req.headers['accept-language'] || '').toLowerCase();
			const isGerman = acceptLang.startsWith('de') || acceptLang.includes(',de');
			const lang = isGerman ? 'de' : 'en';
			const title = isGerman ? 'Zugriff verweigert' : 'Access Denied';
			const msg1 = isGerman
				? 'Dieses Gerät ist nicht für den Zugriff auf die Raumanzeige freigegeben.'
				: 'This device is not authorized to access the room display.';
			const msg2 = isGerman
				? 'Bitte wenden Sie sich an den Administrator, um Ihre IP-Adresse zur Whitelist hinzuzufügen.'
				: 'Please contact your administrator to add your IP address to the whitelist.';
			return res.status(403).send(`<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .container { text-align: center; max-width: 480px; padding: 2rem; }
  .icon { font-size: 4rem; margin-bottom: 1.5rem; opacity: 0.6; }
  h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.75rem; color: #f8fafc; }
  p { font-size: 1rem; line-height: 1.6; color: #94a3b8; margin-bottom: 0.5rem; }
  .ip { font-family: 'SF Mono', SFMono-Regular, Consolas, monospace; font-size: 0.85rem; color: #64748b; margin-top: 1.5rem; padding: 0.5rem 1rem; background: #1e293b; border-radius: 6px; display: inline-block; }
</style>
</head>
<body>
<div class="container">
  <div class="icon">🔒</div>
  <h1>${title}</h1>
  <p>${msg1}</p>
  <p>${msg2}</p>
  <div class="ip">${clientIp}</div>
</div>
</body>
</html>`);
		}

		next();
	};

	/**
	 * Helper function: Serves the React app (index.html) with no-cache headers.
	 */
	const serveReactApp = (req, res) => {
		res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
		res.setHeader('Pragma', 'no-cache');
		res.setHeader('Expires', '0');
		res.sendFile(path.join(__dirname, '../ui-react/build/', 'index.html'));
	};

	// Display pages — IP whitelist is enforced when enabled
	app.get('/', checkDisplayPageAccess, serveReactApp);
	app.get('/single-room/*', checkDisplayPageAccess, serveReactApp);
	app.get('/room-minimal/*', checkDisplayPageAccess, serveReactApp);

	// Admin and WiFi pages — accessible to everyone
	app.get('/admin', serveReactApp);
	app.get('/wifi-info', serveReactApp);

	// All other paths (404 page, static assets not caught by express.static etc.)
	app.get('*', serveReactApp);
};
