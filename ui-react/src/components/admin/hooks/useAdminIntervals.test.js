import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAdminIntervals } from './useAdminIntervals.js';

describe('useAdminIntervals', () => {
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

  it('startSyncIntervals creates intervals', () => {
    const { result } = renderHook(() => useAdminIntervals(true, loadSyncStatus, loadConfigLocks, updateConfig));
    act(() => { result.current.startSyncIntervals(); });
    // Advance time to trigger intervals
    vi.advanceTimersByTime(5000);
    expect(loadConfigLocks).toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(updateConfig).toHaveBeenCalled();
  });

  it('clearAllIntervals stops all intervals', () => {
    const { result } = renderHook(() => useAdminIntervals(true, loadSyncStatus, loadConfigLocks, updateConfig));
    act(() => { result.current.startSyncIntervals(); });
    act(() => { result.current.clearAllIntervals(); });
    vi.clearAllMocks();
    vi.advanceTimersByTime(35000);
    expect(loadSyncStatus).not.toHaveBeenCalled();
    expect(loadConfigLocks).not.toHaveBeenCalled();
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useAdminIntervals(true, loadSyncStatus, loadConfigLocks, updateConfig));
    expect(() => unmount()).not.toThrow();
  });

  it('connectedDisplaysIntervalRef is accessible', () => {
    const { result } = renderHook(() => useAdminIntervals(true, loadSyncStatus, loadConfigLocks, updateConfig));
    expect(result.current.connectedDisplaysIntervalRef).toBeDefined();
    expect(result.current.connectedDisplaysIntervalRef.current).toBeNull();
  });
});
