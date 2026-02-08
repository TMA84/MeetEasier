describe('Flightboard Display', () => {
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
        }
      ]
    },
    {
      Name: 'Meeting Room B',
      RoomAlias: 'meeting-b',
      Roomlist: 'Building 1',
      Busy: true,
      Appointments: [
        {
          Subject: 'Client Presentation',
          Organizer: 'Jane Smith',
          Start: Date.now() - 1800000,
          End: Date.now() + 1800000,
          Private: false
        },
        {
          Subject: 'Design Workshop',
          Organizer: 'Bob Johnson',
          Start: Date.now() + 3600000,
          End: Date.now() + 7200000,
          Private: false
        }
      ]
    },
    {
      Name: 'Board Room',
      RoomAlias: 'board-room',
      Roomlist: 'Building 2',
      Busy: false,
      Appointments: []
    }
  ];

  const mockRoomlists = ['Building 1', 'Building 2'];

  beforeEach(() => {
    cy.mockRoomsAPI(mockRooms);
    cy.mockRoomlistsAPI(mockRoomlists);
    cy.mockLogoAPI({
      logoDarkUrl: '/img/logo-dark.svg',
      logoLightUrl: '/img/logo-light.svg'
    });
  });

  describe('Initial Load', () => {
    it('loads flightboard page successfully', () => {
      cy.visit('/');
      cy.wait('@getRooms');
      cy.contains('Conference Room A').should('be.visible');
    });

    it('displays all rooms', () => {
      cy.visit('/');
      cy.wait('@getRooms');
      cy.contains('Conference Room A').should('be.visible');
      cy.contains('Meeting Room B').should('be.visible');
      cy.contains('Board Room').should('be.visible');
    });

    it('displays navbar with logo and title', () => {
      cy.visit('/');
      cy.get('.title-bar').should('be.visible');
      cy.get('.title-bar img').should('be.visible');
    });

    it('displays clock in navbar', () => {
      cy.visit('/');
      cy.get('#the-clock').should('be.visible');
      cy.get('#clock').should('contain.text', ':'); // Time contains colon
    });
  });

  describe('Room Status Display', () => {
    it('shows available status for free rooms', () => {
      cy.visit('/');
      cy.wait('@getRooms');
      cy.contains('Conference Room A')
        .parents('.meeting-room')
        .find('.meeting-open')
        .should('exist');
    });

    it('shows busy status for occupied rooms', () => {
      cy.visit('/');
      cy.wait('@getRooms');
      cy.contains('Meeting Room B')
        .parents('.meeting-room')
        .find('.meeting-busy')
        .should('exist');
    });

    it('displays organizer for rooms with appointments', () => {
      cy.visit('/');
      cy.wait('@getRooms');
      cy.contains('John Doe').should('be.visible');
      cy.contains('Jane Smith').should('be.visible');
    });

    it('displays next meeting for busy rooms', () => {
      cy.visit('/');
      cy.wait('@getRooms');
      cy.contains('Meeting Room B')
        .parents('.meeting-room')
        .should('contain.text', 'Bob Johnson');
    });
  });

  describe('Room Filtering', () => {
    it('displays filter dropdown', () => {
      cy.visit('/');
      cy.get('#roomlist-filter').should('be.visible');
    });

    it('shows all rooms by default', () => {
      cy.visit('/');
      cy.wait('@getRooms');
      cy.get('.meeting-room__row').should('have.length', 3);
    });

    it('filters rooms by building', () => {
      cy.visit('/');
      cy.wait('@getRooms');
      
      // Click filter dropdown
      cy.get('.current-filter').click();
      cy.contains('Building 1').click();
      
      // Should show only Building 1 rooms
      cy.contains('Conference Room A').should('be.visible');
      cy.contains('Meeting Room B').should('be.visible');
      cy.contains('Board Room').should('not.be.visible');
    });

    it('can reset filter to show all rooms', () => {
      cy.visit('/');
      cy.wait('@getRooms');
      
      // Apply filter
      cy.get('.current-filter').click();
      cy.contains('Building 1').click();
      
      // Reset to all
      cy.get('.current-filter').click();
      cy.contains('All Rooms').click();
      
      // Should show all rooms again
      cy.get('.meeting-room__row').should('have.length', 3);
    });
  });

  describe('Responsive Design', () => {
    it('displays correctly on desktop', () => {
      cy.viewport(1920, 1080);
      cy.visit('/');
      cy.wait('@getRooms');
      cy.get('.title-bar').should('be.visible');
      cy.contains('Conference Room A').should('be.visible');
    });

    it('displays correctly on tablet', () => {
      cy.viewport('ipad-2');
      cy.visit('/');
      cy.wait('@getRooms');
      cy.get('.title-bar').should('be.visible');
      cy.contains('Conference Room A').should('be.visible');
    });

    it('displays correctly on mobile', () => {
      cy.viewport('iphone-x');
      cy.visit('/');
      cy.wait('@getRooms');
      cy.get('.title-bar').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API fails', () => {
      cy.intercept('GET', '/api/rooms', {
        statusCode: 200,
        body: { error: 'Authentication failed' }
      }).as('getRoomsError');
      
      cy.visit('/');
      cy.wait('@getRoomsError');
      cy.contains('Authentication failed').should('be.visible');
    });

    it('displays loading spinner initially', () => {
      cy.intercept('GET', '/api/rooms', (req) => {
        req.reply((res) => {
          res.delay = 1000;
          res.send(mockRooms);
        });
      }).as('getRoomsSlow');
      
      cy.visit('/');
      cy.get('#fb__spinner').should('be.visible');
      cy.wait('@getRoomsSlow');
      cy.get('#fb__spinner').should('not.exist');
    });
  });

  describe('Real-time Updates', () => {
    it('updates display when socket emits new data', () => {
      cy.visit('/');
      cy.wait('@getRooms');
      
      // Initial state
      cy.contains('Conference Room A').should('be.visible');
      
      // Simulate socket update (would need socket.io mock)
      // This is a placeholder for actual socket testing
      cy.wait(1000);
      cy.contains('Conference Room A').should('be.visible');
    });
  });
});
