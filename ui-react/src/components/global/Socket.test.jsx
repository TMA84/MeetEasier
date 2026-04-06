import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

// vi.mock is hoisted, so we use the __mocks__ directory mock
// but we need to add .close() to the mock socket
vi.mock('socket.io-client');

import Socket from './Socket';

describe('Socket', () => {
  let mockSocket;

  beforeEach(async () => {
    vi.clearAllMocks();
    const io = (await import('socket.io-client')).default;
    mockSocket = io.mockSocket;
    // Add close method that Socket.js uses
    mockSocket.close = vi.fn();
  });

  it('renders without crashing (returns null)', () => {
    const response = vi.fn();
    const { container } = render(<Socket response={response} />);
    expect(container.innerHTML).toBe('');
  });

  it('establishes socket connection on mount', async () => {
    const io = (await import('socket.io-client')).default;
    const response = vi.fn();
    render(<Socket response={response} />);
    expect(io).toHaveBeenCalled();
  });

  it('listens for updatedRooms event', () => {
    const response = vi.fn();
    render(<Socket response={response} />);
    expect(mockSocket.on).toHaveBeenCalledWith('updatedRooms', expect.any(Function));
  });

  it('calls response prop when updatedRooms fires', () => {
    const response = vi.fn();
    render(<Socket response={response} />);

    const onCall = mockSocket.on.mock.calls.find(c => c[0] === 'updatedRooms');
    expect(onCall).toBeDefined();
    const handler = onCall[1];
    const mockRooms = [{ name: 'Room 1' }];
    handler(mockRooms);

    expect(response).toHaveBeenCalledWith({
      response: true,
      rooms: mockRooms
    });
  });

  it('closes socket on unmount', () => {
    const response = vi.fn();
    const { unmount } = render(<Socket response={response} />);
    unmount();
    expect(mockSocket.close).toHaveBeenCalled();
  });
});
