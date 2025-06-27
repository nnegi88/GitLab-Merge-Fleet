/**
 * Route Template for Lazy-Loaded Routes
 * 
 * This template ensures consistency when adding new routes to the application.
 * All routes using lazyLoadRoute should follow this pattern.
 * 
 * IMPORTANT: Always include meta.title for proper loading/error messages
 */

import { lazyLoadRoute } from './router'

// Example route template - copy and modify for new routes
export const routeTemplate = {
  path: '/your-path',
  name: 'your-route-name',
  meta: { 
    title: 'Your Page Title'  // REQUIRED: Used in loading and error components
  },
  ...lazyLoadRoute('pages/YourComponent.vue')
}

// Example with route parameters
export const routeWithParamsTemplate = {
  path: '/your-path/:id',
  name: 'your-route-with-params',
  meta: { 
    title: 'Your Page Title'
  },
  ...lazyLoadRoute('pages/YourComponent.vue')
}

// Example with custom timing for heavy components
export const heavyRouteTemplate = {
  path: '/heavy-component',
  name: 'heavy-component',
  meta: { 
    title: 'Heavy Component'
  },
  ...lazyLoadRoute('pages/HeavyComponent.vue', {
    delay: 500,    // Show loading after 500ms instead of 200ms
    timeout: 60000 // Allow 60 seconds for very large components
  })
}

/**
 * Future Chunking Strategy Notes:
 * 
 * As the application grows, consider creating additional manual chunks:
 * 
 * 1. 'charts' - If adding charting libraries (e.g., Chart.js, D3)
 * 2. 'editor' - If adding code/text editors (e.g., Monaco, CodeMirror)
 * 3. 'utils' - If utility libraries grow large (e.g., lodash, date-fns)
 * 4. 'ai' - If AI/ML libraries are added beyond current Gemini integration
 * 
 * Monitor chunk sizes with: npm run build
 * Target: Keep all chunks under 500KB for optimal performance
 */