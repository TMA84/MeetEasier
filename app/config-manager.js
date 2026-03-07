const fs = require('fs');
const path = require('path');
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
const qrPath = path.join(__dirname, '../static/img/wifi-qr.png');

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

function normalizeSearchConfig(searchConfig) {
	const defaults = config.calendarSearch || {};
	const source = searchConfig && typeof searchConfig === 'object' && !Array.isArray(searchConfig)
		? searchConfig
		: {};

	const fallbackUseGraphAPI = toBoolean(defaults.useGraphAPI, true);
	const fallbackMaxDays = toMinInt(defaults.maxDays, 7, 1);
	const fallbackMaxRoomLists = toMinInt(defaults.maxRoomLists, 5, 1);
	const fallbackMaxRooms = toMinInt(defaults.maxRooms, 50, 1);
	const fallbackMaxItems = toMinInt(defaults.maxItems, 100, 1);
	const fallbackPollInterval = toMinInt(defaults.pollIntervalMs, 15000, 5000);

	return {
		useGraphAPI: toBoolean(source.useGraphAPI, fallbackUseGraphAPI),
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

function normalizeI18nConfig(rawConfig) {
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
		maintenanceMessages: {
			...defaults.maintenanceMessages,
			...normalizedMessages
		},
		adminTranslations: {
			...defaults.adminTranslations,
			...normalizedAdminTranslations
		},
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
		return normalizeI18nConfig(JSON.parse(data));
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
	const normalizedIncoming = normalizeI18nConfig(i18nConfig);
	const mergedAdminTranslations = { ...existingConfig.adminTranslations };

	for (const [langKey, value] of Object.entries(normalizedIncoming.adminTranslations || {})) {
		mergedAdminTranslations[langKey] = {
			...(mergedAdminTranslations[langKey] || {}),
			...value
		};
	}

	const configData = {
		maintenanceMessages: {
			...existingConfig.maintenanceMessages,
			...normalizedIncoming.maintenanceMessages
		},
		adminTranslations: mergedAdminTranslations,
		lastUpdated: new Date().toISOString()
	};

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

function applyRuntimeConfigOverrides() {
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
}

applyRuntimeConfigOverrides();

module.exports = {
	setSocketIO,
	getWiFiConfig,
	getLogoConfig,
	getSidebarConfig,
	getBookingConfig,
	getSearchConfig,
	getRateLimitConfig,
	getColorsConfig,
	getMaintenanceConfig,
	getI18nConfig,
	updateWiFiConfig,
	updateLogoConfig,
	updateSidebarConfig,
	updateBookingConfig,
	updateSearchConfig,
	updateRateLimitConfig,
	updateColorsConfig,
	updateMaintenanceConfig,
	updateI18nConfig,
	generateQRCode
};
