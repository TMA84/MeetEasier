# MeetEasier Installation & Configuration Guide

Complete guide for installing and configuring MeetEasier.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Azure AD App Registration](#azure-ad-app-registration)
3. [Installation Methods](#installation-methods)
4. [Configuration](#configuration)
5. [Admin Panel](#admin-panel)
6. [Display URLs](#display-urls)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required
- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Microsoft 365** tenant with room mailboxes
- **Azure AD** application registration

### Optional
- **Docker** (for containerized deployment)
- **Reverse Proxy** (nginx, Apache) for production

---

## Azure AD App Registration

### Step 1: Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: MeetEasier
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Leave empty (not needed for daemon app)
5. Click **Register**

### Step 2: Note Application Details

After registration, note these values:
- **Application (client) ID** - You'll need this for `OAUTH_CLIENT_ID`
- **Directory (tenant) ID** - You'll need this for `OAUTH_AUTHORITY`

### Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: "MeetEasier Secret"
4. Choose expiration period
5. Click **Add**
6. **Copy the secret value immediately** - You'll need this for `OAUTH_CLIENT_SECRET`

### Step 4: Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Application permissions**
5. Add these permissions:
   - `Calendars.Read` - Required to read room calendars
   - `Calendars.ReadWrite` - Required for room booking feature (optional)
   - `Place.Read.All` - Required to list room mailboxes
   - `User.Read.All` - Required to read user information for organizers
6. Click **Add permissions**
7. Click **Grant admin consent** (requires admin privileges)

### Step 5: Verify Permissions

Ensure all permissions show "Granted for [Your Organization]" with a green checkmark.

---

## Installation Methods

### Method 1: Standard Installation

#### 1. Clone Repository

```bash
git clone https://github.com/TMA84/MeetEasier.git
cd MeetEasier
```

#### 2. Install Dependencies

```bash
npm install
```

This will automatically install both server and React UI dependencies.

#### 3. Build React UI

```bash
npm run build
```

#### 4. Configure Environment

Create `.env` file in the root directory:

```bash
cp .env.template .env
```

Edit `.env` with your configuration (see [Configuration](#configuration) section).

#### 5. Start Server

```bash
npm start
```

The server will start on port 8080 by default (or the port specified in your `.env` file).

#### 6. Access Application

Open your browser and navigate to:
- Flightboard: `http://localhost:8080`
- Admin Panel: `http://localhost:8080/admin`

---

### Method 2: Docker Installation

#### 1. Create .env File

Create `.env` file with your configuration (see [Configuration](#configuration) section).

#### 2. Build Docker Image

```bash
docker build -t meeteasier .
```

#### 3. Run Container

```bash
docker run -d \
  --name meeteasier \
  -p 8080:8080 \
  --env-file .env \
  -v $(pwd)/data:/opt/meeteasier/data \
  -v $(pwd)/static/img/uploads:/opt/meeteasier/static/img/uploads \
  meeteasier
```

#### 4. Access Application

Navigate to `http://localhost:8080`

---

### Method 3: Docker Compose

#### 1. Create docker-compose.yml

```yaml
version: '3.8'

services:
  meeteasier:
    build: .
    container_name: meeteasier
    ports:
      - "8080:8080"
    environment:
      - OAUTH_CLIENT_ID=${OAUTH_CLIENT_ID}
      - OAUTH_AUTHORITY=${OAUTH_AUTHORITY}
      - OAUTH_CLIENT_SECRET=${OAUTH_CLIENT_SECRET}
      - API_TOKEN=${API_TOKEN}
      - PORT=8080
    volumes:
      - ./data:/opt/meeteasier/data
      - ./static/img/uploads:/opt/meeteasier/static/img/uploads
    restart: unless-stopped
```

#### 2. Start Services

```bash
docker-compose up -d
```

---

## Configuration

### Required Environment Variables

Create a `.env` file in the root directory with these required variables:

```env
# Microsoft Graph API Configuration (Required)
OAUTH_CLIENT_ID=your-application-client-id
OAUTH_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
OAUTH_CLIENT_SECRET=your-client-secret

# Use Microsoft Graph API
SEARCH_USE_GRAPHAPI=true
```

### Optional Environment Variables

#### Server Configuration

```env
# Server Port (default: 8080)
PORT=8080
```

#### Search Configuration

```env
# Maximum days to search ahead (default: 7)
SEARCH_MAXDAYS=7

# Maximum number of room lists to retrieve (default: 5)
SEARCH_MAXROOMLISTS=5

# Maximum number of rooms per list (default: 50)
SEARCH_MAXROOMS=50

# Maximum appointments per room (default: 100)
SEARCH_MAXITEMS=100
```

#### Admin Panel Security

```env
# API Token for admin panel authentication
# Generate with: openssl rand -hex 32
API_TOKEN=your-secure-random-token-here
```

**Important:** Always set a strong `API_TOKEN` to protect your admin panel!

#### WiFi Configuration

```env
# WiFi SSID (optional - can be configured via admin panel)
WIFI_SSID=Guest WiFi

# WiFi Password (optional - can be configured via admin panel)
WIFI_PASSWORD=YourPassword123
```

**Note:** If `WIFI_SSID` is set via environment variable, WiFi configuration will be locked in the admin panel.

#### Logo Configuration

```env
# Logo URLs (optional - can be configured via admin panel)
LOGO_DARK_URL=/img/logo-dark.svg
LOGO_LIGHT_URL=/img/logo-light.svg
```

**Note:** If logo URLs are set via environment variables, logo configuration will be locked in the admin panel.

#### Sidebar Configuration

```env
# Show WiFi information in sidebar (default: true)
SIDEBAR_SHOW_WIFI=true

# Show upcoming meetings in sidebar (default: false)
SIDEBAR_SHOW_UPCOMING=false

# Show meeting titles (default: false)
SIDEBAR_SHOW_TITLES=false
```

**Note:** If any sidebar variable is set, sidebar configuration will be locked in the admin panel.

#### Booking Configuration

```env
# Enable room booking feature (default: true)
ENABLE_BOOKING=true
```

**Note:** 
- Requires `Calendars.ReadWrite` permission in Azure AD
- If set via environment variable, booking configuration will be locked in the admin panel
- Automatically disabled if permission is missing

---

## Admin Panel

### Accessing Admin Panel

Navigate to: `http://your-server:8080/admin`

### Authentication

Enter your `API_TOKEN` (from `.env` file) in the API Token field at the top of the admin panel.

### Available Settings

#### 1. WiFi Configuration

Configure WiFi network details that will be displayed on room displays:

- **SSID**: WiFi network name
- **Password**: WiFi password (optional)
- **QR Code**: Automatically generated for easy mobile connection

**Features:**
- Real-time QR code generation
- Instant updates across all displays via Socket.IO
- Preview of current configuration

#### 2. Logo Configuration

Manage logos displayed across the application:

- **Dark Logo**: Used on light backgrounds (single-room, flightboard)
- **Light Logo**: Used on dark backgrounds (room-minimal, admin panel)

**Upload Methods:**
- **URL**: Enter a relative or absolute path to logo file
- **File Upload**: Upload logo files directly (JPG, PNG, GIF, SVG, WebP, max 5MB)

**Features:**
- Live preview of both logos
- Automatic file management
- Real-time updates via Socket.IO

#### 3. Sidebar Configuration

Control what information is displayed in room display sidebars:

**Display Options (Radio buttons - choose one):**
- **Show WiFi Information**: Display WiFi SSID, password, and QR code
- **Show Upcoming Meetings**: Display next 3 upcoming meetings

**Additional Options (Checkbox):**
- **Show Meeting Titles**: Display meeting subjects in status panel and upcoming meetings list

**Features:**
- Real-time updates across all displays
- Flexible content management
- Privacy control for meeting information

#### 4. Booking Configuration

Enable or disable the room booking feature:

- **Enable Booking Feature**: Toggle room booking on/off

**Features:**
- Automatic permission detection
- Disabled automatically if `Calendars.ReadWrite` permission is missing
- Real-time updates across all displays
- Warning message if permission is missing

### Configuration Locks

Settings configured via environment variables are **locked** in the admin panel and cannot be changed through the UI. This is indicated by a message: "These settings are configured via environment variables and cannot be changed here."

**Locked when environment variables are set:**
- WiFi: Locked if `WIFI_SSID` is set
- Logo: Locked if `LOGO_DARK_URL` or `LOGO_LIGHT_URL` is set
- Sidebar: Locked if any `SIDEBAR_*` variable is set
- Booking: Locked if `ENABLE_BOOKING` is set

---

## Display URLs

### Flightboard View

Overview of all meeting rooms:

```
http://your-server:8080/
```

**Features:**
- Shows all rooms from all room lists
- Color-coded status (green=available, red=busy, orange=upcoming)
- Current and next meeting information
- Real-time updates
- URL-based filtering by room list

**URL Parameters:**
- Filter by room list: `http://your-server:8080/?roomlist=Building%201`

---

### Single Room Display

Detailed view for individual rooms:

```
http://your-server:8080/room/:roomAlias
```

**Example:**
```
http://your-server:8080/room/conference-room-a
```

**Features:**
- Large status display with gradient background
- Current meeting information
- Next meeting preview (when room is busy)
- Sidebar with clock, logo, WiFi/upcoming meetings
- Room booking button (when available and enabled)
- Real-time updates

**How to find room alias:**
1. Go to flightboard view
2. Look at the URL when clicking on a room
3. The alias is the last part of the URL

---

### Room Minimal Display

Compact view for smaller screens or door-mounted tablets:

```
http://your-server:8080/room-minimal/:roomAlias
```

**Example:**
```
http://your-server:8080/room-minimal/conference-room-a
```

**Features:**
- Compact design optimized for small screens
- Status glow effect around the display
- Current meeting information
- Sidebar with WiFi/upcoming meetings
- Room booking button (when available and enabled)
- Dark theme support
- Real-time updates

**Perfect for:**
- Door-mounted tablets
- Small displays (7-10 inches)
- Raspberry Pi with small screen

---

### WiFi Information Display

Dedicated WiFi information page:

```
http://your-server:8080/wifi-info
```

**Features:**
- Large QR code for easy scanning
- WiFi SSID and password display
- Clean, focused design
- Real-time updates when WiFi config changes

**Use cases:**
- Display in common areas
- Guest information screens
- Reception areas

---

## Troubleshooting

### Server Won't Start

**Error: "EADDRINUSE: address already in use"**

Solution: Port is already in use. Either:
1. Stop the process using the port
2. Change `PORT` in `.env` file

**Error: "Cannot find module"**

Solution: Install dependencies:
```bash
npm install
cd ui-react && npm install
```

---

### No Rooms Displayed

**Possible causes:**

1. **Invalid OAuth credentials**
   - Verify `OAUTH_CLIENT_ID`, `OAUTH_AUTHORITY`, `OAUTH_CLIENT_SECRET` in `.env`
   - Check Azure AD app registration

2. **Missing API permissions**
   - Ensure `Calendars.Read` and `Place.Read.All` are granted
   - Admin consent must be granted

3. **No room mailboxes**
   - Verify room mailboxes exist in Microsoft 365
   - Check room mailboxes are configured as "Room" type

---

### Booking Feature Not Working

**Possible causes:**

1. **Missing permission**
   - Ensure `Calendars.ReadWrite` permission is granted in Azure AD
   - Admin consent must be granted
   - Check admin panel for permission warning

2. **Booking disabled**
   - Check `ENABLE_BOOKING` in `.env` (should be `true` or not set)
   - Check admin panel booking configuration

3. **Room not available**
   - Booking button only appears when room is available
   - Check for conflicting meetings

---

### Admin Panel Not Accessible

**Possible causes:**

1. **Wrong port**
   - Default port is 8080, not 3000
   - Check `PORT` in `.env` file
   - Access: `http://localhost:8080/admin`

2. **React app not built**
   - Run: `npm run build`

3. **Server not running**
   - Start server: `npm start`

---

### Admin Panel Changes Not Saving

**Error: "Unauthorized: Invalid or missing API token"**

Solution:
1. Set `API_TOKEN` in `.env` file
2. Restart server
3. Enter the same token in admin panel

**Settings are locked/grayed out**

Solution: Settings are configured via environment variables and cannot be changed through admin panel. To enable admin panel control:
1. Remove the corresponding environment variable from `.env`
2. Restart server
3. Configure via admin panel

---

### WiFi QR Code Not Updating

Solution:
1. Check browser cache - hard refresh (Ctrl+F5 or Cmd+Shift+R)
2. Verify `API_TOKEN` is correct
3. Check server logs for errors
4. Ensure Socket.IO connection is working

---

### Real-time Updates Not Working

**Possible causes:**

1. **Socket.IO connection failed**
   - Check browser console for errors
   - Verify firewall allows WebSocket connections

2. **Server restart required**
   - Some configuration changes require server restart
   - Restart: Stop server (Ctrl+C) and run `npm start`

---

## Security Best Practices

### 1. API Token

Always set a strong `API_TOKEN`:

```bash
# Generate secure token
openssl rand -hex 32

# Add to .env
API_TOKEN=your-generated-token-here
```

### 2. Network Security

- Use HTTPS in production (configure reverse proxy)
- Restrict admin panel access via firewall/network rules
- Use VPN for remote access

### 3. Azure AD Security

- Use least-privilege permissions
- Regularly rotate client secrets
- Monitor Azure AD sign-in logs
- Enable conditional access policies

### 4. Docker Security

- Don't expose unnecessary ports
- Use volume mounts for persistent data
- Keep Docker images updated
- Run container as non-root user (already configured)

---

## Production Deployment

### Reverse Proxy Configuration

#### Nginx Example

```nginx
server {
    listen 80;
    server_name meeteasier.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Apache Example

```apache
<VirtualHost *:80>
    ServerName meeteasier.yourdomain.com
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:8080/
    ProxyPassReverse / http://localhost:8080/
    
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:8080/$1" [P,L]
</VirtualHost>
```

### SSL/TLS Configuration

Use Let's Encrypt for free SSL certificates:

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d meeteasier.yourdomain.com
```

### Process Management

Use PM2 to keep the application running:

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name meeteasier

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

---

## Support

For issues, questions, or contributions:

- **GitHub Issues**: https://github.com/TMA84/MeetEasier/issues
- **Documentation**: See README.md and CONTRIBUTING.md
- **Security Issues**: See SECURITY.md

---

## License

MeetEasier is licensed under the [GNU General Public License (GPL 3.0)](LICENSE).
