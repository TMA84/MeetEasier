import { describe, it, expect } from 'vitest';
import seats from './flightboard.seats';

describe('flightboard.seats', () => {
  it('exports an object with a capacity property', () => {
    expect(seats).toBeDefined();
    expect(seats).toHaveProperty('capacity');
    expect(typeof seats.capacity).toBe('object');
  });

  it('has string values for all capacity entries', () => {
    for (const [room, count] of Object.entries(seats.capacity)) {
      expect(typeof room).toBe('string');
      expect(typeof count).toBe('string');
      expect(parseInt(count, 10)).toBeGreaterThan(0);
    }
  });

  it('contains known room entries', () => {
    expect(seats.capacity).toHaveProperty('Sonne');
    expect(seats.capacity).toHaveProperty('Saturn');
  });
});
