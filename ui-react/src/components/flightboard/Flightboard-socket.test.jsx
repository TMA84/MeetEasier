import React from 'react';
import { render, waitFor } from '@testing-library/react';
import Flightboard from './Flightboard';

let socketHandlers = {};
const mockDisconnect = vi.fn();

vi.mock('socket.io-client', () => ({
  default: vi.fn(() => ({
    on: vi.fn((event, handler) => { socketHandlers[event] = handler; }),
    disconnect: mockDisconnect,
  })),
}));

vi.mock('../../config/maintenance-messages.js', () => ({
  applyI18nConfig: vi.fn(),
  getMaintenanceCopy: vi.fn(() => ({ title: 'Maintenance', body: 'Under maintenance' })),
  loadMaintenanceMessages: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../utils/display-client-id.js', () => ({
  getDisplayClientId: vi.fn(() => 'test-client-id'),
}));

vi.mock('../../utils/power-management.js', () => ({
  initPowerManagement: vi.fn(),
}));

vi.mock('../shared/display-utils.js', () => ({
  fetchMaintenanceStatus: vi.fn(),
  setupHeartbeat: vi.fn(() => 456),
  createMaintenanceHandler: vi.fn(() => vi.fn()),
}));

vi.mock('./FlightboardRow', () => ({
  default: ({ room }) => <div data-testid="flightboard-row">{room.Name}</div>,
}));

vi.mock('../global/Spinner', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}));

describe('Flightboard socket event handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers = {};
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/rooms') {
        return Promise.resolve({ json: () => Promise.resolve([{ Name: 'Room A' }]) });
      }
      if (url === '/api/sidebar') {
        return Promise.resolve({ json: () => Promise.resolve({ flightboardDarkMode: true }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('handles i18nConfigUpdated event', async () => {
    const { applyI18nConfig } = await import('../../config/maintenance-messages.js');
    render(<Flightboard filter="" />);
    await waitFor(() => expect(socketHandlers.i18nConfigUpdated).toBeDefined());
    const i18nConfig = { lang: 'de' };
    socketHandlers.i18nConfigUpdated(i18nConfig);
    expect(applyI18nConfig).toHaveBeenCalledWith(i18nConfig);
  });

  it('handles sidebarConfigUpdated event', async () => {
    render(<Flightboard filter="" />);
    await waitFor(() => expect(socketHandlers.sidebarConfigUpdated).toBeDefined());
    global.fetch.mockClear();
    socketHandlers.sidebarConfigUpdated();
    expect(global.fetch).toHaveBeenCalledWith('/api/sidebar');
  });

  it('handles power-management-update for matching clientId', async () => {
    const { initPowerManagement } = await import('../../utils/power-management.js');
    render(<Flightboard filter="" />);
    await waitFor(() => expect(socketHandlers['power-management-update']).toBeDefined());
    initPowerManagement.mockClear();
    socketHandlers['power-management-update']({ clientId: 'test-client-id', config: {} });
    expect(initPowerManagement).toHaveBeenCalledWith('test-client-id');
  });

  it('ignores power-management-update for different clientId', async () => {
    const { initPowerManagement } = await import('../../utils/power-management.js');
    render(<Flightboard filter="" />);
    await waitFor(() => expect(socketHandlers['power-management-update']).toBeDefined());
    initPowerManagement.mockClear();
    socketHandlers['power-management-update']({ clientId: 'other-client', config: {} });
    expect(initPowerManagement).not.toHaveBeenCalled();
  });

  it('handles updatedRooms event', async () => {
    render(<Flightboard filter="" />);
    await waitFor(() => expect(socketHandlers.updatedRooms).toBeDefined());
    const newRooms = [{ Name: 'Room B' }, { Name: 'Room C' }];
    socketHandlers.updatedRooms(newRooms);
    await waitFor(() => {
      expect(document.querySelector('[data-testid="flightboard-row"]')).toBeInTheDocument();
    });
  });
});
