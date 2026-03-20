/**
 * @file displayTranslations.js
 * @description Display-facing translation strings and i18n helpers. Provides
 * locale-aware text for single-room displays, flightboard views, booking modals,
 * meeting action modals, WiFi info panels, and check-in UI. Supports runtime
 * overrides via admin translation configuration.
 */

import { getAdminTranslations } from './adminTranslations.js';

let adminTranslationOverrides = {};

const getText = (key, fallback) => {
  const translations = getAdminTranslations(adminTranslationOverrides);
  const value = translations[key];
  return value !== undefined && value !== null && String(value).length > 0
    ? String(value)
    : fallback;
};

export const applyDisplayI18nConfig = (i18nConfig) => {
  if (i18nConfig && typeof i18nConfig === 'object' && i18nConfig.adminTranslations && typeof i18nConfig.adminTranslations === 'object') {
    adminTranslationOverrides = i18nConfig.adminTranslations;
  }
  return adminTranslationOverrides;
};

export const getSingleRoomDisplayTranslations = () => ({
  nextUp: getText('displayNextUpLabel', 'Next up'),
  currentMeeting: getText('displayCurrentMeetingLabel', 'Current Meeting'),
  statusAvailable: getText('displayStatusAvailableLabel', 'Available'),
  statusBusy: getText('displayStatusBusyLabel', 'Busy'),
  statusNotFound: getText('displayStatusNotFoundLabel', 'N/A'),
  upcomingTitle: getText('displayUpcomingTitleLabel', 'Next Meeting'),
  upcomingMeetingsTitle: getText('displayUpcomingMeetingsTitleLabel', 'Upcoming Meetings'),
  noUpcomingMeetings: getText('displayNoUpcomingMeetingsLabel', 'No upcoming meetings'),
  privateMeeting: getText('displayPrivateMeetingLabel', 'Private'),
  bookButtonText: getText('displayBookRoomButtonLabel', 'Book This Room'),
  extendButtonText: getText('displayExtendMeetingButtonLabel', 'Extend Meeting'),
  extendDisabledTitle: getText('displayExtendMeetingDisabledLabel', 'Meeting cannot be extended: next meeting starts too soon.'),
  errorTitle: getText('displayErrorTitleLabel', 'Error'),
  errorOccurred: getText('displayErrorOccurredLabel', 'An error occurred'),
  timeNotAvailable: getText('displayTimeNotAvailableLabel', 'Time not available'),
  noSubject: getText('displayNoSubjectLabel', 'No Subject'),
  noOrganizer: getText('displayNoOrganizerLabel', 'No Organizer'),
  wifiTitle: getText('displayWifiTitleLabel', 'WiFi')
});

export const getFlightboardDisplayTranslations = () => ({
  board: {
    nextUp: getText('displayNextUpLabel', 'Next up'),
    statusAvailable: getText('displayStatusAvailableLabel', 'Available'),
    statusBusy: getText('displayStatusBusyLabel', 'Busy'),
    statusUpcoming: getText('displayStatusUpcomingLabel', 'Upcoming'),
    statusError: getText('displayStatusErrorLabel', 'Error'),
    seats: getText('displaySeatsLabel', 'Seats'),
    noMeeting: getText('displayNoMeetingDaysLabel', 'No meetings in the next 7 days')
  },
  navbar: {
    title: getText('displayNavbarTitleLabel', 'Conference Rooms')
  },
  roomFilter: {
    filterTitle: getText('displayFilterTitleLabel', ''),
    filterAllTitle: getText('displayFilterAllRoomsLabel', 'All Conference Rooms'),
    filterDefault: getText('displayFilterDefaultLabel', '')
  }
});

export const getMeetingActionModalTranslations = () => ({
  title: getText('displayMeetingModalTitleLabel', 'Manage Meeting'),
  extendBy: getText('displayMeetingModalExtendByLabel', 'Extend by:'),
  custom: getText('displayMeetingModalCustomLabel', 'Custom'),
  minutes: getText('displayMeetingModalMinutesLabel', 'min'),
  cancel: getText('displayMeetingModalCancelLabel', 'Cancel'),
  extend: getText('displayMeetingModalExtendButtonLabel', 'Extend Meeting'),
  extending: getText('displayMeetingModalExtendingLabel', 'Extending...'),
  endNow: getText('displayMeetingModalEndButtonLabel', 'End Meeting'),
  ending: getText('displayMeetingModalEndingLabel', 'Ending...'),
  noActiveMeeting: getText('displayMeetingModalNoActiveExtendLabel', 'No active meeting to extend.'),
  noActiveMeetingEnd: getText('displayMeetingModalNoActiveEndLabel', 'No active meeting to end.'),
  genericError: getText('displayMeetingModalExtendErrorLabel', 'Failed to extend meeting. Please try again.'),
  endGenericError: getText('displayMeetingModalEndErrorLabel', 'Failed to end meeting. Please try again.'),
  ipNotWhitelistedError: getText('displayIpNotWhitelistedErrorLabel', 'Your device is not authorized. Please contact your administrator.'),
  originNotAllowedError: getText('displayOriginNotAllowedErrorLabel', 'This action is only available from authorized devices.'),
  bookingDisabledError: getText('displayBookingDisabledErrorLabel', 'Booking is currently disabled for this room.')
});

export const getBookingModalTranslations = () => ({
  title: getText('displayBookingModalTitleLabel', 'Book Room'),
  quickBook: getText('displayBookingModalQuickBookLabel', 'Quick Book:'),
  custom: getText('displayBookingModalCustomLabel', 'Custom'),
  date: getText('displayBookingModalDateLabel', 'Date:'),
  startTime: getText('displayBookingModalStartTimeLabel', 'Start Time:'),
  duration: getText('displayBookingModalDurationLabel', 'Duration:'),
  endTime: getText('displayBookingModalEndTimeLabel', 'End Time:'),
  today: getText('displayBookingModalTodayLabel', 'Today'),
  tomorrow: getText('displayBookingModalTomorrowLabel', 'Tomorrow'),
  minutes: getText('displayBookingModalMinutesLabel', 'min'),
  hours: getText('displayBookingModalHoursLabel', 'hours'),
  cancel: getText('displayBookingModalCancelLabel', 'Cancel'),
  bookRoom: getText('displayBookingModalBookButtonLabel', 'Book Room'),
  booking: getText('displayBookingModalBookingLabel', 'Booking...'),
  defaultSubject: getText('displayBookingModalDefaultSubjectLabel', 'Meeting'),
  conflictError: getText('displayBookingModalConflictErrorLabel', 'This room is already booked during the selected time. Please choose a different time.'),
  genericError: getText('displayBookingModalGenericErrorLabel', 'Failed to book room. Please try again.'),
  ipNotWhitelistedError: getText('displayIpNotWhitelistedErrorLabel', 'Your device is not authorized. Please contact your administrator.'),
  originNotAllowedError: getText('displayOriginNotAllowedErrorLabel', 'This action is only available from authorized devices.'),
  bookingDisabledError: getText('displayBookingDisabledErrorLabel', 'Booking is currently disabled for this room.')
});

export const getWiFiInfoTranslations = () => ({
  title: getText('displayWifiInfoTitleLabel', 'WiFi Information'),
  ssidLabel: getText('displayWifiInfoSsidLabel', 'SSID:'),
  passwordLabel: getText('displayWifiInfoPasswordLabel', 'Password:'),
  loading: getText('displayWifiInfoLoadingLabel', 'Loading WiFi information...'),
  errorPrefix: getText('displayWifiInfoErrorPrefixLabel', 'Error loading WiFi information:')
});

export const getCheckInTranslations = () => ({
  checkInButton: getText('displayCheckInButtonLabel', 'Check-in'),
  checkInExpiredTitle: getText('displayCheckInExpiredTitleLabel', 'Check-in window expired'),
  checkInTooEarlyTitle: getText('displayCheckInTooEarlyTitleLabel', 'Check-in available {minutes} minutes before start'),
  checkInCompleted: getText('displayCheckInCompletedLabel', 'Checked in'),
  checkInFailed: getText('displayCheckInFailedLabel', 'Check-in failed')
});

export default {
  applyDisplayI18nConfig,
  getSingleRoomDisplayTranslations,
  getFlightboardDisplayTranslations,
  getMeetingActionModalTranslations,
  getBookingModalTranslations,
  getWiFiInfoTranslations,
  getCheckInTranslations
};