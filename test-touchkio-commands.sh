#!/bin/bash

# Touchkio Command Test Script
# Testet das Senden von Befehlen an ein Touchkio Display

HOSTNAME="saturn"
MQTT_HOST="localhost"
MQTT_PORT="1883"

echo "=========================================="
echo "Touchkio Command Test Script"
echo "=========================================="
echo "Hostname: $HOSTNAME"
echo "MQTT Broker: $MQTT_HOST:$MQTT_PORT"
echo ""
echo "Dieses Script empfängt Befehle, die MeetEasier"
echo "an das Touchkio Display sendet."
echo ""

# Starte Listener
echo "👂 Starte MQTT Listener..."
echo "=========================================="
echo ""
echo "Empfange Befehle auf folgenden Topics:"
echo "  - homeassistant/light/touchkio_$HOSTNAME/display/set"
echo "  - homeassistant/light/touchkio_$HOSTNAME/display/brightness/set"
echo "  - touchkio/rpi_$HOSTNAME/kiosk/set"
echo "  - touchkio/rpi_$HOSTNAME/theme/set"
echo "  - touchkio/rpi_$HOSTNAME/volume/set"
echo "  - touchkio/rpi_$HOSTNAME/keyboard/set"
echo "  - touchkio/rpi_$HOSTNAME/page_zoom/set"
echo "  - touchkio/rpi_$HOSTNAME/page_url/set"
echo "  - touchkio/rpi_$HOSTNAME/refresh/execute"
echo "  - touchkio/rpi_$HOSTNAME/reboot/execute"
echo "  - touchkio/rpi_$HOSTNAME/shutdown/execute"
echo ""
echo "=========================================="
echo "Drücke Ctrl+C zum Beenden"
echo "=========================================="
echo ""

# Empfange alle Befehle
mosquitto_sub -h $MQTT_HOST -p $MQTT_PORT \
    -t "homeassistant/light/touchkio_$HOSTNAME/#" \
    -t "touchkio/rpi_$HOSTNAME/#" \
    -v
