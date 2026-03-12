#!/bin/bash

# Schneller Touchkio Test
# Sendet nur die wichtigsten Status-Updates

HOSTNAME="saturn"
MQTT_HOST="localhost"
MQTT_PORT="1883"

echo "🚀 Schneller Touchkio Test für Display: $HOSTNAME"
echo ""

# Display Power & Brightness
echo "📺 Display: ON, Brightness: 200"
mosquitto_pub -h $MQTT_HOST -p $MQTT_PORT -t "homeassistant/light/touchkio_$HOSTNAME/display/state" -m '{"state":"ON","brightness":200}'

# Kiosk Status
echo "🖥️  Kiosk: Fullscreen"
mosquitto_pub -h $MQTT_HOST -p $MQTT_PORT -t "touchkio/rpi_$HOSTNAME/kiosk/state" -m "Fullscreen"

# Theme
echo "🎨 Theme: Dark"
mosquitto_pub -h $MQTT_HOST -p $MQTT_PORT -t "touchkio/rpi_$HOSTNAME/theme/state" -m "Dark"

# Volume
echo "🔊 Volume: 75%"
mosquitto_pub -h $MQTT_HOST -p $MQTT_PORT -t "touchkio/rpi_$HOSTNAME/volume/state" -m "75"

# CPU & Memory
echo "💻 CPU: 45%, Memory: 62%, Temp: 58°C"
mosquitto_pub -h $MQTT_HOST -p $MQTT_PORT -t "touchkio/rpi_$HOSTNAME/processor_usage/state" -m "45"
mosquitto_pub -h $MQTT_HOST -p $MQTT_PORT -t "touchkio/rpi_$HOSTNAME/memory_usage/state" -m "62"
mosquitto_pub -h $MQTT_HOST -p $MQTT_PORT -t "touchkio/rpi_$HOSTNAME/processor_temperature/state" -m "58"

echo ""
echo "✅ Status-Updates gesendet!"
echo ""
echo "Öffne jetzt: http://localhost:8080/admin"
echo "Gehe zu: Operations → MQTT → Aktualisieren"
