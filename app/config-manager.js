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
			roomGroupFeatureFlags: normalizeRoomGroupFeatureFlags(parsed.roomGroupFeatureFlags)
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
async function updateBookingConfig(enableBooking, buttonColor, enableExtendMeeting, extendMeetingUrlAllowlist, roomFeatureFlags, roomGroupFeatureFlags) {
	const config = saveBookingConfig({
		enableBooking,
		buttonColor,
		enableExtendMeeting,
		extendMeetingUrlAllowlist,
		roomFeatureFlags,
		roomGroupFeatureFlags
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

module.exports = {
	setSocketIO,
	getWiFiConfig,
	getLogoConfig,
	getSidebarConfig,
	getBookingConfig,
	getColorsConfig,
	getMaintenanceConfig,
	getI18nConfig,
	updateWiFiConfig,
	updateLogoConfig,
	updateSidebarConfig,
	updateBookingConfig,
	updateColorsConfig,
	updateMaintenanceConfig,
	updateI18nConfig,
	generateQRCode
};
