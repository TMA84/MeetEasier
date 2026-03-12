# Power Management Setup

MeetEasier unterstützt hybrides Power Management für Displays:
- **Browser-Modus**: Funktioniert auf allen Geräten (Tablets, Browser, Raspberry Pi)
- **DPMS-Modus**: Nur für Raspberry Pi - echtes Display-Ausschalten für Stromersparnis

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
CLIENT_ID_FILE="/home/pi/.meeteasier-client-id"
CHECK_INTERVAL=60  # Check every 60 seconds

# Get or create client ID
if [ ! -f "$CLIENT_ID_FILE" ]; then
    # Generate client ID (same format as browser)
    CLIENT_ID="display-$(cat /proc/sys/kernel/random/uuid)"
    echo "$CLIENT_ID" > "$CLIENT_ID_FILE"
fi
CLIENT_ID=$(cat "$CLIENT_ID_FILE")

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
echo "Client ID: $CLIENT_ID"

while true; do
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

4. **Server-URL anpassen:**

```bash
sudo nano /usr/local/bin/meeteasier-power-management.sh
# Ändere SERVER_URL="http://YOUR_SERVER_IP:8080" zu deiner Server-Adresse
```

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
2. Finde dein Raspberry Pi Display in der Liste
3. Klicke auf "Power Management konfigurieren"
4. Wähle **DPMS-Modus**
5. Konfiguriere den Zeitplan:
   - **Startzeit**: z.B. 20:00 (Display geht aus)
   - **Endzeit**: z.B. 07:00 (Display geht an)
   - **Wochenend-Modus**: Display am Wochenende ganztägig aus
6. Speichern

### Troubleshooting

**Display schaltet sich nicht aus:**
- Prüfe Service-Status: `sudo systemctl status meeteasier-power-management.service`
- Prüfe Logs: `sudo journalctl -u meeteasier-power-management.service -f`
- Prüfe Server-URL im Skript
- Teste manuell: `vcgencmd display_power 0` (aus) / `vcgencmd display_power 1` (an)

**Client ID stimmt nicht:**
- Lösche `/home/pi/.meeteasier-client-id` und starte Service neu
- Oder: Kopiere Client ID aus Admin-Panel und schreibe sie in die Datei

**jq nicht gefunden:**
- Installiere jq: `sudo apt-get install -y jq`

## Deployment auf mehreren Raspberry Pis

Für die Verwaltung von 20+ Raspberry Pis empfehlen wir:

1. **Ansible Playbook** für automatisches Deployment
2. **Zentrales Skript** auf einem File-Server
3. **Image-basiertes Deployment** mit vorinstalliertem Skript

Beispiel Ansible Playbook auf Anfrage verfügbar.
