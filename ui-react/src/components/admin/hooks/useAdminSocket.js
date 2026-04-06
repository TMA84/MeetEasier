/**
 * @file useAdminSocket.js
 * @description Hook for Socket.IO real-time config update broadcasts.
 */
import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

/**
 * @param {boolean} isAuthenticated
 * @param {Function} loadCurrentConfig
 * @param {Function} loadConfigLocks
 * @param {Function} loadConnectedClients
 */
export function useAdminSocket(isAuthenticated, loadCurrentConfig, loadConfigLocks, loadConnectedClients) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (socketRef.current) return;

    const socket = io({ transports: ['websocket'] });
    socketRef.current = socket;

    if (!socket || !socket.on) return;

    const refreshConfig = () => { loadCurrentConfig(); loadConfigLocks(); };
    const events = [
      'wifiConfigUpdated', 'logoConfigUpdated', 'sidebarConfigUpdated', 'bookingConfigUpdated',
      'maintenanceConfigUpdated', 'i18nConfigUpdated', 'colorsConfigUpdated', 'searchConfigUpdated',
      'rateLimitConfigUpdated', 'oauthConfigUpdated', 'systemConfigUpdated', 'translationApiConfigUpdated',
      'apiTokenUpdated', 'wifiApiTokenUpdated'
    ];
    events.forEach(evt => socket.on(evt, refreshConfig));
    socket.on('connectedClientsUpdated', () => loadConnectedClients());

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, loadCurrentConfig, loadConfigLocks, loadConnectedClients]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return socketRef;
}
