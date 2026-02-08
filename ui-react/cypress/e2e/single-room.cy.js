describe('Single Room Display', () => {
  const mockRooms = [
    {
      Name: 'Conference Room A',
      RoomAlias: 'conference-a',
      Roomlist: 'Building 1',
      Busy: false,
      Appointments: [
        {
          Subject: 'Team Standup',
          Organizer: 'John Doe',
          Start: Date.now() + 3600000,
          End: Date.now() + 5400000,
          Private: false
        },
        {
          Subject: 'Project Review',
          Organizer: 'Jane Smith',
          Start: Date.now() + 7200000,
          End: Date.now() + 10800000,
          Private: false
        }
      ]
    }
  ];

  const mockWiFiConfig = {
    ssid: 'Office WiFi',
    password: 'SecurePass123'
  };

  const mockLogoConfig = {
    logoDarkUrl: '/img/logo-dark.svg',
    logoLightUrl: '/img/logo-light.svg'
  };

  const mockSidebarConfig = {
    showWiFi: true,
    showUpcomingMeetings: true,
    showMeetingTitles: false
  };

  beforeEach(() => {
    cy.mockRoomsAPI(mockRooms);
    cy.mockWiFiAPI(mockWiFiConfig);
    cy.mockLogoAPI(mockLogoConfig);
    cy.mockSidebarAPI(mockSidebarConfig);
  });

  describe('Initial Load', () => {
    it('loads single room page successfully', () => {
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.contains('Conference Room A').should('be.visible');
    });

    it('displays room name prominently', () => {
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.get('.room-name').should('contain.text', 'Conference Room A');
    });

    it('displays room status', () => {
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.get('.room-status').should('be.visible');
    });
  });

  describe('Status Display', () => {
    it('shows available status for free room', () => {
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.get('.modern-room-status--available').should('exist');
    });

    it('shows busy status for occupied room', () => {
      const busyRoom = [{
        ...mockRooms[0],
        Busy: true,
        Appointments: [
          {
            Subject: 'Current Meeting',
            Organizer: 'Bob Johnson',
            Start: Date.now() - 1800000,
            End: Date.now() + 1800000,
            Private: false
          }
        ]
      }];
      
      cy.mockRoomsAPI(busyRoom);
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.get('.modern-room-status--busy').should('exist');
    });

    it('shows upcoming status when meeting starts soon', () => {
      const upcomingRoom = [{
        ...mockRooms[0],
        Busy: false,
        Appointments: [
          {
            Subject: 'Upcoming Meeting',
            Organizer: 'Alice Williams',
            Start: Date.now() + 600000, // 10 minutes from now
            End: Date.now() + 2400000,
            Private: false
          }
        ]
      }];
      
      cy.mockRoomsAPI(upcomingRoom);
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.get('.modern-room-status--upcoming').should('exist');
    });
  });

  describe('Meeting Information', () => {
    it('displays current/next meeting organizer', () => {
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.contains('John Doe').should('be.visible');
    });

    it('displays meeting time', () => {
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.get('.meeting-time').should('be.visible');
      cy.get('.meeting-time').should('contain.text', ':'); // Time contains colon
    });

    it('displays next meeting when room is busy', () => {
      const busyRoom = [{
        ...mockRooms[0],
        Busy: true
      }];
      
      cy.mockRoomsAPI(busyRoom);
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.contains('Jane Smith').should('be.visible');
    });
  });

  describe('Sidebar', () => {
    it('displays sidebar', () => {
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.get('.modern-room-sidebar').should('be.visible');
    });

    it('displays logo in sidebar', () => {
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.get('.sidebar-logo img').should('be.visible');
    });

    it('displays clock in sidebar', () => {
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.get('.sidebar-clock').should('be.visible');
      cy.get('.clock-time').should('contain.text', ':');
    });

    it('displays WiFi information when enabled', () => {
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.wait('@getWiFi');
      cy.get('.sidebar-wifi').should('be.visible');
      cy.contains('Office WiFi').should('be.visible');
      cy.contains('SecurePass123').should('be.visible');
    });

    it('displays WiFi QR code', () => {
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.wait('@getWiFi');
      cy.get('.wifi-qr img').should('be.visible');
    });

    it('displays upcoming meetings when enabled', () => {
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.wait('@getSidebar');
      cy.get('.sidebar-upcoming').should('be.visible');
      cy.contains('Jane Smith').should('be.visible');
    });

    it('hides WiFi when disabled in config', () => {
      cy.mockSidebarAPI({
        ...mockSidebarConfig,
        showWiFi: false
      });
      
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.wait('@getSidebar');
      cy.get('.sidebar-wifi').should('not.exist');
    });

    it('hides upcoming meetings when disabled in config', () => {
      cy.mockSidebarAPI({
        ...mockSidebarConfig,
        showUpcomingMeetings: false
      });
      
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.wait('@getSidebar');
      cy.get('.sidebar-upcoming').should('not.exist');
    });
  });

  describe('Responsive Design', () => {
    it('displays correctly on desktop', () => {
      cy.viewport(1920, 1080);
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.get('.modern-room-status').should('be.visible');
      cy.get('.modern-room-sidebar').should('be.visible');
    });

    it('displays correctly on tablet', () => {
      cy.viewport('ipad-2');
      cy.visit('/room/conference-a');
      cy.wait('@getRooms');
      cy.get('.modern-room-status').should('be.visible');
      cy.get('.modern-room-sidebar').should('be.visible');
    });

    it('sidebar stays on same row at all resolutions', () => {
      const viewports = [[1920, 1080], [1366, 768], [1024, 768]];
      
      viewports.forEach(([width, height]) => {
        cy.viewport(width, height);
        cy.visit('/room/conference-a');
        cy.wait('@getRooms');
        cy.get('.modern-room-sidebar').should('be.visible');
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error when room not found', () => {
      cy.mockRoomsAPI([]);
      cy.visit('/room/nonexistent');
      cy.wait('@getRooms');
      cy.contains('Room not found').should('be.visible');
    });

    it('displays loading spinner initially', () => {
      cy.intercept('GET', '/api/rooms', (req) => {
        req.reply((res) => {
          res.delay = 1000;
          res.send(mockRooms);
        });
      }).as('getRoomsSlow');
      
      cy.visit('/room/conference-a');
      cy.get('#fb__spinner').should('be.visible');
      cy.wait('@getRoomsSlow');
      cy.get('#fb__spinner').should('not.exist');
    });
  });
});
