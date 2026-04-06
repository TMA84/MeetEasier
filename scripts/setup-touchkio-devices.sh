#!/bin/bash
#
# Setup Touchkio devices: Add MQTT config, fix X11 autostart, update Touchkio
# Usage: ./setup-touchkio-devices.sh [SSH_USER] [SSH_PASSWORD]
#   SSH_USER     defaults to "pi"
#   SSH_PASSWORD  if provided, uses sshpass for non-interactive login
#
# Devices can use host:port format for SSH tunnels (default port: 22)
# Uses SSH ControlMaster multiplexing: one connection per device, all commands reuse it.
# Reboot only happens if a change was made that requires it (X11/screen blanking/touch).
# Touchkio config + update only need a service restart.
#

SSH_USER="${1:-pi}"
SSH_PASS="${2:-}"

CTRL_DIR=$(mktemp -d)
trap "rm -rf ${CTRL_DIR}" EXIT

SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10 -o ControlPath=${CTRL_DIR}/%r@%h:%p"

if [ -n "$SSH_PASS" ]; then
  if ! command -v sshpass &>/dev/null; then
    echo "ERROR: sshpass not installed. Install: brew install esolitos/ipa/sshpass"
    exit 1
  fi
  export SSHPASS="$SSH_PASS"
  SSHPASS_CMD="sshpass -e"
else
  SSHPASS_CMD=""
fi

DEVICES=(
#  "localhost:2281"   # 10.5.5.81 via SSH tunnel
#  "localhost:2282"   # 10.5.5.82 via SSH tunnel
#  "localhost:2283"   # 10.5.5.83 via SSH tunnel
  "192.168.3.38"
  "192.168.3.39"
  "192.168.3.40"
  "192.168.3.41"
  "192.168.3.42"
  "192.168.3.43"
  "192.168.3.44"
  "192.168.3.45"
  "192.168.3.46"
  "192.168.3.214"
  "192.168.3.220"
)

MQTT_URL="mqtt://mqtt.meeteasier.vsti.cloud:1883"
MQTT_USER="meeteasier"
MQTT_PASSWORD="YTgyMTNiZThiNzIzNzAyMWRjMjc5MmRlNDU2ODZmMWE6YzFkN2I2N2MyOTRjNmE0NDRkYjQyY2M0OWVmZGNlMWE1ZjdiYTA1YTUzOTdmYjE5Y2I3OTEyZGI0YTIzNWUwZTYzNTY4MmY2ODc2Y2RlNGMwYWMyYTQyODAxNGQxNjIy"
MQTT_DISCOVERY="homeassistant"

SUCCESS=()
FAILED=()

echo "============================================="
echo " Touchkio Device Setup Script"
echo " User: ${SSH_USER}"
echo " Auth: $([ -n "$SSH_PASS" ] && echo "password" || echo "SSH key")"
echo " Devices: ${#DEVICES[@]}"
echo "============================================="
echo ""

for ENTRY in "${DEVICES[@]}"; do
  HOST="${ENTRY%%:*}"
  if [[ "$ENTRY" == *:* ]]; then
    PORT="${ENTRY##*:}"
  else
    PORT="22"
  fi
  PORT_OPT="-p ${PORT}"
  LABEL="${ENTRY}"
  NEEDS_REBOOT=false
  NEEDS_SERVICE_RESTART=false

  echo "---------------------------------------------"
  echo "[${LABEL}] Connecting..."
  echo "---------------------------------------------"

  ${SSHPASS_CMD} ssh ${SSH_OPTS} ${PORT_OPT} -o ControlMaster=yes -o ControlPersist=300 -fN "${SSH_USER}@${HOST}" 2>/dev/null
  if [ $? -ne 0 ]; then
    echo "[${LABEL}] Retrying..."
    ${SSHPASS_CMD} ssh ${SSH_OPTS} ${PORT_OPT} -o ControlMaster=yes "${SSH_USER}@${HOST}" "echo ok" 2>&1
    if [ $? -ne 0 ]; then
      echo "[${LABEL}] ERROR: Cannot connect. Skipping."
      FAILED+=("${LABEL}")
      echo ""
      continue
    fi
  fi

  RUN="ssh ${SSH_OPTS} ${PORT_OPT} -o ControlMaster=no ${SSH_USER}@${HOST}"

  # --- Step 1: MQTT config & web_widget ---
  echo "[${LABEL}] Step 1/5: Checking Arguments.json..."
  STEP1=$(${RUN} 'bash -s' <<'REMOTE_STEP1'
CONFIG_FILE="$HOME/.config/touchkio/Arguments.json"
if [ ! -f "$CONFIG_FILE" ]; then
  mkdir -p "$(dirname "$CONFIG_FILE")"
  cat > "$CONFIG_FILE" <<'EOF'
{
  "mqtt_url": "MQTT_URL_PLACEHOLDER",
  "mqtt_user": "MQTT_USER_PLACEHOLDER",
  "mqtt_password": "MQTT_PASSWORD_PLACEHOLDER",
  "mqtt_discovery": "MQTT_DISCOVERY_PLACEHOLDER",
  "web_widget": "false"
}
EOF
  echo "CHANGED"
else
  python3 -c "
import json
with open('$CONFIG_FILE', 'r') as f:
    config = json.load(f)
changed = False
if 'mqtt_url' not in config:
    config['mqtt_url'] = 'MQTT_URL_PLACEHOLDER'
    config['mqtt_user'] = 'MQTT_USER_PLACEHOLDER'
    config['mqtt_password'] = 'MQTT_PASSWORD_PLACEHOLDER'
    config['mqtt_discovery'] = 'MQTT_DISCOVERY_PLACEHOLDER'
    changed = True
if config.get('web_widget') != 'false':
    config['web_widget'] = 'false'
    changed = True
if changed:
    with open('$CONFIG_FILE', 'w') as f:
        json.dump(config, f, indent=2)
print('CHANGED' if changed else 'OK')
"
fi
REMOTE_STEP1
)
  if echo "$STEP1" | grep -q "CHANGED"; then
    echo "  → Config updated. Replacing placeholders..."
    ${RUN} bash -s -- "${MQTT_URL}" "${MQTT_USER}" "${MQTT_PASSWORD}" "${MQTT_DISCOVERY}" <<'REMOTE_SED'
CONFIG_FILE="$HOME/.config/touchkio/Arguments.json"
sed -i "s|MQTT_URL_PLACEHOLDER|$1|g" "$CONFIG_FILE"
sed -i "s|MQTT_USER_PLACEHOLDER|$2|g" "$CONFIG_FILE"
sed -i "s|MQTT_PASSWORD_PLACEHOLDER|$3|g" "$CONFIG_FILE"
sed -i "s|MQTT_DISCOVERY_PLACEHOLDER|$4|g" "$CONFIG_FILE"
REMOTE_SED
    NEEDS_SERVICE_RESTART=true
  else
    echo "  → No changes needed."
  fi

  # --- Step 2: X11 autostart ---
  echo "[${LABEL}] Step 2/5: Checking X11 autostart..."
  STEP2=$(${RUN} 'bash -s' <<'REMOTE_STEP2'
AUTOSTART_FILE="$HOME/.config/lxsession/LXDE-pi/autostart"
EXPECTED="@xset s noblank
@xset s off
@xset dpms 0 0 0"

if [ -f "$AUTOSTART_FILE" ]; then
  # Compare only the xset lines (ignore touch rotation line if present)
  CURRENT=$(grep -v "xinput" "$AUTOSTART_FILE")
  if [ "$CURRENT" = "$EXPECTED" ]; then
    echo "OK"
    exit 0
  fi
fi

sudo mkdir -p "$(dirname "$AUTOSTART_FILE")"
if [ -f "$AUTOSTART_FILE" ]; then
  sudo cp "$AUTOSTART_FILE" "${AUTOSTART_FILE}.bak.$(date +%Y%m%d%H%M%S)"
fi
printf '%s\n' "@xset s noblank" "@xset s off" "@xset dpms 0 0 0" | sudo tee "$AUTOSTART_FILE" > /dev/null
sudo chown root:root "$AUTOSTART_FILE"
echo "CHANGED"
REMOTE_STEP2
)
  if echo "$STEP2" | grep -q "CHANGED"; then
    echo "  → Autostart updated."
    NEEDS_REBOOT=true
  else
    echo "  → No changes needed."
  fi

  # --- Step 3: Touchscreen orientation ---
  echo "[${LABEL}] Step 3/5: Checking touchscreen orientation..."
  STEP3=$(${RUN} 'bash -s' <<'REMOTE_STEP3'
XORG_CONF="/etc/X11/xorg.conf.d/99-touchscreen.conf"

# Check if xorg config already exists with correct matrix
if [ -f "$XORG_CONF" ] && grep -q "TransformationMatrix" "$XORG_CONF"; then
  echo "OK"
  exit 0
fi

# Check if display is rotated via xrandr (inverted = 180°)
ROTATION=$(DISPLAY=:0 xrandr --query 2>/dev/null | grep -oE '\binverted\b' | head -1)

# Also check /boot/config.txt for lcd_rotate/display_rotate=2
BOOT_CONFIG="/boot/config.txt"
[ ! -f "$BOOT_CONFIG" ] && BOOT_CONFIG="/boot/firmware/config.txt"
if [ -f "$BOOT_CONFIG" ] && grep -qE '^\s*(lcd_rotate|display_rotate)\s*=\s*2' "$BOOT_CONFIG"; then
  ROTATION="inverted"
fi

if [ "$ROTATION" != "inverted" ]; then
  echo "OK"
  exit 0
fi

# Create xorg config for 180° touch rotation
sudo mkdir -p /etc/X11/xorg.conf.d
sudo tee "$XORG_CONF" > /dev/null <<'XCONF'
Section "InputClass"
    Identifier "calibration"
    MatchProduct "ft5x06"
    Option "TransformationMatrix" "-1 0 1 0 -1 1 0 0 1"
EndSection
XCONF
echo "CHANGED"
REMOTE_STEP3
)
  if echo "$STEP3" | grep -q "CHANGED"; then
    echo "  → Xorg touch rotation config created."
    NEEDS_REBOOT=true
  else
    echo "  → No changes needed."
  fi

  # --- Step 4: Screen blanking ---
  echo "[${LABEL}] Step 4/5: Checking screen blanking..."
  STEP4=$(${RUN} 'bash -s' <<'REMOTE_STEP4'
CURRENT=$(sudo raspi-config nonint get_blanking 2>/dev/null)
if [ "$CURRENT" = "0" ]; then
  echo "OK"
else
  sudo raspi-config nonint do_blanking 0
  echo "CHANGED"
fi
REMOTE_STEP4
)
  if echo "$STEP4" | grep -q "CHANGED"; then
    echo "  → Screen blanking enabled."
    NEEDS_REBOOT=true
  else
    echo "  → Already enabled."
  fi

  # --- Step 5: Touchkio update ---
  echo "[${LABEL}] Step 5/5: Updating Touchkio..."
  STEP5=$(${RUN} 'bash <(wget -qO- https://raw.githubusercontent.com/leukipp/touchkio/main/install.sh) update' 2>&1)
  if echo "$STEP5" | grep -qiE 'updated|installed|upgrading'; then
    echo "  → Touchkio updated."
    NEEDS_SERVICE_RESTART=true
  else
    echo "  → Already up to date."
  fi

  # --- Apply: service restart and/or reboot ---
  if [ "$NEEDS_REBOOT" = true ]; then
    echo "[${LABEL}] Rebooting (X11/screen blanking/touch changed)..."
    ${RUN} 'sudo reboot' 2>/dev/null
  elif [ "$NEEDS_SERVICE_RESTART" = true ]; then
    echo "[${LABEL}] Restarting Touchkio service..."
    ${RUN} 'sudo systemctl restart touchkio 2>/dev/null || echo "  service not found"'
  else
    echo "[${LABEL}] No changes — nothing to restart."
  fi

  ssh ${SSH_OPTS} ${PORT_OPT} -O exit "${SSH_USER}@${HOST}" 2>/dev/null

  echo "[${LABEL}] Done."
  SUCCESS+=("${LABEL}")
  echo ""
done

echo "============================================="
echo " Summary"
echo "============================================="
echo " Success: ${#SUCCESS[@]}/${#DEVICES[@]}"
for ENTRY in "${SUCCESS[@]}"; do echo "   ✓ ${ENTRY}"; done
if [ ${#FAILED[@]} -gt 0 ]; then
  echo " Failed:  ${#FAILED[@]}/${#DEVICES[@]}"
  for ENTRY in "${FAILED[@]}"; do echo "   ✗ ${ENTRY}"; done
fi
echo ""
echo "============================================="