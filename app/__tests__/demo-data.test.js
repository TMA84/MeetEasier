'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  generateDemoRooms,
  getDemoRoomlists,
  getDemoRoomsSnapshot,
  bookDemoRoom,
  isDemoEmail,
  getDemoDisplays,
  DEMO_ROOMS
} = require('../demo-data');

describe('isDemoEmail', () => {
  it('should return true for demo emails', () => {
    assert.strictEqual(isDemoEmail('room1@demo.meeteasier.local'), true);
  });

  it('should return false for non-demo emails', () => {
    assert.strictEqual(isDemoEmail('room1@company.com'), false);
  });

  it('should handle null/undefined gracefully', () => {
    assert.strictEqual(isDemoEmail(null), false);
    assert.strictEqual(isDemoEmail(undefined), false);
    assert.strictEqual(isDemoEmail(''), false);
  });
});

describe('DEMO_ROOMS', () => {
  it('should be a non-empty array', () => {
    assert.ok(Array.isArray(DEMO_ROOMS));
    assert.ok(DEMO_ROOMS.length > 0);
  });

  it('should have rooms with required properties', () => {
    for (const room of DEMO_ROOMS) {
      assert.ok(room.Name, 'Room should have a Name');
      assert.ok(room.Email, 'Room should have an Email');
      assert.ok(room.Email.endsWith('@demo.meeteasier.local'));
    }
  });
});

describe('generateDemoRooms', () => {
  it('should return an array of rooms', () => {
    const rooms = generateDemoRooms();
    assert.ok(Array.isArray(rooms));
    assert.ok(rooms.length > 0);
  });

  it('should return rooms with appointments', () => {
    const rooms = generateDemoRooms();
    for (const room of rooms) {
      assert.ok(room.Name, 'Room should have Name');
      assert.ok(room.Email, 'Room should have Email');
      assert.ok(Array.isArray(room.Appointments), 'Room should have Appointments array');
    }
  });
});

describe('getDemoRoomlists', () => {
  it('should return an array of room lists', () => {
    const lists = getDemoRoomlists();
    assert.ok(Array.isArray(lists));
    assert.ok(lists.length > 0);
  });

  it('should have lists with displayName', () => {
    const lists = getDemoRoomlists();
    for (const list of lists) {
      assert.ok(list.displayName, 'List should have a displayName');
    }
  });
});

describe('getDemoRoomsSnapshot', () => {
  it('should return an array', () => {
    const snapshot = getDemoRoomsSnapshot();
    assert.ok(Array.isArray(snapshot));
  });
});

describe('getDemoDisplays', () => {
  it('should return an array of display objects', () => {
    const displays = getDemoDisplays();
    assert.ok(Array.isArray(displays));
    assert.ok(displays.length > 0);
  });
});

describe('bookDemoRoom', () => {
  it('should book a room and return result without error', () => {
    const rooms = generateDemoRooms();
    const email = rooms[0].Email;
    const start = new Date();
    const end = new Date(start.getTime() + 30 * 60000);
    const result = bookDemoRoom(email, 'Test Meeting', start.toISOString(), end.toISOString());
    assert.strictEqual(result.error, false);
    assert.ok(result.id);
  });
});
