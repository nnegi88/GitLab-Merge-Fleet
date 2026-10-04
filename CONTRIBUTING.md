# Contributing to GitLab Merge Fleet

Thank you for your interest in contributing to GitLab Merge Fleet! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct. We expect all contributors to:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Accept feedback gracefully

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Set up the development environment:
   ```bash
   npm install
   npm run dev
   ```
4. Create a feature branch from `develop`
5. Make your changes
6. Test thoroughly
7. Submit a pull request

## Development Setup

### Prerequisites
- Node.js 18+ and npm 8+
- GitLab instance for testing (can use gitlab.com)
- GitLab Personal Access Token for development

### Environment Setup
1. Copy `.env.example` to `.env` (if provided)
2. Configure your GitLab instance URL
3. Add your Personal Access Token in the app settings

## Development Guidelines

### Code Style
- Follow the existing code style and patterns
- Use Vuetify 3 components exclusively for UI
- Use Material Design Icons (mdi-*) for icons
- Run `npm run lint` before committing
- Keep components small and focused
- Write clear, self-documenting code

### UI/UX Guidelines
- Follow Material Design 3 principles
- Ensure responsive design works on all screen sizes
- Provide proper loading states and error handling
- Test with keyboard navigation and screen readers
- Use Vuetify's built-in accessibility features

### Git Workflow
1. Create feature branches from `develop`
2. Use meaningful branch names: `feature/add-bulk-approve`
3. Write clear commit messages
4. Keep commits focused and atomic
5. Update documentation as needed
6. Add tests for new features

### Commit Messages
Follow conventional commits format:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Build process or auxiliary tool changes

Example: `feat: add bulk approval functionality to dashboard`

## Testing

GitLab Merge Fleet has a comprehensive automated test suite. **All new features and bug fixes must include appropriate tests.**

### Test Requirements

When contributing code, you must:

1. **Write tests for new features**
   - Unit tests for services, utilities, and business logic
   - Component tests for Vue components
   - E2E tests for new user-facing workflows

2. **Update existing tests** when modifying code
   - Fix any tests broken by your changes
   - Add test cases for edge cases and bug fixes

3. **Meet coverage requirements**
   - Maintain 70%+ overall coverage
   - Services and utilities should have 80%+ coverage
   - Components should have 70%+ coverage

4. **Run all tests locally before submitting PR**
   ```bash
   # Run all tests
   npm test

   # Run with coverage to check thresholds
   npm run test:coverage

   # Run E2E tests
   npm run test:e2e
   ```

### Testing Stack

- **Vitest**: Unit and component tests
- **Playwright**: End-to-end browser tests
- **Vue Test Utils**: Component testing utilities
- **Coverage**: V8 coverage with detailed reporting

### Quick Test Commands

```bash
# Run all tests (unit + component)
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with UI for visual debugging
npm run test:ui

# Run specific test types
npm run test:unit        # Unit tests only
npm run test:component   # Component tests only
npm run test:e2e         # E2E tests only

# Generate coverage report
npm run test:coverage
```

### Writing Tests

**For utility functions and services:**
- Create unit tests in `tests/unit/`
- Test all public methods and edge cases
- Mock external dependencies (API calls, localStorage)
- Aim for 80%+ coverage

**For Vue components:**
- Create component tests in `tests/component/`
- Test rendering, props, events, and user interactions
- Use `data-testid` attributes for reliable element selection
- Mock Vuetify, Router, and Pinia when needed
- Aim for 70%+ coverage

**For user workflows:**
- Create E2E tests in `tests/e2e/`
- Test complete user journeys (setup, dashboard, MR review)
- Use Playwright for browser automation
- Mock GitLab API responses for consistent testing

**Example test structure:**

```javascript
// tests/unit/services/myService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MyService } from '@/services/myService'

describe('MyService', () => {
  let service

  beforeEach(() => {
    service = new MyService()
  })

  it('should handle valid input', () => {
    const result = service.process('valid input')
    expect(result).toBe('expected output')
  })

  it('should handle edge cases', () => {
    expect(service.process(null)).toBe(null)
    expect(service.process('')).toBe('')
  })
})
```

For detailed testing guides with examples, see **[TESTING.md](./TESTING.md)**.

### Manual Testing

In addition to automated tests, please verify:

- Test with different GitLab versions (14.9+)
- Test with various repository sizes
- Verify error handling and edge cases
- Test on different browsers (Chrome, Firefox, Safari)
- Test accessibility with keyboard navigation

## Submitting Changes

### Pull Request Process
1. **Ensure all tests pass** locally:
   ```bash
   npm test           # Unit and component tests
   npm run test:e2e   # E2E tests
   npm run test:coverage  # Verify coverage thresholds
   ```
2. Run linting: `npm run lint`
3. Update documentation if needed
4. Ensure your branch is up to date with `develop`
5. Create a pull request to `develop` branch
6. Fill out the PR template completely
7. Wait for code review and CI checks to complete

### PR Guidelines
- Keep PRs focused on a single feature/fix
- Provide clear description of changes
- **Include tests for all new code** (required)
- Include screenshots for UI changes
- Reference any related issues
- Ensure CI tests pass (GitHub Actions will run automatically)
- Be responsive to review feedback
- Meet coverage thresholds (checked automatically in CI)

## Feature Requests & Bug Reports

### Feature Requests
- Check existing issues first
- Provide clear use case and benefits
- Include mockups or examples if applicable
- Be open to discussion and alternatives

### Bug Reports
- Search existing issues before creating new ones
- Include steps to reproduce
- Provide browser and GitLab version info
- Include console errors if any
- Add screenshots when helpful

## Architecture Decisions

When proposing significant changes:
1. Open an issue for discussion first
2. Explain the problem being solved
3. Describe proposed solution
4. Consider backwards compatibility
5. Document any breaking changes

## Documentation

- Update README.md for user-facing changes
- Update CLAUDE.md for implementation details
- Add JSDoc comments for complex functions
- Include inline comments for non-obvious code
- Keep documentation concise and accurate

## Release Process

Releases are managed by maintainers:
1. Features merged to `develop`
2. Testing in development environment
3. Merge to `main` for release
4. Tag with semantic version
5. Update changelog

## Questions?

- Open an issue for questions
- Join discussions in existing issues
- Check CLAUDE.md for technical details
- Review closed PRs for examples

Thank you for contributing to GitLab Merge Fleet!