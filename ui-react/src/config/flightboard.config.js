// Detect browser language
function getLanguage() {
  const browserLang = navigator.language || navigator.userLanguage;
  const lang = browserLang.split('-')[0]; // Get 'de' from 'de-DE'
  return ['de', 'en'].includes(lang) ? lang : 'en'; // Default to English if language not supported
}

const translations = {
  de: {
    board: {
      nextUp: 'Als nächstes',
      statusAvailable: 'Frei',
      statusBusy: 'Belegt',
      statusError: 'Fehler',
      seats: 'Plätze',
      noMeeting: 'Keine Termine in den nächsten 7 Tagen'
    },
    navbar: {
      title: 'Konferenzräume',
    },
    roomFilter: {
      filterTitle: '',
      filterAllTitle: 'Alle Konferenzräume',
      filterDefault: '',
    },
  },
  en: {
    board: {
      nextUp: 'Next up',
      statusAvailable: 'Available',
      statusBusy: 'Busy',
      statusError: 'Error',
      seats: 'Seats',
      noMeeting: 'No meetings in the next 7 days'
    },
    navbar: {
      title: 'Conference Rooms',
    },
    roomFilter: {
      filterTitle: '',
      filterAllTitle: 'All Conference Rooms',
      filterDefault: '',
    },
  }
};

const lang = getLanguage();
export default translations[lang];
