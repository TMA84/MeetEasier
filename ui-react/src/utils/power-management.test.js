import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PowerManagement, { initPowerManagement, getPowerManagement } from './power-management';

describe('PowerManagement', () => {
  let pm;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    pm = new PowerManagement('client-1');
  });

  afterEach(() => {
    pm.destroy();
  });

  describe('constructor', () => {
    it('initializes with default state', () => {
      expect(pm.clientId).toBe('client-1');
      expect(pm.config).toBeNull();
      expect(pm.isDisplayOff).toBe(false);
      expect(pm.initialized).toBe(false);
    });
  });

  describe('init', () => {
    it('fetches config and starts schedule when enabled', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ schedule: { enabled: true, startTime: '20:00', endTime: '07:00' }, mode: 'browser' }),
      });
      await pm.init();
      expect(pm.initialized).toBe(true);
      expect(pm.config.schedule.enabled).toBe(true);
    });

    it('does not initialize when schedule is disabled', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ schedule: { enabled: false } }),
      });
      await pm.init();
      expect(pm.initialized).toBe(false);
    });

    it('handles fetch error gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      await pm.init();
      expect(pm.initialized).toBe(false);
    });

    it('handles non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
      await pm.init();
      expect(pm.initialized).toBe(false);
    });

    it('skips if already initialized', async () => {
      pm.initialized = true;
      global.fetch = vi.fn();
      await pm.init();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('isTimeInRange', () => {
    it('returns true for time within same-day range', () => {
      expect(pm.isTimeInRange('13:00', '12:00', '14:00')).toBe(true);
    });

    it('returns false for time outside same-day range', () => {
      expect(pm.isTimeInRange('11:00', '12:00', '14:00')).toBe(false);
    });

    it('handles overnight range (start > end)', () => {
      expect(pm.isTimeInRange('21:00', '20:00', '07:00')).toBe(true);
      expect(pm.isTimeInRange('05:00', '20:00', '07:00')).toBe(true);
      expect(pm.isTimeInRange('12:00', '20:00', '07:00')).toBe(false);
    });
  });

  describe('turnDisplayOff / turnDisplayOn', () => {
    it('creates overlay when turning off', () => {
      pm.turnDisplayOff();
      expect(pm.isDisplayOff).toBe(true);
      expect(document.getElementById('power-management-overlay')).toBeTruthy();
    });

    it('removes overlay when turning on', () => {
      pm.turnDisplayOff();
      pm.turnDisplayOn();
      expect(pm.isDisplayOff).toBe(false);
      expect(document.getElementById('power-management-overlay')).toBeNull();
    });

    it('does not create duplicate overlays', () => {
      pm.turnDisplayOff();
      pm.turnDisplayOff();
      expect(document.querySelectorAll('#power-management-overlay').length).toBe(1);
    });

    it('clicking overlay turns display on', () => {
      pm.turnDisplayOff();
      const overlay = document.getElementById('power-management-overlay');
      overlay.click();
      expect(pm.isDisplayOff).toBe(false);
    });
  });

  describe('checkSchedule', () => {
    it('does nothing when schedule is not enabled', () => {
      pm.config = { schedule: { enabled: false } };
      pm.checkSchedule();
      expect(pm.isDisplayOff).toBe(false);
    });

    it('turns off on weekend when weekendMode is true', () => {
      pm.config = { schedule: { enabled: true, startTime: '20:00', endTime: '07:00', weekendMode: true } };
      const saturday = new Date('2024-01-06T12:00:00'); // Saturday
      vi.setSystemTime(saturday);
      pm.checkSchedule();
      expect(pm.isDisplayOff).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('destroy', () => {
    it('cleans up resources', () => {
      pm.turnDisplayOff();
      pm.initialized = true;
      pm.destroy();
      expect(pm.initialized).toBe(false);
      expect(document.getElementById('power-management-overlay')).toBeNull();
    });
  });
});

describe('initPowerManagement', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ schedule: { enabled: false } }),
    });
  });

  it('returns null when no clientId provided', () => {
    expect(initPowerManagement('')).toBeNull();
    expect(initPowerManagement(null)).toBeNull();
  });

  it('creates a new instance', () => {
    const instance = initPowerManagement('test-client');
    expect(instance).toBeInstanceOf(PowerManagement);
    instance.destroy();
  });

  it('returns existing instance for same clientId', () => {
    const first = initPowerManagement('same-client');
    const second = initPowerManagement('same-client');
    expect(first).toBe(second);
    first.destroy();
  });

  it('getPowerManagement returns current instance', () => {
    const instance = initPowerManagement('get-test');
    expect(getPowerManagement()).toBe(instance);
    instance.destroy();
  });
});
