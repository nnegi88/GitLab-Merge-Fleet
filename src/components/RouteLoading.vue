<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="auto">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
          width="6"
        ></v-progress-circular>
        <div class="text-center mt-4">
          <p class="text-h6 text-medium-emphasis">{{ loadingText }}</p>
          <p class="text-body-2 text-disabled mt-1">Please wait...</p>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const loadingText = computed(() => {
  // Use title from route meta if available, fallback to generic 'page'
  const pageName = route.meta?.title || 'page'
  return `Loading ${pageName}`
})
</script>