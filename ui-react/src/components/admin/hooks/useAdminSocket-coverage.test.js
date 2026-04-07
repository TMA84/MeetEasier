import { renderHook } from '@testing-library/react';
import { useAdminSocket } from './useAdminSocket.js';

const mockOn = vi.fn();
const mockDisconnect = vi.fn();

vi.mock('socket.io-client', () => ({
  default: vi.fn(() => ({ on: mockOn, disconnect: mockDisconnect }))
}));

describe('useAdminSocket - coverage gaps', () => {
  const loadCurrentConfig = vi.fn();
  const loadConfigLocks = vi.fn();
  const loadConnectedClients = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('calls refreshConfig when a config event fires', () => {
    renderHook(() => useAdminSocket(true, loadCurrentConfig, loadConfigLocks, loadConnectedClients));
    const wifiCall = mockOn.mock.calls.find(c => c[0] === 'wifiConfigUpdated');
    expect(wifiCall).toBeDefined();
    wifiCall[1](); // fire the handler
    expect(loadCurrentConfig).toHaveBeenCalled();
    expect(loadConfigLocks).toHaveBeenCalled();
  });

  it('calls loadConnectedClients when connectedClientsUpdated fires', () => {
    renderHook(() => useAdminSocket(true, loadCurrentConfig, loadConfigLocks, loadConnectedClients));
    const clientsCall = mockOn.mock.calls.find(c => c[0] === 'connectedClientsUpdated');
    expect(clientsCall).toBeDefined();
    clientsCall[1](); // fire the handler
    expect(loadConnectedClients).toHaveBeenCalled();
  });

  it('does not create duplicate socket on re-render', async () => {
    const io = (await import('socket.io-client')).default;
    const { rerender } = renderHook(() => useAdminSocket(true, loadCurrentConfig, loadConfigLocks, loadConnectedClients));
    const callCount = io.mock.calls.length;
    rerender();
    expect(io.mock.calls.length).toBe(callCount); // no new socket created
  });

  it('cleanup effect disconnects socket on unmount', () => {
    const { unmount } = renderHook(() => useAdminSocket(true, loadCurrentConfig, loadConfigLocks, loadConnectedClients));
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('registers all expected config events', () => {
    renderHook(() => useAdminSocket(true, loadCurrentConfig, loadConfigLocks, loadConnectedClients));
    const eventNames = mockOn.mock.calls.map(c => c[0]);
    const expectedEvents = [
      'wifiConfigUpdated', 'logoConfigUpdated', 'sidebarConfigUpdated', 'bookingConfigUpdated',
      'maintenanceConfigUpdated', 'i18nConfigUpdated', 'colorsConfigUpdated', 'searchConfigUpdated',
      'rateLimitConfigUpdated', 'oauthConfigUpdated', 'systemConfigUpdated', 'translationApiConfigUpdated',
      'apiTokenUpdated', 'wifiApiTokenUpdated', 'connectedClientsUpdated'
    ];
    expectedEvents.forEach(evt => {
      expect(eventNames).toContain(evt);
    });
  });
});
