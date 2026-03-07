const msal = require('@azure/msal-node');
const config = require('../config/config');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const roomlistAliasHelper = require('./roomlist-alias-helper');
const configManager = require('./config-manager');
const { createRateLimiter } = require('./rate-limiter');
const { appendAuditLog, getAuditLogs } = require('./audit-logger');

const msalClient = new msal.ConfidentialClientApplication(config.msalConfig);

// Check if Calendars.ReadWrite permission is available
let hasCalendarWritePermission = null;
let graphAuthHealthCache = {
	checkedAt: 0,
	result: null
};

function getClientIp(req) {
	const forwardedFor = req.headers['x-forwarded-for'];
	if (forwardedFor) {
		return String(forwardedFor).split(',')[0].trim();
	}
	return req.ip || req.socket?.remoteAddress || 'unknown';
}

function isWebhookIpAllowed(req) {
	if (!Array.isArray(config.graphWebhook.allowedIps) || config.graphWebhook.allowedIps.length === 0) {
		return true;
	}

	const ip = getClientIp(req);
	return config.graphWebhook.allowedIps.includes(ip);
}

function normalizeRoomKey(roomEmail) {
	return String(roomEmail || '').trim().toLowerCase();
}

function normalizeRoomGroupKey(roomGroup) {
	return String(roomGroup || '').trim().toLowerCase();
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

	const useGraphAPI = config.calendarSearch.useGraphAPI === 'true' || config.calendarSearch.useGraphAPI === true;
	if (!useGraphAPI) {
		const result = {
			status: 'skipped',
			message: 'Graph auth check skipped because SEARCH_USE_GRAPHAPI is disabled.'
		};
		graphAuthHealthCache = { checkedAt: now, result };
		return result;
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

	const apiRateLimiter = createRateLimiter({
		windowMs: config.rateLimit.apiWindowMs,
		max: config.rateLimit.apiMax,
		keyGenerator: req => `${getClientIp(req)}:${req.path}`
	});

	const writeRateLimiter = createRateLimiter({
		windowMs: config.rateLimit.writeWindowMs,
		max: config.rateLimit.writeMax,
		keyGenerator: req => `${getClientIp(req)}:${req.path}:${req.method}`
	});

	const authRateLimiter = createRateLimiter({
		windowMs: config.rateLimit.authWindowMs,
		max: config.rateLimit.authMax,
		keyGenerator: req => `${getClientIp(req)}:auth`
	});

	app.use('/api', apiRateLimiter);
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
		const useGraphAPI = config.calendarSearch.useGraphAPI === 'true' || config.calendarSearch.useGraphAPI === true;
		
		// Check if credentials for the selected API are set
		const hasRequiredCreds = useGraphAPI 
			? (
				config.msalConfig.auth.clientId !== 'OAUTH_CLIENT_ID_NOT_SET'
				&& config.msalConfig.auth.authority !== 'OAUTH_AUTHORITY_NOT_SET'
				&& config.msalConfig.auth.clientSecret !== 'OAUTH_CLIENT_SECRET_NOT_SET'
			)
			: (
				config.exchange.username !== 'EWS_USERNAME_NOT_SET'
				&& config.exchange.password !== 'EWS_PASSWORD_NOT_SET'
				&& config.exchange.uri !== 'EWS_URI_NOT_SET'
			);
		
		if (!hasRequiredCreds) {
			return res.status(503).json({
				error: 'Calendar backend is not configured',
				message: useGraphAPI
					? 'Microsoft Graph credentials are missing. Configure OAUTH_CLIENT_ID, OAUTH_AUTHORITY, and OAUTH_CLIENT_SECRET.'
					: 'EWS credentials are missing. Configure EWS_USERNAME, EWS_PASSWORD, and EWS_URI.'
			});
		}

		let api;
		if (useGraphAPI) {
			api = require('./msgraph/rooms.js');
		} else {
			api = require('./ews/rooms.js');
		}

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
		let api;
		if (config.calendarSearch.useGraphAPI === 'true') {
			api = require('./msgraph/roomlists.js');
		} else {
			api = require('./ews/roomlists.js');
		}

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
		const useGraphAPI = config.calendarSearch.useGraphAPI === 'true' || config.calendarSearch.useGraphAPI === true;

		try {
			// Proceed with booking (conflict checks are handled in booking implementations)
			if (useGraphAPI) {
				const bookRoom = require('./msgraph/booking.js');
				const result = await bookRoom(msalClient, roomEmail, bookingDetails);
				triggerRoomRefreshWithFollowUp();
				res.json(result);
			} else {
				// Use EWS
				const bookRoom = require('./ews/booking.js');
				bookRoom(roomEmail, bookingDetails, function(err, result) {
					if (err) {
						console.error('Booking error:', err);
						res.status(500).json({ 
							error: 'Booking failed',
							message: err.message || 'Failed to book room'
						});
					} else {
						triggerRoomRefreshWithFollowUp();
						res.json(result);
					}
				});
			}
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

		const useGraphAPI = config.calendarSearch.useGraphAPI === 'true' || config.calendarSearch.useGraphAPI === true;

		try {
			if (useGraphAPI) {
				const graphApi = require('./msgraph/graph.js');
				
				// Get the access token
				const tokenRequest = {
					scopes: ['https://graph.microsoft.com/.default']
				};
				const authResult = await msalClient.acquireTokenByClientCredential(tokenRequest);
				const accessToken = authResult.accessToken;

				// Get the current event
				const eventUrl = `https://graph.microsoft.com/v1.0/users/${roomEmail}/events/${appointmentId}`;
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
				const updateUrl = `https://graph.microsoft.com/v1.0/users/${roomEmail}/events/${appointmentId}`;
				const updateResponse = await fetch(updateUrl, {
					method: 'PATCH',
					headers: {
						'Authorization': `Bearer ${accessToken}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						end: {
							dateTime: formatDateForGraph(newEnd),
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
			} else {
				// EWS not yet implemented for extend meeting
				res.status(501).json({ 
					success: false,
					error: 'Extend meeting is not yet supported for EWS'
				});
			}
		} catch (error) {
			console.error('Extend meeting error:', error);
			res.status(500).json({ 
				success: false,
				error: error.message || t.generalError
			});
		}
	});

	// Middleware to check API token
	const checkApiToken = (req, res, next) => {
		authRateLimiter(req, res, () => {});
		if (res.headersSent) {
			return;
		}

		const token = req.headers['authorization'] || req.headers['x-api-token'];
		
		// If no token is configured, allow access (backward compatibility)
		if (!config.apiToken) {
			console.warn('WARNING: API_TOKEN not set. Admin API is unprotected!');
			return next();
		}

		// Check if token matches
		const providedToken = token?.replace('Bearer ', '');
		if (providedToken === config.apiToken) {
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

	// Get current WiFi configuration (public - no auth required)
	app.get('/api/wifi', function(req, res) {
		try {
			const config = configManager.getWiFiConfig();
			res.json(config);
		} catch (err) {
			res.status(500).json({ error: 'Failed to retrieve WiFi configuration' });
		}
	});

	// Update WiFi configuration and regenerate QR code (protected - requires token)
	app.post('/api/wifi', checkApiToken, async function(req, res) {
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
			const locks = {
				wifiLocked: !!(process.env.WIFI_SSID),
				logoLocked: !!(process.env.LOGO_DARK_URL || process.env.LOGO_LIGHT_URL),
				sidebarLocked: !!(process.env.SIDEBAR_SHOW_WIFI || process.env.SIDEBAR_SHOW_UPCOMING || process.env.SIDEBAR_SHOW_TITLES),
				bookingLocked: !!(process.env.ENABLE_BOOKING)
			};
			res.json(locks);
		} catch (err) {
			res.status(500).json({ error: 'Failed to retrieve configuration locks' });
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
			const { enableBooking, buttonColor, enableExtendMeeting, extendMeetingUrlAllowlist, roomFeatureFlags, roomGroupFeatureFlags } = req.body;
			const beforeConfig = configManager.getBookingConfig();
			
			if (enableBooking === undefined && buttonColor === undefined && enableExtendMeeting === undefined && extendMeetingUrlAllowlist === undefined && roomFeatureFlags === undefined && roomGroupFeatureFlags === undefined) {
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

			const config = await configManager.updateBookingConfig(enableBooking, buttonColor, enableExtendMeeting, extendMeetingUrlAllowlist, roomFeatureFlags, roomGroupFeatureFlags);

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
					payload.booking.roomGroupFeatureFlags
				);
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
