import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WiFiTab from './WiFiTab';

const t = {
  wifiSectionTitle: 'WiFi Settings',
  currentConfigTitle: 'Current Config',
  ssidLabel: 'SSID',
  passwordLabel: 'Password',
  lastUpdatedLabel: 'Last Updated',
  wifiSsidLabel: 'WiFi SSID',
  wifiPasswordLabel: 'WiFi Password',
  wifiSsidPlaceholder: 'Enter SSID',
  wifiPasswordPlaceholder: 'Enter password',
  submitWifiButton: 'Save WiFi',
  configuredViaEnv: 'Configured via environment',
};

const baseProps = {
  isActive: true,
  wifiLocked: false,
  t,
  currentSsid: 'OldSSID',
  currentPassword: 'OldPass',
  wifiLastUpdated: '2024-01-01',
  ssid: 'OldSSID',
  password: 'OldPass',
  wifiMessage: '',
  wifiMessageType: '',
  onFieldChange: vi.fn(),
  onSubmit: vi.fn((e) => e.preventDefault()),
};

describe('WiFiTab coverage', () => {
  it('renders form fields', () => {
    render(<WiFiTab {...baseProps} />);
    expect(screen.getByLabelText('WiFi SSID')).toBeInTheDocument();
    expect(screen.getByLabelText('WiFi Password')).toBeInTheDocument();
  });

  it('shows current config values', () => {
    render(<WiFiTab {...baseProps} />);
    expect(screen.getByText('OldSSID')).toBeInTheDocument();
    expect(screen.getByText('OldPass')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01')).toBeInTheDocument();
  });

  it('calls onFieldChange when SSID changes', () => {
    const onFieldChange = vi.fn();
    render(<WiFiTab {...baseProps} onFieldChange={onFieldChange} />);
    fireEvent.change(screen.getByLabelText('WiFi SSID'), { target: { value: 'NewSSID' } });
    expect(onFieldChange).toHaveBeenCalledWith('ssid', 'NewSSID');
  });

  it('calls onFieldChange when password changes', () => {
    const onFieldChange = vi.fn();
    render(<WiFiTab {...baseProps} onFieldChange={onFieldChange} />);
    fireEvent.change(screen.getByLabelText('WiFi Password'), { target: { value: 'NewPass' } });
    expect(onFieldChange).toHaveBeenCalledWith('password', 'NewPass');
  });

  it('submit button disabled when nothing changed', () => {
    render(<WiFiTab {...baseProps} />);
    expect(screen.getByText('Save WiFi')).toBeDisabled();
  });

  it('submit button enabled when SSID changed', () => {
    render(<WiFiTab {...baseProps} ssid="NewSSID" />);
    expect(screen.getByText('Save WiFi')).not.toBeDisabled();
  });

  it('submit button enabled when password changed', () => {
    render(<WiFiTab {...baseProps} password="NewPass" />);
    expect(screen.getByText('Save WiFi')).not.toBeDisabled();
  });

  it('calls onSubmit when form submitted', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<WiFiTab {...baseProps} ssid="NewSSID" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('Save WiFi'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('shows wifi message when provided', () => {
    render(<WiFiTab {...baseProps} wifiMessage="WiFi saved!" wifiMessageType="success" />);
    expect(screen.getByText('WiFi saved!')).toBeInTheDocument();
  });

  it('does not show message when empty', () => {
    const { container } = render(<WiFiTab {...baseProps} />);
    expect(container.querySelector('.admin-message')).toBeNull();
  });

  it('renders locked state', () => {
    render(<WiFiTab {...baseProps} wifiLocked={true} />);
    expect(screen.getByText('Configured via environment')).toBeInTheDocument();
    expect(screen.queryByLabelText('WiFi SSID')).toBeNull();
  });

  it('renders QR code preview image', () => {
    render(<WiFiTab {...baseProps} />);
    const img = screen.getByAltText('WiFi QR Code');
    expect(img).toBeInTheDocument();
  });

  it('hides QR image on error', () => {
    render(<WiFiTab {...baseProps} />);
    const img = screen.getByAltText('WiFi QR Code');
    fireEvent.error(img);
    expect(img.style.display).toBe('none');
  });

  it('applies inactive class when not active', () => {
    const { container } = render(<WiFiTab {...baseProps} isActive={false} />);
    expect(container.querySelector('.admin-tab-content.active')).toBeNull();
  });
});
