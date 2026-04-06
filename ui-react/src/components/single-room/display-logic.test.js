/**
 * @file display-logic.test.js
 * @description Tests for pure business logic extracted from Display component.
 */
import {
  getInitialState,
  processRoomDetails,
  normalizeSidebarConfig,
  normalizeBookingConfig,
  normalizeColorsConfig,
  normalizeCheckInStatus,
  getEmptyCheckInStatus,
  isExtendMeetingAllowed,
  isExtendBlockedByOverbooking
} from './display-logic';

describe('display-logic', () => {

  describe('getInitialState', () => {
    it('returns state with the given alias', () => {
      const state = getInitialState('room-a');
      expect(state.roomAlias).toBe('room-a');
      expect(state.response).toBe(false);
      expect(state.rooms).toEqual([]);
      expect(state.room).toEqual({});
    });

    it('includes default sub-objects', () => {
      const state = getInitialState('x');
      expect(state.maintenanceConfig.enabled).toBe(false);
      expect(state.sidebarConfig.showMeetingTitles).toBe(false);
      expect(state.bookingConfig.enableBooking).toBe(true);
      expect(state.colorsConfig.bookingButtonColor).toBe('#334155');
      expect(state.checkInStatus.required).toBe(false);
      expect(state.showBookingModal).toBe(false);
      expect(state.showExtendModal).toBe(false);
      expect(state.showErrorModal).toBe(false);
    });
  });

  describe('processRoomDetails', () => {
    const translations = { nextUp: 'Next up', upcomingTitle: 'Upcoming' };

    it('returns NotFound room when alias does not match', () => {
      const result = processRoomDetails([], 'missing', translations);
      expect(result.room.NotFound).toBe(true);
      expect(result.roomDetails.appointmentExists).toBe(false);
    });

    it('processes room with no appointments', () => {
      const rooms = [{ RoomAlias: 'r1', Busy: false, Appointments: [] }];
      const result = processRoomDetails(rooms, 'r1', translations);
      expect(result.room.RoomAlias).toBe('r1');
      expect(result.roomDetails.appointmentExists).toBe(false);
    });

    it('processes available room with one appointment', () => {
      const rooms = [{
        RoomAlias: 'r1', Busy: false,
        Appointments: [{ Start: 1000, End: 2000 }]
      }];
      const result = processRoomDetails(rooms, 'r1', translations);
      expect(result.roomDetails.appointmentExists).toBe(true);
      expect(result.roomDetails.timesPresent).toBe(true);
      expect(result.roomDetails.nextUp).toBe('Next up: ');
      expect(result.roomDetails.upcomingAppointments).toBe(false);
    });

    it('processes busy room with multiple appointments', () => {
      const rooms = [{
        RoomAlias: 'r1', Busy: true,
        Appointments: [
          { Start: 1000, End: 2000 },
          { Start: 3000, End: 4000 }
        ]
      }];
      const result = processRoomDetails(rooms, 'r1', translations);
      expect(result.roomDetails.appointmentExists).toBe(true);
      expect(result.roomDetails.upcomingAppointments).toBe(true);
      expect(result.roomDetails.nextUp).toBe('');
      expect(result.roomDetails.upcomingTitle).toBe('Upcoming: ');
    });

    it('handles appointment without Start/End', () => {
      const rooms = [{
        RoomAlias: 'r1', Busy: false,
        Appointments: [{ Subject: 'No times' }]
      }];
      const result = processRoomDetails(rooms, 'r1', translations);
      expect(result.roomDetails.appointmentExists).toBe(true);
      expect(result.roomDetails.timesPresent).toBe(false);
    });
  });

  describe('normalizeSidebarConfig', () => {
    it('returns defaults for empty object', () => {
      const config = normalizeSidebarConfig({});
      expect(config.showMeetingTitles).toBe(false);
      expect(config.singleRoomDarkMode).toBe(false);
      expect(config.minimalHeaderStyle).toBe('filled');
    });

    it('preserves provided values', () => {
      const config = normalizeSidebarConfig({
        showMeetingTitles: true,
        singleRoomDarkMode: true,
        minimalHeaderStyle: 'transparent'
      });
      expect(config.showMeetingTitles).toBe(true);
      expect(config.singleRoomDarkMode).toBe(true);
      expect(config.minimalHeaderStyle).toBe('transparent');
    });

    it('defaults non-transparent style to filled', () => {
      expect(normalizeSidebarConfig({ minimalHeaderStyle: 'other' }).minimalHeaderStyle).toBe('filled');
    });
  });

  describe('normalizeBookingConfig', () => {
    it('returns defaults for empty object', () => {
      const config = normalizeBookingConfig({});
      expect(config.enableBooking).toBe(true);
      expect(config.buttonColor).toBe('#334155');
      expect(config.enableExtendMeeting).toBe(false);
      expect(config.extendMeetingUrlAllowlist).toEqual([]);
    });

    it('preserves provided values', () => {
      const config = normalizeBookingConfig({
        enableBooking: false,
        buttonColor: '#ff0000',
        enableExtendMeeting: true,
        extendMeetingUrlAllowlist: ['/room/']
      });
      expect(config.enableBooking).toBe(false);
      expect(config.buttonColor).toBe('#ff0000');
      expect(config.enableExtendMeeting).toBe(true);
      expect(config.extendMeetingUrlAllowlist).toEqual(['/room/']);
    });
  });

  describe('normalizeColorsConfig', () => {
    it('returns defaults for empty object', () => {
      const config = normalizeColorsConfig({});
      expect(config.bookingButtonColor).toBe('#334155');
      expect(config.statusAvailableColor).toBe('#22c55e');
      expect(config.statusBusyColor).toBe('#ef4444');
    });

    it('preserves provided values', () => {
      const config = normalizeColorsConfig({ bookingButtonColor: '#000', statusBusyColor: '#111' });
      expect(config.bookingButtonColor).toBe('#000');
      expect(config.statusBusyColor).toBe('#111');
    });
  });

  describe('normalizeCheckInStatus', () => {
    it('normalizes truthy/falsy values', () => {
      const status = normalizeCheckInStatus({ required: 1, checkedIn: 0, expired: null, tooEarly: undefined, canCheckInNow: 'yes' });
      expect(status.required).toBe(true);
      expect(status.checkedIn).toBe(false);
      expect(status.expired).toBe(false);
      expect(status.tooEarly).toBe(false);
      expect(status.canCheckInNow).toBe(true);
      expect(status.loading).toBe(false);
    });

    it('uses default minutes when not finite', () => {
      const status = normalizeCheckInStatus({ earlyCheckInMinutes: 'bad', windowMinutes: NaN });
      expect(status.earlyCheckInMinutes).toBe(5);
      expect(status.windowMinutes).toBe(10);
    });

    it('preserves finite minute values', () => {
      const status = normalizeCheckInStatus({ earlyCheckInMinutes: 3, windowMinutes: 15 });
      expect(status.earlyCheckInMinutes).toBe(3);
      expect(status.windowMinutes).toBe(15);
    });
  });

  describe('getEmptyCheckInStatus', () => {
    it('returns all-false status', () => {
      const status = getEmptyCheckInStatus();
      expect(status.required).toBe(false);
      expect(status.checkedIn).toBe(false);
      expect(status.loading).toBe(false);
      expect(status.earlyCheckInMinutes).toBe(5);
    });
  });

  describe('isExtendMeetingAllowed', () => {
    const makeLoc = (search = '', pathname = '/room/test', href) => ({
      search,
      pathname,
      href: href || `http://localhost${pathname}${search}`
    });

    it('returns false when enableExtendMeeting is false', () => {
      const config = { enableExtendMeeting: false, extendMeetingUrlAllowlist: [] };
      expect(isExtendMeetingAllowed(config, makeLoc('?extendbooking=true'))).toBe(false);
    });

    it('returns false when extendbooking param is missing', () => {
      const config = { enableExtendMeeting: true, extendMeetingUrlAllowlist: [] };
      expect(isExtendMeetingAllowed(config, makeLoc(''))).toBe(false);
    });

    it('returns true when enabled and param present with empty allowlist', () => {
      const config = { enableExtendMeeting: true, extendMeetingUrlAllowlist: [] };
      expect(isExtendMeetingAllowed(config, makeLoc('?extendbooking=true'))).toBe(true);
    });

    it('returns true when URL matches allowlist string', () => {
      const config = { enableExtendMeeting: true, extendMeetingUrlAllowlist: ['/room/test'] };
      expect(isExtendMeetingAllowed(config, makeLoc('?extendbooking=true', '/room/test'))).toBe(true);
    });

    it('returns false when URL does not match allowlist', () => {
      const config = { enableExtendMeeting: true, extendMeetingUrlAllowlist: ['/other/'] };
      expect(isExtendMeetingAllowed(config, makeLoc('?extendbooking=true', '/room/test'))).toBe(false);
    });

    it('supports regex entries in allowlist', () => {
      const config = { enableExtendMeeting: true, extendMeetingUrlAllowlist: ['/room\\/.*test/'] };
      expect(isExtendMeetingAllowed(config, makeLoc('?extendbooking=true', '/room/my-test'))).toBe(true);
    });

    it('handles invalid regex gracefully', () => {
      const config = { enableExtendMeeting: true, extendMeetingUrlAllowlist: ['/[invalid/'] };
      expect(isExtendMeetingAllowed(config, makeLoc('?extendbooking=true'))).toBe(false);
    });

    it('returns true with null allowlist (treated as empty)', () => {
      const config = { enableExtendMeeting: true, extendMeetingUrlAllowlist: null };
      expect(isExtendMeetingAllowed(config, makeLoc('?extendbooking=true'))).toBe(true);
    });
  });

  describe('isExtendBlockedByOverbooking', () => {
    it('returns false for null room', () => {
      expect(isExtendBlockedByOverbooking(null)).toBe(false);
    });

    it('returns false for non-busy room', () => {
      expect(isExtendBlockedByOverbooking({ Busy: false, Appointments: [{}, {}] })).toBe(false);
    });

    it('returns false with only one appointment', () => {
      expect(isExtendBlockedByOverbooking({ Busy: true, Appointments: [{ End: 1000 }] })).toBe(false);
    });

    it('returns true when next meeting starts within 5 minutes of current end', () => {
      const now = Date.now();
      const room = {
        Busy: true,
        Appointments: [
          { End: now },
          { Start: now + 2 * 60 * 1000 } // 2 minutes gap
        ]
      };
      expect(isExtendBlockedByOverbooking(room)).toBe(true);
    });

    it('returns false when next meeting starts more than 5 minutes after current end', () => {
      const now = Date.now();
      const room = {
        Busy: true,
        Appointments: [
          { End: now },
          { Start: now + 10 * 60 * 1000 } // 10 minutes gap
        ]
      };
      expect(isExtendBlockedByOverbooking(room)).toBe(false);
    });

    it('returns false when timestamps are not finite', () => {
      const room = {
        Busy: true,
        Appointments: [
          { End: 'bad' },
          { Start: 'bad' }
        ]
      };
      expect(isExtendBlockedByOverbooking(room)).toBe(false);
    });
  });

});
