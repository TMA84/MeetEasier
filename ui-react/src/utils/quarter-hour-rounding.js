/**
 * @file quarter-hour-rounding.js
 * @description Quarter-hour rounding utilities for booking end times.
 * Rounds any given time up to the next quarter-hour boundary (xx:00, xx:15, xx:30, xx:45).
 * This is the client-side (ES module) version used for instant preview in the UI.
 */

/**
 * The set of valid quarter-hour minute values.
 * @type {Set<number>}
 */
const QUARTER_HOUR_MINUTES = new Set([0, 15, 30, 45]);

/**
 * Checks whether a Date is exactly on a quarter-hour boundary.
 * A quarter-hour boundary has minutes ∈ {0, 15, 30, 45} and seconds = 0, milliseconds = 0.
 *
 * @param {Date} date - The date to check
 * @returns {boolean} true if the date is on a quarter-hour boundary
 */
export function isQuarterHourBoundary(date) {
  return (
    QUARTER_HOUR_MINUTES.has(date.getMinutes()) &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  );
}

/**
 * Rounds a Date up to the next quarter-hour boundary.
 * If the time is already on a boundary (minutes ∈ {0,15,30,45}, seconds=0, ms=0),
 * returns a new Date with the same time (unchanged).
 *
 * Handles hour rollover (minutes past 59 → increment hour) and
 * day rollover (hour past 23 → increment date, set to 00:00).
 *
 * @param {Date} date - The input date/time
 * @returns {Date} A new Date rounded up to the next quarter-hour boundary
 */
export function roundUpToQuarterHour(date) {
  // If already on a boundary, return a new Date with the same time
  if (isQuarterHourBoundary(date)) {
    return new Date(date.getTime());
  }

  // Create a new Date to avoid mutating the input
  const result = new Date(date.getTime());

  // Calculate the next quarter-hour minute value
  const currentMinutes = result.getMinutes();
  const nextQuarter = Math.ceil((currentMinutes + 1) / 15) * 15;

  // Set seconds and milliseconds to zero
  result.setSeconds(0);
  result.setMilliseconds(0);

  if (nextQuarter >= 60) {
    // Hour rollover: set minutes to 0, increment hour
    result.setMinutes(0);
    result.setHours(result.getHours() + 1);

    // Day rollover is handled automatically by JavaScript's Date
    // when hours exceed 23, the date increments
  } else {
    result.setMinutes(nextQuarter);
  }

  return result;
}
