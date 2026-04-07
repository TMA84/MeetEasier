import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    genericError: 'An error occurred',
    endGenericError: 'Could not end meeting',
    ipNotWhitelistedError: 'IP not whitelisted',
    originNotAllowedError: 'Origin not allowed',
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

describe('ExtendMeetingModal coverage', () => {
  let onClose, _onSuccess;

  beforeEach(() => {
    vi.restoreAllMocks();
    onClose = vi.fn();
    _onSuccess = vi.fn();
  });

  it('handles 403 origin_not_allowed on extend', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'origin_not_allowed' }),
    });
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.submit(screen.getByText('Extend').closest('form'));
    await waitFor(() => {
      expect(screen.getByText('Origin not allowed')).toBeInTheDocument();
    });
  });

  it('handles non-success response body on extend', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: false, message: 'Conflict detected' }),
    });
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.submit(screen.getByText('Extend').closest('form'));
    await waitFor(() => {
      expect(screen.getByText('Conflict detected')).toBeInTheDocument();
    });
  });

  it('handles 403 ip_not_whitelisted on end meeting', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'ip_not_whitelisted' }),
    });
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('End Now'));
    await waitFor(() => {
      expect(screen.getByText('IP not whitelisted')).toBeInTheDocument();
    });
  });

  it('handles non-success response body on end meeting', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: false, message: 'Cannot end' }),
    });
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('End Now'));
    await waitFor(() => {
      expect(screen.getByText('Cannot end')).toBeInTheDocument();
    });
  });

  it('shows error when room has no appointments for extend', async () => {
    const emptyRoom = { Name: 'Room', Email: 'r@t.com', Busy: true, Appointments: [] };
    render(<ExtendMeetingModal room={emptyRoom} onClose={onClose} />);
    fireEvent.submit(screen.getByText('Extend').closest('form'));
    await waitFor(() => {
      expect(screen.getByText('No active meeting')).toBeInTheDocument();
    });
  });

  it('shows error when room is not busy for extend', async () => {
    const notBusyRoom = { Name: 'Room', Email: 'r@t.com', Busy: false, Appointments: [{ Id: '1' }] };
    render(<ExtendMeetingModal room={notBusyRoom} onClose={onClose} />);
    fireEvent.submit(screen.getByText('Extend').closest('form'));
    await waitFor(() => {
      expect(screen.getByText('No active meeting')).toBeInTheDocument();
    });
  });

  it('shows error when room is null-ish for end meeting', async () => {
    const nullRoom = { Name: 'Room', Email: 'r@t.com' };
    render(<ExtendMeetingModal room={nullRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('End Now'));
    await waitFor(() => {
      expect(screen.getByText('No active meeting to end')).toBeInTheDocument();
    });
  });

  it('disables all buttons while submitting extend', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.submit(screen.getByText('Extend').closest('form'));
    await waitFor(() => {
      expect(screen.getByText('Extending...')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeDisabled();
      expect(screen.getByText('End Now')).toBeDisabled();
    });
  });

  it('disables all buttons while ending meeting', async () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {})); // never resolves
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('End Now'));
    await waitFor(() => {
      expect(screen.getByText('Ending...')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeDisabled();
    });
  });

  it('selects 120 min quick extend', () => {
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('120 min'));
    const slider = screen.getByRole('slider');
    expect(slider.value).toBe('120');
  });

  it('selects 60 min quick extend', () => {
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('60 min'));
    const slider = screen.getByRole('slider');
    expect(slider.value).toBe('60');
  });

  it('handles end meeting error without message property', async () => {
    global.fetch = vi.fn().mockRejectedValue({ message: '' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('End Now'));
    await waitFor(() => {
      expect(screen.getByText('Could not end meeting')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('handles extend error without message property', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockRejectedValue({ message: '' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.submit(screen.getByText('Extend').closest('form'));
    await waitFor(() => {
      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('works without onSuccess callback on extend', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.submit(screen.getByText('Extend').closest('form'));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('works without onSuccess callback on end meeting', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    render(<ExtendMeetingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('End Now'));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
