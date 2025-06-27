<template>
  <v-row align="center" justify="center" class="layout-full-page-content">
    <v-col cols="12" md="6" lg="4">
      <v-card class="pa-8 text-center" elevation="0">
        <v-icon
          size="120"
          color="grey-lighten-1"
          class="mb-4"
        >
          mdi-alert-circle-outline
        </v-icon>
        
        <h1 class="text-h2 font-weight-bold mb-4">404</h1>
        
        <h2 class="text-h5 mb-4">Page Not Found</h2>
        
        <p class="text-body-1 text-grey-darken-1 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <v-btn
          v-if="isAuthenticated"
          color="primary"
          size="large"
          variant="flat"
          to="/"
          prepend-icon="mdi-home"
        >
          Go to Dashboard
        </v-btn>
        
        <v-btn
          v-else
          color="primary"
          size="large"
          variant="flat"
          to="/setup"
          prepend-icon="mdi-login"
        >
          Go to Setup
        </v-btn>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const isAuthenticated = computed(() => !!authStore.token)

onMounted(() => {
  // Log 404 errors for monitoring - using console.error as 404 is an error condition
  // TODO: Integrate with proper logging service for production monitoring
  console.error(`404 - Page not found: ${router.currentRoute.value.fullPath}`)
})
</script>

