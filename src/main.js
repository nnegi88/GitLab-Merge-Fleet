import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import { VueQueryPlugin } from '@tanstack/vue-query'
import vuetify from './plugins/vuetify'
import App from './App.vue'
import { lazyLoadRoute } from './utils/router'
import './index.css'

const routes = [
  { 
    path: '/', 
    name: 'home',
    meta: { title: 'Dashboard' },
    ...lazyLoadRoute('pages/Dashboard.vue')
  },
  { 
    path: '/setup', 
    name: 'setup',
    meta: { title: 'Setup' },
    ...lazyLoadRoute('pages/Setup.vue')
  },
  { 
    path: '/settings', 
    name: 'settings',
    meta: { title: 'Settings' },
    ...lazyLoadRoute('pages/Settings.vue')
  },
  { 
    path: '/bulk-create', 
    name: 'bulk-create',
    meta: { title: 'Bulk Create' },
    ...lazyLoadRoute('pages/BulkCreate.vue')
  },
  { 
    path: '/bulk-branch', 
    name: 'bulk-branch',
    meta: { title: 'Bulk Branch' },
    ...lazyLoadRoute('pages/BulkBranch.vue')
  },
  { 
    path: '/mr/:projectId/:mrIid', 
    name: 'merge-request-details',
    meta: { title: 'Merge Request Details' },
    ...lazyLoadRoute('pages/MergeRequestDetails.vue')
  },
  { 
    path: '/repository-review', 
    name: 'repository-review',
    meta: { title: 'Repository Review' },
    ...lazyLoadRoute('pages/RepositoryReview.vue')
  },
  {
    path: '/repository-review/results',
    name: 'repository-review-results',
    meta: { title: 'Repository Review Results' },
    ...lazyLoadRoute('pages/RepositoryReviewResults.vue')
  },
  {
    path: '/batch-approval-merge',
    name: 'batch-approval-merge',
    meta: { title: 'Batch Approval Merge' },
    ...lazyLoadRoute('pages/BatchApprovalMerge.vue')
  },
  // IMPORTANT: This catch-all route must be placed last in the routes array
  // to ensure it only matches when no other routes match the current path
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    meta: { title: '404 - Page Not Found' },
    ...lazyLoadRoute('pages/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const pinia = createPinia()

// Global error handler for chunk loading failures - only logs errors
// The route-specific errorComponent handles user-facing error display
router.onError((error) => {
  if (error.message?.includes('Failed to fetch dynamically imported module')) {
    console.error('Router chunk loading error:', error)
    // The errorComponent defined in lazyLoadRoute will handle the UI
    // This just ensures the error is logged for debugging
  }
})

// Global handler for unhandled chunk loading errors
// Shows non-intrusive banner for any unhandled chunk load rejection
// The RouteError component handles route-specific errors, this is for edge cases
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Failed to fetch dynamically imported module') ||
      event.reason?.message?.includes('ChunkLoadError')) {
    console.error('Unhandled chunk loading error:', event.reason)
    event.preventDefault() // Prevent default browser error logging
    
    // Always show the non-intrusive banner for unhandled chunk errors
    // This complements the RouteError component and handles edge cases
    if (window.showGlobalError) {
      window.showGlobalError()
    } else {
      // Fallback if banner isn't available yet (early in app lifecycle)
      console.error('Global error banner not available, using fallback')
      if (window.confirm('Failed to load application resources. Would you like to reload?')) {
        window.location.reload()
      }
    }
  }
})

// Note on alternative error recovery strategies:
// The current approach uses router.go(0) for reliability and simplicity.
// More complex strategies (service workers, custom fetch retry) could avoid
// full page reloads but add significant complexity. Consider these only if
// user feedback indicates the current approach is problematic.

const app = createApp(App)

app.use(vuetify)
app.use(pinia)
app.use(router)
app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        cacheTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  }
})

app.mount('#root')