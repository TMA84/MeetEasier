/**
 * Power Management Utility
 * Handles display power management for browser-based displays
 * Supports time-based scheduling for turning display on/off
 */

class PowerManagement {
  constructor(clientId) {
    this.clientId = clientId;
    this.config = null;
    this.checkInterval = null;
    this.isDisplayOff = false;
    this.overlayElement = null;
    this.wakeLock = null;
  }

  async init() {
    try {
      // Fetch power management config for this display
      const response = await fetch(`/api/power-management/${this.clientId}`);
      this.config = await response.json();

      // Only initialize if browser mode and schedule is enabled
      if (this.config.mode === 'browser' && this.config.schedule?.enabled) {
        this.startScheduleCheck();
        this.requestWakeLock();
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
      return;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = currentDay === 0 || currentDay === 6;

    const { startTime, endTime, weekendMode } = this.config.schedule;

    // Weekend mode: turn off all weekend
    if (weekendMode && isWeekend) {
      this.turnDisplayOff();
      return;
    }

    // Check if current time is within off period
    const shouldBeOff = this.isTimeInRange(currentTime, startTime, endTime);

    if (shouldBeOff && !this.isDisplayOff) {
      this.turnDisplayOff();
    } else if (!shouldBeOff && this.isDisplayOff) {
      this.turnDisplayOn();
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
  }
}

// Create singleton instance
let powerManagementInstance = null;

export function initPowerManagement(clientId) {
  if (!powerManagementInstance && clientId) {
    powerManagementInstance = new PowerManagement(clientId);
    powerManagementInstance.init();
  }
  return powerManagementInstance;
}

export function getPowerManagement() {
  return powerManagementInstance;
}

export default PowerManagement;
