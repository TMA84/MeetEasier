// Manual mock for socket.io-client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
  connected: true,
  id: 'mock-socket-id'
};

const io = vi.fn(() => mockSocket);

// Attach mockSocket so tests can access it
io.mockSocket = mockSocket;

// Export as default
export default io;

// Also export as named export for compatibility
export { io };
