import { describe, it, expect } from 'vitest';
import { hexToHSL, hslToHex } from './color-helpers';

describe('color-helpers', () => {
  describe('hexToHSL', () => {
    it('converts pure red', () => {
      const result = hexToHSL('#ff0000');
      expect(result).toEqual({ h: 0, s: 100, l: 50 });
    });

    it('converts pure green', () => {
      const result = hexToHSL('#00ff00');
      expect(result).toEqual({ h: 120, s: 100, l: 50 });
    });

    it('converts pure blue', () => {
      const result = hexToHSL('#0000ff');
      expect(result).toEqual({ h: 240, s: 100, l: 50 });
    });

    it('converts white', () => {
      const result = hexToHSL('#ffffff');
      expect(result).toEqual({ h: 0, s: 0, l: 100 });
    });

    it('converts black', () => {
      const result = hexToHSL('#000000');
      expect(result).toEqual({ h: 0, s: 0, l: 0 });
    });

    it('converts gray (achromatic)', () => {
      const result = hexToHSL('#808080');
      expect(result.s).toBe(0);
      expect(result.l).toBeCloseTo(50, 0);
    });

    it('handles hex without # prefix', () => {
      const result = hexToHSL('ff0000');
      expect(result).toEqual({ h: 0, s: 100, l: 50 });
    });

    it('returns default for invalid hex', () => {
      const result = hexToHSL('not-a-color');
      expect(result).toEqual({ h: 0, s: 0, l: 50 });
    });

    it('returns default for empty string', () => {
      const result = hexToHSL('');
      expect(result).toEqual({ h: 0, s: 0, l: 50 });
    });

    it('converts yellow correctly', () => {
      const result = hexToHSL('#ffff00');
      expect(result).toEqual({ h: 60, s: 100, l: 50 });
    });

    it('converts cyan correctly', () => {
      const result = hexToHSL('#00ffff');
      expect(result).toEqual({ h: 180, s: 100, l: 50 });
    });

    it('handles lightness > 0.5 for saturation calculation', () => {
      // Light pink - lightness > 0.5
      const result = hexToHSL('#ffcccc');
      expect(result.l).toBeGreaterThan(50);
      expect(result.s).toBeGreaterThan(0);
    });
  });

  describe('hslToHex', () => {
    it('converts red HSL to hex', () => {
      expect(hslToHex(0, 100, 50)).toBe('#ff0000');
    });

    it('converts green HSL to hex', () => {
      expect(hslToHex(120, 100, 50)).toBe('#00ff00');
    });

    it('converts blue HSL to hex', () => {
      expect(hslToHex(240, 100, 50)).toBe('#0000ff');
    });

    it('converts white', () => {
      expect(hslToHex(0, 0, 100)).toBe('#ffffff');
    });

    it('converts black', () => {
      expect(hslToHex(0, 0, 0)).toBe('#000000');
    });

    it('converts gray (zero saturation)', () => {
      const result = hslToHex(0, 0, 50);
      expect(result).toBe('#808080');
    });

    it('converts yellow', () => {
      expect(hslToHex(60, 100, 50)).toBe('#ffff00');
    });

    it('converts cyan', () => {
      expect(hslToHex(180, 100, 50)).toBe('#00ffff');
    });

    it('handles lightness < 0.5 for q calculation', () => {
      const result = hslToHex(0, 100, 25);
      expect(result).toBe('#800000');
    });

    it('handles lightness >= 0.5 for q calculation', () => {
      const result = hslToHex(0, 100, 75);
      expect(result).toBe('#ff8080');
    });
  });

  describe('roundtrip conversion', () => {
    it('hex -> HSL -> hex roundtrip for red', () => {
      const hsl = hexToHSL('#ff0000');
      const hex = hslToHex(hsl.h, hsl.s, hsl.l);
      expect(hex).toBe('#ff0000');
    });

    it('hex -> HSL -> hex roundtrip for blue', () => {
      const hsl = hexToHSL('#0000ff');
      const hex = hslToHex(hsl.h, hsl.s, hsl.l);
      expect(hex).toBe('#0000ff');
    });
  });
});
