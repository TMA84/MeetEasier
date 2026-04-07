import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAdminSocket } from './useAdminSocket.js';

const mockOn = vi.fn();
const mockDisconnect = vi.fn();

vi.mock('socket.io-client', () => ({
  default: vi.fn(() => ({ on: mockOn, disconnect: mockDisconnect }))
}));

describe('useAdminSocket - boost coverage', () => {
  const loadCurrentConfig = vi.fn();
  const loadConfigLocks = vi.fn();
  const loadConnectedClients = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('triggers refreshConfig on config update events', () => {
    renderHook(() => useAdminSocket(true, loadCurrentConfig, loadConfigLocks, loadConnectedClients));
    const wifiCall = mockOn.mock.calls.find(c => c[0] === 'wifiConfigUpdated');
    expect(wifiCall).toBeDefined();
    wifiCall[1]();
    expect(loadCurrentConfig).toHaveBeenCalled();
    expect(loadConfigLocks).toHaveBeenCalled();
  });

  it('triggers loadConnectedClients on connectedClientsUpdated', () => {
    renderHook(() => useAdminSocket(true, loadCurrentConfig, loadConfigLocks, loadConnectedClients));
    const clientsCall = mockOn.mock.calls.find(c => c[0] === 'connectedClientsUpdated');
    expect(clientsCall).toBeDefined();
    clientsCall[1]();
    expect(loadConnectedClients).toHaveBeenCalled();
  });

  it('registers all expected config events', () => {
    renderHook(() => useAdminSocket(true, loadCurrentConfig, loadConfigLocks, loadConnectedClients));
    const eventNames = mockOn.mock.calls.map(c => c[0]);
    const expectedEvents = [
      'wifiConfigUpdated', 'logoConfigUpdated', 'sidebarConfigUpdated',
      'bookingConfigUpdated', 'maintenanceConfigUpdated', 'i18nConfigUpdated',
      'colorsConfigUpdated', 'searchConfigUpdated', 'rateLimitConfigUpdated',
      'oauthConfigUpdated', 'systemConfigUpdated', 'translationApiConfigUpdated',
      'apiTokenUpdated', 'wifiApiTokenUpdated', 'connectedClientsUpdated'
    ];
    expectedEvents.forEach(evt => {
      expect(eventNames).toContain(evt);
    });
  });
});
