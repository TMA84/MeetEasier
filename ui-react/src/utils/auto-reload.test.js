import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startAutoReload, stopAutoReload, applyAutoReload } from './auto-reload';

describe('auto-reload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Mock window.location.reload
    delete window.location;
    window.location = { reload: vi.fn() };
  });

  afterEach(() => {
    stopAutoReload();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('schedules a reload and fires at the correct time', () => {
    // Set current time to 02:00
    vi.setSystemTime(new Date('2026-04-10T02:00:00'));
    startAutoReload('03:00');

    // Advance 59 minutes — should not reload yet
    vi.advanceTimersByTime(59 * 60 * 1000);
    expect(window.location.reload).not.toHaveBeenCalled();

    // Advance 1 more minute — should reload
    vi.advanceTimersByTime(1 * 60 * 1000);
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('schedules for next day if time already passed', () => {
    // Set current time to 04:00 — reload at 03:00 should be tomorrow
    vi.setSystemTime(new Date('2026-04-10T04:00:00'));
    startAutoReload('03:00');

    // Advance 23 hours — should reload
    vi.advanceTimersByTime(23 * 60 * 60 * 1000);
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('stopAutoReload cancels the scheduled reload', () => {
    vi.setSystemTime(new Date('2026-04-10T02:00:00'));
    startAutoReload('03:00');
    stopAutoReload();

    vi.advanceTimersByTime(2 * 60 * 60 * 1000);
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('startAutoReload replaces previous schedule', () => {
    vi.setSystemTime(new Date('2026-04-10T02:00:00'));
    startAutoReload('03:00');
    startAutoReload('04:00'); // replace

    // At 03:00 — should NOT reload (old schedule replaced)
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(window.location.reload).not.toHaveBeenCalled();

    // At 04:00 — should reload
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid time format', () => {
    startAutoReload('invalid');
    expect(console.warn).toHaveBeenCalledWith('[AutoReload] Invalid time format:', 'invalid');
  });

  it('applyAutoReload starts when enabled', () => {
    vi.setSystemTime(new Date('2026-04-10T02:00:00'));
    applyAutoReload({ autoReloadEnabled: true, autoReloadTime: '03:00' });

    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('applyAutoReload stops when disabled', () => {
    vi.setSystemTime(new Date('2026-04-10T02:00:00'));
    startAutoReload('03:00');
    applyAutoReload({ autoReloadEnabled: false, autoReloadTime: '03:00' });

    vi.advanceTimersByTime(2 * 60 * 60 * 1000);
    expect(window.location.reload).not.toHaveBeenCalled();
  });
});
