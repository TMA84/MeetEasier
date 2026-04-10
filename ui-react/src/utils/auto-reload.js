/**
 * @file auto-reload.js
 * @description Schedules a daily page reload at a configured time to prevent
 * memory accumulation in long-running browser-based displays.
 */

let reloadTimer = null;

/**
 * Calculates milliseconds until the next occurrence of the given HH:MM time.
 * @param {string} timeStr - Time in "HH:MM" format
 * @returns {number} Milliseconds until next occurrence
 */
function msUntilTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);

  // If the target time already passed today, schedule for tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - now.getTime();
}

/**
 * Starts the auto-reload scheduler. Reloads the page once daily at the given time.
 * Clears any previously scheduled reload.
 * @param {string} time - Time in "HH:MM" format (e.g. "03:00")
 */
export function startAutoReload(time) {
  stopAutoReload();

  if (!/^\d{2}:\d{2}$/.test(time)) {
    console.warn('[AutoReload] Invalid time format:', time);
    return;
  }

  const scheduleNext = () => {
    const delay = msUntilTime(time);
    console.log(`[AutoReload] Scheduled page reload at ${time} (in ${Math.round(delay / 60000)} min)`);

    reloadTimer = setTimeout(() => {
      console.log('[AutoReload] Reloading page now');
      window.location.reload();
    }, delay);
  };

  scheduleNext();
}

/**
 * Stops any scheduled auto-reload.
 */
export function stopAutoReload() {
  if (reloadTimer) {
    clearTimeout(reloadTimer);
    reloadTimer = null;
  }
}

/**
 * Applies auto-reload settings from sidebar config.
 * @param {{ autoReloadEnabled: boolean, autoReloadTime: string }} config
 */
export function applyAutoReload(config) {
  if (config.autoReloadEnabled && config.autoReloadTime) {
    startAutoReload(config.autoReloadTime);
  } else {
    stopAutoReload();
  }
}
