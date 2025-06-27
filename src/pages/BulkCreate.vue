<template>
  <v-container class="max-width-6xl">
    <v-card-title class="text-h4 font-weight-bold mb-6 pa-0">
      Bulk Merge Request Creation
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
          
          <div class="mt-4 text-body-2 text-medium-emphasis">
            {{ selectedProjects.length }} repositories selected
          </div>
        </v-card-text>
      </v-card>
        
      <!-- Step 2: MR Details -->
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon icon="mdi-source-merge"></v-icon>
          Step 2: Merge Request Details
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="mrDetails.sourceBranch"
                label="Source Branch"
                placeholder="feature/new-feature"
                variant="outlined"
                hide-details
              ></v-text-field>
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="mrDetails.targetBranch"
                label="Target Branch"
                placeholder="main"
                variant="outlined"
                hide-details
              ></v-text-field>
            </v-col>
            
            <v-col cols="12">
              <v-text-field
                v-model="mrDetails.title"
                label="Title"
                placeholder="Add new feature"
                variant="outlined"
                hide-details
              ></v-text-field>
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="mrDetails.description"
                label="Description"
                placeholder="Describe the changes..."
                variant="outlined"
                rows="5"
                hide-details
              ></v-textarea>
            </v-col>
            
            <v-col cols="12">
              <v-checkbox
                v-model="mrDetails.removeSourceBranch"
                label="Delete source branch when merge request is accepted"
                color="primary"
                hide-details
              ></v-checkbox>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
        
      <!-- Validation Warning -->
      <v-alert
        v-if="selectedProjects.length > 0 && mrDetails.sourceBranch && mrDetails.targetBranch"
        type="warning"
        variant="tonal"
        icon="mdi-alert-triangle"
      >
        <div class="font-weight-medium mb-2">Branch Validation</div>
        <div class="mb-2">
          Before creating merge requests, we'll verify that both source branch 
          <v-chip size="small" variant="outlined" class="mx-1">{{ mrDetails.sourceBranch }}</v-chip> and target branch 
          <v-chip size="small" variant="outlined" class="mx-1">{{ mrDetails.targetBranch }}</v-chip> exist in each repository.
        </div>
        <div>
          Repositories without these branches will be skipped with an error message.
        </div>
      </v-alert>
      
      <!-- Actions -->
      <div class="d-flex justify-end ga-4">
        <v-btn
          @click="router.push('/')"
          variant="outlined"
        >
          Cancel
        </v-btn>
        <v-btn
          @click="createBulkMRs"
          :disabled="selectedProjects.length === 0 || !mrDetails.title || !mrDetails.sourceBranch || !mrDetails.targetBranch || isCreating"
          :loading="isCreating"
          color="primary"
          prepend-icon="mdi-source-merge"
        >
          Create {{ selectedProjects.length }} Merge Request{{ selectedProjects.length !== 1 ? 's' : '' }}
        </v-btn>
      </div>
        
      <!-- Progress Modal -->
      <v-dialog v-model="showProgress" max-width="600" persistent>
        <v-card>
          <v-card-title>Creating Merge Requests</v-card-title>
          <v-card-text style="max-height: 400px; overflow-y: auto;">
            <v-list>
              <v-list-item
                v-for="result in creationResults"
                :key="result.projectId"
                class="pa-2"
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
                
                <v-list-item-title class="font-weight-medium">
                  {{ result.projectName }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div v-if="result.error" class="text-error">
                    {{ result.error }}
                  </div>
                  <div v-else-if="result.mrUrl">
                    <v-btn
                      :href="result.mrUrl"
                      target="_blank"
                      variant="text"
                      size="small"
                      prepend-icon="mdi-open-in-new"
                    >
                      View MR
                    </v-btn>
                  </div>
                </v-list-item-subtitle>
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import gitlabAPI from '../api/gitlab'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const searchQuery = ref('')
const selectedProjects = ref([])
const mrDetails = ref({
  sourceBranch: '',
  targetBranch: 'main',
  title: '',
  description: '',
  removeSourceBranch: true
})

const isCreating = ref(false)
const showProgress = ref(false)
const creationResults = ref([])

// Fetch all projects
const { data: projects, isLoading: isLoadingProjects, error: projectsError } = useQuery({
  queryKey: ['projects', 'all'],
  queryFn: () => gitlabAPI.getProjects({ membership: true, per_page: 100 }),
  enabled: !!authStore.token
})

// Filter projects based on search and sort selected repositories to top
const filteredProjects = computed(() => {
  if (!projects?.value) return []
  
  // Always start with a copy of the projects array to avoid mutations
  let filtered = [...projects.value]
  
  // Apply search filter if query exists
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(project => 
      project.name_with_namespace.toLowerCase().includes(query) ||
      project.web_url.toLowerCase().includes(query)
    )
  }
  
  // Sort selected repositories to the top for improved UX - keeps selected items visible
  // and easily manageable when dealing with large repository lists
  return filtered.sort((a, b) => {
    const aSelected = selectedProjects.value.includes(a.id)
    const bSelected = selectedProjects.value.includes(b.id)
    
    if (aSelected && !bSelected) return -1 // a is selected, b is not -> a comes first
    if (!aSelected && bSelected) return 1  // a is not selected, b is -> b comes first
    return 0 // Both have same selection status -> maintain original order
  })
})

// Toggle project selection
const toggleProject = (projectId) => {
  const index = selectedProjects.value.indexOf(projectId)
  if (index > -1) {
    selectedProjects.value.splice(index, 1)
  } else {
    selectedProjects.value.push(projectId)
  }
}

async function createBulkMRs() {
  if (selectedProjects.value.length === 0 || !mrDetails.value.title) return
  
  isCreating.value = true
  showProgress.value = true
  creationResults.value = selectedProjects.value.map(projectId => {
    const project = projects.value.find(p => p.id === projectId)
    return {
      projectId,
      projectName: project?.name_with_namespace || 'Unknown',
      status: 'pending'
    }
  })
  
  // Create MRs in parallel with some throttling
  const promises = selectedProjects.value.map(async (projectId, index) => {
    // Add slight delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, index * 200))
    
    const resultIndex = creationResults.value.findIndex(r => r.projectId === projectId)
    
    try {
      // First, validate that both source and target branches exist
      const branches = await gitlabAPI.getBranches(projectId)
      const branchNames = branches.map(b => b.name)
      
      const sourceBranchExists = branchNames.includes(mrDetails.value.sourceBranch)
      const targetBranchExists = branchNames.includes(mrDetails.value.targetBranch)
      
      if (!sourceBranchExists) {
        throw new Error(`Source branch '${mrDetails.value.sourceBranch}' does not exist`)
      }
      
      if (!targetBranchExists) {
        throw new Error(`Target branch '${mrDetails.value.targetBranch}' does not exist`)
      }
      
      const mr = await gitlabAPI.createMergeRequest(projectId, {
        source_branch: mrDetails.value.sourceBranch,
        target_branch: mrDetails.value.targetBranch,
        title: mrDetails.value.title,
        description: mrDetails.value.description,
        remove_source_branch: mrDetails.value.removeSourceBranch
      })
      
      creationResults.value[resultIndex] = {
        ...creationResults.value[resultIndex],
        status: 'success',
        mrUrl: mr.web_url
      }
    } catch (error) {
      creationResults.value[resultIndex] = {
        ...creationResults.value[resultIndex],
        status: 'error',
        error: error.response?.data?.message || error.message
      }
    }
  })
  
  await Promise.allSettled(promises)
  isCreating.value = false
}

function closeProgress() {
  if (!isCreating.value) {
    showProgress.value = false
    router.push('/')
  }
}
</script>