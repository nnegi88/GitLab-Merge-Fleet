/**
 * Global test setup file
 * Runs before all test suites
 */

import { enableAutoUnmount } from '@vue/test-utils'

// Mock Web Storage: separate instances for localStorage and sessionStorage, so tests can
// tell where something is kept (secrets go to sessionStorage unless remembered)
const createStorageMock = () => {
  let store = {}

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString()
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }
  }
}

const localStorageMock = createStorageMock()
const sessionStorageMock = createStorageMock()

// Create mock function factory
const createMockFn = (returnValue) => {
  const fn = (...args) => {
    fn.calls.push(args)
    return typeof returnValue === 'function' ? returnValue(...args) : returnValue
  }
  fn.calls = []
  fn.mockImplementation = (impl) => {
    returnValue = impl
    return fn
  }
  fn.mockReturnValue = (val) => {
    returnValue = val
    return fn
  }
  return fn
}

// Setup global mocks
if (typeof global !== 'undefined') {
  global.localStorage = localStorageMock
  global.sessionStorage = sessionStorageMock

  // Mock crypto API for auth store token encryption
  // Only mock if crypto doesn't exist or is not read-only
  if (!global.crypto) {
    global.crypto = {
      subtle: {
        generateKey: createMockFn(Promise.resolve('mock-key')),
        exportKey: createMockFn(Promise.resolve(new ArrayBuffer(32))),
        importKey: createMockFn(Promise.resolve('mock-imported-key')),
        encrypt: createMockFn(Promise.resolve(new ArrayBuffer(16))),
        decrypt: createMockFn(Promise.resolve(new ArrayBuffer(16)))
      },
      getRandomValues: createMockFn((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256)
        }
        return arr
      })
    }
  }

  // Mock window.matchMedia for Vuetify
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMockFn({
        matches: false,
        media: '',
        onchange: null,
        addListener: createMockFn(),
        removeListener: createMockFn(),
        addEventListener: createMockFn(),
        removeEventListener: createMockFn(),
        dispatchEvent: createMockFn(),
      }),
    })
  }

  // Mock IntersectionObserver for Vuetify components
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return []
    }
    unobserve() {}
  }

  // Mock ResizeObserver for Vuetify components
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  }

  // Mock visualViewport (missing in jsdom) for Vuetify overlay positioning (VSnackbar, VMenu, ...)
  if (!globalThis.visualViewport) {
    globalThis.visualViewport = {
      width: 1024,
      height: 768,
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: 0,
      pageTop: 0,
      scale: 1,
      addEventListener() {},
      removeEventListener() {}
    }
  }
}

// Vitest-specific setup (only runs when Vitest globals are available)
if (typeof beforeEach !== 'undefined') {
  beforeEach(() => {
    // Clear all mocks and localStorage before each test
    if (typeof vi !== 'undefined') {
      vi.clearAllMocks()
    }
    localStorageMock.clear()
    sessionStorageMock.clear()
  })
}

// Unmount every component a test mounted once the test ends. A component left
// mounted keeps re-rendering, and its router keeps navigating, after the test;
// anything either of them logs while Vitest closes the worker fails the run
// (EnvironmentTeardownError). Unmounting also cancels a pending navigation, so
// it can't finish after the DOM is gone and read the missing `history` global.
if (typeof afterEach !== 'undefined') {
  enableAutoUnmount(afterEach)
}
