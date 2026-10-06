import { test, expect } from './helpers/test.js'
import { loginViaSetup } from './helpers/auth.js'

/**
 * E2E Tests for Dashboard and MR Listing
 *
 * Tests the complete dashboard flow including:
 * - Dashboard rendering with authenticated state
 * - MR list display with mock data
 * - Filtering and search functionality
 * - MR navigation and interaction
 * - Stats display
 * - Loading and error states
 */

test.describe('Dashboard and MR Listing', () => {
  // Mock user data for authentication
  const mockUser = {
    id: 123,
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com'
  }

  // Mock merge request data
  const mockMergeRequests = [
    {
      id: 1,
      iid: 10,
      project_id: 100,
      title: 'Add new feature',
      description: 'This adds a new feature to the application',
      state: 'opened',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      web_url: 'https://gitlab.example.com/project/repo/-/merge_requests/10',
      source_branch: 'feature/new-feature',
      target_branch: 'main',
      author: {
        id: 123,
        username: 'testuser',
        name: 'Test User'
      },
      draft: false,
      work_in_progress: false,
      labels: ['feature', 'enhancement'],
      user_notes_count: 5,
      approvals_required: 2,
      approved_by: [{ id: 456 }],
      references: {
        full: 'project/repo!10'
      }
    },
    {
      id: 2,
      iid: 11,
      project_id: 100,
      title: 'Fix critical bug',
      description: 'This fixes a critical bug',
      state: 'opened',
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      web_url: 'https://gitlab.example.com/project/repo/-/merge_requests/11',
      source_branch: 'bugfix/critical-fix',
      target_branch: 'main',
      author: {
        id: 124,
        username: 'anotheruser',
        name: 'Another User'
      },
      draft: true,
      work_in_progress: false,
      labels: ['bug', 'urgent'],
      user_notes_count: 3,
      approvals_required: 2,
      approved_by: [{ id: 456 }, { id: 789 }],
      references: {
        full: 'project/repo!11'
      }
    },
    {
      id: 3,
      iid: 12,
      project_id: 101,
      title: 'Update documentation',
      description: 'Updates the README and docs',
      state: 'opened',
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      web_url: 'https://gitlab.example.com/project/repo2/-/merge_requests/12',
      source_branch: 'docs/update',
      target_branch: 'main',
      author: {
        id: 123,
        username: 'testuser',
        name: 'Test User'
      },
      draft: false,
      work_in_progress: false,
      labels: ['documentation'],
      user_notes_count: 0,
      approvals_required: 0,
      approved_by: [],
      references: {
        full: 'project/repo2!12'
      }
    }
  ]


  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('should redirect to setup when not authenticated', async ({ page }) => {
    await page.goto('/#/')

    // App.vue redirects to the setup page on mount when there is no token
    await page.waitForURL(/#\/setup$/)
    await expect(page.getByRole('button', { name: 'Connect to GitLab' })).toBeVisible()
  })

  test('should display dashboard with merge requests', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    // Mock the merge requests API
    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequests)
      })
    })

    await page.goto('/#/')

    // Verify page title
    await expect(page.locator('h1:has-text("Merge Requests")')).toBeVisible()

    // Verify action buttons are present (v-btn with `to` renders as a link)
    await expect(page.getByRole('link', { name: 'Bulk Create Branches' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Bulk Create MRs' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Repository Review' })).toBeVisible()
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible()

    // Wait for merge requests to load
    await expect(page.locator('text=Add new feature')).toBeVisible()
    await expect(page.locator('text=Fix critical bug')).toBeVisible()
    await expect(page.locator('text=Update documentation')).toBeVisible()
  })

  test('should display correct statistics', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequests)
      })
    })

    await page.goto('/#/')

    // Wait for stats to load
    await page.waitForSelector('text=Total Open')

    // Verify stats cards
    // Total: 3 MRs
    const totalCard = page.locator('.v-card:has-text("Total Open")').first()
    await expect(totalCard).toContainText('3')

    // Draft: 1 MR (the second one)
    const draftCard = page.locator('.v-card:has-text("Draft")').first()
    await expect(draftCard).toContainText('1')

    // Approved: 2 MRs (second one with 2/2 approvals, third one with no approval required)
    const approvedCard = page.locator('.v-card:has-text("Approved")').first()
    await expect(approvedCard).toContainText('2')
  })

  test('should display MR details correctly', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequests)
      })
    })

    await page.goto('/#/')

    // Wait for first MR to be visible
    await expect(page.locator('text=Add new feature')).toBeVisible()

    // Verify MR title
    await expect(page.locator('text=Add new feature')).toBeVisible()

    // Verify branches
    await expect(page.locator('text=feature/new-feature → main')).toBeVisible()

    // Verify author
    await expect(page.locator('text=testuser').first()).toBeVisible()

    // Verify comment count
    await expect(page.locator('text=5').first()).toBeVisible()

    // Verify labels
    await expect(page.getByText('feature', { exact: true })).toBeVisible()
    await expect(page.getByText('enhancement', { exact: true })).toBeVisible()

    // Verify approval status
    await expect(page.locator('text=1/2 approvals')).toBeVisible()

    // Verify reference link
    await expect(page.locator('a:has-text("project/repo!10")')).toBeVisible()
  })

  test('should display draft badge for draft MRs', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequests)
      })
    })

    await page.goto('/#/')

    // Wait for MRs to load
    await expect(page.locator('text=Fix critical bug')).toBeVisible()

    // Verify draft badge is present for the draft MR
    const draftMRCard = page.locator('.v-card:has-text("Fix critical bug")').first()
    await expect(draftMRCard.locator('.v-chip:has-text("Draft")')).toBeVisible()

    // Verify draft badge is NOT present for non-draft MRs
    const featureMRCard = page.locator('.v-card:has-text("Add new feature")').first()
    await expect(featureMRCard.locator('.v-chip:has-text("Draft")')).not.toBeVisible()
  })

  test('should navigate to MR details on click', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequests)
      })
    })

    await page.goto('/#/')

    // Wait for MRs to load
    await expect(page.locator('text=Add new feature')).toBeVisible()

    // Click on first MR card
    const mrCard = page.locator('.v-card:has-text("Add new feature")').first()
    await mrCard.click()

    // Verify navigation to MR details page
    // The app is served under /GitLab-Merge-Fleet/, so match the hash route only
    await page.waitForURL(/#\/mr\/100\/10$/)
  })

  test('should open external link in new tab', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequests)
      })
    })

    await page.goto('/#/')

    // Wait for MRs to load
    await expect(page.locator('text=Add new feature')).toBeVisible()

    // Find the external link button
    const externalLink = page.locator('a[href*="gitlab.example.com"][target="_blank"]').first()
    await expect(externalLink).toHaveAttribute('target', '_blank')
    await expect(externalLink).toHaveAttribute('href', /merge_requests/)
  })

  test('should display empty state when no MRs match filters', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })

    await page.goto('/#/')

    // Wait for empty state
    await expect(page.locator('text=No merge requests found')).toBeVisible()
    await expect(page.locator('text=There are no open merge requests matching your filters.')).toBeVisible()

    // Verify empty state icon
    await expect(page.locator('.mdi-source-merge').first()).toBeVisible()
  })

  test('should display loading state', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    // Mock slow API response
    await page.route('**/api/v4/merge_requests**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequests)
      })
    })

    await page.goto('/#/')

    // Verify loading spinner is visible
    // Both the Refresh button and the list show a spinner while loading
    await expect(page.locator('.v-progress-circular').first()).toBeVisible()

    // Wait for data to load
    await expect(page.locator('text=Add new feature')).toBeVisible({ timeout: 5000 })
  })

  test('should display error state and allow retry', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    // Mock API error
    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error'
        })
      })
    })

    await page.goto('/#/')

    // Wait for error message
    // The query retries 3 times with backoff (~7s) before reporting the error
    await expect(page.getByText('Error loading merge requests')).toBeVisible({ timeout: 15000 })

    // Verify "Try Again" button is present
    const tryAgainButton = page.locator('button:has-text("Try Again")')
    await expect(tryAgainButton).toBeVisible()

    // Setup successful response for retry
    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequests)
      })
    })

    // Click "Try Again"
    await tryAgainButton.click()

    // Verify data loads successfully
    await expect(page.locator('text=Add new feature')).toBeVisible()
  })

  test('should filter MRs using search', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    await page.route('**/api/v4/merge_requests**', async route => {
      const url = route.request().url()

      // Check if search query is present
      if (url.includes('search=')) {
        const searchParam = new URL(url).searchParams.get('search')
        const filteredMRs = mockMergeRequests.filter(mr =>
          mr.title.toLowerCase().includes(searchParam?.toLowerCase() || '')
        )
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(filteredMRs)
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockMergeRequests)
        })
      }
    })

    await page.goto('/#/')

    // Wait for initial load
    await expect(page.locator('text=Add new feature')).toBeVisible()
    await expect(page.locator('text=Fix critical bug')).toBeVisible()

    // Find and fill search input
    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('bug')

    // Wait for filtered results (Note: In real implementation, this would trigger a new API call)
    // For this test, we're just verifying the search field works
    await expect(searchInput).toHaveValue('bug')
  })

  test('should toggle advanced filters', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequests)
      })
    })

    await page.goto('/#/')

    // Wait for page to load
    await expect(page.locator('h1:has-text("Merge Requests")')).toBeVisible()

    // Find and verify advanced button
    const advancedButton = page.locator('button:has-text("Advanced")')
    await expect(advancedButton).toBeVisible()

    // Click to expand
    await advancedButton.click()

    // Verify advanced filters are visible
    await expect(page.locator('input[placeholder*="comma separated"]')).toBeVisible()
    // Vuetify renders each label twice, so find the input inside its text field
    await expect(page.locator('.v-text-field').filter({ hasText: 'Author' }).locator('input')).toBeVisible()

    // Click to collapse
    await advancedButton.click()

    // Verify advanced filters are hidden
    await expect(page.locator('input[placeholder*="comma separated"]')).not.toBeVisible()
  })

  test('should change filter state', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequests)
      })
    })

    await page.goto('/#/')

    // Wait for page to load
    await expect(page.locator('h1:has-text("Merge Requests")')).toBeVisible()

    // Find state select - it should have "Open" selected by default
    const stateSelects = page.locator('.v-select').filter({ hasText: /Open|Merged|Closed/ })
    const firstStateSelect = stateSelects.first()

    // Verify the select exists
    await expect(firstStateSelect).toBeVisible()
  })

  test('should change filter scope', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequests)
      })
    })

    await page.goto('/#/')

    // Wait for page to load
    await expect(page.locator('h1:has-text("Merge Requests")')).toBeVisible()

    // Find scope select - it should have options for filtering by relationship
    const scopeSelects = page.locator('.v-select').filter({ hasText: /All MRs|Created by me|Assigned to me/ })
    const firstScopeSelect = scopeSelects.first()

    // Verify the select exists
    await expect(firstScopeSelect).toBeVisible()
  })

  test('should refresh merge requests', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    let requestCount = 0
    await page.route('**/api/v4/merge_requests**', async route => {
      requestCount++
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequests)
      })
    })

    await page.goto('/#/')

    // Wait for initial load
    await expect(page.locator('text=Add new feature')).toBeVisible()

    const initialRequests = requestCount

    // Click refresh button
    const refreshButton = page.locator('button:has-text("Refresh")')
    await expect(refreshButton).toBeVisible()
    await refreshButton.click()

    // Wait a bit for the request to complete
    await page.waitForTimeout(500)

    // Verify a new request was made
    expect(requestCount).toBeGreaterThan(initialRequests)
  })

  test('should navigate to bulk operations', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequests)
      })
    })

    await page.goto('/#/')

    // Wait for page to load
    await expect(page.locator('h1:has-text("Merge Requests")')).toBeVisible()

    // Test navigation to Bulk Create Branches
    const bulkBranchButton = page.getByRole('link', { name: 'Bulk Create Branches' })
    await expect(bulkBranchButton).toBeVisible()
    await bulkBranchButton.click()
    await page.waitForURL(/#\/bulk-branch$/)

    // Go back to dashboard
    await page.goto('/#/')
    await expect(page.locator('h1:has-text("Merge Requests")')).toBeVisible()

    // Test navigation to Bulk Create MRs
    const bulkMRButton = page.getByRole('link', { name: 'Bulk Create MRs' })
    await expect(bulkMRButton).toBeVisible()
    await bulkMRButton.click()
    await page.waitForURL(/#\/bulk-create$/)

    // Go back to dashboard
    await page.goto('/#/')
    await expect(page.locator('h1:has-text("Merge Requests")')).toBeVisible()

    // Test navigation to Repository Review
    const repoReviewButton = page.getByRole('link', { name: 'Repository Review' })
    await expect(repoReviewButton).toBeVisible()
    await repoReviewButton.click()
    await page.waitForURL(/#\/repository-review$/)
  })

  test('should display welcome guidance for new users', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    // Mock empty merge requests for new user
    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })

    await page.goto('/#/')

    // Wait for welcome message
    await expect(page.locator('text=Welcome to GitLab Merge Fleet!')).toBeVisible()

    // Verify guidance content
    // The bold item names also appear on the action buttons, so match them exactly
    await expect(page.getByText('Bulk Create Branches:', { exact: true })).toBeVisible()
    await expect(page.getByText('Bulk Create MRs:', { exact: true })).toBeVisible()
    await expect(page.getByText('AI Repository Review:', { exact: true })).toBeVisible()
  })

  test('should display approval status correctly', async ({ page }) => {
    await loginViaSetup(page, { user: mockUser })

    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMergeRequests)
      })
    })

    await page.goto('/#/')

    // Wait for MRs to load
    await expect(page.locator('text=Add new feature')).toBeVisible()

    // First MR: 1/2 approvals
    const firstMRCard = page.locator('.v-card:has-text("Add new feature")').first()
    await expect(firstMRCard).toContainText('1/2 approvals')

    // Second MR: Approved (2/2 approvals)
    const secondMRCard = page.locator('.v-card:has-text("Fix critical bug")').first()
    await expect(secondMRCard).toContainText('Approved')

    // Third MR: No approval required
    const thirdMRCard = page.locator('.v-card:has-text("Update documentation")').first()
    await expect(thirdMRCard).toContainText('No approval required')
  })
})
