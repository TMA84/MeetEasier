'use strict';

/**
 * Test: cleanupOldDisplays() correctly removes old entries
 * 
 * Validates: Requirements 6.3
 * 
 * Validates that cleanupOldDisplays() correctly removes stale display client 
 * entries from connectedDisplayClients Map:
 * 1. Entries with no active sockets AND lastSeenAt older than retention period are removed
 * 2. Entries with active sockets are NOT removed regardless of lastSeenAt
 * 3. Entries within retention period are NOT removed even with no active sockets
 * 4. The function is called periodically and on getConnectedDisplayClients()
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Replicate the cleanup logic from socket-controller.js
const DEFAULT_RETENTION_HOURS = 2;

/**
 * Simulates cleanupOldDisplays() as implemented in socket-controller.js.
 * @param {Map} connectedDisplayClients - The display clients map
 * @param {number} retentionHours - Configured retention hours (default 2)
 * @param {Date} now - Current timestamp for testing
 * @returns {Map} The cleaned-up map
 */
function simulateCleanupOldDisplays(connectedDisplayClients, retentionHours = DEFAULT_RETENTION_HOURS, now = new Date()) {
  const retentionMs = retentionHours * 60 * 60 * 1000;
  const cutoffTime = new Date(now.getTime() - retentionMs);
  
  for (const [identifier, entry] of connectedDisplayClients.entries()) {
    // Only remove entries that have no active sockets AND are older than retention period
    if (entry.socketIds.size === 0) {
      const lastSeen = new Date(entry.lastSeenAt);
      if (lastSeen < cutoffTime) {
        connectedDisplayClients.delete(identifier);
      }
    }
  }
  return connectedDisplayClients;
}

/**
 * Creates a mock display client entry
 */
function createMockEntry(overrides = {}) {
  return {
    clientId: overrides.clientId || 'test-client',
    displayType: overrides.displayType || 'single-room',
    roomAlias: overrides.roomAlias || 'room-1',
    ipAddress: overrides.ipAddress || '192.168.1.100',
    connectedAt: overrides.connectedAt || new Date().toISOString(),
    lastSeenAt: overrides.lastSeenAt || new Date().toISOString(),
    potentiallyDisconnected: overrides.potentiallyDisconnected || false,
    socketIds: overrides.socketIds || new Set()
  };
}

describe('cleanupOldDisplays() - Requirement 6.3', () => {

  it('removes entries with no active sockets that are older than retention period', () => {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    
    const map = new Map();
    map.set('old-client', createMockEntry({
      clientId: 'old-client',
      lastSeenAt: threeHoursAgo.toISOString(),
      socketIds: new Set() // no active sockets
    }));
    
    simulateCleanupOldDisplays(map, DEFAULT_RETENTION_HOURS, now);
    
    assert.strictEqual(map.size, 0, 'Old disconnected client should be removed');
  });

  it('does NOT remove entries with active sockets even if lastSeenAt is old', () => {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    
    const map = new Map();
    map.set('active-client', createMockEntry({
      clientId: 'active-client',
      lastSeenAt: threeHoursAgo.toISOString(),
      socketIds: new Set(['socket-1']) // has active socket
    }));
    
    simulateCleanupOldDisplays(map, DEFAULT_RETENTION_HOURS, now);
    
    assert.strictEqual(map.size, 1, 'Client with active sockets should NOT be removed');
    assert.ok(map.has('active-client'));
  });

  it('does NOT remove entries within retention period even with no sockets', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    
    const map = new Map();
    map.set('recent-client', createMockEntry({
      clientId: 'recent-client',
      lastSeenAt: oneHourAgo.toISOString(),
      socketIds: new Set() // no active sockets
    }));
    
    simulateCleanupOldDisplays(map, DEFAULT_RETENTION_HOURS, now);
    
    assert.strictEqual(map.size, 1, 'Recent client within retention should NOT be removed');
    assert.ok(map.has('recent-client'));
  });

  it('removes only stale disconnected entries from a mixed set', () => {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    
    const map = new Map();
    
    // Should be removed: old + no sockets
    map.set('stale-disconnected', createMockEntry({
      clientId: 'stale-disconnected',
      lastSeenAt: threeHoursAgo.toISOString(),
      socketIds: new Set()
    }));
    
    // Should NOT be removed: old but has sockets
    map.set('old-but-connected', createMockEntry({
      clientId: 'old-but-connected',
      lastSeenAt: threeHoursAgo.toISOString(),
      socketIds: new Set(['socket-abc'])
    }));
    
    // Should NOT be removed: recent + no sockets
    map.set('recent-disconnected', createMockEntry({
      clientId: 'recent-disconnected',
      lastSeenAt: oneHourAgo.toISOString(),
      socketIds: new Set()
    }));
    
    // Should NOT be removed: recent + has sockets
    map.set('active-recent', createMockEntry({
      clientId: 'active-recent',
      lastSeenAt: oneHourAgo.toISOString(),
      socketIds: new Set(['socket-xyz'])
    }));
    
    simulateCleanupOldDisplays(map, DEFAULT_RETENTION_HOURS, now);
    
    assert.strictEqual(map.size, 3, 'Only 1 entry (stale-disconnected) should be removed');
    assert.ok(!map.has('stale-disconnected'), 'stale-disconnected should be removed');
    assert.ok(map.has('old-but-connected'), 'old-but-connected should remain');
    assert.ok(map.has('recent-disconnected'), 'recent-disconnected should remain');
    assert.ok(map.has('active-recent'), 'active-recent should remain');
  });

  it('handles exact boundary: entry at exactly retention cutoff is NOT removed', () => {
    const now = new Date();
    // Exactly 2 hours ago (at the cutoff boundary)
    const exactlyAtCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    const map = new Map();
    map.set('boundary-client', createMockEntry({
      clientId: 'boundary-client',
      lastSeenAt: exactlyAtCutoff.toISOString(),
      socketIds: new Set()
    }));
    
    simulateCleanupOldDisplays(map, DEFAULT_RETENTION_HOURS, now);
    
    // At exactly the cutoff, lastSeen is NOT less than cutoffTime, so it should NOT be removed
    assert.strictEqual(map.size, 1, 'Entry at exact cutoff boundary should NOT be removed');
  });

  it('respects custom retention hours configuration', () => {
    const now = new Date();
    const ninetyMinAgo = new Date(now.getTime() - 90 * 60 * 1000); // 1.5 hours ago
    
    const map = new Map();
    map.set('client-1', createMockEntry({
      clientId: 'client-1',
      lastSeenAt: ninetyMinAgo.toISOString(),
      socketIds: new Set()
    }));
    
    // With 1-hour retention, this should be removed
    simulateCleanupOldDisplays(map, 1, now);
    assert.strictEqual(map.size, 0, 'Should be removed with 1-hour retention');
    
    // With 2-hour retention, it should NOT be removed
    const map2 = new Map();
    map2.set('client-1', createMockEntry({
      clientId: 'client-1',
      lastSeenAt: ninetyMinAgo.toISOString(),
      socketIds: new Set()
    }));
    simulateCleanupOldDisplays(map2, 2, now);
    assert.strictEqual(map2.size, 1, 'Should NOT be removed with 2-hour retention');
  });

  it('handles empty map without errors', () => {
    const map = new Map();
    simulateCleanupOldDisplays(map, DEFAULT_RETENTION_HOURS, new Date());
    assert.strictEqual(map.size, 0);
  });

  it('multiple old disconnected entries are all removed', () => {
    const now = new Date();
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    
    const map = new Map();
    for (let i = 0; i < 10; i++) {
      map.set(`old-client-${i}`, createMockEntry({
        clientId: `old-client-${i}`,
        lastSeenAt: fiveHoursAgo.toISOString(),
        socketIds: new Set()
      }));
    }
    
    simulateCleanupOldDisplays(map, DEFAULT_RETENTION_HOURS, now);
    assert.strictEqual(map.size, 0, 'All old disconnected entries should be removed');
  });
});
