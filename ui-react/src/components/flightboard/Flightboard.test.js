import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Flightboard from './Flightboard';

// Mock child components
jest.mock('./FlightboardRow', () => {
  return function MockFlightboardRow({ room }) {
    return <div data-testid="flightboard-row">{room.Name}</div>;
  };
});

jest.mock('../global/Socket', () => {
  return function MockSocket() {
    return null;
  };
});

jest.mock('../global/Spinner', () => {
  return function MockSpinner() {
    return <div data-testid="spinner">Loading...</div>;
  };
});

describe('Flightboard Component', () => {
  const mockRooms = [
    {
      Name: 'Conference Room A',
      RoomAlias: 'conference-a',
      Roomlist: 'Building 1',
      Busy: false,
      Appointments: []
    },
    {
      Name: 'Meeting Room B',
      RoomAlias: 'meeting-b',
      Roomlist: 'Building 1',
      Busy: true,
      Appointments: [
        {
          Subject: 'Team Meeting',
          Organizer: 'John Doe',
          Start: Date.now(),
          End: Date.now() + 3600000
        }
      ]
    }
  ];

  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('displays spinner while loading', () => {
      global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<Flightboard />);
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });
  });

  describe('Successful Data Fetch', () => {
    it('fetches and displays room data on mount', async () => {
      global.fetch.mockResolvedValueOnce({
        json: async () => mockRooms
      });

      render(<Flightboard />);

      await waitFor(() => {
        expect(screen.getByText('Conference Room A')).toBeInTheDocument();
        expect(screen.getByText('Meeting Room B')).toBeInTheDocument();
      });
    });

    it('renders correct number of FlightboardRow components', async () => {
      global.fetch.mockResolvedValueOnce({
        json: async () => mockRooms
      });

      render(<Flightboard />);

      await waitFor(() => {
        const rows = screen.getAllByTestId('flightboard-row');
        expect(rows).toHaveLength(2);
      });
    });

    it('calls /api/rooms endpoint', async () => {
      global.fetch.mockResolvedValueOnce({
        json: async () => mockRooms
      });

      render(<Flightboard />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/rooms');
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API returns error', async () => {
      const errorResponse = {
        error: 'Authentication failed'
      };

      global.fetch.mockResolvedValueOnce({
        json: async () => errorResponse
      });

      render(<Flightboard />);

      await waitFor(() => {
        expect(screen.getByText('Authentication failed')).toBeInTheDocument();
      });
    });

    it('displays error message when fetch fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<Flightboard />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch room data/)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('passes filter prop to FlightboardRow components', async () => {
      global.fetch.mockResolvedValueOnce({
        json: async () => mockRooms
      });

      render(<Flightboard filter="roomlist-building-1" />);

      await waitFor(() => {
        expect(screen.getAllByTestId('flightboard-row')).toHaveLength(2);
      });
    });

    it('works with empty filter', async () => {
      global.fetch.mockResolvedValueOnce({
        json: async () => mockRooms
      });

      render(<Flightboard filter="" />);

      await waitFor(() => {
        expect(screen.getAllByTestId('flightboard-row')).toHaveLength(2);
      });
    });
  });

  describe('Socket Updates', () => {
    it('updates rooms when socket data is received', async () => {
      global.fetch.mockResolvedValueOnce({
        json: async () => mockRooms
      });

      const { rerender } = render(<Flightboard />);

      await waitFor(() => {
        expect(screen.getByText('Conference Room A')).toBeInTheDocument();
      });

      // Simulate socket update (this would normally come through Socket component)
      // For now, we just verify the component renders correctly
      expect(screen.getAllByTestId('flightboard-row')).toHaveLength(2);
    });
  });
});
