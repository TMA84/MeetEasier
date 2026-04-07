import { renderHook, act } from '@testing-library/react';
import { useAdminIntervals } from './useAdminIntervals.js';

describe('useAdminIntervals - coverage gaps', () => {
  const loadSyncStatus = vi.fn();
  const loadConfigLocks = vi.fn();
  const updateConfig = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('startSyncIntervals triggers loadSyncStatus after 30s', () => {
    const { result } = renderHook(() => useAdminIntervals(true, loadSyncStatus, loadConfigLocks, updateConfig));
    act(() => { result.current.startSyncIntervals(); });
    vi.advanceTimersByTime(30000);
    expect(loadSyncStatus).toHaveBeenCalled();
  });

  it('startSyncIntervals triggers updateConfig every 1s for clock', () => {
    const { result } = renderHook(() => useAdminIntervals(true, loadSyncStatus, loadConfigLocks, updateConfig));
    act(() => { result.current.startSyncIntervals(); });
    vi.advanceTimersByTime(1000);
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ syncStatusTick: expect.any(Number) }));
  });

  it('startSyncIntervals does not create duplicate intervals', () => {
    const { result } = renderHook(() => useAdminIntervals(true, loadSyncStatus, loadConfigLocks, updateConfig));
    act(() => { result.current.startSyncIntervals(); });
    act(() => { result.current.startSyncIntervals(); }); // second call
    vi.clearAllMocks();
    vi.advanceTimersByTime(30000);
    // Should only fire once per interval, not twice
    expect(loadSyncStatus).toHaveBeenCalledTimes(1);
  });

  it('clearAllIntervals clears connectedDisplaysIntervalRef', () => {
    const { result } = renderHook(() => useAdminIntervals(true, loadSyncStatus, loadConfigLocks, updateConfig));
    // Manually set a connected displays interval
    result.current.connectedDisplaysIntervalRef.current = setInterval(() => {}, 5000);
    act(() => { result.current.clearAllIntervals(); });
    expect(result.current.connectedDisplaysIntervalRef.current).toBeNull();
  });

  it('clearAllIntervals handles already-null refs gracefully', () => {
    const { result } = renderHook(() => useAdminIntervals(true, loadSyncStatus, loadConfigLocks, updateConfig));
    // All refs are null by default
    expect(() => {
      act(() => { result.current.clearAllIntervals(); });
    }).not.toThrow();
  });

  it('cleanup on unmount clears all intervals', () => {
    const { result, unmount } = renderHook(() => useAdminIntervals(true, loadSyncStatus, loadConfigLocks, updateConfig));
    act(() => { result.current.startSyncIntervals(); });
    unmount();
    vi.clearAllMocks();
    vi.advanceTimersByTime(35000);
    expect(loadSyncStatus).not.toHaveBeenCalled();
    expect(loadConfigLocks).not.toHaveBeenCalled();
  });
});
