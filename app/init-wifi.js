// Initialize WiFi configuration and generate initial QR code
const wifiManager = require('./wifi-manager');

async function initWiFi() {
	try {
		const config = wifiManager.getWiFiConfig();
		console.log('Current WiFi config:', config);
		
		// Generate QR code with current config
		if (config.ssid) {
			await wifiManager.generateQRCode(config.ssid, config.password || '');
			console.log('✓ WiFi QR code generated successfully');
		} else {
			console.log('⚠ No WiFi SSID configured. Please update via /api/wifi or wifi-admin.html');
		}
	} catch (err) {
		console.error('Error initializing WiFi:', err);
	}
}

// Run if called directly
if (require.main === module) {
	initWiFi();
}

module.exports = initWiFi;
