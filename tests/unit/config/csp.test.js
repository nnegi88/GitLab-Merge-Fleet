import { contentSecurityPolicy, contentSecurityPolicyPlugin } from '../../../csp.config.js'
import { describe, it, expect } from 'vitest'

describe('contentSecurityPolicy', () => {
  // Pinned, so any change to the policy is a deliberate one
  it('should only run the app\'s own scripts', () => {
    expect(contentSecurityPolicy()).toBe(
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data:; font-src 'self'; connect-src 'self' https:; " +
      "object-src 'none'; base-uri 'self'; form-action 'self'"
    )
  })

  it('should allow Sentry Replay\'s blob: worker when Sentry is configured', () => {
    expect(contentSecurityPolicy({ sentry: true })).toBe(`${contentSecurityPolicy()}; worker-src 'self' blob:`)
  })
})

describe('contentSecurityPolicyPlugin', () => {
  const metaTagFor = (env) => {
    const plugin = contentSecurityPolicyPlugin()
    plugin.configResolved({ env })
    return plugin.transformIndexHtml()
  }

  it('should only apply to the production build', () => {
    expect(contentSecurityPolicyPlugin().apply).toBe('build')
  })

  it('should put the policy first in the page\'s head', () => {
    expect(metaTagFor({})).toEqual([{
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy() },
      injectTo: 'head-prepend'
    }])
  })

  it('should allow the Sentry worker when VITE_SENTRY_DSN is set', () => {
    const [metaTag] = metaTagFor({ VITE_SENTRY_DSN: 'https://key@o1.ingest.sentry.io/1' })

    expect(metaTag.attrs.content).toBe(contentSecurityPolicy({ sentry: true }))
  })
})
