/**
 * MQTT Client Module
 * Connects to external MQTT broker (e.g., Mosquitto) for Touchkio display control
 */

const mqtt = require('mqtt');
const configManager = require('./config-manager');

let mqttClient = null;
let isConnected = false;
let subscribedTopics = new Set();
let messageHandlers = new Map();
let connectCallbacks = [];

/**
 * Initialize MQTT Client
 */
function init() {
  const mqttConfig = configManager.getMqttConfig();
  
  if (!mqttConfig.enabled) {
    console.log('[MQTT] Client disabled in configuration');
    return;
  }

  try {
    const brokerUrl = mqttConfig.brokerUrl || 'mqtt://localhost:1883';
    
    const options = {
      clientId: 'meeteasier_' + Math.random().toString(16).substr(2, 8),
      clean: true,
      connectTimeout: 30000,
      reconnectPeriod: 5000
    };

    // Add authentication if enabled
    if (mqttConfig.authentication && mqttConfig.username) {
      options.username = mqttConfig.username;
      options.password = mqttConfig.password || '';
    }

    console.log(`[MQTT] Connecting to broker: ${brokerUrl}`);
    mqttClient = mqtt.connect(brokerUrl, options);

    // Setup event handlers
    setupEventHandlers();

  } catch (error) {
    console.error('[MQTT] Failed to connect to broker:', error);
    isConnected = false;
  }
}

/**
 * Register callback for when connected
 */
function onConnect(callback) {
  if (isConnected) {
    callback();
  } else {
    connectCallbacks.push(callback);
  }
}

/**
 * Setup MQTT event handlers
 */
function setupEventHandlers() {
  // Connected
  mqttClient.on('connect', () => {
    console.log('[MQTT] Connected to broker');
    isConnected = true;
    
    // Call all connect callbacks
    connectCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[MQTT] Connect callback error:', error);
      }
    });
    connectCallbacks = [];
    
    // Resubscribe to all topics
    subscribedTopics.forEach(topic => {
      mqttClient.subscribe(topic, (err) => {
        if (err) {
          console.error(`[MQTT] Failed to resubscribe to ${topic}:`, err);
        } else {
          console.log(`[MQTT] Resubscribed to ${topic}`);
        }
      });
    });
  });

  // Disconnected
  mqttClient.on('disconnect', () => {
    console.log('[MQTT] Disconnected from broker');
    isConnected = false;
  });

  // Error
  mqttClient.on('error', (error) => {
    console.error('[MQTT] Connection error:', error.message);
    isConnected = false;
  });

  // Reconnecting
  mqttClient.on('reconnect', () => {
    console.log('[MQTT] Reconnecting to broker...');
  });

  // Message received
  mqttClient.on('message', (topic, message) => {
    // Check all subscribed topics (including wildcards)
    subscribedTopics.forEach(subscribedTopic => {
      // Convert MQTT wildcard to regex
      const pattern = subscribedTopic
        .replace(/\+/g, '[^/]+')  // + matches single level
        .replace(/#/g, '.*');      // # matches multiple levels
      const regex = new RegExp(`^${pattern}$`);
      
      if (regex.test(topic)) {
        const handlers = messageHandlers.get(subscribedTopic) || [];
        handlers.forEach(handler => {
          try {
            handler(message.toString(), { topic });
          } catch (error) {
            console.error(`[MQTT] Handler error for topic ${subscribedTopic}:`, error);
          }
        });
      }
    });
  });

  // Offline
  mqttClient.on('offline', () => {
    console.log('[MQTT] Client is offline');
    isConnected = false;
  });
}

/**
 * Publish message to MQTT topic
 */
function publish(topic, payload, options = {}) {
  if (!isConnected || !mqttClient) {
    console.warn('[MQTT] Not connected to broker, cannot publish');
    return false;
  }

  try {
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    mqttClient.publish(topic, message, {
      qos: options.qos || 0,
      retain: options.retain || false
    }, (error) => {
      if (error) {
        console.error(`[MQTT] Publish error on topic ${topic}:`, error);
      } else {
        console.log(`[MQTT] Published to ${topic}: ${message.substring(0, 100)}`);
      }
    });

    return true;
  } catch (error) {
    console.error('[MQTT] Publish failed:', error);
    return false;
  }
}

/**
 * Subscribe to MQTT topic
 */
function subscribe(topic, callback) {
  if (!mqttClient) {
    console.warn('[MQTT] Client not initialized, cannot subscribe');
    return null;
  }

  // Add to subscribed topics
  subscribedTopics.add(topic);

  // Add handler
  if (!messageHandlers.has(topic)) {
    messageHandlers.set(topic, []);
  }
  messageHandlers.get(topic).push(callback);

  // Subscribe if connected
  if (isConnected) {
    mqttClient.subscribe(topic, (err) => {
      if (err) {
        console.error(`[MQTT] Failed to subscribe to ${topic}:`, err);
      } else {
        console.log(`[MQTT] Subscribed to ${topic}`);
      }
    });
  }

  return topic;
}

/**
 * Unsubscribe from MQTT topic
 */
function unsubscribe(topic) {
  if (!mqttClient) {
    return;
  }

  subscribedTopics.delete(topic);
  messageHandlers.delete(topic);

  if (isConnected) {
    mqttClient.unsubscribe(topic, (err) => {
      if (err) {
        console.error(`[MQTT] Failed to unsubscribe from ${topic}:`, err);
      } else {
        console.log(`[MQTT] Unsubscribed from ${topic}`);
      }
    });
  }
}

/**
 * Get client status
 */
function getStatus() {
  const mqttConfig = configManager.getMqttConfig();
  return {
    enabled: mqttConfig.enabled,
    connected: isConnected,
    subscribedTopics: Array.from(subscribedTopics),
    brokerUrl: mqttConfig.brokerUrl || null
  };
}

/**
 * Get connected clients (not applicable for client mode)
 */
function getConnectedClients() {
  return [];
}

/**
 * Stop MQTT Client
 */
function stop() {
  if (!mqttClient) {
    return;
  }

  console.log('[MQTT] Disconnecting from broker...');

  mqttClient.end(false, () => {
    console.log('[MQTT] Client disconnected');
  });

  isConnected = false;
  subscribedTopics.clear();
  messageHandlers.clear();
  mqttClient = null;
}

/**
 * Restart MQTT Client
 */
function restart() {
  stop();
  setTimeout(() => {
    init();
  }, 1000);
}

module.exports = {
  init,
  onConnect,
  publish,
  subscribe,
  unsubscribe,
  getStatus,
  getConnectedClients,
  stop,
  restart
};
