import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';

// We need to mock the connection monitor before importing ConnectionStatus
let mockListeners = [];
let mockStatus = { isOnline: true, retryCount: 0, maxRetries: 60 };

vi.mock('../../utils/connection-monitor', () => ({
  getConnectionMonitor: () => ({
    addListener: (cb) => {
      mockListeners.push(cb);
      return () => {
        mockListeners = mockListeners.filter(l => l !== cb);
      };
    },
    getStatus: () => mockStatus,
  }),
}));

import ConnectionStatus from './ConnectionStatus';

describe('ConnectionStatus coverage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockListeners = [];
    mockStatus = { isOnline: true, retryCount: 0, maxRetries: 60 };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when online and no events', () => {
    const { container } = render(<ConnectionStatus />);
    expect(container.querySelector('.connection-status')).toBeNull();
  });

  it('shows offline status when offline event received', () => {
    const { container } = render(<ConnectionStatus />);
    act(() => {
      mockListeners.forEach(cb => cb({ type: 'offline', isOnline: false, retryCount: 1 }));
    });
    expect(container.querySelector('.connection-status.offline')).toBeInTheDocument();
  });

  it('shows retry count when offline', () => {
    const { container } = render(<ConnectionStatus />);
    act(() => {
      mockListeners.forEach(cb => cb({ type: 'offline', isOnline: false, retryCount: 5 }));
    });
    expect(container.querySelector('.connection-status.offline')).toBeInTheDocument();
    expect(container.textContent).toContain('(5)');
  });

  it('shows online status when online event received', () => {
    render(<ConnectionStatus />);
    // First go offline
    act(() => {
      mockListeners.forEach(cb => cb({ type: 'offline', isOnline: false, retryCount: 1 }));
    });
    // Then come back online
    act(() => {
      mockListeners.forEach(cb => cb({ type: 'online', isOnline: true, retryCount: 0 }));
    });
    expect(screen.getByText('Verbunden')).toBeInTheDocument();
  });

  it('hides online status after 3 seconds', () => {
    render(<ConnectionStatus />);
    act(() => {
      mockListeners.forEach(cb => cb({ type: 'online', isOnline: true, retryCount: 0 }));
    });
    expect(screen.getByText('Verbunden')).toBeInTheDocument();
    // Advance timer by 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText('Verbunden')).toBeNull();
  });

  it('updates retry count on maxRetries event', () => {
    const { container } = render(<ConnectionStatus />);
    act(() => {
      mockListeners.forEach(cb => cb({ type: 'offline', isOnline: false, retryCount: 1 }));
    });
    act(() => {
      mockListeners.forEach(cb => cb({ type: 'maxRetries', isOnline: false, retryCount: 60 }));
    });
    expect(container.textContent).toContain('(60)');
  });

  it('shows initial offline status when monitor reports offline', () => {
    mockStatus = { isOnline: false, retryCount: 3, maxRetries: 60 };
    const { container } = render(<ConnectionStatus />);
    expect(container.querySelector('.connection-status.offline')).toBeInTheDocument();
    expect(container.textContent).toContain('(3)');
  });

  it('does not show retry count when retryCount is 0', () => {
    const { container } = render(<ConnectionStatus />);
    act(() => {
      mockListeners.forEach(cb => cb({ type: 'offline', isOnline: false, retryCount: 0 }));
    });
    expect(container.querySelector('.connection-status.offline')).toBeInTheDocument();
    expect(container.textContent).not.toContain('(0)');
  });

  it('shows correct CSS classes for online/offline', () => {
    const { container } = render(<ConnectionStatus />);
    act(() => {
      mockListeners.forEach(cb => cb({ type: 'offline', isOnline: false, retryCount: 1 }));
    });
    expect(container.querySelector('.connection-status.offline')).toBeInTheDocument();
    act(() => {
      mockListeners.forEach(cb => cb({ type: 'online', isOnline: true, retryCount: 0 }));
    });
    expect(container.querySelector('.connection-status.online')).toBeInTheDocument();
  });

  it('shows checkmark icon when online', () => {
    render(<ConnectionStatus />);
    act(() => {
      mockListeners.forEach(cb => cb({ type: 'online', isOnline: true, retryCount: 0 }));
    });
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('shows warning icon when offline', () => {
    render(<ConnectionStatus />);
    act(() => {
      mockListeners.forEach(cb => cb({ type: 'offline', isOnline: false, retryCount: 1 }));
    });
    expect(screen.getByText('⚠')).toBeInTheDocument();
  });

  it('cleans up listener on unmount', () => {
    const { unmount } = render(<ConnectionStatus />);
    expect(mockListeners.length).toBe(1);
    unmount();
    expect(mockListeners.length).toBe(0);
  });
});
