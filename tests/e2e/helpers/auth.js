import { expect } from '@playwright/test'

/**
 * Log in through the real setup page, so the app encrypts and stores the
 * token itself (a hand-built `auth-storage` value cannot be decrypted).
 *
 * Registers, in this order:
 * - a catch-all for the GitLab API that aborts requests, so nothing reaches a
 *   real server; routes a spec registers afterwards take precedence
 * - a mock for `/api/v4/user`, which the setup page uses to test the connection
 *
 * Waits for the setup page's redirect to the dashboard before returning, so the
 * delayed redirect cannot fire after the test has navigated elsewhere.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @param {Object} options.user - GitLab user returned by `/api/v4/user`
 * @param {String} options.gitlabUrl - GitLab instance URL to enter
 * @param {String} options.token - Personal access token to enter
 */
export async function loginViaSetup(page, {
  user,
  gitlabUrl = 'https://gitlab.example.com',
  token = 'glpat-e2e-test-token'
} = {}) {
  await page.route('**/api/v4/**', route => route.abort())

  await page.route('**/api/v4/user', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(user)
  }))

  await page.goto('/#/setup')

  const urlInput = page.locator('input[type="url"]')
  await urlInput.clear()
  await urlInput.fill(gitlabUrl)
  await page.locator('input[type="password"]').fill(token)
  await page.locator('button[type="submit"]').click()

  await expect(page.locator('text=Successfully connected!')).toBeVisible()
  await page.waitForURL(/#\/$/)
}
