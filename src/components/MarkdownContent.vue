<template>
  <div v-html="html"></div>
</template>

<script setup>
// The app's only v-html (vue/no-v-html is off for this file alone, see eslint.config.js):
// renderMarkdown's output can't run script or load anything. Render untrusted markdown
// with this component, never with v-html directly.
import { computed } from 'vue'
import { renderMarkdown } from '../utils/markdown'

const props = defineProps({
  source: {
    type: String,
    default: ''
  }
})

// Computed, so a re-render doesn't parse and sanitize the same markdown again
const html = computed(() => renderMarkdown(props.source))
</script>
