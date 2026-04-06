/**
* @file Demo Data Generator for MeetEasier.
*
* Generates realistic room and appointment data when no Microsoft Graph API
* is configured. Appointments are dynamically generated relative to the current
* time, so the demo view always shows up-to-date data.
*
* Also supports simulated bookings, meeting extensions, and
* early ending of meetings in demo mode.
*
* @module demo-data
*/

/** @constant {Object[]} DEMO_ROOMS – Predefined demo rooms with name, room list, email, and seats */

const DEMO_ROOMS = [
  { Name: 'Apollo', Roomlist: 'Headquarters', Email: 'apollo@demo.meeteasier.local', seats: 12 },
  { Name: 'Gemini', Roomlist: 'Headquarters', Email: 'gemini@demo.meeteasier.local', seats: 8 },
  { Name: 'Mercury', Roomlist: 'Headquarters', Email: 'mercury@demo.meeteasier.local', seats: 6 },
  { Name: 'Orion', Roomlist: 'Headquarters', Email: 'orion@demo.meeteasier.local', seats: 4 },
  { Name: 'Voyager', Roomlist: '2nd Floor', Email: 'voyager@demo.meeteasier.local', seats: 10 },
  { Name: 'Pioneer', Roomlist: '2nd Floor', Email: 'pioneer@demo.meeteasier.local', seats: 6 },
  { Name: 'Hubble', Roomlist: '2nd Floor', Email: 'hubble@demo.meeteasier.local', seats: 4 },
  { Name: 'Kepler', Roomlist: '3rd Floor', Email: 'kepler@demo.meeteasier.local', seats: 8 },
];

/** @constant {string[]} DEMO_SUBJECTS – Possible subject lines for demo appointments */
const DEMO_SUBJECTS = [
  'Sprint Planning', 'Daily Standup', 'Design Review', 'Architecture Discussion',
  'Product Sync', 'Team Retrospective', 'Client Call', '1:1 Meeting',
  'Budget Review', 'Onboarding Session', 'Tech Talk', 'Roadmap Planning',
  'QA Review', 'Release Planning', 'Stakeholder Update', 'Workshop'
];

/** @constant {string[]} DEMO_ORGANIZERS – Possible organizer names for demo appointments */
const DEMO_ORGANIZERS = [
  'Anna Schmidt', 'Max Weber', 'Lisa Müller', 'Tom Fischer',
  'Sarah Koch', 'Jan Becker', 'Nina Hoffmann', 'Paul Wagner',
  'Emma Braun', 'Lukas Richter'
];

/** @type {Map<string, Object[]>} In-memory store: room email → appointments */
let demoAppointments = new Map(); // roomEmail -> appointments[]

/** @type {number} Sequential counter for unique demo appointment IDs */
let nextDemoId = 1000;

/**
* Generates a unique demo appointment ID.
*
* @returns {string} ID in the format "demo-event-{number}".
*/
function generateDemoId() {
  return `demo-event-${nextDemoId++}`;
}

/**
* Selects a random element from an array.
*
* @param {Array} arr – The source array.
* @returns {*} A randomly selected element.
*/
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
* Builds a room object in Graph API-compatible format from a demo room definition.
*
* @param {Object} room – DEMO_ROOMS entry with Name, Roomlist, Email.
* @param {Object[]} appointments – Appointments array for this room.
* @returns {Object} Room object with Name, Roomlist, aliases, Email, Busy, and Appointments.
*/
function buildRoomObject(room, appointments) {
  const now = Date.now();
  const isBusy = appointments.length > 0 && appointments[0].Start < now && now < appointments[0].End;

  return {
    Name: room.Name,
    Roomlist: room.Roomlist,
    RoomlistAlias: room.Roomlist.toLowerCase().replace(/\s+/g, '-'),
    RoomAlias: room.Name.toLowerCase(),
    Email: room.Email,
    Busy: isBusy,
    Appointments: appointments
  };
}

/**
* Generates appointments for a room based on the current time.
*
* Creates a mix of past, ongoing, and upcoming meetings.
* The pattern (busy, upcoming, free, busy-full) is determined by the
* `seedIndex` to provide variety between rooms.
*
* @param {string} roomEmail – Email address of the room.
* @param {number} seedIndex – Index to determine the occupancy pattern.
* @returns {Object[]} Array of appointment objects with Id, Subject, Organizer, Start, End, Private.
*/
function generateAppointmentsForRoom(roomEmail, seedIndex) {
  const now = new Date();
  const appointments = [];
  const hour = now.getHours();

  // Only generate appointments during business hours (7–20)
  if (hour < 7 || hour > 20) {
    return appointments;
  }

  // seedIndex determines the occupancy pattern – some rooms busy, some free
  const patterns = [
    'busy',        // Currently in a meeting
    'upcoming',    // Meeting starts soon
    'free',        // No current meeting
    'busy-full',   // Continuously occupied (back-to-back)
    'free',        // Free
    'busy',        // Occupied
    'upcoming',    // Soon occupied
    'free',        // Free
  ];
  const pattern = patterns[seedIndex % patterns.length];

  // Helper function: Creates a single appointment with offset and duration
  const makeAppt = (startOffset, durationMin, isPrivate = false) => {
    const start = new Date(now.getTime() + startOffset * 60000);
    const end = new Date(start.getTime() + durationMin * 60000);
    return {
      Id: generateDemoId(),
      Subject: isPrivate ? 'Private' : randomItem(DEMO_SUBJECTS),
      Organizer: randomItem(DEMO_ORGANIZERS),
      Start: start.getTime(),
      End: end.getTime(),
      Private: isPrivate
    };
  };

  // Generate appointments based on pattern
  switch (pattern) {
    case 'busy':
      // Meeting started 20 min ago, ends in 40 min
      appointments.push(makeAppt(-20, 60));
      // Next meeting in 60 min
      appointments.push(makeAppt(50, 30));
      break;
    case 'busy-full':
      // Meeting started 10 min ago, ends in 20 min
      appointments.push(makeAppt(-10, 30));
      // Immediately following: back-to-back
      appointments.push(makeAppt(20, 45));
      // Another one after that (private)
      appointments.push(makeAppt(65, 30, true));
      break;
    case 'upcoming':
      // Meeting in 8 minutes
      appointments.push(makeAppt(8, 45));
      // Another in 90 min
      appointments.push(makeAppt(90, 30));
      break;
    case 'free':
      // Next meeting not for 2 hours
      appointments.push(makeAppt(120, 60));
      break;
  }

  return appointments;
}

/**
* Generates the complete demo room array in Graph API-compatible format.
*
* Generates new appointments on each call to provide dynamic data.
*
* @returns {Object[]} Array of room objects with Name, room list, alias, email, occupancy status, and appointments.
*/
function generateDemoRooms() {
  // Regenerate appointments on each call for dynamic data
  demoAppointments.clear();

  return DEMO_ROOMS.map((room, index) => {
    const appointments = generateAppointmentsForRoom(room.Email, index);
    demoAppointments.set(room.Email, appointments);

    return buildRoomObject(room, appointments);
  });
}

/**
* Returns the demo room lists for filter navigation.
*
* Generates a deduplicated list of all room lists from the demo rooms.
*
* @returns {Object[]} Array of room list objects with displayName, alias, and emailAddress.
*/
function getDemoRoomlists() {
  const lists = new Map();
  DEMO_ROOMS.forEach((room) => {
    if (!lists.has(room.Roomlist)) {
      lists.set(room.Roomlist, {
        displayName: room.Roomlist,
        alias: room.Roomlist.toLowerCase().replace(/\s+/g, '-'),
        emailAddress: `${room.Roomlist.toLowerCase().replace(/\s+/g, '-')}@demo.meeteasier.local`
      });
    }
  });
  return Array.from(lists.values());
}

/**
* Simulates booking a room in demo mode.
*
* Adds a new appointment to the demo data. Checks for time conflicts
* with existing appointments beforehand.
*
* @param {string} roomEmail – Email address of the room.
* @param {string} subject – Subject of the appointment.
* @param {string|number} startTime – Start time (parsable by Date constructor).
* @param {string|number} endTime – End time (parsable by Date constructor).
* @returns {Object} Result with `error: false` on success or `error: true` with error message on conflict.
*/
function bookDemoRoom(roomEmail, subject, startTime, endTime) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (!demoAppointments.has(roomEmail)) {
    demoAppointments.set(roomEmail, []);
  }

  const existing = demoAppointments.get(roomEmail);
  // Check for time conflicts with existing appointments
  const hasConflict = existing.some(appt => start < appt.End && end > appt.Start);
  if (hasConflict) {
    return { error: true, status: 409, message: 'Room is already booked during the selected time.' };
  }

  // Create and insert new appointment
  const newAppt = {
    Id: generateDemoId(),
    Subject: subject || 'Meeting',
    Organizer: 'Demo User',
    Start: start,
    End: end,
    Private: false
  };

  existing.push(newAppt);
  // Sort appointments chronologically
  existing.sort((a, b) => a.Start - b.Start);

  return { error: false, id: newAppt.Id, subject: newAppt.Subject };
}

/**
* Simulates extending a meeting in demo mode.
*
* Checks whether the extension conflicts with subsequent appointments.
*
* @param {string} roomEmail – Email address of the room.
* @param {string} appointmentId – ID of the appointment to extend.
* @param {number} minutes – Number of minutes to extend by.
* @returns {Object} Result with `error: false` and new end time on success, or error object.
*/
function extendDemoMeeting(roomEmail, appointmentId, minutes) {
  const existing = demoAppointments.get(roomEmail);
  if (!existing) {
    return { error: true, status: 404, message: 'Room not found' };
  }

  const appt = existing.find(a => a.Id === appointmentId);
  if (!appt) {
    return { error: true, status: 404, message: 'Appointment not found' };
  }

  const newEnd = appt.End + (minutes * 60000);

  // Check whether the extension conflicts with other appointments
  const hasConflict = existing.some(a => {
    if (a.Id === appointmentId) return false;
    return appt.Start < a.End && newEnd > a.Start;
  });

  if (hasConflict) {
    return { error: true, status: 409, message: 'Cannot extend — another meeting is scheduled too soon.' };
  }

  appt.End = newEnd;
  return { error: false, newEnd };
}

/**
* Simulates ending a meeting early in demo mode.
*
* Sets the end time of the appointment to the current time.
*
* @param {string} roomEmail – Email address of the room.
* @param {string} appointmentId – ID of the appointment to end.
* @returns {Object} Result with `error: false` and end timestamp on success, or error object.
*/
function endDemoMeetingEarly(roomEmail, appointmentId) {
  const existing = demoAppointments.get(roomEmail);
  if (!existing) {
    return { error: true, status: 404, message: 'Room not found' };
  }

  const idx = existing.findIndex(a => a.Id === appointmentId);
  if (idx === -1) {
    return { error: true, status: 404, message: 'Appointment not found' };
  }

  // End meeting immediately (set end time to now)
  existing[idx].End = Date.now();
  return { error: false, endedAt: new Date().toISOString() };
}

/**
* Returns the current snapshot of demo rooms with updated occupancy status.
*
* On the first call, fresh data is generated. On subsequent calls,
* existing appointments are used and expired appointments (older than 1 hour)
* are filtered out.
*
* @returns {Object[]} Array of room objects with current occupancy status.
*/
function getDemoRoomsSnapshot() {
  if (demoAppointments.size === 0) {
    // First call – generate fresh data
    return generateDemoRooms();
  }

  const now = Date.now();
  return DEMO_ROOMS.map((room) => {
    const appointments = (demoAppointments.get(room.Email) || [])
      .filter(a => a.End > now - 3600000); // Keep appointments from the last hour

    return buildRoomObject(room, appointments);
  });
}

/**
* Checks whether an email address belongs to the demo domain.
*
* @param {string} email – The email address to check.
* @returns {boolean} `true` if the address ends with `@demo.meeteasier.local`.
*/
function isDemoEmail(email) {
  return String(email || '').endsWith('@demo.meeteasier.local');
}

/**
* Generates simulated connected display devices for demo mode.
*
* Returns data in the same format as `/api/displays`, including
* Socket.IO and MQTT connection information.
*
* @returns {Object[]} Array of display objects with clientId, name, type, IP, and connection status.
*/
function getDemoDisplays() {
  const now = new Date();
  const connectedAt = new Date(now.getTime() - 3600000).toISOString(); // Connected for 1 hour

  const displays = [
    {
      clientId: 'demo_display_apollo',
      name: 'apollo',
      type: 'single-room',
      roomName: 'apollo',
      ipAddress: '192.168.1.101',
      socketIO: { connected: true, status: 'active', sockets: 1, connectedAt },
      mqtt: { connected: true, power: 'ON', brightness: 80, powerUnsupported: false, brightnessUnsupported: false, hostname: 'rpi_apollo', networkAddress: '192.168.1.101', cpuUsage: 12.4, memoryUsage: 45.2, temperature: 48.3 }
    },
    {
      clientId: 'demo_display_gemini',
      name: 'gemini',
      type: 'single-room',
      roomName: 'gemini',
      ipAddress: '192.168.1.102',
      socketIO: { connected: true, status: 'active', sockets: 1, connectedAt },
      mqtt: { connected: true, power: 'ON', brightness: 65, powerUnsupported: false, brightnessUnsupported: false, hostname: 'rpi_gemini', networkAddress: '192.168.1.102', cpuUsage: 8.1, memoryUsage: 52.7, temperature: 51.0 }
    },
    {
      clientId: 'demo_display_flightboard',
      name: 'flightboard_lobby',
      type: 'flightboard',
      roomName: '',
      ipAddress: '192.168.1.103',
      socketIO: { connected: true, status: 'active', sockets: 1, connectedAt },
      mqtt: { connected: true, power: 'ON', brightness: 100, powerUnsupported: false, brightnessUnsupported: false, hostname: 'rpi_lobby', networkAddress: '192.168.1.103', cpuUsage: 5.8, memoryUsage: 38.9, temperature: 44.1 }
    },
    {
      clientId: 'demo_display_mercury',
      name: 'mercury',
      type: 'single-room',
      roomName: 'mercury',
      ipAddress: '192.168.1.104',
      socketIO: { connected: true, status: 'active', sockets: 1, connectedAt },
      mqtt: null
    },
    {
      clientId: 'demo_display_orion',
      name: 'orion',
      type: 'single-room',
      roomName: 'orion',
      ipAddress: '192.168.1.105',
      socketIO: { connected: true, status: 'inactive', sockets: 0, connectedAt },
      mqtt: { connected: true, power: 'OFF', brightness: 0, powerUnsupported: false, brightnessUnsupported: false, hostname: 'rpi_orion', networkAddress: '192.168.1.105', cpuUsage: 2.1, memoryUsage: 31.4, temperature: 39.8 }
    },
  ];

  return displays;
}

module.exports = {
  generateDemoRooms,
  getDemoRoomlists,
  getDemoRoomsSnapshot,
  bookDemoRoom,
  extendDemoMeeting,
  endDemoMeetingEarly,
  isDemoEmail,
  getDemoDisplays,
  DEMO_ROOMS
};
