import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Setup/Authentication Flow
 *
 * Tests the complete authentication flow including:
 * - Initial setup with GitLab credentials
 * - Token validation and user authentication
 * - localStorage persistence
 * - Session-only mode
 * - Error handling for invalid credentials
 */

test.describe('Setup/Authentication Flow', () => {
  // Mock user data for successful authentication
  const mockUser = {
    id: 123,
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com'
  }

  const validToken = 'glpat-test-token-123456789'
  const gitlabUrl = 'https://gitlab.example.com'

  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('should display setup page with empty form', async ({ page }) => {
    await page.goto('/#/setup')

    // Verify page title
    await expect(page.locator('text=Welcome to GitLab Merge Fleet')).toBeVisible()

    // Verify form elements are present
    await expect(page.locator('input[type="url"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()

    // Verify GitLab URL has default value
    const urlInput = page.locator('input[type="url"]')
    await expect(urlInput).toHaveValue('https://gitlab.com')

    // Verify submit button is disabled when token is empty
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeDisabled()

    // Verify security note is visible
    await expect(page.locator('text=Security Note')).toBeVisible()
    await expect(page.locator('text=Your Personal Access Token is encrypted')).toBeVisible()
  })

  test('should enable submit button when token is entered', async ({ page }) => {
    await page.goto('/#/setup')

    const tokenInput = page.locator('input[type="password"]')
    const submitButton = page.locator('button[type="submit"]')

    // Initially disabled
    await expect(submitButton).toBeDisabled()

    // Enter token
    await tokenInput.fill(validToken)

    // Should be enabled now
    await expect(submitButton).not.toBeDisabled()
  })

  test('should successfully authenticate with valid credentials', async ({ page }) => {
    await page.goto('/#/setup')

    // Mock the GitLab API responses
    await page.route('**/api/v4/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser)
      })
    })

    // Fill in the form
    const urlInput = page.locator('input[type="url"]')
    const tokenInput = page.locator('input[type="password"]')

    await urlInput.clear()
    await urlInput.fill(gitlabUrl)
    await tokenInput.fill(validToken)

    // Submit the form
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // Wait for success message
    await expect(page.locator('text=Successfully connected! Redirecting to dashboard...')).toBeVisible()

    // Wait for redirect to dashboard
    await page.waitForURL('/#/', { timeout: 5000 })

    // Verify we're on the dashboard
    await expect(page).toHaveURL('/#/')
  })

  test('should persist credentials to localStorage', async ({ page }) => {
    await page.goto('/#/setup')

    // Mock the GitLab API responses
    await page.route('**/api/v4/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser)
      })
    })

    // Fill in the form
    const urlInput = page.locator('input[type="url"]')
    const tokenInput = page.locator('input[type="password"]')

    await urlInput.clear()
    await urlInput.fill(gitlabUrl)
    await tokenInput.fill(validToken)

    // Make sure session-only is NOT checked
    const sessionOnlyCheckbox = page.locator('input[type="checkbox"]')
    await sessionOnlyCheckbox.uncheck()

    // Submit the form
    await page.locator('button[type="submit"]').click()

    // Wait for success
    await expect(page.locator('text=Successfully connected!')).toBeVisible()

    // Verify localStorage contains auth data
    const authStorage = await page.evaluate(() => {
      return localStorage.getItem('auth-storage')
    })

    expect(authStorage).toBeTruthy()

    const authData = JSON.parse(authStorage)
    expect(authData).toHaveProperty('encryptedToken')
    expect(authData).toHaveProperty('gitlabUrl')
    expect(authData.gitlabUrl).toBe(gitlabUrl)
    expect(authData.sessionOnly).toBe(false)

    // Verify encrypted token structure
    expect(authData.encryptedToken).toHaveProperty('encrypted')
    expect(authData.encryptedToken).toHaveProperty('key')
    expect(authData.encryptedToken).toHaveProperty('iv')
  })

  test('should handle session-only mode correctly', async ({ page }) => {
    await page.goto('/#/setup')

    // Mock the GitLab API responses
    await page.route('**/api/v4/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser)
      })
    })

    // Fill in the form
    const urlInput = page.locator('input[type="url"]')
    const tokenInput = page.locator('input[type="password"]')
    const sessionOnlyCheckbox = page.locator('input[type="checkbox"]')

    await urlInput.clear()
    await urlInput.fill(gitlabUrl)
    await tokenInput.fill(validToken)

    // Enable session-only mode
    await sessionOnlyCheckbox.check()

    // Submit the form
    await page.locator('button[type="submit"]').click()

    // Wait for success
    await expect(page.locator('text=Successfully connected!')).toBeVisible()

    // Verify localStorage contains auth data with sessionOnly flag
    const authStorage = await page.evaluate(() => {
      return localStorage.getItem('auth-storage')
    })

    expect(authStorage).toBeTruthy()

    const authData = JSON.parse(authStorage)
    expect(authData.sessionOnly).toBe(true)

    // In session-only mode, encryptedToken should not be persisted
    // (The store sets it to null in localStorage when sessionOnly is true)
    expect(authData.encryptedToken).toBeNull()
  })

  test('should display error message for invalid credentials', async ({ page }) => {
    await page.goto('/#/setup')

    // Mock failed authentication
    await page.route('**/api/v4/user', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Unauthorized',
          error_description: '401 Unauthorized'
        })
      })
    })

    // Fill in the form with invalid credentials
    const urlInput = page.locator('input[type="url"]')
    const tokenInput = page.locator('input[type="password"]')

    await urlInput.clear()
    await urlInput.fill(gitlabUrl)
    await tokenInput.fill('invalid-token')

    // Submit the form
    await page.locator('button[type="submit"]').click()

    // Wait for error message
    await expect(page.locator('.v-alert--type-error')).toBeVisible()

    // Verify error message contains relevant text
    const errorAlert = page.locator('.v-alert--type-error')
    await expect(errorAlert).toContainText(/Failed to connect|Unauthorized/i)

    // Verify we're still on the setup page
    await expect(page).toHaveURL('/#/setup')

    // Verify localStorage is empty (token should be cleared on error)
    const authStorage = await page.evaluate(() => {
      return localStorage.getItem('auth-storage')
    })

    expect(authStorage).toBeNull()
  })

  test('should display loading state during authentication', async ({ page }) => {
    await page.goto('/#/setup')

    // Mock slow API response
    await page.route('**/api/v4/user', async route => {
      await new Promise(resolve => setTimeout(resolve, 500))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser)
      })
    })

    // Fill in the form
    const urlInput = page.locator('input[type="url"]')
    const tokenInput = page.locator('input[type="password"]')

    await urlInput.clear()
    await urlInput.fill(gitlabUrl)
    await tokenInput.fill(validToken)

    // Submit the form
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // Verify loading state
    await expect(submitButton).toBeDisabled()
    await expect(submitButton).toContainText(/Connecting/i)

    // Wait for success
    await expect(page.locator('text=Successfully connected!')).toBeVisible()
  })

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/#/setup')

    // Mock network error
    await page.route('**/api/v4/user', async route => {
      await route.abort('failed')
    })

    // Fill in the form
    const urlInput = page.locator('input[type="url"]')
    const tokenInput = page.locator('input[type="password"]')

    await urlInput.clear()
    await urlInput.fill(gitlabUrl)
    await tokenInput.fill(validToken)

    // Submit the form
    await page.locator('button[type="submit"]').click()

    // Wait for error message
    await expect(page.locator('.v-alert--type-error')).toBeVisible()

    // Verify we're still on the setup page
    await expect(page).toHaveURL('/#/setup')
  })

  test('should show link to create token', async ({ page }) => {
    await page.goto('/#/setup')

    // Verify the "Create token" link is present
    const createTokenLink = page.locator('a[title="Create token"]')
    await expect(createTokenLink).toBeVisible()

    // Verify it points to the correct URL (with default GitLab URL)
    await expect(createTokenLink).toHaveAttribute('href', /personal_access_tokens/)
    await expect(createTokenLink).toHaveAttribute('target', '_blank')
  })

  test('should update token creation link when GitLab URL changes', async ({ page }) => {
    await page.goto('/#/setup')

    const customGitlabUrl = 'https://gitlab.mycompany.com'
    const urlInput = page.locator('input[type="url"]')

    // Change GitLab URL
    await urlInput.clear()
    await urlInput.fill(customGitlabUrl)

    // Verify the token creation link updates
    const createTokenLink = page.locator('a[title="Create token"]')
    const href = await createTokenLink.getAttribute('href')

    expect(href).toContain(customGitlabUrl)
    expect(href).toContain('personal_access_tokens')
  })

  test('should remove trailing slash from GitLab URL', async ({ page }) => {
    await page.goto('/#/setup')

    // Mock the GitLab API responses
    await page.route('**/api/v4/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser)
      })
    })

    // Fill in URL with trailing slash
    const urlInput = page.locator('input[type="url"]')
    const tokenInput = page.locator('input[type="password"]')

    await urlInput.clear()
    await urlInput.fill('https://gitlab.example.com/')
    await tokenInput.fill(validToken)

    // Submit the form
    await page.locator('button[type="submit"]').click()

    // Wait for success
    await expect(page.locator('text=Successfully connected!')).toBeVisible()

    // Verify localStorage contains URL without trailing slash
    const authStorage = await page.evaluate(() => {
      return localStorage.getItem('auth-storage')
    })

    const authData = JSON.parse(authStorage)
    expect(authData.gitlabUrl).toBe('https://gitlab.example.com')
    expect(authData.gitlabUrl).not.toContain('https://gitlab.example.com/')
  })

  test('should allow re-authentication after logout', async ({ page, context }) => {
    // First authentication
    await page.goto('/#/setup')

    // Mock the GitLab API responses
    await page.route('**/api/v4/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser)
      })
    })

    // Fill in and submit form
    const urlInput = page.locator('input[type="url"]')
    const tokenInput = page.locator('input[type="password"]')

    await urlInput.clear()
    await urlInput.fill(gitlabUrl)
    await tokenInput.fill(validToken)
    await page.locator('button[type="submit"]').click()

    // Wait for redirect
    await page.waitForURL('/#/', { timeout: 5000 })

    // Simulate logout (clearing localStorage)
    await page.evaluate(() => localStorage.clear())

    // Navigate back to setup
    await page.goto('/#/setup')

    // Verify form is empty and ready for new credentials
    const newUrlInput = page.locator('input[type="url"]')
    await expect(newUrlInput).toHaveValue('https://gitlab.com')

    const newTokenInput = page.locator('input[type="password"]')
    await expect(newTokenInput).toHaveValue('')

    // Re-authenticate with new credentials
    await newUrlInput.clear()
    await newUrlInput.fill('https://gitlab.newinstance.com')
    await newTokenInput.fill('new-token-123')
    await page.locator('button[type="submit"]').click()

    // Wait for success
    await expect(page.locator('text=Successfully connected!')).toBeVisible()
  })

  test('should display required scopes hint', async ({ page }) => {
    await page.goto('/#/setup')

    // Verify the hint about required scopes is visible
    await expect(page.locator('text=Required scopes: api, read_repository, write_repository')).toBeVisible()
  })

  test('should validate URL format', async ({ page }) => {
    await page.goto('/#/setup')

    const urlInput = page.locator('input[type="url"]')
    const tokenInput = page.locator('input[type="password"]')

    // Enter an invalid URL
    await urlInput.clear()
    await urlInput.fill('not-a-valid-url')
    await tokenInput.fill(validToken)

    // HTML5 validation should prevent form submission
    // The form element has type="url" which provides built-in validation
    const isValid = await urlInput.evaluate(el => el.validity.valid)
    expect(isValid).toBe(false)
  })

  test('should persist authentication across page reloads', async ({ page }) => {
    await page.goto('/#/setup')

    // Mock the GitLab API responses
    await page.route('**/api/v4/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser)
      })
    })

    // Fill in the form
    const urlInput = page.locator('input[type="url"]')
    const tokenInput = page.locator('input[type="password"]')

    await urlInput.clear()
    await urlInput.fill(gitlabUrl)
    await tokenInput.fill(validToken)

    // Make sure session-only is NOT checked
    await page.locator('input[type="checkbox"]').uncheck()

    // Submit the form
    await page.locator('button[type="submit"]').click()

    // Wait for redirect to dashboard
    await page.waitForURL('/#/', { timeout: 5000 })

    // Reload the page
    await page.reload()

    // Verify localStorage still contains auth data
    const authStorage = await page.evaluate(() => {
      return localStorage.getItem('auth-storage')
    })

    expect(authStorage).toBeTruthy()

    const authData = JSON.parse(authStorage)
    expect(authData).toHaveProperty('encryptedToken')
    expect(authData.gitlabUrl).toBe(gitlabUrl)
  })
})
