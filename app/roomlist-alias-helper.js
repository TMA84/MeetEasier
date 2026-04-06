/**
* @file Room List Alias Management.
*
* Provides functions for creating and managing URL-friendly
* aliases for room lists. Supports special characters such as umlauts
* and accents through transliteration into ASCII equivalents.
*
* Custom aliases can be defined via the configuration file
* `config/roomlist-aliases`.
*
* @module roomlist-alias-helper
*/

const roomlistAliasConfig = require('../config/roomlist-aliases');

/**
* Transliterates special characters into ASCII equivalents.
*
* Converts umlauts, accents, and other common special characters into
* their ASCII equivalents. Characters without a mapping remain unchanged.
*
* Examples:
* - Ö, ö → O, o
* - Ä, ä → A, a
* - Ü, ü → U, u
* - ß → ss
* - é, è, ê → e
* - ñ → n
*
* @param {string} text – The text to transliterate.
* @returns {string} Text with replaced special characters.
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

  // Replace each character if a mapping exists
  return text.split('').map(char => charMap[char] || char).join('');
}

/**
* Generates a URL-friendly alias for a room list name.
*
* If a custom alias is defined in the configuration, it is used.
* Otherwise, a default alias is generated:
* 1. Transliterate special characters (Ö → O, ä → a, etc.)
* 2. Convert to lowercase
* 3. Replace spaces with hyphens
* 4. Remove remaining special characters
*
* Examples:
* - "Mötzing" → "motzing"
* - "Café Munich" → "cafe-munich"
* - "Building A & B" → "building-ab"
*
* @param {string} roomlistName – The room list name.
* @returns {string} The generated or configured alias.
*/
function getAlias(roomlistName) {
  // Check if a custom alias is configured
  if (roomlistAliasConfig.aliases && roomlistAliasConfig.aliases[roomlistName]) {
    return roomlistAliasConfig.aliases[roomlistName];
  }

  // Generate default alias: Transliteration → lowercase → hyphens → cleanup
  return transliterateName(roomlistName)
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '');    // Remove remaining special characters
}

/**
* Returns a room list together with its alias.
*
* @param {string} roomlistName – The room list name.
* @returns {Object} Object with `name` (original name) and `alias` (URL-friendly alias).
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
