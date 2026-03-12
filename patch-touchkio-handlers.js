#!/usr/bin/env node

/**
 * Patch Script für Touchkio Modal Handler
 * Fügt die Modal-Handler-Funktionen und State hinzu
 */

const fs = require('fs');
const path = require('path');

const adminFilePath = path.join(__dirname, 'ui-react/src/components/admin/Admin.js');

console.log('📝 Patching Touchkio Modal Handlers...');

let content = fs.readFileSync(adminFilePath, 'utf8');

// 1. Füge Modal State zum Constructor hinzu
const constructorSearch = `mqttDisplays: [],
      mqttDisplaysLoading: false,`;

const constructorReplacement = `mqttDisplays: [],
      mqttDisplaysLoading: false,
      showTouchkioModal: false,
      touchkioModalDisplay: null,
      touchkioModalMessage: null,
      touchkioModalMessageType: null,
      touchkioModalBrightness: undefined,
      touchkioModalVolume: undefined,
      touchkioModalZoom: undefined,`;

if (content.includes(constructorSearch) && !content.includes('showTouchkioModal')) {
  content = content.replace(constructorSearch, constructorReplacement);
  console.log('✅ Added Modal state to constructor');
} else {
  console.log('⚠️  Modal state already exists or constructor not found');
}

// 2. Füge Modal Handler Funktionen nach handleMqttShutdownCommand hinzu
const handlerSearch = `  handleMqttShutdownCommand = async (hostname) => {
    const { apiToken } = this.state;
    const t = this.getTranslations();

    try {
      const response = await fetch(\`/api/mqtt-shutdown/\${hostname}\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${apiToken}\`
        }
      });

      if (response.status === 401) {
        this.handleUnauthorizedAccess();
        return;
      }

      if (response.ok) {
        this.setState({
          mqttConfigMessage: \`Shutdown command sent to \${hostname}\`,
          mqttConfigMessageType: 'warning'
        });
      }
    } catch (err) {
      console.error('Failed to send shutdown command:', err);
    }
  }`;

const modalHandlers = `

  // Touchkio Modal Handlers
  handleOpenTouchkioModal = (display) => {
    this.setState({
      showTouchkioModal: true,
      touchkioModalDisplay: display,
      touchkioModalMessage: null,
      touchkioModalMessageType: null,
      touchkioModalBrightness: undefined,
      touchkioModalVolume: undefined,
      touchkioModalZoom: undefined
    });
  }

  handleCloseTouchkioModal = () => {
    this.setState({
      showTouchkioModal: false,
      touchkioModalDisplay: null,
      touchkioModalMessage: null,
      touchkioModalMessageType: null,
      touchkioModalBrightness: undefined,
      touchkioModalVolume: undefined,
      touchkioModalZoom: undefined
    });
  }

  handleMqttPowerCommandModal = async (hostname, powerOn) => {
    await this.handleMqttPowerCommand(hostname, powerOn);
    this.setState({
      touchkioModalMessage: \`Power command sent: \${powerOn ? 'ON' : 'OFF'}\`,
      touchkioModalMessageType: 'success'
    });
    setTimeout(() => {
      this.handleLoadMqttDisplays();
      if (this.state.touchkioModalDisplay) {
        // Update modal display data
        const updatedDisplay = this.state.mqttDisplays.find(d => d.hostname === hostname);
        if (updatedDisplay) {
          this.setState({ touchkioModalDisplay: updatedDisplay });
        }
      }
    }, 1000);
  }

  handleMqttBrightnessCommandModal = async (hostname, brightness) => {
    await this.handleMqttBrightnessCommand(hostname, brightness);
    this.setState({
      touchkioModalMessage: \`Brightness set to \${brightness}\`,
      touchkioModalMessageType: 'success'
    });
  }

  handleMqttKioskCommandModal = async (hostname, status) => {
    await this.handleMqttKioskCommand(hostname, status);
    this.setState({
      touchkioModalMessage: \`Kiosk mode set to \${status}\`,
      touchkioModalMessageType: 'success'
    });
    setTimeout(() => {
      this.handleLoadMqttDisplays();
      if (this.state.touchkioModalDisplay) {
        const updatedDisplay = this.state.mqttDisplays.find(d => d.hostname === hostname);
        if (updatedDisplay) {
          this.setState({ touchkioModalDisplay: updatedDisplay });
        }
      }
    }, 1000);
  }

  handleMqttThemeCommandModal = async (hostname, theme) => {
    await this.handleMqttThemeCommand(hostname, theme);
    this.setState({
      touchkioModalMessage: \`Theme set to \${theme}\`,
      touchkioModalMessageType: 'success'
    });
    setTimeout(() => {
      this.handleLoadMqttDisplays();
      if (this.state.touchkioModalDisplay) {
        const updatedDisplay = this.state.mqttDisplays.find(d => d.hostname === hostname);
        if (updatedDisplay) {
          this.setState({ touchkioModalDisplay: updatedDisplay });
        }
      }
    }, 1000);
  }

  handleMqttVolumeCommandModal = async (hostname, volume) => {
    await this.handleMqttVolumeCommand(hostname, volume);
    this.setState({
      touchkioModalMessage: \`Volume set to \${volume}%\`,
      touchkioModalMessageType: 'success'
    });
  }

  handleMqttPageZoomCommandModal = async (hostname, zoom) => {
    await this.handleMqttPageZoomCommand(hostname, zoom);
    this.setState({
      touchkioModalMessage: \`Page zoom set to \${zoom}%\`,
      touchkioModalMessageType: 'success'
    });
  }

  handleMqttRefreshCommandModal = async (hostname) => {
    await this.handleMqttRefreshCommand(hostname);
    this.setState({
      touchkioModalMessage: 'Refresh command sent',
      touchkioModalMessageType: 'success'
    });
  }

  handleMqttRebootCommandModal = async (hostname) => {
    await this.handleMqttRebootCommand(hostname);
    this.setState({
      touchkioModalMessage: 'Reboot command sent',
      touchkioModalMessageType: 'warning'
    });
  }

  handleMqttShutdownCommandModal = async (hostname) => {
    await this.handleMqttShutdownCommand(hostname);
    this.setState({
      touchkioModalMessage: 'Shutdown command sent',
      touchkioModalMessageType: 'warning'
    });
  }`;

if (content.includes(handlerSearch) && !content.includes('handleOpenTouchkioModal')) {
  content = content.replace(handlerSearch, handlerSearch + modalHandlers);
  console.log('✅ Added Modal handler functions');
} else {
  console.log('⚠️  Modal handlers already exist or shutdown handler not found');
}

// Schreibe die Datei
fs.writeFileSync(adminFilePath, content, 'utf8');

console.log('✅ Successfully patched Touchkio Modal Handlers!');
console.log('');
console.log('Next step: Rebuild React app');
console.log('  cd ui-react && npm run build');
