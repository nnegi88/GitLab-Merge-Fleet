import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import GeminiAPI from '../../../src/api/gemini.js'
import { useAuthStore } from '../../../src/stores/authStore.js'

const ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const okResponse = (body) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: vi.fn().mockResolvedValue(body)
})

const errorResponse = (status, statusText, json) => ({
  ok: false,
  status,
  statusText,
  json
})

const geminiReply = (text) => ({
  candidates: [{ content: { parts: [{ text }] } }]
})

const sentRequest = () => {
  const [url, init] = fetch.mock.calls[0]
  return { url, init, body: JSON.parse(init.body) }
}

describe('GeminiAPI', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().setGeminiApiKey('test-key')
    vi.stubGlobal('fetch', vi.fn())
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('generateContent', () => {
    it('refuses to call Gemini when no API key is configured', async () => {
      useAuthStore().setGeminiApiKey(null)

      await expect(GeminiAPI.generateContent('hi')).rejects.toThrow(
        'Gemini API key not configured. Please add it in Settings.'
      )
      expect(fetch).not.toHaveBeenCalled()
    })

    it('posts the prompt to the Gemini 2.5 Flash endpoint with the API key', async () => {
      fetch.mockResolvedValue(okResponse(geminiReply('answer')))

      await GeminiAPI.generateContent('Review this code')

      const { url, init, body } = sentRequest()
      expect(url).toBe(`${ENDPOINT}?key=test-key`)
      expect(init.method).toBe('POST')
      expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
      expect(body.contents).toEqual([{ parts: [{ text: 'Review this code' }] }])
      expect(body.generationConfig).toEqual({
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 8192
      })
      expect(body.safetySettings).toHaveLength(4)
      expect(body.safetySettings.every(s => s.threshold === 'BLOCK_MEDIUM_AND_ABOVE')).toBe(true)
    })

    it('returns the text of the first candidate', async () => {
      fetch.mockResolvedValue(okResponse(geminiReply('The review')))

      await expect(GeminiAPI.generateContent('p')).resolves.toBe('The review')
    })

    it('throws when Gemini blocks the prompt instead of returning a review', async () => {
      fetch.mockResolvedValue(okResponse({ promptFeedback: { blockReason: 'SAFETY' } }))

      await expect(GeminiAPI.generateContent('p')).rejects.toThrow(
        'Gemini blocked the request: SAFETY'
      )
    })

    it('throws when Gemini returns no text', async () => {
      fetch.mockResolvedValue(okResponse({ candidates: [] }))

      await expect(GeminiAPI.generateContent('p')).rejects.toThrow(
        'Gemini returned no content'
      )
    })

    it('forwards the abort signal to fetch', async () => {
      const controller = new AbortController()
      fetch.mockResolvedValue(okResponse(geminiReply('x')))

      await GeminiAPI.generateContent('p', { signal: controller.signal })

      expect(sentRequest().init.signal).toBe(controller.signal)
    })

    it('throws the error message Gemini returns', async () => {
      fetch.mockResolvedValue(
        errorResponse(400, 'Bad Request', vi.fn().mockResolvedValue({
          error: { message: 'API key not valid. Please pass a valid API key.' }
        }))
      )

      await expect(GeminiAPI.generateContent('p')).rejects.toThrow(
        'API key not valid. Please pass a valid API key.'
      )
    })

    it('falls back to the HTTP status when the JSON error has no message', async () => {
      fetch.mockResolvedValue(
        errorResponse(429, 'Too Many Requests', vi.fn().mockResolvedValue({}))
      )

      await expect(GeminiAPI.generateContent('p')).rejects.toThrow(
        'HTTP 429: Too Many Requests'
      )
    })

    it('reports the HTTP status when the error body is not JSON', async () => {
      fetch.mockResolvedValue(
        errorResponse(502, 'Bad Gateway', vi.fn().mockRejectedValue(
          new SyntaxError('Unexpected token < in JSON at position 0')
        ))
      )

      await expect(GeminiAPI.generateContent('p')).rejects.toThrow('HTTP 502: Bad Gateway')
    })
  })

  describe('reviewMergeRequest', () => {
    const mrData = {
      title: 'Add login',
      description: 'Adds a login form',
      source_branch: 'feature/login',
      target_branch: 'main',
      author: { name: 'Dev' }
    }
    const diffData = '--- a/src/login.js\n+++ b/src/login.js\n+const a = 1'

    it('sends a prompt built from the merge request and its diff', async () => {
      fetch.mockResolvedValue(okResponse(geminiReply('## 🔍 Overall Assessment\nFine')))

      await GeminiAPI.reviewMergeRequest(mrData, diffData)

      const prompt = sentRequest().body.contents[0].parts[0].text
      expect(prompt).toContain('Add login')
      expect(prompt).toContain('src/login.js')
      expect(prompt).toContain('+const a = 1')
    })

    it('returns the review parsed into sections with a summary', async () => {
      const review = [
        '## 🔍 Overall Assessment',
        'Solid change.',
        '## 🔒 Security Concerns',
        'One concern: the password is logged.'
      ].join('\n')
      fetch.mockResolvedValue(okResponse(geminiReply(review)))

      const result = await GeminiAPI.reviewMergeRequest(mrData, diffData)

      expect(result.fullReview).toBe(review)
      expect(result.sections.overall).toBe('Solid change.')
      expect(result.sections.security).toBe('One concern: the password is logged.')
      expect(result.summary).toBe('⚠️ Found security considerations')
    })

    it('wraps failures as "AI Review failed"', async () => {
      fetch.mockResolvedValue(
        errorResponse(500, 'Internal Server Error', vi.fn().mockResolvedValue({
          error: { message: 'Internal error encountered.' }
        }))
      )

      await expect(GeminiAPI.reviewMergeRequest(mrData, diffData)).rejects.toThrow(
        'AI Review failed: Internal error encountered.'
      )
    })

    it('fails rather than reporting an empty reply as clean code', async () => {
      fetch.mockResolvedValue(okResponse({ promptFeedback: { blockReason: 'SAFETY' } }))

      await expect(GeminiAPI.reviewMergeRequest(mrData, diffData)).rejects.toThrow(
        'AI Review failed: Gemini blocked the request: SAFETY'
      )
    })

    it('wraps a missing API key as "AI Review failed"', async () => {
      useAuthStore().setGeminiApiKey(null)

      await expect(GeminiAPI.reviewMergeRequest(mrData, diffData)).rejects.toThrow(
        'AI Review failed: Gemini API key not configured. Please add it in Settings.'
      )
    })
  })

  describe('reviewRepository', () => {
    const repositoryData = {
      project: {
        name_with_namespace: 'acme / fleet',
        description: 'Merge request dashboard',
        default_branch: 'main'
      },
      languages: { JavaScript: 100 },
      totalFiles: 40
    }
    const files = [
      { path: 'src/app.js', extension: 'js', content: 'console.log("hi")', size: 18 },
      { path: 'src/util.js', extension: 'js', content: 'export const x = 1', size: 18 }
    ]

    it('returns the parsed review with metadata about the run', async () => {
      vi.useFakeTimers({ now: new Date('2026-10-05T12:00:00Z') })
      const review = '## 📋 Summary\nHealthy codebase.'
      fetch.mockResolvedValue(okResponse(geminiReply(review)))

      try {
        const result = await GeminiAPI.reviewRepository(repositoryData, files, {
          focus: 'security',
          depth: 'deep'
        })

        expect(result.fullReview).toBe(review)
        expect(result.sections.summary).toContain('Healthy codebase.')
        expect(result.metadata).toEqual({
          filesAnalyzed: 2,
          focus: 'security',
          depth: 'deep',
          timestamp: '2026-10-05T12:00:00.000Z'
        })
      } finally {
        vi.useRealTimers()
      }
    })

    it('defaults to a comprehensive, standard-depth review', async () => {
      fetch.mockResolvedValue(okResponse(geminiReply('## 📋 Summary\nOk')))

      const result = await GeminiAPI.reviewRepository(repositoryData, files)

      expect(result.metadata.focus).toBe('comprehensive')
      expect(result.metadata.depth).toBe('standard')
    })

    it('sends a prompt built from the repository and its files', async () => {
      fetch.mockResolvedValue(okResponse(geminiReply('## 📋 Summary\nOk')))

      await GeminiAPI.reviewRepository(repositoryData, files)

      const prompt = sentRequest().body.contents[0].parts[0].text
      expect(prompt).toContain('acme / fleet')
      expect(prompt).toContain('src/app.js')
      expect(prompt).toContain('src/util.js')
    })

    it('can be cancelled with an AbortController', async () => {
      const controller = new AbortController()
      fetch.mockImplementation((url, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        )
      }))

      const review = GeminiAPI.reviewRepository(repositoryData, files, {
        signal: controller.signal
      })
      controller.abort()

      // Rethrown unwrapped so callers can tell a cancel from a failure.
      await expect(review).rejects.toMatchObject({ name: 'AbortError' })
    })

    it('rethrows failures unchanged and logs them', async () => {
      fetch.mockResolvedValue(
        errorResponse(503, 'Service Unavailable', vi.fn().mockResolvedValue({
          error: { message: 'The model is overloaded.' }
        }))
      )

      await expect(GeminiAPI.reviewRepository(repositoryData, files)).rejects.toThrow(
        /^The model is overloaded\.$/
      )
      expect(console.error).toHaveBeenCalledWith(
        'Repository review failed:',
        expect.any(Error)
      )
    })
  })

  describe('testConnection', () => {
    it('tests a key it is given instead of the saved one, without saving it', async () => {
      fetch.mockResolvedValue(okResponse(geminiReply('Connection successful')))

      await GeminiAPI.testConnection('typed-key')

      expect(sentRequest().url).toBe(`${ENDPOINT}?key=typed-key`)
      expect(useAuthStore().geminiApiKey).toBe('test-key')
    })

    it('reports success with the start of the reply', async () => {
      fetch.mockResolvedValue(okResponse(geminiReply('Connection successful')))

      await expect(GeminiAPI.testConnection()).resolves.toEqual({
        success: true,
        message: 'Gemini API connection successful',
        response: 'Connection successful'
      })
    })

    it('truncates a long reply to 100 characters', async () => {
      fetch.mockResolvedValue(okResponse(geminiReply('a'.repeat(250))))

      const result = await GeminiAPI.testConnection()

      expect(result.response).toBe('a'.repeat(100))
    })

    it('reports failure with the error message instead of throwing', async () => {
      useAuthStore().setGeminiApiKey(null)

      await expect(GeminiAPI.testConnection()).resolves.toEqual({
        success: false,
        error: 'Gemini API key not configured. Please add it in Settings.'
      })
    })
  })
})
