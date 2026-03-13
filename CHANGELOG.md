# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.7.7] - 2026-03-13

### Fixed
- **Display Merging for Touchkio Devices**
  - Fixed duplicate display entries for Touchkio devices with both Socket.IO and MQTT connections
  - Extracted and displayed room name from Touchkio page URL
  - Automatically set display type to 'single-room' when room is detected
  - MQTT-only displays now show correct room name instead of hostname

### Changed
- **Improved Display Matching Algorithm**
  - Reordered matching strategies to prioritize IP address exact match (most reliable for same physical device)
  - Added room name matching with IP address for Touchkio displays
  - Prevents false matches between different displays in the same room
  - Ensures Socket.IO and MQTT connections are correctly merged for the same physical device

## [1.7.6] - 2026-03-13

### Changed
- **Optimized MQTT Subscriptions**
  - Reduced from 15 individual subscriptions to 2 wildcard subscriptions
  - `homeassistant/#` - All Home Assistant topics
  - `touchkio/#` - All Touchkio legacy topics
  - Significantly reduces MQTT broker load
  - Improves connection stability on production systems
  - Topic routing now handled in message handler

### Fixed
- **Fixed Touchkio Command Topics**
  - All command topics now use correct `touchkio/{deviceId}/...` format
  - Fixed: power, brightness, kiosk, theme, volume, keyboard, page zoom, page URL commands
  - Commands now properly reach Touchkio displays
  - Status subscriptions remain on Home Assistant format for proper state tracking
- MQTT connection issues on production systems with subscription limits

## [1.7.5] - 2026-03-13

### Added
- **Automatic Room Detection from Page URL**
  - Extracts room name from Touchkio page URL (e.g., `/single-room/venus` → room: "venus")
  - Subscribes to both Home Assistant and Touchkio legacy page URL topics
  - Subscribes to network address topic for IP tracking
  - Room name automatically displayed in admin panel

### Changed
- Enhanced display state tracking with room and network address information

## [1.7.4] - 2026-03-13

### Fixed
- **Corrected MQTT Topic Formats**
  - Fixed display power command topic: `homeassistant/light/{deviceId}/display/power/set` (not `/display/set`)
  - Fixed status subscriptions: using `/status` instead of `/state` (matches actual Touchkio behavior)
  - All status topics now correctly subscribe to `/status` endpoints
  - Command topics remain on `/set` endpoints as per Touchkio specification

## [1.7.3] - 2026-03-13

### Added
- **Complete Touchkio Feature Support**
  - Theme control: `homeassistant/select/{deviceId}/theme/set` → "Light", "Dark"
  - Volume control: `homeassistant/number/{deviceId}/volume/set` → 0-100
  - Keyboard visibility: `homeassistant/switch/{deviceId}/keyboard/set` → "ON", "OFF"
  - Page zoom: `homeassistant/number/{deviceId}/page_zoom/set` → 25-400
  - Page URL navigation: `homeassistant/text/{deviceId}/page_url/set` → URL string
  - Status subscriptions for all new features

### Changed
- All Touchkio features now fully functional with Home Assistant MQTT format
- Removed "temporarily unsupported" warnings - all features are now available

## [1.7.2] - 2026-03-13

### Changed
- **Home Assistant MQTT Format Support**
  - Rewritten Touchkio integration to use real Home Assistant MQTT Discovery format
  - Device ID mapping: `rpi_1A4187` format instead of custom hostnames
  - Automatic hostname mapping from `homeassistant/sensor/{deviceId}/host_name/status`
  - Updated all MQTT topics to Home Assistant format
  - Topics: `homeassistant/light/{deviceId}/display/set` instead of `touchkio/rpi_{hostname}/...`
  - Kiosk mode: `homeassistant/select/{deviceId}/kiosk/set`
  - Buttons: `homeassistant/button/{deviceId}/refresh|reboot|shutdown/execute`

### Fixed
- Touchkio commands now work with real Touchkio devices using Home Assistant format
- Device ID to hostname mapping for proper command routing

### Removed
- **Temporarily Unsupported Features** (not available in current Touchkio Home Assistant format)
  - Theme control (Light/Dark)
  - Volume control
  - Page zoom control
  - Page URL navigation
  - These will be re-added when Touchkio supports them via Home Assistant MQTT

## [1.7.1] - 2026-03-13

### Fixed
- **Touchkio Modal Hostname Resolution**
  - Fixed undefined hostname in MQTT commands (was sending `touchkio/rpi_undefined/...`)
  - Corrected hostname extraction from display object structure (`display.mqtt.hostname`)
  - Fixed all modal command handlers (power, brightness, theme, kiosk, volume, zoom, URL)
  - Fixed display lookup after command execution
  - All MQTT topics now use correct hostname format

### Added
- **Touchkio URL Management**
  - Display and edit page URL for Touchkio displays in admin panel
  - Shows all Touchkio displays, even without assigned room or URL
  - Inline URL editor in Touchkio modal
  - "Set URL" / "Edit URL" functionality
  - Automatic URL application to displays via MQTT

### Changed
- **Module Renaming**
  - Renamed `mqtt-power-bridge.js` to `touchkio.js` for clarity
  - Updated all references and log prefixes
  - Better reflects the module's purpose (Touchkio display management)

## [1.7.0] - 2025-03-12

### Added
- **Unified Display Management**
  - New "Displays" tab merging Socket.IO and MQTT displays in one view
  - Intelligent display matching by hostname and IP address
  - Connection type badges (Socket.IO, MQTT, or both)
  - Unified status indicators showing overall display state
  - System resource monitoring (CPU, Memory, Temperature) for MQTT displays
  - Per-display action buttons based on connection type
  - Auto-refresh every 10 seconds when tab is active
  - Display tracking settings (Client ID vs IP+Room mode, retention time, cleanup delay)

- **Touchkio Display Control Modal**
  - Comprehensive control interface for Touchkio displays
  - System status cards (Display Status, System Resources, Display Mode, Network)
  - Display controls (Power On/Off, Refresh Page)
  - Brightness control (0-255 slider)
  - Volume control (0-100% slider)
  - Page zoom control (25-400% slider)
  - Kiosk mode selection (Fullscreen, Maximized, Framed, Minimized)
  - Theme switching (Light/Dark)
  - System controls (Reboot, Shutdown with confirmation)
  - Real-time status updates and feedback messages

- **Bulk Operations**
  - "Refresh All Touchkio" button for all MQTT displays
  - "Reboot All Touchkio" button for all MQTT displays
  - Buttons automatically disabled when no MQTT displays connected
  - Confirmation dialogs for destructive operations

- **Enhanced Feedback**
  - Success/error messages for all MQTT commands
  - Auto-dismissing notifications (3 seconds)
  - Command feedback shows target hostname
  - Visual confirmation for all operations

### Changed
- **Major Admin Panel Refactoring**
  - Extracted 19 components (2 modals + 17 tabs) from monolithic Admin.js
  - Reduced Admin.js from 7816 to 6132 lines (21.5% reduction)
  - Created modular component structure for better maintainability
  - Extracted PowerManagementModal and TouchkioModal components
  - Extracted all admin tabs: DevicesTab, MqttTab, AuditTab, BackupTab, SystemTab, TranslationApiTab, MaintenanceTab, OAuthTab, SearchTab, RateLimitTab, ApiTokenTab, DisplayTab, WiFiTab, LogoTab, BookingTab, ColorsTab, TranslationsTab

- **Business Logic Separation**
  - Created helpers/ directory with color and translation utilities
  - Created services/ directory with centralized API layer
  - Extracted 495 lines of helper functions and API service code
  - Centralized 40+ API endpoints in adminApi.js service
  - Added colorHelpers.js for hex/HSL color conversions
  - Added translationHelpers.js for language utilities and override state converters

- Moved display tracking settings from MQTT tab to Displays tab
- Removed duplicate Touchkio displays list from MQTT tab
- Power Management button now available for all displays (not just Socket.IO)
- Removed emojis from UI for more professional appearance
- Modals now rendered outside tab conditions for global accessibility

### Improved
- Better code organization and separation of concerns
- Improved maintainability with smaller, focused components
- Reusable components and utilities across the application
- Easier testing and debugging with isolated components
- Modern React patterns and best practices
- Total: ~5182 lines extracted into reusable modules

## [1.6.0] - 2024-XX-XX
- Auto-refresh functionality for display lists

## [1.6.0] - 2026-03-12

### Added
- **MQTT-based Power Management** for Touchkio displays
  - Third power management mode (MQTT) alongside Browser and DPMS
  - Integrated Aedes MQTT broker with TCP (port 1883) and WebSocket (port 8883) support
  - Real-time control via MQTT for Touchkio displays on Raspberry Pi
  - Bidirectional communication with status feedback
  - Home Assistant MQTT Discovery protocol support
  - Configurable MQTT broker settings (port, authentication, discovery)
  - MQTT hostname configuration per display (e.g., "saturn", "jupiter")
  - MQTT broker status monitoring in Admin Panel
  - Connected Touchkio displays list with power control
  - Manual power trigger API endpoint for testing
  - Better scalability for large deployments (20+ displays)
  - Integration with Home Assistant, Node-RED, and other MQTT clients
  - Power management bridge between MeetEasier and Touchkio MQTT topics
  - Automatic schedule checking for MQTT displays
  - Dependencies: `aedes`, `mqtt`, `websocket-stream`

- **Admin Panel MQTT Configuration**
  - New MQTT section in Operations tab
  - Enable/disable MQTT broker
  - Configure MQTT ports (TCP and WebSocket)
  - Authentication settings (username/password)
  - Home Assistant Discovery toggle
  - MQTT broker status display (running/stopped, connected clients)
  - Touchkio displays table with hostname, state, brightness, last update
  - Manual power control buttons (Turn On/Off) for each Touchkio display
  - Real-time MQTT status updates

- **Power Management Enhancements**
  - MQTT mode option in Power Management modal
  - Touchkio hostname input field for MQTT mode
  - MQTT hostname stored in power management configuration
  - Support for MQTT mode in global and display-specific configurations
  - Updated validation to accept 'mqtt' as valid mode
  - MQTT hostname passed to config-manager and stored in JSON

### Changed
- Power management mode validation now accepts 'dpms', 'browser', or 'mqtt'
- Power management configuration structure updated to include optional `mqttHostname` field
- Admin translations updated with MQTT-related strings (German and English)
- Power management help text updated to include MQTT mode description

### Documentation
- Updated `POWER_MANAGEMENT_SETUP.md` with Touchkio MQTT integration guide
- Added MQTT broker configuration instructions
- Documented Touchkio MQTT topic structure
- Added Home Assistant MQTT Discovery format documentation

## [1.5.3] - 2026-03-12

### Added
- **Version Display in Admin Panel**
  - Application version now displayed in Admin Panel header
  - New public API endpoint `/api/version` to retrieve version information
  - Version automatically loaded from package.json
  - No authentication required for version endpoint

- **Offline Support & Performance**
  - Service Worker implementation for offline functionality
  - Precaching of essential assets (CSS, JS, images, fonts)
  - Runtime caching for API responses and dynamic content
  - Cache-first strategy for static assets, network-first for API calls
  - Automatic cache cleanup on version updates
  - Connection monitoring with automatic reconnection
  - Visual connection status indicator (online/offline)
  - Auto-reload after reconnection (if offline > 30 seconds)
  - Periodic health checks every 5 seconds when offline
  - Maximum retry limit (60 attempts = 5 minutes)

- **Admin Panel Enhancements**
  - Logo display on Admin Panel login screen (before authentication)
  - New public `/api/logo` endpoint for logo configuration
  - "Active" status column in Connected Displays table
  - "Power" column with "Configure" button for each display
  - Power Management modal with mode selection (Browser/DPMS)
  - Schedule configuration per display (start time, end time, weekend mode)
  - "Global Standard" button for default power management settings
  - Device type display in Connected Displays table (e.g., "single-room-rpi")

- **Display Tracking Features**
  - Renamed "Display Tracking Settings" to "Tracking Settings"
  - Two tracking modes: Client ID (per browser tab) or IP+Room (per physical display)
  - Configurable retention time (1-168 hours)
  - Configurable cleanup delay (0-60 minutes)
  - Automatic cleanup of old disconnected displays
  - Real-time display status updates via Socket.IO

### Fixed
- **Power Management Critical Bug Fix**
  - Fixed client ID mismatch between browser and Admin Panel configuration
  - Browser now requests server-assigned identifier (IP_Room format) via Socket.IO
  - Power management config lookup now works correctly with IP+Room tracking mode
  - Added `request-identifier` socket event handler in socket controller
  - Power management initializes with correct server-generated identifier
  
- **Power Management Real-time Updates**
  - Display now reloads power management config immediately when changed in Admin Panel
  - Added support for `power-management-update` event (display-specific config)
  - Added support for `power-management-global-update` event (global config changes)
  - Power management reinitializes automatically on config updates
  - Added detailed debug logging for troubleshooting

- **Admin Panel UI Fixes**
  - Fixed vertical alignment of status cell in Connected Displays table
  - Status indicator (dot + text) now properly aligned with other table columns
  - Applied flexbox layout to status cell content
  - Fixed table row height consistency across all columns
  - Logo now loads before authentication on Admin Panel login screen

- **Content Security Policy (CSP)**
  - Added `https://fonts.gstatic.com` to `connectSrc` directive
  - Fixed Google Fonts loading errors in browser console
  - Service Worker can now properly cache font files
  - Eliminated CSP violations for font resources

### Changed
- **Display Client ID Generation**
  - Simplified client ID generation - browser generates persistent UUID
  - Server determines actual tracking identifier based on mode (client-id vs ip-room)
  - Display requests server-assigned identifier after socket connection
  - Improved power management initialization flow

- **Power Management Utility**
  - Added protection against duplicate initialization
  - Power management can now reinitialize with different client IDs
  - Added `initialized` flag to prevent redundant API calls
  - Improved error handling and logging
  - Better support for browser-based fallback when DPMS unavailable

- **Device Detection**
  - Automatic Raspberry Pi detection based on user agent and platform
  - Enhanced displayType includes device info (e.g., "single-room-rpi", "single-room-chrome")
  - Server auto-recommends DPMS mode for RPi, browser mode for others
  - Display type sent via Socket.IO query parameters

- **Admin Panel Improvements**
  - All save buttons now only activate when changes are made
  - Prevents unnecessary API calls and provides better visual feedback
  - Improved button states across all 16 configuration forms
  - Better visual hierarchy in Operations section

### Technical Details
**Power Management:**
- Modified `ui-react/src/components/single-room/Display.js` to request server identifier
- Updated `app/socket-controller.js` with `request-identifier` event handler
- Enhanced `ui-react/src/utils/powerManagement.js` with reinitialization support
- Simplified `ui-react/src/utils/displayClientId.js` for cleaner ID generation

**Offline Support:**
- Created `ui-react/build/service-worker.js` with caching strategies
- Implemented `ui-react/src/utils/connectionMonitor.js` for network monitoring
- Added `ui-react/src/components/global/ConnectionStatus.js` visual indicator
- Integrated Service Worker registration in production builds

**Admin Panel:**
- Updated `scss/_admin.scss` with improved table cell alignment and version display
- Added `loadLogoConfig()` method for pre-authentication logo loading
- Created Power Management modal with real-time config updates
- Enhanced Connected Displays table with status and power management columns

**API Endpoints:**
- Created `/api/version` endpoint in `app/routes.js`
- Made `/api/logo` endpoint public (no authentication required)
- Enhanced `/api/power-management` endpoints with global config support

**Configuration:**
- Added version field to `package.json` (1.5.3)
- Updated `server.js` CSP configuration for font loading
- Enhanced `app/config-manager.js` with power management functions

### Notes
- After server restart, displays must be refreshed (Cmd+Shift+R) to load new socket logic
- Power management config is checked every minute for schedule enforcement
- Browser-based power management works as fallback even when DPMS mode is configured
- Service Worker caches are automatically cleaned up on version updates
- Connection monitor auto-reloads page after 30+ seconds offline when reconnected
- Logo on Admin Panel login screen requires configured logo in settings

### Breaking Changes
None

### Security
- **Input Validation Hardening**
  - Added comprehensive validation for `/api/power-management/:clientId` endpoint
  - Protection against prototype pollution attacks (`__proto__`, `constructor`, `prototype`)
  - Protection against path traversal attacks (`..`, `/`, `\`)
  - Client ID length validation (3-250 characters)
  - Whitelist-based character validation for client IDs
  
- **Socket.IO Query Parameter Validation**
  - Added strict validation for `displayType` parameter (alphanumeric, hyphens, underscores only)
  - Added validation for `roomAlias` parameter (alphanumeric, spaces, dots, hyphens, underscores)
  - Maximum length limits enforced (50 chars for displayType, 100 chars for roomAlias)
  - Protection against XSS and injection attacks via socket parameters

- **Code Quality**
  - Removed duplicate `/api/logo` endpoint definition
  - Consistent input validation across all public endpoints
  - All public endpoints protected by rate limiting
  - No sensitive information exposed in public endpoints

- **Security Review**
  - Comprehensive security audit completed
  - All identified vulnerabilities fixed
  - Security review document created (`SECURITY_REVIEW_1.5.3.md`)
  - Approved for production deployment

## [1.5.2] - 2026-03-11

### Changed
- **Admin Panel UX Improvements**
  - All save buttons now only activate when changes are made
  - Prevents unnecessary API calls and provides better visual feedback
  - Implemented for all 16 configuration forms:
    - Display Configuration, WiFi, Logo, Colors, Booking
    - Translations, API Tokens, System, Translation API
    - OAuth, Graph Runtime, Maintenance, Tracking Settings
    - Search Configuration, Rate Limit Configuration
  - Logo button now works correctly for both URL and File upload modes

## [1.5.1] - 2026-03-11

### Changed
- **Admin Panel Reorganization**
  - Renamed "Connected Displays" tab to "Devices" in Operations section
  - Moved Display Tracking Settings from System Configuration to Devices tab for better logical grouping
  - Display tracking settings now appear directly with the device list for easier access and management
  - Shortened section title from "Display Tracking Settings" to "Tracking Settings" for cleaner UI

## [1.5.0] - 2026-03-11

### Added
- **Configurable Display Tracking System**
  - Added two tracking modes: Client ID (default) and IP + Room
  - Client ID mode: Each browser tab is tracked separately with unique identifier
  - IP + Room mode: Displays are grouped by IP address and room name (ideal for dedicated hardware)
  - Configurable retention time for disconnected displays (1-168 hours, default: 2 hours)
  - Configurable cleanup delay after disconnect (0-60 minutes, default: 5 minutes)
  - Settings available in Admin Panel → Operations → System Configuration
  - Automatic cleanup based on configured retention time
  - Scheduled cleanup after configured delay when display disconnects

### Changed
- **Display Tracking Improvements**
  - Reduced default retention time from 7 days to 2 hours for cleaner display list
  - Added 5-minute grace period before automatic cleanup (allows for brief network interruptions)
  - Display tracking configuration now persists in system-config.json
  - Socket controller now uses configurable tracking settings

## [1.4.1] - 2025-03-11

### Added
- **Delete Disconnected Displays**
  - Added delete button for disconnected displays in the Connected Displays tab
  - Only displays with "Not Connected" status can be deleted
  - Confirmation dialog before deletion
  - Automatic list refresh after successful deletion

## [1.4.0] - 2025-03-11

### Added
- **Connected Displays Overview in Admin Panel**
  - Added new "Connected Displays" tab in Operations section showing all connected display clients
  - Displays show: Status, Display Type, Room Name, IP Address, and Connection Time
  - Three status indicators: Active (green), Inactive (yellow), Not Connected (red)
  - Automatic status updates every 10 seconds
  - IPv4 address extraction from IPv6-mapped addresses (::ffff:x.x.x.x → x.x.x.x)
  - Disconnected displays remain visible for 7 days before automatic cleanup
  - Heartbeat mechanism: Displays send status updates every 30 seconds
  - Delete button for disconnected displays to manually remove them from the list

- **Unique Display Client IDs per Browser Tab**
  - Each browser tab/window now gets a unique display client ID using sessionStorage
  - Multiple rooms can be opened in the same browser and are tracked separately
  - Combines base client ID (localStorage) with session ID for uniqueness

- **Flightboard Light Mode**
  - Added configurable light mode for flightboard displays with white background and improved contrast
  - Added `flightboardDarkMode` configuration option in admin panel (default: true for backward compatibility)
  - Implemented real-time mode switching via Socket.IO
  - Added automatic logo switching (dark/light) based on flightboard mode
  - Created `_modern-flightboard-light.scss` with optimized light theme styling

### Changed
- **Admin Panel Dark Mode Configuration**
  - Renamed "Raum-Minimal Header-Stil" to "Dark Mode Stil" for better clarity
  - Reorganized admin panel: Dark Mode toggle now appears before style options
  - Updated translations (German and English) for improved user experience

- **SCSS File Structure Reorganization**
  - Renamed `_modern-flightboard.scss` to `_modern-flightboard-dark.scss`
  - Renamed `_modern-single-room.scss` to `_modern-single-room-light.scss`
  - Renamed `_modern-room-minimal.scss` to `_modern-single-room-dark.scss`
  - Improved naming convention for clear distinction between dark and light mode styles

### Removed
- **Legacy room-minimal Component**
  - Removed obsolete `ui-react/src/components/room-minimal/` directory
  - Functionality fully integrated into single-room component with dark mode support

## [1.3.2] - 2026-03-09

### Added
- **Configurable Upcoming Meetings Count**
  - Added `upcomingMeetingsCount` to sidebar runtime configuration with validation and persistence
  - Added support for `SIDEBAR_UPCOMING_COUNT` environment default/lock behavior
  - Added admin UI input to configure the upcoming meetings count (range: 1-10)

- **First-Run Admin Token Bootstrap**
  - Removed automatic fallback admin token and introduced first-run token bootstrap flow
  - Added initial setup API endpoints to create the first admin token when none is configured
  - Admin login now supports bootstrap-on-first-login using the entered token
  - Fixed bootstrap flow after deleting prior token/key artifacts by allowing initial token creation without blocked OAuth secret migration
  - Prevented automatic maintenance fallback when Graph API is not configured yet, so first-run admin setup can be completed normally

### Removed
- **Legacy room-minimal Display Removed**
  - Removed all obsolete `room-minimal` display components, tests, and layout files
  - `/room-minimal/:name` route now fully handled by `SingleRoomLayout` with dark mode and legacy compatibility
  - Ensured full visual and functional parity before cleanup
### Changed
- **Sidebar Display Controls**
  - Updated display settings in admin so WiFi/QR and upcoming meetings can be enabled at the same time
  - Updated single-room and room-minimal displays to honor configured upcoming meetings count

- **Sidebar Density for Small Screens**
  - Reduced meeting item padding for compact sidebars on smaller displays in both modern single-room and room-minimal layouts

- **Sidebar Upcoming Section Layout**
  - Removed the upcoming meetings headline in room-minimal and single-room sidebars to increase vertical space for appointments

- **Security Hardening: Booking + Webhooks**
  - Added strict booking datetime validation (parseable start/end, start < end, max booking duration 24h)
  - Enforced strict Graph webhook `clientState` matching per notification (no permissive fallback)

- **Security Hardening: Logs + Validation + CORS**
  - Sanitized backend error logging in critical booking/sync paths to avoid leaking raw exception payloads
  - Added stricter request validation for booking payloads (room email, subject length, description length, time field bounds)
  - Added strict OAuth input validation for client ID, tenant ID, authority format and client secret constraints
  - Tightened public API CORS policy to require same-origin or explicit allowlist via `PUBLIC_ALLOWED_ORIGINS`/`ALLOWED_ORIGINS`

- **Security + Stability Hardening: Headers, Timeouts, Retries**
  - Enforced explicit `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` via Helmet defaults
  - Enabled strict HSTS handling for HTTPS responses (configurable via `HSTS_MAX_AGE`)
  - Added centralized Graph fetch timeout/retry behavior for key Graph API operations (`GRAPH_FETCH_TIMEOUT_MS`, `GRAPH_FETCH_RETRY_ATTEMPTS`, `GRAPH_FETCH_RETRY_BASE_MS`)
  - Reduced error-information disclosure by defaulting to generic client error messages unless `EXPOSE_DETAILED_ERRORS=true`
  - Mitigated rate limiter memory growth with bounded bucket capacity and on-request cleanup
  - Added process-level handlers for `unhandledRejection` and `uncaughtException` to avoid silent failure modes
  - Added Admin Panel controls for these runtime settings (Operations → System for generic system settings, Operations → Graph-API for Graph runtime settings)
  - Removed legacy OAuth secret decryption/token-migration fallback tied to `change-me-admin-token`
  - Fixed false-positive system runtime lock state by basing lock detection on startup env snapshot instead of runtime `process.env` overrides

## [1.3.0] - 2026-03-08

### Added
- **Dedicated WiFi API Token Flow**
  - Added support for a separate WiFi API token alongside the existing admin token
  - WiFi write operations (`POST /api/wifi`) now accept either token via the existing headers (`Authorization` or `X-API-Token`)
  - Added runtime WiFi token lock detection and reporting in `/api/config-locks`

- **WiFi Token Management in Admin**
  - Added WiFi API token metadata and rotation controls in the Operations → API-Token section
  - Added dedicated WiFi token state, validation and success/error handling in admin UI
  - Added support for updating WiFi token via `/api/api-token-config` using `newWifiToken`

### Changed
- **Admin Operations UX**
  - Renamed OAuth fallback tab label from `Kalender` to `Graph-API`
  - Admin config pages now refresh immediately on socket update events (`wifiConfigUpdated`, `apiTokenUpdated`, etc.)
  - Added periodic config refresh fallback in admin for additional robustness

- **WiFi API Read Behavior**
  - Restored full WiFi payload on `GET /api/wifi` (including password) for UI/runtime parity
  - Fixed WiFi info page behavior so password remains visible after page reload

- **HTTP Security Headers**
  - Added Helmet middleware in backend startup to enable baseline security headers
  - Added protections for clickjacking, MIME-sniffing and safer default content loading via CSP

- **API CORS Policy**
  - Added CORS middleware with a restrictive policy for protected API routes
  - Public read-only endpoints remain cross-origin readable, while protected operations require same-origin or `ALLOWED_ORIGINS` allowlist

- **Booking Abuse Protection**
  - Added a dedicated booking rate limiter for `/api/rooms/:roomEmail/book`, `/api/extend-meeting` and `/api/end-meeting`
  - Added runtime-configurable booking limiter settings via `RATE_LIMIT_BOOKING_WINDOW_MS` and `RATE_LIMIT_BOOKING_MAX`

- **Client-Side Style Injection Hardening**
  - Replaced `innerHTML` with `textContent` when applying dynamic style blocks in room-minimal display

- **Admin Auth Hardening (Hybrid Mode)**
  - Migrated Admin panel session flow from `sessionStorage` to HTTP-only auth cookies (`/api/admin/login`, `/api/admin/logout`, `/api/admin/session`)
  - Kept header-token compatibility for external API clients and WiFi integrations (no breaking changes for `Authorization` / `X-API-Token` usage)
  - Adjusted auth-rate-limit usage so normal authenticated admin operations no longer trigger premature `429` responses

- **Request Body Size Limits**
  - Added explicit request body limits for JSON and URL-encoded payloads to reduce DoS risk from oversized bodies
  - Added configurable server-side guards via `REQUEST_BODY_LIMIT` and `URLENCODED_PARAMETER_LIMIT`

- **Error Response Sanitization**
  - Standardized server error responses to avoid exposing raw internal exception messages in production
  - Added centralized client-safe error message handling in API routes while preserving detailed messages in non-production environments

- **Graph Date Handling Hardening**
  - Removed global `Date.prototype` mutation in Graph calendar logic and replaced it with a local date helper in `app/msgraph/graph.js`

- **Extend Meeting Graph Validation Fix**
  - Fixed Graph event extension payload generation to use consistent DateTime + timeZone handling, resolving `ErrorPropertyValidationFailure` when extending meetings

- **Configurable Upcoming Meetings Count**
  - Added configurable sidebar setting for how many upcoming meetings are shown in room-minimal display (range: 1-10)

## [1.2.8] - 2026-03-08

### Changed
- **Admin Translation Source Split**
  - Frontend admin default translations are now limited to `de` and `en` in `ui-react/src/config/adminTranslations.js`
  - Additional admin translation locales are now read from runtime i18n config (`data/i18n-config.json`)

- **Translation Provider Defaults (Google Cloud)**
  - Auto-translation default endpoint switched to Google Cloud Translation API (`https://translation.googleapis.com/language/translate/v2`)
  - Admin Translation API form defaults and placeholder were updated to the Google endpoint

- **Auto-Translate Safety Rules**
  - Auto-translate is now effectively disabled when no Translation API key is configured
  - Added backend safeguards to enforce the API-key requirement in runtime config and translation execution path

### Added
- **Translation UX Feedback**
  - Added explicit warning in the Translations tab when no Translation API key is configured
  - Added immediate success/error messages in the add/remove language area for language create/delete actions

### Added
- **Admin Operations Runtime Controls**
  - Added runtime API endpoints for OAuth and System configuration (`/api/oauth-config`, `/api/system-config`)
  - Added runtime API token metadata and update endpoints (`/api/api-token-config`)
  - Added runtime persistence for OAuth/System/API token configuration in dedicated files under `data/`

- **Admin Auth Session Flow**
  - Added explicit admin login/logout flow with session token persistence in the React admin UI
  - Added centralized unauthorized handling with automatic logout on `401` responses

- **Admin API Token Management UX**
  - Added Operations tab section to show API token source/default status and rotate token
  - Added translated UI strings for the API token section across all shipped admin languages (DE/EN/FR/ES/IT/NL/PL/PT/CS)

### Changed
- **Graph-Only Runtime Model**
  - Unified calendar operations to Microsoft Graph runtime paths and removed remaining EWS execution branches in routes/socket flow
  - Search mode now runs in Graph-only mode at runtime (`useGraphAPI: true`)
  - Corrected Graph auth scope usage to `https://graph.microsoft.com/.default`

- **API Token Source & Lock Semantics**
  - Added default fallback token (`change-me-admin-token`) when no token is configured
  - Effective admin auth token now resolves from env → runtime → default consistently in backend middleware
  - If `API_TOKEN` is set in environment, admin token updates are locked (not changeable via Admin UI/API)

- **OAuth Runtime Handling**
  - OAuth authority inputs are normalized to tenant-based Microsoft login authority URLs
  - OAuth secret encryption now derives from effective API token and supports re-encryption on token rotation
  - MSAL clients are refreshed after OAuth runtime updates in routes/socket controller

- **Environment Lock Coverage**
  - Extended config-lock reporting and enforcement for API token, OAuth, System and Maintenance sections

### Fixed
- **Maintenance Message Safety**
  - Auto-maintenance fallback no longer appends technical backend error details to display messages
  - Existing auto-generated maintenance messages are normalized back to the safe fallback message

- **Admin Login Visibility & Reliability**
  - Improved login button contrast/visibility in admin styling
  - Fixed admin flow so protected requests consistently trigger unauthorized handling and logout

- **Startup Validation Behavior**
  - Missing OAuth values now produce actionable startup info instead of hard failure to allow admin-side setup
  - Default API token now triggers a warning instead of blocking startup

### Documentation
- Updated default API token behavior and production guidance in `README.md`, `INSTALLATION.md`, `CONFIGURATION.md`, and `.env.template`

### Maintenance
- Updated `.gitignore` runtime config ignore behavior for generated `data/*` runtime files

### Added
- **Admin Runtime Configuration (Operations Tab)**
  - Added editable Search settings in admin (`useGraphAPI`, limits, poll interval)
  - Added editable Rate Limit settings in admin (API/Write/Auth windows and request caps)
  - Added dedicated backend endpoints for both config domains (`/api/search-config`, `/api/rate-limit-config`)

### Changed
- **Persistent Search/Rate Config Model**
  - Search and rate-limit values are now persisted in dedicated runtime config files under `data/`
  - Runtime configuration is applied on startup so admin-defined values survive restarts
  - Backup/restore now includes Search and Rate Limit configuration blocks

- **Live Runtime Application**
  - Rate limiter middleware now supports runtime reconfiguration without server restart
  - Search polling schedule is refreshed immediately after admin updates or config restore

### Fixed
- **Admin Lock Enforcement for Environment Overrides**
  - Admin sections are now locked as soon as any related environment variable is defined
  - Lock detection now treats defined-but-empty env variables as configured
  - Booking lock also covers all `CHECKIN_*` environment overrides

## [1.2.7] - 2026-03-07

### Added
- **Operations & Security Endpoints**
  - Added `/api/health` and `/api/readiness` endpoints with Graph auth, sync and cache diagnostics
  - Added maintenance endpoints (`/api/maintenance`, `/api/maintenance-status`) and runtime i18n endpoint (`/api/i18n`)
  - Added configuration backup/restore endpoints (`/api/config/backup`, `/api/config/restore`)

- **Security & Observability**
  - Added rate-limiting middleware for general API traffic, write operations and auth attempts
  - Added audit logging with sensitive field redaction and admin endpoint to fetch recent audit entries
  - Added startup validation module with explicit configuration checks and startup diagnostics

- **Graph Webhook Support**
  - Added Graph webhook validation and notification receiver endpoints
  - Added webhook-aware refresh triggering with polling fallback behavior

- **Admin Translation Management**
  - Added dedicated admin translation defaults/config module
  - Added centralized display translation bridge and maintenance message runtime config module
  - Added default maintenance/admin text coverage for additional languages (including FR/ES/IT/NL/PL/PT/CS)
  - Added dedicated translations workflow in admin with grouped editors and quick language creation

- **Configuration Safety Features**
  - Added startup configuration validation with explicit configuration checks and startup diagnostics
  - Added rate-limiting middleware for general API traffic, write operations and auth attempts

### Changed
- **Booking Feature Flag Model**
  - Extended booking configuration to support room-specific and room-group-specific overrides
  - Effective booking/extend resolution now follows global → room group → room precedence
  - Booking/extend API paths and modal requests now pass room context (room email + room group alias)

- **Meeting Management & Check-in Flow**
  - Added integrated “Manage Meeting” flow in display sidebar and modal (extend + end actions)
  - End meeting now shortens the current appointment instead of deleting it from the calendar
  - Check-in flow now updates meeting start to current time when check-in happens before scheduled start
  - Book action remains visible until check-in is actually actionable (prevents premature button switching)

- **Admin Booking Controls**
  - Booking config now persists runtime check-in settings (enabled, external-only, early window, timeout, auto-release)
  - Admin booking tab now exposes full check-in/no-show controls and includes these values in config updates

- **Admin Booking UX**
  - Replaced JSON-only override workflow with structured override controls in Admin booking tab
  - Added direct selection for room groups and rooms (dropdowns) with manual input fallback
  - Added override preview and improved editing/removal flow for override entries

- **Display Translation Usage**
  - Migrated single-room, room-minimal and flightboard display texts to centralized translation sources
  - Updated legacy config adapters (`singleRoom.config.js`, `flightboard.config.js`) to use runtime translation providers

- **Admin UX for Translations**
  - Refined translations tab layout to match existing config blocks
  - Added collapsible category groups (collapsed by default)
  - Unified language selector labels to consistent `Name (code)` formatting

- **Maintenance Behavior**
  - Added automatic maintenance fallback activation on Graph sync failures and automatic recovery on successful sync

- **Configuration Defaults & Docs**
  - Extended `.env.template` and server configuration with startup validation, webhook and rate-limit settings
  - Updated configuration documentation for new endpoints and booking override schema

### Fixed
- **Startup Safety**
  - Replaced silent calendar credential fallback behavior with explicit startup/configuration errors
  - `/api/rooms` now returns clear configuration errors instead of test data fallback when backend credentials are missing

- **Calendar Update Reliability**
  - Hardened Graph event update calls with encoded identifiers and consistent UTC timestamp formatting

- **Meeting Action Localization**
  - Added meeting action modal translation keys for all shipped languages and made them editable in admin translations
  - Aligned modal button/loading labels to consistent “End Meeting” wording across display variants

- **Translation Language Selector**
  - Fixed selected language persistence and normalization in admin translations

- **Admin Dropdown Readability**
  - Fixed select field text readability by tightening select padding and enforcing option foreground/background colors
  - Aligned new booking override dropdown sizing/spacing with existing admin form controls

- **Maintenance Text Propagation**
  - Fixed runtime propagation of maintenance and display translation updates across connected clients

## [1.2.6] - 2026-03-06

### Added
- **Dedicated Unavailable Room Status**
  - Added a dedicated room status for missing/unlisted rooms instead of reusing available/busy states
  - Added configurable `statusNotFoundColor` in color configuration and admin UI
  - Added a dedicated status class for single-room and room-minimal displays

### Changed
- **Unavailable Status UX**
  - Updated unavailable status label to compact display-friendly text (`N/A` in English, `N/V` in German)
  - Replaced "Not Found" wording in admin color settings with "Unavailable"

- **Room Not Found Rendering**
  - Missing rooms are no longer shown as available/green
  - Missing rooms no longer render "Room not found" as room name fallback

### Fixed
- **Single-Room Unavailable Styling**
  - Fixed unavailable status panel to use the dedicated unavailable background color
  - Fixed unavailable status text/dot color mapping to the dedicated status color

- **Room-Minimal Unavailable Styling**
  - Adjusted unavailable state to transparent presentation for minimal display mode
  - Kept dedicated unavailable status class and color mapping for consistent behavior

## [1.2.5] - 2026-02-23

### Fixed
- **Cross-Display Booking Sync**
  - Room state is now pushed to all connected displays immediately after successful booking
  - Added a follow-up refresh 4 seconds later to catch delayed calendar backend propagation
  - Applied to both room booking and extend meeting flows for consistent updates

- **Extend Meeting Availability UX**
  - Extend button is now disabled and visually greyed out when extension would overbook the room
  - Added front-end pre-check for minimum 5-minute extension window before the next meeting
  - Applied to both single-room and room-minimal displays

## [1.2.4] - 2026-02-17

### Added
- **Extend Meeting Admin Control**
  - New admin toggle to enable/disable meeting extensions globally
  - Extend meeting requires `?extendbooking=true` in display URL
  - Optional URL allowlist via booking configuration

### Changed
- **Extend Meeting UX**
  - Extend action moved to the sidebar button location
  - Extend modal now uses the same duration options as booking (5–240 minutes)

- **Booking Conflict Handling**
  - Removed redundant pre-check to avoid false conflicts; rely on booking implementation

### Technical
- **Configuration**
  - `booking-config.json` now includes `enableExtendMeeting` and `extendMeetingUrlAllowlist`

## [1.2.4] - 2026-02-17

### Added
- **Extend Meeting Controls**
  - Admin toggle to enable/disable extend meeting (disabled by default)
  - Extend meeting uses booking-style modal with quick buttons and custom slider (5–240 minutes)
  - Sidebar action button swaps between Book/Extend based on room state

### Changed
- **Extend Meeting Access**
  - Requires `?extendbooking=true` in display URL
  - Optional URL allowlist support via booking config
  - Buttons removed from meeting cards for a cleaner UI

### Fixed
- **Booking Availability**
  - Removed pre-check that could incorrectly block short bookings

### Documentation
- Updated booking configuration docs and API examples

## [1.2.3] - 2026-02-16

### Added
- **Status Change Animations**
  - Smooth 0.8-second background transitions when room status changes
  - Applied to single-room, room-minimal, and flightboard displays
  - Graceful color transitions between available/busy/upcoming states

- **Extend Meeting Functionality**
  - Added +15 min and +30 min extension buttons to current meeting cards
  - Buttons appear on both single-room and room-minimal displays when room is busy
  - Real-time conflict detection prevents overbooking
  - End-of-day boundary checking prevents extending meetings beyond midnight
  - Automatic refresh of room data after successful extension

- **Calendar Sync Status Monitoring**
  - Real-time sync status display in admin panel
  - Shows seconds since last successful sync with color-coded status indicators
  - Stale data warning when sync is older than 3 minutes (180 seconds)
  - Auto-refresh every 30 seconds for real-time monitoring
  - Displays sync errors and failure messages when issues occur

- **Multi-Language Support Enhancements**
  - German/English translations for extend meeting error messages
  - HSL color picker labels now translated (Hue/Farbton, Saturation/Sättigung, Lightness/Helligkeit)
  - Backend error messages with Accept-Language header detection
  - Frontend translations using browser language detection (navigator.language)
  - Proper German word order for time expressions ("vor X Sekunden" vs "X seconds ago")

### Changed
- **UI/UX Improvements**
  - Consistent button sizing between single-room and room-minimal displays
  - Consistent text sizing for upcoming meetings across displays
  - Meeting card border-radius standardized to 1rem for modern appearance
  - Error handling moved from browser alerts to styled modal dialogs
  - All error modals use BookingModal CSS classes for consistent styling
  - Modal positioning improved (moved outside flex containers, z-index 9999)

- **Sync Status Precision**
  - Changed from minutes to seconds for more accurate sync monitoring
  - Calculation: Math.floor((now - lastSync) / 1000)

### Fixed
- **Microsoft Graph API Integration**
  - Added missing appointment Id field to calendar events (msgraph/rooms.js and ews/rooms.js)
  - Fixed date format validation errors (now uses YYYY-MM-DDTHH:MM:SS format)
  - Improved HTTP status code checking for error handling
  - Fixed syntax errors (missing closing braces in routes.js)

- **Error Handling**
  - Modal dialogs now properly display on both single-room and minimal displays
  - Fixed z-index layering issues by repositioning modals outside flex containers
  - Improved error state management and user feedback

### Technical
- **API Endpoints**
  - New `/api/extend-meeting` endpoint with conflict validation
  - New `/api/sync-status` endpoint for monitoring calendar sync health
  - Overlap detection logic: (currentStart < eventEnd) AND (newEnd > eventStart)
  - Graph API date formatting helper function: formatDateForGraph()

- **Socket.IO Enhancements**
  - Added lastSyncTime, lastSyncSuccess, syncErrorMessage tracking
  - New getSyncStatus() function with secondsSinceSync calculation
  - Real-time sync status updates broadcast to admin panel

- **SCSS Architecture**
  - Moved inline modal styles to dedicated SCSS classes
  - Created _admin.scss for centralized admin panel styles
  - Added error-specific classes (error-title, error-message) to _booking-modal.scss
  - Updated compiled.scss to include admin styles

## [1.2.2] - 2026-02-16

### Fixed
- **Microsoft Graph Booking**
  - Added conflict detection to prevent double-booking of rooms
  - Room calendar is now checked for overlapping events before creating new bookings
  - Requires `Calendars.Read` or `Calendars.Read.Shared` permission for conflict checking
  - Improved error messages for permission-related failures

### Security
- **Room Booking Security**
  - Added validation to prevent adding attendees or additional resources to room bookings
  - Requests attempting to add `attendees`, `requiredAttendees`, `optionalAttendees`, `resources`, or `locations` fields are now rejected
  - Applied to both Microsoft Graph and EWS booking methods
  - Protects against unauthorized booking on behalf of other users

### Changed
- **Booking Modal UI Improvements**
  - Replaced duration dropdown with intuitive slider control (5-minute intervals, 5-240 minutes)
  - Updated to professional charcoal/slate color scheme across all booking interfaces
  - Improved visual consistency between booking modal, single-room, and room-minimal displays
  - Enhanced button hover effects and shadows for better user feedback
  - Increased border radius for softer, more modern appearance
  - Added customizable booking button colors via admin panel
  - Administrators can now select custom button colors with real-time preview
  - Colors are applied dynamically across all booking buttons using CSS custom properties
  - Color settings persist and sync in real-time via Socket.IO to all connected displays

### Technical
- **SCSS Organization**
  - Moved BookingModal.scss and WiFi.scss to centralized `/scss` folder
  - Integrated component styles into compiled.scss for consistent delivery
  - Removed direct SCSS imports from React components (now served via backend compiled styles.css)

## [1.2.0] - 2026-02-10

### Added
- **Vite Build System**
  - Migrated from Create React App (react-scripts) to Vite
  - 10-100x faster builds and instant hot module replacement
  - Native ES modules in development mode
  - Smaller production bundle sizes with better tree-shaking
  - Modern tooling for improved developer experience

### Changed
- **Build Performance**
  - Build time reduced from ~30s to ~3s
  - Dev server startup from ~10s to ~1s
  - Hot reload now instant (was ~2s)
  - Converted config files from CommonJS to ES modules

- **Testing Framework**
  - Replaced Jest with Vitest for faster test execution
  - Updated test setup for Vitest compatibility
  - Maintained all existing test coverage

### Fixed
- **Security Vulnerabilities**
  - Fixed all production CVEs (0 vulnerabilities)
  - Fixed CVE-2026-25639 (axios mergeConfig __proto__ crash) with explicit override to v1.13.5
  - Removed deprecated npm packages
  - Updated axios to fix DoS vulnerability
  - Added overrides for esbuild and diff (dev dependencies only)

- **GitHub Actions**
  - Fixed Trivy image scanning with correct repository name format
  - Fixed Trivy scan timing - added 30s wait for multi-platform images
  - Fixed SARIF file upload errors with existence checks
  - Fixed security-scan workflow to skip Docker scan on push events
  - Added security-events permission for SARIF uploads
  - Added continue-on-error for Trivy scans to prevent workflow failures
  - Improved error handling and logging in all workflows

- **Docker Build**
  - Updated Dockerfile comments for Vite
  - Fixed production build process (proper NODE_ENV handling)
  - Added build verification step
  - Removed build-time secrets (now runtime only)

- **UI Components**
  - Fixed room status label not showing in single-room view
  - Fixed config imports after ES module conversion (changed from namespace to default imports)

### Removed
- **Deprecated Dependencies**
  - Removed react-scripts and all related overrides
  - Removed 15+ deprecated package warnings
  - Cleaner dependency tree

## [1.1.1] - 2026-02-09

### Added
- **Dynamic Logo on WiFi Info Page**
  - WiFi info page now loads logo from API configuration
  - Real-time logo updates via Socket.IO
  - Consistent with admin panel logo management

### Changed
- **Reduced Flightboard Row Spacing**
  - Decreased spacing between meeting room rows for more compact display
  - Allows more rooms to be visible on screen at once
  - Better space utilization on displays

## [1.1.0] - 2026-02-09

### Added
- **Configurable Room-Minimal Header Style**
  - Choose between filled (colored background) or transparent (border only) header styles
  - Colored text in transparent mode matching room status (green/red/orange)
  - Configuration available in admin panel under Information Configuration
  - Only applies to `/room-minimal` displays

- **Redesigned Admin Panel**
  - Modern tabbed interface with 4 sections: Display, WiFi, Logo, Booking
  - Improved visual hierarchy with cleaner layout
  - Better responsive design for mobile devices
  - Grid-based current configuration display for easier scanning
  - Enhanced form styling with hover effects and better spacing

- **Simplified Booking Modal**
  - Touch-friendly interface with only quick book buttons (15, 30, 60, 120 minutes)
  - Removed keyboard input requirements for better tablet experience
  - Removed header and close button (click overlay to close)
  - Dark theme support for room-minimal displays
  - 2x2 button grid layout

### Changed
- **Renamed "Sidebar Configuration" to "Information Configuration"**
  - More accurate description of what the settings control
  - Updated in admin panel, API responses, and documentation
  - Clarified that settings apply to single-room, room-minimal, and flightboard displays

- **Renamed `wifi-manager.js` to `config-manager.js`**
  - Better reflects the module's purpose (manages WiFi, Logo, Information, and Booking configs)
  - Updated all imports and references throughout codebase
  - Improved code documentation

- **Improved Help Text**
  - Clarified that header style only applies to room-minimal displays
  - Updated meeting titles help text to mention all affected displays
  - Better descriptions in both English and German

### Removed
- Unused `WiFiAdminLayout.js` component
- Emoji icons from admin panel for cleaner, more professional look
- Custom date/time input from booking modal (touch-unfriendly)

### Fixed
- Admin panel state management for information configuration
- CSS compilation for room-minimal header styles
- Booking modal dark theme styling

## [1.0.1] - 2026-02-08

### Fixed
- **Admin Panel JavaScript Error**
  - Fixed `bookingPermissionMissing is not defined` error
  - Admin panel now loads correctly without console errors

### Changed
- **Consolidated Authentication**
  - Renamed `WIFI_API_TOKEN` to `API_TOKEN` for clarity
  - Single token now protects all admin API endpoints
  - Updated documentation to reflect simplified token configuration

- **Meeting Cards Alignment**
  - Fixed alignment of current and next-up meeting cards on single-room display
  - Cards now align to bottom of status area instead of top
  - Improved visual balance

### Documentation
- Updated README.md with simplified token configuration
- Updated SECURITY.md with API_TOKEN changes
- Updated INSTALLATION.md with correct environment variable names

## [1.0.0] - 2026-02-06

### Added
- **First Public Release** 🎉

- **Room Booking Feature**
  - Book rooms directly from displays (single-room and room-minimal)
  - Quick book buttons (15, 30, 60 minutes)
  - Custom time selection with date/time pickers
  - Conflict detection and validation
  - Multi-language support (English/German)
  - Requires Calendars.ReadWrite permission in Azure AD

- **Modern UI Redesign**
  - Complete redesign of all display views
  - Modern color scheme with better contrast
  - Smooth animations and transitions
  - Responsive design for all screen sizes
  - Dark theme optimized for room displays

- **Multi-Language Support**
  - Automatic browser language detection
  - English and German translations
  - Locale-aware time formatting (12h/24h)
  - Localized date formats

- **Comprehensive Admin Panel** (`/admin`)
  - WiFi configuration with QR code generation
  - Logo management (dark/light logos)
  - File upload support (JPG, PNG, GIF, SVG, WebP)
  - Sidebar configuration
  - Booking feature control
  - Real-time updates via Socket.IO

- **Security & Documentation**
  - Comprehensive security documentation (SECURITY.md)
  - Installation guide (INSTALLATION.md)
  - Configuration reference (CONFIGURATION.md)
  - API token authentication for admin endpoints
  - Security best practices

### Changed
- Migrated from EWS to Microsoft Graph API
- Updated to Node.js 20 LTS
- Modern React components with hooks
- Improved error handling
- Better logging and debugging

### Fixed
- PostCSS deprecation warnings
- Microsoft Graph API pagination support
- Real-time updates via Socket.IO
- All security vulnerabilities resolved (0 CVEs)

## [0.6.0] - 2024-11-26

### Added
- Microsoft Graph API pagination (handles >30 rooms)
- Comprehensive admin panel at `/admin`
- WiFi management with QR code generation
- Logo management (dark/light logos)
- File upload support for logos
- Real-time updates via Socket.IO
- Browser language detection
- Locale-aware time formatting

### Changed
- Improved error handling
- Better mobile responsiveness

## [0.3.2] - 2024-11-20

### Added
- Additional error handling for incorrect credentials
- Error messages now shown on front end

### Fixed
- Socket component to prevent ERR_CONNECTION_REFUSED errors

## [0.3.1] - 2024-11-19

### Changed
- Moved room blacklist filtering from front end to back end
- Improved performance

## [0.1.0] - 2024-11-15

### Added
- Initial release
- Basic room display functionality
- EWS integration
- Simple UI

---

## Version History Summary

- **1.2.0** - Vite migration, 10-100x faster builds, zero CVEs
- **1.1.1** - Dynamic logo on WiFi page, reduced flightboard spacing
- **1.1.0** - Configurable header styles, redesigned admin panel, simplified booking
- **1.0.1** - Bug fixes, consolidated authentication, improved alignment
- **1.0.0** - First public release with booking, modern UI, multi-language support
- **0.6.0** - Admin panel, WiFi/logo management, Graph API pagination
- **0.3.2** - Error handling improvements
- **0.3.1** - Backend filtering optimization
- **0.1.0** - Initial release

[1.2.0]: https://github.com/TMA84/MeetEasier/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/TMA84/MeetEasier/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/TMA84/MeetEasier/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/TMA84/MeetEasier/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/TMA84/MeetEasier/releases/tag/v1.0.0
