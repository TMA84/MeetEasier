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

describe('useAdminAuth', () => {
  const getTranslations = () => ({
    title: 'Admin Panel',
    errorUnauthorized: 'Unauthorized',
    errorUnknown: 'Unknown error'
  });
  const callbacks = { onLoginSuccess: vi.fn(), onLogout: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with unauthenticated state', () => {
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.authChecking).toBe(true);
    expect(result.current.state.apiToken).toBe('');
  });

  it('getRequestHeaders includes Content-Type and CSRF token', () => {
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    const headers = result.current.getRequestHeaders();
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-CSRF-Token']).toBe('test-csrf');
  });

  it('getRequestHeaders without content type', () => {
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    const headers = result.current.getRequestHeaders(false);
    expect(headers['Content-Type']).toBeUndefined();
    expect(headers['X-CSRF-Token']).toBe('test-csrf');
  });

  it('verifySession sets authenticated on valid session', async () => {
    verifyAdminSession.mockResolvedValue(true);
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    let valid;
    await act(async () => { valid = await result.current.verifySession(); });
    expect(valid).toBe(true);
    expect(result.current.state.isAuthenticated).toBe(true);
    expect(result.current.state.authChecking).toBe(false);
  });

  it('verifySession sets unauthenticated on invalid session', async () => {
    verifyAdminSession.mockResolvedValue(false);
    loadBootstrapStatus.mockResolvedValue({ ok: true, data: { requiresSetup: false, lockedByEnv: false } });
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    let valid;
    await act(async () => { valid = await result.current.verifySession(); });
    expect(valid).toBe(false);
    expect(result.current.state.isAuthenticated).toBe(false);
  });

  it('handleAdminLogout clears auth state and calls onLogout', () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    act(() => { result.current.handleAdminLogout(); });
    expect(result.current.state.isAuthenticated).toBe(false);
    expect(result.current.state.apiToken).toBe('');
    expect(callbacks.onLogout).toHaveBeenCalled();
  });

  it('handleUnauthorizedAccess sets error message', () => {
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    act(() => { result.current.handleUnauthorizedAccess(); });
    expect(result.current.state.authMessage).toBe('Unauthorized');
    expect(result.current.state.authMessageType).toBe('error');
    expect(result.current.state.isAuthenticated).toBe(false);
  });

  it('handleAdminLogin rejects empty token', () => {
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    const fakeEvent = { preventDefault: vi.fn() };
    act(() => { result.current.handleAdminLogin(fakeEvent); });
    expect(result.current.state.authMessage).toBe('Unauthorized');
    expect(result.current.state.authMessageType).toBe('error');
  });

  it('handleAdminLogin succeeds with valid token', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });
    const { result } = renderHook(() => useAdminAuth(getTranslations, callbacks));
    act(() => { result.current.setApiToken('valid-token'); });
    const fakeEvent = { preventDefault: vi.fn() };
    await act(async () => { result.current.handleAdminLogin(fakeEvent); });
    expect(result.current.state.isAuthenticated).toBe(true);
    expect(callbacks.onLoginSuccess).toHaveBeenCalled();
  });
});
