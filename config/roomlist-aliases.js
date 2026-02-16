/**
 * Room List Aliases Configuration
 * 
 * Configure aliases for room lists that contain special characters.
 * This allows the room list filter to work properly with names like:
 * - "Mötzing" (umlauts are automatically converted: ö → o)
 * - "Café" (accents are automatically converted: é → e)
 * - "Building A & B"
 * - "Floor 3 (North Wing)"
 * - "Meeting Rooms - HQ"
 * 
 * Each room list can have an optional alias that will be used for:
 * - URL filtering parameters
 * - Filter ID generation
 * - Display in filter dropdown
 * 
 * If no alias is configured, the default behavior is used:
 * - Transliterate special characters (Ö→O, ä→a, é→e, ñ→n, etc.)
 * - Convert to lowercase
 * - Replace spaces with dashes
 * - Remove remaining special characters
 * 
 * Examples with auto-generated aliases:
 * - "Mötzing" → "motzing"
 * - "Café Munich" → "cafe-munich"
 * - "Building A & B" → "building-ab"
 * 
 * Examples with custom aliases (optional):
 * {
 *   "Building A & B": "building-ab",              // Custom alias
 *   "Floor 3 (North Wing)": "floor-3-north",    // Custom alias
 *   "Meeting Rooms - HQ": "meeting-rooms-hq",   // Custom alias
 *   "Mötzing": null                              // Use auto-generated (motzing)
 * }
 */

module.exports = {
  aliases: {
    // Define custom aliases here if you need more control
    // Example: "Building A & B": "building-ab",
  }
};
