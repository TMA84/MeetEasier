import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import SystemTab from './SystemTab';
import TranslationApiTab from './TranslationApiTab';
import ApiTokenTab from './ApiTokenTab';

const defaultT = {
  currentConfigTitle: 'Current Config',
  lastUpdatedLabel: 'Last Updated:',
  configuredViaEnv: 'Configured via env',
  systemConfigSectionTitle: 'System Configuration',
  systemStartupValidationStrictLabel: 'Startup Validation Strict',
  systemStartupValidationStrictHelp: 'Stop startup when warnings are present.',
  systemExposeDetailedErrorsLabel: 'Expose Detailed Errors',
  systemExposeDetailedErrorsHelp: 'Only enable for trusted debugging environments.',
  systemHstsMaxAgeLabel: 'HSTS Max Age (s)',
  systemHstsMaxAgeInputLabel: 'HSTS Max Age (seconds)',
  systemHstsMaxAgeHelp: 'Set to 0 to disable HSTS header.',
  systemRateLimitMaxBucketsLabel: 'Rate Limiter Max Buckets',
  systemDisplayTrackingModeLabel: 'Tracking Mode',
  systemDisplayTrackingModeIpRoom: 'IP + Room',
  systemDisplayTrackingModeClientId: 'Client ID',
  systemDisplayTrackingRetentionLabel: 'Retention Time',
  systemDisplayTrackingCleanupLabel: 'Cleanup Delay',
  demoModeSectionTitle: 'Demo Mode',
  demoModeEnabledLabel: 'Demo Mode',
  demoModeActiveHelp: 'Demo mode is active.',
  demoModeDisabledByOauth: 'Demo mode is not available when OAuth is configured.',
  systemSaveButton: 'Save System Configuration',
  translationApiSectionTitle: 'Translation API Configuration',
  translationApiEnabledLabel: 'Auto Translation Enabled',
  translationApiEnableToggleLabel: 'Enable auto translation',
  translationApiUrlLabel: 'Translation API URL',
  translationApiKeyLabel: 'API Key',
  translationApiApiKeyConfigured: 'Configured',
  translationApiApiKeyNotConfigured: 'Not configured',
  translationApiTimeoutLabel: 'Timeout (ms)',
  translationApiTimeoutHelp: 'Minimum: 3000 ms',
  translationApiKeyPlaceholder: 'Leave empty to keep existing API key',
  translationApiSaveButton: 'Save Translation API Configuration',
  apiTokenConfigSectionTitle: 'API Tokens',
  apiTokenSourceLabel: 'Token Source',
  apiTokenDefaultActiveLabel: 'Default Token Active',
  apiTokenDefaultValueLabel: 'Default Token',
  apiTokenDefaultValue: 'change-me-admin-token',
  apiTokenNewLabel: 'New API Token',
  apiTokenNewConfirmLabel: 'Confirm New API Token',
  apiTokenMinLengthPlaceholder: 'At least 8 characters',
  apiTokenConfirmPlaceholder: 'Repeat new token',
  apiTokenConfigHelp: 'After saving, use the new token for future logins.',
  apiTokenConfigSaveButton: 'Save API Token',
  adminApiTokenConfiguredViaEnv: 'Admin API token is configured via environment (.env).',
  wifiApiTokenConfigSectionTitle: 'WiFi API Token',
  wifiApiTokenSourceLabel: 'WiFi Token Source',
  wifiApiTokenConfiguredLabel: 'WiFi Token Configured',
  wifiApiTokenLastUpdatedLabel: 'WiFi Token Last Updated',
  wifiApiTokenNewLabel: 'New WiFi API Token',
  wifiApiTokenNewConfirmLabel: 'Confirm New WiFi API Token',
  wifiApiTokenConfigHelp: 'Use this token for external WiFi API integrations.',
  wifiApiTokenConfigSaveButton: 'Save WiFi API Token',
  wifiApiTokenConfiguredViaEnv: 'WiFi API token is configured via environment (.env).',
};

const booleanLabel = (v) => v ? 'Yes' : 'No';

describe('SystemTab extended', () => {
  const baseProps = {
    isActive: true,
    systemLocked: false,
    currentSystemStartupValidationStrict: false,
    currentSystemExposeDetailedErrors: false,
    currentSystemHstsMaxAge: 31536000,
    currentSystemRateLimitMaxBuckets: 10000,
    currentSystemDisplayTrackingMode: 'client-id',
    currentSystemDisplayTrackingRetentionHours: 24,
    currentSystemDisplayTrackingCleanupMinutes: 5,
    systemLastUpdated: '2024-01-01',
    systemStartupValidationStrict: false,
    systemExposeDetailedErrors: false,
    systemHstsMaxAge: 31536000,
    systemRateLimitMaxBuckets: 10000,
    demoMode: false,
    currentDemoMode: false,
    systemMessage: '',
    systemMessageType: '',
    t: defaultT,
    booleanLabel,
    onStartupValidationChange: vi.fn(),
    onExposeErrorsChange: vi.fn(),
    onHstsMaxAgeChange: vi.fn(),
    onRateLimitMaxBucketsChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  it('displays current config values', () => {
    render(<SystemTab {...baseProps} />);
    expect(screen.getByText('31536000')).toBeInTheDocument();
    expect(screen.getByText('10000')).toBeInTheDocument();
    expect(screen.getByText('24h')).toBeInTheDocument();
    expect(screen.getByText('5min')).toBeInTheDocument();
  });

  it('displays tracking mode as Client ID', () => {
    render(<SystemTab {...baseProps} />);
    expect(screen.getByText('Client ID')).toBeInTheDocument();
  });

  it('displays tracking mode as IP + Room', () => {
    render(<SystemTab {...baseProps} currentSystemDisplayTrackingMode="ip-room" />);
    expect(screen.getByText('IP + Room')).toBeInTheDocument();
  });

  it('calls onStartupValidationChange when checkbox is toggled', () => {
    const handler = vi.fn();
    render(<SystemTab {...baseProps} onStartupValidationChange={handler} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is startup validation
    fireEvent.click(checkboxes[0]);
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('calls onExposeErrorsChange when checkbox is toggled', () => {
    const handler = vi.fn();
    render(<SystemTab {...baseProps} onExposeErrorsChange={handler} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // Second checkbox is expose errors
    fireEvent.click(checkboxes[1]);
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('calls onHstsMaxAgeChange when input changes', () => {
    const handler = vi.fn();
    render(<SystemTab {...baseProps} onHstsMaxAgeChange={handler} />);
    fireEvent.change(screen.getByLabelText(/HSTS Max Age \(seconds\)/), { target: { value: '0' } });
    expect(handler).toHaveBeenCalledWith('0');
  });

  it('calls onRateLimitMaxBucketsChange when input changes', () => {
    const handler = vi.fn();
    render(<SystemTab {...baseProps} onRateLimitMaxBucketsChange={handler} />);
    fireEvent.change(screen.getByLabelText(/Rate Limiter Max Buckets/), { target: { value: '5000' } });
    expect(handler).toHaveBeenCalledWith('5000');
  });

  it('calls onSubmit when form is submitted', () => {
    const handler = vi.fn((e) => e.preventDefault());
    render(<SystemTab {...baseProps} onSubmit={handler} systemHstsMaxAge={0} />);
    fireEvent.submit(screen.getByText('Save System Configuration').closest('form'));
    expect(handler).toHaveBeenCalled();
  });

  it('disables submit button when no changes', () => {
    render(<SystemTab {...baseProps} />);
    expect(screen.getByText('Save System Configuration')).toBeDisabled();
  });

  it('enables submit button when values differ', () => {
    render(<SystemTab {...baseProps} systemHstsMaxAge={0} />);
    expect(screen.getByText('Save System Configuration')).not.toBeDisabled();
  });

  it('displays system message when provided', () => {
    render(<SystemTab {...baseProps} systemMessage="Saved successfully" systemMessageType="success" />);
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
  });

  it('shows demo mode active help when demo mode is on', () => {
    render(<SystemTab {...baseProps} demoMode={true} />);
    expect(screen.getByText('Demo mode is active.')).toBeInTheDocument();
  });

  it('shows demo mode disabled help when demo mode is off', () => {
    render(<SystemTab {...baseProps} demoMode={false} />);
    expect(screen.getByText('Demo mode is not available when OAuth is configured.')).toBeInTheDocument();
  });

  it('demo mode checkbox is always disabled', () => {
    render(<SystemTab {...baseProps} demoMode={true} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // Demo mode checkbox (3rd) should be disabled
    const demoCheckbox = checkboxes[2];
    expect(demoCheckbox).toBeDisabled();
  });

  it('displays last updated date', () => {
    render(<SystemTab {...baseProps} systemLastUpdated="2024-06-15" />);
    expect(screen.getByText('2024-06-15')).toBeInTheDocument();
  });

  it('displays dash when no last updated date', () => {
    render(<SystemTab {...baseProps} systemLastUpdated="" />);
    // Should show '-' for empty last updated
    const configValues = screen.getAllByText('-');
    expect(configValues.length).toBeGreaterThan(0);
  });

  it('hides content when not active', () => {
    const { container } = render(<SystemTab {...baseProps} isActive={false} />);
    expect(container.querySelector('.active')).not.toBeInTheDocument();
  });
});

describe('TranslationApiTab extended', () => {
  const baseProps = {
    isActive: true,
    translationApiLocked: false,
    currentTranslationApiEnabled: false,
    currentTranslationApiUrl: 'https://api.example.com',
    currentTranslationApiHasApiKey: true,
    currentTranslationApiTimeoutMs: 5000,
    translationApiLastUpdated: '2024-01-01',
    translationApiEnabled: false,
    translationApiUrl: 'https://api.example.com',
    translationApiApiKey: '',
    translationApiTimeoutMs: 5000,
    translationApiMessage: '',
    translationApiMessageType: '',
    t: defaultT,
    booleanLabel,
    onEnabledChange: vi.fn(),
    onUrlChange: vi.fn(),
    onApiKeyChange: vi.fn(),
    onTimeoutChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  it('displays current config values', () => {
    render(<TranslationApiTab {...baseProps} />);
    expect(screen.getByText('https://api.example.com')).toBeInTheDocument();
    expect(screen.getByText('Configured')).toBeInTheDocument();
    expect(screen.getByText('5000')).toBeInTheDocument();
  });

  it('shows "Not configured" when no API key', () => {
    render(<TranslationApiTab {...baseProps} currentTranslationApiHasApiKey={false} />);
    expect(screen.getByText('Not configured')).toBeInTheDocument();
  });

  it('calls onEnabledChange when checkbox is toggled', () => {
    const handler = vi.fn();
    render(<TranslationApiTab {...baseProps} onEnabledChange={handler} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('calls onUrlChange when URL input changes', () => {
    const handler = vi.fn();
    render(<TranslationApiTab {...baseProps} onUrlChange={handler} />);
    fireEvent.change(screen.getByLabelText(/Translation API URL/), { target: { value: 'https://new-api.com' } });
    expect(handler).toHaveBeenCalledWith('https://new-api.com');
  });

  it('calls onApiKeyChange when API key input changes', () => {
    const handler = vi.fn();
    render(<TranslationApiTab {...baseProps} onApiKeyChange={handler} />);
    fireEvent.change(screen.getByLabelText(/API Key/), { target: { value: 'new-key' } });
    expect(handler).toHaveBeenCalledWith('new-key');
  });

  it('calls onTimeoutChange when timeout input changes', () => {
    const handler = vi.fn();
    render(<TranslationApiTab {...baseProps} onTimeoutChange={handler} />);
    fireEvent.change(screen.getByLabelText(/Timeout \(ms\)/), { target: { value: '10000' } });
    expect(handler).toHaveBeenCalledWith(10000);
  });

  it('enforces minimum timeout of 3000ms', () => {
    const handler = vi.fn();
    render(<TranslationApiTab {...baseProps} onTimeoutChange={handler} />);
    fireEvent.change(screen.getByLabelText(/Timeout \(ms\)/), { target: { value: '1000' } });
    expect(handler).toHaveBeenCalledWith(3000);
  });

  it('calls onSubmit when form is submitted', () => {
    const handler = vi.fn((e) => e.preventDefault());
    render(<TranslationApiTab {...baseProps} onSubmit={handler} translationApiApiKey="new-key" />);
    fireEvent.submit(screen.getByText('Save Translation API Configuration').closest('form'));
    expect(handler).toHaveBeenCalled();
  });

  it('disables submit when no changes and no new API key', () => {
    render(<TranslationApiTab {...baseProps} />);
    expect(screen.getByText('Save Translation API Configuration')).toBeDisabled();
  });

  it('enables submit when API key is provided', () => {
    render(<TranslationApiTab {...baseProps} translationApiApiKey="new-key" />);
    expect(screen.getByText('Save Translation API Configuration')).not.toBeDisabled();
  });

  it('enables submit when URL changes', () => {
    render(<TranslationApiTab {...baseProps} translationApiUrl="https://different.com" />);
    expect(screen.getByText('Save Translation API Configuration')).not.toBeDisabled();
  });

  it('displays message when provided', () => {
    render(<TranslationApiTab {...baseProps} translationApiMessage="Saved!" translationApiMessageType="success" />);
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('renders locked message when locked', () => {
    render(<TranslationApiTab {...baseProps} translationApiLocked={true} />);
    expect(screen.getByText('Configured via env')).toBeInTheDocument();
  });

  it('does not render form when locked', () => {
    render(<TranslationApiTab {...baseProps} translationApiLocked={true} />);
    expect(screen.queryByLabelText(/Translation API URL/)).not.toBeInTheDocument();
  });

  it('displays last updated date', () => {
    render(<TranslationApiTab {...baseProps} />);
    expect(screen.getByText('2024-01-01')).toBeInTheDocument();
  });
});

describe('ApiTokenTab extended', () => {
  const baseProps = {
    isActive: true,
    apiTokenLocked: false,
    wifiApiTokenLocked: false,
    t: defaultT,
    apiTokenSourceLabelMap: { runtime: 'Runtime', env: 'Environment' },
    currentApiTokenSource: 'runtime',
    currentApiTokenIsDefault: true,
    apiTokenConfigLastUpdated: '2024-01-01',
    currentWifiApiTokenSource: 'runtime',
    currentWifiApiTokenConfigured: false,
    wifiApiTokenConfigLastUpdated: '',
    newApiToken: '',
    newApiTokenConfirm: '',
    newWifiApiToken: '',
    newWifiApiTokenConfirm: '',
    apiTokenConfigMessage: '',
    apiTokenConfigMessageType: '',
    wifiApiTokenConfigMessage: '',
    wifiApiTokenConfigMessageType: '',
    booleanLabel,
    onApiTokenChange: vi.fn(),
    onApiTokenSubmit: vi.fn(),
    onWifiApiTokenChange: vi.fn(),
    onWifiApiTokenSubmit: vi.fn(),
  };

  it('displays current token source', () => {
    render(<ApiTokenTab {...baseProps} />);
    const runtimeElements = screen.getAllByText('Runtime');
    expect(runtimeElements.length).toBeGreaterThanOrEqual(1);
  });

  it('displays default token active status', () => {
    render(<ApiTokenTab {...baseProps} />);
    const yesElements = screen.getAllByText('Yes');
    expect(yesElements.length).toBeGreaterThanOrEqual(1);
  });

  it('displays default token value', () => {
    render(<ApiTokenTab {...baseProps} />);
    expect(screen.getByText('change-me-admin-token')).toBeInTheDocument();
  });

  it('calls onApiTokenChange when new token input changes', () => {
    const handler = vi.fn();
    render(<ApiTokenTab {...baseProps} onApiTokenChange={handler} />);
    fireEvent.change(screen.getByLabelText('New API Token'), { target: { value: 'new-token' } });
    expect(handler).toHaveBeenCalledWith('newApiToken', 'new-token');
  });

  it('calls onApiTokenChange when confirm input changes', () => {
    const handler = vi.fn();
    render(<ApiTokenTab {...baseProps} onApiTokenChange={handler} />);
    fireEvent.change(screen.getByLabelText('Confirm New API Token'), { target: { value: 'new-token' } });
    expect(handler).toHaveBeenCalledWith('newApiTokenConfirm', 'new-token');
  });

  it('disables submit when tokens do not match', () => {
    render(<ApiTokenTab {...baseProps} newApiToken="abc" newApiTokenConfirm="xyz" />);
    expect(screen.getByText('Save API Token')).toBeDisabled();
  });

  it('disables submit when tokens are empty', () => {
    render(<ApiTokenTab {...baseProps} />);
    expect(screen.getByText('Save API Token')).toBeDisabled();
  });

  it('enables submit when tokens match and are non-empty', () => {
    render(<ApiTokenTab {...baseProps} newApiToken="my-token" newApiTokenConfirm="my-token" />);
    expect(screen.getByText('Save API Token')).not.toBeDisabled();
  });

  it('calls onApiTokenSubmit when form is submitted', () => {
    const handler = vi.fn((e) => e.preventDefault());
    render(<ApiTokenTab {...baseProps} newApiToken="token" newApiTokenConfirm="token" onApiTokenSubmit={handler} />);
    fireEvent.submit(screen.getByText('Save API Token').closest('form'));
    expect(handler).toHaveBeenCalled();
  });

  it('shows locked message for admin token when locked', () => {
    render(<ApiTokenTab {...baseProps} apiTokenLocked={true} />);
    expect(screen.getByText('Admin API token is configured via environment (.env).')).toBeInTheDocument();
  });

  it('hides admin token form when locked', () => {
    render(<ApiTokenTab {...baseProps} apiTokenLocked={true} />);
    expect(screen.queryByLabelText('New API Token')).not.toBeInTheDocument();
  });

  it('displays API token config message', () => {
    render(<ApiTokenTab {...baseProps} apiTokenConfigMessage="Token saved!" apiTokenConfigMessageType="success" />);
    expect(screen.getByText('Token saved!')).toBeInTheDocument();
  });

  it('renders WiFi API Token section', () => {
    render(<ApiTokenTab {...baseProps} />);
    expect(screen.getByText('WiFi API Token')).toBeInTheDocument();
  });

  it('calls onWifiApiTokenChange when WiFi token input changes', () => {
    const handler = vi.fn();
    render(<ApiTokenTab {...baseProps} onWifiApiTokenChange={handler} />);
    fireEvent.change(screen.getByLabelText('New WiFi API Token'), { target: { value: 'wifi-token' } });
    expect(handler).toHaveBeenCalledWith('newWifiApiToken', 'wifi-token');
  });

  it('disables WiFi token submit when tokens do not match', () => {
    render(<ApiTokenTab {...baseProps} newWifiApiToken="abc" newWifiApiTokenConfirm="xyz" />);
    expect(screen.getByText('Save WiFi API Token')).toBeDisabled();
  });

  it('enables WiFi token submit when tokens match', () => {
    render(<ApiTokenTab {...baseProps} newWifiApiToken="wifi" newWifiApiTokenConfirm="wifi" />);
    expect(screen.getByText('Save WiFi API Token')).not.toBeDisabled();
  });

  it('shows locked message for WiFi token when locked', () => {
    render(<ApiTokenTab {...baseProps} wifiApiTokenLocked={true} />);
    expect(screen.getByText('WiFi API token is configured via environment (.env).')).toBeInTheDocument();
  });

  it('displays WiFi token config message', () => {
    render(<ApiTokenTab {...baseProps} wifiApiTokenConfigMessage="WiFi token saved!" wifiApiTokenConfigMessageType="success" />);
    expect(screen.getByText('WiFi token saved!')).toBeInTheDocument();
  });

  it('displays WiFi token configured status', () => {
    render(<ApiTokenTab {...baseProps} currentWifiApiTokenConfigured={true} />);
    // Should show "Yes" for configured
    const yesElements = screen.getAllByText('Yes');
    expect(yesElements.length).toBeGreaterThanOrEqual(1);
  });
});
