import { ref, reactive, computed } from 'vue'
import gitlabAPI from '../api/gitlab'

// Default branch names that are commonly used across repositories
const DEFAULT_BRANCH_NAMES = ['main', 'master', 'develop', 'development']

export function useProjectBranches(options = {}) {
  // Allow customization of default branches
  const defaultBranches = options.defaultBranches || DEFAULT_BRANCH_NAMES
  // Reactive state for branches - using reactive for cleaner object updates
  const projectBranches = reactive({}) // { projectId: ['branch1', 'branch2'] }
  const projectsLoading = reactive({}) // { projectId: true/false }
  const branchLoadingErrors = reactive({}) // { projectId: 'error message' }
  const isLoadingCommonBranches = ref(false)
  const isFetchingBranches = ref(false) // Global indicator for batch fetching
  const commonBranchesError = ref(null) // Error message for common branches calculation
  const failedProjectsCount = ref(0) // Count of projects that failed to fetch branches
  const branchesLoadedCount = ref(0) // Count of projects that have loaded branches
  const totalProjectsToLoad = ref(0) // Total projects to load for progress

  // Function to fetch branches for a project
  async function fetchBranchesForProject(projectId) {
    if (projectBranches[projectId] || projectsLoading[projectId]) {
      return // Already have data or already loading
    }
    
    // Direct updates with reactive objects
    projectsLoading[projectId] = true
    branchLoadingErrors[projectId] = null
    
    try {
      const branches = await gitlabAPI.getBranches(projectId)
      const branchNames = branches.map(branch => branch.name)
      projectBranches[projectId] = branchNames
    } catch (error) {
      console.error(`Failed to fetch branches for project ${projectId}:`, error)
      // Standardized error message format
      const errorMessage = error.response?.data?.message || error.message || 'Unable to load branches'
      branchLoadingErrors[projectId] = errorMessage
      projectBranches[projectId] = []
    } finally {
      projectsLoading[projectId] = false
    }
  }

  // Throttled branch fetching for performance
  async function fetchBranchesThrottled(projectIds) {
    if (projectIds.length === 0) return
    
    isFetchingBranches.value = true
    totalProjectsToLoad.value = projectIds.length
    branchesLoadedCount.value = 0
    
    try {
      const BATCH_SIZE = 5 // Fetch 5 projects at a time
      const DELAY_BETWEEN_BATCHES = 100 // 100ms delay between batches
      
      for (let i = 0; i < projectIds.length; i += BATCH_SIZE) {
        const batch = projectIds.slice(i, i + BATCH_SIZE)
        
        // Fetch batch in parallel
        await Promise.all(batch.map(async (projectId) => {
          await fetchBranchesForProject(projectId)
          branchesLoadedCount.value++
        }))
        
        // Add delay between batches to avoid overwhelming the API
        if (i + BATCH_SIZE < projectIds.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
        }
      }
    } finally {
      isFetchingBranches.value = false
    }
  }

  // Function to fetch common branches across selected projects
  async function fetchCommonBranches(selectedProjects, getProjectName) {
    if (selectedProjects.length === 0) return []
    
    isLoadingCommonBranches.value = true
    commonBranchesError.value = null
    failedProjectsCount.value = 0
    
    try {
      // Wait for all project branches to be fetched before calculating common branches
      await Promise.all(
        selectedProjects.map(projectId => fetchBranchesForProject(projectId))
      )
      
      // Count failed projects for user feedback
      const failedProjects = selectedProjects.filter(projectId => 
        branchLoadingErrors[projectId]
      )
      failedProjectsCount.value = failedProjects.length
      
      // Get branches from all projects (after they're all loaded)
      const allBranches = selectedProjects.map(projectId => {
        return projectBranches[projectId] || []
      })
      
      // Set error message if some projects failed
      if (failedProjects.length > 0) {
        const successfulProjects = selectedProjects.length - failedProjects.length
        const failedProjectNames = failedProjects.map(id => getProjectName(id))
        
        if (successfulProjects === 0) {
          if (failedProjects.length <= 3) {
            commonBranchesError.value = `Unable to load branches from: ${failedProjectNames.join(', ')}. Using default branches.`
          } else {
            commonBranchesError.value = `Unable to load branches from all ${failedProjects.length} repositories. Using default branches.`
          }
        } else {
          if (failedProjects.length <= 2) {
            commonBranchesError.value = `Unable to load branches from: ${failedProjectNames.join(', ')}. Common branches may be incomplete.`
          } else {
            commonBranchesError.value = `Unable to load branches from ${failedProjects.length} of ${selectedProjects.length} repositories. Common branches may be incomplete.`
          }
        }
      }
      
      // Find common branches across all projects - optimized algorithm
      const successfulBranches = allBranches.filter(branches => branches.length > 0)
      
      // If no projects loaded successfully, return only defaults
      if (successfulBranches.length === 0) {
        if (failedProjects.length > 0) {
          // All failed - be explicit about using defaults only
          return defaultBranches
        }
        // No branches found in any project (empty repos)
        return defaultBranches
      }
      
      // Calculate actual common branches
      const sortedBranches = successfulBranches.sort((a, b) => a.length - b.length)
      const branchSets = sortedBranches.slice(1).map(branches => new Set(branches))
      
      const actualCommonBranches = sortedBranches[0].filter(branch => {
        return branchSets.every(branchSet => branchSet.has(branch))
      })
      
      // Always include default branches, but prioritize actual common branches
      const commonSet = new Set(actualCommonBranches)
      
      // Put actual common branches first, then add missing defaults
      const result = [
        ...actualCommonBranches,
        ...defaultBranches.filter(branch => !commonSet.has(branch))
      ]
      
      return result
    } catch (error) {
      console.error('Failed to fetch common branches:', error)
      commonBranchesError.value = 'Unable to calculate common branches. Using default branches.'
      return ['main', 'master', 'develop']
    } finally {
      isLoadingCommonBranches.value = false
    }
  }

  // Computed getters
  const getProjectBranches = computed(() => {
    return (projectId) => {
      return projectBranches[projectId] || []
    }
  })

  const isProjectBranchesLoading = computed(() => {
    return (projectId) => {
      return projectsLoading[projectId] || false
    }
  })

  // Helper to check if a custom branch exists in the project's fetched branches
  const isBranchValidForProject = computed(() => {
    return (projectId, branchName) => {
      if (!branchName?.trim()) return false
      
      const projectBranchList = projectBranches[projectId] || []
      const hasError = branchLoadingErrors[projectId]
      
      // If we have an error, we can't validate - assume it's valid (manual entry)
      if (hasError) return true
      
      // If no branches loaded, assume it's valid (manual entry)
      if (projectBranchList.length === 0) return true
      
      // Check if the branch exists in the fetched list
      return projectBranchList.includes(branchName.trim())
    }
  })

  // Helper for failed projects in custom mode
  const getFailedProjectsInCustomMode = (selectedProjects) => {
    return selectedProjects.filter(projectId => 
      branchLoadingErrors[projectId]
    )
  }

  return {
    // State
    projectBranches,
    projectsLoading,
    branchLoadingErrors,
    isLoadingCommonBranches,
    isFetchingBranches,
    commonBranchesError,
    failedProjectsCount,
    branchesLoadedCount,
    totalProjectsToLoad,
    
    // Functions
    fetchBranchesForProject,
    fetchBranchesThrottled,
    fetchCommonBranches,
    
    // Computed
    getProjectBranches,
    isProjectBranchesLoading,
    isBranchValidForProject,
    getFailedProjectsInCustomMode
  }
}