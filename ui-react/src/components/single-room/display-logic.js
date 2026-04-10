/**
 * @file display-logic.js
 * @description Pure business logic for the single-room Display component.
 *              No React dependency, no side effects — easy to test.
 */

/**
 * Returns the default initial state for the Display component.
 * @returns {Object} Default state
 */
export function getInitialState(alias) {
  return {
    response: false,
    roomAlias: alias,
    rooms: [],
    room: {},
    maintenanceConfig: {
      enabled: false,
      message: ''
    },
    i18nTick: 0,
    roomDetails: {
      appointmentExists: false,
      timesPresent: false,
      upcomingAppointments: false,
      nextUp: '',
      upcomingTitle: ''
    },
    sidebarConfig: {
      showMeetingTitles: false,
      singleRoomDarkMode: false,
      minimalHeaderStyle: 'filled'
    },
    bookingConfig: {
      enableBooking: true,
      enableExtendMeeting: false,
      extendMeetingUrlAllowlist: []
    },
    colorsConfig: {
      bookingButtonColor: '#334155',
      statusAvailableColor: '#22c55e',
      statusBusyColor: '#ef4444',
      statusUpcomingColor: '#f59e0b',
      statusNotFoundColor: '#6b7280'
    },
    showBookingModal: false,
    showExtendModal: false,
    showErrorModal: false,
    errorMessage: '',
    checkInStatus: {
      required: false,
      checkedIn: false,
      expired: false,
      loading: false,
      windowMinutes: 10
    }
  };
}

/**
 * Process room details and determine display state.
 * @param {Array} rooms - Array of room objects
 * @param {string} roomAlias - The alias to match
 * @param {Object} displayTranslations - Translation strings with nextUp, upcomingTitle
 * @returns {{ room: Object, roomDetails: Object }} Processed room and details
 */
export function processRoomDetails(rooms, roomAlias, displayTranslations) {
  const roomArray = rooms.filter(item => item.RoomAlias === roomAlias);
  const room = roomArray[0];

  if (!room) {
    return {
      room: { Name: '', Busy: true, NotFound: true, Appointments: [] },
      roomDetails: {
        appointmentExists: false,
        timesPresent: false,
        upcomingAppointments: false,
        nextUp: '',
        upcomingTitle: ''
      }
    };
  }

  const roomDetails = {
    appointmentExists: false,
    timesPresent: false,
    upcomingAppointments: false,
    nextUp: '',
    upcomingTitle: ''
  };

  if (typeof room.Appointments !== 'undefined' && room.Appointments.length > 0) {
    roomDetails.appointmentExists = true;

    if (room.Appointments.length > 1) {
      roomDetails.upcomingAppointments = true;
    }

    if (room.Appointments[0].Start && room.Appointments[0].End) {
      roomDetails.timesPresent = true;

      if (!room.Busy) {
        roomDetails.nextUp = `${displayTranslations.nextUp}: `;
      } else {
        roomDetails.nextUp = '';
        roomDetails.upcomingTitle = `${displayTranslations.upcomingTitle}: `;
      }
    }
  }

  return { room, roomDetails };
}

/**
 * Normalize sidebar config data from API or socket.
 * @param {Object} data - Raw sidebar config
 * @returns {Object} Normalized sidebar config
 */
export function normalizeSidebarConfig(data) {
  return {
    showMeetingTitles: data.showMeetingTitles !== undefined ? data.showMeetingTitles : false,
    singleRoomDarkMode: data.singleRoomDarkMode !== undefined ? data.singleRoomDarkMode : false,
    minimalHeaderStyle: data.minimalHeaderStyle === 'transparent' ? 'transparent' : 'filled',
    autoReloadEnabled: data.autoReloadEnabled !== undefined ? !!data.autoReloadEnabled : false,
    autoReloadTime: /^\d{2}:\d{2}$/.test(data.autoReloadTime) ? data.autoReloadTime : '03:00'
  };
}

/**
 * Normalize booking config data from API or socket.
 * @param {Object} data - Raw booking config
 * @returns {Object} Normalized booking config
 */
export function normalizeBookingConfig(data) {
  return {
    enableBooking: data.enableBooking !== undefined ? data.enableBooking : true,
    buttonColor: data.buttonColor || '#334155',
    enableExtendMeeting: data.enableExtendMeeting !== undefined ? data.enableExtendMeeting : false,
    extendMeetingUrlAllowlist: Array.isArray(data.extendMeetingUrlAllowlist) ? data.extendMeetingUrlAllowlist : []
  };
}

/**
 * Normalize colors config data from API or socket.
 * @param {Object} data - Raw colors config
 * @returns {Object} Normalized colors config
 */
export function normalizeColorsConfig(data) {
  return {
    bookingButtonColor: data.bookingButtonColor || '#334155',
    statusAvailableColor: data.statusAvailableColor || '#22c55e',
    statusBusyColor: data.statusBusyColor || '#ef4444',
    statusUpcomingColor: data.statusUpcomingColor || '#f59e0b',
    statusNotFoundColor: data.statusNotFoundColor || '#6b7280'
  };
}

/** @type {string} Default booking button color for light mode */
const DEFAULT_BUTTON_COLOR = '#334155';
/** @type {string} Lighter default for dark mode backgrounds */
const DEFAULT_BUTTON_COLOR_DARK = '#7d8da1';

/**
 * Resolves the effective booking button color, applying the dark mode
 * default when the configured color is the light-mode default.
 * @param {string} color - The configured button color
 * @param {boolean} [isDarkMode=false] - Whether dark mode is active
 * @returns {string} The effective button color
 */
export function resolveBookingButtonColor(color, isDarkMode = false) {
  const effective = color || DEFAULT_BUTTON_COLOR;
  return (isDarkMode && effective === DEFAULT_BUTTON_COLOR) ? DEFAULT_BUTTON_COLOR_DARK : effective;
}

/**
 * Returns a contrasting text color (dark or white) for a given hex background.
 * Uses relative luminance (WCAG formula) to decide.
 * @param {string} hex - Hex color string (e.g. "#94a3b8")
 * @returns {string} "#ffffff" or "#1e293b"
 */
export function contrastTextColor(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const toLinear = (v) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.4 ? '#1e293b' : '#ffffff';
}

/**
 * Apply colors config as CSS custom properties.
 * In dark mode, the default booking button color is replaced with a lighter
 * variant so the button remains visible against dark backgrounds.
 * @param {Object} colors - Normalized colors config
 * @param {boolean} [isDarkMode=false] - Whether dark mode is active
 */
export function applyColorsToCSS(colors, isDarkMode = false) {
  const btnColor = resolveBookingButtonColor(colors.bookingButtonColor, isDarkMode);
  document.documentElement.style.setProperty('--booking-button-color', btnColor);
  document.documentElement.style.setProperty('--booking-button-text', contrastTextColor(btnColor));
  document.documentElement.style.setProperty('--status-available-color', colors.statusAvailableColor);
  document.documentElement.style.setProperty('--status-busy-color', colors.statusBusyColor);
  document.documentElement.style.setProperty('--status-upcoming-color', colors.statusUpcomingColor);
  document.documentElement.style.setProperty('--status-not-found-color', colors.statusNotFoundColor);
}

/**
 * Normalize check-in status from API response.
 * @param {Object} status - Raw check-in status
 * @returns {Object} Normalized check-in status
 */
export function normalizeCheckInStatus(status) {
  return {
    required: !!status.required,
    checkedIn: !!status.checkedIn,
    expired: !!status.expired,
    tooEarly: !!status.tooEarly,
    canCheckInNow: !!status.canCheckInNow,
    loading: false,
    earlyCheckInMinutes: Number.isFinite(status.earlyCheckInMinutes) ? status.earlyCheckInMinutes : 5,
    windowMinutes: Number.isFinite(status.windowMinutes) ? status.windowMinutes : 10
  };
}

/**
 * Returns the default (empty) check-in status.
 * @returns {Object} Empty check-in status
 */
export function getEmptyCheckInStatus() {
  return {
    required: false,
    checkedIn: false,
    expired: false,
    tooEarly: false,
    canCheckInNow: false,
    loading: false,
    earlyCheckInMinutes: 5,
    windowMinutes: 10
  };
}

/**
 * Check if extending a meeting is allowed based on config and URL params.
 * @param {Object} bookingConfig - Booking configuration
 * @param {Location} [location] - Window location (defaults to window.location)
 * @returns {boolean}
 */
export function isExtendMeetingAllowed(bookingConfig, location) {
  const loc = location || window.location;
  const allowlist = bookingConfig.extendMeetingUrlAllowlist;

  if (!bookingConfig.enableExtendMeeting) {
    return false;
  }

  const params = new URLSearchParams(loc.search);
  const enabledByParam = params.get('extendbooking') === 'true';
  if (!enabledByParam) {
    return false;
  }

  if (!Array.isArray(allowlist) || allowlist.length === 0) {
    return true;
  }

  const currentUrl = loc.href;
  const currentPath = loc.pathname;

  return allowlist.some((entry) => {
    if (!entry) return false;
    if (entry.startsWith('/') && entry.endsWith('/') && entry.length > 2) {
      try {
        const regex = new RegExp(entry.slice(1, -1));
        return regex.test(currentUrl) || regex.test(currentPath);
      } catch (err) {
        console.warn('Invalid extendMeetingUrlAllowlist regex:', entry);
        return false;
      }
    }
    return currentUrl.includes(entry) || currentPath.includes(entry);
  });
}

/**
 * Check if extending is blocked because the next meeting starts too soon.
 * @param {Object} room - Room object
 * @returns {boolean}
 */
export function isExtendBlockedByOverbooking(room) {
  if (!room || !room.Busy || !Array.isArray(room.Appointments) || room.Appointments.length < 2) {
    return false;
  }

  const currentAppointmentEnd = Number(room.Appointments[0]?.End);
  const nextAppointmentStart = Number(room.Appointments[1]?.Start);

  if (!Number.isFinite(currentAppointmentEnd) || !Number.isFinite(nextAppointmentStart)) {
    return false;
  }

  const minimumExtendWindowMs = 5 * 60 * 1000;
  return (nextAppointmentStart - currentAppointmentEnd) < minimumExtendWindowMs;
}
