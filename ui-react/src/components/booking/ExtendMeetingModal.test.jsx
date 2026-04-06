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
