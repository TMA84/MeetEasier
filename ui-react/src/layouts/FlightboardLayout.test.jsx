import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import FlightboardLayout from './FlightboardLayout';

// Mock child components
vi.mock('../components/flightboard/Flightboard.jsx', () => ({
  default: ({ filter }) => <div data-testid="flightboard">Filter: {filter}</div>
}));

vi.mock('../components/flightboard/Navbar.jsx', () => ({
  default: ({ filter, currentFilter }) => (
    <div data-testid="navbar">
      <button onClick={() => filter('roomlist-test')}>Filter</button>
      <span>Current: {currentFilter}</span>
    </div>
  )
}));

vi.mock('../config/display-translations.js', () => ({
  getFlightboardDisplayTranslations: vi.fn(() => ({
    board: {},
    navbar: { title: 'Conference Rooms' },
    roomFilter: { filterTitle: '', filterAllTitle: 'All Rooms', filterDefault: '' }
  }))
}));

describe('FlightboardLayout', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ flightboardDarkMode: true })
    });
  });

  it('renders Navbar and Flightboard components', () => {
    render(
      <MemoryRouter>
        <FlightboardLayout />
      </MemoryRouter>
    );
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('flightboard')).toBeInTheDocument();
  });

  it('renders page-wrap container', () => {
    const { container } = render(
      <MemoryRouter>
        <FlightboardLayout />
      </MemoryRouter>
    );
    expect(container.querySelector('#page-wrap')).toBeInTheDocument();
  });

  it('fetches sidebar config on mount', async () => {
    render(
      <MemoryRouter>
        <FlightboardLayout />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/sidebar');
    });
  });

  it('sets page title from config', async () => {
    render(
      <MemoryRouter>
        <FlightboardLayout />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(document.title).toBe('Conference Rooms');
    });
  });

  it('applies flightboard-light class when dark mode is off', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ flightboardDarkMode: false })
    });
    const { container } = render(
      <MemoryRouter>
        <FlightboardLayout />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(container.querySelector('.flightboard-light')).toBeInTheDocument();
    });
  });

  it('does not apply flightboard-light class when dark mode is on', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ flightboardDarkMode: true })
    });
    const { container } = render(
      <MemoryRouter>
        <FlightboardLayout />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(container.querySelector('.flightboard-light')).not.toBeInTheDocument();
    });
  });

  it('reads filter from URL search params', () => {
    render(
      <MemoryRouter initialEntries={['/?filter=roomlist-building-a']}>
        <FlightboardLayout />
      </MemoryRouter>
    );
    expect(screen.getByTestId('flightboard')).toHaveTextContent('roomlist-building-a');
  });

  it('handles sidebar fetch error gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <MemoryRouter>
        <FlightboardLayout />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });
});
