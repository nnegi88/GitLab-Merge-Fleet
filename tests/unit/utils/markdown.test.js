import { renderMarkdown } from '../../../src/utils/markdown.js'
import { vi, describe, it, expect, afterEach } from 'vitest'

// Parse into an inert document, so nothing in the output can run while we inspect it
const toBody = (html) => new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body

const UNSAFE_TAGS = [
  'script', 'iframe', 'frame', 'object', 'embed', 'img', 'picture', 'source', 'video', 'audio',
  'svg', 'math', 'style', 'link', 'meta', 'base', 'form'
]
const UNSAFE_ATTRIBUTES = ['style', 'src', 'srcset', 'action', 'formaction']

// Output that can't run script or load anything: no unsafe elements, no event handlers,
// no loading attributes, and only web and mail links
const expectInert = (html) => {
  const body = toBody(html)

  for (const tag of UNSAFE_TAGS) {
    expect(body.querySelector(tag), `<${tag}> in ${html}`).toBeNull()
  }
  for (const element of body.querySelectorAll('*')) {
    for (const { name } of element.attributes) {
      expect(name.startsWith('on'), `${name} on <${element.tagName}> in ${html}`).toBe(false)
      expect(UNSAFE_ATTRIBUTES, `${name} on <${element.tagName}> in ${html}`).not.toContain(name)
    }
  }
  for (const link of body.querySelectorAll('[href]')) {
    expect(link.getAttribute('href')).toMatch(/^(https?:|mailto:)/i)
  }
}

describe('renderMarkdown', () => {
  describe('XSS payloads', () => {
    const payloads = [
      '<script>alert(1)</script>',
      '<img src=x onerror="alert(1)">',
      '<svg onload="alert(1)"><circle r="10"/></svg>',
      '<iframe src="https://attacker.example"></iframe>',
      '<a href="javascript:alert(1)">click</a>',
      '<div onclick="alert(1)">click</div>',
      '<style>body { background: url(https://attacker.example/pixel) }</style>',
      '<form action="https://attacker.example"><input name="token"></form>',
      '<object data="https://attacker.example/x.swf"></object>',
      'Avoid using <div onclick="alert(1)"> here',
      'Inline <img src=x onerror=alert(1)> in a sentence',
      '<details>\n<summary onclick="alert(1)">More</summary>\n<script>alert(1)</script>\n</details>',
      '[click](javascript:alert(1))',
      '[click](JaVaScRiPt:alert(1))',
      '[click](javascript&#58;alert(1))',
      '[click](javascript&#x3A;alert(1))',
      '[click](<java\tscript:alert(1)>)',
      '[click](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
      '[click](vbscript:msgbox(1))',
      '[click](/relative/path)',
      '[click](https://example.com "title\\" onmouseover=\\"alert(1))',
      '![x](javascript:alert(1))',
      '![pixel](https://attacker.example/pixel.png)',
      '![x](https://example.com/a.png" onerror="alert(1))',
      '<https://example.com/"><script>alert(1)</script>>',
      '```html\n<script>alert(1)</script>\n```',
      '`<img src=x onerror=alert(1)>`'
    ]

    it.each(payloads)('should render %j inert', (payload) => {
      expectInert(renderMarkdown(payload))
    })
  })

  describe('raw HTML', () => {
    it('should show a raw script tag as text instead of running it', () => {
      const body = toBody(renderMarkdown('<script>alert(1)</script>'))

      expect(body.querySelector('script')).toBeNull()
      expect(body.textContent).toContain('<script>alert(1)</script>')
    })

    it('should keep inline HTML in a sentence visible as text', () => {
      const body = toBody(renderMarkdown('Avoid using <div onclick="x()"> here'))

      expect(body.querySelector('div')).toBeNull()
      expect(body.textContent.trim()).toBe('Avoid using <div onclick="x()"> here')
    })

    it('should keep the line structure of a block of HTML shown as text', () => {
      const html = renderMarkdown('<details>\n<summary>More</summary>\n</details>')

      expect(html).toBe('<p>&lt;details&gt;<br>&lt;summary&gt;More&lt;/summary&gt;<br>&lt;/details&gt;</p>')
    })
  })

  describe('links', () => {
    it('should open web links in a new tab without passing on the opener or referrer', () => {
      const link = toBody(renderMarkdown('[docs](https://example.com/a?b=1)')).querySelector('a')

      expect(link.getAttribute('href')).toBe('https://example.com/a?b=1')
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
      expect(link.textContent).toBe('docs')
    })

    it('should keep autolinks and mailto links', () => {
      const hrefs = [...toBody(renderMarkdown('<https://example.com> or [mail](mailto:dev@example.com)'))
        .querySelectorAll('a')].map(link => link.getAttribute('href'))

      expect(hrefs).toEqual(['https://example.com', 'mailto:dev@example.com'])
    })

    it('should drop the target of a javascript: link but keep its text', () => {
      const link = toBody(renderMarkdown('[click](javascript:alert(1))')).querySelector('a')

      expect(link.hasAttribute('href')).toBe(false)
      expect(link.hasAttribute('target')).toBe(false)
      expect(link.textContent).toBe('click')
    })
  })

  describe('images', () => {
    it('should link to an image instead of loading it', () => {
      const body = toBody(renderMarkdown('![diagram](https://example.com/diagram.png)'))
      const link = body.querySelector('a')

      expect(body.querySelector('img')).toBeNull()
      expect(link.getAttribute('href')).toBe('https://example.com/diagram.png')
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.textContent).toBe('diagram')
    })

    it('should use the URL as the link text when the image has no alt text', () => {
      const link = toBody(renderMarkdown('![](https://example.com/diagram.png)')).querySelector('a')

      expect(link.textContent).toBe('https://example.com/diagram.png')
    })
  })

  describe('markdown formatting', () => {
    it('should render headings, emphasis, lists and inline code', () => {
      const body = toBody(renderMarkdown('## Summary\n\n**Bold** and *italic*\n\n- one\n- two\n\nUse `npm test`'))

      expect(body.querySelector('h2').textContent).toBe('Summary')
      expect(body.querySelector('strong').textContent).toBe('Bold')
      expect(body.querySelector('em').textContent).toBe('italic')
      expect(body.querySelectorAll('li')).toHaveLength(2)
      expect(body.querySelector('code').textContent).toBe('npm test')
    })

    it('should render tables', () => {
      const body = toBody(renderMarkdown('| File | Issues |\n| --- | --: |\n| app.js | 2 |'))

      expect([...body.querySelectorAll('th')].map(cell => cell.textContent)).toEqual(['File', 'Issues'])
      expect([...body.querySelectorAll('td')].map(cell => cell.textContent)).toEqual(['app.js', '2'])
    })

    it('should show HTML inside a fenced code block as code', () => {
      const body = toBody(renderMarkdown('```html\n<script>alert(1)</script>\n```'))

      expect(body.querySelector('pre code').textContent).toBe('<script>alert(1)</script>\n')
      expect(body.querySelector('script')).toBeNull()
    })

    it('should turn single newlines into line breaks', () => {
      expect(renderMarkdown('line one\nline two')).toBe('<p>line one<br>line two</p>\n')
    })
  })

  describe('input', () => {
    it.each([['empty string', ''], ['null', null], ['undefined', undefined]])(
      'should return an empty string for %s',
      (_, input) => {
        expect(renderMarkdown(input)).toBe('')
      }
    )

    it('should render non-string input as text', () => {
      expect(renderMarkdown(42)).toBe('<p>42</p>\n')
    })
  })

  describe('when rendering fails', () => {
    afterEach(() => {
      vi.doUnmock('marked')
      vi.resetModules()
    })

    it('should fall back to the escaped source', async () => {
      vi.resetModules()
      vi.doMock('marked', () => ({
        Marked: class {
          parse() {
            throw new Error('parse failed')
          }
        }
      }))
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { renderMarkdown: renderWithBrokenParser } = await import('../../../src/utils/markdown.js')

      expect(renderWithBrokenParser('<img src=x onerror=alert(1)>')).toBe(
        '<pre>&lt;img src=x onerror=alert(1)&gt;</pre>'
      )
      expect(consoleError).toHaveBeenCalledWith('Markdown rendering error:', expect.any(Error))
      consoleError.mockRestore()
    })
  })
})
