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
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9._:-]{3,120}$/.test(existing)) {
      return existing;
    }

    const next = generateClientId();
    localStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch (error) {
    return generateClientId();
  }
}
