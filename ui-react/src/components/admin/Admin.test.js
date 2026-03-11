import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import Admin from './Admin';

describe('Admin Component', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    // Mock navigator.language
    Object.defineProperty(navigator, 'language', {
      writable: true,
      value: 'en-US'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

describe('Dark Mode and minimalHeaderStyle State Persistence', () => {
  // Helper to create comprehensive mocks for authenticated admin session
  const setupAuthenticatedMocks = (sidebarConfig = {}) => {
    const defaultSidebarConfig = {
      showWiFi: true,
      showUpcomingMeetings: false,
      showMeetingTitles: false,
      minimalHeaderStyle: 'filled',
      singleRoomDarkMode: false,
      ...sidebarConfig
    };

    return global.fetch = vi.fn()
      .mockResolvedValueOnce({ status: 200, ok: true }) // 1. verifyAdminSession
      .mockResolvedValueOnce({ ok: true, json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false, searchLocked: false, rateLimitLocked: false, apiTokenLocked: false, wifiApiTokenLocked: false, oauthLocked: false, systemLocked: false, maintenanceLocked: false, translationApiLocked: false }) }) // 2. config-locks
      .mockResolvedValueOnce({ ok: true, json: async () => ({ clients: [] }) }) // 3. connected-clients
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ssid: '', password: '' }) }) // 4. wifi
      .mockResolvedValueOnce({ ok: true, json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) }) // 5. logo
      .mockResolvedValueOnce({ ok: true, json: async () => defaultSidebarConfig }) // 6. sidebar
      .mockResolvedValueOnce({ ok: true, json: async () => ({ enableBooking: true, checkIn: {} }) }) // 7. booking-config
      .mockResolvedValueOnce({ ok: true, json: async () => ({ useGraphAPI: true }) }) // 8. search-config
      .mockResolvedValueOnce({ ok: true, json: async () => ({ apiWindowMs: 60000, apiMax: 300, writeWindowMs: 60000, writeMax: 60, authWindowMs: 60000, authMax: 30 }) }) // 9. rate-limit-config
      .mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: true, url: '', timeoutMs: 20000, hasApiKey: false }) }) // 10. translation-api-config
      .mockResolvedValueOnce({ ok: true, json: async () => ([]) }) // 11. roomlists
      .mockResolvedValueOnce({ ok: true, json: async () => ([]) }) // 12. rooms
      .mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: false, message: '' }) }) // 13. maintenance-status
      .mockResolvedValueOnce({ ok: true, json: async () => ({ startupValidationStrict: false, graphWebhookEnabled: false, graphWebhookClientState: '', graphWebhookAllowedIps: '', exposeDetailedErrors: false, graphFetchTimeoutMs: 10000, graphFetchRetryAttempts: 2, graphFetchRetryBaseMs: 250, hstsMaxAge: 31536000, rateLimitMaxBuckets: 10000 }) }) // 14. system-config
      .mockResolvedValueOnce({ ok: true, json: async () => ({ clientId: '', authority: '', hasClientSecret: false }) }) // 15. oauth-config
      .mockResolvedValueOnce({ ok: true, json: async () => ({ source: 'default', isDefault: true }) }) // 16. api-token-config
      .mockResolvedValueOnce({ ok: true, json: async () => ({ maintenanceMessages: {}, adminTranslations: {} }) }) // 17. i18n
      .mockResolvedValueOnce({ ok: true, json: async () => ({ bookingButtonColor: '#334155', statusAvailableColor: '#22c55e', statusBusyColor: '#ef4444', statusUpcomingColor: '#f59e0b', statusNotFoundColor: '#6b7280' }) }) // 18. colors
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // 19. sync-status
  };

  beforeEach(() => {
    // Mock navigator.language for German translations
    Object.defineProperty(navigator, 'language', {
      writable: true,
      value: 'de-DE'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves minimalHeaderStyle state when dark mode is toggled off and on', async () => {
      setupAuthenticatedMocks({
        minimalHeaderStyle: 'transparent',
        singleRoomDarkMode: true
      });

      render(<Admin />);

      // Wait for initial render with dark mode enabled
      await waitFor(() => {
        const transparentRadio = screen.getByLabelText(/Transparent/);
        expect(transparentRadio).toBeInTheDocument();
        expect(transparentRadio.checked).toBe(true);
      }, { timeout: 3000 });

      // Toggle dark mode off
      const darkModeCheckbox = screen.getByLabelText(/Single-Room Dark Mode/i);
      fireEvent.click(darkModeCheckbox);

      // Verify options are hidden
      await waitFor(() => {
        expect(screen.queryByLabelText(/Transparent/)).not.toBeInTheDocument();
        expect(screen.getByText(/Diese Optionen sind nur im Dark-Mode verfügbar/i)).toBeInTheDocument();
      });

      // Toggle dark mode back on
      fireEvent.click(darkModeCheckbox);

      // Verify minimalHeaderStyle is still 'transparent'
      await waitFor(() => {
        const transparentRadio = screen.getByLabelText(/Transparent/);
        expect(transparentRadio).toBeInTheDocument();
        expect(transparentRadio.checked).toBe(true);
      });
    });

    it('loads minimalHeaderStyle value correctly from server', async () => {
      setupAuthenticatedMocks({
        minimalHeaderStyle: 'filled',
        singleRoomDarkMode: true
      });

      render(<Admin />);

      // First wait for authentication to complete
      await waitFor(() => {
        expect(screen.queryByText('Login')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Then wait for the form to render
      await waitFor(() => {
        const filledRadio = screen.getByDisplayValue('filled');
        expect(filledRadio).toBeInTheDocument();
        expect(filledRadio).toBeChecked();
      }, { timeout: 3000 });
    });

    it('sends minimalHeaderStyle value correctly to server', async () => {
      setupAuthenticatedMocks({
        minimalHeaderStyle: 'filled',
        singleRoomDarkMode: true
      });

      // Add mocks for form submission
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }) // sidebar POST
        .mockResolvedValueOnce({ ok: true, json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false, searchLocked: false, rateLimitLocked: false, apiTokenLocked: false, wifiApiTokenLocked: false, oauthLocked: false, systemLocked: false, maintenanceLocked: false, translationApiLocked: false }) }) // config-locks reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ clients: [] }) }) // connected-clients reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ ssid: '', password: '' }) }) // wifi reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) }) // logo reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false, minimalHeaderStyle: 'transparent', singleRoomDarkMode: true }) }) // sidebar reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ enableBooking: true, checkIn: {} }) }) // booking-config reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ useGraphAPI: true }) }) // search-config reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ apiWindowMs: 60000, apiMax: 300, writeWindowMs: 60000, writeMax: 60, authWindowMs: 60000, authMax: 30 }) }) // rate-limit-config reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: true, url: '', timeoutMs: 20000, hasApiKey: false }) }) // translation-api-config reload
        .mockResolvedValueOnce({ ok: true, json: async () => ([]) }) // roomlists reload
        .mockResolvedValueOnce({ ok: true, json: async () => ([]) }) // rooms reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: false, message: '' }) }) // maintenance-status reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ startupValidationStrict: false, graphWebhookEnabled: false, graphWebhookClientState: '', graphWebhookAllowedIps: '', exposeDetailedErrors: false, graphFetchTimeoutMs: 10000, graphFetchRetryAttempts: 2, graphFetchRetryBaseMs: 250, hstsMaxAge: 31536000, rateLimitMaxBuckets: 10000 }) }) // system-config reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ clientId: '', authority: '', hasClientSecret: false }) }) // oauth-config reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ source: 'default', isDefault: true }) }) // api-token-config reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ maintenanceMessages: {}, adminTranslations: {} }) }) // i18n reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ bookingButtonColor: '#334155', statusAvailableColor: '#22c55e', statusBusyColor: '#ef4444', statusUpcomingColor: '#f59e0b', statusNotFoundColor: '#6b7280' }) }); // colors reload

      render(<Admin />);

      await waitFor(() => {
        const transparentRadio = screen.getByLabelText(/Transparent/);
        fireEvent.click(transparentRadio);
      });

      const submitButton = screen.getByText('Informationen aktualisieren');
      fireEvent.click(submitButton);

      await waitFor(() => {
        const lastCall = global.fetch.mock.calls.find(call => 
          call[0] === '/api/sidebar' && call[1]?.method === 'POST'
        );
        expect(lastCall).toBeDefined();
        const body = JSON.parse(lastCall[1].body);
        expect(body.minimalHeaderStyle).toBe('transparent');
      });
    });

    it('preserves minimalHeaderStyle when dark mode is disabled and form is submitted', async () => {
      setupAuthenticatedMocks({
        minimalHeaderStyle: 'transparent',
        singleRoomDarkMode: true
      });

      // Add mocks for form submission
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }) // sidebar POST
        .mockResolvedValueOnce({ ok: true, json: async () => ({ wifiLocked: false, logoLocked: false, sidebarLocked: false, bookingLocked: false, searchLocked: false, rateLimitLocked: false, apiTokenLocked: false, wifiApiTokenLocked: false, oauthLocked: false, systemLocked: false, maintenanceLocked: false, translationApiLocked: false }) }) // config-locks reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ clients: [] }) }) // connected-clients reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ ssid: '', password: '' }) }) // wifi reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) }) // logo reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: false, minimalHeaderStyle: 'transparent', singleRoomDarkMode: false }) }) // sidebar reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ enableBooking: true, checkIn: {} }) }) // booking-config reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ useGraphAPI: true }) }) // search-config reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ apiWindowMs: 60000, apiMax: 300, writeWindowMs: 60000, writeMax: 60, authWindowMs: 60000, authMax: 30 }) }) // rate-limit-config reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: true, url: '', timeoutMs: 20000, hasApiKey: false }) }) // translation-api-config reload
        .mockResolvedValueOnce({ ok: true, json: async () => ([]) }) // roomlists reload
        .mockResolvedValueOnce({ ok: true, json: async () => ([]) }) // rooms reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: false, message: '' }) }) // maintenance-status reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ startupValidationStrict: false, graphWebhookEnabled: false, graphWebhookClientState: '', graphWebhookAllowedIps: '', exposeDetailedErrors: false, graphFetchTimeoutMs: 10000, graphFetchRetryAttempts: 2, graphFetchRetryBaseMs: 250, hstsMaxAge: 31536000, rateLimitMaxBuckets: 10000 }) }) // system-config reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ clientId: '', authority: '', hasClientSecret: false }) }) // oauth-config reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ source: 'default', isDefault: true }) }) // api-token-config reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ maintenanceMessages: {}, adminTranslations: {} }) }) // i18n reload
        .mockResolvedValueOnce({ ok: true, json: async () => ({ bookingButtonColor: '#334155', statusAvailableColor: '#22c55e', statusBusyColor: '#ef4444', statusUpcomingColor: '#f59e0b', statusNotFoundColor: '#6b7280' }) }); // colors reload

      render(<Admin />);

      // Wait for initial render with dark mode enabled
      await waitFor(() => {
        const transparentRadio = screen.getByLabelText(/Transparent/);
        expect(transparentRadio.checked).toBe(true);
      });

      // Toggle dark mode off
      const darkModeCheckbox = screen.getByLabelText(/Single-Room Dark Mode/i);
      fireEvent.click(darkModeCheckbox);

      // Submit form with dark mode disabled
      const submitButton = screen.getByText('Informationen aktualisieren');
      fireEvent.click(submitButton);

      await waitFor(() => {
        const lastCall = global.fetch.mock.calls.find(call => 
          call[0] === '/api/sidebar' && call[1]?.method === 'POST'
        );
        expect(lastCall).toBeDefined();
        const body = JSON.parse(lastCall[1].body);
        // minimalHeaderStyle should still be sent even when dark mode is off
        expect(body.minimalHeaderStyle).toBe('transparent');
        expect(body.singleRoomDarkMode).toBe(false);
      });
    });

    it('displays informational message when dark mode is disabled', async () => {
      setupAuthenticatedMocks({
        minimalHeaderStyle: 'filled',
        singleRoomDarkMode: false
      });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText(/Diese Optionen sind nur im Dark-Mode verfügbar/i)).toBeInTheDocument();
      });
    });

    it('hides informational message when dark mode is enabled', async () => {
      setupAuthenticatedMocks({
        minimalHeaderStyle: 'filled',
        singleRoomDarkMode: true
      });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.queryByText(/Diese Optionen sind nur im Dark-Mode verfügbar/i)).not.toBeInTheDocument();
      });
    });

    it('shows minimalHeaderStyle options when dark mode is enabled', async () => {
      setupAuthenticatedMocks({
        minimalHeaderStyle: 'filled',
        singleRoomDarkMode: true
      });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Gefüllt/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Transparent/)).toBeInTheDocument();
      });
    });

    it('hides minimalHeaderStyle options when dark mode is disabled', async () => {
      setupAuthenticatedMocks({
        minimalHeaderStyle: 'filled',
        singleRoomDarkMode: false
      });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.queryByLabelText(/Gefüllt/)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/Transparent/)).not.toBeInTheDocument();
      });
    });
  });
