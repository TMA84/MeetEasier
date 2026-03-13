# Touchkio Complete MQTT Topics

Basierend auf dem Touchkio Source Code (`touchkio/js/integration.js`)

## Vollständige Topic-Liste

### Display Control (Light Entity)
```
homeassistant/light/{deviceId}/display/config
homeassistant/light/{deviceId}/display/power/set          → Command: "ON" oder "OFF"
homeassistant/light/{deviceId}/display/power/state        → Status: "ON" oder "OFF"
homeassistant/light/{deviceId}/display/brightness/set     → Command: 0-100
homeassistant/light/{deviceId}/display/brightness/state   → Status: 0-100
```

### Kiosk Mode (Select Entity)
```
homeassistant/select/{deviceId}/kiosk/config
homeassistant/select/{deviceId}/kiosk/set                 → Command: "Framed", "Fullscreen", "Maximized", "Minimized", "Terminated"
homeassistant/select/{deviceId}/kiosk/state               → Status: current mode
```

### Theme (Select Entity) ✅ VERFÜGBAR!
```
homeassistant/select/{deviceId}/theme/config
homeassistant/select/{deviceId}/theme/set                 → Command: "Light", "Dark"
homeassistant/select/{deviceId}/theme/state               → Status: current theme
```

### Volume (Number Entity) ✅ VERFÜGBAR!
```
homeassistant/number/{deviceId}/volume/config
homeassistant/number/{deviceId}/volume/set                → Command: 0-100
homeassistant/number/{deviceId}/volume/state              → Status: 0-100
```

### Keyboard (Switch Entity) ✅ VERFÜGBAR!
```
homeassistant/switch/{deviceId}/keyboard/config
homeassistant/switch/{deviceId}/keyboard/set              → Command: "ON", "OFF"
homeassistant/switch/{deviceId}/keyboard/state            → Status: "ON", "OFF"
```

### Page Number (Number Entity) ✅ VERFÜGBAR!
```
homeassistant/number/{deviceId}/page_number/config
homeassistant/number/{deviceId}/page_number/set           → Command: page number (int)
homeassistant/number/{deviceId}/page_number/state         → Status: current page
```

### Page Zoom (Number Entity) ✅ VERFÜGBAR!
```
homeassistant/number/{deviceId}/page_zoom/config
homeassistant/number/{deviceId}/page_zoom/set             → Command: 25-400 (zoom percentage)
homeassistant/number/{deviceId}/page_zoom/state           → Status: current zoom
```

### Page URL (Text Entity) ✅ VERFÜGBAR!
```
homeassistant/text/{deviceId}/page_url/config
homeassistant/text/{deviceId}/page_url/set                → Command: URL string (https://...)
homeassistant/text/{deviceId}/page_url/state              → Status: current URL
```

### Buttons
```
homeassistant/button/{deviceId}/refresh/config
homeassistant/button/{deviceId}/refresh/execute           → Command: "PRESS"

homeassistant/button/{deviceId}/reboot/config
homeassistant/button/{deviceId}/reboot/execute            → Command: "PRESS"

homeassistant/button/{deviceId}/shutdown/config
homeassistant/button/{deviceId}/shutdown/execute          → Command: "PRESS"
```

### Update (Update Entity)
```
homeassistant/update/{deviceId}/app/config
homeassistant/update/{deviceId}/app/install               → Command: "update" or "update early"
homeassistant/update/{deviceId}/app/version/state         → Status: version string
```

### Sensors (Read-Only)
```
homeassistant/sensor/{deviceId}/host_name/config
homeassistant/sensor/{deviceId}/host_name/state           → Hostname (e.g., "piosk")

homeassistant/sensor/{deviceId}/model/config
homeassistant/sensor/{deviceId}/model/state               → Model (e.g., "Raspberry Pi 4 Model B Rev 1.5")
homeassistant/sensor/{deviceId}/model/attributes          → JSON with model details

homeassistant/sensor/{deviceId}/serial_number/config
homeassistant/sensor/{deviceId}/serial_number/state       → Serial number

homeassistant/sensor/{deviceId}/memory_size/config
homeassistant/sensor/{deviceId}/memory_size/state         → Memory size in GiB

homeassistant/sensor/{deviceId}/processor_usage/config
homeassistant/sensor/{deviceId}/processor_usage/state     → CPU usage %

homeassistant/sensor/{deviceId}/memory_usage/config
homeassistant/sensor/{deviceId}/memory_usage/state        → Memory usage %

homeassistant/sensor/{deviceId}/processor_temperature/config
homeassistant/sensor/{deviceId}/processor_temperature/state → Temperature °C

homeassistant/sensor/{deviceId}/up_time/config
homeassistant/sensor/{deviceId}/up_time/state             → Uptime in minutes

homeassistant/sensor/{deviceId}/heartbeat/config
homeassistant/sensor/{deviceId}/heartbeat/state           → Heartbeat timestamp

homeassistant/sensor/{deviceId}/last_active/config
homeassistant/sensor/{deviceId}/last_active/state         → Last activity in minutes

homeassistant/sensor/{deviceId}/package_upgrades/config
homeassistant/sensor/{deviceId}/package_upgrades/state    → Number of available updates
homeassistant/sensor/{deviceId}/package_upgrades/attributes → JSON with package list
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
