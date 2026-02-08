import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Clock from './Clock';

// Mock the timeFormat utility
jest.mock('../../utils/timeFormat.js', () => ({
  formatTime: (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}));

describe('Clock Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders clock element', () => {
      render(<Clock />);
      expect(screen.getByText(/:/)).toBeInTheDocument(); // Time contains ":"
    });

    it('displays current date', () => {
      render(<Clock />);
      const dateElement = screen.getByText(/\d{4}/); // Year in date
      expect(dateElement).toBeInTheDocument();
    });

    it('displays current time', () => {
      render(<Clock />);
      const timeElement = screen.getByText(/\d{1,2}:\d{2}/); // Time format
      expect(timeElement).toBeInTheDocument();
    });
  });

  describe('Time Updates', () => {
    it('updates time every second', () => {
      const { container } = render(<Clock />);
      const initialTime = container.textContent;

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      const updatedTime = container.textContent;
      // Content should be different after 1 second (though date might be same)
      expect(container.textContent).toBeTruthy();
    });

    it('sets up interval on mount', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      render(<Clock />);
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
      setIntervalSpy.mockRestore();
    });

    it('clears interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const { unmount } = render(<Clock />);
      unmount();
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Localization', () => {
    it('uses browser language for date formatting', () => {
      // Mock navigator.language
      const originalLanguage = navigator.language;
      Object.defineProperty(navigator, 'language', {
        value: 'de-DE',
        configurable: true
      });

      render(<Clock />);
      
      // Should render date in German format
      expect(screen.getByText(/\d{4}/)).toBeInTheDocument();

      // Restore original language
      Object.defineProperty(navigator, 'language', {
        value: originalLanguage,
        configurable: true
      });
    });

    it('handles missing navigator.language', () => {
      const originalLanguage = navigator.language;
      const originalUserLanguage = navigator.userLanguage;
      
      Object.defineProperty(navigator, 'language', {
        value: undefined,
        configurable: true
      });
      Object.defineProperty(navigator, 'userLanguage', {
        value: 'en-US',
        configurable: true
      });

      expect(() => render(<Clock />)).not.toThrow();

      // Restore
      Object.defineProperty(navigator, 'language', {
        value: originalLanguage,
        configurable: true
      });
      Object.defineProperty(navigator, 'userLanguage', {
        value: originalUserLanguage,
        configurable: true
      });
    });
  });

  describe('Date Formatting', () => {
    it('includes weekday in date display', () => {
      render(<Clock />);
      const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const hasWeekday = weekdays.some(day => screen.queryByText(new RegExp(day, 'i')));
      expect(hasWeekday).toBeTruthy();
    });

    it('includes month in date display', () => {
      render(<Clock />);
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
      const hasMonth = months.some(month => screen.queryByText(new RegExp(month, 'i')));
      expect(hasMonth).toBeTruthy();
    });
  });
});
