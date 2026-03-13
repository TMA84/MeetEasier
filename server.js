// server.js

// set up ======================================================================
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const reload = require('reload');
const app = express();
const config = require('./config/config');
require('./app/config-manager');
const { validateStartupConfig, printStartupValidation } = require('./app/startup-validation');

function parseAllowedOrigins(rawValue) {
	if (rawValue === undefined || rawValue === null) {
		return [];
	}

	return String(rawValue)
		.split(',')
		.map(origin => origin.trim().toLowerCase().replace(/\/$/, ''))
		.filter(Boolean);
}

function parsePublicAllowedOrigins(rawValue) {
	return parseAllowedOrigins(rawValue);
}

function isPublicCorsPath(req) {
	if (req.method !== 'GET') {
		return false;
	}

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

function isSameOrigin(origin, req) {
	try {
		const parsedOrigin = new URL(origin);
		return String(parsedOrigin.host || '').toLowerCase() === String(req.get('host') || '').toLowerCase();
	} catch (error) {
		return false;
	}
}

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

	if (/^\d+$/.test(normalized)) {
		return parseInt(normalized, 10);
	}

	return rawValue;
}

function parseBodyLimit(rawValue, fallback = '1mb') {
	const normalized = String(rawValue || '').trim();
	return normalized || fallback;
}

function parseParameterLimit(rawValue, fallback = 1000) {
	const parsed = Number.parseInt(rawValue, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return fallback;
	}
	return parsed;
}

function parseHstsMaxAge(rawValue, fallback = 31536000) {
	const parsed = Number.parseInt(rawValue, 10);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return fallback;
	}
	return parsed;
}


// configuration ===============================================================
const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
const publicAllowedOrigins = parsePublicAllowedOrigins(process.env.PUBLIC_ALLOWED_ORIGINS);

app.use(helmet({
	hsts: false,
	frameguard: { action: 'deny' },
	noSniff: true,
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
			baseUri: ["'self'"]
		}
	},
	referrerPolicy: { policy: 'no-referrer' }
}));

const apiCorsOptionsDelegate = (req, callback) => {
	const origin = req.headers.origin;

	if (!origin) {
		return callback(null, { origin: false });
	}

	if (isPublicCorsPath(req)) {
		const normalizedOrigin = String(origin).trim().toLowerCase().replace(/\/$/, '');
		const allowedPublic = isSameOrigin(origin, req)
			|| publicAllowedOrigins.includes(normalizedOrigin)
			|| allowedOrigins.includes(normalizedOrigin);

		return callback(null, { origin: allowedPublic });
	}

	const normalizedOrigin = String(origin).trim().toLowerCase().replace(/\/$/, '');
	const allowed = isSameOrigin(origin, req) || allowedOrigins.includes(normalizedOrigin);

	return callback(null, {
		origin: allowed,
		credentials: allowed
	});
};

app.use('/api', cors(apiCorsOptionsDelegate));
app.options('/api/*', cors(apiCorsOptionsDelegate));

// use public folder for js, css, imgs, etc
app.use(express.static("static"));

// Serve React build with proper cache control
app.use(express.static(`${__dirname}/ui-react/build`, {
  setHeaders: (res, path) => {
    // Don't cache HTML files (index.html, etc.)
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // Cache assets with hash in filename for 1 year
    else if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

app.set('trust proxy', parseTrustProxySetting(process.env.TRUST_PROXY));

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

// Parse JSON request bodies
const requestBodyLimit = parseBodyLimit(process.env.REQUEST_BODY_LIMIT, '1mb');
const urlencodedParameterLimit = parseParameterLimit(process.env.URLENCODED_PARAMETER_LIMIT, 1000);

app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({
	extended: true,
	limit: requestBodyLimit,
	parameterLimit: urlencodedParameterLimit
}));

// Read the .env-file
require('dotenv').config();

// Validate startup configuration and log actionable diagnostics
const startupReport = validateStartupConfig(config);
printStartupValidation(startupReport, config.startupValidation.strict);

// Initialize WiFi configuration
const initWiFi = require('./app/init-wifi');
initWiFi().catch(err => console.error('WiFi initialization error:', err));

process.on('unhandledRejection', (reason) => {
	console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
	console.error('Uncaught exception:', error);
	process.exit(1);
});

// routes ======================================================================
require("./app/routes.js")(app);

// launch ======================================================================
const port = process.env.PORT || 8080;

const theserver = app.listen(port, function() {
	// call controller functions -------------------------------------------------
	const io = require('socket.io')(theserver);

	// controller if using room lists
	const controller = require('./app/socket-controller.js')(io);

	// Initialize MQTT Client
	const mqttClient = require('./app/mqtt-client');
	const mqttPowerBridge = require('./app/touchkio');
	
	try {
		mqttClient.init();
		mqttPowerBridge.init();
		console.log('[MQTT] Client and power bridge initialized');
	} catch (error) {
		console.error('[MQTT] Failed to initialize:', error);
	}

	// log something so we know the server is working correctly
	console.log(`Started on port: ${port}`);
});

