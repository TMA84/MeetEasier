# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

- **1.1.1** - Dynamic logo on WiFi page, reduced flightboard spacing
- **1.1.0** - Configurable header styles, redesigned admin panel, simplified booking
- **1.0.1** - Bug fixes, consolidated authentication, improved alignment
- **1.0.0** - First public release with booking, modern UI, multi-language support
- **0.6.0** - Admin panel, WiFi/logo management, Graph API pagination
- **0.3.2** - Error handling improvements
- **0.3.1** - Backend filtering optimization
- **0.1.0** - Initial release

[1.1.1]: https://github.com/TMA84/MeetEasier/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/TMA84/MeetEasier/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/TMA84/MeetEasier/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/TMA84/MeetEasier/releases/tag/v1.0.0
