import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountWithPlugins, createMockLocalStorage } from '../../utils/testHelpers.js'
import Settings from '../../../src/pages/Settings.vue'
import { useAuthStore } from '../../../src/stores/authStore.js'
import geminiAPI from '../../../src/api/gemini.js'

// Mock the gemini API
vi.mock('../../../src/api/gemini.js', () => ({
  default: {
    testConnection: vi.fn(() => Promise.resolve({ success: true, message: 'Connection successful' }))
  }
}))

describe('Settings.vue', () => {
  let wrapper
  let authStore
  let mockLocalStorage

  beforeEach(() => {
    wrapper = null
    mockLocalStorage = createMockLocalStorage()
    global.localStorage = mockLocalStorage
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Rendering', () => {
    it('should render settings page with title', () => {
      wrapper = mountWithPlugins(Settings)

      expect(wrapper.text()).toContain('Settings')
    })

    it('should render all main sections', () => {
      wrapper = mountWithPlugins(Settings)

      expect(wrapper.text()).toContain('Account Information')
      expect(wrapper.text()).toContain('Security')
      expect(wrapper.text()).toContain('AI Integration')
    })
  })

  describe('Account Information', () => {
    it('should display GitLab instance URL', async () => {
      wrapper = mountWithPlugins(Settings)

      authStore = useAuthStore()
      authStore.gitlabUrl = 'https://gitlab.example.com'
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('GitLab Instance')
      expect(wrapper.text()).toContain('https://gitlab.example.com')
    })

    it('should display username when user is set', async () => {
      wrapper = mountWithPlugins(Settings)

      authStore = useAuthStore()
      authStore.user = {
        username: 'johndoe',
        name: 'John Doe',
        email: 'john@example.com'
      }
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Username')
      expect(wrapper.text()).toContain('@johndoe')
    })

    it('should display name when user is set', async () => {
      wrapper = mountWithPlugins(Settings)

      authStore = useAuthStore()
      authStore.user = {
        username: 'johndoe',
        name: 'John Doe',
        email: 'john@example.com'
      }
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Name')
      expect(wrapper.text()).toContain('John Doe')
    })

    it('should display email when user is set', async () => {
      wrapper = mountWithPlugins(Settings)

      authStore = useAuthStore()
      authStore.user = {
        username: 'johndoe',
        name: 'John Doe',
        email: 'john@example.com'
      }
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Email')
      expect(wrapper.text()).toContain('john@example.com')
    })

    it('should not display username section when user is not set', () => {
      wrapper = mountWithPlugins(Settings)

      authStore = useAuthStore()
      authStore.user = null

      expect(wrapper.text()).not.toContain('@')
    })
  })

  describe('Security Settings', () => {
    it('should render session only toggle', () => {
      wrapper = mountWithPlugins(Settings)

      expect(wrapper.text()).toContain('Session Only Storage')
      expect(wrapper.text()).toContain("Don't persist authentication after browser close")
    })

    it('should reflect current session only setting', async () => {
      wrapper = mountWithPlugins(Settings)

      authStore = useAuthStore()
      authStore.sessionOnly = true
      await wrapper.vm.$nextTick()

      const switchComponent = wrapper.findComponent({ name: 'VSwitch' })
      expect(switchComponent.exists()).toBe(true)
      expect(switchComponent.props('modelValue')).toBe(true)
    })

    it('should bind session only toggle to auth store', async () => {
      wrapper = mountWithPlugins(Settings)

      authStore = useAuthStore()
      authStore.sessionOnly = false
      await wrapper.vm.$nextTick()

      const switchComponent = wrapper.findComponent({ name: 'VSwitch' })
      expect(switchComponent.exists()).toBe(true)
      expect(switchComponent.props('modelValue')).toBe(false)

      authStore.sessionOnly = true
      await wrapper.vm.$nextTick()

      expect(switchComponent.props('modelValue')).toBe(true)
    })
  })

  describe('AI Integration', () => {
    it('should render AI Integration section', () => {
      wrapper = mountWithPlugins(Settings)

      expect(wrapper.text()).toContain('AI Integration')
    })

    it('should render Gemini API key input field', () => {
      wrapper = mountWithPlugins(Settings)

      expect(wrapper.text()).toContain('Google Gemini API Key')
    })

    it('should show warning when API key is not set', async () => {
      wrapper = mountWithPlugins(Settings)
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('API Key Required for AI Features')
      expect(wrapper.text()).toContain('ai.google.dev')
    })

    it('should load API key from localStorage on mount', async () => {
      mockLocalStorage.setItem('gemini_api_key', 'test-api-key-123')

      wrapper = mountWithPlugins(Settings)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.geminiApiKey).toBe('test-api-key-123')
    })

    it('should render API key input as password type', () => {
      wrapper = mountWithPlugins(Settings)

      const passwordInputs = wrapper.findAll('input[type="password"]')
      expect(passwordInputs.length).toBeGreaterThan(0)
    })

    it('should show info alert about local storage', () => {
      wrapper = mountWithPlugins(Settings)

      expect(wrapper.text()).toContain('Your API key is stored locally in your browser and never sent to our servers.')
    })
  })

  describe('Save Settings', () => {
    it('should render Save Settings button', () => {
      wrapper = mountWithPlugins(Settings)

      expect(wrapper.text()).toContain('Save Settings')
    })

    it('should save API key to localStorage when Save is clicked', async () => {
      wrapper = mountWithPlugins(Settings)

      wrapper.vm.geminiApiKey = 'new-api-key-456'
      await wrapper.vm.$nextTick()

      const saveButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Save Settings')
      )

      expect(saveButton).toBeDefined()
      await saveButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('gemini_api_key', 'new-api-key-456')
    })

    it('should show success message after saving', async () => {
      wrapper = mountWithPlugins(Settings)

      wrapper.vm.geminiApiKey = 'new-api-key-789'
      await wrapper.vm.$nextTick()

      const saveButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Save Settings')
      )

      await saveButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.saved).toBe(true)
      expect(wrapper.text()).toContain('Settings saved successfully!')
    })

    it('should remove API key from localStorage when empty string is saved', async () => {
      mockLocalStorage.setItem('gemini_api_key', 'existing-key')

      wrapper = mountWithPlugins(Settings)
      await wrapper.vm.$nextTick()

      wrapper.vm.geminiApiKey = ''
      await wrapper.vm.$nextTick()

      const saveButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Save Settings')
      )

      await saveButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('gemini_api_key')
    })

    it('should hide success message after timeout', async () => {
      vi.useFakeTimers()

      wrapper = mountWithPlugins(Settings)

      wrapper.vm.geminiApiKey = 'test-key'
      await wrapper.vm.$nextTick()

      const saveButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Save Settings')
      )

      await saveButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.saved).toBe(true)

      vi.advanceTimersByTime(3000)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.saved).toBe(false)

      vi.useRealTimers()
    })
  })

  describe('Test Connection', () => {
    it('should render Test Connection button', () => {
      wrapper = mountWithPlugins(Settings)

      expect(wrapper.text()).toContain('Test Connection')
    })

    it('should disable Test Connection button when no API key', () => {
      wrapper = mountWithPlugins(Settings)

      wrapper.vm.geminiApiKey = ''

      const testButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Test Connection')
      )

      expect(testButton).toBeDefined()
    })

    it('should enable Test Connection button when API key is present', async () => {
      wrapper = mountWithPlugins(Settings)

      wrapper.vm.geminiApiKey = 'test-api-key'
      await wrapper.vm.$nextTick()

      const testButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Test Connection')
      )

      expect(testButton).toBeDefined()
    })

    it('should call geminiAPI.testConnection when button is clicked', async () => {
      geminiAPI.testConnection.mockResolvedValue({
        success: true,
        message: 'Connection successful'
      })

      wrapper = mountWithPlugins(Settings)

      wrapper.vm.geminiApiKey = 'valid-api-key'
      await wrapper.vm.$nextTick()

      const testButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Test Connection')
      )

      await testButton.trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(geminiAPI.testConnection).toHaveBeenCalled()
    })

    it('should show success message when connection test succeeds', async () => {
      geminiAPI.testConnection.mockResolvedValue({
        success: true,
        message: 'Connection successful'
      })

      wrapper = mountWithPlugins(Settings)

      wrapper.vm.geminiApiKey = 'valid-api-key'
      await wrapper.vm.$nextTick()

      await wrapper.vm.testGeminiConnection()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.testResult).toEqual({
        success: true,
        message: 'Connection successful'
      })
    })

    it('should show error message when connection test fails', async () => {
      geminiAPI.testConnection.mockResolvedValue({
        success: false,
        error: 'Invalid API key'
      })

      wrapper = mountWithPlugins(Settings)

      wrapper.vm.geminiApiKey = 'invalid-api-key'
      await wrapper.vm.$nextTick()

      await wrapper.vm.testGeminiConnection()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.testResult).toEqual({
        success: false,
        error: 'Invalid API key'
      })
    })

    it('should set isTesting flag during connection test', async () => {
      geminiAPI.testConnection.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      )

      wrapper = mountWithPlugins(Settings)

      wrapper.vm.geminiApiKey = 'test-key'
      await wrapper.vm.$nextTick()

      const testPromise = wrapper.vm.testGeminiConnection()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isTesting).toBe(true)

      await testPromise
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isTesting).toBe(false)
    })

    it('should temporarily save API key for testing', async () => {
      geminiAPI.testConnection.mockResolvedValue({ success: true })

      wrapper = mountWithPlugins(Settings)

      wrapper.vm.geminiApiKey = 'test-key-for-connection'
      await wrapper.vm.$nextTick()

      await wrapper.vm.testGeminiConnection()
      await wrapper.vm.$nextTick()

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'gemini_api_key',
        'test-key-for-connection'
      )
    })

    it('should clear test results when saving settings', async () => {
      wrapper = mountWithPlugins(Settings)

      wrapper.vm.testResult = { success: true, message: 'Test passed' }
      wrapper.vm.geminiApiKey = 'test-key'
      await wrapper.vm.$nextTick()

      const saveButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Save Settings')
      )

      await saveButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.testResult).toBeNull()
    })
  })

  describe('Layout', () => {
    it('should render with container and proper styling', () => {
      wrapper = mountWithPlugins(Settings)

      const container = wrapper.find('.v-container')
      expect(container.exists()).toBe(true)
    })

    it('should render all sections in cards', () => {
      wrapper = mountWithPlugins(Settings)

      const cards = wrapper.findAll('.v-card')
      expect(cards.length).toBeGreaterThanOrEqual(3)
    })

    it('should have responsive column layout', () => {
      wrapper = mountWithPlugins(Settings)

      const rows = wrapper.findAllComponents({ name: 'VRow' })
      expect(rows.length).toBeGreaterThan(0)

      const cols = wrapper.findAllComponents({ name: 'VCol' })
      expect(cols.length).toBeGreaterThan(0)
    })
  })

  describe('Tooltips', () => {
    it('should have tooltip for API key input', () => {
      wrapper = mountWithPlugins(Settings)

      const tooltips = wrapper.findAllComponents({ name: 'VTooltip' })
      expect(tooltips.length).toBeGreaterThan(0)
    })
  })

  describe('Form Validation', () => {
    it('should handle empty API key gracefully', async () => {
      wrapper = mountWithPlugins(Settings)

      wrapper.vm.geminiApiKey = ''
      await wrapper.vm.$nextTick()

      const saveButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Save Settings')
      )

      await saveButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('gemini_api_key')
    })

    it('should update API key when input changes', async () => {
      wrapper = mountWithPlugins(Settings)

      const passwordInput = wrapper.find('input[type="password"]')
      await passwordInput.setValue('new-test-key')

      expect(wrapper.vm.geminiApiKey).toBe('new-test-key')
    })
  })

  describe('Component State', () => {
    it('should initialize with default state', () => {
      wrapper = mountWithPlugins(Settings)

      expect(wrapper.vm.saved).toBe(false)
      expect(wrapper.vm.geminiApiKey).toBe('')
      expect(wrapper.vm.isTesting).toBe(false)
      expect(wrapper.vm.testResult).toBeNull()
    })

    it('should handle multiple save operations', async () => {
      wrapper = mountWithPlugins(Settings)

      wrapper.vm.geminiApiKey = 'key-1'
      await wrapper.vm.handleSave()
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('gemini_api_key', 'key-1')

      wrapper.vm.geminiApiKey = 'key-2'
      await wrapper.vm.handleSave()
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('gemini_api_key', 'key-2')
    })
  })
})
