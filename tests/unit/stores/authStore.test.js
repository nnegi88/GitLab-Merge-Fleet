import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../../src/stores/authStore.js'

describe('authStore', () => {
  let store
  let mockCrypto

  beforeEach(() => {
    // Create fresh Pinia instance for each test
    setActivePinia(createPinia())

    // Clear localStorage
    localStorage.clear()

    // Setup crypto mocks
    mockCrypto = {
      subtle: {
        generateKey: vi.fn().mockResolvedValue('mock-key'),
        exportKey: vi.fn().mockResolvedValue(new Uint8Array(32).fill(1)),
        importKey: vi.fn().mockResolvedValue('mock-imported-key'),
        encrypt: vi.fn().mockResolvedValue(new Uint8Array(16).fill(2)),
        decrypt: vi.fn().mockResolvedValue(new TextEncoder().encode('decrypted-token'))
      },
      getRandomValues: vi.fn((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i
        }
        return arr
      })
    }

    vi.stubGlobal('crypto', mockCrypto)

    // Spy on console.error to suppress expected error logs
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Create store instance
    store = useAuthStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('initial state', () => {
    it('should initialize with default values when no stored state', () => {
      expect(store.token).toBeNull()
      expect(store.encryptedToken).toBeNull()
      expect(store.gitlabUrl).toBe('https://gitlab.com')
      expect(store.user).toBeNull()
      expect(store.sessionOnly).toBe(false)
    })

    it('should load stored state from localStorage on initialization', () => {
      const storedState = {
        encryptedToken: { encrypted: 'abc', key: 'def', iv: 'ghi' },
        gitlabUrl: 'https://gitlab.example.com',
        sessionOnly: false
      }

      localStorage.setItem('auth-storage', JSON.stringify(storedState))

      // Create fresh Pinia and store to trigger initialization with stored data
      setActivePinia(createPinia())
      const newStore = useAuthStore()

      expect(newStore.encryptedToken).toEqual(storedState.encryptedToken)
      expect(newStore.gitlabUrl).toBe('https://gitlab.example.com')
      expect(newStore.sessionOnly).toBe(false)
    })

    it('should handle corrupt localStorage data gracefully', () => {
      localStorage.setItem('auth-storage', 'invalid-json')

      // Create fresh Pinia and store to trigger initialization with corrupt data
      setActivePinia(createPinia())
      const newStore = useAuthStore()

      expect(newStore.encryptedToken).toBeNull()
      expect(newStore.gitlabUrl).toBe('https://gitlab.com')
      expect(console.error).toHaveBeenCalledWith('Failed to load stored state:', expect.any(Error))
    })
  })

  describe('setToken', () => {
    it('should encrypt and store token', async () => {
      await store.setToken('test-token')

      expect(mockCrypto.subtle.generateKey).toHaveBeenCalled()
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled()
      expect(mockCrypto.subtle.exportKey).toHaveBeenCalled()
      expect(store.token).toBe('test-token')
      expect(store.encryptedToken).toBeDefined()
      expect(store.encryptedToken).toHaveProperty('encrypted')
      expect(store.encryptedToken).toHaveProperty('key')
      expect(store.encryptedToken).toHaveProperty('iv')
    })

    it('should save encrypted token to localStorage when not session-only', async () => {
      store.sessionOnly = false
      await store.setToken('test-token')

      const stored = JSON.parse(localStorage.getItem('auth-storage'))
      expect(stored.encryptedToken).toBeDefined()
      expect(stored.gitlabUrl).toBe('https://gitlab.com')
      expect(stored.sessionOnly).toBe(false)
    })

    it('should not save encrypted token to localStorage when session-only', async () => {
      store.sessionOnly = true
      await store.setToken('test-token')

      expect(localStorage.getItem('auth-storage')).toBeNull()
      expect(store.token).toBe('test-token')
      expect(store.encryptedToken).toBeDefined()
    })

    it('should clear token when null is provided', async () => {
      await store.setToken('test-token')
      expect(store.token).toBe('test-token')

      await store.setToken(null)

      expect(store.token).toBeNull()
      expect(store.encryptedToken).toBeNull()
      expect(localStorage.getItem('auth-storage')).toBeNull()
    })

    it('should clear token when empty string is provided', async () => {
      await store.setToken('test-token')
      expect(store.token).toBe('test-token')

      await store.setToken('')

      expect(store.token).toBeNull()
      expect(store.encryptedToken).toBeNull()
      expect(localStorage.getItem('auth-storage')).toBeNull()
    })
  })

  describe('loadToken', () => {
    it('should decrypt and load stored token', async () => {
      const encryptedToken = {
        encrypted: btoa('encrypted-data'),
        key: btoa('key-data'),
        iv: btoa('iv-data')
      }
      store.encryptedToken = encryptedToken

      const token = await store.loadToken()

      expect(mockCrypto.subtle.importKey).toHaveBeenCalled()
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled()
      expect(token).toBe('decrypted-token')
      expect(store.token).toBe('decrypted-token')
    })

    it('should return null when no encrypted token exists', async () => {
      const token = await store.loadToken()

      expect(token).toBeNull()
      expect(mockCrypto.subtle.decrypt).not.toHaveBeenCalled()
    })

    it('should handle decryption errors and clear token', async () => {
      const encryptedToken = {
        encrypted: btoa('encrypted-data'),
        key: btoa('key-data'),
        iv: btoa('iv-data')
      }
      store.encryptedToken = encryptedToken
      localStorage.setItem('auth-storage', JSON.stringify({ encryptedToken }))

      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'))

      const token = await store.loadToken()

      expect(token).toBeNull()
      expect(store.token).toBeNull()
      expect(store.encryptedToken).toBeNull()
      expect(localStorage.getItem('auth-storage')).toBeNull()
      expect(console.error).toHaveBeenCalledWith('Failed to decrypt token:', expect.any(Error))
    })
  })

  describe('clearToken', () => {
    it('should clear all auth state', async () => {
      await store.setToken('test-token')
      store.user = { id: 1, username: 'testuser' }

      store.clearToken()

      expect(store.token).toBeNull()
      expect(store.encryptedToken).toBeNull()
      expect(store.user).toBeNull()
      expect(localStorage.getItem('auth-storage')).toBeNull()
    })

    it('should clear localStorage even if token is already null', () => {
      localStorage.setItem('auth-storage', JSON.stringify({ encryptedToken: 'test' }))

      store.clearToken()

      expect(localStorage.getItem('auth-storage')).toBeNull()
    })
  })

  describe('setGitlabUrl', () => {
    it('should set GitLab URL and remove trailing slash', () => {
      store.setGitlabUrl('https://gitlab.example.com/')

      expect(store.gitlabUrl).toBe('https://gitlab.example.com')
    })

    it('should set GitLab URL without trailing slash', () => {
      store.setGitlabUrl('https://gitlab.example.com')

      expect(store.gitlabUrl).toBe('https://gitlab.example.com')
    })

    it('should save URL to localStorage when not session-only and token exists', async () => {
      await store.setToken('test-token')
      store.sessionOnly = false

      store.setGitlabUrl('https://gitlab.example.com')

      const stored = JSON.parse(localStorage.getItem('auth-storage'))
      expect(stored.gitlabUrl).toBe('https://gitlab.example.com')
    })

    it('should not save to localStorage when session-only', async () => {
      store.sessionOnly = true
      await store.setToken('test-token')

      store.setGitlabUrl('https://gitlab.example.com')

      expect(localStorage.getItem('auth-storage')).toBeNull()
      expect(store.gitlabUrl).toBe('https://gitlab.example.com')
    })

    it('should not save to localStorage when no encrypted token', () => {
      store.sessionOnly = false
      store.encryptedToken = null

      store.setGitlabUrl('https://gitlab.example.com')

      expect(localStorage.getItem('auth-storage')).toBeNull()
    })
  })

  describe('setUser', () => {
    it('should set user data', () => {
      const userData = { id: 1, username: 'testuser', email: 'test@example.com' }

      store.setUser(userData)

      expect(store.user).toEqual(userData)
    })

    it('should allow setting user to null', () => {
      store.user = { id: 1, username: 'testuser' }

      store.setUser(null)

      expect(store.user).toBeNull()
    })
  })

  describe('setSessionOnly', () => {
    it('should set session-only mode to true and remove encrypted token from storage', async () => {
      await store.setToken('test-token')
      store.sessionOnly = false

      // Verify token is in localStorage
      let stored = JSON.parse(localStorage.getItem('auth-storage'))
      expect(stored.encryptedToken).toBeDefined()

      store.setSessionOnly(true)

      expect(store.sessionOnly).toBe(true)
      stored = JSON.parse(localStorage.getItem('auth-storage'))
      expect(stored.encryptedToken).toBeNull()
      expect(stored.sessionOnly).toBe(true)
      expect(stored.gitlabUrl).toBe('https://gitlab.com')
    })

    it('should set session-only mode to false and save encrypted token to storage', async () => {
      await store.setToken('test-token')
      store.sessionOnly = true

      store.setSessionOnly(false)

      expect(store.sessionOnly).toBe(false)
      const stored = JSON.parse(localStorage.getItem('auth-storage'))
      expect(stored.encryptedToken).toBeDefined()
      expect(stored.sessionOnly).toBe(false)
    })

    it('should save session-only preference even without encrypted token', () => {
      store.encryptedToken = null

      store.setSessionOnly(true)

      const stored = JSON.parse(localStorage.getItem('auth-storage'))
      expect(stored.sessionOnly).toBe(true)
      expect(stored.encryptedToken).toBeNull()
    })
  })

  describe('initialize', () => {
    it('should load token if encrypted token exists but token is null', async () => {
      const encryptedToken = {
        encrypted: btoa('encrypted-data'),
        key: btoa('key-data'),
        iv: btoa('iv-data')
      }
      store.encryptedToken = encryptedToken
      store.token = null

      await store.initialize()

      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled()
      expect(store.token).toBe('decrypted-token')
    })

    it('should not load token if token already exists', async () => {
      const encryptedToken = {
        encrypted: btoa('encrypted-data'),
        key: btoa('key-data'),
        iv: btoa('iv-data')
      }
      store.encryptedToken = encryptedToken
      store.token = 'existing-token'

      await store.initialize()

      expect(mockCrypto.subtle.decrypt).not.toHaveBeenCalled()
      expect(store.token).toBe('existing-token')
    })

    it('should not load token if no encrypted token exists', async () => {
      store.encryptedToken = null
      store.token = null

      await store.initialize()

      expect(mockCrypto.subtle.decrypt).not.toHaveBeenCalled()
      expect(store.token).toBeNull()
    })
  })

  describe('persistence', () => {
    it('should persist state across store instances when not session-only', async () => {
      await store.setToken('test-token')
      store.setGitlabUrl('https://gitlab.example.com')
      store.sessionOnly = false

      // Create new store instance
      const newStore = useAuthStore()

      expect(newStore.encryptedToken).toBeDefined()
      expect(newStore.gitlabUrl).toBe('https://gitlab.example.com')
      expect(newStore.sessionOnly).toBe(false)
    })

    it('should not persist encrypted token when session-only mode', async () => {
      store.sessionOnly = true
      await store.setToken('test-token')
      store.setGitlabUrl('https://gitlab.example.com')

      // Create fresh Pinia and store instance to simulate page reload
      setActivePinia(createPinia())
      const newStore = useAuthStore()

      expect(newStore.encryptedToken).toBeNull()
      expect(newStore.token).toBeNull()
    })
  })

  describe('encryption flow', () => {
    it('should encrypt and decrypt token correctly', async () => {
      // Mock crypto to return deterministic values
      const originalToken = 'my-secret-token'
      mockCrypto.subtle.decrypt.mockResolvedValue(new TextEncoder().encode(originalToken))

      await store.setToken(originalToken)
      expect(store.token).toBe(originalToken)

      // Clear token in memory
      store.token = null

      // Load token should decrypt it
      const loadedToken = await store.loadToken()
      expect(loadedToken).toBe(originalToken)
    })
  })
})
