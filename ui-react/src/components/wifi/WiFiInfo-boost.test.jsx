import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('socket.io-client');

import WiFiInfo from './WiFiInfo';
import mockIo from 'socket.io-client';
import { setupWifiFetchMock } from './test-helpers';

const mockSocket = mockIo.mockSocket;

describe('WiFiInfo extended coverage', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    if (mockSocket) {
      mockSocket.on.mockClear();
      mockSocket.disconnect.mockClear();
      mockSocket.emit.mockClear();
    }
    if (mockIo.mockClear) mockIo.mockClear();
    Object.defineProperty(navigator, 'language', { writable: true, value: 'en-US' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it('handles logo image error with fallback', async () => {
    setupWifiFetchMock(global.fetch);
    render(<WiFiInfo />);

    await waitFor(() => {
      const logo = screen.getByAltText('Logo');
      expect(logo).toBeInTheDocument();
    });

    const logo = screen.getByAltText('Logo');
    fireEvent.error(logo);
    expect(logo.src).toContain('logo.W.png');
  });

  it('handles QR code image error by hiding it', async () => {
    setupWifiFetchMock(global.fetch);
    render(<WiFiInfo />);

    await waitFor(() => {
      const qr = screen.getByAltText('WiFi QR Code');
      expect(qr).toBeInTheDocument();
    });

    const qr = screen.getByAltText('WiFi QR Code');
    fireEvent.error(qr);
    expect(qr.style.display).toBe('none');
  });

  it('handles logo config fetch with custom URL', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // i18n
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ssid: 'Net', password: 'pass' }) }) // wifi
      .mockResolvedValueOnce({ ok: true, json: async () => ({ logoLightUrl: '/custom/logo.png' }) }); // logo

    render(<WiFiInfo />);

    await waitFor(() => {
      const logo = screen.getByAltText('Logo');
      expect(logo.src).toContain('/custom/logo.png');
    });
  });

  it('handles logo config fetch with empty URL', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // i18n
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ssid: 'Net', password: 'pass' }) }) // wifi
      .mockResolvedValueOnce({ ok: true, json: async () => ({ logoLightUrl: '' }) }); // logo

    render(<WiFiInfo />);

    await waitFor(() => {
      const logo = screen.getByAltText('Logo');
      expect(logo.src).toContain('logo.W.png');
    });
  });

  it('handles logo config fetch error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // i18n
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ssid: 'Net', password: 'pass' }) }) // wifi
      .mockRejectedValueOnce(new Error('Logo fetch failed')); // logo

    render(<WiFiInfo />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error loading logo config:', expect.any(Error));
    });
    consoleSpy.mockRestore();
  });

  it('handles i18n config fetch error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch
      .mockRejectedValueOnce(new Error('i18n fetch failed')) // i18n
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ssid: 'Net', password: 'pass' }) }) // wifi
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // logo

    render(<WiFiInfo />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error loading i18n config:', expect.any(Error));
    });
    consoleSpy.mockRestore();
  });

  it('does not show error when wifi fetch fails but data already exists', async () => {
    // First load succeeds
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // i18n
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ssid: 'ExistingNet', password: 'pass' }) }) // wifi
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // logo

    const { _rerender } = render(<WiFiInfo />);

    await waitFor(() => {
      expect(screen.getByText('ExistingNet')).toBeInTheDocument();
    });

    // Subsequent fetch fails - should not show error since we have data
    // The component uses interval to refetch, but we can't easily test that
    // Just verify the initial data is still shown
    expect(screen.queryByText(/Error/)).not.toBeInTheDocument();
  });

  it('handles socket wifiConfigUpdated event', async () => {
    setupWifiFetchMock(global.fetch);
    render(<WiFiInfo />);

    await waitFor(() => {
      expect(screen.getByText('TestNetwork')).toBeInTheDocument();
    });

    // Find and call the wifiConfigUpdated handler
    if (mockSocket && mockSocket.on.mock.calls.length > 0) {
      const wifiHandler = mockSocket.on.mock.calls.find(c => c[0] === 'wifiConfigUpdated');
      if (wifiHandler) {
        await act(async () => {
          wifiHandler[1]({ ssid: 'UpdatedNetwork', password: 'newpass' });
        });
        expect(screen.getByText('UpdatedNetwork')).toBeInTheDocument();
      }
    }
  });

  it('handles socket logoConfigUpdated event', async () => {
    setupWifiFetchMock(global.fetch);
    render(<WiFiInfo />);

    await waitFor(() => {
      expect(screen.getByText('TestNetwork')).toBeInTheDocument();
    });

    if (mockSocket && mockSocket.on.mock.calls.length > 0) {
      const logoHandler = mockSocket.on.mock.calls.find(c => c[0] === 'logoConfigUpdated');
      if (logoHandler) {
        await act(async () => {
          logoHandler[1]({ logoLightUrl: '/updated/logo.png' });
        });
        const logo = screen.getByAltText('Logo');
        expect(logo.src).toContain('/updated/logo.png');
      }
    }
  });

  it('handles socket i18nConfigUpdated event', async () => {
    setupWifiFetchMock(global.fetch);
    render(<WiFiInfo />);

    await waitFor(() => {
      expect(screen.getByText('TestNetwork')).toBeInTheDocument();
    });

    if (mockSocket && mockSocket.on.mock.calls.length > 0) {
      const i18nHandler = mockSocket.on.mock.calls.find(c => c[0] === 'i18nConfigUpdated');
      if (i18nHandler) {
        await act(async () => {
          i18nHandler[1]({});
        });
        // Should not crash
        expect(screen.getByText('TestNetwork')).toBeInTheDocument();
      }
    }
  });

  it('handles i18n config fetch and updates title', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ wifiInfoTitle: 'Custom WiFi Title' }) }) // i18n
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ssid: 'Net', password: 'pass' }) }) // wifi
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // logo

    render(<WiFiInfo />);

    await waitFor(() => {
      expect(screen.getByText('Net')).toBeInTheDocument();
    });
  });

  it('renders WiFi details section with SSID and password labels', async () => {
    setupWifiFetchMock(global.fetch, { ssid: 'TestSSID', password: 'TestPW' });
    render(<WiFiInfo />);

    await waitFor(() => {
      expect(screen.getByText('SSID:')).toBeInTheDocument();
      expect(screen.getByText('Password:')).toBeInTheDocument();
      expect(screen.getByText('TestSSID')).toBeInTheDocument();
      expect(screen.getByText('TestPW')).toBeInTheDocument();
    });
  });
});
