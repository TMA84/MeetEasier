import { screen, fireEvent, waitFor } from '@testing-library/react';
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
