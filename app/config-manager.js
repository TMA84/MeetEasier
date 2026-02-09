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
 * @returns {Object} Booking configuration with enableBooking and lastUpdated
 */
function getBookingConfig() {
	try {
		const data = fs.readFileSync(bookingConfigPath, 'utf8');
		return JSON.parse(data);
	} catch (err) {
		// Return default config from environment variables if file doesn't exist
		return {
			enableBooking: config.bookingDefaults.enableBooking,
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
 * @param {Object} config - Booking configuration with enableBooking
 * @returns {Object} Saved configuration with timestamp
 */
function saveBookingConfig(config) {
	const configData = {
		enableBooking: config.enableBooking !== undefined ? config.enableBooking : true,
		lastUpdated: new Date().toISOString()
	};
	
	fs.writeFileSync(bookingConfigPath, JSON.stringify(configData, null, 2));
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
 * @returns {Promise<Object>} Updated configuration
 */
async function updateBookingConfig(enableBooking) {
	const config = saveBookingConfig({ enableBooking });
	
	// Emit Socket.IO event to notify all connected clients
	if (io) {
		io.of('/').emit('bookingConfigUpdated', config);
		console.log('Booking config updated, notified all clients via Socket.IO');
	}
	
	return config;
}

module.exports = {
	setSocketIO,
	getWiFiConfig,
	getLogoConfig,
	getSidebarConfig,
	getBookingConfig,
	updateWiFiConfig,
	updateLogoConfig,
	updateSidebarConfig,
	updateBookingConfig,
	generateQRCode
};
