<template>
  <v-container class="max-width-6xl">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <v-card-title class="text-h4 font-weight-bold pa-0 mb-2">
          Repository Review Results
        </v-card-title>
        <div class="text-body-2 text-medium-emphasis">
          Analysis completed {{ formatDistanceToNow(reviewData?.reviewResult?.metadata?.timestamp) }}
        </div>
      </div>
      
      <div class="d-flex ga-2">
        <v-btn
          @click="() => copyToClipboard(reviewData?.reviewResult?.fullReview)"
          variant="outlined"
          prepend-icon="mdi-content-copy"
          :disabled="isCopying"
        >
          {{ isCopying ? 'Copied!' : 'Copy Markdown' }}
        </v-btn>
        <v-btn
          @click="exportResults"
          variant="outlined"
          prepend-icon="mdi-download"
        >
          Export
        </v-btn>
        <v-btn
          @click="router.push('/repository-review')"
          color="primary"
          prepend-icon="mdi-arrow-left"
        >
          New Review
        </v-btn>
      </div>
    </div>

    <div v-if="!reviewData" class="text-center py-8">
      <v-icon icon="mdi-alert-circle" size="x-large" color="grey-lighten-1" class="mb-4"></v-icon>
      <v-card-title class="text-h6 mb-2">No review data available</v-card-title>
      <v-card-text>
        Please perform a repository analysis first.
      </v-card-text>
      <v-btn
        @click="router.push('/repository-review')"
        color="primary"
        class="mt-4"
      >
        Start Review
      </v-btn>
    </div>

    <div v-else class="d-flex flex-column ga-6">
      <!-- Repository Overview -->
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon icon="mdi-source-repository"></v-icon>
          Repository Overview
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="8">
              <div class="text-h6 font-weight-medium mb-2">
                {{ reviewData.repositoryData.project.name_with_namespace }}
              </div>
              <div class="text-body-2 text-medium-emphasis mb-1">
                {{ reviewData.repositoryData.project.description || 'No description available' }}
              </div>
              <div class="text-body-2 text-medium-emphasis mb-4">
                <v-icon icon="mdi-source-branch" size="small" class="mr-1"></v-icon>
                Branch: <strong>{{ reviewData.repositoryData.branch || reviewData.reviewConfiguration?.repository?.selectedBranch || 'main' }}</strong>
              </div>
              <div class="d-flex flex-wrap ga-2">
                <v-chip
                  v-for="(percentage, language) in reviewData.repositoryData.languages"
                  :key="language"
                  size="small"
                  variant="outlined"
                >
                  {{ language }} ({{ Math.round(percentage) }}%)
                </v-chip>
              </div>
            </v-col>
            <v-col cols="12" md="4">
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>Files Analyzed</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ reviewData.repositoryData.selectedFiles }} of {{ reviewData.repositoryData.totalFiles }}
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Analysis Focus</v-list-item-title>
                  <v-list-item-subtitle>{{ reviewData.reviewResult.metadata.focus }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Analysis Depth</v-list-item-title>
                  <v-list-item-subtitle>{{ reviewData.reviewResult.metadata.depth }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Review Navigation -->
      <v-card>
        <v-card-title>Review Sections</v-card-title>
        <v-card-text>
          <v-row>
            <v-col
              v-for="(section, key) in reviewSections"
              :key="key"
              cols="12" sm="6" md="4"
            >
              <v-card
                variant="outlined"
                hover
                @click="scrollToSection(key)"
                class="cursor-pointer"
              >
                <v-card-text class="text-center pa-4">
                  <v-icon :icon="section.icon" size="large" :color="section.color" class="mb-2"></v-icon>
                  <div class="text-body-2 font-weight-medium">{{ section.title }}</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Review Content -->
      <div class="d-flex flex-column ga-4">
        <v-card
          v-for="(section, key) in reviewSections"
          :key="key"
          :id="`section-${key}`"
        >
          <v-card-title class="d-flex align-center ga-2">
            <v-icon :icon="section.icon" :color="section.color"></v-icon>
            {{ section.title }}
          </v-card-title>
          <v-card-text>
            <div class="d-flex justify-space-between align-center mb-4">
              <div></div>
              <v-btn-toggle
                v-model="viewMode"
                variant="outlined"
                density="compact"
                mandatory
              >
                <v-btn value="rendered" size="small">
                  <v-icon icon="mdi-eye"></v-icon>
                  Rendered
                </v-btn>
                <v-btn value="raw" size="small">
                  <v-icon icon="mdi-code-tags"></v-icon>
                  Raw
                </v-btn>
              </v-btn-toggle>
            </div>
            
            <div v-if="viewMode === 'rendered'" class="markdown-content">
              <div v-html="renderMarkdown(getSectionContent(key))"></div>
            </div>
            <div v-else>
              <pre class="bg-grey-lighten-5 pa-4 rounded text-body-2" style="white-space: pre-wrap; overflow-x: auto;">{{ getSectionContent(key) }}</pre>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- File Analysis Details -->
      <v-card v-if="reviewData.repositoryData.analysis">
        <v-card-title class="d-flex align-center ga-2">
          <v-icon icon="mdi-file-tree"></v-icon>
          File Analysis Details
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <div class="text-subtitle-1 font-weight-medium mb-3">Files by Extension</div>
              <v-list density="compact">
                <v-list-item
                  v-for="(data, ext) in reviewData.repositoryData.analysis.filesByExtension"
                  :key="ext"
                >
                  <v-list-item-title>{{ ext || 'No extension' }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ data.count }} files ({{ formatFileSize(data.totalSize) }})
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-1 font-weight-medium mb-3">Largest Files</div>
              <v-list density="compact">
                <v-list-item
                  v-for="file in reviewData.repositoryData.analysis.largestFiles"
                  :key="file.path"
                >
                  <v-list-item-title class="text-body-2">{{ file.path }}</v-list-item-title>
                  <v-list-item-subtitle>{{ formatFileSize(file.size) }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { marked } from 'marked'
import { formatDistanceToNow } from '../utils/dateUtils'
import { useClipboard } from '../hooks/useClipboard'

const router = useRouter()
const route = useRoute()
const { isCopying, copyToClipboard } = useClipboard()

const viewMode = ref('rendered')
const reviewData = ref(null)

// Review sections configuration
const reviewSections = {
  overview: {
    title: 'Repository Overview',
    icon: 'mdi-information',
    color: 'primary'
  },
  codeQuality: {
    title: 'Code Quality Assessment',
    icon: 'mdi-code-braces',
    color: 'success'
  },
  security: {
    title: 'Security Analysis',
    icon: 'mdi-shield-check',
    color: 'error'
  },
  performance: {
    title: 'Performance Insights',
    icon: 'mdi-speedometer',
    color: 'warning'
  },
  architecture: {
    title: 'Architecture & Design',
    icon: 'mdi-sitemap',
    color: 'info'
  },
  fileInsights: {
    title: 'File-Level Insights',
    icon: 'mdi-file-search',
    color: 'purple'
  },
  recommendations: {
    title: 'Recommendations',
    icon: 'mdi-lightbulb',
    color: 'orange'
  },
  summary: {
    title: 'Summary',
    icon: 'mdi-clipboard-text',
    color: 'primary'
  }
}

onMounted(() => {
  // Try to get review data from route state or localStorage
  if (route.params.reviewData) {
    reviewData.value = route.params.reviewData
  } else {
    const storedData = localStorage.getItem('repository_review_results')
    if (storedData) {
      try {
        reviewData.value = JSON.parse(storedData)
      } catch (error) {
        console.error('Failed to parse stored review data:', error)
      }
    }
  }
})

function renderMarkdown(content) {
  if (!content) return '<p>No content available</p>'
  
  try {
    return marked(content)
  } catch (error) {
    console.error('Markdown rendering error:', error)
    return `<pre>${content}</pre>`
  }
}

function getSectionContent(sectionKey) {
  return reviewData.value?.reviewResult?.sections?.[sectionKey] || 'No content available for this section.'
}

function scrollToSection(sectionKey) {
  const element = document.getElementById(`section-${sectionKey}`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

function exportResults() {
  if (!reviewData.value) return
  
  // Get branch name from multiple possible sources
  const branch = reviewData.value.repositoryData.branch || 
                 reviewData.value.reviewConfiguration?.repository?.selectedBranch || 
                 'main'
  
  // Create export content with metadata header
  const metadata = `# Repository Review Report\n\n` +
    `**Repository:** ${reviewData.value.repositoryData.project.name_with_namespace}\n` +
    `**Branch:** ${branch}\n` +
    `**Date:** ${new Date().toISOString()}\n` +
    `**Files Analyzed:** ${reviewData.value.repositoryData.selectedFiles} of ${reviewData.value.repositoryData.totalFiles}\n` +
    `**Analysis Focus:** ${reviewData.value.reviewResult.metadata.focus}\n` +
    `**Analysis Depth:** ${reviewData.value.reviewResult.metadata.depth}\n\n` +
    `---\n\n`
  
  const content = metadata + reviewData.value.reviewResult.fullReview
  const projectName = reviewData.value.repositoryData.project.name_with_namespace.replace(/[/\\:*?"<>|]/g, '_')
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `${projectName}_${branch.replace(/[/\\:*?"<>|]/g, '_')}_review_${timestamp}.md`
  
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.markdown-content :deep(h1) { font-size: 1.5rem; }
.markdown-content :deep(h2) { font-size: 1.375rem; }
.markdown-content :deep(h3) { font-size: 1.25rem; }
.markdown-content :deep(h4) { font-size: 1.125rem; }

.markdown-content :deep(p) {
  margin-bottom: 1rem;
  line-height: 1.6;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

.markdown-content :deep(li) {
  margin-bottom: 0.25rem;
}

.markdown-content :deep(code) {
  background-color: rgba(175, 184, 193, 0.2);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.markdown-content :deep(pre) {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1rem;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #ccc;
  padding-left: 1rem;
  margin: 1rem 0;
  color: #666;
}
</style>