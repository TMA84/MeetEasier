# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.8] - 2026-03-07

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
