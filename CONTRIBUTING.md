# Contributing to MeetEasier

First off, thank you for considering contributing to MeetEasier! It's people like you that make MeetEasier such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our commitment to providing a welcoming and inspiring community for all. Please be respectful and constructive in your interactions.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Bug Report Template:**

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. Ubuntu 22.04, Windows 11, macOS 14]
 - Node.js version: [e.g. 20.10.0]
 - Browser: [e.g. Chrome 120, Firefox 121]
 - MeetEasier version: [e.g. 0.6.0]
 - Deployment method: [e.g. Docker, npm, IIS]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful** to most MeetEasier users
- **List any similar features** in other applications if applicable

### Pull Requests

1. **Fork the repository** and create your branch from `master`
2. **Make your changes** following our coding standards
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Write clear commit messages**
6. **Submit a pull request**

## Development Setup

### Prerequisites

- Node.js 20+ and npm 9+
- Git
- A Microsoft 365 account with admin access (for testing)

### Getting Started

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/MeetEasier.git
   cd MeetEasier
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.template .env
   # Edit .env with your Microsoft Graph API credentials
   ```

4. **Start development**
   ```bash
   # Terminal 1: Start the backend server
   npm start

   # Terminal 2: Start the React development server
   npm run start-ui-dev
   ```

5. **Watch SCSS changes** (optional)
   ```bash
   npm run watch-css
   ```

### Project Structure

```
MeetEasier/
├── app/                    # Backend routes and logic
│   ├── msgraph/           # Microsoft Graph API integration
│   ├── ews/               # EWS integration (deprecated)
│   ├── routes.js          # API routes
│   └── socket-controller.js # WebSocket handling
├── config/                # Server configuration
├── data/                  # Runtime configuration files
├── scss/                  # SCSS source files
├── static/                # Static assets
├── ui-react/              # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── config/       # Frontend configuration
│   │   ├── layouts/      # Page layouts
│   │   └── utils/        # Utility functions
│   └── public/           # Public assets
└── server.js             # Express server entry point
```

## Coding Standards

### JavaScript/React

- Use **ES6+ syntax**
- Follow **React best practices**
- Use **functional components** with hooks for new components
- Use **PropTypes** for type checking
- Write **meaningful variable and function names**
- Add **JSDoc comments** for complex functions

**Example:**
```javascript
/**
 * Format time range for display
 * @param {Date} start - Start time
 * @param {Date} end - End time
 * @param {boolean} use24Hour - Use 24-hour format
 * @returns {string} Formatted time range
 */
const formatTimeRange = (start, end, use24Hour = false) => {
  // Implementation
};
```

### SCSS

- Use **SCSS modules** with `@use` (not `@import`)
- Follow **BEM naming convention** for classes
- Use **variables** from `_modern-variables.scss`
- Keep **selectors specific** but not overly nested (max 3 levels)
- Use **clamp()** for responsive sizing

**Example:**
```scss
@use 'modern-variables' as *;

.booking-modal {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: clamp($space-4, 2vw, $space-6);
  
  &__header {
    font-size: $font-size-2xl;
    font-weight: $font-weight-bold;
  }
  
  &__button {
    background: $success-600;
    
    &:hover {
      background: $success-700;
    }
  }
}
```

### Git Commit Messages

- Use the **present tense** ("Add feature" not "Added feature")
- Use the **imperative mood** ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to **72 characters or less**
- Reference issues and pull requests liberally after the first line

**Examples:**
```
Add room booking feature with conflict detection

- Implement quick booking buttons (15/30/60 min)
- Add custom time selection
- Integrate conflict detection API
- Add German translations

Fixes #123
```

### Testing

- Write **unit tests** for new features
- Ensure **existing tests pass** before submitting PR
- Test on **multiple browsers** (Chrome, Firefox, Safari, Edge)
- Test **responsive design** on different screen sizes

**Run tests:**
```bash
cd ui-react
npm test
```

## Documentation

- Update **README.md** for new features
- Add **JSDoc comments** for functions
- Update **CHANGELOG.md** with your changes
- Include **code examples** where helpful

## Translation

MeetEasier supports multiple languages. When adding new UI text:

1. Add translations to the appropriate config file or component
2. Support at least **English and German**
3. Use **browser language detection** where appropriate
4. Test with different language settings

**Example:**
```javascript
const translations = {
  en: {
    title: 'Book Room',
    cancel: 'Cancel',
    submit: 'Book'
  },
  de: {
    title: 'Raum buchen',
    cancel: 'Abbrechen',
    submit: 'Buchen'
  }
};

const lang = navigator.language.split('-')[0];
const t = translations[lang] || translations.en;
```

## Accessibility

- Use **semantic HTML** elements
- Include **ARIA labels** for interactive elements
- Ensure **keyboard navigation** works
- Test with **screen readers** when possible
- Maintain **sufficient color contrast**

## Performance

- **Optimize images** before committing
- Use **lazy loading** for large components
- Minimize **bundle size** (check with `npm run build`)
- Avoid **unnecessary re-renders** in React
- Use **memoization** where appropriate

## Security

- **Never commit** sensitive data (API keys, passwords, tokens)
- Use **environment variables** for configuration
- **Validate user input** on both client and server
- Follow **OWASP best practices**
- Report security issues privately (see SECURITY.md)

## Release Process

Releases are managed by project maintainers:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a git tag
4. Build and test Docker image
5. Publish release notes

## Questions?

Feel free to open an issue with the `question` label if you have any questions about contributing.

## Recognition

Contributors will be recognized in:
- Release notes
- README.md (if significant contribution)
- Git commit history

Thank you for contributing to MeetEasier! 🎉
