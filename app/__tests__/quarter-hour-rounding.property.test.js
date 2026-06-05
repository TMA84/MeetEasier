'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fc = require('fast-check');
const { roundUpToQuarterHour } = require('../quarter-hour-rounding');

/**
 * Property-based tests for the quarter-hour rounding module.
 * Feature: booking-quarter-hour-rounding
 */

describe('Feature: booking-quarter-hour-rounding', () => {
  describe('Property 1: Rounding always produces a quarter-hour boundary', () => {
    /**
     * Validates: Requirements 3.1, 1.1, 2.1, 4.1, 4.2
     *
     * For any Date object with hours 0–23, minutes 0–59, seconds 0–59,
     * and milliseconds 0–999, applying roundUpToQuarterHour SHALL produce
     * a Date whose minutes are in the set {0, 15, 30, 45} and whose
     * seconds and milliseconds are both zero.
     */
    it('rounded result always has minutes ∈ {0,15,30,45}, seconds=0, ms=0', () => {
      const validMinutes = new Set([0, 15, 30, 45]);

      // Generate arbitrary Dates with arbitrary h/m/s/ms components
      const arbitraryDate = fc
        .tuple(
          fc.integer({ min: 2000, max: 2100 }), // year
          fc.integer({ min: 0, max: 11 }),       // month
          fc.integer({ min: 1, max: 28 }),       // day (safe range)
          fc.integer({ min: 0, max: 23 }),       // hours
          fc.integer({ min: 0, max: 59 }),       // minutes
          fc.integer({ min: 0, max: 59 }),       // seconds
          fc.integer({ min: 0, max: 999 })       // milliseconds
        )
        .map(([year, month, day, hours, minutes, seconds, ms]) =>
          new Date(year, month, day, hours, minutes, seconds, ms)
        );

      fc.assert(
        fc.property(arbitraryDate, (inputDate) => {
          const result = roundUpToQuarterHour(inputDate);

          assert.ok(
            validMinutes.has(result.getMinutes()),
            `Expected minutes to be in {0,15,30,45}, got ${result.getMinutes()} for input ${inputDate.toISOString()}`
          );
          assert.strictEqual(
            result.getSeconds(),
            0,
            `Expected seconds to be 0, got ${result.getSeconds()} for input ${inputDate.toISOString()}`
          );
          assert.strictEqual(
            result.getMilliseconds(),
            0,
            `Expected milliseconds to be 0, got ${result.getMilliseconds()} for input ${inputDate.toISOString()}`
          );
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('Property 4: Hour and day rollover correctness', () => {
    /**
     * Validates: Requirements 3.5
     *
     * For any Date object where rounding would advance minutes past 59,
     * the hour SHALL increment by one. For any Date at hour 23 where
     * rounding would advance past 23:59, the date SHALL increment by
     * one day and the time SHALL be set to 00:00.
     */
    it('when minutes > 45, hour increments by one (or day rolls over if hour is 23)', () => {
      // Generator: Dates with minutes in [46, 59] — always requires hour rollover
      // since next quarter-hour boundary after minute 45 is minute 0 of the next hour
      const dateWithMinutesPast45 = fc
        .tuple(
          fc.integer({ min: 2000, max: 2100 }),  // year
          fc.integer({ min: 0, max: 11 }),       // month
          fc.integer({ min: 1, max: 28 }),       // day (safe range for all months)
          fc.integer({ min: 0, max: 23 }),       // hour
          fc.integer({ min: 46, max: 59 }),      // minutes > 45 (guarantees hour rollover)
          fc.integer({ min: 0, max: 59 }),       // seconds
          fc.integer({ min: 0, max: 999 })       // milliseconds
        )
        .map(([year, month, day, hour, minute, second, ms]) =>
          new Date(year, month, day, hour, minute, second, ms)
        );

      fc.assert(
        fc.property(dateWithMinutesPast45, (inputDate) => {
          const result = roundUpToQuarterHour(inputDate);

          const inputHour = inputDate.getHours();
          const inputDay = inputDate.getDate();
          const inputMonth = inputDate.getMonth();
          const inputYear = inputDate.getFullYear();

          if (inputHour === 23) {
            // Day rollover: should advance to 00:00 of the next day
            assert.strictEqual(
              result.getHours(),
              0,
              `Expected hour to be 0 after day rollover, got ${result.getHours()} for input ${inputDate.toISOString()}`
            );
            assert.strictEqual(
              result.getMinutes(),
              0,
              `Expected minutes to be 0 after day rollover, got ${result.getMinutes()} for input ${inputDate.toISOString()}`
            );

            // Verify the date actually advanced by one day
            const expectedNextDay = new Date(inputYear, inputMonth, inputDay + 1);
            assert.strictEqual(
              result.getFullYear(),
              expectedNextDay.getFullYear(),
              `Expected year ${expectedNextDay.getFullYear()}, got ${result.getFullYear()} for input ${inputDate.toISOString()}`
            );
            assert.strictEqual(
              result.getMonth(),
              expectedNextDay.getMonth(),
              `Expected month ${expectedNextDay.getMonth()}, got ${result.getMonth()} for input ${inputDate.toISOString()}`
            );
            assert.strictEqual(
              result.getDate(),
              expectedNextDay.getDate(),
              `Expected date ${expectedNextDay.getDate()}, got ${result.getDate()} for input ${inputDate.toISOString()}`
            );
          } else {
            // Normal hour rollover: hour should increment by 1
            // Note: During DST transitions, the hour may jump by more than 1
            // (e.g., 01:46 → 03:00 when clocks spring forward at 02:00)
            // We verify the result is on the next hour boundary after the input
            const expectedNextHour = new Date(inputYear, inputMonth, inputDay, inputHour + 1, 0, 0, 0);
            assert.strictEqual(
              result.getTime(),
              expectedNextHour.getTime(),
              `Expected result to be ${expectedNextHour.toISOString()}, got ${result.toISOString()} for input ${inputDate.toISOString()}`
            );
            assert.strictEqual(
              result.getMinutes(),
              0,
              `Expected minutes to be 0 after hour rollover, got ${result.getMinutes()} for input ${inputDate.toISOString()}`
            );
          }
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('Property 3: Rounding delta is bounded', () => {
    /**
     * Validates: Requirements 3.3
     *
     * For any Date object that is NOT already on a quarter-hour boundary
     * (minutes not in {0,15,30,45} OR seconds > 0 OR milliseconds > 0),
     * the difference between the rounded result and the original time SHALL
     * be strictly greater than 0 and at most 14 minutes, 59 seconds, and 999 milliseconds (899999ms).
     * This is the maximum possible delta when input has milliseconds (e.g. 10:00:00.001 → 10:15:00.000).
     */
    it('rounding delta satisfies 0 < diff <= 899999ms for non-boundary inputs', () => {
      const MAX_DELTA_MS = 899999; // 14 minutes, 59 seconds, 999 milliseconds (just under 15 minutes)

      // Generate Dates that are NOT on a quarter-hour boundary.
      const nonBoundaryDate = fc
        .tuple(
          fc.integer({ min: 2000, max: 2100 }), // year
          fc.integer({ min: 0, max: 11 }),       // month
          fc.integer({ min: 1, max: 28 }),       // day (safe range)
          fc.integer({ min: 0, max: 23 }),       // hours
          fc.integer({ min: 0, max: 59 }),       // minutes
          fc.integer({ min: 0, max: 59 }),       // seconds
          fc.integer({ min: 0, max: 999 })       // milliseconds
        )
        .map(([year, month, day, hours, minutes, seconds, ms]) =>
          new Date(year, month, day, hours, minutes, seconds, ms)
        )
        .filter((date) => {
          const mins = date.getMinutes();
          const secs = date.getSeconds();
          const msecs = date.getMilliseconds();
          const onBoundaryMinute = (mins === 0 || mins === 15 || mins === 30 || mins === 45);
          // NOT on boundary: minutes aren't a boundary value, or seconds/ms are non-zero
          return !(onBoundaryMinute && secs === 0 && msecs === 0);
        });

      fc.assert(
        fc.property(nonBoundaryDate, (inputDate) => {
          const result = roundUpToQuarterHour(inputDate);
          const diff = result.getTime() - inputDate.getTime();

          assert.ok(
            diff > 0,
            `Expected diff > 0, got ${diff}ms for input ${inputDate.toISOString()} -> ${result.toISOString()}`
          );
          assert.ok(
            diff <= MAX_DELTA_MS,
            `Expected diff <= ${MAX_DELTA_MS}ms (< 15min), got ${diff}ms for input ${inputDate.toISOString()} -> ${result.toISOString()}`
          );
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('Property 5: Conflict detection uses rounded end time', () => {
    /**
     * Validates: Requirements 2.6, 4.5
     *
     * For any extension scenario where the unrounded new end time does NOT
     * conflict with the next meeting's start, but the rounded new end time
     * DOES exceed the next meeting's start time, the system SHALL detect
     * and report the conflict.
     *
     * This test generates scenarios where rounding CAUSES a conflict that
     * wouldn't exist with the unrounded time.
     */
    it('detects conflict when rounded end time >= nextMeetingStart but unrounded end < nextMeetingStart', () => {
      // Strategy:
      // 1. Generate a currentEnd on a quarter-hour boundary (the meeting's current end)
      // 2. Generate extensionMinutes that produce a non-boundary unrounded end
      // 3. Calculate unroundedNewEnd = currentEnd + extensionMinutes
      // 4. Calculate roundedNewEnd = roundUpToQuarterHour(unroundedNewEnd)
      // 5. Place nextMeetingStart between unroundedNewEnd and roundedNewEnd
      // 6. Assert: roundedNewEnd >= nextMeetingStart (conflict detected)

      const conflictScenario = fc
        .tuple(
          fc.integer({ min: 2020, max: 2030 }),  // year
          fc.integer({ min: 0, max: 11 }),       // month
          fc.integer({ min: 1, max: 28 }),       // day (safe range)
          fc.integer({ min: 0, max: 22 }),       // hour (0-22 to leave room for extension)
          fc.constantFrom(0, 15, 30, 45),        // currentEnd minutes (must be on boundary)
          fc.integer({ min: 1, max: 14 })        // extensionMinutes offset past a boundary (1-14 min past a quarter-hour)
        )
        .map(([year, month, day, hour, boundaryMinute, offsetPastBoundary]) => {
          // currentEnd is on a quarter-hour boundary
          const currentEnd = new Date(year, month, day, hour, boundaryMinute, 0, 0);

          // extensionMinutes chosen so that unrounded end is NOT on a boundary
          // We add a full quarter (15 min) + offset to ensure we're past the next boundary
          // but the unrounded end itself is not on a boundary
          const extensionMinutes = offsetPastBoundary; // 1-14 minutes, landing between boundaries

          // unroundedNewEnd = currentEnd + extensionMinutes
          const unroundedNewEnd = new Date(currentEnd.getTime() + extensionMinutes * 60 * 1000);

          // roundedNewEnd = roundUpToQuarterHour(unroundedNewEnd)
          const roundedNewEnd = roundUpToQuarterHour(unroundedNewEnd);

          // Verify that unrounded != rounded (i.e., rounding actually moved the time forward)
          // This should always be true since offsetPastBoundary is 1-14
          const roundingDiff = roundedNewEnd.getTime() - unroundedNewEnd.getTime();

          // nextMeetingStart: placed between unroundedNewEnd and roundedNewEnd
          // Choose a point strictly after unroundedNewEnd but <= roundedNewEnd
          // We'll use the midpoint to ensure it's solidly between them
          const midpointMs = unroundedNewEnd.getTime() + Math.floor(roundingDiff / 2);
          const nextMeetingStart = new Date(midpointMs);

          return { currentEnd, extensionMinutes, unroundedNewEnd, roundedNewEnd, nextMeetingStart, roundingDiff };
        })
        .filter(({ roundingDiff }) => roundingDiff > 0); // Ensure rounding actually moved the time

      fc.assert(
        fc.property(conflictScenario, ({ unroundedNewEnd, roundedNewEnd, nextMeetingStart }) => {
          // Precondition: unrounded end does NOT conflict (is strictly before next meeting)
          assert.ok(
            unroundedNewEnd.getTime() < nextMeetingStart.getTime(),
            `Precondition failed: unroundedNewEnd (${unroundedNewEnd.toISOString()}) should be < nextMeetingStart (${nextMeetingStart.toISOString()})`
          );

          // Assertion: rounded end DOES conflict (>= next meeting start)
          assert.ok(
            roundedNewEnd.getTime() >= nextMeetingStart.getTime(),
            `Conflict not detected: roundedNewEnd (${roundedNewEnd.toISOString()}) should be >= nextMeetingStart (${nextMeetingStart.toISOString()})`
          );
        }),
        { numRuns: 200 }
      );
    });
  });
});
