import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PowerManagementModal from './PowerManagementModal';
import TouchkioModal from './TouchkioModal';

// ─── PowerManagementModal extended ───────────────────────────────────────────

const pmBase = {
  show: true, clientId: 'display-1', mode: 'browser',
  mqttHostname: '', hasMqtt: false, scheduleEnabled: false,
  startTime: '20:00', endTime: '07:00', weekendMode: false,
  message: '', messageType: '',
  onClose: vi.fn(), onSave: vi.fn(), onModeChange: vi.fn(),
  onMqttHostnameChange: vi.fn(), onScheduleEnabledChange: vi.fn(),
  onStartTimeChange: vi.fn(), onEndTimeChange: vi.fn(), onWeekendModeChange: vi.fn(),
};

describe('PowerManagementModal extended', () => {
  it('calls onStartTimeChange when start time changes', () => {
    const handler = vi.fn();
    render(<PowerManagementModal {...pmBase} scheduleEnabled={true} onStartTimeChange={handler} />);
    fireEvent.change(screen.getByLabelText(/Start Time/), { target: { value: '21:00' } });
    expect(handler).toHaveBeenCalledWith('21:00');
  });

  it('calls onEndTimeChange when end time changes', () => {
    const handler = vi.fn();
    render(<PowerManagementModal {...pmBase} scheduleEnabled={true} onEndTimeChange={handler} />);
    fireEvent.change(screen.getByLabelText(/End Time/), { target: { value: '08:00' } });
    expect(handler).toHaveBeenCalledWith('08:00');
  });

  it('calls onWeekendModeChange when weekend checkbox is toggled', () => {
    const handler = vi.fn();
    render(<PowerManagementModal {...pmBase} scheduleEnabled={true} onWeekendModeChange={handler} />);
    const checkboxes = screen.getAllByRole('checkbox');
    const weekendCheckbox = checkboxes.find(cb => cb.closest('label')?.textContent.includes('Weekend'));
    fireEvent.click(weekendCheckbox);
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('calls onModeChange when browser radio is selected', () => {
    const handler = vi.fn();
    render(<PowerManagementModal {...pmBase} mode="dpms" onModeChange={handler} />);
    fireEvent.click(screen.getByText('Browser (All devices)').closest('label').querySelector('input'));
    expect(handler).toHaveBeenCalledWith('browser');
  });

  it('shows MQTT hostname field as readonly when hasMqtt is true', () => {
    render(<PowerManagementModal {...pmBase} mode="mqtt" hasMqtt={true} mqttHostname="rpi_123" />);
    const input = screen.getByLabelText('Touchkio Device ID');
    expect(input).toHaveAttribute('readOnly');
    expect(input).toHaveValue('rpi_123');
  });

  it('shows MQTT hostname field as editable when hasMqtt is false', () => {
    render(<PowerManagementModal {...pmBase} mode="mqtt" hasMqtt={true} mqttHostname="" />);
    const input = screen.getByLabelText('Touchkio Device ID');
    expect(input).toBeInTheDocument();
  });

  it('calls onMqttHostnameChange when hostname changes', () => {
    const handler = vi.fn();
    render(<PowerManagementModal {...pmBase} mode="mqtt" hasMqtt={true} onMqttHostnameChange={handler} />);
    fireEvent.change(screen.getByLabelText('Touchkio Device ID'), { target: { value: 'rpi_new' } });
    expect(handler).toHaveBeenCalledWith('rpi_new');
  });

  it('shows auto-detected message when hasMqtt is true', () => {
    render(<PowerManagementModal {...pmBase} mode="mqtt" hasMqtt={true} />);
    expect(screen.getByText(/automatically detected/)).toBeInTheDocument();
  });

  it('shows MQTT checkmark for non-global display with MQTT', () => {
    render(<PowerManagementModal {...pmBase} hasMqtt={true} />);
    expect(screen.getByText(/MQTT \(Touchkio Displays\) ✓/)).toBeInTheDocument();
  });

  it('shows close button in header', () => {
    render(<PowerManagementModal {...pmBase} />);
    const closeBtn = screen.getByText('×');
    fireEvent.click(closeBtn);
    expect(pmBase.onClose).toHaveBeenCalled();
  });

  it('renders display label with clientId', () => {
    render(<PowerManagementModal {...pmBase} clientId="my-display" />);
    expect(screen.getByText(/my-display/)).toBeInTheDocument();
  });

  it('shows MQTT not available message when no MQTT', () => {
    render(<PowerManagementModal {...pmBase} hasMqtt={false} />);
    expect(screen.getByText(/MQTT: Not available/)).toBeInTheDocument();
  });
});

// ─── TouchkioModal extended ──────────────────────────────────────────────────

const touchkioDisplay = {
  clientId: 'display-1', deviceId: 'rpi_test',
  mqtt: {
    deviceId: 'rpi_test', connected: true, hostname: 'rpi-test',
    power: 'ON', brightness: 80, volume: 50, pageZoom: 100,
    pageUrl: 'http://localhost:3000', kioskStatus: 'Fullscreen',
    theme: 'Light', powerUnsupported: false, brightnessUnsupported: false,
    cpuUsage: 25.5, memoryUsage: 60.2, temperature: 45.3,
    networkAddress: '192.168.1.100', uptime: 125,
  },
};

const touchkioBase = {
  show: true, display: touchkioDisplay,
  getRequestHeaders: vi.fn(() => ({})),
  message: '', messageType: '',
  brightness: 80, volume: 50, zoom: 100,
  onClose: vi.fn(), onBrightnessChange: vi.fn(), onVolumeChange: vi.fn(),
  onZoomChange: vi.fn(), onPowerCommand: vi.fn(), onRefreshCommand: vi.fn(),
  onKioskCommand: vi.fn(), onThemeCommand: vi.fn(),
  onRebootCommand: vi.fn(), onShutdownCommand: vi.fn(),
  onPageUrlChange: vi.fn(), onRefreshDisplay: vi.fn(),
};

describe('TouchkioModal extended', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: false, blob: async () => new Blob() });
  });

  it('renders system resource metrics', () => {
    render(<TouchkioModal {...touchkioBase} />);
    expect(screen.getByText(/25\.5%/)).toBeInTheDocument();
    expect(screen.getByText(/60\.2%/)).toBeInTheDocument();
    expect(screen.getByText(/45\.3°C/)).toBeInTheDocument();
  });

  it('renders network address', () => {
    render(<TouchkioModal {...touchkioBase} />);
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
  });

  it('renders uptime', () => {
    render(<TouchkioModal {...touchkioBase} />);
    expect(screen.getByText(/2h 5m/)).toBeInTheDocument();
  });

  it('renders kiosk mode buttons', () => {
    render(<TouchkioModal {...touchkioBase} />);
    expect(screen.getByText('✓ Fullscreen')).toBeInTheDocument();
    expect(screen.getByText('Maximized')).toBeInTheDocument();
    expect(screen.getByText('Framed')).toBeInTheDocument();
    expect(screen.getByText('Minimized')).toBeInTheDocument();
  });

  it('calls onKioskCommand when kiosk button is clicked', () => {
    const handler = vi.fn();
    render(<TouchkioModal {...touchkioBase} onKioskCommand={handler} />);
    fireEvent.click(screen.getByText('Maximized'));
    expect(handler).toHaveBeenCalledWith('rpi_test', 'Maximized');
  });

  it('calls onThemeCommand when theme toggle is clicked', () => {
    const handler = vi.fn();
    render(<TouchkioModal {...touchkioBase} onThemeCommand={handler} />);
    const themeCheckboxes = screen.getAllByRole('checkbox');
    const themeToggle = themeCheckboxes.find(cb => cb.closest('.touchkio-toggle-row')?.textContent.includes('Theme'));
    if (themeToggle) fireEvent.click(themeToggle);
    expect(handler).toHaveBeenCalledWith('rpi_test', 'Dark');
  });

  it('calls onRefreshCommand when refresh button is clicked', () => {
    const handler = vi.fn();
    render(<TouchkioModal {...touchkioBase} onRefreshCommand={handler} />);
    fireEvent.click(screen.getByText('🔄 Refresh Page'));
    expect(handler).toHaveBeenCalledWith('rpi_test');
  });

  it('renders page URL section', () => {
    render(<TouchkioModal {...touchkioBase} />);
    expect(screen.getByText('http://localhost:3000')).toBeInTheDocument();
  });

  it('enters edit mode when Edit URL is clicked', () => {
    render(<TouchkioModal {...touchkioBase} />);
    fireEvent.click(screen.getByText('Edit URL'));
    expect(screen.getByPlaceholderText('https://example.com/room/display')).toBeInTheDocument();
  });

  it('calls onPageUrlChange when Save & Apply is clicked', () => {
    const handler = vi.fn();
    render(<TouchkioModal {...touchkioBase} onPageUrlChange={handler} />);
    fireEvent.click(screen.getByText('Edit URL'));
    const input = screen.getByPlaceholderText('https://example.com/room/display');
    fireEvent.change(input, { target: { value: 'http://new-url.com' } });
    fireEvent.click(screen.getByText('Save & Apply'));
    expect(handler).toHaveBeenCalledWith('rpi_test', 'http://new-url.com');
  });

  it('cancels URL editing', () => {
    render(<TouchkioModal {...touchkioBase} />);
    fireEvent.click(screen.getByText('Edit URL'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('http://localhost:3000')).toBeInTheDocument();
  });

  it('renders hardware warning when power is unsupported', () => {
    const display = {
      ...touchkioDisplay,
      mqtt: { ...touchkioDisplay.mqtt, powerUnsupported: true, power: 'UNKNOWN' }
    };
    render(<TouchkioModal {...touchkioBase} display={display} />);
    expect(screen.getByText(/Hardware Not Supported/)).toBeInTheDocument();
  });

  it('renders hardware warning when brightness is unsupported', () => {
    const display = {
      ...touchkioDisplay,
      mqtt: { ...touchkioDisplay.mqtt, brightnessUnsupported: true, brightness: undefined }
    };
    render(<TouchkioModal {...touchkioBase} display={display} />);
    expect(screen.getByText(/Hardware Not Supported/)).toBeInTheDocument();
  });

  it('renders no hardware warning when both are supported', () => {
    render(<TouchkioModal {...touchkioBase} />);
    expect(screen.queryByText(/Hardware Not Supported/)).not.toBeInTheDocument();
  });

  it('shows UNSUPPORTED for power when not supported', () => {
    const display = {
      ...touchkioDisplay,
      mqtt: { ...touchkioDisplay.mqtt, powerUnsupported: true, power: 'UNKNOWN' }
    };
    render(<TouchkioModal {...touchkioBase} display={display} />);
    expect(screen.getByText('UNSUPPORTED')).toBeInTheDocument();
  });

  it('shows N/A for brightness when not supported', () => {
    const display = {
      ...touchkioDisplay,
      mqtt: { ...touchkioDisplay.mqtt, brightnessUnsupported: true, brightness: undefined }
    };
    render(<TouchkioModal {...touchkioBase} display={display} />);
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  it('renders power OFF state', () => {
    const display = {
      ...touchkioDisplay,
      mqtt: { ...touchkioDisplay.mqtt, power: 'OFF' }
    };
    render(<TouchkioModal {...touchkioBase} display={display} />);
    expect(screen.getAllByText('OFF').length).toBeGreaterThanOrEqual(1);
  });

  it('renders display without pageUrl showing Set URL button', () => {
    const display = {
      ...touchkioDisplay,
      mqtt: { ...touchkioDisplay.mqtt, pageUrl: '' }
    };
    render(<TouchkioModal {...touchkioBase} display={display} />);
    expect(screen.getByText('Set URL')).toBeInTheDocument();
  });

  it('renders recent errors when present', () => {
    const now = new Date();
    const display = {
      ...touchkioDisplay,
      mqtt: {
        ...touchkioDisplay.mqtt,
        errors: {
          [now.toISOString()]: [{ ERROR: 'Test error message' }]
        }
      }
    };
    render(<TouchkioModal {...touchkioBase} display={display} />);
    expect(screen.getByText('Recent Errors (Last Hour)')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('does not render errors section when no errors', () => {
    render(<TouchkioModal {...touchkioBase} />);
    expect(screen.queryByText('Recent Errors (Last Hour)')).not.toBeInTheDocument();
  });

  it('renders display with Dark theme', () => {
    const display = {
      ...touchkioDisplay,
      mqtt: { ...touchkioDisplay.mqtt, theme: 'Dark' }
    };
    render(<TouchkioModal {...touchkioBase} display={display} />);
    expect(screen.getByText('🌙')).toBeInTheDocument();
  });

  it('renders display with Light theme', () => {
    render(<TouchkioModal {...touchkioBase} />);
    expect(screen.getByText('☀️')).toBeInTheDocument();
  });

  it('calls onPowerCommand when power toggle is clicked', () => {
    const handler = vi.fn();
    render(<TouchkioModal {...touchkioBase} onPowerCommand={handler} />);
    const checkboxes = screen.getAllByRole('checkbox');
    const powerToggle = checkboxes.find(cb => cb.closest('.touchkio-toggle-row')?.textContent.includes('Display Power'));
    if (powerToggle) fireEvent.click(powerToggle);
    expect(handler).toHaveBeenCalledWith('rpi_test', false);
  });

  it('renders slider controls', () => {
    render(<TouchkioModal {...touchkioBase} />);
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBe(3); // brightness, volume, zoom
  });

  it('renders reboot and shutdown buttons', () => {
    render(<TouchkioModal {...touchkioBase} />);
    expect(screen.getByText('Reboot Device')).toBeInTheDocument();
    expect(screen.getByText('Shutdown Device')).toBeInTheDocument();
  });

  it('calls onRebootCommand after confirm', () => {
    const handler = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<TouchkioModal {...touchkioBase} onRebootCommand={handler} />);
    fireEvent.click(screen.getByText('Reboot Device'));
    expect(handler).toHaveBeenCalledWith('rpi_test');
    window.confirm.mockRestore();
  });

  it('does not call onRebootCommand when confirm is cancelled', () => {
    const handler = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<TouchkioModal {...touchkioBase} onRebootCommand={handler} />);
    fireEvent.click(screen.getByText('Reboot Device'));
    expect(handler).not.toHaveBeenCalled();
    window.confirm.mockRestore();
  });

  it('calls onShutdownCommand after confirm', () => {
    const handler = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<TouchkioModal {...touchkioBase} onShutdownCommand={handler} />);
    fireEvent.click(screen.getByText('Shutdown Device'));
    expect(handler).toHaveBeenCalledWith('rpi_test');
    window.confirm.mockRestore();
  });
});
