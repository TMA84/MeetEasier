/**
 * @file displayClientId.js
 * @description Generates and persists a unique display client ID in localStorage.
 * The server determines the actual tracking identifier based on its tracking mode
 * (client-id vs ip-room). This client-side ID is sent via socket connection query
 * parameters and used directly only in client-id mode; in ip-room mode the server
 * derives the identifier from the socket's IP address and room name.
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
