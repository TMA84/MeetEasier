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

const mockIo = jest.fn(() => mockSocket);
mockIo.mockSocket = mockSocket;

// Export as default
module.exports = mockIo;
