import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import DevicesTab from './DevicesTab';

const defaultT = {
  currentConfigTitle: 'Current Config',
  lastUpdatedLabel: 'Last Updated:',
  loading: 'Loading...',
  connectedDisplaysSectionTitle: 'Connected Displays',
  connectedDisplaysRefreshButton: 'Refresh',
  connectedDisplaysEmpty: 'No displays connected.',
  powerManagementGlobalButton: 'Global Standard',
  systemDisplayTrackingSectionTitle: 'Tracking Settings',
  systemDisplayTrackingModeLabel: 'Tracking Mode',
  systemDisplayTrackingModeClientId: 'Client ID',
  systemDisplayTrackingModeIpRoom: 'IP + Room',
  systemDisplayTrackingRetentionLabel: 'Retention Time (hours)',
  systemDisplayTrackingCleanupLabel: 'Cleanup Delay (minutes)',
  displayIpWhitelistSectionTitle: 'Display IP Whitelist',
  displayIpWhitelistEnabledLabel: 'Enable IP Whitelist',
  systemSaveButton: 'Save Settings',
};

const baseProps = {
  isActive: true,
  connectedDisplays: [],
  connectedDisplaysLoading: false,
  connectedDisplaysMessage: '',
  connectedDisplaysMessageType: '',
  systemDisplayTrackingMode: 'client-id',
  currentSystemDisplayTrackingMode: 'client-id',
  systemDisplayTrackingRetentionHours: 24,
  currentSystemDisplayTrackingRetentionHours: 24,
  systemDisplayTrackingCleanupMinutes: 5,
  currentSystemDisplayTrackingCleanupMinutes: 5,
  systemDisplayIpWhitelistEnabled: false,
  currentSystemDisplayIpWhitelistEnabled: false,
  systemDisplayIpWhitelist: '',
  currentSystemDisplayIpWhitelist: '',
  systemTrustReverseProxy: false,
  currentSystemTrustReverseProxy: false,
  systemMessage: '',
  systemMessageType: '',
  t: defaultT,
  onLoadDisplays: vi.fn(),
  onOpenPowerManagement: vi.fn(),
  onOpenTouchkioModal: vi.fn(),
  onMqttRefresh: vi.fn(),
  onMqttRefreshAll: vi.fn(),
  onMqttRebootAll: vi.fn(),
  onDeleteDisplay: vi.fn(),
  onTrackingModeChange: vi.fn(),
  onRetentionHoursChange: vi.fn(),
  onCleanupMinutesChange: vi.fn(),
  onIpWhitelistEnabledChange: vi.fn(),
  onIpWhitelistChange: vi.fn(),
  onTrustReverseProxyChange: vi.fn(),
  onSaveSettings: vi.fn(),
};

describe('DevicesTab', () => {
  it('shows empty message when no displays', () => {
    render(<DevicesTab {...baseProps} />);
    expect(screen.getByText('No displays connected.')).toBeInTheDocument();
  });

  it('calls onLoadDisplays when refresh button is clicked', () => {
    const handler = vi.fn();
    render(<DevicesTab {...baseProps} onLoadDisplays={handler} />);
    fireEvent.click(screen.getByText('Refresh'));
    expect(handler).toHaveBeenCalled();
  });

  it('disables refresh button when loading', () => {
    render(<DevicesTab {...baseProps} connectedDisplaysLoading={true} />);
    expect(screen.getByText('Loading...')).toBeDisabled();
  });

  it('calls onOpenPowerManagement for global standard', () => {
    const handler = vi.fn();
    render(<DevicesTab {...baseProps} onOpenPowerManagement={handler} />);
    fireEvent.click(screen.getByText('Global Standard'));
    expect(handler).toHaveBeenCalledWith('__global__');
  });

  it('displays connected displays message', () => {
    render(<DevicesTab {...baseProps} connectedDisplaysMessage="Updated!" connectedDisplaysMessageType="success" />);
    expect(screen.getByText('Updated!')).toBeInTheDocument();
  });

  it('renders display table when displays exist', () => {
    const displays = [{
      id: 'display-1',
      name: 'Conference Room A',
      type: 'single-room',
      socketIO: { connected: true, status: 'active' },
      mqtt: null,
      ipAddress: '192.168.1.100'
    }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
  });

  it('shows Socket.IO badge for socket-connected displays', () => {
    const displays = [{
      id: 'display-1',
      name: 'Room A',
      type: 'single-room',
      socketIO: { connected: true, status: 'active' },
    }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('Socket.IO')).toBeInTheDocument();
  });

  it('shows MQTT badge for MQTT-connected displays', () => {
    const displays = [{
      id: 'display-1',
      name: 'Room A',
      type: 'single-room',
      mqtt: { connected: true, deviceId: 'dev-1', cpuUsage: 25.5, memoryUsage: 60.2, temperature: 45.3 },
    }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('MQTT')).toBeInTheDocument();
    expect(screen.getByText(/25\.5%/)).toBeInTheDocument();
    expect(screen.getByText(/60\.2%/)).toBeInTheDocument();
    expect(screen.getByText(/45\.3°C/)).toBeInTheDocument();
  });

  it('shows delete button for disconnected displays', () => {
    const displays = [{
      id: 'display-1',
      name: 'Room A',
      type: 'single-room',
    }];
    const handler = vi.fn();
    render(<DevicesTab {...baseProps} connectedDisplays={displays} onDeleteDisplay={handler} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(handler).toHaveBeenCalledWith('display-1');
  });

  it('shows power management button for each display', () => {
    const displays = [{
      id: 'display-1',
      name: 'Room A',
      type: 'single-room',
      socketIO: { connected: true, status: 'active' },
    }];
    const handler = vi.fn();
    render(<DevicesTab {...baseProps} connectedDisplays={displays} onOpenPowerManagement={handler} />);
    fireEvent.click(screen.getByTitle('Power Management'));
    expect(handler).toHaveBeenCalledWith('display-1');
  });

  it('calls onTrackingModeChange when radio is changed', () => {
    const handler = vi.fn();
    render(<DevicesTab {...baseProps} onTrackingModeChange={handler} />);
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[1]); // ip-room
    expect(handler).toHaveBeenCalledWith('ip-room');
  });

  it('calls onRetentionHoursChange when input changes', () => {
    const handler = vi.fn();
    render(<DevicesTab {...baseProps} onRetentionHoursChange={handler} />);
    fireEvent.change(screen.getByLabelText(/Retention Time/), { target: { value: '48' } });
    expect(handler).toHaveBeenCalledWith('48');
  });

  it('calls onCleanupMinutesChange when input changes', () => {
    const handler = vi.fn();
    render(<DevicesTab {...baseProps} onCleanupMinutesChange={handler} />);
    fireEvent.change(screen.getByLabelText(/Cleanup Delay/), { target: { value: '10' } });
    expect(handler).toHaveBeenCalledWith('10');
  });

  it('calls onIpWhitelistEnabledChange when checkbox is toggled', () => {
    const handler = vi.fn();
    render(<DevicesTab {...baseProps} onIpWhitelistEnabledChange={handler} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('shows IP whitelist textarea when enabled', () => {
    render(<DevicesTab {...baseProps} systemDisplayIpWhitelistEnabled={true} />);
    expect(screen.getByLabelText(/Allowed IP/)).toBeInTheDocument();
  });

  it('hides IP whitelist textarea when disabled', () => {
    render(<DevicesTab {...baseProps} systemDisplayIpWhitelistEnabled={false} />);
    expect(screen.queryByLabelText(/Allowed IP/)).not.toBeInTheDocument();
  });

  it('disables save button when no changes', () => {
    render(<DevicesTab {...baseProps} />);
    expect(screen.getByText('Save Settings')).toBeDisabled();
  });

  it('enables save button when tracking mode changes', () => {
    render(<DevicesTab {...baseProps} systemDisplayTrackingMode="ip-room" />);
    expect(screen.getByText('Save Settings')).not.toBeDisabled();
  });

  it('displays system message when provided', () => {
    render(<DevicesTab {...baseProps} systemMessage="Settings saved!" systemMessageType="success" />);
    expect(screen.getByText('Settings saved!')).toBeInTheDocument();
  });

  it('shows NEW badge for MQTT displays without desired config', () => {
    const displays = [{
      id: 'display-1',
      name: 'Room A',
      type: 'single-room',
      mqtt: { connected: true, hasDesiredConfig: false, deviceId: 'dev-1' },
    }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('shows Details button for MQTT displays', () => {
    const displays = [{
      id: 'display-1',
      name: 'Room A',
      type: 'single-room',
      mqtt: { connected: true, deviceId: 'dev-1' },
    }];
    const handler = vi.fn();
    render(<DevicesTab {...baseProps} connectedDisplays={displays} onOpenTouchkioModal={handler} />);
    fireEvent.click(screen.getByText('Details'));
    expect(handler).toHaveBeenCalledWith(displays[0]);
  });

  it('shows Disconnected status for displays with no connections', () => {
    const displays = [{
      id: 'display-1',
      name: 'Room A',
      type: 'single-room',
    }];
    const { container } = render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    const statusDot = container.querySelector('.devices-status-dot');
    expect(statusDot).toHaveAttribute('title', 'Disconnected');
  });
});
