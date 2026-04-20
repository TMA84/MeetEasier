# Touchkio Home Assistant MQTT Format

Der Code wurde umgeschrieben, um mit dem echten Home Assistant MQTT Discovery Format zu arbeiten, das Touchkio verwendet.

## Wichtige Änderungen

### Device ID statt Hostname

Touchkio verwendet automatisch generierte Device IDs basierend auf der Hardware-Seriennummer:
- **Device ID Format:** `rpi_1A4187` (letzte 6 Zeichen der Seriennummer)
- **Hostname:** Wird separat über `homeassistant/sensor/rpi_1A4187/host_name/status` gesendet

### Topic-Format

**Status Topics (Touchkio → MeetEasier):**
```
homeassistant/sensor/rpi_1A4187/host_name/status          → "piosk"
homeassistant/light/rpi_1A4187/display/status             → "ON" oder "OFF"
homeassistant/light/rpi_1A4187/display/brightness/status  → "100" (0-100)
homeassistant/select/rpi_1A4187/kiosk/status              → "Fullscreen"
homeassistant/sensor/rpi_1A4187/processor_usage/status    → "6.5"
homeassistant/sensor/rpi_1A4187/memory_usage/status       → "29.4"
homeassistant/sensor/rpi_1A4187/processor_temperature/status → "59.4"
homeassistant/sensor/rpi_1A4187/up_time/status            → "1142.75"
```

**Command Topics (MeetEasier → Touchkio):**
```
homeassistant/light/rpi_1A4187/display/set                → "ON" oder "OFF"
homeassistant/light/rpi_1A4187/display/brightness/set     → "100" (0-100)
homeassistant/select/rpi_1A4187/kiosk/set                 → "Fullscreen", "Maximized", "Framed", "Minimized"
homeassistant/button/rpi_1A4187/refresh/execute           → "PRESS"
homeassistant/button/rpi_1A4187/reboot/execute            → "PRESS"
homeassistant/button/rpi_1A4187/shutdown/execute          → "PRESS"
```

## Unterstützte Features

### ✅ Funktioniert

- **Power Control:** ON/OFF über `homeassistant/light/{deviceId}/display/set`
- **Brightness:** 0-100 über `homeassistant/light/{deviceId}/display/brightness/set`
- **Kiosk Mode:** Fullscreen, Maximized, Framed, Minimized über `homeassistant/select/{deviceId}/kiosk/set`
- **Refresh:** Page refresh über `homeassistant/button/{deviceId}/refresh/execute`
- **Reboot:** Device reboot über `homeassistant/button/{deviceId}/reboot/execute`
- **Shutdown:** Device shutdown über `homeassistant/button/{deviceId}/shutdown/execute`
- **Monitoring:** CPU, Memory, Temperature, Uptime

### ✅ Vollständig unterstützt

Alle Touchkio Features werden jetzt unterstützt:
- **Theme:** Light/Dark mode über `touchkio/{deviceId}/theme/set`
- **Volume:** Audio volume (0-100) über `touchkio/{deviceId}/volume/set`
- **Page Zoom:** Browser zoom (25-400%) über `touchkio/{deviceId}/page_zoom/set`
- **Page URL:** Navigate to URL über `touchkio/{deviceId}/page_url/set`
- **Keyboard:** Virtual keyboard ON/OFF über `touchkio/{deviceId}/keyboard/set`

Zusätzlich werden Einstellungen (Brightness, Page URL, Page Zoom, Volume, Theme) pro Gerät in `data/touchkio-desired-config.json` persistiert und nach einem Geräte-Reconnect automatisch erneut angewendet.

## Hostname Mapping

Der Code mappt automatisch Device IDs zu Hostnames:

1. Touchkio sendet: `homeassistant/sensor/rpi_1A4187/host_name/status` → `"piosk"`
2. MeetEasier speichert: `deviceIdToHostname.set("rpi_1A4187", "piosk")`
3. Bei Commands: `sendPowerCommand("piosk", true)` → findet `rpi_1A4187` → sendet an `homeassistant/light/rpi_1A4187/display/set`

## Display States

Display States werden jetzt mit Device ID als Key gespeichert:

```javascript
displayStates.set("rpi_1A4187", {
  deviceId: "rpi_1A4187",
  hostname: "piosk",
  hasDesiredConfig: true,
  swVersion: "touchkio-v1.1.2",
  power: "ON",
  brightness: 100,
  kioskStatus: "Fullscreen",
  cpuUsage: 6.5,
  memoryUsage: 29.4,
  temperature: 59.4,
  uptime: 1142.75,
  lastUpdate: "2026-03-13T11:43:19.145Z"
});
```

## API Endpoints

Die API-Endpoints verwenden weiterhin Hostnames:

```javascript
// Frontend sendet:
POST /api/mqtt-power/:hostname
POST /api/mqtt-brightness/:hostname
POST /api/mqtt-kiosk/:hostname

// Backend konvertiert hostname → deviceId → MQTT topic
```

## Testing

### 1. Server neu starten

```bash
# Server stoppen
pkill -f "node server.js"

# Server starten
npm start
```

### 2. MQTT Topics überwachen

```bash
# Alle Home Assistant Topics
mosquitto_sub -h localhost -p 1883 -t "homeassistant/#" -v

# Nur Touchkio Device
mosquitto_sub -h localhost -p 1883 -t "homeassistant/+/rpi_1A4187/#" -v
```

### 3. Admin Panel testen

1. Öffne: http://localhost:8080/admin
2. Gehe zu: Devices Tab
3. Finde dein Touchkio Display (sollte als "piosk" erscheinen)
4. Klicke "Details"
5. Teste Commands:
   - Turn On/Off
   - Brightness Slider
   - Kiosk Mode Buttons
   - Refresh Button

### 4. Erwartete MQTT Messages

**Beim Klick auf "Turn Off":**
```
homeassistant/light/rpi_1A4187/display/set → "OFF"
```

**Beim Klick auf "Turn On":**
```
homeassistant/light/rpi_1A4187/display/set → "ON"
```

**Beim Brightness Slider (z.B. 75):**
```
homeassistant/light/rpi_1A4187/display/brightness/set → "75"
```

**Beim Klick auf "Fullscreen":**
```
homeassistant/select/rpi_1A4187/kiosk/set → "Fullscreen"
```

## Troubleshooting

### Display erscheint nicht im Admin Panel

**Problem:** Hostname wird nicht gemappt

**Lösung:**
1. Prüfe ob Touchkio den Hostname sendet:
   ```bash
   mosquitto_sub -h localhost -p 1883 -t "homeassistant/sensor/+/host_name/status" -v
   ```
2. Server Log prüfen:
   ```bash
   tail -f server.log | grep "Hostname mapped"
   ```
3. Sollte zeigen: `[Touchkio] Hostname mapped: rpi_1A4187 -> piosk`

### Commands funktionieren nicht

**Problem:** Device ID nicht gefunden

**Lösung:**
1. Prüfe Hostname Mapping:
   ```bash
   # Im Server Log
   grep "Cannot send.*command" server.log
   ```
2. Stelle sicher, dass Touchkio den Hostname gesendet hat
3. Warte 30 Sekunden nach Server-Start für Hostname-Mapping

### Falsche Topics

**Problem:** Topics zeigen noch `touchkio/rpi_*` statt `homeassistant/*`

**Lösung:**
- Server neu starten
- Alte MQTT Messages löschen (retained messages):
  ```bash
  mosquitto_pub -h localhost -p 1883 -t "touchkio/rpi_1A4187/kiosk/set" -n -r
  ```

## Migration von altem Format

Falls du alte Test-Scripts hast, die das alte Format verwenden:

**Alt (funktioniert nicht mehr):**
```bash
mosquitto_pub -h localhost -p 1883 -t "touchkio/rpi_saturn/kiosk/set" -m "Fullscreen"
```

**Neu (Home Assistant Format):**
```bash
mosquitto_pub -h localhost -p 1883 -t "homeassistant/select/rpi_1A4187/kiosk/set" -m "Fullscreen"
```

## Nächste Schritte

Alle geplanten Features (Theme, Volume, Page URL, Page Zoom, Keyboard) sind jetzt implementiert. Mögliche Erweiterungen:
1. **Device Information im Admin Panel anzeigen** (Modell, Seriennummer, SW-Version)
2. **Update Management:** App-Updates über MQTT auslösen
3. **Page Number Support:** Seitennavigation für Multi-Page Setups

## Device Information

Touchkio sendet auch Device-Informationen:

```json
{
  "name": "TouchKio Piosk",
  "model": "Raspberry Pi 4 Model B Rev 1.5",
  "manufacturer": "Raspberry Pi Ltd",
  "serial_number": "10000000c61a4187",
  "identifiers": ["rpi_1A4187"],
  "sw_version": "touchkio-v1.1.2"
}
```

The `sw_version` field is automatically extracted from any Home Assistant MQTT discovery config message and stored as `swVersion` in the display state for each device. This happens during initial device discovery and whenever a config message is received.
