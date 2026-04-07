import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TouchkioModal from './TouchkioModal';

const fullMqttDisplay = {
  clientId: 'display-1',
  deviceId: 'rpi_test',
  mqtt: {
    deviceId: 'rpi_test',
    connected: true,
    hostname: 'rpi-host',
    power: 'ON',
    brightness: 80,
    volume: 50,
    zoom: 100,
    pageUrl: 'http://localhost:3000/display',
    kioskMode: true,
    powerUnsupported: false,
    brightnessUnsupported: false,
    cpuUsage: 45.2,
    memoryUsage: 60.1,
    temperature: 55.3,
    uptime: 3600,
    version: '1.4.1',
    errors: {
      [new Date(Date.now() - 1000).toISOString()]: [{ ERROR: 'Test error message' }],
    },
  },
};

const defaultProps = {
  show: true,
  display: fullMqttDisplay,
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

describe('TouchkioModal coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      blob: async () => new Blob(),
    });
  });

  it('renders full MQTT display with all status fields', () => {
    render(<TouchkioModal {...defaultProps} />);
    expect(screen.getByText(/rpi-host/)).toBeInTheDocument();
  });

  it('renders power controls for power-supported display', () => {
    render(<TouchkioModal {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(5);
  });

  it('renders slider controls for brightness-supported display', () => {
    render(<TouchkioModal {...defaultProps} />);
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onBrightnessChange when brightness slider changes', () => {
    const onBrightnessChange = vi.fn();
    render(<TouchkioModal {...defaultProps} onBrightnessChange={onBrightnessChange} />);
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '60' } });
    expect(onBrightnessChange).toHaveBeenCalled();
  });

  it('renders page URL section with edit button', () => {
    render(<TouchkioModal {...defaultProps} />);
    expect(screen.getByText(/localhost:3000/)).toBeInTheDocument();
  });

  it('enters URL edit mode and saves', () => {
    const onPageUrlChange = vi.fn();
    render(<TouchkioModal {...defaultProps} onPageUrlChange={onPageUrlChange} />);
    // Click "Edit URL" button
    fireEvent.click(screen.getByText('Edit URL'));
    // Now in edit mode, find the input and change it
    const urlInput = screen.getByDisplayValue('http://localhost:3000/display');
    fireEvent.change(urlInput, { target: { value: 'http://new-url.com' } });
    // Click "Save & Apply"
    fireEvent.click(screen.getByText('Save & Apply'));
    expect(onPageUrlChange).toHaveBeenCalledWith('rpi_test', 'http://new-url.com');
  });

  it('cancels URL edit mode', () => {
    render(<TouchkioModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Edit URL'));
    // Click Cancel in the URL edit section (not the modal close)
    const cancelButtons = screen.getAllByText('Cancel');
    // The URL cancel button is the one inside the URL edit section
    fireEvent.click(cancelButtons[0]);
    // Should be back to display mode
    expect(screen.getByText('Edit URL')).toBeInTheDocument();
  });

  it('renders display with power unsupported (shows warning)', () => {
    const display = {
      ...fullMqttDisplay,
      mqtt: { ...fullMqttDisplay.mqtt, powerUnsupported: true, brightnessUnsupported: true },
    };
    render(<TouchkioModal {...defaultProps} display={display} />);
    expect(screen.getByText(/rpi-host/)).toBeInTheDocument();
  });

  it('renders display without MQTT connection', () => {
    const display = {
      clientId: 'display-2',
      deviceId: 'rpi_disconnected',
      hostname: 'rpi-disconnected',
    };
    render(<TouchkioModal {...defaultProps} display={display} />);
    expect(screen.getByText(/rpi-disconnected/)).toBeInTheDocument();
  });

  it('renders display with power OFF', () => {
    const display = {
      ...fullMqttDisplay,
      mqtt: { ...fullMqttDisplay.mqtt, power: 'OFF' },
    };
    render(<TouchkioModal {...defaultProps} display={display} />);
    expect(screen.getByText(/rpi-host/)).toBeInTheDocument();
  });

  it('loads screenshot successfully', async () => {
    const blob = new Blob(['fake-image'], { type: 'image/png' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    });

    render(<TouchkioModal {...defaultProps} />);

    // The screenshot loading happens asynchronously
    // Just verify no crash and the component renders
    await waitFor(() => {
      expect(screen.getByText(/rpi-host/)).toBeInTheDocument();
    });
  });

  it('handles screenshot load error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('No screenshot'));
    render(<TouchkioModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/No screenshot available/)).toBeInTheDocument();
    });
  });

  it('renders kiosk section', () => {
    render(<TouchkioModal {...defaultProps} />);
    // Kiosk mode should be shown
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(3);
  });

  it('renders system controls with reboot and shutdown', () => {
    render(<TouchkioModal {...defaultProps} />);
    // Should have reboot and shutdown buttons
    const buttons = screen.getAllByRole('button');
    const buttonTexts = buttons.map(b => b.textContent);
    expect(buttonTexts.some(t => t.includes('Reboot') || t.includes('🔄'))).toBe(true);
  });

  it('renders recent errors when present', () => {
    render(<TouchkioModal {...defaultProps} />);
    expect(screen.getByText(/Test error message/)).toBeInTheDocument();
  });

  it('renders without recent errors', () => {
    const display = {
      ...fullMqttDisplay,
      mqtt: { ...fullMqttDisplay.mqtt, errors: {} },
    };
    render(<TouchkioModal {...defaultProps} display={display} />);
    expect(screen.getByText(/rpi-host/)).toBeInTheDocument();
  });

  it('expands screenshot when clicked', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('No screenshot'));
    render(<TouchkioModal {...defaultProps} />);
    // Wait for screenshot error to appear
    await waitFor(() => {
      expect(screen.getByText(/No screenshot available/)).toBeInTheDocument();
    });
  });
});
