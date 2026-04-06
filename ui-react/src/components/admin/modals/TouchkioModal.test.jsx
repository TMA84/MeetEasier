import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TouchkioModal from './TouchkioModal';

const mockDisplay = {
  clientId: 'display-1',
  deviceId: 'rpi_test',
  mqtt: { deviceId: 'rpi_test', connected: true, hostname: 'rpi-test', power: 'ON', brightness: 80, volume: 50, zoom: 100, pageUrl: 'http://localhost:3000', kioskMode: true, powerUnsupported: false, brightnessUnsupported: false },
};

const defaultProps = {
  show: true,
  display: mockDisplay,
  getRequestHeaders: vi.fn(() => ({})),
  message: '',
  messageType: '',
  brightness: 80,
  volume: 50,
  zoom: 100,
  onClose: vi.fn(),
  onBrightnessChange: vi.fn(),
  onVolumeChange: vi.fn(),
  onZoomChange: vi.fn(),
  onPowerCommand: vi.fn(),
  onRefreshCommand: vi.fn(),
  onKioskCommand: vi.fn(),
  onThemeCommand: vi.fn(),
  onRebootCommand: vi.fn(),
  onShutdownCommand: vi.fn(),
  onPageUrlChange: vi.fn(),
  onRefreshDisplay: vi.fn(),
};

describe('TouchkioModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Mock fetch for screenshot loading
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      blob: async () => new Blob(),
    });
  });

  it('returns null when show is false', () => {
    const { container } = render(<TouchkioModal {...defaultProps} show={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when display is null', () => {
    const { container } = render(<TouchkioModal {...defaultProps} display={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders modal when show is true and display is provided', () => {
    render(<TouchkioModal {...defaultProps} />);
    expect(screen.getByText(/rpi-test/)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<TouchkioModal {...defaultProps} onClose={onClose} />);
    const closeBtn = screen.getByText('×');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<TouchkioModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.querySelector('.admin-modal-overlay'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when modal content is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<TouchkioModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.querySelector('.admin-modal-content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows message when provided', () => {
    render(<TouchkioModal {...defaultProps} message="Command sent!" messageType="success" />);
    expect(screen.getByText('Command sent!')).toBeInTheDocument();
  });

  it('renders power controls', () => {
    render(<TouchkioModal {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(1);
  });

  it('renders without mqtt connection', () => {
    const display = { clientId: 'display-1', deviceId: 'rpi_test', hostname: 'rpi-host' };
    render(<TouchkioModal {...defaultProps} display={display} />);
    expect(screen.getByText(/rpi-host/)).toBeInTheDocument();
  });

  it('renders close button in footer', () => {
    render(<TouchkioModal {...defaultProps} />);
    expect(screen.getByText('Close')).toBeInTheDocument();
  });
});
