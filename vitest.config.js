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
      // Count every source file, not just the ones a test imports, so an untested
      // file still drags the percentage down (Vitest 4 dropped `coverage.all`).
      include: ['src/**/*.{js,vue}'],
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
      // 90% overall and for every area, on all four metrics. The overall figure counts
      // every file, so the per-area globs stop one area's drop hiding in the average.
      // Raise these deliberately; lower one only with a reason in the PR (see TESTING.md).
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
        'src/services/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'src/utils/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'src/api/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'src/stores/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'src/hooks/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'src/components/**': { statements: 90, branches: 90, functions: 90, lines: 90 }
      }
    },

    // Test timeout (30 seconds)
    testTimeout: 30000,

    // Hook timeout
    hookTimeout: 30000
  }
})
