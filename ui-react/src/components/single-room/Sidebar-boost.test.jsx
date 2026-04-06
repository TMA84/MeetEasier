import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import React from 'react';
import Sidebar from './Sidebar';

vi.mock('./Clock', () => ({
  default: () => <div data-testid="clock">Clock</div>
}));

vi.mock('../../utils/time-format', () => ({
  uses12HourFormat: vi.fn(() => false)
}));

const defaultRoom = { Busy: false, Appointments: [] };
const defaultConfig = {
  privateMeeting: 'Private', noSubject: 'No Subject',
  noOrganizer: 'No Organizer', noUpcomingMeetings: 'No upcoming meetings',
  wifiTitle: 'WiFi',
};

describe('Sidebar extended coverage', () => {
  let mockSocket;

  beforeEach(() => {
    mockSocket = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({})
    });
  });

  it('renders upcoming meetings when showUpcomingMeetings is enabled via API', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ ssid: 'TestNet', password: 'pass' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ showUpcomingMeetings: true, showMeetingTitles: true, upcomingMeetingsCount: 3 }) });

    const room = {
      Busy: true,
      Appointments: [
        { Subject: 'Current', Organizer: 'Alice', Start: String(Date.now() - 1800000), End: String(Date.now() + 1800000), Private: false },
        { Subject: 'Next Meeting', Organizer: 'Bob', Start: String(Date.now() + 3600000), End: String(Date.now() + 5400000), Private: false },
      ]
    };

    render(<Sidebar room={room} config={defaultConfig} />);

    await waitFor(() => {
      expect(screen.getByText('Next Meeting')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('shows no upcoming meetings message when room has no appointments', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ showUpcomingMeetings: true }) });

    render(<Sidebar room={{ Busy: false, Appointments: [] }} config={defaultConfig} />);

    await waitFor(() => {
      expect(screen.getByText('No upcoming meetings')).toBeInTheDocument();
    });
  });

  it('shows private meeting label for private appointments', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ showUpcomingMeetings: true, showMeetingTitles: true }) });

    const room = {
      Busy: false,
      Appointments: [
        { Subject: 'Secret', Organizer: 'Admin', Start: String(Date.now() + 3600000), End: String(Date.now() + 5400000), Private: true },
      ]
    };

    render(<Sidebar room={room} config={defaultConfig} />);

    await waitFor(() => {
      expect(screen.getByText('Private')).toBeInTheDocument();
    });
  });

  it('renders WiFi section when config has ssid', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ ssid: 'MyWiFi', password: 'secret123' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ showWiFi: true }) });

    render(<Sidebar room={defaultRoom} config={defaultConfig} />);

    await waitFor(() => {
      expect(screen.getByText('MyWiFi')).toBeInTheDocument();
      expect(screen.getByText('secret123')).toBeInTheDocument();
      expect(screen.getByText('WiFi')).toBeInTheDocument();
    });
  });

  it('hides WiFi section when showWiFi is false', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ ssid: 'MyWiFi' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ showWiFi: false }) });

    const { container } = render(<Sidebar room={defaultRoom} config={defaultConfig} />);

    await waitFor(() => {
      expect(container.querySelector('.sidebar-wifi')).not.toBeInTheDocument();
    });
  });

  it('renders extend button as disabled when onExtendMeetingDisabled is true', () => {
    render(
      <Sidebar
        room={{ Busy: true, Appointments: [{ Start: '1700000000000', End: '1700003600000', Organizer: 'Test' }] }}
        config={defaultConfig}
        onExtendMeeting={null}
        onExtendMeetingDisabled={true}
        extendButtonText="Extend Meeting"
        extendDisabledTitle="Cannot extend"
      />
    );
    const btn = screen.getByText('Extend Meeting');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'Cannot extend');
  });

  it('handles socket wifiConfigUpdated event', async () => {
    render(<Sidebar room={defaultRoom} config={defaultConfig} socket={mockSocket} />);

    const wifiHandler = mockSocket.on.mock.calls.find(c => c[0] === 'wifiConfigUpdated');
    expect(wifiHandler).toBeDefined();

    await act(async () => {
      wifiHandler[1]({ ssid: 'UpdatedWiFi', password: 'newpass' });
    });
  });

  it('handles socket logoConfigUpdated event', async () => {
    render(<Sidebar room={defaultRoom} config={defaultConfig} socket={mockSocket} />);

    const logoHandler = mockSocket.on.mock.calls.find(c => c[0] === 'logoConfigUpdated');
    expect(logoHandler).toBeDefined();

    await act(async () => {
      logoHandler[1]({ logoDarkUrl: '/new/dark.png', logoLightUrl: '/new/light.png' });
    });
  });

  it('handles socket sidebarConfigUpdated event', async () => {
    render(<Sidebar room={defaultRoom} config={defaultConfig} socket={mockSocket} />);

    const sidebarHandler = mockSocket.on.mock.calls.find(c => c[0] === 'sidebarConfigUpdated');
    expect(sidebarHandler).toBeDefined();

    await act(async () => {
      sidebarHandler[1]({ showWiFi: false, showUpcomingMeetings: true, showMeetingTitles: true, upcomingMeetingsCount: 5, singleRoomDarkMode: true });
    });
  });

  it('handles sidebarConfigUpdated with missing fields', async () => {
    render(<Sidebar room={defaultRoom} config={defaultConfig} socket={mockSocket} />);

    const sidebarHandler = mockSocket.on.mock.calls.find(c => c[0] === 'sidebarConfigUpdated');

    await act(async () => {
      sidebarHandler[1]({}); // all undefined
    });
    // Should not crash, defaults should apply
  });

  it('handles sidebarConfigUpdated with invalid upcomingMeetingsCount', async () => {
    render(<Sidebar room={defaultRoom} config={defaultConfig} socket={mockSocket} />);

    const sidebarHandler = mockSocket.on.mock.calls.find(c => c[0] === 'sidebarConfigUpdated');

    await act(async () => {
      sidebarHandler[1]({ upcomingMeetingsCount: 'invalid' });
    });
    // Should not crash
  });

  it('renders appointments without Start/End gracefully', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ showUpcomingMeetings: true }) });

    const room = {
      Busy: false,
      Appointments: [
        { Subject: 'No Time', Organizer: 'Test', Private: false },
      ]
    };

    render(<Sidebar room={room} config={defaultConfig} />);

    await waitFor(() => {
      expect(screen.getByText('Time not available')).toBeInTheDocument();
    });
  });

  it('renders appointments with no subject', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ showUpcomingMeetings: true, showMeetingTitles: true }) });

    const room = {
      Busy: false,
      Appointments: [
        { Organizer: 'Test', Start: String(Date.now() + 3600000), End: String(Date.now() + 5400000), Private: false },
      ]
    };

    render(<Sidebar room={room} config={defaultConfig} />);

    await waitFor(() => {
      expect(screen.getByText('No Subject')).toBeInTheDocument();
    });
  });

  it('renders appointments with no organizer', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ showUpcomingMeetings: true }) });

    const room = {
      Busy: false,
      Appointments: [
        { Subject: 'Test', Start: String(Date.now() + 3600000), End: String(Date.now() + 5400000), Private: false },
      ]
    };

    render(<Sidebar room={room} config={defaultConfig} />);

    await waitFor(() => {
      expect(screen.getByText('No Organizer')).toBeInTheDocument();
    });
  });

  it('renders spacer when upcoming meetings are hidden', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ showUpcomingMeetings: false }) });

    const { container } = render(<Sidebar room={defaultRoom} config={defaultConfig} />);

    await waitFor(() => {
      expect(container.querySelector('.sidebar-spacer')).toBeInTheDocument();
    });
  });

  it('renders check-in button with too early title', () => {
    render(
      <Sidebar
        room={{ Busy: true, Appointments: [] }}
        config={defaultConfig}
        checkInRequired={true}
        checkInCompleted={false}
        checkInTooEarly={true}
        checkInEarlyMinutes={10}
        onCheckIn={vi.fn()}
        checkInButtonText="Check-in"
        checkInTooEarlyTitle="Check-in available {minutes} minutes before start"
      />
    );
    const btn = screen.getByText('Check-in');
    expect(btn).toBeDisabled();
    expect(btn.title).toContain('10');
  });

  it('does not render check-in button when completed', () => {
    const { container } = render(
      <Sidebar
        room={{ Busy: true, Appointments: [] }}
        config={defaultConfig}
        checkInRequired={true}
        checkInCompleted={true}
        onCheckIn={vi.fn()}
      />
    );
    expect(container.querySelector('.sidebar-booking--hidden')).toBeInTheDocument();
  });

  it('calls onCheckIn when check-in button is clicked', () => {
    const handler = vi.fn();
    render(
      <Sidebar
        room={{ Busy: true, Appointments: [] }}
        config={defaultConfig}
        checkInRequired={true}
        checkInCompleted={false}
        onCheckIn={handler}
        checkInButtonText="Check-in"
      />
    );
    fireEvent.click(screen.getByText('Check-in'));
    expect(handler).toHaveBeenCalled();
  });

  it('renders WiFi QR code image', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ ssid: 'Net', password: 'pass' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ showWiFi: true }) });

    render(<Sidebar room={defaultRoom} config={defaultConfig} />);

    await waitFor(() => {
      const qr = screen.getByAltText('WiFi QR Code');
      expect(qr).toBeInTheDocument();
      expect(qr.src).toContain('wifi-qr.png');
    });
  });
});
