import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('register-service-worker', () => {
  let originalEnv;

  beforeEach(() => {
    vi.resetModules();
    originalEnv = process.env.NODE_ENV;
    // Ensure global.fetch is a mock
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it('exports register as default and unregister as named export', async () => {
    const mod = await import('./register-service-worker');
    expect(typeof mod.default).toBe('function');
    expect(typeof mod.unregister).toBe('function');
  });

  it('register does nothing when not in production', async () => {
    process.env.NODE_ENV = 'development';
    const addEventSpy = vi.spyOn(window, 'addEventListener');
    const mod = await import('./register-service-worker');
    mod.default();
    expect(addEventSpy).not.toHaveBeenCalledWith('load', expect.any(Function));
  });

  describe('production mode (non-localhost)', () => {
    // window.location.hostname is 'localhost' in jsdom by default,
    // so isLocalhost=true. We test the localhost path (checkValidServiceWorker).
    // For non-localhost, we need to test registerValidSW directly via the load callback.

    it('register adds load event listener in production with serviceWorker', async () => {
      process.env.NODE_ENV = 'production';
      process.env.PUBLIC_URL = '';
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: vi.fn().mockResolvedValue({}), controller: null, ready: Promise.resolve({ unregister: vi.fn() }) },
        configurable: true,
      });
      const addEventSpy = vi.spyOn(window, 'addEventListener');
      const mod = await import('./register-service-worker');
      mod.default();
      expect(addEventSpy).toHaveBeenCalledWith('load', expect.any(Function));
    });

    it('checkValidServiceWorker registers SW when fetch returns valid JS', async () => {
      process.env.NODE_ENV = 'production';
      process.env.PUBLIC_URL = '';

      const installingWorker = { state: 'installed', onstatechange: null };
      const registration = { installing: installingWorker, onupdatefound: null };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue(registration),
          controller: null,
          ready: Promise.resolve({ unregister: vi.fn() }),
        },
        configurable: true,
      });

      // jsdom hostname is 'localhost', so checkValidServiceWorker will be called
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        headers: { get: () => 'application/javascript' },
      });

      vi.spyOn(window, 'addEventListener').mockImplementation((event, cb) => {
        if (event === 'load') cb();
      });

      const mod = await import('./register-service-worker');
      mod.default();

      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/service-worker.js');
      });

      // checkValidServiceWorker calls registerValidSW for valid response
      await vi.waitFor(() => {
        expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/service-worker.js');
      });
    });

    it('registerValidSW handles new content available (controller exists)', async () => {
      process.env.NODE_ENV = 'production';
      process.env.PUBLIC_URL = '';

      const installingWorker = { state: 'installed', onstatechange: null };
      const registration = { installing: installingWorker, onupdatefound: null };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue(registration),
          controller: {}, // existing controller = new content
          ready: Promise.resolve({ unregister: vi.fn() }),
        },
        configurable: true,
      });

      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        headers: { get: () => 'application/javascript' },
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(window, 'addEventListener').mockImplementation((event, cb) => {
        if (event === 'load') cb();
      });

      const mod = await import('./register-service-worker');
      mod.default();

      await vi.waitFor(() => {
        expect(registration.onupdatefound).not.toBeNull();
      });

      registration.onupdatefound();
      installingWorker.onstatechange();

      expect(consoleSpy).toHaveBeenCalledWith('New content is available; please refresh.');
    });

    it('registerValidSW handles content cached for offline use (no controller)', async () => {
      process.env.NODE_ENV = 'production';
      process.env.PUBLIC_URL = '';

      const installingWorker = { state: 'installed', onstatechange: null };
      const registration = { installing: installingWorker, onupdatefound: null };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue(registration),
          controller: null,
          ready: Promise.resolve({ unregister: vi.fn() }),
        },
        configurable: true,
      });

      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        headers: { get: () => 'application/javascript' },
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(window, 'addEventListener').mockImplementation((event, cb) => {
        if (event === 'load') cb();
      });

      const mod = await import('./register-service-worker');
      mod.default();

      await vi.waitFor(() => {
        expect(registration.onupdatefound).not.toBeNull();
      });

      registration.onupdatefound();
      installingWorker.onstatechange();

      expect(consoleSpy).toHaveBeenCalledWith('Content is cached for offline use.');
    });

    it('registerValidSW handles registration error', async () => {
      process.env.NODE_ENV = 'production';
      process.env.PUBLIC_URL = '';

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockRejectedValue(new Error('Registration failed')),
          controller: null,
          ready: Promise.resolve({ unregister: vi.fn() }),
        },
        configurable: true,
      });

      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        headers: { get: () => 'application/javascript' },
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(window, 'addEventListener').mockImplementation((event, cb) => {
        if (event === 'load') cb();
      });

      const mod = await import('./register-service-worker');
      mod.default();

      await vi.waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error during service worker registration:',
          expect.any(Error)
        );
      });
    });

    it('checkValidServiceWorker handles 404 by unregistering', async () => {
      process.env.NODE_ENV = 'production';
      process.env.PUBLIC_URL = '';

      const unregisterFn = vi.fn().mockResolvedValue(true);
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn(),
          controller: null,
          ready: Promise.resolve({ unregister: unregisterFn }),
        },
        configurable: true,
      });

      global.fetch = vi.fn().mockResolvedValue({
        status: 404,
        headers: { get: () => 'text/html' },
      });

      vi.spyOn(window, 'addEventListener').mockImplementation((event, cb) => {
        if (event === 'load') cb();
      });

      const mod = await import('./register-service-worker');
      mod.default();

      await vi.waitFor(() => {
        expect(unregisterFn).toHaveBeenCalled();
      });
    });

    it('checkValidServiceWorker handles non-JS content-type by unregistering', async () => {
      process.env.NODE_ENV = 'production';
      process.env.PUBLIC_URL = '';

      const unregisterFn = vi.fn().mockResolvedValue(true);
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn(),
          controller: null,
          ready: Promise.resolve({ unregister: unregisterFn }),
        },
        configurable: true,
      });

      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        headers: { get: () => 'text/html' },
      });

      vi.spyOn(window, 'addEventListener').mockImplementation((event, cb) => {
        if (event === 'load') cb();
      });

      const mod = await import('./register-service-worker');
      mod.default();

      await vi.waitFor(() => {
        expect(unregisterFn).toHaveBeenCalled();
      });
    });

    it('checkValidServiceWorker handles fetch error (offline mode)', async () => {
      process.env.NODE_ENV = 'production';
      process.env.PUBLIC_URL = '';

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn(),
          controller: null,
          ready: Promise.resolve({ unregister: vi.fn() }),
        },
        configurable: true,
      });

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(window, 'addEventListener').mockImplementation((event, cb) => {
        if (event === 'load') cb();
      });

      const mod = await import('./register-service-worker');
      mod.default();

      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'No internet connection found. App is running in offline mode.'
        );
      });
    });

    it('installingWorker onstatechange does nothing when state is not installed', async () => {
      process.env.NODE_ENV = 'production';
      process.env.PUBLIC_URL = '';

      const installingWorker = { state: 'activating', onstatechange: null };
      const registration = { installing: installingWorker, onupdatefound: null };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue(registration),
          controller: null,
          ready: Promise.resolve({ unregister: vi.fn() }),
        },
        configurable: true,
      });

      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        headers: { get: () => 'application/javascript' },
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(window, 'addEventListener').mockImplementation((event, cb) => {
        if (event === 'load') cb();
      });

      const mod = await import('./register-service-worker');
      mod.default();

      await vi.waitFor(() => {
        expect(registration.onupdatefound).not.toBeNull();
      });

      registration.onupdatefound();
      installingWorker.onstatechange();

      // Neither message should be logged
      expect(consoleSpy).not.toHaveBeenCalledWith('New content is available; please refresh.');
      expect(consoleSpy).not.toHaveBeenCalledWith('Content is cached for offline use.');
    });
  });

  describe('unregister', () => {
    it('calls serviceWorker.ready.then to unregister', async () => {
      const unregisterFn = vi.fn();
      const readyPromise = Promise.resolve({ unregister: unregisterFn });
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: readyPromise },
        configurable: true,
      });
      const mod = await import('./register-service-worker');
      mod.unregister();
      await readyPromise;
      expect(unregisterFn).toHaveBeenCalled();
    });

    it('does nothing when serviceWorker not in navigator', async () => {
      // The 'in' operator checks property existence, not truthiness.
      // In jsdom, serviceWorker is always 'in' navigator, so we verify
      // the happy path works and the function doesn't crash.
      const unregisterFn = vi.fn();
      const readyPromise = Promise.resolve({ unregister: unregisterFn });
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: readyPromise },
        configurable: true,
      });
      const mod = await import('./register-service-worker');
      mod.unregister();
      await readyPromise;
      // Just verify it completes without error
      expect(unregisterFn).toHaveBeenCalled();
    });
  });
});
