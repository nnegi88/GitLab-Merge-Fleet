/**
 * Test helper utilities for Vue component and unit testing
 */

import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

/**
 * Create a mock router for testing
 * @param {Object} options - Router configuration options
 * @param {Array} options.routes - Array of route definitions
 * @param {String} options.initialRoute - Initial route path
 * @returns {Router} Mock router instance
 */
export function createMockRouter(options = {}) {
  const { routes = [], initialRoute = '/' } = options

  const defaultRoutes = [
    { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
    { path: '/settings', name: 'settings', component: { template: '<div>Settings</div>' } },
    { path: '/mr/:projectId/:mrIid', name: 'merge-request-details', component: { template: '<div>MR Details</div>' } },
    ...routes
  ]

  const router = createRouter({
    history: createMemoryHistory(),
    routes: defaultRoutes
  })

  router.push(initialRoute)

  return router
}

/**
 * Create a mock Pinia store for testing
 * @returns {Pinia} Pinia instance
 */
export function createMockPinia() {
  return createPinia()
}

/**
 * Create a mock Vuetify instance for testing
 * @returns {Vuetify} Vuetify instance
 */
export function createMockVuetify() {
  return createVuetify({
    components,
    directives,
  })
}

/**
 * Create a mock Vue Query client for testing
 * @returns {Object} Vue Query plugin configuration
 */
export function getMockVueQueryPlugin() {
  return {
    plugin: VueQueryPlugin,
    options: {
      queryClientConfig: {
        defaultOptions: {
          queries: {
            retry: false,
            cacheTime: 0,
            staleTime: 0,
          },
          mutations: {
            retry: false,
          },
        },
      },
    },
  }
}

/**
 * Mount a Vue component with common test plugins and options
 * @param {Component} component - Vue component to mount
 * @param {Object} options - Mount options
 * @param {Boolean} options.withRouter - Include router plugin (default: true)
 * @param {Boolean} options.withPinia - Include Pinia plugin (default: true)
 * @param {Boolean} options.withVuetify - Include Vuetify plugin (default: true)
 * @param {Boolean} options.withVueQuery - Include Vue Query plugin (default: false)
 * @param {Object} options.router - Custom router instance
 * @param {Object} options.pinia - Custom Pinia instance
 * @param {Object} options.vuetify - Custom Vuetify instance
 * @param {Object} options.initialRoute - Initial route for router
 * @returns {Wrapper} Component wrapper
 */
export function mountWithPlugins(component, options = {}) {
  const {
    withRouter = true,
    withPinia = true,
    withVuetify = true,
    withVueQuery = false,
    router = null,
    pinia = null,
    vuetify = null,
    initialRoute = '/',
    ...mountOptions
  } = options

  const plugins = []

  // Add router
  if (withRouter) {
    plugins.push(router || createMockRouter({ initialRoute }))
  }

  // Add Pinia
  if (withPinia) {
    plugins.push(pinia || createMockPinia())
  }

  // Add Vuetify
  if (withVuetify) {
    plugins.push(vuetify || createMockVuetify())
  }

  // Add Vue Query
  if (withVueQuery) {
    const { plugin, options: vueQueryOptions } = getMockVueQueryPlugin()
    plugins.push([plugin, vueQueryOptions])
  }

  return mount(component, {
    global: {
      plugins,
      ...mountOptions.global,
    },
    ...mountOptions,
  })
}

/**
 * Wait for async operations to complete
 * Useful for waiting for Vue's reactivity system and async updates
 * @param {Number} ms - Milliseconds to wait (default: 0)
 * @returns {Promise}
 */
export function waitFor(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Flush all pending promises
 * Useful for waiting for all pending promises to resolve in tests
 * @returns {Promise}
 */
export async function flushPromises() {
  return new Promise(resolve => setImmediate(resolve))
}

/**
 * Create a mock axios instance for API testing
 * @returns {Object} Mock axios instance
 */
export function createMockAxios() {
  return {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    request: vi.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  }
}

/**
 * Create mock localStorage with initial data
 * @param {Object} initialData - Initial data to populate localStorage
 * @returns {Object} Mock localStorage instance
 */
export function createMockLocalStorage(initialData = {}) {
  const store = { ...initialData }

  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
  }
}

/**
 * Create a mock GitLab API client
 * @param {Object} overrides - Override default mock implementations
 * @returns {Object} Mock GitLab client
 */
export function createMockGitLabClient(overrides = {}) {
  return {
    getProjects: vi.fn(() => Promise.resolve([])),
    getProject: vi.fn(() => Promise.resolve({})),
    getMergeRequests: vi.fn(() => Promise.resolve([])),
    getMergeRequest: vi.fn(() => Promise.resolve({})),
    getMergeRequestChanges: vi.fn(() => Promise.resolve({})),
    createMergeRequest: vi.fn(() => Promise.resolve({})),
    updateMergeRequest: vi.fn(() => Promise.resolve({})),
    getBranches: vi.fn(() => Promise.resolve([])),
    getUser: vi.fn(() => Promise.resolve({})),
    ...overrides,
  }
}

/**
 * Mock clipboard API for testing
 * @returns {Object} Mock clipboard object
 */
export function createMockClipboard() {
  return {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('')),
  }
}
