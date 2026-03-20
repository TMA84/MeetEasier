/** @file ConnectionStatus.js
 *  @description Network connection status indicator that listens to the connection monitor and displays an online/offline banner with retry count.
 */
import React, { useState, useEffect } from 'react';
import { getConnectionMonitor } from '../../utils/connectionMonitor';

const ConnectionStatus = () => {
  const [status, setStatus] = useState({
    isOnline: true,
    retryCount: 0,
    show: false
  });

  useEffect(() => {
    const monitor = getConnectionMonitor();

    const removeListener = monitor.addListener((event) => {
      if (event.type === 'offline') {
        setStatus({
          isOnline: false,
          retryCount: event.retryCount,
          show: true
        });
      } else if (event.type === 'online') {
        setStatus({
          isOnline: true,
          retryCount: 0,
          show: true
        });
        // Hide the status after 3 seconds
        setTimeout(() => {
          setStatus(prev => ({ ...prev, show: false }));
        }, 3000);
      } else if (event.type === 'maxRetries') {
        setStatus(prev => ({
          ...prev,
          retryCount: event.retryCount
        }));
      }
    });

    // Check initial status
    const initialStatus = monitor.getStatus();
    if (!initialStatus.isOnline) {
      setStatus({
        isOnline: false,
        retryCount: initialStatus.retryCount,
        show: true
      });
    }

    return () => {
      removeListener();
    };
  }, []);

  if (!status.show) {
    return null;
  }

  return (
    <div className={`connection-status ${status.isOnline ? 'online' : 'offline'}`}>
      <div className="connection-status-content">
        {status.isOnline ? (
          <>
            <span className="connection-icon">✓</span>
            <span className="connection-text">Verbunden</span>
          </>
        ) : (
          <>
            <span className="connection-icon">⚠</span>
            <span className="connection-text">
              Offline
              {status.retryCount > 0 && ` (${status.retryCount})`}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
