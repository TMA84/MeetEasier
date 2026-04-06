import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PowerManagementModal from './PowerManagementModal';

const defaultProps = {
  show: true,
  clientId: 'display-1',
  mode: 'browser',
  mqttHostname: '',
  hasMqtt: false,
  scheduleEnabled: false,
  startTime: '20:00',
  endTime: '07:00',
  weekendMode: false,
  message: '',
  messageType: '',
  onClose: vi.fn(),
  onSave: vi.fn(),
  onModeChange: vi.fn(),
  onMqttHostnameChange: vi.fn(),
  onScheduleEnabledChange: vi.fn(),
  onStartTimeChange: vi.fn(),
  onEndTimeChange: vi.fn(),
  onWeekendModeChange: vi.fn(),
};

describe('PowerManagementModal', () => {
  it('returns null when show is false', () => {
    const { container } = render(<PowerManagementModal {...defaultProps} show={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders modal when show is true', () => {
    render(<PowerManagementModal {...defaultProps} />);
    expect(screen.getByText('Power Management Configuration')).toBeInTheDocument();
  });

  it('shows global title for __global__ clientId', () => {
    render(<PowerManagementModal {...defaultProps} clientId="__global__" />);
    expect(screen.getByText('Global Power Management Standard')).toBeInTheDocument();
  });

  it('renders browser and DPMS radio options', () => {
    render(<PowerManagementModal {...defaultProps} />);
    expect(screen.getByText('Browser (All devices)')).toBeInTheDocument();
    expect(screen.getByText('DPMS (Raspberry Pi only)')).toBeInTheDocument();
  });

  it('shows MQTT option when hasMqtt is true', () => {
    render(<PowerManagementModal {...defaultProps} hasMqtt={true} />);
    expect(screen.getByText(/MQTT \(Touchkio Displays\)/)).toBeInTheDocument();
  });

  it('hides MQTT option when hasMqtt is false and not global', () => {
    render(<PowerManagementModal {...defaultProps} hasMqtt={false} />);
    expect(screen.queryByText(/MQTT \(Touchkio Displays\)/)).not.toBeInTheDocument();
  });

  it('shows MQTT option for global config', () => {
    render(<PowerManagementModal {...defaultProps} clientId="__global__" />);
    expect(screen.getByText(/MQTT \(Touchkio Displays\)/)).toBeInTheDocument();
  });

  it('shows schedule fields when scheduleEnabled is true', () => {
    render(<PowerManagementModal {...defaultProps} scheduleEnabled={true} />);
    expect(screen.getByLabelText(/Start Time/)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Time/)).toBeInTheDocument();
    expect(screen.getByText('Weekend Mode')).toBeInTheDocument();
  });

  it('hides schedule fields when scheduleEnabled is false', () => {
    render(<PowerManagementModal {...defaultProps} scheduleEnabled={false} />);
    expect(screen.queryByLabelText(/Start Time/)).not.toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn();
    render(<PowerManagementModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSave when save is clicked', () => {
    const onSave = vi.fn();
    render(<PowerManagementModal {...defaultProps} onSave={onSave} />);
    fireEvent.click(screen.getByText('Save Configuration'));
    expect(onSave).toHaveBeenCalled();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<PowerManagementModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.querySelector('.admin-modal-overlay'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when modal body is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<PowerManagementModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.querySelector('.admin-modal'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onModeChange when radio is changed', () => {
    const onModeChange = vi.fn();
    render(<PowerManagementModal {...defaultProps} onModeChange={onModeChange} />);
    fireEvent.click(screen.getByText('DPMS (Raspberry Pi only)').closest('label').querySelector('input'));
    expect(onModeChange).toHaveBeenCalledWith('dpms');
  });

  it('shows message when provided', () => {
    render(<PowerManagementModal {...defaultProps} message="Saved!" messageType="success" />);
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('shows MQTT hostname field for non-global MQTT mode', () => {
    render(<PowerManagementModal {...defaultProps} mode="mqtt" hasMqtt={true} />);
    expect(screen.getByLabelText('Touchkio Device ID')).toBeInTheDocument();
  });

  it('shows global MQTT info message', () => {
    render(<PowerManagementModal {...defaultProps} clientId="__global__" mode="mqtt" />);
    expect(screen.getByText(/Global MQTT mode/)).toBeInTheDocument();
  });

  it('calls onScheduleEnabledChange when checkbox is toggled', () => {
    const onScheduleEnabledChange = vi.fn();
    render(<PowerManagementModal {...defaultProps} onScheduleEnabledChange={onScheduleEnabledChange} />);
    fireEvent.click(screen.getByText('Enable Schedule').closest('label').querySelector('input'));
    expect(onScheduleEnabledChange).toHaveBeenCalledWith(true);
  });
});
