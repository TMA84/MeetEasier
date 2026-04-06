import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDisplayClientId } from './display-client-id';

describe('display-client-id', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generates and stores a client ID on first call', () => {
    const id = getDisplayClientId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(3);
    expect(localStorage.getItem('meeteasier_display_client_id')).toBe(id);
  });

  it('returns the same ID on subsequent calls', () => {
    const id1 = getDisplayClientId();
    const id2 = getDisplayClientId();
    expect(id1).toBe(id2);
  });

  it('generates a new ID if stored value is invalid', () => {
    localStorage.setItem('meeteasier_display_client_id', '!!invalid!!');
    const id = getDisplayClientId();
    expect(id).not.toBe('!!invalid!!');
    expect(id.length).toBeGreaterThan(3);
  });

  it('returns stored ID if it matches the valid pattern', () => {
    localStorage.setItem('meeteasier_display_client_id', 'valid-client-id-123');
    const id = getDisplayClientId();
    expect(id).toBe('valid-client-id-123');
  });

  it('handles localStorage errors gracefully', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });
    const id = getDisplayClientId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
    getItemSpy.mockRestore();
  });
});
