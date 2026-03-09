const msal = require('@azure/msal-node');
const cacheLocation = './data/cache.json';
const cachePlugin = require('../app/msgraph/cachePlugin')(cacheLocation);

// Read the .env-file
require('dotenv').config();

function extractTenantIdFromAuthority(authorityValue) {
	const raw = String(authorityValue || '').trim();
	if (!raw) {
		return '';
	}

	try {
		const parsed = new URL(raw);
		const host = String(parsed.hostname || '').toLowerCase();
		if (!host.includes('login.microsoftonline.com')) {
			return '';
		}
		const pathPart = String(parsed.pathname || '').split('/').filter(Boolean)[0] || '';
		return String(pathPart).trim();
	} catch (error) {
		if (raw.includes('login.microsoftonline.com/')) {
			const afterDomain = raw.split('login.microsoftonline.com/')[1] || '';
			const firstSegment = afterDomain.split(/[/?#]/)[0] || '';
			return String(firstSegment).trim();
		}
		if (raw.includes('://')) {
			return '';
		}
		if (raw.includes('/')) {
			return String(raw).split('/').filter(Boolean)[0] || '';
		}
		return raw;
	}
}

function normalizeOAuthAuthorityFromEnv(authorityValue) {
	const tenantId = extractTenantIdFromAuthority(authorityValue);
	if (!tenantId) {
		return 'OAUTH_AUTHORITY_NOT_SET';
	}
	return `https://login.microsoftonline.com/${tenantId}`;
}

function normalizeApiTokenFromEnv(value) {
	const normalized = String(value || '').trim();
	if (!normalized) {
		return '';
	}
	return normalized;
}

function parseSidebarUpcomingMeetingsCountFromEnv(value) {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed)) {
		return 3;
	}

	return Math.min(Math.max(parsed, 1), 10);
}

function parseIntWithMin(value, fallback, minValue = 0) {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}
	return Math.max(parsed, minValue);
}

// expose our config directly to our application using module.exports
module.exports = {
	exchange: {
		// this user MUST have full access to all the room accounts
		username: process.env.EWS_USERNAME ? process.env.EWS_USERNAME : 'EWS_USERNAME_NOT_SET',
		password: process.env.EWS_PASSWORD ? process.env.EWS_PASSWORD : 'EWS_PASSWORD_NOT_SET',
		// url for the ews-api on the exchange-server
		uri: process.env.EWS_URI ? process.env.EWS_URI : 'https://outlook.office365.com/EWS/Exchange.asmx'
	},
	// Configuration for the msgraph-sdk
	msalConfig: {
		auth: {
			clientId: process.env.OAUTH_CLIENT_ID ? process.env.OAUTH_CLIENT_ID : 'OAUTH_CLIENT_ID_NOT_SET',
			authority: process.env.OAUTH_AUTHORITY
				? normalizeOAuthAuthorityFromEnv(process.env.OAUTH_AUTHORITY)
				: 'OAUTH_AUTHORITY_NOT_SET',
			clientSecret: process.env.OAUTH_CLIENT_SECRET
				? process.env.OAUTH_CLIENT_SECRET
				: 'OAUTH_CLIENT_SECRET_NOT_SET'
		},

		/*	cache: {
			cachePlugin
			},*/

		system: {
			loggerOptions: {
				// TODO: Better logging / other options?
				loggerCallback(loglevel, message, containsPii) {
					console.log(message);
				},
				piiLoggingEnabled: false,
				logLevel: msal.LogLevel.Error
			}
		}
	},
	// Search-settings to use when retrieving data from the calendars
	calendarSearch: {
		useGraphAPI: true,
		maxDays: process.env.SEARCH_MAXDAYS ? process.env.SEARCH_MAXDAYS : 10,
		maxRoomLists: process.env.SEARCH_MAXROOMLISTS ? process.env.SEARCH_MAXROOMLISTS : 10,
		maxRooms: process.env.SEARCH_MAXROOMS ? process.env.SEARCH_MAXROOMS : 20,
		maxItems: process.env.SEARCH_MAXITEMS ? process.env.SEARCH_MAXITEMS : 6,
		pollIntervalMs: process.env.SEARCH_POLL_INTERVAL_MS ? Math.max(parseInt(process.env.SEARCH_POLL_INTERVAL_MS, 10), 5000) : 15000
	},

	startupValidation: {
		strict: process.env.STARTUP_VALIDATION_STRICT === 'true'
	},

	systemDefaults: {
		exposeDetailedErrors: process.env.EXPOSE_DETAILED_ERRORS === 'true',
		graphFetchTimeoutMs: parseIntWithMin(process.env.GRAPH_FETCH_TIMEOUT_MS, 10000, 1000),
		graphFetchRetryAttempts: parseIntWithMin(process.env.GRAPH_FETCH_RETRY_ATTEMPTS, 2, 0),
		graphFetchRetryBaseMs: parseIntWithMin(process.env.GRAPH_FETCH_RETRY_BASE_MS, 250, 50),
		hstsMaxAge: parseIntWithMin(process.env.HSTS_MAX_AGE, 31536000, 0),
		rateLimitMaxBuckets: parseIntWithMin(process.env.RATE_LIMIT_MAX_BUCKETS, 10000, 1000)
	},

	rateLimit: {
		apiWindowMs: process.env.RATE_LIMIT_API_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_API_WINDOW_MS, 10) : 60000,
		apiMax: process.env.RATE_LIMIT_API_MAX ? parseInt(process.env.RATE_LIMIT_API_MAX, 10) : 300,
		writeWindowMs: process.env.RATE_LIMIT_WRITE_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WRITE_WINDOW_MS, 10) : 60000,
		writeMax: process.env.RATE_LIMIT_WRITE_MAX ? parseInt(process.env.RATE_LIMIT_WRITE_MAX, 10) : 60,
		authWindowMs: process.env.RATE_LIMIT_AUTH_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10) : 60000,
		authMax: process.env.RATE_LIMIT_AUTH_MAX ? parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) : 30,
		bookingWindowMs: process.env.RATE_LIMIT_BOOKING_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_BOOKING_WINDOW_MS, 10) : 60000,
		bookingMax: process.env.RATE_LIMIT_BOOKING_MAX ? parseInt(process.env.RATE_LIMIT_BOOKING_MAX, 10) : 10
	},

	graphWebhook: {
		enabled: process.env.GRAPH_WEBHOOK_ENABLED === 'true',
		clientState: process.env.GRAPH_WEBHOOK_CLIENT_STATE || null,
		allowedIps: process.env.GRAPH_WEBHOOK_ALLOWED_IPS
			? process.env.GRAPH_WEBHOOK_ALLOWED_IPS.split(',').map(ip => ip.trim()).filter(Boolean)
			: []
	},

	// API security token
	apiToken: normalizeApiTokenFromEnv(process.env.API_TOKEN),

	// WiFi default configuration
	wifiDefaults: {
		ssid: process.env.WIFI_SSID || 'Guest WiFi',
		password: process.env.WIFI_PASSWORD || ''
	},

	// Logo default configuration
	logoDefaults: {
		logoDarkUrl: process.env.LOGO_DARK_URL || '/img/logo-dark.svg',
		logoLightUrl: process.env.LOGO_LIGHT_URL || '/img/logo-light.svg'
	},

	// Sidebar default configuration
	sidebarDefaults: {
		showWiFi: process.env.SIDEBAR_SHOW_WIFI === 'true' || process.env.SIDEBAR_SHOW_WIFI === undefined,
		showUpcomingMeetings: process.env.SIDEBAR_SHOW_UPCOMING === 'true',
		showMeetingTitles: process.env.SIDEBAR_SHOW_TITLES === 'true',
		upcomingMeetingsCount: parseSidebarUpcomingMeetingsCountFromEnv(process.env.SIDEBAR_UPCOMING_COUNT)
	},

	// Booking feature configuration
	bookingDefaults: {
		enableBooking: process.env.ENABLE_BOOKING === 'true' || process.env.ENABLE_BOOKING === undefined,
		enableExtendMeeting: false,
		extendMeetingUrlAllowlist: [],
		roomFeatureFlags: {},
		roomGroupFeatureFlags: {}
	},

	checkIn: {
		enabled: process.env.CHECKIN_ENABLED !== 'false',
		requiredForExternalMeetings: process.env.CHECKIN_REQUIRED_FOR_EXTERNAL !== 'false',
		earlyCheckInMinutes: process.env.CHECKIN_EARLY_MINUTES ? Math.max(parseInt(process.env.CHECKIN_EARLY_MINUTES, 10), 0) : 5,
		windowMinutes: process.env.CHECKIN_WINDOW_MINUTES ? Math.max(parseInt(process.env.CHECKIN_WINDOW_MINUTES, 10), 1) : 10,
		autoReleaseNoShow: process.env.CHECKIN_AUTO_RELEASE_NO_SHOW !== 'false'
	},

	maintenanceDefaults: {
		enabled: process.env.MAINTENANCE_MODE === 'true',
		message: process.env.MAINTENANCE_MESSAGE || 'System is in maintenance mode. Please try again later.'
	}
};
