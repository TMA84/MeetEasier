# Touchkio MQTT Testing Guide

Diese Test-Scripts helfen dir, die Touchkio MQTT Integration zu testen.

## Voraussetzungen

- MeetEasier Server läuft auf Port 8080
- Mosquitto MQTT Broker läuft auf localhost:1883
- `mosquitto_pub` und `mosquitto_sub` sind installiert

## Test-Scripts

### 1. `test-touchkio-quick.sh` - Schnelltest ⚡

**Verwendung:**
```bash
./test-touchkio-quick.sh
```

**Was es macht:**
- Sendet die wichtigsten Status-Updates für Display "saturn"
- Dauert nur 1-2 Sekunden
- Perfekt für schnelle Tests

**Beispiel Output:**
```
🚀 Schneller Touchkio Test für Display: saturn

📺 Display: ON, Brightness: 200
🖥️  Kiosk: Fullscreen
🎨 Theme: Dark
🔊 Volume: 75%
💻 CPU: 45%, Memory: 62%, Temp: 58°C

✅ Status-Updates gesendet!
```

---

### 2. `test-touchkio.sh` - Vollständiger Test 📋

**Verwendung:**
```bash
./test-touchkio.sh
```

**Was es macht:**
- Sendet ALLE Touchkio Status-Updates
- Zeigt Server Logs
- Wartet 30 Sekunden auf Befehle vom Admin Panel
- Zeigt empfangene Befehle an

**Schritte:**
1. Display Status (Power, Brightness)
2. Kiosk Status (Fullscreen, Maximized, etc.)
3. Theme (Light/Dark)
4. Audio & Keyboard
5. Page Info (Zoom, URL)
6. System Sensoren (CPU, Memory, Temp, Network, Uptime)
7. Server Log prüfen
8. Display States abrufen
9. Befehle empfangen (30 Sekunden)

---

### 3. `test-touchkio-commands.sh` - Befehle empfangen 👂

**Verwendung:**
```bash
./test-touchkio-commands.sh
```

**Was es macht:**
- Startet einen MQTT Listener
- Zeigt alle Befehle an, die MeetEasier sendet
- Läuft bis du Ctrl+C drückst

**Verwendung:**
1. Starte das Script in einem Terminal
2. Öffne Admin Panel: http://localhost:8080/admin
3. Gehe zu: Operations → MQTT
4. Klicke auf die Buttons (Turn On/Off, etc.)
5. Sieh die Befehle im Terminal

**Beispiel Output:**
```
🔔 19:30:15 | homeassistant/light/touchkio_saturn/display/set = {"state":"OFF"}
🔔 19:30:20 | touchkio/rpi_saturn/theme/set = Light
🔔 19:30:25 | touchkio/rpi_saturn/volume/set = 50
```

---

## Kompletter Test-Workflow

### Schritt 1: Server vorbereiten
```bash
# Server sollte bereits laufen
ps aux | grep "node server.js"

# Falls nicht, starte ihn:
node server.js > server.log 2>&1 &
```

### Schritt 2: Schnelltest durchführen
```bash
./test-touchkio-quick.sh
```

### Schritt 3: Admin Panel öffnen
1. Öffne Browser: http://localhost:8080/admin
2. Login mit deinem Admin Token
3. Gehe zu: **Operations → MQTT**
4. Klicke auf **"Aktualisieren"** Button

### Schritt 4: Display prüfen
Du solltest jetzt das Display "saturn" sehen mit:
- **Hostname:** saturn
- **State:** ON
- **Brightness:** 200
- **Last Update:** (aktueller Zeitstempel)

### Schritt 5: Befehle testen
1. Starte in einem zweiten Terminal:
   ```bash
   ./test-touchkio-commands.sh
   ```

2. Im Admin Panel, klicke auf:
   - **"Turn Off"** Button
   - **"Turn On"** Button

3. Im Terminal solltest du sehen:
   ```
   🔔 19:30:15 | homeassistant/light/touchkio_saturn/display/set = {"state":"OFF"}
   🔔 19:30:20 | homeassistant/light/touchkio_saturn/display/set = {"state":"ON","brightness":255}
   ```

---

## Erweiterte Tests

### Mehrere Displays simulieren
```bash
# Display "saturn"
mosquitto_pub -h localhost -p 1883 -t "homeassistant/light/touchkio_saturn/display/state" -m '{"state":"ON","brightness":200}'

# Display "jupiter"
mosquitto_pub -h localhost -p 1883 -t "homeassistant/light/touchkio_jupiter/display/state" -m '{"state":"ON","brightness":150}'

# Display "mars"
mosquitto_pub -h localhost -p 1883 -t "homeassistant/light/touchkio_mars/display/state" -m '{"state":"OFF","brightness":0}'
```

### Einzelne Befehle testen

**Power ON:**
```bash
mosquitto_pub -h localhost -p 1883 -t "homeassistant/light/touchkio_saturn/display/set" -m '{"state":"ON","brightness":255}'
```

**Power OFF:**
```bash
mosquitto_pub -h localhost -p 1883 -t "homeassistant/light/touchkio_saturn/display/set" -m '{"state":"OFF"}'
```

**Brightness ändern:**
```bash
mosquitto_pub -h localhost -p 1883 -t "homeassistant/light/touchkio_saturn/display/brightness/set" -m "150"
```

**Kiosk Mode ändern:**
```bash
mosquitto_pub -h localhost -p 1883 -t "touchkio/rpi_saturn/kiosk/set" -m "Maximized"
```

**Theme ändern:**
```bash
mosquitto_pub -h localhost -p 1883 -t "touchkio/rpi_saturn/theme/set" -m "Light"
```

**Volume ändern:**
```bash
mosquitto_pub -h localhost -p 1883 -t "touchkio/rpi_saturn/volume/set" -m "50"
```

**Page Zoom ändern:**
```bash
mosquitto_pub -h localhost -p 1883 -t "touchkio/rpi_saturn/page_zoom/set" -m "125"
```

**Refresh:**
```bash
mosquitto_pub -h localhost -p 1883 -t "touchkio/rpi_saturn/refresh/execute" -m "PRESS"
```

---

## Troubleshooting

### Problem: "Connection refused"
**Lösung:** Mosquitto läuft nicht
```bash
# Starte Mosquitto
brew services start mosquitto

# Oder manuell:
mosquitto -c /opt/homebrew/etc/mosquitto/mosquitto.conf
```

### Problem: "Keine Displays im Admin Panel"
**Lösung:** Status-Updates senden
```bash
./test-touchkio-quick.sh
```
Dann im Admin Panel auf "Aktualisieren" klicken.

### Problem: "Server empfängt keine MQTT Nachrichten"
**Lösung:** Server Log prüfen
```bash
tail -50 server.log | grep MQTT
```

Du solltest sehen:
```
[MQTT] Connected to broker
[MQTT] Subscribed to homeassistant/light/+/display/state
[MQTT-Bridge] Display power state updated: saturn = ON
```

### Problem: "Befehle werden nicht gesendet"
**Lösung:** 
1. Prüfe ob du im Admin Panel eingeloggt bist
2. Prüfe Server Log:
   ```bash
   tail -f server.log
   ```
3. Klicke auf einen Button im Admin Panel
4. Du solltest sehen:
   ```
   [MQTT] Published to homeassistant/light/touchkio_saturn/display/set: {"state":"OFF"}
   ```

---

## MQTT Topics Übersicht

### Status Topics (Touchkio → MeetEasier)

**Hinweis:** MeetEasier unterstützt sowohl `/state` als auch `/status` Topic-Suffixe für maximale Kompatibilität mit verschiedenen Touchkio Firmware-Versionen.

| Topic | Beschreibung | Beispiel |
|-------|--------------|----------|
| `homeassistant/light/touchkio_{hostname}/display/state` (oder `/status`) | Display Power & Brightness | `{"state":"ON","brightness":200}` |
| `touchkio/rpi_{hostname}/kiosk/state` (oder `/status`) | Kiosk Mode | `Fullscreen` |
| `touchkio/rpi_{hostname}/theme/state` (oder `/status`) | Theme | `Dark` |
| `touchkio/rpi_{hostname}/volume/state` (oder `/status`) | Volume | `75` |
| `touchkio/rpi_{hostname}/keyboard/state` (oder `/status`) | Keyboard Visibility | `OFF` |
| `touchkio/rpi_{hostname}/page_zoom/state` (oder `/status`) | Page Zoom | `100` |
| `touchkio/rpi_{hostname}/page_url/state` (oder `/status`) | Current URL | `http://...` |
| `touchkio/rpi_{hostname}/processor_usage/state` (oder `/status`) | CPU Usage % | `45.5` |
| `touchkio/rpi_{hostname}/memory_usage/state` (oder `/status`) | Memory Usage % | `62.3` |
| `touchkio/rpi_{hostname}/processor_temperature/state` (oder `/status`) | Temperature °C | `58` |
| `touchkio/rpi_{hostname}/network_address/state` (oder `/status`) | IP Address | `192.168.1.100` |
| `touchkio/rpi_{hostname}/up_time/state` (oder `/status`) | Uptime (minutes) | `1440` |

### Command Topics (MeetEasier → Touchkio)

| Topic | Beschreibung | Beispiel |
|-------|--------------|----------|
| `homeassistant/light/touchkio_{hostname}/display/set` | Power Control | `{"state":"ON","brightness":255}` |
| `homeassistant/light/touchkio_{hostname}/display/brightness/set` | Brightness | `150` |
| `touchkio/rpi_{hostname}/kiosk/set` | Kiosk Mode | `Fullscreen`, `Maximized`, `Minimized`, `Framed` |
| `touchkio/rpi_{hostname}/theme/set` | Theme | `Light`, `Dark` |
| `touchkio/rpi_{hostname}/volume/set` | Volume | `0-100` |
| `touchkio/rpi_{hostname}/keyboard/set` | Keyboard | `ON`, `OFF` |
| `touchkio/rpi_{hostname}/page_zoom/set` | Page Zoom | `25-400` |
| `touchkio/rpi_{hostname}/page_url/set` | Navigate to URL | `http://...` |
| `touchkio/rpi_{hostname}/refresh/execute` | Refresh Page | `PRESS` |
| `touchkio/rpi_{hostname}/reboot/execute` | Reboot Device | `PRESS` |
| `touchkio/rpi_{hostname}/shutdown/execute` | Shutdown Device | `PRESS` |

---

## Nächste Schritte

Nach erfolgreichem Test:

1. **Echtes Touchkio Device verbinden**
   - Konfiguriere Touchkio mit MQTT Broker URL
   - Hostname setzen (z.B. "saturn")
   - Touchkio startet und sendet Status-Updates

2. **Power Management konfigurieren**
   - Im Admin Panel: Operations → Devices
   - Klicke "Konfigurieren" beim Display
   - Wähle "MQTT (Touchkio Displays)"
   - Hostname eingeben
   - Zeitplan konfigurieren

3. **Monitoring einrichten**
   - Displays werden automatisch getrackt
   - Status-Updates alle 30-60 Sekunden
   - Sensoren werden kontinuierlich aktualisiert

---

## Support

Bei Problemen:
1. Prüfe Server Log: `tail -f server.log`
2. Prüfe MQTT Broker: `mosquitto_sub -h localhost -p 1883 -t "#" -v`
3. Prüfe Mosquitto Log: `tail -f /opt/homebrew/var/log/mosquitto/mosquitto.log`
