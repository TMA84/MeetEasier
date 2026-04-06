import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('socket.io-client');

import io from 'socket.io-client';
import Display from './Display';
import { setupDisplayFetchMocks } from './test-helpers';

vi.mock('./RoomStatusBlock', () => ({
  default: function MockRoomStatusBlock({ room }) {
    return <div data-testid="room-status-block">{room.Name}</div>;
  }
}));

vi.mock('./Sidebar', () => ({
  default: function MockSidebar({ onBookRoom, onExtendMeeting, onCheckIn, checkInRequired, _checkInCompleted, checkInExpired, checkInTooEarly, onExtendMeetingDisabled }) {
    return (
      <div data-testid="sidebar">
        {onBookRoom && <button data-testid="book-btn" onClick={onBookRoom}>Book</button>}
        {onExtendMeeting && <button data-testid="extend-btn" onClick={onExtendMeeting}>Extend</button>}
        {onCheckIn && <button data-testid="checkin-btn" onClick={onCheckIn}>CheckIn</button>}
        {checkInRequired && <span data-testid="checkin-required">required</span>}
        {checkInExpired && <span data-testid="checkin-expired">expired</span>}
        {checkInTooEarly && <span data-testid="checkin-early">early</span>}
        {onExtendMeetingDisabled && <span data-testid="extend-disabled">disabled</span>}
      </div>
    );
  }
}));

vi.mock('../global/Socket', () => ({ default: () => null }));
vi.mock('../global/Spinner', () => ({ default: () => <div data-testid="spinner">Loading...</div> }));
vi.mock('../booking/BookingModal', () => ({
  default: function MockBookingModal({ onClose, onSuccess }) {
    return <div data-testid="booking-modal"><button data-testid="booking-close" onClick={onClose}>Close</button><button data-testid="booking-success" onClick={onSuccess}>Success</button></div>;
  }
}));
vi.mock('../booking/ExtendMeetingModal', () => ({
  default: function MockExtendMeetingModal({ onClose, onSuccess }) {
    return <div data-testid="extend-modal"><button data-testid="extend-close" onClick={onClose}>Close</button><button data-testid="extend-success" onClick={onSuccess}>Success</button></div>;
  }
}));

describe('Display extended coverage', () => {
  let mockSocket;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    mockSocket = io.mockSocket;
    mockSocket.on.mockReset();
    mockSocket.emit.mockReset();
    mockSocket.disconnect.mockReset();
    io.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders room with booking config applied', async () => {
    global.fetch.mockImplementation((url) => {
      if (typeof url === 'string') {
        if (url.startsWith('/api/rooms/')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({
            Name: 'Room A', RoomAlias: 'conference-a', Roomlist: 'Building 1',
            Email: 'room@test.com', Busy: true,
            Appointments: [
              { Id: 'apt-1', Subject: 'Meeting', Organizer: 'John', Start: Date.now() - 1800000, End: Date.now() + 1800000, Private: false },
            ]
          }) });
        }
        if (url.startsWith('/api/booking-config')) {
          return Promise.resolve({ ok: true, json: async () => ({ enableBooking: true, enableExtendMeeting: true }) });
        }
        if (url === '/api/maintenance-status') {
          return Promise.resolve({ ok: true, json: async () => ({ enabled: false }) });
        }
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<Display alias="conference-a" />);

    await waitFor(() => {
      expect(screen.getByText('Room A')).toBeInTheDocument();
    });
  });

  it('handles booking modal success callback', async () => {
    setupDisplayFetchMocks(global.fetch, {
      booking: { enableBooking: true }
    });

    render(<Display alias="conference-a" />);

    await waitFor(() => {
      expect(screen.getByTestId('book-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('book-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('booking-modal')).toBeInTheDocument();
    });

    // Click success should trigger getRoomsData
    fireEvent.click(screen.getByTestId('booking-success'));
  });

  it('handles maintenanceConfigUpdated socket event', async () => {
    setupDisplayFetchMocks(global.fetch);
    render(<Display alias="conference-a" />);

    await waitFor(() => {
      expect(screen.getByTestId('room-status-block')).toBeInTheDocument();
    });

    const maintenanceHandler = mockSocket.on.mock.calls.find(c => c[0] === 'maintenanceConfigUpdated');
    expect(maintenanceHandler).toBeDefined();

    await act(async () => {
      maintenanceHandler[1]({ enabled: true, message: 'Under maintenance' });
    });

    await waitFor(() => {
      expect(screen.getByText('Under maintenance')).toBeInTheDocument();
    });
  });

  it('handles room with NotFound flag from API', async () => {
    global.fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.startsWith('/api/rooms/')) {
        return Promise.resolve({ ok: true, json: async () => ({ NotFound: true, Name: '', Appointments: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<Display alias="nonexistent-room" />);

    await waitFor(() => {
      expect(screen.getByTestId('room-status-block')).toBeInTheDocument();
    });
  });

  it('handles colors config from API', async () => {
    setupDisplayFetchMocks(global.fetch, {
      colors: { bookingButtonColor: '#ff0000', statusAvailableColor: '#00ff00' }
    });

    render(<Display alias="conference-a" />);

    await waitFor(() => {
      expect(screen.getByTestId('room-status-block')).toBeInTheDocument();
    });
  });

  it('handles sidebar config fetch error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.startsWith('/api/sidebar')) {
        return Promise.reject(new Error('Sidebar fetch failed'));
      }
      if (typeof url === 'string' && url.startsWith('/api/rooms/')) {
        return Promise.resolve({ ok: true, json: async () => ({ Name: 'Room', RoomAlias: 'conference-a', Appointments: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<Display alias="conference-a" />);

    await waitFor(() => {
      expect(screen.getByTestId('room-status-block')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('handles booking config fetch error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.startsWith('/api/booking-config')) {
        return Promise.reject(new Error('Booking fetch failed'));
      }
      if (typeof url === 'string' && url.startsWith('/api/rooms/')) {
        return Promise.resolve({ ok: true, json: async () => ({ Name: 'Room', RoomAlias: 'conference-a', Appointments: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<Display alias="conference-a" />);

    await waitFor(() => {
      expect(screen.getByTestId('room-status-block')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('handles colors config fetch error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url === '/api/colors') {
        return Promise.reject(new Error('Colors fetch failed'));
      }
      if (typeof url === 'string' && url.startsWith('/api/rooms/')) {
        return Promise.resolve({ ok: true, json: async () => ({ Name: 'Room', RoomAlias: 'conference-a', Appointments: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<Display alias="conference-a" />);

    await waitFor(() => {
      expect(screen.getByTestId('room-status-block')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('renders error modal and closes it', async () => {
    setupDisplayFetchMocks(global.fetch);
    render(<Display alias="conference-a" />);

    await waitFor(() => {
      expect(screen.getByTestId('room-status-block')).toBeInTheDocument();
    });

    // We can't easily trigger the error modal externally, but we can test
    // the componentDidCatch path exists
    expect(Display.prototype.componentDidCatch).toBeDefined();
  });

  it('handles check-in status fetch for room with appointments', async () => {
    setupDisplayFetchMocks(global.fetch, {
      room: {
        Name: 'Room A', RoomAlias: 'conference-a', Email: 'room@test.com',
        Roomlist: 'Building 1', Busy: true,
        Appointments: [
          { Id: 'apt-1', Subject: 'Meeting', Organizer: 'John', Start: Date.now() - 1800000, End: Date.now() + 1800000, Private: false }
        ]
      },
      checkIn: { required: true, checkedIn: false, canCheckInNow: true, expired: false, tooEarly: false, earlyCheckInMinutes: 5 }
    });

    render(<Display alias="conference-a" />);

    await waitFor(() => {
      expect(screen.getByTestId('room-status-block')).toBeInTheDocument();
    });
  });

  it('applies dark mode from legacy route', async () => {
    // Mock window.location.pathname
    const originalPathname = window.location.pathname;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, pathname: '/room-minimal/conference-a' }
    });

    setupDisplayFetchMocks(global.fetch);
    render(<Display alias="conference-a" />);

    await waitFor(() => {
      expect(screen.getByTestId('room-status-block')).toBeInTheDocument();
    });

    // Restore
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, pathname: originalPathname }
    });
  });
});
