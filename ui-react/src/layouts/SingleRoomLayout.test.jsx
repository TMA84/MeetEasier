import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';
import SingleRoomLayout from './SingleRoomLayout';

// Mock child components
vi.mock('../components/single-room/Display', () => ({
  default: ({ alias }) => <div data-testid="display">Room: {alias}</div>
}));

vi.mock('../components/global/NotFound', () => ({
  default: () => <div data-testid="not-found">Not Found</div>
}));

const renderWithRoute = (path) => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/room/:name" element={<SingleRoomLayout />} />
        <Route path="/room" element={<SingleRoomLayout />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('SingleRoomLayout', () => {
  it('renders Display component when room alias is provided', () => {
    renderWithRoute('/room/conference-a');
    expect(screen.getByTestId('display')).toBeInTheDocument();
    expect(screen.getByText('Room: conference-a')).toBeInTheDocument();
  });

  it('renders the single-room wrapper', () => {
    const { container } = renderWithRoute('/room/conference-a');
    expect(container.querySelector('#single-room__wrap')).toBeInTheDocument();
  });

  it('sets page title with capitalized room name', () => {
    renderWithRoute('/room/conference-a');
    expect(document.title).toContain('Conference-a');
    expect(document.title).toContain('Single Room');
  });

  it('passes room alias to Display component', () => {
    renderWithRoute('/room/meeting-room-1');
    expect(screen.getByText('Room: meeting-room-1')).toBeInTheDocument();
  });
});
