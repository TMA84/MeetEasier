import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderBookingModal } from './test-helpers';

describe('BookingModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({})
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders booking modal with action buttons', () => {
    renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

    expect(screen.getByText('Book Room')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders quick book buttons', () => {
    renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

    const buttons = screen.getAllByRole('button');
    const quickBookTexts = buttons.map(b => b.textContent);
    expect(quickBookTexts).toContain('15 min');
    expect(quickBookTexts).toContain('30 min');
    expect(quickBookTexts).toContain('60 min');
    expect(quickBookTexts).toContain('120 min');
  });

  it('renders duration slider', () => {
    renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
  });

  it('closes modal when cancel button is clicked', () => {
    renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes modal when overlay is clicked', () => {
    renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

    const overlay = screen.getByText('Book Room').closest('.booking-modal-overlay');
    fireEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not close modal when modal content is clicked', () => {
    renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

    const modal = screen.getByText('Book Room').closest('.booking-modal');
    fireEvent.click(modal);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('highlights active quick book button', () => {
    renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

    // Default is 30 min - find the quick book button (not the duration display)
    const buttons = screen.getAllByRole('button');
    const btn30 = buttons.find(b => b.textContent === '30 min' && b.classList.contains('quick-book-btn'));
    expect(btn30.className).toContain('active');

    // Click 15 min
    const btn15 = buttons.find(b => b.textContent === '15 min');
    fireEvent.click(btn15);
    expect(btn15.className).toContain('active');
  });

  it('updates duration slider when quick book button is clicked', () => {
    renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

    const btn60 = screen.getByText('60 min');
    fireEvent.click(btn60);

    const slider = screen.getByRole('slider');
    expect(slider.value).toBe('60');
  });

  it('updates duration display when slider changes', () => {
    renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '45' } });

    expect(screen.getByText('45 min')).toBeInTheDocument();
  });

  it('successfully books room', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // fetchAndApplyBookingButtonColor
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, eventId: '123' })
      });

    renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

    const bookButton = screen.getByText('Book Room');
    fireEvent.click(bookButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith({ success: true, eventId: '123' });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows error when booking fails', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // fetchAndApplyBookingButtonColor
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Booking failed' })
      });

    renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

    const bookButton = screen.getByText('Book Room');
    fireEvent.click(bookButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to book room. Please try again.')).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('disables buttons while submitting', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // fetchAndApplyBookingButtonColor
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

    const bookButton = screen.getByText('Book Room');
    fireEvent.click(bookButton);

    expect(screen.getByText('Booking...')).toBeInTheDocument();
  });

  it('handles network errors gracefully', async () => {
    // fetchAndApplyBookingButtonColor succeeds, but the booking fetch fails with retries
    global.fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.startsWith('/api/booking-config')) {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.reject(new Error('Network error'));
    });

    renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

    const bookButton = screen.getByText('Book Room');
    fireEvent.click(bookButton);

    // fetchWithRetry retries 2 times with 1s delay = ~2s total + processing
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    }, { timeout: 8000 });
  }, 10000);

  it('quick book 15 minutes sets correct duration', () => {
    renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

    const quickBook15 = screen.getByText('15 min');
    fireEvent.click(quickBook15);

    const slider = screen.getByRole('slider');
    expect(slider.value).toBe('15');
  });

  it('quick book 60 minutes sets correct duration', () => {
    renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

    const quickBook60 = screen.getByText('60 min');
    fireEvent.click(quickBook60);

    const slider = screen.getByRole('slider');
    expect(slider.value).toBe('60');
  });

  it('quick book 120 minutes sets correct duration', () => {
    renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

    const quickBook120 = screen.getByText('120 min');
    fireEvent.click(quickBook120);

    const slider = screen.getByRole('slider');
    expect(slider.value).toBe('120');
  });
});


describe('BookingModal - Rounding Integration', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Set a fixed time: 10:03:00.000 on 2024-01-15
    vi.setSystemTime(new Date(2024, 0, 15, 10, 3, 0, 0));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({})
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Effective end time display', () => {
    it('displays effective end time in HH:MM format after selecting a Quick-Book button', () => {
      // At 10:03, 30 min duration → raw end 10:33 → rounded to 10:45
      renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

      // Default is 30 min, so effective end time should be 10:45
      const endTimeValue = screen.getByText('10:45');
      expect(endTimeValue).toBeInTheDocument();
      expect(endTimeValue).toHaveClass('effective-end-time-value');
    });

    it('displays updated effective end time when 15 min Quick-Book is selected', () => {
      // At 10:03, 15 min duration → raw end 10:18 → rounded to 10:30
      renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

      const btn15 = screen.getByText('15 min');
      fireEvent.click(btn15);

      expect(screen.getByText('10:30')).toBeInTheDocument();
    });

    it('displays updated effective end time when 60 min Quick-Book is selected', () => {
      // At 10:03, 60 min duration → raw end 11:03 → rounded to 11:15
      renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

      const btn60 = screen.getByText('60 min');
      fireEvent.click(btn60);

      expect(screen.getByText('11:15')).toBeInTheDocument();
    });

    it('updates effective end time when slider value changes', () => {
      // At 10:03, 45 min duration → raw end 10:48 → rounded to 11:00
      renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '45' } });

      expect(screen.getByText('11:00')).toBeInTheDocument();
    });

    it('displays effective end time section with label', () => {
      renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

      const label = screen.getByText('End Time:');
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass('effective-end-time-label');
    });
  });

  describe('30-second timer refresh', () => {
    it('recalculates effective end time every 30 seconds', () => {
      // Start at 10:03
      renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

      // Default 30 min → raw end 10:33 → rounded to 10:45
      expect(screen.getByText('10:45')).toBeInTheDocument();

      // Advance system time by 30 seconds to 10:03:30
      vi.setSystemTime(new Date(2024, 0, 15, 10, 3, 30, 0));

      // Advance timer by 30 seconds to trigger the interval
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // 30 min from 10:03:30 → 10:33:30 → rounded to 10:45 (same in this case)
      expect(screen.getByText('10:45')).toBeInTheDocument();
    });

    it('updates displayed time when system time advances past a boundary', () => {
      // Start at 10:03
      renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

      // Select 15 min: raw end 10:18 → rounded to 10:30
      const btn15 = screen.getByText('15 min');
      fireEvent.click(btn15);
      expect(screen.getByText('10:30')).toBeInTheDocument();

      // Advance time by 15 minutes to 10:18
      vi.setSystemTime(new Date(2024, 0, 15, 10, 18, 0, 0));

      // Trigger timer refresh
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // 15 min from 10:18 → 10:33 → rounded to 10:45
      expect(screen.getByText('10:45')).toBeInTheDocument();
    });

    it('clears timer on unmount', () => {
      const { unmount } = renderBookingModal({ onClose: mockOnClose, onSuccess: mockOnSuccess });

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});

describe('BookingModal - Conflict Detection', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Set a fixed time: 10:03:00.000 on 2024-01-15
    vi.setSystemTime(new Date(2024, 0, 15, 10, 3, 0, 0));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({})
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('prevents submission when rounded end time conflicts with next appointment', async () => {
    // At 10:03, 30 min → raw end 10:33 → rounded to 10:45
    // Next appointment starts at 10:40 (epoch ms)
    const roomWithAppointment = {
      Name: 'Conference Room A',
      Email: 'conference-a@example.com',
      Appointments: [
        {
          Start: String(new Date(2024, 0, 15, 10, 40, 0, 0).getTime()),
          End: String(new Date(2024, 0, 15, 11, 0, 0, 0).getTime()),
          Id: 'appt-1'
        }
      ]
    };

    renderBookingModal({
      room: roomWithAppointment,
      onClose: mockOnClose,
      onSuccess: mockOnSuccess
    });

    // Submit the form — conflict is detected synchronously before fetch
    const bookButton = screen.getByText('Book Room');
    await act(async () => {
      fireEvent.click(bookButton);
    });

    // Should show conflict error
    expect(screen.getByText('This room is already booked during the selected time. Please choose a different time.')).toBeInTheDocument();

    // Should NOT call onSuccess or onClose
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('allows submission when there is no conflict with next appointment', async () => {
    // At 10:03, 30 min → raw end 10:33 → rounded to 10:45
    // Next appointment starts at 11:00 (no conflict)
    const roomWithoutConflict = {
      Name: 'Conference Room A',
      Email: 'conference-a@example.com',
      Appointments: [
        {
          Start: String(new Date(2024, 0, 15, 11, 0, 0, 0).getTime()),
          End: String(new Date(2024, 0, 15, 12, 0, 0, 0).getTime()),
          Id: 'appt-2'
        }
      ]
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // fetchAndApplyBookingButtonColor
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, eventId: '456' })
      });

    renderBookingModal({
      room: roomWithoutConflict,
      onClose: mockOnClose,
      onSuccess: mockOnSuccess
    });

    const bookButton = screen.getByText('Book Room');
    await act(async () => {
      fireEvent.click(bookButton);
      // Flush resolved promises
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockOnSuccess).toHaveBeenCalledWith({ success: true, eventId: '456' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('allows submission when there are no future appointments', async () => {
    // Room with no appointments
    const roomNoAppointments = {
      Name: 'Conference Room A',
      Email: 'conference-a@example.com',
      Appointments: []
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // fetchAndApplyBookingButtonColor
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, eventId: '789' })
      });

    renderBookingModal({
      room: roomNoAppointments,
      onClose: mockOnClose,
      onSuccess: mockOnSuccess
    });

    const bookButton = screen.getByText('Book Room');
    await act(async () => {
      fireEvent.click(bookButton);
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockOnSuccess).toHaveBeenCalledWith({ success: true, eventId: '789' });
  });

  it('detects conflict when rounding causes overlap that raw end time would not', async () => {
    // At 10:03, 30 min → raw end 10:33 (no conflict with 10:35 start)
    // But rounded to 10:45 → CONFLICTS with appointment at 10:35
    const roomWithBorderlineConflict = {
      Name: 'Conference Room A',
      Email: 'conference-a@example.com',
      Appointments: [
        {
          Start: String(new Date(2024, 0, 15, 10, 35, 0, 0).getTime()),
          End: String(new Date(2024, 0, 15, 11, 0, 0, 0).getTime()),
          Id: 'appt-3'
        }
      ]
    };

    renderBookingModal({
      room: roomWithBorderlineConflict,
      onClose: mockOnClose,
      onSuccess: mockOnSuccess
    });

    const bookButton = screen.getByText('Book Room');
    await act(async () => {
      fireEvent.click(bookButton);
    });

    expect(screen.getByText('This room is already booked during the selected time. Please choose a different time.')).toBeInTheDocument();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
