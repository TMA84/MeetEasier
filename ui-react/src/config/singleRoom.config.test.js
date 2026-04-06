import { describe, it, expect } from 'vitest';
import config from './singleRoom.config';

describe('singleRoom.config', () => {
  it('exports a configuration object', () => {
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  it('has status translations', () => {
    expect(config.statusAvailable).toBeDefined();
    expect(config.statusBusy).toBeDefined();
    expect(config.statusNotFound).toBeDefined();
  });

  it('has meeting-related translations', () => {
    expect(config.nextUp).toBeDefined();
    expect(config.currentMeeting).toBeDefined();
    expect(config.privateMeeting).toBeDefined();
  });

  it('has booking translations', () => {
    expect(config.bookButtonText).toBeDefined();
    expect(config.extendButtonText).toBeDefined();
  });

  it('has error translations', () => {
    expect(config.errorTitle).toBeDefined();
    expect(config.errorOccurred).toBeDefined();
  });
});
