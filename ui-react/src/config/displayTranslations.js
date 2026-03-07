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

export default {
  applyDisplayI18nConfig,
  getSingleRoomDisplayTranslations,
  getFlightboardDisplayTranslations
};