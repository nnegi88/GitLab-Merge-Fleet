<template>
  <v-container class="max-width-6xl">
    <v-card-title class="text-h4 font-weight-bold mb-6 pa-0">
      Bulk Branch Creation
    </v-card-title>
    
    <div class="d-flex flex-column ga-6">
      <!-- Step 1: Repository Selection -->
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon icon="mdi-source-branch"></v-icon>
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
                    {{ project.web_url }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </div>
          </div>
          
          <div class="mt-4 d-flex align-center justify-space-between">
            <div class="text-body-2 text-medium-emphasis">
              {{ selectedProjects.length }} repositories selected
            </div>
            <div v-if="isFetchingBranches" class="d-flex align-center ga-2">
              <v-progress-circular size="16" width="2" indeterminate color="primary"></v-progress-circular>
              <span class="text-body-2 text-medium-emphasis">
                Loading branches... {{ branchesLoadedCount }}/{{ totalProjectsToLoad }}
              </span>
            </div>
          </div>
        </v-card-text>
      </v-card>
        
      <!-- Step 2: Branch Details -->
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon icon="mdi-source-branch"></v-icon>
          Step 2: Branch Details
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="branchDetails.name"
                label="Branch Name"
                placeholder="feature/new-feature"
                variant="outlined"
                hint="This name will be used for all selected repositories"
                persistent-hint
              ></v-text-field>
            </v-col>
            
            <v-col cols="12">
              <v-select
                v-model="branchDetails.createFrom"
                :items="[
                  { title: 'Same Source Branch (all repositories)', value: 'same' },
                  { title: 'Different Branch (per repository)', value: 'custom' }
                ]"
                label="Create From"
                variant="outlined"
                hide-details
              ></v-select>
            </v-col>
            
            <v-col v-if="branchDetails.createFrom === 'same'" cols="12">
              <v-divider class="mb-4"></v-divider>
              <div class="text-body-2 text-medium-emphasis mb-3">
                Select the source branch for all repositories:
              </div>
              <v-combobox
                v-model="branchDetails.sameBranch"
                :items="commonBranches"
                :loading="isLoadingCommonBranches"
                label="Source Branch"
                placeholder="main"
                variant="outlined"
                hint="Select from common branches or type a custom branch name"
                persistent-hint
                clearable
              ></v-combobox>
              
              <v-alert
                v-if="commonBranchesError"
                type="warning"
                variant="tonal"
                density="compact"
                class="mt-3"
                :text="commonBranchesError"
              ></v-alert>
            </v-col>
            
            <v-col v-if="branchDetails.createFrom === 'custom'" cols="12">
              <v-divider class="mb-4"></v-divider>
              <div class="text-body-2 text-medium-emphasis mb-3">
                Select the source branch for each repository:
              </div>
              
              <!-- Branch loading errors summary -->
              <v-alert
                v-if="Object.keys(branchLoadingErrors).some(id => selectedProjects.includes(parseInt(id)) && branchLoadingErrors[id])"
                type="warning"
                variant="tonal"
                density="compact"
                class="mb-3"
              >
                <v-alert-title>Branch Loading Issues</v-alert-title>
                <div class="text-body-2">
                  <template v-if="failedProjectsInCustomMode.length <= 2">
                    Unable to load branches from: {{ failedProjectsInCustomMode.map(id => getProjectName(id)).join(', ') }}.
                  </template>
                  <template v-else>
                    Unable to load branches from {{ failedProjectsInCustomMode.length }} of {{ selectedProjects.length }} repositories.
                  </template>
                  You can still type branch names manually.
                </div>
              </v-alert>
              
              <div style="max-height: 250px; overflow-y: auto;">
                <v-row
                  v-for="projectId in selectedProjects"
                  :key="projectId"
                  align="center"
                  class="mb-2"
                >
                  <v-col cols="8">
                    <div class="text-body-2 font-weight-medium">
                      {{ getProjectName(projectId) }}
                    </div>
                  </v-col>
                  <v-col cols="4">
                    <v-combobox
                      v-model="baseBranches[projectId]"
                      :items="getProjectBranches(projectId)"
                      :loading="isProjectBranchesLoading(projectId)"
                      :error="!!branchLoadingErrors[projectId]"
                      :error-messages="branchLoadingErrors[projectId]"
                      placeholder="main"
                      variant="outlined"
                      density="compact"
                      clearable
                    >
                      <template v-slot:append-inner>
                        <v-tooltip
                          v-if="baseBranches[projectId] && !branchLoadingErrors[projectId] && !isBranchValidForProject(projectId, baseBranches[projectId])"
                          :location="$vuetify.display.mobile ? 'bottom' : 'top'"
                          max-width="300"
                        >
                          <template v-slot:activator="{ props }">
                            <v-icon
                              v-bind="props"
                              icon="mdi-alert-circle"
                              color="warning"
                              size="small"
                            ></v-icon>
                          </template>
                          <div class="text-body-2">
                            <div class="font-weight-medium">Branch not found in fetched list</div>
                            <div class="mt-1">
                              Branch '{{ baseBranches[projectId] }}' was not found in the branches we loaded for this repository.
                              It might still exist on the remote or be a new branch.
                            </div>
                          </div>
                        </v-tooltip>
                      </template>
                    </v-combobox>
                  </v-col>
                </v-row>
              </div>
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
          @click="createBulkBranches"
          :disabled="!canCreateBranches || isCreating"
          :loading="isCreating"
          color="primary"
          prepend-icon="mdi-source-branch"
        >
          Create {{ selectedProjects.length }} Branch{{ selectedProjects.length !== 1 ? 'es' : '' }}
        </v-btn>
      </div>
      
      <!-- Progress Modal -->
      <v-dialog v-model="showProgress" max-width="800" persistent>
        <v-card>
          <v-card-title>Creating Branches</v-card-title>
          <v-card-text style="max-height: 500px; overflow-y: auto;">
            <v-list>
              <v-list-item
                v-for="result in creationResults"
                :key="result.projectId"
                class="pa-2"
                :min-height="result.error ? 80 : 60"
              >
                <template v-slot:prepend>
                  <v-icon
                    v-if="result.status === 'success'"
                    icon="mdi-check-circle"
                    color="success"
                  ></v-icon>
                  <v-icon
                    v-else-if="result.status === 'error'"
                    icon="mdi-close-circle"
                    color="error"
                  ></v-icon>
                  <v-progress-circular
                    v-else
                    indeterminate
                    size="20"
                    color="primary"
                  ></v-progress-circular>
                </template>
                
                <div class="flex-grow-1">
                  <v-list-item-title class="font-weight-medium">
                    {{ result.projectName }}
                  </v-list-item-title>
                  
                  <!-- Success/pending states in subtitle -->
                  <v-list-item-subtitle v-if="result.status !== 'error'">
                    <div v-if="result.status === 'success'" class="text-success">
                      Branch created successfully
                    </div>
                    <div v-else class="text-medium-emphasis">
                      Creating branch...
                    </div>
                  </v-list-item-subtitle>
                  
                  <!-- Error state outside subtitle for full control -->
                  <div v-if="result.error" class="text-error mt-1">
                    <div class="text-caption" style="word-break: break-word; white-space: normal; line-height: 1.4;">
                      {{ result.error }}
                    </div>
                  </div>
                </div>
              </v-list-item>
            </v-list>
          </v-card-text>
          
          <v-card-actions class="justify-end">
            <v-btn
              @click="closeProgress"
              :disabled="isCreating"
              color="primary"
            >
              {{ isCreating ? 'Creating...' : 'Done' }}
            </v-btn>
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
import { useAuthStore } from '../stores/authStore'
import { useProjectBranches } from '../hooks/useProjectBranches'

const router = useRouter()
const authStore = useAuthStore()

// Use the project branches composable
const {
  // Alias unused variables to avoid linting errors
  projectBranches: _projectBranches,
  projectsLoading: _projectsLoading,
  branchLoadingErrors,
  isLoadingCommonBranches,
  isFetchingBranches,
  commonBranchesError,
  failedProjectsCount: _failedProjectsCount,
  branchesLoadedCount,
  totalProjectsToLoad,
  fetchBranchesForProject: _fetchBranchesForProject,
  fetchBranchesThrottled,
  fetchCommonBranches,
  getProjectBranches,
  isProjectBranchesLoading,
  isBranchValidForProject,
  getFailedProjectsInCustomMode
} = useProjectBranches()

const searchQuery = ref('')
const selectedProjects = ref([])
const branchDetails = ref({
  name: '',
  createFrom: 'same',
  sameBranch: ''
})
const baseBranches = ref({})

const isCreating = ref(false)
const showProgress = ref(false)
const creationResults = ref([])

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

// Validation for creating branches
const canCreateBranches = computed(() => {
  if (selectedProjects.value.length === 0 || !branchDetails.value.name) {
    return false
  }
  
  if (branchDetails.value.createFrom === 'same') {
    return !!branchDetails.value.sameBranch
  }
  
  if (branchDetails.value.createFrom === 'custom') {
    return selectedProjects.value.every(projectId => {
      const branchName = baseBranches.value[projectId]?.trim()
      return !!branchName // Basic validation - branch name is required
      // Note: We allow manual entry even if branch doesn't exist in fetched list
      // This handles cases where branch loading failed or new branches exist
    })
  }
  
  return false
})

// Helper for failed projects in custom mode
const failedProjectsInCustomMode = computed(() => {
  return getFailedProjectsInCustomMode(selectedProjects.value)
})

// Toggle project selection
const toggleProject = (projectId) => {
  const index = selectedProjects.value.indexOf(projectId)
  if (index > -1) {
    // Create a new array without the item to ensure reactivity
    selectedProjects.value = selectedProjects.value.filter(id => id !== projectId)
  } else {
    // Create a new array with the item to ensure reactivity
    selectedProjects.value = [...selectedProjects.value, projectId]
  }
}

function getProjectName(projectId) {
  const project = projects.value?.find(p => p.id === projectId)
  return project?.name_with_namespace || 'Unknown'
}


// Computed for common branches
const commonBranches = ref([])


// Watch for when repositories are selected to fetch branches
watch(selectedProjects, async (newProjects, oldProjects) => {
  // Fetch branches for newly selected projects
  const newlySelected = newProjects.filter(id => !oldProjects?.includes(id))
  
  if (newlySelected.length > 0) {
    // Use throttled fetching for better performance
    await fetchBranchesThrottled(newlySelected)
    
    // Update common branches if in 'same' mode after all fetches complete
    if (branchDetails.value.createFrom === 'same' && newProjects.length > 0) {
      const branches = await fetchCommonBranches(newProjects, getProjectName)
      commonBranches.value = branches
      
      // Auto-select a sensible default if none is selected
      if (!branchDetails.value.sameBranch && branches.length > 0) {
        // Prefer 'main' if available, otherwise use the first common branch
        const preferredDefault = branches.find(branch => branch === 'main') || 
                               branches.find(branch => branch === 'master') || 
                               branches[0]
        branchDetails.value.sameBranch = preferredDefault
      }
    } else if (branchDetails.value.createFrom === 'custom') {
      // Initialize baseBranches for newly selected projects in custom mode
      newlySelected.forEach(projectId => {
        const projectBranchList = getProjectBranches(projectId)
        const defaultBranch = projectBranchList.find(branch => branch === 'main') ||
                              projectBranchList.find(branch => branch === 'master') ||
                              projectBranchList[0] ||
                              'main'
        baseBranches.value[projectId] = defaultBranch
      })
    }
  }
}, { immediate: false })

// Watch for createFrom mode changes
watch(() => branchDetails.value.createFrom, async (newMode) => {
  if (newMode === 'same' && selectedProjects.value.length > 0) {
    // Update common branches for same mode
    const branches = await fetchCommonBranches(selectedProjects.value, getProjectName)
    commonBranches.value = branches
    
    // Auto-select a sensible default if none is selected
    if (!branchDetails.value.sameBranch && branches.length > 0) {
      // Prefer 'main' if available, otherwise use the first common branch
      const preferredDefault = branches.find(branch => branch === 'main') || 
                             branches.find(branch => branch === 'master') || 
                             branches[0]
      branchDetails.value.sameBranch = preferredDefault
    }
  } else if (newMode === 'custom') {
    // Initialize baseBranches for all selected projects with sensible defaults
    selectedProjects.value.forEach(projectId => {
      if (!baseBranches.value[projectId]) {
        // Try to use the project's default branch or 'main' as fallback
        const projectBranchList = getProjectBranches(projectId)
        const defaultBranch = projectBranchList.find(branch => branch === 'main') ||
                              projectBranchList.find(branch => branch === 'master') ||
                              projectBranchList[0] ||
                              'main'
        baseBranches.value[projectId] = defaultBranch
      }
    })
  }
}, { immediate: true })

async function createBulkBranches() {
  if (selectedProjects.value.length === 0 || !branchDetails.value.name) return
  
  isCreating.value = true
  showProgress.value = true
  creationResults.value = selectedProjects.value.map(projectId => ({
    projectId,
    projectName: getProjectName(projectId),
    status: 'pending'
  }))
  
  // Create branches in parallel with some throttling
  const promises = selectedProjects.value.map(async (projectId, index) => {
    // Add slight delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, index * 200))
    
    const resultIndex = creationResults.value.findIndex(r => r.projectId === projectId)
    
    try {
      let ref
      if (branchDetails.value.createFrom === 'custom') {
        ref = baseBranches.value[projectId] || 'main'
      } else {
        // Same branch for all repositories
        ref = branchDetails.value.sameBranch || 'main'
      }
        
      await gitlabAPI.createBranch(projectId, branchDetails.value.name, ref, { propagate401: true })
      
      creationResults.value[resultIndex] = {
        ...creationResults.value[resultIndex],
        status: 'success'
      }
    } catch (error) {
      console.error('Bulk branch creation failed for project:', projectId, error)
      
      let errorMessage = 'An unknown error occurred'
      
      if (error.response) {
        const status = error.response.status
        const apiMessage = error.response.data?.message
        
        if (status === 401) {
          errorMessage = apiMessage || 'Authentication expired. Please refresh the page to log in again.'
        } else if (status === 400 || status === 404) {
          errorMessage = apiMessage || `API Error (${status}): ${status === 404 ? 'Base branch not found' : 'Invalid branch data'}`
        } else if (status === 403) {
          errorMessage = apiMessage || 'Permission denied. You may not have access to create branches in this repository.'
        } else if (status >= 500) {
          errorMessage = apiMessage || `Server Error (${status}): Please try again later.`
        } else {
          errorMessage = apiMessage || `Unexpected API Error (${status})`
        }
      } else if (error.message) {
        errorMessage = `Request failed: ${error.message}`
      }
      
      creationResults.value[resultIndex] = {
        ...creationResults.value[resultIndex],
        status: 'error',
        error: errorMessage
      }
    }
  })
  
  await Promise.allSettled(promises)
  isCreating.value = false
}

function closeProgress() {
  if (!isCreating.value) {
    showProgress.value = false
    // Only redirect to home if user explicitly closes the modal
    // Don't auto-redirect on errors
    router.push('/')
  }
}
</script>