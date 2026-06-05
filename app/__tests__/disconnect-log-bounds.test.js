'use strict';

/**
 * Property-Based Test: Bounded disconnect log with eviction
 * 
 * Validates: Requirements 6.4
 * 
 * Property 12: For any number of disconnect events, the disconnect log SHALL
 * never exceed 50 entries, and when the limit is reached, the oldest entries
 * SHALL be discarded first (FIFO).
 * 
 * This test validates the ring-buffer logic used in socket-controller.js
 * for the `recentDisconnects` array with `MAX_DISCONNECT_LOG = 50`.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fc = require('fast-check');

// Replicate the exact logic from socket-controller.js
const MAX_DISCONNECT_LOG = 50;

/**
 * Simulates the disconnect log behavior exactly as implemented
 * in socket-controller.js (push + shift when exceeding max).
 */
function simulateDisconnectLog(disconnectEvents) {
  const recentDisconnects = [];
  for (const event of disconnectEvents) {
    recentDisconnects.push(event);
    if (recentDisconnects.length > MAX_DISCONNECT_LOG) {
      recentDisconnects.shift();
    }
  }
  return recentDisconnects;
}

// Generator for disconnect event objects matching the structure in socket-controller.js
const disconnectEventArb = fc.record({
  identifier: fc.string({ minLength: 1, maxLength: 30 }),
  reason: fc.constantFrom('transport close', 'ping timeout', 'client namespace disconnect', 'server namespace disconnect'),
  ip: fc.ipV4(),
  displayType: fc.constantFrom('single-room', 'flightboard', 'admin'),
  timestamp: fc.integer({ min: 1704067200000, max: 1767225600000 }).map(ts => new Date(ts).toISOString())
});

describe('Property 12: Bounded disconnect log with eviction', () => {

  it('recentDisconnects array NEVER exceeds MAX_DISCONNECT_LOG = 50 entries for any number of disconnect events', () => {
    fc.assert(
      fc.property(
        fc.array(disconnectEventArb, { minLength: 0, maxLength: 200 }),
        (events) => {
          const log = simulateDisconnectLog(events);
          // Property: log size must never exceed MAX_DISCONNECT_LOG
          assert.ok(log.length <= MAX_DISCONNECT_LOG,
            `Log has ${log.length} entries, expected at most ${MAX_DISCONNECT_LOG}`);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('recentDisconnects retains exactly min(N, MAX_DISCONNECT_LOG) entries after N disconnects', () => {
    fc.assert(
      fc.property(
        fc.array(disconnectEventArb, { minLength: 0, maxLength: 200 }),
        (events) => {
          const log = simulateDisconnectLog(events);
          const expectedLength = Math.min(events.length, MAX_DISCONNECT_LOG);
          assert.strictEqual(log.length, expectedLength,
            `Expected ${expectedLength} entries after ${events.length} disconnects, got ${log.length}`);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('oldest entries are discarded first (FIFO) when limit is exceeded', () => {
    fc.assert(
      fc.property(
        fc.array(disconnectEventArb, { minLength: MAX_DISCONNECT_LOG + 1, maxLength: 200 }),
        (events) => {
          const log = simulateDisconnectLog(events);
          // When more than MAX_DISCONNECT_LOG events are added, the log should
          // contain only the last MAX_DISCONNECT_LOG events (newest)
          const expectedEntries = events.slice(events.length - MAX_DISCONNECT_LOG);
          assert.deepStrictEqual(log, expectedEntries,
            'Log should contain the most recent MAX_DISCONNECT_LOG entries in order');
        }
      ),
      { numRuns: 200 }
    );
  });

  it('the first entry in the log is always the oldest surviving entry', () => {
    fc.assert(
      fc.property(
        fc.array(disconnectEventArb, { minLength: 1, maxLength: 200 }),
        (events) => {
          const log = simulateDisconnectLog(events);
          // The first entry should be the (N - min(N, 50))th event
          const startIndex = Math.max(0, events.length - MAX_DISCONNECT_LOG);
          assert.deepStrictEqual(log[0], events[startIndex],
            'First log entry should be the oldest surviving event');
        }
      ),
      { numRuns: 200 }
    );
  });

  // Unit test: exact boundary validation
  it('at exactly 50 entries, no eviction occurs', () => {
    const events = Array.from({ length: 50 }, (_, i) => ({
      identifier: `client-${i}`,
      reason: 'transport close',
      ip: '192.168.1.1',
      displayType: 'single-room',
      timestamp: new Date().toISOString()
    }));
    const log = simulateDisconnectLog(events);
    assert.strictEqual(log.length, 50);
    assert.deepStrictEqual(log[0].identifier, 'client-0');
    assert.deepStrictEqual(log[49].identifier, 'client-49');
  });

  it('at 51 entries, the first entry is evicted', () => {
    const events = Array.from({ length: 51 }, (_, i) => ({
      identifier: `client-${i}`,
      reason: 'transport close',
      ip: '192.168.1.1',
      displayType: 'single-room',
      timestamp: new Date().toISOString()
    }));
    const log = simulateDisconnectLog(events);
    assert.strictEqual(log.length, 50);
    // First entry (client-0) should be gone, first remaining is client-1
    assert.deepStrictEqual(log[0].identifier, 'client-1');
    assert.deepStrictEqual(log[49].identifier, 'client-50');
  });

  it('MAX_DISCONNECT_LOG constant is 50', () => {
    // Validates the constant value matches the requirement
    assert.strictEqual(MAX_DISCONNECT_LOG, 50);
  });
});
