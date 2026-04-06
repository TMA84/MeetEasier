import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import ConnectionStatus from './ConnectionStatus';

// Mock the connection monitor
vi.mock('../../utils/connection-monitor', () => {
  const listeners = [];
  return {
    getConnectionMonitor: vi.fn(() => ({
      addListener: vi.fn((cb) => {
        listeners.push(cb);
        return () => {
          const idx = listeners.indexOf(cb);
          if (idx >= 0) listeners.splice(idx, 1);
        };
      }),
      getStatus: vi.fn(() => ({ isOnline: true, retryCount: 0, maxRetries: 60 })),
      __listeners: listeners
    }))
  };
});

describe('ConnectionStatus', () => {
  let monitorModule;

  beforeEach(async () => {
    monitorModule = await import('../../utils/connection-monitor');
    monitorModule.getConnectionMonitor().__listeners.length = 0;
  });

  it('renders nothing when online (default state)', () => {
    const { container } = render(<ConnectionStatus />);
    expect(container.innerHTML).toBe('');
  });

  it('shows offline status when monitor reports offline', () => {
    const { container } = render(<ConnectionStatus />);
    const monitor = monitorModule.getConnectionMonitor();
    const listener = monitor.__listeners[0];

    act(() => {
      listener({ type: 'offline', isOnline: false, retryCount: 1 });
    });

    expect(screen.getByText(/Offline/)).toBeInTheDocument();
    expect(container.querySelector('.offline')).toBeInTheDocument();
  });

  it('shows retry count when offline', () => {
    render(<ConnectionStatus />);
    const monitor = monitorModule.getConnectionMonitor();
    const listener = monitor.__listeners[0];

    act(() => {
      listener({ type: 'offline', isOnline: false, retryCount: 5 });
    });

    expect(screen.getByText(/Offline/)).toBeInTheDocument();
    expect(screen.getByText(/\(5\)/)).toBeInTheDocument();
  });

  it('shows online status when connection is restored', () => {
    vi.useFakeTimers();
    render(<ConnectionStatus />);
    const monitor = monitorModule.getConnectionMonitor();
    const listener = monitor.__listeners[0];

    act(() => {
      listener({ type: 'offline', isOnline: false, retryCount: 1 });
    });

    act(() => {
      listener({ type: 'online', isOnline: true, retryCount: 0 });
    });

    expect(screen.getByText('Verbunden')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows offline when initial status is offline', async () => {
    // Override getStatus to return offline
    monitorModule.getConnectionMonitor.mockReturnValueOnce({
      addListener: vi.fn((cb) => {
        monitorModule.getConnectionMonitor().__listeners.push(cb);
        return () => {};
      }),
      getStatus: vi.fn(() => ({ isOnline: false, retryCount: 3, maxRetries: 60 })),
      __listeners: monitorModule.getConnectionMonitor().__listeners
    });

    render(<ConnectionStatus />);
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
  });

  it('updates retry count on maxRetries event', () => {
    render(<ConnectionStatus />);
    const monitor = monitorModule.getConnectionMonitor();
    const listener = monitor.__listeners[0];

    act(() => {
      listener({ type: 'offline', isOnline: false, retryCount: 1 });
    });

    act(() => {
      listener({ type: 'maxRetries', isOnline: false, retryCount: 60 });
    });

    expect(screen.getByText(/\(60\)/)).toBeInTheDocument();
  });

  it('displays connection icon for online state', () => {
    vi.useFakeTimers();
    render(<ConnectionStatus />);
    const monitor = monitorModule.getConnectionMonitor();
    const listener = monitor.__listeners[0];

    act(() => {
      listener({ type: 'online', isOnline: true, retryCount: 0 });
    });

    expect(screen.getByText('✓')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('displays warning icon for offline state', () => {
    render(<ConnectionStatus />);
    const monitor = monitorModule.getConnectionMonitor();
    const listener = monitor.__listeners[0];

    act(() => {
      listener({ type: 'offline', isOnline: false, retryCount: 1 });
    });

    expect(screen.getByText('⚠')).toBeInTheDocument();
  });
});
