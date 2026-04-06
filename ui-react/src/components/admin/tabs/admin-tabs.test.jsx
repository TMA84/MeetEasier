import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import BackupTab from './BackupTab';
import AuditTab from './AuditTab';
import MaintenanceTab from './MaintenanceTab';
import WiFiTab from './WiFiTab';
import SystemTab from './SystemTab';
import RateLimitTab from './RateLimitTab';
import SearchTab from './SearchTab';
import LogoTab from './LogoTab';
import MqttTab from './MqttTab';

const defaultT = {
  currentConfigTitle: 'Current Config',
  lastUpdatedLabel: 'Last Updated:',
  configuredViaEnv: 'Configured via env',
  wifiSectionTitle: 'WiFi',
  wifiSsidLabel: 'SSID:',
  wifiPasswordLabel: 'Password:',
  wifiSsidPlaceholder: 'Enter SSID',
  wifiPasswordPlaceholder: 'Enter password',
  submitWifiButton: 'Update WiFi',
  ssidLabel: 'SSID:',
  passwordLabel: 'Password:',
  maintenanceEnabledLabel: 'Maintenance',
  maintenanceMessageLabel: 'Message',
  maintenanceSubmitButton: 'Save',
  backupPayloadLabel: 'Backup JSON',
  backupExportButton: 'Export',
  backupImportButton: 'Import',
  auditSectionTitle: 'Audit Logs',
  auditLoadButton: 'Load',
  auditEmpty: 'No entries',
  logoSectionTitle: 'Logo',
  logoDarkUrlLabel: 'Dark Logo:',
  logoLightUrlLabel: 'Light Logo:',
  logoUrlPlaceholder: 'Enter URL',
  logoUrlHelp: 'Path to logo',
  logoDarkFileLabel: 'Upload Dark:',
  logoLightFileLabel: 'Upload Light:',
  logoFileHelp: 'Max 5MB',
  uploadModeUrl: 'URL',
  uploadModeFile: 'File',
  submitLogoButton: 'Update Logo',
  loading: 'Loading...',
};

const booleanLabel = (v) => v ? 'Yes' : 'No';

describe('BackupTab', () => {
  it('renders export and import buttons', () => {
    render(
      <BackupTab
        isActive={true}
        backupPayloadText=""
        backupMessage=""
        backupMessageType=""
        t={defaultT}
        onPayloadChange={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
      />
    );
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  it('calls onExport when export button is clicked', () => {
    const onExport = vi.fn();
    render(
      <BackupTab isActive={true} backupPayloadText="" backupMessage="" backupMessageType="" t={defaultT} onPayloadChange={vi.fn()} onExport={onExport} onImport={vi.fn()} />
    );
    fireEvent.click(screen.getByText('Export'));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('displays backup message when provided', () => {
    render(
      <BackupTab isActive={true} backupPayloadText="" backupMessage="Backup done" backupMessageType="success" t={defaultT} onPayloadChange={vi.fn()} onExport={vi.fn()} onImport={vi.fn()} />
    );
    expect(screen.getByText('Backup done')).toBeInTheDocument();
  });
});

describe('AuditTab', () => {
  it('renders load button and empty message', () => {
    render(
      <AuditTab isActive={true} auditLogs={[]} auditMessage="" auditMessageType="" t={defaultT} onLoadLogs={vi.fn()} />
    );
    expect(screen.getByText('Load')).toBeInTheDocument();
    expect(screen.getByText('No entries')).toBeInTheDocument();
  });

  it('calls onLoadLogs when button is clicked', () => {
    const onLoadLogs = vi.fn();
    render(
      <AuditTab isActive={true} auditLogs={[]} auditMessage="" auditMessageType="" t={defaultT} onLoadLogs={onLoadLogs} />
    );
    fireEvent.click(screen.getByText('Load'));
    expect(onLoadLogs).toHaveBeenCalledTimes(1);
  });

  it('renders audit logs as JSON when present', () => {
    const logs = [{ action: 'test', timestamp: '2024-01-01' }];
    render(
      <AuditTab isActive={true} auditLogs={logs} auditMessage="" auditMessageType="" t={defaultT} onLoadLogs={vi.fn()} />
    );
    expect(screen.getByText(/test/)).toBeInTheDocument();
  });
});

describe('MaintenanceTab', () => {
  it('renders form when not locked', () => {
    render(
      <MaintenanceTab
        isActive={true} maintenanceLocked={false}
        currentMaintenanceEnabled={false} currentMaintenanceMessage=""
        maintenanceLastUpdated="" maintenanceEnabled={false}
        maintenanceMessage="" maintenanceMessageBanner="" maintenanceMessageType=""
        t={defaultT} booleanLabel={booleanLabel}
        onEnabledChange={vi.fn()} onMessageChange={vi.fn()} onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders locked message when locked', () => {
    render(
      <MaintenanceTab
        isActive={true} maintenanceLocked={true}
        currentMaintenanceEnabled={false} currentMaintenanceMessage=""
        maintenanceLastUpdated="" maintenanceEnabled={false}
        maintenanceMessage="" maintenanceMessageBanner="" maintenanceMessageType=""
        t={defaultT} booleanLabel={booleanLabel}
        onEnabledChange={vi.fn()} onMessageChange={vi.fn()} onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText('Configured via env')).toBeInTheDocument();
  });
});

describe('WiFiTab', () => {
  it('renders WiFi form when not locked', () => {
    render(
      <WiFiTab
        isActive={true} wifiLocked={false}
        t={defaultT} currentSsid="TestNet" currentPassword="pass123"
        wifiLastUpdated="2024-01-01" ssid="" password=""
        wifiMessage="" wifiMessageType=""
        onFieldChange={vi.fn()} onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('TestNet')).toBeInTheDocument();
  });

  it('renders locked message when locked', () => {
    render(
      <WiFiTab
        isActive={true} wifiLocked={true}
        t={defaultT} currentSsid="" currentPassword=""
        wifiLastUpdated="" ssid="" password=""
        wifiMessage="" wifiMessageType=""
        onFieldChange={vi.fn()} onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText('Configured via env')).toBeInTheDocument();
  });
});

describe('SystemTab', () => {
  it('renders system config form when not locked', () => {
    render(
      <SystemTab
        isActive={true} systemLocked={false}
        currentSystemStartupValidationStrict={false}
        currentSystemExposeDetailedErrors={false}
        currentSystemHstsMaxAge={31536000}
        currentSystemRateLimitMaxBuckets={10000}
        currentSystemDisplayTrackingMode="client-id"
        currentSystemDisplayTrackingRetentionHours={24}
        currentSystemDisplayTrackingCleanupMinutes={5}
        systemLastUpdated="" systemStartupValidationStrict={false}
        systemExposeDetailedErrors={false} systemHstsMaxAge={31536000}
        systemRateLimitMaxBuckets={10000} demoMode={false} currentDemoMode={false}
        systemMessage="" systemMessageType=""
        t={defaultT} booleanLabel={booleanLabel}
        onStartupValidationChange={vi.fn()} onExposeErrorsChange={vi.fn()}
        onHstsMaxAgeChange={vi.fn()} onRateLimitMaxBucketsChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/HSTS Max Age/)).toBeInTheDocument();
  });

  it('renders locked message when locked', () => {
    render(
      <SystemTab
        isActive={true} systemLocked={true}
        currentSystemStartupValidationStrict={false}
        currentSystemExposeDetailedErrors={false}
        currentSystemHstsMaxAge={0} currentSystemRateLimitMaxBuckets={0}
        currentSystemDisplayTrackingMode="" currentSystemDisplayTrackingRetentionHours={0}
        currentSystemDisplayTrackingCleanupMinutes={0}
        systemLastUpdated="" systemStartupValidationStrict={false}
        systemExposeDetailedErrors={false} systemHstsMaxAge={0}
        systemRateLimitMaxBuckets={0} demoMode={false} currentDemoMode={false}
        systemMessage="" systemMessageType=""
        t={defaultT} booleanLabel={booleanLabel}
        onStartupValidationChange={vi.fn()} onExposeErrorsChange={vi.fn()}
        onHstsMaxAgeChange={vi.fn()} onRateLimitMaxBucketsChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText('Configured via env')).toBeInTheDocument();
  });
});

describe('RateLimitTab', () => {
  it('renders rate limit form when not locked', () => {
    render(
      <RateLimitTab
        isActive={true} rateLimitLocked={false} t={defaultT}
        currentRateLimitApiWindowMs={60000} currentRateLimitApiMax={100}
        currentRateLimitWriteWindowMs={60000} currentRateLimitWriteMax={20}
        currentRateLimitAuthWindowMs={60000} currentRateLimitAuthMax={5}
        rateLimitLastUpdated=""
        rateLimitApiWindowMs={60000} rateLimitApiMax={100}
        rateLimitWriteWindowMs={60000} rateLimitWriteMax={20}
        rateLimitAuthWindowMs={60000} rateLimitAuthMax={5}
        rateLimitMessage="" rateLimitMessageType=""
        onRateLimitChange={vi.fn()} onRateLimitSubmit={vi.fn()}
      />
    );
    expect(screen.getByLabelText('API window (ms)')).toBeInTheDocument();
    expect(screen.getByLabelText('API max requests')).toBeInTheDocument();
  });
});

describe('SearchTab', () => {
  it('renders search config form when not locked', () => {
    render(
      <SearchTab
        isActive={true} searchLocked={false} t={defaultT}
        currentSearchUseGraphAPI={true} currentSearchMaxDays={7}
        currentSearchMaxRoomLists={10} currentSearchMaxRooms={50}
        currentSearchMaxItems={100} currentSearchPollIntervalMs={30000}
        searchLastUpdated=""
        searchUseGraphAPI={true} searchMaxDays={7}
        searchMaxRoomLists={10} searchMaxRooms={50}
        searchMaxItems={100} searchPollIntervalMs={30000}
        searchMessage="" searchMessageType=""
        booleanLabel={booleanLabel}
        onSearchChange={vi.fn()} onSearchSubmit={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Max days')).toBeInTheDocument();
  });
});

describe('LogoTab', () => {
  it('renders logo form when not locked', () => {
    render(
      <LogoTab
        isActive={true} logoLocked={false} t={defaultT}
        currentLogoDarkUrl="/img/dark.png" currentLogoLightUrl="/img/light.png"
        logoLastUpdated="" uploadMode="url"
        logoDarkUrl="" logoLightUrl=""
        logoDarkFile={null} logoLightFile={null}
        logoMessage="" logoMessageType=""
        onUploadModeChange={vi.fn()} onFieldChange={vi.fn()}
        onFileChange={vi.fn()} onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText('Logo')).toBeInTheDocument();
    expect(screen.getByText('/img/dark.png')).toBeInTheDocument();
  });
});

describe('MqttTab', () => {
  it('renders MQTT form with status', () => {
    render(
      <MqttTab
        isActive={true} mqttEnabled={false}
        mqttBrokerUrl="" mqttAuthentication={false}
        mqttUsername="" mqttPassword="" mqttDiscovery=""
        mqttConfigSaving={false} mqttConfigMessage="" mqttConfigMessageType=""
        mqttStatus={{ connected: false }}
        t={defaultT}
        onEnabledChange={vi.fn()} onBrokerUrlChange={vi.fn()}
        onAuthenticationChange={vi.fn()} onUsernameChange={vi.fn()}
        onPasswordChange={vi.fn()} onDiscoveryChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText(/Disconnected/)).toBeInTheDocument();
  });

  it('shows connected status when MQTT is connected', () => {
    render(
      <MqttTab
        isActive={true} mqttEnabled={true}
        mqttBrokerUrl="mqtt://localhost:1883" mqttAuthentication={false}
        mqttUsername="" mqttPassword="" mqttDiscovery=""
        mqttConfigSaving={false} mqttConfigMessage="" mqttConfigMessageType=""
        mqttStatus={{ connected: true, brokerUrl: 'mqtt://localhost:1883', subscribedTopics: ['a'] }}
        t={defaultT}
        onEnabledChange={vi.fn()} onBrokerUrlChange={vi.fn()}
        onAuthenticationChange={vi.fn()} onUsernameChange={vi.fn()}
        onPasswordChange={vi.fn()} onDiscoveryChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText(/Connected/)).toBeInTheDocument();
  });
});


import ColorsTab from './ColorsTab';
import DisplayTab from './DisplayTab';
import OAuthTab from './OAuthTab';
import ApiTokenTab from './ApiTokenTab';
import TranslationApiTab from './TranslationApiTab';
import DevicesTab from './DevicesTab';
import BookingTab from './BookingTab';

describe('ColorsTab', () => {
  it('renders color configuration form', () => {
    render(
      <ColorsTab
        isActive={true} t={{ ...defaultT, colorsSectionTitle: 'Colors', bookingButtonColorLabel: 'Button Color', statusAvailableColorLabel: 'Available', statusBusyColorLabel: 'Busy', statusUpcomingColorLabel: 'Upcoming', statusNotFoundColorLabel: 'Not Found', bookingButtonColorHelp: 'help', statusAvailableColorHelp: 'h', statusBusyColorHelp: 'h', statusUpcomingColorHelp: 'h', statusNotFoundColorHelp: 'h', resetToDefaultButton: 'Reset', submitColorsButton: 'Save Colors' }}
        currentBookingButtonColor="#334155" currentStatusAvailableColor="#22c55e" currentStatusBusyColor="#ef4444" currentStatusUpcomingColor="#f59e0b" currentStatusNotFoundColor="#6b7280"
        bookingButtonColor="#334155" statusAvailableColor="#22c55e" statusBusyColor="#ef4444" statusUpcomingColor="#f59e0b" statusNotFoundColor="#6b7280"
        colorMessage="" colorMessageType=""
        hexToHSL={() => ({ h: 0, s: 50, l: 50 })} hslToHex={() => '#ff0000'}
        onColorChange={vi.fn()} onResetColor={vi.fn()} onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText('Colors')).toBeInTheDocument();
  });
});

describe('DisplayTab', () => {
  it('renders display settings form when not locked', () => {
    render(
      <DisplayTab
        isActive={true} informationLocked={false}
        t={{ ...defaultT, sidebarSectionTitle: 'Display', showWiFiLabel: 'Show WiFi', showUpcomingMeetingsLabel: 'Show Upcoming', showMeetingTitlesLabel: 'Show Titles', showMeetingTitlesHelp: 'help', upcomingMeetingsCountLabel: 'Count', upcomingMeetingsCountHelp: 'h', minimalHeaderStyleLabel: 'Style', minimalHeaderStyleFilled: 'Filled', minimalHeaderStyleTransparent: 'Transparent', minimalHeaderStyleHelp: 'h', minimalHeaderStyleDarkModeRequired: 'Dark mode required', submitSidebarButton: 'Save' }}
        currentShowWiFi={true} currentShowUpcomingMeetings={true} currentShowMeetingTitles={true} currentUpcomingMeetingsCount={3} currentMinimalHeaderStyle="filled" currentSingleRoomDarkMode={false} currentFlightboardDarkMode={false}
        informationLastUpdated="" sidebarTargetClientId="" connectedClients={[]} connectedClientsLoading={false}
        showWiFi={true} showUpcomingMeetings={true} showMeetingTitles={true} upcomingMeetingsCount={3} minimalHeaderStyle="filled" singleRoomDarkMode={false} flightboardDarkMode={false}
        informationMessage="" informationMessageType=""
        booleanLabel={booleanLabel} onTargetClientChange={vi.fn()} onFieldChange={vi.fn()} onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText('Display')).toBeInTheDocument();
  });
});

describe('OAuthTab', () => {
  it('renders OAuth form when not locked', () => {
    render(
      <OAuthTab
        isActive={true} oauthLocked={false} systemLocked={false} t={defaultT}
        currentOauthClientId="client-123" currentOauthAuthority="tenant-456" currentOauthHasClientSecret={true}
        oauthLastUpdated="" oauthClientId="client-123" oauthAuthority="tenant-456" oauthClientSecret=""
        oauthMessage="" oauthMessageType=""
        currentSystemGraphWebhookEnabled={false} currentSystemGraphWebhookClientState="" currentSystemGraphWebhookAllowedIps=""
        currentSystemGraphFetchTimeoutMs={10000} currentSystemGraphFetchRetryAttempts={3} currentSystemGraphFetchRetryBaseMs={200}
        systemLastUpdated="" systemGraphWebhookEnabled={false} systemGraphWebhookClientState="" systemGraphWebhookAllowedIps=""
        systemGraphFetchTimeoutMs={10000} systemGraphFetchRetryAttempts={3} systemGraphFetchRetryBaseMs={200}
        graphRuntimeMessage="" graphRuntimeMessageType="" booleanLabel={booleanLabel}
        onOAuthChange={vi.fn()} onOAuthSubmit={vi.fn()} onGraphRuntimeChange={vi.fn()} onGraphRuntimeSubmit={vi.fn()}
        certificateInfo={null} certificateLoading={false} certificateMessage="" certificateMessageType=""
        onGenerateCertificate={vi.fn()} onDownloadCertificate={vi.fn()} onDeleteCertificate={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/OAuth Client ID/)).toBeInTheDocument();
  });
});

describe('ApiTokenTab', () => {
  it('renders API token form when not locked', () => {
    render(
      <ApiTokenTab
        isActive={true} apiTokenLocked={false} wifiApiTokenLocked={false} t={defaultT}
        apiTokenSourceLabelMap={{ runtime: 'Runtime' }} currentApiTokenSource="runtime" currentApiTokenIsDefault={false}
        apiTokenConfigLastUpdated="" currentWifiApiTokenSource="" currentWifiApiTokenConfigured={false} wifiApiTokenConfigLastUpdated=""
        newApiToken="" newApiTokenConfirm="" newWifiApiToken="" newWifiApiTokenConfirm=""
        apiTokenConfigMessage="" apiTokenConfigMessageType="" wifiApiTokenConfigMessage="" wifiApiTokenConfigMessageType=""
        booleanLabel={booleanLabel} onApiTokenChange={vi.fn()} onApiTokenSubmit={vi.fn()} onWifiApiTokenChange={vi.fn()} onWifiApiTokenSubmit={vi.fn()}
      />
    );
    expect(screen.getAllByPlaceholderText(/At least 8 characters/).length).toBeGreaterThan(0);
  });
});

describe('TranslationApiTab', () => {
  it('renders translation API form when not locked', () => {
    render(
      <TranslationApiTab
        isActive={true} translationApiLocked={false}
        currentTranslationApiEnabled={false} currentTranslationApiUrl="" currentTranslationApiHasApiKey={false} currentTranslationApiTimeoutMs={5000}
        translationApiLastUpdated="" translationApiEnabled={false} translationApiUrl="" translationApiApiKey="" translationApiTimeoutMs={5000}
        translationApiMessage="" translationApiMessageType=""
        t={defaultT} booleanLabel={booleanLabel}
        onEnabledChange={vi.fn()} onUrlChange={vi.fn()} onApiKeyChange={vi.fn()} onTimeoutChange={vi.fn()} onSubmit={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/Translation API URL/)).toBeInTheDocument();
  });
});

describe('DevicesTab', () => {
  it('renders empty displays message', () => {
    render(
      <DevicesTab
        isActive={true} connectedDisplays={[]} connectedDisplaysLoading={false}
        connectedDisplaysMessage="" connectedDisplaysMessageType=""
        systemDisplayTrackingMode="client-id" currentSystemDisplayTrackingMode="client-id"
        systemDisplayTrackingRetentionHours={24} currentSystemDisplayTrackingRetentionHours={24}
        systemDisplayTrackingCleanupMinutes={5} currentSystemDisplayTrackingCleanupMinutes={5}
        systemDisplayIpWhitelistEnabled={false} currentSystemDisplayIpWhitelistEnabled={false}
        systemDisplayIpWhitelist="" currentSystemDisplayIpWhitelist=""
        systemTrustReverseProxy={false} currentSystemTrustReverseProxy={false}
        systemMessage="" systemMessageType="" t={defaultT}
        onLoadDisplays={vi.fn()} onOpenPowerManagement={vi.fn()} onOpenTouchkioModal={vi.fn()}
        onMqttRefresh={vi.fn()} onMqttRefreshAll={vi.fn()} onMqttRebootAll={vi.fn()}
        onDeleteDisplay={vi.fn()} onTrackingModeChange={vi.fn()} onRetentionHoursChange={vi.fn()}
        onCleanupMinutesChange={vi.fn()} onIpWhitelistEnabledChange={vi.fn()} onIpWhitelistChange={vi.fn()}
        onTrustReverseProxyChange={vi.fn()} onSaveSettings={vi.fn()}
      />
    );
    expect(screen.getByText(/No displays connected/)).toBeInTheDocument();
  });
});

describe('BookingTab', () => {
  it('renders booking form when not locked', () => {
    render(
      <BookingTab
        isActive={true} bookingLocked={false} t={{ ...defaultT, bookingSectionTitle: 'Booking', enableBookingLabel: 'Enable Booking', enableBookingHelp: 'h', enableExtendMeetingLabel: 'Extend', enableExtendMeetingHelp: 'h', submitBookingButton: 'Save Booking' }}
        bookingPermissionMissing={false}
        currentEnableBooking={true} currentEnableExtendMeeting={true}
        currentCheckInEnabled={false} currentCheckInRequiredForExternalMeetings={false}
        currentCheckInEarlyMinutes={5} currentCheckInWindowMinutes={10} currentCheckInAutoReleaseNoShow={false}
        bookingLastUpdated="" currentRoomFeatureFlags={{}} currentRoomGroupFeatureFlags={{}}
        enableBooking={true} enableExtendMeeting={true}
        checkInEnabled={false} checkInRequiredForExternalMeetings={false}
        checkInEarlyMinutes={5} checkInWindowMinutes={10} checkInAutoReleaseNoShow={false}
        roomFeatureFlags={{}} roomGroupFeatureFlags={{}}
        availableRoomGroupOptions={[]} newRoomGroupOverrideKey="" roomGroupOverrideEntries={[]}
        availableRoomOptions={[]} newRoomOverrideKey="" roomOverrideEntries={[]}
        bookingMessage="" bookingMessageType=""
        booleanLabel={booleanLabel} toOverrideState={() => 'inherit'}
        onFieldChange={vi.fn()} onOverrideDraftChange={vi.fn()} onAddOverride={vi.fn()}
        onOverrideStateChange={vi.fn()} onRemoveOverride={vi.fn()} onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText('Booking')).toBeInTheDocument();
  });

  const bookingProps = {
    isActive: true, bookingLocked: false,
    t: { ...defaultT, bookingSectionTitle: 'Booking', enableBookingLabel: 'Enable Booking', enableBookingHelp: 'h', enableExtendMeetingLabel: 'Extend', enableExtendMeetingHelp: 'h', submitBookingButton: 'Save Booking', configuredViaEnv: 'Configured via env' },
    bookingPermissionMissing: false,
    currentEnableBooking: true, currentEnableExtendMeeting: true,
    currentCheckInEnabled: false, currentCheckInRequiredForExternalMeetings: false,
    currentCheckInEarlyMinutes: 5, currentCheckInWindowMinutes: 10, currentCheckInAutoReleaseNoShow: false,
    bookingLastUpdated: '2024-01-01', currentRoomFeatureFlags: {}, currentRoomGroupFeatureFlags: {},
    enableBooking: true, enableExtendMeeting: true,
    checkInEnabled: false, checkInRequiredForExternalMeetings: false,
    checkInEarlyMinutes: 5, checkInWindowMinutes: 10, checkInAutoReleaseNoShow: false,
    roomFeatureFlags: {}, roomGroupFeatureFlags: {},
    availableRoomGroupOptions: [], newRoomGroupOverrideKey: '', roomGroupOverrideEntries: [],
    availableRoomOptions: [], newRoomOverrideKey: '', roomOverrideEntries: [],
    bookingMessage: '', bookingMessageType: '',
    booleanLabel, toOverrideState: () => 'inherit',
    onFieldChange: vi.fn(), onOverrideDraftChange: vi.fn(), onAddOverride: vi.fn(),
    onOverrideStateChange: vi.fn(), onRemoveOverride: vi.fn(), onSubmit: vi.fn(),
  };

  it('renders locked message when bookingLocked is true', () => {
    render(<BookingTab {...bookingProps} bookingLocked={true} />);
    expect(screen.getByText('Configured via env')).toBeInTheDocument();
  });

  it('shows permission missing warning', () => {
    render(<BookingTab {...bookingProps} bookingPermissionMissing={true} />);
    expect(screen.getByText(/Permission Missing:/)).toBeInTheDocument();
  });

  it('disables booking checkbox when permission is missing', () => {
    render(<BookingTab {...bookingProps} bookingPermissionMissing={true} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Enable Booking' });
    expect(checkbox).toBeDisabled();
  });

  it('renders check-in settings', () => {
    render(<BookingTab {...bookingProps} checkInEnabled={true} />);
    expect(screen.getByText('Check-in aktivieren')).toBeInTheDocument();
  });

  it('renders override entries when provided', () => {
    render(<BookingTab {...bookingProps} roomOverrideEntries={[['room@test.com', { enableBooking: true }]]} />);
    expect(screen.getByDisplayValue('room@test.com')).toBeInTheDocument();
  });

  it('renders booking message when present', () => {
    render(<BookingTab {...bookingProps} bookingMessage="Saved!" bookingMessageType="success" />);
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('renders override preview when feature flags exist', () => {
    render(<BookingTab {...bookingProps} currentRoomFeatureFlags={{ 'room@test.com': { enableBooking: true } }} />);
    expect(screen.getByText(/Override Preview/)).toBeInTheDocument();
  });
});
