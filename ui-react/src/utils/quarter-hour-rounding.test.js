import { describe, it, expect } from 'vitest';
import { roundUpToQuarterHour, isQuarterHourBoundary } from './quarter-hour-rounding';

describe('quarter-hour-rounding (client-side)', () => {
  describe('isQuarterHourBoundary', () => {
    it('returns true for 10:00:00.000', () => {
      expect(isQuarterHourBoundary(new Date(2024, 0, 15, 10, 0, 0, 0))).toBe(true);
    });

    it('returns true for 10:15:00.000', () => {
      expect(isQuarterHourBoundary(new Date(2024, 0, 15, 10, 15, 0, 0))).toBe(true);
    });

    it('returns true for 10:30:00.000', () => {
      expect(isQuarterHourBoundary(new Date(2024, 0, 15, 10, 30, 0, 0))).toBe(true);
    });

    it('returns true for 10:45:00.000', () => {
      expect(isQuarterHourBoundary(new Date(2024, 0, 15, 10, 45, 0, 0))).toBe(true);
    });

    it('returns false for 10:03:00.000', () => {
      expect(isQuarterHourBoundary(new Date(2024, 0, 15, 10, 3, 0, 0))).toBe(false);
    });

    it('returns false for 10:15:00.001 (non-zero milliseconds)', () => {
      expect(isQuarterHourBoundary(new Date(2024, 0, 15, 10, 15, 0, 1))).toBe(false);
    });

    it('returns false for 10:15:01.000 (non-zero seconds)', () => {
      expect(isQuarterHourBoundary(new Date(2024, 0, 15, 10, 15, 1, 0))).toBe(false);
    });
  });

  describe('roundUpToQuarterHour', () => {
    describe('exact boundaries remain unchanged', () => {
      it('10:00:00.000 → 10:00:00.000', () => {
        const input = new Date(2024, 0, 15, 10, 0, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('10:15:00.000 → 10:15:00.000', () => {
        const input = new Date(2024, 0, 15, 10, 15, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(15);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('10:30:00.000 → 10:30:00.000', () => {
        const input = new Date(2024, 0, 15, 10, 30, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(30);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('10:45:00.000 → 10:45:00.000', () => {
        const input = new Date(2024, 0, 15, 10, 45, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(45);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('00:00:00.000 → 00:00:00.000 (midnight)', () => {
        const input = new Date(2024, 0, 15, 0, 0, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('returns a new Date object (does not mutate input)', () => {
        const input = new Date(2024, 0, 15, 10, 15, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result).not.toBe(input);
        expect(result.getTime()).toBe(input.getTime());
      });
    });

    describe('rounding up to next quarter-hour', () => {
      it('10:01:00.000 → 10:15:00.000', () => {
        const input = new Date(2024, 0, 15, 10, 1, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(15);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('10:03:00.000 → 10:15:00.000', () => {
        const input = new Date(2024, 0, 15, 10, 3, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(15);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('10:14:00.000 → 10:15:00.000', () => {
        const input = new Date(2024, 0, 15, 10, 14, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(15);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('10:16:00.000 → 10:30:00.000', () => {
        const input = new Date(2024, 0, 15, 10, 16, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(30);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('10:29:00.000 → 10:30:00.000', () => {
        const input = new Date(2024, 0, 15, 10, 29, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(30);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('10:31:00.000 → 10:45:00.000', () => {
        const input = new Date(2024, 0, 15, 10, 31, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(45);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('10:44:00.000 → 10:45:00.000', () => {
        const input = new Date(2024, 0, 15, 10, 44, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(45);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });
    });

    describe('hour rollover', () => {
      it('10:46:00.000 → 11:00:00.000', () => {
        const input = new Date(2024, 0, 15, 10, 46, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(11);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('10:59:00.000 → 11:00:00.000', () => {
        const input = new Date(2024, 0, 15, 10, 59, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(11);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('14:50:00.000 → 15:00:00.000', () => {
        const input = new Date(2024, 0, 15, 14, 50, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(15);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });
    });

    describe('day rollover', () => {
      it('23:46:00.000 → next day 00:00:00.000', () => {
        const input = new Date(2024, 0, 15, 23, 46, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getDate()).toBe(16);
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('23:59:00.000 → next day 00:00:00.000', () => {
        const input = new Date(2024, 0, 15, 23, 59, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getDate()).toBe(16);
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('23:59:59.999 → next day 00:00:00.000', () => {
        const input = new Date(2024, 0, 15, 23, 59, 59, 999);
        const result = roundUpToQuarterHour(input);
        expect(result.getDate()).toBe(16);
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('handles month rollover (Jan 31 23:50 → Feb 1 00:00)', () => {
        const input = new Date(2024, 0, 31, 23, 50, 0, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getMonth()).toBe(1); // February
        expect(result.getDate()).toBe(1);
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
      });
    });

    describe('non-zero seconds/milliseconds trigger rounding', () => {
      it('10:15:00.001 → 10:30:00.000 (1ms past boundary)', () => {
        const input = new Date(2024, 0, 15, 10, 15, 0, 1);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(30);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('10:15:01.000 → 10:30:00.000 (1 second past boundary)', () => {
        const input = new Date(2024, 0, 15, 10, 15, 1, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(30);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('10:00:00.001 → 10:15:00.000 (1ms past :00 boundary)', () => {
        const input = new Date(2024, 0, 15, 10, 0, 0, 1);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(15);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('10:30:30.000 → 10:45:00.000 (30 seconds past boundary)', () => {
        const input = new Date(2024, 0, 15, 10, 30, 30, 0);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(45);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('10:45:00.500 → 11:00:00.000 (500ms past :45 boundary)', () => {
        const input = new Date(2024, 0, 15, 10, 45, 0, 500);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(11);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });

      it('10:07:45.123 → 10:15:00.000 (non-zero seconds and ms mid-quarter)', () => {
        const input = new Date(2024, 0, 15, 10, 7, 45, 123);
        const result = roundUpToQuarterHour(input);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(15);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });
    });

    describe('does not mutate input', () => {
      it('original date remains unchanged after rounding', () => {
        const input = new Date(2024, 0, 15, 10, 7, 30, 500);
        const originalTime = input.getTime();
        roundUpToQuarterHour(input);
        expect(input.getTime()).toBe(originalTime);
      });
    });
  });
});
