// Manual mock for socket.io-client
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  connected: true,
  id: 'mock-socket-id'
};

const io = jest.fn(() => mockSocket);

// Attach mockSocket so tests can access it
io.mockSocket = mockSocket;

// Export as default
export default io;

// Also export as named export for compatibility
export { io };

