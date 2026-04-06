import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import Sidebar from './Sidebar';

// Mock child components
vi.mock('./Clock', () => ({
  default: () => <div data-testid="clock">Clock</div>
}));

vi.mock('../../utils/time-format', () => ({
  uses12HourFormat: vi.fn(() => false)
}));

describe('Sidebar', () => {
  const defaultRoom = {
    Busy: false,
    Appointments: []
  };

  const defaultConfig = {
    privateMeeting: 'Private',
    noSubject: 'No Subject',
    noOrganizer: 'No Organizer',
    noUpcomingMeetings: 'No upcoming meetings',
    wifiTitle: 'WiFi'
  };

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({})
    });
  });

  it('renders the sidebar container', () => {
    const { container } = render(
      <Sidebar room={defaultRoom} config={defaultConfig} />
    );
    expect(container.querySelector('.modern-room-sidebar')).toBeInTheDocument();
  });

  it('renders the Clock component', () => {
    render(<Sidebar room={defaultRoom} config={defaultConfig} />);
    expect(screen.getByTestId('clock')).toBeInTheDocument();
  });

  it('renders the logo image', () => {
    render(<Sidebar room={defaultRoom} config={defaultConfig} />);
    const logo = screen.getByAltText('Logo');
    expect(logo).toBeInTheDocument();
  });

  it('fetches WiFi config on mount', async () => {
    render(<Sidebar room={defaultRoom} config={defaultConfig} />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/wifi');
    });
  });

  it('fetches logo config on mount', async () => {
    render(<Sidebar room={defaultRoom} config={defaultConfig} />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/logo');
    });
  });

  it('renders book button when booking is enabled and room is free', async () => {
    const onBookRoom = vi.fn();
    render(
      <Sidebar
        room={{ Busy: false, Appointments: [] }}
        config={defaultConfig}
        bookingConfig={{ enableBooking: true }}
        onBookRoom={onBookRoom}
        bookButtonText="Book This Room"
      />
    );
    expect(screen.getByText('Book This Room')).toBeInTheDocument();
  });

  it('calls onBookRoom when book button is clicked', () => {
    const onBookRoom = vi.fn();
    render(
      <Sidebar
        room={{ Busy: false, Appointments: [] }}
        config={defaultConfig}
        bookingConfig={{ enableBooking: true }}
        onBookRoom={onBookRoom}
        bookButtonText="Book This Room"
      />
    );
    fireEvent.click(screen.getByText('Book This Room'));
    expect(onBookRoom).toHaveBeenCalled();
  });

  it('renders extend button when room is busy and extend is available', () => {
    const onExtendMeeting = vi.fn();
    render(
      <Sidebar
        room={{ Busy: true, Appointments: [{ Start: '1700000000000', End: '1700003600000', Organizer: 'Test' }] }}
        config={defaultConfig}
        onExtendMeeting={onExtendMeeting}
        extendButtonText="Extend Meeting"
      />
    );
    expect(screen.getByText('Extend Meeting')).toBeInTheDocument();
  });

  it('renders check-in button when check-in is required', () => {
    const onCheckIn = vi.fn();
    render(
      <Sidebar
        room={{ Busy: true, Appointments: [] }}
        config={defaultConfig}
        checkInRequired={true}
        checkInCompleted={false}
        onCheckIn={onCheckIn}
        checkInButtonText="Check-in"
      />
    );
    expect(screen.getByText('Check-in')).toBeInTheDocument();
  });

  it('disables check-in button when expired', () => {
    render(
      <Sidebar
        room={{ Busy: true, Appointments: [] }}
        config={defaultConfig}
        checkInRequired={true}
        checkInCompleted={false}
        checkInExpired={true}
        onCheckIn={vi.fn()}
        checkInButtonText="Check-in"
      />
    );
    expect(screen.getByText('Check-in')).toBeDisabled();
  });

  it('disables check-in button when too early', () => {
    render(
      <Sidebar
        room={{ Busy: true, Appointments: [] }}
        config={defaultConfig}
        checkInRequired={true}
        checkInCompleted={false}
        checkInTooEarly={true}
        onCheckIn={vi.fn()}
        checkInButtonText="Check-in"
      />
    );
    expect(screen.getByText('Check-in')).toBeDisabled();
  });

  it('renders hidden placeholder when no action is available', () => {
    const { container } = render(
      <Sidebar room={defaultRoom} config={defaultConfig} />
    );
    expect(container.querySelector('.sidebar-booking--hidden')).toBeInTheDocument();
  });

  it('handles logo image error with fallback', () => {
    render(<Sidebar room={defaultRoom} config={defaultConfig} />);
    const logo = screen.getByAltText('Logo');
    logo.dispatchEvent(new Event('error'));
    expect(logo.src).toContain('logo.B.png');
  });

  it('uses dark mode logo when forceDarkMode is true', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) }) // wifi
      .mockResolvedValueOnce({ json: () => Promise.resolve({ logoDarkUrl: '/img/dark.png', logoLightUrl: '/img/light.png' }) }) // logo
      .mockResolvedValueOnce({ json: () => Promise.resolve({ singleRoomDarkMode: false }) }); // sidebar

    render(
      <Sidebar room={defaultRoom} config={defaultConfig} forceDarkMode={true} />
    );

    await waitFor(() => {
      const logo = screen.getByAltText('Logo');
      expect(logo.src).toContain('light.png');
    });
  });

  it('handles fetch errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<Sidebar room={defaultRoom} config={defaultConfig} />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('clears interval on unmount', () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(global, 'clearInterval');
    const { unmount } = render(<Sidebar room={defaultRoom} config={defaultConfig} />);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
