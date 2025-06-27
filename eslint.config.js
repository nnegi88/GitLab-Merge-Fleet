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
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  },
  // Node.js config for server files
  {
    files: ['server.cjs', 'vite.config.js'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  }
]