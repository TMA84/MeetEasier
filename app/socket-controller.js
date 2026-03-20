/**
 * @file socket-controller.js
 * @description Socket.IO Controller for real-time communication with display clients.
 *
 * This module manages WebSocket connections via Socket.IO and controls the
 * data exchange between the server and connected display clients (single-room displays,
 * flightboards, admin panel). It polls the Microsoft Graph API at configurable
 * intervals, processes room/calendar data, and sends updates in real time
 * to all connected clients.
 *
 * Main features:
 * - Management of Socket.IO connections and display client tracking
 * - Periodic polling of the Microsoft Graph API for room data
 * - Targeted room updates via Socket.IO rooms (room:alias)
 * - Automatic maintenance mode activation on Graph API errors
 * - No-show detection and automatic appointment release (check-in)
 * - Retry logic with exponential backoff for Graph API requests
 *
 * @requires @azure/msal-node - Microsoft Authentication Library for token acquisition
 * @requires ../config/config - Central application configuration
 * @requires ./config-manager - Configuration management with real-time updates
 * @requires ./checkin-manager - Check-in management for appointment confirmations
 */

const msal = require('@azure/msal-node');
const config = require('../config/config');
const configManager = require('./config-manager');
const certGenerator = require('./cert-generator');
const checkinManager = require('./checkin-manager');

/** @type {msal.ConfidentialClientApplication|null} MSAL client for Microsoft Graph authentication */
let msalClient = null;

/**
 * Creates a new MSAL ConfidentialClientApplication instance.
 * Uses certificate-based auth if available, otherwise falls back to client secret.
 * Called at startup and after OAuth configuration changes.
 * @returns {msal.ConfidentialClientApplication} The new MSAL client instance
 */
function refreshMsalClient() {
  // Always read fresh OAuth config from persisted storage
  const runtimeOAuth = configManager.getOAuthRuntimeConfig();
  config.msalConfig.auth.clientId = runtimeOAuth.clientId;
  config.msalConfig.auth.authority = runtimeOAuth.authority;
  config.msalConfig.auth.clientSecret = runtimeOAuth.clientSecret;

  const encryptionKey = configManager.getEffectiveApiToken();
  if (encryptionKey) {
    const certConfig = certGenerator.getMsalCertificateConfig(encryptionKey);
    if (certConfig) {
      const msalConfigCopy = {
        auth: {
          clientId: config.msalConfig.auth.clientId,
          authority: config.msalConfig.auth.authority,
          clientCertificate: certConfig
        },
        system: config.msalConfig.system
      };
      msalClient = new msal.ConfidentialClientApplication(msalConfigCopy);
      console.log('[SocketController] MSAL client initialized with certificate authentication');
      return msalClient;
    }
  }
  msalClient = new msal.ConfidentialClientApplication(config.msalConfig);
  console.log('[SocketController] MSAL client initialized with client secret (clientId: %s, authority: %s, secretLength: %d)',
    config.msalConfig.auth.clientId,
    config.msalConfig.auth.authority,
    config.msalConfig.auth.clientSecret ? config.msalConfig.auth.clientSecret.length : 0);
  return msalClient;
}

// Initialize MSAL client at module startup
refreshMsalClient();

/** @type {boolean} Indicates whether the polling loop is already running */
let isRunning = false;
/** @type {string|null} ISO timestamp of the last synchronization */
let lastSyncTime = null;
/** @type {boolean|null} Success/failure of the last synchronization */
let lastSyncSuccess = null;
/** @type {string|null} Error message of the last failed synchronization */
let syncErrorMessage = null;
/** @type {Object|null} Socket.IO server instance */
let socketIO = null;
/** @type {NodeJS.Timeout|null} Timer handle for the polling interval */
let pollTimerHandle = null;
/** @type {boolean} Indicates whether automatic maintenance mode was activated by the controller */
let autoMaintenanceOwned = false;
/** @type {Array<Object>|null} Cached room data from last successful Graph sync */
let lastRoomsCache = null;
/** @type {number|null} Timestamp (ms) of last successful room cache update */
let lastRoomsCacheTime = null;
/** @type {number} Count of consecutive Graph API sync failures */
let consecutiveGraphFailures = 0;
/** @type {number} Number of consecutive failures before activating maintenance mode */
const MAINTENANCE_FAILURE_THRESHOLD = 3;
/** @type {Map<string, Object>} Connected display clients, indexed by client identifier */
const connectedDisplayClients = new Map();
/** @type {Array<Object>} Ring buffer of recent disconnect events for debugging */
const recentDisconnects = [];
/** @type {number} Maximum number of stored disconnect events */
const MAX_DISCONNECT_LOG = 50;

/** @type {string} Maintenance message for Graph API outages (configurable via environment variable) */
const GRAPH_FAILURE_MAINTENANCE_MESSAGE = process.env.GRAPH_FAILURE_MAINTENANCE_MESSAGE
  || 'Calendar backend currently unavailable. Display is temporarily in fallback mode.';

/**
 * Reads the Graph fetch settings from the configuration.
 * Ensures that timeout, retry attempts, and base wait time
 * are within reasonable minimum limits.
 * @returns {{timeoutMs: number, retryAttempts: number, retryBaseMs: number}} Graph fetch settings
 */
function getGraphFetchSettings() {
  return {
    timeoutMs: Math.max(Number.parseInt(config.systemDefaults?.graphFetchTimeoutMs, 10) || 10000, 1000),
    retryAttempts: Math.max(Number.parseInt(config.systemDefaults?.graphFetchRetryAttempts, 10) || 2, 0),
    retryBaseMs: Math.max(Number.parseInt(config.systemDefaults?.graphFetchRetryBaseMs, 10) || 250, 50)
  };
}

/**
 * Sanitizes an error object for safe log output.
 * Removes sensitive information and extracts only relevant error details.
 * @param {Error|*} error - The error object to sanitize
 * @returns {Object} Sanitized error object with name, message, code, and status
 */
function sanitizeErrorForLog(error) {
  if (!error || typeof error !== 'object') {
    return {
      message: String(error || 'Unknown error')
    };
  }

  return {
    name: error.name,
    message: error.message,
    code: error.code || error.body?.error?.code,
    status: error.status || error.statusCode
  };
}

/**
 * Logs a sanitized error with optional additional information.
 * @param {string} label - Descriptive label for the error context
 * @param {Error|*} error - The error object to log
 * @param {*} [extra] - Optional additional information for the log entry
 */
function logSanitizedError(label, error, extra = undefined) {
  if (extra) {
    console.error(label, {
      error: sanitizeErrorForLog(error),
      extra
    });
    return;
  }

  console.error(label, sanitizeErrorForLog(error));
}

/**
 * Checks whether a Graph API error justifies a retry attempt.
 * Retryable errors are: network errors, timeouts, aborts, HTTP 429 (rate limit),
 * and server errors (5xx).
 * @param {Error|*} error - The error object to check
 * @returns {boolean} true if the error is retryable
 */
function isRetryableGraphError(error) {
  if (!error) {
    return false;
  }

  const message = String(error?.message || '').toLowerCase();
  if (message.includes('aborted') || message.includes('timeout') || message.includes('network')) {
    return true;
  }

  const status = Number(error?.status || error?.statusCode || 0);
  return status === 429 || status >= 500;
}

/**
 * Creates a delay (Promise-based) for retry wait times.
 * @param {number} ms - Wait time in milliseconds
 * @returns {Promise<void>} Promise that resolves after the wait time
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Performs an HTTP fetch against the Microsoft Graph API with retry logic.
 * Implements exponential backoff for retryable errors (429, 5xx, network).
 * Each attempt has a configurable timeout via AbortController.
 * @param {string} url - The Graph API URL
 * @param {Object} [options={}] - Fetch options (headers, method, body, etc.)
 * @returns {Promise<Response>} The HTTP response
 * @throws {Error} On non-retryable errors or after exhausting all attempts
 */
async function graphFetch(url, options = {}) {
  const settings = getGraphFetchSettings();
  let lastError = null;

  for (let attempt = 0; attempt <= settings.retryAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), settings.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      if (!response.ok && (response.status === 429 || response.status >= 500)) {
        const retryError = new Error(`Graph HTTP ${response.status}`);
        retryError.status = response.status;
        if (attempt < settings.retryAttempts) {
          await delay(settings.retryBaseMs * Math.pow(2, attempt));
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < settings.retryAttempts && isRetryableGraphError(error)) {
        await delay(settings.retryBaseMs * Math.pow(2, attempt));
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  throw lastError || new Error('Graph request failed');
}

/**
 * Checks whether Graph API mode is enabled.
 * Currently always returns true (Graph is the only supported mode).
 * @returns {boolean} Always true
 */
function isGraphModeEnabled() {
  return true;
}

/**
 * Checks whether valid Microsoft Graph API credentials are configured.
 * Validates client ID, authority URL, and client secret for presence
 * and correct formatting.
 * @returns {boolean} true if all credentials are validly configured
 */
function hasValidGraphCredentials() {
  const clientId = String(config?.msalConfig?.auth?.clientId || '').trim();
  const authority = String(config?.msalConfig?.auth?.authority || '').trim();
  const clientSecret = String(config?.msalConfig?.auth?.clientSecret || '').trim();

  if (!clientId || clientId === 'OAUTH_CLIENT_ID_NOT_SET') {
    return false;
  }
  if (!authority || authority === 'OAUTH_AUTHORITY_NOT_SET') {
    return false;
  }
  if (!clientSecret || clientSecret === 'OAUTH_CLIENT_SECRET_NOT_SET') {
    return false;
  }

  try {
    const parsed = new URL(authority);
    return !!parsed.protocol && !!parsed.hostname;
  } catch (error) {
    return false;
  }
}

/**
 * Activates automatic maintenance mode on Graph API outages.
 * Sets a predefined maintenance message that is displayed to users.
 * Does not override manually set maintenance messages.
 */
function ensureGraphFailureMaintenance() {
  if (!isGraphModeEnabled()) {
    return;
  }

  consecutiveGraphFailures++;

  // Only activate maintenance mode after multiple consecutive failures
  if (consecutiveGraphFailures < MAINTENANCE_FAILURE_THRESHOLD) {
    console.log('[Maintenance] Graph API failure %d/%d — not activating maintenance yet',
      consecutiveGraphFailures, MAINTENANCE_FAILURE_THRESHOLD);
    return;
  }

  try {
    const currentMaintenance = configManager.getMaintenanceConfig();

    if (currentMaintenance.enabled) {
      const isAutoMessage = String(currentMaintenance.message || '').startsWith(GRAPH_FAILURE_MAINTENANCE_MESSAGE);
      if (isAutoMessage) {
        autoMaintenanceOwned = true;
        if (currentMaintenance.message !== GRAPH_FAILURE_MAINTENANCE_MESSAGE) {
          configManager.updateMaintenanceConfig(true, GRAPH_FAILURE_MAINTENANCE_MESSAGE).catch((err) => {
            logSanitizedError('Failed to normalize maintenance fallback message:', err);
          });
        }
      }
      return;
    }

    console.log('[Maintenance] %d consecutive Graph API failures — activating maintenance mode',
      consecutiveGraphFailures);
    autoMaintenanceOwned = true;
    configManager.updateMaintenanceConfig(true, GRAPH_FAILURE_MAINTENANCE_MESSAGE).catch((err) => {
      logSanitizedError('Failed to auto-enable maintenance fallback:', err);
    });
  } catch (err) {
    logSanitizedError('Failed to read maintenance config:', err);
  }
}

/**
 * Deactivates automatic maintenance mode after successful Graph synchronization.
 * Only executed if maintenance mode was activated by the controller itself
 * (autoMaintenanceOwned). Manually set maintenance messages remain untouched.
 */
function clearGraphFailureMaintenance() {
  if (consecutiveGraphFailures > 0) {
    console.log('[Maintenance] Graph API recovered after %d consecutive failure(s)', consecutiveGraphFailures);
  }
  consecutiveGraphFailures = 0;

  if (!autoMaintenanceOwned) {
    return;
  }

  try {
    const currentMaintenance = configManager.getMaintenanceConfig();
    if (!currentMaintenance.enabled) {
      autoMaintenanceOwned = false;
      return;
    }

    const isAutoMessage = String(currentMaintenance.message || '').startsWith(GRAPH_FAILURE_MAINTENANCE_MESSAGE);
    if (!isAutoMessage) {
      autoMaintenanceOwned = false;
      return;
    }

    configManager.updateMaintenanceConfig(false, currentMaintenance.message).catch((err) => {
      logSanitizedError('Failed to auto-disable maintenance fallback:', err);
    });
    autoMaintenanceOwned = false;
  } catch (err) {
    logSanitizedError('Failed to read maintenance config:', err);
  }
}

/**
 * Formats a Graph API error into a user-friendly error message.
 * Detects specific error types such as invalid OAuth secrets (AADSTS7000215)
 * and combines HTTP status, error code, and detail message.
 * @param {Error|*} error - The error object to format
 * @returns {string} Formatted, readable error message
 */
function formatSyncError(error) {
  if (!error) {
    return 'Unknown error';
  }

  const baseMessage = error.message || String(error);

  if (String(baseMessage).includes('AADSTS7000215') || String(baseMessage).toLowerCase().includes('invalid_client')) {
    return 'Microsoft Graph authentication failed: invalid OAuth client secret. Update the client secret value in Admin → Operations → Graph-API.';
  }

  const graphMessage = error.body?.error?.message;
  const graphCode = error.body?.error?.code || error.code;
  const statusCode = error.statusCode || error.status;

  const parts = [];
  if (statusCode) {
    parts.push(`HTTP ${statusCode}`);
  }
  if (graphCode) {
    parts.push(graphCode);
  }

  const detail = graphMessage || baseMessage;
  return parts.length > 0 ? `${parts.join(' ')}: ${detail}` : detail;
}

/**
 * Normalizes and validates a display client ID.
 * Allows alphanumeric characters, dots, underscores, colons,
 * hyphens, parentheses, and spaces (3-250 characters).
 * @param {*} value - The value to normalize
 * @returns {string} The normalized client ID or empty string for invalid input
 */
function normalizeDisplayClientId(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  // Allow alphanumeric, dots, underscores, colons, hyphens, parentheses, and spaces
  // This matches the validation in the API endpoint
  if (!/^[a-zA-Z0-9._:\-() ]{3,250}$/.test(normalized)) {
    return '';
  }

  return normalized;
}

/**
 * Sends the current list of connected display clients to all Socket.IO clients.
 * Called on every change to the client list (connection/disconnection).
 */
function emitConnectedClientsUpdated() {
  if (!socketIO) {
    return;
  }

  socketIO.of('/').emit('connectedClientsUpdated', getConnectedDisplayClients());
}

/**
 * Normalizes an IP address for consistent display.
 * Converts IPv6-mapped IPv4 addresses (::ffff:x.x.x.x) to pure IPv4 addresses
 * and detects localhost (::1).
 * @param {string} rawIp - The raw IP address
 * @returns {string} The normalized IP address
 */
function normalizeIpAddress(rawIp) {
  if (!rawIp || rawIp === 'unknown') {
    return 'unknown';
  }

  const ip = String(rawIp).trim();
  
  // Extract IPv4 from IPv6-mapped IPv4 address (::ffff:192.168.1.1 -> 192.168.1.1)
  const ipv6MappedMatch = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (ipv6MappedMatch) {
    return ipv6MappedMatch[1];
  }

  // Also handle format with brackets [::ffff:192.168.1.1]
  const ipv6BracketMatch = ip.match(/^\[?::ffff:(\d+\.\d+\.\d+\.\d+)\]?$/i);
  if (ipv6BracketMatch) {
    return ipv6BracketMatch[1];
  }

  // Handle localhost IPv6 (::1 -> localhost)
  if (ip === '::1' || ip === '[::1]') {
    return 'localhost (::1)';
  }

  return ip;
}

/**
 * Reads the display tracking configuration from the system settings.
 * Determines the tracking mode (client-id or ip-room), the retention duration,
 * and the cleanup interval for disconnected displays.
 * @returns {{mode: string, retentionHours: number, cleanupMinutes: number}} Tracking configuration
 */
function getDisplayTrackingConfig() {
  const systemConfig = configManager.getSystemConfig();
  return {
    mode: systemConfig.displayTrackingMode || 'client-id',
    retentionHours: systemConfig.displayTrackingRetentionHours || 2,
    cleanupMinutes: systemConfig.displayTrackingCleanupMinutes || 5
  };
}

/**
 * Generates a unique identifier for a display based on the tracking mode.
 * In 'ip-room' mode, IP + room/displayType are combined.
 * In 'client-id' mode, the displayClientId provided by the client is used.
 * @param {Object} socket - The Socket.IO socket object
 * @returns {string} The generated display identifier or empty string
 */
function generateDisplayIdentifier(socket) {
  const trackingConfig = getDisplayTrackingConfig();
  
  if (trackingConfig.mode === 'ip-room') {
    // IP + Room based tracking
    const rawIpAddress = socket?.handshake?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
      || socket?.handshake?.headers?.['x-real-ip']
      || socket?.handshake?.address
      || 'unknown';
    const ipAddress = normalizeIpAddress(rawIpAddress);
    
    // Validate and sanitize roomAlias
    const rawRoomAlias = String(socket?.handshake?.query?.roomAlias || '').trim();
    const roomAlias = /^[a-zA-Z0-9 _.\-]{0,100}$/.test(rawRoomAlias) ? rawRoomAlias : '';
    
    // Validate and sanitize displayType
    const rawDisplayType = String(socket?.handshake?.query?.displayType || '').trim().toLowerCase();
    const displayType = /^[a-z0-9_-]{1,50}$/.test(rawDisplayType) ? rawDisplayType : 'unknown';
    
    // Normalize displayType for flightboard components (flightboard, flightboard-navbar, etc.)
    const normalizedDisplayType = displayType.startsWith('flightboard') ? 'flightboard' : displayType;
    
    // Create identifier: ip_room or ip_displayType if no room
    const roomPart = roomAlias || normalizedDisplayType;
    return `${ipAddress}_${roomPart}`;
  } else {
    // Client ID based tracking (default)
    const rawClientId = socket?.handshake?.query?.displayClientId;
    return normalizeDisplayClientId(rawClientId);
  }
}

/**
 * Registers a connected display client in the tracking system.
 * Validates and sanitizes all input data (displayType, roomAlias, IP).
 * Updates existing entries on reconnects.
 * @param {Object} socket - The Socket.IO socket object of the connected client
 */
function registerConnectedClient(socket) {
  const identifier = generateDisplayIdentifier(socket);
  if (!identifier) {
    return;
  }

  // Validate and sanitize displayType
  const rawDisplayType = String(socket?.handshake?.query?.displayType || '').trim().toLowerCase();
  // Only allow alphanumeric, hyphens, and underscores (e.g., "single-room-rpi", "flightboard")
  const displayType = /^[a-z0-9_-]{1,50}$/.test(rawDisplayType) ? rawDisplayType : 'unknown';
  
  // Validate and sanitize roomAlias
  const rawRoomAlias = String(socket?.handshake?.query?.roomAlias || '').trim();
  // Allow alphanumeric, spaces, hyphens, underscores, dots (room names)
  // Max 100 characters to prevent abuse
  const roomAlias = /^[a-zA-Z0-9 _.\-]{0,100}$/.test(rawRoomAlias) ? rawRoomAlias : '';
  
  // Don't register connections without displayType or displayClientId (e.g., admin panel)
  const trackingConfig = getDisplayTrackingConfig();
  if (trackingConfig.mode === 'client-id') {
    // In client-id mode, we need a valid displayClientId
    const rawClientId = socket?.handshake?.query?.displayClientId;
    if (!normalizeDisplayClientId(rawClientId)) {
      return;
    }
  } else {
    // In ip-room mode, we need at least a displayType
    if (!rawDisplayType || displayType === 'unknown') {
      return;
    }
  }
  
  const nowIso = new Date().toISOString();
  
  // Extract IP address from socket
  const rawIpAddress = socket?.handshake?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || socket?.handshake?.headers?.['x-real-ip']
    || socket?.handshake?.address
    || 'unknown';
  
  console.log(`Raw IP address for client ${identifier}: ${rawIpAddress}`);
  const ipAddress = normalizeIpAddress(rawIpAddress);
  console.log(`Normalized IP address for client ${identifier}: ${ipAddress}`);

  const existing = connectedDisplayClients.get(identifier) || {
    clientId: identifier,
    displayType,
    roomAlias,
    ipAddress,
    connectedAt: nowIso,
    lastSeenAt: nowIso,
    socketIds: new Set()
  };

  existing.displayType = displayType || existing.displayType;
  existing.roomAlias = roomAlias || existing.roomAlias;
  existing.ipAddress = ipAddress; // Update IP on reconnect
  existing.lastSeenAt = nowIso;
  existing.socketIds.add(socket.id);
  connectedDisplayClients.set(identifier, existing);
  socket.data.displayIdentifier = identifier;

  emitConnectedClientsUpdated();
}

/**
 * Removes a disconnected display client from the tracking system.
 * Does not delete the client immediately, but schedules a delayed cleanup
 * based on the configured cleanupMinutes setting.
 * @param {Object} socket - The Socket.IO socket object of the disconnected client
 */
function unregisterConnectedClient(socket) {
  const identifier = socket?.data?.displayIdentifier;
  if (!identifier || !connectedDisplayClients.has(identifier)) {
    return;
  }

  const entry = connectedDisplayClients.get(identifier);
  entry.socketIds.delete(socket.id);
  entry.lastSeenAt = new Date().toISOString();

  // Keep disconnected displays for configured retention time before removing them
  if (entry.socketIds.size === 0) {
    // Don't delete immediately, just update lastSeenAt
    connectedDisplayClients.set(identifier, entry);
    
    // Schedule cleanup after configured delay
    const trackingConfig = getDisplayTrackingConfig();
    const cleanupDelayMs = trackingConfig.cleanupMinutes * 60 * 1000;
    
    if (cleanupDelayMs > 0) {
      setTimeout(() => {
        const currentEntry = connectedDisplayClients.get(identifier);
        // Only delete if still disconnected (no sockets)
        if (currentEntry && currentEntry.socketIds.size === 0) {
          const lastSeen = new Date(currentEntry.lastSeenAt);
          const now = new Date();
          const minutesSinceLastSeen = (now - lastSeen) / (60 * 1000);
          
          if (minutesSinceLastSeen >= trackingConfig.cleanupMinutes) {
            connectedDisplayClients.delete(identifier);
            console.log(`Auto-removed disconnected display: ${identifier} (disconnected for ${Math.round(minutesSinceLastSeen)} minutes)`);
            emitConnectedClientsUpdated();
          }
        }
      }, cleanupDelayMs);
    }
  } else {
    connectedDisplayClients.set(identifier, entry);
  }

  emitConnectedClientsUpdated();
}

/**
 * Cleans up outdated display entries based on the configured retention duration.
 * Removes clients whose last contact (lastSeenAt) exceeds the retentionHours.
 */
function cleanupOldDisplays() {
  const trackingConfig = getDisplayTrackingConfig();
  const now = new Date();
  const retentionMs = trackingConfig.retentionHours * 60 * 60 * 1000;
  const cutoffTime = new Date(now.getTime() - retentionMs);
  
  for (const [identifier, entry] of connectedDisplayClients.entries()) {
    const lastSeen = new Date(entry.lastSeenAt);
    if (lastSeen < cutoffTime) {
      connectedDisplayClients.delete(identifier);
      console.log(`Removed old display client: ${identifier} (last seen: ${entry.lastSeenAt}, retention: ${trackingConfig.retentionHours}h)`);
    }
  }
}

/**
 * Returns the list of all connected display clients.
 * Performs a cleanup of outdated entries before returning.
 * @returns {Array<Object>} Sorted list of display clients with connection details
 */
function getConnectedDisplayClients() {
  // Clean up old displays before returning the list
  cleanupOldDisplays();
  
  return Array.from(connectedDisplayClients.values())
    .map((entry) => ({
      clientId: entry.clientId,
      displayType: entry.displayType,
      roomAlias: entry.roomAlias,
      ipAddress: entry.ipAddress,
      connectedAt: entry.connectedAt,
      lastSeenAt: entry.lastSeenAt,
      sockets: entry.socketIds.size
    }))
    .sort((a, b) => a.clientId.localeCompare(b.clientId));
}

/**
 * Sends a Socket.IO event to a specific display client.
 * Sends to all active sockets of the client (a client can have multiple sockets).
 * @param {string} clientId - The client ID of the target display
 * @param {string} eventName - Name of the event to send
 * @param {*} payload - The data to send
 * @returns {boolean} true if the event was sent successfully
 */
function emitToDisplayClient(clientId, eventName, payload) {
  const normalizedClientId = normalizeDisplayClientId(clientId);
  if (!normalizedClientId || !socketIO) {
    return false;
  }

  const entry = connectedDisplayClients.get(normalizedClientId);
  if (!entry || entry.socketIds.size === 0) {
    return false;
  }

  for (const socketId of entry.socketIds) {
    socketIO.of('/').to(socketId).emit(eventName, payload);
  }

  return true;
}

/**
 * Manually removes a display client from the tracking system.
 * Only possible if the client has no active socket connections remaining.
 * @param {string} clientId - The client ID of the display to remove
 * @returns {boolean} true if the client was successfully removed
 */
function removeDisplayClient(clientId) {
  const normalizedClientId = normalizeDisplayClientId(clientId);
  if (!normalizedClientId) {
    return false;
  }

  const entry = connectedDisplayClients.get(normalizedClientId);
  if (!entry) {
    return false;
  }

  // Only allow deletion if no active sockets
  if (entry.socketIds.size > 0) {
    return false;
  }

  connectedDisplayClients.delete(normalizedClientId);
  emitConnectedClientsUpdated();
  console.log(`Manually removed display client: ${normalizedClientId}`);
  return true;
}

/**
 * Distributes room updates efficiently to connected clients:
 * - Single-room clients in a room:alias Socket.IO room receive only their room
 * - All other clients (flightboard, admin) receive the full room array
 * @param {Array<Object>} rooms - Array of updated room data
 */
function broadcastRoomUpdates(rooms) {
  if (!socketIO || !Array.isArray(rooms)) return;

  // Cache room data for serving /api/rooms requests
  lastRoomsCache = rooms;
  lastRoomsCacheTime = Date.now();

  // Build room map by alias for targeted delivery
  const roomsByAlias = {};
  for (const room of rooms) {
    if (room.RoomAlias) {
      roomsByAlias[room.RoomAlias] = room;
    }
  }

  // Send individual room to the respective room-specific Socket.IO room
  for (const [alias, room] of Object.entries(roomsByAlias)) {
    socketIO.of('/').to(`room:${alias}`).emit('updatedRoom', room);
  }

  // Send full array to all clients (flightboard, admin, etc.)
  socketIO.of('/').emit('updatedRooms', rooms);
}

/**
 * Fetches room data from the Microsoft Graph API and distributes it to all clients.
 * Manages the synchronization status, activates/deactivates maintenance mode
 * on errors, and triggers no-show detection.
 * In demo mode, demo data is used instead.
 * @returns {Promise<boolean>} true on successful synchronization
 */
function fetchAndBroadcastRooms() {
  return new Promise((resolve) => {
    if (!socketIO) {
      resolve(false);
      return;
    }

    // Demo mode: broadcast demo data instead of fetching from Graph
    const systemConfig = configManager.getSystemConfig();
    if (systemConfig.demoMode) {
      const demoData = require('./demo-data');
      lastSyncTime = new Date().toISOString();
      lastSyncSuccess = true;
      syncErrorMessage = null;
      broadcastRoomUpdates(demoData.getDemoRoomsSnapshot());
      socketIO.of('/').emit('controllerDone', 'done');
      resolve(true);
      return;
    }

    if (!hasValidGraphCredentials()) {
      lastSyncTime = new Date().toISOString();
      lastSyncSuccess = false;
      syncErrorMessage = 'Microsoft Graph is not fully configured yet. Please complete Graph-API settings in Admin.';

      try {
        const currentMaintenance = configManager.getMaintenanceConfig();
        const isAutoMessage = String(currentMaintenance?.message || '').startsWith(GRAPH_FAILURE_MAINTENANCE_MESSAGE);
        if (currentMaintenance?.enabled && isAutoMessage) {
          configManager.updateMaintenanceConfig(false, currentMaintenance.message).catch((err) => {
            logSanitizedError('Failed to auto-disable maintenance fallback for unconfigured Graph:', err);
          });
        }
      } catch (err) {
        logSanitizedError('Failed to inspect maintenance config:', err);
      }

      autoMaintenanceOwned = false;
      socketIO.of('/').emit('controllerDone', 'done');
      resolve(false);
      return;
    }

    const api = require('./msgraph/rooms.js');

    api(function(err, result) {
      lastSyncTime = new Date().toISOString();

      if (result) {
        if (err) {
          logSanitizedError('Error fetching room data:', err);
          lastSyncSuccess = false;
          syncErrorMessage = formatSyncError(err);
          ensureGraphFailureMaintenance();
          socketIO.of('/').emit('controllerDone', 'done');
          resolve(false);
          return;
        }

        lastSyncSuccess = true;
        syncErrorMessage = null;
        clearGraphFailureMaintenance();
        broadcastRoomUpdates(result);

        releaseNoShowAppointments(result)
          .then((releasedCount) => {
            if (releasedCount > 0) {
              setTimeout(() => {
                fetchAndBroadcastRooms();
              }, 1000);
            }
          })
          .catch((releaseError) => {
            logSanitizedError('No-show auto-release failed:', releaseError);
          });
      } else {
        lastSyncSuccess = false;
        syncErrorMessage = err
          ? formatSyncError(err)
          : 'No data returned from API';
        ensureGraphFailureMaintenance();
      }

      socketIO.of('/').emit('controllerDone', 'done');
      resolve(true);
    }, msalClient);
  });
}

/**
 * Deletes an appointment via the Microsoft Graph API.
 * Acquires a token via the client credentials flow and sends a DELETE request.
 * @param {string} roomEmail - Email address of the room
 * @param {string} appointmentId - ID of the appointment to delete
 * @throws {Error} On failed Graph API request
 */
async function deleteGraphEvent(roomEmail, appointmentId) {
  const tokenRequest = {
    scopes: ['https://graph.microsoft.com/.default']
  };

  const authResult = await msalClient.acquireTokenByClientCredential(tokenRequest);
  const accessToken = authResult.accessToken;
  const deleteUrl = `https://graph.microsoft.com/v1.0/users/${roomEmail}/events/${appointmentId}`;

  const response = await graphFetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Graph delete failed (${response.status}): ${errorText}`);
  }
}

/**
 * Checks all rooms for no-show appointments and automatically releases them.
 * A no-show occurs when an appointment was not confirmed within the check-in window
 * and the autoReleaseNoShow option is enabled.
 * @param {Array<Object>} rooms - Array of room data with appointment information
 * @returns {Promise<number>} Number of released appointments
 */
async function releaseNoShowAppointments(rooms) {
  const bookingConfig = configManager.getBookingConfig();
  const checkInSettings = checkinManager.resolveCheckInSettings(bookingConfig?.checkIn);

  if (!checkInSettings.enabled || !checkInSettings.autoReleaseNoShow) {
    return 0;
  }

  if (!Array.isArray(rooms) || rooms.length === 0) {
    return 0;
  }

  let releasedCount = 0;
  for (const room of rooms) {
    if (!room || !room.Busy || !Array.isArray(room.Appointments) || room.Appointments.length === 0) {
      continue;
    }

    const currentAppointment = room.Appointments[0];
    if (!currentAppointment || !currentAppointment.Id) {
      continue;
    }

    const status = checkinManager.getCheckInStatus({
      roomEmail: room.Email,
      appointmentId: currentAppointment.Id,
      organizer: currentAppointment.Organizer,
      roomName: room.Name,
      startTimestamp: currentAppointment.Start,
      checkInConfig: checkInSettings
    });

    if (!status.required || status.checkedIn || !status.expired) {
      continue;
    }

    try {
      await deleteGraphEvent(room.Email, currentAppointment.Id);

      checkinManager.clearCheckedIn({ roomEmail: room.Email, appointmentId: currentAppointment.Id });
      releasedCount += 1;
      console.log(`No-show auto-release applied for room ${room.Email}, appointment ${currentAppointment.Id}`);
    } catch (error) {
      logSanitizedError('Failed no-show auto-release for room appointment:', error, {
        roomEmail: room.Email,
        appointmentId: currentAppointment.Id
      });
    }
  }

  return releasedCount;
}

/**
 * Returns the current synchronization status.
 * Contains timestamp, success/failure, error message, and stale detection.
 * A sync is considered stale if it is older than 180 seconds.
 * @returns {Object} Synchronization status with lastSyncTime, lastSyncSuccess, syncErrorMessage, etc.
 */
function getSyncStatus() {
  const now = new Date();
  const lastSync = lastSyncTime ? new Date(lastSyncTime) : null;
  const secondsSinceSync = lastSync ? Math.floor((now - lastSync) / 1000) : null;

  return {
    lastSyncTime: lastSyncTime,
    lastSyncSuccess: lastSyncSuccess,
    syncErrorMessage: syncErrorMessage,
    secondsSinceSync: secondsSinceSync,
    isStale: secondsSinceSync !== null && secondsSinceSync > 180,
    hasNeverSynced: lastSyncTime === null
  };
}

/**
 * Returns the cached room data from the last successful Graph API sync.
 * @returns {{rooms: Array<Object>, cacheTime: number}|null} Cached rooms and timestamp, or null if no cache exists
 */
function getLastRoomsCache() {
  if (!lastRoomsCache || !lastRoomsCacheTime) return null;
  return { rooms: lastRoomsCache, cacheTime: lastRoomsCacheTime };
}

/**
 * Calculates the effective polling interval in milliseconds.
 * In webhook mode, the interval is increased to at least 300,000ms (5 minutes),
 * since webhooks are the primary update source and polling only serves as a fallback.
 * @returns {number} Polling interval in milliseconds
 */
function getEffectivePollIntervalMs() {
  const webhookModeEnabled = !!config.graphWebhook?.enabled;
  return webhookModeEnabled
    ? Math.max(config.calendarSearch.pollIntervalMs, 300000)
    : config.calendarSearch.pollIntervalMs;
}

/**
 * Starts the periodic polling loop for room data.
 * Performs an immediate first fetch and then sets up the interval.
 * Existing timers are cleaned up before restarting.
 */
function startPollingLoop() {
  const pollInterval = getEffectivePollIntervalMs();

  fetchAndBroadcastRooms();

  if (pollTimerHandle) {
    clearInterval(pollTimerHandle);
  }

  pollTimerHandle = setInterval(() => {
    fetchAndBroadcastRooms();
  }, pollInterval);

  if (config.graphWebhook?.enabled) {
    console.log(`Graph webhook mode enabled. Polling fallback active every ${pollInterval} ms.`);
  }
}

/**
 * Updates the polling schedule (e.g., after a configuration change).
 * Only restarts the polling loop if the controller is already running.
 * @returns {boolean} true if the schedule was successfully updated
 */
function refreshPollingSchedule() {
  if (!isRunning) {
    return false;
  }

  startPollingLoop();
  return true;
}

/**
 * Triggers an immediate refresh of room data.
 * Can be called from API routes (e.g., after a webhook notification).
 * @returns {Promise<boolean>} true on successful refresh
 */
async function triggerImmediateRefresh() {
  if (!socketIO) {
    return false;
  }

  return fetchAndBroadcastRooms();
}

/**
 * Socket Controller – Manages Socket.IO connections and room data updates.
 * Polls the calendar API at configurable intervals and distributes updates
 * to all connected clients. Uses the Microsoft Graph API for room data.
 *
 * @param {Object} io - Socket.IO server instance
 */
module.exports = function(io) {
  socketIO = io;

  // Pass Socket.IO instance to the config manager for real-time configuration updates
  configManager.setSocketIO(io);

  // Run cleanup of outdated display entries every 24 hours
  setInterval(() => {
    cleanupOldDisplays();
  }, 24 * 60 * 60 * 1000);

  /**
   * Handles new Socket.IO connections.
   * Starts the API polling loop on the first connection.
   */
  io.of('/').on('connection', function(socket) {
    const clientIp = socket.handshake.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
      || socket.handshake.address || 'unknown';
    const displayClientId = socket.handshake.query?.displayClientId || 'none';
    const displayType = socket.handshake.query?.displayType || 'none';
    console.log(`[Socket] Client connected: ip=${clientIp}, displayClientId=${displayClientId}, displayType=${displayType}, transport=${socket.conn?.transport?.name || 'unknown'}`);
    registerConnectedClient(socket);

    // Have the client join the room-specific Socket.IO room for targeted updates
    const rawRoomAlias = String(socket.handshake.query?.roomAlias || '').trim();
    const roomAlias = /^[a-zA-Z0-9 _.\-]{0,100}$/.test(rawRoomAlias) ? rawRoomAlias : '';
    if (roomAlias) {
      socket.join(`room:${roomAlias}`);
    }

    // Start API polling loop only once (on the first client)
    if (!isRunning) {
    startPollingLoop();
    }

    isRunning = true;

    // Handle request for server-generated identifier
    socket.on('request-identifier', function(callback) {
      const identifier = socket?.data?.displayIdentifier;
      console.log(`[Socket] Client requested identifier: ${identifier}`);
      if (typeof callback === 'function') {
        callback(identifier || null);
      }
    });

    // Process heartbeat messages to update lastSeenAt
    socket.on('display-heartbeat', function() {
      const identifier = socket?.data?.displayIdentifier;
      if (identifier && connectedDisplayClients.has(identifier)) {
        const entry = connectedDisplayClients.get(identifier);
        entry.lastSeenAt = new Date().toISOString();
        connectedDisplayClients.set(identifier, entry);
      }
    });

    // Handle client disconnection with reason logging
    socket.on('disconnect', function(reason) {
      const identifier = socket?.data?.displayIdentifier || 'unregistered';
      console.log(`[Socket] Client disconnected: identifier=${identifier}, reason=${reason}, ip=${clientIp}`);
      recentDisconnects.push({
        identifier,
        reason,
        ip: clientIp,
        displayType,
        timestamp: new Date().toISOString()
      });
      if (recentDisconnects.length > MAX_DISCONNECT_LOG) {
        recentDisconnects.shift();
      }
      unregisterConnectedClient(socket);
    });
  });

  // Export sync status getters for API routes
  module.exports.getSyncStatus = getSyncStatus;
  module.exports.triggerImmediateRefresh = triggerImmediateRefresh;
  module.exports.refreshPollingSchedule = refreshPollingSchedule;
  module.exports.refreshMsalClient = refreshMsalClient;
  module.exports.getConnectedDisplayClients = getConnectedDisplayClients;
  module.exports.emitToDisplayClient = emitToDisplayClient;
  module.exports.removeDisplayClient = removeDisplayClient;
  module.exports.getRecentDisconnects = function() { return [...recentDisconnects]; };
  module.exports.getLastRoomsCache = getLastRoomsCache;
};

module.exports.getSyncStatus = getSyncStatus;
module.exports.triggerImmediateRefresh = triggerImmediateRefresh;
module.exports.refreshPollingSchedule = refreshPollingSchedule;
module.exports.refreshMsalClient = refreshMsalClient;
module.exports.getConnectedDisplayClients = getConnectedDisplayClients;
module.exports.emitToDisplayClient = emitToDisplayClient;
module.exports.removeDisplayClient = removeDisplayClient;
module.exports.getRecentDisconnects = function() { return []; };
module.exports.getLastRoomsCache = getLastRoomsCache;
