import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import RoomFilter from './RoomFilter';

vi.mock('../../config/display-translations.js', () => ({
  getFlightboardDisplayTranslations: vi.fn(() => ({
    board: {},
    navbar: { title: 'Conference Rooms' },
    roomFilter: { filterTitle: '', filterAllTitle: 'All Conference Rooms', filterDefault: '' }
  }))
}));

describe('RoomFilter', () => {
  const mockRoomlists = [
    { alias: 'building-a', name: 'Building A', displayName: 'Building A' },
    { alias: 'building-b', name: 'Building B', displayName: 'Building B' }
  ];

  it('renders the current filter text', () => {
    render(
      <RoomFilter
        filter={vi.fn()}
        response={true}
        roomlists={mockRoomlists}
        currentFilter=""
      />
    );
    expect(screen.getByText(/All Conference Rooms/)).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(
      <RoomFilter
        filter={vi.fn()}
        response={true}
        roomlists={mockRoomlists}
        currentFilter=""
      />
    );
    fireEvent.click(screen.getByText(/All Conference Rooms/));
    expect(screen.getByText('Building A')).toBeInTheDocument();
    expect(screen.getByText('Building B')).toBeInTheDocument();
  });

  it('closes dropdown after selecting a filter', () => {
    const filterFn = vi.fn();
    render(
      <RoomFilter
        filter={filterFn}
        response={true}
        roomlists={mockRoomlists}
        currentFilter=""
      />
    );
    fireEvent.click(screen.getByText(/All Conference Rooms/));
    fireEvent.click(screen.getByText('Building A'));
    expect(filterFn).toHaveBeenCalledWith('roomlist-building-a');
  });

  it('selects "All Conference Rooms" option', () => {
    const filterFn = vi.fn();
    render(
      <RoomFilter
        filter={filterFn}
        response={true}
        roomlists={mockRoomlists}
        currentFilter="roomlist-building-a"
      />
    );
    fireEvent.click(screen.getByText('Building A'));
    // Click "All Conference Rooms" in dropdown
    fireEvent.click(screen.getAllByText('All Conference Rooms')[0]);
    expect(filterFn).toHaveBeenCalledWith('roomlist-all');
  });

  it('shows loading state when no response', () => {
    render(
      <RoomFilter
        filter={vi.fn()}
        response={false}
        roomlists={[]}
        currentFilter=""
      />
    );
    fireEvent.click(screen.getByText(/All Conference Rooms/));
    expect(screen.getByText('Loading ...')).toBeInTheDocument();
  });

  it('shows loading state when error is true', () => {
    render(
      <RoomFilter
        filter={vi.fn()}
        error={true}
        response={false}
        roomlists={[]}
        currentFilter=""
      />
    );
    fireEvent.click(screen.getByText(/All Conference Rooms/));
    expect(screen.getByText('Loading ...')).toBeInTheDocument();
  });

  it('updates selected filter display when currentFilter changes', () => {
    const { rerender } = render(
      <RoomFilter
        filter={vi.fn()}
        response={true}
        roomlists={mockRoomlists}
        currentFilter=""
      />
    );
    rerender(
      <RoomFilter
        filter={vi.fn()}
        response={true}
        roomlists={mockRoomlists}
        currentFilter="roomlist-building-b"
      />
    );
    expect(screen.getByText(/Building B/)).toBeInTheDocument();
  });

  it('shows "All Conference Rooms" for roomlist-all filter', () => {
    render(
      <RoomFilter
        filter={vi.fn()}
        response={true}
        roomlists={mockRoomlists}
        currentFilter="roomlist-all"
      />
    );
    expect(screen.getByText(/All Conference Rooms/)).toBeInTheDocument();
  });

  it('closes dropdown on outside click', () => {
    render(
      <RoomFilter
        filter={vi.fn()}
        response={true}
        roomlists={mockRoomlists}
        currentFilter=""
      />
    );
    // Open dropdown
    fireEvent.click(screen.getByText(/All Conference Rooms/));
    expect(screen.getByText('Building A')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Building A')).not.toBeInTheDocument();
  });

  it('toggles dropdown open and closed', () => {
    render(
      <RoomFilter
        filter={vi.fn()}
        response={true}
        roomlists={mockRoomlists}
        currentFilter=""
      />
    );
    const trigger = screen.getByText(/All Conference Rooms/);
    
    // Open
    fireEvent.click(trigger);
    expect(screen.getByText('Building A')).toBeInTheDocument();
    
    // Close
    fireEvent.click(trigger);
    expect(screen.queryByText('Building A')).not.toBeInTheDocument();
  });

  it('uses item name when displayName is not available', () => {
    const roomlists = [{ alias: 'floor-1', name: 'Floor 1' }];
    render(
      <RoomFilter
        filter={vi.fn()}
        response={true}
        roomlists={roomlists}
        currentFilter=""
      />
    );
    fireEvent.click(screen.getByText(/All Conference Rooms/));
    expect(screen.getByText('Floor 1')).toBeInTheDocument();
  });

  it('renders dropdown arrow', () => {
    render(
      <RoomFilter
        filter={vi.fn()}
        response={true}
        roomlists={mockRoomlists}
        currentFilter=""
      />
    );
    expect(screen.getByText('▼')).toBeInTheDocument();
  });
});
