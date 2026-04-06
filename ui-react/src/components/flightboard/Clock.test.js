import { describe, it, expect } from 'vitest';
import Clock from './Clock';
import SharedClock from '../shared/Clock';

describe('Flightboard Clock', () => {
  it('re-exports the shared Clock component', () => {
    expect(Clock).toBe(SharedClock);
  });

  it('is a valid React component', () => {
    expect(typeof Clock).toBe('function');
  });
});
