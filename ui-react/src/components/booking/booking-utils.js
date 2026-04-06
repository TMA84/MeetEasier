/**
* @file booking-utils.js
* @description Shared utilities for BookingModal and ExtendMeetingModal.
*              Extracts common patterns: booking config fetching, fetch-with-retry,
*              and duration option generation.
*/

/**
* Fetch and apply booking button color CSS custom property.
* Used by both BookingModal and ExtendMeetingModal on mount.
*
* @param {Object} room - Room object with Email and RoomlistAlias
*/
export function fetchAndApplyBookingButtonColor(room) {
  const roomEmail = room?.Email;
  const roomGroup = room?.RoomlistAlias;
  const endpoint = roomEmail
    ? `/api/booking-config?roomEmail=${encodeURIComponent(roomEmail)}${roomGroup ? `&roomGroup=${encodeURIComponent(roomGroup)}` : ''}`
    : '/api/booking-config';

  fetch(endpoint)
    .then(response => response.json())
    .then(data => {
      const buttonColor = data.buttonColor || '#334155';
      document.documentElement.style.setProperty('--booking-button-color', buttonColor);
    })
    .catch(err => {
      console.error('Error fetching booking config:', err);
    });
}

/**
* Fetch with retry for network errors (e.g. unstable WiFi on Raspberry Pi).
*
* @param {string} url - URL to fetch
* @param {Object} options - Fetch options
* @param {number} [retries=2] - Number of retries
* @param {string} [logPrefix='Fetch'] - Prefix for warning log messages
* @returns {Promise<Response>}
*/
export async function fetchWithRetry(url, options, retries = 2, logPrefix = 'Fetch') {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (attempt < retries) {
        console.warn(`${logPrefix} attempt ${attempt + 1} failed, retrying...`, err.message);
        await new Promise(r => setTimeout(r, 1000));
      } else {
        throw err;
      }
    }
  }
}

/**
* Generate duration options array in 5-minute intervals (5 to 240 minutes).
*
* @returns {number[]} Array of duration values
*/
export function generateDurationOptions() {
  const options = [];
  for (let i = 5; i <= 240; i += 5) {
    options.push(i);
  }
  return options;
}
