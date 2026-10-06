import { test, expect } from './helpers/test.js'

/**
 * E2E Tests for Setup/Authentication Flow
 *
 * Tests the complete authentication flow including:
 * - Initial setup with GitLab credentials
 * - Token validation and user authentication
 * - Where the token is kept: this tab only, or remembered on this device
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

    // The security note says truthfully where the token is kept and who can read it
    const securityNote = page.locator('.v-alert', { hasText: 'Security Note' })
    await expect(securityNote).toBeVisible()
    await expect(securityNote).toContainText('for this tab only')
    await expect(securityNote).toContainText("It's sent only to your GitLab instance.")
    await expect(securityNote).toContainText("It isn't encrypted.")
    await expect(securityNote).toContainText('Set an expiry date on the token')
    await expect(securityNote).not.toContainText('never leaves your device')
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
    // The app is served under /GitLab-Merge-Fleet/, so match the hash route only
    await page.waitForURL(/#\/$/, { timeout: 5000 })
  })

  test('should keep the token for this tab only by default', async ({ page }) => {
    // Keep every page in this browser away from a real GitLab server
    await page.context().route('**/api/v4/**', route => route.abort())
    await page.goto('/#/setup')

    await page.route('**/api/v4/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser)
      })
    })

    const urlInput = page.locator('input[type="url"]')
    await urlInput.clear()
    await urlInput.fill(gitlabUrl)
    await page.locator('input[type="password"]').fill(validToken)

    // Remembering is off unless asked for
    await expect(page.getByLabel('Remember on this device')).not.toBeChecked()

    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/#\/$/, { timeout: 5000 })

    // Kept for this tab, not on the device; only non-secret settings are in localStorage
    expect(await page.evaluate(() => sessionStorage.getItem('gitlab-token'))).toBe(validToken)
    expect(await page.evaluate(() => localStorage.getItem('gitlab-token'))).toBeNull()
    expect(JSON.parse(await page.evaluate(() => localStorage.getItem('auth-settings'))))
      .toEqual({ gitlabUrl, remember: false })

    // A reload keeps you signed in
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Merge Requests' })).toBeVisible()

    // A new tab doesn't get the token
    const newTab = await page.context().newPage()
    await newTab.goto('/#/')
    await expect(newTab).toHaveURL(/#\/setup$/)
  })

  test('should remember the token on this device when asked', async ({ page }) => {
    // Keep every page in this browser away from a real GitLab server
    await page.context().route('**/api/v4/**', route => route.abort())
    await page.goto('/#/setup')

    await page.route('**/api/v4/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser)
      })
    })

    const urlInput = page.locator('input[type="url"]')
    await urlInput.clear()
    await urlInput.fill(gitlabUrl)
    await page.locator('input[type="password"]').fill(validToken)
    await page.getByLabel('Remember on this device').check()

    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/#\/$/, { timeout: 5000 })

    expect(await page.evaluate(() => localStorage.getItem('gitlab-token'))).toBe(validToken)
    expect(await page.evaluate(() => sessionStorage.getItem('gitlab-token'))).toBeNull()
    expect(JSON.parse(await page.evaluate(() => localStorage.getItem('auth-settings'))).remember).toBe(true)

    // A new tab is signed in too
    const newTab = await page.context().newPage()
    await newTab.goto('/#/')
    await expect(newTab.getByRole('heading', { name: 'Merge Requests' })).toBeVisible()
  })

  test('should display error message for invalid credentials', async ({ page }) => {
    await page.goto('/#/setup')

    // Mock failed authentication
    await page.route('**/api/v4/user', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        // GitLab's API returns its error text in `message`
        body: JSON.stringify({ message: '401 Unauthorized' })
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

    // Wait for error message. Vuetify 3 alerts have role="alert" and no type
    // class; the error alert is the one with the alert-circle icon (an info
    // alert is always shown on this page)
    const errorAlert = page.getByRole('alert').filter({ has: page.locator('.mdi-alert-circle') })
    await expect(errorAlert).toBeVisible()

    // Verify error message contains relevant text
    await expect(errorAlert).toContainText(/Failed to connect|Unauthorized/i)

    // Verify we're still on the setup page
    await expect(page).toHaveURL(/#\/setup$/)

    // The rejected token isn't kept anywhere
    const storedTokens = await page.evaluate(() => [
      sessionStorage.getItem('gitlab-token'),
      localStorage.getItem('gitlab-token')
    ])

    expect(storedTokens).toEqual([null, null])
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

    // Wait for error message (the alert with the alert-circle icon; see above)
    await expect(page.getByRole('alert').filter({ has: page.locator('.mdi-alert-circle') })).toBeVisible()

    // Verify we're still on the setup page
    await expect(page).toHaveURL(/#\/setup$/)
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

    // Verify the URL is saved without the trailing slash
    const settings = JSON.parse(await page.evaluate(() => localStorage.getItem('auth-settings')))

    expect(settings.gitlabUrl).toBe('https://gitlab.example.com')
  })

  test('should allow re-authentication after logout', async ({ page }) => {
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
    await page.waitForURL(/#\/$/, { timeout: 5000 })

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
})
