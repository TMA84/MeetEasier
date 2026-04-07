import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PowerManagement from './power-management';

describe('PowerManagement coverage', () => {
  let pm;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    pm = new PowerManagement('client-1');
  });

  afterEach(() => {
    pm.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('checkSchedule - weekday behavior', () => {
    it('turns off during off-hours on weekday', () => {
      pm.config = { schedule: { enabled: true, startTime: '20:00', endTime: '07:00', weekendMode: false } };
      const weekdayNight = new Date('2024-01-08T22:00:00'); // Monday 22:00
      vi.setSystemTime(weekdayNight);
      pm.checkSchedule();
      expect(pm.isDisplayOff).toBe(true);
    });

    it('stays on during work hours on weekday', () => {
      pm.config = { schedule: { enabled: true, startTime: '20:00', endTime: '07:00', weekendMode: false } };
      const weekdayDay = new Date('2024-01-08T12:00:00'); // Monday 12:00
      vi.setSystemTime(weekdayDay);
      pm.checkSchedule();
      expect(pm.isDisplayOff).toBe(false);
    });

    it('turns on when off-hours end', () => {
      pm.config = { schedule: { enabled: true, startTime: '20:00', endTime: '07:00', weekendMode: false } };
      // First turn off
      const nightTime = new Date('2024-01-08T22:00:00');
      vi.setSystemTime(nightTime);
      pm.checkSchedule();
      expect(pm.isDisplayOff).toBe(true);
      // Then turn on
      const morningTime = new Date('2024-01-09T08:00:00');
      vi.setSystemTime(morningTime);
      pm.checkSchedule();
      expect(pm.isDisplayOff).toBe(false);
    });

    it('does not turn off on weekend when weekendMode is false', () => {
      pm.config = { schedule: { enabled: true, startTime: '20:00', endTime: '07:00', weekendMode: false } };
      const saturdayNoon = new Date('2024-01-06T12:00:00'); // Saturday noon
      vi.setSystemTime(saturdayNoon);
      pm.checkSchedule();
      expect(pm.isDisplayOff).toBe(false);
    });

    it('turns off on Sunday when weekendMode is true', () => {
      pm.config = { schedule: { enabled: true, startTime: '20:00', endTime: '07:00', weekendMode: true } };
      const sunday = new Date('2024-01-07T12:00:00'); // Sunday
      vi.setSystemTime(sunday);
      pm.checkSchedule();
      expect(pm.isDisplayOff).toBe(true);
    });
  });

  describe('checkSchedule - same-day range', () => {
    it('turns off during same-day off period', () => {
      pm.config = { schedule: { enabled: true, startTime: '12:00', endTime: '14:00', weekendMode: false } };
      const lunchTime = new Date('2024-01-08T13:00:00');
      vi.setSystemTime(lunchTime);
      pm.checkSchedule();
      expect(pm.isDisplayOff).toBe(true);
    });

    it('stays on outside same-day off period', () => {
      pm.config = { schedule: { enabled: true, startTime: '12:00', endTime: '14:00', weekendMode: false } };
      const morning = new Date('2024-01-08T10:00:00');
      vi.setSystemTime(morning);
      pm.checkSchedule();
      expect(pm.isDisplayOff).toBe(false);
    });
  });

  describe('checkSchedule - no action needed', () => {
    it('does nothing when already off and should be off', () => {
      pm.config = { schedule: { enabled: true, startTime: '20:00', endTime: '07:00', weekendMode: false } };
      const nightTime = new Date('2024-01-08T22:00:00');
      vi.setSystemTime(nightTime);
      pm.turnDisplayOff();
      pm.checkSchedule();
      expect(pm.isDisplayOff).toBe(true);
    });

    it('does nothing when already on and should be on', () => {
      pm.config = { schedule: { enabled: true, startTime: '20:00', endTime: '07:00', weekendMode: false } };
      const dayTime = new Date('2024-01-08T12:00:00');
      vi.setSystemTime(dayTime);
      pm.checkSchedule();
      expect(pm.isDisplayOff).toBe(false);
    });
  });

  describe('turnDisplayOn - no-op when already on', () => {
    it('does nothing when display is already on', () => {
      pm.isDisplayOff = false;
      pm.turnDisplayOn();
      expect(pm.isDisplayOff).toBe(false);
    });
  });

  describe('requestWakeLock', () => {
    it('requests wake lock when API available', async () => {
      const releaseFn = vi.fn();
      const mockWakeLock = {
        addEventListener: vi.fn(),
        release: releaseFn,
      };
      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: vi.fn().mockResolvedValue(mockWakeLock) },
        configurable: true,
      });
      await pm.requestWakeLock();
      expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');
      expect(pm.wakeLock).toBe(mockWakeLock);
      // Clean up
      delete navigator.wakeLock;
    });

    it('handles wake lock request failure', async () => {
      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: vi.fn().mockRejectedValue(new Error('Not allowed')) },
        configurable: true,
      });
      await pm.requestWakeLock();
      expect(pm.wakeLock).toBeNull();
      delete navigator.wakeLock;
    });
  });

  describe('startScheduleCheck', () => {
    it('checks schedule immediately and sets interval', () => {
      pm.config = { schedule: { enabled: true, startTime: '20:00', endTime: '07:00', weekendMode: false } };
      const dayTime = new Date('2024-01-08T12:00:00');
      vi.setSystemTime(dayTime);
      pm.startScheduleCheck();
      expect(pm.checkInterval).not.toBeNull();
    });
  });

  describe('destroy with wake lock', () => {
    it('releases wake lock on destroy', async () => {
      const releaseFn = vi.fn();
      pm.wakeLock = { release: releaseFn };
      pm.destroy();
      expect(releaseFn).toHaveBeenCalled();
    });
  });
});
