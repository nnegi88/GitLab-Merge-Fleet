<template>
  <v-container class="max-width-6xl">
    <!-- Loading State -->
    <div v-if="isLoadingMR || isLoadingChanges" class="text-center py-8">
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
        class="mb-4"
      ></v-progress-circular>
      <div class="text-body-1 text-medium-emphasis">Loading merge request details...</div>
    </div>

    <!-- Error State -->
    <v-card v-else-if="mrError || changesError" class="text-center pa-8">
      <v-icon icon="mdi-close-circle" size="x-large" color="error" class="mb-4"></v-icon>
      <v-card-text class="text-body-1 text-error mb-4">
        {{ mrError?.message || changesError?.message }}
      </v-card-text>
      <v-btn
        @click="router.push('/')"
        color="primary"
        prepend-icon="mdi-arrow-left"
      >
        Back to Dashboard
      </v-btn>
    </v-card>

    <!-- MR Details -->
    <div v-else-if="mergeRequest" class="d-flex flex-column ga-6">
      <!-- Header -->
      <v-card>
        <v-card-text class="pa-6">
          <div class="d-flex justify-space-between align-start mb-4">
            <div class="flex-grow-1" style="min-width: 0;">
              <v-tooltip :text="mergeRequest.title" location="top">
                <template v-slot:activator="{ props }">
                  <v-card-title class="text-h4 font-weight-bold mb-2 pa-0 text-truncate" v-bind="props">
                    {{ mergeRequest.title }}
                  </v-card-title>
                </template>
              </v-tooltip>
              <div class="d-flex align-center flex-wrap ga-4 text-body-2">
                <div class="d-flex align-center ga-1">
                  <v-icon icon="mdi-account" size="small"></v-icon>
                  <span>{{ mergeRequest.author?.name }}</span>
                </div>
                <v-divider vertical></v-divider>
                <div class="d-flex align-center ga-1">
                  <v-icon icon="mdi-clock-outline" size="small"></v-icon>
                  <span>{{ formatDate(mergeRequest.created_at) }}</span>
                </div>
                <v-divider vertical></v-divider>
                <v-chip
                  :color="getStatusColor(mergeRequest.state)"
                  size="small"
                  variant="flat"
                >
                  {{ mergeRequest.state }}
                </v-chip>
              </div>
            </div>
            <v-btn
              :href="mergeRequest.web_url"
              target="_blank"
              variant="outlined"
              prepend-icon="mdi-open-in-new"
            >
              View in GitLab
            </v-btn>
          </div>

          <div class="d-flex align-center ga-2 mb-4">
            <v-icon icon="mdi-source-branch" size="small"></v-icon>
            <v-chip variant="outlined" size="small" class="font-mono">
              {{ mergeRequest.source_branch }}
            </v-chip>
            <v-icon icon="mdi-arrow-right" size="small"></v-icon>
            <v-chip variant="outlined" size="small" class="font-mono">
              {{ mergeRequest.target_branch }}
            </v-chip>
          </div>

          <v-card v-if="mergeRequest.description" variant="tonal" class="mt-4">
            <v-card-text class="pa-4">
              <div class="whitespace-pre-wrap">{{ mergeRequest.description }}</div>
            </v-card-text>
          </v-card>
        </v-card-text>
      </v-card>

      <!-- AI Review Section -->
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between pa-6">
          <div class="d-flex align-center ga-2">
            <v-icon icon="mdi-robot" color="primary"></v-icon>
            <span>AI Code Review</span>
          </div>
          <v-btn
            @click="triggerAIReview"
            :disabled="isReviewing || !hasGeminiKey"
            :loading="isReviewing"
            color="primary"
            :prepend-icon="isReviewing ? '' : 'mdi-robot'"
          >
            {{ isReviewing ? 'Analyzing...' : 'Start AI Review' }}
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-6 pt-0">
          <!-- API Key Warning -->
          <v-alert
            v-if="!hasGeminiKey"
            type="warning"
            variant="tonal"
            icon="mdi-alert-triangle"
            class="mb-4"
          >
            <div>
              Gemini API key not configured. 
              <router-link to="/settings" class="font-weight-medium text-decoration-underline">
                Add it in Settings
              </router-link>
              to enable AI reviews.
            </div>
          </v-alert>

          <!-- Review Results -->
          <div v-if="aiReview" class="d-flex flex-column ga-4">
            <!-- Summary -->
            <v-alert
              type="info"
              variant="tonal"
              icon="mdi-information"
            >
              <div class="font-weight-medium mb-2">Review Summary</div>
              <div>{{ aiReview.summary }}</div>
            </v-alert>

            <!-- View Toggle -->
            <div class="d-flex align-center justify-space-between">
              <v-btn
                @click="showRawMarkdown = !showRawMarkdown"
                variant="text"
                size="small"
                :prepend-icon="showRawMarkdown ? 'mdi-eye' : 'mdi-code-tags'"
              >
                {{ showRawMarkdown ? 'Show Rendered' : 'Show Raw Markdown' }}
              </v-btn>
              <v-btn
                @click="() => copyToClipboard(aiReview.fullReview)"
                variant="text"
                size="small"
                prepend-icon="mdi-content-copy"
                :disabled="isCopying"
              >
                {{ isCopying ? 'Copied!' : 'Copy Markdown' }}
              </v-btn>
            </div>

            <!-- Detailed Review -->
            <v-card v-if="!showRawMarkdown" variant="tonal">
              <v-card-text class="pa-4">
                <div 
                  class="markdown-content"
                  v-html="renderMarkdown(aiReview.fullReview)"
                ></div>
              </v-card-text>
            </v-card>

            <!-- Raw Markdown View -->
            <v-card v-else variant="tonal">
              <v-card-text class="pa-4">
                <pre class="whitespace-pre-wrap text-body-2">{{ aiReview.fullReview }}</pre>
              </v-card-text>
            </v-card>

            <!-- Action Buttons -->
            <div class="d-flex ga-3">
              <v-btn
                @click="postReviewComment"
                :disabled="isPostingComment"
                :loading="isPostingComment"
                color="success"
                prepend-icon="mdi-comment"
              >
                Post as Comment
              </v-btn>
              <v-btn
                @click="clearReview"
                variant="outlined"
                prepend-icon="mdi-close"
              >
                Clear Review
              </v-btn>
            </div>
          </div>

          <!-- Review Error -->
          <v-alert
            v-if="reviewError"
            type="error"
            variant="tonal"
            icon="mdi-close-circle"
            :text="reviewError"
          ></v-alert>
        </v-card-text>
      </v-card>

      <!-- Changes Summary -->
      <v-card v-if="changes">
        <v-card-title class="d-flex align-center ga-2 pa-6">
          <v-icon icon="mdi-file-document" color="primary"></v-icon>
          <span>Changes Summary</span>
        </v-card-title>
        <v-card-text class="pa-6 pt-0">
          <v-row class="mb-4">
            <v-col cols="12" md="4" class="text-center">
              <div class="text-h4 font-weight-bold text-success">+{{ diffStats.additions }}</div>
              <div class="text-body-2 text-medium-emphasis">Additions</div>
            </v-col>
            <v-col cols="12" md="4" class="text-center">
              <div class="text-h4 font-weight-bold text-error">-{{ diffStats.deletions }}</div>
              <div class="text-body-2 text-medium-emphasis">Deletions</div>
            </v-col>
            <v-col cols="12" md="4" class="text-center">
              <div class="text-h4 font-weight-bold">{{ diffStats.filesChanged }}</div>
              <div class="text-body-2 text-medium-emphasis">Files Changed</div>
            </v-col>
          </v-row>
          
          <!-- Files List -->
          <div v-if="changes.changes?.length">
            <v-card-subtitle class="font-weight-medium pa-0 mb-3">Modified Files:</v-card-subtitle>
            <v-list density="compact">
              <v-list-item
                v-for="change in changes.changes"
                :key="change.new_path || change.old_path"
                class="pa-2"
              >
                <template v-slot:prepend>
                  <v-icon icon="mdi-file-document" size="small" color="medium-emphasis"></v-icon>
                </template>
                
                <v-list-item-title class="font-mono text-body-2">
                  {{ change.new_path || change.old_path }}
                </v-list-item-title>
                
                <template v-slot:append>
                  <v-chip
                    v-if="change.new_file"
                    size="x-small"
                    color="success"
                    variant="flat"
                  >
                    new
                  </v-chip>
                  <v-chip
                    v-else-if="change.deleted_file"
                    size="x-small"
                    color="error"
                    variant="flat"
                  >
                    deleted
                  </v-chip>
                  <v-chip
                    v-else-if="change.renamed_file"
                    size="x-small"
                    color="info"
                    variant="flat"
                  >
                    renamed
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
      </v-card>

      <!-- Recent Comments -->
      <v-card v-if="notes?.length">
        <v-card-title class="d-flex align-center ga-2 pa-6">
          <v-icon icon="mdi-comment" color="primary"></v-icon>
          <span>Recent Comments</span>
        </v-card-title>
        <v-card-text class="pa-6 pt-0">
          <v-list>
            <v-list-item
              v-for="note in notes.slice(0, 5)"
              :key="note.id"
              class="pa-4 mb-2"
            >
              <v-card variant="tonal" class="w-100">
                <v-card-text class="pa-4">
                  <div class="d-flex align-center ga-2 mb-2">
                    <v-icon icon="mdi-account-circle" size="small"></v-icon>
                    <span class="font-weight-medium">{{ note.author?.name }}</span>
                    <v-divider vertical></v-divider>
                    <span class="text-body-2 text-medium-emphasis">{{ formatDate(note.created_at) }}</span>
                  </div>
                  <div class="whitespace-pre-wrap text-body-2">{{ note.body }}</div>
                </v-card-text>
              </v-card>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { marked } from 'marked'
import gitlabAPI from '../api/gitlab'
import geminiAPI from '../api/gemini'
import { useAuthStore } from '../stores/authStore'
import { formatDate } from '../utils/dateUtils'
import { useClipboard } from '../hooks/useClipboard'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { isCopying, copyToClipboard } = useClipboard()

const projectId = route.params.projectId
const mrIid = route.params.mrIid

const isReviewing = ref(false)
const isPostingComment = ref(false)
const aiReview = ref(null)
const reviewError = ref('')
const showRawMarkdown = ref(false)

// Check if Gemini API key is configured
const hasGeminiKey = computed(() => !!localStorage.getItem('gemini_api_key'))

// Calculate diff stats from changes
const diffStats = computed(() => {
  if (!changes.value?.changes) {
    return { additions: 0, deletions: 0, filesChanged: 0 }
  }

  let additions = 0
  let deletions = 0
  
  changes.value.changes.forEach(change => {
    if (change.diff) {
      // Parse the diff to count additions and deletions
      const lines = change.diff.split('\n')
      lines.forEach(line => {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          additions++
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          deletions++
        }
      })
    }
  })

  return {
    additions,
    deletions,
    filesChanged: changes.value.changes.length
  }
})

// Configure marked for GitLab-flavored markdown
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
})

function renderMarkdown(markdown) {
  if (!markdown) return ''
  try {
    return marked.parse(markdown)
  } catch (error) {
    console.error('Markdown parsing error:', error)
    return `<pre>${markdown}</pre>`
  }
}

// Fetch MR details
const { data: mergeRequest, isLoading: isLoadingMR, error: mrError } = useQuery({
  queryKey: ['mergeRequest', projectId, mrIid],
  queryFn: () => gitlabAPI.getMergeRequest(projectId, mrIid),
  enabled: !!authStore.token && !!projectId && !!mrIid
})

// Fetch MR changes
const { data: changes, isLoading: isLoadingChanges, error: changesError } = useQuery({
  queryKey: ['mergeRequestChanges', projectId, mrIid],
  queryFn: () => gitlabAPI.getMergeRequestChanges(projectId, mrIid),
  enabled: !!authStore.token && !!projectId && !!mrIid
})

// Fetch MR diff for AI review
// Alias unused variables to avoid linting errors
const { data: diffData, isLoading: _isLoadingDiff, error: _diffError } = useQuery({
  queryKey: ['mergeRequestDiff', projectId, mrIid],
  queryFn: () => gitlabAPI.getMergeRequestDiff(projectId, mrIid),
  enabled: !!authStore.token && !!projectId && !!mrIid
})

// Fetch MR notes
const { data: notes } = useQuery({
  queryKey: ['mergeRequestNotes', projectId, mrIid],
  queryFn: () => gitlabAPI.getMergeRequestNotes(projectId, mrIid),
  enabled: !!authStore.token && !!projectId && !!mrIid
})

function getStatusColor(state) {
  switch (state) {
    case 'opened':
      return 'success'
    case 'merged':
      return 'primary'
    case 'closed':
      return 'error'
    default:
      return 'grey'
  }
}

async function triggerAIReview() {
  if (!hasGeminiKey.value || !mergeRequest.value) return

  isReviewing.value = true
  reviewError.value = ''
  aiReview.value = null

  try {
    // Use the proper diff data if available, otherwise fallback to changes
    let diffContent = 'No changes available'
    
    if (diffData.value && typeof diffData.value === 'string') {
      diffContent = diffData.value
    } else if (changes.value?.changes) {
      // Fallback to building diff from changes
      diffContent = changes.value.changes.map(change => {
        if (change.diff) {
          return `--- a/${change.old_path || change.new_path}\n+++ b/${change.new_path || change.old_path}\n${change.diff}`
        }
        return `File: ${change.new_path || change.old_path} (${change.new_file ? 'new' : change.deleted_file ? 'deleted' : 'modified'})`
      }).join('\n\n')
    }

    console.log('Diff content length:', diffContent.length)
    console.log('First 500 chars:', diffContent.substring(0, 500))

    const review = await geminiAPI.reviewMergeRequest(mergeRequest.value, diffContent)
    aiReview.value = review
  } catch (error) {
    reviewError.value = error.message
  } finally {
    isReviewing.value = false
  }
}

async function postReviewComment() {
  if (!aiReview.value || !mergeRequest.value) return

  isPostingComment.value = true

  try {
    const commentBody = `## 🤖 AI Code Review\n\n${aiReview.value.fullReview}\n\n---\n*Generated by Concirrus Merge Fleet AI Assistant*`
    
    await gitlabAPI.createMergeRequestNote(projectId, mrIid, commentBody)
    
    // Show success feedback
    alert('AI review posted as comment successfully!')
    
    // Optionally refresh the notes
    // queryClient.invalidateQueries(['mergeRequestNotes', projectId, mrIid])
  } catch (error) {
    alert(`Failed to post comment: ${error.message}`)
  } finally {
    isPostingComment.value = false
  }
}

function clearReview() {
  aiReview.value = null
  reviewError.value = ''
}
</script>

<style>
.markdown-content {
  line-height: 1.6;
  color: #374151;
}

.markdown-content h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  margin-top: 1.5rem;
  color: #111827;
}

.markdown-content h1:first-child {
  margin-top: 0;
}

.markdown-content h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  margin-top: 1.25rem;
  color: #111827;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

.markdown-content h2:first-child {
  margin-top: 0;
}

.markdown-content h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  margin-top: 1rem;
  color: #111827;
}

.markdown-content h3:first-child {
  margin-top: 0;
}

.markdown-content p {
  margin-bottom: 0.75rem;
}

.markdown-content ul {
  list-style-type: disc;
  margin-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.markdown-content ol {
  list-style-type: decimal;
  margin-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.markdown-content li {
  margin-bottom: 0.25rem;
}

.markdown-content code {
  background-color: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-family: 'Courier New', monospace;
  color: #dc2626;
}

.markdown-content pre {
  background-color: #1f2937;
  color: #f9fafb;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 0.75rem;
}

.markdown-content pre code {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

.markdown-content blockquote {
  border-left: 4px solid #d1d5db;
  padding-left: 1rem;
  font-style: italic;
  color: #6b7280;
  margin-bottom: 0.75rem;
}

.markdown-content strong {
  font-weight: 700;
}

.markdown-content em {
  font-style: italic;
}

.markdown-content hr {
  border: none;
  border-top: 1px solid #d1d5db;
  margin: 1rem 0;
}

.markdown-content table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.75rem;
}

.markdown-content th,
.markdown-content td {
  border: 1px solid #d1d5db;
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.markdown-content th {
  background-color: #f9fafb;
  font-weight: 700;
}
</style>