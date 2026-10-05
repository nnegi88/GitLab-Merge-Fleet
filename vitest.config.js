import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { resolve } from 'path'
import process from 'node:process'

// Run tests in UTC so date formatting is the same on every machine and in CI.
// Set here, before workers start, so every worker inherits it.
process.env.TZ = 'UTC'

// https://vitest.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vuetify({
      autoImport: true,
      styles: false
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  test: {
    // Use jsdom environment for DOM testing
    environment: 'jsdom',

    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

    // Server options for dependency handling
    server: {
      deps: {
        inline: ['vuetify']
      }
    },

    // Test file patterns
    include: [
      'tests/**/*.test.js',
      'tests/**/*.spec.js'
    ],

    // Files to exclude from test runs
    exclude: [
      'node_modules',
      'dist',
      '.auto-claude',
      'tests/e2e/**'
    ],

    // Setup files to run before tests
    setupFiles: ['./tests/setup.js'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      exclude: [
        'node_modules',
        'dist',
        '.auto-claude',
        'tests',
        '**/*.config.js',
        '**/mockData/**',
        '**/*.spec.js',
        '**/*.test.js',
        // Pages are covered end to end by the Playwright suite, not by unit coverage
        'src/pages/**',
        // App bootstrap: wiring with no logic of its own
        'src/main.js',
        'src/App.vue',
        'src/plugins/**',
        'server.cjs'
      ],
      // 70% overall (every counted file, including those under the globs below),
      // 80% for logic-heavy areas and 70% for components
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
        'src/services/**': { statements: 80, branches: 80, functions: 80, lines: 80 },
        'src/utils/**': { statements: 80, branches: 80, functions: 80, lines: 80 },
        'src/api/**': { statements: 80, branches: 80, functions: 80, lines: 80 },
        'src/stores/**': { statements: 80, branches: 80, functions: 80, lines: 80 },
        'src/hooks/**': { statements: 80, branches: 80, functions: 80, lines: 80 },
        'src/components/**': { statements: 70, branches: 70, functions: 70, lines: 70 }
      }
    },

    // Test timeout (30 seconds)
    testTimeout: 30000,

    // Hook timeout
    hookTimeout: 30000
  }
})
