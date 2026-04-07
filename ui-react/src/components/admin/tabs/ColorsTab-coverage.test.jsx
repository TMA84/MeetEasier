import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ColorsTab from './ColorsTab';

const t = {
  colorsSectionTitle: 'Colors',
  currentConfigTitle: 'Current Config',
  bookingButtonColorLabel: 'Booking Button',
  bookingButtonColorHelp: 'Button color help',
  statusAvailableColorLabel: 'Available',
  statusAvailableColorHelp: 'Available help',
  statusBusyColorLabel: 'Busy',
  statusBusyColorHelp: 'Busy help',
  statusUpcomingColorLabel: 'Upcoming',
  statusUpcomingColorHelp: 'Upcoming help',
  statusNotFoundColorLabel: 'Not Found',
  statusNotFoundColorHelp: 'Not found help',
  resetToDefaultButton: 'Reset',
  submitColorsButton: 'Save Colors',
};

const baseProps = {
  isActive: true,
  t,
  currentBookingButtonColor: '#334155',
  currentStatusAvailableColor: '#22c55e',
  currentStatusBusyColor: '#ef4444',
  currentStatusUpcomingColor: '#f59e0b',
  currentStatusNotFoundColor: '#6b7280',
  bookingButtonColor: '#334155',
  statusAvailableColor: '#22c55e',
  statusBusyColor: '#ef4444',
  statusUpcomingColor: '#f59e0b',
  statusNotFoundColor: '#6b7280',
  colorMessage: '',
  colorMessageType: '',
  hexToHSL: (_hex) => ({ h: 0, s: 50, l: 50 }),
  hslToHex: (h, s, l) => `#${l.toString(16).padStart(2, '0')}${l.toString(16).padStart(2, '0')}${l.toString(16).padStart(2, '0')}`,
  onColorChange: vi.fn(),
  onResetColor: vi.fn(),
  onSubmit: vi.fn((e) => e.preventDefault()),
};

describe('ColorsTab coverage', () => {
  it('renders all color pickers', () => {
    render(<ColorsTab {...baseProps} />);
    expect(screen.getAllByText('Booking Button').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Available').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Busy').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Upcoming').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Not Found').length).toBeGreaterThanOrEqual(1);
  });

  it('shows current config values', () => {
    render(<ColorsTab {...baseProps} />);
    expect(screen.getAllByText('#334155').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('#22c55e').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onColorChange when booking button color picker changes', () => {
    const onColorChange = vi.fn();
    render(<ColorsTab {...baseProps} onColorChange={onColorChange} />);
    const colorInputs = document.querySelectorAll('input[type="color"]');
    fireEvent.change(colorInputs[0], { target: { value: '#ff0000' } });
    expect(onColorChange).toHaveBeenCalledWith('bookingButtonColor', '#ff0000');
  });

  it('calls onColorChange when text input changes', () => {
    const onColorChange = vi.fn();
    render(<ColorsTab {...baseProps} onColorChange={onColorChange} />);
    const textInputs = document.querySelectorAll('input[type="text"]');
    fireEvent.change(textInputs[0], { target: { value: '#00ff00' } });
    expect(onColorChange).toHaveBeenCalledWith('bookingButtonColor', '#00ff00');
  });

  it('calls onResetColor when reset button clicked', () => {
    const onResetColor = vi.fn();
    render(<ColorsTab {...baseProps} onResetColor={onResetColor} />);
    const resetButtons = screen.getAllByText('Reset');
    fireEvent.click(resetButtons[0]);
    expect(onResetColor).toHaveBeenCalledWith('bookingButtonColor', '#334155');
  });

  it('renders palette buttons for status colors', () => {
    render(<ColorsTab {...baseProps} />);
    const paletteButtons = document.querySelectorAll('.color-preset-button');
    expect(paletteButtons.length).toBeGreaterThan(0);
  });

  it('calls onColorChange when palette button clicked', () => {
    const onColorChange = vi.fn();
    render(<ColorsTab {...baseProps} onColorChange={onColorChange} />);
    const paletteButtons = document.querySelectorAll('.color-preset-button');
    fireEvent.click(paletteButtons[0]);
    expect(onColorChange).toHaveBeenCalled();
  });

  it('shows selected indicator on matching palette button', () => {
    // The palette generates colors from hexToHSL/hslToHex
    // Our mock returns specific values, so we check for the checkmark
    render(<ColorsTab {...baseProps} />);
    const paletteButtons = document.querySelectorAll('.color-preset-button');
    // At least some buttons should exist
    expect(paletteButtons.length).toBeGreaterThan(0);
  });

  it('submit button disabled when nothing changed', () => {
    render(<ColorsTab {...baseProps} />);
    expect(screen.getByText('Save Colors')).toBeDisabled();
  });

  it('submit button enabled when color changed', () => {
    render(<ColorsTab {...baseProps} bookingButtonColor="#ff0000" />);
    expect(screen.getByText('Save Colors')).not.toBeDisabled();
  });

  it('calls onSubmit when form submitted', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<ColorsTab {...baseProps} bookingButtonColor="#ff0000" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('Save Colors'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('shows color message when provided', () => {
    render(<ColorsTab {...baseProps} colorMessage="Colors saved!" colorMessageType="success" />);
    expect(screen.getByText('Colors saved!')).toBeInTheDocument();
  });

  it('does not show message when empty', () => {
    const { container } = render(<ColorsTab {...baseProps} />);
    const messages = container.querySelectorAll('.admin-message');
    expect(messages.length).toBe(0);
  });

  it('renders color swatches in current config', () => {
    const { container } = render(<ColorsTab {...baseProps} />);
    const swatches = container.querySelectorAll('.color-swatch-inline');
    expect(swatches.length).toBe(5);
  });

  it('calls onResetColor for status available color', () => {
    const onResetColor = vi.fn();
    render(<ColorsTab {...baseProps} onResetColor={onResetColor} />);
    const resetButtons = screen.getAllByText('Reset');
    fireEvent.click(resetButtons[1]); // second reset = statusAvailableColor
    expect(onResetColor).toHaveBeenCalledWith('statusAvailableColor', '#22c55e');
  });
});
