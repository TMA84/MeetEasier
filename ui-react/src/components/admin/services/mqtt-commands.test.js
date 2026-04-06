import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendMqttPowerCommand, sendMqttBrightnessCommand, sendMqttKioskCommand,
  sendMqttThemeCommand, sendMqttVolumeCommand, sendMqttPageZoomCommand,
  sendMqttRefreshCommand, sendMqttRebootCommand, sendMqttShutdownCommand,
  sendMqttRefreshAll, sendMqttRebootAll, sendMqttPageUrlCommand,
  fetchMqttConfig, fetchMqttStatus, fetchMqttDisplays, submitMqttConfig
} from './mqtt-commands.js';

describe('mqtt-commands', () => {
  let mockHeaders;

  beforeEach(() => {
    global.fetch = vi.fn();
    mockHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': 'Bearer test' });
  });

  describe('sendMqttPowerCommand', () => {
    it('sends POST to correct endpoint with power state', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200 });
      await sendMqttPowerCommand(mockHeaders, 'display-1', true);
      expect(global.fetch).toHaveBeenCalledWith('/api/mqtt-power-trigger/display-1', {
        method: 'POST',
        headers: mockHeaders(),
        body: JSON.stringify({ powerState: true, brightness: 255 })
      });
    });

    it('sends brightness 0 when powering off', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200 });
      await sendMqttPowerCommand(mockHeaders, 'display-1', false);
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.powerState).toBe(false);
      expect(body.brightness).toBe(0);
    });
  });

  describe('sendMqttBrightnessCommand', () => {
    it('sends brightness value to correct endpoint', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200 });
      await sendMqttBrightnessCommand(mockHeaders, 'host-1', 128);
      expect(global.fetch).toHaveBeenCalledWith('/api/mqtt-brightness/host-1', {
        method: 'POST', headers: mockHeaders(), body: JSON.stringify({ brightness: 128 })
      });
    });
  });

  describe('sendMqttKioskCommand', () => {
    it('sends kiosk status to correct endpoint', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200 });
      await sendMqttKioskCommand(mockHeaders, 'host-1', 'enabled');
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.status).toBe('enabled');
    });
  });

  describe('sendMqttThemeCommand', () => {
    it('sends theme to correct endpoint', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200 });
      await sendMqttThemeCommand(mockHeaders, 'host-1', 'dark');
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.theme).toBe('dark');
    });
  });

  describe('sendMqttVolumeCommand', () => {
    it('sends volume to correct endpoint', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200 });
      await sendMqttVolumeCommand(mockHeaders, 'host-1', 75);
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.volume).toBe(75);
    });
  });

  describe('sendMqttPageZoomCommand', () => {
    it('sends zoom to correct endpoint', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200 });
      await sendMqttPageZoomCommand(mockHeaders, 'host-1', 150);
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.zoom).toBe(150);
    });
  });

  describe('sendMqttRefreshCommand', () => {
    it('sends POST without body', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200 });
      await sendMqttRefreshCommand(mockHeaders, 'host-1');
      expect(global.fetch).toHaveBeenCalledWith('/api/mqtt-refresh/host-1', {
        method: 'POST', headers: mockHeaders()
      });
    });
  });

  describe('sendMqttRebootCommand', () => {
    it('sends POST to reboot endpoint', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200 });
      await sendMqttRebootCommand(mockHeaders, 'host-1');
      expect(global.fetch.mock.calls[0][0]).toBe('/api/mqtt-reboot/host-1');
    });
  });

  describe('sendMqttShutdownCommand', () => {
    it('sends POST to shutdown endpoint', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200 });
      await sendMqttShutdownCommand(mockHeaders, 'host-1');
      expect(global.fetch.mock.calls[0][0]).toBe('/api/mqtt-shutdown/host-1');
    });
  });

  describe('sendMqttRefreshAll', () => {
    it('returns ok with data on success', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ message: 'Sent to 3 displays' }) });
      const result = await sendMqttRefreshAll(mockHeaders);
      expect(result.ok).toBe(true);
      expect(result.data.message).toBe('Sent to 3 displays');
    });

    it('returns not ok on failure', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 500 });
      const result = await sendMqttRefreshAll(mockHeaders);
      expect(result.ok).toBe(false);
    });
  });

  describe('sendMqttRebootAll', () => {
    it('returns ok with data on success', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ message: 'Rebooting all' }) });
      const result = await sendMqttRebootAll(mockHeaders);
      expect(result.ok).toBe(true);
    });
  });

  describe('sendMqttPageUrlCommand', () => {
    it('sends URL to correct endpoint', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200 });
      await sendMqttPageUrlCommand(mockHeaders, 'host-1', 'https://example.com');
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.url).toBe('https://example.com');
    });
  });

  describe('fetchMqttConfig', () => {
    it('returns config data on success', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: async () => ({ enabled: true, brokerUrl: 'mqtt://localhost' }) });
      const result = await fetchMqttConfig(mockHeaders);
      expect(result.enabled).toBe(true);
    });

    it('returns null on failure', async () => {
      global.fetch.mockResolvedValue({ ok: false });
      const result = await fetchMqttConfig(mockHeaders);
      expect(result).toBeNull();
    });
  });

  describe('fetchMqttStatus', () => {
    it('returns status data on success', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: async () => ({ connected: true }) });
      const result = await fetchMqttStatus(mockHeaders);
      expect(result.connected).toBe(true);
    });
  });

  describe('fetchMqttDisplays', () => {
    it('returns displays on success', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ displays: [{ hostname: 'h1' }] }) });
      const result = await fetchMqttDisplays(mockHeaders);
      expect(result.ok).toBe(true);
      expect(result.displays).toHaveLength(1);
    });

    it('returns 401 status on unauthorized', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 401 });
      const result = await fetchMqttDisplays(mockHeaders);
      expect(result.ok).toBe(false);
      expect(result.status).toBe(401);
    });
  });

  describe('submitMqttConfig', () => {
    it('returns ok on success', async () => {
      global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });
      const result = await submitMqttConfig(mockHeaders, { enabled: true });
      expect(result.ok).toBe(true);
    });

    it('returns 401 on unauthorized', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
      const result = await submitMqttConfig(mockHeaders, { enabled: true });
      expect(result.ok).toBe(false);
      expect(result.status).toBe(401);
    });
  });
});
