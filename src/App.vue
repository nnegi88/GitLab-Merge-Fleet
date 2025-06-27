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
import { ref, onMounted } from 'vue'
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

onMounted(async () => {
  try {
    await authStore.initialize()
    
    // Route to setup if no token
    if (!authStore.token && router.currentRoute.value.name !== 'setup') {
      router.push('/setup')
    }
  } catch (error) {
    console.error('Failed to initialize auth:', error)
  } finally {
    isInitialized.value = true
  }
})
</script>