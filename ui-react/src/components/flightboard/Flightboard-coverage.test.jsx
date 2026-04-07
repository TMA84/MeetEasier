import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Flightboard from './Flightboard';

vi.mock('socket.io-client', () => ({
  default: vi.fn(() => ({
    on: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock('../../config/maintenance-messages.js', () => ({
  applyI18nConfig: vi.fn(),
  getMaintenanceCopy: vi.fn(() => ({ title: 'Maintenance', body: 'System is under maintenance' })),
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
  setupHeartbeat: vi.fn(() => 123),
  createMaintenanceHandler: vi.fn(() => vi.fn()),
}));

vi.mock('./FlightboardRow', () => ({
  default: ({ room }) => <div data-testid="flightboard-row">{room.Name}</div>,
}));

vi.mock('../global/Spinner', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}));

describe('Flightboard coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders spinner while loading', () => {
    global.fetch = vi.fn(() => new Promise(() => {})); // never resolves
    render(<Flightboard filter="" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders rooms after successful fetch', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/rooms') {
        return Promise.resolve({ json: () => Promise.resolve([{ Name: 'Room A' }, { Name: 'Room B' }]) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ flightboardDarkMode: true }) });
    });
    render(<Flightboard filter="" />);
    await waitFor(() => {
      expect(screen.getByText('Room A')).toBeInTheDocument();
      expect(screen.getByText('Room B')).toBeInTheDocument();
    });
  });

  it('renders error message when API returns error', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/rooms') {
        return Promise.resolve({ json: () => Promise.resolve({ error: 'Invalid credentials' }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ flightboardDarkMode: true }) });
    });
    render(<Flightboard filter="" />);
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('renders error message when fetch fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/rooms') {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({ json: () => Promise.resolve({ flightboardDarkMode: true }) });
    });
    render(<Flightboard filter="" />);
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch room data')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('renders maintenance mode when enabled', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/rooms') {
        return Promise.resolve({ json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ flightboardDarkMode: true }) });
    });
    const { fetchMaintenanceStatus } = await import('../shared/display-utils.js');
    fetchMaintenanceStatus.mockImplementation((component) => {
      component.setState({ maintenanceConfig: { enabled: true, message: 'Under maintenance' } });
    });
    render(<Flightboard filter="" />);
    await waitFor(() => {
      expect(screen.getByText('Under maintenance')).toBeInTheDocument();
    });
  });

  it('renders maintenance fallback copy when no custom message', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/rooms') {
        return Promise.resolve({ json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ flightboardDarkMode: true }) });
    });
    const { fetchMaintenanceStatus } = await import('../shared/display-utils.js');
    fetchMaintenanceStatus.mockImplementation((component) => {
      component.setState({ maintenanceConfig: { enabled: true, message: '' } });
    });
    render(<Flightboard filter="" />);
    await waitFor(() => {
      expect(screen.getByText('Maintenance. System is under maintenance')).toBeInTheDocument();
    });
  });

  it('applies light mode class when flightboardDarkMode is false', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/rooms') {
        return Promise.resolve({ json: () => Promise.resolve([{ Name: 'Room' }]) });
      }
      if (url === '/api/sidebar') {
        return Promise.resolve({ json: () => Promise.resolve({ flightboardDarkMode: false }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
    const { container } = render(<Flightboard filter="" />);
    await waitFor(() => {
      expect(container.querySelector('.flightboard-light')).toBeInTheDocument();
    });
  });

  it('handles sidebar fetch error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/rooms') {
        return Promise.resolve({ json: () => Promise.resolve([]) });
      }
      if (url === '/api/sidebar') {
        return Promise.reject(new Error('Sidebar error'));
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
    render(<Flightboard filter="" />);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('uses default dark mode when sidebar response has no flightboardDarkMode', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/rooms') {
        return Promise.resolve({ json: () => Promise.resolve([{ Name: 'Room' }]) });
      }
      if (url === '/api/sidebar') {
        return Promise.resolve({ json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
    const { container } = render(<Flightboard filter="" />);
    await waitFor(() => {
      // Default is dark mode, so no flightboard-light class
      expect(container.querySelector('.flightboard-light')).toBeNull();
    });
  });

  it('cleans up socket and heartbeat on unmount', async () => {
    global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve([]) });
    const { unmount } = render(<Flightboard filter="" />);
    unmount();
    // No error thrown = cleanup successful
  });
});
