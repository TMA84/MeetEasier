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
const apiTokenEncryptionKeyPath = path.join(__dirname, '../data/.api-token-key');
const qrPath = path.join(__dirname, '../static/img/wifi-qr.png');

const OAUTH_SECRET_ALGO = 'aes-256-gcm';
const API_TOKEN_ENCRYPTION_ALGO = 'aes-256-gcm';
const API_TOKEN_ENCRYPTION_ENV = 'API_TOKEN_ENCRYPTION_KEY';
const DEFAULT_API_TOKEN = 'change-me-admin-token';
const INITIAL_API_TOKEN_ENV_VALUE = String(process.env.API_TOKEN || '').trim();
const INITIAL_WIFI_API_TOKEN_ENV_VALUE = String(process.env.WIFI_API_TOKEN || '').trim();
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
		return JSON.parse(data);
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
	try {
		const data = fs.readFileSync(sidebarConfigPath, 'utf8');
		return JSON.parse(data);
	} catch (err) {
		// Return default config from environment variables if file doesn't exist
		return {
			showWiFi: config.sidebarDefaults.showWiFi,
			showUpcomingMeetings: config.sidebarDefaults.showUpcomingMeetings,
			showMeetingTitles: config.sidebarDefaults.showMeetingTitles,
			minimalHeaderStyle: 'filled',
			lastUpdated: null
		};
	}
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
		token: DEFAULT_API_TOKEN,
		source: 'default',
		isDefault: true,
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

	if (!candidates.includes(DEFAULT_API_TOKEN)) {
		candidates.push(DEFAULT_API_TOKEN);
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

	return {
		startupValidationStrict: toBoolean(source.startupValidationStrict, toBoolean(fallback.startupValidationStrict, false)),
		graphWebhookEnabled: toBoolean(source.graphWebhookEnabled, toBoolean(fallback.graphWebhookEnabled, false)),
		graphWebhookClientState: source.graphWebhookClientState !== undefined
			? String(source.graphWebhookClientState || '').trim()
			: String(fallback.graphWebhookClientState || '').trim(),
		graphWebhookAllowedIps: parseWebhookIps(source.graphWebhookAllowedIps, fallbackWebhookIps)
	};
}

function getSystemRuntimeConfig() {
	const fallback = {
		startupValidationStrict: config.startupValidation?.strict === true,
		graphWebhookEnabled: config.graphWebhook?.enabled === true,
		graphWebhookClientState: config.graphWebhook?.clientState || '',
		graphWebhookAllowedIps: Array.isArray(config.graphWebhook?.allowedIps) ? config.graphWebhook.allowedIps : []
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

	return {
		apiWindowMs: toMinInt(source.apiWindowMs, fallbackApiWindowMs, 1000),
		apiMax: toMinInt(source.apiMax, fallbackApiMax, 1),
		writeWindowMs: toMinInt(source.writeWindowMs, fallbackWriteWindowMs, 1000),
		writeMax: toMinInt(source.writeMax, fallbackWriteMax, 1),
		authWindowMs: toMinInt(source.authWindowMs, fallbackAuthWindowMs, 1000),
		authMax: toMinInt(source.authMax, fallbackAuthMax, 1)
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
			graphWebhookAllowedIps: Array.isArray(config.graphWebhook?.allowedIps) ? config.graphWebhook.allowedIps : []
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
	const configData = {
		ssid: config.ssid || '',
		password: config.password || '',
		lastUpdated: new Date().toISOString()
	};
	
	fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
	return configData;
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
function saveSidebarConfig(config) {
	// Read existing config first to preserve all fields
	let existingConfig = {};
	try {
		const data = fs.readFileSync(sidebarConfigPath, 'utf8');
		existingConfig = JSON.parse(data);
	} catch (err) {
		// File doesn't exist or is invalid, use defaults
	}

	const configData = {
		showWiFi: config.showWiFi !== undefined ? config.showWiFi : (existingConfig.showWiFi !== undefined ? existingConfig.showWiFi : true),
		showUpcomingMeetings: config.showUpcomingMeetings !== undefined ? config.showUpcomingMeetings : (existingConfig.showUpcomingMeetings !== undefined ? existingConfig.showUpcomingMeetings : false),
		showMeetingTitles: config.showMeetingTitles !== undefined ? config.showMeetingTitles : (existingConfig.showMeetingTitles !== undefined ? existingConfig.showMeetingTitles : false),
		minimalHeaderStyle: config.minimalHeaderStyle !== undefined ? config.minimalHeaderStyle : (existingConfig.minimalHeaderStyle || 'filled'),
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
 * @returns {Promise<Object>} Updated configuration
 */
async function updateSidebarConfig(showWiFi, showUpcomingMeetings, showMeetingTitles, minimalHeaderStyle) {
	const config = saveSidebarConfig({ showWiFi, showUpcomingMeetings, showMeetingTitles, minimalHeaderStyle });
	
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

	const currentToken = runtimeConfig.token;
	if (currentToken !== normalizedNextToken) {
		migrateEncryptedOAuthSecretForTokenChange(currentToken, normalizedNextToken);
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

module.exports = {
	setSocketIO,
	getWiFiConfig,
	getLogoConfig,
	getSidebarConfig,
	getBookingConfig,
	getSystemConfig,
	getOAuthConfig,
	getApiTokenConfig,
	getEffectiveApiToken,
	getEffectiveWifiApiToken,
	isApiTokenEnvLocked,
	isWifiApiTokenEnvLocked,
	getSearchConfig,
	getRateLimitConfig,
	getTranslationApiRuntimeConfig,
	getTranslationApiConfig,
	getColorsConfig,
	getMaintenanceConfig,
	getI18nConfig,
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
	generateQRCode
};
