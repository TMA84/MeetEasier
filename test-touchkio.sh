#!/bin/bash

# Touchkio MQTT Test Script
# Simuliert ein Touchkio Display und testet alle Features

HOSTNAME="saturn"
MQTT_HOST="localhost"
MQTT_PORT="1883"

echo "=========================================="
echo "Touchkio MQTT Test Script"
echo "=========================================="
echo "Hostname: $HOSTNAME"
echo "MQTT Broker: $MQTT_HOST:$MQTT_PORT"
echo ""

# Funktion zum Senden von MQTT Nachrichten
send_mqtt() {
    local topic=$1
    local message=$2
    echo "📤 Sende: $topic = $message"
    mosquitto_pub -h $MQTT_HOST -p $MQTT_PORT -t "$topic" -m "$message"
}

# Funktion zum Empfangen von MQTT Nachrichten (im Hintergrund)
start_listener() {
    echo "👂 Starte MQTT Listener für Befehle..."
    mosquitto_sub -h $MQTT_HOST -p $MQTT_PORT -t "homeassistant/light/touchkio_$HOSTNAME/#" -t "touchkio/rpi_$HOSTNAME/#" -v > mqtt_commands.log 2>&1 &
    LISTENER_PID=$!
    echo "   Listener PID: $LISTENER_PID"
    echo ""
    sleep 1
}

# Funktion zum Stoppen des Listeners
stop_listener() {
    if [ ! -z "$LISTENER_PID" ]; then
        echo ""
        echo "🛑 Stoppe MQTT Listener..."
        kill $LISTENER_PID 2>/dev/null
        
        echo ""
        echo "📥 Empfangene Befehle von MeetEasier:"
        echo "=========================================="
        cat mqtt_commands.log 2>/dev/null || echo "Keine Befehle empfangen"
        echo "=========================================="
    fi
}

# Trap für sauberes Beenden
trap stop_listener EXIT

echo "=========================================="
echo "SCHRITT 1: Display Status senden"
echo "=========================================="
echo ""

# Display Power & Brightness
send_mqtt "homeassistant/light/touchkio_$HOSTNAME/display/state" '{"state":"ON","brightness":200}'
sleep 0.5

echo ""
echo "=========================================="
echo "SCHRITT 2: Kiosk Status senden"
echo "=========================================="
echo ""

# Kiosk Status
send_mqtt "touchkio/rpi_$HOSTNAME/kiosk/state" "Fullscreen"
sleep 0.5

echo ""
echo "=========================================="
echo "SCHRITT 3: Theme senden"
echo "=========================================="
echo ""

# Theme
send_mqtt "touchkio/rpi_$HOSTNAME/theme/state" "Dark"
sleep 0.5

echo ""
echo "=========================================="
echo "SCHRITT 4: Audio & Keyboard senden"
echo "=========================================="
echo ""

# Volume
send_mqtt "touchkio/rpi_$HOSTNAME/volume/state" "75"
sleep 0.3

# Keyboard
send_mqtt "touchkio/rpi_$HOSTNAME/keyboard/state" "OFF"
sleep 0.3

echo ""
echo "=========================================="
echo "SCHRITT 5: Page Info senden"
echo "=========================================="
echo ""

# Page Zoom
send_mqtt "touchkio/rpi_$HOSTNAME/page_zoom/state" "100"
sleep 0.3

# Page URL
send_mqtt "touchkio/rpi_$HOSTNAME/page_url/state" "http://localhost:8080/display/single-room/Saturn"
sleep 0.3

echo ""
echo "=========================================="
echo "SCHRITT 6: System Sensoren senden"
echo "=========================================="
echo ""

# CPU Usage
send_mqtt "touchkio/rpi_$HOSTNAME/processor_usage/state" "45.5"
sleep 0.2

# Memory Usage
send_mqtt "touchkio/rpi_$HOSTNAME/memory_usage/state" "62.3"
sleep 0.2

# Temperature
send_mqtt "touchkio/rpi_$HOSTNAME/processor_temperature/state" "58"
sleep 0.2

# Network Address
send_mqtt "touchkio/rpi_$HOSTNAME/network_address/state" "192.168.1.100"
sleep 0.2

# Uptime (in Minuten)
send_mqtt "touchkio/rpi_$HOSTNAME/up_time/state" "1440"
sleep 0.5

echo ""
echo "=========================================="
echo "SCHRITT 7: MeetEasier Server Log prüfen"
echo "=========================================="
echo ""

echo "📋 Letzte 30 Zeilen vom Server Log:"
echo "=========================================="
tail -30 server.log | grep -E "\[MQTT|Display|Kiosk|Theme|Volume|Keyboard|Page|CPU|Memory|Temperature|Network|Uptime" || tail -30 server.log
echo "=========================================="

echo ""
echo "=========================================="
echo "SCHRITT 8: Display States über API abrufen"
echo "=========================================="
echo ""

echo "Warte 2 Sekunden, damit alle States verarbeitet werden..."
sleep 2

echo ""
echo "📊 Display States von MeetEasier API:"
echo "=========================================="
echo "Hinweis: Du musst im Admin Panel eingeloggt sein!"
echo ""
echo "Öffne in deinem Browser:"
echo "  http://localhost:8080/admin"
echo ""
echo "Dann gehe zu: Operations → MQTT"
echo "Klicke auf: 'Aktualisieren' Button"
echo ""
echo "Du solltest das Display '$HOSTNAME' mit allen States sehen:"
echo "  - Power: ON"
echo "  - Brightness: 200"
echo "  - Kiosk: Fullscreen"
echo "  - Theme: Dark"
echo "  - Volume: 75"
echo "  - Keyboard: OFF"
echo "  - Page Zoom: 100%"
echo "  - Page URL: http://localhost:8080/display/single-room/Saturn"
echo "  - CPU: 45.5%"
echo "  - Memory: 62.3%"
echo "  - Temperature: 58°C"
echo "  - Network: 192.168.1.100"
echo "  - Uptime: 1440 min (24h)"
echo "=========================================="

echo ""
echo "=========================================="
echo "SCHRITT 9: Befehle von MeetEasier empfangen"
echo "=========================================="
echo ""

echo "Starte Listener für 30 Sekunden..."
echo "Jetzt kannst du im Admin Panel Befehle senden!"
echo ""

start_listener

echo "⏳ Warte 30 Sekunden auf Befehle..."
echo "   Sende jetzt Befehle über das Admin Panel!"
echo ""

for i in {30..1}; do
    echo -ne "   Noch $i Sekunden...\r"
    sleep 1
done

echo ""
echo ""

stop_listener

echo ""
echo "=========================================="
echo "✅ Test abgeschlossen!"
echo "=========================================="
echo ""
echo "Zusammenfassung:"
echo "  - Display '$HOSTNAME' wurde simuliert"
echo "  - Alle Status-Updates wurden gesendet"
echo "  - Server Log wurde geprüft"
echo "  - Befehle wurden empfangen (siehe oben)"
echo ""
echo "Nächste Schritte:"
echo "  1. Öffne http://localhost:8080/admin"
echo "  2. Gehe zu Operations → MQTT"
echo "  3. Klicke 'Aktualisieren'"
echo "  4. Teste die Buttons (Turn On/Off, etc.)"
echo ""
