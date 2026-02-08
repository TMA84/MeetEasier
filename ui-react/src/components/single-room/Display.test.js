import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock socket.io-client using manual mock
jest.mock('socket.io-client');

import Display from './Display';

// Mock child components
jest.mock('./RoomStatusBlock', () => {
  return function MockRoomStatusBlock({ room }) {
    return <div data-testid="room-status-block">{room.Name}</div>;
  };
});

jest.mock('./Sidebar', () => {
  return function MockSidebar() {
    return <div data-testid="sidebar">Sidebar</div>;
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

describe('Single Room Display Component', () => {
  const mockRooms = [
    {
      Name: 'Conference Room A',
      RoomAlias: 'conference-a',
      Roomlist: 'Building 1',
      Busy: false,
      Appointments: [
        {
          Subject: 'Team Meeting',
          Organizer: 'John Doe',
          Start: Date.now() + 3600000,
          End: Date.now() + 5400000,
          Private: false
        }
      ]
    },
    {
      Name: 'Meeting Room B',
      RoomAlias: 'meeting-b',
      Roomlist: 'Building 1',
      Busy: true,
      Appointments: []
    }
  ];

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('displays spinner while loading', () => {
      global.fetch.mockImplementation(() => new Promise(() => {}));
      render(<Display alias="conference-a" />);
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });
  });

  describe('Successful Data Fetch', () => {
    it('fetches and displays room data', async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: async () => mockRooms
        })
        .mockResolvedValueOnce({
          json: async () => ({ showMeetingTitles: false })
        })
        .mockResolvedValueOnce({
          json: async () => ({ enableBooking: true })
        });

      render(<Display alias="conference-a" />);

      await waitFor(() => {
        expect(screen.getByText('Conference Room A')).toBeInTheDocument();
      });
    });

    it('displays room status block', async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: async () => mockRooms
        })
        .mockResolvedValueOnce({
          json: async () => ({ showMeetingTitles: false })
        })
        .mockResolvedValueOnce({
          json: async () => ({ enableBooking: true })
        });

      render(<Display alias="conference-a" />);

      await waitFor(() => {
        expect(screen.getByTestId('room-status-block')).toBeInTheDocument();
      });
    });

    it('displays sidebar', async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: async () => mockRooms
        })
        .mockResolvedValueOnce({
          json: async () => ({ showMeetingTitles: false })
        })
        .mockResolvedValueOnce({
          json: async () => ({ enableBooking: true })
        });

      render(<Display alias="conference-a" />);

      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      });
    });

    it('calls /api/rooms endpoint', async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: async () => mockRooms
        })
        .mockResolvedValueOnce({
          json: async () => ({ showMeetingTitles: false })
        })
        .mockResolvedValueOnce({
          json: async () => ({ enableBooking: true })
        });

      render(<Display alias="conference-a" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/rooms');
      });
    });

    it('calls /api/sidebar endpoint', async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: async () => mockRooms
        })
        .mockResolvedValueOnce({
          json: async () => ({ showMeetingTitles: false })
        })
        .mockResolvedValueOnce({
          json: async () => ({ enableBooking: true })
        });

      render(<Display alias="conference-a" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/sidebar');
      });
    });
  });

  describe('Room Filtering', () => {
    it('displays correct room based on alias', async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: async () => mockRooms
        })
        .mockResolvedValueOnce({
          json: async () => ({ showMeetingTitles: false })
        })
        .mockResolvedValueOnce({
          json: async () => ({ enableBooking: true })
        });

      render(<Display alias="conference-a" />);

      await waitFor(() => {
        expect(screen.getByText('Conference Room A')).toBeInTheDocument();
        expect(screen.queryByText('Meeting Room B')).not.toBeInTheDocument();
      });
    });

    it('handles room not found', async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: async () => mockRooms
        })
        .mockResolvedValueOnce({
          json: async () => ({ showMeetingTitles: false })
        })
        .mockResolvedValueOnce({
          json: async () => ({ enableBooking: true })
        });

      render(<Display alias="nonexistent" />);

      await waitFor(() => {
        expect(screen.getByText('Room not found')).toBeInTheDocument();
      });
    });
  });

  describe('Room Details Processing', () => {
    it('processes appointment details correctly', async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: async () => mockRooms
        })
        .mockResolvedValueOnce({
          json: async () => ({ showMeetingTitles: false })
        })
        .mockResolvedValueOnce({
          json: async () => ({ enableBooking: true })
        });

      render(<Display alias="conference-a" />);

      await waitFor(() => {
        expect(screen.getByTestId('room-status-block')).toBeInTheDocument();
      });
    });

    it('handles room with no appointments', async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: async () => mockRooms
        })
        .mockResolvedValueOnce({
          json: async () => ({ showMeetingTitles: false })
        })
        .mockResolvedValueOnce({
          json: async () => ({ enableBooking: true })
        });

      render(<Display alias="meeting-b" />);

      await waitFor(() => {
        expect(screen.getByText('Meeting Room B')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles fetch error gracefully', async () => {
      global.fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          json: async () => ({ showMeetingTitles: false })
        })
        .mockResolvedValueOnce({
          json: async () => ({ enableBooking: true })
        });

      render(<Display alias="conference-a" />);

      await waitFor(() => {
        expect(screen.getByText('Error loading room')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundary', () => {
    it('has componentDidCatch method', () => {
      expect(Display.prototype.componentDidCatch).toBeDefined();
    });
  });
});
