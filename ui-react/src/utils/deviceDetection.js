/**
 * @file deviceDetection.js
 * @description Device detection utilities for identifying Raspberry Pi hardware,
 * recommending power management modes, and generating device-type strings
 * for display tracking based on user agent and platform information.
 */

/**
 * Detect if the device is a Raspberry Pi
 * Checks user agent and platform information
 * @returns {boolean} True if device is likely a Raspberry Pi
 */
export function isRaspberryPi() {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';
  
  // Check for Raspberry Pi specific indicators
  if (userAgent.includes('raspberry') || userAgent.includes('raspbian')) {
    return true;
  }
  
  // Check for ARM architecture on Linux (common for RPi)
  if (platform.includes('linux') && (platform.includes('arm') || userAgent.includes('arm'))) {
    return true;
  }
  
  // Check for specific Chromium builds on RPi
  if (userAgent.includes('chromium') && platform.includes('linux')) {
    // Additional check: screen resolution typical for RPi displays
    const width = window.screen.width;
    const height = window.screen.height;
    
    // Common RPi display resolutions
    const commonRPiResolutions = [
      [800, 480],   // 7" touchscreen
      [1024, 600],  // 7" HDMI
      [1280, 720],  // HD
      [1920, 1080]  // Full HD
    ];
    
    const matchesResolution = commonRPiResolutions.some(
      ([w, h]) => (width === w && height === h) || (width === h && height === w)
    );
    
    if (matchesResolution) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get the recommended power management mode for this device
 * @returns {'dpms'|'browser'} Recommended power management mode
 */
export function getRecommendedPowerMode() {
  return isRaspberryPi() ? 'dpms' : 'browser';
}

/**
 * Get device type string for display tracking
 * @param {string} displayType - The display type (single-room, flightboard, etc.)
 * @returns {string} Device type string
 */
export function getDeviceTypeString(displayType) {
  const isRPi = isRaspberryPi();
  const baseType = displayType || 'unknown';
  
  if (isRPi) {
    return `${baseType}-rpi`;
  }
  
  // Detect browser type
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
    return `${baseType}-chrome`;
  }
  if (userAgent.includes('firefox')) {
    return `${baseType}-firefox`;
  }
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    return `${baseType}-safari`;
  }
  if (userAgent.includes('edg')) {
    return `${baseType}-edge`;
  }
  
  return `${baseType}-browser`;
}

/**
 * Get device information for debugging
 * @returns {object} Device information
 */
export function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    isRaspberryPi: isRaspberryPi(),
    recommendedPowerMode: getRecommendedPowerMode(),
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    devicePixelRatio: window.devicePixelRatio
  };
}
