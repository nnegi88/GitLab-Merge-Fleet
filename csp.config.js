/**
 * The Content-Security-Policy shipped in the production build, as a <meta> tag
 * (GitHub Pages can't send headers). Its job is script-src: even if markup slips
 * past the markdown sanitizer, the browser refuses to run inline scripts, inline
 * event handlers, javascript: URLs and eval.
 *
 * Only the production build gets it: the dev server's hot reload needs a websocket
 * the policy would block. E2E runs against the production build and fails any test
 * that triggers a violation, so a page that needs a new source shows up in CI.
 * Adding an external host is covered in CONTRIBUTING.md.
 *
 * Browsers ignore frame-ancestors, sandbox and report-uri/report-to in a <meta>
 * policy, so adding them here would do nothing; they need HTTP headers.
 */

/**
 * Build the policy
 * @param {Object} options
 * @param {Boolean} options.sentry - Sentry is configured (VITE_SENTRY_DSN), so allow its Replay worker
 * @returns {String} The policy, as the <meta> tag's content
 */
export function contentSecurityPolicy({ sentry = false } = {}) {
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    // Vuetify injects its theme as a <style> element at runtime
    'style-src': ["'self'", "'unsafe-inline'"],
    // The bundled CSS has data: images
    'img-src': ["'self'", 'data:'],
    'font-src': ["'self'"],
    // GitLab is whatever host the user configures, and Gemini is called from the browser.
    // A running script could leak data by navigating anyway, so the protection is script-src.
    // Plain-http GitLab hosts are blocked, which an https page can't reach anyway (mixed content)
    'connect-src': ["'self'", 'https:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"]
  }

  if (sentry) {
    // Session Replay compresses in a worker started from a blob: URL; Sentry's ingest host is covered by https:
    directives['worker-src'] = ["'self'", 'blob:']
  }

  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ')
}

/**
 * Vite plugin that puts the policy first in the built index.html's <head>, before
 * anything it governs
 * @returns {import('vite').Plugin}
 */
export function contentSecurityPolicyPlugin() {
  let policy

  return {
    name: 'content-security-policy',
    apply: 'build',
    configResolved(config) {
      policy = contentSecurityPolicy({ sentry: Boolean(config.env.VITE_SENTRY_DSN) })
    },
    transformIndexHtml() {
      return [{
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
        injectTo: 'head-prepend'
      }]
    }
  }
}
