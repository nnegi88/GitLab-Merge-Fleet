import { Marked } from 'marked'
import createDOMPurify from 'dompurify'

/**
 * Renders markdown we don't control (AI review text) to HTML that is safe to
 * pass to v-html. Gemini's reply can contain anything an MR author or repository
 * contributor puts in the prompt, so the output must never be able to run script.
 */

const escapeHtml = (text) => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

// Its own instance, so these options never leak to or from other users of marked
const parser = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    // Raw HTML is shown as text: in a code review it's almost always talking about
    // HTML, not formatting, and rendering it would let the reply inject markup
    html({ text, block }) {
      const escaped = escapeHtml(text)
      return block ? `<p>${escaped.trim().replace(/\n/g, '<br>')}</p>` : escaped
    },
    // Images are never loaded (an attacker-chosen URL is a tracking pixel); link to them instead
    image({ href, text }) {
      return `<a href="${escapeHtml(href)}">${escapeHtml(text || href)}</a>`
    }
  }
})

// Its own instance, so the link hook below doesn't apply to other users of DOMPurify
const purify = createDOMPurify(window)

purify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    // Open links in a new tab, so following one doesn't lose the review
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

// A safety net behind the escaping above, in case marked ever emits something unexpected
const SANITIZE_OPTIONS = {
  USE_PROFILES: { html: true },
  // Nothing on the page may load a remote resource
  FORBID_TAGS: ['img', 'picture', 'source', 'video', 'audio', 'track', 'style'],
  FORBID_ATTR: ['style'],
  // Web and mail links only; DOMPurify would otherwise also allow relative URLs and other schemes
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i
}

/**
 * Render untrusted markdown to sanitized HTML
 * @param {string} markdown - Markdown source, e.g. an AI review
 * @returns {string} HTML that can't run script or load remote resources; '' for empty input
 */
export function renderMarkdown(markdown) {
  if (!markdown) return ''

  const source = String(markdown)
  try {
    return purify.sanitize(parser.parse(source), SANITIZE_OPTIONS)
  } catch (error) {
    console.error('Markdown rendering error:', error)
    return `<pre>${escapeHtml(source)}</pre>`
  }
}
