/**
 * @file useAdminIntervals.js
 * @description Hook for managing sync status, config refresh, and display auto-refresh intervals.
 */
import { useEffect, useRef, useCallback } from 'react';

/**
 * @param {boolean} isAuthenticated
 * @param {Function} loadSyncStatus
 * @param {Function} loadConfigLocks
 * @param {Function} updateConfig - for syncStatusTick updates
 */
export function useAdminIntervals(isAuthenticated, loadSyncStatus, loadConfigLocks, updateConfig) {
  const syncStatusIntervalRef = useRef(null);
  const syncStatusClockRef = useRef(null);
  const configRefreshIntervalRef = useRef(null);
  const connectedDisplaysIntervalRef = useRef(null);

  const startSyncIntervals = useCallback(() => {
    if (!syncStatusIntervalRef.current) {
      syncStatusIntervalRef.current = setInterval(() => loadSyncStatus(), 30000);
    }
    if (!syncStatusClockRef.current) {
      syncStatusClockRef.current = setInterval(() => updateConfig({ syncStatusTick: Date.now() }), 1000);
    }
    if (!configRefreshIntervalRef.current) {
      configRefreshIntervalRef.current = setInterval(() => loadConfigLocks(), 5000);
    }
  }, [loadSyncStatus, loadConfigLocks, updateConfig]);

  const clearAllIntervals = useCallback(() => {
    if (syncStatusIntervalRef.current) { clearInterval(syncStatusIntervalRef.current); syncStatusIntervalRef.current = null; }
    if (syncStatusClockRef.current) { clearInterval(syncStatusClockRef.current); syncStatusClockRef.current = null; }
    if (configRefreshIntervalRef.current) { clearInterval(configRefreshIntervalRef.current); configRefreshIntervalRef.current = null; }
    if (connectedDisplaysIntervalRef.current) { clearInterval(connectedDisplaysIntervalRef.current); connectedDisplaysIntervalRef.current = null; }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAllIntervals();
  }, [clearAllIntervals]);

  return {
    startSyncIntervals,
    clearAllIntervals,
    connectedDisplaysIntervalRef
  };
}
