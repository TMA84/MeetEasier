import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AdminLockedMessage, AdminStatusMessage } from './admin-tab-helpers';

describe('AdminLockedMessage', () => {
  it('renders title and env message', () => {
    render(<AdminLockedMessage title="WiFi Config" envMessage="Configured via environment" />);
    expect(screen.getByText('WiFi Config')).toBeInTheDocument();
    expect(screen.getByText('Configured via environment')).toBeInTheDocument();
  });
});

describe('AdminStatusMessage', () => {
  it('renders message with correct CSS class', () => {
    render(<AdminStatusMessage message="Success!" messageType="success" />);
    const el = screen.getByText('Success!');
    expect(el).toBeInTheDocument();
    expect(el.className).toContain('admin-message-success');
  });

  it('returns null when message is empty', () => {
    const { container } = render(<AdminStatusMessage message="" messageType="error" />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when message is null', () => {
    const { container } = render(<AdminStatusMessage message={null} messageType="error" />);
    expect(container.innerHTML).toBe('');
  });
});
