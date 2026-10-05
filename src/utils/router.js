/**
 * Creates a lazy-loaded route component, so each page is split into its own chunk
 * @param {string} componentPath - Path to the component relative to src/ directory
 * @returns {Object} Route config to spread into a Vue Router route record
 *
 * To add a page: add it to componentMap below, then add a route in main.js
 * that spreads lazyLoadRoute('pages/YourPage.vue').
 *
 * @example
 * {
 *   path: '/dashboard',
 *   name: 'dashboard',
 *   meta: { title: 'Dashboard' },
 *   ...lazyLoadRoute('pages/Dashboard.vue')
 * }
 */
export const lazyLoadRoute = (componentPath) => {
  // Create a map of known routes to avoid dynamic string interpolation
  // This satisfies Vite's requirement for static imports
  const componentMap = {
    'pages/Dashboard.vue': () => import('../pages/Dashboard.vue'),
    'pages/Setup.vue': () => import('../pages/Setup.vue'),
    'pages/Settings.vue': () => import('../pages/Settings.vue'),
    'pages/BulkCreate.vue': () => import('../pages/BulkCreate.vue'),
    'pages/BulkBranch.vue': () => import('../pages/BulkBranch.vue'),
    'pages/MergeRequestDetails.vue': () => import('../pages/MergeRequestDetails.vue'),
    'pages/RepositoryReview.vue': () => import('../pages/RepositoryReview.vue'),
    'pages/RepositoryReviewResults.vue': () => import('../pages/RepositoryReviewResults.vue'),
    'pages/NotFound.vue': () => import('../pages/NotFound.vue')
  }

  if (!componentMap[componentPath]) {
    console.error(`Component path '${componentPath}' not found in component map`)
    throw new Error(`Unknown component path: ${componentPath}`)
  }

  return {
    component: componentMap[componentPath]
  }
}
