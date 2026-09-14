/**
* @file fetch-with-timeout.js
* @description fetch() wrapper that enforces a hard timeout and retries with
* backoff. Plain fetch() never times out on its own - if a TCP connection
* stalls (e.g. a kiosk on marginal Wi-Fi where the connection never gets a
* FIN/RST), the promise can stay pending indefinitely. For requests that
* gate a component's initial render (clearing a loading spinner), that
* means the spinner never clears and only a manual reboot recovers it.
*/

/**
* fetch() with an AbortController-based timeout.
* @param {string} url
* @param {Object} [options]
* @param {number} [timeoutMs=10000]
* @returns {Promise<Response>}
*/
export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
* fetch() with a timeout, retried with linear backoff on failure (including
* a timeout abort), so a single stalled/failed attempt doesn't permanently
* block whatever is waiting on the result.
* @param {string} url
* @param {Object} [options]
* @param {Object} [config]
* @param {number} [config.retries=2] - Additional attempts after the first
* @param {number} [config.timeoutMs=10000] - Per-attempt timeout
* @param {number} [config.backoffMs=1500] - Base delay between attempts
* @returns {Promise<Response>}
*/
export async function fetchWithRetry(url, options = {}, { retries = 2, timeoutMs = 10000, backoffMs = 1500 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithTimeout(url, options, timeoutMs);
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}
