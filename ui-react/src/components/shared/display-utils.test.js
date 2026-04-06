import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMaintenanceStatus, createMaintenanceHandler, setupHeartbeat } from './display-utils';

describe('display-utils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchMaintenanceStatus', () => {
    it('fetches maintenance status and updates component state', async () => {
      const component = { setState: vi.fn() };
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ enabled: true, message: 'Maintenance' })
      });

      await fetchMaintenanceStatus(component);

      expect(component.setState).toHaveBeenCalledWith({
        maintenanceConfig: { enabled: true, message: 'Maintenance' }
      });
    });

    it('handles missing data fields gracefully', async () => {
      const component = { setState: vi.fn() };
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({})
      });

      await fetchMaintenanceStatus(component);

      expect(component.setState).toHaveBeenCalledWith({
        maintenanceConfig: { enabled: false, message: '' }
      });
    });

    it('handles fetch error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const component = { setState: vi.fn() };
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await fetchMaintenanceStatus(component);

      expect(consoleSpy).toHaveBeenCalled();
      expect(component.setState).not.toHaveBeenCalled();
    });
  });

  describe('createMaintenanceHandler', () => {
    it('returns a function that updates component state', () => {
      const component = { setState: vi.fn() };
      const handler = createMaintenanceHandler(component);

      handler({ enabled: true, message: 'Test' });

      expect(component.setState).toHaveBeenCalledWith({
        maintenanceConfig: { enabled: true, message: 'Test' }
      });
    });

    it('handles null config gracefully', () => {
      const component = { setState: vi.fn() };
      const handler = createMaintenanceHandler(component);

      handler(null);

      expect(component.setState).toHaveBeenCalledWith({
        maintenanceConfig: { enabled: false, message: '' }
      });
    });
  });

  describe('setupHeartbeat', () => {
    it('returns an interval ID', () => {
      vi.useFakeTimers();
      const socket = { connected: true, emit: vi.fn() };
      const intervalId = setupHeartbeat(socket);
      expect(intervalId).toBeDefined();
      clearInterval(intervalId);
      vi.useRealTimers();
    });

    it('emits display-heartbeat when socket is connected', () => {
      vi.useFakeTimers();
      const socket = { connected: true, emit: vi.fn() };
      const intervalId = setupHeartbeat(socket);

      vi.advanceTimersByTime(30000);
      expect(socket.emit).toHaveBeenCalledWith('display-heartbeat');

      clearInterval(intervalId);
      vi.useRealTimers();
    });

    it('does not emit when socket is disconnected', () => {
      vi.useFakeTimers();
      const socket = { connected: false, emit: vi.fn() };
      const intervalId = setupHeartbeat(socket);

      vi.advanceTimersByTime(30000);
      expect(socket.emit).not.toHaveBeenCalled();

      clearInterval(intervalId);
      vi.useRealTimers();
    });
  });
});
