const STORAGE_KEY = 'meeteasier_display_client_id';

function generateClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  const random = Math.random().toString(36).slice(2, 10);
  return `client-${Date.now()}-${random}`;
}

function generateSessionId() {
  // Generate a unique ID for this browser tab/window session
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  const random = Math.random().toString(36).slice(2, 10);
  return `session-${Date.now()}-${random}`;
}

export function getDisplayClientId() {
  try {
    // Check if we already have a session ID for this tab
    const sessionKey = 'meeteasier_session_id';
    let sessionId = sessionStorage.getItem(sessionKey);
    
    if (!sessionId) {
      // Generate a new session ID for this tab
      sessionId = generateSessionId();
      sessionStorage.setItem(sessionKey, sessionId);
    }

    // Get or create the base client ID (shared across tabs from same browser)
    let baseClientId = localStorage.getItem(STORAGE_KEY);
    if (!baseClientId || !/^[a-zA-Z0-9._:-]{3,120}$/.test(baseClientId)) {
      baseClientId = generateClientId();
      localStorage.setItem(STORAGE_KEY, baseClientId);
    }

    // Combine base client ID with session ID to make it unique per tab
    const uniqueClientId = `${baseClientId}_${sessionId}`;
    return uniqueClientId;
  } catch (error) {
    // Fallback if storage is not available
    return generateClientId();
  }
}
