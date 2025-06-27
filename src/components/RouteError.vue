<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6">
        <v-alert
          type="error"
          variant="tonal"
          prominent
        >
          <v-alert-title>Failed to load {{ pageName }}</v-alert-title>
          <div>An error occurred while loading this page. Please try again.</div>
          
          <template v-slot:append>
            <v-btn
              variant="outlined"
              color="error"
              @click="retry"
              class="mt-2"
            >
              <v-icon start>mdi-refresh</v-icon>
              Retry
            </v-btn>
          </template>
        </v-alert>
        
        <div class="text-center mt-4">
          <v-btn
            variant="text"
            color="primary"
            @click="goHome"
          >
            <v-icon start>mdi-home</v-icon>
            Go to Dashboard
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// Get the page name from route meta or fallback to generic 'page'
const pageName = computed(() => {
  return route.meta?.title || 'page'
})

const retry = () => {
  // Use router.go(0) to force a full page reload, which will re-attempt
  // to download the failed route chunk. This is the most reliable way
  // to recover from chunk loading failures in production.
  // 
  // WARNING: This will lose any unsaved state on the page, including:
  // - Form data that hasn't been submitted
  // - Temporary UI state (expanded/collapsed sections, etc.)
  // - Any in-memory data not persisted to localStorage or the backend
  router.go(0)
}

const goHome = () => {
  router.push('/')
}
</script>