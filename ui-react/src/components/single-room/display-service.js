/**
 * @file display-service.js
 * @description Data fetching service for the single-room Display component.
 *              Pure async functions with no React dependency — easy to test.
 */

/**
 * Fetch single room data from API.
 * @param {string} alias - Room alias
 * @returns {Promise<Object|null>} Room object or null if not found
 */
export async function fetchRoomData(alias) {
  if (!alias) return null;

  const response = await fetch(`/api/rooms/${encodeURIComponent(alias)}`);

  if (response.status === 404) {
    return { Name: '', Busy: true, NotFound: true, Appointments: [] };
  }

  return response.json();
}

/**
 * Fetch sidebar configuration from API.
 * @param {string} displayClientId - Client identifier
 * @returns {Promise<Object>} Sidebar config
 */
export async function fetchSidebarConfig(displayClientId) {
  const response = await fetch(`/api/sidebar?displayClientId=${encodeURIComponent(displayClientId)}`);
  return response.json();
}

/**
 * Fetch booking configuration from API.
 * @param {string} [roomEmail] - Optional room email for room-specific config
 * @param {string} [roomGroup] - Optional room group
 * @returns {Promise<Object>} Booking config data
 */
export async function fetchBookingConfig(roomEmail, roomGroup) {
  const endpoint = roomEmail
    ? `/api/booking-config?roomEmail=${encodeURIComponent(roomEmail)}${roomGroup ? `&roomGroup=${encodeURIComponent(roomGroup)}` : ''}`
    : '/api/booking-config';

  const response = await fetch(endpoint);
  return response.json();
}

/**
 * Fetch colors configuration from API.
 * @returns {Promise<Object>} Colors config data
 */
export async function fetchColorsConfig() {
  const response = await fetch('/api/colors');
  return response.json();
}

/**
 * Fetch check-in status for a room's current appointment.
 * @param {Object} room - Room object with Email, Name, Appointments
 * @returns {Promise<Object|null>} Check-in status or null if no appointments
 */
export async function fetchCheckInStatus(room) {
  if (!room || !Array.isArray(room.Appointments) || room.Appointments.length === 0) {
    return null;
  }

  const currentAppointment = room.Appointments[0];
  const query = new URLSearchParams({
    roomEmail: room.Email || '',
    appointmentId: currentAppointment.Id || '',
    organizer: currentAppointment.Organizer || '',
    roomName: room.Name || '',
    startTimestamp: String(currentAppointment.Start || '')
  }).toString();

  const response = await fetch(`/api/check-in-status?${query}`);
  return response.json();
}

/**
 * Perform check-in API call.
 * @param {Object} params - Check-in parameters
 * @param {string} params.roomEmail - Room email
 * @param {string} params.appointmentId - Appointment ID
 * @param {string} params.organizer - Organizer name
 * @param {string} params.roomName - Room name
 * @param {number} params.startTimestamp - Appointment start timestamp
 * @returns {Promise<{ok: boolean, status: number, data: Object}>}
 */
export async function performCheckIn({ roomEmail, appointmentId, organizer, roomName, startTimestamp }) {
  const response = await fetch('/api/check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomEmail, appointmentId, organizer, roomName, startTimestamp })
  });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

/**
 * Extend a meeting with retry logic for network errors.
 * @param {Object} params - Extend parameters
 * @param {string} params.roomEmail - Room email
 * @param {string} params.appointmentId - Appointment ID
 * @param {number} params.minutes - Minutes to extend
 * @param {number} [retries=2] - Number of retries
 * @returns {Promise<{status: number, data: Object}>}
 */
export async function performExtendMeeting({ roomEmail, appointmentId, minutes }, retries = 2) {
  const fetchOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomEmail, appointmentId, minutes })
  };

  const fetchWithRetry = (url, options, maxRetries, attempt = 0) => {
    return fetch(url, options).catch(err => {
      if (attempt < maxRetries) {
        console.warn(`Extend meeting fetch attempt ${attempt + 1} failed, retrying...`, err.message);
        return new Promise(r => setTimeout(r, 1000)).then(() => fetchWithRetry(url, options, maxRetries, attempt + 1));
      }
      throw err;
    });
  };

  const response = await fetchWithRetry('/api/extend-meeting', fetchOptions, retries);
  const data = await response.json();
  return { status: response.status, data };
}
