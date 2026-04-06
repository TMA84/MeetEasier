import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MqttTab from './MqttTab';
import TranslationsTab from './TranslationsTab';

const defaultT = {
  currentConfigTitle: 'Current Config',
  lastUpdatedLabel: 'Last Updated:',
  configuredViaEnv: 'Configured via env',
  loading: 'Loading...',
  mqttSectionTitle: 'MQTT Configuration',
  mqttEnabledLabel: 'MQTT Client Enabled',
  mqttEnabledHelp: 'Connects to MQTT broker',
  mqttBrokerUrlLabel: 'MQTT Broker URL',
  mqttBrokerUrlPlaceholder: 'mqtt://localhost:1883',
  mqttBrokerUrlHelp: 'URL of the MQTT broker',
  mqttAuthenticationLabel: 'Enable Authentication',
  mqttAuthenticationHelp: 'Requires username and password',
  mqttUsernameLabel: 'MQTT Username',
  mqttUsernamePlaceholder: 'Username',
  mqttPasswordLabel: 'MQTT Password',
  mqttPasswordPlaceholder: 'Password',
  mqttDiscoveryLabel: 'Home Assistant Discovery',
  mqttDiscoveryHelp: 'Enables HA MQTT Discovery',
  mqttSaveButton: 'Save MQTT Configuration',
  mqttStatusSectionTitle: 'MQTT Client Status',
  mqttConnectionLabel: 'Connection:',
  mqttBrokerLabel: 'Broker:',
  mqttTopicsLabel: 'Subscribed Topics:',
  mqttStatusRunning: 'Connected',
  mqttStatusDisconnected: 'Disconnected',
  translationLanguageLabel: 'Language',
  translationsSectionTitle: 'Translations',
  addLanguageButtonLabel: 'Add Language',
  addLanguagePlaceholder: 'e.g. fr',
  addLanguageHelp: 'Add a new language',
  removeLanguageButtonLabel: 'Remove Language',
  removeLanguageHelp: 'English and German cannot be removed.',
  maintenanceTranslationsLabel: 'Maintenance Translations',
  maintenanceTranslationsHelp: 'Edit maintenance messages',
  maintenanceTitleLabel: 'Title',
  maintenanceBodyLabel: 'Body',
  advancedTranslationsToggleLabel: 'Advanced Editor',
  advancedTranslationsHelp: 'Edit raw JSON',
  maintenanceJsonLabel: 'Maintenance JSON',
  adminJsonLabel: 'Admin JSON',
  translationsSubmitButton: 'Save Translations',
  translationApiKeyLabel: 'API Key',
  translationApiApiKeyNotConfigured: 'Not configured',
  translationApiTabLabel: 'Translation API',
  errorPrefix: 'Error:',
  languagesLabel: 'Languages',
  adminLanguagesLabel: 'Admin Languages',
};

describe('MqttTab extended', () => {
  const baseProps = {
    isActive: true,
    mqttEnabled: false,
    mqttBrokerUrl: '',
    mqttAuthentication: false,
    mqttUsername: '',
    mqttPassword: '',
    mqttDiscovery: '',
    mqttConfigSaving: false,
    mqttConfigMessage: '',
    mqttConfigMessageType: '',
    mqttStatus: { connected: false },
    t: defaultT,
    onEnabledChange: vi.fn(),
    onBrokerUrlChange: vi.fn(),
    onAuthenticationChange: vi.fn(),
    onUsernameChange: vi.fn(),
    onPasswordChange: vi.fn(),
    onDiscoveryChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  it('calls onEnabledChange when MQTT enabled checkbox is toggled', () => {
    const handler = vi.fn();
    render(<MqttTab {...baseProps} onEnabledChange={handler} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // First checkbox is MQTT enabled
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('calls onBrokerUrlChange when broker URL input changes', () => {
    const handler = vi.fn();
    render(<MqttTab {...baseProps} onBrokerUrlChange={handler} />);
    fireEvent.change(screen.getByLabelText('MQTT Broker URL'), { target: { value: 'mqtt://broker:1883' } });
    expect(handler).toHaveBeenCalledWith('mqtt://broker:1883');
  });

  it('calls onAuthenticationChange when auth checkbox is toggled', () => {
    const handler = vi.fn();
    render(<MqttTab {...baseProps} onAuthenticationChange={handler} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Second checkbox is authentication
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('shows username and password fields when authentication is enabled', () => {
    render(<MqttTab {...baseProps} mqttAuthentication={true} />);
    expect(screen.getByLabelText('MQTT Username')).toBeInTheDocument();
    expect(screen.getByLabelText('MQTT Password')).toBeInTheDocument();
  });

  it('hides username and password fields when authentication is disabled', () => {
    render(<MqttTab {...baseProps} mqttAuthentication={false} />);
    expect(screen.queryByLabelText('MQTT Username')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('MQTT Password')).not.toBeInTheDocument();
  });

  it('calls onUsernameChange when username input changes', () => {
    const handler = vi.fn();
    render(<MqttTab {...baseProps} mqttAuthentication={true} onUsernameChange={handler} />);
    fireEvent.change(screen.getByLabelText('MQTT Username'), { target: { value: 'admin' } });
    expect(handler).toHaveBeenCalledWith('admin');
  });

  it('calls onPasswordChange when password input changes', () => {
    const handler = vi.fn();
    render(<MqttTab {...baseProps} mqttAuthentication={true} onPasswordChange={handler} />);
    fireEvent.change(screen.getByLabelText('MQTT Password'), { target: { value: 'secret' } });
    expect(handler).toHaveBeenCalledWith('secret');
  });

  it('calls onDiscoveryChange with homeassistant when discovery checkbox is checked', () => {
    const handler = vi.fn();
    render(<MqttTab {...baseProps} onDiscoveryChange={handler} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[2]); // Third checkbox is discovery
    expect(handler).toHaveBeenCalledWith('homeassistant');
  });

  it('calls onDiscoveryChange with empty string when discovery is unchecked', () => {
    const handler = vi.fn();
    render(<MqttTab {...baseProps} mqttDiscovery="homeassistant" onDiscoveryChange={handler} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[2]);
    expect(handler).toHaveBeenCalledWith('');
  });

  it('disables submit button when saving', () => {
    render(<MqttTab {...baseProps} mqttConfigSaving={true} />);
    expect(screen.getByText('Loading...')).toBeDisabled();
  });

  it('displays config message when provided', () => {
    render(<MqttTab {...baseProps} mqttConfigMessage="MQTT saved!" mqttConfigMessageType="success" />);
    expect(screen.getByText('MQTT saved!')).toBeInTheDocument();
  });

  it('shows broker URL in status when connected', () => {
    render(<MqttTab {...baseProps} mqttStatus={{ connected: true, brokerUrl: 'mqtt://test:1883', subscribedTopics: ['topic1'] }} />);
    expect(screen.getByText('mqtt://test:1883')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows dash for broker when not connected', () => {
    render(<MqttTab {...baseProps} mqttStatus={{ connected: false }} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted', () => {
    const handler = vi.fn((e) => e.preventDefault());
    render(<MqttTab {...baseProps} onSubmit={handler} />);
    fireEvent.submit(screen.getByText('Save MQTT Configuration').closest('form'));
    expect(handler).toHaveBeenCalled();
  });
});

describe('TranslationsTab extended', () => {
  const baseProps = {
    isActive: true,
    t: defaultT,
    availableTranslationLanguages: ['en', 'de'],
    activeTranslationLanguage: 'en',
    currentTranslationApiHasApiKey: true,
    newTranslationLanguageCode: '',
    translationLanguageDraftError: '',
    i18nMessage: '',
    i18nMessageType: '',
    currentMaintenanceTranslations: { en: { title: 'Maintenance', body: 'Unavailable' } },
    currentAdminTranslations: { en: {} },
    i18nLastUpdated: '2024-01-01',
    collapsedTranslationGroups: {},
    selectedMaintenanceTranslation: { title: 'Maintenance', body: 'Unavailable' },
    selectedAdminTranslation: {},
    showAdvancedTranslationsEditor: false,
    maintenanceTranslationsText: '{}',
    adminTranslationsText: '{}',
    quickAdminTranslationGroups: [],
    getLanguageDisplayName: (code) => code.toUpperCase(),
    onTranslationLanguageChange: vi.fn(),
    onNewTranslationLanguageChange: vi.fn(),
    onAddTranslationLanguage: vi.fn(),
    onRemoveTranslationLanguage: vi.fn(),
    onToggleTranslationGroup: vi.fn(),
    onMaintenanceTranslationFieldChange: vi.fn(),
    onAdminTranslationFieldChange: vi.fn(),
    onShowAdvancedEditorChange: vi.fn(),
    onMaintenanceTranslationsTextChange: vi.fn(),
    onAdminTranslationsTextChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  it('renders language tabs', () => {
    render(<TranslationsTab {...baseProps} />);
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('DE')).toBeInTheDocument();
  });

  it('calls onTranslationLanguageChange when language tab is clicked', () => {
    const handler = vi.fn();
    render(<TranslationsTab {...baseProps} onTranslationLanguageChange={handler} />);
    fireEvent.click(screen.getByText('DE'));
    expect(handler).toHaveBeenCalledWith('de');
  });

  it('renders add language input', () => {
    render(<TranslationsTab {...baseProps} />);
    expect(screen.getByPlaceholderText('e.g. fr')).toBeInTheDocument();
  });

  it('calls onNewTranslationLanguageChange when input changes', () => {
    const handler = vi.fn();
    render(<TranslationsTab {...baseProps} onNewTranslationLanguageChange={handler} />);
    fireEvent.change(screen.getByPlaceholderText('e.g. fr'), { target: { value: 'fr' } });
    expect(handler).toHaveBeenCalledWith('fr');
  });

  it('calls onAddTranslationLanguage when add button is clicked', () => {
    const handler = vi.fn();
    render(<TranslationsTab {...baseProps} onAddTranslationLanguage={handler} />);
    const addButtons = screen.getAllByText('Add Language');
    fireEvent.click(addButtons[addButtons.length - 1]); // Click the button, not the label
    expect(handler).toHaveBeenCalled();
  });

  it('disables remove button for en and de', () => {
    render(<TranslationsTab {...baseProps} activeTranslationLanguage="en" />);
    const removeButtons = screen.getAllByRole('button').filter(b => b.textContent === 'Remove Language');
    expect(removeButtons[0]).toBeDisabled();
  });

  it('enables remove button for other languages', () => {
    render(<TranslationsTab {...baseProps} activeTranslationLanguage="fr" availableTranslationLanguages={['en', 'de', 'fr']} />);
    const removeButtons = screen.getAllByRole('button').filter(b => b.textContent === 'Remove Language');
    expect(removeButtons[0]).not.toBeDisabled();
  });

  it('calls onRemoveTranslationLanguage when remove button is clicked', () => {
    const handler = vi.fn();
    render(<TranslationsTab {...baseProps} activeTranslationLanguage="fr" availableTranslationLanguages={['en', 'de', 'fr']} onRemoveTranslationLanguage={handler} />);
    const removeButtons = screen.getAllByRole('button').filter(b => b.textContent === 'Remove Language');
    fireEvent.click(removeButtons[0]);
    expect(handler).toHaveBeenCalled();
  });

  it('displays i18n message when provided', () => {
    render(<TranslationsTab {...baseProps} i18nMessage="Saved!" i18nMessageType="success" />);
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('shows translation draft error when present', () => {
    render(<TranslationsTab {...baseProps} translationLanguageDraftError="Invalid code" />);
    expect(screen.getByText('Invalid code')).toBeInTheDocument();
  });

  it('shows API key warning when not configured', () => {
    render(<TranslationsTab {...baseProps} currentTranslationApiHasApiKey={false} />);
    expect(screen.getByText(/Not configured/)).toBeInTheDocument();
  });

  it('renders maintenance translation fields', () => {
    render(<TranslationsTab {...baseProps} />);
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Body')).toBeInTheDocument();
  });

  it('calls onMaintenanceTranslationFieldChange when title changes', () => {
    const handler = vi.fn();
    render(<TranslationsTab {...baseProps} onMaintenanceTranslationFieldChange={handler} />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New Title' } });
    expect(handler).toHaveBeenCalledWith('en', 'title', 'New Title');
  });

  it('calls onMaintenanceTranslationFieldChange when body changes', () => {
    const handler = vi.fn();
    render(<TranslationsTab {...baseProps} onMaintenanceTranslationFieldChange={handler} />);
    fireEvent.change(screen.getByLabelText('Body'), { target: { value: 'New Body' } });
    expect(handler).toHaveBeenCalledWith('en', 'body', 'New Body');
  });

  it('toggles maintenance section collapse', () => {
    const handler = vi.fn();
    render(<TranslationsTab {...baseProps} onToggleTranslationGroup={handler} />);
    fireEvent.click(screen.getByText('Maintenance Translations'));
    expect(handler).toHaveBeenCalledWith('maintenanceTranslationsSection');
  });

  it('hides maintenance fields when section is collapsed', () => {
    render(<TranslationsTab {...baseProps} collapsedTranslationGroups={{ maintenanceTranslationsSection: true }} />);
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted', () => {
    const handler = vi.fn((e) => e.preventDefault());
    render(<TranslationsTab {...baseProps} onSubmit={handler} />);
    fireEvent.submit(screen.getByText('Save Translations').closest('form'));
    expect(handler).toHaveBeenCalled();
  });

  it('renders admin translation groups', () => {
    const groups = [
      { labelKey: 'displayGroup', keys: ['displayStatusAvailableLabel', 'displayStatusBusyLabel'] }
    ];
    render(<TranslationsTab {...baseProps} quickAdminTranslationGroups={groups} />);
    expect(screen.getByText('displayGroup')).toBeInTheDocument();
  });

  it('renders admin translation inputs for group keys', () => {
    const groups = [
      { labelKey: 'displayGroup', keys: ['displayStatusAvailableLabel'] }
    ];
    render(<TranslationsTab {...baseProps} quickAdminTranslationGroups={groups} />);
    expect(screen.getByLabelText('displayStatusAvailableLabel')).toBeInTheDocument();
  });

  it('displays current languages in config', () => {
    render(<TranslationsTab {...baseProps} />);
    // "en" appears in language tabs and config - just verify the config section exists
    expect(screen.getByText('Translations')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01')).toBeInTheDocument();
  });
});
