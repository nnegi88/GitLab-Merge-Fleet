# Testing Guide

Comprehensive testing documentation for GitLab Merge Fleet, covering unit tests, component tests, and end-to-end tests.

## Overview

GitLab Merge Fleet uses a multi-layered testing strategy to ensure code quality and reliability:

- **Unit Tests**: Test individual functions, services, and utilities in isolation
- **Component Tests**: Test Vue components with rendered DOM and user interactions
- **End-to-End Tests**: Test complete user workflows across the entire application

## Testing Stack

- **Test Runner**: Vitest for unit and component tests
- **E2E Framework**: Playwright for browser automation
- **Test Environment**: jsdom for DOM simulation
- **Test Utilities**: @vue/test-utils for Vue component testing
- **Coverage**: V8 coverage provider with detailed reports

## Quick Start

### Prerequisites

- Node.js 18+
- All project dependencies installed (`npm install`)

### Running Tests

```bash
# Run all tests (unit + component)
npm test

# Run unit tests only
npm run test:unit

# Run component tests only
npm run test:component

# Run E2E tests
npm run test:e2e

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with UI interface
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Run E2E tests with Playwright UI
npm run test:e2e:ui
```

## Test Structure

```
tests/
├── setup.js                    # Global test configuration
├── unit/                       # Unit tests
│   ├── api/                    # API client tests
│   │   └── gitlab.test.js
│   ├── services/               # Service layer tests
│   │   ├── fileAnalysis.test.js
│   │   ├── promptBuilder.test.js
│   │   └── reviewParser.test.js
│   ├── stores/                 # Pinia store tests
│   │   └── authStore.test.js
│   ├── hooks/                  # Composable tests
│   │   ├── useClipboard.test.js
│   │   ├── useProjectBranches.test.js
│   │   └── useRateLimit.test.js
│   └── utils/                  # Utility function tests
│       ├── dateUtils.test.js
│       └── routeTemplate.test.js
├── component/                  # Component tests
│   ├── FilterBar.test.js
│   ├── GlobalErrorBanner.test.js
│   ├── Layout.test.js
│   ├── MergeRequestList.test.js
│   └── pages/                  # Page component tests
│       ├── Dashboard.test.js
│       └── Settings.test.js
└── e2e/                        # End-to-end tests
    ├── setup.spec.js
    ├── dashboard.spec.js
    ├── mr-review.spec.js
    └── bulk-operations.spec.js
```

## Writing Tests

### Unit Tests

Unit tests focus on testing individual functions and modules in isolation.

**Example: Testing a utility function**

```javascript
// tests/unit/utils/dateUtils.test.js
import { describe, it, expect } from 'vitest'
import { formatDate, getRelativeTime } from '@/utils/dateUtils'

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('should format ISO date string to readable format', () => {
      const date = '2024-01-15T10:30:00Z'
      const result = formatDate(date)
      expect(result).toBe('Jan 15, 2024')
    })

    it('should handle null dates', () => {
      expect(formatDate(null)).toBe('-')
    })
  })

  describe('getRelativeTime', () => {
    it('should return relative time for recent dates', () => {
      const now = new Date()
      const result = getRelativeTime(now.toISOString())
      expect(result).toContain('ago')
    })
  })
})
```

**Example: Testing a service**

```javascript
// tests/unit/services/fileAnalysis.test.js
import { describe, it, expect } from 'vitest'
import { FileAnalysisService } from '@/services/fileAnalysis'

describe('FileAnalysisService', () => {
  const service = new FileAnalysisService()

  describe('shouldIncludeFile', () => {
    it('should include JavaScript files', () => {
      expect(service.shouldIncludeFile('src/main.js')).toBe(true)
    })

    it('should exclude binary files', () => {
      expect(service.shouldIncludeFile('image.png')).toBe(false)
    })

    it('should exclude node_modules', () => {
      expect(service.shouldIncludeFile('node_modules/pkg/index.js')).toBe(false)
    })
  })
})
```

### Component Tests

Component tests render Vue components and test their behavior with user interactions.

**Example: Testing a Vue component**

```javascript
// tests/component/FilterBar.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import FilterBar from '@/components/FilterBar.vue'

describe('FilterBar', () => {
  let vuetify

  beforeEach(() => {
    vuetify = createVuetify()
  })

  it('should render filter controls', () => {
    const wrapper = mount(FilterBar, {
      global: {
        plugins: [vuetify]
      }
    })

    expect(wrapper.find('[data-testid="search-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="state-filter"]').exists()).toBe(true)
  })

  it('should emit filter change events', async () => {
    const wrapper = mount(FilterBar, {
      global: {
        plugins: [vuetify]
      }
    })

    const searchInput = wrapper.find('[data-testid="search-input"]')
    await searchInput.setValue('test query')

    expect(wrapper.emitted('update:search')).toBeTruthy()
    expect(wrapper.emitted('update:search')[0]).toEqual(['test query'])
  })
})
```

**Example: Testing a page component**

```javascript
// tests/component/pages/Dashboard.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import Dashboard from '@/pages/Dashboard.vue'

describe('Dashboard', () => {
  let vuetify
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vuetify = createVuetify()
  })

  it('should render dashboard layout', () => {
    const wrapper = mount(Dashboard, {
      global: {
        plugins: [pinia, vuetify],
        stubs: {
          'router-link': true
        }
      }
    })

    expect(wrapper.find('[data-testid="dashboard"]').exists()).toBe(true)
  })

  it('should display loading state', async () => {
    const wrapper = mount(Dashboard, {
      global: {
        plugins: [pinia, vuetify],
        stubs: {
          'router-link': true
        }
      }
    })

    // Mock loading state
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true)
  })
})
```

### End-to-End Tests

E2E tests use Playwright to test complete user workflows in a real browser.

**Example: Testing user setup flow**

```javascript
// tests/e2e/setup.spec.js
import { test, expect } from '@playwright/test'

test.describe('Initial Setup', () => {
  test('should complete GitLab configuration', async ({ page }) => {
    await page.goto('/')

    // Should redirect to setup page
    await expect(page).toHaveURL('/setup')

    // Fill in GitLab configuration
    await page.fill('[data-testid="gitlab-url-input"]', 'https://gitlab.example.com')
    await page.fill('[data-testid="gitlab-token-input"]', 'test-token-123')

    // Submit configuration
    await page.click('[data-testid="save-config-btn"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
  })
})
```

**Example: Testing dashboard interactions**

```javascript
// tests/e2e/dashboard.spec.js
import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Setup GitLab configuration
    await page.goto('/setup')
    await page.fill('[data-testid="gitlab-url-input"]', 'https://gitlab.example.com')
    await page.fill('[data-testid="gitlab-token-input"]', 'test-token')
    await page.click('[data-testid="save-config-btn"]')
  })

  test('should display merge requests', async ({ page }) => {
    await page.goto('/dashboard')

    // Wait for merge requests to load
    await page.waitForSelector('[data-testid="mr-list"]', { timeout: 10000 })

    // Verify merge request items are displayed
    const mrItems = await page.locator('[data-testid="mr-item"]').count()
    expect(mrItems).toBeGreaterThan(0)
  })

  test('should filter merge requests', async ({ page }) => {
    await page.goto('/dashboard')

    // Open filter menu
    await page.click('[data-testid="filter-button"]')

    // Select "Open" state filter
    await page.click('[data-testid="state-open"]')

    // Verify filtered results
    const mrStates = await page.locator('[data-testid="mr-state"]').allTextContents()
    mrStates.forEach(state => {
      expect(state).toContain('Open')
    })
  })
})
```

## Coverage Requirements

The project maintains the following coverage thresholds:

- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

### Target Coverage by Layer

- **Services & Utilities**: 80%+ coverage (critical business logic)
- **Components**: 70%+ coverage (UI interactions)
- **API Clients**: 75%+ coverage (external integrations)

### Viewing Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Coverage reports are generated in:
# - coverage/index.html (HTML report - open in browser)
# - coverage/lcov.info (LCOV format)
# - coverage/coverage-final.json (JSON format)
```

## Best Practices

### General Guidelines

1. **Write Tests First**: Consider TDD (Test-Driven Development) for critical features
2. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
3. **Use Descriptive Names**: Test names should clearly describe what is being tested
4. **Follow AAA Pattern**: Arrange, Act, Assert
5. **Keep Tests Independent**: Each test should run in isolation
6. **Mock External Dependencies**: Use mocks for API calls, external services

### Unit Test Best Practices

- Test edge cases and error conditions
- Use dependency injection for better testability
- Mock external dependencies (API calls, localStorage, etc.)
- Test both success and failure paths
- Keep tests fast and focused

### Component Test Best Practices

- Use `data-testid` attributes for reliable element selection
- Test user interactions (clicks, input, form submission)
- Test component props and emitted events
- Verify conditional rendering and dynamic content
- Mock Vuetify components when needed for faster tests

### E2E Test Best Practices

- Test critical user journeys end-to-end
- Use realistic test data
- Handle asynchronous operations with proper waits
- Take screenshots on failure for debugging
- Keep E2E tests stable and maintainable
- Use page object pattern for complex pages

### Test Data Management

```javascript
// Create reusable test fixtures
// tests/fixtures/mergeRequests.js
export const mockMergeRequest = {
  id: 1,
  title: 'Test MR',
  state: 'opened',
  author: {
    name: 'Test User',
    username: 'testuser'
  },
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T12:00:00Z'
}

export const mockMergeRequests = [
  mockMergeRequest,
  { ...mockMergeRequest, id: 2, title: 'Another MR' }
]
```

### Mocking API Calls

```javascript
// Use vi.mock for module mocking
import { vi } from 'vitest'
import { gitlabApi } from '@/api/gitlab'

vi.mock('@/api/gitlab', () => ({
  gitlabApi: {
    getMergeRequests: vi.fn(() => Promise.resolve([]))
  }
}))

// Configure mock return values in tests
gitlabApi.getMergeRequests.mockResolvedValue(mockMergeRequests)
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Manual workflow dispatch

### CI Configuration

```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm run test:unit

- name: Run Component Tests
  run: npm run test:component

- name: Run E2E Tests
  run: npm run test:e2e

- name: Generate Coverage
  run: npm run test:coverage
```

## Troubleshooting

### Common Issues

#### Vuetify Component Errors

**Problem**: `Cannot read property 'xxx' of undefined` when testing Vuetify components

**Solution**: Ensure Vuetify is properly initialized in test setup

```javascript
import { createVuetify } from 'vuetify'

const vuetify = createVuetify()
const wrapper = mount(Component, {
  global: {
    plugins: [vuetify]
  }
})
```

#### localStorage Errors

**Problem**: `localStorage is not defined` in tests

**Solution**: The global setup file (`tests/setup.js`) already mocks localStorage. Ensure it's being loaded.

#### E2E Test Timeouts

**Problem**: Playwright tests timing out

**Solution**:
1. Increase timeout in test: `test.setTimeout(60000)`
2. Use proper wait conditions: `await page.waitForSelector('[data-testid="element"]')`
3. Check dev server is running: `npm run dev`

#### Coverage Threshold Failures

**Problem**: Coverage below required thresholds

**Solution**:
1. Identify uncovered code: `npm run test:coverage`
2. Open `coverage/index.html` to see detailed report
3. Add tests for uncovered branches/lines
4. Focus on critical business logic first

#### Mock Reset Issues

**Problem**: Mocks persisting between tests

**Solution**: Use `beforeEach` to reset mocks

```javascript
beforeEach(() => {
  vi.clearAllMocks()
})
```

### Debugging Tests

#### Debug Unit/Component Tests

```bash
# Run tests in UI mode for visual debugging
npm run test:ui

# Run tests in watch mode with console output
npm run test:watch

# Run specific test file
npx vitest tests/unit/services/fileAnalysis.test.js
```

#### Debug E2E Tests

```bash
# Run with Playwright UI for visual debugging
npm run test:e2e:ui

# Run with headed browser
npx playwright test --headed

# Run specific test file
npx playwright test tests/e2e/dashboard.spec.js

# Debug mode with Playwright Inspector
npx playwright test --debug
```

#### View Test Artifacts

E2E test artifacts are saved on failure:
- Screenshots: `test-results/*/test-failed-*.png`
- Videos: `test-results/*/video.webm`
- Traces: `test-results/*/trace.zip` (open with `npx playwright show-trace`)

## Advanced Topics

### Custom Matchers

```javascript
// Extend Vitest with custom matchers
expect.extend({
  toBeValidMergeRequest(received) {
    const pass = received.id && received.title && received.state
    return {
      pass,
      message: () => `Expected ${received} to be a valid merge request`
    }
  }
})

// Usage
expect(mergeRequest).toBeValidMergeRequest()
```

### Snapshot Testing

```javascript
// Component snapshot testing
it('should match snapshot', () => {
  const wrapper = mount(Component, {
    global: { plugins: [vuetify] }
  })
  expect(wrapper.html()).toMatchSnapshot()
})
```

### Performance Testing

```javascript
// Measure component render time
it('should render quickly', () => {
  const start = performance.now()
  mount(Component, { global: { plugins: [vuetify] } })
  const duration = performance.now() - start

  expect(duration).toBeLessThan(100) // 100ms threshold
})
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils Guide](https://test-utils.vuejs.org/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)

## Contributing

When adding new features:

1. Write tests alongside implementation
2. Ensure coverage thresholds are met
3. Add E2E tests for user-facing features
4. Update this documentation if introducing new testing patterns
5. Run full test suite before submitting PR: `npm test && npm run test:e2e`

---

For questions or issues with testing, please open an issue on GitHub.
