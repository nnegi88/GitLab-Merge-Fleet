# GitLab Merge Fleet

A modern, frontend-only GitLab multi-repository merge request management tool with AI-powered code reviews.

## Features

- **Multi-Repository Management**: View and manage merge requests across multiple GitLab repositories in a unified dashboard
- **AI Code Reviews**: Integrated Google Gemini 2.5 Flash for intelligent code review and analysis
- **Modern UI**: Built with Vue.js 3 and Vuetify 3 Material Design components
- **Real-time Updates**: Efficient data fetching with TanStack Vue Query and automatic caching
- **Secure**: User-provided tokens stored encrypted in browser localStorage
- **No Backend Required**: Fully frontend-only architecture

## Technology Stack

- **Frontend**: Vue.js 3.4+ with Composition API
- **UI Framework**: Vuetify 3 with Material Design 3 blueprint
- **Build Tool**: Vite 5+ for fast development and builds
- **State Management**: Pinia for reactive state management
- **Data Fetching**: TanStack Vue Query with intelligent caching
- **Icons**: Material Design Icons (@mdi/font)
- **Markdown**: Professional rendering with `marked` library
- **AI Integration**: Google Gemini 2.5 Flash Preview for code reviews
- **Architecture**: Modular service-based architecture with dependency injection

## Quick Start

### Prerequisites

- Node.js 18+ 
- GitLab Personal Access Token with `api`, `read_repository`, `write_repository` scopes
- Google Gemini API key (optional, for AI reviews)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/gitlab-merge-fleet.git
cd gitlab-merge-fleet
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Open http://localhost:4000 and configure your GitLab token in Settings

### Build for Production

```bash
npm run build
npm run preview
```

## Configuration

### GitLab Setup
1. Navigate to Settings page in the application
2. Add your GitLab base URL: `https://gitlab.example.com`
3. Provide your GitLab Personal Access Token
4. Configure repository filters as needed

### AI Reviews (Optional)
1. Obtain a Google Gemini API key
2. Add it in the Settings page
3. AI review functionality will be enabled automatically

## Architecture

The codebase follows a modular, service-based architecture designed for extensibility and maintainability:

### Service Layer Architecture
- **Configuration Layer**: Centralized configuration in `src/config/`
- **Service Layer**: Modular, injectable services in `src/services/`
- **Utility Layer**: Core utilities and analyzers in `src/utils/`
- **API Layer**: External integrations in `src/api/`
- **Component Layer**: Vue.js components in `src/components/` and `src/pages/`

### Dependency Injection
All services support constructor-based dependency injection for testing and customization:
```javascript
const customFileAnalysis = new CustomFileAnalysisService(options)
const analyzer = new RepositoryAnalyzer(options, customFileAnalysis)
```

## Project Structure

```
src/
├── components/          # Reusable Vue components
│   ├── FilterBar.vue   # Advanced filtering interface
│   ├── Layout.vue      # Application layout wrapper
│   └── MergeRequestList.vue # MR list display
├── pages/              # Page components
│   ├── Dashboard.vue   # Main dashboard
│   ├── Settings.vue    # Configuration page
│   └── Setup.vue       # Initial setup wizard
├── stores/             # Pinia state stores
│   └── authStore.js    # Authentication state
├── config/             # Centralized configuration
│   └── analysis.js     # File analysis & filtering config
├── services/           # Modular business logic services
│   ├── fileAnalysis.js # File filtering & prioritization
│   ├── promptBuilder.js # AI prompt generation
│   └── reviewParser.js # AI response parsing
├── api/                # API integration
│   ├── gitlab.js       # GitLab API client
│   └── gemini.js       # AI review service
├── utils/              # Utility functions
│   ├── repositoryAnalyzer.js # Repository analysis
│   └── dateUtils.js    # Date formatting
└── plugins/            # Vue plugins
    └── vuetify.js      # Vuetify configuration
```

## Development

### Available Commands

```bash
# Development server (port 4000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Development Guidelines

- Use Vuetify 3 components exclusively for UI consistency
- Follow Material Design 3 patterns and spacing
- Use Material Design Icons (mdi-*) for all iconography
- Implement proper loading states and error handling
- Test with GitLab Enterprise Edition 14.9.0-ee compatibility
- Follow the modular service architecture for new features
- Use dependency injection for testable, extensible code

## Features in Detail

### Multi-Repository Dashboard
- Unified view of merge requests across selected repositories
- Advanced filtering by state, author, labels, and date ranges
- Real-time pipeline status with GitLab 14.9 compatibility
- Sortable columns and pagination

### AI Code Reviews
- Complete diff analysis using Google Gemini 2.5 Flash
- Structured markdown output with professional rendering
- One-click posting of reviews as GitLab comments
- Configurable review parameters

### Bulk Operations
- Create multiple merge requests across repositories
- Bulk branch creation with consistent naming
- Template-based MR descriptions

## GitLab Compatibility

Designed for GitLab Enterprise Edition 14.9.0-ee with:
- Custom pipeline enrichment for older GitLab versions
- Proper handling of EE-specific features (approval rules, weights)
- Efficient API usage with rate limiting considerations

## Security

- Personal Access Tokens encrypted using Web Crypto API
- All sensitive data stored locally in browser
- No server-side storage or transmission of credentials
- HTTPS-only communication with GitLab instance

## Deployment

### GitHub Pages (Automatic)

The project includes GitHub Actions workflow for automatic deployment to GitHub Pages:

1. Push changes to the `main` branch
2. GitHub Actions will automatically build and deploy
3. Access your deployment at: `https://[username].github.io/GitLab-Merge-Fleet/`

### Manual Deployment

For other static hosting services:

```bash
npm run build
```

The built files will be in the `dist/` directory and can be served from any web server or CDN.

For manual GitHub Pages deployment:
```bash
npm run deploy
```

### Configuration Files
- `.env.example` - Example environment variables

## Extending the Application

The codebase is designed for extensibility through a modular service architecture. See [`EXTENSION_POINTS.md`](./EXTENSION_POINTS.md) for detailed documentation on:

- Adding new file analysis strategies
- Implementing custom AI prompt builders
- Creating custom review parsers
- Extending the repository analyzer
- Adding new AI providers
- Implementing custom workflows

### Quick Extension Example
```javascript
// Create custom file analysis for React projects
class ReactFileAnalysisService extends FileAnalysisService {
  prioritizeFiles(files, languages) {
    const prioritized = super.prioritizeFiles(files, languages)
    return prioritized.map(file => {
      if (file.path.includes('components/') || file.path.includes('hooks/')) {
        file.priority += 10 // Boost React-specific files
      }
      return file
    })
  }
}

// Use custom service
const customAnalyzer = new RepositoryAnalyzer({}, new ReactFileAnalysisService())
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the development guidelines
3. Follow the modular architecture patterns for new features
4. Test thoroughly with the development server
5. Run `npm run lint` to ensure code quality
6. Create a merge request with a clear description

## Support

For issues and questions:
- Create an issue in the GitLab repository
- Review the CLAUDE.md file for detailed implementation notes

## License

MIT License - see LICENSE file for details.
