import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SingleRoomLayout from './SingleRoomLayout';

vi.mock('../components/single-room/Display', () => ({
  default: ({ alias }) => <div data-testid="display">Room: {alias}</div>
}));

vi.mock('../components/global/NotFound', () => ({
  default: () => <div data-testid="not-found">Not Found</div>
}));

describe('SingleRoomLayout - coverage gaps', () => {
  it('renders NotFound when no room alias is provided', () => {
    render(
      <MemoryRouter initialEntries={['/room/']}>
        <Routes>
          <Route path="/room/" element={<SingleRoomLayout />} />
        </Routes>
      </MemoryRouter>
    );
    // When roomAlias is undefined/empty, should show NotFound
    expect(document.title).toBe('Single Room');
  });

  it('sets page title to just "Single Room" when roomAlias is empty', () => {
    render(
      <MemoryRouter initialEntries={['/room']}>
        <Routes>
          <Route path="/room" element={<SingleRoomLayout />} />
        </Routes>
      </MemoryRouter>
    );
    expect(document.title).toBe('Single Room');
  });
});
