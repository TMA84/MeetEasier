// Detect browser language
function getLanguage() {
  const browserLang = navigator.language || navigator.userLanguage;
  const lang = browserLang.split('-')[0]; // Get 'de' from 'de-DE'
  return ['de', 'en'].includes(lang) ? lang : 'en'; // Default to English if language not supported
}

const translations = {
  de: {
    nextUp: 'Als nächstes',
    currentMeeting: 'Aktueller Termin',
    statusAvailable: 'Frei',
    statusBusy: 'Belegt',
    upcomingTitle: 'Nächster Termin',
    upcomingMeetingsTitle: 'Anstehende Termine',
    noUpcomingMeetings: 'Keine anstehenden Termine',
    privateMeeting: 'Privat',
    SSID: 'SY-GUEST/vSTI-GUEST',
    SSIDKEY: 'f3VrMMxM3sCq',
  },
  en: {
    nextUp: 'Next up',
    currentMeeting: 'Current Meeting',
    statusAvailable: 'Available',
    statusBusy: 'Busy',
    upcomingTitle: 'Next Meeting',
    upcomingMeetingsTitle: 'Upcoming Meetings',
    noUpcomingMeetings: 'No upcoming meetings',
    privateMeeting: 'Private',
    SSID: 'SY-GUEST/vSTI-GUEST',
    SSIDKEY: 'f3VrMMxM3sCq',
  }
};

const lang = getLanguage();
export default translations[lang];
