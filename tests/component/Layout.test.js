import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountWithPlugins } from '../utils/testHelpers.js'
import Layout from '../../src/components/Layout.vue'
import { useAuthStore } from '../../src/stores/authStore'

describe('Layout.vue', () => {
  let wrapper
  let authStore
  let mockRouter

  beforeEach(() => {
    wrapper = null
    authStore = null
    mockRouter = null
  })

  describe('Initial Rendering', () => {
    it('should render app bar', () => {
      wrapper = mountWithPlugins(Layout)

      const appBar = wrapper.findComponent({ name: 'VAppBar' })
      expect(appBar.exists()).toBe(true)
    })

    it('should render app bar with correct elevation', () => {
      wrapper = mountWithPlugins(Layout)

      const appBar = wrapper.findComponent({ name: 'VAppBar' })
      expect(appBar.props('elevation')).toBe('1')
    })

    it('should render app bar with white background', () => {
      wrapper = mountWithPlugins(Layout)

      const appBar = wrapper.findComponent({ name: 'VAppBar' })
      expect(appBar.props('color')).toBe('white')
    })

    it('should render main content area', () => {
      wrapper = mountWithPlugins(Layout)

      const main = wrapper.findComponent({ name: 'VMain' })
      expect(main.exists()).toBe(true)
    })

    it('should render container in main area', () => {
      wrapper = mountWithPlugins(Layout)

      const containers = wrapper.findAllComponents({ name: 'VContainer' })
      expect(containers.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Home Button', () => {
    it('should render home button', () => {
      wrapper = mountWithPlugins(Layout)

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const homeButton = buttons.find(btn => btn.text().includes('GitLab Merge Fleet'))
      expect(homeButton).toBeDefined()
    })

    it('should have correct text', () => {
      wrapper = mountWithPlugins(Layout)

      expect(wrapper.text()).toContain('GitLab Merge Fleet')
    })

    it('should have source branch icon', () => {
      wrapper = mountWithPlugins(Layout)

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const homeButton = buttons.find(btn => btn.text().includes('GitLab Merge Fleet'))
      expect(homeButton.props('prependIcon')).toBe('mdi-source-branch')
    })

    it('should navigate to home route', () => {
      wrapper = mountWithPlugins(Layout)

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const homeButton = buttons.find(btn => btn.text().includes('GitLab Merge Fleet'))
      expect(homeButton.props('to')).toBe('/')
    })

    it('should use text variant', () => {
      wrapper = mountWithPlugins(Layout)

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const homeButton = buttons.find(btn => btn.text().includes('GitLab Merge Fleet'))
      expect(homeButton.props('variant')).toBe('text')
    })

    it('should have text-none class', () => {
      wrapper = mountWithPlugins(Layout)

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const homeButton = buttons.find(btn => btn.text().includes('GitLab Merge Fleet'))
      expect(homeButton.classes()).toContain('text-none')
    })
  })

  describe('Unauthenticated State', () => {
    it('should not show user chip when not authenticated', () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = null

      const chip = wrapper.findComponent({ name: 'VChip' })
      expect(chip.exists()).toBe(false)
    })

    it('should not show settings button when not authenticated', () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = null

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const settingsButton = buttons.find(btn => btn.props('icon') === 'mdi-cog')
      expect(settingsButton).toBeUndefined()
    })

    it('should not show logout button when not authenticated', () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = null

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const logoutButton = buttons.find(btn => btn.props('icon') === 'mdi-logout')
      expect(logoutButton).toBeUndefined()
    })
  })

  describe('Authenticated State', () => {
    it('should show user chip when authenticated', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'
      authStore.user = { name: 'Test User', username: 'testuser' }

      await wrapper.vm.$nextTick()

      const chip = wrapper.findComponent({ name: 'VChip' })
      expect(chip.exists()).toBe(true)
    })

    it('should show settings button when authenticated', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const settingsButton = buttons.find(btn => btn.props('icon') === 'mdi-cog')
      expect(settingsButton).toBeDefined()
    })

    it('should show logout button when authenticated', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const logoutButton = buttons.find(btn => btn.props('icon') === 'mdi-logout')
      expect(logoutButton).toBeDefined()
    })
  })

  describe('User Chip', () => {
    it('should display user name when available', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'
      authStore.user = { name: 'John Doe', username: 'johndoe' }

      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('John Doe')
    })

    it('should display username when name is not available', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'
      authStore.user = { username: 'johndoe' }

      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('johndoe')
    })

    it('should have account icon', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'
      authStore.user = { name: 'Test User', username: 'testuser' }

      await wrapper.vm.$nextTick()

      const chip = wrapper.findComponent({ name: 'VChip' })
      expect(chip.props('prependIcon')).toBe('mdi-account')
    })

    it('should have outlined variant', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'
      authStore.user = { name: 'Test User', username: 'testuser' }

      await wrapper.vm.$nextTick()

      const chip = wrapper.findComponent({ name: 'VChip' })
      expect(chip.props('variant')).toBe('outlined')
    })

    it('should not render when user is null but token exists', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'
      authStore.user = null

      await wrapper.vm.$nextTick()

      const chip = wrapper.findComponent({ name: 'VChip' })
      expect(chip.exists()).toBe(false)
    })
  })

  describe('Settings Button', () => {
    it('should have settings icon', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const settingsButton = buttons.find(btn => btn.props('icon') === 'mdi-cog')
      expect(settingsButton).toBeDefined()
      expect(settingsButton.props('icon')).toBe('mdi-cog')
    })

    it('should navigate to settings page', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const settingsButton = buttons.find(btn => btn.props('icon') === 'mdi-cog')
      expect(settingsButton.props('to')).toBe('/settings')
    })

    it('should use text variant', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const settingsButton = buttons.find(btn => btn.props('icon') === 'mdi-cog')
      expect(settingsButton.props('variant')).toBe('text')
    })

    it('should have primary color when on settings page', async () => {
      wrapper = mountWithPlugins(Layout, {
        initialRoute: '/settings'
      })
      authStore = useAuthStore()
      authStore.token = 'test-token'

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const settingsButton = buttons.find(btn => btn.props('icon') === 'mdi-cog')
      expect(settingsButton.props('color')).toBe('primary')
    })

    it('should have default color when not on settings page', async () => {
      wrapper = mountWithPlugins(Layout, {
        initialRoute: '/'
      })
      authStore = useAuthStore()
      authStore.token = 'test-token'

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const settingsButton = buttons.find(btn => btn.props('icon') === 'mdi-cog')
      expect(settingsButton.props('color')).toBe('default')
    })
  })

  describe('Logout Button', () => {
    it('should have logout icon', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const logoutButton = buttons.find(btn => btn.props('icon') === 'mdi-logout')
      expect(logoutButton).toBeDefined()
      expect(logoutButton.props('icon')).toBe('mdi-logout')
    })

    it('should use text variant', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const logoutButton = buttons.find(btn => btn.props('icon') === 'mdi-logout')
      expect(logoutButton.props('variant')).toBe('text')
    })

    it('should have title attribute', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const logoutButton = buttons.find(btn => btn.props('icon') === 'mdi-logout')
      expect(logoutButton.attributes('title')).toBe('Logout')
    })
  })

  describe('Logout Functionality', () => {
    it('should call clearToken when logout button is clicked', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'
      authStore.clearToken = vi.fn()

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const logoutButton = buttons.find(btn => btn.props('icon') === 'mdi-logout')

      await logoutButton.trigger('click')

      expect(authStore.clearToken).toHaveBeenCalled()
      expect(authStore.clearToken).toHaveBeenCalledTimes(1)
    })

    it('should navigate to setup page when logout button is clicked', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'

      const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const logoutButton = buttons.find(btn => btn.props('icon') === 'mdi-logout')

      await logoutButton.trigger('click')

      expect(pushSpy).toHaveBeenCalledWith('/setup')
    })

    it('should handle logout flow correctly', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'
      authStore.clearToken = vi.fn()

      const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const logoutButton = buttons.find(btn => btn.props('icon') === 'mdi-logout')

      await logoutButton.trigger('click')

      expect(authStore.clearToken).toHaveBeenCalled()
      expect(pushSpy).toHaveBeenCalledWith('/setup')
    })
  })

  describe('Slot Content', () => {
    it('should render slot content', () => {
      wrapper = mountWithPlugins(Layout, {
        slots: {
          default: '<div class="test-slot">Test Content</div>'
        }
      })

      expect(wrapper.html()).toContain('Test Content')
      expect(wrapper.find('.test-slot').exists()).toBe(true)
    })

    it('should render slot content in main area', () => {
      wrapper = mountWithPlugins(Layout, {
        slots: {
          default: '<div class="test-content">Slot Content</div>'
        }
      })

      const main = wrapper.findComponent({ name: 'VMain' })
      expect(main.html()).toContain('Slot Content')
    })

    it('should support multiple slot elements', () => {
      wrapper = mountWithPlugins(Layout, {
        slots: {
          default: '<div>First</div><div>Second</div><div>Third</div>'
        }
      })

      expect(wrapper.text()).toContain('First')
      expect(wrapper.text()).toContain('Second')
      expect(wrapper.text()).toContain('Third')
    })
  })

  describe('Layout Structure', () => {
    it('should have app bar at the top', () => {
      wrapper = mountWithPlugins(Layout)

      const appBar = wrapper.findComponent({ name: 'VAppBar' })
      const main = wrapper.findComponent({ name: 'VMain' })

      expect(appBar.exists()).toBe(true)
      expect(main.exists()).toBe(true)
    })

    it('should have container in app bar', () => {
      wrapper = mountWithPlugins(Layout)

      const appBar = wrapper.findComponent({ name: 'VAppBar' })
      const containers = appBar.findAllComponents({ name: 'VContainer' })

      expect(containers.length).toBeGreaterThanOrEqual(1)
    })

    it('should have flex layout in app bar container', () => {
      wrapper = mountWithPlugins(Layout)

      const container = wrapper.findAll('.d-flex')
      expect(container.length).toBeGreaterThan(0)
    })

    it('should have container in main area', () => {
      wrapper = mountWithPlugins(Layout)

      const main = wrapper.findComponent({ name: 'VMain' })
      const containers = main.findAllComponents({ name: 'VContainer' })

      expect(containers.length).toBeGreaterThanOrEqual(1)
    })

    it('should have mt-8 class on main container', () => {
      wrapper = mountWithPlugins(Layout)

      const main = wrapper.findComponent({ name: 'VMain' })
      const container = main.findComponent({ name: 'VContainer' })

      expect(container.classes()).toContain('mt-8')
    })
  })

  describe('Vuetify Components', () => {
    it('should use VAppBar component', () => {
      wrapper = mountWithPlugins(Layout)

      const appBar = wrapper.findComponent({ name: 'VAppBar' })
      expect(appBar.exists()).toBe(true)
    })

    it('should use VMain component', () => {
      wrapper = mountWithPlugins(Layout)

      const main = wrapper.findComponent({ name: 'VMain' })
      expect(main.exists()).toBe(true)
    })

    it('should use VContainer components', () => {
      wrapper = mountWithPlugins(Layout)

      const containers = wrapper.findAllComponents({ name: 'VContainer' })
      expect(containers.length).toBeGreaterThanOrEqual(2)
    })

    it('should use VBtn components', () => {
      wrapper = mountWithPlugins(Layout)

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      expect(buttons.length).toBeGreaterThanOrEqual(1)
    })

    it('should use VChip component when authenticated with user', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'
      authStore.user = { name: 'Test User', username: 'testuser' }

      await wrapper.vm.$nextTick()

      const chip = wrapper.findComponent({ name: 'VChip' })
      expect(chip.exists()).toBe(true)
    })
  })

  describe('Integration', () => {
    it('should work with typical authenticated user flow', async () => {
      wrapper = mountWithPlugins(Layout, {
        slots: {
          default: '<div>Dashboard Content</div>'
        }
      })
      authStore = useAuthStore()
      authStore.token = 'test-token'
      authStore.user = { name: 'John Doe', username: 'johndoe' }

      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('GitLab Merge Fleet')
      expect(wrapper.text()).toContain('John Doe')
      expect(wrapper.text()).toContain('Dashboard Content')

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const settingsButton = buttons.find(btn => btn.props('icon') === 'mdi-cog')
      const logoutButton = buttons.find(btn => btn.props('icon') === 'mdi-logout')

      expect(settingsButton).toBeDefined()
      expect(logoutButton).toBeDefined()
    })

    it('should handle state transitions correctly', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()

      authStore.token = null
      await wrapper.vm.$nextTick()

      let chip = wrapper.findComponent({ name: 'VChip' })
      expect(chip.exists()).toBe(false)

      authStore.token = 'test-token'
      authStore.user = { name: 'Test User', username: 'testuser' }
      await wrapper.vm.$nextTick()

      chip = wrapper.findComponent({ name: 'VChip' })
      expect(chip.exists()).toBe(true)
    })

    it('should complete logout flow', async () => {
      wrapper = mountWithPlugins(Layout)
      authStore = useAuthStore()
      authStore.token = 'test-token'
      authStore.user = { name: 'Test User', username: 'testuser' }
      authStore.clearToken = vi.fn(() => {
        authStore.token = null
        authStore.user = null
      })

      const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')

      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Test User')

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const logoutButton = buttons.find(btn => btn.props('icon') === 'mdi-logout')

      await logoutButton.trigger('click')

      expect(authStore.clearToken).toHaveBeenCalled()
      expect(pushSpy).toHaveBeenCalledWith('/setup')
    })
  })

  describe('Responsive Design', () => {
    it('should use container for responsive layout', () => {
      wrapper = mountWithPlugins(Layout)

      const containers = wrapper.findAllComponents({ name: 'VContainer' })
      expect(containers.length).toBeGreaterThanOrEqual(2)
    })

    it('should have flex layout for header', () => {
      wrapper = mountWithPlugins(Layout)

      const flexContainers = wrapper.findAll('.d-flex')
      expect(flexContainers.length).toBeGreaterThan(0)
    })

    it('should have alignment classes', () => {
      wrapper = mountWithPlugins(Layout)

      const alignedElements = wrapper.findAll('.align-center')
      expect(alignedElements.length).toBeGreaterThan(0)
    })

    it('should have justify space between', () => {
      wrapper = mountWithPlugins(Layout)

      const justifiedElements = wrapper.findAll('.justify-space-between')
      expect(justifiedElements.length).toBeGreaterThan(0)
    })
  })
})
