// ***********************************************
// Custom commands for Cypress tests
// ***********************************************

/**
 * Wait for Socket.IO connection to be established
 */
Cypress.Commands.add('waitForSocketConnection', () => {
  cy.window().then((win) => {
    return new Cypress.Promise((resolve) => {
      const checkSocket = () => {
        if (win.io && win.io.sockets && win.io.sockets.length > 0) {
          resolve();
        } else {
          setTimeout(checkSocket, 100);
        }
      };
      checkSocket();
    });
  });
});

/**
 * Mock API response for rooms
 */
Cypress.Commands.add('mockRoomsAPI', (rooms) => {
  cy.intercept('GET', '/api/rooms', {
    statusCode: 200,
    body: rooms
  }).as('getRooms');
});

/**
 * Mock API response for roomlists
 */
Cypress.Commands.add('mockRoomlistsAPI', (roomlists) => {
  cy.intercept('GET', '/api/roomlists', {
    statusCode: 200,
    body: roomlists
  }).as('getRoomlists');
});

/**
 * Mock WiFi configuration API
 */
Cypress.Commands.add('mockWiFiAPI', (config) => {
  cy.intercept('GET', '/api/wifi', {
    statusCode: 200,
    body: config
  }).as('getWiFi');
});

/**
 * Mock Logo configuration API
 */
Cypress.Commands.add('mockLogoAPI', (config) => {
  cy.intercept('GET', '/api/logo', {
    statusCode: 200,
    body: config
  }).as('getLogo');
});

/**
 * Mock Sidebar configuration API
 */
Cypress.Commands.add('mockSidebarAPI', (config) => {
  cy.intercept('GET', '/api/sidebar', {
    statusCode: 200,
    body: config
  }).as('getSidebar');
});

/**
 * Check if element is visible in viewport
 */
Cypress.Commands.add('isInViewport', { prevSubject: true }, (subject) => {
  const rect = subject[0].getBoundingClientRect();
  expect(rect.top).to.be.at.least(0);
  expect(rect.left).to.be.at.least(0);
  expect(rect.bottom).to.be.at.most(Cypress.config('viewportHeight'));
  expect(rect.right).to.be.at.most(Cypress.config('viewportWidth'));
  return subject;
});
