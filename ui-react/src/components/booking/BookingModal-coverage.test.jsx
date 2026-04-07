import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookingModal from './BookingModal';

vi.mock('../../config/display-translations.js', () => ({
  getBookingModalTranslations: () => ({
    defaultSubject: 'Ad-hoc Meeting',
    bookRoom: 'Book Room',
    booking: 'Booking...',
    cancel: 'Cancel',
    minutes: 'min',
    duration: 'Duration',
    conflictError: 'Room is already booked',
    ipNotWhitelistedError: 'IP not whitelisted',
    originNotAllowedError: 'Origin not allowed',
    bookingDisabledError: 'Booking is disabled',
    genericError: 'Failed to book room. Please try again.',
  }),
}));

vi.mock('./booking-utils.js', () => ({
  fetchAndApplyBookingButtonColor: vi.fn(),
  fetchWithRetry: vi.fn(),
}));

const mockRoom = { Name: 'Room A', Email: 'room-a@test.com', RoomlistAlias: 'floor1' };

describe('BookingModal coverage', () => {
  let onClose, onSuccess;

  beforeEach(() => {
    vi.restoreAllMocks();
    onClose = vi.fn();
    onSuccess = vi.fn();
  });

  it('applies dark theme class', () => {
    const { container } = render(<BookingModal room={mockRoom} onClose={onClose} theme="dark" />);
    expect(container.querySelector('.booking-modal-overlay.minimal-display')).toBeInTheDocument();
  });

  it('does not apply dark theme class for light theme', () => {
    const { container } = render(<BookingModal room={mockRoom} onClose={onClose} theme="light" />);
    expect(container.querySelector('.booking-modal-overlay.minimal-display')).toBeNull();
  });

  it('handles 409 conflict error', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Conflict' }),
    });
    render(<BookingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('Book Room'));
    await waitFor(() => {
      expect(screen.getByText('Room is already booked')).toBeInTheDocument();
    });
  });

  it('handles 403 ip_not_whitelisted error', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'ip_not_whitelisted' }),
    });
    render(<BookingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('Book Room'));
    await waitFor(() => {
      expect(screen.getByText('IP not whitelisted')).toBeInTheDocument();
    });
  });

  it('handles 403 origin_not_allowed error', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'origin_not_allowed' }),
    });
    render(<BookingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('Book Room'));
    await waitFor(() => {
      expect(screen.getByText('Origin not allowed')).toBeInTheDocument();
    });
  });

  it('handles 403 Booking disabled error', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Booking disabled' }),
    });
    render(<BookingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('Book Room'));
    await waitFor(() => {
      expect(screen.getByText('Booking is disabled')).toBeInTheDocument();
    });
  });

  it('calls onSuccess and onClose on successful booking', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, eventId: 'evt-1' }),
    });
    render(<BookingModal room={mockRoom} onClose={onClose} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByText('Book Room'));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({ success: true, eventId: 'evt-1' });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('works without onSuccess callback', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    render(<BookingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('Book Room'));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows generic error for non-specific server errors', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal error' }),
    });
    render(<BookingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('Book Room'));
    await waitFor(() => {
      expect(screen.getByText('Failed to book room. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows error message from catch block without message', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockRejectedValue(new Error(''));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<BookingModal room={mockRoom} onClose={onClose} />);
    fireEvent.click(screen.getByText('Book Room'));
    await waitFor(() => {
      expect(screen.getByText('Failed to book room. Please try again.')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('selects 120 min quick book and submits', async () => {
    const { fetchWithRetry } = await import('./booking-utils.js');
    fetchWithRetry.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    render(<BookingModal room={mockRoom} onClose={onClose} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByText('120 min'));
    const slider = screen.getByRole('slider');
    expect(slider.value).toBe('120');
    fireEvent.click(screen.getByText('Book Room'));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
