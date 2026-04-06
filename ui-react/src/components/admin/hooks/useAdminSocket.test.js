import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAdminSocket } from './useAdminSocket.js';

const mockOn = vi.fn();
const mockDisconnect = vi.fn();

vi.mock('socket.io-client', () => ({
  default: vi.fn(() => ({ on: mockOn, disconnect: mockDisconnect }))
}));

describe('useAdminSocket', () => {
  const loadCurrentConfig = vi.fn();
  const loadConfigLocks = vi.fn();
  const loadConnectedClients = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('does not connect when not authenticated', () => {
    renderHook(() => useAdminSocket(false, loadCurrentConfig, loadConfigLocks, loadConnectedClients));
    expect(mockOn).not.toHaveBeenCalled();
  });

  it('connects and registers event listeners when authenticated', () => {
    renderHook(() => useAdminSocket(true, loadCurrentConfig, loadConfigLocks, loadConnectedClients));
    // Should register config update events + connectedClientsUpdated
    expect(mockOn).toHaveBeenCalled();
    const eventNames = mockOn.mock.calls.map(c => c[0]);
    expect(eventNames).toContain('wifiConfigUpdated');
    expect(eventNames).toContain('connectedClientsUpdated');
  });

  it('disconnects on unmount', () => {
    const { unmount } = renderHook(() => useAdminSocket(true, loadCurrentConfig, loadConfigLocks, loadConnectedClients));
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
