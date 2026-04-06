/**
* @file timeFormat.js
* @description Time formatting utilities with locale support. Provides helpers
* to detect the browser locale, determine 12-hour vs 24-hour clock preference,
* and format times and time ranges accordingly.
*/

/**
* Gets the browser locale string.
* @returns {string} Browser locale
*/
export function getLocale() {
  return navigator.language || navigator.userLanguage || 'en-US';
}

/**
* Determines if the current locale uses 12-hour time format.
* @returns {boolean} True if 12-hour format
*/
export function uses12HourFormat() {
  const locale = getLocale();
  // US, Canada, UK, Australia, etc. use 12-hour format
  const hour12Locales = ['en-US', 'en-CA', 'en-AU', 'en-NZ', 'en-PH'];
  return hour12Locales.some(l => locale.startsWith(l.split('-')[0])) &&
    !locale.startsWith('en-GB'); // UK uses 24-hour
}

/**
* Formats a Date object as a locale-aware time string.
* @param {Date} date - The date to format
* @param {Object} options - Additional Intl.DateTimeFormat options
* @returns {string} Formatted time string
*/
export function formatTime(date, options = {}) {
  const locale = getLocale();
  const hour12 = uses12HourFormat();
  
  return date.toLocaleTimeString(locale, {
    hour12: hour12,
    ...options
  });
}

/**
* Formats a time range between two dates.
* @param {Date} startDate - Range start
* @param {Date} endDate - Range end
* @param {boolean} includeWeekday - Whether to include weekday
* @returns {string} Formatted time range
*/
export function formatTimeRange(startDate, endDate, includeWeekday = false) {
  const locale = getLocale();
  const hour12 = uses12HourFormat();
  
  const startOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: hour12
  };
  
  if (includeWeekday) {
    startOptions.weekday = 'short';
  }
  
  const endOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: hour12
  };
  
  const start = startDate.toLocaleTimeString(locale, startOptions);
  const end = endDate.toLocaleTimeString(locale, endOptions);
  
  return `${start} - ${end}`;
}
