/**
 * @file Test helpers for WiFiInfo component tests.
 * Extracts common mock setup to reduce duplication.
 */

/**
 * Creates a mock fetch response that resolves with WiFi data.
 * @param {Object} [data] - WiFi config data
 * @param {string} [data.ssid] - WiFi SSID
 * @param {string} [data.password] - WiFi password
 * @returns {{ json: () => Promise<Object> }}
 */
export function wifiResponse(data = { ssid: 'TestNetwork', password: 'TestPass' }) {
  return { ok: true, json: async () => data };
}

/**
 * Sets up the standard fetch mock for WiFiInfo rendering.
 * WiFiInfo calls: loadI18nConfig (/api/i18n), loadWiFiInfo (/api/wifi), loadLogoConfig (/api/logo)
 * @param {Function} fetchMock - The vi.fn() mock for global.fetch
 * @param {Object} [wifiData] - WiFi config data override
 * @returns {Function} The configured fetch mock
 */
export function setupWifiFetchMock(fetchMock, wifiData) {
  return fetchMock
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // i18n
    .mockResolvedValueOnce(wifiResponse(wifiData)) // wifi
    .mockResolvedValueOnce({ ok: true, json: async () => ({ logoLightUrl: '/img/logo.W.png' }) }); // logo
}
