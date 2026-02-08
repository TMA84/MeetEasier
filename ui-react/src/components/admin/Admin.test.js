import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Admin from './Admin';

describe('Admin Component', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    // Mock navigator.language
    Object.defineProperty(navigator, 'language', {
      writable: true,
      value: 'en-US'
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders admin panel title', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Admin Panel')).toBeInTheDocument();
      });
      
    });

    it('renders all configuration sections when not locked', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('WiFi Configuration')).toBeInTheDocument();
        expect(screen.getByText('Logo Configuration')).toBeInTheDocument();
        expect(screen.getByText('Information Configuration')).toBeInTheDocument();
      });
      
    });

    it('renders API token input field', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByLabelText(/API Token:/)).toBeInTheDocument();
      });
      
    });
  });

  describe('Config Locks', () => {
    it('displays locked message when WiFi is locked', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: true, logoLocked: false, sidebarLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText(/configured via environment variables/i)).toBeInTheDocument();
      });
      
    });

    it('hides WiFi form when locked', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: true, logoLocked: false, sidebarLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.queryByLabelText(/WiFi SSID:/)).not.toBeInTheDocument();
      });
      
    });

    it('displays locked message when logo is locked', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: true, sidebarLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        const lockedMessages = screen.getAllByText(/configured via environment variables/i);
        expect(lockedMessages.length).toBeGreaterThan(0);
      });
      
    });
  });

  describe('Current Configuration Display', () => {
    it('displays current WiFi configuration', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: 'TestNetwork', password: 'TestPass123' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('TestNetwork')).toBeInTheDocument();
        expect(screen.getByText('TestPass123')).toBeInTheDocument();
      });
      
    });

    it('displays current logo URLs', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '/img/dark.png', logoLightUrl: '/img/light.png' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('/img/dark.png')).toBeInTheDocument();
        expect(screen.getByText('/img/light.png')).toBeInTheDocument();
      });
      
    });

    it('displays current sidebar configuration', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: true }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        const yesTexts = screen.getAllByText('Yes');
        expect(yesTexts.length).toBeGreaterThan(0);
      });
      
    });
  });

  describe('WiFi Configuration Form', () => {
    it('allows entering WiFi SSID', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        const ssidInput = screen.getByLabelText(/WiFi SSID:/);
        fireEvent.change(ssidInput, { target: { value: 'NewNetwork' } });
        expect(ssidInput.value).toBe('NewNetwork');
      });
      
    });

    it('allows entering WiFi password', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/WiFi Password:/);
        fireEvent.change(passwordInput, { target: { value: 'NewPass123' } });
        expect(passwordInput.value).toBe('NewPass123');
      });
      
    });

    it('submits WiFi configuration successfully', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) })
        .mockResolvedValueOnce({ json: async () => ({ success: true }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: 'NewNetwork', password: 'NewPass123' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        const ssidInput = screen.getByLabelText(/WiFi SSID:/);
        fireEvent.change(ssidInput, { target: { value: 'NewNetwork' } });
      });

      const submitButton = screen.getByText('Update WiFi');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/WiFi configuration updated successfully/i)).toBeInTheDocument();
      });
      
    });

    it('handles WiFi submission error', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) })
        .mockResolvedValueOnce({ json: async () => ({ success: false, error: 'Invalid configuration' }) });

      render(<Admin />);

      await waitFor(() => {
        const ssidInput = screen.getByLabelText(/WiFi SSID:/);
        fireEvent.change(ssidInput, { target: { value: 'Test' } });
      });

      const submitButton = screen.getByText('Update WiFi');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Error: Invalid configuration/)).toBeInTheDocument();
      });
      
    });

    it('handles unauthorized WiFi submission', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) })
        .mockResolvedValueOnce({ status: 401, json: async () => ({}) });

      render(<Admin />);

      await waitFor(() => {
        const ssidInput = screen.getByLabelText(/WiFi SSID:/);
        fireEvent.change(ssidInput, { target: { value: 'Test' } });
      });

      const submitButton = screen.getByText('Update WiFi');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Unauthorized/i)).toBeInTheDocument();
      });
      
    });
  });

  describe('Logo Configuration Form', () => {
    it('toggles between URL and file upload modes', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        const fileButton = screen.getByText('Upload File');
        fireEvent.click(fileButton);
        expect(screen.getByLabelText(/Upload Dark Logo:/)).toBeInTheDocument();
      });
      
    });

    it('allows entering logo URLs in URL mode', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        const darkUrlInput = screen.getByLabelText(/Logo URL \(Dark\):/);
        fireEvent.change(darkUrlInput, { target: { value: '/img/new-dark.png' } });
        expect(darkUrlInput.value).toBe('/img/new-dark.png');
      });
      
    });

    it('submits logo configuration successfully', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) })
        .mockResolvedValueOnce({ json: async () => ({ success: true }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '/img/new.png', logoLightUrl: '/img/new.png' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        const darkUrlInput = screen.getByLabelText(/Logo URL \(Dark\):/);
        fireEvent.change(darkUrlInput, { target: { value: '/img/new.png' } });
      });

      const submitButton = screen.getByText('Update Logo');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Logo configuration updated successfully/i)).toBeInTheDocument();
      });
      
    });

    it('handles logo submission error', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) })
        .mockResolvedValueOnce({ json: async () => ({ success: false, error: 'Invalid URL' }) });

      render(<Admin />);

      await waitFor(() => {
        const darkUrlInput = screen.getByLabelText(/Logo URL \(Dark\):/);
        fireEvent.change(darkUrlInput, { target: { value: '/img/test.png' } });
      });

      const submitButton = screen.getByText('Update Logo');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Error: Invalid URL/)).toBeInTheDocument();
      });
      
    });
  });

  describe('Sidebar Configuration Form', () => {
    it('allows toggling WiFi display', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: false, showUpcomingMeetings: true, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        const wifiRadio = screen.getByLabelText(/Show WiFi Information/);
        fireEvent.click(wifiRadio);
        expect(wifiRadio.checked).toBe(true);
      });
      
    });

    it('allows toggling upcoming meetings display', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        const meetingsRadio = screen.getByLabelText(/Show Upcoming Meetings/);
        fireEvent.click(meetingsRadio);
        expect(meetingsRadio.checked).toBe(true);
      });
      
    });

    it('allows toggling meeting titles display', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        const titlesCheckbox = screen.getByLabelText(/Show Meeting Titles/);
        fireEvent.click(titlesCheckbox);
        expect(titlesCheckbox.checked).toBe(true);
      });
      
    });

    it('submits sidebar configuration successfully', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) })
        .mockResolvedValueOnce({ json: async () => ({ success: true }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: false, showUpcomingMeetings: true, showMeetingTitles: true }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        const meetingsRadio = screen.getByLabelText(/Show Upcoming Meetings/);
        fireEvent.click(meetingsRadio);
      });

      const submitButton = screen.getByText('Update Information');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Information configuration updated successfully/i)).toBeInTheDocument();
      });
      
    });
  });

  describe('API Token Handling', () => {
    it('allows entering API token', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        const tokenInput = screen.getByLabelText(/API Token:/);
        fireEvent.change(tokenInput, { target: { value: 'test-token-123' } });
        expect(tokenInput.value).toBe('test-token-123');
      });
      
    });

    it('includes API token in request headers', async () => {
      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) })
        .mockResolvedValueOnce({ json: async () => ({ success: true }) });

      render(<Admin />);

      await waitFor(() => {
        const tokenInput = screen.getByLabelText(/API Token:/);
        fireEvent.change(tokenInput, { target: { value: 'test-token' } });
        
        const ssidInput = screen.getByLabelText(/WiFi SSID:/);
        fireEvent.change(ssidInput, { target: { value: 'Test' } });
      });

      const submitButton = screen.getByText('Update WiFi');
      fireEvent.click(submitButton);

      await waitFor(() => {
        const lastCall = global.fetch.mock.calls[global.fetch.mock.calls.length - 1];
        expect(lastCall[1].headers.Authorization).toBe('Bearer test-token');
      });
      
    });
  });

  describe('Localization', () => {
    it('displays German translations when browser language is German', async () => {
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: 'de-DE'
      });

      global.fetch
        .mockResolvedValueOnce({ json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false }) })
        .mockResolvedValueOnce({ json: async () => ({ ssid: '', password: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) })
        .mockResolvedValueOnce({ json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false }) })
        .mockResolvedValueOnce({ json: async () => ({ enableBooking: true }) });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('WiFi Konfiguration')).toBeInTheDocument();
      });
      
    });
  });
});
