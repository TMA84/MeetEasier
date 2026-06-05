import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ExtendMeetingModal from './ExtendMeetingModal';

vi.mock('../../config/display-translations.js', () => ({
  getMeetingActionModalTranslations: () => ({
    extendBy: 'Extend by',
    minutes: 'min',
    custom: 'Custom',
    cancel: 'Cancel',
    extend: 'Extend',
    extending: 'Extending...',
    endNow: 'End Now',
    ending: 'Ending...',
    noActiveMeeting: 'No active meeting',
    noActiveMeetingEnd: 'No active meeting to end',
    conflictError: 'Extension conflicts with the next scheduled meeting.',
    genericError: 'An error occurred',
    endGenericError: 'Could not end meeting',
    ipNotWhitelistedError: 'IP not whitelisted',
    originNotAllowedError: 'Origin not allowed',
    newEndTime: 'New end time',
  }),
}));

vi.mock('./booking-utils.js', () => ({
  fetchAndApplyBookingButtonColor: vi.fn(),
  fetchWithRetry: vi.fn(),
}));

const mockRoom = {
  Name: 'Test Room',
  Email: 'room@test.com',
  RoomlistAlias: 'floor1',
  Busy: true,
  Appointments: [{ Id: 'appt-1' }],
};

describe('ExtendMeetingModal', () => {
  let onClose;
  let onSuccess;

  beforeEach(() => {
    vi.restoreAllMocks();
    onClose = vi.fn();
    onSuccess = vi.fn();
  });

  it('renders the modal with extend buttons', () => {
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    expect(screen.getByText('Extend by')).toBeInTheDocument();
    expect(screen.getByText('Extend')).toBeInTheDocument();
    expect(screen.getByText('End Now')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders quick extend buttons for 15, 30, 60, 120 minutes', () => {
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    const buttons = screen.getAllByRole('button');
    const quickBtnTexts = buttons.map(b => b.textContent);
    expect(quickBtnTexts).toContain('15 min');
    expect(quickBtnTexts).toContain('60 min');
    expect(quickBtnTexts).toContain('120 min');
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay is clicked', () => {
    const { container } = render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(container.querySelector('.booking-modal-overlay'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when modal body is clicked', () => {
    const { container } = render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(container.querySelector('.booking-modal'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('selects quick extend duration', () => {
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    const quickButtons = screen.getAllByRole('button').filter(b => b.classList.contains('quick-book-btn'));
    const btn15 = quickButtons.find(b => b.textContent === '15 min');
    fireEvent.click(btn15);
    expect(btn15.className).toContain('active');
  });

  it('updates custom duration via slider', () => {
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '45' } });
    expect(screen.getByText(/45 min/)).toBeInTheDocument();
  });

  it('applies dark theme class when theme is dark', () => {
    const { container } = render(<ExtendMeetingModal room={mockRoom} onClose={onClose} theme="dark" />);
    expect(container.querySelector('.booking-modal-overlay.minimal-display')).toBeInTheDocument();
  });

  it('shows error when submitting without active meeting', async () => {
    const emptyRoom = { Name: 'Room', Email: 'r@t.com', Busy: false, Appointments: [] };
    render(<ExtendMeetingModal room={emptyRoom} onClose={onClose} />);
    fireEvent.submit(screen.getByText('Extend').closest('form'));
    await waitFor(() => {
      expect(screen.getByText('No active meeting')).toBeInTheDocument();
    });
  });

  it('submits extend request successfully', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} onSuccess={onSuccess} />);
    fireEvent.submit(screen.getByText('Extend').closest('form'));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows error on failed extend request', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.submit(screen.getByText('Extend').closest('form'));
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('shows IP not whitelisted error on 403', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'ip_not_whitelisted' }),
    });
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.submit(screen.getByText('Extend').closest('form'));
    await waitFor(() => {
      expect(screen.getByText('IP not whitelisted')).toBeInTheDocument();
    });
  });

  it('handles end meeting successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByText('End Now'));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows error when ending meeting without active meeting', async () => {
    const emptyRoom = { Name: 'Room', Email: 'r@t.com', Busy: false, Appointments: [] };
    render(<ExtendMeetingModal room={emptyRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('End Now'));
    await waitFor(() => {
      expect(screen.getByText('No active meeting to end')).toBeInTheDocument();
    });
  });

  it('shows error on failed end meeting request', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'End failed' }),
    });
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('End Now'));
    await waitFor(() => {
      expect(screen.getByText('End failed')).toBeInTheDocument();
    });
  });

  it('handles network error during extend', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.submit(screen.getByText('Extend').closest('form'));
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('handles network error during end meeting', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network down'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('End Now'));
    await waitFor(() => {
      expect(screen.getByText('Network down')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('shows origin not allowed error on 403 for end meeting', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'origin_not_allowed' }),
    });
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('End Now'));
    await waitFor(() => {
      expect(screen.getByText('Origin not allowed')).toBeInTheDocument();
    });
  });
});


describe('ExtendMeetingModal - Rounding Integration', () => {
  let onClose;
  let onSuccess;

  /**
   * Helper: creates a Date in local time at specific hour:minute on a fixed date.
   * Using local time ensures formatTimeHHMM (which uses getHours/getMinutes) produces predictable output.
   */
  function localDate(hours, minutes, seconds = 0, ms = 0) {
    const d = new Date(2024, 5, 15, hours, minutes, seconds, ms); // June 15, 2024 local
    return d;
  }

  // Current meeting ends at 10:03 local (not on a quarter-hour boundary)
  const meetingStart = localDate(10, 0);
  const meetingEnd = localDate(10, 3);

  const roomWithMeeting = {
    Name: 'Test Room',
    Email: 'room@test.com',
    RoomlistAlias: 'floor1',
    Busy: true,
    Appointments: [
      { Id: 'appt-1', Start: String(meetingStart.getTime()), End: String(meetingEnd.getTime()) }
    ]
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    onClose = vi.fn();
    onSuccess = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays effective new end time after Quick-Extend button selection', () => {
    render(<ExtendMeetingModal room={roomWithMeeting} onClose={onClose} />);

    // Click the 15 min quick-extend button
    const buttons = screen.getAllByRole('button');
    const btn15 = buttons.find(b => b.textContent === '15 min' && b.classList.contains('quick-book-btn'));
    fireEvent.click(btn15);

    // 10:03 + 15 = 10:18, rounded up to 10:30
    const endTimeDisplay = screen.getByTestId('effective-new-end-time');
    expect(endTimeDisplay.textContent).toContain('10:30');
  });

  it('displays effective new end time after slider change', () => {
    render(<ExtendMeetingModal room={roomWithMeeting} onClose={onClose} />);

    // Change slider to 45 minutes
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '45' } });

    // 10:03 + 45 = 10:48, rounded up to 11:00
    const endTimeDisplay = screen.getByTestId('effective-new-end-time');
    expect(endTimeDisplay.textContent).toContain('11:00');
  });

  it('recalculates effective new end time every 30 seconds via timer', () => {
    vi.useFakeTimers();

    // Meeting end time at 10:03 - with default 30 min -> 10:03 + 30 = 10:33 -> rounded to 10:45
    render(<ExtendMeetingModal room={roomWithMeeting} onClose={onClose} />);

    const endTimeDisplay = screen.getByTestId('effective-new-end-time');
    // Initial: 10:03 + 30 = 10:33 -> 10:45
    expect(endTimeDisplay.textContent).toContain('10:45');

    // Advance 30 seconds to trigger timer recalculation
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    // Still 10:45 since the meeting end time hasn't changed (room prop is static)
    // The test verifies the timer fires and re-renders without error
    expect(endTimeDisplay.textContent).toContain('10:45');
  });

  it('shows no-active-meeting error when room is not busy', async () => {
    const roomNotBusy = {
      Name: 'Empty Room',
      Email: 'empty@test.com',
      RoomlistAlias: 'floor1',
      Busy: false,
      Appointments: []
    };

    render(<ExtendMeetingModal room={roomNotBusy} onClose={onClose} />);

    // Submit the form
    fireEvent.submit(screen.getByText('Extend').closest('form'));

    await waitFor(() => {
      expect(screen.getByText('No active meeting')).toBeInTheDocument();
    });
  });

  it('shows no-active-meeting error when room has no appointments', async () => {
    const roomNoAppointments = {
      Name: 'Busy Room',
      Email: 'busy@test.com',
      RoomlistAlias: 'floor1',
      Busy: true,
      Appointments: []
    };

    render(<ExtendMeetingModal room={roomNoAppointments} onClose={onClose} />);

    fireEvent.submit(screen.getByText('Extend').closest('form'));

    await waitFor(() => {
      expect(screen.getByText('No active meeting')).toBeInTheDocument();
    });
  });

  it('shows conflict error when effective new end time overlaps with next meeting', async () => {
    // Next meeting starts at 10:20 local - current meeting ends at 10:03 local
    // Selecting 15 min extension: 10:03 + 15 = 10:18, rounded up to 10:30
    // 10:30 > 10:20 → conflict!
    const nextMeetingStart = localDate(10, 20);
    const roomWithNextMeeting = {
      Name: 'Test Room',
      Email: 'room@test.com',
      RoomlistAlias: 'floor1',
      Busy: true,
      Appointments: [
        { Id: 'appt-1', Start: String(meetingStart.getTime()), End: String(meetingEnd.getTime()) },
        { Id: 'appt-2', Start: String(nextMeetingStart.getTime()), End: String(nextMeetingStart.getTime() + 3600000) }
      ]
    };

    render(<ExtendMeetingModal room={roomWithNextMeeting} onClose={onClose} />);

    // Select 15 min extension → effective end = 10:30 local, conflicts with next at 10:20 local
    const buttons = screen.getAllByRole('button');
    const btn15 = buttons.find(b => b.textContent === '15 min' && b.classList.contains('quick-book-btn'));
    fireEvent.click(btn15);

    // Submit the form
    fireEvent.submit(screen.getByText('Extend').closest('form'));

    await waitFor(() => {
      expect(screen.getByText('Extension conflicts with the next scheduled meeting.')).toBeInTheDocument();
    });
  });

  it('submits successfully when no conflict with next meeting', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Next meeting starts at 12:00 local - far enough away
    const nextMeetingStart = localDate(12, 0);
    const roomWithFarNextMeeting = {
      Name: 'Test Room',
      Email: 'room@test.com',
      RoomlistAlias: 'floor1',
      Busy: true,
      Appointments: [
        { Id: 'appt-1', Start: String(meetingStart.getTime()), End: String(meetingEnd.getTime()) },
        { Id: 'appt-2', Start: String(nextMeetingStart.getTime()), End: String(nextMeetingStart.getTime() + 3600000) }
      ]
    };

    render(<ExtendMeetingModal room={roomWithFarNextMeeting} onClose={onClose} onSuccess={onSuccess} />);

    // Default 30 min → effective end = 10:03 + 30 = 10:33 → rounded to 10:45
    // 10:45 < 12:00 → no conflict
    fireEvent.submit(screen.getByText('Extend').closest('form'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
