import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  // Ignore files
  {
    ignores: ['dist/**', 'node_modules/**', '.eslintrc.cjs', 'coverage/**']
  },
  // Base config for all files
  js.configs.recommended,
  // Vue config
  ...vue.configs['flat/essential'],
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      // Untrusted HTML goes through <MarkdownContent>, the one sanctioned v-html
      'vue/no-v-html': 'error',
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  },
  // MarkdownContent is the one sanctioned v-html: it renders through the sanitizing renderer.
  // Disabled here rather than with a template comment, which would make the component a
  // fragment in dev builds and drop the class a page passes to it.
  {
    files: ['src/components/MarkdownContent.vue'],
    rules: {
      'vue/no-v-html': 'off'
    }
  },
  // Node.js config for the server and tool config files
  {
    files: ['server.cjs', '*.config.js'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  // The production server logs requests to stdout
  {
    files: ['server.cjs'],
    rules: {
      'no-console': 'off'
    }
  },
  // E2E specs use the shared test, which fails a test on any Content-Security-Policy violation
  {
    files: ['tests/e2e/**/*.spec.js'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: '@playwright/test',
          message: "Import test and expect from './helpers/test.js', which fails a test on any CSP violation."
        }]
      }]
    }
  },
  // Tests run in Node with Vitest's globals enabled (test.globals in vitest.config.js)
  {
    files: ['tests/**'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest
      }
    }
  }
]