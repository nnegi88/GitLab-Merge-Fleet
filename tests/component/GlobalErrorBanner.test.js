import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountWithPlugins } from '../utils/testHelpers.js'
import GlobalErrorBanner from '../../src/components/GlobalErrorBanner.vue'

describe('GlobalErrorBanner.vue', () => {
  let wrapper

  beforeEach(() => {
    wrapper = null
    // Mock window.location.reload
    delete window.location
    window.location = { reload: vi.fn() }
  })

  describe('Initial State', () => {
    it('should not be visible initially', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const snackbar = wrapper.findComponent({ name: 'VSnackbar' })
      expect(snackbar.exists()).toBe(true)
      expect(snackbar.props('modelValue')).toBe(false)
    })

    it('should render with correct color and variant', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const snackbar = wrapper.findComponent({ name: 'VSnackbar' })
      expect(snackbar.props('color')).toBe('error')
      expect(snackbar.props('variant')).toBe('elevated')
    })

    it('should render at top location', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const snackbar = wrapper.findComponent({ name: 'VSnackbar' })
      expect(snackbar.props('location')).toBe('top')
    })

    it('should have infinite timeout', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const snackbar = wrapper.findComponent({ name: 'VSnackbar' })
      expect(snackbar.props('timeout')).toBe(-1)
    })

    it('should be multi-line', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const snackbar = wrapper.findComponent({ name: 'VSnackbar' })
      expect(snackbar.props('multiLine')).toBe(true)
    })
  })

  describe('Content', () => {
    it('should render error title', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      expect(wrapper.text()).toContain('Application Error')
    })

    it('should render error message', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      expect(wrapper.text()).toContain('Failed to load required resources')
    })

    it('should render alert icon', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const icon = wrapper.findComponent({ name: 'VIcon' })
      expect(icon.exists()).toBe(true)
    })
  })

  describe('Buttons', () => {
    it('should render Reload button', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      expect(wrapper.text()).toContain('Reload')
    })

    it('should render Dismiss button', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      expect(wrapper.text()).toContain('Dismiss')
    })

    it('should render buttons with correct variant', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      expect(buttons.length).toBe(2)
      buttons.forEach(button => {
        expect(button.props('variant')).toBe('text')
      })
    })

    it('should render buttons with correct color', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      expect(buttons.length).toBe(2)
      buttons.forEach(button => {
        expect(button.props('color')).toBe('white')
      })
    })

    it('should render buttons with correct size', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      expect(buttons.length).toBe(2)
      buttons.forEach(button => {
        expect(button.props('size')).toBe('small')
      })
    })
  })

  describe('showError Method', () => {
    it('should expose showError method', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      expect(wrapper.vm.showError).toBeDefined()
      expect(typeof wrapper.vm.showError).toBe('function')
    })

    it('should make banner visible when showError is called', async () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const snackbar = wrapper.findComponent({ name: 'VSnackbar' })
      expect(snackbar.props('modelValue')).toBe(false)

      wrapper.vm.showError()
      await wrapper.vm.$nextTick()

      expect(snackbar.props('modelValue')).toBe(true)
    })

    it('should display content when error is shown', async () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      wrapper.vm.showError()
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Application Error')
      expect(wrapper.text()).toContain('Failed to load required resources')
    })
  })

  describe('Dismiss Functionality', () => {
    it('should hide banner when Dismiss button is clicked', async () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      // Show the banner first
      wrapper.vm.showError()
      await wrapper.vm.$nextTick()

      const snackbar = wrapper.findComponent({ name: 'VSnackbar' })
      expect(snackbar.props('modelValue')).toBe(true)

      // Find and click the Dismiss button
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const dismissButton = buttons.find(btn => btn.text().includes('Dismiss'))
      expect(dismissButton).toBeDefined()

      await dismissButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(snackbar.props('modelValue')).toBe(false)
    })

    it('should toggle banner visibility multiple times', async () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const snackbar = wrapper.findComponent({ name: 'VSnackbar' })

      // Show
      wrapper.vm.showError()
      await wrapper.vm.$nextTick()
      expect(snackbar.props('modelValue')).toBe(true)

      // Dismiss
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const dismissButton = buttons.find(btn => btn.text().includes('Dismiss'))
      await dismissButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect(snackbar.props('modelValue')).toBe(false)

      // Show again
      wrapper.vm.showError()
      await wrapper.vm.$nextTick()
      expect(snackbar.props('modelValue')).toBe(true)
    })
  })

  describe('Reload Functionality', () => {
    it('should call window.location.reload when Reload button is clicked', async () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      // Show the banner first
      wrapper.vm.showError()
      await wrapper.vm.$nextTick()

      // Find and click the Reload button
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const reloadButton = buttons.find(btn => btn.text().includes('Reload'))
      expect(reloadButton).toBeDefined()

      await reloadButton.trigger('click')

      expect(window.location.reload).toHaveBeenCalled()
      expect(window.location.reload).toHaveBeenCalledTimes(1)
    })

    it('should reload page when Reload is clicked multiple times', async () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      wrapper.vm.showError()
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const reloadButton = buttons.find(btn => btn.text().includes('Reload'))

      await reloadButton.trigger('click')
      await reloadButton.trigger('click')

      expect(window.location.reload).toHaveBeenCalledTimes(2)
    })
  })

  describe('Layout', () => {
    it('should render content in flex container', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const flexContainer = wrapper.find('.d-flex')
      expect(flexContainer.exists()).toBe(true)
      expect(flexContainer.classes()).toContain('align-center')
    })

    it('should render title with correct styling', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const title = wrapper.find('.font-weight-medium')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBe('Application Error')
    })

    it('should render message with correct styling', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const message = wrapper.find('.text-body-2')
      expect(message.exists()).toBe(true)
      expect(message.text()).toBe('Failed to load required resources')
      expect(message.classes()).toContain('mt-1')
    })
  })

  describe('Integration', () => {
    it('should work with typical error scenario', async () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      // Initial state - not visible
      const snackbar = wrapper.findComponent({ name: 'VSnackbar' })
      expect(snackbar.props('modelValue')).toBe(false)

      // Error occurs - banner shows
      wrapper.vm.showError()
      await wrapper.vm.$nextTick()
      expect(snackbar.props('modelValue')).toBe(true)
      expect(wrapper.text()).toContain('Application Error')

      // User chooses to dismiss
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const dismissButton = buttons.find(btn => btn.text().includes('Dismiss'))
      await dismissButton.trigger('click')
      await wrapper.vm.$nextTick()
      expect(snackbar.props('modelValue')).toBe(false)
    })

    it('should work when user chooses to reload', async () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      // Error occurs
      wrapper.vm.showError()
      await wrapper.vm.$nextTick()

      // User chooses to reload
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const reloadButton = buttons.find(btn => btn.text().includes('Reload'))
      await reloadButton.trigger('click')

      expect(window.location.reload).toHaveBeenCalled()
    })
  })

  describe('Vuetify Components', () => {
    it('should use VSnackbar component', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const snackbar = wrapper.findComponent({ name: 'VSnackbar' })
      expect(snackbar.exists()).toBe(true)
    })

    it('should use VIcon component', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const icon = wrapper.findComponent({ name: 'VIcon' })
      expect(icon.exists()).toBe(true)
    })

    it('should use VBtn components', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      expect(buttons.length).toBe(2)
    })

    it('should use actions slot for buttons', () => {
      wrapper = mountWithPlugins(GlobalErrorBanner)

      const snackbar = wrapper.findComponent({ name: 'VSnackbar' })
      expect(snackbar.exists()).toBe(true)

      // Buttons should be in the actions slot
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      expect(buttons.length).toBe(2)
    })
  })
})
