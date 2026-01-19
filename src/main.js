import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import { VueQueryPlugin } from '@tanstack/vue-query'
import * as Sentry from '@sentry/vue'
import vuetify from './plugins/vuetify'
import App from './App.vue'
import { lazyLoadRoute } from './utils/router'
import { useAuthStore } from './stores/authStore'
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

// Global error handler for chunk loading failures - logs and captures to Sentry
// The route-specific errorComponent handles user-facing error display
router.onError((error) => {
  if (error.message?.includes('Failed to fetch dynamically imported module')) {
    console.error('Router chunk loading error:', error)

    // Capture chunk loading errors to Sentry for monitoring
    if (import.meta.env.VITE_SENTRY_DSN) {
      Sentry.captureException(error, {
        tags: {
          errorType: 'chunk-load-error',
          errorSource: 'router'
        }
      })
    }

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
    // Capture unhandled chunk loading errors to Sentry for monitoring
    if (import.meta.env.VITE_SENTRY_DSN) {
      Sentry.captureException(event.reason, {
        tags: {
          errorType: 'chunk-load-error',
          errorSource: 'unhandledrejection'
        }
      })
    }

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

// Initialize Sentry for production error monitoring
// Only initialize if DSN is configured (production environment)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE || 'development',
    release: import.meta.env.VITE_APP_VERSION || 'unknown',
    integrations: [
      new Sentry.BrowserTracing({
        routingInstrumentation: Sentry.vueRouterInstrumentation(router),
      }),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance monitoring sample rate (10% of transactions)
    tracesSampleRate: 0.1,
    // Session replay sample rate (10% of sessions, 100% of error sessions)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Filter sensitive data before sending to Sentry
    beforeSend(event, hint) {
      // Filter sensitive headers
      if (event.request?.headers) {
        // Remove GitLab API token
        if (event.request.headers['PRIVATE-TOKEN']) {
          event.request.headers['PRIVATE-TOKEN'] = '[Filtered]'
        }
        if (event.request.headers['private-token']) {
          event.request.headers['private-token'] = '[Filtered]'
        }
        // Remove authorization headers
        if (event.request.headers['Authorization']) {
          event.request.headers['Authorization'] = '[Filtered]'
        }
        if (event.request.headers['authorization']) {
          event.request.headers['authorization'] = '[Filtered]'
        }
      }

      // Filter GitLab URL from request URL (could contain sensitive instance URL)
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url)
          // Replace hostname with placeholder to protect private GitLab instances
          if (url.hostname && !url.hostname.includes('gitlab.com')) {
            url.hostname = '[gitlab-instance]'
            event.request.url = url.toString()
          }
        } catch (e) {
          // Invalid URL, leave as is
        }
      }

      // Filter sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          // Filter tokens from breadcrumb data
          if (breadcrumb.data) {
            if (breadcrumb.data.token) breadcrumb.data.token = '[Filtered]'
            if (breadcrumb.data.gitlabUrl) breadcrumb.data.gitlabUrl = '[Filtered]'
            if (breadcrumb.data.PRIVATE_TOKEN) breadcrumb.data.PRIVATE_TOKEN = '[Filtered]'
          }
          // Filter URLs from breadcrumb messages and categories
          if (breadcrumb.message && typeof breadcrumb.message === 'string') {
            breadcrumb.message = breadcrumb.message.replace(/https?:\/\/[^\s/$.?#].[^\s]*/gi, '[URL]')
          }
          return breadcrumb
        })
      }

      // Filter sensitive context data
      if (event.contexts?.vue?.propsData) {
        const props = event.contexts.vue.propsData
        if (props.token) props.token = '[Filtered]'
        if (props.gitlabUrl) props.gitlabUrl = '[Filtered]'
      }

      return event
    },
  })
}

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

// Set up user context for Sentry (only safe, non-sensitive fields)
// Watch for auth state changes and update Sentry user context
if (import.meta.env.VITE_SENTRY_DSN) {
  const authStore = useAuthStore()

  // Watch for user changes and update Sentry context
  // Only include id and username - exclude email and name for privacy
  authStore.$subscribe((mutation, state) => {
    if (state.user) {
      Sentry.setUser({
        id: state.user.id?.toString(),
        username: state.user.username,
      })
    } else {
      // Clear user context when logged out
      Sentry.setUser(null)
    }
  })

  // Set initial user context if already logged in
  if (authStore.user) {
    Sentry.setUser({
      id: authStore.user.id?.toString(),
      username: authStore.user.username,
    })
  }
}

// Configure Vue error handler to integrate with Sentry
// Captures Vue component errors with additional context
if (import.meta.env.VITE_SENTRY_DSN) {
  app.config.errorHandler = (err, instance, info) => {
    // Capture the error with Sentry, including Vue-specific context
    Sentry.captureException(err, {
      contexts: {
        vue: {
          componentName: instance?.$options?.name,
          propsData: instance?.$props,
          lifecycleHook: info,
        }
      }
    })
  }
}

app.mount('#root')