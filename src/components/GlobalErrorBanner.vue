<template>
  <v-snackbar
    v-model="show"
    :timeout="-1"
    location="top"
    color="error"
    variant="elevated"
    multi-line
  >
    <div class="d-flex align-center">
      <v-icon start>mdi-alert-circle</v-icon>
      <div>
        <div class="font-weight-medium">Application Error</div>
        <div class="text-body-2 mt-1">Failed to load required resources</div>
      </div>
    </div>
    
    <template v-slot:actions>
      <v-btn
        color="white"
        variant="text"
        @click="reload"
        size="small"
      >
        Reload
      </v-btn>
      <v-btn
        color="white"
        variant="text"
        @click="dismiss"
        size="small"
      >
        Dismiss
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
import { ref } from 'vue'

const show = ref(false)

const showError = () => {
  show.value = true
}

const reload = () => {
  window.location.reload()
}

const dismiss = () => {
  show.value = false
}

// Expose methods for parent component
defineExpose({
  showError
})
</script>