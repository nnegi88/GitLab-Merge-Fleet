<template>
  <v-app>
    <div v-if="!isInitialized" class="d-flex align-center justify-center" style="min-height: 100vh;">
      <div class="text-center">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        ></v-progress-circular>
        <v-card-text class="text-h6 mt-4">Loading...</v-card-text>
      </div>
    </div>
    <AppLayout v-else>
      <router-view />
    </AppLayout>
    
    <!-- Global error banner for unhandled chunk loading errors -->
    <GlobalErrorBanner ref="errorBanner" />
  </v-app>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from './components/Layout.vue'
import GlobalErrorBanner from './components/GlobalErrorBanner.vue'
import { useAuthStore } from './stores/authStore'

const router = useRouter()
const authStore = useAuthStore()
const isInitialized = ref(false)
const errorBanner = ref(null)

// Expose error banner to global scope for error handlers
window.showGlobalError = () => {
  errorBanner.value?.showError()
}

onMounted(() => {
  // Follow other open tabs when they change what's remembered on this device
  window.addEventListener('storage', authStore.syncFromStorage)

  // Route to setup if no token
  if (!authStore.token && router.currentRoute.value.name !== 'setup') {
    router.push('/setup')
  }
  isInitialized.value = true
})

onUnmounted(() => {
  window.removeEventListener('storage', authStore.syncFromStorage)
})

// Losing the token, e.g. after signing out in another tab, leads to setup, as signing out here does
watch(() => authStore.token, (token) => {
  if (!token && router.currentRoute.value.name !== 'setup') {
    router.push('/setup')
  }
})
</script>