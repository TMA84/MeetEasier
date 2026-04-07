import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LogoTab from './LogoTab';

const t = {
  logoSectionTitle: 'Logo Settings',
  currentConfigTitle: 'Current Config',
  logoDarkUrlLabel: 'Dark Logo URL',
  logoLightUrlLabel: 'Light Logo URL',
  lastUpdatedLabel: 'Last Updated',
  uploadModeUrl: 'URL Mode',
  uploadModeFile: 'File Upload',
  logoDarkFileLabel: 'Dark Logo File',
  logoLightFileLabel: 'Light Logo File',
  logoUrlPlaceholder: 'https://...',
  logoUrlHelp: 'Enter URL',
  logoFileHelp: 'Upload file',
  submitLogoButton: 'Save Logo',
  configuredViaEnv: 'Configured via environment',
};

const baseProps = {
  isActive: true,
  logoLocked: false,
  t,
  currentLogoDarkUrl: '/img/logo.B.png',
  currentLogoLightUrl: '/img/logo.W.png',
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

describe('LogoTab coverage', () => {
  it('renders URL mode by default', () => {
    render(<LogoTab {...baseProps} />);
    expect(screen.getByText('URL Mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Dark Logo URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Light Logo URL')).toBeInTheDocument();
  });

  it('renders file upload mode', () => {
    render(<LogoTab {...baseProps} uploadMode="file" />);
    expect(screen.getByLabelText('Dark Logo File')).toBeInTheDocument();
    expect(screen.getByLabelText('Light Logo File')).toBeInTheDocument();
  });

  it('switches to file mode when button clicked', () => {
    const onUploadModeChange = vi.fn();
    render(<LogoTab {...baseProps} onUploadModeChange={onUploadModeChange} />);
    fireEvent.click(screen.getByText('File Upload'));
    expect(onUploadModeChange).toHaveBeenCalledWith('file');
  });

  it('switches to URL mode when button clicked', () => {
    const onUploadModeChange = vi.fn();
    render(<LogoTab {...baseProps} uploadMode="file" onUploadModeChange={onUploadModeChange} />);
    fireEvent.click(screen.getByText('URL Mode'));
    expect(onUploadModeChange).toHaveBeenCalledWith('url');
  });

  it('calls onFieldChange when dark URL input changes', () => {
    const onFieldChange = vi.fn();
    render(<LogoTab {...baseProps} onFieldChange={onFieldChange} />);
    fireEvent.change(screen.getByLabelText('Dark Logo URL'), { target: { value: 'https://new.png' } });
    expect(onFieldChange).toHaveBeenCalledWith('logoDarkUrl', 'https://new.png');
  });

  it('calls onFieldChange when light URL input changes', () => {
    const onFieldChange = vi.fn();
    render(<LogoTab {...baseProps} onFieldChange={onFieldChange} />);
    fireEvent.change(screen.getByLabelText('Light Logo URL'), { target: { value: 'https://light.png' } });
    expect(onFieldChange).toHaveBeenCalledWith('logoLightUrl', 'https://light.png');
  });

  it('submit button disabled when URLs unchanged', () => {
    render(<LogoTab {...baseProps} logoDarkUrl="/img/logo.B.png" logoLightUrl="/img/logo.W.png" />);
    expect(screen.getByText('Save Logo')).toBeDisabled();
  });

  it('submit button enabled when URL changed', () => {
    render(<LogoTab {...baseProps} logoDarkUrl="https://new.png" />);
    expect(screen.getByText('Save Logo')).not.toBeDisabled();
  });

  it('submit button disabled in file mode when no files selected', () => {
    render(<LogoTab {...baseProps} uploadMode="file" />);
    expect(screen.getByText('Save Logo')).toBeDisabled();
  });

  it('submit button enabled in file mode when file selected', () => {
    const file = new File(['test'], 'logo.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 2048 });
    render(<LogoTab {...baseProps} uploadMode="file" logoDarkFile={file} />);
    expect(screen.getByText('Save Logo')).not.toBeDisabled();
  });

  it('shows file preview when dark file selected', () => {
    const file = new File(['test'], 'dark-logo.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 2048 });
    render(<LogoTab {...baseProps} uploadMode="file" logoDarkFile={file} />);
    expect(screen.getByText(/dark-logo\.png/)).toBeInTheDocument();
  });

  it('shows file preview when light file selected', () => {
    const file = new File(['test'], 'light-logo.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 4096 });
    render(<LogoTab {...baseProps} uploadMode="file" logoLightFile={file} />);
    expect(screen.getByText(/light-logo\.png/)).toBeInTheDocument();
  });

  it('calls onSubmit when form submitted', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<LogoTab {...baseProps} logoDarkUrl="https://new.png" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('Save Logo'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('shows logo message when provided', () => {
    render(<LogoTab {...baseProps} logoMessage="Logo saved!" logoMessageType="success" />);
    expect(screen.getByText('Logo saved!')).toBeInTheDocument();
  });

  it('renders locked state', () => {
    render(<LogoTab {...baseProps} logoLocked={true} />);
    expect(screen.getByText('Configured via environment')).toBeInTheDocument();
  });

  it('shows current config values', () => {
    render(<LogoTab {...baseProps} />);
    expect(screen.getByText('/img/logo.B.png')).toBeInTheDocument();
    expect(screen.getByText('/img/logo.W.png')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01')).toBeInTheDocument();
  });

  it('renders logo previews', () => {
    render(<LogoTab {...baseProps} />);
    const images = screen.getAllByRole('img');
    expect(images.length).toBe(2);
    expect(images[0]).toHaveAttribute('alt', 'Dark Logo Preview');
    expect(images[1]).toHaveAttribute('alt', 'Light Logo Preview');
  });

  it('handles image error by setting fallback src', () => {
    render(<LogoTab {...baseProps} />);
    const images = screen.getAllByRole('img');
    fireEvent.error(images[0]);
    expect(images[0].src).toContain('/img/logo.B.png');
    fireEvent.error(images[1]);
    expect(images[1].src).toContain('/img/logo.W.png');
  });

  it('calls onFileChange when file input changes', () => {
    const onFileChange = vi.fn();
    render(<LogoTab {...baseProps} uploadMode="file" onFileChange={onFileChange} />);
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(fileInputs[0], { target: { files: [file] } });
    expect(onFileChange).toHaveBeenCalledWith('logoDarkFile', file);
  });

  it('active mode button has active class', () => {
    render(<LogoTab {...baseProps} uploadMode="url" />);
    const urlBtn = screen.getByText('URL Mode');
    expect(urlBtn.className).toContain('active');
    const fileBtn = screen.getByText('File Upload');
    expect(fileBtn.className).not.toContain('active');
  });
});
