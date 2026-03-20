/**
 * @file config-manager.js
 * @description Central configuration management for all application settings.
 *
 * This module manages all configuration files of the application and provides
 * a unified API for reading, writing, and updating settings.
 * Changes are distributed in real-time to all connected clients via Socket.IO.
 *
 * Managed configuration areas:
 * - WiFi settings and QR code generation
 * - Logo configuration (dark/light mode)
 * - Sidebar/display settings with client-specific overrides
 * - Booking and check-in configuration
 * - Color scheme configuration
 * - Maintenance mode
 * - Internationalization (i18n) with maintenance messages
 * - OAuth/MSAL configuration for Microsoft Graph
 * - API token management with AES-256-GCM encryption
 * - System configuration (Graph webhook, HSTS, rate limiting, etc.)
 * - Search and calendar settings
 * - Translation API configuration
 * - Power management for displays (browser, DPMS, MQTT)
 * - MQTT broker configuration
 *
 * Security features:
 * - Encryption of sensitive data (passwords, tokens, OAuth secrets) with AES-256-GCM
 * - Automatic migration from plaintext passwords to encrypted storage
 * - Environment variable lock for critical settings
 *
 * @requires fs - File system operations
 * @requires path - Path manipulation
 * @requires crypto - Cryptographic functions (AES-256-GCM)
 * @requires qrcode - QR code generation for WiFi credentials
 * @requires ../config/config - Base configuration with default values
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const config = require('../config/config');

/**
 * Configuration management – Manages WiFi, logo, sidebar, booking, and other configurations.
 * Manages configuration files and generates WiFi QR codes.
 * Distributes configuration changes via Socket.IO for real-time updates.
 */

// ============================================================================
// Configuration file paths
// ============================================================================
/** @type {string} Path to the WiFi configuration file */
const configPath = path.join(__dirname, '../data/wifi-config.json');
/** @type {string} Path to the logo configuration file */
const logoConfigPath = path.join(__dirname, '../data/logo-config.json');
/** @type {string} Path to the sidebar configuration file */
const sidebarConfigPath = path.join(__dirname, '../data/sidebar-config.json');
/** @type {string} Path to the booking configuration file */
const bookingConfigPath = path.join(__dirname, '../data/booking-config.json');
/** @type {string} Path to the colors configuration file */
const colorsConfigPath = path.join(__dirname, '../data/colors-config.json');
/** @type {string} Path to the maintenance mode configuration file */
const maintenanceConfigPath = path.join(__dirname, '../data/maintenance-config.json');
/** @type {string} Path to the i18n configuration file */
const i18nConfigPath = path.join(__dirname, '../data/i18n-config.json');
/** @type {string} Path to the search configuration file */
const searchConfigPath = path.join(__dirname, '../data/search-config.json');
/** @type {string} Path to the rate limit configuration file */
const rateLimitConfigPath = path.join(__dirname, '../data/rate-limit-config.json');
/** @type {string} Path to the OAuth configuration file */
const oauthConfigPath = path.join(__dirname, '../data/oauth-config.json');
/** @type {string} Path to the system configuration file */
const systemConfigPath = path.join(__dirname, '../data/system-config.json');
/** @type {string} Path to the translation API configuration file */
const translationApiConfigPath = path.join(__dirname, '../data/translation-api-config.json');
/** @type {string} Path to the API token configuration file */
const apiTokenConfigPath = path.join(__dirname, '../data/api-token-config.json');
/** @type {string} Path to the power management configuration file */
const powerManagementConfigPath = path.join(__dirname, '../data/power-management-config.json');
/** @type {string} Path to the API token encryption key */
const apiTokenEncryptionKeyPath = path.join(__dirname, '../data/.api-token-key');
/** @type {string} Path to the generated WiFi QR code image */
const qrPath = path.join(__dirname, '../static/img/wifi-qr.png');

// ============================================================================
// Encryption and security constants
// ============================================================================
/** @type {string} Algorithm for OAuth secret encryption */
const OAUTH_SECRET_ALGO = 'aes-256-gcm';
/** @type {string} Algorithm for API token encryption */
const API_TOKEN_ENCRYPTION_ALGO = 'aes-256-gcm';
/** @type {string} Name of the environment variable for the encryption key */
const API_TOKEN_ENCRYPTION_ENV = 'API_TOKEN_ENCRYPTION_KEY';
/** @type {string} Initial API token value from the environment variable (frozen at startup) */
const INITIAL_API_TOKEN_ENV_VALUE = String(process.env.API_TOKEN || '').trim();
/** @type {string} Initial WiFi API token value from the environment variable (frozen at startup) */
const INITIAL_WIFI_API_TOKEN_ENV_VALUE = String(process.env.WIFI_API_TOKEN || '').trim();

/**
 * List of environment variable keys that lock the
 * system configuration via the admin interface when present.
 * @type {string[]}
 */
const SYSTEM_ENV_LOCK_KEYS = [
	'STARTUP_VALIDATION_STRICT',
	'GRAPH_WEBHOOK_ENABLED',
	'GRAPH_WEBHOOK_CLIENT_STATE',
	'GRAPH_WEBHOOK_ALLOWED_IPS',
	'EXPOSE_DETAILED_ERRORS',
	'GRAPH_FETCH_TIMEOUT_MS',
	'GRAPH_FETCH_RETRY_ATTEMPTS',
	'GRAPH_FETCH_RETRY_BASE_MS',
	'HSTS_MAX_AGE',
	'RATE_LIMIT_MAX_BUCKETS'
];
/** @type {boolean} Indicates whether at least one system environment variable was set at startup */
const INITIAL_SYSTEM_ENV_LOCKED = SYSTEM_ENV_LOCK_KEYS.some((key) => process.env[key] !== undefined);

/**
 * Set of placeholder values that are treated as "not set".
 * @type {Set<string>}
 */
const API_TOKEN_PLACEHOLDERS = new Set([
	'',
	'api_token_not_set'
]);

/** @type {Object|null} Socket.IO instance for real-time configuration updates */
let io = null;

/**
 * Sets the Socket.IO instance for distributing configuration changes.
 * @param {Object} socketIO - Socket.IO server instance
 */
function setSocketIO(socketIO) {
	io = socketIO;
}

/**
 * Returns the current Socket.IO instance.
 * @returns {Object|null} The Socket.IO instance or null
 */
function getSocketIO() {
	return io;
}

/**
 * Reads the WiFi configuration from the file or returns default values.
 * Performs automatic migration from plaintext passwords to encrypted storage.
 * @returns {Object} WiFi configuration with ssid, password, and lastUpdated
 */
function getWiFiConfig() {
	try {
		const data = fs.readFileSync(configPath, 'utf8');
		const parsed = JSON.parse(data);

		// Migration: decrypt encrypted password if present
		if (parsed.passwordEncrypted && typeof parsed.passwordEncrypted === 'object') {
			const decrypted = decryptApiToken(parsed.passwordEncrypted);
			parsed.password = decrypted || '';

			// Migration on read: remove legacy plaintext if still present
			if (parsed.passwordEncrypted && !parsed.password_migrated) {
				parsed.password_migrated = true;
				try {
					fs.writeFileSync(configPath, JSON.stringify({
						ssid: parsed.ssid || '',
						passwordEncrypted: parsed.passwordEncrypted,
						password_migrated: true,
						lastUpdated: parsed.lastUpdated
					}, null, 2));
				} catch (_) { /* best effort */ }
			}
		} else if (parsed.password) {
			// Legacy plaintext password found — encrypt and save back
			const encrypted = encryptApiToken(parsed.password);
			const migrated = {
				ssid: parsed.ssid || '',
				passwordEncrypted: encrypted,
				password_migrated: true,
				lastUpdated: parsed.lastUpdated
			};
			try {
				fs.writeFileSync(configPath, JSON.stringify(migrated, null, 2));
			} catch (_) { /* best effort */ }
		}

		return {
			ssid: parsed.ssid || '',
			password: parsed.password || '',
			lastUpdated: parsed.lastUpdated || null
		};
	} catch (err) {
		// Return default configuration from environment variables if file does not exist
		return {
			ssid: config.wifiDefaults.ssid,
			password: config.wifiDefaults.password,
			lastUpdated: null
		};
	}
}

/**
 * Reads the logo configuration from the file or returns default values.
 * @returns {Object} Logo configuration with logoDarkUrl, logoLightUrl, and lastUpdated
 */
function getLogoConfig() {
	try {
		const data = fs.readFileSync(logoConfigPath, 'utf8');
		return JSON.parse(data);
	} catch (err) {
		// Return default configuration from environment variables if file does not exist
		return {
			logoDarkUrl: config.logoDefaults.logoDarkUrl,
			logoLightUrl: config.logoDefaults.logoLightUrl,
			lastUpdated: null
		};
	}
}

/**
 * Reads the sidebar configuration from the file or returns default values.
 * Contains settings for WiFi display, upcoming meetings, dark mode, etc.
 * @returns {Object} Sidebar configuration with display settings and lastUpdated
 */
function getSidebarConfig() {
	const parsedConfig = readSidebarConfigSnapshot();
	if (parsedConfig) {
		return {
			showWiFi: parsedConfig.showWiFi,
			showUpcomingMeetings: parsedConfig.showUpcomingMeetings,
			showMeetingTitles: parsedConfig.showMeetingTitles,
			upcomingMeetingsCount: parsedConfig.upcomingMeetingsCount,
			minimalHeaderStyle: parsedConfig.minimalHeaderStyle,
			singleRoomDarkMode: parsedConfig.singleRoomDarkMode,
			flightboardDarkMode: parsedConfig.flightboardDarkMode,
			lastUpdated: parsedConfig.lastUpdated
		};
	}

	// Return default configuration from environment variables if file does not exist
	return {
		showWiFi: config.sidebarDefaults.showWiFi,
		showUpcomingMeetings: config.sidebarDefaults.showUpcomingMeetings,
		showMeetingTitles: config.sidebarDefaults.showMeetingTitles,
		upcomingMeetingsCount: config.sidebarDefaults.upcomingMeetingsCount,
		minimalHeaderStyle: 'filled',
		singleRoomDarkMode: !!config.sidebarDefaults.singleRoomDarkMode,
		flightboardDarkMode: config.sidebarDefaults.flightboardDarkMode !== undefined ? !!config.sidebarDefaults.flightboardDarkMode : true,
		lastUpdated: null
	};
}

/**
 * Normalizes and validates a client ID.
 * Allows alphanumeric characters, dots, underscores, colons, and hyphens (3-120 characters).
 * @param {*} value - The value to normalize
 * @returns {string} The normalized client ID or empty string for invalid input
 */
function normalizeClientId(value) {
	const normalized = String(value || '').trim();
	if (!normalized) {
		return '';
	}

	if (!/^[a-zA-Z0-9._:-]{3,120}$/.test(normalized)) {
		return '';
	}

	return normalized;
}

/**
 * Normalizes client-specific sidebar overrides.
 * Validates client IDs and override objects, keeping only valid entries.
 * @param {Object} overrides - Raw client override data
 * @returns {Object} Normalized overrides with validated client IDs as keys
 */
function normalizeSidebarClientOverrides(overrides) {
	if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
		return {};
	}

	const normalized = {};
	for (const [rawClientId, rawOverride] of Object.entries(overrides)) {
		const clientId = normalizeClientId(rawClientId);
		if (!clientId || !rawOverride || typeof rawOverride !== 'object' || Array.isArray(rawOverride)) {
			continue;
		}

		const hasSingleRoomDarkMode = rawOverride.singleRoomDarkMode !== undefined;
		if (!hasSingleRoomDarkMode) {
			continue;
		}

		normalized[clientId] = {
			singleRoomDarkMode: !!rawOverride.singleRoomDarkMode,
			lastUpdated: rawOverride.lastUpdated || null
		};
	}

	return normalized;
}

/**
 * Reads a snapshot of the sidebar configuration directly from the file.
 * Normalizes all values and applies default values.
 * @returns {Object|null} Normalized sidebar configuration or null on error
 */
function readSidebarConfigSnapshot() {
	try {
		const data = fs.readFileSync(sidebarConfigPath, 'utf8');
		const parsed = JSON.parse(data);
		const defaultUpcomingMeetingsCount = toMinInt(config.sidebarDefaults.upcomingMeetingsCount, 3, 1);
		const normalizedUpcomingMeetingsCount = Math.min(
			toMinInt(parsed.upcomingMeetingsCount, defaultUpcomingMeetingsCount, 1),
			10
		);

		return {
			showWiFi: parsed.showWiFi !== undefined ? !!parsed.showWiFi : config.sidebarDefaults.showWiFi,
			showUpcomingMeetings: parsed.showUpcomingMeetings !== undefined ? !!parsed.showUpcomingMeetings : config.sidebarDefaults.showUpcomingMeetings,
			showMeetingTitles: parsed.showMeetingTitles !== undefined ? !!parsed.showMeetingTitles : config.sidebarDefaults.showMeetingTitles,
			upcomingMeetingsCount: normalizedUpcomingMeetingsCount,
			minimalHeaderStyle: parsed.minimalHeaderStyle === 'transparent' ? 'transparent' : 'filled',
			singleRoomDarkMode: parsed.singleRoomDarkMode !== undefined ? !!parsed.singleRoomDarkMode : !!config.sidebarDefaults.singleRoomDarkMode,
			flightboardDarkMode: parsed.flightboardDarkMode !== undefined ? !!parsed.flightboardDarkMode : (config.sidebarDefaults.flightboardDarkMode !== undefined ? !!config.sidebarDefaults.flightboardDarkMode : true),
			clientOverrides: normalizeSidebarClientOverrides(parsed.clientOverrides),
			lastUpdated: parsed.lastUpdated || null
		};
	} catch (err) {
		return null;
	}
}

/**
 * Returns the sidebar configuration for a specific client.
 * Applies client-specific overrides if available.
 * @param {string} clientId - The client ID
 * @returns {Object} Sidebar configuration with client overrides applied if applicable
 */
function getSidebarConfigForClient(clientId) {
	const baseConfig = getSidebarConfig();
	const normalizedClientId = normalizeClientId(clientId);
	if (!normalizedClientId) {
		return baseConfig;
	}

	const snapshot = readSidebarConfigSnapshot();
	if (!snapshot || !snapshot.clientOverrides || !snapshot.clientOverrides[normalizedClientId]) {
		return baseConfig;
	}

	const override = snapshot.clientOverrides[normalizedClientId];
	return {
		...baseConfig,
		singleRoomDarkMode: override.singleRoomDarkMode,
		clientOverrideApplied: true,
		overrideLastUpdated: override.lastUpdated || null
	};
}

/**
 * Reads the booking configuration from the file or returns default values.
 * Normalizes room feature flags, room group feature flags, and check-in settings.
 * @returns {Object} Booking configuration with enableBooking, buttonColor, checkIn, etc.
 */
function getBookingConfig() {
	try {
		const data = fs.readFileSync(bookingConfigPath, 'utf8');
		const parsed = JSON.parse(data);
		return {
			...parsed,
			roomFeatureFlags: normalizeRoomFeatureFlags(parsed.roomFeatureFlags),
			roomGroupFeatureFlags: normalizeRoomGroupFeatureFlags(parsed.roomGroupFeatureFlags),
			checkIn: normalizeCheckInConfig(parsed.checkIn)
		};
	} catch (err) {
		// Return default configuration from environment variables if file does not exist
		return {
			enableBooking: config.bookingDefaults.enableBooking,
			buttonColor: '#334155',
			enableExtendMeeting: config.bookingDefaults.enableExtendMeeting,
			extendMeetingUrlAllowlist: config.bookingDefaults.extendMeetingUrlAllowlist,
			roomFeatureFlags: config.bookingDefaults.roomFeatureFlags,
			roomGroupFeatureFlags: config.bookingDefaults.roomGroupFeatureFlags,
			checkIn: normalizeCheckInConfig(config.bookingDefaults.checkIn),
			lastUpdated: null
		};
	}
}

/**
 * Reads the maintenance mode configuration from the file or returns default values.
 * @returns {Object} Maintenance configuration with enabled, message, and lastUpdated
 */
function getMaintenanceConfig() {
	try {
		const data = fs.readFileSync(maintenanceConfigPath, 'utf8');
		return JSON.parse(data);
	} catch (err) {
		return {
			enabled: config.maintenanceDefaults.enabled,
			message: config.maintenanceDefaults.message,
			lastUpdated: null
		};
	}
}

/**
 * Normalizes room feature flags (booking/meeting extension per room).
 * @param {Object} flags - Raw feature flag data
 * @returns {Object} Normalized flags with room keys in lowercase
 */
function normalizeRoomFeatureFlags(flags) {
	if (!flags || typeof flags !== 'object' || Array.isArray(flags)) {
		return {};
	}

	const normalized = {};
	for (const [roomKey, value] of Object.entries(flags)) {
		const key = String(roomKey).trim().toLowerCase();
		if (!key || !value || typeof value !== 'object' || Array.isArray(value)) {
			continue;
		}

		normalized[key] = {
			enableBooking: value.enableBooking === undefined ? undefined : !!value.enableBooking,
			enableExtendMeeting: value.enableExtendMeeting === undefined ? undefined : !!value.enableExtendMeeting
		};
	}

	return normalized;
}

/**
 * Normalizes room group feature flags (booking/meeting extension per group).
 * @param {Object} flags - Raw feature flag data
 * @returns {Object} Normalized flags with group keys in lowercase
 */
function normalizeRoomGroupFeatureFlags(flags) {
	if (!flags || typeof flags !== 'object' || Array.isArray(flags)) {
		return {};
	}

	const normalized = {};
	for (const [groupKey, value] of Object.entries(flags)) {
		const key = String(groupKey).trim().toLowerCase();
		if (!key || !value || typeof value !== 'object' || Array.isArray(value)) {
			continue;
		}

		normalized[key] = {
			enableBooking: value.enableBooking === undefined ? undefined : !!value.enableBooking,
			enableExtendMeeting: value.enableExtendMeeting === undefined ? undefined : !!value.enableExtendMeeting
		};
	}

	return normalized;
}

/**
 * Normalizes the check-in configuration with default values.
 * @param {Object} checkInConfig - Raw check-in configuration
 * @returns {Object} Normalized check-in configuration
 */
function normalizeCheckInConfig(checkInConfig) {
	const defaults = config.checkIn || {};
	const source = checkInConfig && typeof checkInConfig === 'object' && !Array.isArray(checkInConfig)
		? checkInConfig
		: {};

	const toPositiveInt = (value, fallback) => {
		const parsed = Number.parseInt(value, 10);
		if (!Number.isFinite(parsed)) {
			return fallback;
		}
		return Math.max(parsed, 1);
	};

	const toNonNegativeInt = (value, fallback) => {
		const parsed = Number.parseInt(value, 10);
		if (!Number.isFinite(parsed)) {
			return fallback;
		}
		return Math.max(parsed, 0);
	};

	return {
		enabled: source.enabled === undefined ? defaults.enabled !== false : !!source.enabled,
		requiredForExternalMeetings: source.requiredForExternalMeetings === undefined
			? defaults.requiredForExternalMeetings !== false
			: !!source.requiredForExternalMeetings,
		earlyCheckInMinutes: toNonNegativeInt(source.earlyCheckInMinutes, Number.isFinite(defaults.earlyCheckInMinutes) ? defaults.earlyCheckInMinutes : 5),
		windowMinutes: toPositiveInt(source.windowMinutes, Number.isFinite(defaults.windowMinutes) ? defaults.windowMinutes : 10),
		autoReleaseNoShow: source.autoReleaseNoShow === undefined ? defaults.autoReleaseNoShow !== false : !!source.autoReleaseNoShow
	};
}

/**
 * Converts a value to a boolean with fallback.
 * Recognizes string values 'true'/'false' (case-insensitive).
 * @param {*} value - The value to convert
 * @param {boolean} fallback - Default value for undefined/null
 * @returns {boolean} The converted boolean value
 */
function toBoolean(value, fallback) {
	if (value === undefined || value === null) {
		return fallback;
	}

	if (typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (normalized === 'true') {
			return true;
		}
		if (normalized === 'false') {
			return false;
		}
	}

	return !!value;
}

/**
 * Converts a value to an integer with minimum value and fallback.
 * @param {*} value - The value to convert
 * @param {number} fallback - Default value for invalid input
 * @param {number} min - Minimum value
 * @returns {number} The converted integer (at least min)
 */
function toMinInt(value, fallback, min) {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}
	return Math.max(parsed, min);
}


/**
 * Creates the encryption key for OAuth secrets.
 * Derives the key from the API token (SHA-256 hash).
 * @param {string} [tokenOverride] - Optional token override instead of the effective token
 * @returns {Buffer|null} 32-byte key or null if no token is available
 */
function getOAuthEncryptionKey(tokenOverride) {
	const keyMaterial = normalizeApiTokenValue(tokenOverride) || getEffectiveApiToken();
	if (!keyMaterial) {
		return null;
	}

	return crypto.createHash('sha256').update(keyMaterial).digest();
}

/**
 * Normalizes an API token value and removes placeholders.
 * @param {*} value - The value to normalize
 * @returns {string} The normalized token or empty string
 */
function normalizeApiTokenValue(value) {
	const normalized = String(value || '').trim();
	if (!normalized) {
		return '';
	}

	if (API_TOKEN_PLACEHOLDERS.has(normalized.toLowerCase())) {
		return '';
	}

	return normalized;
}

/**
 * Checks whether a value is a known placeholder token.
 * @param {*} value - The value to check
 * @returns {boolean} true if the value is a placeholder
 */
function isPlaceholderApiTokenValue(value) {
	const normalized = String(value || '').trim().toLowerCase();
	return normalized === 'your-secure-token-here' || normalized === 'api_token_not_set';
}

/**
 * Checks whether the API token is locked by an environment variable.
 * @returns {boolean} true if API_TOKEN was set at startup
 */
function isApiTokenEnvLocked() {
	return !!INITIAL_API_TOKEN_ENV_VALUE;
}

/**
 * Checks whether the WiFi API token is locked by an environment variable.
 * @returns {boolean} true if WIFI_API_TOKEN was set at startup
 */
function isWifiApiTokenEnvLocked() {
	return !!INITIAL_WIFI_API_TOKEN_ENV_VALUE;
}

/**
 * Checks whether the system configuration is locked by environment variables.
 * @returns {boolean} true if at least one system environment variable was set at startup
 */
function isSystemEnvLocked() {
	return INITIAL_SYSTEM_ENV_LOCKED;
}

/**
 * Creates or reads the encryption key for API tokens.
 * Priority: 1. Environment variable, 2. Stored key file, 3. New key
 * @returns {Buffer} 32-byte AES-256 key
 */
function getApiTokenEncryptionKey() {
	const envKeyMaterial = String(process.env[API_TOKEN_ENCRYPTION_ENV] || '').trim();
	if (envKeyMaterial) {
		return crypto.createHash('sha256').update(envKeyMaterial).digest();
	}

	try {
		const stored = fs.readFileSync(apiTokenEncryptionKeyPath, 'utf8').trim();
		const keyBuffer = Buffer.from(stored, 'base64');
		if (keyBuffer.length === 32) {
			return keyBuffer;
		}
	} catch (err) {
		// key file missing or invalid, create a new one
	}

	const generatedKey = crypto.randomBytes(32);
	fs.writeFileSync(apiTokenEncryptionKeyPath, generatedKey.toString('base64'), {
		mode: 0o600
	});
	return generatedKey;
}

/**
 * Encrypts an API token value with AES-256-GCM.
 * @param {string} tokenValue - The token to encrypt
 * @returns {Object} Encrypted payload object with algorithm, iv, authTag, and value
 */
function encryptApiToken(tokenValue) {
	const key = getApiTokenEncryptionKey();
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv(API_TOKEN_ENCRYPTION_ALGO, key, iv);
	const encrypted = Buffer.concat([cipher.update(String(tokenValue), 'utf8'), cipher.final()]);
	const authTag = cipher.getAuthTag();

	return {
		algorithm: API_TOKEN_ENCRYPTION_ALGO,
		iv: iv.toString('base64'),
		authTag: authTag.toString('base64'),
		value: encrypted.toString('base64')
	};
}

/**
 * Decrypts an encrypted API token.
 * @param {Object} payload - Encrypted payload object
 * @param {string} payload.iv - Initialization vector (Base64)
 * @param {string} payload.authTag - Authentication tag (Base64)
 * @param {string} payload.value - Encrypted value (Base64)
 * @returns {string|null} The decrypted token or null on error
 */
function decryptApiToken(payload) {
	if (!payload || typeof payload !== 'object') {
		return null;
	}

	if (payload.algorithm && payload.algorithm !== API_TOKEN_ENCRYPTION_ALGO) {
		return null;
	}

	try {
		const key = getApiTokenEncryptionKey();
		const iv = Buffer.from(String(payload.iv || ''), 'base64');
		const authTag = Buffer.from(String(payload.authTag || ''), 'base64');
		const encryptedValue = Buffer.from(String(payload.value || ''), 'base64');

		const decipher = crypto.createDecipheriv(API_TOKEN_ENCRYPTION_ALGO, key, iv);
		decipher.setAuthTag(authTag);
		const decrypted = Buffer.concat([decipher.update(encryptedValue), decipher.final()]);
		return decrypted.toString('utf8');
	} catch (error) {
		return null;
	}
}

/**
 * Reads the raw API token configuration from the file.
 * Performs automatic migration of legacy plaintext tokens.
 * @returns {Object|null} Raw configuration or null on error
 */
function readRawApiTokenConfig() {
	try {
		const data = fs.readFileSync(apiTokenConfigPath, 'utf8');
		const parsed = JSON.parse(data);

		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			if (parsed.tokenEncrypted && typeof parsed.tokenEncrypted === 'object') {
				return parsed;
			}

			const legacyToken = normalizeApiTokenValue(parsed.token);
			if (legacyToken) {
				const migratedConfig = {
					tokenEncrypted: encryptApiToken(legacyToken),
					lastUpdated: parsed.lastUpdated || new Date().toISOString(),
					wifiTokenEncrypted: parsed.wifiTokenEncrypted && typeof parsed.wifiTokenEncrypted === 'object'
						? parsed.wifiTokenEncrypted
						: null,
					wifiLastUpdated: parsed.wifiLastUpdated || null
				};
				fs.writeFileSync(apiTokenConfigPath, JSON.stringify(migratedConfig, null, 2));
				return migratedConfig;
			}
		}

		return parsed;
	} catch (err) {
		return null;
	}
}

/**
 * Determines the runtime configuration of the API token.
 * Priority: 1. Environment variable, 2. Encrypted file, 3. Not set
 * @returns {Object} Token configuration with token, source, isDefault, and lastUpdated
 */
function getApiTokenRuntimeConfig() {
	const envToken = normalizeApiTokenValue(INITIAL_API_TOKEN_ENV_VALUE);
	if (envToken) {
		return {
			token: envToken,
			source: 'env',
			isDefault: false,
			lastUpdated: null
		};
	}

	const rawConfig = readRawApiTokenConfig();
	const decryptedRuntimeToken = decryptApiToken(rawConfig?.tokenEncrypted);
	const runtimeToken = normalizeApiTokenValue(decryptedRuntimeToken);
	if (runtimeToken) {
		return {
			token: runtimeToken,
			source: 'runtime',
			isDefault: false,
			lastUpdated: rawConfig?.lastUpdated || null
		};
	}

	return {
		token: '',
		source: 'unset',
		isDefault: false,
		lastUpdated: null
	};
}

/**
 * Returns the currently effective API token.
 * @returns {string} The active API token or empty string
 */
function getEffectiveApiToken() {
	return getApiTokenRuntimeConfig().token;
}

/**
 * Determines the runtime configuration of the WiFi API token.
 * Priority: 1. Environment variable, 2. Encrypted file, 3. Default
 * @returns {Object} Token configuration with token, source, isDefault, and lastUpdated
 */
function getWifiApiTokenRuntimeConfig() {
	const envToken = normalizeApiTokenValue(INITIAL_WIFI_API_TOKEN_ENV_VALUE);
	if (envToken) {
		return {
			token: envToken,
			source: 'env',
			isDefault: false,
			lastUpdated: null
		};
	}

	const rawConfig = readRawApiTokenConfig();
	const decryptedRuntimeToken = decryptApiToken(rawConfig?.wifiTokenEncrypted);
	const runtimeToken = normalizeApiTokenValue(decryptedRuntimeToken);
	if (runtimeToken) {
		return {
			token: runtimeToken,
			source: 'runtime',
			isDefault: false,
			lastUpdated: rawConfig?.wifiLastUpdated || null
		};
	}

	return {
		token: '',
		source: 'default',
		isDefault: true,
		lastUpdated: null
	};
}

/**
 * Returns the currently effective WiFi API token.
 * @returns {string} The active WiFi API token or empty string
 */
function getEffectiveWifiApiToken() {
	return getWifiApiTokenRuntimeConfig().token;
}

/**
 * Returns the combined API token configuration (API + WiFi).
 * Contains source information and configuration status of both tokens.
 * @returns {Object} Combined token configuration
 */
function getApiTokenConfig() {
	const runtimeConfig = getApiTokenRuntimeConfig();
	const wifiRuntimeConfig = getWifiApiTokenRuntimeConfig();
	return {
		source: runtimeConfig.source,
		isDefault: runtimeConfig.isDefault,
		lastUpdated: runtimeConfig.lastUpdated,
		wifiSource: wifiRuntimeConfig.source,
		wifiIsDefault: wifiRuntimeConfig.isDefault,
		wifiLastUpdated: wifiRuntimeConfig.lastUpdated,
		wifiConfigured: !!wifiRuntimeConfig.token
	};
}

/**
 * Saves a new API token encrypted in the configuration file.
 * Preserves existing WiFi token configuration.
 * @param {string} apiToken - The new API token
 * @returns {Object} Saved configuration with token and lastUpdated
 * @throws {Error} If token is empty
 */
function saveApiTokenConfig(apiToken) {
	const normalizedToken = normalizeApiTokenValue(apiToken);
	if (!normalizedToken) {
		throw new Error('API token must not be empty.');
	}

	const existingRawConfig = readRawApiTokenConfig() || {};

	const configData = {
		tokenEncrypted: encryptApiToken(normalizedToken),
		lastUpdated: new Date().toISOString(),
		wifiTokenEncrypted: existingRawConfig.wifiTokenEncrypted && typeof existingRawConfig.wifiTokenEncrypted === 'object'
			? existingRawConfig.wifiTokenEncrypted
			: null,
		wifiLastUpdated: existingRawConfig.wifiLastUpdated || null
	};

	fs.writeFileSync(apiTokenConfigPath, JSON.stringify(configData, null, 2));
	return {
		token: normalizedToken,
		lastUpdated: configData.lastUpdated
	};
}

/**
 * Saves a new WiFi API token encrypted in the configuration file.
 * Preserves existing API token configuration.
 * @param {string} wifiApiToken - The new WiFi API token
 * @returns {Object} Saved configuration with token and lastUpdated
 * @throws {Error} If token is empty
 */
function saveWifiApiTokenConfig(wifiApiToken) {
	const normalizedToken = normalizeApiTokenValue(wifiApiToken);
	if (!normalizedToken) {
		throw new Error('WiFi API token must not be empty.');
	}

	const existingRawConfig = readRawApiTokenConfig() || {};
	const configData = {
		tokenEncrypted: existingRawConfig.tokenEncrypted && typeof existingRawConfig.tokenEncrypted === 'object'
			? existingRawConfig.tokenEncrypted
			: null,
		lastUpdated: existingRawConfig.lastUpdated || null,
		wifiTokenEncrypted: encryptApiToken(normalizedToken),
		wifiLastUpdated: new Date().toISOString()
	};

	fs.writeFileSync(apiTokenConfigPath, JSON.stringify(configData, null, 2));
	return {
		token: normalizedToken,
		lastUpdated: configData.wifiLastUpdated
	};
}

/**
 * Migrates an encrypted OAuth secret when the token changes.
 * Decrypts with the old token and encrypts with the new one.
 * @param {string} oldToken - The previous API token
 * @param {string} newToken - The new API token
 * @throws {Error} If decryption with the old token fails
 */
function migrateEncryptedOAuthSecretForTokenChange(oldToken, newToken) {
	const rawOauthConfig = readRawOAuthConfig();
	if (!rawOauthConfig || !rawOauthConfig.clientSecretEncrypted) {
		return;
	}

	const decryptedSecret = decryptOAuthSecret(rawOauthConfig.clientSecretEncrypted, oldToken);
	if (decryptedSecret === null) {
		throw new Error('Failed to decrypt stored OAuth client secret while updating API token.');
	}

	rawOauthConfig.clientSecretEncrypted = encryptOAuthSecret(decryptedSecret, newToken);
	fs.writeFileSync(oauthConfigPath, JSON.stringify(rawOauthConfig, null, 2));
}

/**
 * Removes the stored OAuth client secret from the configuration.
 * Called when the API token is set for the first time (source: 'unset').
 */
function clearStoredOAuthClientSecret() {
	const rawOauthConfig = readRawOAuthConfig();
	if (!rawOauthConfig || !rawOauthConfig.clientSecretEncrypted) {
		return;
	}

	delete rawOauthConfig.clientSecretEncrypted;
	rawOauthConfig.lastUpdated = rawOauthConfig.lastUpdated || new Date().toISOString();
	fs.writeFileSync(oauthConfigPath, JSON.stringify(rawOauthConfig, null, 2));
}

/**
 * Encrypts an OAuth client secret with AES-256-GCM.
 * The key is derived from the API token.
 * @param {string} secretValue - The secret to encrypt
 * @param {string} [tokenOverride] - Optional token override for key derivation
 * @returns {Object} Encrypted payload object
 * @throws {Error} If no encryption key is available
 */
function encryptOAuthSecret(secretValue, tokenOverride) {
	const key = getOAuthEncryptionKey(tokenOverride);
	if (!key) {
		throw new Error('Missing encryption key. Set API_TOKEN.');
	}

	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv(OAUTH_SECRET_ALGO, key, iv);
	const encrypted = Buffer.concat([cipher.update(String(secretValue), 'utf8'), cipher.final()]);
	const authTag = cipher.getAuthTag();

	return {
		algorithm: OAUTH_SECRET_ALGO,
		iv: iv.toString('base64'),
		authTag: authTag.toString('base64'),
		value: encrypted.toString('base64')
	};
}

/**
 * Decrypts an OAuth client secret.
 * Tries multiple token candidates (override, effective token, environment variable).
 * @param {Object} payload - Encrypted payload object
 * @param {string} [tokenOverride] - Optional token override
 * @returns {string|null} The decrypted secret or null on error
 */
function decryptOAuthSecret(payload, tokenOverride) {
	if (!payload || typeof payload !== 'object') {
		return null;
	}

	const candidates = [];
	const overrideToken = normalizeApiTokenValue(tokenOverride);
	if (overrideToken) {
		candidates.push(overrideToken);
	}

	const effectiveToken = normalizeApiTokenValue(getEffectiveApiToken());
	if (effectiveToken && !candidates.includes(effectiveToken)) {
		candidates.push(effectiveToken);
	}

	const rawEnvToken = String(process.env.API_TOKEN || '').trim();
	if (rawEnvToken && !candidates.includes(rawEnvToken)) {
		candidates.push(rawEnvToken);
	}

	for (const candidate of candidates) {
		const key = getOAuthEncryptionKey(candidate);
		if (!key) {
			continue;
		}

		try {
			const iv = Buffer.from(String(payload.iv || ''), 'base64');
			const authTag = Buffer.from(String(payload.authTag || ''), 'base64');
			const encryptedValue = Buffer.from(String(payload.value || ''), 'base64');

			const decipher = crypto.createDecipheriv(OAUTH_SECRET_ALGO, key, iv);
			decipher.setAuthTag(authTag);
			const decrypted = Buffer.concat([decipher.update(encryptedValue), decipher.final()]);
			return decrypted.toString('utf8');
		} catch (error) {
			// try next candidate
		}
	}

	console.error('Failed to decrypt OAuth client secret: no valid API token key found.');
	return null;
}

/**
 * Reads the raw OAuth configuration from the file.
 * @returns {Object|null} Raw OAuth configuration or null on error
 */
function readRawOAuthConfig() {
	try {
		const data = fs.readFileSync(oauthConfigPath, 'utf8');
		return JSON.parse(data);
	} catch (err) {
		return null;
	}
}

/**
 * Extracts the tenant ID from a Microsoft authority URL.
 * Supports full URLs and short forms.
 * @param {string} authorityValue - The authority URL or tenant ID
 * @returns {string} The extracted tenant ID or empty string
 */
function extractTenantIdFromAuthority(authorityValue) {
	const raw = String(authorityValue || '').trim();
	if (!raw) {
		return '';
	}

	try {
		const parsed = new URL(raw);
		const host = String(parsed.hostname || '').toLowerCase();
		if (!host.includes('login.microsoftonline.com')) {
			return '';
		}
		const pathPart = String(parsed.pathname || '').split('/').filter(Boolean)[0] || '';
		return String(pathPart).trim();
	} catch (error) {
		if (raw.includes('login.microsoftonline.com/')) {
			const afterDomain = raw.split('login.microsoftonline.com/')[1] || '';
			const firstSegment = afterDomain.split(/[/?#]/)[0] || '';
			return String(firstSegment).trim();
		}
		if (raw.includes('://')) {
			return '';
		}
		if (raw.includes('/')) {
			return String(raw).split('/').filter(Boolean)[0] || '';
		}
		return raw;
	}
}

/**
 * Creates a full authority URL from a tenant ID.
 * @param {string} tenantId - The Microsoft tenant ID
 * @returns {string} The full authority URL or empty string
 */
function authorityFromTenantId(tenantId) {
	const normalizedTenant = String(tenantId || '').trim();
	if (!normalizedTenant) {
		return '';
	}
	return `https://login.microsoftonline.com/${normalizedTenant}`;
}

/**
 * Normalizes an OAuth authority input to a full URL.
 * @param {string} value - The authority to normalize (URL or tenant ID)
 * @returns {string} The normalized authority URL or empty string
 */
function normalizeOAuthAuthorityInput(value) {
	const tenantId = extractTenantIdFromAuthority(value);
	if (!tenantId) {
		return '';
	}
	return authorityFromTenantId(tenantId);
}

/**
 * Normalizes the base OAuth configuration (clientId and authority).
 * Removes placeholder values and normalizes the authority URL.
 * @param {Object} oauthConfig - Raw OAuth configuration
 * @param {Object} [fallback={}] - Fallback values
 * @returns {Object} Normalized configuration with clientId and authority
 */
function normalizeOAuthConfigBase(oauthConfig, fallback = {}) {
	const source = oauthConfig && typeof oauthConfig === 'object' && !Array.isArray(oauthConfig)
		? oauthConfig
		: {};

	const normalizeValue = (value) => {
		const normalized = String(value || '').trim();
		if (
			normalized === 'OAUTH_CLIENT_ID_NOT_SET'
			|| normalized === 'OAUTH_AUTHORITY_NOT_SET'
			|| normalized === 'OAUTH_CLIENT_SECRET_NOT_SET'
		) {
			return '';
		}
		return normalized;
	};

	return {
		clientId: source.clientId !== undefined ? normalizeValue(source.clientId) : normalizeValue(fallback.clientId),
		authority: source.authority !== undefined
			? normalizeOAuthAuthorityInput(normalizeValue(source.authority))
			: normalizeOAuthAuthorityInput(normalizeValue(fallback.authority))
	};
}

/**
 * Determines the full OAuth runtime configuration.
 * Priority: 1. Environment variables, 2. Configuration file, 3. Default values
 * @returns {Object} OAuth configuration with clientId, authority, clientSecret, and lastUpdated
 */
function getOAuthRuntimeConfig() {
	const fallback = {
		clientId: config.msalConfig?.auth?.clientId || '',
		authority: config.msalConfig?.auth?.authority || '',
		clientSecret: config.msalConfig?.auth?.clientSecret || ''
	};

	const envClientId = process.env.OAUTH_CLIENT_ID;
	const envAuthority = process.env.OAUTH_AUTHORITY;
	const envClientSecret = process.env.OAUTH_CLIENT_SECRET;
	const oauthEnvConfigured = envClientId !== undefined || envAuthority !== undefined || envClientSecret !== undefined;

	if (oauthEnvConfigured) {
		return {
			clientId: envClientId !== undefined ? String(envClientId || '').trim() : fallback.clientId,
			authority: envAuthority !== undefined
				? normalizeOAuthAuthorityInput(String(envAuthority || '').trim())
				: normalizeOAuthAuthorityInput(fallback.authority),
			clientSecret: envClientSecret !== undefined ? String(envClientSecret || '') : fallback.clientSecret,
			lastUpdated: null
		};
	}

	const rawConfig = readRawOAuthConfig();
	if (!rawConfig) {
		return {
			...fallback,
			lastUpdated: null
		};
	}

	const normalizedBase = normalizeOAuthConfigBase(rawConfig, fallback);
	const decryptedSecret = decryptOAuthSecret(rawConfig.clientSecretEncrypted);

	return {
		clientId: normalizedBase.clientId || fallback.clientId,
		authority: normalizedBase.authority || fallback.authority,
		clientSecret: decryptedSecret !== null ? decryptedSecret : fallback.clientSecret,
		lastUpdated: rawConfig.lastUpdated || null
	};
}

/**
 * Returns the public OAuth configuration (without secret).
 * Contains clientId, authority, tenantId, and whether a secret is configured.
 * @returns {Object} Public OAuth configuration
 */
function getOAuthConfig() {
	const runtimeConfig = getOAuthRuntimeConfig();
	const normalizedAuthority = runtimeConfig.authority === 'OAUTH_AUTHORITY_NOT_SET' ? '' : runtimeConfig.authority;
	const tenantId = extractTenantIdFromAuthority(normalizedAuthority);
	return {
		clientId: runtimeConfig.clientId === 'OAUTH_CLIENT_ID_NOT_SET' ? '' : runtimeConfig.clientId,
		authority: normalizedAuthority,
		tenantId,
		hasClientSecret: !!runtimeConfig.clientSecret,
		lastUpdated: runtimeConfig.lastUpdated
	};
}

/**
 * Normalizes the system configuration with default values and validation.
 * Processes Graph webhook, HSTS, rate limiting, display tracking, and other settings.
 * @param {Object} systemConfig - Raw system configuration
 * @param {Object} [fallback={}] - Fallback values
 * @returns {Object} Normalized system configuration
 */
function normalizeSystemConfig(systemConfig, fallback = {}) {
	const source = systemConfig && typeof systemConfig === 'object' && !Array.isArray(systemConfig)
		? systemConfig
		: {};

	const fallbackWebhookIps = Array.isArray(fallback.graphWebhookAllowedIps)
		? fallback.graphWebhookAllowedIps
		: [];

	const parseWebhookIps = (value, fallbackValue) => {
		if (Array.isArray(value)) {
			return value.map((item) => String(item || '').trim()).filter(Boolean);
		}

		if (typeof value === 'string') {
			return value.split(',').map((item) => item.trim()).filter(Boolean);
		}

		return fallbackValue;
	};

	const normalizeTrackingMode = (value, fallbackValue) => {
		const normalized = String(value || '').trim().toLowerCase();
		if (normalized === 'ip-room' || normalized === 'client-id') {
			return normalized;
		}
		return fallbackValue;
	};

	return {
		startupValidationStrict: toBoolean(source.startupValidationStrict, toBoolean(fallback.startupValidationStrict, false)),
		graphWebhookEnabled: toBoolean(source.graphWebhookEnabled, toBoolean(fallback.graphWebhookEnabled, false)),
		graphWebhookClientState: source.graphWebhookClientState !== undefined
			? String(source.graphWebhookClientState || '').trim()
			: String(fallback.graphWebhookClientState || '').trim(),
		graphWebhookAllowedIps: parseWebhookIps(source.graphWebhookAllowedIps, fallbackWebhookIps),
		exposeDetailedErrors: toBoolean(source.exposeDetailedErrors, toBoolean(fallback.exposeDetailedErrors, false)),
		graphFetchTimeoutMs: toMinInt(source.graphFetchTimeoutMs, toMinInt(fallback.graphFetchTimeoutMs, 10000, 1000), 1000),
		graphFetchRetryAttempts: toMinInt(source.graphFetchRetryAttempts, toMinInt(fallback.graphFetchRetryAttempts, 2, 0), 0),
		graphFetchRetryBaseMs: toMinInt(source.graphFetchRetryBaseMs, toMinInt(fallback.graphFetchRetryBaseMs, 250, 50), 50),
		hstsMaxAge: toMinInt(source.hstsMaxAge, toMinInt(fallback.hstsMaxAge, 31536000, 0), 0),
		rateLimitMaxBuckets: toMinInt(source.rateLimitMaxBuckets, toMinInt(fallback.rateLimitMaxBuckets, 10000, 1000), 1000),
		displayTrackingMode: normalizeTrackingMode(source.displayTrackingMode, normalizeTrackingMode(fallback.displayTrackingMode, 'client-id')),
		displayTrackingRetentionHours: toMinInt(source.displayTrackingRetentionHours, toMinInt(fallback.displayTrackingRetentionHours, 2, 1), 1),
		displayTrackingCleanupMinutes: toMinInt(source.displayTrackingCleanupMinutes, toMinInt(fallback.displayTrackingCleanupMinutes, 5, 0), 0),
		displayIpWhitelistEnabled: toBoolean(source.displayIpWhitelistEnabled, toBoolean(fallback.displayIpWhitelistEnabled, false)),
		displayIpWhitelist: parseWebhookIps(source.displayIpWhitelist, Array.isArray(fallback.displayIpWhitelist) ? fallback.displayIpWhitelist : []),
		trustReverseProxy: toBoolean(source.trustReverseProxy, toBoolean(fallback.trustReverseProxy, false)),
		demoMode: toBoolean(source.demoMode, toBoolean(fallback.demoMode, false))
	};
}

/**
 * Determines the system runtime configuration.
 * Combines file configuration with default values from the base configuration.
 * @returns {Object} Complete system configuration with lastUpdated
 */
function getSystemRuntimeConfig() {
	const fallback = {
		startupValidationStrict: config.startupValidation?.strict === true,
		graphWebhookEnabled: config.graphWebhook?.enabled === true,
		graphWebhookClientState: config.graphWebhook?.clientState || '',
		graphWebhookAllowedIps: Array.isArray(config.graphWebhook?.allowedIps) ? config.graphWebhook.allowedIps : [],
		exposeDetailedErrors: config.systemDefaults?.exposeDetailedErrors === true,
		graphFetchTimeoutMs: toMinInt(config.systemDefaults?.graphFetchTimeoutMs, 10000, 1000),
		graphFetchRetryAttempts: toMinInt(config.systemDefaults?.graphFetchRetryAttempts, 2, 0),
		graphFetchRetryBaseMs: toMinInt(config.systemDefaults?.graphFetchRetryBaseMs, 250, 50),
		hstsMaxAge: toMinInt(config.systemDefaults?.hstsMaxAge, 31536000, 0),
		rateLimitMaxBuckets: toMinInt(config.systemDefaults?.rateLimitMaxBuckets, 10000, 1000),
		displayTrackingMode: 'client-id',
		displayTrackingRetentionHours: 2,
		displayTrackingCleanupMinutes: 5,
		displayIpWhitelistEnabled: false,
		displayIpWhitelist: [],
		trustReverseProxy: false
	};

	const rawConfig = (() => {
		try {
			const data = fs.readFileSync(systemConfigPath, 'utf8');
			return JSON.parse(data);
		} catch (err) {
			return null;
		}
	})();

	if (!rawConfig) {
		return {
			...fallback,
			lastUpdated: null
		};
	}

	const normalized = normalizeSystemConfig(rawConfig, fallback);

	return {
		...normalized,
		lastUpdated: rawConfig.lastUpdated || null
	};
}

/**
 * Returns the public system configuration.
 * Demo mode is automatically determined based on the OAuth status:
 * No OAuth configured → demo mode ON, OAuth configured → demo mode OFF.
 * @returns {Object} System configuration with all settings
 */
function getSystemConfig() {
	const runtimeConfig = getSystemRuntimeConfig();

	// Demo mode is tied to the OAuth status:
	// - No OAuth configured → demo mode ON (regardless of stored value)
	// - OAuth configured → demo mode OFF (regardless of stored value)
	const oauthConfigured = (() => {
		// Check environment variable-based OAuth configuration
		const clientId = String(config?.msalConfig?.auth?.clientId || '').trim();
		const authority = String(config?.msalConfig?.auth?.authority || '').trim();
		const clientSecret = String(config?.msalConfig?.auth?.clientSecret || '').trim();
		if (clientId && clientId !== 'OAUTH_CLIENT_ID_NOT_SET'
			&& authority && authority !== 'OAUTH_AUTHORITY_NOT_SET'
			&& clientSecret && clientSecret !== 'OAUTH_CLIENT_SECRET_NOT_SET') {
			return true;
		}
		// Check file-based OAuth configuration
		const oauthConfig = getOAuthRuntimeConfig();
		const fileClientId = String(oauthConfig.clientId || '').trim();
		const fileAuthority = String(oauthConfig.authority || '').trim();
		return !!(fileClientId && fileClientId !== 'OAUTH_CLIENT_ID_NOT_SET'
			&& fileAuthority && fileAuthority !== 'OAUTH_AUTHORITY_NOT_SET'
			&& oauthConfig.hasClientSecret);
	})();

	return {
		startupValidationStrict: runtimeConfig.startupValidationStrict,
		graphWebhookEnabled: runtimeConfig.graphWebhookEnabled,
		graphWebhookClientState: runtimeConfig.graphWebhookClientState,
		graphWebhookAllowedIps: runtimeConfig.graphWebhookAllowedIps,
		exposeDetailedErrors: runtimeConfig.exposeDetailedErrors,
		graphFetchTimeoutMs: runtimeConfig.graphFetchTimeoutMs,
		graphFetchRetryAttempts: runtimeConfig.graphFetchRetryAttempts,
		graphFetchRetryBaseMs: runtimeConfig.graphFetchRetryBaseMs,
		hstsMaxAge: runtimeConfig.hstsMaxAge,
		rateLimitMaxBuckets: runtimeConfig.rateLimitMaxBuckets,
		displayTrackingMode: runtimeConfig.displayTrackingMode,
		displayTrackingRetentionHours: runtimeConfig.displayTrackingRetentionHours,
		displayTrackingCleanupMinutes: runtimeConfig.displayTrackingCleanupMinutes,
		displayIpWhitelistEnabled: runtimeConfig.displayIpWhitelistEnabled,
		displayIpWhitelist: runtimeConfig.displayIpWhitelist,
		trustReverseProxy: runtimeConfig.trustReverseProxy,
		demoMode: !oauthConfigured,
		lastUpdated: runtimeConfig.lastUpdated
	};
}

/**
 * Normalizes the search/calendar configuration with default values.
 * @param {Object} searchConfig - Raw search configuration
 * @returns {Object} Normalized configuration with maxDays, maxRooms, pollIntervalMs, etc.
 */
function normalizeSearchConfig(searchConfig) {
	const defaults = config.calendarSearch || {};
	const source = searchConfig && typeof searchConfig === 'object' && !Array.isArray(searchConfig)
		? searchConfig
		: {};

	const fallbackMaxDays = toMinInt(defaults.maxDays, 7, 1);
	const fallbackMaxRoomLists = toMinInt(defaults.maxRoomLists, 5, 1);
	const fallbackMaxRooms = toMinInt(defaults.maxRooms, 50, 1);
	const fallbackMaxItems = toMinInt(defaults.maxItems, 100, 1);
	const fallbackPollInterval = toMinInt(defaults.pollIntervalMs, 15000, 5000);

	return {
		useGraphAPI: true,
		maxDays: toMinInt(source.maxDays, fallbackMaxDays, 1),
		maxRoomLists: toMinInt(source.maxRoomLists, fallbackMaxRoomLists, 1),
		maxRooms: toMinInt(source.maxRooms, fallbackMaxRooms, 1),
		maxItems: toMinInt(source.maxItems, fallbackMaxItems, 1),
		pollIntervalMs: toMinInt(source.pollIntervalMs, fallbackPollInterval, 5000)
	};
}

/**
 * Normalizes the rate limit configuration with default values.
 * @param {Object} rateLimitConfig - Raw rate limit configuration
 * @returns {Object} Normalized configuration with time windows and maximum values
 */
function normalizeRateLimitConfig(rateLimitConfig) {
	const defaults = config.rateLimit || {};
	const source = rateLimitConfig && typeof rateLimitConfig === 'object' && !Array.isArray(rateLimitConfig)
		? rateLimitConfig
		: {};

	const fallbackApiWindowMs = toMinInt(defaults.apiWindowMs, 60000, 1000);
	const fallbackApiMax = toMinInt(defaults.apiMax, 300, 1);
	const fallbackWriteWindowMs = toMinInt(defaults.writeWindowMs, 60000, 1000);
	const fallbackWriteMax = toMinInt(defaults.writeMax, 60, 1);
	const fallbackAuthWindowMs = toMinInt(defaults.authWindowMs, 60000, 1000);
	const fallbackAuthMax = toMinInt(defaults.authMax, 30, 1);
	const fallbackBookingWindowMs = toMinInt(defaults.bookingWindowMs, 60000, 1000);
	const fallbackBookingMax = toMinInt(defaults.bookingMax, 10, 1);

	return {
		apiWindowMs: toMinInt(source.apiWindowMs, fallbackApiWindowMs, 1000),
		apiMax: toMinInt(source.apiMax, fallbackApiMax, 1),
		writeWindowMs: toMinInt(source.writeWindowMs, fallbackWriteWindowMs, 1000),
		writeMax: toMinInt(source.writeMax, fallbackWriteMax, 1),
		authWindowMs: toMinInt(source.authWindowMs, fallbackAuthWindowMs, 1000),
		authMax: toMinInt(source.authMax, fallbackAuthMax, 1),
		bookingWindowMs: toMinInt(source.bookingWindowMs, fallbackBookingWindowMs, 1000),
		bookingMax: toMinInt(source.bookingMax, fallbackBookingMax, 1)
	};
}

/**
 * Normalizes the translation API configuration with default values.
 * @param {Object} translationApiConfig - Raw translation API configuration
 * @param {Object} [fallback={}] - Fallback values
 * @returns {Object} Normalized configuration with enabled, url, timeoutMs, and apiKey
 */
function normalizeTranslationApiConfig(translationApiConfig, fallback = {}) {
	const fallbackEnabled = toBoolean(fallback.enabled, true);
	const fallbackUrl = String(fallback.url || 'https://translation.googleapis.com/language/translate/v2').trim() || 'https://translation.googleapis.com/language/translate/v2';
	const fallbackTimeoutMs = toMinInt(fallback.timeoutMs, 20000, 3000);
	const fallbackApiKey = String(fallback.apiKey || '');

	const source = translationApiConfig && typeof translationApiConfig === 'object' && !Array.isArray(translationApiConfig)
		? translationApiConfig
		: {};

	return {
		enabled: toBoolean(source.enabled, fallbackEnabled),
		url: source.url !== undefined
			? (String(source.url || '').trim() || fallbackUrl)
			: fallbackUrl,
		timeoutMs: toMinInt(source.timeoutMs, fallbackTimeoutMs, 3000),
		apiKey: source.apiKey !== undefined ? String(source.apiKey || '') : fallbackApiKey
	};
}

/**
 * Determines the translation API runtime configuration.
 * Combines environment variables with file configuration.
 * @returns {Object} Translation API configuration with lastUpdated
 */
function getTranslationApiRuntimeConfig() {
	const fallback = normalizeTranslationApiConfig({
		enabled: process.env.AUTO_TRANSLATE_ENABLED !== 'false',
		url: process.env.AUTO_TRANSLATE_URL || 'https://translation.googleapis.com/language/translate/v2',
		apiKey: process.env.AUTO_TRANSLATE_API_KEY || '',
		timeoutMs: process.env.AUTO_TRANSLATE_TIMEOUT_MS
			? Math.max(parseInt(process.env.AUTO_TRANSLATE_TIMEOUT_MS, 10) || 0, 3000)
			: 20000
	});

	const rawConfig = (() => {
		try {
			const data = fs.readFileSync(translationApiConfigPath, 'utf8');
			return JSON.parse(data);
		} catch (err) {
			return null;
		}
	})();

	if (!rawConfig) {
		return {
			...fallback,
			lastUpdated: null
		};
	}

	const normalized = normalizeTranslationApiConfig(rawConfig, fallback);
	return {
		...normalized,
		lastUpdated: rawConfig.lastUpdated || null
	};
}

/**
 * Returns the public translation API configuration.
 * The API is only enabled when both enabled=true and an API key is present.
 * @returns {Object} Configuration with enabled, url, timeoutMs, hasApiKey, and lastUpdated
 */
function getTranslationApiConfig() {
	const runtimeConfig = getTranslationApiRuntimeConfig();
	const hasApiKey = !!String(runtimeConfig.apiKey || '').trim();
	return {
		enabled: runtimeConfig.enabled && hasApiKey,
		url: runtimeConfig.url,
		timeoutMs: runtimeConfig.timeoutMs,
		hasApiKey,
		lastUpdated: runtimeConfig.lastUpdated
	};
}

/**
 * Saves the translation API configuration.
 * Preserves the existing API key if none is included in the update.
 * @param {Object} translationApiConfig - Configuration to save
 * @returns {Object} Saved configuration with lastUpdated
 */
function saveTranslationApiConfig(translationApiConfig) {
	let existingRaw = {};
	try {
		const data = fs.readFileSync(translationApiConfigPath, 'utf8');
		existingRaw = JSON.parse(data);
	} catch (err) {
		// File doesn't exist or is invalid, use defaults
	}

	const existingBase = normalizeTranslationApiConfig(existingRaw, {
		enabled: process.env.AUTO_TRANSLATE_ENABLED !== 'false',
		url: process.env.AUTO_TRANSLATE_URL || 'https://translation.googleapis.com/language/translate/v2',
		apiKey: process.env.AUTO_TRANSLATE_API_KEY || '',
		timeoutMs: process.env.AUTO_TRANSLATE_TIMEOUT_MS
			? Math.max(parseInt(process.env.AUTO_TRANSLATE_TIMEOUT_MS, 10) || 0, 3000)
			: 20000
	});

	const source = translationApiConfig && typeof translationApiConfig === 'object' && !Array.isArray(translationApiConfig)
		? translationApiConfig
		: {};

	const normalized = normalizeTranslationApiConfig(source, existingBase);
	const keepExistingApiKey = source.apiKey === undefined;

	const configData = {
		enabled: normalized.enabled,
		url: normalized.url,
		timeoutMs: normalized.timeoutMs,
		apiKey: keepExistingApiKey ? existingBase.apiKey : normalized.apiKey,
		lastUpdated: new Date().toISOString()
	};

	fs.writeFileSync(translationApiConfigPath, JSON.stringify(configData, null, 2));
	const hasApiKey = !!String(configData.apiKey || '').trim();
	return {
		enabled: configData.enabled && hasApiKey,
		url: configData.url,
		timeoutMs: configData.timeoutMs,
		hasApiKey,
		lastUpdated: configData.lastUpdated
	};
}

/**
 * Reads the search configuration from the file or returns default values.
 * @returns {Object} Search configuration with maxDays, maxRooms, pollIntervalMs, etc.
 */
function getSearchConfig() {
	try {
		const data = fs.readFileSync(searchConfigPath, 'utf8');
		const parsed = JSON.parse(data);
		return {
			...normalizeSearchConfig(parsed),
			lastUpdated: parsed.lastUpdated || null
		};
	} catch (err) {
		return {
			...normalizeSearchConfig(config.calendarSearch),
			lastUpdated: null
		};
	}
}

/**
 * Reads the rate limit configuration from the file or returns default values.
 * @returns {Object} Rate limit configuration with time windows and maximum values
 */
function getRateLimitConfig() {
	try {
		const data = fs.readFileSync(rateLimitConfigPath, 'utf8');
		const parsed = JSON.parse(data);
		return {
			...normalizeRateLimitConfig(parsed),
			lastUpdated: parsed.lastUpdated || null
		};
	} catch (err) {
		return {
			...normalizeRateLimitConfig(config.rateLimit),
			lastUpdated: null
		};
	}
}

/**
 * Saves the OAuth configuration to the file.
 * Encrypts the client secret with AES-256-GCM.
 * @param {Object} oauthConfig - OAuth configuration with clientId, authority, and clientSecret
 * @returns {Object} Saved configuration (without secret, only hasClientSecret flag)
 */
function saveOAuthConfig(oauthConfig) {
	const existingRaw = readRawOAuthConfig() || {};
	const existingBase = normalizeOAuthConfigBase(existingRaw, {
		clientId: config.msalConfig?.auth?.clientId || '',
		authority: config.msalConfig?.auth?.authority || ''
	});

	const nextBase = normalizeOAuthConfigBase(oauthConfig, existingBase);
	let encryptedSecret = existingRaw.clientSecretEncrypted || null;

	if (oauthConfig && Object.prototype.hasOwnProperty.call(oauthConfig, 'clientSecret')) {
		const incomingSecret = String(oauthConfig.clientSecret || '');
		if (incomingSecret.trim().length === 0) {
			encryptedSecret = null;
		} else {
			encryptedSecret = encryptOAuthSecret(incomingSecret);
		}
	}

	const configData = {
		clientId: nextBase.clientId,
		authority: nextBase.authority,
		clientSecretEncrypted: encryptedSecret,
		lastUpdated: new Date().toISOString()
	};

	fs.writeFileSync(oauthConfigPath, JSON.stringify(configData, null, 2));
	return {
		clientId: configData.clientId,
		authority: configData.authority,
		hasClientSecret: !!encryptedSecret,
		lastUpdated: configData.lastUpdated
	};
}

/**
 * Saves the system configuration to the file.
 * Combines existing with new settings and normalizes all values.
 * @param {Object} systemConfig - System configuration to save
 * @returns {Object} Saved configuration with timestamp
 */
function saveSystemConfig(systemConfig) {
	let existingRaw = {};
	try {
		const data = fs.readFileSync(systemConfigPath, 'utf8');
		existingRaw = JSON.parse(data);
	} catch (err) {
		// File does not exist or is invalid, use defaults
	}

	const normalized = normalizeSystemConfig(
		systemConfig,
		normalizeSystemConfig(existingRaw, {
			startupValidationStrict: config.startupValidation?.strict === true,
			graphWebhookEnabled: config.graphWebhook?.enabled === true,
			graphWebhookClientState: config.graphWebhook?.clientState || '',
			graphWebhookAllowedIps: Array.isArray(config.graphWebhook?.allowedIps) ? config.graphWebhook.allowedIps : [],
			exposeDetailedErrors: config.systemDefaults?.exposeDetailedErrors === true,
			graphFetchTimeoutMs: toMinInt(config.systemDefaults?.graphFetchTimeoutMs, 10000, 1000),
			graphFetchRetryAttempts: toMinInt(config.systemDefaults?.graphFetchRetryAttempts, 2, 0),
			graphFetchRetryBaseMs: toMinInt(config.systemDefaults?.graphFetchRetryBaseMs, 250, 50),
			hstsMaxAge: toMinInt(config.systemDefaults?.hstsMaxAge, 31536000, 0),
			rateLimitMaxBuckets: toMinInt(config.systemDefaults?.rateLimitMaxBuckets, 10000, 1000),
			displayTrackingMode: 'client-id',
			displayTrackingRetentionHours: 2,
			displayTrackingCleanupMinutes: 5,
			displayIpWhitelistEnabled: false,
			displayIpWhitelist: [],
			trustReverseProxy: false
		})
	);

	const configData = {
		...normalized,
		lastUpdated: new Date().toISOString()
	};

	fs.writeFileSync(systemConfigPath, JSON.stringify(configData, null, 2));
	return {
		startupValidationStrict: configData.startupValidationStrict,
		graphWebhookEnabled: configData.graphWebhookEnabled,
		graphWebhookClientState: configData.graphWebhookClientState,
		graphWebhookAllowedIps: configData.graphWebhookAllowedIps,
		exposeDetailedErrors: configData.exposeDetailedErrors,
		graphFetchTimeoutMs: configData.graphFetchTimeoutMs,
		graphFetchRetryAttempts: configData.graphFetchRetryAttempts,
		graphFetchRetryBaseMs: configData.graphFetchRetryBaseMs,
		hstsMaxAge: configData.hstsMaxAge,
		rateLimitMaxBuckets: configData.rateLimitMaxBuckets,
		displayTrackingMode: configData.displayTrackingMode,
		displayTrackingRetentionHours: configData.displayTrackingRetentionHours,
		displayTrackingCleanupMinutes: configData.displayTrackingCleanupMinutes,
		displayIpWhitelistEnabled: configData.displayIpWhitelistEnabled,
		displayIpWhitelist: configData.displayIpWhitelist,
		trustReverseProxy: configData.trustReverseProxy,
		demoMode: configData.demoMode,
		lastUpdated: configData.lastUpdated
	};
}

/**
 * Returns the default i18n configuration with maintenance messages in multiple languages.
 * Contains predefined translations for: en, de, fr, es, it, nl, pl, pt, cs.
 * @returns {Object} Default i18n configuration
 */
function getDefaultI18nConfig() {
	return {
		maintenanceMessages: {
			en: {
				title: 'Maintenance mode active',
				body: 'This display is temporarily unavailable.'
			},
			de: {
				title: 'Wartungsmodus aktiv',
				body: 'Diese Anzeige ist vorübergehend nicht verfügbar.'
			},
			fr: {
				title: 'Mode maintenance actif',
				body: 'Cet affichage est temporairement indisponible.'
			},
			es: {
				title: 'Modo de mantenimiento activo',
				body: 'Esta pantalla no está disponible temporalmente.'
			},
			it: {
				title: 'Modalità manutenzione attiva',
				body: 'Questo display è temporaneamente non disponibile.'
			},
			nl: {
				title: 'Onderhoudsmodus actief',
				body: 'Dit scherm is tijdelijk niet beschikbaar.'
			},
			pl: {
				title: 'Tryb konserwacji aktywny',
				body: 'Ten ekran jest tymczasowo niedostępny.'
			},
			pt: {
				title: 'Modo de manutenção ativo',
				body: 'Este ecrã está temporariamente indisponível.'
			},
			cs: {
				title: 'Režim údržby aktivní',
				body: 'Tato obrazovka je dočasně nedostupná.'
			}
		},
		adminTranslations: {},
		lastUpdated: null
	};
}

/**
 * Normalizes admin translations.
 * Validates language keys and converts all values to strings.
 * @param {Object} rawTranslations - Raw translation data
 * @returns {Object} Normalized translations grouped by language
 */
function normalizeAdminTranslations(rawTranslations) {
	const normalized = {};
	if (!rawTranslations || typeof rawTranslations !== 'object' || Array.isArray(rawTranslations)) {
		return normalized;
	}

	for (const [langKey, value] of Object.entries(rawTranslations)) {
		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			continue;
		}

		const language = String(langKey).trim().toLowerCase();
		if (!language) {
			continue;
		}

		const messages = {};
		for (const [key, textValue] of Object.entries(value)) {
			messages[String(key)] = textValue === undefined || textValue === null
				? ''
				: String(textValue);
		}

		normalized[language] = messages;
	}

	return normalized;
}

/**
 * Normalizes the i18n configuration.
 * Can optionally include default values (includeDefaults).
 * @param {Object} rawConfig - Raw i18n configuration
 * @param {Object} [options={}] - Options (includeDefaults: boolean)
 * @returns {Object} Normalized i18n configuration
 */
function normalizeI18nConfig(rawConfig, options = {}) {
	const includeDefaults = options.includeDefaults !== false;
	const defaults = getDefaultI18nConfig();
	const source = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
	const normalizedMessages = {};
	const normalizedAdminTranslations = normalizeAdminTranslations(source.adminTranslations);
	const sourceMessages = source.maintenanceMessages && typeof source.maintenanceMessages === 'object'
		? source.maintenanceMessages
		: {};

	for (const [langKey, value] of Object.entries(sourceMessages)) {
		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			continue;
		}

		const language = String(langKey).trim().toLowerCase();
		if (!language) {
			continue;
		}

		normalizedMessages[language] = {
			title: value.title !== undefined ? String(value.title) : '',
			body: value.body !== undefined ? String(value.body) : ''
		};
	}

	return {
		maintenanceMessages: includeDefaults
			? {
				...defaults.maintenanceMessages,
				...normalizedMessages
			}
			: normalizedMessages,
		adminTranslations: includeDefaults
			? {
				...defaults.adminTranslations,
				...normalizedAdminTranslations
			}
			: normalizedAdminTranslations,
		lastUpdated: source.lastUpdated || null
	};
}

/**
 * Reads the i18n configuration from the file or returns default values.
 * @returns {Object} i18n configuration with maintenanceMessages and lastUpdated
 */
function getI18nConfig() {
	try {
		const data = fs.readFileSync(i18nConfigPath, 'utf8');
		return normalizeI18nConfig(JSON.parse(data), { includeDefaults: false });
	} catch (err) {
		return getDefaultI18nConfig();
	}
}

/**
 * Reads the colors configuration from the file or returns default values.
 * @returns {Object} Colors configuration with bookingButtonColor, statusAvailableColor, statusBusyColor, statusUpcomingColor, and lastUpdated
 */
function getColorsConfig() {
	try {
		const data = fs.readFileSync(colorsConfigPath, 'utf8');
		return JSON.parse(data);
	} catch (err) {
		// Return default colors if file doesn't exist
		return {
			bookingButtonColor: '#334155',
			statusAvailableColor: '#22c55e',
			statusBusyColor: '#ef4444',
			statusUpcomingColor: '#f59e0b',
			statusNotFoundColor: '#6b7280',
			lastUpdated: null
		};
	}
}

/**
 * Saves the WiFi configuration to the file.
 * The password is stored encrypted but returned in plaintext.
 * @param {Object} config - WiFi configuration with ssid and password
 * @returns {Object} Saved configuration with timestamp
 */
function saveWiFiConfig(config) {
	const plainPassword = config.password || '';
	const configData = {
		ssid: config.ssid || '',
		passwordEncrypted: plainPassword ? encryptApiToken(plainPassword) : null,
		password_migrated: true,
		lastUpdated: new Date().toISOString()
	};
	
	fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

	// Return plaintext for caller (e.g. QR code generation)
	return {
		ssid: configData.ssid,
		password: plainPassword,
		lastUpdated: configData.lastUpdated
	};
}

/**
 * Saves the logo configuration to the file.
 * @param {Object} config - Logo configuration with logoDarkUrl and logoLightUrl
 * @returns {Object} Saved configuration with timestamp
 */
function saveLogoConfig(config) {
	const configData = {
		logoDarkUrl: config.logoDarkUrl || '../img/logo.B.png',
		logoLightUrl: config.logoLightUrl || '../img/logo.W.png',
		lastUpdated: new Date().toISOString()
	};
	
	fs.writeFileSync(logoConfigPath, JSON.stringify(configData, null, 2));
	return configData;
}

/**
 * Saves the sidebar configuration to the file.
 * Preserves existing fields that are not being updated.
 * @param {Object} sidebarConfig - Sidebar configuration with display settings
 * @returns {Object} Saved configuration with timestamp
 */
function saveSidebarConfig(sidebarConfig) {
	const existingConfig = readSidebarConfigSnapshot() || {
		showWiFi: config.sidebarDefaults.showWiFi,
		showUpcomingMeetings: config.sidebarDefaults.showUpcomingMeetings,
		showMeetingTitles: config.sidebarDefaults.showMeetingTitles,
		upcomingMeetingsCount: toMinInt(config.sidebarDefaults?.upcomingMeetingsCount, 3, 1),
		minimalHeaderStyle: 'filled',
		singleRoomDarkMode: !!config.sidebarDefaults.singleRoomDarkMode,
		flightboardDarkMode: config.sidebarDefaults.flightboardDarkMode !== undefined ? !!config.sidebarDefaults.flightboardDarkMode : true,
		clientOverrides: {}
	};

	const defaultSidebarUpcomingCount = toMinInt(config.sidebarDefaults?.upcomingMeetingsCount, 3, 1);

	const configData = {
		showWiFi: sidebarConfig.showWiFi !== undefined ? sidebarConfig.showWiFi : (existingConfig.showWiFi !== undefined ? existingConfig.showWiFi : true),
		showUpcomingMeetings: sidebarConfig.showUpcomingMeetings !== undefined ? sidebarConfig.showUpcomingMeetings : (existingConfig.showUpcomingMeetings !== undefined ? existingConfig.showUpcomingMeetings : false),
		showMeetingTitles: sidebarConfig.showMeetingTitles !== undefined ? sidebarConfig.showMeetingTitles : (existingConfig.showMeetingTitles !== undefined ? existingConfig.showMeetingTitles : false),
		upcomingMeetingsCount: Math.min(
			sidebarConfig.upcomingMeetingsCount !== undefined
				? toMinInt(sidebarConfig.upcomingMeetingsCount, defaultSidebarUpcomingCount, 1)
				: toMinInt(existingConfig.upcomingMeetingsCount, defaultSidebarUpcomingCount, 1),
			10
		),
		minimalHeaderStyle: sidebarConfig.minimalHeaderStyle !== undefined ? sidebarConfig.minimalHeaderStyle : (existingConfig.minimalHeaderStyle || 'filled'),
		singleRoomDarkMode: sidebarConfig.singleRoomDarkMode !== undefined
			? !!sidebarConfig.singleRoomDarkMode
			: !!existingConfig.singleRoomDarkMode,
		flightboardDarkMode: sidebarConfig.flightboardDarkMode !== undefined
			? !!sidebarConfig.flightboardDarkMode
			: (existingConfig.flightboardDarkMode !== undefined ? !!existingConfig.flightboardDarkMode : true),
		clientOverrides: sidebarConfig.clientOverrides !== undefined
			? normalizeSidebarClientOverrides(sidebarConfig.clientOverrides)
			: normalizeSidebarClientOverrides(existingConfig.clientOverrides),
		lastUpdated: new Date().toISOString()
	};
	
	fs.writeFileSync(sidebarConfigPath, JSON.stringify(configData, null, 2));
	return configData;
}

/**
 * Saves the booking configuration to the file.
 * Preserves existing fields that are not being updated.
 * @param {Object} config - Booking configuration with enableBooking and buttonColor
 * @returns {Object} Saved configuration with timestamp
 */
function saveBookingConfig(config) {
	// Read existing configuration to preserve fields that are not being updated
	let existingConfig = {};
	try {
		const data = fs.readFileSync(bookingConfigPath, 'utf8');
		existingConfig = JSON.parse(data);
	} catch (err) {
		// File does not exist or is invalid, use defaults
	}
	
	const configData = {
		enableBooking: config.enableBooking !== undefined
			? config.enableBooking
			: (existingConfig.enableBooking !== undefined ? existingConfig.enableBooking : true),
		buttonColor: config.buttonColor || existingConfig.buttonColor || '#334155',
		enableExtendMeeting: config.enableExtendMeeting !== undefined
			? config.enableExtendMeeting
			: (existingConfig.enableExtendMeeting !== undefined ? existingConfig.enableExtendMeeting : false),
		extendMeetingUrlAllowlist: Array.isArray(config.extendMeetingUrlAllowlist)
			? config.extendMeetingUrlAllowlist
			: (Array.isArray(existingConfig.extendMeetingUrlAllowlist) ? existingConfig.extendMeetingUrlAllowlist : []),
		roomFeatureFlags: config.roomFeatureFlags !== undefined
			? normalizeRoomFeatureFlags(config.roomFeatureFlags)
			: normalizeRoomFeatureFlags(existingConfig.roomFeatureFlags),
		roomGroupFeatureFlags: config.roomGroupFeatureFlags !== undefined
			? normalizeRoomGroupFeatureFlags(config.roomGroupFeatureFlags)
			: normalizeRoomGroupFeatureFlags(existingConfig.roomGroupFeatureFlags),
		checkIn: config.checkIn !== undefined
			? normalizeCheckInConfig(config.checkIn)
			: normalizeCheckInConfig(existingConfig.checkIn),
		lastUpdated: new Date().toISOString()
	};
	
	fs.writeFileSync(bookingConfigPath, JSON.stringify(configData, null, 2));
	return configData;
}

/**
 * Saves the maintenance mode configuration to the file.
 * @param {Object} maintenanceConfig - Maintenance configuration
 * @returns {Object} Saved configuration with timestamp
 */
function saveMaintenanceConfig(maintenanceConfig) {
	let existingConfig = {};
	try {
		const data = fs.readFileSync(maintenanceConfigPath, 'utf8');
		existingConfig = JSON.parse(data);
	} catch (err) {
		// File does not exist or is invalid, use defaults
	}

	const configData = {
		enabled: maintenanceConfig.enabled !== undefined
			? !!maintenanceConfig.enabled
			: (existingConfig.enabled !== undefined ? !!existingConfig.enabled : config.maintenanceDefaults.enabled),
		message: maintenanceConfig.message !== undefined
			? String(maintenanceConfig.message)
			: (existingConfig.message || config.maintenanceDefaults.message),
		lastUpdated: new Date().toISOString()
	};

	fs.writeFileSync(maintenanceConfigPath, JSON.stringify(configData, null, 2));
	return configData;
}

/**
 * Saves the i18n configuration to the file.
 * Protects the languages 'en' and 'de' from accidental deletion.
 * @param {Object} i18nConfig - i18n configuration
 * @returns {Object} Saved configuration with timestamp
 */
function saveI18nConfig(i18nConfig) {
	const existingConfig = getI18nConfig();
	const defaults = getDefaultI18nConfig();
	const normalizedIncoming = normalizeI18nConfig(i18nConfig, { includeDefaults: false });
	const hasMaintenanceMessages = i18nConfig
		&& typeof i18nConfig === 'object'
		&& Object.prototype.hasOwnProperty.call(i18nConfig, 'maintenanceMessages');
	const hasAdminTranslations = i18nConfig
		&& typeof i18nConfig === 'object'
		&& Object.prototype.hasOwnProperty.call(i18nConfig, 'adminTranslations');

	const configData = {
		maintenanceMessages: hasMaintenanceMessages
			? normalizedIncoming.maintenanceMessages
			: existingConfig.maintenanceMessages,
		adminTranslations: hasAdminTranslations
			? normalizedIncoming.adminTranslations
			: existingConfig.adminTranslations,
		lastUpdated: new Date().toISOString()
	};

	for (const protectedLanguage of ['en', 'de']) {
		if (!configData.maintenanceMessages[protectedLanguage]) {
			configData.maintenanceMessages[protectedLanguage] =
				existingConfig.maintenanceMessages?.[protectedLanguage]
				|| defaults.maintenanceMessages?.[protectedLanguage]
				|| { title: '', body: '' };
		}

		if (!configData.adminTranslations[protectedLanguage] && existingConfig.adminTranslations?.[protectedLanguage]) {
			configData.adminTranslations[protectedLanguage] = {
				...existingConfig.adminTranslations[protectedLanguage]
			};
		}
	}

	fs.writeFileSync(i18nConfigPath, JSON.stringify(configData, null, 2));
	return configData;
}

/**
 * Saves the colors configuration to the file.
 * @param {Object} config - Colors configuration with status and button colors
 * @returns {Object} Saved configuration with timestamp
 */
function saveColorsConfig(config) {
	const configData = {
		bookingButtonColor: config.bookingButtonColor || '#334155',
		statusAvailableColor: config.statusAvailableColor || '#22c55e',
		statusBusyColor: config.statusBusyColor || '#ef4444',
		statusUpcomingColor: config.statusUpcomingColor || '#f59e0b',
		statusNotFoundColor: config.statusNotFoundColor || '#6b7280',
		lastUpdated: new Date().toISOString()
	};
	
	fs.writeFileSync(colorsConfigPath, JSON.stringify(configData, null, 2));
	return configData;
}

/**
 * Saves the search configuration to the file.
 * Combines existing with new settings.
 * @param {Object} searchConfig - Search configuration to save
 * @returns {Object} Saved configuration with timestamp
 */
function saveSearchConfig(searchConfig) {
	let existingConfig = {};
	try {
		const data = fs.readFileSync(searchConfigPath, 'utf8');
		existingConfig = JSON.parse(data);
	} catch (err) {
		// File does not exist or is invalid, use defaults
	}

	const configData = {
		...normalizeSearchConfig({
			...existingConfig,
			...searchConfig
		}),
		lastUpdated: new Date().toISOString()
	};

	fs.writeFileSync(searchConfigPath, JSON.stringify(configData, null, 2));
	return configData;
}

/**
 * Saves the rate limit configuration to the file.
 * Combines existing with new settings.
 * @param {Object} rateLimitConfig - Rate limit configuration to save
 * @returns {Object} Saved configuration with timestamp
 */
function saveRateLimitConfig(rateLimitConfig) {
	let existingConfig = {};
	try {
		const data = fs.readFileSync(rateLimitConfigPath, 'utf8');
		existingConfig = JSON.parse(data);
	} catch (err) {
		// File does not exist or is invalid, use defaults
	}

	const configData = {
		...normalizeRateLimitConfig({
			...existingConfig,
			...rateLimitConfig
		}),
		lastUpdated: new Date().toISOString()
	};

	fs.writeFileSync(rateLimitConfigPath, JSON.stringify(configData, null, 2));
	return configData;
}

/**
 * Generates a WiFi QR code image.
 * Creates a QR code in the standard WiFi format: WIFI:T:WPA;S:<SSID>;P:<PASSWORD>;H:false;;
 * @param {string} ssid - WiFi network name
 * @param {string} password - WiFi password
 * @returns {Promise<boolean>} true on success, false on error
 */
async function generateQRCode(ssid, password) {
	const wifiString = `WIFI:T:WPA;S:${ssid};P:${password};H:false;;`;
	
	try {
		await QRCode.toFile(qrPath, wifiString, {
			errorCorrectionLevel: 'M',
			type: 'png',
			width: 300,
			margin: 2,
			color: {
				dark: '#1a1d29',  // Grey QR pattern
				light: '#FFFFFF'  // White background color
			}
		});
		return true;
	} catch (err) {
		console.error('Error generating QR code:', err);
		return false;
	}
}

/**
 * Updates the WiFi configuration and regenerates the QR code.
 * Distributes the change via Socket.IO to all connected clients.
 * @param {string} ssid - WiFi network name
 * @param {string} password - WiFi password
 * @returns {Promise<Object>} Updated configuration
 */
async function updateWiFiConfig(ssid, password) {
	const config = saveWiFiConfig({ ssid, password });
	await generateQRCode(ssid, password);
	
	// Emit Socket.IO event to notify all connected clients
	if (io) {
		io.of('/').emit('wifiConfigUpdated', config);
		console.log('WiFi config updated, notified all clients via Socket.IO');
	}
	
	return config;
}

/**
 * Updates the logo configuration.
 * Distributes the change via Socket.IO to all connected clients.
 * @param {string} logoDarkUrl - URL for the dark logo (light backgrounds)
 * @param {string} logoLightUrl - URL for the light logo (dark backgrounds)
 * @returns {Promise<Object>} Updated configuration
 */
async function updateLogoConfig(logoDarkUrl, logoLightUrl) {
	const config = saveLogoConfig({ logoDarkUrl, logoLightUrl });
	
	// Emit Socket.IO event to notify all connected clients
	if (io) {
		io.of('/').emit('logoConfigUpdated', config);
		console.log('Logo config updated, notified all clients via Socket.IO');
	}
	
	return config;
}

/**
 * Updates the sidebar configuration.
 * Supports client-specific overrides via options.targetClientId.
 * Distributes the change via Socket.IO to all connected clients.
 * @param {boolean} showWiFi - Show WiFi section
 * @param {boolean} showUpcomingMeetings - Show upcoming meetings
 * @param {boolean} showMeetingTitles - Show meeting titles
 * @param {string} minimalHeaderStyle - Header style ('filled' or 'transparent')
 * @param {number} upcomingMeetingsCount - Number of upcoming meetings to display
 * @param {Object} [options={}] - Additional options (targetClientId, singleRoomDarkMode, etc.)
 * @returns {Promise<Object>} Updated configuration
 */
async function updateSidebarConfig(showWiFi, showUpcomingMeetings, showMeetingTitles, minimalHeaderStyle, upcomingMeetingsCount, options = {}) {
	const normalizedTargetClientId = normalizeClientId(options.targetClientId);
	if (normalizedTargetClientId) {
		const snapshot = readSidebarConfigSnapshot() || {
			showWiFi: config.sidebarDefaults.showWiFi,
			showUpcomingMeetings: config.sidebarDefaults.showUpcomingMeetings,
			showMeetingTitles: config.sidebarDefaults.showMeetingTitles,
			upcomingMeetingsCount: toMinInt(config.sidebarDefaults?.upcomingMeetingsCount, 3, 1),
			minimalHeaderStyle: 'filled',
			singleRoomDarkMode: !!config.sidebarDefaults.singleRoomDarkMode,
			flightboardDarkMode: config.sidebarDefaults.flightboardDarkMode !== undefined ? !!config.sidebarDefaults.flightboardDarkMode : true,
			clientOverrides: {},
			lastUpdated: null
		};

		const nextOverrides = {
			...normalizeSidebarClientOverrides(snapshot.clientOverrides)
		};

		if (options.clearClientOverride) {
			delete nextOverrides[normalizedTargetClientId];
		} else {
			nextOverrides[normalizedTargetClientId] = {
				singleRoomDarkMode: options.singleRoomDarkMode !== undefined
					? !!options.singleRoomDarkMode
					: !!snapshot.singleRoomDarkMode,
				lastUpdated: new Date().toISOString()
			};
		}

		const config = saveSidebarConfig({ clientOverrides: nextOverrides });

		if (io) {
			io.of('/').emit('sidebarConfigUpdated', config);
			console.log('Information config updated with client override, notified all clients via Socket.IO');
		}

		return config;
	}

	const config = saveSidebarConfig({ 
		showWiFi, 
		showUpcomingMeetings, 
		showMeetingTitles, 
		minimalHeaderStyle, 
		upcomingMeetingsCount, 
		singleRoomDarkMode: options.singleRoomDarkMode,
		flightboardDarkMode: options.flightboardDarkMode
	});
	
	// Emit Socket.IO event to notify all connected clients
	if (io) {
		io.of('/').emit('sidebarConfigUpdated', config);
		console.log('Information config updated, notified all clients via Socket.IO');
	}
	
	return config;
}

/**
 * Updates the booking configuration.
 * Distributes the change via Socket.IO to all connected clients.
 * @param {boolean} enableBooking - Enable booking functionality
 * @param {string} buttonColor - Hex color for booking buttons
 * @param {boolean} enableExtendMeeting - Enable meeting extension
 * @param {Array<string>} extendMeetingUrlAllowlist - Allowed URLs for meeting extension
 * @param {Object} roomFeatureFlags - Room-specific feature flags
 * @param {Object} roomGroupFeatureFlags - Room group-specific feature flags
 * @param {Object} checkIn - Check-in configuration
 * @returns {Promise<Object>} Updated configuration
 */
async function updateBookingConfig(enableBooking, buttonColor, enableExtendMeeting, extendMeetingUrlAllowlist, roomFeatureFlags, roomGroupFeatureFlags, checkIn) {
	const config = saveBookingConfig({
		enableBooking,
		buttonColor,
		enableExtendMeeting,
		extendMeetingUrlAllowlist,
		roomFeatureFlags,
		roomGroupFeatureFlags,
		checkIn
	});
	
	// Emit Socket.IO event to notify all connected clients
	if (io) {
		io.of('/').emit('bookingConfigUpdated', config);
		console.log('Booking config updated, notified all clients via Socket.IO');
	}
	
	return config;
}

/**
 * Updates the maintenance mode configuration.
 * Distributes the change via Socket.IO to all connected clients.
 * @param {boolean} enabled - Maintenance mode enabled/disabled
 * @param {string} message - Maintenance message
 * @returns {Promise<Object>} Updated configuration
 */
async function updateMaintenanceConfig(enabled, message) {
	const maintenanceConfig = saveMaintenanceConfig({ enabled, message });

	if (io) {
		io.of('/').emit('maintenanceConfigUpdated', maintenanceConfig);
		console.log('Maintenance config updated, notified all clients via Socket.IO');
	}

	return maintenanceConfig;
}

/**
 * Updates the i18n configuration.
 * Distributes the change via Socket.IO to all connected clients.
 * @param {Object} i18nConfig - i18n configuration
 * @returns {Promise<Object>} Updated configuration
 */
async function updateI18nConfig(i18nConfig) {
	const updatedConfig = saveI18nConfig(i18nConfig);

	if (io) {
		io.of('/').emit('i18nConfigUpdated', updatedConfig);
		console.log('i18n config updated, notified all clients via Socket.IO');
	}

	return updatedConfig;
}

/**
 * Updates the colors configuration.
 * Distributes the change via Socket.IO to all connected clients.
 * @param {string} bookingButtonColor - Hex color for booking buttons
 * @param {string} statusAvailableColor - Hex color for "Available" status
 * @param {string} statusBusyColor - Hex color for "Busy" status
 * @param {string} statusUpcomingColor - Hex color for "Upcoming" status
 * @param {string} statusNotFoundColor - Hex color for "Not found" status
 * @returns {Promise<Object>} Updated configuration
 */
async function updateColorsConfig(bookingButtonColor, statusAvailableColor, statusBusyColor, statusUpcomingColor, statusNotFoundColor) {
	const config = saveColorsConfig({ 
		bookingButtonColor, 
		statusAvailableColor, 
		statusBusyColor, 
		statusUpcomingColor,
		statusNotFoundColor
	});
	
	// Emit Socket.IO event to notify all connected clients
	if (io) {
		io.of('/').emit('colorsConfigUpdated', config);
		console.log('Colors config updated, notified all clients via Socket.IO');
	}
	
	return config;
}

/**
 * Updates the search configuration and applies it to the runtime configuration.
 * Distributes the change via Socket.IO to all connected clients.
 * @param {Object} searchConfig - Search configuration to update
 * @returns {Promise<Object>} Updated configuration
 */
async function updateSearchConfig(searchConfig) {
	const updatedConfig = saveSearchConfig(searchConfig || {});

	config.calendarSearch.useGraphAPI = updatedConfig.useGraphAPI;
	config.calendarSearch.maxDays = updatedConfig.maxDays;
	config.calendarSearch.maxRoomLists = updatedConfig.maxRoomLists;
	config.calendarSearch.maxRooms = updatedConfig.maxRooms;
	config.calendarSearch.maxItems = updatedConfig.maxItems;
	config.calendarSearch.pollIntervalMs = updatedConfig.pollIntervalMs;

	if (io) {
		io.of('/').emit('searchConfigUpdated', updatedConfig);
		console.log('Search config updated, notified all clients via Socket.IO');
	}

	return updatedConfig;
}

/**
 * Updates the rate limit configuration and applies it to the runtime configuration.
 * Distributes the change via Socket.IO to all connected clients.
 * @param {Object} rateLimitConfig - Rate limit configuration to update
 * @returns {Promise<Object>} Updated configuration
 */
async function updateRateLimitConfig(rateLimitConfig) {
	const updatedConfig = saveRateLimitConfig(rateLimitConfig || {});

	config.rateLimit.apiWindowMs = updatedConfig.apiWindowMs;
	config.rateLimit.apiMax = updatedConfig.apiMax;
	config.rateLimit.writeWindowMs = updatedConfig.writeWindowMs;
	config.rateLimit.writeMax = updatedConfig.writeMax;
	config.rateLimit.authWindowMs = updatedConfig.authWindowMs;
	config.rateLimit.authMax = updatedConfig.authMax;
	config.rateLimit.bookingWindowMs = updatedConfig.bookingWindowMs;
	config.rateLimit.bookingMax = updatedConfig.bookingMax;

	if (io) {
		io.of('/').emit('rateLimitConfigUpdated', updatedConfig);
		console.log('Rate limit config updated, notified all clients via Socket.IO');
	}

	return updatedConfig;
}

/**
 * Updates the OAuth configuration and applies it to the MSAL runtime configuration.
 * Distributes the change via Socket.IO to all connected clients.
 * @param {Object} oauthConfig - OAuth configuration to update
 * @returns {Promise<Object>} Updated configuration
 */
async function updateOAuthConfig(oauthConfig) {
	const savedConfig = saveOAuthConfig(oauthConfig || {});
	const runtimeConfig = getOAuthRuntimeConfig();

	config.msalConfig.auth.clientId = runtimeConfig.clientId;
	config.msalConfig.auth.authority = runtimeConfig.authority;
	config.msalConfig.auth.clientSecret = runtimeConfig.clientSecret;

	if (io) {
		io.of('/').emit('oauthConfigUpdated', savedConfig);
		console.log('OAuth config updated, notified all clients via Socket.IO');
	}

	return savedConfig;
}

/**
 * Updates the system configuration and applies it to the runtime configuration.
 * Also sets the corresponding environment variables.
 * Distributes the change via Socket.IO to all connected clients.
 * @param {Object} systemConfig - System configuration to update
 * @returns {Promise<Object>} Updated configuration
 */
async function updateSystemConfig(systemConfig) {
	const savedConfig = saveSystemConfig(systemConfig || {});
	const runtimeConfig = getSystemRuntimeConfig();

	config.startupValidation.strict = runtimeConfig.startupValidationStrict;
	config.graphWebhook.enabled = runtimeConfig.graphWebhookEnabled;
	config.graphWebhook.clientState = runtimeConfig.graphWebhookClientState || null;
	config.graphWebhook.allowedIps = Array.isArray(runtimeConfig.graphWebhookAllowedIps)
		? runtimeConfig.graphWebhookAllowedIps
		: [];
	config.systemDefaults.exposeDetailedErrors = runtimeConfig.exposeDetailedErrors;
	config.systemDefaults.graphFetchTimeoutMs = runtimeConfig.graphFetchTimeoutMs;
	config.systemDefaults.graphFetchRetryAttempts = runtimeConfig.graphFetchRetryAttempts;
	config.systemDefaults.graphFetchRetryBaseMs = runtimeConfig.graphFetchRetryBaseMs;
	config.systemDefaults.hstsMaxAge = runtimeConfig.hstsMaxAge;
	config.systemDefaults.rateLimitMaxBuckets = runtimeConfig.rateLimitMaxBuckets;
	process.env.EXPOSE_DETAILED_ERRORS = runtimeConfig.exposeDetailedErrors ? 'true' : 'false';
	process.env.GRAPH_FETCH_TIMEOUT_MS = String(runtimeConfig.graphFetchTimeoutMs);
	process.env.GRAPH_FETCH_RETRY_ATTEMPTS = String(runtimeConfig.graphFetchRetryAttempts);
	process.env.GRAPH_FETCH_RETRY_BASE_MS = String(runtimeConfig.graphFetchRetryBaseMs);
	process.env.HSTS_MAX_AGE = String(runtimeConfig.hstsMaxAge);
	process.env.RATE_LIMIT_MAX_BUCKETS = String(runtimeConfig.rateLimitMaxBuckets);

	if (io) {
		io.of('/').emit('systemConfigUpdated', savedConfig);
		console.log('System config updated, notified all clients via Socket.IO');
	}

	return savedConfig;
}

/**
 * Updates the translation API configuration.
 * Distributes the change via Socket.IO to all connected clients.
 * @param {Object} translationApiConfig - Configuration to update
 * @returns {Promise<Object>} Updated configuration
 */
async function updateTranslationApiConfig(translationApiConfig) {
	const savedConfig = saveTranslationApiConfig(translationApiConfig || {});

	if (io) {
		io.of('/').emit('translationApiConfigUpdated', savedConfig);
		console.log('Translation API config updated, notified all clients via Socket.IO');
	}

	return savedConfig;
}

/**
 * Updates the API token.
 * Migrates encrypted OAuth secrets when the token changes.
 * Distributes the change via Socket.IO to all connected clients.
 * @param {string} nextToken - The new API token
 * @returns {Promise<Object>} Updated token configuration
 * @throws {Error} If token is empty or environment variable is locked
 */
async function updateApiToken(nextToken) {
	const normalizedNextToken = normalizeApiTokenValue(nextToken);
	if (!normalizedNextToken) {
		throw new Error('API token must not be empty.');
	}

	const runtimeConfig = getApiTokenRuntimeConfig();
	if (isApiTokenEnvLocked()) {
		throw new Error('API token is locked by environment variable API_TOKEN.');
	}

	if (runtimeConfig.source === 'unset') {
		clearStoredOAuthClientSecret();
	} else if (runtimeConfig.token !== normalizedNextToken) {
		migrateEncryptedOAuthSecretForTokenChange(runtimeConfig.token, normalizedNextToken);
	}

	const savedConfig = saveApiTokenConfig(normalizedNextToken);
	config.apiToken = normalizedNextToken;
	process.env.API_TOKEN = normalizedNextToken;

	if (io) {
		io.of('/').emit('apiTokenUpdated', { lastUpdated: savedConfig.lastUpdated });
		console.log('API token updated.');
	}

	return getApiTokenConfig();
}

/**
 * Updates the WiFi API token.
 * Distributes the change via Socket.IO to all connected clients.
 * @param {string} nextToken - The new WiFi API token
 * @returns {Promise<Object>} Updated token configuration
 * @throws {Error} If token is empty or environment variable is locked
 */
async function updateWifiApiToken(nextToken) {
	const normalizedNextToken = normalizeApiTokenValue(nextToken);
	if (!normalizedNextToken) {
		throw new Error('WiFi API token must not be empty.');
	}

	if (isWifiApiTokenEnvLocked()) {
		throw new Error('WiFi API token is locked by environment variable WIFI_API_TOKEN.');
	}

	const savedConfig = saveWifiApiTokenConfig(normalizedNextToken);
	process.env.WIFI_API_TOKEN = normalizedNextToken;

	if (io) {
		io.of('/').emit('wifiApiTokenUpdated', { lastUpdated: savedConfig.lastUpdated });
		console.log('WiFi API token updated.');
	}

	return getApiTokenConfig();
}

/**
 * Applies all persisted configuration changes to the runtime configuration.
 * Called at module startup to load saved settings from the
 * configuration files into the active configuration and environment variables.
 */
function applyRuntimeConfigOverrides() {
	const persistedSystemConfig = getSystemRuntimeConfig();
	config.startupValidation.strict = persistedSystemConfig.startupValidationStrict;
	config.graphWebhook.enabled = persistedSystemConfig.graphWebhookEnabled;
	config.graphWebhook.clientState = persistedSystemConfig.graphWebhookClientState || null;
	config.graphWebhook.allowedIps = Array.isArray(persistedSystemConfig.graphWebhookAllowedIps)
		? persistedSystemConfig.graphWebhookAllowedIps
		: [];
	config.systemDefaults.exposeDetailedErrors = persistedSystemConfig.exposeDetailedErrors;
	config.systemDefaults.graphFetchTimeoutMs = persistedSystemConfig.graphFetchTimeoutMs;
	config.systemDefaults.graphFetchRetryAttempts = persistedSystemConfig.graphFetchRetryAttempts;
	config.systemDefaults.graphFetchRetryBaseMs = persistedSystemConfig.graphFetchRetryBaseMs;
	config.systemDefaults.hstsMaxAge = persistedSystemConfig.hstsMaxAge;
	config.systemDefaults.rateLimitMaxBuckets = persistedSystemConfig.rateLimitMaxBuckets;
	process.env.EXPOSE_DETAILED_ERRORS = persistedSystemConfig.exposeDetailedErrors ? 'true' : 'false';
	process.env.GRAPH_FETCH_TIMEOUT_MS = String(persistedSystemConfig.graphFetchTimeoutMs);
	process.env.GRAPH_FETCH_RETRY_ATTEMPTS = String(persistedSystemConfig.graphFetchRetryAttempts);
	process.env.GRAPH_FETCH_RETRY_BASE_MS = String(persistedSystemConfig.graphFetchRetryBaseMs);
	process.env.HSTS_MAX_AGE = String(persistedSystemConfig.hstsMaxAge);
	process.env.RATE_LIMIT_MAX_BUCKETS = String(persistedSystemConfig.rateLimitMaxBuckets);

	const persistedOAuthConfig = getOAuthRuntimeConfig();
	config.msalConfig.auth.clientId = persistedOAuthConfig.clientId;
	config.msalConfig.auth.authority = persistedOAuthConfig.authority;
	config.msalConfig.auth.clientSecret = persistedOAuthConfig.clientSecret;

	const persistedSearchConfig = getSearchConfig();
	config.calendarSearch.useGraphAPI = persistedSearchConfig.useGraphAPI;
	config.calendarSearch.maxDays = persistedSearchConfig.maxDays;
	config.calendarSearch.maxRoomLists = persistedSearchConfig.maxRoomLists;
	config.calendarSearch.maxRooms = persistedSearchConfig.maxRooms;
	config.calendarSearch.maxItems = persistedSearchConfig.maxItems;
	config.calendarSearch.pollIntervalMs = persistedSearchConfig.pollIntervalMs;

	const persistedRateLimitConfig = getRateLimitConfig();
	config.rateLimit.apiWindowMs = persistedRateLimitConfig.apiWindowMs;
	config.rateLimit.apiMax = persistedRateLimitConfig.apiMax;
	config.rateLimit.writeWindowMs = persistedRateLimitConfig.writeWindowMs;
	config.rateLimit.writeMax = persistedRateLimitConfig.writeMax;
	config.rateLimit.authWindowMs = persistedRateLimitConfig.authWindowMs;
	config.rateLimit.authMax = persistedRateLimitConfig.authMax;

	const persistedApiTokenConfig = getApiTokenRuntimeConfig();
	config.apiToken = persistedApiTokenConfig.token;
	process.env.API_TOKEN = persistedApiTokenConfig.token;

	const persistedWifiApiTokenConfig = getWifiApiTokenRuntimeConfig();
	if (persistedWifiApiTokenConfig.token) {
		process.env.WIFI_API_TOKEN = persistedWifiApiTokenConfig.token;
	} else {
		delete process.env.WIFI_API_TOKEN;
	}
}

applyRuntimeConfigOverrides();

/**
 * Reads the power management configuration from the file or returns default values.
 * Ensures backward compatibility by adding missing global configuration.
 * @returns {Object} Power management configuration with global, displays, and lastUpdated
 */
function getPowerManagementConfig() {
	try {
		if (!fs.existsSync(powerManagementConfigPath)) {
			return {
				global: {
					mode: 'browser',
					schedule: {
						enabled: false,
						startTime: '20:00',
						endTime: '07:00',
						weekendMode: false
					}
				},
				displays: {},
				lastUpdated: null
			};
		}
		const data = fs.readFileSync(powerManagementConfigPath, 'utf8');
		const config = JSON.parse(data);
		
		// Ensure global configuration exists (for backward compatibility)
		if (!config.global) {
			config.global = {
				mode: 'browser',
				schedule: {
					enabled: false,
					startTime: '20:00',
					endTime: '07:00',
					weekendMode: false
				}
			};
		}
		
		return config;
	} catch (error) {
		console.error('[ConfigManager] Error reading power management config:', error);
		return {
			global: {
				mode: 'browser',
				schedule: {
					enabled: false,
					startTime: '20:00',
					endTime: '07:00',
					weekendMode: false
				}
			},
			displays: {},
			lastUpdated: null
		};
	}
}

/**
 * Updates the power management configuration for a specific display.
 * Distributes the change via Socket.IO to the affected display.
 * @param {string} clientId - Display client ID
 * @param {Object} displayConfig - Power management configuration
 * @param {string} displayConfig.mode - Mode: 'dpms', 'browser', or 'mqtt'
 * @param {string} [displayConfig.mqttHostname] - Touchkio hostname (required for MQTT mode)
 * @param {Object} displayConfig.schedule - Schedule configuration
 * @param {boolean} displayConfig.schedule.enabled - Schedule enabled
 * @param {string} displayConfig.schedule.startTime - Start time (HH:MM)
 * @param {string} displayConfig.schedule.endTime - End time (HH:MM)
 * @param {boolean} displayConfig.schedule.weekendMode - Enable weekend mode
 * @returns {Object} Saved display configuration
 * @throws {Error} On write error
 */
function updatePowerManagementConfig(clientId, displayConfig) {
	try {
		const config = getPowerManagementConfig();
		
		const updatedConfig = {
			mode: displayConfig.mode || 'browser',
			schedule: {
				enabled: displayConfig.schedule?.enabled || false,
				startTime: displayConfig.schedule?.startTime || '20:00',
				endTime: displayConfig.schedule?.endTime || '07:00',
				weekendMode: displayConfig.schedule?.weekendMode || false
			},
			lastUpdated: new Date().toISOString()
		};
		
		// Add MQTT hostname if mode is MQTT
		if (displayConfig.mode === 'mqtt' && displayConfig.mqttHostname) {
			updatedConfig.mqttHostname = displayConfig.mqttHostname;
		}
		
		config.displays[clientId] = updatedConfig;
		config.lastUpdated = new Date().toISOString();
		
		fs.writeFileSync(powerManagementConfigPath, JSON.stringify(config, null, 2));
		
		// Distribute update to the affected display
		if (io) {
			io.emit('power-management-update', {
				clientId,
				config: config.displays[clientId]
			});
		}
		
		return config.displays[clientId];
	} catch (error) {
		console.error('[ConfigManager] Error updating power management config:', error);
		throw error;
	}
}

/**
 * Updates the global power management configuration (default for all displays).
 * Distributes the change via Socket.IO to all displays without specific configuration.
 * @param {Object} globalConfig - Global power management configuration
 * @returns {Object} Saved global configuration
 * @throws {Error} On write error
 */
function updateGlobalPowerManagementConfig(globalConfig) {
	try {
		const config = getPowerManagementConfig();
		
		const updatedGlobal = {
			mode: globalConfig.mode || 'browser',
			schedule: {
				enabled: globalConfig.schedule?.enabled || false,
				startTime: globalConfig.schedule?.startTime || '20:00',
				endTime: globalConfig.schedule?.endTime || '07:00',
				weekendMode: globalConfig.schedule?.weekendMode || false
			}
		};
		
		// Add MQTT hostname if mode is MQTT
		if (globalConfig.mode === 'mqtt' && globalConfig.mqttHostname) {
			updatedGlobal.mqttHostname = globalConfig.mqttHostname;
		}
		
		config.global = updatedGlobal;
		config.lastUpdated = new Date().toISOString();
		
		fs.writeFileSync(powerManagementConfigPath, JSON.stringify(config, null, 2));
		
		// Distribute update to all displays that have no specific configuration
		if (io) {
			io.emit('power-management-global-update', {
				config: config.global
			});
		}
		
		return config.global;
	} catch (error) {
		console.error('[ConfigManager] Error updating global power management config:', error);
		throw error;
	}
}

/**
 * Returns the power management configuration for a specific display.
 * Falls back to the global configuration if no display-specific one exists.
 * @param {string} clientId - Display client ID
 * @returns {Object} Power management configuration for the display
 */
function getPowerManagementConfigForDisplay(clientId) {
	const config = getPowerManagementConfig();
	
	// Return display-specific configuration if available
	if (config.displays[clientId]) {
		return config.displays[clientId];
	}
	
	// Fall back to global configuration
	return config.global || {
		mode: 'browser',
		schedule: {
			enabled: false,
			startTime: '20:00',
			endTime: '07:00',
			weekendMode: false
		}
	};
}

/**
 * Deletes the power management configuration for a specific display.
 * The display will then fall back to the global configuration.
 * @param {string} clientId - Display client ID
 * @returns {boolean} true on success
 * @throws {Error} On write error
 */
function deletePowerManagementConfig(clientId) {
	try {
		const config = getPowerManagementConfig();
		
		if (config.displays[clientId]) {
			delete config.displays[clientId];
			config.lastUpdated = new Date().toISOString();
			fs.writeFileSync(powerManagementConfigPath, JSON.stringify(config, null, 2));
		}
		
		return true;
	} catch (error) {
		console.error('[ConfigManager] Error deleting power management config:', error);
		throw error;
	}
}

module.exports = {
	setSocketIO,
	getSocketIO,
	getWiFiConfig,
	getLogoConfig,
	getSidebarConfig,
	getSidebarConfigForClient,
	getBookingConfig,
	getSystemConfig,
	getOAuthConfig,
	getApiTokenConfig,
	getEffectiveApiToken,
	getEffectiveWifiApiToken,
	isApiTokenEnvLocked,
	isWifiApiTokenEnvLocked,
	isSystemEnvLocked,
	getSearchConfig,
	getRateLimitConfig,
	getTranslationApiRuntimeConfig,
	getTranslationApiConfig,
	getColorsConfig,
	getMaintenanceConfig,
	getI18nConfig,
	getPowerManagementConfig,
	getPowerManagementConfigForDisplay,
	updatePowerManagementConfig,
	updateGlobalPowerManagementConfig,
	deletePowerManagementConfig,
	updateWiFiConfig,
	updateLogoConfig,
	updateSidebarConfig,
	updateBookingConfig,
	updateSystemConfig,
	updateOAuthConfig,
	updateApiToken,
	updateWifiApiToken,
	updateSearchConfig,
	updateRateLimitConfig,
	updateTranslationApiConfig,
	updateColorsConfig,
	updateMaintenanceConfig,
	updateI18nConfig,
	updatePowerManagementConfig,
	deletePowerManagementConfig,
	generateQRCode
};


// ============================================================================
// MQTT configuration
// ============================================================================
/** @type {string} Path to the MQTT configuration file */
const mqttConfigPath = path.join(__dirname, '../data/mqtt-config.json');

/**
 * Reads the MQTT configuration from the file or returns default values.
 * Performs automatic migration from plaintext passwords to encrypted storage.
 * @returns {Object} MQTT configuration with enabled, brokerUrl, authentication, username, password, etc.
 */
function getMqttConfig() {
	try {
		const data = fs.readFileSync(mqttConfigPath, 'utf8');
		const parsed = JSON.parse(data);

		// Migration: decrypt encrypted password if present
		if (parsed.passwordEncrypted && typeof parsed.passwordEncrypted === 'object') {
			const decrypted = decryptApiToken(parsed.passwordEncrypted);
			parsed.password = decrypted || '';
		} else if (parsed.password) {
			// Legacy plaintext password found — encrypt and save back
			const encrypted = encryptApiToken(parsed.password);
			const migrated = { ...parsed, passwordEncrypted: encrypted };
			delete migrated.password;
			try {
				fs.writeFileSync(mqttConfigPath, JSON.stringify(migrated, null, 2));
			} catch (_) { /* best effort */ }
		}

		return {
			enabled: parsed.enabled || false,
			brokerUrl: parsed.brokerUrl || 'mqtt://localhost:1883',
			authentication: parsed.authentication || false,
			username: parsed.username || 'meeteasier',
			password: parsed.password || '',
			discovery: parsed.discovery || 'homeassistant',
			lastUpdated: parsed.lastUpdated || null
		};
	} catch (err) {
		// Return default configuration if file does not exist
		return {
			enabled: false,
			port: 1883,
			wsPort: 8883,
			authentication: false,
			username: 'meeteasier',
			password: '',
			discovery: 'homeassistant',
			lastUpdated: null
		};
	}
}

/**
 * Updates the MQTT configuration and saves it encrypted.
 * Distributes the change (without password) via Socket.IO to all clients.
 * @param {Object} mqttConfig - MQTT configuration
 * @param {boolean} mqttConfig.enabled - MQTT enabled/disabled
 * @param {string} mqttConfig.brokerUrl - Broker URL (e.g. mqtt://localhost:1883)
 * @param {boolean} mqttConfig.authentication - Authentication enabled
 * @param {string} mqttConfig.username - Username
 * @param {string} mqttConfig.password - Password (stored encrypted)
 * @param {string} mqttConfig.discovery - Discovery protocol (e.g. 'homeassistant')
 * @returns {Object} Saved configuration with plaintext password for the caller
 * @throws {Error} On write error
 */
function updateMqttConfig(mqttConfig) {
	try {
		const plainPassword = mqttConfig.password || '';
		const configToStore = {
			enabled: mqttConfig.enabled !== undefined ? mqttConfig.enabled : false,
			brokerUrl: mqttConfig.brokerUrl || 'mqtt://localhost:1883',
			authentication: mqttConfig.authentication !== undefined ? mqttConfig.authentication : false,
			username: mqttConfig.username || 'meeteasier',
			passwordEncrypted: plainPassword ? encryptApiToken(plainPassword) : null,
			discovery: mqttConfig.discovery || 'homeassistant',
			lastUpdated: new Date().toISOString()
		};

		fs.writeFileSync(mqttConfigPath, JSON.stringify(configToStore, null, 2));

		// Return plaintext for caller (mqtt-client needs it)
		const configResult = {
			enabled: configToStore.enabled,
			brokerUrl: configToStore.brokerUrl,
			authentication: configToStore.authentication,
			username: configToStore.username,
			password: plainPassword,
			discovery: configToStore.discovery,
			lastUpdated: configToStore.lastUpdated
		};

		// Distribute configuration without password via Socket.IO
		if (io) {
			const safeConfig = { ...configResult };
			delete safeConfig.password;
			io.emit('mqttConfigUpdated', safeConfig);
		}

		return configResult;
	} catch (error) {
		console.error('[ConfigManager] Error updating MQTT config:', error);
		throw error;
	}
}

// Export MQTT functions
module.exports.getMqttConfig = getMqttConfig;
module.exports.updateMqttConfig = updateMqttConfig;
