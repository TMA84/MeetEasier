import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ConnectionMonitor from './connection-monitor';

describe('ConnectionMonitor coverage', () => {
  let monitor;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'addEventListener').mockImplementation(() => {});
    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});
    vi.spyOn(document, 'addEventListener').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    if (monitor) {
      monitor.destroy();
      monitor = null;
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('handleOnline - auto-reload after long offline', () => {
    it('triggers auto-reload when offline for more than 30 seconds', () => {
      monitor = new ConnectionMonitor();
      monitor.isOnline = false;
      monitor.lastOnlineTime = Date.now() - 60000; // 60 seconds ago
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      });
      monitor.handleOnline();
      // Advance timer to trigger the setTimeout
      vi.advanceTimersByTime(1500);
      expect(reloadSpy).toHaveBeenCalled();
    });

    it('does not auto-reload when offline for less than 30 seconds', () => {
      monitor = new ConnectionMonitor();
      monitor.isOnline = false;
      monitor.lastOnlineTime = Date.now() - 5000; // 5 seconds ago
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      });
      monitor.handleOnline();
      vi.advanceTimersByTime(1500);
      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it('does not auto-reload when was already online', () => {
      monitor = new ConnectionMonitor();
      monitor.isOnline = true; // already online
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      });
      monitor.handleOnline();
      vi.advanceTimersByTime(1500);
      expect(reloadSpy).not.toHaveBeenCalled();
    });
  });

  describe('visibility change handler', () => {
    it('checks connection when tab becomes visible and offline', () => {
      let visibilityHandler;
      document.addEventListener.mockImplementation((event, handler) => {
        if (event === 'visibilitychange') visibilityHandler = handler;
      });
      monitor = new ConnectionMonitor();
      monitor.isOnline = false;
      // Simulate tab becoming visible
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      if (visibilityHandler) visibilityHandler();
      // checkConnection should have been called (fetch called)
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('periodic checking', () => {
    it('calls checkConnection on interval', async () => {
      monitor = new ConnectionMonitor({ checkInterval: 1000 });
      const checkSpy = vi.spyOn(monitor, 'checkConnection');
      vi.advanceTimersByTime(1000);
      expect(checkSpy).toHaveBeenCalled();
    });
  });

  describe('checkConnection - resets retryCount on success', () => {
    it('resets retryCount to 0 on successful check', async () => {
      monitor = new ConnectionMonitor();
      monitor.retryCount = 5;
      monitor.isOnline = true;
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      await monitor.checkConnection();
      expect(monitor.retryCount).toBe(0);
    });
  });

  describe('handleOffline - increments without re-notifying', () => {
    it('increments retryCount when already offline', () => {
      monitor = new ConnectionMonitor();
      monitor.isOnline = false;
      monitor.retryCount = 3;
      monitor.handleOffline();
      expect(monitor.retryCount).toBe(4);
    });
  });
});
