import { test as base, expect } from '@playwright/test'

/**
 * Playwright's `test`, failing any test during which the page reports a
 * Content-Security-Policy violation. Violations only show in the console, so
 * without this a policy that blocks something a page needs could go unnoticed.
 * Specs import `test` and `expect` from here instead of '@playwright/test'.
 *
 * `cspViolations` holds the violations as they arrive. A test that expects
 * some (e.g. to prove the policy blocks a payload) checks them, then empties
 * the list so the test doesn't fail.
 */
export const test = base.extend({
  cspViolations: [async ({ page }, use) => {
    const violations = []

    // An exposed function outlives navigations, unlike state kept in the page
    await page.exposeFunction('__reportCspViolation', violation => violations.push(violation))
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', event => {
        window.__reportCspViolation(`${event.violatedDirective} blocked ${event.blockedURI || 'inline code'}`)
      })
    })

    await use(violations)

    // A round trip, so reports sent just before the test ended have arrived
    await page.evaluate(() => {}).catch(() => {})
    expect(violations, 'Content-Security-Policy violations').toEqual([])
  }, { auto: true }]
})

export { expect }
