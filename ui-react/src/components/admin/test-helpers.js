/**
 * @file Test helpers for Admin component tests.
 * Extracts common mock setup to reduce duplication.
 */

const defaultLockResponse = { wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false, searchLocked: false, rateLimitLocked: false, apiTokenLocked: false, wifiApiTokenLocked: false, oauthLocked: false, systemLocked: false, maintenanceLocked: false, translationApiLocked: false };
const defaultWifiResponse = { ssid: '', password: '' };
const defaultLogoResponse = { logoDarkUrl: '', logoLightUrl: '' };
const defaultSidebarResponse = { showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false };
const defaultBookingResponse = { enableBooking: true, checkIn: {} };

/**
 * Creates a mock JSON response.
 * @param {*} data - Response data
 * @returns {{ ok: boolean, status: number, json: () => Promise<*> }}
 */
export function jsonResponse(data) {
  return { ok: true, status: 200, json: async () => data };
}

/**
 * Default route responses for URL-based fetch mocking.
 * Maps URL patterns to response data factories.
 */
const defaultRouteResponses = {
  '/api/admin/session': () => ({ _raw: true, ok: true, status: 200 }),
  '/api/config-locks': (locks) => locks,
  '/api/connected-clients': () => ({ clients: [] }),
  '/api/wifi': (_, wifi) => wifi,
  '/api/logo': (_, __, logo) => logo,
  '/api/search-config': () => ({ useGraphAPI: true }),
  '/api/rate-limit-config': () => ({ apiWindowMs: 60000, apiMax: 300, writeWindowMs: 60000, writeMax: 60, authWindowMs: 60000, authMax: 30 }),
  '/api/translation-api-config': () => ({ enabled: true, url: '', timeoutMs: 20000, hasApiKey: false }),
  '/api/roomlists': () => [],
  '/api/rooms': () => [],
  '/api/maintenance-status': () => ({ enabled: false, message: '' }),
  '/api/system-config': () => ({ startupValidationStrict: false, graphWebhookEnabled: false, graphWebhookClientState: '', graphWebhookAllowedIps: '', exposeDetailedErrors: false, graphFetchTimeoutMs: 10000, graphFetchRetryAttempts: 2, graphFetchRetryBaseMs: 250, hstsMaxAge: 31536000, rateLimitMaxBuckets: 10000 }),
  '/api/oauth-config': () => ({ clientId: '', authority: '', hasClientSecret: false }),
  '/api/oauth-certificate': () => ({ certificate: null }),
  '/api/api-token-config': () => ({ source: 'default', isDefault: true }),
  '/api/i18n': () => ({ maintenanceMessages: {}, adminTranslations: {} }),
  '/api/colors': () => ({ bookingButtonColor: '#334155', statusAvailableColor: '#22c55e', statusBusyColor: '#ef4444', statusUpcomingColor: '#f59e0b', statusNotFoundColor: '#6b7280' }),
  '/api/version': () => ({ version: '1.0.0' }),
  '/api/sync-status': () => ({}),
};

/**
 * Resolves a URL to its mock response data using the route map.
 * @param {string} urlStr - The request URL
 * @param {Object} locks - Config locks data
 * @param {Object} wifi - WiFi config data
 * @param {Object} logo - Logo config data
 * @param {Object} sidebar - Sidebar config data
 * @param {Object} booking - Booking config data
 * @returns {*} Response data or undefined if no match
 */
function resolveRouteResponse(urlStr, locks, wifi, logo, sidebar, booking) {
  // Exact match first
  const exactHandler = defaultRouteResponses[urlStr];
  if (exactHandler) return exactHandler(locks, wifi, logo);

  // Prefix-based matches
  if (urlStr === '/api/sidebar' || urlStr.startsWith('/api/sidebar?')) return sidebar;
  if (urlStr === '/api/booking-config' || urlStr.startsWith('/api/booking-config?')) return booking;
  if (urlStr.startsWith('/api/mqtt')) return {};

  return undefined;
}

/**
 * Sets up URL-based fetch mock for Admin rendering.
 * Routes by URL so it handles any number of calls (mount + reloads).
 * @param {Function} fetchMock - The vi.fn() mock for global.fetch
 * @param {Object} [overrides] - Optional overrides for each response
 * @param {Object} [options] - Additional options
 * @returns {Function} The configured fetch mock
 */
export function setupAdminFetchMocks(fetchMock, overrides = {}, options = {}) {
  const locks = overrides.locks ?? defaultLockResponse;
  const wifi = overrides.wifi ?? defaultWifiResponse;
  const logo = overrides.logo ?? defaultLogoResponse;
  const sidebar = overrides.sidebar ?? defaultSidebarResponse;
  const booking = overrides.booking ?? defaultBookingResponse;
  const postHandler = options.postHandler || null;

  return fetchMock.mockImplementation((url, fetchOptions) => {
    const urlStr = typeof url === 'string' ? url : '';
    const method = fetchOptions?.method || 'GET';

    // POST endpoints
    if (method === 'POST') {
      if (postHandler) {
        const customResponse = postHandler(urlStr, fetchOptions);
        if (customResponse) return customResponse;
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true }) });
    }

    const data = resolveRouteResponse(urlStr, locks, wifi, logo, sidebar, booking);
    if (data !== undefined) {
      // Special case: raw response (no json wrapper)
      if (data._raw) return Promise.resolve({ ok: data.ok, status: data.status });
      return Promise.resolve({ ok: true, json: async () => data });
    }

    // Default
    return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
  });
}
