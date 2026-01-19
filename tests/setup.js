/**
 * Global test setup file
 * Runs before all test suites
 */

// Mock localStorage
const localStorageMock = (() => {
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
})()

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
  global.sessionStorage = localStorageMock

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
}

// Vitest-specific setup (only runs when Vitest globals are available)
if (typeof beforeEach !== 'undefined') {
  beforeEach(() => {
    // Clear all mocks and localStorage before each test
    if (typeof vi !== 'undefined') {
      vi.clearAllMocks()
    }
    localStorageMock.clear()
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear()
    }
  })
}
