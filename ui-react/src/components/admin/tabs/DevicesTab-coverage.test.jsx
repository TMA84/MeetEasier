import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DevicesTab from './DevicesTab';

const t = {
  connectedDisplaysSectionTitle: 'Connected Displays',
  connectedDisplaysRefreshButton: 'Refresh',
  connectedDisplaysEmpty: 'No displays connected.',
  powerManagementGlobalButton: 'Global Standard',
  systemDisplayTrackingSectionTitle: 'Tracking Settings',
  systemDisplayTrackingModeLabel: 'Tracking Mode',
  systemDisplayTrackingModeClientId: 'Client ID',
  systemDisplayTrackingModeIpRoom: 'IP + Room',
  systemDisplayTrackingModeHelp: 'Help text',
  systemDisplayTrackingRetentionLabel: 'Retention',
  systemDisplayTrackingRetentionHelp: 'Retention help',
  systemDisplayTrackingCleanupLabel: 'Cleanup',
  systemDisplayTrackingCleanupHelp: 'Cleanup help',
  displayIpWhitelistSectionTitle: 'IP Whitelist',
  displayIpWhitelistEnabledLabel: 'Enable IP Whitelist',
  displayIpWhitelistEnabledHelp: 'Whitelist help',
  displayIpWhitelistLabel: 'Allowed IPs',
  displayIpWhitelistHelp: 'IP help',
  trustReverseProxyLabel: 'Behind Reverse Proxy',
  trustReverseProxyHelp: 'Proxy help',
  systemSaveButton: 'Save',
  loading: 'Loading...',
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
  t,
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

describe('DevicesTab coverage', () => {
  it('renders empty state when no displays', () => {
    render(<DevicesTab {...baseProps} />);
    expect(screen.getByText('No displays connected.')).toBeInTheDocument();
  });

  it('shows loading text when loading', () => {
    render(<DevicesTab {...baseProps} connectedDisplaysLoading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows connectedDisplaysMessage when provided', () => {
    render(<DevicesTab {...baseProps} connectedDisplaysMessage="Updated!" connectedDisplaysMessageType="success" />);
    expect(screen.getByText('Updated!')).toBeInTheDocument();
  });

  it('shows systemMessage when provided', () => {
    render(<DevicesTab {...baseProps} systemMessage="Saved!" systemMessageType="success" />);
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('renders display with SocketIO only (active)', () => {
    const displays = [{ id: '1', name: 'Display 1', type: 'single-room', socketIO: { connected: true, status: 'active', connectedAt: new Date().toISOString() } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('Display 1')).toBeInTheDocument();
    expect(screen.getByText('Socket.IO')).toBeInTheDocument();
  });

  it('renders display with SocketIO only (inactive)', () => {
    const displays = [{ id: '2', name: 'Display 2', type: 'flightboard', socketIO: { connected: true, status: 'inactive', connectedAt: null } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('Display 2')).toBeInTheDocument();
  });

  it('renders display with MQTT only (power ON)', () => {
    const displays = [{ id: '3', name: 'MQTT Display', type: 'single-room', mqtt: { connected: true, deviceId: 'rpi-1', hostname: 'rpi-host', power: 'ON', powerUnsupported: false, cpuUsage: 45.2, memoryUsage: 60.1, temperature: 55.3, room: 'Room A' } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('MQTT')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('renders display with MQTT only (power OFF)', () => {
    const displays = [{ id: '4', name: 'Off Display', type: 'single-room', mqtt: { connected: true, deviceId: 'rpi-2', power: 'OFF', powerUnsupported: false } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('Off Display')).toBeInTheDocument();
  });

  it('renders display with MQTT only (powerUnsupported true)', () => {
    const displays = [{ id: '5', name: 'Unsupported', type: 'single-room', mqtt: { connected: true, deviceId: 'rpi-3', powerUnsupported: true } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('Unsupported')).toBeInTheDocument();
  });

  it('renders display with MQTT only (powerUnsupported undefined)', () => {
    const displays = [{ id: '6', name: 'Unknown Power', type: 'single-room', mqtt: { connected: true, deviceId: 'rpi-4' } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('Unknown Power')).toBeInTheDocument();
  });

  it('renders display with both SocketIO and MQTT (socket active, mqtt power known ON)', () => {
    const displays = [{ id: '7', name: 'Both Active', type: 'single-room', socketIO: { connected: true, status: 'active' }, mqtt: { connected: true, deviceId: 'rpi-5', power: 'ON', powerUnsupported: false } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('Both Active')).toBeInTheDocument();
    expect(screen.getByText('Socket.IO')).toBeInTheDocument();
    expect(screen.getByText('MQTT')).toBeInTheDocument();
  });

  it('renders display with both SocketIO and MQTT (socket active, mqtt power OFF = Partial)', () => {
    const displays = [{ id: '8', name: 'Partial', type: 'single-room', socketIO: { connected: true, status: 'active' }, mqtt: { connected: true, deviceId: 'rpi-6', power: 'OFF', powerUnsupported: false } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('Partial')).toBeInTheDocument();
  });

  it('renders display with both SocketIO and MQTT (socket inactive, mqtt power OFF)', () => {
    const displays = [{ id: '9', name: 'Both Off', type: 'single-room', socketIO: { connected: true, status: 'inactive' }, mqtt: { connected: true, deviceId: 'rpi-7', power: 'OFF', powerUnsupported: false } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('Both Off')).toBeInTheDocument();
  });

  it('renders display with both SocketIO and MQTT (power not known, socket active)', () => {
    const displays = [{ id: '10', name: 'No Power Info', type: 'single-room', socketIO: { connected: true, status: 'active' }, mqtt: { connected: true, deviceId: 'rpi-8', powerUnsupported: true } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('No Power Info')).toBeInTheDocument();
  });

  it('renders display with both SocketIO and MQTT (power not known, socket inactive)', () => {
    const displays = [{ id: '11', name: 'Inactive Both', type: 'single-room', socketIO: { connected: true, status: 'inactive' }, mqtt: { connected: true, deviceId: 'rpi-9', powerUnsupported: true } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('Inactive Both')).toBeInTheDocument();
  });

  it('renders disconnected display with delete button', () => {
    const displays = [{ id: '12', name: 'Disconnected', type: 'unknown' }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onDeleteDisplay when delete button clicked', () => {
    const onDeleteDisplay = vi.fn();
    const displays = [{ id: '12', name: 'Disconnected', type: 'unknown' }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} onDeleteDisplay={onDeleteDisplay} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(onDeleteDisplay).toHaveBeenCalledWith('12');
  });

  it('calls onOpenPowerManagement when power button clicked', () => {
    const onOpenPowerManagement = vi.fn();
    const displays = [{ id: '1', name: 'D1', type: 'single-room', socketIO: { connected: true, status: 'active' } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} onOpenPowerManagement={onOpenPowerManagement} />);
    fireEvent.click(screen.getByTitle('Power Management'));
    expect(onOpenPowerManagement).toHaveBeenCalledWith('1');
  });

  it('calls onMqttRefresh when refresh button clicked on MQTT display', () => {
    const onMqttRefresh = vi.fn();
    const displays = [{ id: '3', name: 'MQTT D', type: 'single-room', mqtt: { connected: true, deviceId: 'rpi-1', hostname: 'rpi-host' } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} onMqttRefresh={onMqttRefresh} />);
    fireEvent.click(screen.getByTitle('Refresh Page'));
    expect(onMqttRefresh).toHaveBeenCalledWith('rpi-1');
  });

  it('calls onOpenTouchkioModal when Details button clicked', () => {
    const onOpenTouchkioModal = vi.fn();
    const displays = [{ id: '3', name: 'MQTT D', type: 'single-room', mqtt: { connected: true, deviceId: 'rpi-1' } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} onOpenTouchkioModal={onOpenTouchkioModal} />);
    fireEvent.click(screen.getByText('Details'));
    expect(onOpenTouchkioModal).toHaveBeenCalled();
  });

  it('calls onLoadDisplays when refresh button clicked', () => {
    const onLoadDisplays = vi.fn();
    render(<DevicesTab {...baseProps} onLoadDisplays={onLoadDisplays} />);
    fireEvent.click(screen.getByText('Refresh'));
    expect(onLoadDisplays).toHaveBeenCalled();
  });

  it('calls onOpenPowerManagement with __global__ for global button', () => {
    const onOpenPowerManagement = vi.fn();
    render(<DevicesTab {...baseProps} onOpenPowerManagement={onOpenPowerManagement} />);
    fireEvent.click(screen.getByText('Global Standard'));
    expect(onOpenPowerManagement).toHaveBeenCalledWith('__global__');
  });

  it('tracking mode radio buttons call onTrackingModeChange', () => {
    const onTrackingModeChange = vi.fn();
    render(<DevicesTab {...baseProps} onTrackingModeChange={onTrackingModeChange} />);
    const ipRoomRadio = screen.getByDisplayValue('ip-room');
    fireEvent.click(ipRoomRadio);
    expect(onTrackingModeChange).toHaveBeenCalledWith('ip-room');
  });

  it('retention hours input calls onRetentionHoursChange', () => {
    const onRetentionHoursChange = vi.fn();
    render(<DevicesTab {...baseProps} onRetentionHoursChange={onRetentionHoursChange} />);
    const input = screen.getByDisplayValue('24');
    fireEvent.change(input, { target: { value: '48' } });
    expect(onRetentionHoursChange).toHaveBeenCalledWith('48');
  });

  it('cleanup minutes input calls onCleanupMinutesChange', () => {
    const onCleanupMinutesChange = vi.fn();
    render(<DevicesTab {...baseProps} onCleanupMinutesChange={onCleanupMinutesChange} />);
    const input = screen.getByDisplayValue('5');
    fireEvent.change(input, { target: { value: '10' } });
    expect(onCleanupMinutesChange).toHaveBeenCalledWith('10');
  });

  it('IP whitelist checkbox calls onIpWhitelistEnabledChange', () => {
    const onIpWhitelistEnabledChange = vi.fn();
    render(<DevicesTab {...baseProps} onIpWhitelistEnabledChange={onIpWhitelistEnabledChange} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onIpWhitelistEnabledChange).toHaveBeenCalledWith(true);
  });

  it('shows IP whitelist fields when enabled', () => {
    render(<DevicesTab {...baseProps} systemDisplayIpWhitelistEnabled={true} />);
    expect(screen.getByText('Allowed IPs')).toBeInTheDocument();
    expect(screen.getByText('Behind Reverse Proxy')).toBeInTheDocument();
  });

  it('IP whitelist textarea calls onIpWhitelistChange', () => {
    const onIpWhitelistChange = vi.fn();
    render(<DevicesTab {...baseProps} systemDisplayIpWhitelistEnabled={true} onIpWhitelistChange={onIpWhitelistChange} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '192.168.1.0/24' } });
    expect(onIpWhitelistChange).toHaveBeenCalledWith('192.168.1.0/24');
  });

  it('reverse proxy checkbox calls onTrustReverseProxyChange', () => {
    const onTrustReverseProxyChange = vi.fn();
    render(<DevicesTab {...baseProps} systemDisplayIpWhitelistEnabled={true} onTrustReverseProxyChange={onTrustReverseProxyChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    const proxyCheckbox = checkboxes[1]; // second checkbox
    fireEvent.click(proxyCheckbox);
    expect(onTrustReverseProxyChange).toHaveBeenCalledWith(true);
  });

  it('save button is disabled when nothing changed', () => {
    render(<DevicesTab {...baseProps} />);
    expect(screen.getByText('Save')).toBeDisabled();
  });

  it('save button is enabled when tracking mode changed', () => {
    render(<DevicesTab {...baseProps} systemDisplayTrackingMode="ip-room" />);
    expect(screen.getByText('Save')).not.toBeDisabled();
  });

  it('calls onSaveSettings when save button clicked', () => {
    const onSaveSettings = vi.fn();
    render(<DevicesTab {...baseProps} systemDisplayTrackingMode="ip-room" onSaveSettings={onSaveSettings} />);
    fireEvent.click(screen.getByText('Save'));
    expect(onSaveSettings).toHaveBeenCalled();
  });

  it('shows NEW badge for MQTT display without hasDesiredConfig', () => {
    const displays = [{ id: '13', name: 'New Display', type: 'single-room', mqtt: { connected: true, deviceId: 'rpi-new', hasDesiredConfig: false } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('shows IP address when available', () => {
    const displays = [{ id: '14', name: 'IP Display', type: 'single-room', ipAddress: '192.168.1.100', socketIO: { connected: true, status: 'active' } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
  });

  it('shows room name for single-room MQTT display', () => {
    const displays = [{ id: '15', name: 'Room Display', type: 'single-room', mqtt: { connected: true, deviceId: 'rpi-r', room: 'Conference A' } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('Conference A')).toBeInTheDocument();
  });

  it('shows metrics with undefined values as dashes', () => {
    const displays = [{ id: '16', name: 'No Metrics', type: 'single-room', mqtt: { connected: true, deviceId: 'rpi-m' } }];
    const { container } = render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(container.textContent).toContain('CPU: -');
    expect(container.textContent).toContain('Mem: -');
    expect(container.textContent).toContain('Temp: -');
  });

  it('disables Refresh All and Reboot All when no MQTT displays', () => {
    render(<DevicesTab {...baseProps} connectedDisplays={[]} />);
    expect(screen.getByText('Refresh All Touchkio')).toBeDisabled();
    expect(screen.getByText('Reboot All Touchkio')).toBeDisabled();
  });

  it('enables Refresh All and Reboot All when MQTT displays exist', () => {
    const displays = [{ id: '17', name: 'MQTT D', type: 'single-room', mqtt: { connected: true, deviceId: 'rpi-x' } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} />);
    expect(screen.getByText('Refresh All Touchkio')).not.toBeDisabled();
    expect(screen.getByText('Reboot All Touchkio')).not.toBeDisabled();
  });

  it('calls onMqttRefreshAll when Refresh All clicked', () => {
    const onMqttRefreshAll = vi.fn();
    const displays = [{ id: '17', name: 'MQTT D', type: 'single-room', mqtt: { connected: true, deviceId: 'rpi-x' } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} onMqttRefreshAll={onMqttRefreshAll} />);
    fireEvent.click(screen.getByText('Refresh All Touchkio'));
    expect(onMqttRefreshAll).toHaveBeenCalled();
  });

  it('calls onMqttRebootAll when Reboot All clicked', () => {
    const onMqttRebootAll = vi.fn();
    const displays = [{ id: '17', name: 'MQTT D', type: 'single-room', mqtt: { connected: true, deviceId: 'rpi-x' } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} onMqttRebootAll={onMqttRebootAll} />);
    fireEvent.click(screen.getByText('Reboot All Touchkio'));
    expect(onMqttRebootAll).toHaveBeenCalled();
  });

  it('uses hostname as fallback for MQTT refresh when no deviceId', () => {
    const onMqttRefresh = vi.fn();
    const displays = [{ id: '18', name: 'Host D', type: 'single-room', mqtt: { connected: true, hostname: 'rpi-host-only' } }];
    render(<DevicesTab {...baseProps} connectedDisplays={displays} onMqttRefresh={onMqttRefresh} />);
    fireEvent.click(screen.getByTitle('Refresh Page'));
    expect(onMqttRefresh).toHaveBeenCalledWith('rpi-host-only');
  });
});
