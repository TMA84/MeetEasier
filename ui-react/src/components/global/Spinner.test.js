import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Spinner from './Spinner';

describe('Spinner Component', () => {
  it('renders spinner wrapper', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('#fb__spinner-wrap')).toBeInTheDocument();
  });

  it('renders spinner image', () => {
    const { container } = render(<Spinner />);
    const img = container.querySelector('#fb__spinner');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', 'Loading...');
  });

  it('has correct image source', () => {
    const { container } = render(<Spinner />);
    const img = container.querySelector('#fb__spinner');
    expect(img).toHaveAttribute('src', '/svgs/spinner.svg');
  });
});
