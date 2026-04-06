import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import OAuthTab from './OAuthTab';
import BookingTab from './BookingTab';

const booleanLabel = (v) => v ? 'Yes' : 'No';

// ─── OAuthTab ────────────────────────────────────────────────────────────────

const oauthT = {
  currentConfigTitle: 'Current Config', lastUpdatedLabel: 'Last Updated:',
  configuredViaEnv: 'Configured via env',
  oauthSectionTitle: 'OAuth Configuration',
  oauthClientIdLabel: 'Client ID', oauthTenantIdLabel: 'Tenant ID',
  oauthAuthMethodLabel: 'Auth Method', oauthAuthMethodCertificate: 'Certificate',
  oauthAuthMethodSecret: 'Client Secret',
  oauthClientSecretLabel: 'Client Secret',
  oauthClientSecretConfigured: 'Configured',
  oauthClientSecretNotConfigured: 'Not configured',
  oauthClientIdInputLabel: 'OAuth Client ID',
  oauthTenantIdInputLabel: 'OAuth Tenant ID',
  oauthClientSecretInputLabel: 'OAuth Client Secret',
  oauthClientIdPlaceholder: 'Application (client) ID',
  oauthTenantIdPlaceholder: 'Directory (tenant) ID',
  oauthClientSecretPlaceholder: 'Leave empty to keep existing secret',
  oauthClientSecretHelp: 'Secret is encrypted.',
  oauthSaveButton: 'Save OAuth Configuration',
  certSectionTitle: 'Certificate Authentication',
  certSectionHelp: 'Use a self-signed X.509 certificate.',
  certNoCertificate: 'No certificate configured.',
  certGenerateButton: 'Generate Certificate',
  certGenerating: 'Generating...',
  certActiveTitle: 'Active Certificate',
  certThumbprintLabel: 'Thumbprint (SHA-256)',
  certThumbprintSha1Label: 'Thumbprint (SHA-1)',
  certCommonNameLabel: 'Common Name',
  certValidFromLabel: 'Valid From',
  certValidUntilLabel: 'Valid Until',
  certCreatedAtLabel: 'Created',
  certDownloadButton: 'Download Certificate (.pem)',
  certDeleteButton: 'Delete Certificate',
  graphRuntimeSectionTitle: 'Graph Runtime Configuration',
  graphWebhookEnabledLabel: 'Graph Webhook Enabled',
  graphWebhookEnabledHelp: 'Enable webhook.',
  graphWebhookClientStateLabel: 'Client State',
  graphWebhookClientStatePlaceholder: 'Shared secret',
  graphWebhookAllowedIpsLabel: 'Allowed IPs',
  graphWebhookAllowedIpsPlaceholder: 'Comma-separated',
  graphFetchTimeoutLabel: 'Fetch Timeout (ms)',
  graphFetchRetryAttemptsLabel: 'Retry Attempts',
  graphFetchRetryBaseLabel: 'Retry Base (ms)',
  graphRuntimeSaveButton: 'Save Graph Runtime Configuration',
};

const oauthBase = {
  isActive: true, oauthLocked: false, systemLocked: false, t: oauthT,
  currentOauthClientId: 'client-123', currentOauthAuthority: 'tenant-456',
  currentOauthHasClientSecret: true, oauthLastUpdated: '2024-01-01',
  oauthClientId: 'client-123', oauthAuthority: 'tenant-456', oauthClientSecret: '',
  oauthMessage: '', oauthMessageType: '',
  currentSystemGraphWebhookEnabled: false, currentSystemGraphWebhookClientState: '',
  currentSystemGraphWebhookAllowedIps: '',
  currentSystemGraphFetchTimeoutMs: 10000, currentSystemGraphFetchRetryAttempts: 3,
  currentSystemGraphFetchRetryBaseMs: 200,
  systemLastUpdated: '', systemGraphWebhookEnabled: false,
  systemGraphWebhookClientState: '', systemGraphWebhookAllowedIps: '',
  systemGraphFetchTimeoutMs: 10000, systemGraphFetchRetryAttempts: 3,
  systemGraphFetchRetryBaseMs: 200,
  graphRuntimeMessage: '', graphRuntimeMessageType: '',
  booleanLabel,
  onOAuthChange: vi.fn(), onOAuthSubmit: vi.fn(),
  onGraphRuntimeChange: vi.fn(), onGraphRuntimeSubmit: vi.fn(),
  certificateInfo: null, certificateLoading: false,
  certificateMessage: '', certificateMessageType: '',
  onGenerateCertificate: vi.fn(), onDownloadCertificate: vi.fn(), onDeleteCertificate: vi.fn(),
};

describe('OAuthTab extended', () => {
  it('renders current config with secret auth method', () => {
    render(<OAuthTab {...oauthBase} />);
    expect(screen.getByText('client-123')).toBeInTheDocument();
    expect(screen.getByText('tenant-456')).toBeInTheDocument();
    expect(screen.getAllByText('Client Secret').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Configured')).toBeInTheDocument();
  });

  it('shows Not configured when no client secret', () => {
    render(<OAuthTab {...oauthBase} currentOauthHasClientSecret={false} />);
    expect(screen.getByText('Not configured')).toBeInTheDocument();
  });

  it('shows Certificate auth method when certificate exists', () => {
    const certInfo = {
      thumbprintSHA256: 'abc123', thumbprintSHA1: 'def456',
      commonName: 'test-cert', notBefore: '2024-01-01', notAfter: '2025-01-01',
      createdAt: '2024-01-01T00:00:00Z'
    };
    render(<OAuthTab {...oauthBase} certificateInfo={certInfo} />);
    expect(screen.getByText('Certificate')).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('test-cert')).toBeInTheDocument();
  });

  it('calls onOAuthChange when client ID changes', () => {
    const handler = vi.fn();
    render(<OAuthTab {...oauthBase} onOAuthChange={handler} />);
    fireEvent.change(screen.getByLabelText('OAuth Client ID'), { target: { value: 'new-id' } });
    expect(handler).toHaveBeenCalledWith('oauthClientId', 'new-id');
  });

  it('calls onOAuthChange when tenant ID changes', () => {
    const handler = vi.fn();
    render(<OAuthTab {...oauthBase} onOAuthChange={handler} />);
    fireEvent.change(screen.getByLabelText('OAuth Tenant ID'), { target: { value: 'new-tenant' } });
    expect(handler).toHaveBeenCalledWith('oauthAuthority', 'new-tenant');
  });

  it('calls onOAuthChange when client secret changes', () => {
    const handler = vi.fn();
    render(<OAuthTab {...oauthBase} onOAuthChange={handler} />);
    fireEvent.change(screen.getByLabelText('OAuth Client Secret'), { target: { value: 'new-secret' } });
    expect(handler).toHaveBeenCalledWith('oauthClientSecret', 'new-secret');
  });

  it('disables OAuth submit when no changes', () => {
    render(<OAuthTab {...oauthBase} />);
    expect(screen.getByText('Save OAuth Configuration')).toBeDisabled();
  });

  it('enables OAuth submit when client ID changes', () => {
    render(<OAuthTab {...oauthBase} oauthClientId="new-id" />);
    expect(screen.getByText('Save OAuth Configuration')).not.toBeDisabled();
  });

  it('enables OAuth submit when secret is provided', () => {
    render(<OAuthTab {...oauthBase} oauthClientSecret="new-secret" />);
    expect(screen.getByText('Save OAuth Configuration')).not.toBeDisabled();
  });

  it('calls onOAuthSubmit when form is submitted', () => {
    const handler = vi.fn((e) => e.preventDefault());
    render(<OAuthTab {...oauthBase} oauthClientSecret="secret" onOAuthSubmit={handler} />);
    fireEvent.submit(screen.getByText('Save OAuth Configuration').closest('form'));
    expect(handler).toHaveBeenCalled();
  });

  it('displays OAuth message when provided', () => {
    render(<OAuthTab {...oauthBase} oauthMessage="OAuth saved!" oauthMessageType="success" />);
    expect(screen.getByText('OAuth saved!')).toBeInTheDocument();
  });

  it('calls onGenerateCertificate when generate button is clicked', () => {
    const handler = vi.fn();
    render(<OAuthTab {...oauthBase} onGenerateCertificate={handler} />);
    fireEvent.click(screen.getByText('Generate Certificate'));
    expect(handler).toHaveBeenCalled();
  });

  it('disables generate button when loading', () => {
    render(<OAuthTab {...oauthBase} certificateLoading={true} />);
    expect(screen.getByText('Generating...')).toBeDisabled();
  });

  it('shows no certificate message when no cert', () => {
    render(<OAuthTab {...oauthBase} />);
    expect(screen.getByText('No certificate configured.')).toBeInTheDocument();
  });

  it('calls onDownloadCertificate when download button is clicked', () => {
    const handler = vi.fn();
    const certInfo = { thumbprintSHA256: 'abc', commonName: 'test' };
    render(<OAuthTab {...oauthBase} certificateInfo={certInfo} onDownloadCertificate={handler} />);
    fireEvent.click(screen.getByText('Download Certificate (.pem)'));
    expect(handler).toHaveBeenCalled();
  });

  it('calls onDeleteCertificate when delete button is clicked', () => {
    const handler = vi.fn();
    const certInfo = { thumbprintSHA256: 'abc', commonName: 'test' };
    render(<OAuthTab {...oauthBase} certificateInfo={certInfo} onDeleteCertificate={handler} />);
    fireEvent.click(screen.getByText('Delete Certificate'));
    expect(handler).toHaveBeenCalled();
  });

  it('displays certificate message when provided', () => {
    render(<OAuthTab {...oauthBase} certificateMessage="Cert generated!" certificateMessageType="success" />);
    expect(screen.getByText('Cert generated!')).toBeInTheDocument();
  });

  it('renders Graph Runtime section when not system locked', () => {
    render(<OAuthTab {...oauthBase} />);
    expect(screen.getByText('Graph Runtime Configuration')).toBeInTheDocument();
  });

  it('calls onGraphRuntimeChange when webhook enabled is toggled', () => {
    const handler = vi.fn();
    render(<OAuthTab {...oauthBase} onGraphRuntimeChange={handler} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // Find the webhook enabled checkbox
    const webhookCheckbox = checkboxes.find(cb => cb.closest('.admin-form-group')?.textContent.includes('Graph Webhook Enabled'));
    if (webhookCheckbox) fireEvent.click(webhookCheckbox);
    expect(handler).toHaveBeenCalledWith('systemGraphWebhookEnabled', true);
  });

  it('calls onGraphRuntimeChange when client state changes', () => {
    const handler = vi.fn();
    render(<OAuthTab {...oauthBase} onGraphRuntimeChange={handler} />);
    fireEvent.change(screen.getByLabelText('Client State'), { target: { value: 'secret-state' } });
    expect(handler).toHaveBeenCalledWith('systemGraphWebhookClientState', 'secret-state');
  });

  it('calls onGraphRuntimeChange when allowed IPs changes', () => {
    const handler = vi.fn();
    render(<OAuthTab {...oauthBase} onGraphRuntimeChange={handler} />);
    fireEvent.change(screen.getByLabelText('Allowed IPs'), { target: { value: '10.0.0.1' } });
    expect(handler).toHaveBeenCalledWith('systemGraphWebhookAllowedIps', '10.0.0.1');
  });

  it('calls onGraphRuntimeChange when fetch timeout changes', () => {
    const handler = vi.fn();
    render(<OAuthTab {...oauthBase} onGraphRuntimeChange={handler} />);
    fireEvent.change(screen.getByLabelText('Fetch Timeout (ms)'), { target: { value: '15000' } });
    expect(handler).toHaveBeenCalledWith('systemGraphFetchTimeoutMs', '15000');
  });

  it('calls onGraphRuntimeChange when retry attempts changes', () => {
    const handler = vi.fn();
    render(<OAuthTab {...oauthBase} onGraphRuntimeChange={handler} />);
    fireEvent.change(screen.getByLabelText('Retry Attempts'), { target: { value: '5' } });
    expect(handler).toHaveBeenCalledWith('systemGraphFetchRetryAttempts', '5');
  });

  it('calls onGraphRuntimeChange when retry base changes', () => {
    const handler = vi.fn();
    render(<OAuthTab {...oauthBase} onGraphRuntimeChange={handler} />);
    fireEvent.change(screen.getByLabelText('Retry Base (ms)'), { target: { value: '500' } });
    expect(handler).toHaveBeenCalledWith('systemGraphFetchRetryBaseMs', '500');
  });

  it('disables graph runtime submit when no changes', () => {
    render(<OAuthTab {...oauthBase} />);
    expect(screen.getByText('Save Graph Runtime Configuration')).toBeDisabled();
  });

  it('enables graph runtime submit when webhook enabled changes', () => {
    render(<OAuthTab {...oauthBase} systemGraphWebhookEnabled={true} />);
    expect(screen.getByText('Save Graph Runtime Configuration')).not.toBeDisabled();
  });

  it('calls onGraphRuntimeSubmit when form is submitted', () => {
    const handler = vi.fn((e) => e.preventDefault());
    render(<OAuthTab {...oauthBase} systemGraphWebhookEnabled={true} onGraphRuntimeSubmit={handler} />);
    fireEvent.submit(screen.getByText('Save Graph Runtime Configuration').closest('form'));
    expect(handler).toHaveBeenCalled();
  });

  it('displays graph runtime message when provided', () => {
    render(<OAuthTab {...oauthBase} graphRuntimeMessage="Graph saved!" graphRuntimeMessageType="success" />);
    expect(screen.getByText('Graph saved!')).toBeInTheDocument();
  });

  it('shows locked message when oauthLocked', () => {
    render(<OAuthTab {...oauthBase} oauthLocked={true} />);
    expect(screen.getByText('Configured via env')).toBeInTheDocument();
  });

  it('shows locked message for graph runtime when systemLocked', () => {
    render(<OAuthTab {...oauthBase} systemLocked={true} />);
    expect(screen.getAllByText('Configured via env').length).toBeGreaterThanOrEqual(1);
  });

  it('renders graph runtime current config', () => {
    render(<OAuthTab {...oauthBase} currentSystemGraphFetchTimeoutMs={15000} />);
    expect(screen.getByText('15000')).toBeInTheDocument();
  });
});

// ─── BookingTab ──────────────────────────────────────────────────────────────

const bookingT = {
  bookingSectionTitle: 'Booking', currentConfigTitle: 'Current Config',
  lastUpdatedLabel: 'Last Updated:', configuredViaEnv: 'Configured via env',
  enableBookingLabel: 'Enable Booking', enableBookingHelp: 'Enable room booking.',
  enableExtendMeetingLabel: 'Extend Meeting', enableExtendMeetingHelp: 'Allow extending.',
  submitBookingButton: 'Save Booking',
};

const bookingBase = {
  isActive: true, bookingLocked: false, t: bookingT,
  bookingPermissionMissing: false,
  currentEnableBooking: true, currentEnableExtendMeeting: true,
  currentCheckInEnabled: false, currentCheckInRequiredForExternalMeetings: false,
  currentCheckInEarlyMinutes: 5, currentCheckInWindowMinutes: 10,
  currentCheckInAutoReleaseNoShow: false,
  bookingLastUpdated: '2024-01-01',
  currentRoomFeatureFlags: {}, currentRoomGroupFeatureFlags: {},
  enableBooking: true, enableExtendMeeting: true,
  checkInEnabled: false, checkInRequiredForExternalMeetings: false,
  checkInEarlyMinutes: 5, checkInWindowMinutes: 10, checkInAutoReleaseNoShow: false,
  roomFeatureFlags: {}, roomGroupFeatureFlags: {},
  availableRoomGroupOptions: [], newRoomGroupOverrideKey: '',
  roomGroupOverrideEntries: [],
  availableRoomOptions: [], newRoomOverrideKey: '',
  roomOverrideEntries: [],
  bookingMessage: '', bookingMessageType: '',
  booleanLabel, toOverrideState: (v) => v === true ? 'enabled' : v === false ? 'disabled' : 'inherit',
  onFieldChange: vi.fn(), onOverrideDraftChange: vi.fn(), onAddOverride: vi.fn(),
  onOverrideStateChange: vi.fn(), onRemoveOverride: vi.fn(), onSubmit: vi.fn(),
};

describe('BookingTab extended', () => {
  it('calls onFieldChange when enableBooking is toggled', () => {
    const handler = vi.fn();
    render(<BookingTab {...bookingBase} onFieldChange={handler} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable Booking' }));
    expect(handler).toHaveBeenCalledWith('enableBooking', false);
  });

  it('calls onFieldChange when enableExtendMeeting is toggled', () => {
    const handler = vi.fn();
    render(<BookingTab {...bookingBase} onFieldChange={handler} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Extend Meeting' }));
    expect(handler).toHaveBeenCalledWith('enableExtendMeeting', false);
  });

  it('calls onFieldChange when checkInEnabled is toggled', () => {
    const handler = vi.fn();
    render(<BookingTab {...bookingBase} onFieldChange={handler} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Check-in aktivieren' }));
    expect(handler).toHaveBeenCalledWith('checkInEnabled', true);
  });

  it('disables check-in sub-fields when checkIn is disabled', () => {
    render(<BookingTab {...bookingBase} checkInEnabled={false} />);
    const earlyInput = screen.getByLabelText('Check-in ab Minuten vor Start');
    expect(earlyInput).toBeDisabled();
  });

  it('enables check-in sub-fields when checkIn is enabled', () => {
    render(<BookingTab {...bookingBase} checkInEnabled={true} />);
    const earlyInput = screen.getByLabelText('Check-in ab Minuten vor Start');
    expect(earlyInput).not.toBeDisabled();
  });

  it('calls onFieldChange when checkInEarlyMinutes changes', () => {
    const handler = vi.fn();
    render(<BookingTab {...bookingBase} checkInEnabled={true} onFieldChange={handler} />);
    fireEvent.change(screen.getByLabelText('Check-in ab Minuten vor Start'), { target: { value: '10' } });
    expect(handler).toHaveBeenCalledWith('checkInEarlyMinutes', 10);
  });

  it('enforces minimum 0 for checkInEarlyMinutes', () => {
    const handler = vi.fn();
    render(<BookingTab {...bookingBase} checkInEnabled={true} onFieldChange={handler} />);
    fireEvent.change(screen.getByLabelText('Check-in ab Minuten vor Start'), { target: { value: '-5' } });
    expect(handler).toHaveBeenCalledWith('checkInEarlyMinutes', 0);
  });

  it('calls onFieldChange when checkInWindowMinutes changes', () => {
    const handler = vi.fn();
    render(<BookingTab {...bookingBase} checkInEnabled={true} onFieldChange={handler} />);
    fireEvent.change(screen.getByLabelText('Check-in-Fenster nach Start (Minuten)'), { target: { value: '15' } });
    expect(handler).toHaveBeenCalledWith('checkInWindowMinutes', 15);
  });

  it('enforces minimum 1 for checkInWindowMinutes', () => {
    const handler = vi.fn();
    render(<BookingTab {...bookingBase} checkInEnabled={true} onFieldChange={handler} />);
    fireEvent.change(screen.getByLabelText('Check-in-Fenster nach Start (Minuten)'), { target: { value: '0' } });
    expect(handler).toHaveBeenCalledWith('checkInWindowMinutes', 1);
  });

  it('calls onFieldChange when checkInAutoReleaseNoShow is toggled', () => {
    const handler = vi.fn();
    render(<BookingTab {...bookingBase} checkInEnabled={true} onFieldChange={handler} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'No-Show automatisch freigeben' }));
    expect(handler).toHaveBeenCalledWith('checkInAutoReleaseNoShow', true);
  });

  it('calls onFieldChange when checkInRequiredForExternalMeetings is toggled', () => {
    const handler = vi.fn();
    render(<BookingTab {...bookingBase} checkInEnabled={true} onFieldChange={handler} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Nur externe Meetings benötigen Check-in' }));
    expect(handler).toHaveBeenCalledWith('checkInRequiredForExternalMeetings', true);
  });

  it('disables submit when no changes', () => {
    render(<BookingTab {...bookingBase} />);
    expect(screen.getByText('Save Booking')).toBeDisabled();
  });

  it('enables submit when enableBooking changes', () => {
    render(<BookingTab {...bookingBase} enableBooking={false} />);
    expect(screen.getByText('Save Booking')).not.toBeDisabled();
  });

  it('enables submit when checkInEnabled changes', () => {
    render(<BookingTab {...bookingBase} checkInEnabled={true} />);
    expect(screen.getByText('Save Booking')).not.toBeDisabled();
  });

  it('enables submit when checkInEarlyMinutes changes', () => {
    render(<BookingTab {...bookingBase} checkInEarlyMinutes={10} />);
    expect(screen.getByText('Save Booking')).not.toBeDisabled();
  });

  it('enables submit when checkInWindowMinutes changes', () => {
    render(<BookingTab {...bookingBase} checkInWindowMinutes={20} />);
    expect(screen.getByText('Save Booking')).not.toBeDisabled();
  });

  it('enables submit when checkInAutoReleaseNoShow changes', () => {
    render(<BookingTab {...bookingBase} checkInAutoReleaseNoShow={true} />);
    expect(screen.getByText('Save Booking')).not.toBeDisabled();
  });

  it('disables submit when bookingPermissionMissing', () => {
    render(<BookingTab {...bookingBase} bookingPermissionMissing={true} />);
    expect(screen.getByText('Save Booking')).toBeDisabled();
  });

  it('renders room group override section with available options', () => {
    const options = [{ value: 'group-a', label: 'Group A' }];
    render(<BookingTab {...bookingBase} availableRoomGroupOptions={options} />);
    expect(screen.getByText('Group A')).toBeInTheDocument();
  });

  it('calls onOverrideDraftChange when group select changes', () => {
    const handler = vi.fn();
    const options = [{ value: 'group-a', label: 'Group A' }];
    render(<BookingTab {...bookingBase} availableRoomGroupOptions={options} onOverrideDraftChange={handler} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'group-a' } });
    expect(handler).toHaveBeenCalledWith('group', 'group-a');
  });

  it('calls onAddOverride when add button is clicked', () => {
    const handler = vi.fn();
    render(<BookingTab {...bookingBase} onAddOverride={handler} />);
    const addButtons = screen.getAllByText('Add');
    fireEvent.click(addButtons[0]);
    expect(handler).toHaveBeenCalledWith('group');
  });

  it('calls onRemoveOverride when remove button is clicked', () => {
    const handler = vi.fn();
    render(<BookingTab {...bookingBase}
      roomGroupOverrideEntries={[['group-a', { enableBooking: true }]]}
      onRemoveOverride={handler}
    />);
    fireEvent.click(screen.getByText('Remove'));
    expect(handler).toHaveBeenCalledWith('group', 'group-a');
  });

  it('calls onOverrideStateChange when override select changes', () => {
    const handler = vi.fn();
    render(<BookingTab {...bookingBase}
      roomGroupOverrideEntries={[['group-a', { enableBooking: true }]]}
      onOverrideStateChange={handler}
    />);
    const overrideSelects = screen.getAllByRole('combobox').filter(s => s.closest('.booking-override-grid'));
    fireEvent.change(overrideSelects[0], { target: { value: 'disabled' } });
    expect(handler).toHaveBeenCalledWith('group', 'group-a', 'enableBooking', 'disabled');
  });

  it('renders room override entries', () => {
    render(<BookingTab {...bookingBase}
      roomOverrideEntries={[['room@test.com', { enableBooking: false }]]}
    />);
    expect(screen.getByDisplayValue('room@test.com')).toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted', () => {
    const handler = vi.fn((e) => e.preventDefault());
    render(<BookingTab {...bookingBase} enableBooking={false} onSubmit={handler} />);
    fireEvent.submit(screen.getByText('Save Booking').closest('form'));
    expect(handler).toHaveBeenCalled();
  });

  it('shows no overrides message when entries are empty', () => {
    render(<BookingTab {...bookingBase} />);
    expect(screen.getByText('No room-group overrides configured.')).toBeInTheDocument();
    expect(screen.getByText('No room overrides configured.')).toBeInTheDocument();
  });

  it('renders current check-in config values', () => {
    render(<BookingTab {...bookingBase} currentCheckInEnabled={true} currentCheckInEarlyMinutes={10} />);
    // "10 min" appears in the config grid
    const configValues = screen.getAllByText(/10 min/);
    expect(configValues.length).toBeGreaterThanOrEqual(1);
  });

  it('shows permission status when permission is missing', () => {
    render(<BookingTab {...bookingBase} bookingPermissionMissing={true} />);
    expect(screen.getByText('Disabled (Permission Missing)')).toBeInTheDocument();
  });

  it('shows cannot enable message when permission is missing', () => {
    render(<BookingTab {...bookingBase} bookingPermissionMissing={true} />);
    expect(screen.getByText('Cannot enable: Calendars.ReadWrite permission is missing')).toBeInTheDocument();
  });

  it('enables submit when roomFeatureFlags change', () => {
    render(<BookingTab {...bookingBase} roomFeatureFlags={{ 'room@test.com': { enableBooking: true } }} />);
    expect(screen.getByText('Save Booking')).not.toBeDisabled();
  });

  it('enables submit when roomGroupFeatureFlags change', () => {
    render(<BookingTab {...bookingBase} roomGroupFeatureFlags={{ 'group-a': { enableBooking: true } }} />);
    expect(screen.getByText('Save Booking')).not.toBeDisabled();
  });
});
