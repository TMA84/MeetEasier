/**
 * @file memory-leak.test.js
 * @description Tests that verify proper cleanup of event listeners, timers,
 * and DOM elements to prevent memory leaks in long-running display clients.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ConnectionMonitor from './connection-monitor';
import PowerManagement from './power-management';

describe('Memory Leak Prevention', () => {

  // -----------------------------------------------------------------------
  // ConnectionMonitor
  // -----------------------------------------------------------------------
  describe('ConnectionMonitor – event listener cleanup', () => {
    let addSpy, removeSpy, docAddSpy, docRemoveSpy;

    beforeEach(() => {
      vi.useFakeTimers();
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      // Track real add/remove calls on window and document
      addSpy = vi.spyOn(window, 'addEventListener');
      removeSpy = vi.spyOn(window, 'removeEventListener');
      docAddSpy = vi.spyOn(document, 'addEventListener');
      docRemoveSpy = vi.spyOn(document, 'removeEventListener');
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('registers online, offline, and visibilitychange listeners on init', () => {
      const monitor = new ConnectionMonitor();

      const windowEvents = addSpy.mock.calls.map(c => c[0]);
      expect(windowEvents).toContain('online');
      expect(windowEvents).toContain('offline');

      const docEvents = docAddSpy.mock.calls.map(c => c[0]);
      expect(docEvents).toContain('visibilitychange');

      monitor.destroy();
    });

    it('removes the exact same handler references on destroy', () => {
      const monitor = new ConnectionMonitor();

      // Capture the handler references that were registered
      const onlineHandler = addSpy.mock.calls.find(c => c[0] === 'online')[1];
      const offlineHandler = addSpy.mock.calls.find(c => c[0] === 'offline')[1];
      const visibilityHandler = docAddSpy.mock.calls.find(c => c[0] === 'visibilitychange')[1];

      monitor.destroy();

      // Verify removeEventListener was called with the same references
      const removedWindow = removeSpy.mock.calls.map(c => [c[0], c[1]]);
      expect(removedWindow).toContainEqual(['online', onlineHandler]);
      expect(removedWindow).toContainEqual(['offline', offlineHandler]);

      const removedDoc = docRemoveSpy.mock.calls.map(c => [c[0], c[1]]);
      expect(removedDoc).toContainEqual(['visibilitychange', visibilityHandler]);
    });

    it('clears the interval timer on destroy', () => {
      const monitor = new ConnectionMonitor();
      expect(monitor.checkTimer).not.toBeNull();
      monitor.destroy();
      expect(monitor.checkTimer).toBeNull();
    });

    it('clears listener array on destroy to release references', () => {
      const monitor = new ConnectionMonitor();
      monitor.addListener(vi.fn());
      monitor.addListener(vi.fn());
      expect(monitor.listeners.length).toBe(2);
      monitor.destroy();
      expect(monitor.listeners.length).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // PowerManagement
  // -----------------------------------------------------------------------
  describe('PowerManagement – overlay and timer cleanup', () => {
    let pm;

    beforeEach(() => {
      vi.useFakeTimers();
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
      pm = new PowerManagement('test-display');
    });

    afterEach(() => {
      pm.destroy();
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('stores a removable click handler reference on the overlay', () => {
      pm.turnDisplayOff();
      expect(pm._overlayClickHandler).toBeTypeOf('function');
      expect(pm.overlayElement).not.toBeNull();
    });

    it('removes click handler when turning display back on', () => {
      pm.turnDisplayOff();
      const overlay = pm.overlayElement;
      const removeSpy = vi.spyOn(overlay, 'removeEventListener');

      pm.turnDisplayOn();

      expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function));
      expect(pm._overlayClickHandler).toBeNull();
      expect(pm.overlayElement).toBeNull();
    });

    it('removes click handler and overlay in destroy()', () => {
      pm.turnDisplayOff();
      const overlay = pm.overlayElement;
      const removeSpy = vi.spyOn(overlay, 'removeEventListener');

      pm.destroy();

      expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function));
      expect(pm.overlayElement).toBeNull();
      expect(pm._overlayClickHandler).toBeNull();
      expect(document.getElementById('power-management-overlay')).toBeNull();
    });

    it('clears schedule interval on destroy', () => {
      pm.config = { schedule: { enabled: true, startTime: '20:00', endTime: '07:00' } };
      pm.startScheduleCheck();
      expect(pm.checkInterval).not.toBeNull();

      pm.destroy();
      expect(pm.checkInterval).toBeNull();
    });

    it('does not leak overlays across multiple on/off cycles', () => {
      for (let i = 0; i < 10; i++) {
        pm.turnDisplayOff();
        pm.turnDisplayOn();
      }
      expect(document.querySelectorAll('#power-management-overlay').length).toBe(0);
      expect(pm.overlayElement).toBeNull();
      expect(pm._overlayClickHandler).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Socket.IO component (unit-level handler check)
  // -----------------------------------------------------------------------
  describe('Socket.js – event listener cleanup', () => {
    let mockSocket;

    beforeEach(() => {
      mockSocket = {
        on: vi.fn(),
        off: vi.fn(),
        close: vi.fn(),
        emit: vi.fn(),
        connected: true,
      };

      vi.doMock('socket.io-client', () => ({
        default: vi.fn(() => mockSocket),
      }));
    });

    afterEach(() => {
      vi.doUnmock('socket.io-client');
    });

    it('removes updatedRooms handler and closes socket on unmount', async () => {
      const { default: Socket } = await import('../components/global/Socket');
      const { render } = await import('@testing-library/react');
      const { createElement } = await import('react');

      const response = vi.fn();
      const { unmount: doUnmount } = render(createElement(Socket, { response }));

      // Verify handler was registered
      expect(mockSocket.on).toHaveBeenCalledWith('updatedRooms', expect.any(Function));
      const registeredHandler = mockSocket.on.mock.calls.find(c => c[0] === 'updatedRooms')[1];

      doUnmount();

      // Verify handler was removed with the same reference before close
      expect(mockSocket.off).toHaveBeenCalledWith('updatedRooms', registeredHandler);
      expect(mockSocket.close).toHaveBeenCalled();
    });
  });
});
