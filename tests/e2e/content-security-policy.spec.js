import { test, expect } from './helpers/test.js'

/**
 * E2E Tests for the Content-Security-Policy
 *
 * The policy is the second line of defense behind the markdown sanitizer: even if
 * markup reaches the page some other way, the browser must refuse to run it.
 * Every spec also fails on any violation (see helpers/test.js), which keeps the
 * policy from blocking something a page needs.
 */

test.describe('Content-Security-Policy', () => {
  test('should ship a policy that only runs the app\'s own scripts', async ({ page }) => {
    await page.goto('/')

    const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
    const directives = Object.fromEntries(policy.split('; ').map(directive => {
      const [name, ...sources] = directive.split(' ')
      return [name, sources]
    }))

    expect(directives['script-src']).toEqual(["'self'"])
    expect(directives['object-src']).toEqual(["'none'"])
    expect(directives['base-uri']).toEqual(["'self'"])
  })

  test('should block script that gets past the sanitizer', async ({ page, cspViolations }) => {
    await page.goto('/')

    // Insert payloads straight into the DOM, as if a future bug let markup through
    await page.evaluate(() => {
      const image = document.createElement('img')
      image.setAttribute('onerror', "window.__xss = 'handler'")
      image.src = 'missing.png'
      document.body.append(image)

      const script = document.createElement('script')
      script.textContent = "window.__xss = 'script'"
      document.body.append(script)

      const link = document.createElement('a')
      link.href = "javascript:window.__xss = 'link'"
      link.textContent = 'link'
      document.body.append(link)
      link.click()
    })

    // One report per payload: the handler, the inline script and the javascript: URL
    await expect.poll(() => cspViolations.length).toBeGreaterThanOrEqual(3)
    expect(await page.evaluate(() => window.__xss)).toBeUndefined()
    for (const violation of cspViolations) {
      expect(violation).toMatch(/^script-src/)
    }

    // These violations are the point of the test, so don't fail it on them
    cspViolations.length = 0
  })
})
