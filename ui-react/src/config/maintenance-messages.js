/**
* @file maintenanceMessages.js
* @description Maintenance mode message configuration. Provides default
* maintenance title and body text in multiple languages, runtime override
* support via the i18n API, and browser-locale detection for automatic
* language selection.
*/

import { applyDisplayI18nConfig } from './display-translations.js';

const defaultMaintenanceMessages = {
  en: {
    title: 'Maintenance mode active',
    body: 'This display is temporarily unavailable.'
  },
  de: {
    title: 'Wartungsmodus aktiv',
    body: 'Diese Anzeige ist vorübergehend nicht verfügbar.'
  },
  fr: {
    title: 'Mode maintenance actif',
    body: 'Cet affichage est temporairement indisponible.'
  },
  es: {
    title: 'Modo de mantenimiento activo',
    body: 'Esta pantalla no está disponible temporalmente.'
  },
  it: {
    title: 'Modalità manutenzione attiva',
    body: 'Questo display è temporaneamente non disponibile.'
  },
  nl: {
    title: 'Onderhoudsmodus actief',
    body: 'Dit scherm is tijdelijk niet beschikbaar.'
  },
  pl: {
    title: 'Tryb konserwacji aktywny',
    body: 'Ten ekran jest tymczasowo niedostępny.'
  },
  pt: {
    title: 'Modo de manutenção ativo',
    body: 'Este ecrã está temporariamente indisponível.'
  },
  cs: {
    title: 'Režim údržby aktivní',
    body: 'Tato obrazovka je dočasně nedostupná.'
  }
};

let maintenanceMessages = { ...defaultMaintenanceMessages };

const normalizeMaintenanceMessages = (rawMessages) => {
  const normalized = {};

  if (!rawMessages || typeof rawMessages !== 'object' || Array.isArray(rawMessages)) {
    return normalized;
  }

  Object.entries(rawMessages).forEach(([langKey, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return;
    }

    const language = String(langKey).trim().toLowerCase();
    if (!language) {
      return;
    }

    normalized[language] = {
      title: value.title !== undefined ? String(value.title) : '',
      body: value.body !== undefined ? String(value.body) : ''
    };
  });

  return normalized;
};

/**
* Applies raw maintenance messages by normalizing and merging with defaults.
* @param {Object} rawMessages - Raw maintenance message data
* @returns {Object} The updated maintenance messages
*/
export const applyMaintenanceMessages = (rawMessages) => {
  const normalized = normalizeMaintenanceMessages(rawMessages);
  maintenanceMessages = {
    ...defaultMaintenanceMessages,
    ...normalized
  };

  return maintenanceMessages;
};

/**
* Applies i18n configuration including display and maintenance messages.
* @param {Object} i18nConfig - The i18n configuration object
* @returns {Object} The updated maintenance messages
*/
export const applyI18nConfig = (i18nConfig) => {
  if (!i18nConfig || typeof i18nConfig !== 'object') {
    return maintenanceMessages;
  }
  applyDisplayI18nConfig(i18nConfig);
  return applyMaintenanceMessages(i18nConfig.maintenanceMessages);
};

/**
* Loads maintenance messages from the API.
* @returns {Promise<Object>} The loaded maintenance messages
*/
export const loadMaintenanceMessages = async () => {
  try {
    const response = await fetch('/api/i18n');
    const data = await response.json();
    return applyI18nConfig(data);
  } catch (error) {
    return maintenanceMessages;
  }
};

/**
* Detects the maintenance language from the browser locale.
* @returns {string} Two-letter language code
*/
export const getMaintenanceLanguage = () => {
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  const language = browserLang.split('-')[0].toLowerCase();
  return maintenanceMessages[language] ? language : 'en';
};

/**
* Returns the current maintenance messages object.
* @returns {Object} All maintenance messages
*/
export const getMaintenanceMessages = () => maintenanceMessages;

/**
* Returns the maintenance copy for the detected browser language.
* @returns {{ title: string, body: string }} Maintenance title and body
*/
export const getMaintenanceCopy = () => {
  const language = getMaintenanceLanguage();
  return maintenanceMessages[language] || maintenanceMessages.en;
};

export default maintenanceMessages;