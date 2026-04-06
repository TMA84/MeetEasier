import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAndApplyBookingButtonColor, fetchWithRetry, generateDurationOptions } from './booking-utils';

describe('booking-utils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.documentElement.style.removeProperty('--booking-button-color');
  });

  describe('generateDurationOptions', () => {
    it('returns array of 5-minute intervals from 5 to 240', () => {
      const options = generateDurationOptions();
      expect(options[0]).toBe(5);
      expect(options[options.length - 1]).toBe(240);
      expect(options.length).toBe(48);
      expect(options.every((v, i) => v === (i + 1) * 5)).toBe(true);
    });
  });

  describe('fetchWithRetry', () => {
    it('returns response on first successful attempt', async () => {
      const mockResponse = { ok: true };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);
      const result = await fetchWithRetry('/api/test', {});
      expect(result).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and succeeds on second attempt', async () => {
      const mockResponse = { ok: true };
      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockResponse);
      const result = await fetchWithRetry('/api/test', {}, 2, 'Test');
      expect(result).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('throws after exhausting all retries', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      await expect(fetchWithRetry('/api/test', {}, 1, 'Test')).rejects.toThrow('Network error');
      expect(global.fetch).toHaveBeenCalledTimes(2); // initial + 1 retry
    });

    it('uses default retries of 2', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('fail'));
      await expect(fetchWithRetry('/api/test', {})).rejects.toThrow();
      expect(global.fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    });
  });

  describe('fetchAndApplyBookingButtonColor', () => {
    it('fetches config and sets CSS custom property', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ buttonColor: '#ff0000' })
      });
      fetchAndApplyBookingButtonColor({ Email: 'room@test.com', RoomlistAlias: 'floor1' });
      await vi.waitFor(() => {
        expect(document.documentElement.style.getPropertyValue('--booking-button-color')).toBe('#ff0000');
      });
    });

    it('uses default color when buttonColor is not in response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({})
      });
      fetchAndApplyBookingButtonColor({ Email: 'room@test.com' });
      await vi.waitFor(() => {
        expect(document.documentElement.style.getPropertyValue('--booking-button-color')).toBe('#334155');
      });
    });

    it('handles fetch error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      fetchAndApplyBookingButtonColor({ Email: 'room@test.com' });
      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
    });

    it('builds correct endpoint with room email and group', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ buttonColor: '#000' })
      });
      fetchAndApplyBookingButtonColor({ Email: 'r@t.com', RoomlistAlias: 'g1' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/booking-config?roomEmail=r%40t.com&roomGroup=g1')
      );
    });

    it('uses base endpoint when room has no email', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({})
      });
      fetchAndApplyBookingButtonColor({});
      expect(global.fetch).toHaveBeenCalledWith('/api/booking-config');
    });
  });
});
