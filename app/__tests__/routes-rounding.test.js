'use strict';

/**
 * Integration tests for server-side quarter-hour rounding in booking endpoints.
 *
 * Tests verify that:
 * - Booking endpoint applies rounding before creating event
 * - Extend endpoint applies rounding before updating event
 * - Conflict rejection (409) when rounded time overlaps next event
 * - End-of-day rejection (400) when rounded time exceeds 23:59
 * - Already-on-boundary times pass through unchanged
 * - Graph API calls receive the rounded time (not the original)
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

const { describe, it, before, after, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');

/**
 * Helper: Makes an HTTP request to the test server and returns parsed response.
 */
function makeRequest(server, method, path, body) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const options = {
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:' + address.port,
        'Host': '127.0.0.1:' + address.port
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch (_) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Routes rounding integration tests', () => {
  let server;
  let mockCalendarEvents;
  let mockBookingResult;
  let mockBookingFn;
  let mockGetCalendarView;
  let mockGetAccessToken;
  let mockGraphFetchResponses;
  let lastBookingDetails;
  let lastGraphFetchCalls;

  before(() => {
    // Set up environment variables needed by config
    process.env.NODE_ENV = 'test';

    // Clear require cache for modules we need to mock
    const routesPath = require.resolve('../routes');
    const graphPath = require.resolve('../msgraph/graph');
    const bookingPath = require.resolve('../msgraph/booking');
    const configManagerPath = require.resolve('../config-manager');
    const configPath = require.resolve('../../config/config');

    // Clear any cached modules
    delete require.cache[routesPath];
    delete require.cache[graphPath];
    delete require.cache[bookingPath];

    // Mock the graph module
    mockCalendarEvents = [];
    mockGetCalendarView = mock.fn(async () => ({ value: mockCalendarEvents }));
    mockGetAccessToken = mock.fn(async () => 'mock-access-token');

    require.cache[graphPath] = {
      id: graphPath,
      filename: graphPath,
      loaded: true,
      exports: {
        getCalendarView: mockGetCalendarView,
        _getAccessToken: mockGetAccessToken,
        getRoomList: mock.fn(async () => ({ value: [] })),
        getRooms: mock.fn(async () => ({ value: [] })),
        getCalendarViewBatch: mock.fn(async () => new Map())
      }
    };

    // Mock the booking module
    mockBookingResult = { success: true, eventId: 'test-event-123', message: 'Room booked successfully' };
    lastBookingDetails = null;
    mockBookingFn = mock.fn(async (msalClient, roomEmail, bookingDetails) => {
      lastBookingDetails = bookingDetails;
      return mockBookingResult;
    });
    require.cache[bookingPath] = {
      id: bookingPath,
      filename: bookingPath,
      loaded: true,
      exports: mockBookingFn
    };

    // Mock graphFetch for extend-meeting endpoint
    mockGraphFetchResponses = [];
    lastGraphFetchCalls = [];

    // Mock the config-manager to allow bookings
    const originalConfigManager = require('../config-manager');
    const mockConfigManager = {
      ...originalConfigManager,
      getSystemConfig: () => ({ demoMode: false }),
      getBookingConfig: () => ({
        enableBooking: true,
        enableExtendMeeting: true,
        roomOverrides: {},
        groupOverrides: {}
      }),
      getSocketIO: () => null
    };

    require.cache[configManagerPath] = {
      id: configManagerPath,
      filename: configManagerPath,
      loaded: true,
      exports: mockConfigManager
    };

    // Patch the config to have rate limit settings
    const originalConfig = require('../../config/config');
    originalConfig.rateLimit = {
      apiWindowMs: 60000,
      apiMax: 300,
      writeWindowMs: 60000,
      writeMax: 100,
      authWindowMs: 60000,
      authMax: 30,
      bookingWindowMs: 60000,
      bookingMax: 100
    };
    originalConfig.systemDefaults = originalConfig.systemDefaults || {};
    originalConfig.systemDefaults.rateLimitMaxBuckets = 10000;

    // Create Express app and register routes
    const express = require('express');
    const app = express();
    app.use(express.json());

    // We need to patch the routes module to use our mocked graphFetch
    // First clear any previous route cache
    delete require.cache[routesPath];

    // Load routes (this will use our mocked modules from require.cache)
    require('../routes')(app);

    // Start test server
    server = app.listen(0); // random port
  });

  after(() => {
    if (server) server.close();
  });

  beforeEach(() => {
    // Reset mocks
    mockCalendarEvents = [];
    mockBookingResult = { success: true, eventId: 'test-event-123', message: 'Room booked successfully' };
    lastBookingDetails = null;
    lastGraphFetchCalls = [];
    mockGetCalendarView.mock.resetCalls();
    mockGetAccessToken.mock.resetCalls();
    mockBookingFn.mock.resetCalls();
  });

  describe('POST /api/rooms/:roomEmail/book - rounding', () => {
    it('should round endTime "10:03" to "10:15" and create event with rounded time', async () => {
      // Start time: 10:00, End time: 10:03 → should round to 10:15
      const startTime = '2024-01-15T10:00:00.000Z';
      const endTime = '2024-01-15T10:03:00.000Z';

      const res = await makeRequest(server, 'POST', '/api/rooms/room1@test.com/book', {
        subject: 'Test Meeting',
        startTime,
        endTime,
        roomGroup: 'Floor 1'
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.effectiveEndTime, '2024-01-15T10:15:00.000Z');

      // Verify the Graph API booking was called with rounded time
      assert.strictEqual(mockBookingFn.mock.calls.length, 1);
      const bookingCall = mockBookingFn.mock.calls[0].arguments;
      assert.strictEqual(bookingCall[2].endTime, '2024-01-15T10:15:00.000Z');
    });

    it('should pass through endTime already on a quarter-hour boundary unchanged', async () => {
      const startTime = '2024-01-15T10:00:00.000Z';
      const endTime = '2024-01-15T10:30:00.000Z'; // Already on boundary

      const res = await makeRequest(server, 'POST', '/api/rooms/room1@test.com/book', {
        subject: 'Test Meeting',
        startTime,
        endTime,
        roomGroup: 'Floor 1'
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.effectiveEndTime, '2024-01-15T10:30:00.000Z');

      // Verify the Graph API was called with the same time (unchanged)
      assert.strictEqual(mockBookingFn.mock.calls.length, 1);
      const bookingCall = mockBookingFn.mock.calls[0].arguments;
      assert.strictEqual(bookingCall[2].endTime, '2024-01-15T10:30:00.000Z');
    });

    it('should reject with 409 when rounded endTime conflicts with next event', async () => {
      // Next meeting starts at 10:10, ends at 11:00
      // Our booking: start 10:00, end 10:03 → rounds to 10:15
      // Overlap check: 10:00 < 11:00 (true) AND 10:15 > 10:10 (true) → conflict!
      mockCalendarEvents = [{
        id: 'existing-event-1',
        start: { dateTime: '2024-01-15T10:10:00.000Z' },
        end: { dateTime: '2024-01-15T11:00:00.000Z' }
      }];

      const startTime = '2024-01-15T10:00:00.000Z';
      const endTime = '2024-01-15T10:03:00.000Z'; // Rounds to 10:15, overlaps with event at 10:10-11:00

      const res = await makeRequest(server, 'POST', '/api/rooms/room1@test.com/book', {
        subject: 'Test Meeting',
        startTime,
        endTime,
        roomGroup: 'Floor 1'
      });

      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.error, 'Conflict');
      // Booking should NOT have been called
      assert.strictEqual(mockBookingFn.mock.calls.length, 0);
    });

    it('should reject with 400 when rounded endTime exceeds end of day (different date, not midnight)', async () => {
      // Start at 23:50, end at 23:52 → rounds to 00:00 next day
      // Actually 00:00 is midnight rollover which IS allowed
      // Let's use a case where it rounds past midnight to a non-midnight time:
      // Start at 23:00, end at 23:50 → rounds to 00:00 (midnight, allowed)
      // We need: start at 2024-01-15, end rounds to 2024-01-16 non-midnight
      // But rounding always produces :00, :15, :30, :45 — the only way to get
      // a different date with non-midnight is if we start on one date and round past midnight
      // to e.g. 00:15. This means end time must be between 00:01 and 00:14 of next day.
      // Actually the check is: rounded end date !== start date AND not midnight.
      // So: start on Jan 15, endTime = Jan 16 00:01 → rounds to Jan 16 00:15 (different date, not midnight)
      const startTime = '2024-01-15T23:00:00.000Z';
      const endTime = '2024-01-16T00:01:00.000Z'; // Rounds to 2024-01-16T00:15:00.000Z

      const res = await makeRequest(server, 'POST', '/api/rooms/room1@test.com/book', {
        subject: 'Test Meeting',
        startTime,
        endTime,
        roomGroup: 'Floor 1'
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'End of day exceeded');
      // Booking should NOT have been called
      assert.strictEqual(mockBookingFn.mock.calls.length, 0);
    });

    it('should allow midnight rollover (rounded to exactly 00:00 next day)', async () => {
      // Start at 23:00, end at 23:50 → rounds to 00:00 next day (midnight is allowed)
      const startTime = '2024-01-15T23:00:00.000Z';
      const endTime = '2024-01-15T23:50:00.000Z'; // Rounds to 2024-01-16T00:00:00.000Z

      const res = await makeRequest(server, 'POST', '/api/rooms/room1@test.com/book', {
        subject: 'Test Meeting',
        startTime,
        endTime,
        roomGroup: 'Floor 1'
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.effectiveEndTime, '2024-01-16T00:00:00.000Z');
    });

    it('should verify Graph API call receives rounded time, not the original', async () => {
      const startTime = '2024-01-15T09:00:00.000Z';
      const endTime = '2024-01-15T09:22:00.000Z'; // Should round to 09:30

      const res = await makeRequest(server, 'POST', '/api/rooms/room1@test.com/book', {
        subject: 'Rounded Time Test',
        startTime,
        endTime,
        roomGroup: 'Floor 1'
      });

      assert.strictEqual(res.status, 200);

      // Verify the booking module received the rounded endTime
      assert.strictEqual(mockBookingFn.mock.calls.length, 1);
      const bookingDetails = mockBookingFn.mock.calls[0].arguments[2];
      assert.strictEqual(bookingDetails.endTime, '2024-01-15T09:30:00.000Z');
      // Original endTime was 09:22, not what was passed to Graph
      assert.notStrictEqual(bookingDetails.endTime, endTime);
    });
  });

  describe('POST /api/extend-meeting - rounding', () => {
    it('should round calculated newEnd to next quarter-hour before updating', async () => {
      // Current event ends at 10:00, extend by 20 minutes → 10:20 → rounds to 10:30
      mockGetCalendarView.mock.mockImplementation(async () => ({
        value: [] // No conflicts
      }));

      // Mock graphFetch for fetching current event and updating it
      // The extend endpoint uses graphFetch directly — we need to intercept global fetch
      // Since graphFetch uses the global fetch, let's mock it
      const originalFetch = global.fetch;
      const fetchCalls = [];
      global.fetch = mock.fn(async (url, options) => {
        fetchCalls.push({ url, options });
        // If it's fetching the event details
        if (options && options.method === 'PATCH') {
          return { ok: true, json: async () => ({ success: true }) };
        }
        // GET request for event details
        return {
          ok: true,
          json: async () => ({
            id: 'event-123',
            start: { dateTime: '2024-01-15T09:00:00.0000000', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T10:00:00.0000000', timeZone: 'UTC' }
          })
        };
      });

      try {
        const res = await makeRequest(server, 'POST', '/api/extend-meeting', {
          roomEmail: 'room1@test.com',
          appointmentId: 'event-123',
          minutes: 20,
          roomGroup: 'Floor 1'
        });

        assert.strictEqual(res.status, 200);
        // 10:00 + 20min = 10:20 → rounds to 10:30
        assert.strictEqual(res.body.effectiveEndTime, '2024-01-15T10:30:00.000Z');
        assert.strictEqual(res.body.newEndTime, '2024-01-15T10:30:00.000Z');

        // Verify the PATCH call sent the rounded time
        const patchCall = fetchCalls.find(c => c.options && c.options.method === 'PATCH');
        assert.ok(patchCall, 'PATCH call should have been made');
        const patchBody = JSON.parse(patchCall.options.body);
        assert.ok(patchBody.end.dateTime.includes('10:30'), 'PATCH should contain rounded time 10:30');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should reject with 409 when rounded extension time conflicts with next event', async () => {
      // Next meeting starts at 10:20 and ends at 11:00
      // Current event ends at 10:00, extend by 20 min → 10:20 → rounds to 10:30
      // Conflict check: currentStart(09:00) < eventEnd(11:00) AND roundedEnd(10:30) > eventStart(10:20) → conflict!
      mockGetCalendarView.mock.mockImplementation(async () => ({
        value: [{
          id: 'next-event',
          start: { dateTime: '2024-01-15T10:20:00.000Z' },
          end: { dateTime: '2024-01-15T11:00:00.000Z' }
        }]
      }));

      // Current event ends at 10:00, extend by 20 min → 10:20 → rounds to 10:30
      // 10:30 > 10:20 (next event start) → conflict detected
      const originalFetch = global.fetch;
      global.fetch = mock.fn(async (url, options) => {
        if (options && options.method === 'PATCH') {
          return { ok: true, json: async () => ({ success: true }) };
        }
        return {
          ok: true,
          json: async () => ({
            id: 'event-123',
            start: { dateTime: '2024-01-15T09:00:00.0000000', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T10:00:00.0000000', timeZone: 'UTC' }
          })
        };
      });

      try {
        const res = await makeRequest(server, 'POST', '/api/extend-meeting', {
          roomEmail: 'room1@test.com',
          appointmentId: 'event-123',
          minutes: 20,
          roomGroup: 'Floor 1'
        });

        assert.strictEqual(res.status, 409);
        assert.strictEqual(res.body.error, 'Conflict');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should reject with 400 when rounded extension time exceeds end of day', async () => {
      mockGetCalendarView.mock.mockImplementation(async () => ({
        value: []
      }));

      // Current event starts at 23:00, ends at 23:30, extend by 40 min → 00:10 → rounds to 00:15
      // 00:15 is a different date and NOT midnight → should be rejected
      const originalFetch = global.fetch;
      global.fetch = mock.fn(async (url, options) => {
        if (options && options.method === 'PATCH') {
          return { ok: true, json: async () => ({ success: true }) };
        }
        return {
          ok: true,
          json: async () => ({
            id: 'event-456',
            start: { dateTime: '2024-01-15T23:00:00.0000000', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T23:30:00.0000000', timeZone: 'UTC' }
          })
        };
      });

      try {
        const res = await makeRequest(server, 'POST', '/api/extend-meeting', {
          roomEmail: 'room1@test.com',
          appointmentId: 'event-456',
          minutes: 40,
          roomGroup: 'Floor 1'
        });

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.error, 'End of day exceeded');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should pass through extension time already on boundary unchanged', async () => {
      mockGetCalendarView.mock.mockImplementation(async () => ({
        value: []
      }));

      // Current event ends at 10:00, extend by 30 min → 10:30 (already on boundary)
      const originalFetch = global.fetch;
      const fetchCalls = [];
      global.fetch = mock.fn(async (url, options) => {
        fetchCalls.push({ url, options });
        if (options && options.method === 'PATCH') {
          return { ok: true, json: async () => ({ success: true }) };
        }
        return {
          ok: true,
          json: async () => ({
            id: 'event-789',
            start: { dateTime: '2024-01-15T09:00:00.0000000', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T10:00:00.0000000', timeZone: 'UTC' }
          })
        };
      });

      try {
        const res = await makeRequest(server, 'POST', '/api/extend-meeting', {
          roomEmail: 'room1@test.com',
          appointmentId: 'event-789',
          minutes: 30,
          roomGroup: 'Floor 1'
        });

        assert.strictEqual(res.status, 200);
        // 10:00 + 30min = 10:30 (already on boundary, no rounding needed)
        assert.strictEqual(res.body.effectiveEndTime, '2024-01-15T10:30:00.000Z');

        // Verify PATCH was called with 10:30
        const patchCall = fetchCalls.find(c => c.options && c.options.method === 'PATCH');
        assert.ok(patchCall, 'PATCH call should have been made');
        const patchBody = JSON.parse(patchCall.options.body);
        assert.ok(patchBody.end.dateTime.includes('10:30'), 'PATCH should contain unchanged time 10:30');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should verify Graph API PATCH receives rounded time, not original calculated time', async () => {
      mockGetCalendarView.mock.mockImplementation(async () => ({
        value: []
      }));

      // Current event ends at 10:15, extend by 10 min → 10:25 → rounds to 10:30
      const originalFetch = global.fetch;
      const fetchCalls = [];
      global.fetch = mock.fn(async (url, options) => {
        fetchCalls.push({ url, options });
        if (options && options.method === 'PATCH') {
          return { ok: true, json: async () => ({ success: true }) };
        }
        return {
          ok: true,
          json: async () => ({
            id: 'event-abc',
            start: { dateTime: '2024-01-15T09:30:00.0000000', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T10:15:00.0000000', timeZone: 'UTC' }
          })
        };
      });

      try {
        const res = await makeRequest(server, 'POST', '/api/extend-meeting', {
          roomEmail: 'room1@test.com',
          appointmentId: 'event-abc',
          minutes: 10,
          roomGroup: 'Floor 1'
        });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.effectiveEndTime, '2024-01-15T10:30:00.000Z');

        // Verify PATCH was sent with 10:30 (rounded), not 10:25 (calculated)
        const patchCall = fetchCalls.find(c => c.options && c.options.method === 'PATCH');
        assert.ok(patchCall, 'PATCH call should have been made');
        const patchBody = JSON.parse(patchCall.options.body);
        assert.ok(patchBody.end.dateTime.includes('10:30'),
          `Expected rounded time 10:30 in PATCH body, got: ${patchBody.end.dateTime}`);
        assert.ok(!patchBody.end.dateTime.includes('10:25'),
          'PATCH should NOT contain unrounded time 10:25');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
