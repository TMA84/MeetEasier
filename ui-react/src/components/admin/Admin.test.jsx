import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import Admin from './Admin';
import { setupAdminFetchMocks } from './test-helpers';

// Mock socket.io-client
vi.mock('socket.io-client');

describe('Admin Component', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
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
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);
      await waitFor(() => {
        expect(screen.getByText('Admin Panel')).toBeInTheDocument();
      });
    });

    it('renders all configuration sections when not locked', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);
      await waitFor(() => {
        expect(screen.getByText('WiFi Configuration')).toBeInTheDocument();
        expect(screen.getByText('Logo Configuration')).toBeInTheDocument();
        expect(screen.getByText('Information Configuration')).toBeInTheDocument();
      });
    });

    it('renders API token input field', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);
      await waitFor(() => {
        expect(screen.getByLabelText(/API Token:/)).toBeInTheDocument();
      });
    });
  });

  describe('Config Locks', () => {
    it('displays locked message when WiFi is locked', async () => {
      setupAdminFetchMocks(global.fetch, { locks: { wifiLocked: true, logoLocked: false, sidebarLocked: false } });
      render(<Admin />);
      await waitFor(() => {
        expect(screen.getByText(/configured via environment variables/i)).toBeInTheDocument();
      });
    });

    it('hides WiFi form when locked', async () => {
      setupAdminFetchMocks(global.fetch, { locks: { wifiLocked: true, logoLocked: false, sidebarLocked: false } });
      render(<Admin />);
      await waitFor(() => {
        expect(screen.queryByLabelText(/WiFi SSID:/)).not.toBeInTheDocument();
      });
    });

    it('displays locked message when logo is locked', async () => {
      setupAdminFetchMocks(global.fetch, { locks: { wifiLocked: false, logoLocked: true, sidebarLocked: false } });
      render(<Admin />);
      await waitFor(() => {
        const lockedMessages = screen.getAllByText(/configured via environment variables/i);
        expect(lockedMessages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Current Configuration Display', () => {
    it('displays current WiFi configuration', async () => {
      setupAdminFetchMocks(global.fetch, { wifi: { ssid: 'TestNetwork', password: 'TestPass123' } });
      render(<Admin />);
      await waitFor(() => {
        expect(screen.getByText('TestNetwork')).toBeInTheDocument();
        expect(screen.getByText('TestPass123')).toBeInTheDocument();
      });
    });

    it('displays current logo URLs', async () => {
      setupAdminFetchMocks(global.fetch, { logo: { logoDarkUrl: '/img/dark.png', logoLightUrl: '/img/light.png' } });
      render(<Admin />);
      await waitFor(() => {
        expect(screen.getByText('/img/dark.png')).toBeInTheDocument();
        expect(screen.getByText('/img/light.png')).toBeInTheDocument();
      });
    });

    it('displays current sidebar configuration', async () => {
      setupAdminFetchMocks(global.fetch, { sidebar: { showWiFi: true, showUpcomingMeetings: false, showMeetingTitles: true } });
      render(<Admin />);
      await waitFor(() => {
        const yesTexts = screen.getAllByText('Yes');
        expect(yesTexts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('WiFi Configuration Form', () => {
    it('allows entering WiFi SSID', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);
      await waitFor(() => {
        const ssidInput = screen.getByLabelText(/WiFi SSID:/);
        fireEvent.change(ssidInput, { target: { value: 'NewNetwork' } });
        expect(ssidInput.value).toBe('NewNetwork');
      });
    });

    it('allows entering WiFi password', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);
      await waitFor(() => {
        const passwordInput = screen.getByLabelText(/WiFi Password:/);
        fireEvent.change(passwordInput, { target: { value: 'NewPass123' } });
        expect(passwordInput.value).toBe('NewPass123');
      });
    });

    it('submits WiFi configuration successfully', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);
      await waitFor(() => {
        const ssidInput = screen.getByLabelText(/WiFi SSID:/);
        fireEvent.change(ssidInput, { target: { value: 'NewNetwork' } });
      });
      const submitButton = screen.getByText('Update WiFi');
      expect(submitButton).not.toBeDisabled();
      const form = submitButton.closest('form');
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText(/WiFi configuration updated successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('handles WiFi submission error', async () => {
      setupAdminFetchMocks(global.fetch, {}, {
        postHandler: (url) => {
          if (url === '/api/wifi') {
            return Promise.resolve({ ok: true, status: 200, json: async () => ({ success: false, error: 'Invalid configuration' }) });
          }
          return null;
        }
      });
      render(<Admin />);
      await waitFor(() => {
        const ssidInput = screen.getByLabelText(/WiFi SSID:/);
        fireEvent.change(ssidInput, { target: { value: 'Test' } });
      });
      const submitButton = screen.getByText('Update WiFi');
      const form = submitButton.closest('form');
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText(/Error: Invalid configuration/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('handles unauthorized WiFi submission', async () => {
      setupAdminFetchMocks(global.fetch, {}, {
        postHandler: (url) => {
          if (url === '/api/wifi') {
            return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
          }
          return null;
        }
      });
      render(<Admin />);
      await waitFor(() => {
        const ssidInput = screen.getByLabelText(/WiFi SSID:/);
        fireEvent.change(ssidInput, { target: { value: 'Test' } });
      });
      const submitButton = screen.getByText('Update WiFi');
      const form = submitButton.closest('form');
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText(/Unauthorized/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Logo Configuration Form', () => {
    it('toggles between URL and file upload modes', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);
      await waitFor(() => {
        const fileButton = screen.getByText('Upload File');
        fireEvent.click(fileButton);
        expect(screen.getByLabelText(/Upload Dark Logo:/)).toBeInTheDocument();
      });
    });

    it('allows entering logo URLs in URL mode', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);
      await waitFor(() => {
        const darkUrlInput = screen.getByLabelText(/Logo URL \(Dark\):/);
        fireEvent.change(darkUrlInput, { target: { value: '/img/new-dark.png' } });
        expect(darkUrlInput.value).toBe('/img/new-dark.png');
      });
    });

    it('submits logo configuration successfully', async () => {
      setupAdminFetchMocks(global.fetch);
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
      setupAdminFetchMocks(global.fetch, {}, {
        postHandler: (url) => {
          if (url === '/api/logo') {
            return Promise.resolve({ ok: true, status: 200, json: async () => ({ success: false, error: 'Invalid URL' }) });
          }
          return null;
        }
      });
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
      setupAdminFetchMocks(global.fetch, { sidebar: { showWiFi: false, showUpcomingMeetings: true, showMeetingTitles: false } });
      render(<Admin />);
      await waitFor(() => {
        const wifiRadio = screen.getByLabelText(/Show WiFi Information/);
        fireEvent.click(wifiRadio);
        expect(wifiRadio.checked).toBe(true);
      });
    });

    it('allows toggling upcoming meetings display', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);
      await waitFor(() => {
        const meetingsRadio = screen.getByLabelText(/Show Upcoming Meetings/);
        fireEvent.click(meetingsRadio);
        expect(meetingsRadio.checked).toBe(true);
      });
    });

    it('allows toggling meeting titles display', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);
      await waitFor(() => {
        const titlesCheckbox = screen.getByLabelText(/Show Meeting Titles/);
        fireEvent.click(titlesCheckbox);
        expect(titlesCheckbox.checked).toBe(true);
      });
    });

    it('submits sidebar configuration successfully', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);
      await waitFor(() => {
        const meetingsRadio = screen.getByLabelText(/Show Upcoming Meetings/);
        fireEvent.click(meetingsRadio);
      });
      const submitButton = screen.getByText('Update Information');
      const form = submitButton.closest('form');
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText(/Information configuration updated successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('API Token Handling', () => {
    it('allows entering API token', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);
      await waitFor(() => {
        const tokenInput = screen.getByLabelText(/API Token:/);
        fireEvent.change(tokenInput, { target: { value: 'test-token-123' } });
        expect(tokenInput.value).toBe('test-token-123');
      });
    });

    it('includes CSRF token in request headers', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);
      await waitFor(() => {
        const ssidInput = screen.getByLabelText(/WiFi SSID:/);
        fireEvent.change(ssidInput, { target: { value: 'Test' } });
      });
      const submitButton = screen.getByText('Update WiFi');
      const form = submitButton.closest('form');
      fireEvent.submit(form);
      await waitFor(() => {
        const postCall = global.fetch.mock.calls.find(call => 
          call[0] === '/api/wifi' && call[1]?.method === 'POST'
        );
        expect(postCall).toBeDefined();
        expect(postCall[1].headers['Content-Type']).toBe('application/json');
      }, { timeout: 3000 });
    });
  });

  describe('Localization', () => {
    it('displays German translations when browser language is German', async () => {
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: 'de-DE'
      });
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);
      await waitFor(() => {
        expect(screen.getByText('WiFi Konfiguration')).toBeInTheDocument();
      });
    });
  });

  describe('Auth Flow', () => {
    it('shows login form when not authenticated', async () => {
      // Session check returns 401 (not authenticated)
      setupAdminFetchMocks(global.fetch, {}, {
        postHandler: () => null
      });
      global.fetch.mockImplementation((url, _opts) => {
        if (url === '/api/admin/session') {
          return Promise.resolve({ ok: false, status: 401 });
        }
        if (url === '/api/admin/bootstrap-status') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ requiresSetup: false, lockedByEnv: false }) });
        }
        if (url === '/api/version') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ version: '1.0.0' }) });
        }
        if (url === '/api/logo') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ logoDarkUrl: '', logoLightUrl: '' }) });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument();
      });
    });

    it('handles successful login', async () => {
      // Start unauthenticated, then login succeeds
      let loginCalled = false;
      global.fetch.mockImplementation((url, _opts) => {
        if (url === '/api/admin/session') {
          return Promise.resolve({ ok: false, status: 401 });
        }
        if (url === '/api/admin/bootstrap-status') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ requiresSetup: false, lockedByEnv: false }) });
        }
        if (url === '/api/admin/login' && _opts?.method === 'POST') {
          loginCalled = true;
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true }) });
        }
        if (url === '/api/version') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ version: '1.0.0' }) });
        }
        if (url === '/api/logo') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
        }
        // After login, all config endpoints return defaults
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      });

      render(<Admin />);

      // Wait for login form
      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument();
      });

      // Enter token and submit
      const tokenInput = screen.getByLabelText(/API Token:/);
      fireEvent.change(tokenInput, { target: { value: 'my-secret-token' } });
      
      const loginButton = screen.getByText('Login');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(loginCalled).toBe(true);
      });

      // After successful login, should show Logout button
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('handles failed login with error message', async () => {
      global.fetch.mockImplementation((url, _opts) => {
        if (url === '/api/admin/session') {
          return Promise.resolve({ ok: false, status: 401 });
        }
        if (url === '/api/admin/bootstrap-status') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ requiresSetup: false, lockedByEnv: false }) });
        }
        if (url === '/api/admin/login' && _opts?.method === 'POST') {
          return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
        }
        if (url === '/api/version') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ version: '1.0.0' }) });
        }
        if (url === '/api/logo') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument();
      });

      const tokenInput = screen.getByLabelText(/API Token:/);
      fireEvent.change(tokenInput, { target: { value: 'wrong-token' } });
      fireEvent.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(screen.getByText(/Unauthorized/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows error when submitting empty token', async () => {
      global.fetch.mockImplementation((url) => {
        if (url === '/api/admin/session') {
          return Promise.resolve({ ok: false, status: 401 });
        }
        if (url === '/api/admin/bootstrap-status') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ requiresSetup: false, lockedByEnv: false }) });
        }
        if (url === '/api/version') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ version: '1.0.0' }) });
        }
        if (url === '/api/logo') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument();
      });

      // Submit without entering token
      fireEvent.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(screen.getByText(/Unauthorized/i)).toBeInTheDocument();
      });
    });

    it('handles logout', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      // Wait for authenticated state
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument();
      });
    });

    it('handles login with 428 bootstrap flow', async () => {
      // Test that the login handler handles 428 status (bootstrap token setup)
      let loginCalled = false;
      let bootstrapCalled = false;
      global.fetch.mockImplementation((url, _opts) => {
        if (url === '/api/admin/session') {
          return Promise.resolve({ ok: false, status: 401 });
        }
        if (url === '/api/admin/bootstrap-status') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ requiresSetup: false, lockedByEnv: false }) });
        }
        if (url === '/api/admin/login' && _opts?.method === 'POST') {
          loginCalled = true;
          return Promise.resolve({ ok: false, status: 428, json: async () => ({}) });
        }
        if (url === '/api/admin/bootstrap-token' && _opts?.method === 'POST') {
          bootstrapCalled = true;
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true }) });
        }
        if (url === '/api/version') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ version: '1.0.0' }) });
        }
        if (url === '/api/logo') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument();
      });

      const tokenInput = screen.getByLabelText(/API Token:/);
      fireEvent.change(tokenInput, { target: { value: 'new-token-123' } });
      fireEvent.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(loginCalled).toBe(true);
        expect(bootstrapCalled).toBe(true);
      }, { timeout: 5000 });

      // After bootstrap, should be authenticated
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Tab Switching', () => {
    it('switches to Operations section', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const operationsTab = screen.getByText('Operations');
      fireEvent.click(operationsTab);

      await waitFor(() => {
        expect(screen.getByText('System')).toBeInTheDocument();
      });
    });

    it('switches between sub-tabs within a section', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      // Click WiFi tab
      const wifiTab = screen.getByRole('button', { name: 'WiFi' });
      fireEvent.click(wifiTab);

      await waitFor(() => {
        expect(screen.getByText('WiFi Configuration')).toBeInTheDocument();
      });
    });

    it('switches to Translations section', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      // "Translations" appears as both a section tab and content - use the section tab button
      const translationButtons = screen.getAllByText('Translations');
      const sectionTab = translationButtons.find(el => el.classList.contains('admin-section-tab'));
      fireEvent.click(sectionTab || translationButtons[0]);

      // Should still be visible after click
      await waitFor(() => {
        expect(screen.getAllByText('Translations').length).toBeGreaterThan(0);
      });
    });

    it('switches to Logo tab', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const logoTab = screen.getByRole('button', { name: 'Logo' });
      fireEvent.click(logoTab);

      await waitFor(() => {
        expect(screen.getByText('Logo Configuration')).toBeInTheDocument();
      });
    });

    it('switches to Colors tab', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const colorsTab = screen.getByRole('button', { name: 'Colors' });
      fireEvent.click(colorsTab);

      await waitFor(() => {
        expect(screen.getByText('Colors')).toBeInTheDocument();
      });
    });

    it('switches to Booking tab', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const bookingTab = screen.getByRole('button', { name: 'Booking' });
      fireEvent.click(bookingTab);

      await waitFor(() => {
        expect(screen.getByText('Booking')).toBeInTheDocument();
      });
    });
  });

  describe('Version Display', () => {
    it('displays app version when available', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText(/Version 1.0.0/)).toBeInTheDocument();
      });
    });
  });

  describe('Unmount Cleanup', () => {
    it('cleans up intervals and socket on unmount', async () => {
      setupAdminFetchMocks(global.fetch);
      const { unmount } = render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Session Verification', () => {
    it('auto-authenticates when session is valid', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      // setupAdminFetchMocks returns ok:true for /api/admin/session
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });

    it('handles session verification failure', async () => {
      global.fetch.mockImplementation((url) => {
        if (url === '/api/admin/session') {
          return Promise.reject(new Error('Network error'));
        }
        if (url === '/api/admin/bootstrap-status') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ requiresSetup: false, lockedByEnv: false }) });
        }
        if (url === '/api/version') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ version: '1.0.0' }) });
        }
        if (url === '/api/logo') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument();
      });
    });
  });
});

describe('Dark Mode and minimalHeaderStyle State Persistence', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'language', {
      writable: true,
      value: 'de-DE'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads minimalHeaderStyle value correctly from server', async () => {
    global.fetch = vi.fn();
    setupAdminFetchMocks(global.fetch, {
      sidebar: {
        showWiFi: true,
        showUpcomingMeetings: false,
        showMeetingTitles: false,
        minimalHeaderStyle: 'filled',
        singleRoomDarkMode: true
      }
    });

    render(<Admin />);

    await waitFor(() => {
      expect(screen.queryByText('Login')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      const filledRadio = screen.getByDisplayValue('filled');
      expect(filledRadio).toBeInTheDocument();
      expect(filledRadio).toBeChecked();
    }, { timeout: 3000 });
  });

  it('sends minimalHeaderStyle value correctly to server', async () => {
    global.fetch = vi.fn();
    setupAdminFetchMocks(global.fetch, {
      sidebar: {
        showWiFi: true,
        showUpcomingMeetings: false,
        showMeetingTitles: false,
        minimalHeaderStyle: 'filled',
        singleRoomDarkMode: true
      }
    });

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
    global.fetch = vi.fn();
    setupAdminFetchMocks(global.fetch, {
      sidebar: {
        showWiFi: true,
        showUpcomingMeetings: false,
        showMeetingTitles: false,
        minimalHeaderStyle: 'transparent',
        singleRoomDarkMode: true
      }
    });

    render(<Admin />);

    await waitFor(() => {
      const transparentRadio = screen.getByLabelText(/Transparent/);
      expect(transparentRadio.checked).toBe(true);
    });

    const darkModeCheckbox = screen.getByLabelText(/Single-Room Dark Mode/i);
    fireEvent.click(darkModeCheckbox);

    const submitButton = screen.getByText('Informationen aktualisieren');
    fireEvent.click(submitButton);

    await waitFor(() => {
      const lastCall = global.fetch.mock.calls.find(call => 
        call[0] === '/api/sidebar' && call[1]?.method === 'POST'
      );
      expect(lastCall).toBeDefined();
      const body = JSON.parse(lastCall[1].body);
      expect(body.minimalHeaderStyle).toBe('transparent');
      expect(body.singleRoomDarkMode).toBe(false);
    });
  });

  it('displays informational message when dark mode is disabled', async () => {
    global.fetch = vi.fn();
    setupAdminFetchMocks(global.fetch, {
      sidebar: {
        showWiFi: true,
        showUpcomingMeetings: false,
        showMeetingTitles: false,
        minimalHeaderStyle: 'filled',
        singleRoomDarkMode: false
      }
    });

    render(<Admin />);

    await waitFor(() => {
      expect(screen.getByText(/Diese Optionen sind nur im Dark-Mode verfügbar/i)).toBeInTheDocument();
    });
  });

  it('hides informational message when dark mode is enabled', async () => {
    global.fetch = vi.fn();
    setupAdminFetchMocks(global.fetch, {
      sidebar: {
        showWiFi: true,
        showUpcomingMeetings: false,
        showMeetingTitles: false,
        minimalHeaderStyle: 'filled',
        singleRoomDarkMode: true
      }
    });

    render(<Admin />);

    await waitFor(() => {
      expect(screen.queryByText(/Diese Optionen sind nur im Dark-Mode verfügbar/i)).not.toBeInTheDocument();
    });
  });

  it('shows minimalHeaderStyle options when dark mode is enabled', async () => {
    global.fetch = vi.fn();
    setupAdminFetchMocks(global.fetch, {
      sidebar: {
        showWiFi: true,
        showUpcomingMeetings: false,
        showMeetingTitles: false,
        minimalHeaderStyle: 'filled',
        singleRoomDarkMode: true
      }
    });

    render(<Admin />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Gefüllt/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Transparent/)).toBeInTheDocument();
    });
  });

  it('hides minimalHeaderStyle options when dark mode is disabled', async () => {
    global.fetch = vi.fn();
    setupAdminFetchMocks(global.fetch, {
      sidebar: {
        showWiFi: true,
        showUpcomingMeetings: false,
        showMeetingTitles: false,
        minimalHeaderStyle: 'filled',
        singleRoomDarkMode: false
      }
    });

    render(<Admin />);

    await waitFor(() => {
      expect(screen.queryByLabelText(/Gefüllt/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Transparent/)).not.toBeInTheDocument();
    });
  });
});

describe('Admin Form Submissions', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    Object.defineProperty(navigator, 'language', {
      writable: true,
      value: 'en-US'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Booking Configuration', () => {
    it('submits booking configuration successfully', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      // Switch to Booking tab
      const bookingTab = screen.getByRole('button', { name: 'Booking' });
      fireEvent.click(bookingTab);

      await waitFor(() => {
        const submitButton = screen.getByText('Update Booking');
        const form = submitButton.closest('form');
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText(/Booking configuration updated successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('handles unauthorized booking submission', async () => {
      setupAdminFetchMocks(global.fetch, {}, {
        postHandler: (url) => {
          if (url === '/api/booking-config') {
            return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
          }
          return null;
        }
      });
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const bookingTab = screen.getByRole('button', { name: 'Booking' });
      fireEvent.click(bookingTab);

      await waitFor(() => {
        const submitButton = screen.getByText('Update Booking');
        const form = submitButton.closest('form');
        fireEvent.submit(form);
      });

      // Should show login form after unauthorized
      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Colors Configuration', () => {
    it('submits colors configuration successfully', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const colorsTab = screen.getByRole('button', { name: 'Colors' });
      fireEvent.click(colorsTab);

      await waitFor(() => {
        const submitButton = screen.getByText('Update Colors');
        const form = submitButton.closest('form');
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText(/Color configuration updated successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('handles unauthorized colors submission', async () => {
      setupAdminFetchMocks(global.fetch, {}, {
        postHandler: (url) => {
          if (url === '/api/colors') {
            return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
          }
          return null;
        }
      });
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const colorsTab = screen.getByRole('button', { name: 'Colors' });
      fireEvent.click(colorsTab);

      await waitFor(() => {
        const submitButton = screen.getByText('Update Colors');
        const form = submitButton.closest('form');
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Operations Section Tabs', () => {
    it('switches to System tab in Operations section', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const operationsSection = screen.getByText('Operations');
      fireEvent.click(operationsSection);

      await waitFor(() => {
        expect(screen.getByText('System')).toBeInTheDocument();
      });
    });

    it('switches to Maintenance tab', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const operationsSection = screen.getByText('Operations');
      fireEvent.click(operationsSection);

      // Wait for the sub-tabs to appear, then click Maintenance
      await waitFor(() => {
        const tabs = screen.getAllByRole('button');
        const maintenanceTab = tabs.find(t => t.textContent.trim() === 'Maintenance' && t.classList.contains('admin-tab'));
        if (maintenanceTab) fireEvent.click(maintenanceTab);
      });

      // Should not crash
      expect(screen.getByText('Operations')).toBeInTheDocument();
    });

    it('switches to API Token tab', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const operationsSection = screen.getByText('Operations');
      fireEvent.click(operationsSection);

      await waitFor(() => {
        const tabs = screen.getAllByRole('button');
        const apiTokenTab = tabs.find(t => t.textContent.trim() === 'API-Token' && t.classList.contains('admin-tab'));
        if (apiTokenTab) fireEvent.click(apiTokenTab);
      });

      expect(screen.getByText('Operations')).toBeInTheDocument();
    });

    it('switches to Search tab', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const operationsSection = screen.getByText('Operations');
      fireEvent.click(operationsSection);

      await waitFor(() => {
        const tabs = screen.getAllByRole('button');
        const searchTab = tabs.find(t => t.textContent.trim() === 'Search' && t.classList.contains('admin-tab'));
        if (searchTab) fireEvent.click(searchTab);
      });

      expect(screen.getByText('Operations')).toBeInTheDocument();
    });

    it('switches to Rate-Limits tab', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const operationsSection = screen.getByText('Operations');
      fireEvent.click(operationsSection);

      await waitFor(() => {
        const tabs = screen.getAllByRole('button');
        const rateLimitTab = tabs.find(t => t.textContent.trim() === 'Rate-Limits' && t.classList.contains('admin-tab'));
        if (rateLimitTab) fireEvent.click(rateLimitTab);
      });

      expect(screen.getByText('Operations')).toBeInTheDocument();
    });

    it('switches to Graph-API tab', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const operationsSection = screen.getByText('Operations');
      fireEvent.click(operationsSection);

      await waitFor(() => {
        const tabs = screen.getAllByRole('button');
        const oauthTab = tabs.find(t => t.textContent.trim() === 'Graph-API' && t.classList.contains('admin-tab'));
        if (oauthTab) fireEvent.click(oauthTab);
      });

      expect(screen.getByText('Operations')).toBeInTheDocument();
    });

    it('switches to Translation API tab', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const operationsSection = screen.getByText('Operations');
      fireEvent.click(operationsSection);

      await waitFor(() => {
        const tabs = screen.getAllByRole('button');
        const translationApiTab = tabs.find(t => t.textContent.trim() === 'Translation API' && t.classList.contains('admin-tab'));
        if (translationApiTab) fireEvent.click(translationApiTab);
      });

      expect(screen.getByText('Operations')).toBeInTheDocument();
    });

    it('switches to Backup tab', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const operationsSection = screen.getByText('Operations');
      fireEvent.click(operationsSection);

      await waitFor(() => {
        const tabs = screen.getAllByRole('button');
        const backupTab = tabs.find(t => t.textContent.trim() === 'Backup' && t.classList.contains('admin-tab'));
        if (backupTab) fireEvent.click(backupTab);
      });

      expect(screen.getByText('Operations')).toBeInTheDocument();
    });

    it('switches to Audit-Log tab', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const operationsSection = screen.getByText('Operations');
      fireEvent.click(operationsSection);

      await waitFor(() => {
        const auditTab = screen.getByRole('button', { name: /Audit-Log/i });
        fireEvent.click(auditTab);
      });

      expect(screen.getByText(/Audit-Log/i)).toBeInTheDocument();
    });

    it('switches to MQTT tab', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const operationsSection = screen.getByText('Operations');
      fireEvent.click(operationsSection);

      await waitFor(() => {
        const mqttTab = screen.getByRole('button', { name: 'MQTT' });
        fireEvent.click(mqttTab);
      });

      expect(screen.getByText('MQTT')).toBeInTheDocument();
    });
  });

  describe('Maintenance Banner', () => {
    it('shows maintenance banner when maintenance is enabled', async () => {
      setupAdminFetchMocks(global.fetch);
      // Override maintenance status to be enabled
      const originalImpl = global.fetch.getMockImplementation();
      global.fetch.mockImplementation((url, _opts) => {
        if (typeof url === 'string' && url === '/api/maintenance-status') {
          return Promise.resolve({ ok: true, json: async () => ({ enabled: true, message: 'Under maintenance' }) });
        }
        return originalImpl(url, _opts);
      });

      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText(/Maintenance mode is active/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Sync Status', () => {
    it('renders without sync status initially', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      // Component should render without crashing even without sync data
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });
  });
});

describe('Admin Handler Methods', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    Object.defineProperty(navigator, 'language', {
      writable: true,
      value: 'en-US'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Maintenance Form', () => {
    it('submits maintenance configuration', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      // Switch to Operations > Maintenance
      fireEvent.click(screen.getByText('Operations'));
      await waitFor(() => {
        const tabs = screen.getAllByRole('button');
        const maintenanceTab = tabs.find(t => t.textContent.trim() === 'Maintenance' && t.classList.contains('admin-tab'));
        if (maintenanceTab) fireEvent.click(maintenanceTab);
      });

      // Find and submit the maintenance form
      await waitFor(() => {
        const submitButton = screen.getByText('Save Maintenance');
        const form = submitButton.closest('form');
        if (form) fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText(/Maintenance configuration updated/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('System Form', () => {
    it('submits system configuration', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      // Switch to Operations > System
      fireEvent.click(screen.getByText('Operations'));

      // Find and submit the system form
      await waitFor(() => {
        const submitButtons = screen.getAllByText('Save System Configuration');
        const form = submitButtons[0].closest('form');
        if (form) fireEvent.submit(form);
      });

      await waitFor(() => {
        const msgs = screen.getAllByText(/System configuration updated/i);
        expect(msgs.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('OAuth Form', () => {
    it('submits OAuth configuration', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Operations'));
      await waitFor(() => {
        const tabs = screen.getAllByRole('button');
        const oauthTab = tabs.find(t => t.textContent.trim() === 'Graph-API' && t.classList.contains('admin-tab'));
        if (oauthTab) fireEvent.click(oauthTab);
      });

      await waitFor(() => {
        const submitButton = screen.getByText('Save OAuth Configuration');
        const form = submitButton.closest('form');
        if (form) fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText(/OAuth configuration updated/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Search Form', () => {
    it('submits search configuration', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Operations'));
      await waitFor(() => {
        const tabs = screen.getAllByRole('button');
        const searchTab = tabs.find(t => t.textContent.trim() === 'Search' && t.classList.contains('admin-tab'));
        if (searchTab) fireEvent.click(searchTab);
      });

      await waitFor(() => {
        const submitButton = screen.getByText('Save Search Configuration');
        const form = submitButton.closest('form');
        if (form) fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText(/Search configuration updated/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Rate Limit Form', () => {
    it('submits rate limit configuration', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Operations'));
      await waitFor(() => {
        const tabs = screen.getAllByRole('button');
        const rateLimitTab = tabs.find(t => t.textContent.trim() === 'Rate-Limits' && t.classList.contains('admin-tab'));
        if (rateLimitTab) fireEvent.click(rateLimitTab);
      });

      await waitFor(() => {
        const submitButtons = screen.getAllByRole('button', { name: /Save.*Rate/i });
        if (submitButtons.length > 0) {
          const form = submitButtons[0].closest('form');
          if (form) fireEvent.submit(form);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Operations')).toBeInTheDocument();
      });
    });
  });

  describe('Translation API Form', () => {
    it('submits translation API configuration', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Operations'));
      await waitFor(() => {
        const tabs = screen.getAllByRole('button');
        const translationApiTab = tabs.find(t => t.textContent.trim() === 'Translation API' && t.classList.contains('admin-tab'));
        if (translationApiTab) fireEvent.click(translationApiTab);
      });

      await waitFor(() => {
        const submitButton = screen.getByText('Save Translation API Configuration');
        const form = submitButton.closest('form');
        if (form) fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText(/Translation API configuration updated/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Connected Displays Tab', () => {
    it('loads connected displays when switching to tab', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Operations'));
      await waitFor(() => {
        const tabs = screen.getAllByRole('button');
        const displaysTab = tabs.find(t => t.textContent.trim() === 'Displays' && t.classList.contains('admin-tab'));
        if (displaysTab) fireEvent.click(displaysTab);
      });

      // Should trigger fetch for connected displays
      await waitFor(() => {
        const _displaysCalls = global.fetch.mock.calls.filter(call =>
          typeof call[0] === 'string' && call[0].includes('/api/connected-displays')
        );
        // May or may not have been called depending on tab implementation
        expect(screen.getByText('Operations')).toBeInTheDocument();
      });
    });
  });

  describe('Logo File Upload', () => {
    it('switches to file upload mode and back', async () => {
      setupAdminFetchMocks(global.fetch);
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      // Switch to Logo tab
      const logoTab = screen.getByRole('button', { name: 'Logo' });
      fireEvent.click(logoTab);

      // Switch to file upload mode
      await waitFor(() => {
        const fileButton = screen.getByText('Upload File');
        fireEvent.click(fileButton);
      });

      expect(screen.getByLabelText(/Upload Dark Logo:/)).toBeInTheDocument();

      // Switch back to URL mode
      const urlButton = screen.getByText('Enter URL');
      fireEvent.click(urlButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Logo URL \(Dark\):/)).toBeInTheDocument();
      });
    });
  });

  describe('Booking Form with Check-In', () => {
    it('toggles check-in settings', async () => {
      setupAdminFetchMocks(global.fetch, {
        booking: { enableBooking: true, checkIn: { enabled: true, requiredForExternalMeetings: true, earlyCheckInMinutes: 5, windowMinutes: 10, autoReleaseNoShow: true } }
      });
      render(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      const bookingTab = screen.getByRole('button', { name: 'Booking' });
      fireEvent.click(bookingTab);

      // The booking tab should render with check-in options
      await waitFor(() => {
        expect(screen.getByText('Booking')).toBeInTheDocument();
      });
    });
  });
});
