import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import Navbar from './Navbar';

// Mock child components
vi.mock('./Clock', () => ({
  default: () => <div data-testid="clock">Clock</div>
}));

vi.mock('./RoomFilterContainer', () => ({
  default: ({ currentFilter }) => (
    <div data-testid="room-filter-container">Filter: {currentFilter}</div>
  )
}));

vi.mock('../../config/maintenance-messages.js', () => ({
  loadMaintenanceMessages: vi.fn(() => Promise.resolve())
}));

vi.mock('../../config/display-translations.js', () => ({
  getFlightboardDisplayTranslations: vi.fn(() => ({
    board: {},
    navbar: { title: 'Conference Rooms' },
    roomFilter: { filterTitle: '', filterAllTitle: 'All Rooms', filterDefault: '' }
  }))
}));

describe('Navbar', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({})
    });
  });

  it('renders the navbar title', async () => {
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    expect(screen.getByText('Conference Rooms')).toBeInTheDocument();
  });

  it('renders the logo image', () => {
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    const logo = screen.getByAltText('Logo');
    expect(logo).toBeInTheDocument();
  });

  it('renders the Clock component', () => {
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    expect(screen.getByTestId('clock')).toBeInTheDocument();
  });

  it('renders the RoomFilterContainer', () => {
    render(<Navbar filter={vi.fn()} currentFilter="test-filter" />);
    expect(screen.getByTestId('room-filter-container')).toBeInTheDocument();
  });

  it('fetches logo config on mount', async () => {
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/logo');
    });
  });

  it('fetches sidebar config on mount', async () => {
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/sidebar');
    });
  });

  it('uses default logo on error', () => {
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    const logo = screen.getByAltText('Logo');
    // Simulate image error
    logo.dispatchEvent(new Event('error'));
    expect(logo.src).toContain('/img/logo.W.png');
  });

  it('handles filter callback', () => {
    const filterFn = vi.fn();
    render(<Navbar filter={filterFn} currentFilter="" />);
    // The filter is passed through to RoomFilterContainer
    expect(screen.getByTestId('room-filter-container')).toBeInTheDocument();
  });

  it('uses default props when none provided', () => {
    render(<Navbar />);
    expect(screen.getByText('Conference Rooms')).toBeInTheDocument();
  });

  it('updates logo URL based on dark mode and logo config', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ logoLightUrl: '/img/custom-light.png', logoDarkUrl: '/img/custom-dark.png' }) }) // logo
      .mockResolvedValueOnce({ json: () => Promise.resolve({ flightboardDarkMode: true }) }) // sidebar
      .mockResolvedValueOnce({ json: () => Promise.resolve({ logoLightUrl: '/img/custom-light.png', logoDarkUrl: '/img/custom-dark.png' }) }); // logo refetch after sidebar

    render(<Navbar filter={vi.fn()} currentFilter="" />);
    
    await waitFor(() => {
      const logo = screen.getByAltText('Logo');
      expect(logo.src).toContain('custom-light.png');
    });
  });

  it('handles fetch errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<Navbar filter={vi.fn()} currentFilter="" />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('clears refresh interval on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = render(<Navbar filter={vi.fn()} currentFilter="" />);
    const clearSpy = vi.spyOn(global, 'clearInterval');
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
