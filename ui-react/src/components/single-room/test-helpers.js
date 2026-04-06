/**
 * @file Test helpers for single-room Display component tests.
 * Extracts common mock setup to reduce duplication.
 */

const defaultRoom = {
  Name: 'Conference Room A',
  RoomAlias: 'conference-a',
  Roomlist: 'Building 1',
  Busy: false,
  Appointments: [
    {
      Subject: 'Team Meeting',
      Organizer: 'John Doe',
      Start: Date.now() + 3600000,
      End: Date.now() + 5400000,
      Private: false
    }
  ]
};

const defaultRoomB = {
  Name: 'Meeting Room B',
  RoomAlias: 'meeting-b',
  Roomlist: 'Building 1',
  Busy: true,
  Appointments: []
};

/**
 * Sets up the fetch mock for Display rendering.
 * Display calls: getRoomsData (/api/rooms/:alias), fetchMaintenanceStatus,
 * loadMaintenanceMessages (/api/i18n), fetchSidebarConfig, fetchBookingConfig,
 * fetchColorsConfig, initPowerManagement
 * 
 * Uses mockImplementation to route by URL since calls happen in parallel.
 * @param {Function} fetchMock - The vi.fn() mock for global.fetch
 * @param {Object} [overrides] - Optional overrides
 * @param {Object} [overrides.room] - Room data (single room)
 * @param {Object} [overrides.sidebar] - Sidebar config
 * @param {Object} [overrides.booking] - Booking config
 * @returns {Function} The configured fetch mock
 */
export function setupDisplayFetchMocks(fetchMock, overrides = {}) {
  const room = overrides.room ?? defaultRoom;
  const sidebar = overrides.sidebar ?? { showMeetingTitles: false };
  const booking = overrides.booking ?? { enableBooking: true };

  return fetchMock.mockImplementation((url) => {
    if (typeof url === 'string') {
      if (url.startsWith('/api/rooms/')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => room });
      }
      if (url === '/api/sidebar' || url.startsWith('/api/sidebar?')) {
        return Promise.resolve({ ok: true, json: async () => sidebar });
      }
      if (url === '/api/booking-config') {
        return Promise.resolve({ ok: true, json: async () => booking });
      }
      if (url === '/api/maintenance-status') {
        return Promise.resolve({ ok: true, json: async () => ({ enabled: false, message: '' }) });
      }
      if (url === '/api/i18n') {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      if (url === '/api/colors') {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      if (url.startsWith('/api/power-management/')) {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

export { defaultRoom, defaultRoomB };
