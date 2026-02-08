// ***********************************************************
// This file is processed and loaded automatically before your test files.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR errors from command log to reduce noise
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // We only want to ignore certain errors, not all
  if (err.message.includes('ResizeObserver')) {
    return false;
  }
  if (err.message.includes('Socket')) {
    return false;
  }
  // Let other errors fail the test
  return true;
});
