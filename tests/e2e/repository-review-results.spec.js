import { test, expect } from '@playwright/test'
import { loginViaSetup } from './helpers/auth.js'

/**
 * E2E Tests for the Repository Review Results page
 *
 * Results reach this page only through localStorage: the repository review
 * stores Gemini's review under `repository_review_results` and navigates here,
 * and every later visit renders the stored review again.
 */

test.describe('Repository Review Results', () => {
  const mockUser = {
    id: 123,
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com'
  }

  // Gemini's reply can contain anything a repository's contributors put in the prompt
  const maliciousSection = [
    'Looks fine.',
    '',
    '<img src="x" onerror="window.__xss = \'img\'">',
    '',
    'Avoid <b onmouseover="window.__xss = \'hover\'">this</b> pattern',
    '',
    '[Read the docs](javascript:window.__xss=\'link\')',
    '',
    '![diagram](https://attacker.example/pixel.png)'
  ].join('\n')

  const storedReview = {
    repositoryData: {
      project: {
        name_with_namespace: 'acme / web-app',
        description: 'Customer-facing web application'
      },
      branch: 'main',
      languages: { JavaScript: 80, CSS: 20 },
      selectedFiles: 12,
      totalFiles: 40
    },
    reviewResult: {
      metadata: {
        timestamp: new Date().toISOString(),
        focus: 'security',
        depth: 'standard'
      },
      sections: {
        overview: maliciousSection,
        security: maliciousSection
      },
      fullReview: `## Repository Overview\n${maliciousSection}`
    }
  }

  test('should render a malicious stored review as inert text', async ({ page }) => {
    const attackerRequests = []
    page.on('request', request => {
      if (request.url().includes('attacker.example')) attackerRequests.push(request.url())
    })

    await loginViaSetup(page, { user: mockUser })
    await page.evaluate(review => {
      localStorage.setItem('repository_review_results', JSON.stringify(review))
    }, storedReview)
    await page.goto('/#/repository-review/results')

    const overview = page.locator('#section-overview .markdown-content')
    await expect(overview).toContainText('Looks fine.')
    // Give any injected handler (e.g. a broken image's onerror) the chance to fire
    await page.waitForLoadState('networkidle')

    // Nothing ran and nothing was fetched from the attacker's host
    expect(await page.evaluate(() => window.__xss)).toBeUndefined()
    expect(attackerRequests).toEqual([])

    // Raw HTML shows as text instead of becoming elements, in every section
    await expect(overview).toContainText('<img src="x" onerror="window.__xss = \'img\'">')
    await expect(overview).toContainText('Avoid <b onmouseover="window.__xss = \'hover\'">this</b> pattern')
    await expect(page.locator('#section-security .markdown-content')).toContainText('<img src="x"')
    await expect(page.locator('.markdown-content img')).toHaveCount(0)

    // The javascript: link keeps its text but goes nowhere
    const link = overview.locator('a', { hasText: 'Read the docs' })
    expect(await link.getAttribute('href')).toBeNull()
    await link.click()
    expect(await page.evaluate(() => window.__xss)).toBeUndefined()

    // The image is a link to its URL, opening in a new tab, instead of loading
    const imageLink = overview.locator('a', { hasText: 'diagram' })
    await expect(imageLink).toHaveAttribute('href', 'https://attacker.example/pixel.png')
    await expect(imageLink).toHaveAttribute('target', '_blank')
    await expect(imageLink).toHaveAttribute('rel', 'noopener noreferrer')

    // Sections without content keep their placeholder
    await expect(page.locator('#section-performance')).toContainText('No content available for this section.')
  })
})
