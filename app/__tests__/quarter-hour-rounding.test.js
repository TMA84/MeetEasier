'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { roundUpToQuarterHour, isQuarterHourBoundary } = require('../quarter-hour-rounding');

describe('isQuarterHourBoundary', () => {
  it('should return true for exact quarter-hour boundaries', () => {
    assert.strictEqual(isQuarterHourBoundary(new Date('2024-01-15T10:00:00.000')), true);
    assert.strictEqual(isQuarterHourBoundary(new Date('2024-01-15T10:15:00.000')), true);
    assert.strictEqual(isQuarterHourBoundary(new Date('2024-01-15T10:30:00.000')), true);
    assert.strictEqual(isQuarterHourBoundary(new Date('2024-01-15T10:45:00.000')), true);
  });

  it('should return false when minutes are not on boundary', () => {
    assert.strictEqual(isQuarterHourBoundary(new Date('2024-01-15T10:03:00.000')), false);
    assert.strictEqual(isQuarterHourBoundary(new Date('2024-01-15T10:16:00.000')), false);
    assert.strictEqual(isQuarterHourBoundary(new Date('2024-01-15T10:44:00.000')), false);
  });

  it('should return false when seconds are non-zero', () => {
    assert.strictEqual(isQuarterHourBoundary(new Date('2024-01-15T10:15:01.000')), false);
    assert.strictEqual(isQuarterHourBoundary(new Date('2024-01-15T10:30:59.000')), false);
  });

  it('should return false when milliseconds are non-zero', () => {
    assert.strictEqual(isQuarterHourBoundary(new Date('2024-01-15T10:15:00.001')), false);
    assert.strictEqual(isQuarterHourBoundary(new Date('2024-01-15T10:45:00.999')), false);
  });
});

describe('roundUpToQuarterHour', () => {
  describe('exact boundaries remain unchanged', () => {
    it('should not change 10:00:00.000', () => {
      const input = new Date('2024-01-15T10:00:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), input.getTime());
    });

    it('should not change 10:15:00.000', () => {
      const input = new Date('2024-01-15T10:15:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), input.getTime());
    });

    it('should not change 10:30:00.000', () => {
      const input = new Date('2024-01-15T10:30:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), input.getTime());
    });

    it('should not change 10:45:00.000', () => {
      const input = new Date('2024-01-15T10:45:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), input.getTime());
    });

    it('should not change 00:00:00.000 (midnight)', () => {
      const input = new Date('2024-01-15T00:00:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), input.getTime());
    });
  });

  describe('rounding up to next quarter-hour', () => {
    it('should round 10:03:00.000 → 10:15:00.000', () => {
      const input = new Date('2024-01-15T10:03:00.000');
      const expected = new Date('2024-01-15T10:15:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), expected.getTime());
    });

    it('should round 10:16:00.000 → 10:30:00.000', () => {
      const input = new Date('2024-01-15T10:16:00.000');
      const expected = new Date('2024-01-15T10:30:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), expected.getTime());
    });

    it('should round 10:31:00.000 → 10:45:00.000', () => {
      const input = new Date('2024-01-15T10:31:00.000');
      const expected = new Date('2024-01-15T10:45:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), expected.getTime());
    });

    it('should round 10:01:00.000 → 10:15:00.000', () => {
      const input = new Date('2024-01-15T10:01:00.000');
      const expected = new Date('2024-01-15T10:15:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), expected.getTime());
    });

    it('should round 10:14:00.000 → 10:15:00.000', () => {
      const input = new Date('2024-01-15T10:14:00.000');
      const expected = new Date('2024-01-15T10:15:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), expected.getTime());
    });
  });

  describe('hour rollover', () => {
    it('should round 10:46:00.000 → 11:00:00.000', () => {
      const input = new Date('2024-01-15T10:46:00.000');
      const expected = new Date('2024-01-15T11:00:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), expected.getTime());
    });

    it('should round 10:59:00.000 → 11:00:00.000', () => {
      const input = new Date('2024-01-15T10:59:00.000');
      const expected = new Date('2024-01-15T11:00:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), expected.getTime());
    });

    it('should round 09:50:00.000 → 10:00:00.000', () => {
      const input = new Date('2024-01-15T09:50:00.000');
      const expected = new Date('2024-01-15T10:00:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), expected.getTime());
    });
  });

  describe('day rollover', () => {
    it('should round 23:46:00.000 → next day 00:00:00.000', () => {
      const input = new Date('2024-01-15T23:46:00.000');
      const expected = new Date('2024-01-16T00:00:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), expected.getTime());
    });

    it('should round 23:59:00.000 → next day 00:00:00.000', () => {
      const input = new Date('2024-01-15T23:59:00.000');
      const expected = new Date('2024-01-16T00:00:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), expected.getTime());
    });

    it('should handle month boundary (Jan 31 → Feb 1)', () => {
      const input = new Date('2024-01-31T23:50:00.000');
      const expected = new Date('2024-02-01T00:00:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), expected.getTime());
    });
  });

  describe('non-zero seconds/milliseconds trigger rounding', () => {
    it('should round 10:15:00.001 → 10:30:00.000', () => {
      const input = new Date('2024-01-15T10:15:00.001');
      const expected = new Date('2024-01-15T10:30:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), expected.getTime());
    });

    it('should round 10:15:01.000 → 10:30:00.000', () => {
      const input = new Date('2024-01-15T10:15:01.000');
      const expected = new Date('2024-01-15T10:30:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), expected.getTime());
    });

    it('should round 10:00:00.500 → 10:15:00.000', () => {
      const input = new Date('2024-01-15T10:00:00.500');
      const expected = new Date('2024-01-15T10:15:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), expected.getTime());
    });

    it('should round 10:30:59.999 → 10:45:00.000', () => {
      const input = new Date('2024-01-15T10:30:59.999');
      const expected = new Date('2024-01-15T10:45:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), expected.getTime());
    });

    it('should round 10:45:00.001 → 11:00:00.000 (hour rollover from non-zero ms)', () => {
      const input = new Date('2024-01-15T10:45:00.001');
      const expected = new Date('2024-01-15T11:00:00.000');
      const result = roundUpToQuarterHour(input);
      assert.strictEqual(result.getTime(), expected.getTime());
    });
  });

  describe('input is not mutated', () => {
    it('should return a new Date object, not the same reference', () => {
      const input = new Date('2024-01-15T10:15:00.000');
      const result = roundUpToQuarterHour(input);
      assert.notStrictEqual(result, input);
    });

    it('should not modify the original Date', () => {
      const input = new Date('2024-01-15T10:03:00.000');
      const originalTime = input.getTime();
      roundUpToQuarterHour(input);
      assert.strictEqual(input.getTime(), originalTime);
    });
  });
});
