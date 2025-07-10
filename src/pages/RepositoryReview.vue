<template>
  <v-container class="max-width-6xl">
    <v-card-title class="text-h4 font-weight-bold mb-6 pa-0">
      Repository Code Review
    </v-card-title>
    
    <!-- Guidance Banner for new users -->
    <v-alert
      variant="tonal"
      type="info"
      icon="mdi-lightbulb-outline"
      class="mb-6"
    >
      <template v-slot:title>
        Getting Started with AI Code Review
      </template>
      <div class="text-body-2">
        Follow these 3 simple steps to analyze your repository with AI:
        <div class="mt-2">
          <strong>1.</strong> Select a repository from your GitLab projects
          <br>
          <strong>2.</strong> Choose the branch you want to analyze
          <br>
          <strong>3.</strong> Configure review settings and click "Analyze Repository"
        </div>
      </div>
    </v-alert>
    
    <div class="d-flex flex-column ga-6">
      <!-- Step 1: Repository Selection -->
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon icon="mdi-source-repository"></v-icon>
          Step 1: Select Repository
        </v-card-title>
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis mb-3">
            Select a single repository to analyze
          </div>
          <v-tooltip
            text="Search by repository name or URL"
            location="top"
          >
            <template v-slot:activator="{ props }">
              <v-text-field
                v-bind="props"
                v-model="searchQuery"
                placeholder="Search repositories..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                hide-details
                class="mb-4"
              ></v-text-field>
            </template>
          </v-tooltip>
          
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
                    <v-radio
                      :model-value="selectedProject === project.id"
                      :value="project.id"
                      @update:model-value="selectedProject = project.id"
                      hide-details
                    ></v-radio>
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
              {{ selectedProject ? '1 repository selected' : 'No repository selected' }}
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

      <!-- Step 2: Branch Selection -->
      <v-card v-if="selectedProject">
        <v-card-title class="d-flex align-center ga-2">
          <v-icon icon="mdi-source-branch"></v-icon>
          Step 2: Select Branch
        </v-card-title>
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis mb-3">
            Select the branch to analyze
          </div>
          
          <!-- Branch selection guidance -->
          <v-alert
            v-if="!selectedBranch"
            variant="outlined"
            type="info"
            icon="mdi-information-outline"
            class="mb-3"
            density="compact"
          >
            <div class="text-body-2">
              <strong>Tip:</strong> Most repositories use <code>main</code> or <code>master</code> as the default branch. 
              Feature branches like <code>develop</code> or <code>feature/*</code> can also be analyzed.
            </div>
          </v-alert>
          
          <v-select
            v-model="selectedBranch"
            :items="branchItems"
            :loading="isLoadingBranches"
            :disabled="isLoadingBranches"
            :error-messages="branchError"
            label="Target Branch"
            variant="outlined"
            item-title="name"
            item-value="name"
            item-disabled="disabled"
            prepend-inner-icon="mdi-source-branch"
            clearable
            @update:search="branchSearchQuery = $event"
          >
            <template v-slot:prepend-item>
              <v-tooltip
                text="Use fuzzy search: 'mb' matches 'main-branch', 'dev' matches 'develop'"
                location="top"
              >
                <template v-slot:activator="{ props }">
                  <v-text-field
                    v-bind="props"
                    v-model="branchSearchQuery"
                    placeholder="Search branches..."
                    class="mx-3 mb-2"
                    prepend-inner-icon="mdi-magnify"
                    variant="outlined"
                    density="compact"
                    hide-details
                    single-line
                  ></v-text-field>
                </template>
              </v-tooltip>
            </template>
            
            <template v-slot:loader>
              <v-progress-linear
                indeterminate
                color="primary"
                class="mb-0"
              ></v-progress-linear>
            </template>
          </v-select>
          
          <div v-if="selectedBranch" class="mt-2 text-body-2">
            <div class="d-flex align-center ga-2">
              <v-icon 
                v-if="!isLoadingBranches && !isBranchValid" 
                icon="mdi-alert-circle" 
                color="error" 
                size="small"
              ></v-icon>
              <v-icon 
                v-else-if="!isLoadingBranches && isBranchValid" 
                icon="mdi-check-circle" 
                color="success" 
                size="small"
              ></v-icon>
              <span :class="{ 'text-medium-emphasis': isBranchValid, 'text-error': !isBranchValid }">
                Selected branch: <strong>{{ selectedBranch }}</strong>
              </span>
            </div>
          </div>
        </v-card-text>
      </v-card>
        
      <!-- Step 3: Review Configuration -->
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon icon="mdi-cog"></v-icon>
          Step 3: Review Configuration
        </v-card-title>
        <v-card-text>
          <!-- Configuration guidance -->
          <v-alert
            variant="outlined"
            type="success"
            icon="mdi-check-circle-outline"
            class="mb-4"
            density="compact"
          >
            <div class="text-body-2">
              <strong>Recommended for first-time users:</strong> Keep the default settings below. 
              You can adjust "Analysis Depth" based on your repository size (Standard works well for most projects).
            </div>
          </v-alert>
          <v-row>
            <!-- Analysis Depth -->
            <v-col cols="12" md="6">
              <v-tooltip
                text="Quick Scan: ~10 files | Standard: ~50 files | Deep Dive: All files"
                location="top"
              >
                <template v-slot:activator="{ props }">
                  <v-select
                    v-bind="props"
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
                </template>
              </v-tooltip>
            </v-col>
            
            <!-- Review Focus -->
            <v-col cols="12" md="6">
              <v-tooltip
                text="Choose the primary focus area for AI analysis"
                location="top"
              >
                <template v-slot:activator="{ props }">
                  <v-select
                    v-bind="props"
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
                </template>
              </v-tooltip>
            </v-col>
            
            <!-- File Filters -->
            <v-col cols="12">
              <v-divider class="mb-4"></v-divider>
              <div class="text-body-2 text-medium-emphasis mb-3">
                File Analysis Options:
              </div>
              
              <v-row>
                <v-col cols="12" md="6">
                  <v-tooltip
                    text="Only analyze files with these extensions (e.g., .js,.vue,.ts)"
                    location="top"
                  >
                    <template v-slot:activator="{ props }">
                      <v-text-field
                        v-bind="props"
                        v-model="reviewConfig.includeExtensions"
                        label="Include Extensions"
                        placeholder=".js,.vue,.ts,.py"
                        variant="outlined"
                        hint="Comma-separated file extensions to include"
                        persistent-hint
                      ></v-text-field>
                    </template>
                  </v-tooltip>
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-tooltip
                    text="Skip these directories during analysis (e.g., node_modules)"
                    location="top"
                  >
                    <template v-slot:activator="{ props }">
                      <v-text-field
                        v-bind="props"
                        v-model="reviewConfig.excludePaths"
                        label="Exclude Paths"
                        placeholder="node_modules,dist,build"
                        variant="outlined"
                        hint="Comma-separated paths to exclude"
                        persistent-hint
                      ></v-text-field>
                    </template>
                  </v-tooltip>
                </v-col>
              </v-row>
              
              <v-row class="mt-2">
                <v-col cols="12" md="6">
                  <v-tooltip
                    text="Adjust based on repository size and analysis time"
                    location="top"
                  >
                    <template v-slot:activator="{ props }">
                      <v-slider
                        v-bind="props"
                        v-model="reviewConfig.maxFiles"
                        :min="10"
                        :max="200"
                        :step="10"
                        label="Maximum Files per Repository"
                        thumb-label="always"
                        hint="Limit analysis to most important files for large repositories"
                        persistent-hint
                      ></v-slider>
                    </template>
                  </v-tooltip>
                </v-col>
                
                <v-col cols="12" md="6">
                  <v-tooltip
                    text="Include .md, .txt, and documentation files in analysis"
                    location="top"
                  >
                    <template v-slot:activator="{ props }">
                      <v-switch
                        v-bind="props"
                        v-model="reviewConfig.includeDocs"
                        label="Include Documentation Files"
                        hint="Analyze README, docs, and markdown files"
                        persistent-hint
                        hide-details
                      ></v-switch>
                    </template>
                  </v-tooltip>
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
        <v-tooltip
          :text="getAnalyzeButtonTooltip"
          :disabled="canStartReview && !isAnalyzing"
          location="top"
        >
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
              @click="startRepositoryReview"
              :disabled="!canStartReview || isAnalyzing"
              :loading="isAnalyzing"
              color="primary"
              prepend-icon="mdi-robot"
            >
              Analyze Repository
            </v-btn>
          </template>
        </v-tooltip>
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
                {{ Math.round(overallProgress) }}% Complete
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
import { useProjectBranches } from '../hooks/useProjectBranches'

const router = useRouter()
const authStore = useAuthStore()

// Branch composable
const { 
  fetchBranchesForProject, 
  getProjectBranches, 
  isProjectBranchesLoading,
  branchLoadingErrors 
} = useProjectBranches()

// State
const searchQuery = ref('')
const selectedProject = ref(null)
const selectedBranch = ref(null)
const branchSearchQuery = ref('')
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

// Branch dropdown computed properties
const isLoadingBranches = computed(() => {
  return selectedProject.value ? isProjectBranchesLoading.value(selectedProject.value) : false
})

// Common branch patterns to prioritize
const COMMON_BRANCH_PATTERNS = [
  'main',
  'master', 
  'develop',
  'development',
  'staging',
  'production',
  'release',
  'hotfix'
]

// Maximum branches to show initially (before search)
const MAX_INITIAL_BRANCHES = 20

const branchError = computed(() => {
  const errors = []
  
  // API loading errors
  if (selectedProject.value) {
    const loadingError = branchLoadingErrors[selectedProject.value]
    if (loadingError) errors.push(loadingError)
  }
  
  // Validation errors
  if (branchValidationError.value) {
    errors.push(branchValidationError.value)
  }
  
  return errors.length > 0 ? errors : null
})

const branchItems = computed(() => {
  if (!selectedProject.value) return []
  
  const branches = getProjectBranches.value(selectedProject.value)
  const items = branches.map(branch => ({ name: branch }))
  
  // If searching, apply enhanced filter logic
  if (branchSearchQuery.value && branchSearchQuery.value.trim() !== '') {
    const query = branchSearchQuery.value.toLowerCase().trim()
    
    // Escape special regex characters in the query
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    
    // Create regex pattern for fuzzy matching
    // Allow characters to be separated (e.g., "mb" matches "main-branch")
    const fuzzyPattern = escapeRegex(query).split('').join('.*')
    const fuzzyRegex = new RegExp(fuzzyPattern, 'i')
    
    // Score and filter branches
    const scoredItems = items
      .map(item => {
        const name = item.name.toLowerCase()
        let score = 0
        
        // Exact match gets highest score
        if (name === query) {
          score = 1000
        }
        // Starts with query gets high score
        else if (name.startsWith(query)) {
          score = 800
        }
        // Contains exact query gets medium score
        else if (name.includes(query)) {
          score = 600
        }
        // Fuzzy match gets lower score based on match position
        else if (fuzzyRegex.test(name)) {
          const matchIndex = name.search(fuzzyRegex)
          score = 400 - matchIndex // Earlier matches score higher
        }
        
        return { ...item, score }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    
    // Return without scores for v-select
    return scoredItems.map(({ score, ...item }) => item)
  }
  
  // No search query - apply smart sorting and limiting
  // First, separate and prioritize common branches
  const commonBranches = []
  const otherBranches = []
  
  items.forEach(item => {
    const branchName = item.name.toLowerCase()
    const isCommon = COMMON_BRANCH_PATTERNS.some(pattern => 
      branchName === pattern || 
      branchName.startsWith(pattern + '/') ||
      branchName.startsWith(pattern + '-')
    )
    
    if (isCommon) {
      commonBranches.push(item)
    } else {
      otherBranches.push(item)
    }
  })
  
  // Sort each group alphabetically
  commonBranches.sort((a, b) => a.name.localeCompare(b.name))
  otherBranches.sort((a, b) => a.name.localeCompare(b.name))
  
  // Combine groups, with common branches first
  const sortedItems = [...commonBranches, ...otherBranches]
  
  // For very large lists, limit initial display
  if (sortedItems.length > MAX_INITIAL_BRANCHES) {
    const limitedItems = sortedItems.slice(0, MAX_INITIAL_BRANCHES)
    // Add a hint item to show more branches exist
    limitedItems.push({
      name: `... and ${sortedItems.length - MAX_INITIAL_BRANCHES} more branches (type to search)`,
      disabled: true
    })
    return limitedItems
  }
  
  return sortedItems
})

// Branch validation
const isBranchValid = computed(() => {
  if (!selectedBranch.value || !selectedProject.value) return true // No validation needed if nothing selected
  
  const branches = getProjectBranches.value(selectedProject.value)
  return branches.includes(selectedBranch.value)
})

const branchValidationError = computed(() => {
  if (!selectedBranch.value || !selectedProject.value) return null
  if (isLoadingBranches.value) return null // Don't show error while loading
  
  if (!isBranchValid.value) {
    return `Branch "${selectedBranch.value}" not found in repository`
  }
  return null
})

// Validation for starting review
const canStartReview = computed(() => {
  return selectedProject.value !== null && 
         selectedBranch.value !== null && 
         isBranchValid.value &&
         !!authStore.token
})

// Progress calculations
const completedRepositories = computed(() => {
  return analysisResults.value.filter(r => r.status === 'completed' || r.status === 'error').length
})

const overallProgress = computed(() => {
  if (!selectedProject.value) return 0
  return completedRepositories.value > 0 ? 100 : 0
})

const hasResults = computed(() => {
  return analysisResults.value.some(r => r.status === 'completed')
})

const getAnalyzeButtonTooltip = computed(() => {
  if (!selectedProject.value) {
    return 'Please select a repository first'
  }
  if (!selectedBranch.value) {
    return 'Please select a branch'
  }
  if (!isBranchValid.value) {
    return `Branch "${selectedBranch.value}" is not valid. Please select an existing branch.`
  }
  if (!authStore.token) {
    return 'Authentication required'
  }
  if (isAnalyzing.value) {
    return 'Analysis in progress...'
  }
  return ''
})


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
  if (!selectedProject.value) return
  
  // Check if Gemini API key is configured
  if (!geminiAPI.getApiKey()) {
    alert('Gemini API key not configured. Please add it in Settings first.')
    return
  }
  
  isAnalyzing.value = true
  showProgress.value = true
  
  // Initialize analysis results
  analysisResults.value = [{
    projectId: selectedProject.value,
    projectName: getProjectName(selectedProject.value),
    status: 'pending',
    filesAnalyzed: 0,
    currentPhase: 'Initializing',
    reviewData: null
  }]
  
  // Process the single selected repository
  const projectId = selectedProject.value
  {
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
      const branch = selectedBranch.value || project?.default_branch || 'main'
      
      const repositoryData = await analyzer.analyzeRepository(
        projectId, 
        branch, 
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
          depth: reviewConfig.value.depth,
          branch: branch
        }
      )
      
      // Complete
      analysisResults.value[resultIndex].status = 'completed'
      analysisResults.value[resultIndex].reviewData = {
        repositoryData,
        reviewResult,
        reviewConfiguration: {
          repository: {
            id: projectId,
            name: project.name_with_namespace,
            selectedBranch: branch
          },
          reviewConfig: {
            focus: reviewConfig.value.focus,
            depth: reviewConfig.value.depth,
            includeExtensions: reviewConfig.value.includeExtensions,
            excludePaths: reviewConfig.value.excludePaths,
            maxFiles: reviewConfig.value.maxFiles,
            includeDocs: reviewConfig.value.includeDocs
          }
        }
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

// Watch for project selection to fetch branches
watch(selectedProject, async (newProject, _oldProject) => {
  if (newProject) {
    // Reset branch selection when project changes
    selectedBranch.value = null
    branchSearchQuery.value = ''
    
    // Fetch branches for the selected project
    await fetchBranchesForProject(newProject)
    
    // Find the project's default branch and pre-select it
    const project = projects.value?.find(p => p.id === newProject)
    if (project?.default_branch) {
      const branches = getProjectBranches.value(newProject)
      if (branches.includes(project.default_branch)) {
        selectedBranch.value = project.default_branch
      }
    }
  } else {
    // Clear branch selection when no project is selected
    selectedBranch.value = null
    branchSearchQuery.value = ''
  }
}, { immediate: false })
</script>