import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookingModal from './BookingModal';

describe('BookingModal', () => {
  const mockRoom = {
    Name: 'Conference Room A',
    Email: 'conference-a@example.com'
  };

  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders booking modal with room name', () => {
    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Book Conference Room A')).toBeInTheDocument();
  });

  it('renders quick book buttons', () => {
    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('15 min')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('60 min')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('renders form fields', () => {
    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByLabelText(/Meeting Subject/i)).toBeInTheDocument();
  });

  it('closes modal when close button is clicked', () => {
    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes modal when overlay is clicked', () => {
    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const overlay = screen.getByText('Book Conference Room A').closest('.booking-modal-overlay');
    fireEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not close modal when modal content is clicked', () => {
    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const modal = screen.getByText('Book Conference Room A').closest('.booking-modal');
    fireEvent.click(modal);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows custom time section when Custom button is clicked', () => {
    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const customButton = screen.getByText('Custom');
    fireEvent.click(customButton);

    expect(screen.getByLabelText(/Start Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Time/i)).toBeInTheDocument();
  });

  it('updates subject field when typing', () => {
    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const subjectInput = screen.getByLabelText(/Meeting Subject/i);
    fireEvent.change(subjectInput, { target: { value: 'Team Meeting' } });

    expect(subjectInput.value).toBe('Team Meeting');
  });

  it('shows error when submitting without subject', async () => {
    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Clear the default subject
    const subjectInput = screen.getByLabelText(/Meeting Subject/i);
    fireEvent.change(subjectInput, { target: { value: '' } });

    const bookButton = screen.getByText('Book Room');
    fireEvent.click(bookButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a meeting subject')).toBeInTheDocument();
    });
  });

  it('successfully books room with valid data', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, eventId: '123' })
    });

    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const subjectInput = screen.getByLabelText(/Meeting Subject/i);
    fireEvent.change(subjectInput, { target: { value: 'Team Meeting' } });

    const bookButton = screen.getByText('Book Room');
    fireEvent.click(bookButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith({ success: true, eventId: '123' });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows error when booking fails', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Booking failed', message: 'Room is busy' })
    });

    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const subjectInput = screen.getByLabelText(/Meeting Subject/i);
    fireEvent.change(subjectInput, { target: { value: 'Team Meeting' } });

    const bookButton = screen.getByText('Book Room');
    fireEvent.click(bookButton);

    await waitFor(() => {
      expect(screen.getByText('Room is busy')).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('disables buttons while submitting', async () => {
    global.fetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const subjectInput = screen.getByLabelText(/Meeting Subject/i);
    fireEvent.change(subjectInput, { target: { value: 'Team Meeting' } });

    const bookButton = screen.getByText('Book Room');
    fireEvent.click(bookButton);

    expect(screen.getByText('Booking...')).toBeInTheDocument();
    expect(bookButton).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('handles network errors gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const subjectInput = screen.getByLabelText(/Meeting Subject/i);
    fireEvent.change(subjectInput, { target: { value: 'Team Meeting' } });

    const bookButton = screen.getByText('Book Room');
    fireEvent.click(bookButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('quick book 15 minutes sets correct times', () => {
    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const quickBook15 = screen.getByText('15 min');
    fireEvent.click(quickBook15);

    // Custom time section should be hidden after quick book
    expect(screen.queryByLabelText(/Start Time/i)).not.toBeInTheDocument();
  });

  it('quick book 30 minutes sets correct times', () => {
    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const quickBook30 = screen.getByText('30 min');
    fireEvent.click(quickBook30);

    expect(screen.queryByLabelText(/Start Time/i)).not.toBeInTheDocument();
  });

  it('quick book 60 minutes sets correct times', () => {
    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const quickBook60 = screen.getByText('60 min');
    fireEvent.click(quickBook60);

    expect(screen.queryByLabelText(/Start Time/i)).not.toBeInTheDocument();
  });

  it('automatically sets end time to +15 minutes when start time is changed', () => {
    render(
      <BookingModal
        room={mockRoom}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Click custom to show time inputs
    const customButton = screen.getByText('Custom');
    fireEvent.click(customButton);

    const startTimeInput = screen.getByLabelText(/Start Time/i);
    const endTimeInput = screen.getByLabelText(/End Time/i);

    // Change start time
    const newStartTime = '2024-02-08T14:00';
    fireEvent.change(startTimeInput, { target: { value: newStartTime } });

    // End time should be automatically set to +15 minutes
    const expectedEndTime = '2024-02-08T14:15';
    expect(endTimeInput.value).toBe(expectedEndTime);
  });
});
