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


// configuration ===============================================================
const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'"],
			imgSrc: ["'self'", 'data:', 'https:', 'http:'],
			connectSrc: ["'self'", 'ws:', 'wss:'],
			fontSrc: ["'self'", 'data:'],
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
		return callback(null, { origin: true });
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
app.use(express.static(`${__dirname}/ui-react/build`));

app.set('trust proxy', parseTrustProxySetting(process.env.TRUST_PROXY));

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Read the .env-file
require('dotenv').config();

// Validate startup configuration and log actionable diagnostics
const startupReport = validateStartupConfig(config);
printStartupValidation(startupReport, config.startupValidation.strict);

// Initialize WiFi configuration
const initWiFi = require('./app/init-wifi');
initWiFi().catch(err => console.error('WiFi initialization error:', err));

// routes ======================================================================
require("./app/routes.js")(app);

// launch ======================================================================
const port = process.env.PORT || 8080;

const theserver = app.listen(port, function() {
	// call controller functions -------------------------------------------------
	const io = require('socket.io')(theserver);

	// controller if using room lists
	const controller = require('./app/socket-controller.js')(io);

	// log something so we know the server is working correctly
	console.log(`Started on port: ${port}`);
});

