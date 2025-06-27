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

### Manual Testing
- Test with different GitLab versions (14.9+)
- Test with various repository sizes
- Verify error handling and edge cases
- Test on different browsers (Chrome, Firefox, Safari)

### Automated Testing
- Run existing tests: `npm test` (when available)
- Add tests for new features
- Ensure all tests pass before submitting PR

## Submitting Changes

### Pull Request Process
1. Update documentation if needed
2. Ensure your branch is up to date with `develop`
3. Run linting: `npm run lint`
4. Create a pull request to `develop` branch
5. Fill out the PR template completely
6. Wait for code review

### PR Guidelines
- Keep PRs focused on a single feature/fix
- Provide clear description of changes
- Include screenshots for UI changes
- Reference any related issues
- Be responsive to review feedback

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