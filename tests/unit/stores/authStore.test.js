import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../../src/stores/authStore.js'

describe('authStore', () => {
  let store

  // A new store reads what's stored, the way a page reload does
  const freshStore = () => {
    setActivePinia(createPinia())
    return useAuthStore()
  }

  const settings = () => JSON.parse(localStorage.getItem('auth-settings'))

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    store = freshStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should start with no secrets, gitlab.com and nothing remembered', () => {
      expect(store.token).toBeNull()
      expect(store.geminiApiKey).toBeNull()
      expect(store.gitlabUrl).toBe('https://gitlab.com')
      expect(store.remember).toBe(false)
      expect(store.user).toBeNull()
    })

    it('should load secrets kept for this tab', () => {
      sessionStorage.setItem('gitlab-token', 'glpat-tab')
      sessionStorage.setItem('gemini-api-key', 'gemini-tab')

      const reloaded = freshStore()

      expect(reloaded.token).toBe('glpat-tab')
      expect(reloaded.geminiApiKey).toBe('gemini-tab')
    })

    it('should load remembered secrets from this device', () => {
      localStorage.setItem('auth-settings', JSON.stringify({ gitlabUrl: 'https://gitlab.example.com', remember: true }))
      localStorage.setItem('gitlab-token', 'glpat-remembered')
      localStorage.setItem('gemini-api-key', 'gemini-remembered')

      const reloaded = freshStore()

      expect(reloaded.remember).toBe(true)
      expect(reloaded.gitlabUrl).toBe('https://gitlab.example.com')
      expect(reloaded.token).toBe('glpat-remembered')
      expect(reloaded.geminiApiKey).toBe('gemini-remembered')
    })

    it('should fall back to defaults when the stored settings are corrupt', () => {
      localStorage.setItem('auth-settings', 'invalid-json')

      const reloaded = freshStore()

      expect(reloaded.gitlabUrl).toBe('https://gitlab.com')
      expect(reloaded.remember).toBe(false)
      expect(console.error).toHaveBeenCalledWith('Failed to load stored settings:', expect.any(Error))
    })
  })

  describe('entries left by earlier versions', () => {
    it('should remove the old token and Gemini key but keep the GitLab URL', () => {
      localStorage.setItem('auth-storage', JSON.stringify({
        encryptedToken: { encrypted: 'abc', key: 'def', iv: 'ghi' },
        gitlabUrl: 'https://gitlab.example.com',
        sessionOnly: false
      }))
      localStorage.setItem('gemini_api_key', 'plain-text-key')

      const reloaded = freshStore()

      expect(localStorage.getItem('auth-storage')).toBeNull()
      expect(localStorage.getItem('gemini_api_key')).toBeNull()
      expect(reloaded.token).toBeNull()
      expect(reloaded.geminiApiKey).toBeNull()
      expect(reloaded.gitlabUrl).toBe('https://gitlab.example.com')
      expect(freshStore().gitlabUrl).toBe('https://gitlab.example.com')
    })
  })

  describe('setToken', () => {
    it('should keep the token for this tab only by default', () => {
      store.setToken('glpat-123')

      expect(store.token).toBe('glpat-123')
      expect(sessionStorage.getItem('gitlab-token')).toBe('glpat-123')
      expect(localStorage.getItem('gitlab-token')).toBeNull()
      expect(freshStore().token).toBe('glpat-123')
    })

    it('should keep the token on this device when remembering', () => {
      store.setRemember(true)
      store.setToken('glpat-123')

      expect(localStorage.getItem('gitlab-token')).toBe('glpat-123')
      expect(sessionStorage.getItem('gitlab-token')).toBeNull()
    })

    it.each([[null], ['']])('should forget the token when given %j', (empty) => {
      store.setToken('glpat-123')

      store.setToken(empty)

      expect(store.token).toBeNull()
      expect(sessionStorage.getItem('gitlab-token')).toBeNull()
    })
  })

  describe('setGeminiApiKey', () => {
    it('should keep the Gemini key for this tab only by default', () => {
      store.setGeminiApiKey('gemini-123')

      expect(store.geminiApiKey).toBe('gemini-123')
      expect(sessionStorage.getItem('gemini-api-key')).toBe('gemini-123')
      expect(localStorage.getItem('gemini-api-key')).toBeNull()
    })

    it('should keep the Gemini key on this device when remembering', () => {
      store.setRemember(true)
      store.setGeminiApiKey('gemini-123')

      expect(localStorage.getItem('gemini-api-key')).toBe('gemini-123')
    })

    it('should forget the Gemini key when cleared', () => {
      store.setGeminiApiKey('gemini-123')

      store.setGeminiApiKey('')

      expect(store.geminiApiKey).toBeNull()
      expect(sessionStorage.getItem('gemini-api-key')).toBeNull()
    })
  })

  describe('clearToken', () => {
    it('should sign out of GitLab but keep the Gemini key', () => {
      store.setToken('glpat-123')
      store.setGeminiApiKey('gemini-123')
      store.setUser({ id: 1, username: 'testuser' })

      store.clearToken()

      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(sessionStorage.getItem('gitlab-token')).toBeNull()
      expect(store.geminiApiKey).toBe('gemini-123')
    })
  })

  describe('setRemember', () => {
    beforeEach(() => {
      store.setToken('glpat-123')
      store.setGeminiApiKey('gemini-123')
    })

    it('should move both secrets onto this device', () => {
      store.setRemember(true)

      expect(localStorage.getItem('gitlab-token')).toBe('glpat-123')
      expect(localStorage.getItem('gemini-api-key')).toBe('gemini-123')
      expect(sessionStorage.getItem('gitlab-token')).toBeNull()
      expect(sessionStorage.getItem('gemini-api-key')).toBeNull()
      expect(settings().remember).toBe(true)
    })

    it('should move both secrets back to this tab when no longer remembering', () => {
      store.setRemember(true)

      store.setRemember(false)

      expect(sessionStorage.getItem('gitlab-token')).toBe('glpat-123')
      expect(sessionStorage.getItem('gemini-api-key')).toBe('gemini-123')
      expect(localStorage.getItem('gitlab-token')).toBeNull()
      expect(localStorage.getItem('gemini-api-key')).toBeNull()
      expect(settings().remember).toBe(false)
    })

    it('should keep the choice for the next visit', () => {
      store.setRemember(true)

      const reloaded = freshStore()

      expect(reloaded.remember).toBe(true)
      expect(reloaded.token).toBe('glpat-123')
    })
  })

  describe('setGitlabUrl', () => {
    it('should remove a trailing slash', () => {
      store.setGitlabUrl('https://gitlab.example.com/')

      expect(store.gitlabUrl).toBe('https://gitlab.example.com')
    })

    it('should keep the URL for the next visit even when not remembering secrets', () => {
      store.setGitlabUrl('https://gitlab.example.com')

      expect(settings()).toEqual({ gitlabUrl: 'https://gitlab.example.com', remember: false })
      expect(freshStore().gitlabUrl).toBe('https://gitlab.example.com')
    })
  })

  describe('setUser', () => {
    it('should set and clear the user', () => {
      store.setUser({ id: 1, username: 'testuser' })
      expect(store.user).toEqual({ id: 1, username: 'testuser' })

      store.setUser(null)
      expect(store.user).toBeNull()
    })
  })

  describe('nothing secret on this device unless remembered', () => {
    it('should leave only the non-secret settings in localStorage', () => {
      store.setGitlabUrl('https://gitlab.example.com')
      store.setToken('glpat-123')
      store.setGeminiApiKey('gemini-123')

      const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      expect(keys).toEqual(['auth-settings'])
      expect(localStorage.getItem('auth-settings')).not.toContain('glpat-123')
    })
  })
})
