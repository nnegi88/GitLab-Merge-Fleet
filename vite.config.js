import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vuetify({
      autoImport: true,
    }),
  ],
  base: '/GitLab-Merge-Fleet/',
  publicDir: 'public',
  server: {
    port: 4000,
    host: true,
    strictPort: false,
    open: false
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': [
            'vue',
            'vue-router',
            'pinia',
            '@tanstack/vue-query'
          ],
          'vuetify': [
            'vuetify'
          ]
        }
      }
    },
    // Set warning limit to 500KB to align with our optimization goal of keeping
    // all chunks under 500KB. This helps maintain fast load times on slower networks
    // and ensures we're alerted if any chunk grows beyond our target size.
    // 
    // MONITORING: Continue to track bundle sizes as new features are added.
    // Run 'npm run build' regularly during development to catch size regressions early.
    // Consider using bundlesize or similar tools in CI to enforce limits automatically.
    chunkSizeWarningLimit: 500
  }
})