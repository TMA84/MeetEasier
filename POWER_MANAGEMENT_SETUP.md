# Power Management Setup

MeetEasier unterstützt hybrides Power Management für Displays:
- **Browser-Modus**: Funktioniert auf allen Geräten (Tablets, Browser, Raspberry Pi)
- **DPMS-Modus**: Nur für Raspberry Pi - echtes Display-Ausschalten für Stromersparnis

## Wichtig: Keine feste Server-IP erforderlich!

Das DPMS-Skript läuft **lokal auf jedem Raspberry Pi** und kommuniziert mit dem Server über HTTP/HTTPS. 
Bei dynamischen Server-IPs (z.B. ECS, Kubernetes) gibt es mehrere Lösungen:

1. **DNS-Name verwenden** (empfohlen):
   ```bash
   SERVER_URL="https://meeteasier.your-domain.com"
   ```

2. **Load Balancer URL**:
   ```bash
   SERVER_URL="https://your-loadbalancer.elb.amazonaws.com"
   ```

3. **Service Discovery** (für Kubernetes/ECS):
   ```bash
   SERVER_URL="http://meeteasier-service.default.svc.cluster.local:8080"
   ```

Der Raspberry Pi benötigt **keine feste IP** - nur der Server muss für die Raspis erreichbar sein.

## Automatischer Fallback

Das System hat einen intelligenten Fallback-Mechanismus:

1. **DPMS-Modus konfiguriert + Skript läuft**: Display wird per DPMS ausgeschaltet (echtes Stromsparen)
2. **DPMS-Modus konfiguriert + Skript läuft NICHT**: Browser zeigt schwarzen Bildschirm (Fallback)
3. **Browser-Modus konfiguriert**: Browser zeigt schwarzen Bildschirm

**Vorteil**: Auch wenn das DPMS-Skript nicht installiert ist oder fehlschlägt, funktioniert das Power Management über den Browser als Fallback. Das Display wird zwar nicht wirklich ausgeschaltet, aber zumindest schwarz (reduziert Ablenkung und etwas Strom).

## Browser-Modus (Automatisch)

Der Browser-Modus funktioniert automatisch auf allen Displays:
- Konfiguration erfolgt im Admin-Panel unter "Operations → Devices"
- Display wird zur konfigurierten Zeit schwarz
- Touch/Klick aktiviert das Display wieder
- Keine zusätzliche Installation erforderlich

## DPMS-Modus (Raspberry Pi)

Für echtes Stromsparen auf Raspberry Pi muss ein lokales Skript installiert werden.

### Installation auf Raspberry Pi

1. **Skript erstellen:**

```bash
sudo nano /usr/local/bin/meeteasier-power-management.sh
```

2. **Skript-Inhalt einfügen:**

```bash
#!/bin/bash

# MeetEasier Power Management Script for Raspberry Pi
# This script fetches power management configuration from the server
# and controls the display using DPMS (Display Power Management Signaling)

# Configuration
SERVER_URL="http://YOUR_SERVER_IP:8080"
ROOM_NAME="Saturn"  # Name des Raums (z.B. Saturn, Jupiter, Mars)
CHECK_INTERVAL=60   # Check every 60 seconds

# Get local IP address
get_local_ip() {
    # Try to get the primary IP address
    ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}'
}

# Function to turn display on
display_on() {
    echo "$(date): Turning display ON"
    vcgencmd display_power 1
}

# Function to turn display off
display_off() {
    echo "$(date): Turning display OFF"
    vcgencmd display_power 0
}

# Function to check if time is in range
is_time_in_range() {
    local current_time="$1"
    local start_time="$2"
    local end_time="$3"
    
    # Convert times to minutes since midnight
    current_minutes=$((10#${current_time:0:2} * 60 + 10#${current_time:3:2}))
    start_minutes=$((10#${start_time:0:2} * 60 + 10#${start_time:3:2}))
    end_minutes=$((10#${end_time:0:2} * 60 + 10#${end_time:3:2}))
    
    # Handle overnight ranges (e.g., 20:00 to 07:00)
    if [ $start_minutes -gt $end_minutes ]; then
        if [ $current_minutes -ge $start_minutes ] || [ $current_minutes -lt $end_minutes ]; then
            return 0  # In range
        fi
    else
        # Handle same-day ranges (e.g., 12:00 to 14:00)
        if [ $current_minutes -ge $start_minutes ] && [ $current_minutes -lt $end_minutes ]; then
            return 0  # In range
        fi
    fi
    
    return 1  # Not in range
}

# Main loop
echo "$(date): MeetEasier Power Management started"
echo "Room: $ROOM_NAME"

while true; do
    # Get current IP address
    LOCAL_IP=$(get_local_ip)
    
    if [ -z "$LOCAL_IP" ]; then
        echo "$(date): Could not determine local IP address, keeping display on"
        display_on
        sleep $CHECK_INTERVAL
        continue
    fi
    
    # Build client ID from IP and room name (same format as server tracking)
    CLIENT_ID="${LOCAL_IP}_${ROOM_NAME}"
    
    echo "$(date): Client ID: $CLIENT_ID"
    
    # Fetch power management configuration
    CONFIG=$(curl -s "$SERVER_URL/api/power-management/$CLIENT_ID")
    
    if [ $? -eq 0 ] && [ -n "$CONFIG" ]; then
        # Parse JSON (requires jq)
        MODE=$(echo "$CONFIG" | jq -r '.mode // "browser"')
        ENABLED=$(echo "$CONFIG" | jq -r '.schedule.enabled // false')
        START_TIME=$(echo "$CONFIG" | jq -r '.schedule.startTime // "20:00"')
        END_TIME=$(echo "$CONFIG" | jq -r '.schedule.endTime // "07:00"')
        WEEKEND_MODE=$(echo "$CONFIG" | jq -r '.schedule.weekendMode // false')
        
        # Only proceed if DPMS mode and schedule is enabled
        if [ "$MODE" = "dpms" ] && [ "$ENABLED" = "true" ]; then
            CURRENT_TIME=$(date +%H:%M)
            DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
            
            # Check weekend mode
            if [ "$WEEKEND_MODE" = "true" ] && ([ "$DAY_OF_WEEK" = "6" ] || [ "$DAY_OF_WEEK" = "7" ]); then
                display_off
            elif is_time_in_range "$CURRENT_TIME" "$START_TIME" "$END_TIME"; then
                display_off
            else
                display_on
            fi
        else
            # Ensure display is on if not in DPMS mode or schedule disabled
            display_on
        fi
    else
        echo "$(date): Failed to fetch configuration, keeping display on"
        display_on
    fi
    
    sleep $CHECK_INTERVAL
done
```

3. **Skript ausführbar machen:**

```bash
sudo chmod +x /usr/local/bin/meeteasier-power-management.sh
```

4. **Konfiguration anpassen:**

```bash
sudo nano /usr/local/bin/meeteasier-power-management.sh
```

Ändere diese Zeilen:
```bash
SERVER_URL="https://meeteasier.your-domain.com"  # Deine Server-URL
ROOM_NAME="Saturn"  # Name des Raums (muss mit Admin-Panel übereinstimmen)
```

**Wichtig**: Der `ROOM_NAME` muss **exakt** mit dem Raumnamen im Admin-Panel übereinstimmen (z.B. "Saturn", "Jupiter", "Mars").

5. **jq installieren (für JSON-Parsing):**

```bash
sudo apt-get update
sudo apt-get install -y jq
```

6. **Systemd Service erstellen:**

```bash
sudo nano /etc/systemd/system/meeteasier-power-management.service
```

```ini
[Unit]
Description=MeetEasier Power Management
After=network.target

[Service]
Type=simple
User=pi
ExecStart=/usr/local/bin/meeteasier-power-management.sh
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

7. **Service aktivieren und starten:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable meeteasier-power-management.service
sudo systemctl start meeteasier-power-management.service
```

8. **Status prüfen:**

```bash
sudo systemctl status meeteasier-power-management.service
sudo journalctl -u meeteasier-power-management.service -f
```

### Konfiguration im Admin-Panel

1. Gehe zu **Operations → Devices**
2. Klicke auf **"Refresh"** um die verbundenen Displays zu sehen
3. Finde dein Raspberry Pi Display in der Liste (z.B. `192.168.1.100_Saturn`)
4. Klicke auf **"Konfigurieren"** in der Power-Spalte
5. Wähle **DPMS-Modus** (wird automatisch erkannt für RPi)
6. Konfiguriere den Zeitplan:
   - **Startzeit**: z.B. 20:00 (Display geht aus)
   - **Endzeit**: z.B. 07:00 (Display geht an)
   - **Wochenend-Modus**: Display am Wochenende ganztägig aus
7. Speichern

**Tipp**: Du kannst auch den **"Global Standard"** Button verwenden, um Zeiten für alle Displays gleichzeitig zu setzen. Einzelne Displays können dann davon abweichen.

### Troubleshooting

**Display schaltet sich nicht aus:**
- Prüfe Service-Status: `sudo systemctl status meeteasier-power-management.service`
- Prüfe Logs: `sudo journalctl -u meeteasier-power-management.service -f`
- Prüfe Server-URL und Raumnamen im Skript
- Teste manuell: `vcgencmd display_power 0` (aus) / `vcgencmd display_power 1` (an)

**Client ID stimmt nicht im Admin-Panel:**
- Die Client ID wird automatisch aus IP + Raumname generiert: `192.168.1.100_Saturn`
- Prüfe im Log, welche Client ID verwendet wird
- Stelle sicher, dass der Raumname im Skript mit dem Admin-Panel übereinstimmt

**IP-Adresse ändert sich:**
- Das Skript erkennt die IP automatisch bei jedem Check
- Wenn sich die IP ändert, ändert sich auch die Client ID
- Im Admin-Panel erscheint dann ein neuer Eintrag
- Lösung: DHCP-Reservation für den Raspberry Pi einrichten

**jq nicht gefunden:**
- Installiere jq: `sudo apt-get install -y jq`

## Deployment auf mehreren Raspberry Pis

Für die Verwaltung von 20+ Raspberry Pis empfehlen wir:

1. **Ansible Playbook** für automatisches Deployment
2. **Zentrales Skript** auf einem File-Server
3. **Image-basiertes Deployment** mit vorinstalliertem Skript

Beispiel Ansible Playbook auf Anfrage verfügbar.

## Alternative: MQTT-basiertes Power Management (Touchkio)

Wenn Sie **Touchkio** auf Ihren Raspberry Pis verwenden, können Sie das Display über MQTT steuern. Dies ist eine elegantere Lösung als DPMS, da Touchkio bereits MQTT-Integration bietet.

### Vorteile von MQTT:
- ✅ Zentrale Steuerung über MQTT Broker
- ✅ Echtzeit-Updates (keine Polling-Verzögerung)
- ✅ Bidirektionale Kommunikation (Status-Feedback)
- ✅ Geringerer Netzwerk-Traffic
- ✅ Bessere Skalierbarkeit für viele Displays
- ✅ Integration mit Home Assistant, Node-RED, etc.

### Architektur:

```
MeetEasier Server
       ↓
  MQTT Broker (z.B. Mosquitto)
       ↓
  Touchkio Displays (Raspberry Pi)
```

### Geplante Features (v1.6.0):

1. **MQTT-Modus** als dritte Power Management Option:
   - Browser-Modus (alle Geräte)
   - DPMS-Modus (Raspberry Pi mit vcgencmd)
   - **MQTT-Modus** (Touchkio Displays)

2. **MQTT-Konfiguration im Admin-Panel**:
   - MQTT Broker URL
   - Authentifizierung (Username/Password)
   - Topic-Struktur konfigurierbar
   - TLS/SSL Support

3. **Automatische Erkennung**:
   - System erkennt Touchkio-Displays automatisch
   - Empfiehlt MQTT-Modus für Touchkio

4. **Topic-Struktur**:
   ```
   # Touchkio verwendet Home Assistant MQTT Discovery Format:
   
   # State Topic (Touchkio → Broker)
   # Unterstützt sowohl /state als auch /status Suffix
   homeassistant/light/touchkio_{hostname}/display/state
   homeassistant/light/touchkio_{hostname}/display/status
   Payload: {"state": "ON", "brightness": 255}
   
   # Command Topic (MeetEasier → Touchkio)
   homeassistant/light/touchkio_{hostname}/display/set
   Payload: {"state": "OFF"}  # oder {"state": "ON", "brightness": 200}
   
   # Hostname ist der Raspberry Pi Hostname (z.B. "raspberrypi" oder "saturn")
   # Beispiel: homeassistant/light/touchkio_saturn/display/set
   
   # Hinweis: MeetEasier empfängt automatisch beide Topic-Formate (/state und /status)
   # für maximale Kompatibilität mit verschiedenen Touchkio Firmware-Versionen
   ```

### Temporäre Lösung (bis v1.6.0):

Sie können bereits jetzt MQTT mit einem eigenen Skript nutzen:

```bash
#!/bin/bash
# meeteasier-mqtt-bridge.sh
# Bridge zwischen MeetEasier Power Management und Touchkio MQTT

MQTT_BROKER="mqtt://your-broker:1883"
MQTT_USER="meeteasier"
MQTT_PASS="your-password"
SERVER_URL="https://meeteasier.your-domain.com"
ROOM_NAME="Saturn"
HOSTNAME=$(hostname)  # z.B. "saturn" oder "raspberrypi"

# Touchkio MQTT Topics (Home Assistant Discovery Format)
TOUCHKIO_COMMAND_TOPIC="homeassistant/light/touchkio_${HOSTNAME}/display/set"
TOUCHKIO_STATE_TOPIC="homeassistant/light/touchkio_${HOSTNAME}/display/state"

echo "MeetEasier → Touchkio MQTT Bridge"
echo "Hostname: $HOSTNAME"
echo "Command Topic: $TOUCHKIO_COMMAND_TOPIC"

# Fetch schedule from MeetEasier and publish MQTT commands
while true; do
  LOCAL_IP=$(hostname -I | awk '{print $1}')
  CLIENT_ID="${LOCAL_IP}_${ROOM_NAME}"
  
  # Fetch power management config from MeetEasier
  CONFIG=$(curl -s "$SERVER_URL/api/power-management/$CLIENT_ID")
  
  if [ $? -eq 0 ] && [ -n "$CONFIG" ]; then
    # Parse JSON (requires jq)
    MODE=$(echo "$CONFIG" | jq -r '.mode // "browser"')
    ENABLED=$(echo "$CONFIG" | jq -r '.schedule.enabled // false')
    START_TIME=$(echo "$CONFIG" | jq -r '.schedule.startTime // "20:00"')
    END_TIME=$(echo "$CONFIG" | jq -r '.schedule.endTime // "07:00"')
    WEEKEND_MODE=$(echo "$CONFIG" | jq -r '.schedule.weekendMode // false')
    
    # Only proceed if MQTT mode and schedule is enabled
    if [ "$MODE" = "mqtt" ] && [ "$ENABLED" = "true" ]; then
      CURRENT_TIME=$(date +%H:%M)
      DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
      
      SHOULD_BE_OFF=false
      
      # Check weekend mode
      if [ "$WEEKEND_MODE" = "true" ] && ([ "$DAY_OF_WEEK" = "6" ] || [ "$DAY_OF_WEEK" = "7" ]); then
        SHOULD_BE_OFF=true
      else
        # Check if current time is in off-range
        # (Simplified - for production use proper time comparison)
        CURRENT_MINUTES=$((10#${CURRENT_TIME:0:2} * 60 + 10#${CURRENT_TIME:3:2}))
        START_MINUTES=$((10#${START_TIME:0:2} * 60 + 10#${START_TIME:3:2}))
        END_MINUTES=$((10#${END_TIME:0:2} * 60 + 10#${END_TIME:3:2}))
        
        if [ $START_MINUTES -gt $END_MINUTES ]; then
          # Overnight range
          if [ $CURRENT_MINUTES -ge $START_MINUTES ] || [ $CURRENT_MINUTES -lt $END_MINUTES ]; then
            SHOULD_BE_OFF=true
          fi
        else
          # Same-day range
          if [ $CURRENT_MINUTES -ge $START_MINUTES ] && [ $CURRENT_MINUTES -lt $END_MINUTES ]; then
            SHOULD_BE_OFF=true
          fi
        fi
      fi
      
      # Publish MQTT command to Touchkio
      if [ "$SHOULD_BE_OFF" = true ]; then
        echo "$(date): Turning display OFF"
        mosquitto_pub -h $MQTT_BROKER -u $MQTT_USER -P $MQTT_PASS \
          -t "$TOUCHKIO_COMMAND_TOPIC" \
          -m '{"state":"OFF"}'
      else
        echo "$(date): Turning display ON"
        mosquitto_pub -h $MQTT_BROKER -u $MQTT_USER -P $MQTT_PASS \
          -t "$TOUCHKIO_COMMAND_TOPIC" \
          -m '{"state":"ON","brightness":255}'
      fi
    fi
  else
    echo "$(date): Failed to fetch configuration from MeetEasier"
  fi
  
  sleep 60
done
```

### Interesse an MQTT-Integration?

Wenn Sie MQTT-basiertes Power Management benötigen, können wir dies priorisieren. Bitte erstellen Sie ein GitHub Issue mit:
- Touchkio Version
- MQTT Broker (Mosquitto, HiveMQ, etc.)
- Gewünschte Topic-Struktur
- Anzahl der Displays

**Geschätzte Entwicklungszeit**: 2-3 Tage für vollständige MQTT-Integration

### Weitere Informationen:

- **Touchkio Dokumentation**: https://touchkio.com/docs
- **MQTT Protokoll**: https://mqtt.org/
- **Mosquitto Broker**: https://mosquitto.org/
