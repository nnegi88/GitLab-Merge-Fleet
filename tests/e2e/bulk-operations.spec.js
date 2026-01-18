import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Bulk Operations
 *
 * Tests the complete bulk merge request creation flow including:
 * - Repository selection with search functionality
 * - MR details configuration (branches, title, description)
 * - Form validation and branch existence checking
 * - Bulk MR creation with progress tracking
 * - Success and error handling for multiple repositories
 * - Progress modal with real-time status updates
 */

test.describe('Bulk Operations', () => {
  // Mock user data for authentication
  const mockUser = {
    id: 123,
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com'
  }

  // Mock projects data
  const mockProjects = [
    {
      id: 100,
      name: 'frontend-app',
      name_with_namespace: 'Company / frontend-app',
      web_url: 'https://gitlab.example.com/company/frontend-app'
    },
    {
      id: 101,
      name: 'backend-api',
      name_with_namespace: 'Company / backend-api',
      web_url: 'https://gitlab.example.com/company/backend-api'
    },
    {
      id: 102,
      name: 'mobile-app',
      name_with_namespace: 'Company / mobile-app',
      web_url: 'https://gitlab.example.com/company/mobile-app'
    },
    {
      id: 103,
      name: 'documentation',
      name_with_namespace: 'Company / documentation',
      web_url: 'https://gitlab.example.com/company/documentation'
    }
  ]

  // Mock branches data
  const mockBranches = [
    { name: 'main' },
    { name: 'develop' },
    { name: 'feature/new-feature' },
    { name: 'staging' }
  ]

  // Mock created MR
  const mockMergeRequest = {
    id: 1,
    iid: 10,
    title: 'Add new feature',
    web_url: 'https://gitlab.example.com/company/frontend-app/-/merge_requests/10',
    source_branch: 'feature/new-feature',
    target_branch: 'main'
  }

  // Helper to setup authenticated state
  async function setupAuthenticatedState(page) {
    await page.goto('/')

    // Set up localStorage with auth data
    await page.evaluate(({ gitlabUrl, encryptedToken }) => {
      localStorage.setItem('auth-storage', JSON.stringify({
        gitlabUrl,
        encryptedToken,
        sessionOnly: false
      }))
    }, {
      gitlabUrl: 'https://gitlab.example.com',
      encryptedToken: {
        encrypted: 'encrypted-token-data',
        key: 'key-data',
        iv: 'iv-data'
      }
    })

    // Mock the GitLab API user endpoint
    await page.route('**/api/v4/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser)
      })
    })
  }

  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('should display bulk create page with empty form', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    await page.goto('/#/bulk-create')

    // Verify page title
    await expect(page.locator('text=Bulk Merge Request Creation')).toBeVisible()

    // Verify Step 1 section
    await expect(page.locator('text=Step 1: Select Repositories')).toBeVisible()

    // Verify search field
    const searchInput = page.locator('input[placeholder*="Search repositories"]')
    await expect(searchInput).toBeVisible()

    // Verify Step 2 section
    await expect(page.locator('text=Step 2: Merge Request Details')).toBeVisible()

    // Verify form fields
    await expect(page.locator('input[label="Source Branch"]').or(page.locator('label:has-text("Source Branch")'))).toBeVisible()
    await expect(page.locator('input[label="Target Branch"]').or(page.locator('label:has-text("Target Branch")'))).toBeVisible()
    await expect(page.locator('input[label="Title"]').or(page.locator('label:has-text("Title")'))).toBeVisible()

    // Verify Create button is disabled initially
    const createButton = page.locator('button:has-text("Create")')
    await expect(createButton).toBeDisabled()

    // Verify Cancel button
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible()
  })

  test('should load and display projects', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    await page.goto('/#/bulk-create')

    // Wait for projects to load
    await expect(page.locator('text=Company / frontend-app')).toBeVisible()
    await expect(page.locator('text=Company / backend-api')).toBeVisible()
    await expect(page.locator('text=Company / mobile-app')).toBeVisible()
    await expect(page.locator('text=Company / documentation')).toBeVisible()

    // Verify project URLs are displayed
    await expect(page.locator('text=https://gitlab.example.com/company/frontend-app')).toBeVisible()
  })

  test('should display loading state while fetching projects', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock slow projects API
    await page.route('**/api/v4/projects**', async route => {
      await new Promise(resolve => setTimeout(resolve, 500))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    await page.goto('/#/bulk-create')

    // Verify loading state
    await expect(page.locator('.v-progress-circular')).toBeVisible()
    await expect(page.locator('text=Loading repositories...')).toBeVisible()

    // Wait for projects to load
    await expect(page.locator('text=Company / frontend-app')).toBeVisible({ timeout: 3000 })
  })

  test('should display error state when projects fail to load', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock failed projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error'
        })
      })
    })

    await page.goto('/#/bulk-create')

    // Verify error message
    await expect(page.locator('.v-alert--type-error')).toBeVisible()
    await expect(page.locator('text=Error loading repositories')).toBeVisible()
  })

  test('should allow selecting and deselecting repositories', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    await page.goto('/#/bulk-create')

    // Wait for projects to load
    await expect(page.locator('text=Company / frontend-app')).toBeVisible()

    // Verify initial state shows 0 selected
    await expect(page.locator('text=0 repositories selected')).toBeVisible()

    // Find and click first checkbox
    const firstCheckbox = page.locator('.v-checkbox').first()
    await firstCheckbox.click()

    // Verify count updates
    await expect(page.locator('text=1 repositories selected').or(page.locator('text=1 repository selected'))).toBeVisible()

    // Click second checkbox
    const secondCheckbox = page.locator('.v-checkbox').nth(1)
    await secondCheckbox.click()

    // Verify count updates
    await expect(page.locator('text=2 repositories selected')).toBeVisible()

    // Deselect first checkbox
    await firstCheckbox.click()

    // Verify count decreases
    await expect(page.locator('text=1 repositories selected').or(page.locator('text=1 repository selected'))).toBeVisible()
  })

  test('should filter repositories using search', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    await page.goto('/#/bulk-create')

    // Wait for projects to load
    await expect(page.locator('text=Company / frontend-app')).toBeVisible()
    await expect(page.locator('text=Company / backend-api')).toBeVisible()

    // Search for "frontend"
    const searchInput = page.locator('input[placeholder*="Search repositories"]')
    await searchInput.fill('frontend')

    // Verify only frontend-app is visible
    await expect(page.locator('text=Company / frontend-app')).toBeVisible()
    await expect(page.locator('text=Company / backend-api')).not.toBeVisible()

    // Clear search
    await searchInput.clear()

    // Verify all projects are visible again
    await expect(page.locator('text=Company / frontend-app')).toBeVisible()
    await expect(page.locator('text=Company / backend-api')).toBeVisible()
  })

  test('should enable create button when form is valid', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    await page.goto('/#/bulk-create')

    // Wait for projects to load
    await expect(page.locator('text=Company / frontend-app')).toBeVisible()

    // Create button should be disabled
    const createButton = page.locator('button:has-text("Create")')
    await expect(createButton).toBeDisabled()

    // Select a repository
    const firstCheckbox = page.locator('.v-checkbox').first()
    await firstCheckbox.click()

    // Still disabled without form details
    await expect(createButton).toBeDisabled()

    // Fill in source branch
    const sourceBranchInput = page.locator('input[placeholder="feature/new-feature"]')
    await sourceBranchInput.fill('feature/new-feature')

    // Fill in title
    const titleInput = page.locator('input[placeholder="Add new feature"]')
    await titleInput.fill('Add new feature')

    // Target branch should have default value "main", so button should be enabled now
    await expect(createButton).not.toBeDisabled()
    await expect(createButton).toContainText('Create 1 Merge Request')
  })

  test('should display validation warning when branches are specified', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    await page.goto('/#/bulk-create')

    // Wait for projects to load and select a repository
    await expect(page.locator('text=Company / frontend-app')).toBeVisible()
    const firstCheckbox = page.locator('.v-checkbox').first()
    await firstCheckbox.click()

    // Fill in branches
    const sourceBranchInput = page.locator('input[placeholder="feature/new-feature"]')
    await sourceBranchInput.fill('feature/new-feature')

    // Verify validation warning appears
    await expect(page.locator('.v-alert--type-warning')).toBeVisible()
    await expect(page.locator('text=Branch Validation')).toBeVisible()
    await expect(page.locator('text=feature/new-feature')).toBeVisible()
    await expect(page.locator('text=main')).toBeVisible()
    await expect(page.locator('text=Repositories without these branches will be skipped')).toBeVisible()
  })

  test('should update create button text based on selected count', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    await page.goto('/#/bulk-create')

    // Wait for projects and fill form
    await expect(page.locator('text=Company / frontend-app')).toBeVisible()

    const sourceBranchInput = page.locator('input[placeholder="feature/new-feature"]')
    await sourceBranchInput.fill('feature/new-feature')

    const titleInput = page.locator('input[placeholder="Add new feature"]')
    await titleInput.fill('Add new feature')

    // Select 1 repository
    const firstCheckbox = page.locator('.v-checkbox').first()
    await firstCheckbox.click()

    const createButton = page.locator('button:has-text("Create")')
    await expect(createButton).toContainText('Create 1 Merge Request')

    // Select another repository
    const secondCheckbox = page.locator('.v-checkbox').nth(1)
    await secondCheckbox.click()

    await expect(createButton).toContainText('Create 2 Merge Requests')
  })

  test('should successfully create bulk merge requests', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    // Mock branches API for all projects
    await page.route('**/api/v4/projects/*/repository/branches**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBranches)
      })
    })

    // Mock merge request creation
    let mrCreationCount = 0
    await page.route('**/api/v4/projects/*/merge_requests', async route => {
      if (route.request().method() === 'POST') {
        mrCreationCount++
        const projectIdMatch = route.request().url().match(/projects\/(\d+)\/merge_requests/)
        const projectId = projectIdMatch ? parseInt(projectIdMatch[1]) : 100

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockMergeRequest,
            id: projectId,
            web_url: `https://gitlab.example.com/company/project-${projectId}/-/merge_requests/10`
          })
        })
      }
    })

    await page.goto('/#/bulk-create')

    // Wait for projects and select 2 repositories
    await expect(page.locator('text=Company / frontend-app')).toBeVisible()
    await page.locator('.v-checkbox').first().click()
    await page.locator('.v-checkbox').nth(1).click()

    // Fill in form details
    const sourceBranchInput = page.locator('input[placeholder="feature/new-feature"]')
    await sourceBranchInput.fill('feature/new-feature')

    const titleInput = page.locator('input[placeholder="Add new feature"]')
    await titleInput.fill('Add new feature')

    const descriptionInput = page.locator('textarea[placeholder*="Describe the changes"]')
    await descriptionInput.fill('This is a test merge request')

    // Click create button
    const createButton = page.locator('button:has-text("Create 2 Merge Requests")')
    await createButton.click()

    // Verify progress modal appears
    await expect(page.locator('text=Creating Merge Requests')).toBeVisible()

    // Wait for creation to complete
    await expect(page.locator('.mdi-check-circle')).toBeVisible({ timeout: 5000 })

    // Verify success indicators
    const successIcons = page.locator('.mdi-check-circle')
    await expect(successIcons).toHaveCount(2)

    // Verify "View MR" buttons appear
    const viewMRButtons = page.locator('button:has-text("View MR")')
    await expect(viewMRButtons.first()).toBeVisible()

    // Verify "Done" button is enabled
    const doneButton = page.locator('button:has-text("Done")')
    await expect(doneButton).not.toBeDisabled()

    // Verify MRs were actually created
    expect(mrCreationCount).toBe(2)
  })

  test('should display progress with pending status during creation', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    // Mock slow branches API
    await page.route('**/api/v4/projects/*/repository/branches**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBranches)
      })
    })

    // Mock MR creation
    await page.route('**/api/v4/projects/*/merge_requests', async route => {
      if (route.request().method() === 'POST') {
        await new Promise(resolve => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(mockMergeRequest)
        })
      }
    })

    await page.goto('/#/bulk-create')

    // Select repository and fill form
    await expect(page.locator('text=Company / frontend-app')).toBeVisible()
    await page.locator('.v-checkbox').first().click()

    await page.locator('input[placeholder="feature/new-feature"]').fill('feature/new-feature')
    await page.locator('input[placeholder="Add new feature"]').fill('Add new feature')

    // Click create
    await page.locator('button:has-text("Create 1 Merge Request")').click()

    // Verify progress modal with pending status
    await expect(page.locator('text=Creating Merge Requests')).toBeVisible()
    await expect(page.locator('.v-progress-circular').last()).toBeVisible()

    // Verify "Creating..." text while in progress
    const doneButton = page.locator('button:has-text("Creating...")')
    await expect(doneButton).toBeVisible()
    await expect(doneButton).toBeDisabled()

    // Wait for completion
    await expect(page.locator('.mdi-check-circle')).toBeVisible({ timeout: 5000 })
  })

  test('should handle errors when branch does not exist', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    // Mock branches API - return branches without the source branch
    await page.route('**/api/v4/projects/*/repository/branches**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { name: 'main' },
          { name: 'develop' }
        ])
      })
    })

    await page.goto('/#/bulk-create')

    // Select repository and fill form
    await expect(page.locator('text=Company / frontend-app')).toBeVisible()
    await page.locator('.v-checkbox').first().click()

    await page.locator('input[placeholder="feature/new-feature"]').fill('feature/nonexistent')
    await page.locator('input[placeholder="Add new feature"]').fill('Add new feature')

    // Click create
    await page.locator('button:has-text("Create 1 Merge Request")').click()

    // Verify progress modal
    await expect(page.locator('text=Creating Merge Requests')).toBeVisible()

    // Verify error is shown
    await expect(page.locator('.mdi-close-circle')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('text=Source branch \'feature/nonexistent\' does not exist')).toBeVisible()
  })

  test('should handle API errors during MR creation', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    // Mock branches API
    await page.route('**/api/v4/projects/*/repository/branches**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBranches)
      })
    })

    // Mock failed MR creation
    await page.route('**/api/v4/projects/*/merge_requests', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Another merge request already exists'
          })
        })
      }
    })

    await page.goto('/#/bulk-create')

    // Select repository and fill form
    await expect(page.locator('text=Company / frontend-app')).toBeVisible()
    await page.locator('.v-checkbox').first().click()

    await page.locator('input[placeholder="feature/new-feature"]').fill('feature/new-feature')
    await page.locator('input[placeholder="Add new feature"]').fill('Add new feature')

    // Click create
    await page.locator('button:has-text("Create 1 Merge Request")').click()

    // Verify error is displayed
    await expect(page.locator('.mdi-close-circle')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('text=Another merge request already exists')).toBeVisible()
  })

  test('should show mixed results with both successes and failures', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    // Mock branches API
    await page.route('**/api/v4/projects/*/repository/branches**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBranches)
      })
    })

    // Mock MR creation - success for first, failure for second
    let requestCount = 0
    await page.route('**/api/v4/projects/*/merge_requests', async route => {
      if (route.request().method() === 'POST') {
        requestCount++
        if (requestCount === 1) {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(mockMergeRequest)
          })
        } else {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              message: 'Merge request already exists'
            })
          })
        }
      }
    })

    await page.goto('/#/bulk-create')

    // Select 2 repositories
    await expect(page.locator('text=Company / frontend-app')).toBeVisible()
    await page.locator('.v-checkbox').first().click()
    await page.locator('.v-checkbox').nth(1).click()

    await page.locator('input[placeholder="feature/new-feature"]').fill('feature/new-feature')
    await page.locator('input[placeholder="Add new feature"]').fill('Add new feature')

    // Click create
    await page.locator('button:has-text("Create 2 Merge Requests")').click()

    // Wait for both to complete
    await expect(page.locator('.mdi-check-circle')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.mdi-close-circle')).toBeVisible({ timeout: 5000 })

    // Verify one success and one failure
    await expect(page.locator('.mdi-check-circle')).toHaveCount(1)
    await expect(page.locator('.mdi-close-circle')).toHaveCount(1)
  })

  test('should prevent closing progress modal while creating', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    // Mock slow branches and MR creation
    await page.route('**/api/v4/projects/*/repository/branches**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBranches)
      })
    })

    await page.route('**/api/v4/projects/*/merge_requests', async route => {
      if (route.request().method() === 'POST') {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(mockMergeRequest)
        })
      }
    })

    await page.goto('/#/bulk-create')

    // Select repository and create
    await expect(page.locator('text=Company / frontend-app')).toBeVisible()
    await page.locator('.v-checkbox').first().click()
    await page.locator('input[placeholder="feature/new-feature"]').fill('feature/new-feature')
    await page.locator('input[placeholder="Add new feature"]').fill('Add new feature')
    await page.locator('button:has-text("Create 1 Merge Request")').click()

    // Verify Done button is disabled during creation
    const doneButton = page.locator('button:has-text("Creating...")')
    await expect(doneButton).toBeDisabled()
  })

  test('should close progress modal and navigate to dashboard on done', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    // Mock branches API
    await page.route('**/api/v4/projects/*/repository/branches**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBranches)
      })
    })

    // Mock MR creation
    await page.route('**/api/v4/projects/*/merge_requests', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(mockMergeRequest)
        })
      }
    })

    // Mock dashboard MRs API
    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })

    await page.goto('/#/bulk-create')

    // Select repository and create
    await expect(page.locator('text=Company / frontend-app')).toBeVisible()
    await page.locator('.v-checkbox').first().click()
    await page.locator('input[placeholder="feature/new-feature"]').fill('feature/new-feature')
    await page.locator('input[placeholder="Add new feature"]').fill('Add new feature')
    await page.locator('button:has-text("Create 1 Merge Request")').click()

    // Wait for creation to complete
    await expect(page.locator('.mdi-check-circle')).toBeVisible({ timeout: 5000 })

    // Click Done button
    const doneButton = page.locator('button:has-text("Done")')
    await doneButton.click()

    // Verify navigation to dashboard
    await page.waitForURL('/#/')
    await expect(page).toHaveURL('/#/')
  })

  test('should cancel and navigate back to dashboard', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    // Mock dashboard MRs API
    await page.route('**/api/v4/merge_requests**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })

    await page.goto('/#/bulk-create')

    // Wait for page to load
    await expect(page.locator('text=Bulk Merge Request Creation')).toBeVisible()

    // Click Cancel button
    const cancelButton = page.locator('button:has-text("Cancel")')
    await cancelButton.click()

    // Verify navigation to dashboard
    await page.waitForURL('/#/')
    await expect(page).toHaveURL('/#/')
  })

  test('should have default values for form fields', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    await page.goto('/#/bulk-create')

    // Wait for page to load
    await expect(page.locator('text=Bulk Merge Request Creation')).toBeVisible()

    // Verify target branch has default value "main"
    const targetBranchInput = page.locator('input[placeholder="main"]')
    await expect(targetBranchInput).toHaveValue('main')

    // Verify "Delete source branch" checkbox is checked by default
    const deleteSourceBranchCheckbox = page.locator('input[type="checkbox"]')
    await expect(deleteSourceBranchCheckbox).toBeChecked()
  })

  test('should allow toggling delete source branch option', async ({ page }) => {
    await setupAuthenticatedState(page)

    // Mock projects API
    await page.route('**/api/v4/projects**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProjects)
      })
    })

    await page.goto('/#/bulk-create')

    // Wait for page to load
    await expect(page.locator('text=Bulk Merge Request Creation')).toBeVisible()

    // Find the checkbox
    const deleteSourceBranchCheckbox = page.locator('input[type="checkbox"]')

    // Verify it's checked by default
    await expect(deleteSourceBranchCheckbox).toBeChecked()

    // Uncheck it
    await deleteSourceBranchCheckbox.uncheck()
    await expect(deleteSourceBranchCheckbox).not.toBeChecked()

    // Check it again
    await deleteSourceBranchCheckbox.check()
    await expect(deleteSourceBranchCheckbox).toBeChecked()
  })
})
