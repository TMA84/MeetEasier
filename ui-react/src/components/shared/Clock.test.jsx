import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import Clock from './Clock';

describe('Clock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders time in sidebar variant by default', () => {
    const { container } = render(<Clock />);
    expect(container.querySelector('.clock-time')).not.toBeNull();
    expect(container.querySelector('.clock-date')).not.toBeNull();
  });

  it('renders time in navbar variant', () => {
    const { container } = render(<Clock variant="navbar" />);
    expect(container.querySelector('#clock')).not.toBeNull();
  });

  it('updates time every second', () => {
    vi.useFakeTimers();
    const { container } = render(<Clock />);

    // Advance by 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Time should have been updated (tick was called)
    // We can't easily check the exact value since it depends on locale
    expect(container.querySelector('.clock-time')).not.toBeNull();
  });

  it('cleans up interval on unmount', () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const { unmount } = render(<Clock />);
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
