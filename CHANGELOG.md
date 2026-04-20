# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.8.4] - 2026-04-20

### Added
- Touchkio OTA updates via MQTT: parses HA MQTT Discovery update entities, tracks installed/latest version per device, and sends `install` command via the discovered `command_topic`
- API routes: `POST /api/mqtt-update/:hostname` triggers update, `GET /api/mqtt-update-info` returns version info for all devices
- Admin Touchkio modal: shows current version, available update with green highlight, and "Update Touchkio" button with confirmation dialog
- Update progress tracking (in_progress, update_percentage) from MQTT state messages

### Changed
- Touchkio device modal now auto-fetches update info on open — version display is immediately available without requiring a manual refresh

## [1.8.3] - 2026-04-14

### Changed
- Flightboard layout: rooms fill viewport height without scrolling via flexbox, `#page-wrap` uses `height: 100vh; overflow: hidden`
- Flightboard rows use fixed spacing regardless of room count — rows don't stretch when few rooms are present
- Flightboard rows: min-height 50px, max-height 120px
- Flightboard typography: smaller clamp minimums for font sizes, paddings, gaps, and column widths to scale gracefully with many rooms
- Foundation legacy `.row { max-width: 99% }` overridden to `100%` inside `.tracker-wrap`
- All flightboard layout changes applied consistently to both dark and light themes
- Dark mode flightboard meeting room rows now use `flex: 0 1 auto` instead of `flex: 1` — rows size to their content rather than stretching equally, preventing oversized rows when few meetings are displayed

### Fixed
- Dark mode flightboard container: height and width now propagate through Foundation grid wrappers (`.row > .columns`) via explicit `height: 100%` and `width: 100%` — fixes meeting room rows not stretching to fill available space when wrapped in Foundation grid markup
- Dark mode flightboard `.row` wrapper now includes `max-width: 100%` — prevents Foundation grid default max-width from constraining the row narrower than its parent container

### Changed
- Dark mode flightboard meeting room cards: reduced border-left width, padding clamp values, and min-height (60px → 50px) for a tighter, more compact card layout
- Dark mode flightboard meeting room status indicators: reduced spacing, font size, padding, and dot size clamp values for a more compact layout on smaller displays
- Light mode flightboard meeting room status indicators: reduced margin, width, gap, font size, padding, and status dot size clamp values for a more compact layout on smaller displays

- Dark mode flightboard `.tracker-wrap` now uses `width: 100%` with `box-sizing: border-box` instead of `max-width: 100%` and `margin: 0 auto` — ensures the container fills its parent without centering margins and prevents padding from expanding beyond the available width
- Dark mode flightboard meeting room rows now constrained with `min-height: 60px` and `max-height: 120px` — prevents rows from collapsing too small or stretching too tall when flexbox distributes available space
- Dark mode flightboard `#page-wrap` now uses fixed `height: 100vh` with `overflow: hidden` instead of `min-height: 100vh` — locks viewport to prevent scrolling and ensures content stays within the visible area
- Dark mode flightboard `#page-wrap` uses flexbox column layout (`display: flex; flex-direction: column`) — enables child elements to distribute vertically within the fixed viewport
- Dark mode flightboard container now uses flexbox column layout with `min-height: calc(100vh - 80px)` — fills remaining viewport height below the navbar and distributes meeting room rows evenly
- Light mode flightboard container now uses `flex: 1` with `overflow: hidden` instead of `min-height: calc(100vh - 80px)` — fills remaining space via flexbox and clips overflow instead of setting a minimum height, preventing scrollbars on viewport-locked displays
- Light mode meeting room rows now use `flex: 1` with `min-height: 0` — rows stretch equally to fill available space instead of relying on fixed `min-height`
- Light mode meeting room cards use `height: 100%` instead of `min-height: clamp(80px, 10vh, 100px)` — cards fill their row completely for a consistent full-height flightboard layout
- Light mode flightboard `.meeting-time` font size reduced from `clamp(0.75rem, 1.1vw, 1.125rem)` to `clamp(0.65rem, 0.9vw, 1.125rem)` — tighter minimum and preferred values for better fit on compact displays

## [1.8.2] - 2026-04-14

### Fixed
- Socket.IO connection stability: server `pingTimeout` increased to 60s (from default 20s) to prevent premature disconnects on memory-constrained Raspberry Pi displays
- Socket.IO client now falls back to HTTP polling if WebSocket transport drops, instead of losing the connection entirely
- Socket.IO reconnection set to infinite attempts with exponential backoff (1s–30s) for kiosk displays that must never give up
- Dark mode SCSS cleaned up: removed ~850 lines of unused legacy `.room-minimal` styles

### Changed
- Dark mode status color gradients reverted to original subtle values

### Changed
- Socket.IO server initialization now uses generous timeouts (`pingTimeout: 60s`, `pingInterval: 25s`, `connectTimeout: 45s`) — prevents premature disconnects on Raspberry Pi displays experiencing memory pressure or delayed heartbeats during long-running operation
- Dark mode SCSS (`_modern-single-room-dark.scss`) rewritten to only contain `.single-room-layout--dark` scoped overrides — removed all legacy `.room-minimal` component styles, redundant animations (`rotate`, `glowAvailable`, `glowBusy`, `glowUpcoming`), and duplicate sidebar/header/meeting-card dark overrides that are now handled by the modern single-room layout
- Dark mode status glow gradients (available, busy, upcoming) softened — reduced inner opacity, widened mid-stop spread, and lowered outer-edge opacity for a subtler radial glow effect

### Removed
- Legacy `.room-minimal` dark theme styles (background, glow container, main content, room header filled/transparent variants, room name, room status, meeting cards, sidebar, clock, upcoming list, WiFi section, extend/booking buttons) — superseded by modern single-room layout
- `rotate`, `glowAvailable`, `glowBusy`, `glowUpcoming` keyframe animations — no longer used
- `:root` CSS custom properties for status colors (`--available-color`, `--busy-color`, `--upcoming-color`, `--not-found-color`) — status colors now defined inline within the modern layout
- Dark mode overrides for `.status-header`, `.room-name`, `.room-status`, `.meeting-card`, `.modern-room-sidebar`, and sidebar child elements (`.sidebar-clock`, `.upcoming-item`, `.sidebar-book-btn`, `.upcoming-organizer`, etc.) — styling now inherited from the modern component defaults

## [1.8.1] - 2026-04-10

### Fixed
- Memory leak: `ConnectionMonitor` event listeners (`online`, `offline`, `visibilitychange`) now use bound references and are properly removed in `destroy()`
- Memory leak: `PowerManagement` overlay click handler is now stored as a named reference and removed via `removeEventListener` on display-on and `destroy()`
- Memory leak: `Socket.js` component now removes the `updatedRooms` handler with `socket.off()` before closing the connection on unmount
- Memory leak: Removed `console.log` from `Display.jsx` render method that produced thousands of log entries per day, consuming browser memory
- Booking modal and extend modal now receive `theme` prop in dark mode — activates the existing `.minimal-display` dark styles that were previously never triggered
- Error modal in single-room display now applies dark mode classes when dark mode is active
- Auto-reload time input in admin panel now has correct styling (`input[type="time"]` added to admin SCSS rules)
- Auto-reload config props (`autoReloadEnabled`, `autoReloadTime`) are now correctly passed from `Admin.jsx` to `DisplayTab`
- Booking button color in dark mode: fixed race condition where `fetchColorsConfig` ran before sidebar config was loaded, always applying the light default; colors are now fetched after sidebar config
- Booking button color consistency: all 4 code paths that set `--booking-button-color` (colors config, booking config, socket updates, modal mount) now use `resolveBookingButtonColor()` with dark mode awareness
- Booking button text color: added automatic contrast detection via `contrastTextColor()` — sets `--booking-button-text` to dark or white based on button luminance, preventing unreadable white-on-light combinations
- Hidden booking/extend/check-in buttons when room is not found (`room.NotFound`)

### Added
- Automatic page reload for long-running displays: configurable via admin panel with enable toggle and time picker, prevents memory accumulation in 24/7 kiosk browsers
- `auto-reload.js` utility: schedules daily `window.location.reload()` at configured time, with start/stop/apply API
- `resolveBookingButtonColor()` and `contrastTextColor()` in `display-logic.js`: centralized dark mode button color resolution and WCAG-based text contrast calculation
- Console output suppression in production builds: `console.log`, `console.warn`, `console.debug`, `console.info` replaced with no-ops via `import.meta.env.PROD` check in `main.jsx`
- Memory leak test suite (`memory-leak.test.js`): verifies event listener cleanup for `ConnectionMonitor`, `PowerManagement`, and `Socket.js`
- Auto-reload test suite (`auto-reload.test.js`): verifies scheduling, cancellation, day-rollover, and config application
- Admin translations (DE/EN) for auto-reload settings

### Changed
- Split `_booking-modal.scss` into `_booking-modal-light.scss` (base) and `_booking-modal-dark.scss` (dark overrides) for consistency with single-room SCSS structure
- Dark mode default booking button color changed to `#7d8da1` (Slate-450) for better visibility on dark backgrounds
- Dark mode booking modal uses `#7d8da1` fallback for all `--booking-button-color` references
- Sidebar and modal buttons use `var(--booking-button-text, white)` for automatic text contrast
- Removed dark mode style selection (Filled/Transparent radio buttons) from admin panel — only one dark mode style remains

### Removed
- `_booking-modal.scss` (replaced by light/dark split)
- Code Quality Audit system: shared type definitions (`scripts/audit/types.js`) with JSDoc typedefs for `Finding`, `CategoryResult`, `AuditConfig`, and `ScoreResult` — foundation for the modular audit scoring system
- Extracted `display-service.js` for single-room Display component — pure async data-fetching functions (`fetchRoomData`, `fetchSidebarConfig`, `fetchBookingConfig`) with no React dependency, improving testability and separation of concerns
- Memory leak prevention test suite (`ui-react/src/utils/memory-leak.test.js`) — verifies proper cleanup of event listeners, timers, and DOM elements in `ConnectionMonitor`, `PowerManagement`, and `Socket` components to prevent leaks in long-running display clients
- Auto-reload test suite (`ui-react/src/utils/auto-reload.test.js`) — covers scheduled reload timing, next-day scheduling when target time has passed, cancellation via `stopAutoReload`, schedule replacement, invalid time format rejection, and `applyAutoReload` enable/disable behavior

### Changed
- Socket.js memory leak test now uses `beforeEach`/`afterEach` with `vi.doMock`/`vi.doUnmock` for `socket.io-client` instead of per-test `vi.resetModules` and inline mock setup — improves isolation and avoids module-level side-effect issues

### Changed
- Bumped `jsdom` dev dependency from 29.0.1 to 29.0.2
- Extracted `useAdminAuth` hook (`ui-react/src/components/admin/hooks/useAdminAuth.js`) — encapsulates admin authentication state and handlers (login, logout, session verification, bootstrap status, CSRF headers) into a dedicated reusable hook, improving separation of concerns in the Admin component
- Coverage analyzer now excludes `public/` directories and `single-room/single-room/` duplicate paths from analysis — reduces noise from non-source files
- Style analyzer file naming check now allows PascalCase for React component files in `ui-react/src/components/` and `ui-react/src/layouts/`, and for test/spec files — reduces false positives for standard React naming conventions
- Style analyzer strips `.test`/`.spec` suffixes before evaluating naming convention — prevents test files from being flagged for their base component name

### Fixed
- Touchkio modal brightness, volume, and page zoom commands now prefer `deviceId` over `hostname` for MQTT command routing — fixes commands targeting the wrong device when multiple displays share the same hostname
- Removed unused `getCsrfToken` import from `admin-api-extended.test.js` — cleans up test file imports
- Demo data booking test now schedules meetings far in the future to avoid conflicts with existing demo appointments — fixes flaky test failures when demo room already has a meeting at the current time
- `ConnectionMonitor` now stores bound event handler references and uses them for `addEventListener` — fixes memory leak where anonymous arrow functions prevented proper `removeEventListener` cleanup

## [1.7.52] - 2026-03-22

### Added
- Live screenshot display for Touchkio devices in Admin panel (requires Touchkio v1.4.1+) — screenshots are received via MQTT and shown in the device detail modal with auto-refresh
- Binary MQTT message support for receiving raw image data from Touchkio screenshot topics

### Fixed
- Demo mode and Graph credential validation now accept certificate-based authentication as alternative to client secret — previously only client secret was checked, causing demo mode to stay active when using certificate auth
- `Calendars.ReadWrite` permission detection now decodes the JWT access token and checks the `roles` array — previously only verified that a token could be obtained, which always succeeded with `.default` scope regardless of actual permissions. Negative results are no longer cached permanently, allowing automatic retry on subsequent requests

### Changed
- `hasValidGraphCredentials()` now accepts certificate-based authentication as a valid credential method — previously only client secret was recognized, causing startup validation to fail when using certificate auth

## [1.7.51] - 2026-03-21

### Added
- ColorsTab: native color picker input alongside hex text input for each color setting — allows visual color selection in addition to manual hex entry
- Extracted `ApiTokenTab` component — dedicated admin panel tab for managing admin API token and WiFi API token

### Removed
- Removed unused `currentBookingButtonColor` display from BookingTab current config section — color configuration is managed exclusively in ColorsTab

### Changed
- Extracted all remaining inline tab content from `Admin.js` into dedicated components: DisplayTab, WiFiTab, LogoTab, BookingTab, ColorsTab, TranslationsTab — reduces Admin component size and improves maintainability
- Wired all 11 operations tab components into `Admin.js` render — SystemTab, TranslationApiTab, OAuthTab, MaintenanceTab, ApiTokenTab, SearchTab, RateLimitTab, BackupTab, AuditTab, MqttTab, and DevicesTab now receive full props and callbacks from the parent component
- All tab components now accept `isActive` prop for parent-controlled visibility instead of hardcoded `active` class
- Touchkio MQTT state handlers now only log when a value actually changes — suppresses duplicate log messages for power, brightness, kiosk, theme, volume, keyboard, page zoom, page URL, network address, and error state updates
- Touchkio error log deduplication: errors are only logged on state change (detected/cleared) instead of on every MQTT message

### Fixed
- Fixed admin panel tabs showing all content stacked instead of switching — tab components now correctly use `isActive` prop from parent for visibility control
- Fixed OAuthTab.js syntax errors from broken JSX fragment nesting
- Touchkio auto-capture URL pattern now correctly matches root URLs with query parameters

## [1.7.50] - 2026-03-21

### Added
- Touchkio MQTT Power Bridge module (`touchkio.js`) — full rewrite as dedicated display controller with MQTT-based command and status management for Raspberry Pi kiosk displays
- Automatic Touchkio display discovery via Home Assistant MQTT Discovery topics
- Real-time display state tracking (power, brightness, kiosk status, theme, volume, page URL/zoom, keyboard visibility, system metrics)
- Persistent desired config per device (`touchkio-desired-config.json`) — settings survive server restarts and are re-applied on device reconnect with staggered command delays
- Auto-capture of initial device configuration — new devices get their current state (brightness, URL, zoom, volume, theme, kiosk) saved as baseline once they load an app page (single-room or flightboard), removing the "NEW" badge automatically. Devices without an app URL remain marked as new.
- `hasDesiredConfig` flag included in Touchkio display state objects — indicates whether a device has persisted desired configuration
- Scheduled power management with configurable off-times, overnight range support (crossing midnight), and weekend mode
- Hardware compatibility detection via error log analysis (`powerUnsupported`, `brightnessUnsupported` flags)
- System monitoring: CPU usage, memory usage, processor temperature, uptime, and network address tracking
- Display control commands: power, brightness, kiosk mode, theme, volume, keyboard, page zoom, page URL, refresh, reboot, shutdown
- Display error auto-recovery — single-room display automatically reloads after 10 seconds on render errors

### Fixed
- `sendPageUrlCommand` now persists the page URL to desired config after successful command — URL is re-applied on device reconnect, matching behavior of brightness, theme, volume, and zoom commands

## [1.7.49] - 2026-03-20

### Changed
- Single-room light theme: stronger floating text-shadow on room name, status text and dot with triple-layer shadow for more pronounced depth effect

## [1.7.48] - 2026-03-20

### Added
- Room data caching: `/api/rooms` and `/api/rooms/:alias` now serve from the last successful Graph sync cache — eliminates redundant Graph API calls on page reloads
- Exported `getLastRoomsCache()` from `socket-controller.js` for cached room data access
- Admin panel: maintenance mode warning banner shown when maintenance mode is active — alerts admins that some write operations may be blocked
- Certificate SHA-1 thumbprint displayed in Admin panel alongside SHA-256 — matches Azure AD certificate view
- Certificate generator now computes and stores SHA-1 thumbprint; existing certificates get SHA-1 calculated on the fly from stored PEM

### Fixed
- Both `refreshMsalClient()` functions (routes + socket-controller) now always read fresh OAuth config from persisted storage before creating the MSAL client — fixes stale clientSecret after switching between certificate and secret auth
- `checkCalendarWritePermission()` now sets cached result to `false` before the async token check — prevents concurrent calls from triggering duplicate Graph API permission checks
- Added `.catch()` handler to the room-loading promise chain in `rooms.js` — unhandled Graph API errors during room list/appointment fetching now propagate to the callback instead of silently failing
- Certificate thumbprint now lowercase hex (MSAL requirement) and private key converted from PKCS#1 to PKCS#8 format
- Fixed `Cannot access 'hasCalendarWritePermission' before initialization` crash — variable declaration order corrected in `routes.js`
- Single-room light theme: improved meeting card readability with stronger background opacity and floating text-shadow on room name/status

### Changed
- Maintenance mode now activates only after 3 consecutive Graph API failures instead of immediately on first error
- `ensureGraphFailureMaintenance()` tracks consecutive failure count and logs progress toward threshold
- `clearGraphFailureMaintenance()` resets failure counter on successful sync and logs recovery
- API error logging in `routes.js` now extracts `body` or `message` from error objects and logs structured detail instead of raw error
- Certificate deletion MSAL refresh now uses `configManager.getOAuthConfig()` and conditionally applies `clientId`/`authority` only when present
- Added comprehensive JSDoc documentation to `routes.js`

### Security
- `socket-controller.js`: Added debug log in `refreshMsalClient()` that outputs MSAL clientId, authority, and clientSecret length to console — **review recommended**
- Certificate management endpoints (`/oauth-certificate`, `/oauth-certificate/generate`, `/oauth-certificate/download`) now included in maintenance mode allowed paths and admin route protection list

## [1.7.47] - 2026-03-20

### Fixed
- Certificate delete now re-applies persisted OAuth config (clientId, authority, clientSecret) to runtime before refreshing MSAL clients — fixes fallback to client secret not working after certificate deletion
- Improved error logging for room API failures (includes response body and status code)

## [1.7.46] - 2026-03-20

### Fixed
- OAuth save no longer requires a Client Secret — Client ID and Tenant ID can be saved independently (e.g. when using certificate auth)
- Empty Client Secret on save now preserves the existing secret instead of deleting it
- Generating or deleting a certificate no longer resets unsaved Client ID / Tenant ID form values
- Rebuilt `Admin.js` as a single consolidated component — full tabbed admin interface with section navigation (Displays, Operations, Content), Socket.IO real-time config updates, session-based auth with login/logout, sync status banner, and delegation to extracted tab components (OAuthTab, RateLimitTab, SearchTab, SystemTab, DevicesTab, MqttTab, etc.)

### Fixed
- MSAL client refresh after certificate generation now wrapped in try/catch — prevents unhandled errors from crashing the request; logs a warning and retries on next poll cycle
- Certificate thumbprint property in `getMsalCertificateConfig()` now uses `thumbprintSha256` (camelCase) matching MSAL's expected format — fixes certificate auth failing due to unrecognized property name

## [1.7.45] - 2026-03-20

### Fixed
- OAuthTab.js was missing JSX body — restored complete OAuth config form, certificate management UI, and Graph runtime settings
- Fixed MSAL certificate property name: `thumbprintSha256` (not `thumbprintSHA256`) — caused `state_not_found` error
- Fixed MSAL config deep copy destroying `loggerCallback` function — use shallow object spread instead of `JSON.parse(JSON.stringify())`
- Wrapped `refreshMsalClient()` calls in certificate endpoints with try/catch to prevent MSAL cache errors from blocking certificate operations

### Changed
- OAuthTab admin component: implemented OAuth configuration UI with current config display (Client ID, Tenant ID) replacing placeholder stub
- OAuthTab admin component: added auth method display (Certificate/Client Secret), OAuth credentials form, and certificate management section (generate, download, delete) via build helper script
- OAuthTab admin component: added Graph Runtime Configuration section with webhook settings (enabled toggle, client state, allowed IPs), fetch timeout, retry attempts, and retry base delay — includes current config display, editable form, and env-locked fallback

## [1.7.44] - 2026-03-20

### Added
- Certificate-based OAuth authentication as alternative to Client Secret — eliminates yearly secret rotation
- Self-signed X.509 certificate generation (RSA 2048-bit, SHA-256, 3-year validity) via `cert-generator.js`
- Certificate management API: `POST /api/oauth-certificate/generate`, `GET /api/oauth-certificate`, `GET /api/oauth-certificate/download`, `DELETE /api/oauth-certificate`
- Certificate UI section in OAuth tab: generate, download (.pem), delete, status display (thumbprint, validity, CN)
- MSAL client auto-switches between certificate and client secret auth (certificate takes priority)
- Private key encrypted on disk with AES-256-GCM (derived from API token)
- Startup validation accepts certificate as alternative to client secret
- DE/EN translations for all certificate UI elements
- Translated `audit-logger.js` JSDoc file header from German to English
- Translated `touchkio.js` JSDoc comments for `subscribeTouchkioStates()` from German to English
- Translated `rooms.js` JSDoc comments for `isRoomInBlacklist()` from German to English
- Translated `demo-data.js` JSDoc comments for `getDemoRoomsSnapshot()` from German to English
- Translated `socket-controller.js` JSDoc comment for `syncErrorMessage` from German to English
- Added JSDoc file header to `ApiTokenTab.js` documenting admin panel tab for API token management
- Added JSDoc file header to `TranslationsTab.js` documenting admin panel tab for managing UI translations across multiple languages

## [1.7.43] - 2026-03-18

### Added
- New admin option "Behind Reverse Proxy" (Devices tab) — when enabled, uses `X-Forwarded-For` header to determine real client IP behind ALB/Nginx. Required for IP whitelist to work correctly behind a reverse proxy. Disabled by default for security (prevents IP spoofing without a proxy).

## [1.7.42] - 2026-03-18

### Security
- Display pages (`/`, `/single-room/*`, `/room-minimal/*`) now enforce IP whitelist when enabled — only whitelisted IPs can access flightboard and room displays. `/admin` and `/wifi-info` remain open to all devices. API endpoints (`/api/rooms`, `/api/rooms/:alias`, `/api/roomlists`) continue to enforce both cross-origin check and IP whitelist.

## [1.7.41] - 2026-03-18

### Security
- `/api/rooms`, `/api/rooms/:alias`, and `/api/roomlists` secured with `checkDisplayOriginLoose` — blocks cross-origin requests (mismatched Origin/Referer) and enforces IP whitelist when enabled. Requests without Origin/Referer are allowed through but still checked against IP whitelist. Booking, check-in, and power endpoints retain strict `checkDisplayOrigin`.

## [1.7.40] - 2026-03-18

### Added
- New endpoint `GET /api/rooms/:alias` — returns a single room by alias, reduces payload for single-room displays
- Socket.IO room-based targeting — single-room displays join a `room:<alias>` channel and receive only their room's updates via `updatedRoom` event
- `broadcastRoomUpdates()` sends targeted per-room data to single-room clients and full array to flightboard/admin

### Changed
- Single-room Display.js now fetches `/api/rooms/:alias` instead of `/api/rooms`
- `/api/rooms` now returns minimal fields only (no Email, no Appointment.Id/Subject/Private, max 2 appointments per room) — sufficient for flightboard display. Full room data available via `/api/rooms/:alias`.

## [1.7.39] - 2026-03-18

### Fixed
- WiFi QR code no longer flickers on every re-render — QR image timestamp is now stored in state and only updated on actual WiFi config changes
- WiFi info no longer disappears on transient network errors — error state only shown during initial load, existing data preserved on refresh failures
- Removed direct DOM manipulation for QR code reload (now handled via React state)
- Display error boundary no longer force-reloads the page — shows error modal instead of causing infinite reload loops from transient render errors

## [1.7.38] - 2026-03-18

### Fixed
- Removed `checkDisplayOrigin` middleware from `/api/rooms` and `/api/roomlists` — Touchkio displays in kiosk mode have no Origin/Referer header, causing 403 rejections and black screens. These endpoints only return room status data and remain safe without origin checks. Booking, check-in, and power management endpoints keep origin validation.

## [1.7.37] - 2026-03-18

### Added
- IP whitelist now supports CIDR notation (e.g., `192.168.3.0/24`) for whitelisting entire subnets

### Fixed
- Socket.IO now uses WebSocket transport only — fixes `400 Bad Request` errors caused by polling session loss behind reverse proxies

## [1.7.36] - 2026-03-18

### Fixed
- Removed IP whitelist check from Socket.IO middleware — whitelist was blocking all non-whitelisted clients from receiving real-time updates, causing displays to show as disconnected. IP whitelist is still enforced on sensitive HTTP endpoints.

## [1.7.35] - 2026-03-17

### Added
- Socket.IO disconnect reason logging — stores last 50 disconnect events with reason, IP, and timestamp
- Debug endpoint `GET /api/debug/socket-disconnects` (requires API token) for diagnosing Socket.IO connection issues

### Fixed
- Service Worker no longer intercepts `chrome-extension://` URLs or cross-origin requests (e.g., Google Fonts) — fixes `Failed to execute 'put' on 'Cache'` errors
- CSP now allows `fonts.gstatic.com` in `connect-src` — fixes font loading blocked by Content Security Policy
- Consolidated Socket.IO connections: each display now uses a single connection instead of 2-4 separate ones (Display+Socket+Sidebar, Flightboard+Socket+Navbar+Layout) — reduces 39+ concurrent connections to 15 for all devices

## [1.7.34] - 2026-03-17

### Fixed
- `checkDisplayOrigin` now checks Same-Origin (Origin/Referer) before IP whitelist — fixes Touchkio displays losing Socket.IO connection when `/api/rooms` returned 403
- Added admin session cookie check to `checkDisplayOrigin` for logged-in admin users
- All MQTT commands and display merge now use `deviceId` instead of `hostname` — fixes cloned devices (same hostname `piosk`) targeting wrong device
- `getDeviceIdFromHostname` warns when hostname maps to multiple devices
- Power schedule uses `deviceId` directly instead of potentially ambiguous `config.mqttHostname`

### Security
- `/api/health` and `/api/version` now require authentication (admin or WiFi API token)
- `HEAD /api/health` remains unauthenticated for uptime monitoring
- `/api/rooms` and `/api/roomlists` secured with `checkDisplayOrigin` middleware

## [1.7.33] - 2026-03-17

### Fixed
- MQTT displays with identical hostname (cloned devices) no longer overwrite each other in Devices tab — now uses `deviceId` as map key instead of `hostname`
- MQTT display online detection uses `lastSeen` timestamp updated on every MQTT message — previously only power state updates set the timestamp
- MQTT displays correctly show as disconnected after 5 minutes without messages

### Security
- `/api/health` and `/api/version` now require authentication (admin or WiFi API token)
- `HEAD /api/health` remains unauthenticated for uptime monitoring

## [1.7.32] - 2026-03-17

### Changed
- `/api/health` endpoint now includes MQTT client status (broker connection, subscribed topics) and per-device display status (online/offline based on 5-minute heartbeat, hostname, room, last update)
- Removed redundant simple health endpoint (duplicate was overridden by detailed version)
- MQTT admin tab: renamed from "Broker" to "Client" terminology, shows connection status, broker URL and subscribed topics (DE+EN)
- MQTT `getStatus()` now returns configured broker URL from config instead of broken `options.href`

### Fixed
- MQTT display online detection now uses `lastSeen` timestamp updated on every incoming MQTT message — previously only `display/power/state` updated the timestamp, causing devices to appear offline despite sending regular CPU/memory/uptime updates
- MQTT displays in Devices tab now correctly show as disconnected when no message received within 5 minutes — previously all discovered devices were permanently shown as connected

### Security
- `/api/rooms` and `/api/roomlists` now secured with `checkDisplayOrigin` middleware — restricts access to same-origin requests or valid API tokens

## [1.7.31] - 2026-03-16

### Fixed
- "Refresh All" and "Reboot All" now use `deviceId` instead of `hostname` — fixes all commands being sent to the same device when multiple displays share the hostname `piosk`

## [1.7.30] - 2026-03-16

### Fixed
- Display names in Devices tab now strip IP prefix from Socket.IO clientId (e.g., `192.168.3.220_flightboard` → `flightboard`) — only applies when no `roomAlias` is set
- MQTT merge now replaces IP-based display names with MQTT `room` name when available
- Room booking and extend-meeting fetch requests now retry up to 2 times on network errors — prevents false "Failed to Fetch" errors on Raspberry Pi displays with unstable WiFi

### Security
- Admin session cookie now expires after 1 hour (`maxAge: 60 * 60 * 1000`) — previously had no expiry, persisting until browser close
- CSRF cookie now also expires after 1 hour for consistency

### Documentation
- Added X11 display blanking prevention guide for Raspberry Pi to POWER_MANAGEMENT_SETUP.md — covers DPMS configuration, user-level autostart overrides, and kernel console blanking

## [1.7.29] - 2026-03-15

### Fixed
- Modal refresh after MQTT commands now reloads unified `connectedDisplays` list and matches by `deviceId` — fixes stale data and wrong device shown after power, kiosk, theme, and URL commands
- `onRefreshDisplay` callback in TouchkioModal now correctly calls `handleLoadConnectedDisplays()` instead of non-existent `handleLoadDisplays()`
- `handleLoadConnectedDisplays` now returns the fetch Promise — enables proper `await` in modal command handlers
- All modal command handlers (power, kiosk, theme, URL) search by `deviceId` with hostname fallback — prevents cross-device data leaks when devices share the same hostname
- Optimistic UI updates for power, theme, kiosk, and URL commands — modal immediately shows expected state instead of briefly flashing "UNSUPPORTED" or stale data while waiting for server refresh

## [1.7.28] - 2026-03-15

### Fixed
- Flightboard dropdown: dark mode now has dark background with white text instead of white-on-white
- Flightboard dropdown: roomlist names now use `displayName` with `name` fallback — fixes empty entries in demo mode

## [1.7.27] - 2026-03-15

### Fixed
- TouchkioModal now sends `deviceId` instead of `hostname` for all MQTT commands (power, theme, kiosk, refresh, reboot, shutdown) — fixes command routing when multiple devices share the same hostname
- URL input field in TouchkioModal now has correct dark background (`!important` CSS fix)
- MQTT-only displays show "MQTT Only" (orange) instead of green — reflects missing Socket.IO connection
- Dual-connection displays with MQTT power ON now show "Active" (green) regardless of Socket.IO socket count

## [1.7.26] - 2026-03-15

### Fixed
- Display power status for devices where `powerUnsupported` is undefined now correctly falls back to Socket.IO status instead of showing false "Partial"
- TouchkioModal power/brightness controls disabled when power support is unconfirmed
- `/api/displays` now preserves `undefined` for `powerUnsupported` instead of converting to `false` — prevents false "supported" interpretation

## [1.7.25] - 2026-03-15

### Added
- Full demo mode: toggleable via Admin Panel (Devices tab) — generates 8 demo rooms across 3 room lists with dynamic meetings based on current time
- Demo mode supports all display features: booking, extend meeting, end meeting early, and check-in all work with simulated data
- Demo rooms update in real-time via Socket.IO polling, same as production mode
- `demoMode` flag in system configuration, persisted to `system-config.json`

### Changed
- `/api/rooms`, `/api/roomlists`, `/api/rooms/:email/book`, `/api/extend-meeting`, `/api/end-meeting` endpoints now check for demo mode and return simulated data when active
- Demo mode support for end-meeting-early endpoint — simulates ending a meeting early for demo rooms, emits real-time `updatedRooms` event via Socket.IO

### Changed
- DevicesTab now receives `demoMode`, `currentDemoMode`, and `onDemoModeChange` props from Admin.js — enables demo mode toggle directly in the Devices settings panel
- Service Worker rewritten to network-first strategy: removed aggressive precaching of app assets (`/`, `/index.html`, `/css/styles.css`, logos) that caused stale content after deployments
- Service Worker cache name now includes `__BUILD_HASH__` placeholder for automatic cache busting on each build
- Vendor libraries (`/css/6.2.3/`, `/js/1.12.4/`, etc.) identified as immutable via prefix list for future cache-first handling

### Removed
- Service Worker `fetch` event handler removed — eliminates cache-first serving of app assets that caused stale UI after deployments
- Service Worker `message` event handler removed (`SKIP_WAITING`, `CLEAR_CACHE` commands) — no longer needed with simplified caching strategy
- Service Worker no longer precaches app shell assets on install — prevents serving outdated `index.html`, `styles.css`, and logos from cache
- Removed runtime caching of API responses in Service Worker — API calls now always go to network

### Fixed
- SPA catch-all route now sends `Cache-Control: no-cache, no-store, must-revalidate`, `Pragma: no-cache`, and `Expires: 0` headers with `index.html` — prevents browsers from serving a stale shell after deployments

## [1.7.24] - 2026-03-15

### Added
- Cache-busting for `styles.css`: Vite build plugin appends `?v=<contenthash>` to the stylesheet link — eliminates need to clear browser cache after CSS changes
- Service Worker rewritten with network-first strategy for HTML/CSS/app JS — browser always fetches latest version, falls back to cache only when offline
- Service Worker `CACHE_NAME` now includes a unique build hash — old caches are automatically purged on each deployment

### Changed
- Static file server now sets `no-cache` header for `styles.css` to complement query-string cache busting
- Catch-all route for SPA now sends `no-cache, no-store, must-revalidate` headers on `index.html`
- Service Worker update check interval reduced from 1 hour to 5 minutes

## [1.7.23] - 2026-03-15

### Fixed
- Dual-connection display status now uses strict equality (`=== false`) for `powerUnsupported` check — prevents `undefined` from being treated as supported, avoiding incorrect "Partial" status during initial MQTT connection
- Backend now explicitly sets `powerUnsupported = false` when `power: 'ON'` is received, and `brightnessUnsupported = false` when a valid brightness value is received — provides positive confirmation of hardware support
- TouchkioModal power/brightness controls now require explicit support confirmation (`=== false`) instead of truthy fallback

### Changed
- Admin translations editor now exposes all display-facing translation keys in the "Displays" group — added 30 missing keys including booking modal, WiFi info, check-in, error states, and general display labels for full in-panel localization coverage

## [1.7.22] - 2026-03-14

### Added
- Display-facing error translation keys: `displayIpNotWhitelistedErrorLabel`, `displayOriginNotAllowedErrorLabel`, `displayBookingDisabledErrorLabel` — displays now show user-friendly localized messages for IP whitelist, origin, and booking-disabled rejections
- Booking modal translation helper `getBookingModalTranslations()` in `displayTranslations.js` — provides localized strings for quick book, custom booking, date/time labels, duration, conflict and generic error messages
- WiFi info translation helper `getWiFiInfoTranslations()` in `displayTranslations.js` — provides localized strings for WiFi SSID, password, loading, and error states
- Check-in translation helper `getCheckInTranslations()` in `displayTranslations.js` — provides localized strings for check-in button, expired/too-early tooltips, and error states

### Changed
- `checkDisplayOrigin` middleware now returns machine-readable error codes (`ip_not_whitelisted`, `origin_not_allowed`) instead of generic `Forbidden` — enables clients to distinguish rejection reasons programmatically
- `BookingModal.js` now uses centralized `getBookingModalTranslations()` instead of inline hardcoded translation objects
- `WiFiInfo.js` now uses centralized `getWiFiInfoTranslations()` instead of local inline translations — loads i18n config on mount and listens for real-time updates via Socket.IO
- `ExtendMeetingModal.js` and `Display.js` error handlers now use machine-readable 403 error codes for IP whitelist and origin rejection messages
- Check-in button text, tooltips, and error messages in `Display.js`/`Sidebar.js` now use centralized `getCheckInTranslations()` instead of hardcoded English strings

### Fixed
- Booking from non-whitelisted device now shows clear error message ("Your device is not authorized") instead of misleading "only accessible with valid API token"
- `isDisplayOriginAllowed()` now returns rejection reason (`ip_not_whitelisted` vs `origin_mismatch`) so `checkDisplayOrigin` middleware can respond with context-specific error messages

## [1.7.21] - 2026-03-14

### Fixed
- Safari white page: disabled Helmet's `upgrade-insecure-requests` CSP directive by default — it forced Safari to use HTTPS for all resources, breaking local HTTP development
- New env variable `CSP_UPGRADE_INSECURE=true` to opt-in when running behind HTTPS reverse proxy

## [1.7.20] - 2026-03-14

### Fixed
- Display IP whitelist settings can now be saved via admin interface — `displayIpWhitelistEnabled` and `displayIpWhitelist` were missing from the POST `/api/system-config` route handler

## [1.7.19] - 2026-03-14

### Added
- Socket.IO IP whitelist: when display IP whitelisting is enabled, Socket.IO connections from non-whitelisted IPs are rejected
- `getRequestHeaders()` helper method in Admin.js for consistent header construction across all API calls

### Fixed
- CSRF validation no longer blocks admin interface POST requests — all ~40 direct `fetch()` calls in Admin.js now include the `X-CSRF-Token` header via centralized `getRequestHeaders()` helper
- Exported `getCsrfToken` from `adminApi.js` for use in Admin.js
- System config POST endpoint (`/api/system-config`) now accepts `displayIpWhitelistEnabled` and `displayIpWhitelist` fields, allowing IP whitelist settings to be saved from the admin panel

### Changed
- `config-manager` module in `server.js` is now assigned to a variable for direct access to its exports

## [1.7.18] - 2026-03-14

### Added
- Display IP Whitelist: configurable IP whitelist for display-facing endpoints (booking, check-in, extend/end meeting, power management)
- When enabled, only requests from whitelisted IP addresses can access these endpoints
- Room status display (`/api/rooms`, `/api/roomlists`, etc.) remains accessible without IP restriction
- Admin API endpoints remain protected by API token (unaffected by whitelist)
- UI in Devices tab: enable/disable toggle and textarea for IP addresses (one per line)
- IPv4-mapped IPv6 normalization (e.g., `::ffff:192.168.1.1` matches `192.168.1.1`)
- Localhost variants (`::1`, `127.0.0.1`, `localhost`) treated as equivalent

## [1.7.17] - 2026-03-14

### Security
- Added origin validation (`checkDisplayOrigin` middleware) for display-facing endpoints: booking, extend-meeting, end-meeting, check-in, check-in-status, power-management per display
- Requests must originate from the application UI (same-origin via Origin/Referer header) or carry a valid API token
- External/scripted access without valid origin or token now returns 403 Forbidden

## [1.7.16] - 2026-03-14

### Added
- Added `admin-message-info` SCSS style variant for informational messages (blue theme matching existing success/error/warning pattern)
- Added `_connection-status.scss` with dedicated SCSS styles for the connection status overlay (offline/online states, mobile responsive)

### Security
- WiFi password encryption at rest: `saveWiFiConfig()` now stores `passwordEncrypted` (AES-256-GCM) instead of plaintext; `getWiFiConfig()` decrypts transparently
- MQTT password encryption at rest: `updateMqttConfig()` now stores `passwordEncrypted` (AES-256-GCM) instead of plaintext; `getMqttConfig()` decrypts transparently
- Automatic migration for both WiFi and MQTT: legacy plaintext passwords are encrypted on first read and plaintext field is removed from config files
- Blocked SVG file uploads to prevent stored XSS via malicious SVG content
- Added CSRF protection: cookie-based admin sessions now require `X-CSRF-Token` header on state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`)
- Frontend `adminApi.js` sends CSRF token from cookie with every mutating request
- Removed `fonts.gstatic.com` from Content Security Policy `connect-src` directive

### Fixed
- Fixed duplicate `className` attribute on sync status banner causing `admin-mb-2` spacing class to be ignored

### Changed
- Refactored 309 inline styles to SCSS classes across all admin components
  - TouchkioModal, DevicesTab, ColorsTab, BookingTab, TranslationsTab, DisplayTab, MqttTab, PowerManagementModal, BackupTab, AuditTab
  - New SCSS sections in `_admin.scss`: Touchkio Modal, DevicesTab, ColorsTab, BookingTab, TranslationsTab, DisplayTab, MqttTab, utility classes
- Migrated `index.css` (body/svg styles) into `_globals.scss`
- Migrated `ConnectionStatus.css` into new `_connection-status.scss`
- Removed all CSS file imports from React components — all styles now in SCSS pipeline

### Fixed
- TouchkioModal now has consistent width (950px / 95vw max) regardless of content

## [1.7.15] - 2026-03-13

### Fixed
- **False "OFF" Power Status for Unsupported HDMI Displays**
  - Touchkio sends "OFF" as default power status when hardware doesn't support DDC/CI or CEC
  - Backend now parses Touchkio error logs to detect "Display Status [unsupported]" messages
  - Sets `powerUnsupported` flag and strips false "OFF" power value from API response
  - Modal now correctly shows "UNSUPPORTED" instead of "OFF" for these displays
  - DevicesTab shows green "Active" dot (via Socket.IO fallback) instead of orange "Partial"
  - MQTT-only displays with unsupported power show "Connected" (gray) instead of "OFF" (red)

## [1.7.14] - 2026-03-13

### Fixed
- **Display Status Calculation for Unsupported MQTT Power**
  - Fixed dual-connection displays showing "Partial" (orange) when MQTT doesn't report power status
  - Now correctly shows "Active" (green) when Socket.IO is active and MQTT power is unknown
  - Improved logic to distinguish between "MQTT reports OFF" vs "MQTT doesn't report power at all"
  - Better handling of displays with unsupported DDC/CI or CEC hardware
- **Touchkio Modal Power Detection**
  - Enhanced power support detection to handle empty strings and "undefined" as string
  - More robust checking for truly unsupported hardware vs missing data
  - Prevents false "OFF" display when power control is not supported
- **System Metrics Precision**
  - Fixed CPU, memory, and temperature values showing excessive decimal places
  - Values now rounded to 1 decimal place at parse time (e.g., "7.2%" instead of "7.249999999999999%")
  - Applied to all MQTT metric parsing for consistent display formatting

## [1.7.13] - 2026-03-13

### Changed
- **Touchkio Modal Power Control UX Enhancement**
  - Power toggle now shows "(Unsupported)" label when hardware doesn't support DDC/CI or CEC
  - Toggle becomes disabled and grayed out (50% opacity) for unsupported hardware
  - Cursor changes to "not-allowed" for disabled power controls
  - Status text shows "N/A" in gray color when power control is unsupported
  - Improves user understanding of hardware limitations
  - Prevents confusion when power control commands don't work on incompatible displays

### Fixed
- **Touchkio Modal Power Support Detection Logic**
  - Fixed premature "Unsupported" detection for displays that haven't reported MQTT data yet
  - Power/brightness controls now only marked as unsupported if MQTT data has been received but values are explicitly null/undefined
  - Prevents false "Unsupported" warnings during initial connection phase
  - Improves user experience by avoiding misleading hardware capability indicators
  - Better handling of displays in connecting state vs. truly unsupported hardware
  - Detection logic now checks for `hasMqttData` (lastUpdate or connected properties) before determining support status
  - If no MQTT data received yet, assumes hardware is supported (optimistic default)
- **Touchkio MQTT Topic Compatibility**
  - Added support for both `/state` and `/status` topic suffixes for all Touchkio state updates
  - Ensures compatibility with different Touchkio firmware versions that may use either suffix
  - Affects all state topics: hostname, display power/brightness, kiosk mode, theme, volume, keyboard, page zoom/URL, CPU/memory/temperature, uptime, network address
  - Improves reliability of display state tracking across different Touchkio configurations

- **Touchkio Modal Uptime Display**
  - Fixed uptime minutes not being floored, causing decimal values in display
  - Now uses `Math.floor()` for both hours and minutes in the Network status card

- **Display Status Logic for Unknown MQTT Power State (DevicesTab)**
  - Fixed status calculation for displays with both Socket.IO and MQTT connections when MQTT power status is unknown
  - Dual-connection displays: If MQTT power is undefined/null, now falls back to Socket.IO status instead of treating as "OFF"
  - MQTT-only displays: Unknown power status now shows "Connected" (gray) instead of "OFF" (red)
  - Prevents misleading "Partial" or "OFF" status when MQTT displays haven't reported power state yet
  - Improves accuracy of display status representation in Devices tab
  - Better handling of hardware that doesn't support DDC/CI or CEC power reporting

## [1.7.12] - 2026-03-13

### Fixed
- **Touchkio Modal Real-Time Updates**
  - Fixed modal display data not updating when MQTT displays refresh
  - Modal now automatically updates with latest display data when mqttDisplays state changes
  - Ensures users see current status without closing and reopening the modal
  - Matches display by hostname for accurate updates
- **Touchkio Modal State Reset**
  - Fixed URL editing state not resetting when switching between displays
  - Modal now properly resets editing mode when display changes
  - Prevents stale editing state from persisting across different displays

### Changed
- **Touchkio Modal UI Redesign**
  - Replaced power buttons with modern toggle switch (ON/OFF with green glow effect)
  - Replaced theme buttons with toggle switch featuring sun ☀️ (Light) and moon 🌙 (Dark) icons
  - Consolidated all three sliders (Brightness, Volume, Zoom) into single "Adjustments" section
  - Reduced status card padding and font sizes for more compact layout
  - Moved Quick Controls (Power, Theme, Refresh) to top of left column
  - Removed separate Theme section from right column (now in Quick Controls)
  - Improved visual hierarchy with better spacing and grouping
  - Toggle switches include smooth animations and color transitions
  - More modern, cleaner, and space-efficient design

- **Touchkio Modal Status Display**
  - Power buttons now show active state with color coding (green for ON, red for OFF)
  - Added checkmark (✓) to active power state
  - Status updates automatically via 5-second auto-refresh
  - Removed duplicate error log section (kept only at end of modal)
  - Error log moved to bottom of modal for better content flow
  - Current power status displayed above buttons with color-coded indicator
  - Green styling for ON state, red styling for OFF state
  - Improved user experience with immediate visual confirmation of display power state

- **Touchkio Modal System Status Cards Optimization**
  - Reduced grid column minimum width from 220px to 200px for better space utilization
  - Reduced card padding from 1.25rem to 1rem for more compact layout
  - Optimized font sizes: headers from 0.75rem to 0.7rem, values from 0.875rem to 0.8rem
  - Increased power status font size from 1.25rem to 1.5rem for better visibility
  - Changed "Memory" label to "Mem" for space efficiency
  - Replaced "Volume" with "Zoom" in Display Mode card (more relevant metric)
  - Added decimal precision to CPU, memory, and temperature values (e.g., "45.5%" instead of "45%")
  - Improved visual hierarchy with adjusted spacing and font sizes
  - More information-dense layout without sacrificing readability

- **Touchkio Modal Layout Optimization**
  - Reduced Kiosk Mode button font size from 0.875rem to 0.8rem for better fit
  - Reduced Kiosk Mode button padding from 0.625rem to 0.5rem for more compact layout
  - Improved space efficiency in control sections
  - Right column now more compact with optimized button sizing

### Removed
- **Touchkio Modal Theme Section**
  - Removed standalone Theme control section from right column
  - Theme control now integrated into Quick Controls toggle at top of left column
  - Eliminates redundant UI element and improves modal layout efficiency
  - Reduces visual clutter while maintaining full theme switching functionality
  - Saves ~35 lines of code and significant vertical space in modal

## [1.7.11] - 2026-03-13

### Added
- **Automatic MQTT Detection for Power Management**
  - Power Management modal now automatically detects if a display supports MQTT
  - MQTT option only shown when display has active MQTT connection
  - Auto-selects MQTT mode for displays with MQTT connection
  - Auto-fills Device ID from display data (prioritizes deviceId over hostname)
  - Device ID field becomes read-only when auto-detected
  - Visual indicator (✓) shows when MQTT is available
  - Global Standard checks if any MQTT displays are present

- **Server-Side MQTT Power Management**
  - Server now sends MQTT power commands at scheduled times (not browser)
  - Schedule checker processes all connected MQTT displays every minute
  - Supports both display-specific and global standard configurations
  - Global standard applies to all MQTT displays without specific config
  - Automatic fallback from display config to global config
  - Uses Device ID (rpi_XXXXXX) for reliable display identification

### Changed
- **Power Management Uses Device ID Instead of Hostname**
  - Changed from hostname to Device ID (e.g., "rpi_1A4187") for MQTT identification
  - Device ID is more stable and unique than hostname
  - Modal label changed from "Touchkio Hostname" to "Touchkio Device ID"
  - Placeholder changed from "e.g., saturn" to "e.g., rpi_1A4187"
  - Auto-fill prioritizes deviceId over hostname for improved reliability
  - Schedule checker uses deviceId for config lookup (with hostname fallback)
  - Backend supports both deviceId and hostname for backward compatibility

- **Global MQTT Configuration Simplified**
  - Device ID field hidden for Global Standard (not needed)
  - Added informational message: "Global MQTT mode will apply to all connected Touchkio displays automatically"
  - Eliminates confusion about what to enter for global config
  - Cleaner UI with conditional field rendering

- **Displays Table Layout Improvements**
  - Separated Type and Connection into distinct columns
  - IP address now shown under display name (with deviceId/hostname)
  - Connection badges displayed vertically in dedicated column
  - Improved column widths: Name 20%, Type 12%, Connection 12%, Metrics 18%, Actions 28%
  - Better visual hierarchy and information organization

- **Touchkio Error Logging Optimization**
  - Reduced console log noise by only logging when actual ERROR-level entries are detected
  - INFO and WARN messages no longer trigger console logs
  - Improves server log readability and reduces unnecessary log volume

### Fixed
- **Power Management Schedule Execution**
  - Fixed MQTT power commands now sent by server instead of browser
  - Schedule checker now properly handles global standard for all MQTT displays
  - Improved display identification using hostname, deviceId, or network address

## [1.7.10] - 2026-03-13
  - Modal now uses deviceId when available for accurate device targeting
  - Added fallback to hostname if deviceId not available
  - Improved hostname to deviceId mapping with better logging
  - Backend now handles both deviceId and hostname formats

### Changed
- **Error Display Improvements**
  - Moved error section to bottom of Touchkio modal
  - Show only ERROR entries (filtered out INFO and WARN logs)
  - Display only errors from last hour (reduced noise)
  - Cleaner, more focused error reporting

### Added
- **Touchkio Modal Auto-Refresh**
  - Added automatic display data refresh every 5 seconds when Touchkio modal is open
  - Ensures real-time status updates for display power, brightness, CPU, memory, temperature, and other metrics
  - Uses React useEffect hook with cleanup to prevent memory leaks
  - Auto-refresh only active when modal is visible
  - New `onRefreshDisplay` callback prop for parent component integration

- **Touchkio Modal Recent Errors Display**
  - Added `getRecentErrors()` function to filter and display ERROR-level logs from the last hour
  - Filters out WARN and INFO logs to focus on critical issues
  - Parses ISO timestamp format (e.g., "2026-03-13T13:45")
  - Returns structured error array with timestamp and message
  - Integrates with existing error log display section in modal UI

### Changed
- **Touchkio Modal Error Filtering**
  - Error display now shows only ERROR-level entries from the last 60 minutes
  - Improves signal-to-noise ratio by hiding older and less critical logs
  - `recentErrors` variable now actively used in UI rendering

- **Touchkio Modal Integration in Admin Panel**
  - Implemented `onRefreshDisplay` callback in Admin.js to support auto-refresh functionality
  - Callback reloads all display data and updates the modal state with fresh information
  - Ensures modal shows current display state after automatic refresh cycles
  - Maintains modal context by finding and updating the specific display being viewed

### Fixed
- **Touchkio Hostname-to-DeviceId Lookup Enhancement**
  - Enhanced `getDeviceIdFromHostname()` function to handle hostnames that are already deviceIds (e.g., "rpi_1A4187")
  - Added early return check for hostnames starting with "rpi_" that exist in displayStates map
  - Improved error logging with detailed mapping information when deviceId lookup fails
  - Added debug logging for successful deviceId lookups
  - Prevents unnecessary mapping lookups when hostname is already in correct deviceId format
  - Fixes issue where commands sent with deviceId format would fail to find the display

## [1.7.9] - 2026-03-13

### Fixed
- **Critical: MQTT Topic Subscriptions for Touchkio States**
  - Fixed incorrect MQTT topic subscriptions for all Touchkio state updates
  - Moved state subscriptions from `homeassistant/#` to `touchkio/#` handler
  - Changed topic suffix from `/status` to `/state` (correct Touchkio format)
  - Now correctly receives: display power, brightness, kiosk mode, theme, volume, keyboard, zoom, CPU, memory, temperature
  - `homeassistant/#` now only used for device discovery (config topics)
  - This was preventing all display status updates from being received

### Added
- **Touchkio Display Controller Module (`app/touchkio.js`)**
  - Created comprehensive centralized module for Touchkio display management
  - **State Management:**
    - Map-based display state storage (deviceId → state object)
    - Device ID to hostname bidirectional mapping for command routing
    - Tracks 15+ display properties: power, brightness, kiosk mode, theme, volume, keyboard, zoom, URL, CPU, memory, temperature, uptime, network address, room name, error logs
    - Automatic room name extraction from page URLs (e.g., `/single-room/venus` → room: "venus")
    - Error log tracking with timestamp and severity indicators (ERROR, WARN, INFO)
  - **MQTT Integration:**
    - Dual wildcard subscriptions (`homeassistant/#` and `touchkio/#`) for efficient topic monitoring
    - Support for both Home Assistant MQTT Discovery format and Touchkio legacy topics
    - Supports both `/status` and `/state` topic suffixes for backward compatibility
    - Regex-based device ID extraction from topics (e.g., `homeassistant/light/rpi_1A4187/display/status` → `rpi_1A4187`)
    - Single message handler routes to appropriate state updates based on topic patterns
  - **Command API (11 functions):**
    - `sendPowerCommand(hostname, powerState, brightness)` - Power control with optional brightness (0-100)
    - `sendBrightnessCommand(hostname, brightness)` - Brightness adjustment (0-100)
    - `sendKioskCommand(hostname, status)` - Kiosk mode: Fullscreen, Maximized, Framed, Minimized
    - `sendThemeCommand(hostname, theme)` - Theme switching: Light, Dark
    - `sendVolumeCommand(hostname, volume)` - Volume control (0-100)
    - `sendKeyboardCommand(hostname, visible)` - Keyboard visibility toggle
    - `sendPageZoomCommand(hostname, zoom)` - Page zoom control (25-400%)
    - `sendPageUrlCommand(hostname, url)` - Navigate to URL
    - `sendRefreshCommand(hostname)` - Refresh page
    - `sendRebootCommand(hostname)` - Reboot device
    - `sendShutdownCommand(hostname)` - Shutdown device
  - **Automated Power Management:**
    - Periodic schedule checker runs every 60 seconds
    - Automatic schedule enforcement based on power management configuration
    - Support for weekend mode (all-day off on weekends)
    - Time-based schedules with overnight range support (e.g., 20:00 to 07:00)
    - Integrates with `config-manager` for power management config retrieval
    - Hostname extraction from clientId formats (IP_hostname or hostname)
  - **Data Export Functions:**
    - `getDisplayStates()` - Returns array of all displays with hostname as primary identifier
    - `getAllDisplays()` - Alias for getDisplayStates()
    - `triggerPowerCommand(clientId)` - Manual power command trigger for testing/debugging
  - **Validation & Error Handling:**
    - Input validation for all commands (brightness 0-100, zoom 25-400, valid kiosk modes, valid themes)
    - Hostname-to-deviceId lookup with error logging for missing mappings
    - Graceful error handling for malformed MQTT messages and JSON parsing failures
    - Detailed console logging for all state updates and command executions

### Changed
- **MQTT Topic Subscription Strategy**
  - Optimized from 15+ individual subscriptions to 2 wildcard subscriptions
  - Reduced MQTT broker load and improved connection stability
  - All topic routing now handled in centralized message handlers
  - Better scalability for large deployments (20+ displays)

## [1.7.8] - 2026-03-13

### Added
- **Touchkio Error Log Tracking**
  - Added support for parsing and storing error logs from Touchkio displays
  - Subscribes to `touchkio/{deviceId}/errors/attributes` topic
  - Stores error data and last error update timestamp in display state
  - Enables error monitoring and troubleshooting for Touchkio devices
  - Error logs displayed in Touchkio modal with severity indicators (ERROR, WARN, INFO)
  - Automatic JSON parsing with error handling for malformed data
  - Timestamp tracking for last error update

### Fixed
- **Display Status Logic for Dual-Connection Displays**
  - Fixed status calculation for displays with both Socket.IO and MQTT connections
  - Displays with undefined MQTT power status now treated as active instead of partial
  - Prevents false "Partial" status for displays that haven't reported power state yet

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
