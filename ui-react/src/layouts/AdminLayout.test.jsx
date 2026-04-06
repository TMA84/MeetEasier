import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AdminLayout from './AdminLayout';

// Mock the Admin component since it's complex
vi.mock('../components/admin/Admin', () => ({
  default: () => <div data-testid="admin-panel">Admin Panel</div>
}));

describe('AdminLayout', () => {
  it('renders the Admin component', () => {
    render(<AdminLayout />);
    expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
  });

  it('renders Admin panel text', () => {
    render(<AdminLayout />);
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });
});
