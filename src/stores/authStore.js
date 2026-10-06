import { defineStore } from 'pinia'

// The store owns both secrets: the GitLab token and the Gemini API key. They're kept for
// this tab only (sessionStorage), so a reload keeps them and closing the tab forgets them,
// unless the user chooses to remember them on this device (localStorage). Nothing encrypts
// them: any code running on this site could read them anyway.
const SECRET_KEYS = {
  token: 'gitlab-token',
  geminiApiKey: 'gemini-api-key'
}

// Not secret, so always kept in localStorage
const SETTINGS_KEY = 'auth-settings'

// Left by earlier versions: an "encrypted" token whose key was stored beside it, and a
// plain-text Gemini key. Removed on load; only the GitLab URL is carried over
const LEGACY_AUTH_KEY = 'auth-storage'
const LEGACY_GEMINI_KEY = 'gemini_api_key'

const DEFAULT_GITLAB_URL = 'https://gitlab.com'

const secretStorage = (remember) => (remember ? localStorage : sessionStorage)

const readSettings = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || {}
  } catch (error) {
    console.error('Failed to load stored settings:', error)
    return {}
  }
}

const loadSettings = () => {
  const legacy = readSettings(LEGACY_AUTH_KEY)
  const stored = readSettings(SETTINGS_KEY)
  const settings = {
    gitlabUrl: stored.gitlabUrl || legacy.gitlabUrl || DEFAULT_GITLAB_URL,
    remember: stored.remember === true
  }

  if (localStorage.getItem(LEGACY_AUTH_KEY) !== null) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }
  localStorage.removeItem(LEGACY_AUTH_KEY)
  localStorage.removeItem(LEGACY_GEMINI_KEY)

  return settings
}

const writeSecret = (storage, name, value) => {
  if (value) {
    storage.setItem(SECRET_KEYS[name], value)
  } else {
    storage.removeItem(SECRET_KEYS[name])
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    const { gitlabUrl, remember } = loadSettings()
    const storage = secretStorage(remember)
    return {
      token: storage.getItem(SECRET_KEYS.token),
      geminiApiKey: storage.getItem(SECRET_KEYS.geminiApiKey),
      gitlabUrl,
      remember,
      user: null
    }
  },

  actions: {
    setToken(token) {
      this.token = token || null
      writeSecret(secretStorage(this.remember), 'token', this.token)
    },

    setGeminiApiKey(apiKey) {
      this.geminiApiKey = apiKey || null
      writeSecret(secretStorage(this.remember), 'geminiApiKey', this.geminiApiKey)
    },

    clearToken() {
      this.setToken(null)
      this.user = null
    },

    // Move both secrets to where the user now wants them kept
    setRemember(remember) {
      const from = secretStorage(this.remember)
      const to = secretStorage(remember)
      for (const name of Object.keys(SECRET_KEYS)) {
        writeSecret(from, name, null)
        writeSecret(to, name, this[name])
      }
      this.remember = remember
      this.saveSettings()
    },

    setGitlabUrl(url) {
      this.gitlabUrl = url.replace(/\/$/, '')
      this.saveSettings()
    },

    setUser(user) {
      this.user = user
    },

    saveSettings() {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ gitlabUrl: this.gitlabUrl, remember: this.remember }))
    }
  }
})
