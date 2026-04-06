import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ColorsTab from './ColorsTab';
import DisplayTab from './DisplayTab';

const booleanLabel = (v) => v ? 'Yes' : 'No';

// ─── ColorsTab ───────────────────────────────────────────────────────────────

const colorsT = {
  colorsSectionTitle: 'Colors', currentConfigTitle: 'Current Config',
  bookingButtonColorLabel: 'Button Color', statusAvailableColorLabel: 'Available',
  statusBusyColorLabel: 'Busy', statusUpcomingColorLabel: 'Upcoming',
  statusNotFoundColorLabel: 'Not Found', bookingButtonColorHelp: 'help',
  statusAvailableColorHelp: 'h', statusBusyColorHelp: 'h',
  statusUpcomingColorHelp: 'h', statusNotFoundColorHelp: 'h',
  resetToDefaultButton: 'Reset', submitColorsButton: 'Save Colors',
};

const colorsBase = {
  isActive: true, t: colorsT,
  currentBookingButtonColor: '#334155', currentStatusAvailableColor: '#22c55e',
  currentStatusBusyColor: '#ef4444', currentStatusUpcomingColor: '#f59e0b',
  currentStatusNotFoundColor: '#6b7280',
  bookingButtonColor: '#334155', statusAvailableColor: '#22c55e',
  statusBusyColor: '#ef4444', statusUpcomingColor: '#f59e0b',
  statusNotFoundColor: '#6b7280',
  colorMessage: '', colorMessageType: '',
  hexToHSL: () => ({ h: 0, s: 50, l: 50 }), hslToHex: (h, s, l) => `#${l}${l}${l}`,
  onColorChange: vi.fn(), onResetColor: vi.fn(), onSubmit: vi.fn(),
};

describe('ColorsTab extended', () => {
  it('renders all current config color values', () => {
    render(<ColorsTab {...colorsBase} />);
    expect(screen.getByText('#334155')).toBeInTheDocument();
    expect(screen.getByText('#22c55e')).toBeInTheDocument();
    expect(screen.getByText('#ef4444')).toBeInTheDocument();
  });

  it('calls onColorChange when color picker changes', () => {
    const handler = vi.fn();
    render(<ColorsTab {...colorsBase} onColorChange={handler} />);
    const colorInputs = screen.getAllByDisplayValue('#334155');
    fireEvent.change(colorInputs[0], { target: { value: '#ff0000' } });
    expect(handler).toHaveBeenCalledWith('bookingButtonColor', '#ff0000');
  });

  it('calls onColorChange when text input changes', () => {
    const handler = vi.fn();
    render(<ColorsTab {...colorsBase} onColorChange={handler} />);
    const textInputs = screen.getAllByDisplayValue('#334155');
    fireEvent.change(textInputs[1], { target: { value: '#aabbcc' } });
    expect(handler).toHaveBeenCalledWith('bookingButtonColor', '#aabbcc');
  });

  it('calls onResetColor when reset button is clicked', () => {
    const handler = vi.fn();
    render(<ColorsTab {...colorsBase} onResetColor={handler} />);
    const resetButtons = screen.getAllByText('Reset');
    fireEvent.click(resetButtons[0]);
    expect(handler).toHaveBeenCalledWith('bookingButtonColor', '#334155');
  });

  it('disables submit when no changes', () => {
    render(<ColorsTab {...colorsBase} />);
    expect(screen.getByText('Save Colors')).toBeDisabled();
  });

  it('enables submit when color changes', () => {
    render(<ColorsTab {...colorsBase} bookingButtonColor="#ff0000" />);
    expect(screen.getByText('Save Colors')).not.toBeDisabled();
  });

  it('calls onSubmit when form is submitted', () => {
    const handler = vi.fn((e) => e.preventDefault());
    render(<ColorsTab {...colorsBase} bookingButtonColor="#ff0000" onSubmit={handler} />);
    fireEvent.submit(screen.getByText('Save Colors').closest('form'));
    expect(handler).toHaveBeenCalled();
  });

  it('displays color message when provided', () => {
    render(<ColorsTab {...colorsBase} colorMessage="Colors saved!" colorMessageType="success" />);
    expect(screen.getByText('Colors saved!')).toBeInTheDocument();
  });

  it('renders palette buttons for status colors', () => {
    render(<ColorsTab {...colorsBase} />);
    // Each renderColorPicker generates 9 palette buttons, 4 status colors = 36 palette buttons
    const paletteButtons = screen.getAllByRole('button').filter(b => b.classList.contains('color-preset-button'));
    expect(paletteButtons.length).toBe(36);
  });

  it('calls onColorChange when palette button is clicked', () => {
    const handler = vi.fn();
    render(<ColorsTab {...colorsBase} onColorChange={handler} />);
    const paletteButtons = screen.getAllByRole('button').filter(b => b.classList.contains('color-preset-button'));
    fireEvent.click(paletteButtons[0]);
    expect(handler).toHaveBeenCalled();
  });

  it('marks selected palette button with checkmark', () => {
    // When the current color matches a palette color, it shows ✓
    // Use hslToHex that returns the exact statusAvailableColor for lightness step 45
    const hslToHex = (h, s, l) => l === 45 ? '#22c55e' : `#${String(l).padStart(6, '0')}`;
    render(<ColorsTab {...colorsBase} hslToHex={hslToHex} statusAvailableColor="#22c55e" />);
    // At least one palette button should contain ✓
    const allButtons = screen.getAllByRole('button');
    const checkmarkButtons = allButtons.filter(b => b.textContent === '✓');
    expect(checkmarkButtons.length).toBeGreaterThan(0);
  });

  it('hides content when not active', () => {
    const { container } = render(<ColorsTab {...colorsBase} isActive={false} />);
    expect(container.querySelector('.active')).not.toBeInTheDocument();
  });

  it('enables submit when statusAvailableColor changes', () => {
    render(<ColorsTab {...colorsBase} statusAvailableColor="#000000" />);
    expect(screen.getByText('Save Colors')).not.toBeDisabled();
  });

  it('enables submit when statusBusyColor changes', () => {
    render(<ColorsTab {...colorsBase} statusBusyColor="#000000" />);
    expect(screen.getByText('Save Colors')).not.toBeDisabled();
  });

  it('enables submit when statusUpcomingColor changes', () => {
    render(<ColorsTab {...colorsBase} statusUpcomingColor="#000000" />);
    expect(screen.getByText('Save Colors')).not.toBeDisabled();
  });

  it('enables submit when statusNotFoundColor changes', () => {
    render(<ColorsTab {...colorsBase} statusNotFoundColor="#000000" />);
    expect(screen.getByText('Save Colors')).not.toBeDisabled();
  });
});

// ─── DisplayTab ──────────────────────────────────────────────────────────────

const displayT = {
  sidebarSectionTitle: 'Display', currentConfigTitle: 'Current Config',
  lastUpdatedLabel: 'Last Updated:', configuredViaEnv: 'Configured via env',
  showWiFiLabel: 'Show WiFi', showUpcomingMeetingsLabel: 'Show Upcoming',
  showMeetingTitlesLabel: 'Show Titles', showMeetingTitlesHelp: 'help',
  upcomingMeetingsCountLabel: 'Count', upcomingMeetingsCountHelp: 'h',
  minimalHeaderStyleLabel: 'Style', minimalHeaderStyleFilled: 'Filled',
  minimalHeaderStyleTransparent: 'Transparent', minimalHeaderStyleHelp: 'h',
  minimalHeaderStyleDarkModeRequired: 'Dark mode required',
  submitSidebarButton: 'Save Display',
};

const displayBase = {
  isActive: true, informationLocked: false, t: displayT,
  currentShowWiFi: true, currentShowUpcomingMeetings: true,
  currentShowMeetingTitles: true, currentUpcomingMeetingsCount: 3,
  currentMinimalHeaderStyle: 'filled', currentSingleRoomDarkMode: false,
  currentFlightboardDarkMode: false, informationLastUpdated: '2024-01-01',
  sidebarTargetClientId: '', connectedClients: [], connectedClientsLoading: false,
  showWiFi: true, showUpcomingMeetings: true, showMeetingTitles: true,
  upcomingMeetingsCount: 3, minimalHeaderStyle: 'filled',
  singleRoomDarkMode: false, flightboardDarkMode: false,
  informationMessage: '', informationMessageType: '',
  booleanLabel, onTargetClientChange: vi.fn(), onFieldChange: vi.fn(), onSubmit: vi.fn(),
};

describe('DisplayTab extended', () => {
  it('renders current config values', () => {
    render(<DisplayTab {...displayBase} />);
    expect(screen.getByText('Filled')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01')).toBeInTheDocument();
  });

  it('calls onFieldChange when showWiFi checkbox is toggled', () => {
    const handler = vi.fn();
    render(<DisplayTab {...displayBase} onFieldChange={handler} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // showWiFi
    expect(handler).toHaveBeenCalledWith('showWiFi', false);
  });

  it('calls onFieldChange when showUpcomingMeetings is toggled', () => {
    const handler = vi.fn();
    render(<DisplayTab {...displayBase} onFieldChange={handler} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // showUpcomingMeetings
    expect(handler).toHaveBeenCalledWith('showUpcomingMeetings', false);
  });

  it('calls onFieldChange when showMeetingTitles is toggled', () => {
    const handler = vi.fn();
    render(<DisplayTab {...displayBase} onFieldChange={handler} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[2]); // showMeetingTitles
    expect(handler).toHaveBeenCalledWith('showMeetingTitles', false);
  });

  it('calls onFieldChange when upcomingMeetingsCount changes', () => {
    const handler = vi.fn();
    render(<DisplayTab {...displayBase} onFieldChange={handler} />);
    fireEvent.change(screen.getByLabelText('Count'), { target: { value: '5' } });
    expect(handler).toHaveBeenCalledWith('upcomingMeetingsCount', '5');
  });

  it('calls onFieldChange when singleRoomDarkMode is toggled', () => {
    const handler = vi.fn();
    render(<DisplayTab {...displayBase} onFieldChange={handler} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[3]); // singleRoomDarkMode
    expect(handler).toHaveBeenCalledWith('singleRoomDarkMode', true);
  });

  it('calls onFieldChange when flightboardDarkMode is toggled', () => {
    const handler = vi.fn();
    render(<DisplayTab {...displayBase} onFieldChange={handler} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[4]); // flightboardDarkMode
    expect(handler).toHaveBeenCalledWith('flightboardDarkMode', true);
  });

  it('shows header style radios when dark mode is on', () => {
    render(<DisplayTab {...displayBase} singleRoomDarkMode={true} />);
    expect(screen.getAllByText('Filled').length).toBeGreaterThanOrEqual(2); // config + radio label
    expect(screen.getAllByText('Transparent').length).toBeGreaterThanOrEqual(1);
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBe(2);
  });

  it('calls onFieldChange when header style radio changes', () => {
    const handler = vi.fn();
    render(<DisplayTab {...displayBase} singleRoomDarkMode={true} onFieldChange={handler} />);
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[1]); // transparent
    expect(handler).toHaveBeenCalledWith('minimalHeaderStyle', 'transparent');
  });

  it('shows dark mode required hint when dark mode is off', () => {
    render(<DisplayTab {...displayBase} singleRoomDarkMode={false} />);
    expect(screen.getByText('Dark mode required')).toBeInTheDocument();
  });

  it('hides header style radios when dark mode is off', () => {
    render(<DisplayTab {...displayBase} singleRoomDarkMode={false} />);
    expect(screen.queryAllByRole('radio').length).toBe(0);
  });

  it('disables submit when no changes', () => {
    render(<DisplayTab {...displayBase} />);
    expect(screen.getByText('Save Display')).toBeDisabled();
  });

  it('enables submit when showWiFi changes', () => {
    render(<DisplayTab {...displayBase} showWiFi={false} />);
    expect(screen.getByText('Save Display')).not.toBeDisabled();
  });

  it('enables submit when singleRoomDarkMode changes', () => {
    render(<DisplayTab {...displayBase} singleRoomDarkMode={true} />);
    expect(screen.getByText('Save Display')).not.toBeDisabled();
  });

  it('enables submit when flightboardDarkMode changes', () => {
    render(<DisplayTab {...displayBase} flightboardDarkMode={true} />);
    expect(screen.getByText('Save Display')).not.toBeDisabled();
  });

  it('displays information message when provided', () => {
    render(<DisplayTab {...displayBase} informationMessage="Saved!" informationMessageType="success" />);
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('renders locked message when informationLocked', () => {
    render(<DisplayTab {...displayBase} informationLocked={true} />);
    expect(screen.getByText('Configured via env')).toBeInTheDocument();
  });

  it('renders target client dropdown with connected clients', () => {
    const clients = [
      { clientId: 'client-1', displayType: 'single-room', roomAlias: 'Room A' },
      { clientId: 'client-2', displayType: 'flightboard', roomAlias: '' },
    ];
    render(<DisplayTab {...displayBase} connectedClients={clients} />);
    expect(screen.getByText('client-1 (single-room · Room A)')).toBeInTheDocument();
    expect(screen.getByText('client-2 (flightboard)')).toBeInTheDocument();
  });

  it('shows loading text when clients are loading', () => {
    render(<DisplayTab {...displayBase} connectedClientsLoading={true} />);
    expect(screen.getByText('Loading connected clients...')).toBeInTheDocument();
  });

  it('disables global fields when target client is selected', () => {
    render(<DisplayTab {...displayBase} sidebarTargetClientId="client-1" />);
    const checkboxes = screen.getAllByRole('checkbox');
    // showWiFi, showUpcomingMeetings, showMeetingTitles should be disabled
    expect(checkboxes[0]).toBeDisabled();
    expect(checkboxes[1]).toBeDisabled();
    expect(checkboxes[2]).toBeDisabled();
  });

  it('calls onTargetClientChange when dropdown changes', () => {
    const handler = vi.fn();
    render(<DisplayTab {...displayBase} onTargetClientChange={handler} />);
    fireEvent.change(screen.getByLabelText('Target Client'), { target: { value: 'client-1' } });
    expect(handler).toHaveBeenCalled();
  });

  it('calls onSubmit when form is submitted', () => {
    const handler = vi.fn((e) => e.preventDefault());
    render(<DisplayTab {...displayBase} showWiFi={false} onSubmit={handler} />);
    fireEvent.submit(screen.getByText('Save Display').closest('form'));
    expect(handler).toHaveBeenCalled();
  });
});
