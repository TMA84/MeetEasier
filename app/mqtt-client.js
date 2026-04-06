/**
* @file mqtt-client.js
* @description MQTT client for communication with Touchkio displays.
*
* This module establishes a connection to an external MQTT broker (e.g. Mosquitto)
* and provides an abstraction layer for publish/subscribe operations.
* It is primarily used for controlling Touchkio displays.
*
* Main features:
* - Connection setup and management with automatic reconnect
* - Publish/subscribe API with wildcard support (+ and #)
* - Message forwarding to registered handlers
* - Optional authentication with the MQTT broker
* - Automatic re-subscribe after connection loss
*
* @requires mqtt - MQTT.js client library
* @requires ./config-manager - Central configuration management
*/

const mqtt = require('mqtt');
const configManager = require('./config-manager');

/** @type {mqtt.MqttClient|null} The active MQTT client instance */
let mqttClient = null;
/** @type {boolean} Current connection status to the broker */
let isConnected = false;
/** @type {Set<string>} Set of all subscribed MQTT topics (including wildcards) */
let subscribedTopics = new Set();
/** @type {Map<string, Array<Function>>} Mapping of topics to their message handlers */
let messageHandlers = new Map();
/** @type {Array<Function>} Queue of callbacks to be invoked upon successful connection */
let connectCallbacks = [];
/** @type {Set<string>} Topics that should receive raw Buffer instead of string */
let binaryTopics = new Set();

/**
* Initializes the MQTT client and establishes the connection to the broker.
* Reads the configuration from the config manager and sets up the connection
* with optional authentication. Aborts if MQTT is disabled.
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

    // Set up event handlers
    setupEventHandlers();

  } catch (error) {
    console.error('[MQTT] Failed to connect to broker:', error);
    isConnected = false;
  }
}

/**
* Registers a callback to be invoked upon successful connection.
* Executes immediately if a connection already exists.
* @param {Function} callback - The function to call
*/
function onConnect(callback) {
  if (isConnected) {
    callback();
  } else {
    connectCallbacks.push(callback);
  }
}

/**
* Sets up all MQTT event handlers (connect, disconnect, error, message, etc.).
* Manages the connection status, executes connect callbacks, and forwards
* incoming messages to the registered handlers.
* Supports MQTT wildcards (+ for single level, # for multiple levels).
*/
function setupEventHandlers() {
  // Connection established
  mqttClient.on('connect', () => {
    console.log('[MQTT] Connected to broker');
    isConnected = true;
    
    // Execute all connect callbacks
    connectCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[MQTT] Connect callback error:', error);
      }
    });
    connectCallbacks = [];
    
    // Resubscribe to all topics (after reconnect)
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

  // Connection lost
  mqttClient.on('disconnect', () => {
    console.log('[MQTT] Disconnected from broker');
    isConnected = false;
  });

  // Connection error
  mqttClient.on('error', (error) => {
    console.error('[MQTT] Connection error:', error.message);
    isConnected = false;
  });

  // Reconnection attempt
  mqttClient.on('reconnect', () => {
    console.log('[MQTT] Reconnecting to broker...');
  });

  // Message received
  mqttClient.on('message', (topic, message) => {
    // Check all subscribed topics (including wildcards)
    subscribedTopics.forEach(subscribedTopic => {
      // Convert MQTT wildcard to regex
      const pattern = subscribedTopic
        .replace(/\+/g, '[^/]+')  // + matches a single level
        .replace(/#/g, '.*');      // # matches multiple levels
      const regex = new RegExp(`^${pattern}$`);
      
      if (regex.test(topic)) {
        const handlers = messageHandlers.get(subscribedTopic) || [];
        handlers.forEach(handler => {
          try {
            // Pass raw buffer for binary topics, string for everything else
            const isBinary = binaryTopics.has(subscribedTopic);
            handler(isBinary ? message : message.toString(), { topic });
          } catch (error) {
            console.error(`[MQTT] Handler error for topic ${subscribedTopic}:`, error);
          }
        });
      }
    });
  });

  // Client offline
  mqttClient.on('offline', () => {
    console.log('[MQTT] Client is offline');
    isConnected = false;
  });
}

/**
* Publishes a message to an MQTT topic.
* Automatically converts non-string payloads to JSON.
* @param {string} topic - The target topic
* @param {string|Object} payload - The message to send (string or object)
* @param {Object} [options={}] - Optional MQTT publish options
* @param {number} [options.qos=0] - Quality of Service (0, 1, or 2)
* @param {boolean} [options.retain=false] - Store message as retained message
* @returns {boolean} true if the message was sent successfully
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
* Subscribes to an MQTT topic and registers a message handler.
* Supports MQTT wildcards (+ and #). Multiple handlers per topic are possible.
* The topic is also queued when no connection exists yet and will be
* automatically subscribed once the connection is established.
* @param {string} topic - The topic to subscribe to (with optional wildcards)
* @param {Function} callback - Handler function, called with (message, {topic})
* @returns {string|null} The subscribed topic or null on error
*/
function subscribe(topic, callback) {
  if (!mqttClient) {
    console.warn('[MQTT] Client not initialized, cannot subscribe');
    return null;
  }

  // Add topic to the list of subscribed topics
  subscribedTopics.add(topic);

  // Register handler
  if (!messageHandlers.has(topic)) {
    messageHandlers.set(topic, []);
  }
  messageHandlers.get(topic).push(callback);

  // Subscribe immediately if already connected
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
* Subscribes to an MQTT topic for binary payloads (e.g. images).
* Same as subscribe() but the handler receives a raw Buffer instead of a string.
* @param {string} topic - The topic to subscribe to (with optional wildcards)
* @param {Function} callback - Handler function, called with (Buffer, {topic})
* @returns {string|null} The subscribed topic or null on error
*/
function subscribeBinary(topic, callback) {
  binaryTopics.add(topic);
  return subscribe(topic, callback);
}

/**
* Unsubscribes from an MQTT topic and removes all associated handlers.
* @param {string} topic - The topic to unsubscribe from
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
* Returns the current status of the MQTT client.
* Contains connection status, subscribed topics, and broker URL.
* @returns {Object} Status object with enabled, connected, subscribedTopics, and brokerUrl
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
* Returns connected clients (not applicable in client mode).
* This function exists for API compatibility and always returns an empty array.
* @returns {Array} Always an empty array
*/
function getConnectedClients() {
  return [];
}

/**
* Stops the MQTT client and disconnects from the broker.
* Cleans up all subscribed topics, handlers, and the client instance.
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
  binaryTopics.clear();
  mqttClient = null;
}

/**
* Restarts the MQTT client.
* Stops the current client and initializes a new connection after a short delay
* (1 second).
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
  subscribeBinary,
  unsubscribe,
  getStatus,
  getConnectedClients,
  stop,
  restart
};
