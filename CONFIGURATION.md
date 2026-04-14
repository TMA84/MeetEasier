# MeetEasier Configuration Reference

Complete reference for all configuration options in MeetEasier.

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Admin Panel Configuration](#admin-panel-configuration)
3. [Display Customization](#display-customization)
4. [Advanced Configuration](#advanced-configuration)
5. [API Reference](#api-reference)

---

## Environment Variables

All environment variables are configured in the `.env` file in the root directory.

### Required Variables

#### Microsoft Graph API Authentication

> **Tip:** All three OAuth variables are optional. When omitted, MeetEasier starts in **Demo Mode** with 8 sample rooms and dynamically generated meetings. See the [README](README.md#demo-mode) for details.

```env
# Application (client) ID from Azure AD app registration
OAUTH_CLIENT_ID=12345678-1234-1234-1234-123456789abc

# Authority URL with your tenant ID
OAUTH_AUTHORITY=https://login.microsoftonline.com/87654321-4321-4321-4321-cba987654321

# Client secret from Azure AD app registration
OAUTH_CLIENT_SECRET=your~client~secret~value~here
```

**How to obtain:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to Azure Active Directory > App registrations
3. Select your MeetEasier app
4. Copy Application (client) ID and Directory (tenant) ID
5. Create a client secret under Certificates & secrets, or use the admin panel to generate a certificate (see [OAuth & Certificate Configuration](#5-oauth--certificate-configuration))

---

### Optional Variables

#### Server Configuration

```env
# Port number for the web server
# Default: 8080
PORT=8080
```

**Valid values:** Any available port number (1-65535)  
**Recommended:** 8080 (default), 3000, 80 (requires root), 443 (requires root)

---

#### Search Parameters

```env
# Maximum number of days to search ahead for meetings
# Default: 7
SEARCH_MAXDAYS=7

# Maximum number of room lists to retrieve
# Default: 5
SEARCH_MAXROOMLISTS=5

# Maximum number of rooms per room list
# Default: 50
SEARCH_MAXROOMS=50

# Maximum number of appointments per room
# Default: 100
SEARCH_MAXITEMS=100

# Polling interval for room data refresh (milliseconds)
# Default: 60000 (1 minute), minimum: 5000
SEARCH_POLL_INTERVAL_MS=60000
```

**Performance considerations:**
- Higher values = more data = slower response times
- Microsoft Graph API supports pagination, so these limits are soft
- Recommended to keep defaults unless you have specific needs

---

#### Startup Validation

```env
# Enable strict startup validation
# When true, warnings (not just errors) will also prevent the server from starting
# Default: false
STARTUP_VALIDATION_STRICT=false
```

**Behavior:**
- On every startup, MeetEasier validates the configuration and reports issues in three categories:
  - **Errors** (blocking): Critical problems that always prevent startup (e.g., invalid polling interval)
  - **Warnings**: Potential issues logged to console (e.g., legacy default API token, missing webhook client state)
  - **Info**: Informational notes (e.g., OAuth not yet configured, cache file missing)
- In strict mode (`STARTUP_VALIDATION_STRICT=true`), warnings also prevent startup
- Can also be toggled via the Admin Panel under **Operations → System** (Startup Validation Strict)

**Validated settings:**
- OAuth credentials (client ID, authority, client secret)
- API token presence and default value detection
- Polling interval (`SEARCH_POLL_INTERVAL_MS` must be ≥ 5000 ms)
- Graph webhook configuration (client state and allowed IPs when enabled)
- Cache file existence (`data/cache.json`)

**Valid values:** `true`, `false`

---

#### Security Configuration

```env
# API token for admin panel authentication
# Required for updating settings via admin panel
# Generate with: openssl rand -hex 32
API_TOKEN=your-secure-random-token-here
```

#### Display IP Whitelist

Restrict which IP addresses can access display-facing endpoints (room data, booking, check-in, etc.). When enabled, only requests from whitelisted IPs are allowed; non-whitelisted IPs receive a `403` response with error code `ip_not_whitelisted`.

This is configured via the Admin Panel under **Operations → System** (Display IP Whitelist section). Two settings control this feature:

- `displayIpWhitelistEnabled` (boolean, default: `false`) — Enable or disable the whitelist
- `displayIpWhitelist` (array of IP strings) — List of allowed IP addresses (one per line in the admin UI)

When disabled (default), all IPs can access display endpoints. IPv4 and IPv6 addresses are supported, and `::1` / `127.0.0.1` are normalized for consistent matching.

Rejected requests show localized error messages on the display. These messages can be customized via the translation system (see [Localization](#localization)):

| Error Code | Translation Key | Default (EN) |
|---|---|---|
| `ip_not_whitelisted` | `displayIpNotWhitelistedErrorLabel` | Your device is not authorized. Please contact your administrator. |
| `origin_not_allowed` | `displayOriginNotAllowedErrorLabel` | This action is only available from authorized devices. |
| `booking_disabled` | `displayBookingDisabledErrorLabel` | Booking is currently disabled for this room. |

If `API_TOKEN` is not set, MeetEasier starts without a static default token.
Create the initial admin token on first login at `/admin`.
For production, always set a secure custom token (or rotate it immediately via Admin panel).

**Security recommendations:**
- Use at least 32 characters
- Use random alphanumeric characters
- Never commit to version control
- Rotate regularly (every 90 days)
- Store securely (password manager, secrets vault)

**Generate secure token:**
```bash
# Linux/macOS
openssl rand -hex 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

#### WiFi Configuration

```env
# WiFi network SSID
# Optional - can be configured via admin panel
WIFI_SSID=Guest WiFi

# WiFi network password
# Optional - can be configured via admin panel
WIFI_PASSWORD=SecurePassword123
```

**Behavior:**
- If `WIFI_SSID` is set: WiFi configuration is **locked** in admin panel
- If not set: WiFi can be configured via admin panel
- QR code is automatically generated for easy mobile connection

**Use cases:**
- Set via environment: For static WiFi that never changes
- Set via admin panel: For dynamic WiFi that may change

---

#### Logo Configuration

```env
# Logo URL for dark theme (used on light backgrounds)
# Optional - can be configured via admin panel
LOGO_DARK_URL=/img/logo-dark.svg

# Logo URL for light theme (used on dark backgrounds)
# Optional - can be configured via admin panel
LOGO_LIGHT_URL=/img/logo-light.svg
```

**Behavior:**
- If either logo URL is set: Logo configuration is **locked** in admin panel
- If not set: Logos can be configured via admin panel
- Supports relative paths, absolute paths, and external URLs

**Supported formats:** JPG, PNG, GIF, SVG, WebP

**Where logos are used:**
- Dark logo: Single-room display, flightboard
- Light logo: Room-minimal display, admin panel

---

#### Sidebar Configuration

```env
# Show WiFi information in sidebar
# Default: true
SIDEBAR_SHOW_WIFI=true

# Show upcoming meetings in sidebar
# Default: false
SIDEBAR_SHOW_UPCOMING=false

# Show meeting titles in status panel and upcoming meetings
# Default: false
SIDEBAR_SHOW_TITLES=false
```

**Behavior:**
- If any `SIDEBAR_*` variable is set: Sidebar configuration is **locked** in admin panel
- If not set: Sidebar can be configured via admin panel

**Display logic:**
- `SIDEBAR_SHOW_WIFI` and `SIDEBAR_SHOW_UPCOMING` are mutually exclusive (radio buttons)
- `SIDEBAR_SHOW_TITLES` is independent (checkbox)
- Automatic page reload can be enabled via admin panel to refresh displays daily at a configured time (default 03:00), helping prevent memory issues during continuous kiosk operation

**Privacy considerations:**
- Set `SIDEBAR_SHOW_TITLES=false` to hide meeting subjects
- Organizer names are always shown
- Private meetings show "Private" instead of subject

---

#### Booking Configuration

```env
# Enable room booking feature
# Default: true
ENABLE_BOOKING=true
```

**Behavior:**
- If set: Booking configuration is **locked** in admin panel
- If not set: Booking can be configured via admin panel
- Automatically disabled if `Calendars.ReadWrite` permission is missing

**Requirements:**
- Azure AD permission: `Calendars.ReadWrite` (application permission)
- Admin consent must be granted
- Room mailboxes must allow direct booking

**Extend Meeting:**
- Disabled by default
- Can be enabled in the admin panel (Booking Configuration)
- Requires `?extendbooking=true` in the display URL
- Optional URL allowlist in `booking-config.json`

**Valid values:** `true`, `false`

---

#### Graph Fetch Configuration

```env
# Timeout for Graph API requests (milliseconds)
# Default: 10000, minimum: 1000
GRAPH_FETCH_TIMEOUT_MS=10000

# Number of retry attempts for failed Graph API requests
# Default: 2, minimum: 0
GRAPH_FETCH_RETRY_ATTEMPTS=2

# Base delay between retries (milliseconds, exponential backoff)
# Default: 250, minimum: 50
GRAPH_FETCH_RETRY_BASE_MS=250
```

**Retry behavior:**
- Retries on: timeouts, network errors, HTTP 429 (rate limit), HTTP 5xx
- Uses exponential backoff: `retryBaseMs * 2^attempt`
- Non-retryable errors (4xx except 429) fail immediately

---

#### Graph Webhook Configuration

```env
# Enable Microsoft Graph webhook notifications for real-time calendar updates
# Default: false
GRAPH_WEBHOOK_ENABLED=false

# Shared secret for webhook notification validation
GRAPH_WEBHOOK_CLIENT_STATE=your-webhook-secret

# Comma-separated list of allowed IP addresses for webhook notifications
GRAPH_WEBHOOK_ALLOWED_IPS=52.159.23.0,52.159.24.0
```

**Security:** Both `GRAPH_WEBHOOK_CLIENT_STATE` and `GRAPH_WEBHOOK_ALLOWED_IPS` must be configured when webhooks are enabled. Notifications with mismatched `clientState` are silently ignored.

---

#### Reverse Proxy Configuration

```env
# Trust X-Forwarded-For header from reverse proxy (ALB, Nginx, etc.)
# When enabled, the rightmost IP in X-Forwarded-For is used as client IP
# Default: false
TRUST_REVERSE_PROXY=false
```

**Security:** Only enable this when running behind a trusted reverse proxy. The rightmost entry in `X-Forwarded-For` is used to prevent client-side spoofing.

---

#### MQTT Configuration

```env
# Enable MQTT integration for display management (TouchKio devices)
# Default: false
MQTT_ENABLED=false

# MQTT broker URL
MQTT_BROKER_URL=mqtt://localhost:1883

# MQTT authentication
MQTT_USERNAME=your-mqtt-user
MQTT_PASSWORD=your-mqtt-password
```

**Features:**
- Remote display management (power, brightness, kiosk mode, theme, volume)
- Display health monitoring (CPU, memory, temperature, uptime)
- Bulk operations (refresh all, reboot all)
- Auto-discovery of TouchKio devices

---

#### Automatic Translation Configuration

```env
# Enable automatic translation of admin and maintenance texts
# Default: false
AUTO_TRANSLATE_ENABLED=false

# Translation API URL (Google Translate API or LibreTranslate-compatible)
AUTO_TRANSLATE_URL=https://translation.googleapis.com/language/translate/v2

# Translation API key
AUTO_TRANSLATE_API_KEY=your-api-key

# Translation request timeout (milliseconds)
# Default: 5000
AUTO_TRANSLATE_TIMEOUT_MS=5000
```

**Supported APIs:**
- Google Translate API (`translation.googleapis.com`)
- LibreTranslate-compatible APIs

---

#### Check-In Configuration

```env
# Enable meeting check-in feature
# Default: false
CHECKIN_ENABLED=false

# Require check-in for external organizers only
# Default: false
CHECKIN_REQUIRED_FOR_EXTERNAL=false

# Minutes before meeting start when check-in opens
# Default: 10
CHECKIN_EARLY_MINUTES=10

# Minutes after meeting start when check-in window closes
# Default: 15
CHECKIN_WINDOW_MINUTES=15

# Automatically release room if no check-in (no-show)
# Default: false
CHECKIN_AUTO_RELEASE_NO_SHOW=false
```

---

#### Maintenance Mode

```env
# Enable maintenance mode (blocks write API requests)
# Default: false
MAINTENANCE_MODE=false

# Custom maintenance message displayed to users
MAINTENANCE_MESSAGE=System maintenance in progress
```

---

#### Rate Limiting

```env
# General API rate limit window (milliseconds)
RATE_LIMIT_API_WINDOW_MS=60000

# Maximum requests per window for general API
RATE_LIMIT_API_MAX=100

# Write operation rate limit window (milliseconds)
RATE_LIMIT_WRITE_WINDOW_MS=60000

# Maximum write requests per window
RATE_LIMIT_WRITE_MAX=30

# Authentication rate limit window (milliseconds)
RATE_LIMIT_AUTH_WINDOW_MS=900000

# Maximum auth attempts per window
RATE_LIMIT_AUTH_MAX=10

# Booking rate limit window (milliseconds)
RATE_LIMIT_BOOKING_WINDOW_MS=60000

# Maximum booking requests per window
RATE_LIMIT_BOOKING_MAX=10
```

The admin panel provides a web interface for managing runtime configuration.

### Access

URL: `http://your-server:8080/admin`

### Authentication

Enter your `API_TOKEN` in the API Token field at the top of the page.

If no `API_TOKEN` is set in environment/config, open `/admin` and create the initial admin token on first login.

### Configuration Sections

#### 1. WiFi Configuration

**Fields:**
- SSID (required)
- Password (optional)

**Features:**
- Automatic QR code generation
- Real-time preview
- Instant updates across all displays

**QR Code Format:**
```
WIFI:T:WPA;S:YourSSID;P:YourPassword;;
```

**Locked when:** `WIFI_SSID` environment variable is set

---

#### 2. Logo Configuration

**Upload Methods:**

**URL Mode:**
- Dark Logo URL
- Light Logo URL

**File Upload Mode:**
- Dark Logo File (max 5MB)
- Light Logo File (max 5MB)

**Supported formats:** JPG, PNG, GIF, SVG, WebP

**Features:**
- Live preview of both logos
- Automatic file management
- Uploaded files stored in `static/img/uploads/`

**Locked when:** `LOGO_DARK_URL` or `LOGO_LIGHT_URL` environment variable is set

---

#### 3. Sidebar Configuration

**Display Options (Radio - choose one):**
- Show WiFi Information
- Show Upcoming Meetings

**Additional Options (Checkbox):**
- Show Meeting Titles

**Behavior:**
- WiFi/Upcoming: Only one can be active at a time
- Meeting Titles: Independent setting, applies to both status panel and upcoming meetings

**Locked when:** Any `SIDEBAR_*` environment variable is set

---

#### 4. Booking Configuration

**Fields:**
- Enable Booking Feature (checkbox)

**Features:**
- Automatic permission detection
- Warning message if `Calendars.ReadWrite` permission is missing
- Cannot enable if permission is missing

**Locked when:** `ENABLE_BOOKING` environment variable is set

---

#### 5. OAuth & Certificate Configuration

**Authentication Method Toggle:**
- Client Secret (default)
- Certificate (self-signed X.509)

**Client Secret Mode:**
- Client ID, Tenant ID, and Client Secret fields
- Secret is encrypted before writing to disk
- Changes take effect on the next polling cycle without a server restart

**Certificate Mode:**
- Generate a self-signed X.509 certificate directly from the admin panel
- View active certificate details (SHA-256 and SHA-1 thumbprints, common name, validity dates)
- Download the public `.pem` file for upload to Azure AD
- Delete the certificate to revert to client secret authentication
- Certificates don't expire annually like client secrets (default validity: 3 years)
- Changes take effect on the next polling cycle without a server restart

**Graph Runtime Settings (when not locked):**
- Webhook enabled/disabled, client state, allowed IPs
- Fetch timeout, retry attempts, retry base delay

**Locked when:** `OAUTH_CLIENT_ID`, `OAUTH_AUTHORITY`, or `OAUTH_CLIENT_SECRET` environment variables are set (OAuth section); system settings have a separate lock

---

#### 6. API Tokens

Manage the admin API token and WiFi API token from a dedicated tab.

**Admin API Token:**
- Set a new admin API token (minimum 8 characters)
- Confirm the new token before saving
- Shows current token source and whether the default token is active
- After saving, use the new token for future admin logins

**WiFi API Token:**
- Set a separate token for external WiFi API integrations
- Confirm the new token before saving
- Shows current WiFi token source and configuration status

**Current Configuration Display:**
- Token source (environment, config file, default)
- Whether the default token is still active
- Last updated timestamp for each token

**Locked when:** `API_TOKEN` environment variable is set (admin token); WiFi API token has a separate lock

---

## Display Customization

### URL Parameters

#### Flightboard Filtering

Filter rooms by room list name:

```
http://your-server:8080/?roomlist=Building%201
```

**How it works:**
- Matches room list name (case-sensitive)
- URL-encode spaces and special characters
- Shows only rooms from matching room list

---

### Custom Styling

#### Override CSS

Create custom CSS file and include in your deployment:

```css
/* custom.css */

/* Change flightboard background */
.flightboard-wrap {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

/* Change available room color */
.modern-room-status--available {
  background: linear-gradient(135deg, #00b894 0%, #00a383 100%);
}

/* Change busy room color */
.modern-room-status--busy {
  background: linear-gradient(135deg, #d63031 0%, #c0392b 100%);
}
```

**Include in HTML:**
1. Place `custom.css` in `static/css/`
2. Modify `ui-react/public/index.html` to include it
3. Rebuild React app: `npm run build`

---

### Custom Logos

#### Logo Requirements

**Dark Logo (for light backgrounds):**
- Used on: Single-room display, flightboard
- Recommended: Dark colors, transparent background
- Format: SVG (preferred), PNG with transparency

**Light Logo (for dark backgrounds):**
- Used on: Room-minimal display, admin panel
- Recommended: Light colors, transparent background
- Format: SVG (preferred), PNG with transparency

**Size recommendations:**
- Width: 200-400px
- Height: 80-120px
- Aspect ratio: Maintain original ratio
- File size: < 500KB

---

## Advanced Configuration

### Data Persistence

#### Configuration Files

All runtime configuration is stored in JSON files:

```
data/
├── wifi-config.json        # WiFi settings
├── logo-config.json        # Logo URLs
├── sidebar-config.json     # Sidebar settings
├── booking-config.json     # Booking settings
├── oauth-config.json       # OAuth credentials (client ID, authority, encrypted secret)
├── oauth-certificate.json  # Self-signed certificate for OAuth (encrypted private key, SHA-256/SHA-1 thumbprints, validity)
├── system-config.json      # System settings (webhooks, graph fetch, IP whitelist, demo mode)
├── search-config.json      # Search parameters (maxDays, maxRooms, pollInterval)
├── rate-limit-config.json  # Rate limit settings per endpoint category
├── colors-config.json      # Color configuration (booking button, status colors)
├── maintenance-config.json # Maintenance mode settings
├── i18n-config.json        # Internationalization (maintenance messages, admin translations)
├── mqtt-config.json        # MQTT broker and display settings
├── touchkio-desired-config.json # Persisted desired display settings (brightness, URL, zoom, volume, theme per device)
├── translation-api-config.json # Translation API settings
├── api-token-config.json   # Admin and WiFi API token configuration
├── cache.json              # Cached room data
└── audit-log.jsonl         # Audit log (JSONL format, one JSON entry per line)
```

**Format examples:**

**wifi-config.json:**
```json
{
  "ssid": "Guest WiFi",
  "passwordEncrypted": { "iv": "...", "data": "..." },
  "password_migrated": true,
  "lastUpdated": "2026-02-08T14:30:00.000Z"
}
```

> **Note:** WiFi passwords are encrypted at rest. Legacy plaintext `password` fields are automatically migrated to `passwordEncrypted` on first read. The API continues to return the decrypted password in its response for display purposes (e.g., QR code generation).

**logo-config.json:**
```json
{
  "logoDarkUrl": "/img/logo-dark.svg",
  "logoLightUrl": "/img/logo-light.svg",
  "lastUpdated": "2026-02-08T14:30:00.000Z"
}
```

**sidebar-config.json:**
```json
{
  "showWiFi": true,
  "showUpcomingMeetings": false,
  "showMeetingTitles": false,
  "autoReloadEnabled": false,
  "autoReloadTime": "03:00",
  "lastUpdated": "2026-02-08T14:30:00.000Z"
}
```

**booking-config.json:**
```json
{
  "enableBooking": true,
  "buttonColor": "#334155",
  "enableExtendMeeting": false,
  "extendMeetingUrlAllowlist": [],
  "lastUpdated": "2026-02-08T14:30:00.000Z"
}
```

**system-config.json:**
```json
{
  "displayIpWhitelistEnabled": false,
  "displayIpWhitelist": [],
  "displayTrackingMode": "client-id",
  "displayTrackingRetentionHours": 2,
  "displayTrackingCleanupMinutes": 5,
  "lastUpdated": "2026-03-14T10:00:00.000Z"
}
```

---

### Real-time Updates

#### Socket.IO Events

MeetEasier uses Socket.IO for real-time updates.

**Connection Timeouts:**

The server uses generous timeout values to accommodate Raspberry Pi displays and other low-power kiosk devices that may experience memory pressure or delayed heartbeats during long-running operation:

| Setting | Value | Description |
|---|---|---|
| `pingTimeout` | 60 000 ms | Time before considering a client disconnected after a missed pong |
| `pingInterval` | 25 000 ms | Interval between server-to-client ping frames |
| `connectTimeout` | 45 000 ms | Maximum time allowed for the initial connection handshake |

These values are hardcoded in `server.js` and do not require configuration.

**Server → Client Events:**
- `rooms` - Room data updates (every 60 seconds)
- `wifiConfigUpdated` - WiFi configuration changed
- `logoConfigUpdated` - Logo configuration changed
- `sidebarConfigUpdated` - Sidebar configuration changed
- `bookingConfigUpdated` - Booking configuration changed

**Client Connection:**
```javascript
const socket = io();

socket.on('rooms', (data) => {
  console.log('Room data updated:', data);
});

socket.on('wifiConfigUpdated', (config) => {
  console.log('WiFi config updated:', config);
});
```

---

### API Endpoints

#### Public Endpoints (No authentication required)

**GET /api/rooms**
- Returns: Array of room objects with appointments
- Updates: Every 60 seconds via Socket.IO

**GET /api/roomlists**
- Returns: Array of room list objects

**GET /api/wifi**
- Returns: Current WiFi configuration

**GET /api/logo**
- Returns: Current logo configuration

**GET /api/sidebar**
- Returns: Current sidebar configuration

**GET /api/booking-config**
- Returns: Current booking configuration
- Includes permission status
- Supports room-specific effective view via query: `?roomEmail=room@domain.com`

**GET /api/config-locks**
- Returns: Which settings are locked via environment variables

**GET /api/heartbeat**
- Returns: Server health status

**GET /api/health**
- Returns: Deep health status (Graph auth, sync status, cache status, maintenance)

**GET /api/readiness**
- Returns: Service readiness (200 when ready, 503 when not ready)

**GET /api/maintenance-status**
- Returns: Current maintenance mode state and message

**GET /api/graph/webhook**
- Graph webhook validation endpoint (`validationToken` echo)

---

#### Protected Endpoints (Require API_TOKEN)

**POST /api/wifi**
- Body: `{ "ssid": "string", "password": "string" }`
- Returns: Updated configuration
- Generates new QR code

**POST /api/logo**
- Body: `{ "logoDarkUrl": "string", "logoLightUrl": "string" }`
- Returns: Updated configuration

**POST /api/logo/upload**
- Body: FormData with logo file and logoType ("dark" or "light")
- Returns: Uploaded file URL and updated configuration

**POST /api/sidebar**
- Body: `{ "showWiFi": boolean, "showUpcomingMeetings": boolean, "showMeetingTitles": boolean, "autoReloadEnabled"?: boolean, "autoReloadTime"?: "string" }`
- Returns: Updated configuration

**POST /api/booking-config**
- Body: `{ "enableBooking": boolean, "buttonColor"?: string, "enableExtendMeeting"?: boolean, "extendMeetingUrlAllowlist"?: string[], "roomFeatureFlags"?: Record<string, { enableBooking?: boolean, enableExtendMeeting?: boolean }> }`
- Returns: Updated configuration
- Validates permission before enabling

**POST /api/maintenance**
- Body: `{ "enabled"?: boolean, "message"?: string }`
- Returns: Updated maintenance configuration

**GET /api/audit-logs**
- Returns: Recent admin audit entries

**GET /api/config/backup**
- Returns: Runtime configuration snapshot

**POST /api/config/restore**
- Body: Backup payload from `/api/config/backup`
- Returns: Applied configuration snapshot

**POST /api/graph/webhook**
- Microsoft Graph change notification receiver
- Triggers immediate room refresh on valid notifications

**POST /api/rooms/:roomEmail/book**
- Body: `{ "subject": "string", "startTime": "ISO8601", "endTime": "ISO8601" }`
- Returns: Booking confirmation
- Checks for conflicts before booking

**POST /api/extend-meeting**
- Body: `{ "roomEmail": "string", "appointmentId": "string", "minutes": number, "roomGroup"?: "string" }`
- Returns: `{ "success": true, "newEndTime": "ISO8601" }`
- Minutes must be 5–240 in steps of 5
- Checks for conflicts with subsequent meetings and end of day

**POST /api/end-meeting**
- Body: `{ "roomEmail": "string", "appointmentId": "string", "roomGroup"?: "string" }`
- Returns: `{ "success": true, "newEndTime": "ISO8601" }`
- Sets meeting end time to current time

**GET /api/check-in-status**
- Query: `?roomEmail=...&appointmentId=...&organizer=...&roomName=...&startTimestamp=...`
- Returns: Check-in status (required, tooEarly, expired, checkedIn)

**POST /api/check-in**
- Body: `{ "roomEmail": "string", "appointmentId": "string", "organizer"?: "string", "roomName"?: "string", "startTimestamp"?: number }`
- Returns: Updated check-in status
- Moves meeting start to now on early check-in

**GET /api/version**
- Returns: `{ "version": "string", "name": "string" }` from package.json
- Requires WiFi or admin API token

**GET /api/oauth-config**
- Returns: Current OAuth configuration (client ID, authority, has secret)

**POST /api/oauth-config**
- Body: `{ "clientId"?: "string", "authority"?: "string", "tenantId"?: "string", "clientSecret"?: "string" }`
- Returns: Updated OAuth configuration
- Locked when OAuth env variables are set
- Refreshes MSAL client and triggers room data refresh

**GET /api/api-token-config**
- Returns: API token configuration status

**POST /api/api-token-config**
- Body: `{ "newToken"?: "string", "newWifiToken"?: "string" }`
- Returns: Updated token configuration
- Tokens must be at least 8 characters

**GET /api/system-config**
- Returns: Full system configuration

**POST /api/system-config**
- Body: Partial system config (webhook, graph fetch, HSTS, rate limit, display tracking, IP whitelist, demo mode, etc.)
- Returns: Updated system configuration

**GET /api/search-config**
- Returns: Search configuration (maxDays, maxRooms, pollInterval, etc.)

**POST /api/search-config**
- Body: `{ "useGraphAPI"?: boolean, "maxDays"?: number, "maxRoomLists"?: number, "maxRooms"?: number, "maxItems"?: number, "pollIntervalMs"?: number }`
- Returns: Updated search configuration

**GET /api/rate-limit-config**
- Returns: Rate limit configuration for all endpoint categories

**POST /api/rate-limit-config**
- Body: `{ "apiWindowMs"?: number, "apiMax"?: number, "writeWindowMs"?: number, "writeMax"?: number, "authWindowMs"?: number, "authMax"?: number, "bookingWindowMs"?: number, "bookingMax"?: number }`
- Returns: Updated rate limit configuration

**GET /api/colors**
- Returns: Color configuration (booking button, status colors)

**POST /api/colors**
- Body: `{ "bookingButtonColor"?: "string", "statusAvailableColor"?: "string", "statusBusyColor"?: "string", "statusUpcomingColor"?: "string", "statusNotFoundColor"?: "string" }`
- Returns: Updated color configuration

**GET /api/i18n**
- Returns: Internationalization configuration (maintenance messages, admin translations)

**POST /api/i18n**
- Body: `{ "maintenanceMessages"?: object, "adminTranslations"?: object }`
- Returns: Updated i18n configuration

**POST /api/i18n/auto-translate**
- Body: `{ "targetLanguage": "string", "sourceLanguage"?: "string", "maintenanceSource": object, "adminSource": object }`
- Returns: `{ "success": true, "maintenance": object, "admin": object }`
- Translates texts via configured translation API

**GET /api/translation-api-config**
- Returns: Translation API configuration (public, no auth)

**POST /api/translation-api-config**
- Body: `{ "enabled"?: boolean, "url"?: "string", "apiKey"?: "string", "timeoutMs"?: number }`
- Returns: Updated translation API configuration

**GET /api/displays**
- Returns: Merged display list (Socket.IO + MQTT) with connection status
- Matches displays across protocols by IP, device ID

**GET /api/connected-clients**
- Returns: Socket.IO-connected display clients

**DELETE /api/connected-clients/:clientId**
- Removes a disconnected display client from tracking

**GET /api/mqtt-config**
- Returns: MQTT configuration (password excluded)

**POST /api/mqtt-config**
- Body: `{ "enabled"?: boolean, "brokerUrl"?: "string", "authentication"?: boolean, "username"?: "string", "password"?: "string", "discovery"?: object }`
- Returns: Updated MQTT configuration
- Restarts MQTT client when enabled status changes

**GET /api/mqtt-status**
- Returns: MQTT client connection status

**GET /api/mqtt-displays**
- Returns: MQTT display states (power, brightness, kiosk, theme, etc.)

**POST /api/mqtt-power-trigger/:hostname**
- Body: `{ "powerState"?: boolean, "brightness"?: number }`
- Sends power command to a specific display

**POST /api/mqtt-brightness/:hostname**
- Body: `{ "brightness": number }`
- Sends brightness command to a display

**POST /api/mqtt-kiosk/:hostname**
- Body: `{ "status": "string" }`
- Sends kiosk status command to a display

**POST /api/mqtt-theme/:hostname**
- Body: `{ "theme": "string" }`
- Sends theme command to a display

**POST /api/mqtt-volume/:hostname**
- Body: `{ "volume": number }`
- Sends volume command to a display

**POST /api/mqtt-page-url/:hostname**
- Body: `{ "url": "string" }`
- Sends page URL command to a display

**POST /api/mqtt-page-zoom/:hostname**
- Body: `{ "zoom": number }`
- Sends page zoom command to a display

**POST /api/mqtt-keyboard/:hostname**
- Body: `{ "visible": boolean }`
- Sends keyboard visibility command to a display

**POST /api/mqtt-refresh/:hostname**
- Sends refresh command to a specific display

**POST /api/mqtt-reboot/:hostname**
- Sends reboot command to a specific display

**POST /api/mqtt-shutdown/:hostname**
- Sends shutdown command to a specific display

**POST /api/mqtt-refresh-all**
- Sends refresh command to all connected displays

**POST /api/mqtt-reboot-all**
- Sends reboot command to all connected displays

**GET /api/power-management**
- Returns: Global power management configuration

**POST /api/power-management**
- Body: `{ "mode": "dpms"|"browser"|"mqtt", "schedule"?: object, "mqttHostname"?: "string" }`
- Returns: Updated global power management configuration

**GET /api/power-management/:clientId**
- Returns: Power management configuration for a specific display (falls back to global)

**POST /api/power-management/:clientId**
- Body: `{ "mode": "dpms"|"browser"|"mqtt", "schedule"?: object, "mqttHostname"?: "string" }`
- Returns: Updated display-specific power management configuration

**DELETE /api/power-management/:clientId**
- Deletes display-specific power management configuration (reverts to global)

**Admin Authentication Endpoints:**

**GET /api/admin/bootstrap-status**
- Returns: `{ "requiresSetup": boolean, "lockedByEnv": boolean }`
- Public endpoint to check if initial token setup is needed

**POST /api/admin/bootstrap-token**
- Body: `{ "token": "string" }` (min 8 characters)
- Creates the initial admin API token during first setup
- Rate limited

**POST /api/admin/login**
- Body: `{ "token": "string" }`
- Validates token and sets auth cookie + CSRF cookie
- Rate limited

**POST /api/admin/logout**
- Clears auth and CSRF cookies

**GET /api/admin/session**
- Returns: `{ "authenticated": true }` if session is valid

---

### OAuth Certificate Management API

Manage self-signed certificates for Microsoft Graph API authentication as an alternative to client secrets.

#### Get Certificate Info

**Endpoint:** `GET /api/oauth-certificate`

**Authentication:** Required

**Response (certificate exists):**
```json
{
  "certificate": {
    "thumbprintSha256": "AB12CD34...",
    "thumbprintSha1": "EF56AB78...",
    "commonName": "MeetEasier OAuth",
    "notBefore": "2026-03-20T00:00:00.000Z",
    "notAfter": "2029-03-20T00:00:00.000Z"
  }
}
```

**Example:**
```bash
curl http://localhost:8080/api/oauth-certificate \
  -H "Authorization: Bearer ${API_TOKEN}"
```

#### Generate Certificate

**Endpoint:** `POST /api/oauth-certificate/generate`

**Authentication:** Required

**Request Body (all fields optional):**
```json
{
  "commonName": "MeetEasier OAuth",
  "validityYears": 3
}
```

**Response:**
```json
{
  "success": true,
  "certificate": {
    "thumbprintSha256": "AB12CD34...",
    "thumbprintSha1": "EF56AB78...",
    "commonName": "MeetEasier OAuth",
    "notBefore": "2026-03-20T00:00:00.000Z",
    "notAfter": "2029-03-20T00:00:00.000Z"
  }
}
```

**Notes:**
- Requires a configured `API_TOKEN` (used as encryption key for the private key at rest)
- MSAL clients are automatically refreshed to use the new certificate
- Upload the downloaded `.pem` public certificate to your Azure AD app registration under "Certificates & secrets"
- The SHA-1 thumbprint is included for Azure AD certificate matching compatibility

**Example:**
```bash
curl -X POST http://localhost:8080/api/oauth-certificate/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -d '{"commonName": "MeetEasier OAuth", "validityYears": 3}'
```

#### Download Public Certificate

**Endpoint:** `GET /api/oauth-certificate/download`

**Authentication:** Required

**Response:** `.pem` file download (Content-Type: `application/x-pem-file`)

**Example:**
```bash
curl -o meeteasier-oauth.pem http://localhost:8080/api/oauth-certificate/download \
  -H "Authorization: Bearer ${API_TOKEN}"
```

#### Delete Certificate

**Endpoint:** `DELETE /api/oauth-certificate`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Certificate deleted. Reverted to client secret authentication."
}
```

**Notes:**
- MSAL clients automatically fall back to client secret authentication
- Ensure a valid `OAUTH_CLIENT_SECRET` is configured before deleting

**Example:**
```bash
curl -X DELETE http://localhost:8080/api/oauth-certificate \
  -H "Authorization: Bearer ${API_TOKEN}"
```

---

### Custom Room Blacklist

Exclude specific rooms from display:

**File:** `config/room-blacklist.js`

```javascript
module.exports = [
  'room1@yourdomain.com',
  'room2@yourdomain.com',
  'test-room@yourdomain.com'
];
```

**Usage:**
- Add room email addresses to array
- Rooms will be filtered out from all displays
- Useful for maintenance, testing, or decommissioned rooms

---

### Room List Aliases

Configure custom aliases for room lists containing special characters.

**Problem:** Room list names with special characters (like `"Building A & B"`, `"Mötzing"`, or `"Floor 3 (North Wing)"`) don't work well with the URL-based filtering system.

**Solution:** The system automatically transliterates special characters and generates clean aliases. You can also define custom aliases for more control.

**File:** `config/roomlist-aliases.js`

```javascript
module.exports = {
  aliases: {
    // Optional: Define custom aliases for specific room lists
    "Building A & B": "building-ab",
    "Meeting Rooms - HQ": "meeting-rooms-hq"
    
    // Room lists not configured here use auto-generated aliases
  }
};
```

**How it works:**

1. **Auto-generated aliases** (for room lists not in configuration):
   - Transliterates special characters:
     - German umlauts: Ä→A, ö→o, ü→u, ß→ss
     - Accents: é→e, ñ→n, ç→c, etc.
   - Converts to lowercase
   - Replaces spaces with dashes
   - Removes any remaining special characters

2. **Custom aliases** (defined in configuration):
   - Takes priority over auto-generated aliases
   - Useful when you want specific control

**Examples:**

| Room List Name | Auto-Generated Alias | Notes |
|---|---|---|
| `Mötzing` | `motzing` | Umlaut ö converted to o |
| `Café Munich` | `cafe-munich` | Accent é converted to e |
| `Building A & B` | `building-ab` | Special character removed |
| `Floor 3 (North Wing)` | `floor-3-north-wing` | Parentheses removed |

**Usage in URL:**

```
http://your-server:8080/?roomlist=motzing
http://your-server:8080/?roomlist=building-ab
```

**Benefits:**

- Handles room list names with umlauts, accents, and special characters automatically
- Creates clean, predictable filter IDs
- Works seamlessly with URL parameters
- No additional configuration needed for common characters
- Optional custom aliases for full control

---

### Localization

#### Supported Languages

- English (en)
- German (de)

#### Auto-detection

Language is automatically detected from browser settings:
- `navigator.language` or `navigator.userLanguage`
- Falls back to English if language not supported

#### Time Format

Time format is automatically determined by locale:
- 12-hour format: en-US, en-CA
- 24-hour format: de-DE, en-GB, and most other locales

#### Adding New Languages

1. Edit translation objects in components:
   - `ui-react/src/config/displayTranslations.js` (display-facing error messages)
   - `ui-react/src/components/booking/BookingModal.js`
   - `ui-react/src/components/admin/Admin.js`
   - `ui-react/src/config/singleRoom.config.js`
   - `ui-react/src/config/flightboard.config.js`

2. Add new language code and translations

3. Rebuild React app: `npm run build`

---

## Configuration Best Practices

### 1. Security

- Always set `API_TOKEN` in production
- Use strong, random tokens (32+ characters)
- Never commit `.env` file to version control
- Rotate tokens regularly
- Use HTTPS in production

### 2. Performance

- Keep `SEARCH_MAXDAYS` reasonable (7-14 days)
- Don't set `SEARCH_MAXROOMS` too high (50-100 max)
- Monitor server resources with many rooms
- Use caching for static assets

### 3. Reliability

- Use environment variables for static configuration
- Use admin panel for dynamic configuration
- Backup `data/` directory regularly
- Monitor logs for errors
- Use process manager (PM2) in production

### 4. User Experience

- Set appropriate `SIDEBAR_SHOW_TITLES` based on privacy needs
- Configure WiFi for easy guest access
- Use clear, recognizable logos
- Test displays on target devices
- Ensure real-time updates are working

---

## Troubleshooting Configuration

### Configuration Not Applied

**Check:**
1. `.env` file exists and is readable
2. Server was restarted after `.env` changes
3. No syntax errors in `.env` file
4. Environment variables are not overridden by system environment

**Debug:**
```bash
# Check if environment variables are loaded
node -e "require('dotenv').config(); console.log(process.env.OAUTH_CLIENT_ID)"
```

---

### Admin Panel Changes Not Saving

**Check:**
1. `API_TOKEN` is set in `.env`
2. Correct token entered in admin panel
3. Settings not locked by environment variables
4. Network connection stable
5. Browser console for errors

**Debug:**
```bash
# Check server logs
npm start

# Look for authentication errors
# Look for file write errors
```

---

### Real-time Updates Not Working

**Check:**
1. Socket.IO connection established (browser console)
2. Firewall allows WebSocket connections
3. Reverse proxy configured for WebSocket
4. No CORS issues

**Debug:**
```javascript
// Browser console
const socket = io();
socket.on('connect', () => console.log('Connected'));
socket.on('disconnect', () => console.log('Disconnected'));
```

---

## API Reference

MeetEasier provides REST API endpoints for programmatic configuration. All admin endpoints require authentication via API token.

### Authentication

All admin API endpoints require the `API_TOKEN` to be sent in one of these headers:
- `Authorization: Bearer YOUR_API_TOKEN`
- `X-API-Token: YOUR_API_TOKEN`

**CSRF Protection:**

State-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) using cookie-based admin sessions require a valid CSRF token. The `meeteasier_csrf` cookie value must be sent in the `X-CSRF-Token` request header. This does not apply when using header-based authentication (`Authorization` or `X-API-Token`), which is the standard approach for API scripts and external integrations.

**Session Expiry:**

Admin session cookies expire after 1 hour. After expiry the admin panel will require re-login.

**Example:**
```bash
# Set your API token
export API_TOKEN="your_secure_token_here"
```

---

### WiFi Configuration API

#### Get WiFi Configuration

**Endpoint:** `GET /api/wifi`

**Authentication:** Not required (public endpoint)

**Response:**
```json
{
  "ssid": "GUEST-NETWORK",
  "password": "SecurePass2030",
  "lastUpdated": "2026-02-10T12:00:00.000Z"
}
```

**Example:**
```bash
curl http://localhost:8080/api/wifi
```

#### Update WiFi Configuration

**Endpoint:** `POST /api/wifi`

**Authentication:** Required

**Request Body:**
```json
{
  "ssid": "NEW-NETWORK",
  "password": "NewPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "config": {
    "ssid": "NEW-NETWORK",
    "password": "NewPassword123",
    "lastUpdated": "2026-02-10T12:30:00.000Z"
  },
  "message": "WiFi configuration updated and QR code generated"
}
```

**Examples:**

Using Authorization header:
```bash
curl -X POST http://localhost:8080/api/wifi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -d '{
    "ssid": "GUEST-NETWORK",
    "password": "SecurePass2030"
  }'
```

Using X-API-Token header:
```bash
curl -X POST http://localhost:8080/api/wifi \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ${API_TOKEN}" \
  -d '{
    "ssid": "GUEST-NETWORK",
    "password": "SecurePass2030"
  }'
```

**Notes:**
- QR code is automatically regenerated when WiFi config is updated
- Password is optional (can be empty string for open networks)
- Changes are immediately reflected on all connected displays via Socket.IO

---

### Sidebar Configuration API

#### Get Sidebar Configuration

**Endpoint:** `GET /api/sidebar`

**Authentication:** Not required

**Response:**
```json
{
  "showWiFi": true,
  "showUpcomingMeetings": true,
  "showMeetingTitles": false,
  "minimalHeaderStyle": false,
  "autoReloadEnabled": false,
  "autoReloadTime": "03:00"
}
```

**Example:**
```bash
curl http://localhost:8080/api/sidebar
```

#### Update Sidebar Configuration

**Endpoint:** `POST /api/sidebar`

**Authentication:** Required

**Request Body:**
```json
{
  "showWiFi": true,
  "showUpcomingMeetings": true,
  "showMeetingTitles": false,
  "minimalHeaderStyle": false,
  "autoReloadEnabled": true,
  "autoReloadTime": "03:00"
}
```

**Response:**
```json
{
  "success": true,
  "config": {
    "showWiFi": true,
    "showUpcomingMeetings": true,
    "showMeetingTitles": false,
    "minimalHeaderStyle": false,
    "autoReloadEnabled": true,
    "autoReloadTime": "03:00"
  },
  "message": "Sidebar configuration updated"
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/sidebar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -d '{
    "showWiFi": true,
    "showUpcomingMeetings": true,
    "showMeetingTitles": false
  }'
```

---

### Booking Configuration API

#### Get Booking Configuration

**Endpoint:** `GET /api/booking-config`

**Authentication:** Not required

**Response:**
```json
{
  "enableBooking": true,
  "buttonColor": "#334155",
  "enableExtendMeeting": false,
  "extendMeetingUrlAllowlist": [],
  "roomFeatureFlags": {
    "conf-room-a@contoso.com": {
      "enableBooking": false,
      "enableExtendMeeting": false
    }
  }
}
```

**Example:**
```bash
curl http://localhost:8080/api/booking-config
```

#### Update Booking Configuration

**Endpoint:** `POST /api/booking-config`

**Authentication:** Required

**Request Body:**
```json
{
  "enableBooking": true,
  "enableExtendMeeting": true,
  "extendMeetingUrlAllowlist": ["/single-room/"],
  "roomFeatureFlags": {
    "conf-room-a@contoso.com": {
      "enableBooking": false,
      "enableExtendMeeting": false
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "config": {
    "enableBooking": true,
    "enableExtendMeeting": true,
    "extendMeetingUrlAllowlist": ["/single-room/"]
  },
  "message": "Booking configuration updated"
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/booking-config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -d '{"enableBooking": true, "enableExtendMeeting": true, "extendMeetingUrlAllowlist": ["/single-room/"]}'
```

---

### Logo Configuration API

#### Get Logo Configuration

**Endpoint:** `GET /api/logo`

**Authentication:** Not required

**Response:**
```json
{
  "darkLogoUrl": "/img/uploads/logo-dark.png",
  "lightLogoUrl": "/img/uploads/logo-light.png"
}
```

**Example:**
```bash
curl http://localhost:8080/api/logo
```

#### Upload Logo

**Endpoint:** `POST /api/logo`

**Authentication:** Required

**Request:** Multipart form data with file upload

**Form Fields:**
- `logo`: Image file (PNG, JPG, JPEG, GIF, SVG)
- `type`: Either `"dark"` or `"light"`

**Response:**
```json
{
  "success": true,
  "filename": "logo-1234567890.png",
  "url": "/img/uploads/logo-1234567890.png",
  "type": "dark"
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/logo \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -F "logo=@/path/to/logo.png" \
  -F "type=dark"
```

---

### Rooms API

#### Get All Rooms

**Endpoint:** `GET /api/rooms`

**Authentication:** Not required

**Response:**
```json
[
  {
    "Name": "Conference Room A",
    "RoomAlias": "conf-a",
    "Busy": false,
    "Appointments": [
      {
        "Subject": "Team Meeting",
        "Organizer": "John Doe",
        "Start": 1707566400000,
        "End": 1707570000000,
        "Private": false
      }
    ]
  }
]
```

**Example:**
```bash
curl http://localhost:8080/api/rooms
```

---

### Configuration Locks API

#### Get Configuration Locks Status

**Endpoint:** `GET /api/config-locks`

**Authentication:** Not required

**Response:**
```json
{
  "wifiLocked": false,
  "logoLocked": false,
  "sidebarLocked": false,
  "bookingLocked": false
}
```

**Example:**
```bash
curl http://localhost:8080/api/config-locks
```

**Notes:**
- Locked configurations are controlled by environment variables
- When locked, admin panel sections are hidden and API updates are blocked
- Used to enforce configuration in production environments

---

### Complete Example Script

Here's a complete bash script to update all configurations:

```bash
#!/bin/bash

# Configuration
API_TOKEN="your_secure_token_here"
BASE_URL="http://localhost:8080"

# Update WiFi
echo "Updating WiFi configuration..."
curl -X POST "${BASE_URL}/api/wifi" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -d '{
    "ssid": "GUEST-NETWORK",
    "password": "SecurePass2030"
  }'

echo -e "\n\nUpdating sidebar configuration..."
curl -X POST "${BASE_URL}/api/sidebar" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -d '{
    "showWiFi": true,
    "showUpcomingMeetings": true,
    "showMeetingTitles": false
  }'

echo -e "\n\nUpdating booking configuration..."
curl -X POST "${BASE_URL}/api/booking-config" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -d '{"enableBooking": true}'

echo -e "\n\nConfiguration update complete!"
```

Save as `update-config.sh`, make executable with `chmod +x update-config.sh`, and run with `./update-config.sh`.

---

## Support

For configuration help:
- Check [INSTALLATION.md](INSTALLATION.md) for setup guide
- Check [README.md](README.md) for feature overview
- Open issue on [GitHub](https://github.com/TMA84/MeetEasier/issues)

