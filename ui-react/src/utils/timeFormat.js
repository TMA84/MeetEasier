// Time formatting utilities with locale support

// Get browser locale
export function getLocale() {
  return navigator.language || navigator.userLanguage || 'en-US';
}

// Determine if locale uses 12-hour format
export function uses12HourFormat() {
  const locale = getLocale();
  // US, Canada, UK, Australia, etc. use 12-hour format
  const hour12Locales = ['en-US', 'en-CA', 'en-AU', 'en-NZ', 'en-PH'];
  return hour12Locales.some(l => locale.startsWith(l.split('-')[0])) && 
         !locale.startsWith('en-GB'); // UK uses 24-hour
}

// Format time with locale-aware hour format
export function formatTime(date, options = {}) {
  const locale = getLocale();
  const hour12 = uses12HourFormat();
  
  return date.toLocaleTimeString(locale, {
    hour12: hour12,
    ...options
  });
}

// Format time range
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
