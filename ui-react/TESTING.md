# Testing Guide

This document describes the testing setup and how to run tests for the MeetEasier application.

## Test Stack

- **Unit/Integration Tests**: Jest + React Testing Library
- **E2E Tests**: Cypress
- **Coverage**: Jest coverage reports

## Running Tests

### Unit and Integration Tests

```bash
# Run tests in watch mode (development)
npm test

# Run tests once (CI)
npm run test:ci

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### E2E Tests with Cypress

```bash
# Open Cypress Test Runner (interactive)
npm run cypress

# Run Cypress tests headlessly
npm run cypress:headless

# Run E2E tests with server startup
npm run test:e2e

# Run all tests (unit + E2E)
npm run test:all
```

## Test Structure

```
ui-react/
├── src/
│   ├── components/
│   │   ├── flightboard/
│   │   │   ├── FlightboardRow.js
│   │   │   ├── FlightboardRow.test.js
│   │   │   ├── Flightboard.js
│   │   │   ├── Flightboard.test.js
│   │   │   └── ...
│   │   └── ...
│   └── utils/
│       ├── timeFormat.js
│       └── timeFormat.test.js
└── cypress/
    ├── e2e/
    │   ├── flightboard.cy.js
    │   ├── single-room.cy.js
    │   └── ...
    ├── fixtures/
    │   ├── rooms.json
    │   ├── wifi-config.json
    │   └── ...
    └── support/
        ├── commands.js
        └── e2e.js
```

## Writing Tests

### Unit Tests (Jest + React Testing Library)

```javascript
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### E2E Tests (Cypress)

```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.mockRoomsAPI(mockData);
    cy.visit('/');
  });

  it('performs user action', () => {
    cy.contains('Button Text').click();
    cy.get('.result').should('be.visible');
  });
});
```

## Custom Cypress Commands

### API Mocking

```javascript
// Mock rooms API
cy.mockRoomsAPI(rooms);

// Mock WiFi configuration
cy.mockWiFiAPI(config);

// Mock logo configuration
cy.mockLogoAPI(config);

// Mock sidebar configuration
cy.mockSidebarAPI(config);
```

### Utilities

```javascript
// Wait for Socket.IO connection
cy.waitForSocketConnection();

// Check if element is in viewport
cy.get('.element').isInViewport();
```

## Test Coverage

Coverage reports are generated in the `coverage/` directory when running:

```bash
npm run test:coverage
```

View the HTML report:

```bash
open coverage/lcov-report/index.html
```

### Coverage Goals

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run cypress:headless
```

### GitLab CI Example

```yaml
test:
  stage: test
  script:
    - npm ci
    - npm run test:ci
    - npm run cypress:headless
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

## Debugging Tests

### Jest Tests

```bash
# Run specific test file
npm test -- FlightboardRow.test.js

# Run tests matching pattern
npm test -- --testNamePattern="displays correctly"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Cypress Tests

```bash
# Open Cypress Test Runner for debugging
npm run cypress

# Run specific test file
npx cypress run --spec "cypress/e2e/flightboard.cy.js"

# Run with browser visible
npx cypress run --headed --browser chrome
```

## Best Practices

### Unit Tests

1. **Test behavior, not implementation**
   - Focus on what the component does, not how it does it
   - Test user interactions and visible output

2. **Use descriptive test names**
   - Clearly state what is being tested
   - Use "should" or "displays" language

3. **Keep tests isolated**
   - Each test should be independent
   - Use beforeEach for setup

4. **Mock external dependencies**
   - Mock API calls
   - Mock Socket.IO connections
   - Mock child components when testing parents

### E2E Tests

1. **Test critical user paths**
   - Focus on main workflows
   - Test happy paths and error cases

2. **Use data-testid for stable selectors**
   - Avoid relying on CSS classes
   - Use semantic selectors when possible

3. **Wait for async operations**
   - Use cy.wait() for API calls
   - Use cy.should() for assertions

4. **Keep tests maintainable**
   - Use custom commands for repeated actions
   - Use fixtures for test data
   - Keep tests DRY

## Troubleshooting

### Common Issues

**Tests fail with "Cannot find module"**
- Ensure all dependencies are installed: `npm install`
- Check import paths are correct

**Cypress tests timeout**
- Increase timeout in cypress.config.js
- Check if server is running on correct port
- Verify API mocks are set up correctly

**Coverage not generated**
- Run with --coverage flag: `npm run test:coverage`
- Check jest configuration in package.json

**Socket.IO errors in tests**
- Mock Socket.IO in tests
- Use cy.intercept() for WebSocket connections in Cypress

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Cypress Documentation](https://docs.cypress.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
