/**
 * @file useAdminAuth.js
 * @description Hook for admin authentication state and handlers.
 */
import { useState, useCallback, useRef } from 'react';
import { getCsrfToken } from '../services/admin-api.js';
import { verifyAdminSession, loadBootstrapStatus } from '../services/admin-config-loader.js';

/**
 * Custom hook for admin authentication.
 * @param {Function} getTranslations - Returns current translation strings
 * @param {Object} callbacks - Post-auth callbacks
 * @param {Function} callbacks.onLoginSuccess - Called after successful login
 * @param {Function} callbacks.onLogout - Called on logout
 * @returns {{ state, handlers, getRequestHeaders }}
 */
export function useAdminAuth(getTranslations, callbacks) {
  const [apiToken, setApiToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authMessage, setAuthMessage] = useState(null);
  const [authMessageType, setAuthMessageType] = useState(null);
  const [requiresInitialTokenSetup, setRequiresInitialTokenSetup] = useState(false);
  const [initialTokenSetupLockedByEnv, setInitialTokenSetupLockedByEnv] = useState(false);

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const getRequestHeaders = useCallback((includeContentType = true) => {
    const headers = {};
    if (includeContentType) headers['Content-Type'] = 'application/json';
    const csrfToken = getCsrfToken();
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
    return headers;
  }, []);

  const clearAuth = useCallback(() => {
    setApiToken('');
    setIsAuthenticated(false);
    setAuthChecking(false);
    setAuthMessage(null);
    setAuthMessageType(null);
  }, []);

  const loadAdminBootstrapStatus = useCallback(() => {
    return loadBootstrapStatus()
      .then(r => {
        if (r.ok && r.data) {
          setRequiresInitialTokenSetup(!!r.data.requiresSetup);
          setInitialTokenSetupLockedByEnv(!!r.data.lockedByEnv);
        }
      })
      .catch(() => {});
  }, []);

  const handleUnauthorizedAccess = useCallback(() => {
    const t = getTranslations();
    callbacksRef.current?.onLogout?.();
    setApiToken('');
    setIsAuthenticated(false);
    setAuthChecking(false);
    setAuthMessage(t.errorUnauthorized);
    setAuthMessageType('error');
  }, [getTranslations]);

  const handleAdminLogin = useCallback((e) => {
    e.preventDefault();
    const t = getTranslations();
    const token = String(apiToken || '').trim();
    if (!token) {
      setAuthMessage(t.errorUnauthorized);
      setAuthMessageType('error');
      return;
    }
    setAuthChecking(true);
    setAuthMessage(null);
    setAuthMessageType(null);

    const completeLoginSuccess = () => {
      setApiToken('');
      setIsAuthenticated(true);
      setAuthChecking(false);
      setAuthMessage(null);
      setAuthMessageType(null);
      callbacksRef.current?.onLoginSuccess?.();
    };

    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then(async (response) => {
        if (response.status === 428) {
          const bootstrapResponse = await fetch('/api/admin/bootstrap-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
          });
          if (!bootstrapResponse.ok) {
            const errorPayload = await bootstrapResponse.json().catch(() => ({}));
            throw new Error(errorPayload?.message || errorPayload?.error || t.errorUnauthorized);
          }
          completeLoginSuccess();
          return;
        }
        if (response.status === 401) throw new Error(t.errorUnauthorized);
        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload?.message || errorPayload?.error || t.errorUnknown || 'Login failed');
        }
        completeLoginSuccess();
      })
      .catch((error) => {
        setIsAuthenticated(false);
        setAuthChecking(false);
        setAuthMessage(error?.message || t.errorUnauthorized);
        setAuthMessageType('error');
      });
  }, [apiToken, getTranslations]);

  const handleAdminLogout = useCallback(() => {
    fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    callbacksRef.current?.onLogout?.();
    setApiToken('');
    setIsAuthenticated(false);
    setAuthChecking(false);
    setAuthMessage(null);
    setAuthMessageType(null);
  }, []);

  const verifySession = useCallback(() => {
    return verifyAdminSession()
      .then((valid) => {
        if (!valid) {
          loadAdminBootstrapStatus().finally(() => clearAuth());
          return false;
        }
        setApiToken('');
        setIsAuthenticated(true);
        setAuthChecking(false);
        setAuthMessage(null);
        setAuthMessageType(null);
        return true;
      })
      .catch(() => {
        loadAdminBootstrapStatus().finally(() => clearAuth());
        return false;
      });
  }, [clearAuth, loadAdminBootstrapStatus]);

  return {
    state: {
      apiToken, isAuthenticated, authChecking, authMessage, authMessageType,
      requiresInitialTokenSetup, initialTokenSetupLockedByEnv
    },
    setApiToken,
    getRequestHeaders,
    handleAdminLogin,
    handleAdminLogout,
    handleUnauthorizedAccess,
    verifySession,
    loadAdminBootstrapStatus
  };
}
