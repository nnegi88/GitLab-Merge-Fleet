import { test, expect } from './helpers/test.js'

/**
 * E2E Tests for keeping open tabs in step
 *
 * Tabs in one browser share localStorage, where remembered secrets are kept, and each
 * gets a 'storage' event when another tab changes it. Every tab must follow, so none of
 * them keeps, or writes back, a secret the user forgot in another tab.
 */

test.describe('Secrets across tabs', () => {
  const mockUser = {
    id: 123,
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com'
  }

  const validToken = 'glpat-test-token-123456789'

  const signInRemembered = async (page) => {
    await page.goto('/#/setup')
    await page.route('**/api/v4/user', route => route.fulfill({ json: mockUser }))

    const urlInput = page.locator('input[type="url"]')
    await urlInput.clear()
    await urlInput.fill('https://gitlab.example.com')
    await page.locator('input[type="password"]').fill(validToken)
    await page.getByLabel('Remember on this device').check()
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/#\/$/, { timeout: 5000 })
  }

  test.beforeEach(async ({ page }) => {
    // Keep every tab in this browser away from a real GitLab server
    await page.context().route('**/api/v4/**', route => route.abort())
  })

  test('should sign out in every tab when one tab signs out', async ({ page }) => {
    await signInRemembered(page)
    const otherTab = await page.context().newPage()
    await otherTab.goto('/#/')
    await expect(otherTab.getByRole('heading', { name: 'Merge Requests' })).toBeVisible()

    await page.getByTitle('Logout').click()

    await expect(otherTab.getByText('Not Connected')).toBeVisible()
    expect(await otherTab.evaluate(() => localStorage.getItem('gitlab-token'))).toBeNull()
  })

  test('should keep other tabs signed in for themselves only when one tab stops remembering', async ({ page }) => {
    await signInRemembered(page)
    const otherTab = await page.context().newPage()
    await otherTab.goto('/#/settings')
    await expect(otherTab.locator('.v-switch input')).toBeChecked()

    await page.goto('/#/settings')
    await page.locator('.v-switch input').uncheck()

    // The other tab follows: no longer remembering, but still signed in, for itself
    await expect(otherTab.locator('.v-switch input')).not.toBeChecked()
    expect(await otherTab.evaluate(() => sessionStorage.getItem('gitlab-token'))).toBe(validToken)
    expect(await otherTab.evaluate(() => localStorage.getItem('gitlab-token'))).toBeNull()

    // Saving the Gemini key there keeps it for that tab, not back on the device
    await otherTab.locator('input[type="password"]').fill('gemini-key-123')
    await otherTab.getByRole('button', { name: 'Save Settings' }).click()

    expect(await otherTab.evaluate(() => sessionStorage.getItem('gemini-api-key'))).toBe('gemini-key-123')
    expect(await otherTab.evaluate(() => localStorage.getItem('gemini-api-key'))).toBeNull()
  })
})
