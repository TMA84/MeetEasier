import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import RateLimitTab from './RateLimitTab';
import SearchTab from './SearchTab';
import MaintenanceTab from './MaintenanceTab';
import LogoTab from './LogoTab';

const defaultT = {
  currentConfigTitle: 'Current Config',
  lastUpdatedLabel: 'Last Updated:',
  configuredViaEnv: 'Configured via env',
  maintenanceEnabledLabel: 'Maintenance',
  maintenanceMessageLabel: 'Message',
  maintenanceSubmitButton: 'Save',
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
};

const booleanLabel = (v) => v ? 'Yes' : 'No';

describe('RateLimitTab extended', () => {
  const baseProps = {
    isActive: true,
    rateLimitLocked: false,
    t: defaultT,
    currentRateLimitApiWindowMs: 60000,
    currentRateLimitApiMax: 100,
    currentRateLimitWriteWindowMs: 60000,
    currentRateLimitWriteMax: 20,
    currentRateLimitAuthWindowMs: 60000,
    currentRateLimitAuthMax: 5,
    rateLimitLastUpdated: '2024-01-01',
    rateLimitApiWindowMs: 60000,
    rateLimitApiMax: 100,
    rateLimitWriteWindowMs: 60000,
    rateLimitWriteMax: 20,
    rateLimitAuthWindowMs: 60000,
    rateLimitAuthMax: 5,
    rateLimitMessage: '',
    rateLimitMessageType: '',
    onRateLimitChange: vi.fn(),
    onRateLimitSubmit: vi.fn(),
  };

  it('displays current config values', () => {
    render(<RateLimitTab {...baseProps} />);
    expect(screen.getByText('Rate Limit Configuration')).toBeInTheDocument();
  });

  it('calls onRateLimitChange when API window changes', () => {
    const handler = vi.fn();
    render(<RateLimitTab {...baseProps} onRateLimitChange={handler} />);
    fireEvent.change(screen.getByLabelText('API window (ms)'), { target: { value: '30000' } });
    expect(handler).toHaveBeenCalledWith('rateLimitApiWindowMs', 30000);
  });

  it('calls onRateLimitChange when API max changes', () => {
    const handler = vi.fn();
    render(<RateLimitTab {...baseProps} onRateLimitChange={handler} />);
    fireEvent.change(screen.getByLabelText('API max requests'), { target: { value: '200' } });
    expect(handler).toHaveBeenCalledWith('rateLimitApiMax', 200);
  });

  it('calls onRateLimitChange when Write window changes', () => {
    const handler = vi.fn();
    render(<RateLimitTab {...baseProps} onRateLimitChange={handler} />);
    fireEvent.change(screen.getByLabelText('Write window (ms)'), { target: { value: '30000' } });
    expect(handler).toHaveBeenCalledWith('rateLimitWriteWindowMs', 30000);
  });

  it('calls onRateLimitChange when Write max changes', () => {
    const handler = vi.fn();
    render(<RateLimitTab {...baseProps} onRateLimitChange={handler} />);
    fireEvent.change(screen.getByLabelText('Write max requests'), { target: { value: '50' } });
    expect(handler).toHaveBeenCalledWith('rateLimitWriteMax', 50);
  });

  it('calls onRateLimitChange when Auth window changes', () => {
    const handler = vi.fn();
    render(<RateLimitTab {...baseProps} onRateLimitChange={handler} />);
    fireEvent.change(screen.getByLabelText('Auth window (ms)'), { target: { value: '120000' } });
    expect(handler).toHaveBeenCalledWith('rateLimitAuthWindowMs', 120000);
  });

  it('calls onRateLimitChange when Auth max changes', () => {
    const handler = vi.fn();
    render(<RateLimitTab {...baseProps} onRateLimitChange={handler} />);
    fireEvent.change(screen.getByLabelText('Auth max requests'), { target: { value: '10' } });
    expect(handler).toHaveBeenCalledWith('rateLimitAuthMax', 10);
  });

  it('enforces minimum API window of 1000ms', () => {
    const handler = vi.fn();
    render(<RateLimitTab {...baseProps} onRateLimitChange={handler} />);
    fireEvent.change(screen.getByLabelText('API window (ms)'), { target: { value: '500' } });
    expect(handler).toHaveBeenCalledWith('rateLimitApiWindowMs', 1000);
  });

  it('enforces minimum API max of 1', () => {
    const handler = vi.fn();
    render(<RateLimitTab {...baseProps} onRateLimitChange={handler} />);
    fireEvent.change(screen.getByLabelText('API max requests'), { target: { value: '0' } });
    expect(handler).toHaveBeenCalledWith('rateLimitApiMax', 1);
  });

  it('disables submit when no changes', () => {
    render(<RateLimitTab {...baseProps} />);
    expect(screen.getByText('Save Rate Limit Configuration')).toBeDisabled();
  });

  it('enables submit when values differ', () => {
    render(<RateLimitTab {...baseProps} rateLimitApiMax={200} />);
    expect(screen.getByText('Save Rate Limit Configuration')).not.toBeDisabled();
  });

  it('calls onRateLimitSubmit when form is submitted', () => {
    const handler = vi.fn((e) => e.preventDefault());
    render(<RateLimitTab {...baseProps} rateLimitApiMax={200} onRateLimitSubmit={handler} />);
    fireEvent.submit(screen.getByText('Save Rate Limit Configuration').closest('form'));
    expect(handler).toHaveBeenCalled();
  });

  it('displays status message when provided', () => {
    render(<RateLimitTab {...baseProps} rateLimitMessage="Saved!" rateLimitMessageType="success" />);
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('renders locked message when locked', () => {
    render(<RateLimitTab {...baseProps} rateLimitLocked={true} />);
    expect(screen.getByText('Configured via env')).toBeInTheDocument();
  });
});

describe('SearchTab extended', () => {
  const baseProps = {
    isActive: true,
    searchLocked: false,
    t: defaultT,
    currentSearchUseGraphAPI: true,
    currentSearchMaxDays: 7,
    currentSearchMaxRoomLists: 10,
    currentSearchMaxRooms: 50,
    currentSearchMaxItems: 100,
    currentSearchPollIntervalMs: 30000,
    searchLastUpdated: '2024-01-01',
    searchUseGraphAPI: true,
    searchMaxDays: 7,
    searchMaxRoomLists: 10,
    searchMaxRooms: 50,
    searchMaxItems: 100,
    searchPollIntervalMs: 30000,
    searchMessage: '',
    searchMessageType: '',
    booleanLabel,
    onSearchChange: vi.fn(),
    onSearchSubmit: vi.fn(),
  };

  it('displays current config values', () => {
    render(<SearchTab {...baseProps} />);
    expect(screen.getByText('Search Configuration')).toBeInTheDocument();
  });

  it('calls onSearchChange when Graph API checkbox is toggled', () => {
    const handler = vi.fn();
    render(<SearchTab {...baseProps} onSearchChange={handler} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handler).toHaveBeenCalledWith('searchUseGraphAPI', false);
  });

  it('calls onSearchChange when max days changes', () => {
    const handler = vi.fn();
    render(<SearchTab {...baseProps} onSearchChange={handler} />);
    fireEvent.change(screen.getByLabelText('Max days'), { target: { value: '14' } });
    expect(handler).toHaveBeenCalledWith('searchMaxDays', 14);
  });

  it('calls onSearchChange when max room lists changes', () => {
    const handler = vi.fn();
    render(<SearchTab {...baseProps} onSearchChange={handler} />);
    fireEvent.change(screen.getByLabelText('Max room lists'), { target: { value: '20' } });
    expect(handler).toHaveBeenCalledWith('searchMaxRoomLists', 20);
  });

  it('calls onSearchChange when max rooms changes', () => {
    const handler = vi.fn();
    render(<SearchTab {...baseProps} onSearchChange={handler} />);
    fireEvent.change(screen.getByLabelText('Max rooms'), { target: { value: '100' } });
    expect(handler).toHaveBeenCalledWith('searchMaxRooms', 100);
  });

  it('calls onSearchChange when max items changes', () => {
    const handler = vi.fn();
    render(<SearchTab {...baseProps} onSearchChange={handler} />);
    fireEvent.change(screen.getByLabelText('Max items'), { target: { value: '200' } });
    expect(handler).toHaveBeenCalledWith('searchMaxItems', 200);
  });

  it('calls onSearchChange when poll interval changes', () => {
    const handler = vi.fn();
    render(<SearchTab {...baseProps} onSearchChange={handler} />);
    fireEvent.change(screen.getByLabelText('Poll interval (ms)'), { target: { value: '60000' } });
    expect(handler).toHaveBeenCalledWith('searchPollIntervalMs', 60000);
  });

  it('enforces minimum poll interval of 5000ms', () => {
    const handler = vi.fn();
    render(<SearchTab {...baseProps} onSearchChange={handler} />);
    fireEvent.change(screen.getByLabelText('Poll interval (ms)'), { target: { value: '1000' } });
    expect(handler).toHaveBeenCalledWith('searchPollIntervalMs', 5000);
  });

  it('disables submit when no changes', () => {
    render(<SearchTab {...baseProps} />);
    expect(screen.getByText('Save Search Configuration')).toBeDisabled();
  });

  it('enables submit when values differ', () => {
    render(<SearchTab {...baseProps} searchMaxDays={14} />);
    expect(screen.getByText('Save Search Configuration')).not.toBeDisabled();
  });

  it('displays status message when provided', () => {
    render(<SearchTab {...baseProps} searchMessage="Saved!" searchMessageType="success" />);
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('renders locked message when locked', () => {
    render(<SearchTab {...baseProps} searchLocked={true} />);
    expect(screen.getByText('Configured via env')).toBeInTheDocument();
  });
});

describe('MaintenanceTab extended', () => {
  const baseProps = {
    isActive: true,
    maintenanceLocked: false,
    currentMaintenanceEnabled: false,
    currentMaintenanceMessage: 'System maintenance',
    maintenanceLastUpdated: '2024-01-01',
    maintenanceEnabled: false,
    maintenanceMessage: 'System maintenance',
    maintenanceMessageBanner: '',
    maintenanceMessageType: '',
    t: defaultT,
    booleanLabel,
    onEnabledChange: vi.fn(),
    onMessageChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  it('displays current maintenance message', () => {
    render(<MaintenanceTab {...baseProps} />);
    const elements = screen.getAllByText('System maintenance');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onEnabledChange when checkbox is toggled', () => {
    const handler = vi.fn();
    render(<MaintenanceTab {...baseProps} onEnabledChange={handler} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('calls onMessageChange when textarea changes', () => {
    const handler = vi.fn();
    render(<MaintenanceTab {...baseProps} onMessageChange={handler} />);
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'New message' } });
    expect(handler).toHaveBeenCalledWith('New message');
  });

  it('disables submit when no changes', () => {
    render(<MaintenanceTab {...baseProps} />);
    expect(screen.getByText('Save')).toBeDisabled();
  });

  it('enables submit when enabled changes', () => {
    render(<MaintenanceTab {...baseProps} maintenanceEnabled={true} />);
    expect(screen.getByText('Save')).not.toBeDisabled();
  });

  it('enables submit when message changes', () => {
    render(<MaintenanceTab {...baseProps} maintenanceMessage="New message" />);
    expect(screen.getByText('Save')).not.toBeDisabled();
  });

  it('calls onSubmit when form is submitted', () => {
    const handler = vi.fn((e) => e.preventDefault());
    render(<MaintenanceTab {...baseProps} maintenanceEnabled={true} onSubmit={handler} />);
    fireEvent.submit(screen.getByText('Save').closest('form'));
    expect(handler).toHaveBeenCalled();
  });

  it('displays banner message when provided', () => {
    render(<MaintenanceTab {...baseProps} maintenanceMessageBanner="Saved!" maintenanceMessageType="success" />);
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('shows dash when no current message', () => {
    render(<MaintenanceTab {...baseProps} currentMaintenanceMessage="" />);
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });
});

describe('LogoTab extended', () => {
  const baseProps = {
    isActive: true,
    logoLocked: false,
    t: defaultT,
    currentLogoDarkUrl: '/img/dark.png',
    currentLogoLightUrl: '/img/light.png',
    logoLastUpdated: '2024-01-01',
    uploadMode: 'url',
    logoDarkUrl: '',
    logoLightUrl: '',
    logoDarkFile: null,
    logoLightFile: null,
    logoMessage: '',
    logoMessageType: '',
    onUploadModeChange: vi.fn(),
    onFieldChange: vi.fn(),
    onFileChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  it('displays current logo URLs', () => {
    render(<LogoTab {...baseProps} />);
    expect(screen.getByText('/img/dark.png')).toBeInTheDocument();
    expect(screen.getByText('/img/light.png')).toBeInTheDocument();
  });

  it('renders URL mode inputs by default', () => {
    render(<LogoTab {...baseProps} />);
    expect(screen.getByLabelText('Dark Logo:')).toBeInTheDocument();
    expect(screen.getByLabelText('Light Logo:')).toBeInTheDocument();
  });

  it('calls onUploadModeChange when File button is clicked', () => {
    const handler = vi.fn();
    render(<LogoTab {...baseProps} onUploadModeChange={handler} />);
    fireEvent.click(screen.getByText('File'));
    expect(handler).toHaveBeenCalledWith('file');
  });

  it('calls onUploadModeChange when URL button is clicked', () => {
    const handler = vi.fn();
    render(<LogoTab {...baseProps} onUploadModeChange={handler} />);
    fireEvent.click(screen.getByText('URL'));
    expect(handler).toHaveBeenCalledWith('url');
  });

  it('calls onFieldChange when dark URL input changes', () => {
    const handler = vi.fn();
    render(<LogoTab {...baseProps} onFieldChange={handler} />);
    fireEvent.change(screen.getByLabelText('Dark Logo:'), { target: { value: '/new/dark.png' } });
    expect(handler).toHaveBeenCalledWith('logoDarkUrl', '/new/dark.png');
  });

  it('calls onFieldChange when light URL input changes', () => {
    const handler = vi.fn();
    render(<LogoTab {...baseProps} onFieldChange={handler} />);
    fireEvent.change(screen.getByLabelText('Light Logo:'), { target: { value: '/new/light.png' } });
    expect(handler).toHaveBeenCalledWith('logoLightUrl', '/new/light.png');
  });

  it('renders file inputs in file mode', () => {
    render(<LogoTab {...baseProps} uploadMode="file" />);
    expect(screen.getByLabelText('Upload Dark:')).toBeInTheDocument();
    expect(screen.getByLabelText('Upload Light:')).toBeInTheDocument();
  });

  it('shows file preview when file is selected', () => {
    const mockFile = { name: 'logo.png', size: 2048 };
    render(<LogoTab {...baseProps} uploadMode="file" logoDarkFile={mockFile} />);
    expect(screen.getByText(/logo\.png/)).toBeInTheDocument();
    expect(screen.getByText(/2\.00 KB/)).toBeInTheDocument();
  });

  it('disables submit in URL mode when URLs match current', () => {
    render(<LogoTab {...baseProps} logoDarkUrl="/img/dark.png" logoLightUrl="/img/light.png" />);
    expect(screen.getByText('Update Logo')).toBeDisabled();
  });

  it('enables submit in URL mode when URL changes', () => {
    render(<LogoTab {...baseProps} logoDarkUrl="/new/dark.png" />);
    expect(screen.getByText('Update Logo')).not.toBeDisabled();
  });

  it('disables submit in file mode when no files selected', () => {
    render(<LogoTab {...baseProps} uploadMode="file" />);
    expect(screen.getByText('Update Logo')).toBeDisabled();
  });

  it('enables submit in file mode when file is selected', () => {
    const mockFile = { name: 'logo.png', size: 2048 };
    render(<LogoTab {...baseProps} uploadMode="file" logoDarkFile={mockFile} />);
    expect(screen.getByText('Update Logo')).not.toBeDisabled();
  });

  it('displays logo message when provided', () => {
    render(<LogoTab {...baseProps} logoMessage="Logo updated!" logoMessageType="success" />);
    expect(screen.getByText('Logo updated!')).toBeInTheDocument();
  });

  it('renders locked message when locked', () => {
    render(<LogoTab {...baseProps} logoLocked={true} />);
    expect(screen.getByText('Configured via env')).toBeInTheDocument();
  });

  it('renders logo preview images', () => {
    render(<LogoTab {...baseProps} />);
    expect(screen.getByAltText('Dark Logo Preview')).toBeInTheDocument();
    expect(screen.getByAltText('Light Logo Preview')).toBeInTheDocument();
  });
});
