import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BackupTab from './BackupTab';

const t = {
  backupPayloadLabel: 'Backup Payload',
  backupExportButton: 'Export',
  backupImportButton: 'Import',
};

const baseProps = {
  isActive: true,
  backupPayloadText: '',
  backupMessage: '',
  backupMessageType: '',
  t,
  onPayloadChange: vi.fn(),
  onExport: vi.fn(),
  onImport: vi.fn(),
};

describe('BackupTab coverage', () => {
  it('renders textarea and buttons', () => {
    render(<BackupTab {...baseProps} />);
    expect(screen.getByLabelText('Backup Payload')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  it('calls onPayloadChange when textarea changes', () => {
    const onPayloadChange = vi.fn();
    render(<BackupTab {...baseProps} onPayloadChange={onPayloadChange} />);
    fireEvent.change(screen.getByLabelText('Backup Payload'), { target: { value: '{"test": true}' } });
    expect(onPayloadChange).toHaveBeenCalledWith('{"test": true}');
  });

  it('calls onExport when export button clicked', () => {
    const onExport = vi.fn();
    render(<BackupTab {...baseProps} onExport={onExport} />);
    fireEvent.click(screen.getByText('Export'));
    expect(onExport).toHaveBeenCalled();
  });

  it('calls onImport when import button clicked', () => {
    const onImport = vi.fn();
    render(<BackupTab {...baseProps} onImport={onImport} />);
    fireEvent.click(screen.getByText('Import'));
    expect(onImport).toHaveBeenCalled();
  });

  it('shows backup message when provided', () => {
    render(<BackupTab {...baseProps} backupMessage="Import successful!" backupMessageType="success" />);
    expect(screen.getByText('Import successful!')).toBeInTheDocument();
  });

  it('does not show message when empty', () => {
    const { container } = render(<BackupTab {...baseProps} />);
    expect(container.querySelector('.admin-message')).toBeNull();
  });

  it('displays existing payload text', () => {
    render(<BackupTab {...baseProps} backupPayloadText='{"wifi":{"ssid":"test"}}' />);
    expect(screen.getByDisplayValue('{"wifi":{"ssid":"test"}}'));
  });

  it('applies inactive class when not active', () => {
    const { container } = render(<BackupTab {...baseProps} isActive={false} />);
    expect(container.querySelector('.admin-tab-content.active')).toBeNull();
  });

  it('applies active class when active', () => {
    const { container } = render(<BackupTab {...baseProps} isActive={true} />);
    expect(container.querySelector('.admin-tab-content.active')).toBeInTheDocument();
  });
});
