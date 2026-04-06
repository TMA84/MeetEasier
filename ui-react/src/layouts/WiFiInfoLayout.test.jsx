import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import WiFiInfoLayout from './WiFiInfoLayout';

// Mock WiFiInfo component
vi.mock('../components/wifi/WiFiInfo', () => ({
  default: () => <div data-testid="wifi-info">WiFi Info</div>
}));

describe('WiFiInfoLayout', () => {
  it('renders the WiFiInfo component', () => {
    render(<WiFiInfoLayout />);
    expect(screen.getByTestId('wifi-info')).toBeInTheDocument();
  });

  it('renders WiFi info text', () => {
    render(<WiFiInfoLayout />);
    expect(screen.getByText('WiFi Info')).toBeInTheDocument();
  });
});
