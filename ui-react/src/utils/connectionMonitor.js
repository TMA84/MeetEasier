/**
 * Connection Monitor
 * Monitors network connectivity and automatically reloads the page when connection is restored
 */

class ConnectionMonitor {
  constructor(options = {}) {
    this.isOnline = navigator.onLine;
    this.checkInterval = options.checkInterval || 5000; // 5 seconds
    this.maxRetries = options.maxRetries || 60; // 5 minutes
    this.retryCount = 0;
    this.checkTimer = null;
    this.listeners = [];
    this.lastOnlineTime = Date.now();
    
    this.init();
  }

  init() {
    // Listen to browser online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Listen to visibility change (tab becomes active)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.isOnline) {
        this.checkConnection();
      }
    });

    // Start periodic connection checks
    this.startChecking();
  }

  startChecking() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    this.checkTimer = setInterval(() => {
      this.checkConnection();
    }, this.checkInterval);
  }

  stopChecking() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  async checkConnection() {
    try {
      // Try to fetch a small resource from the server
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        if (!this.isOnline) {
          this.handleOnline();
        }
        this.retryCount = 0;
        return true;
      } else {
        this.handleOffline();
        return false;
      }
    } catch (error) {
      this.handleOffline();
      return false;
    }
  }

  handleOnline() {
    const wasOffline = !this.isOnline;
    this.isOnline = true;
    this.retryCount = 0;

    console.log('[ConnectionMonitor] Connection restored');
    this.notifyListeners('online');

    // Auto-reload if we were offline for more than 30 seconds
    if (wasOffline && (Date.now() - this.lastOnlineTime) > 30000) {
      console.log('[ConnectionMonitor] Auto-reloading page after reconnection');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }

    this.lastOnlineTime = Date.now();
  }

  handleOffline() {
    if (this.isOnline) {
      console.log('[ConnectionMonitor] Connection lost');
      this.isOnline = false;
      this.notifyListeners('offline');
    }

    this.retryCount++;

    if (this.retryCount >= this.maxRetries) {
      console.log('[ConnectionMonitor] Max retries reached');
      this.notifyListeners('maxRetries');
      this.stopChecking();
    }
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback({ type: event, isOnline: this.isOnline, retryCount: this.retryCount });
      } catch (error) {
        console.error('[ConnectionMonitor] Listener error:', error);
      }
    });
  }

  getStatus() {
    return {
      isOnline: this.isOnline,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries
    };
  }

  destroy() {
    this.stopChecking();
    this.listeners = [];
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}

// Create singleton instance
let monitorInstance = null;

export function getConnectionMonitor(options) {
  if (!monitorInstance) {
    monitorInstance = new ConnectionMonitor(options);
  }
  return monitorInstance;
}

export default ConnectionMonitor;
