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
5. Create a client secret under Certificates & secrets

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

#### API Configuration

```env
# Use Microsoft Graph API instead of EWS
# Default: true
SEARCH_USE_GRAPHAPI=true
```

**Valid values:** `true`, `false`  
**Note:** EWS is deprecated and will be removed in future versions

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
```

**Performance considerations:**
- Higher values = more data = slower response times
- Microsoft Graph API supports pagination, so these limits are soft
- Recommended to keep defaults unless you have specific needs

---

#### Security Configuration

```env
# API token for admin panel authentication
# Required for updating settings via admin panel
# Generate with: openssl rand -hex 32
API_TOKEN=your-secure-random-token-here
```

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

**Valid values:** `true`, `false`

---

## Admin Panel Configuration

The admin panel provides a web interface for managing runtime configuration.

### Access

URL: `http://your-server:8080/admin`

### Authentication

Enter your `API_TOKEN` in the API Token field at the top of the page.

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
├── wifi-config.json      # WiFi settings
├── logo-config.json      # Logo URLs
├── sidebar-config.json   # Sidebar settings
└── booking-config.json   # Booking settings
```

**Format examples:**

**wifi-config.json:**
```json
{
  "ssid": "Guest WiFi",
  "password": "SecurePassword123",
  "lastUpdated": "2026-02-08T14:30:00.000Z"
}
```

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
  "lastUpdated": "2026-02-08T14:30:00.000Z"
}
```

**booking-config.json:**
```json
{
  "enableBooking": true,
  "lastUpdated": "2026-02-08T14:30:00.000Z"
}
```

---

### Real-time Updates

#### Socket.IO Events

MeetEasier uses Socket.IO for real-time updates:

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

**GET /api/config-locks**
- Returns: Which settings are locked via environment variables

**GET /api/heartbeat**
- Returns: Server health status

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
- Body: `{ "showWiFi": boolean, "showUpcomingMeetings": boolean, "showMeetingTitles": boolean }`
- Returns: Updated configuration

**POST /api/booking-config**
- Body: `{ "enableBooking": boolean }`
- Returns: Updated configuration
- Validates permission before enabling

**POST /api/rooms/:roomEmail/book**
- Body: `{ "subject": "string", "startTime": "ISO8601", "endTime": "ISO8601" }`
- Returns: Booking confirmation
- Checks for conflicts before booking

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
  "minimalHeaderStyle": false
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
  "minimalHeaderStyle": false
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
    "minimalHeaderStyle": false
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
  "enableBooking": true
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
  "enableBooking": true
}
```

**Response:**
```json
{
  "success": true,
  "config": {
    "enableBooking": true
  },
  "message": "Booking configuration updated"
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/booking-config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -d '{"enableBooking": true}'
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

