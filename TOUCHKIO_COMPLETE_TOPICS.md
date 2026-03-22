# Touchkio Complete MQTT Topics

Basierend auf dem Touchkio Source Code (`touchkio/js/integration.js`) und echten MQTT Logs

## Wichtig: Status vs State

Touchkio verwendet **zwei verschiedene Topic-Formate**:
- **Status Topics:** `/status` (was das Display sendet)
- **State Topics:** `/state` (was in der Config definiert ist)
- **Command Topics:** `/set` (was das Display empfängt)

In der Praxis sendet Touchkio auf `/status` Topics!

## Vollständige Topic-Liste

### Display Control (Light Entity)
```
# Config
homeassistant/light/{deviceId}/display/config

# Status (Display → Server)
homeassistant/light/{deviceId}/display/status                    → "ON" oder "OFF"
homeassistant/light/{deviceId}/display/brightness/status         → 0-100

# Commands (Server → Display)
homeassistant/light/{deviceId}/display/power/set                 → "ON" oder "OFF"
homeassistant/light/{deviceId}/display/brightness/set            → 0-100
```

### Kiosk Mode (Select Entity)
```
# Config
homeassistant/select/{deviceId}/kiosk/config

# Status (Display → Server)
homeassistant/select/{deviceId}/kiosk/status                     → "Framed", "Fullscreen", "Maximized", "Minimized", "Terminated"

# Commands (Server → Display)
homeassistant/select/{deviceId}/kiosk/set                        → "Framed", "Fullscreen", "Maximized", "Minimized"
```

### Theme (Select Entity) ✅ VERFÜGBAR!
```
# Config
homeassistant/select/{deviceId}/theme/config

# Status (Display → Server)
homeassistant/select/{deviceId}/theme/status                     → "Light", "Dark"

# Commands (Server → Display)
homeassistant/select/{deviceId}/theme/set                        → "Light", "Dark"
```

### Volume (Number Entity) ✅ VERFÜGBAR!
```
# Config
homeassistant/number/{deviceId}/volume/config

# Status (Display → Server)
homeassistant/number/{deviceId}/volume/status                    → 0-100

# Commands (Server → Display)
homeassistant/number/{deviceId}/volume/set                       → 0-100
```

### Keyboard (Switch Entity) ✅ VERFÜGBAR!
```
# Config
homeassistant/switch/{deviceId}/keyboard/config

# Status (Display → Server)
homeassistant/switch/{deviceId}/keyboard/status                  → "ON", "OFF"

# Commands (Server → Display)
homeassistant/switch/{deviceId}/keyboard/set                     → "ON", "OFF"
```

### Page Number (Number Entity) ✅ VERFÜGBAR!
```
# Config
homeassistant/number/{deviceId}/page_number/config

# Status (Display → Server)
homeassistant/number/{deviceId}/page_number/status              → page number (int)

# Commands (Server → Display)
homeassistant/number/{deviceId}/page_number/set                 → page number (int)
```

### Page Zoom (Number Entity) ✅ VERFÜGBAR!
```
# Config
homeassistant/number/{deviceId}/page_zoom/config

# Status (Display → Server)
homeassistant/number/{deviceId}/page_zoom/status                → 25-400 (zoom percentage)

# Commands (Server → Display)
homeassistant/number/{deviceId}/page_zoom/set                   → 25-400 (zoom percentage)
```

### Page URL (Text Entity) ✅ VERFÜGBAR!
```
# Config
homeassistant/text/{deviceId}/page_url/config

# Status (Display → Server)
homeassistant/text/{deviceId}/page_url/status                   → URL string

# Commands (Server → Display)
homeassistant/text/{deviceId}/page_url/set                      → URL string (https://...)
```

### Buttons
```
# Refresh
homeassistant/button/{deviceId}/refresh/config
homeassistant/button/{deviceId}/refresh/execute                 → "PRESS"

# Reboot
homeassistant/button/{deviceId}/reboot/config
homeassistant/button/{deviceId}/reboot/execute                  → "PRESS"

# Shutdown
homeassistant/button/{deviceId}/shutdown/config
homeassistant/button/{deviceId}/shutdown/execute                → "PRESS"
```

### Update (Update Entity)
```
homeassistant/update/{deviceId}/app/config
homeassistant/update/{deviceId}/app/install                     → "update" or "update early"
homeassistant/update/{deviceId}/app/version/status              → version string
```

### Screenshot Image (Image Entity, v1.4.1+) ✅ VERFÜGBAR!
```
# Config
homeassistant/image/{deviceId}/screenshot_image/config

# Status (Display → Server) — raw JPEG binary data
touchkio/{deviceId}/screenshot/state                            → JPEG image bytes
```

Note: Screenshot is updated on page navigation and approximately every minute.
MeetEasier receives the raw JPEG via MQTT binary subscription and serves it via `/api/mqtt-screenshot/{deviceId}`.

### Sensors (Read-Only)
```
# Hostname
homeassistant/sensor/{deviceId}/host_name/config
homeassistant/sensor/{deviceId}/host_name/status                → Hostname (e.g., "piosk")

# Model
homeassistant/sensor/{deviceId}/model/config
homeassistant/sensor/{deviceId}/model/status                    → Model (e.g., "Raspberry Pi 4 Model B Rev 1.5")
homeassistant/sensor/{deviceId}/model/attributes                → JSON with model details

# Serial Number
homeassistant/sensor/{deviceId}/serial_number/config
homeassistant/sensor/{deviceId}/serial_number/status            → Serial number

# Memory Size
homeassistant/sensor/{deviceId}/memory_size/config
homeassistant/sensor/{deviceId}/memory_size/status              → Memory size in GiB

# CPU Usage
homeassistant/sensor/{deviceId}/processor_usage/config
homeassistant/sensor/{deviceId}/processor_usage/status          → CPU usage %

# Memory Usage
homeassistant/sensor/{deviceId}/memory_usage/config
homeassistant/sensor/{deviceId}/memory_usage/status             → Memory usage %

# Temperature
homeassistant/sensor/{deviceId}/processor_temperature/config
homeassistant/sensor/{deviceId}/processor_temperature/status    → Temperature °C

# Uptime
homeassistant/sensor/{deviceId}/up_time/config
homeassistant/sensor/{deviceId}/up_time/status                  → Uptime in minutes

# Heartbeat
homeassistant/sensor/{deviceId}/heartbeat/config
homeassistant/sensor/{deviceId}/heartbeat/status                → Heartbeat timestamp

# Last Active
homeassistant/sensor/{deviceId}/last_active/config
homeassistant/sensor/{deviceId}/last_active/status              → Last activity in minutes

# Package Upgrades
homeassistant/sensor/{deviceId}/package_upgrades/config
homeassistant/sensor/{deviceId}/package_upgrades/status         → Number of available updates
homeassistant/sensor/{deviceId}/package_upgrades/attributes     → JSON with package list
```

## Wichtige Erkenntnisse

### ✅ ALLE Features sind verfügbar!

Die folgenden Features, die wir als "nicht verfügbar" markiert hatten, sind tatsächlich verfügbar:

1. **Theme:** `homeassistant/select/{deviceId}/theme/set` → "Light", "Dark"
2. **Volume:** `homeassistant/number/{deviceId}/volume/set` → 0-100
3. **Keyboard:** `homeassistant/switch/{deviceId}/keyboard/set` → "ON", "OFF"
4. **Page Zoom:** `homeassistant/number/{deviceId}/page_zoom/set` → 25-400
5. **Page URL:** `homeassistant/text/{deviceId}/page_url/set` → URL string

### Topic-Format Unterschiede

**Unser alter Code erwartete:**
```
touchkio/rpi_{hostname}/theme/set
touchkio/rpi_{hostname}/volume/set
touchkio/rpi_{hostname}/page_zoom/set
touchkio/rpi_{hostname}/page_url/set
```

**Echtes Touchkio Format:**
```
homeassistant/select/{deviceId}/theme/set
homeassistant/number/{deviceId}/volume/set
homeassistant/number/{deviceId}/page_zoom/set
homeassistant/text/{deviceId}/page_url/set
```

### Entity Types

- **light:** Display power & brightness
- **select:** Kiosk mode, Theme (dropdown selection)
- **number:** Volume, Page Number, Page Zoom (numeric input)
- **text:** Page URL (text input)
- **switch:** Keyboard visibility (on/off toggle)
- **button:** Refresh, Reboot, Shutdown (press action)
- **sensor:** Read-only status information
- **update:** App update management

## Nächste Schritte

1. **touchkio.js erweitern** um alle fehlenden Features zu unterstützen:
   - Theme (select entity)
   - Volume (number entity)
   - Keyboard (switch entity)
   - Page Zoom (number entity)
   - Page URL (text entity)

2. **Subscribe auf zusätzliche Status Topics:**
   - `homeassistant/select/{deviceId}/theme/state`
   - `homeassistant/number/{deviceId}/volume/state`
   - `homeassistant/switch/{deviceId}/keyboard/state`
   - `homeassistant/number/{deviceId}/page_zoom/state`
   - `homeassistant/text/{deviceId}/page_url/state`

3. **Command Topics implementieren:**
   - `homeassistant/select/{deviceId}/theme/set`
   - `homeassistant/number/{deviceId}/volume/set`
   - `homeassistant/switch/{deviceId}/keyboard/set`
   - `homeassistant/number/{deviceId}/page_zoom/set`
   - `homeassistant/text/{deviceId}/page_url/set`

## Testing Commands

### Theme
```bash
mosquitto_pub -h localhost -p 1883 -t "homeassistant/select/rpi_1A4187/theme/set" -m "Dark"
mosquitto_pub -h localhost -p 1883 -t "homeassistant/select/rpi_1A4187/theme/set" -m "Light"
```

### Volume
```bash
mosquitto_pub -h localhost -p 1883 -t "homeassistant/number/rpi_1A4187/volume/set" -m "75"
```

### Keyboard
```bash
mosquitto_pub -h localhost -p 1883 -t "homeassistant/switch/rpi_1A4187/keyboard/set" -m "ON"
mosquitto_pub -h localhost -p 1883 -t "homeassistant/switch/rpi_1A4187/keyboard/set" -m "OFF"
```

### Page Zoom
```bash
mosquitto_pub -h localhost -p 1883 -t "homeassistant/number/rpi_1A4187/page_zoom/set" -m "125"
```

### Page URL
```bash
mosquitto_pub -h localhost -p 1883 -t "homeassistant/text/rpi_1A4187/page_url/set" -m "https://meeteasier.vsti.cloud/single-room/saturn"
```
