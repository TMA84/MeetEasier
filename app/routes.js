const msal = require('@azure/msal-node');
const config = require('../config/config');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const roomlistAliasHelper = require('./roomlist-alias-helper');
const configManager = require('./config-manager');
const { createRateLimiter } = require('./rate-limiter');
const { appendAuditLog, getAuditLogs } = require('./audit-logger');
const checkinManager = require('./checkin-manager');

let msalClient = null;

function refreshMsalClient() {
	msalClient = new msal.ConfidentialClientApplication(config.msalConfig);
	return msalClient;
}

refreshMsalClient();

// Check if Calendars.ReadWrite permission is available
let hasCalendarWritePermission = null;
let graphAuthHealthCache = {
	checkedAt: 0,
	result: null
};

function isEnvDefined(name) {
	return process.env[name] !== undefined;
}

function isOAuthEnvConfigured() {
	return isEnvDefined('OAUTH_CLIENT_ID')
		|| isEnvDefined('OAUTH_AUTHORITY')
		|| isEnvDefined('OAUTH_CLIENT_SECRET');
}

function isSystemEnvConfigured() {
	return isEnvDefined('STARTUP_VALIDATION_STRICT')
		|| isEnvDefined('GRAPH_WEBHOOK_ENABLED')
		|| isEnvDefined('GRAPH_WEBHOOK_CLIENT_STATE')
		|| isEnvDefined('GRAPH_WEBHOOK_ALLOWED_IPS');
}

function isMaintenanceEnvConfigured() {
	return isEnvDefined('MAINTENANCE_MODE')
		|| isEnvDefined('MAINTENANCE_MESSAGE');
}

function isTranslationApiEnvConfigured() {
	return isEnvDefined('AUTO_TRANSLATE_ENABLED')
		|| isEnvDefined('AUTO_TRANSLATE_URL')
		|| isEnvDefined('AUTO_TRANSLATE_API_KEY')
		|| isEnvDefined('AUTO_TRANSLATE_TIMEOUT_MS');
}

function normalizeAuthToken(rawToken) {
	if (typeof rawToken !== 'string') {
		return '';
	}

	return rawToken.replace(/^Bearer\s+/i, '').trim();
}

function secureTokenEquals(providedToken, expectedToken) {
	const providedBuffer = Buffer.from(String(providedToken || ''), 'utf8');
	const expectedBuffer = Buffer.from(String(expectedToken || ''), 'utf8');

	if (!providedBuffer.length || !expectedBuffer.length || providedBuffer.length !== expectedBuffer.length) {
		return false;
	}

	return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

function hasValidApiToken(req) {
	const token = req.headers['authorization'] || req.headers['x-api-token'];
	const providedToken = normalizeAuthToken(token);
	const expectedToken = configManager.getEffectiveApiToken();

	return secureTokenEquals(providedToken, expectedToken);
}

function hasValidWiFiApiToken(req) {
	const token = req.headers['authorization'] || req.headers['x-api-token'];
	const providedToken = normalizeAuthToken(token);
	if (!providedToken) {
		return false;
	}

	const adminToken = configManager.getEffectiveApiToken();
	if (secureTokenEquals(providedToken, adminToken)) {
		return true;
	}

	const wifiToken = configManager.getEffectiveWifiApiToken
		? configManager.getEffectiveWifiApiToken()
		: '';
	return secureTokenEquals(providedToken, wifiToken);
}

function getClientIp(req) {
	return req.ip || req.socket?.remoteAddress || 'unknown';
}

function isWebhookIpAllowed(req) {
	if (!Array.isArray(config.graphWebhook.allowedIps) || config.graphWebhook.allowedIps.length === 0) {
		return true;
	}

	const ip = getClientIp(req);
	return config.graphWebhook.allowedIps.includes(ip);
}

function hasWebhookSecurityConfig() {
	if (!config.graphWebhook.enabled) {
		return true;
	}

	const hasClientState = !!String(config.graphWebhook.clientState || '').trim();
	const hasAllowedIps = Array.isArray(config.graphWebhook.allowedIps) && config.graphWebhook.allowedIps.length > 0;

	return hasClientState && hasAllowedIps;
}

function normalizeRoomKey(roomEmail) {
	return String(roomEmail || '').trim().toLowerCase();
}

function normalizeRoomGroupKey(roomGroup) {
	return String(roomGroup || '').trim().toLowerCase();
}

function normalizeLanguageCode(value) {
	return String(value || '').trim().toLowerCase();
}

function getAutoTranslateConfig() {
	const runtimeConfig = configManager.getTranslationApiConfig();
	const runtimeSecret = configManager.getTranslationApiRuntimeConfig
		? configManager.getTranslationApiRuntimeConfig()
		: null;
	const hasApiKey = !!String(runtimeSecret?.apiKey || '').trim();

	return {
		enabled: runtimeConfig.enabled && hasApiKey,
		url: runtimeConfig.url,
		apiKey: runtimeSecret?.apiKey || '',
		timeoutMs: runtimeConfig.timeoutMs
	};
}

async function translateTextBatch(texts, sourceLanguage, targetLanguage) {
	if (!Array.isArray(texts) || texts.length === 0) {
		return [];
	}

	const source = normalizeLanguageCode(sourceLanguage) || 'en';
	const target = normalizeLanguageCode(targetLanguage);
	if (!target || source === target) {
		return texts.map((text) => String(text || ''));
	}

	const translatorConfig = getAutoTranslateConfig();
	if (!translatorConfig.enabled) {
		return texts.map((text) => String(text || ''));
	}

	const sourceTexts = texts.map((text) => String(text || ''));
	const sourceCandidates = Array.from(new Set([source, source.split('-')[0], 'auto'].filter(Boolean)));
	const targetCandidates = Array.from(new Set([target, target.split('-')[0]].filter(Boolean)));

	const parseTranslatedPayload = (payload, originals) => {
		if (Array.isArray(payload?.data?.translations)) {
			return payload.data.translations.map((entry, index) => String(entry?.translatedText || originals[index] || ''));
		}

		if (Array.isArray(payload)) {
			return payload.map((entry, index) => String(entry?.translatedText || originals[index] || ''));
		}

		if (Array.isArray(payload?.translatedText)) {
			return payload.translatedText.map((entry, index) => String(entry || originals[index] || ''));
		}

		if (typeof payload?.translatedText === 'string' && originals.length === 1) {
			return [payload.translatedText];
		}

		throw new Error('Unexpected translation payload');
	};

	const requestTranslation = async (q, sourceCode, targetCode) => {
		const abortController = new AbortController();
		const timeout = setTimeout(() => abortController.abort(), translatorConfig.timeoutMs);

		try {
			const isGoogleTranslateApi = /translation\.googleapis\.com/i.test(String(translatorConfig.url || ''));
			const requestUrl = new URL(String(translatorConfig.url));

			if (isGoogleTranslateApi && translatorConfig.apiKey) {
				requestUrl.searchParams.set('key', translatorConfig.apiKey);
			}

			const requestBody = isGoogleTranslateApi
				? {
					q,
					target: targetCode,
					format: 'text',
					...(sourceCode !== 'auto' ? { source: sourceCode } : {})
				}
				: {
					q,
					source: sourceCode,
					target: targetCode,
					format: 'text',
					...(translatorConfig.apiKey ? { api_key: translatorConfig.apiKey } : {})
				};

			const response = await fetch(requestUrl.toString(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody),
				signal: abortController.signal
			});

			if (!response.ok) {
				let errorDetail = '';
				try {
					errorDetail = await response.text();
				} catch (error) {
					errorDetail = '';
				}
				throw new Error(`Translation request failed with status ${response.status}${errorDetail ? `: ${errorDetail}` : ''}`);
			}

			return response.json();
		} finally {
			clearTimeout(timeout);
		}
	};

	let lastError = null;

	for (const sourceCandidate of sourceCandidates) {
		for (const targetCandidate of targetCandidates) {
			try {
				const batchPayload = await requestTranslation(sourceTexts, sourceCandidate, targetCandidate);
				return parseTranslatedPayload(batchPayload, sourceTexts);
			} catch (error) {
				lastError = error;
				try {
					const translatedValues = [];
					for (const value of sourceTexts) {
						const singlePayload = await requestTranslation(value, sourceCandidate, targetCandidate);
						const parsedSingle = parseTranslatedPayload(singlePayload, [value]);
						translatedValues.push(parsedSingle[0] || value);
					}
					return translatedValues;
				} catch (fallbackError) {
					lastError = fallbackError;
				}
			}
		}
	}

	console.warn('Auto-translation fallback to source text:', lastError?.message || lastError);
	return sourceTexts;
}

async function translateObjectValues(sourceObject, sourceLanguage, targetLanguage) {
	const entries = Object.entries(sourceObject || {});
	if (entries.length === 0) {
		return {};
	}

	const translated = {};
	const chunkSize = 40;

	for (let index = 0; index < entries.length; index += chunkSize) {
		const chunk = entries.slice(index, index + chunkSize);
		const keys = chunk.map(([key]) => key);
		const values = chunk.map(([, value]) => String(value || ''));
		const translatedValues = await translateTextBatch(values, sourceLanguage, targetLanguage);

		for (let i = 0; i < keys.length; i += 1) {
			translated[keys[i]] = translatedValues[i] || values[i] || '';
		}
	}

	return translated;
}

function getEffectiveBookingConfig(bookingConfig, roomEmail, roomGroup, hasPermission) {
	const roomKey = normalizeRoomKey(roomEmail);
	const roomGroupKey = normalizeRoomGroupKey(roomGroup);
	const roomFeatureFlags = bookingConfig.roomFeatureFlags || {};
	const roomGroupFeatureFlags = bookingConfig.roomGroupFeatureFlags || {};
	const groupOverride = roomGroupKey ? roomGroupFeatureFlags[roomGroupKey] : undefined;
	const roomOverride = roomKey ? roomFeatureFlags[roomKey] : undefined;

	const scopedEnableBooking = roomOverride?.enableBooking !== undefined
		? roomOverride.enableBooking
		: (groupOverride?.enableBooking !== undefined ? groupOverride.enableBooking : true);

	const scopedEnableExtendMeeting = roomOverride?.enableExtendMeeting !== undefined
		? roomOverride.enableExtendMeeting
		: (groupOverride?.enableExtendMeeting !== undefined ? groupOverride.enableExtendMeeting : true);

	const enableBooking = !!(bookingConfig.enableBooking && hasPermission && scopedEnableBooking);
	const enableExtendMeeting = !!(bookingConfig.enableExtendMeeting && enableBooking && scopedEnableExtendMeeting);

	return {
		enableBooking,
		enableExtendMeeting,
		groupOverrideApplied: !!groupOverride,
		roomOverrideApplied: !!roomOverride
	};
}

async function getGraphAuthHealth(forceRefresh = false) {
	const ttlMs = 60000;
	const now = Date.now();

	if (!forceRefresh && graphAuthHealthCache.result && now - graphAuthHealthCache.checkedAt < ttlMs) {
		return graphAuthHealthCache.result;
	}

	try {
		const tokenRequest = {
			scopes: ['https://graph.microsoft.com/.default']
		};
		const response = await msalClient.acquireTokenByClientCredential(tokenRequest);
		const result = {
			status: response?.accessToken ? 'ok' : 'error',
			message: response?.accessToken ? 'Graph token acquisition successful.' : 'Graph token acquisition failed.'
		};
		graphAuthHealthCache = { checkedAt: now, result };
		return result;
	} catch (error) {
		const result = {
			status: 'error',
			message: error.message || 'Graph token acquisition failed.'
		};
		graphAuthHealthCache = { checkedAt: now, result };
		return result;
	}
}

function getCacheHealth() {
	const cachePath = path.join(__dirname, '../data/cache.json');
	if (!fs.existsSync(cachePath)) {
		return {
			exists: false,
			readable: false,
			lastModified: null
		};
	}

	try {
		const stats = fs.statSync(cachePath);
		return {
			exists: true,
			readable: true,
			lastModified: stats.mtime.toISOString(),
			sizeBytes: stats.size
		};
	} catch (error) {
		return {
			exists: true,
			readable: false,
			lastModified: null,
			error: error.message
		};
	}
}

async function checkCalendarWritePermission() {
	if (hasCalendarWritePermission !== null) {
		return hasCalendarWritePermission;
	}

	try {
		// Try to acquire token with Calendars.ReadWrite scope
		const tokenRequest = {
			scopes: ['https://graph.microsoft.com/.default']
		};
		
		const response = await msalClient.acquireTokenByClientCredential(tokenRequest);
		
		if (response && response.accessToken) {
			// Token acquired successfully - we have the permission
			hasCalendarWritePermission = true;
			console.log('✓ Calendars.ReadWrite permission detected - Booking feature enabled');
		} else {
			hasCalendarWritePermission = false;
			console.log('✗ Calendars.ReadWrite permission missing - Booking feature disabled');
		}
	} catch (error) {
		// If we can't get a token, assume no write permission
		hasCalendarWritePermission = false;
		console.log('✗ Unable to verify Calendars.ReadWrite permission - Booking feature disabled');
		console.log('  Error:', error.message);
	}
	
	return hasCalendarWritePermission;
}

function triggerImmediateRoomRefresh() {
	try {
		const socketController = require('./socket-controller');
		if (typeof socketController.triggerImmediateRefresh === 'function') {
			socketController.triggerImmediateRefresh();
		}
	} catch (error) {
		console.warn('Unable to trigger immediate room refresh:', error.message);
	}
}

function triggerRoomRefreshWithFollowUp() {
	triggerImmediateRoomRefresh();
	setTimeout(() => {
		triggerImmediateRoomRefresh();
	}, 4000);
}

function formatDateForGraphUtc(date) {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');
	const hours = String(date.getUTCHours()).padStart(2, '0');
	const minutes = String(date.getUTCMinutes()).padStart(2, '0');
	const seconds = String(date.getUTCSeconds()).padStart(2, '0');
	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function parseGraphDateTime(dateTimeValue, timeZoneValue) {
	const dateTimeString = String(dateTimeValue || '').trim();
	if (!dateTimeString) {
		return null;
	}

	const hasExplicitZone = /Z$|[+-]\d{2}:?\d{2}$/.test(dateTimeString);
	if (hasExplicitZone) {
		const explicitDate = new Date(dateTimeString);
		return Number.isNaN(explicitDate.getTime()) ? null : explicitDate;
	}

	if (String(timeZoneValue || '').toUpperCase() === 'UTC') {
		const utcDate = new Date(`${dateTimeString}Z`);
		return Number.isNaN(utcDate.getTime()) ? null : utcDate;
	}

	const localDate = new Date(dateTimeString);
	return Number.isNaN(localDate.getTime()) ? null : localDate;
}

function calculateEarlyEndTime(startDate, nowDate = new Date()) {
	if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
		return nowDate;
	}

	if (nowDate <= startDate) {
		return new Date(startDate.getTime() + 60 * 1000);
	}

	return nowDate;
}

async function endGraphEventEarly(roomEmail, appointmentId) {
	const tokenRequest = {
		scopes: ['https://graph.microsoft.com/.default']
	};

	const authResult = await msalClient.acquireTokenByClientCredential(tokenRequest);
	const accessToken = authResult.accessToken;
	const eventUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(roomEmail)}/events/${encodeURIComponent(appointmentId)}`;

	const eventResponse = await fetch(eventUrl, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		}
	});

	if (!eventResponse.ok) {
		const errorText = await eventResponse.text();
		throw new Error(`Failed to load meeting before ending (${eventResponse.status}): ${errorText}`);
	}

	const event = await eventResponse.json();
	const startDate = parseGraphDateTime(event?.start?.dateTime, event?.start?.timeZone);
	const newEnd = calculateEarlyEndTime(startDate, new Date());

	const response = await fetch(eventUrl, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			end: {
				dateTime: formatDateForGraphUtc(newEnd),
				timeZone: 'UTC'
			}
		})
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to update meeting end time (${response.status}): ${errorText}`);
	}

	return newEnd;
}

async function moveGraphEventStartToNow(roomEmail, appointmentId, nowDate = new Date()) {
	const tokenRequest = {
		scopes: ['https://graph.microsoft.com/.default']
	};

	const authResult = await msalClient.acquireTokenByClientCredential(tokenRequest);
	const accessToken = authResult.accessToken;
	const eventUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(roomEmail)}/events/${encodeURIComponent(appointmentId)}`;

	const response = await fetch(eventUrl, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			start: {
				dateTime: formatDateForGraphUtc(nowDate),
				timeZone: 'UTC'
			}
		})
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to update meeting start time (${response.status}): ${errorText}`);
	}
}

// Configure multer for logo uploads
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		const uploadDir = path.join(__dirname, '../static/img/uploads');
		// Create uploads directory if it doesn't exist
		if (!fs.existsSync(uploadDir)) {
			fs.mkdirSync(uploadDir, { recursive: true });
		}
		cb(null, uploadDir);
	},
	filename: function (req, file, cb) {
		// Generate unique filename with timestamp
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		const ext = path.extname(file.originalname);
		cb(null, 'logo-' + uniqueSuffix + ext);
	}
});

const upload = multer({
	storage: storage,
	limits: {
		fileSize: 5 * 1024 * 1024 // 5MB limit
	},
	fileFilter: function (req, file, cb) {
		// Accept only image files
		const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
		const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
		const mimetype = allowedTypes.test(file.mimetype);
		
		if (mimetype && extname) {
			return cb(null, true);
		} else {
			cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, svg, webp)'));
		}
	}
});

module.exports = function(app) {
	var path = require('path');

	let apiRateLimiter = null;
	let writeRateLimiter = null;
	let authRateLimiter = null;

	const rebuildRateLimiters = () => {
		apiRateLimiter = createRateLimiter({
			windowMs: config.rateLimit.apiWindowMs,
			max: config.rateLimit.apiMax,
			keyGenerator: req => `${getClientIp(req)}:${req.path}`
		});

		writeRateLimiter = createRateLimiter({
			windowMs: config.rateLimit.writeWindowMs,
			max: config.rateLimit.writeMax,
			keyGenerator: req => `${getClientIp(req)}:${req.path}:${req.method}`
		});

		authRateLimiter = createRateLimiter({
			windowMs: config.rateLimit.authWindowMs,
			max: config.rateLimit.authMax,
			keyGenerator: req => `${getClientIp(req)}:auth`
		});
	};

	rebuildRateLimiters();

	app.use('/api', function(req, res, next) {
		return apiRateLimiter(req, res, next);
	});
	app.use('/api', function(req, res, next) {
		if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
			return writeRateLimiter(req, res, next);
		}
		next();
	});

	app.use('/api', function(req, res, next) {
		const maintenanceConfig = configManager.getMaintenanceConfig();
		if (!maintenanceConfig.enabled) {
			return next();
		}

		const isReadonlyRequest = req.method === 'GET';
		const requestPath = req.path;
		const allowedPaths = new Set([
			'/heartbeat',
			'/health',
			'/readiness',
			'/sync-status',
			'/maintenance-status',
			'/maintenance',
			'/api-token-config',
			'/oauth-config',
			'/system-config',
			'/graph/webhook'
		]);

		if (allowedPaths.has(requestPath) || isReadonlyRequest) {
			return next();
		}

		res.status(503).json({
			error: 'Maintenance mode enabled',
			message: maintenanceConfig.message,
			maintenance: maintenanceConfig
		});
	});

	app.get('/api/graph/webhook', function(req, res) {
		if (!config.graphWebhook.enabled) {
			return res.status(503).json({
				error: 'Webhook disabled',
				message: 'GRAPH_WEBHOOK_ENABLED is false'
			});
		}

		if (!hasWebhookSecurityConfig()) {
			return res.status(503).json({
				error: 'Webhook security configuration incomplete',
				message: 'Set GRAPH_WEBHOOK_CLIENT_STATE and GRAPH_WEBHOOK_ALLOWED_IPS before enabling webhooks.'
			});
		}

		if (!isWebhookIpAllowed(req)) {
			return res.status(403).json({ error: 'Webhook origin not allowed' });
		}

		const validationToken = req.query.validationToken;
		if (validationToken) {
			res.setHeader('Content-Type', 'text/plain');
			return res.status(200).send(validationToken);
		}

		res.status(400).json({ error: 'Missing validationToken query parameter' });
	});

	app.post('/api/graph/webhook', function(req, res) {
		if (!config.graphWebhook.enabled) {
			return res.status(503).json({
				error: 'Webhook disabled',
				message: 'GRAPH_WEBHOOK_ENABLED is false'
			});
		}

		if (!hasWebhookSecurityConfig()) {
			return res.status(503).json({
				error: 'Webhook security configuration incomplete',
				message: 'Set GRAPH_WEBHOOK_CLIENT_STATE and GRAPH_WEBHOOK_ALLOWED_IPS before enabling webhooks.'
			});
		}

		if (!isWebhookIpAllowed(req)) {
			return res.status(403).json({ error: 'Webhook origin not allowed' });
		}

		const payload = req.body;
		const notifications = Array.isArray(payload?.value) ? payload.value : [];

		const validNotifications = notifications.filter(item => {
			if (!config.graphWebhook.clientState) {
				return true;
			}
			return item.clientState === config.graphWebhook.clientState;
		});

		if (validNotifications.length > 0) {
			triggerRoomRefreshWithFollowUp();
		}

		res.status(202).json({ accepted: true, processed: validNotifications.length });
	});

	app.get('/api/maintenance-status', function(req, res) {
		const maintenanceConfig = configManager.getMaintenanceConfig();
		res.json(maintenanceConfig);
	});

	app.get('/api/health', async function(req, res) {
		const syncStatus = require('./socket-controller').getSyncStatus();
		const graphAuth = await getGraphAuthHealth();
		const cacheHealth = getCacheHealth();
		const maintenance = configManager.getMaintenanceConfig();

		res.json({
			status: 'ok',
			timestamp: new Date().toISOString(),
			graphAuth,
			syncStatus,
			cache: cacheHealth,
			maintenance
		});
	});

	app.get('/api/readiness', async function(req, res) {
		const graphAuth = await getGraphAuthHealth();
		const syncStatus = require('./socket-controller').getSyncStatus();
		const maintenance = configManager.getMaintenanceConfig();

		const graphOk = graphAuth.status === 'ok' || graphAuth.status === 'skipped';
		const syncOk = !syncStatus.hasNeverSynced || syncStatus.lastSyncSuccess === true;
		const ready = graphOk && syncOk && !maintenance.enabled;

		if (!ready) {
			return res.status(503).json({
				status: 'not-ready',
				reasons: {
					graphAuth,
					syncStatus,
					maintenance
				}
			});
		}

		res.json({ status: 'ready' });
	});

	// api routes ================================================================
	// returns an array of room objects
	app.get('/api/rooms', function(req, res) {
		const hasRequiredCreds = (
			!!config.msalConfig.auth.clientId
			&& config.msalConfig.auth.clientId !== 'OAUTH_CLIENT_ID_NOT_SET'
			&& !!config.msalConfig.auth.authority
			&& config.msalConfig.auth.authority !== 'OAUTH_AUTHORITY_NOT_SET'
			&& !!config.msalConfig.auth.clientSecret
			&& config.msalConfig.auth.clientSecret !== 'OAUTH_CLIENT_SECRET_NOT_SET'
		);
		
		if (!hasRequiredCreds) {
			return res.status(503).json({
				error: 'Calendar backend is not configured',
				message: 'Microsoft Graph credentials are missing. Configure OAUTH_CLIENT_ID, OAUTH_AUTHORITY, and OAUTH_CLIENT_SECRET.'
			});
		}

		const api = require('./msgraph/rooms.js');

		api(function(err, rooms) {
			if (err) {
				console.error('API Error:', err);
				if (err.responseCode === 127) {
					res.json({
						error:
							'Oops, there seems to be an issue with the credentials you have supplied.  Make sure you typed them correctly and that you have access to Exchange Roomlists.'
					});
				} else {
					res.json({
						error: 'Hmm, there seems to be a weird issue occuring.'
					});
				}
			} else {
				res.json(rooms);
			}
		}, msalClient);
	});

	// returns an array of roomlist objects with aliases for filtering
	app.get('/api/roomlists', function(req, res) {
		const api = require('./msgraph/roomlists.js');

		api(function(err, roomlists) {
			if (err) {
				if (err.responseCode === 127) {
					res.json({
						error:
							'Oops, there seems to be an issue with the credentials you have supplied.  Make sure you typed them correctly and that you have access to Exchange Roomlists.'
					});
				} else {
					res.json({
						error: 'Hmm, there seems to be a weird issue occuring.'
					});
				}
			} else {
				// Add aliases to each room list
				const roomlistsWithAliases = roomlists.map(name => {
					return roomlistAliasHelper.getRoomlistWithAlias(name);
				});
				res.json(roomlistsWithAliases);
			}
		}, msalClient);
	});

	// heartbeat-service to check if server is alive
	app.get('/api/heartbeat', function(req, res) {
		res.json({ status: 'OK' });
	});

	// Get calendar sync status
	app.get('/api/sync-status', function(req, res) {
		try {
			const socketController = require('./socket-controller');
			if (socketController.getSyncStatus) {
				const syncStatus = socketController.getSyncStatus();
				res.json(syncStatus);
			} else {
				res.json({
					hasNeverSynced: true,
					error: 'Sync status not available'
				});
			}
		} catch (err) {
			res.status(500).json({ 
				error: 'Failed to retrieve sync status',
				message: err.message
			});
		}
	});

	// Room booking endpoint
	app.post('/api/rooms/:roomEmail/book', async function(req, res) {
		const { roomEmail } = req.params;
		const { subject, startTime, endTime, description, roomGroup } = req.body;
		const bookingConfig = configManager.getBookingConfig();
		const hasPermission = await checkCalendarWritePermission();
		const effectiveBooking = getEffectiveBookingConfig(bookingConfig, roomEmail, roomGroup, hasPermission);

		if (!effectiveBooking.enableBooking) {
			return res.status(403).json({
				error: 'Booking disabled',
				message: 'Booking is disabled for this room or globally.'
			});
		}

		// Validate input
		if (!subject || !startTime || !endTime) {
			return res.status(400).json({ 
				error: 'Missing required fields',
				message: 'Subject, start time, and end time are required'
			});
		}

		// Security: Prevent booking with attendees or additional resources
		// Only allow the specific fields we need
		const disallowedFields = ['attendees', 'requiredAttendees', 'optionalAttendees', 'resources', 'locations'];
		for (const field of disallowedFields) {
			if (req.body[field] !== undefined) {
				return res.status(400).json({
					error: 'Invalid fields',
					message: 'Cannot add attendees or additional resources to room bookings'
				});
			}
		}

		const bookingDetails = { subject, startTime, endTime, description };

		try {
			const bookRoom = require('./msgraph/booking.js');
			const result = await bookRoom(msalClient, roomEmail, bookingDetails);
			triggerRoomRefreshWithFollowUp();
			res.json(result);
		} catch (error) {
			console.error('Booking error:', error);
			const errorMessage = error.message || 'Failed to book room';
			if (errorMessage.toLowerCase().includes('already booked')) {
				return res.status(409).json({
					error: 'Room not available',
					message: errorMessage
				});
			}
			res.status(500).json({ 
				error: 'Booking failed',
				message: errorMessage
			});
		}
	});

	// Extend existing meeting endpoint
	app.post('/api/extend-meeting', async function(req, res) {
		const { roomEmail, appointmentId, minutes, roomGroup } = req.body;

		// Detect language from Accept-Language header
		const acceptLanguage = req.headers['accept-language'] || 'en';
		const lang = acceptLanguage.split(',')[0].split('-')[0]; // Extract primary language code
		const isGerman = lang === 'de';

		// Translation helper
		const t = {
			missingFields: isGerman ? 'Fehlende erforderliche Felder' : 'Missing required fields',
			missingFieldsDetails: isGerman 
				? 'Raum-E-Mail, Termin-ID und Minuten sind erforderlich' 
				: 'Room email, appointment ID, and minutes are required',
			extendDisabled: isGerman ? 'Meeting-Verlängerung deaktiviert' : 'Extend meeting disabled',
			extendDisabledDetails: isGerman
				? 'Die Meeting-Verlängerung ist in der Admin-Konfiguration deaktiviert'
				: 'Extend meeting is disabled in the admin configuration',
			invalidMinutes: isGerman ? 'Ungültiger Minutenwert' : 'Invalid minutes value',
			invalidMinutesDetails: isGerman 
				? 'Minuten müssen zwischen 5 und 240 liegen (Schritte von 5)' 
				: 'Minutes must be between 5 and 240 (steps of 5)',
			conflictError: isGerman
				? 'Meeting kann nicht verlängert werden - ein weiterer Termin ist zu bald geplant. Bitte überprüfen Sie den Raumkalender.'
				: 'Cannot extend meeting - another meeting is scheduled too soon. Please check the room calendar.',
			endOfDayError: isGerman
				? 'Meeting kann nicht über das Tagesende hinaus verlängert werden'
				: 'Cannot extend meeting beyond end of day',
			fetchError: isGerman ? 'Fehler beim Abrufen der Termindetails' : 'Failed to fetch event details',
			updateError: isGerman ? 'Fehler beim Aktualisieren des Termins' : 'Failed to update event',
			generalError: isGerman ? 'Fehler beim Verlängern des Meetings' : 'Error extending meeting'
		};
		// Validate input
		if (!roomEmail || !appointmentId || !minutes) {
			return res.status(400).json({ 
				error: t.missingFields,
				message: t.missingFieldsDetails
			});
		}

		const bookingConfig = configManager.getBookingConfig();
		const hasPermission = await checkCalendarWritePermission();
		const effectiveBooking = getEffectiveBookingConfig(bookingConfig, roomEmail, roomGroup, hasPermission);

		if (!effectiveBooking.enableExtendMeeting) {
			return res.status(403).json({
				success: false,
				error: t.extendDisabled,
				message: t.extendDisabledDetails
			});
		}

		// Validate minutes value (5..240, step 5)
		const minutesValue = Number(minutes);
		if (!Number.isFinite(minutesValue) || minutesValue < 5 || minutesValue > 240 || minutesValue % 5 !== 0) {
			return res.status(400).json({ 
				error: t.invalidMinutes,
				message: t.invalidMinutesDetails
			});
		}

		try {
			const graphApi = require('./msgraph/graph.js');
				
			// Get the access token
			const tokenRequest = {
				scopes: ['https://graph.microsoft.com/.default']
			};
			const authResult = await msalClient.acquireTokenByClientCredential(tokenRequest);
			const accessToken = authResult.accessToken;

			// Get the current event
			const eventUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(roomEmail)}/events/${encodeURIComponent(appointmentId)}`;
			const eventResponse = await fetch(eventUrl, {
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				}
			});

			if (!eventResponse.ok) {
				throw new Error(t.fetchError);
			}

			const event = await eventResponse.json();
			const currentStart = new Date(event.start.dateTime);
			const currentEnd = new Date(event.end.dateTime);
			const newEnd = new Date(currentEnd.getTime() + (minutes * 60 * 1000));

			// Format the new end time properly for Graph API
			// Graph API expects format: "2024-01-15T14:30:00" without the Z
			const formatDateForGraph = (date) => {
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				const hours = String(date.getHours()).padStart(2, '0');
				const minutes = String(date.getMinutes()).padStart(2, '0');
				const seconds = String(date.getSeconds()).padStart(2, '0');
				return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
			};

			// Check for conflicts with the extension
			// We need to check if extending from currentEnd to newEnd would overlap with any other meeting
			const calendarView = await graphApi.getCalendarView(msalClient, roomEmail);
			const calendarEvents = calendarView.value || [];

			const hasConflict = calendarEvents.some(e => {
				if (e.id === appointmentId) return false; // Skip current meeting
				const eventStart = new Date(e.start.dateTime);
				const eventEnd = new Date(e.end.dateTime);
				
				// Check if there's any overlap between the extended meeting and this event
				// Overlap exists if: (extendedStart < eventEnd) AND (extendedEnd > eventStart)
				// The extended meeting runs from currentStart to newEnd
				return currentStart < eventEnd && newEnd > eventStart;
			});

			if (hasConflict) {
				return res.status(409).json({
					success: false,
					error: t.conflictError
				});
			}

			// Additional check: ensure the extension doesn't go beyond a reasonable time (e.g., end of business day)
			const maxEndTime = new Date(currentStart);
			maxEndTime.setHours(23, 59, 59, 999); // End of day
			
			if (newEnd > maxEndTime) {
				return res.status(400).json({
					success: false,
					error: t.endOfDayError
				});
			}

			// Update the event end time
			const updateUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(roomEmail)}/events/${encodeURIComponent(appointmentId)}`;
			const updateResponse = await fetch(updateUrl, {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					end: {
						dateTime: formatDateForGraphUtc(newEnd),
						timeZone: event.end.timeZone || 'UTC'
					}
				})
			});

			if (!updateResponse.ok) {
				const errorText = await updateResponse.text();
				throw new Error(`${t.updateError}: ${errorText}`);
			}

			res.json({ 
				success: true,
				message: `Meeting extended by ${minutes} minutes`,
				newEndTime: newEnd.toISOString()
			});
			triggerRoomRefreshWithFollowUp();
		} catch (error) {
			console.error('Extend meeting error:', error);
			res.status(500).json({ 
				success: false,
				error: error.message || t.generalError
			});
		}
	});

	app.post('/api/end-meeting', async function(req, res) {
		const { roomEmail, appointmentId, roomGroup } = req.body || {};

		const acceptLanguage = req.headers['accept-language'] || 'en';
		const lang = acceptLanguage.split(',')[0].split('-')[0];
		const isGerman = lang === 'de';

		const t = {
			missingFields: isGerman ? 'Fehlende erforderliche Felder' : 'Missing required fields',
			missingFieldsDetails: isGerman
				? 'Raum-E-Mail und Termin-ID sind erforderlich'
				: 'Room email and appointment ID are required',
			endDisabled: isGerman ? 'Meeting-Beenden deaktiviert' : 'End meeting disabled',
			endDisabledDetails: isGerman
				? 'Meeting-Verwaltung ist in der Admin-Konfiguration deaktiviert'
				: 'Meeting management is disabled in the admin configuration',
			genericError: isGerman ? 'Fehler beim Beenden des Meetings' : 'Error ending meeting'
		};

		if (!roomEmail || !appointmentId) {
			return res.status(400).json({
				success: false,
				error: t.missingFields,
				message: t.missingFieldsDetails
			});
		}

		const bookingConfig = configManager.getBookingConfig();
		const hasPermission = await checkCalendarWritePermission();
		const effectiveBooking = getEffectiveBookingConfig(bookingConfig, roomEmail, roomGroup, hasPermission);

		if (!effectiveBooking.enableExtendMeeting) {
			return res.status(403).json({
				success: false,
				error: t.endDisabled,
				message: t.endDisabledDetails
			});
		}

		try {
			const endedAt = await endGraphEventEarly(roomEmail, appointmentId);

			checkinManager.clearCheckedIn({ roomEmail, appointmentId });
			triggerRoomRefreshWithFollowUp();

			return res.json({
				success: true,
				message: isGerman ? 'Meeting wurde vorzeitig beendet.' : 'Meeting was ended early.',
				newEndTime: endedAt instanceof Date ? endedAt.toISOString() : null
			});
		} catch (error) {
			console.error('End meeting error:', error);
			return res.status(500).json({
				success: false,
				error: error.message || t.genericError
			});
		}
	});

	app.get('/api/check-in-status', function(req, res) {
		const { roomEmail, appointmentId, organizer, roomName, startTimestamp } = req.query;

		if (!roomEmail || !appointmentId) {
			return res.status(400).json({
				error: 'Missing required fields',
				message: 'roomEmail and appointmentId are required'
			});
		}

		const bookingConfig = configManager.getBookingConfig();
		const status = checkinManager.getCheckInStatus({
			roomEmail,
			appointmentId,
			organizer,
			roomName,
			startTimestamp,
			checkInConfig: bookingConfig.checkIn
		});

		res.json(status);
	});

	app.post('/api/check-in', async function(req, res) {
		const { roomEmail, appointmentId, organizer, roomName, startTimestamp } = req.body || {};

		if (!roomEmail || !appointmentId) {
			return res.status(400).json({
				success: false,
				error: 'Missing required fields',
				message: 'roomEmail and appointmentId are required'
			});
		}

		const bookingConfig = configManager.getBookingConfig();
		const status = checkinManager.getCheckInStatus({
			roomEmail,
			appointmentId,
			organizer,
			roomName,
			startTimestamp,
			checkInConfig: bookingConfig.checkIn
		});

		if (!status.required) {
			return res.status(400).json({
				success: false,
				error: 'Check-in not required',
				message: 'This meeting does not require check-in.'
			});
		}

		if (status.tooEarly) {
			return res.status(409).json({
				success: false,
				error: 'Check-in not open yet',
				message: `Check-in is available ${status.earlyCheckInMinutes} minutes before meeting start.`
			});
		}

		if (status.expired) {
			return res.status(409).json({
				success: false,
				error: 'Check-in window expired',
				message: 'The check-in window has already expired.'
			});
		}

		const shouldMoveMeetingStart = Number.isFinite(status.startTimestamp) && Date.now() < status.startTimestamp;

		if (shouldMoveMeetingStart) {
			try {
				await moveGraphEventStartToNow(roomEmail, appointmentId, new Date());
				triggerRoomRefreshWithFollowUp();
			} catch (error) {
				console.error('Check-in pre-start meeting update error:', error);
				return res.status(500).json({
					success: false,
					error: 'Failed to update meeting start time',
					message: error.message || 'Could not move meeting start to current time.'
				});
			}
		}

		checkinManager.markCheckedIn({ roomEmail, appointmentId });

		res.json({
			success: true,
			status: checkinManager.getCheckInStatus({
				roomEmail,
				appointmentId,
				organizer,
				roomName,
				startTimestamp,
				checkInConfig: bookingConfig.checkIn
			})
		});
	});

	// Middleware to check API token
	const checkApiToken = (req, res, next) => {
		authRateLimiter(req, res, () => {});
		if (res.headersSent) {
			return;
		}

		if (hasValidApiToken(req)) {
			return next();
		}

		appendAuditLog({
			event: 'auth.failure',
			path: req.path,
			method: req.method,
			ip: getClientIp(req),
			userAgent: req.headers['user-agent'] || null
		});

		// Unauthorized
		res.status(401).json({ 
			error: 'Unauthorized',
			message: 'Valid API token required. Provide token in Authorization header or X-API-Token header.'
		});
	};

	const checkWiFiApiToken = (req, res, next) => {
		authRateLimiter(req, res, () => {});
		if (res.headersSent) {
			return;
		}

		if (hasValidWiFiApiToken(req)) {
			return next();
		}

		appendAuditLog({
			event: 'auth.failure',
			path: req.path,
			method: req.method,
			ip: getClientIp(req),
			userAgent: req.headers['user-agent'] || null
		});

		res.status(401).json({
			error: 'Unauthorized',
			message: 'Valid API token required. Provide token in Authorization header or X-API-Token header.'
		});
	};

	// Get current WiFi configuration (public - no auth required)
	app.get('/api/wifi', function(req, res) {
		try {
			const wifiConfig = configManager.getWiFiConfig();
			res.json(wifiConfig);
		} catch (err) {
			res.status(500).json({ error: 'Failed to retrieve WiFi configuration' });
		}
	});

	app.get('/api/oauth-config', checkApiToken, function(req, res) {
		try {
			const oauthConfig = configManager.getOAuthConfig();
			res.json(oauthConfig);
		} catch (err) {
			console.error('Error retrieving OAuth config:', err);
			res.status(500).json({ error: 'Failed to retrieve OAuth configuration' });
		}
	});

	app.get('/api/api-token-config', checkApiToken, function(req, res) {
		try {
			res.json(configManager.getApiTokenConfig());
		} catch (err) {
			console.error('Error retrieving API token config:', err);
			res.status(500).json({ error: 'Failed to retrieve API token configuration' });
		}
	});

	app.post('/api/api-token-config', checkApiToken, async function(req, res) {
		try {
			const { newToken, newWifiToken } = req.body || {};
			const hasNewAdminToken = newToken !== undefined;
			const hasNewWiFiToken = newWifiToken !== undefined;

			if (!hasNewAdminToken && !hasNewWiFiToken) {
				return res.status(400).json({
					error: 'Invalid token update payload',
					message: 'Please provide newToken and/or newWifiToken.'
				});
			}

			const normalizedToken = String(newToken || '').trim();
			const normalizedWiFiToken = String(newWifiToken || '').trim();

			if (hasNewAdminToken) {
				if (configManager.isApiTokenEnvLocked()) {
					return res.status(403).json({
						error: 'API token is locked by environment variable',
						message: 'Remove API_TOKEN from environment to edit via admin panel.'
					});
				}

				if (!normalizedToken || normalizedToken.length < 8) {
					return res.status(400).json({
						error: 'Invalid API token',
						message: 'Please provide an API token with at least 8 characters.'
					});
				}
			}

			if (hasNewWiFiToken) {
				if (configManager.isWifiApiTokenEnvLocked && configManager.isWifiApiTokenEnvLocked()) {
					return res.status(403).json({
						error: 'WiFi API token is locked by environment variable',
						message: 'Remove WIFI_API_TOKEN from environment to edit via admin panel.'
					});
				}

				if (!normalizedWiFiToken || normalizedWiFiToken.length < 8) {
					return res.status(400).json({
						error: 'Invalid WiFi API token',
						message: 'Please provide a WiFi API token with at least 8 characters.'
					});
				}
			}

			const beforeConfig = configManager.getApiTokenConfig();
			if (hasNewAdminToken) {
				await configManager.updateApiToken(normalizedToken);
			}
			if (hasNewWiFiToken && configManager.updateWifiApiToken) {
				await configManager.updateWifiApiToken(normalizedWiFiToken);
			}
			const updatedConfig = configManager.getApiTokenConfig();

			appendAuditLog({
				event: 'config.apiToken.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				tokensUpdated: {
					admin: hasNewAdminToken,
					wifi: hasNewWiFiToken
				},
				before: beforeConfig,
				after: updatedConfig
			});

			res.json({
				success: true,
				config: updatedConfig,
				message: hasNewAdminToken && hasNewWiFiToken
					? 'API tokens updated'
					: (hasNewAdminToken ? 'API token updated' : 'WiFi API token updated')
			});
		} catch (err) {
			console.error('Error updating API token:', err);
			res.status(500).json({ error: err.message || 'Failed to update API token' });
		}
	});

	app.post('/api/oauth-config', checkApiToken, async function(req, res) {
		try {
			if (isOAuthEnvConfigured()) {
				return res.status(403).json({
					error: 'OAuth configuration is locked by environment variables',
					message: 'Remove OAUTH_CLIENT_ID/OAUTH_AUTHORITY/OAUTH_CLIENT_SECRET from environment to edit via admin panel.'
				});
			}

			const { clientId, authority, tenantId, clientSecret } = req.body || {};
			const invalidSentinelValues = new Set([
				'OAUTH_CLIENT_ID_NOT_SET',
				'OAUTH_AUTHORITY_NOT_SET',
				'OAUTH_CLIENT_SECRET_NOT_SET'
			]);

			if (typeof clientId === 'string' && invalidSentinelValues.has(clientId.trim())) {
				return res.status(400).json({
					error: 'Invalid OAuth client ID',
					message: 'Please provide a real OAuth Client ID (placeholder values are not allowed).'
				});
			}

			if (typeof authority === 'string' && invalidSentinelValues.has(authority.trim())) {
				return res.status(400).json({
					error: 'Invalid OAuth authority',
					message: 'Please provide a real OAuth Tenant ID or Authority URL (placeholder values are not allowed).'
				});
			}

			if (typeof tenantId === 'string' && invalidSentinelValues.has(tenantId.trim())) {
				return res.status(400).json({
					error: 'Invalid OAuth tenant ID',
					message: 'Please provide a real OAuth Tenant ID (placeholder values are not allowed).'
				});
			}

			if (typeof clientSecret === 'string' && invalidSentinelValues.has(clientSecret.trim())) {
				return res.status(400).json({
					error: 'Invalid OAuth client secret',
					message: 'Please provide a real OAuth Client Secret (placeholder values are not allowed).'
				});
			}

			if (clientId === undefined && authority === undefined && tenantId === undefined && clientSecret === undefined) {
				return res.status(400).json({ error: 'At least one OAuth configuration option is required' });
			}

			const beforeConfig = configManager.getOAuthConfig();
			const updatedConfig = await configManager.updateOAuthConfig({
				clientId,
				authority: tenantId !== undefined ? tenantId : authority,
				clientSecret
			});

			refreshMsalClient();
			require('./socket-controller').refreshMsalClient();
			triggerRoomRefreshWithFollowUp();

			appendAuditLog({
				event: 'config.oauth.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: updatedConfig
			});

			res.json({
				success: true,
				config: updatedConfig,
				message: 'OAuth configuration updated'
			});
		} catch (err) {
			console.error('Error updating OAuth config:', err);
			res.status(500).json({ error: err.message || 'Failed to update OAuth configuration' });
		}
	});

	app.get('/api/system-config', checkApiToken, function(req, res) {
		try {
			const systemConfig = configManager.getSystemConfig();
			res.json(systemConfig);
		} catch (err) {
			console.error('Error retrieving system config:', err);
			res.status(500).json({ error: 'Failed to retrieve system configuration' });
		}
	});

	app.post('/api/system-config', checkApiToken, async function(req, res) {
		try {
			if (isSystemEnvConfigured()) {
				return res.status(403).json({
					error: 'System configuration is locked by environment variables',
					message: 'Remove STARTUP_VALIDATION/GRAPH_WEBHOOK env variables to edit via admin panel.'
				});
			}

			const {
				startupValidationStrict,
				graphWebhookEnabled,
				graphWebhookClientState,
				graphWebhookAllowedIps
			} = req.body || {};

			if (
				startupValidationStrict === undefined
				&& graphWebhookEnabled === undefined
				&& graphWebhookClientState === undefined
				&& graphWebhookAllowedIps === undefined
			) {
				return res.status(400).json({ error: 'At least one system configuration option is required' });
			}

			const beforeConfig = configManager.getSystemConfig();
			const updatedConfig = await configManager.updateSystemConfig({
				startupValidationStrict,
				graphWebhookEnabled,
				graphWebhookClientState,
				graphWebhookAllowedIps
			});

			require('./socket-controller').refreshPollingSchedule();

			appendAuditLog({
				event: 'config.system.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: updatedConfig
			});

			res.json({
				success: true,
				config: updatedConfig,
				message: 'System configuration updated'
			});
		} catch (err) {
			console.error('Error updating system config:', err);
			res.status(500).json({ error: err.message || 'Failed to update system configuration' });
		}
	});

	// Update WiFi configuration and regenerate QR code (protected - requires token)
	app.post('/api/wifi', checkWiFiApiToken, async function(req, res) {
		try {
			const { ssid, password } = req.body;
			const beforeConfig = configManager.getWiFiConfig();
			
			if (!ssid) {
				return res.status(400).json({ error: 'SSID is required' });
			}

			const config = await configManager.updateWiFiConfig(ssid, password || '');
			appendAuditLog({
				event: 'config.wifi.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: config
			});
			res.json({ 
				success: true, 
				config,
				message: 'WiFi configuration updated and QR code generated'
			});
		} catch (err) {
			console.error('Error updating WiFi config:', err);
			res.status(500).json({ error: 'Failed to update WiFi configuration' });
		}
	});

	// Get current logo configuration (public - no auth required)
	app.get('/api/logo', function(req, res) {
		try {
			const logoConfig = configManager.getLogoConfig();
			res.json(logoConfig);
		} catch (err) {
			res.status(500).json({ error: 'Failed to retrieve logo configuration' });
		}
	});

	// Update logo configuration (protected - requires token)
	app.post('/api/logo', checkApiToken, async function(req, res) {
		try {
			const { logoDarkUrl, logoLightUrl } = req.body;
			const beforeConfig = configManager.getLogoConfig();
			
			if (!logoDarkUrl && !logoLightUrl) {
				return res.status(400).json({ error: 'At least one logo URL is required' });
			}

			const config = await configManager.updateLogoConfig(logoDarkUrl, logoLightUrl);
			appendAuditLog({
				event: 'config.logo.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: config
			});
			res.json({ 
				success: true, 
				config,
				message: 'Logo configuration updated'
			});
		} catch (err) {
			console.error('Error updating logo config:', err);
			res.status(500).json({ error: 'Failed to update logo configuration' });
		}
	});

	// Upload logo file (protected - requires token)
	app.post('/api/logo/upload', checkApiToken, upload.single('logo'), async function(req, res) {
		try {
			if (!req.file) {
				return res.status(400).json({ error: 'No file uploaded' });
			}

			const { logoType } = req.body; // 'dark' or 'light'
			
			if (!logoType || (logoType !== 'dark' && logoType !== 'light')) {
				return res.status(400).json({ error: 'Logo type must be "dark" or "light"' });
			}

			// Generate the URL path for the uploaded file
			const logoUrl = `/img/uploads/${req.file.filename}`;
			
			// Get current config
			const currentConfig = configManager.getLogoConfig();
			
			// Update only the specified logo
			const logoDarkUrl = logoType === 'dark' ? logoUrl : currentConfig.logoDarkUrl;
			const logoLightUrl = logoType === 'light' ? logoUrl : currentConfig.logoLightUrl;
			
			// Update the logo configuration with the new file path
			const config = await configManager.updateLogoConfig(logoDarkUrl, logoLightUrl);
			
			res.json({ 
				success: true, 
				config,
				logoUrl: logoUrl,
				message: `${logoType === 'dark' ? 'Dark' : 'Light'} logo uploaded and configuration updated`
			});
		} catch (err) {
			console.error('Error uploading logo:', err);
			// Clean up uploaded file if there was an error
			if (req.file) {
				fs.unlink(req.file.path, (unlinkErr) => {
					if (unlinkErr) console.error('Error deleting file:', unlinkErr);
				});
			}
			res.status(500).json({ error: err.message || 'Failed to upload logo' });
		}
	});

	// Get current information configuration (public - no auth required)
	app.get('/api/sidebar', function(req, res) {
		try {
			const sidebarConfig = configManager.getSidebarConfig();
			res.json(sidebarConfig);
		} catch (err) {
			res.status(500).json({ error: 'Failed to retrieve information configuration' });
		}
	});

	// Get configuration lock status (which settings are configured via .env)
	app.get('/api/config-locks', function(req, res) {
		try {
			const isEnvConfigured = (name) => process.env[name] !== undefined;

			const locks = {
				wifiLocked: isEnvConfigured('WIFI_SSID') || isEnvConfigured('WIFI_PASSWORD'),
				logoLocked: isEnvConfigured('LOGO_DARK_URL') || isEnvConfigured('LOGO_LIGHT_URL'),
				sidebarLocked: isEnvConfigured('SIDEBAR_SHOW_WIFI') || isEnvConfigured('SIDEBAR_SHOW_UPCOMING') || isEnvConfigured('SIDEBAR_SHOW_TITLES'),
				bookingLocked: isEnvConfigured('ENABLE_BOOKING')
					|| isEnvConfigured('CHECKIN_ENABLED')
					|| isEnvConfigured('CHECKIN_REQUIRED_FOR_EXTERNAL')
					|| isEnvConfigured('CHECKIN_EARLY_MINUTES')
					|| isEnvConfigured('CHECKIN_WINDOW_MINUTES')
					|| isEnvConfigured('CHECKIN_AUTO_RELEASE_NO_SHOW'),
				searchLocked: !!(
					isEnvConfigured('SEARCH_USE_GRAPHAPI')
					|| isEnvConfigured('SEARCH_MAXDAYS')
					|| isEnvConfigured('SEARCH_MAXROOMLISTS')
					|| isEnvConfigured('SEARCH_MAXROOMS')
					|| isEnvConfigured('SEARCH_MAXITEMS')
					|| isEnvConfigured('SEARCH_POLL_INTERVAL_MS')
				),
				rateLimitLocked: !!(
					isEnvConfigured('RATE_LIMIT_API_WINDOW_MS')
					|| isEnvConfigured('RATE_LIMIT_API_MAX')
					|| isEnvConfigured('RATE_LIMIT_WRITE_WINDOW_MS')
					|| isEnvConfigured('RATE_LIMIT_WRITE_MAX')
					|| isEnvConfigured('RATE_LIMIT_AUTH_WINDOW_MS')
					|| isEnvConfigured('RATE_LIMIT_AUTH_MAX')
				),
				apiTokenLocked: configManager.isApiTokenEnvLocked(),
				wifiApiTokenLocked: configManager.isWifiApiTokenEnvLocked ? configManager.isWifiApiTokenEnvLocked() : false,
				oauthLocked: isOAuthEnvConfigured(),
				systemLocked: isSystemEnvConfigured(),
				maintenanceLocked: isMaintenanceEnvConfigured()
				,
				translationApiLocked: isTranslationApiEnvConfigured()
			};
			res.json(locks);
		} catch (err) {
			res.status(500).json({ error: 'Failed to retrieve configuration locks' });
		}
	});

	app.get('/api/translation-api-config', function(req, res) {
		try {
			const translationApiConfig = configManager.getTranslationApiConfig();
			res.json(translationApiConfig);
		} catch (err) {
			console.error('Error retrieving translation API config:', err);
			res.status(500).json({ error: 'Failed to retrieve translation API configuration' });
		}
	});

	app.post('/api/translation-api-config', checkApiToken, async function(req, res) {
		try {
			if (isTranslationApiEnvConfigured()) {
				return res.status(403).json({
					error: 'Translation API configuration is locked by environment variables',
					message: 'Remove AUTO_TRANSLATE_* env variables to edit via admin panel.'
				});
			}

			const {
				enabled,
				url,
				apiKey,
				timeoutMs
			} = req.body || {};

			if (
				enabled === undefined
				&& url === undefined
				&& apiKey === undefined
				&& timeoutMs === undefined
			) {
				return res.status(400).json({ error: 'At least one translation API configuration option is required' });
			}

			const beforeConfig = configManager.getTranslationApiConfig();
			const updatedConfig = await configManager.updateTranslationApiConfig({
				enabled,
				url,
				apiKey,
				timeoutMs
			});

			appendAuditLog({
				event: 'config.translation_api.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: updatedConfig
			});

			res.json({
				success: true,
				config: updatedConfig,
				message: 'Translation API configuration updated'
			});
		} catch (err) {
			console.error('Error updating translation API config:', err);
			res.status(500).json({ error: err.message || 'Failed to update translation API configuration' });
		}
	});

	app.get('/api/search-config', function(req, res) {
		try {
			const searchConfig = configManager.getSearchConfig();
			res.json(searchConfig);
		} catch (err) {
			console.error('Error retrieving search config:', err);
			res.status(500).json({ error: 'Failed to retrieve search configuration' });
		}
	});

	app.post('/api/search-config', checkApiToken, async function(req, res) {
		try {
			const {
				useGraphAPI,
				maxDays,
				maxRoomLists,
				maxRooms,
				maxItems,
				pollIntervalMs
			} = req.body || {};

			if (
				useGraphAPI === undefined
				&& maxDays === undefined
				&& maxRoomLists === undefined
				&& maxRooms === undefined
				&& maxItems === undefined
				&& pollIntervalMs === undefined
			) {
				return res.status(400).json({ error: 'At least one search configuration option is required' });
			}

			const beforeConfig = configManager.getSearchConfig();
			const updatedConfig = await configManager.updateSearchConfig({
				useGraphAPI,
				maxDays,
				maxRoomLists,
				maxRooms,
				maxItems,
				pollIntervalMs
			});

			require('./socket-controller').refreshPollingSchedule();
			triggerRoomRefreshWithFollowUp();

			appendAuditLog({
				event: 'config.search.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: updatedConfig
			});

			res.json({
				success: true,
				config: updatedConfig,
				message: 'Search configuration updated'
			});
		} catch (err) {
			console.error('Error updating search config:', err);
			res.status(500).json({ error: 'Failed to update search configuration' });
		}
	});

	app.get('/api/rate-limit-config', function(req, res) {
		try {
			const rateLimitConfig = configManager.getRateLimitConfig();
			res.json(rateLimitConfig);
		} catch (err) {
			console.error('Error retrieving rate limit config:', err);
			res.status(500).json({ error: 'Failed to retrieve rate limit configuration' });
		}
	});

	app.post('/api/rate-limit-config', checkApiToken, async function(req, res) {
		try {
			const {
				apiWindowMs,
				apiMax,
				writeWindowMs,
				writeMax,
				authWindowMs,
				authMax
			} = req.body || {};

			if (
				apiWindowMs === undefined
				&& apiMax === undefined
				&& writeWindowMs === undefined
				&& writeMax === undefined
				&& authWindowMs === undefined
				&& authMax === undefined
			) {
				return res.status(400).json({ error: 'At least one rate limit configuration option is required' });
			}

			const beforeConfig = configManager.getRateLimitConfig();
			const updatedConfig = await configManager.updateRateLimitConfig({
				apiWindowMs,
				apiMax,
				writeWindowMs,
				writeMax,
				authWindowMs,
				authMax
			});

			rebuildRateLimiters();

			appendAuditLog({
				event: 'config.rate_limit.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: updatedConfig
			});

			res.json({
				success: true,
				config: updatedConfig,
				message: 'Rate limit configuration updated'
			});
		} catch (err) {
			console.error('Error updating rate limit config:', err);
			res.status(500).json({ error: 'Failed to update rate limit configuration' });
		}
	});

	// Update information configuration (protected - requires token)
	app.post('/api/sidebar', checkApiToken, async function(req, res) {
		try {
			const { showWiFi, showUpcomingMeetings, showMeetingTitles, minimalHeaderStyle } = req.body;
			const beforeConfig = configManager.getSidebarConfig();
			
			if (showWiFi === undefined && showUpcomingMeetings === undefined && showMeetingTitles === undefined && minimalHeaderStyle === undefined) {
				return res.status(400).json({ error: 'At least one configuration option is required' });
			}

			const config = await configManager.updateSidebarConfig(showWiFi, showUpcomingMeetings, showMeetingTitles, minimalHeaderStyle);
			appendAuditLog({
				event: 'config.sidebar.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: config
			});
			res.json({ 
				success: true, 
				config,
				message: 'Information configuration updated'
			});
		} catch (err) {
			console.error('Error updating information config:', err);
			res.status(500).json({ error: 'Failed to update information configuration' });
		}
	});

	// Get current booking configuration (public - no auth required)
	app.get('/api/booking-config', async function(req, res) {
		try {
			const bookingConfig = configManager.getBookingConfig();
			const roomEmail = req.query.roomEmail;
			const roomGroup = req.query.roomGroup;
			
			// Check if Calendars.ReadWrite permission is available
			const hasPermission = await checkCalendarWritePermission();
			const effectiveBooking = getEffectiveBookingConfig(bookingConfig, roomEmail, roomGroup, hasPermission);
			
			// If permission is missing, force disable booking regardless of config
			const effectiveConfig = {
				...bookingConfig,
				enableBooking: effectiveBooking.enableBooking,
				enableExtendMeeting: effectiveBooking.enableExtendMeeting,
				groupOverrideApplied: effectiveBooking.groupOverrideApplied,
				roomOverrideApplied: effectiveBooking.roomOverrideApplied,
				permissionMissing: !hasPermission
			};
			
			res.json(effectiveConfig);
		} catch (err) {
			console.error('Error retrieving booking config:', err);
			res.status(500).json({ error: 'Failed to retrieve booking configuration' });
		}
	});

	// Get colors configuration
	app.get('/api/colors', async function(req, res) {
		try {
			const colorsConfig = configManager.getColorsConfig();
			res.json(colorsConfig);
		} catch (err) {
			console.error('Error retrieving colors config:', err);
			res.status(500).json({ error: 'Failed to retrieve colors configuration' });
		}
	});

	// Get i18n configuration
	app.get('/api/i18n', function(req, res) {
		try {
			const i18nConfig = configManager.getI18nConfig();
			res.json(i18nConfig);
		} catch (err) {
			console.error('Error retrieving i18n config:', err);
			res.status(500).json({ error: 'Failed to retrieve i18n configuration' });
		}
	});

	// Update booking configuration (protected - requires token)
	app.post('/api/booking-config', checkApiToken, async function(req, res) {
		try {
			const { enableBooking, buttonColor, enableExtendMeeting, extendMeetingUrlAllowlist, roomFeatureFlags, roomGroupFeatureFlags, checkIn } = req.body;
			const beforeConfig = configManager.getBookingConfig();
			
			if (enableBooking === undefined && buttonColor === undefined && enableExtendMeeting === undefined && extendMeetingUrlAllowlist === undefined && roomFeatureFlags === undefined && roomGroupFeatureFlags === undefined && checkIn === undefined) {
				return res.status(400).json({ error: 'At least one booking configuration option is required' });
			}

			// Check if Calendars.ReadWrite permission is available
			const hasPermission = await checkCalendarWritePermission();
			
			if (enableBooking === true && !hasPermission) {
				return res.status(403).json({ 
					error: 'Cannot enable booking: Calendars.ReadWrite permission is missing',
					message: 'Please grant Calendars.ReadWrite permission in Azure AD to enable the booking feature'
				});
			}

			const config = await configManager.updateBookingConfig(enableBooking, buttonColor, enableExtendMeeting, extendMeetingUrlAllowlist, roomFeatureFlags, roomGroupFeatureFlags, checkIn);

			appendAuditLog({
				event: 'config.booking.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: config
			});
			res.json({ 
				success: true, 
				config,
				message: 'Booking configuration updated'
			});
		} catch (err) {
			console.error('Error updating booking config:', err);
			res.status(500).json({ error: 'Failed to update booking configuration' });
		}
	});

	// Color Configuration Endpoint
	app.post('/api/colors', checkApiToken, async function(req, res) {
		try {
			const { bookingButtonColor, statusAvailableColor, statusBusyColor, statusUpcomingColor, statusNotFoundColor } = req.body;
			const beforeConfig = configManager.getColorsConfig();
			
			const config = await configManager.updateColorsConfig(
				bookingButtonColor,
				statusAvailableColor,
				statusBusyColor,
				statusUpcomingColor,
				statusNotFoundColor
			);

			appendAuditLog({
				event: 'config.colors.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: config
			});
			
			res.json({ 
				success: true, 
				config,
				message: 'Colors configuration updated'
			});
		} catch (err) {
			console.error('Error updating colors config:', err);
			res.status(500).json({ error: 'Failed to update colors configuration' });
		}
	});

	app.post('/api/maintenance', checkApiToken, async function(req, res) {
		try {
			if (isMaintenanceEnvConfigured()) {
				return res.status(403).json({
					error: 'Maintenance configuration is locked by environment variables',
					message: 'Remove MAINTENANCE_MODE/MAINTENANCE_MESSAGE from environment to edit via admin panel.'
				});
			}

			const { enabled, message } = req.body;
			const beforeConfig = configManager.getMaintenanceConfig();
			if (enabled === undefined && message === undefined) {
				return res.status(400).json({ error: 'At least one maintenance configuration option is required' });
			}

			const maintenanceConfig = await configManager.updateMaintenanceConfig(enabled, message);
			appendAuditLog({
				event: 'config.maintenance.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: maintenanceConfig
			});

			res.json({
				success: true,
				config: maintenanceConfig,
				message: 'Maintenance configuration updated'
			});
		} catch (err) {
			console.error('Error updating maintenance config:', err);
			res.status(500).json({ error: 'Failed to update maintenance configuration' });
		}
	});

	app.post('/api/i18n', checkApiToken, async function(req, res) {
		try {
			const { maintenanceMessages, adminTranslations } = req.body || {};
			const hasMaintenanceMessages = maintenanceMessages && typeof maintenanceMessages === 'object' && !Array.isArray(maintenanceMessages);
			const hasAdminTranslations = adminTranslations && typeof adminTranslations === 'object' && !Array.isArray(adminTranslations);

			if (!hasMaintenanceMessages && !hasAdminTranslations) {
				return res.status(400).json({ error: 'At least one of maintenanceMessages or adminTranslations object is required' });
			}

			const beforeConfig = configManager.getI18nConfig();
			const i18nConfig = await configManager.updateI18nConfig({
				maintenanceMessages,
				adminTranslations
			});

			appendAuditLog({
				event: 'config.i18n.update',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeConfig,
				after: i18nConfig
			});

			res.json({
				success: true,
				config: i18nConfig,
				message: 'i18n configuration updated'
			});
		} catch (err) {
			console.error('Error updating i18n config:', err);
			res.status(500).json({ error: 'Failed to update i18n configuration' });
		}
	});

	app.post('/api/i18n/auto-translate', checkApiToken, async function(req, res) {
		try {
			const { targetLanguage, sourceLanguage, maintenanceSource, adminSource } = req.body || {};
			const normalizedTargetLanguage = normalizeLanguageCode(targetLanguage);
			const normalizedSourceLanguage = normalizeLanguageCode(sourceLanguage) || 'en';

			if (!normalizedTargetLanguage || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(normalizedTargetLanguage)) {
				return res.status(400).json({ error: 'Invalid target language code' });
			}

			if (!maintenanceSource || typeof maintenanceSource !== 'object' || Array.isArray(maintenanceSource)) {
				return res.status(400).json({ error: 'maintenanceSource must be an object' });
			}

			if (!adminSource || typeof adminSource !== 'object' || Array.isArray(adminSource)) {
				return res.status(400).json({ error: 'adminSource must be an object' });
			}

			const translatedMaintenance = await translateObjectValues(
				{
					title: maintenanceSource.title || '',
					body: maintenanceSource.body || ''
				},
				normalizedSourceLanguage,
				normalizedTargetLanguage
			);

			const translatedAdmin = await translateObjectValues(
				adminSource,
				normalizedSourceLanguage,
				normalizedTargetLanguage
			);

			return res.json({
				success: true,
				maintenance: translatedMaintenance,
				admin: translatedAdmin
			});
		} catch (err) {
			console.error('Error auto-translating i18n:', err);
			return res.status(500).json({ error: 'Failed to auto-translate language content' });
		}
	});

	app.get('/api/audit-logs', checkApiToken, function(req, res) {
		const limit = req.query.limit ? parseInt(req.query.limit, 10) : 200;
		res.json({
			logs: getAuditLogs(limit)
		});
	});

	app.get('/api/config/backup', checkApiToken, function(req, res) {
		const backup = {
			createdAt: new Date().toISOString(),
			version: '1.0',
			wifi: configManager.getWiFiConfig(),
			logo: configManager.getLogoConfig(),
			sidebar: configManager.getSidebarConfig(),
			booking: configManager.getBookingConfig(),
			system: configManager.getSystemConfig(),
			oauth: configManager.getOAuthConfig(),
			search: configManager.getSearchConfig(),
			rateLimit: configManager.getRateLimitConfig(),
			colors: configManager.getColorsConfig(),
			maintenance: configManager.getMaintenanceConfig(),
			i18n: configManager.getI18nConfig()
		};

		appendAuditLog({
			event: 'config.backup.export',
			path: req.path,
			method: req.method,
			ip: getClientIp(req),
			userAgent: req.headers['user-agent'] || null
		});

		res.json(backup);
	});

	app.post('/api/config/restore', checkApiToken, async function(req, res) {
		try {
			const payload = req.body;
			if (!payload || typeof payload !== 'object') {
				return res.status(400).json({ error: 'Invalid restore payload' });
			}

			const beforeState = {
				wifi: configManager.getWiFiConfig(),
				logo: configManager.getLogoConfig(),
				sidebar: configManager.getSidebarConfig(),
				booking: configManager.getBookingConfig(),
				system: configManager.getSystemConfig(),
				oauth: configManager.getOAuthConfig(),
				search: configManager.getSearchConfig(),
				rateLimit: configManager.getRateLimitConfig(),
				colors: configManager.getColorsConfig(),
				maintenance: configManager.getMaintenanceConfig(),
				i18n: configManager.getI18nConfig()
			};

			if (payload.wifi && payload.wifi.ssid !== undefined) {
				await configManager.updateWiFiConfig(payload.wifi.ssid, payload.wifi.password || '');
			}

			if (payload.logo) {
				await configManager.updateLogoConfig(payload.logo.logoDarkUrl, payload.logo.logoLightUrl);
			}

			if (payload.sidebar) {
				await configManager.updateSidebarConfig(
					payload.sidebar.showWiFi,
					payload.sidebar.showUpcomingMeetings,
					payload.sidebar.showMeetingTitles,
					payload.sidebar.minimalHeaderStyle
				);
			}

			if (payload.booking) {
				await configManager.updateBookingConfig(
					payload.booking.enableBooking,
					payload.booking.buttonColor,
					payload.booking.enableExtendMeeting,
					payload.booking.extendMeetingUrlAllowlist,
					payload.booking.roomFeatureFlags,
					payload.booking.roomGroupFeatureFlags,
					payload.booking.checkIn
				);
			}

			if (payload.system && !isSystemEnvConfigured()) {
				await configManager.updateSystemConfig({
					startupValidationStrict: payload.system.startupValidationStrict,
					graphWebhookEnabled: payload.system.graphWebhookEnabled,
					graphWebhookClientState: payload.system.graphWebhookClientState,
					graphWebhookAllowedIps: payload.system.graphWebhookAllowedIps
				});
				require('./socket-controller').refreshPollingSchedule();
			}

			if (payload.oauth && !isOAuthEnvConfigured()) {
				await configManager.updateOAuthConfig({
					clientId: payload.oauth.clientId,
					authority: payload.oauth.authority
				});
				refreshMsalClient();
				require('./socket-controller').refreshMsalClient();
			}

			if (payload.search) {
				await configManager.updateSearchConfig({
					useGraphAPI: payload.search.useGraphAPI,
					maxDays: payload.search.maxDays,
					maxRoomLists: payload.search.maxRoomLists,
					maxRooms: payload.search.maxRooms,
					maxItems: payload.search.maxItems,
					pollIntervalMs: payload.search.pollIntervalMs
				});
				require('./socket-controller').refreshPollingSchedule();
			}

			if (payload.rateLimit) {
				await configManager.updateRateLimitConfig({
					apiWindowMs: payload.rateLimit.apiWindowMs,
					apiMax: payload.rateLimit.apiMax,
					writeWindowMs: payload.rateLimit.writeWindowMs,
					writeMax: payload.rateLimit.writeMax,
					authWindowMs: payload.rateLimit.authWindowMs,
					authMax: payload.rateLimit.authMax
				});
				rebuildRateLimiters();
			}

			if (payload.colors) {
				await configManager.updateColorsConfig(
					payload.colors.bookingButtonColor,
					payload.colors.statusAvailableColor,
					payload.colors.statusBusyColor,
					payload.colors.statusUpcomingColor,
					payload.colors.statusNotFoundColor
				);
			}

			if (payload.maintenance) {
				await configManager.updateMaintenanceConfig(payload.maintenance.enabled, payload.maintenance.message);
			}

			if (payload.i18n && (payload.i18n.maintenanceMessages || payload.i18n.adminTranslations)) {
				await configManager.updateI18nConfig({
					maintenanceMessages: payload.i18n.maintenanceMessages,
					adminTranslations: payload.i18n.adminTranslations
				});
			}

			const afterState = {
				wifi: configManager.getWiFiConfig(),
				logo: configManager.getLogoConfig(),
				sidebar: configManager.getSidebarConfig(),
				booking: configManager.getBookingConfig(),
				system: configManager.getSystemConfig(),
				oauth: configManager.getOAuthConfig(),
				search: configManager.getSearchConfig(),
				rateLimit: configManager.getRateLimitConfig(),
				colors: configManager.getColorsConfig(),
				maintenance: configManager.getMaintenanceConfig(),
				i18n: configManager.getI18nConfig()
			};

			appendAuditLog({
				event: 'config.restore.import',
				path: req.path,
				method: req.method,
				ip: getClientIp(req),
				userAgent: req.headers['user-agent'] || null,
				before: beforeState,
				after: afterState
			});

			res.json({ success: true, config: afterState, message: 'Configuration restore applied' });
		} catch (err) {
			console.error('Error restoring configuration backup:', err);
			res.status(500).json({ error: 'Failed to restore configuration backup' });
		}
	});

	// redirects everything else to our react app
	app.get('*', function(req, res) {
		res.sendFile(path.join(__dirname, '../ui-react/build/', 'index.html'));
	});
};
