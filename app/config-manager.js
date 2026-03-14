const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const config = require('../config/config');

/**
 * Configuration Manager - Handles WiFi, logo, information, and booking configuration
 * Manages configuration files and generates WiFi QR codes
 * Broadcasts configuration updates via Socket.IO for real-time updates
 */

// Configuration file paths
const configPath = path.join(__dirname, '../data/wifi-config.json');
const logoConfigPath = path.join(__dirname, '../data/logo-config.json');
const sidebarConfigPath = path.join(__dirname, '../data/sidebar-config.json');
const bookingConfigPath = path.join(__dirname, '../data/booking-config.json');
const colorsConfigPath = path.join(__dirname, '../data/colors-config.json');
const maintenanceConfigPath = path.join(__dirname, '../data/maintenance-config.json');
const i18nConfigPath = path.join(__dirname, '../data/i18n-config.json');
const searchConfigPath = path.join(__dirname, '../data/search-config.json');
const rateLimitConfigPath = path.join(__dirname, '../data/rate-limit-config.json');
const oauthConfigPath = path.join(__dirname, '../data/oauth-config.json');
const systemConfigPath = path.join(__dirname, '../data/system-config.json');
const translationApiConfigPath = path.join(__dirname, '../data/translation-api-config.json');
const apiTokenConfigPath = path.join(__dirname, '../data/api-token-config.json');
const powerManagementConfigPath = path.join(__dirname, '../data/power-management-config.json');
const apiTokenEncryptionKeyPath = path.join(__dirname, '../data/.api-token-key');
const qrPath = path.join(__dirname, '../static/img/wifi-qr.png');

const OAUTH_SECRET_ALGO = 'aes-256-gcm';
const API_TOKEN_ENCRYPTION_ALGO = 'aes-256-gcm';
const API_TOKEN_ENCRYPTION_ENV = 'API_TOKEN_ENCRYPTION_KEY';
const INITIAL_API_TOKEN_ENV_VALUE = String(process.env.API_TOKEN || '').trim();
const INITIAL_WIFI_API_TOKEN_ENV_VALUE = String(process.env.WIFI_API_TOKEN || '').trim();
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
const INITIAL_SYSTEM_ENV_LOCKED = SYSTEM_ENV_LOCK_KEYS.some((key) => process.env[key] !== undefined);
const API_TOKEN_PLACEHOLDERS = new Set([
	'',
	'api_token_not_set'
]);

let io = null;

/**
 * Set Socket.IO instance for broadcasting configuration updates
 * @param {Object} socketIO - Socket.IO server instance
 */
function setSocketIO(socketIO) {
	io = socketIO;
}

/**
 * Read WiFi configuration from file or return defaults
 * @returns {Object} WiFi configuration with ssid, password, and lastUpdated
 */
function getWiFiConfig() {
	try {
		const data = fs.readFileSync(configPath, 'utf8');
		const parsed = JSON.parse(data);

		// Migration: decrypt passwordEncrypted if present
		if (parsed.passwordEncrypted && typeof parsed.passwordEncrypted === 'object') {
			const decrypted = decryptApiToken(parsed.passwordEncrypted);
			parsed.password = decrypted || '';

			// Migrate on read: remove legacy plaintext if still present
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
		// Return default config from environment variables if file doesn't exist
		return {
			ssid: config.wifiDefaults.ssid,
			password: config.wifiDefaults.password,
			lastUpdated: null
		};
	}
}

/**
 * Read Logo configuration from file or return defaults
 * @returns {Object} Logo configuration with logoDarkUrl, logoLightUrl, and lastUpdated
 */
function getLogoConfig() {
	try {
		const data = fs.readFileSync(logoConfigPath, 'utf8');
		return JSON.parse(data);
	} catch (err) {
		// Return default config from environment variables if file doesn't exist
		return {
			logoDarkUrl: config.logoDefaults.logoDarkUrl,
			logoLightUrl: config.logoDefaults.logoLightUrl,
			lastUpdated: null
		};
	}
}

/**
 * Read Information configuration from file or return defaults
 * @returns {Object} Information configuration with display settings and lastUpdated
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

	// Return default config from environment variables if file doesn't exist
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
 * Read Booking configuration from file or return defaults
 * @returns {Object} Booking configuration with enableBooking, buttonColor, and lastUpdated
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
		// Return default config from environment variables if file doesn't exist
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
 * Read maintenance configuration from file or return defaults
 * @returns {Object} Maintenance configuration with enabled, message and lastUpdated
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

function toMinInt(value, fallback, min) {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}
	return Math.max(parsed, min);
}


function getOAuthEncryptionKey(tokenOverride) {
	const keyMaterial = normalizeApiTokenValue(tokenOverride) || getEffectiveApiToken();
	if (!keyMaterial) {
		return null;
	}

	return crypto.createHash('sha256').update(keyMaterial).digest();
}

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

function isPlaceholderApiTokenValue(value) {
	const normalized = String(value || '').trim().toLowerCase();
	return normalized === 'your-secure-token-here' || normalized === 'api_token_not_set';
}

function isApiTokenEnvLocked() {
	return !!INITIAL_API_TOKEN_ENV_VALUE;
}

function isWifiApiTokenEnvLocked() {
	return !!INITIAL_WIFI_API_TOKEN_ENV_VALUE;
}

function isSystemEnvLocked() {
	return INITIAL_SYSTEM_ENV_LOCKED;
}

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

function getEffectiveApiToken() {
	return getApiTokenRuntimeConfig().token;
}

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

function getEffectiveWifiApiToken() {
	return getWifiApiTokenRuntimeConfig().token;
}

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

function clearStoredOAuthClientSecret() {
	const rawOauthConfig = readRawOAuthConfig();
	if (!rawOauthConfig || !rawOauthConfig.clientSecretEncrypted) {
		return;
	}

	delete rawOauthConfig.clientSecretEncrypted;
	rawOauthConfig.lastUpdated = rawOauthConfig.lastUpdated || new Date().toISOString();
	fs.writeFileSync(oauthConfigPath, JSON.stringify(rawOauthConfig, null, 2));
}

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

function readRawOAuthConfig() {
	try {
		const data = fs.readFileSync(oauthConfigPath, 'utf8');
		return JSON.parse(data);
	} catch (err) {
		return null;
	}
}

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

function authorityFromTenantId(tenantId) {
	const normalizedTenant = String(tenantId || '').trim();
	if (!normalizedTenant) {
		return '';
	}
	return `https://login.microsoftonline.com/${normalizedTenant}`;
}

function normalizeOAuthAuthorityInput(value) {
	const tenantId = extractTenantIdFromAuthority(value);
	if (!tenantId) {
		return '';
	}
	return authorityFromTenantId(tenantId);
}

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
		displayIpWhitelist: parseWebhookIps(source.displayIpWhitelist, Array.isArray(fallback.displayIpWhitelist) ? fallback.displayIpWhitelist : [])
	};
}

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
		displayIpWhitelist: []
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

function getSystemConfig() {
	const runtimeConfig = getSystemRuntimeConfig();
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
		lastUpdated: runtimeConfig.lastUpdated
	};
}

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

function saveSystemConfig(systemConfig) {
	let existingRaw = {};
	try {
		const data = fs.readFileSync(systemConfigPath, 'utf8');
		existingRaw = JSON.parse(data);
	} catch (err) {
		// File doesn't exist or is invalid, use defaults
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
			displayIpWhitelist: []
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
		lastUpdated: configData.lastUpdated
	};
}

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
 * Read i18n configuration from file or return defaults
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
 * Read Colors configuration from file or return defaults
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
 * Save WiFi configuration to file
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

	// Return plaintext for callers (e.g. QR code generation)
	return {
		ssid: configData.ssid,
		password: plainPassword,
		lastUpdated: configData.lastUpdated
	};
}

/**
 * Save Logo configuration to file
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
 * Save Information configuration to file
 * Preserves existing fields that are not being updated
 * @param {Object} config - Information configuration with display settings
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
 * Save Booking configuration to file
 * @param {Object} config - Booking configuration with enableBooking and buttonColor
 * @returns {Object} Saved configuration with timestamp
 */
function saveBookingConfig(config) {
	// Read existing config first to preserve fields not being updated
	let existingConfig = {};
	try {
		const data = fs.readFileSync(bookingConfigPath, 'utf8');
		existingConfig = JSON.parse(data);
	} catch (err) {
		// File doesn't exist or is invalid, use defaults
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
 * Save Maintenance configuration to file
 * @param {Object} maintenanceConfig - Maintenance configuration
 * @returns {Object} Saved configuration with timestamp
 */
function saveMaintenanceConfig(maintenanceConfig) {
	let existingConfig = {};
	try {
		const data = fs.readFileSync(maintenanceConfigPath, 'utf8');
		existingConfig = JSON.parse(data);
	} catch (err) {
		// File doesn't exist or is invalid, use defaults
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
 * Save i18n configuration to file
 * @param {Object} i18nConfig - i18n configuration payload
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
 * Save Colors configuration to file
 * @param {Object} config - Colors configuration with bookingButtonColor and status colors
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

function saveSearchConfig(searchConfig) {
	let existingConfig = {};
	try {
		const data = fs.readFileSync(searchConfigPath, 'utf8');
		existingConfig = JSON.parse(data);
	} catch (err) {
		// File doesn't exist or is invalid, use defaults
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

function saveRateLimitConfig(rateLimitConfig) {
	let existingConfig = {};
	try {
		const data = fs.readFileSync(rateLimitConfigPath, 'utf8');
		existingConfig = JSON.parse(data);
	} catch (err) {
		// File doesn't exist or is invalid, use defaults
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
 * Generate WiFi QR code image
 * Creates a QR code in standard WiFi format: WIFI:T:WPA;S:<SSID>;P:<PASSWORD>;H:false;;
 * @param {string} ssid - WiFi network name
 * @param {string} password - WiFi password
 * @returns {Promise<boolean>} True if successful, false otherwise
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
 * Update WiFi configuration and regenerate QR code
 * Broadcasts update to all connected clients via Socket.IO
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
 * Update Logo configuration
 * Broadcasts update to all connected clients via Socket.IO
 * @param {string} logoDarkUrl - URL for dark logo (light backgrounds)
 * @param {string} logoLightUrl - URL for light logo (dark backgrounds)
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
 * Update Information configuration
 * Broadcasts update to all connected clients via Socket.IO
 * @param {boolean} showWiFi - Whether to show WiFi section
 * @param {boolean} showUpcomingMeetings - Whether to show upcoming meetings
 * @param {boolean} showMeetingTitles - Whether to show meeting titles
 * @param {string} minimalHeaderStyle - Header style for minimal display ('filled' or 'transparent')
	* @param {number} upcomingMeetingsCount - Number of upcoming meetings to display
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
 * Update Booking configuration
 * Broadcasts update to all connected clients via Socket.IO
 * @param {boolean} enableBooking - Whether to enable booking feature
 * @param {string} buttonColor - Hex color for booking buttons
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
 * Update maintenance configuration
 * Broadcasts update to all connected clients via Socket.IO
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
 * Update i18n configuration
 * Broadcasts update to all connected clients via Socket.IO
 * @param {Object} i18nConfig - i18n configuration payload
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
 * Update Colors configuration
 * Broadcasts update to all connected clients via Socket.IO
 * @param {string} bookingButtonColor - Hex color for booking buttons
 * @param {string} statusAvailableColor - Hex color for available status
 * @param {string} statusBusyColor - Hex color for busy status
 * @param {string} statusUpcomingColor - Hex color for upcoming status
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

async function updateTranslationApiConfig(translationApiConfig) {
	const savedConfig = saveTranslationApiConfig(translationApiConfig || {});

	if (io) {
		io.of('/').emit('translationApiConfigUpdated', savedConfig);
		console.log('Translation API config updated, notified all clients via Socket.IO');
	}

	return savedConfig;
}

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
 * Get power management configuration
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
		
		// Ensure global config exists (for backward compatibility)
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
 * Update power management configuration for a specific display
 * @param {string} clientId - Display client ID
 * @param {object} config - Power management configuration
 * @param {string} config.mode - 'dpms', 'browser', or 'mqtt'
 * @param {string} config.mqttHostname - Touchkio hostname (required for mqtt mode)
 * @param {object} config.schedule - Schedule configuration
 * @param {string} config.schedule.startTime - Start time (HH:MM)
 * @param {string} config.schedule.endTime - End time (HH:MM)
 * @param {boolean} config.schedule.weekendMode - Enable weekend mode
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
		
		// Add MQTT hostname if mode is mqtt
		if (displayConfig.mode === 'mqtt' && displayConfig.mqttHostname) {
			updatedConfig.mqttHostname = displayConfig.mqttHostname;
		}
		
		config.displays[clientId] = updatedConfig;
		config.lastUpdated = new Date().toISOString();
		
		fs.writeFileSync(powerManagementConfigPath, JSON.stringify(config, null, 2));
		
		// Broadcast update to specific display
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
 * Update global power management configuration (default for all displays)
 * @param {object} globalConfig - Global power management configuration
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
		
		// Add MQTT hostname if mode is mqtt
		if (globalConfig.mode === 'mqtt' && globalConfig.mqttHostname) {
			updatedGlobal.mqttHostname = globalConfig.mqttHostname;
		}
		
		config.global = updatedGlobal;
		config.lastUpdated = new Date().toISOString();
		
		fs.writeFileSync(powerManagementConfigPath, JSON.stringify(config, null, 2));
		
		// Broadcast update to all displays that don't have specific config
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
 * Get power management configuration for a specific display
 * Falls back to global config if no display-specific config exists
 */
function getPowerManagementConfigForDisplay(clientId) {
	const config = getPowerManagementConfig();
	
	// Return display-specific config if it exists
	if (config.displays[clientId]) {
		return config.displays[clientId];
	}
	
	// Fall back to global config
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
 * Delete power management configuration for a specific display
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


// MQTT Configuration Path
const mqttConfigPath = path.join(__dirname, '../data/mqtt-config.json');

/**
 * Get MQTT configuration
 */
function getMqttConfig() {
	try {
		const data = fs.readFileSync(mqttConfigPath, 'utf8');
		const parsed = JSON.parse(data);

		// Migration: decrypt passwordEncrypted if present
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
		// Return default config if file doesn't exist
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
 * Update MQTT configuration
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

		// Return plaintext for callers (mqtt-client needs it)
		const configResult = {
			enabled: configToStore.enabled,
			brokerUrl: configToStore.brokerUrl,
			authentication: configToStore.authentication,
			username: configToStore.username,
			password: plainPassword,
			discovery: configToStore.discovery,
			lastUpdated: configToStore.lastUpdated
		};

		// Broadcast update via Socket.IO (without password)
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
