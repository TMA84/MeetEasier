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

const mockIo = vi.fn(() => mockSocket);
mockIo.mockSocket = mockSocket;

// Export as default
module.exports = mockIo;
