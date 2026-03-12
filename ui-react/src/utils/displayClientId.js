/**
 * Generate display client ID
 * 
 * IMPORTANT: The actual client identifier used for tracking is determined by the server
 * based on the tracking mode (client-id vs ip-room). This function generates a temporary
 * ID that will be sent to the server via socket connection query parameters.
 * 
 * The server will:
 * - In client-id mode: Use this displayClientId directly
 * - In ip-room mode: Generate identifier as {IP}_{roomName} from socket connection
 * 
 * For power management and other server-side features, the server-generated identifier
 * is what matters, not this client-side ID.
 */

const STORAGE_KEY = 'meeteasier_display_client_id';

function generateClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  const random = Math.random().toString(36).slice(2, 10);
  return `client-${Date.now()}-${random}`;
}

export function getDisplayClientId() {
  try {
    // Get or create a persistent client ID for this browser
    let clientId = localStorage.getItem(STORAGE_KEY);
    if (!clientId || !/^[a-zA-Z0-9._:-]{3,120}$/.test(clientId)) {
      clientId = generateClientId();
      localStorage.setItem(STORAGE_KEY, clientId);
    }
    return clientId;
  } catch (error) {
    // Fallback if storage is not available
    return generateClientId();
  }
}
