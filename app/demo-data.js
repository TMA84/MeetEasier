/**
 * Demo data generator for MeetEasier
 * Generates realistic room and meeting data when no Microsoft Graph API is configured.
 * Meetings are dynamically generated relative to the current time.
 */

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

const DEMO_SUBJECTS = [
  'Sprint Planning', 'Daily Standup', 'Design Review', 'Architecture Discussion',
  'Product Sync', 'Team Retrospective', 'Client Call', '1:1 Meeting',
  'Budget Review', 'Onboarding Session', 'Tech Talk', 'Roadmap Planning',
  'QA Review', 'Release Planning', 'Stakeholder Update', 'Workshop'
];

const DEMO_ORGANIZERS = [
  'Anna Schmidt', 'Max Weber', 'Lisa Müller', 'Tom Fischer',
  'Sarah Koch', 'Jan Becker', 'Nina Hoffmann', 'Paul Wagner',
  'Emma Braun', 'Lukas Richter'
];

let demoAppointments = new Map(); // roomEmail -> appointments[]
let nextDemoId = 1000;

function generateDemoId() {
  return `demo-event-${nextDemoId++}`;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate appointments for a room based on current time.
 * Creates a mix of past, current, and upcoming meetings.
 */
function generateAppointmentsForRoom(roomEmail, seedIndex) {
  const now = new Date();
  const appointments = [];
  const hour = now.getHours();

  // Only generate meetings during business hours (7-20)
  if (hour < 7 || hour > 20) {
    return appointments;
  }

  // Use seedIndex to create variety — some rooms busy, some free
  const patterns = [
    'busy',        // Currently in a meeting
    'upcoming',    // Meeting starting soon
    'free',        // No current meeting
    'busy-full',   // Busy with back-to-back meetings
    'free',        // Free
    'busy',        // Busy
    'upcoming',    // Upcoming
    'free',        // Free
  ];
  const pattern = patterns[seedIndex % patterns.length];

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
      // Back-to-back: starts right after
      appointments.push(makeAppt(20, 45));
      // Another one after that
      appointments.push(makeAppt(65, 30, true));
      break;
    case 'upcoming':
      // Meeting in 8 minutes
      appointments.push(makeAppt(8, 45));
      // Another in 90 min
      appointments.push(makeAppt(90, 30));
      break;
    case 'free':
      // Next meeting in 2 hours
      appointments.push(makeAppt(120, 60));
      break;
  }

  return appointments;
}

/**
 * Generate the full demo rooms array, matching the structure from Graph API.
 */
function generateDemoRooms() {
  // Regenerate appointments each time for dynamic data
  demoAppointments.clear();

  return DEMO_ROOMS.map((room, index) => {
    const appointments = generateAppointmentsForRoom(room.Email, index);
    demoAppointments.set(room.Email, appointments);

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
  });
}

/**
 * Get demo roomlists for the filter navbar.
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
 * Simulate booking a room. Adds a new appointment to the demo data.
 */
function bookDemoRoom(roomEmail, subject, startTime, endTime) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (!demoAppointments.has(roomEmail)) {
    demoAppointments.set(roomEmail, []);
  }

  const existing = demoAppointments.get(roomEmail);
  // Check for conflicts
  const hasConflict = existing.some(appt => start < appt.End && end > appt.Start);
  if (hasConflict) {
    return { error: true, status: 409, message: 'Room is already booked during the selected time.' };
  }

  const newAppt = {
    Id: generateDemoId(),
    Subject: subject || 'Meeting',
    Organizer: 'Demo User',
    Start: start,
    End: end,
    Private: false
  };

  existing.push(newAppt);
  existing.sort((a, b) => a.Start - b.Start);

  return { error: false, id: newAppt.Id, subject: newAppt.Subject };
}

/**
 * Simulate extending a meeting.
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

  // Check for conflicts with extension
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
 * Simulate ending a meeting early.
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

  // End the meeting now
  existing[idx].End = Date.now();
  return { error: false, endedAt: new Date().toISOString() };
}

/**
 * Get current demo rooms with refreshed busy status.
 */
function getDemoRoomsSnapshot() {
  if (demoAppointments.size === 0) {
    // First call — generate fresh data
    return generateDemoRooms();
  }

  const now = Date.now();
  return DEMO_ROOMS.map((room) => {
    const appointments = (demoAppointments.get(room.Email) || [])
      .filter(a => a.End > now - 3600000); // Keep appointments from last hour

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
  });
}

function isDemoEmail(email) {
  return String(email || '').endsWith('@demo.meeteasier.local');
}

/**
 * Generate demo connected display devices.
 * Returns data in the same format as /api/displays.
 */
function getDemoDisplays() {
  const now = new Date();
  const connectedAt = new Date(now.getTime() - 3600000).toISOString(); // 1h ago

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
