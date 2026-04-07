import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FlightboardLayout from './FlightboardLayout';

vi.mock('../components/flightboard/Flightboard.jsx', () => ({
  default: ({ filter }) => <div data-testid="flightboard">Filter: {filter}</div>,
}));

vi.mock('../components/flightboard/Navbar.jsx', () => ({
  default: ({ filter, currentFilter }) => (
    <div data-testid="navbar">
      <button onClick={() => filter('roomlist-test')}>Set Filter</button>
      <button onClick={() => filter('')}>Clear Filter</button>
      <span>Current: {currentFilter}</span>
    </div>
  ),
}));

vi.mock('../config/display-translations.js', () => ({
  getFlightboardDisplayTranslations: vi.fn(() => ({
    board: {},
    navbar: { title: 'Conference Rooms' },
    roomFilter: { filterTitle: '', filterAllTitle: 'All Rooms', filterDefault: '' },
  })),
}));

describe('FlightboardLayout coverage', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ flightboardDarkMode: true }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.classList.remove('flightboard-light');
  });

  it('updates filter when navbar filter button clicked', async () => {
    render(
      <MemoryRouter>
        <FlightboardLayout />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('Set Filter'));
    await waitFor(() => {
      expect(screen.getByTestId('flightboard')).toHaveTextContent('roomlist-test');
    });
  });

  it('clears filter when empty filter set', async () => {
    render(
      <MemoryRouter initialEntries={['/?filter=roomlist-test']}>
        <FlightboardLayout />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('Clear Filter'));
    await waitFor(() => {
      expect(screen.getByTestId('flightboard')).toHaveTextContent('Filter:');
    });
  });

  it('adds flightboard-light class to body when dark mode off', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ flightboardDarkMode: false }),
    });
    render(
      <MemoryRouter>
        <FlightboardLayout />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(document.body.classList.contains('flightboard-light')).toBe(true);
    });
  });

  it('removes flightboard-light class from body when dark mode on', async () => {
    document.body.classList.add('flightboard-light');
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ flightboardDarkMode: true }),
    });
    render(
      <MemoryRouter>
        <FlightboardLayout />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(document.body.classList.contains('flightboard-light')).toBe(false);
    });
  });

  it('cleans up body class on unmount', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ flightboardDarkMode: false }),
    });
    const { unmount } = render(
      <MemoryRouter>
        <FlightboardLayout />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(document.body.classList.contains('flightboard-light')).toBe(true);
    });
    unmount();
    expect(document.body.classList.contains('flightboard-light')).toBe(false);
  });

  it('syncs filter from URL changes', async () => {
    render(
      <MemoryRouter initialEntries={['/?filter=building-a']}>
        <FlightboardLayout />
      </MemoryRouter>
    );
    expect(screen.getByTestId('flightboard')).toHaveTextContent('building-a');
  });

  it('applies wrapper class based on dark mode', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ flightboardDarkMode: false }),
    });
    const { container } = render(
      <MemoryRouter>
        <FlightboardLayout />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(container.querySelector('#page-wrap.flightboard-light')).toBeInTheDocument();
    });
  });
});
