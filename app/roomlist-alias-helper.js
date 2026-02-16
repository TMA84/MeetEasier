/**
 * Room List Alias Utility
 * 
 * Provides functions to generate and manage room list aliases,
 * supporting special characters in room list names, including umlauts and accents.
 */

const roomlistAliasConfig = require('../config/roomlist-aliases');

/**
 * Transliterate special characters to ASCII equivalents
 * Handles umlauts, accents, and other common special characters
 * 
 * Examples:
 * - Ö, ö → o
 * - Ä, ä → a
 * - Ü, ü → u
 * - ß → ss
 * - é, è, ê → e
 * - ñ → n
 * 
 * @param {string} text - Text to transliterate
 * @returns {string} Transliterated text
 */
function transliterateName(text) {
  // Character mapping for common special characters
  const charMap = {
    'Ä': 'A', 'ä': 'a',
    'Ö': 'O', 'ö': 'o',
    'Ü': 'U', 'ü': 'u',
    'ß': 'ss',
    'É': 'E', 'é': 'e',
    'È': 'E', 'è': 'e',
    'Ê': 'E', 'ê': 'e',
    'Ë': 'E', 'ë': 'e',
    'À': 'A', 'à': 'a',
    'Â': 'A', 'â': 'a',
    'Ã': 'A', 'ã': 'a',
    'Å': 'A', 'å': 'a',
    'Ç': 'C', 'ç': 'c',
    'Ð': 'D', 'ð': 'd',
    'Ñ': 'N', 'ñ': 'n',
    'Ò': 'O', 'ò': 'o',
    'Ô': 'O', 'ô': 'o',
    'Õ': 'O', 'õ': 'o',
    'Ø': 'O', 'ø': 'o',
    'Ù': 'U', 'ù': 'u',
    'Û': 'U', 'û': 'u',
    'Ý': 'Y', 'ý': 'y',
    'Ÿ': 'Y', 'ÿ': 'y'
  };

  // Replace each character if it has a mapping
  return text.split('').map(char => charMap[char] || char).join('');
}

/**
 * Generate an alias for a room list name.
 * 
 * If an alias is configured for the room list, uses that.
 * Otherwise, generates a default alias by:
 * - Transliterating special characters (Ö → O, ä → a, etc.)
 * - Converting to lowercase
 * - Replacing spaces with dashes
 * - Removing any remaining special characters
 * 
 * Examples:
 * - "Mötzing" → "motzing"
 * - "Café Munich" → "cafe-munich"
 * - "Building A & B" → "building-ab"
 * 
 * @param {string} roomlistName - The room list name
 * @returns {string} The generated alias
 */
function getAlias(roomlistName) {
  // Check if a custom alias is configured
  if (roomlistAliasConfig.aliases && roomlistAliasConfig.aliases[roomlistName]) {
    return roomlistAliasConfig.aliases[roomlistName];
  }

  // Generate default alias
  return transliterateName(roomlistName)
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with dashes
    .replace(/[^a-z0-9-]/g, '');    // Remove any remaining special characters
}

/**
 * Get a room list with its alias.
 * 
 * @param {string} roomlistName - The room list name
 * @returns {object} Object with name and alias
 */
function getRoomlistWithAlias(roomlistName) {
  return {
    name: roomlistName,
    alias: getAlias(roomlistName)
  };
}

module.exports = {
  getAlias,
  getRoomlistWithAlias
};
