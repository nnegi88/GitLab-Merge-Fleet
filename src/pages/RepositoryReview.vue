<template>
  <v-container class="max-width-6xl">
    <v-card-title class="text-h4 font-weight-bold mb-6 pa-0">
      Repository Code Review
    </v-card-title>
    
    <div class="d-flex flex-column ga-6">
      <!-- Step 1: Repository Selection -->
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon icon="mdi-source-repository"></v-icon>
          Step 1: Select Repositories
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="searchQuery"
            placeholder="Search repositories..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            hide-details
            class="mb-4"
          ></v-text-field>
          
          <div style="max-height: 400px; overflow-y: auto;" class="border rounded">
            <div v-if="isLoadingProjects" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" class="mb-4"></v-progress-circular>
              <div class="text-body-2 text-medium-emphasis">Loading repositories...</div>
            </div>
            
            <v-alert
              v-else-if="projectsError"
              type="error"
              variant="tonal"
              :text="`Error loading repositories: ${projectsError.message}`"
              class="ma-4"
            ></v-alert>
            
            <div v-else>
              <v-list>
                <v-list-item
                  v-for="project in filteredProjects"
                  :key="project.id"
                  class="pa-3"
                >
                  <template v-slot:prepend>
                    <v-checkbox
                      :model-value="selectedProjects.includes(project.id)"
                      @update:model-value="toggleProject(project.id)"
                      hide-details
                    ></v-checkbox>
                  </template>
                  
                  <v-list-item-title class="font-weight-medium">
                    {{ project.name_with_namespace }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    <div class="d-flex align-center ga-2">
                      <span>{{ project.web_url }}</span>
                      <v-chip
                        v-if="project.default_branch"
                        size="x-small"
                        variant="outlined"
                      >
                        {{ project.default_branch }}
                      </v-chip>
                    </div>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </div>
          </div>
          
          <div class="mt-4 d-flex align-center justify-space-between">
            <div class="text-body-2 text-medium-emphasis">
              {{ selectedProjects.length }} repositories selected
            </div>
            <div v-if="isDiscoveringFiles" class="d-flex align-center ga-2">
              <v-progress-circular size="16" width="2" indeterminate color="primary"></v-progress-circular>
              <span class="text-body-2 text-medium-emphasis">
                Discovering files... {{ filesDiscoveredCount }}/{{ totalProjectsToDiscover }}
              </span>
            </div>
          </div>
        </v-card-text>
      </v-card>
        
      <!-- Step 2: Review Configuration -->
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon icon="mdi-cog"></v-icon>
          Step 2: Review Configuration
        </v-card-title>
        <v-card-text>
          <v-row>
            <!-- Analysis Depth -->
            <v-col cols="12" md="6">
              <v-select
                v-model="reviewConfig.depth"
                :items="[
                  { title: 'Quick Scan - Overview & main files only', value: 'quick' },
                  { title: 'Standard Review - All source files', value: 'standard' },
                  { title: 'Deep Dive - Comprehensive analysis', value: 'deep' }
                ]"
                label="Analysis Depth"
                variant="outlined"
                hide-details
              ></v-select>
            </v-col>
            
            <!-- Review Focus -->
            <v-col cols="12" md="6">
              <v-select
                v-model="reviewConfig.focus"
                :items="[
                  { title: 'Comprehensive - All areas', value: 'comprehensive' },
                  { title: 'Security Focus - Vulnerabilities & best practices', value: 'security' },
                  { title: 'Performance - Optimization opportunities', value: 'performance' },
                  { title: 'Code Quality - Standards & maintainability', value: 'quality' },
                  { title: 'Architecture - Structure & design patterns', value: 'architecture' }
                ]"
                label="Review Focus"
                variant="outlined"
                hide-details
              ></v-select>
            </v-col>
            
            <!-- File Filters -->
            <v-col cols="12">
              <v-divider class="mb-4"></v-divider>
              <div class="text-body-2 text-medium-emphasis mb-3">
                File Analysis Options:
              </div>
              
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="reviewConfig.includeExtensions"
                    label="Include Extensions"
                    placeholder=".js,.vue,.ts,.py"
                    variant="outlined"
                    hint="Comma-separated file extensions to include"
                    persistent-hint
                  ></v-text-field>
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="reviewConfig.excludePaths"
                    label="Exclude Paths"
                    placeholder="node_modules,dist,build"
                    variant="outlined"
                    hint="Comma-separated paths to exclude"
                    persistent-hint
                  ></v-text-field>
                </v-col>
              </v-row>
              
              <v-row class="mt-2">
                <v-col cols="12" md="6">
                  <v-slider
                    v-model="reviewConfig.maxFiles"
                    :min="10"
                    :max="200"
                    :step="10"
                    label="Maximum Files per Repository"
                    thumb-label="always"
                    hint="Limit analysis to most important files for large repositories"
                    persistent-hint
                  ></v-slider>
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-switch
                    v-model="reviewConfig.includeDocs"
                    label="Include Documentation Files"
                    hint="Analyze README, docs, and markdown files"
                    persistent-hint
                    hide-details
                  ></v-switch>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
        
      <!-- Actions -->
      <div class="d-flex justify-end ga-4">
        <v-btn
          @click="router.push('/')"
          variant="outlined"
        >
          Cancel
        </v-btn>
        <v-btn
          @click="startRepositoryReview"
          :disabled="!canStartReview || isAnalyzing"
          :loading="isAnalyzing"
          color="primary"
          prepend-icon="mdi-robot"
        >
          Analyze {{ selectedProjects.length }} Repository{{ selectedProjects.length !== 1 ? 'ies' : '' }}
        </v-btn>
      </div>
      
      <!-- Progress Modal -->
      <v-dialog v-model="showProgress" max-width="800" persistent>
        <v-card>
          <v-card-title class="d-flex align-center ga-2">
            <v-icon icon="mdi-robot"></v-icon>
            Analyzing Repositories
          </v-card-title>
          <v-card-text style="max-height: 500px; overflow-y: auto;">
            <div class="mb-4">
              <v-progress-linear 
                :model-value="overallProgress" 
                height="8" 
                rounded
                color="primary"
              ></v-progress-linear>
              <div class="text-body-2 text-medium-emphasis mt-2 text-center">
                {{ Math.round(overallProgress) }}% Complete - {{ completedRepositories }}/{{ selectedProjects.length }} repositories
              </div>
            </div>
            
            <v-list>
              <v-list-item
                v-for="result in analysisResults"
                :key="result.projectId"
                class="pa-3 mb-2"
                rounded="lg"
                :class="getResultCardClass(result.status)"
              >
                <template v-slot:prepend>
                  <v-icon
                    v-if="result.status === 'completed'"
                    icon="mdi-check-circle"
                    color="success"
                  ></v-icon>
                  <v-icon
                    v-else-if="result.status === 'error'"
                    icon="mdi-close-circle"
                    color="error"
                  ></v-icon>
                  <v-icon
                    v-else-if="result.status === 'analyzing'"
                    icon="mdi-robot"
                    color="primary"
                  ></v-icon>
                  <v-progress-circular
                    v-else
                    indeterminate
                    size="20"
                    color="primary"
                  ></v-progress-circular>
                </template>
                
                <v-list-item-title class="font-weight-medium">
                  {{ result.projectName }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div v-if="result.error" class="text-error">
                    {{ result.error }}
                  </div>
                  <div v-else-if="result.status === 'completed'" class="text-success">
                    Analysis complete - {{ result.filesAnalyzed }} files reviewed
                  </div>
                  <div v-else-if="result.status === 'analyzing'" class="text-primary">
                    Analyzing {{ result.currentPhase }}...
                  </div>
                  <div v-else-if="result.status === 'discovering'">
                    Discovering files...
                  </div>
                  <div v-else>
                    Waiting to start...
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
          
          <v-card-actions class="justify-space-between">
            <div class="text-body-2 text-medium-emphasis">
              <span v-if="isAnalyzing">Analysis in progress...</span>
              <span v-else-if="hasResults">Analysis complete</span>
            </div>
            <div class="d-flex ga-2">
              <v-btn
                v-if="isAnalyzing"
                @click="cancelAnalysis"
                variant="outlined"
                color="error"
              >
                Cancel
              </v-btn>
              <v-btn
                @click="viewResults"
                :disabled="!hasResults"
                color="primary"
                variant="elevated"
              >
                View Results
              </v-btn>
            </div>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import gitlabAPI from '../api/gitlab'
import geminiAPI from '../api/gemini'
import { useAuthStore } from '../stores/authStore'
import { RepositoryAnalyzer } from '../utils/repositoryAnalyzer'

const router = useRouter()
const authStore = useAuthStore()

// State
const searchQuery = ref('')
const selectedProjects = ref([])
const reviewConfig = ref({
  depth: 'standard',
  focus: 'comprehensive',
  includeExtensions: '.js,.vue,.ts,.py,.java,.cs,.rb,.go,.php,.swift',
  excludePaths: 'node_modules,dist,build,.git,coverage',
  maxFiles: 50,
  includeDocs: false
})

const isAnalyzing = ref(false)
const showProgress = ref(false)
const analysisResults = ref([])
const isDiscoveringFiles = ref(false)
const filesDiscoveredCount = ref(0)
const totalProjectsToDiscover = ref(0)

// Fetch all projects
const { data: projects, isLoading: isLoadingProjects, error: projectsError } = useQuery({
  queryKey: ['projects', 'all'],
  queryFn: () => gitlabAPI.getProjects({ membership: true, per_page: 100 }),
  enabled: !!authStore.token
})

// Filter projects based on search
const filteredProjects = computed(() => {
  if (!projects?.value) return []
  if (!searchQuery.value) return projects.value
  
  const query = searchQuery.value.toLowerCase()
  return projects.value.filter(project => 
    project.name_with_namespace.toLowerCase().includes(query) ||
    project.web_url.toLowerCase().includes(query)
  )
})

// Validation for starting review
const canStartReview = computed(() => {
  return selectedProjects.value.length > 0 && !!authStore.token
})

// Progress calculations
const completedRepositories = computed(() => {
  return analysisResults.value.filter(r => r.status === 'completed' || r.status === 'error').length
})

const overallProgress = computed(() => {
  if (selectedProjects.value.length === 0) return 0
  return (completedRepositories.value / selectedProjects.value.length) * 100
})

const hasResults = computed(() => {
  return analysisResults.value.some(r => r.status === 'completed')
})

// Toggle project selection
const toggleProject = (projectId) => {
  const index = selectedProjects.value.indexOf(projectId)
  if (index > -1) {
    selectedProjects.value = selectedProjects.value.filter(id => id !== projectId)
  } else {
    selectedProjects.value = [...selectedProjects.value, projectId]
  }
}

function getProjectName(projectId) {
  const project = projects.value?.find(p => p.id === projectId)
  return project?.name_with_namespace || 'Unknown'
}

function getResultCardClass(status) {
  switch (status) {
    case 'completed': return 'bg-success-lighten-5'
    case 'error': return 'bg-error-lighten-5'
    case 'analyzing': return 'bg-primary-lighten-5'
    default: return 'bg-grey-lighten-4'
  }
}

async function startRepositoryReview() {
  if (selectedProjects.value.length === 0) return
  
  // Check if Gemini API key is configured
  if (!geminiAPI.getApiKey()) {
    alert('Gemini API key not configured. Please add it in Settings first.')
    return
  }
  
  isAnalyzing.value = true
  showProgress.value = true
  
  // Initialize analysis results
  analysisResults.value = selectedProjects.value.map(projectId => ({
    projectId,
    projectName: getProjectName(projectId),
    status: 'pending',
    filesAnalyzed: 0,
    currentPhase: 'Initializing',
    reviewData: null
  }))
  
  // Process repositories sequentially to avoid overwhelming APIs
  for (const projectId of selectedProjects.value) {
    const resultIndex = analysisResults.value.findIndex(r => r.projectId === projectId)
    
    try {
      // Initialize analyzer with configuration
      const analyzer = new RepositoryAnalyzer({
        maxFiles: reviewConfig.value.maxFiles,
        includeConfig: true,
        includeDocs: reviewConfig.value.includeDocs,
        customExtensions: reviewConfig.value.includeExtensions
          .split(',')
          .map(ext => ext.trim())
          .filter(ext => ext),
        customExclusions: reviewConfig.value.excludePaths
          .split(',')
          .map(path => path.trim())
          .filter(path => path)
      })
      
      // Update status to discovering
      analysisResults.value[resultIndex].status = 'discovering'
      analysisResults.value[resultIndex].currentPhase = 'Discovering files'
      
      // Get project details and analyze repository structure
      const project = projects.value.find(p => p.id === projectId)
      const defaultBranch = project?.default_branch || 'main'
      
      const repositoryData = await analyzer.analyzeRepository(
        projectId, 
        defaultBranch, 
        (progress) => {
          analysisResults.value[resultIndex].currentPhase = progress.message
          if (progress.filesCount) {
            analysisResults.value[resultIndex].filesAnalyzed = progress.filesCount
          }
        }
      )
      
      // Update status to analyzing
      analysisResults.value[resultIndex].status = 'analyzing'
      analysisResults.value[resultIndex].currentPhase = 'AI analysis in progress'
      analysisResults.value[resultIndex].filesAnalyzed = repositoryData.selectedFiles
      
      // Perform AI review
      const reviewResult = await geminiAPI.reviewRepository(
        repositoryData,
        repositoryData.files,
        {
          focus: reviewConfig.value.focus,
          depth: reviewConfig.value.depth
        }
      )
      
      // Complete
      analysisResults.value[resultIndex].status = 'completed'
      analysisResults.value[resultIndex].reviewData = {
        repositoryData,
        reviewResult
      }
      
    } catch (error) {
      console.error(`Repository analysis failed for project ${projectId}:`, error)
      analysisResults.value[resultIndex].status = 'error'
      analysisResults.value[resultIndex].error = error.message
    }
  }
  
  isAnalyzing.value = false
}

function cancelAnalysis() {
  isAnalyzing.value = false
  // TODO: Implement actual cancellation logic
}

function viewResults() {
  showProgress.value = false
  
  // Get completed results
  const completedResults = analysisResults.value.filter(r => r.status === 'completed' && r.reviewData)
  
  if (completedResults.length === 0) {
    alert('No completed analyses to view.')
    return
  }
  
  // For single repository, navigate directly to results
  if (completedResults.length === 1) {
    const reviewData = completedResults[0].reviewData
    // Store in localStorage for the results page
    localStorage.setItem('repository_review_results', JSON.stringify(reviewData))
    router.push('/repository-review/results')
  } else {
    // For multiple repositories, store all results and navigate
    const allResults = {
      results: completedResults.map(r => r.reviewData),
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('repository_review_results', JSON.stringify(allResults))
    router.push('/repository-review/results')
  }
}

// Watch for project selection to trigger file discovery
// Alias unused parameter to avoid linting errors
watch(selectedProjects, async (newProjects, _oldProjects) => {
  // TODO: Implement file discovery when projects are selected
  console.log('Selected projects changed:', newProjects)
}, { immediate: false })
</script>