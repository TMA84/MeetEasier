import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotFound from './NotFound';

describe('NotFound Component', () => {
  it('renders error container', () => {
    const { container } = render(<NotFound />);
    expect(container.querySelector('#error-text')).toBeInTheDocument();
  });

  it('renders error header', () => {
    const { container } = render(<NotFound />);
    expect(container.querySelector('#error-header')).toBeInTheDocument();
    expect(screen.getByText('Sorry :(')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<NotFound />);
    expect(screen.getByText(/Either there was an error in processing or this page does not exist/)).toBeInTheDocument();
  });
});
