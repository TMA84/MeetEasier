/**
* @file server.js
* @description Main server file of the application. Configures and starts an Express HTTP server
* with security middleware (Helmet, CORS), static file serving, body parsing,
* Socket.IO real-time communication and MQTT integration. Also manages
* startup validation, HSTS headers and WiFi initialization.
*/

// Setup =======================================================================
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const _reload = require('reload');
const app = express();
const config = require('./config/config');
const _configManager = require('./app/config-manager');
const { validateStartupConfig, printStartupValidation } = require('./app/startup-validation');

/**
* Parses the allowed CORS origins from a comma-separated string.
* Normalizes the values (lowercase, removes trailing slashes).
* @param {string|undefined|null} rawValue - Raw value from the environment variable
* @returns {string[]} Array of normalized origin strings
*/
function parseAllowedOrigins(rawValue) {
  if (rawValue === undefined || rawValue === null) {
    return [];
  }

  return String(rawValue)
    .split(',')
    .map(origin => origin.trim().toLowerCase().replace(/\/$/, ''))
    .filter(Boolean);
}

/**
* Parses the publicly allowed CORS origins.
* Delegates to parseAllowedOrigins with identical logic.
* @param {string|undefined|null} rawValue - Raw value from the environment variable
* @returns {string[]} Array of normalized origin strings
*/
function parsePublicAllowedOrigins(rawValue) {
  return parseAllowedOrigins(rawValue);
}

/**
* Checks whether a request is a public CORS path.
* Only GET requests to defined public endpoints are considered public.
* @param {import('express').Request} req - The Express request object
* @returns {boolean} true if the path is publicly accessible
*/
function isPublicCorsPath(req) {
  if (req.method !== 'GET') {
    return false;
  }

  // List of all publicly accessible API paths (read-only)
  const publicPaths = new Set([
    '/rooms',
    '/roomlists',
    '/wifi',
    '/logo',
    '/sidebar',
    '/booking-config',
    '/colors',
    '/heartbeat',
    '/sync-status',
    '/health',
    '/readiness',
    '/maintenance-status',
    '/i18n'
  ]);

  return publicPaths.has(req.path);
}

/**
* Checks whether the Origin header comes from the same host as the request.
* Compares the host of the Origin header with the Host header of the request.
* @param {string} origin - The Origin header value
* @param {import('express').Request} req - The Express request object
* @returns {boolean} true if Origin and Host match
*/
function isSameOrigin(origin, req) {
  try {
    const parsedOrigin = new URL(origin);
    return String(parsedOrigin.host || '').toLowerCase() === String(req.get('host') || '').toLowerCase();
  } catch (error) {
    return false;
  }
}

/**
* Parses the trust proxy setting from an environment variable.
* Supports boolean values ('true'/'false', '1'/'0'), numeric values
* (number of trusted proxies) and string values (e.g. IP addresses).
* @param {string|undefined} rawValue - Raw value from the environment variable
* @returns {boolean|number|string} Parsed trust proxy value
*/
function parseTrustProxySetting(rawValue) {
  if (rawValue === undefined) {
    return false;
  }

  const normalized = String(rawValue).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }

  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  // Numeric value: number of trusted proxy hops
  if (/^\d+$/.test(normalized)) {
    return parseInt(normalized, 10);
  }

  // Otherwise return raw value (e.g. IP address or subnet)
  return rawValue;
}

/**
* Parses the body limit for incoming HTTP requests.
* @param {string|undefined} rawValue - Raw value (e.g. '1mb', '500kb')
* @param {string} fallback - Default value if no valid value is present
* @returns {string} The parsed body limit
*/
function parseBodyLimit(rawValue, fallback = '1mb') {
  const normalized = String(rawValue || '').trim();
  return normalized || fallback;
}

/**
* Parses the parameter limit for URL-encoded request bodies.
* @param {string|undefined} rawValue - Raw value as a string number
* @param {number} fallback - Default value if invalid or not present
* @returns {number} The parsed parameter limit (must be positive)
*/
function parseParameterLimit(rawValue, fallback = 1000) {
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

/**
* Parses the HSTS max-age value for the Strict-Transport-Security header.
* @param {string|undefined} rawValue - Raw value in seconds
* @param {number} fallback - Default value in seconds (default: 1 year = 31536000)
* @returns {number} The parsed max-age value (must be non-negative)
*/
function parseHstsMaxAge(rawValue, fallback = 31536000) {
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}


// Configuration ===============================================================

// Load and normalize CORS origins from environment variables
const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
const publicAllowedOrigins = parsePublicAllowedOrigins(process.env.PUBLIC_ALLOWED_ORIGINS);

// Determine whether to enable upgrade-insecure-requests in the CSP.
// Disabled for plain HTTP (local development) to prevent
// Safari from enforcing HTTPS.
const cspUpgradeInsecureRequests = String(process.env.CSP_UPGRADE_INSECURE || '').toLowerCase() === 'true'
  ? []
  : null;

// Helmet security middleware: Sets various HTTP headers to protect the application
app.use(helmet({
  hsts: false, // HSTS is configured manually further below
  frameguard: { action: 'deny' }, // Prevents embedding in iframes (clickjacking protection)
  noSniff: true, // Prevents MIME type sniffing
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'http:'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'https://fonts.gstatic.com'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: cspUpgradeInsecureRequests
    }
  },
  referrerPolicy: { policy: 'no-referrer' } // No Referrer header on navigations
}));

/**
* CORS delegate for API endpoints.
* Dynamically decides whether an origin is allowed based on:
* - Public paths: Allows same-origin, public and private origins
* - Private paths: Allows only same-origin and explicitly configured origins
* @param {import('express').Request} req - The Express request object
* @param {Function} callback - CORS callback with configuration object
*/
const apiCorsOptionsDelegate = (req, callback) => {
  const origin = req.headers.origin;

  // No Origin header present (e.g. direct server requests)
  if (!origin) {
    return callback(null, { origin: false });
  }

  // Public paths: Extended origin check
  if (isPublicCorsPath(req)) {
    const normalizedOrigin = String(origin).trim().toLowerCase().replace(/\/$/, '');
    const allowedPublic = isSameOrigin(origin, req)
      || publicAllowedOrigins.includes(normalizedOrigin)
      || allowedOrigins.includes(normalizedOrigin);

    return callback(null, { origin: allowedPublic });
  }

  // Private paths: Strict origin check with credentials
  const normalizedOrigin = String(origin).trim().toLowerCase().replace(/\/$/, '');
  const allowed = isSameOrigin(origin, req) || allowedOrigins.includes(normalizedOrigin);

  return callback(null, {
    origin: allowed,
    credentials: allowed
  });
};

// Enable CORS middleware for API routes and preflight requests
app.use('/api', cors(apiCorsOptionsDelegate));
app.options('/api/*', cors(apiCorsOptionsDelegate));

// Serve static files from the 'static' folder (JS, CSS, images, etc.)
app.use(express.static("static", {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // styles.css is versioned via ?v=hash cache busting — browser must revalidate each time
    if (filePath.endsWith('styles.css')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Serve React build with custom cache control
app.use(express.static(`${__dirname}/ui-react/build`, {
  setHeaders: (res, path) => {
    // Do not cache HTML files (index.html, etc.)
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // Cache assets with hash in filename for 1 year (immutable)
    else if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Configure trust proxy setting (important for correct IP detection behind reverse proxies)
app.set('trust proxy', parseTrustProxySetting(process.env.TRUST_PROXY));

// Middleware: Manually set HSTS header for HTTPS connections
app.use((req, res, next) => {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  const isHttpsRequest = req.secure || forwardedProto.includes('https');
  if (!isHttpsRequest) {
    return next();
  }

  const configuredMaxAge = parseHstsMaxAge(config.systemDefaults?.hstsMaxAge, 31536000);
  if (configuredMaxAge > 0) {
    res.setHeader('Strict-Transport-Security', `max-age=${configuredMaxAge}; includeSubDomains`);
  }

  next();
});

// Parse JSON and URL-encoded request bodies
const requestBodyLimit = parseBodyLimit(process.env.REQUEST_BODY_LIMIT, '1mb');
const urlencodedParameterLimit = parseParameterLimit(process.env.URLENCODED_PARAMETER_LIMIT, 1000);

app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({
  extended: true,
  limit: requestBodyLimit,
  parameterLimit: urlencodedParameterLimit
}));

// Load environment variables from the .env file
require('dotenv').config();

// Validate startup configuration and output diagnostic information
const startupReport = validateStartupConfig(config);
printStartupValidation(startupReport, config.startupValidation.strict);

// Initialize WiFi configuration
const initWiFi = require('./app/init-wifi');
initWiFi().catch(err => console.error('WiFi initialization error:', err));

// Global error handling: Log unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

// Global error handling: Log uncaught exceptions and terminate process
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Routes ======================================================================
require("./app/routes.js")(app);

// Start server ================================================================
const port = process.env.PORT || 8080;

const theserver = app.listen(port, function() {
  // Initialize Socket.IO for real-time communication
  // Generous timeouts for Raspberry Pi displays that may experience
  // memory pressure and delayed heartbeats during long-running operation.
  const io = require('socket.io')(theserver, {
    pingTimeout: 60000,      // 60s before considering a client disconnected
    pingInterval: 25000,     // 25s between pings
    connectTimeout: 45000,   // 45s for initial connection
  });

  // Socket.IO middleware — allow all connections.
  // IP whitelist is only enforced on sensitive HTTP endpoints (/api/rooms, bookings, etc.).
  // Socket.IO only receives broadcast updates (room data, configuration changes)
  // and is safe for all clients.
  io.use((socket, next) => {
    next();
  });

  // Initialize socket controller for room list management
  const _controller = require('./app/socket-controller.js')(io);

  // Initialize MQTT client and power bridge
  const mqttClient = require('./app/mqtt-client');
  const mqttPowerBridge = require('./app/touchkio');
  
  try {
    mqttClient.init();
    mqttPowerBridge.init();
    console.log('[MQTT] Client and power bridge initialized');
  } catch (error) {
    console.error('[MQTT] Failed to initialize:', error);
  }

  // Confirmation that the server started successfully
  console.log(`Started on port: ${port}`);
});

