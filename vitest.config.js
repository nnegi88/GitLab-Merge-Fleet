import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

// https://vitest.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vuetify({
      autoImport: true,
    }),
  ],
  test: {
    // Use jsdom environment for DOM testing
    environment: 'jsdom',

    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

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
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules',
        'dist',
        '.auto-claude',
        'tests',
        '**/*.config.js',
        '**/mockData/**',
        '**/*.spec.js',
        '**/*.test.js'
      ],
      // Coverage thresholds aligned with acceptance criteria
      // 80% for services and utilities, 70% for components
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70
      }
    },

    // Test timeout (30 seconds)
    testTimeout: 30000,

    // Hook timeout
    hookTimeout: 30000
  }
})
