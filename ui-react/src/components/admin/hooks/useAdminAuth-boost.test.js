import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAdminAuth } from './useAdminAuth.js';

vi.mock('../services/admin-api.js', () => ({
  getCsrfToken: () => 'test-csrf'
}));

vi.mock('../services/admin-config-loader.js', () => ({
  verifyAdminSession: vi.fn(),
  loadBootstrapStatus: vi.fn()
}));

import { verifyAdminSession, loadBootstrapStatus } from '../services/admin-config-loader.js';

describe('useAdminAuth - boost coverage', () => {
  const getTranslations = () => ({
    errorUnauthorized: 'Unauthorized', errorUnknown: 'Unknown error'
  });
  const callbacks = { onLoginSuccess: vi.fn(), onLogout: vi.fn() };

  beforeEach(() => { vi.clearAllMocks(); global.fetch = vi.fn(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('handleAdminLogin handles 401 response', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 401 });
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    act(() => { result.current.setApiToken('token123'); });
    await act(async () => { result.current.handleAdminLogin({ preventDefault: vi.fn() }); });
    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.authMessage).toBe('Unauthorized');
  });

  it('handleAdminLogin handles 428 bootstrap flow success', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: false, status: 428 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    act(() => { result.current.setApiToken('token123'); });
    await act(async () => { result.current.handleAdminLogin({ preventDefault: vi.fn() }); });
    expect(result.current.state.isAuthenticated).toBe(true);
    expect(callbacks.onLoginSuccess).toHaveBeenCalled();
  });

  it('handleAdminLogin handles 428 bootstrap flow failure', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: false, status: 428 })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Bootstrap failed' }) });
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    act(() => { result.current.setApiToken('token123'); });
    await act(async () => { result.current.handleAdminLogin({ preventDefault: vi.fn() }); });
    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.authMessage).toBe('Bootstrap failed');
  });

  it('handleAdminLogin handles non-ok response with error payload', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'Server error' }) });
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    act(() => { result.current.setApiToken('token123'); });
    await act(async () => { result.current.handleAdminLogin({ preventDefault: vi.fn() }); });
    expect(result.current.state.authMessage).toBe('Server error');
  });

  it('handleAdminLogin handles network error', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    act(() => { result.current.setApiToken('token123'); });
    await act(async () => { result.current.handleAdminLogin({ preventDefault: vi.fn() }); });
    expect(result.current.state.authMessage).toBe('Network error');
    expect(result.current.state.authMessageType).toBe('error');
  });

  it('verifySession handles error', async () => {
    verifyAdminSession.mockRejectedValue(new Error('fail'));
    loadBootstrapStatus.mockResolvedValue({ ok: true, data: {} });
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    let valid;
    await act(async () => { valid = await result.current.verifySession(); });
    expect(valid).toBe(false);
    expect(result.current.state.isAuthenticated).toBe(false);
  });

  it('loadAdminBootstrapStatus sets setup flags', async () => {
    loadBootstrapStatus.mockResolvedValue({ ok: true, data: { requiresSetup: true, lockedByEnv: true } });
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    await act(async () => { result.current.loadAdminBootstrapStatus(); });
    expect(result.current.state.requiresInitialTokenSetup).toBe(true);
    expect(result.current.state.initialTokenSetupLockedByEnv).toBe(true);
  });

  it('loadAdminBootstrapStatus handles error', async () => {
    loadBootstrapStatus.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    await act(async () => { result.current.loadAdminBootstrapStatus(); });
    // Should not throw
    expect(result.current.state).toBeDefined();
  });

  it('handleUnauthorizedAccess calls onLogout callback', () => {
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    act(() => { result.current.handleUnauthorizedAccess(); });
    expect(callbacks.onLogout).toHaveBeenCalled();
    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.authChecking).toBe(false);
  });

  it('handleAdminLogin handles 428 bootstrap with json parse error', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: false, status: 428 })
      .mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('parse'); } });
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    act(() => { result.current.setApiToken('token123'); });
    await act(async () => { result.current.handleAdminLogin({ preventDefault: vi.fn() }); });
    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.authMessage).toBe('Unauthorized');
  });
});
