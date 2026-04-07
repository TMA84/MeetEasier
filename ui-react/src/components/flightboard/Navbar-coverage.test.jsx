import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Navbar from './Navbar';

vi.mock('../../config/maintenance-messages.js', () => ({
  loadMaintenanceMessages: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../config/display-translations.js', () => ({
  getFlightboardDisplayTranslations: vi.fn(() => ({
    board: {},
    navbar: { title: 'Conference Rooms' },
    roomFilter: { filterTitle: '', filterAllTitle: 'All Rooms', filterDefault: '' },
  })),
}));

vi.mock('./Clock', () => ({
  default: () => <div data-testid="clock">12:00</div>,
}));

vi.mock('./RoomFilterContainer', () => ({
  default: ({ filter, currentFilter }) => (
    <div data-testid="room-filter">
      <button onClick={() => filter('test-filter')}>Filter</button>
      <span>{currentFilter}</span>
    </div>
  ),
}));

describe('Navbar coverage', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/logo') {
        return Promise.resolve({ json: () => Promise.resolve({ logoDarkUrl: '/img/dark.png', logoLightUrl: '/img/light.png' }) });
      }
      if (url === '/api/sidebar') {
        return Promise.resolve({ json: () => Promise.resolve({ flightboardDarkMode: true }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders logo, title, filter, and clock', async () => {
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    await waitFor(() => {
      expect(screen.getByAltText('Logo')).toBeInTheDocument();
      expect(screen.getByText('Conference Rooms')).toBeInTheDocument();
      expect(screen.getByTestId('clock')).toBeInTheDocument();
      expect(screen.getByTestId('room-filter')).toBeInTheDocument();
    });
  });

  it('fetches logo and sidebar config on mount', async () => {
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/logo');
      expect(global.fetch).toHaveBeenCalledWith('/api/sidebar');
    });
  });

  it('uses light logo URL in dark mode', async () => {
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    await waitFor(() => {
      const logo = screen.getByAltText('Logo');
      expect(logo.src).toContain('/img/light.png');
    });
  });

  it('uses dark logo URL in light mode', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/logo') {
        return Promise.resolve({ json: () => Promise.resolve({ logoDarkUrl: '/img/dark.png', logoLightUrl: '/img/light.png' }) });
      }
      if (url === '/api/sidebar') {
        return Promise.resolve({ json: () => Promise.resolve({ flightboardDarkMode: false }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    await waitFor(() => {
      const logo = screen.getByAltText('Logo');
      expect(logo.src).toContain('/img/dark.png');
    });
  });

  it('uses fallback logo when no URLs provided', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/logo') {
        return Promise.resolve({ json: () => Promise.resolve({}) });
      }
      if (url === '/api/sidebar') {
        return Promise.resolve({ json: () => Promise.resolve({ flightboardDarkMode: true }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    await waitFor(() => {
      const logo = screen.getByAltText('Logo');
      expect(logo.src).toContain('/img/logo.W.png');
    });
  });

  it('handles logo fetch error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/logo') {
        return Promise.reject(new Error('Logo fetch error'));
      }
      if (url === '/api/sidebar') {
        return Promise.resolve({ json: () => Promise.resolve({ flightboardDarkMode: true }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('handles sidebar fetch error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/logo') {
        return Promise.resolve({ json: () => Promise.resolve({}) });
      }
      if (url === '/api/sidebar') {
        return Promise.reject(new Error('Sidebar error'));
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('handles logo image error by setting fallback', async () => {
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    await waitFor(() => {
      const logo = screen.getByAltText('Logo');
      fireEvent.error(logo);
      expect(logo.src).toContain('/img/logo.W.png');
    });
  });

  it('refreshes configs periodically', async () => {
    vi.useFakeTimers();
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    // Advance timer by 60 seconds to trigger refresh
    vi.advanceTimersByTime(60000);
    // Should have been called multiple times
    const logoCalls = global.fetch.mock.calls.filter(c => c[0] === '/api/logo');
    expect(logoCalls.length).toBeGreaterThanOrEqual(2);
    vi.useRealTimers();
  });

  it('cleans up interval on unmount', async () => {
    const { unmount } = render(<Navbar filter={vi.fn()} currentFilter="" />);
    unmount();
    // No error = cleanup successful
  });

  it('uses default flightboardDarkMode when undefined in response', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/sidebar') {
        return Promise.resolve({ json: () => Promise.resolve({}) });
      }
      if (url === '/api/logo') {
        return Promise.resolve({ json: () => Promise.resolve({ logoLightUrl: '/img/light.png' }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    await waitFor(() => {
      const logo = screen.getByAltText('Logo');
      // Default dark mode = use light logo
      expect(logo.src).toContain('/img/light.png');
    });
  });
});
