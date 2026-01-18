import RouteLoading from '../components/RouteLoading.vue'
import RouteError from '../components/RouteError.vue'

// Default timing configuration for lazy-loaded routes
const DEFAULT_ROUTE_CONFIG = {
  // Delay before showing loading component (prevents flash for fast loads)
  delay: 200,
  // Timeout before showing error component (adjust based on typical network conditions)
  timeout: 30000
}

/**
 * Creates a lazy-loaded route configuration with loading and error states
 * @param {string} componentPath - Path to the component relative to src/ directory
 * @param {Object} options - Optional configuration overrides
 * @param {number} options.delay - Milliseconds before showing loading component
 * @param {number} options.timeout - Milliseconds before showing error component
 * @returns {Object} Route configuration object for Vue Router
 * 
 * @example
 * // Basic usage in route definition
 * {
 *   path: '/dashboard',
 *   name: 'dashboard',
 *   meta: { title: 'Dashboard' },
 *   ...lazyLoadRoute('pages/Dashboard.vue')
 * }
 * 
 * @example
 * // With custom timing options
 * {
 *   path: '/heavy-page',
 *   name: 'heavy',
 *   meta: { title: 'Heavy Page' },
 *   ...lazyLoadRoute('pages/HeavyPage.vue', { delay: 500, timeout: 60000 })
 * }
 */
export const lazyLoadRoute = (componentPath, options = {}) => {
  const config = { ...DEFAULT_ROUTE_CONFIG, ...options }
  
  // Create a map of known routes to avoid dynamic string interpolation
  // This satisfies Vite's requirement for static imports
  const componentMap = {
    'pages/Dashboard.vue': () => import('../pages/Dashboard.vue'),
    'pages/Setup.vue': () => import('../pages/Setup.vue'),
    'pages/Settings.vue': () => import('../pages/Settings.vue'),
    'pages/BulkCreate.vue': () => import('../pages/BulkCreate.vue'),
    'pages/BulkBranch.vue': () => import('../pages/BulkBranch.vue'),
    'pages/BatchApprovalMerge.vue': () => import('../pages/BatchApprovalMerge.vue'),
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
    component: componentMap[componentPath],
    loadingComponent: RouteLoading,
    errorComponent: RouteError,
    delay: config.delay,
    timeout: config.timeout
  }
}

// Export default config for reference and potential runtime adjustments
export { DEFAULT_ROUTE_CONFIG }