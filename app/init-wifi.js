/**
* @file WiFi Initialization – Load configuration and generate QR code.
*
* Reads the current WiFi configuration via the Config Manager and
* generates a QR code for easy mobile device connection when an SSID
* is present. Can also be run as a standalone script.
*
* @module init-wifi
*/

// Initialize WiFi configuration and generate initial QR code
const configManager = require('./config-manager');

/**
* Initializes the WiFi configuration and generates the QR code.
*
* Reads the WiFi settings (SSID, password) from the Config Manager.
* If an SSID is configured, a QR code is generated. Otherwise,
* a warning is displayed that the configuration is still missing.
*
* @async
* @returns {Promise<void>}
*/
async function initWiFi() {
  try {
    const config = configManager.getWiFiConfig();
    console.log('Current WiFi config:', config);
    
    // Generate QR code with current configuration
    if (config.ssid) {
      await configManager.generateQRCode(config.ssid, config.password || '');
      console.log('✓ WiFi QR code generated successfully');
    } else {
      console.log('⚠ No WiFi SSID configured. Please update via /api/wifi or admin panel');
    }
  } catch (err) {
    console.error('Error initializing WiFi:', err);
  }
}

// Allow direct execution as a standalone script
if (require.main === module) {
  initWiFi();
}

/**
* Initializes WiFi configuration on startup.
* @returns {void}
*/
module.exports = initWiFi;
