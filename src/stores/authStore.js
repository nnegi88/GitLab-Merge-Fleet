import { defineStore } from 'pinia'

const STORAGE_KEY = 'auth-storage'

const encryptToken = async (token) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  
  const exportedKey = await crypto.subtle.exportKey('raw', key)
  
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    key: btoa(String.fromCharCode(...new Uint8Array(exportedKey))),
    iv: btoa(String.fromCharCode(...iv))
  }
}

const decryptToken = async (encryptedData) => {
  const { encrypted, key, iv } = encryptedData
  
  const importedKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(atob(key).split('').map(c => c.charCodeAt(0))),
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(atob(iv).split('').map(c => c.charCodeAt(0))) },
    importedKey,
    new Uint8Array(atob(encrypted).split('').map(c => c.charCodeAt(0)))
  )
  
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

const loadStoredState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load stored state:', error)
  }
  return {
    encryptedToken: null,
    gitlabUrl: 'https://gitlab.com',
    sessionOnly: false
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    const initialState = loadStoredState()
    return {
      token: null,
      encryptedToken: initialState.encryptedToken,
      gitlabUrl: initialState.gitlabUrl,
      user: null,
      sessionOnly: initialState.sessionOnly
    }
  },

  actions: {
    async setToken(token) {
      if (token) {
        const encrypted = await encryptToken(token)
        this.token = token
        this.encryptedToken = encrypted
        
        if (!this.sessionOnly) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            encryptedToken: encrypted,
            gitlabUrl: this.gitlabUrl,
            sessionOnly: this.sessionOnly
          }))
        }
      } else {
        this.token = null
        this.encryptedToken = null
        localStorage.removeItem(STORAGE_KEY)
      }
    },

    async loadToken() {
      if (this.encryptedToken) {
        try {
          const token = await decryptToken(this.encryptedToken)
          this.token = token
          return token
        } catch (error) {
          console.error('Failed to decrypt token:', error)
          this.token = null
          this.encryptedToken = null
          localStorage.removeItem(STORAGE_KEY)
        }
      }
      return null
    },

    clearToken() {
      this.token = null
      this.encryptedToken = null
      this.user = null
      localStorage.removeItem(STORAGE_KEY)
    },

    setGitlabUrl(url) {
      const cleanUrl = url.replace(/\/$/, '')
      this.gitlabUrl = cleanUrl
      
      if (!this.sessionOnly && this.encryptedToken) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          encryptedToken: this.encryptedToken,
          gitlabUrl: cleanUrl,
          sessionOnly: this.sessionOnly
        }))
      }
    },

    setUser(user) {
      this.user = user
    },

    setSessionOnly(sessionOnly) {
      this.sessionOnly = sessionOnly
      
      // Always save the sessionOnly preference.
      // If sessionOnly is true, store null for encryptedToken to ensure it's not persisted.
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        encryptedToken: sessionOnly ? null : this.encryptedToken,
        gitlabUrl: this.gitlabUrl,
        sessionOnly: sessionOnly
      }))
    },

    async initialize() {
      if (this.encryptedToken && !this.token) {
        await this.loadToken()
      }
    }
  }
})