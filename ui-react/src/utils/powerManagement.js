/**
 * @file powerManagement.js
 * @description Handles display power management for browser-based displays.
 * Supports time-based scheduling to turn the display on/off via a black overlay,
 * weekend mode, and Wake Lock API integration. Acts as a browser-level fallback
 * even when DPMS mode is configured on Raspberry Pi hardware.
 */

class PowerManagement {
  constructor(clientId) {
    this.clientId = clientId;
    this.config = null;
    this.checkInterval = null;
    this.isDisplayOff = false;
    this.overlayElement = null;
    this.wakeLock = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      console.log('[PowerManagement] Already initialized, skipping');
      return;
    }

    try {
      // Fetch power management config for this display
      console.log('[PowerManagement] Fetching config for client:', this.clientId);
      const response = await fetch(`/api/power-management/${encodeURIComponent(this.clientId)}`);
      
      if (!response.ok) {
        console.error('[PowerManagement] Failed to fetch config:', response.status);
        return;
      }
      
      this.config = await response.json();
      
      console.log('[PowerManagement] Config received:', JSON.stringify(this.config, null, 2));

      // Initialize browser-based power management
      // This works as a fallback even if DPMS mode is configured
      // (DPMS script will override if running on Raspberry Pi)
      if (this.config.schedule?.enabled) {
        console.log('[PowerManagement] Schedule is enabled, initializing...');
        console.log('[PowerManagement] Mode:', this.config.mode, '(browser will act as fallback for DPMS)');
        console.log('[PowerManagement] Schedule:', this.config.schedule);
        this.startScheduleCheck();
        this.requestWakeLock();
        this.initialized = true;
      } else {
        console.log('[PowerManagement] Schedule is NOT enabled, skipping initialization');
      }
    } catch (error) {
      console.error('[PowerManagement] Failed to initialize:', error);
    }
  }

  startScheduleCheck() {
    // Check every minute
    this.checkInterval = setInterval(() => {
      this.checkSchedule();
    }, 60000);

    // Check immediately
    this.checkSchedule();
  }

  checkSchedule() {
    if (!this.config?.schedule?.enabled) {
      console.log('[PowerManagement] checkSchedule: Schedule not enabled');
      return;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = currentDay === 0 || currentDay === 6;

    const { startTime, endTime, weekendMode } = this.config.schedule;
    
    console.log('[PowerManagement] checkSchedule:', {
      currentTime,
      startTime,
      endTime,
      isWeekend,
      weekendMode,
      isDisplayOff: this.isDisplayOff
    });

    // Weekend mode: turn off all weekend
    if (weekendMode && isWeekend) {
      console.log('[PowerManagement] Weekend mode active, turning off');
      this.turnDisplayOff();
      return;
    }

    // Check if current time is within off period
    const shouldBeOff = this.isTimeInRange(currentTime, startTime, endTime);
    
    console.log('[PowerManagement] shouldBeOff:', shouldBeOff);

    if (shouldBeOff && !this.isDisplayOff) {
      console.log('[PowerManagement] Time to turn off!');
      this.turnDisplayOff();
    } else if (!shouldBeOff && this.isDisplayOff) {
      console.log('[PowerManagement] Time to turn on!');
      this.turnDisplayOn();
    } else {
      console.log('[PowerManagement] No action needed');
    }
  }

  isTimeInRange(currentTime, startTime, endTime) {
    // Handle overnight ranges (e.g., 20:00 to 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }
    // Handle same-day ranges (e.g., 12:00 to 14:00)
    return currentTime >= startTime && currentTime < endTime;
  }

  turnDisplayOff() {
    if (this.isDisplayOff) return;

    console.log('[PowerManagement] Turning display off');
    this.isDisplayOff = true;

    // Create black overlay
    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'power-management-overlay';
    this.overlayElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #000;
      z-index: 999999;
      cursor: pointer;
    `;

    // Add click handler to wake up
    this.overlayElement.addEventListener('click', () => {
      this.turnDisplayOn();
    });

    document.body.appendChild(this.overlayElement);
  }

  turnDisplayOn() {
    if (!this.isDisplayOff) return;

    console.log('[PowerManagement] Turning display on');
    this.isDisplayOff = false;

    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
  }

  async requestWakeLock() {
    // Request wake lock to prevent display from sleeping
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('[PowerManagement] Wake lock acquired');

        this.wakeLock.addEventListener('release', () => {
          console.log('[PowerManagement] Wake lock released');
        });
      } catch (error) {
        console.error('[PowerManagement] Wake lock request failed:', error);
      }
    }
  }

  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    if (this.overlayElement) {
      this.overlayElement.remove();
    }

    if (this.wakeLock) {
      this.wakeLock.release();
    }
    
    this.initialized = false;
  }
}

// Create singleton instance
let powerManagementInstance = null;

export function initPowerManagement(clientId) {
  if (!clientId) {
    console.warn('[PowerManagement] No client ID provided, skipping initialization');
    return null;
  }

  // If we already have an instance with a different client ID, destroy it first
  if (powerManagementInstance && powerManagementInstance.clientId !== clientId) {
    console.log('[PowerManagement] Client ID changed, reinitializing');
    powerManagementInstance.destroy();
    powerManagementInstance = null;
  }

  if (!powerManagementInstance) {
    powerManagementInstance = new PowerManagement(clientId);
    powerManagementInstance.init();
  }
  
  return powerManagementInstance;
}

export function getPowerManagement() {
  return powerManagementInstance;
}

export default PowerManagement;
