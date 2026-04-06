/**
 * @file display-service.test.js
 * @description Tests for data fetching service extracted from Display component.
 */
import {
  fetchRoomData,
  fetchSidebarConfig,
  fetchBookingConfig,
  fetchColorsConfig,
  fetchCheckInStatus,
  performCheckIn,
  performExtendMeeting
} from './display-service';

describe('display-service', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchRoomData', () => {
    it('returns null for empty alias', async () => {
      expect(await fetchRoomData('')).toBeNull();
      expect(await fetchRoomData(null)).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('fetches room data by alias', async () => {
      const room = { Name: 'Room A', RoomAlias: 'room-a' };
      fetchMock.mockResolvedValue({ status: 200, json: async () => room });

      const result = await fetchRoomData('room-a');
      expect(result).toEqual(room);
      expect(fetchMock).toHaveBeenCalledWith('/api/rooms/room-a');
    });

    it('returns NotFound object for 404', async () => {
      fetchMock.mockResolvedValue({ status: 404 });

      const result = await fetchRoomData('missing');
      expect(result.NotFound).toBe(true);
      expect(result.Appointments).toEqual([]);
    });

    it('encodes alias in URL', async () => {
      fetchMock.mockResolvedValue({ status: 200, json: async () => ({}) });
      await fetchRoomData('room with spaces');
      expect(fetchMock).toHaveBeenCalledWith('/api/rooms/room%20with%20spaces');
    });
  });

  describe('fetchSidebarConfig', () => {
    it('fetches sidebar config with client ID', async () => {
      const config = { showMeetingTitles: true };
      fetchMock.mockResolvedValue({ json: async () => config });

      const result = await fetchSidebarConfig('client-123');
      expect(result).toEqual(config);
      expect(fetchMock).toHaveBeenCalledWith('/api/sidebar?displayClientId=client-123');
    });
  });

  describe('fetchBookingConfig', () => {
    it('fetches without room email', async () => {
      fetchMock.mockResolvedValue({ json: async () => ({ enableBooking: true }) });

      await fetchBookingConfig();
      expect(fetchMock).toHaveBeenCalledWith('/api/booking-config');
    });

    it('fetches with room email', async () => {
      fetchMock.mockResolvedValue({ json: async () => ({}) });

      await fetchBookingConfig('room@test.com');
      expect(fetchMock).toHaveBeenCalledWith('/api/booking-config?roomEmail=room%40test.com');
    });

    it('fetches with room email and group', async () => {
      fetchMock.mockResolvedValue({ json: async () => ({}) });

      await fetchBookingConfig('room@test.com', 'floor-1');
      expect(fetchMock).toHaveBeenCalledWith('/api/booking-config?roomEmail=room%40test.com&roomGroup=floor-1');
    });
  });

  describe('fetchColorsConfig', () => {
    it('fetches colors from /api/colors', async () => {
      const colors = { bookingButtonColor: '#000' };
      fetchMock.mockResolvedValue({ json: async () => colors });

      const result = await fetchColorsConfig();
      expect(result).toEqual(colors);
      expect(fetchMock).toHaveBeenCalledWith('/api/colors');
    });
  });

  describe('fetchCheckInStatus', () => {
    it('returns null for room with no appointments', async () => {
      expect(await fetchCheckInStatus(null)).toBeNull();
      expect(await fetchCheckInStatus({ Appointments: [] })).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('fetches check-in status with query params', async () => {
      const room = {
        Email: 'room@test.com',
        Name: 'Room A',
        Appointments: [{ Id: 'apt-1', Organizer: 'John', Start: 12345 }]
      };
      fetchMock.mockResolvedValue({ json: async () => ({ required: true }) });

      const result = await fetchCheckInStatus(room);
      expect(result).toEqual({ required: true });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const calledUrl = fetchMock.mock.calls[0][0];
      expect(calledUrl).toContain('/api/check-in-status?');
      expect(calledUrl).toContain('roomEmail=room%40test.com');
      expect(calledUrl).toContain('appointmentId=apt-1');
    });
  });

  describe('performCheckIn', () => {
    it('sends POST with correct body', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });

      const result = await performCheckIn({
        roomEmail: 'room@test.com',
        appointmentId: 'apt-1',
        organizer: 'John',
        roomName: 'Room A',
        startTimestamp: 12345
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data.success).toBe(true);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/check-in');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({
        roomEmail: 'room@test.com',
        appointmentId: 'apt-1',
        organizer: 'John',
        roomName: 'Room A',
        startTimestamp: 12345
      });
    });

    it('returns error status correctly', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'ip_not_whitelisted' })
      });

      const result = await performCheckIn({
        roomEmail: 'r', appointmentId: 'a', organizer: '', roomName: '', startTimestamp: 0
      });
      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(result.data.error).toBe('ip_not_whitelisted');
    });
  });

  describe('performExtendMeeting', () => {
    it('sends POST with correct body', async () => {
      fetchMock.mockResolvedValue({
        status: 200,
        json: async () => ({ success: true })
      });

      const result = await performExtendMeeting({
        roomEmail: 'room@test.com',
        appointmentId: 'apt-1',
        minutes: 15
      });

      expect(result.status).toBe(200);
      expect(result.data.success).toBe(true);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/extend-meeting');
      expect(JSON.parse(options.body)).toEqual({
        roomEmail: 'room@test.com',
        appointmentId: 'apt-1',
        minutes: 15
      });
    });

    it('retries on network error', async () => {
      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          status: 200,
          json: async () => ({ success: true })
        });

      const result = await performExtendMeeting({
        roomEmail: 'r', appointmentId: 'a', minutes: 15
      }, 2);

      expect(result.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    }, 10000);

    it('throws after exhausting retries', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(performExtendMeeting({
        roomEmail: 'r', appointmentId: 'a', minutes: 15
      }, 1)).rejects.toThrow('Network error');
    }, 10000);
  });

});
