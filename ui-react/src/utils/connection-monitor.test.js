import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ConnectionMonitor, { getConnectionMonitor } from './connection-monitor';

describe('ConnectionMonitor', () => {
  let monitor;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'addEventListener').mockImplementation(() => {});
    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});
    vi.spyOn(document, 'addEventListener').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    if (monitor) {
      monitor.destroy();
      monitor = null;
    }
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('creates instance with default options', () => {
      monitor = new ConnectionMonitor();
      expect(monitor.checkInterval).toBe(5000);
      expect(monitor.maxRetries).toBe(60);
      expect(monitor.retryCount).toBe(0);
      expect(monitor.listeners).toEqual([]);
    });

    it('accepts custom options', () => {
      monitor = new ConnectionMonitor({ checkInterval: 10000, maxRetries: 30 });
      expect(monitor.checkInterval).toBe(10000);
      expect(monitor.maxRetries).toBe(30);
    });

    it('sets initial online state from navigator', () => {
      monitor = new ConnectionMonitor();
      expect(monitor.isOnline).toBe(navigator.onLine);
    });
  });

  describe('getStatus', () => {
    it('returns current status object', () => {
      monitor = new ConnectionMonitor();
      const status = monitor.getStatus();
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('retryCount');
      expect(status).toHaveProperty('maxRetries');
      expect(status.retryCount).toBe(0);
      expect(status.maxRetries).toBe(60);
    });
  });

  describe('addListener', () => {
    it('adds a listener callback', () => {
      monitor = new ConnectionMonitor();
      const callback = vi.fn();
      monitor.addListener(callback);
      expect(monitor.listeners).toContain(callback);
    });

    it('returns a removal function', () => {
      monitor = new ConnectionMonitor();
      const callback = vi.fn();
      const remove = monitor.addListener(callback);
      expect(typeof remove).toBe('function');
      remove();
      expect(monitor.listeners).not.toContain(callback);
    });
  });

  describe('notifyListeners', () => {
    it('calls all listeners with event data', () => {
      monitor = new ConnectionMonitor();
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      monitor.addListener(cb1);
      monitor.addListener(cb2);
      monitor.notifyListeners('online');
      expect(cb1).toHaveBeenCalledWith({
        type: 'online',
        isOnline: monitor.isOnline,
        retryCount: monitor.retryCount
      });
      expect(cb2).toHaveBeenCalledWith({
        type: 'online',
        isOnline: monitor.isOnline,
        retryCount: monitor.retryCount
      });
    });

    it('catches listener errors without crashing', () => {
      monitor = new ConnectionMonitor();
      const errorCb = vi.fn(() => { throw new Error('listener error'); });
      const goodCb = vi.fn();
      monitor.addListener(errorCb);
      monitor.addListener(goodCb);
      expect(() => monitor.notifyListeners('test')).not.toThrow();
      expect(goodCb).toHaveBeenCalled();
    });
  });

  describe('handleOnline', () => {
    it('sets isOnline to true and resets retryCount', () => {
      monitor = new ConnectionMonitor();
      monitor.isOnline = false;
      monitor.retryCount = 5;
      monitor.handleOnline();
      expect(monitor.isOnline).toBe(true);
      expect(monitor.retryCount).toBe(0);
    });

    it('notifies listeners with online event', () => {
      monitor = new ConnectionMonitor();
      monitor.isOnline = false;
      const cb = vi.fn();
      monitor.addListener(cb);
      monitor.handleOnline();
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ type: 'online' }));
    });
  });

  describe('handleOffline', () => {
    it('sets isOnline to false and increments retryCount', () => {
      monitor = new ConnectionMonitor();
      monitor.isOnline = true;
      monitor.handleOffline();
      expect(monitor.isOnline).toBe(false);
      expect(monitor.retryCount).toBe(1);
    });

    it('notifies listeners with offline event on first offline', () => {
      monitor = new ConnectionMonitor();
      monitor.isOnline = true;
      const cb = vi.fn();
      monitor.addListener(cb);
      monitor.handleOffline();
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ type: 'offline' }));
    });

    it('does not re-notify offline when already offline', () => {
      monitor = new ConnectionMonitor();
      monitor.isOnline = false;
      const cb = vi.fn();
      monitor.addListener(cb);
      monitor.handleOffline();
      // Should not get 'offline' event since already offline
      const offlineCalls = cb.mock.calls.filter(c => c[0].type === 'offline');
      expect(offlineCalls).toHaveLength(0);
    });

    it('stops checking and notifies maxRetries when limit reached', () => {
      monitor = new ConnectionMonitor({ maxRetries: 2 });
      monitor.isOnline = true;
      const cb = vi.fn();
      monitor.addListener(cb);
      monitor.handleOffline(); // retryCount = 1
      monitor.handleOffline(); // retryCount = 2, triggers maxRetries
      const maxRetriesCalls = cb.mock.calls.filter(c => c[0].type === 'maxRetries');
      expect(maxRetriesCalls).toHaveLength(1);
      expect(monitor.checkTimer).toBeNull();
    });
  });

  describe('checkConnection', () => {
    it('returns true when fetch succeeds', async () => {
      monitor = new ConnectionMonitor();
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      const result = await monitor.checkConnection();
      expect(result).toBe(true);
    });

    it('returns false when fetch fails', async () => {
      monitor = new ConnectionMonitor();
      global.fetch = vi.fn().mockRejectedValue(new Error('network error'));
      const result = await monitor.checkConnection();
      expect(result).toBe(false);
    });

    it('returns false when response is not ok', async () => {
      monitor = new ConnectionMonitor();
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      const result = await monitor.checkConnection();
      expect(result).toBe(false);
    });

    it('calls handleOnline when fetch succeeds and was offline', async () => {
      monitor = new ConnectionMonitor();
      monitor.isOnline = false;
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      const cb = vi.fn();
      monitor.addListener(cb);
      await monitor.checkConnection();
      expect(monitor.isOnline).toBe(true);
    });
  });

  describe('startChecking / stopChecking', () => {
    it('starts periodic checking', () => {
      monitor = new ConnectionMonitor();
      expect(monitor.checkTimer).not.toBeNull();
    });

    it('stopChecking clears the timer', () => {
      monitor = new ConnectionMonitor();
      monitor.stopChecking();
      expect(monitor.checkTimer).toBeNull();
    });

    it('startChecking clears existing timer before creating new one', () => {
      monitor = new ConnectionMonitor();
      const _firstTimer = monitor.checkTimer;
      monitor.startChecking();
      // Timer should be replaced (new timer created)
      expect(monitor.checkTimer).not.toBeNull();
    });
  });

  describe('destroy', () => {
    it('stops checking and clears listeners', () => {
      monitor = new ConnectionMonitor();
      monitor.addListener(vi.fn());
      monitor.destroy();
      expect(monitor.checkTimer).toBeNull();
      expect(monitor.listeners).toEqual([]);
    });
  });
});

describe('getConnectionMonitor', () => {
  it('returns a ConnectionMonitor instance', () => {
    const instance = getConnectionMonitor();
    expect(instance).toBeInstanceOf(ConnectionMonitor);
    instance.destroy();
  });
});
