const msal = require('@azure/msal-node');
const config = require('../config/config');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const roomlistAliasHelper = require('./roomlist-alias-helper');

const msalClient = new msal.ConfidentialClientApplication(config.msalConfig);

// Check if Calendars.ReadWrite permission is available
let hasCalendarWritePermission = null;

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

// Test data generator for when credentials are not configured
function getTestRoomData() {
	const now = Date.now();
	const oneHour = 60 * 60 * 1000;
	const thirtyMin = 30 * 60 * 1000;
	
	return [
		{
			Name: 'Conference Room A',
			RoomAlias: 'conference-a',
			Roomlist: 'Building 1',
			Busy: false,
			Appointments: [
				{
					Subject: 'Team Standup',
					Organizer: 'John Doe',
					Start: now + oneHour,
					End: now + oneHour + thirtyMin,
					Private: false
				},
				{
					Subject: 'Project Review',
					Organizer: 'Jane Smith',
					Start: now + (oneHour * 3),
					End: now + (oneHour * 4),
					Private: false
				}
			]
		},
		{
			Name: 'Meeting Room B',
			RoomAlias: 'meeting-b',
			Roomlist: 'Building 1',
			Busy: true,
			Appointments: [
				{
					Subject: 'Client Presentation',
					Organizer: 'Bob Johnson',
					Start: now - thirtyMin,
					End: now + thirtyMin,
					Private: false
				},
				{
					Subject: 'Design Workshop',
					Organizer: 'Alice Williams',
					Start: now + (oneHour * 2),
					End: now + (oneHour * 3),
					Private: false
				}
			]
		},
		{
			Name: 'Board Room',
			RoomAlias: 'board-room',
			Roomlist: 'Building 2',
			Busy: false,
			Appointments: []
		},
		{
			Name: 'Training Room',
			RoomAlias: 'training',
			Roomlist: 'Building 2',
			Busy: true,
			Appointments: [
				{
					Subject: 'Private Meeting',
					Organizer: 'Sarah Davis',
					Start: now - (oneHour / 2),
					End: now + (oneHour / 2),
					Private: true
				}
			]
		}
	];
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

	// api routes ================================================================
	// returns an array of room objects
	app.get('/api/rooms', function(req, res) {
		const useGraphAPI = config.calendarSearch.useGraphAPI === 'true' || config.calendarSearch.useGraphAPI === true;
		
		// Check if credentials for the selected API are not set - return test data
		const hasRequiredCreds = useGraphAPI 
			? config.msalConfig.auth.clientId !== 'OAUTH_CLIENT_ID_NOT_SET'
			: config.exchange.username !== 'EWS_USERNAME_NOT_SET';
		
		console.log('=== CREDENTIAL CHECK ===');
		console.log('Use Graph API:', useGraphAPI);
		console.log('OAuth Client ID:', config.msalConfig.auth.clientId);
		console.log('EWS Username:', config.exchange.username);
		console.log('Has Required Creds:', hasRequiredCreds);
		
		if (!hasRequiredCreds) {
			console.log('>>> RETURNING TEST DATA - No credentials configured for selected API');
			return res.json(getTestRoomData());
		}

		console.log('>>> CALLING REAL API');
		let api;
		if (useGraphAPI) {
			console.log('Using Microsoft Graph API');
			api = require('./msgraph/rooms.js');
		} else {
			console.log('Using EWS API');
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
				console.log('API Success: Returning', rooms.length, 'rooms');
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
		const { subject, startTime, endTime, description } = req.body;

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
			// First, check if the room is available during the requested time
			const requestedStart = new Date(startTime);
			const requestedEnd = new Date(endTime);

			// Get the room's calendar to check for conflicts
			let calendarEvents;
			if (useGraphAPI) {
				const graphApi = require('./msgraph/graph.js');
				const calendarView = await graphApi.getCalendarView(msalClient, roomEmail);
				calendarEvents = calendarView.value || [];
			} else {
				// For EWS, we need to get calendar events
				const ewsApi = require('./ews/rooms.js');
				// EWS rooms.js returns all rooms with their appointments
				// We need a different approach for EWS - check in the booking function itself
				calendarEvents = null; // Will be checked in EWS booking function
			}

			// Check for conflicts (only for Graph API, EWS will check internally)
			if (calendarEvents) {
				const hasConflict = calendarEvents.some(event => {
					const eventStart = new Date(event.start.dateTime);
					const eventEnd = new Date(event.end.dateTime);
					
					// Check if there's any overlap
					// Overlap occurs if: (requestedStart < eventEnd) AND (requestedEnd > eventStart)
					return requestedStart < eventEnd && requestedEnd > eventStart;
				});

				if (hasConflict) {
					return res.status(409).json({
						error: 'Room not available',
						message: 'The room is already booked during the requested time'
					});
				}
			}

			// Room is available, proceed with booking
			if (useGraphAPI) {
				const bookRoom = require('./msgraph/booking.js');
				const result = await bookRoom(msalClient, roomEmail, bookingDetails);
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
						res.json(result);
					}
				});
			}
		} catch (error) {
			console.error('Booking error:', error);
			res.status(500).json({ 
				error: 'Booking failed',
				message: error.message || 'Failed to book room'
			});
		}
	});

	// Extend existing meeting endpoint
	app.post('/api/extend-meeting', async function(req, res) {
		const { roomEmail, appointmentId, minutes } = req.body;

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
			invalidMinutes: isGerman ? 'Ungültiger Minutenwert' : 'Invalid minutes value',
			invalidMinutesDetails: isGerman 
				? 'Minuten müssen entweder 15 oder 30 sein' 
				: 'Minutes must be either 15 or 30',
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

		// Validate minutes value
		if (![15, 30].includes(minutes)) {
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

	// Configuration endpoints
	const configManager = require('./config-manager');

	// Middleware to check API token
	const checkApiToken = (req, res, next) => {
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
			
			if (!ssid) {
				return res.status(400).json({ error: 'SSID is required' });
			}

			const config = await configManager.updateWiFiConfig(ssid, password || '');
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
			
			if (!logoDarkUrl && !logoLightUrl) {
				return res.status(400).json({ error: 'At least one logo URL is required' });
			}

			const config = await configManager.updateLogoConfig(logoDarkUrl, logoLightUrl);
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
			
			if (showWiFi === undefined && showUpcomingMeetings === undefined && showMeetingTitles === undefined && minimalHeaderStyle === undefined) {
				return res.status(400).json({ error: 'At least one configuration option is required' });
			}

			const config = await configManager.updateSidebarConfig(showWiFi, showUpcomingMeetings, showMeetingTitles, minimalHeaderStyle);
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
			
			// Check if Calendars.ReadWrite permission is available
			const hasPermission = await checkCalendarWritePermission();
			
			// If permission is missing, force disable booking regardless of config
			const effectiveConfig = {
				...bookingConfig,
				enableBooking: hasPermission ? bookingConfig.enableBooking : false,
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

	// Update booking configuration (protected - requires token)
	app.post('/api/booking-config', checkApiToken, async function(req, res) {
		try {
			const { enableBooking, buttonColor } = req.body;
			
			if (enableBooking === undefined) {
				return res.status(400).json({ error: 'enableBooking field is required' });
			}

			// Check if Calendars.ReadWrite permission is available
			const hasPermission = await checkCalendarWritePermission();
			
			if (enableBooking && !hasPermission) {
				return res.status(403).json({ 
					error: 'Cannot enable booking: Calendars.ReadWrite permission is missing',
					message: 'Please grant Calendars.ReadWrite permission in Azure AD to enable the booking feature'
				});
			}

			const config = await configManager.updateBookingConfig(enableBooking, buttonColor);
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
			const { bookingButtonColor, statusAvailableColor, statusBusyColor, statusUpcomingColor } = req.body;
			
			const config = await configManager.updateColorsConfig(
				bookingButtonColor,
				statusAvailableColor,
				statusBusyColor,
				statusUpcomingColor
			);
			
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

	// redirects everything else to our react app
	app.get('*', function(req, res) {
		res.sendFile(path.join(__dirname, '../ui-react/build/', 'index.html'));
	});
};
