import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('register-service-worker coverage', () => {
  let originalEnv;

  beforeEach(() => {
    vi.resetModules();
    originalEnv = process.env.NODE_ENV;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it('register does nothing when PUBLIC_URL origin differs', async () => {
    process.env.NODE_ENV = 'production';
    process.env.PUBLIC_URL = 'https://cdn.example.com';
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn(),
        controller: null,
        ready: Promise.resolve({ unregister: vi.fn() }),
      },
      configurable: true,
    });
    const addEventSpy = vi.spyOn(window, 'addEventListener');
    const mod = await import('./register-service-worker');
    mod.default();
    // Should not add load listener because origin differs
    const loadCalls = addEventSpy.mock.calls.filter(c => c[0] === 'load');
    expect(loadCalls.length).toBe(0);
  });
});
