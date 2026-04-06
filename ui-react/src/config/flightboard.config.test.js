import { describe, it, expect } from 'vitest';
import config from './flightboard.config';
import { getFlightboardDisplayTranslations } from './display-translations.js';

describe('flightboard.config', () => {
  it('exports the result of getFlightboardDisplayTranslations', () => {
    const expected = getFlightboardDisplayTranslations();
    expect(config).toEqual(expected);
  });

  it('contains board translations', () => {
    expect(config).toHaveProperty('board');
    expect(config.board).toHaveProperty('statusAvailable');
    expect(config.board).toHaveProperty('statusBusy');
    expect(config.board).toHaveProperty('nextUp');
  });

  it('contains navbar translations', () => {
    expect(config).toHaveProperty('navbar');
    expect(config.navbar).toHaveProperty('title');
  });

  it('contains roomFilter translations', () => {
    expect(config).toHaveProperty('roomFilter');
    expect(config.roomFilter).toHaveProperty('filterAllTitle');
  });
});
