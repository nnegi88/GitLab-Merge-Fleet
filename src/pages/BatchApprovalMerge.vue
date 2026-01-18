<template>
  <div v-if="!authStore.token" class="text-center">
    <v-card class="mx-auto" max-width="400">
      <v-card-title class="text-h5">Not Connected</v-card-title>
      <v-card-text>Please connect to GitLab first.</v-card-text>
      <v-card-actions class="justify-center">
        <v-btn
          color="primary"
          size="large"
          to="/setup"
          prepend-icon="mdi-source-branch"
        >
          Connect to GitLab
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>

  <v-container v-else class="max-width-6xl">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Batch Approve & Merge</h1>
        <p class="text-body-2 text-medium-emphasis mt-2">
          Select multiple merge requests to approve or merge them in batch
        </p>
      </div>
      <div class="d-flex ga-3">
        <v-btn
          variant="outlined"
          to="/"
          prepend-icon="mdi-arrow-left"
        >
          Back to Dashboard
        </v-btn>
        <v-btn
          variant="outlined"
          @click="refetch"
          :loading="isFetching"
          prepend-icon="mdi-refresh"
        >
          Refresh
        </v-btn>
      </div>
    </div>

    <!-- Filter Options -->
    <v-card class="mb-6">
      <v-card-text class="pa-4">
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center ga-4">
            <span class="text-body-1 font-weight-medium">Show:</span>
            <v-chip-group
              v-model="filterType"
              mandatory
              selected-class="text-primary"
            >
              <v-chip
                value="all"
                variant="outlined"
                prepend-icon="mdi-format-list-bulleted"
              >
                All MRs ({{ allMrCount }})
              </v-chip>
              <v-chip
                value="needs-approval"
                variant="outlined"
                prepend-icon="mdi-clock-outline"
                color="warning"
              >
                Needs Approval ({{ needsApprovalCount }})
              </v-chip>
              <v-chip
                value="ready-to-merge"
                variant="outlined"
                prepend-icon="mdi-check-circle"
                color="success"
              >
                Ready to Merge ({{ readyToMergeCount }})
              </v-chip>
            </v-chip-group>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Selection Summary & Actions -->
    <v-card class="mb-6">
      <v-card-text class="pa-4">
        <div class="d-flex align-center justify-space-between">
          <div>
            <div class="text-h6">
              {{ selectedMrIds.length }} merge request{{ selectedMrIds.length !== 1 ? 's' : '' }} selected
            </div>
            <div v-if="selectedMrIds.length > 0" class="text-body-2 text-medium-emphasis mt-1">
              Ready to approve or merge the selected merge requests
            </div>
          </div>
          <div class="d-flex ga-3">
            <v-btn
              v-if="selectedMrIds.length > 0"
              @click="clearSelection"
              variant="text"
              prepend-icon="mdi-close"
            >
              Clear Selection
            </v-btn>
            <v-btn
              @click="openApprovalDialog"
              :disabled="selectedMrIds.length === 0 || isOperating"
              color="success"
              prepend-icon="mdi-check-circle"
            >
              Approve Selected ({{ selectedMrIds.length }})
            </v-btn>
            <v-btn
              @click="openMergeDialog"
              :disabled="selectedMrIds.length === 0 || isOperating"
              color="primary"
              prepend-icon="mdi-source-merge"
            >
              Merge Selected ({{ selectedMrIds.length }})
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="isLoading" class="d-flex align-center justify-center" style="height: 300px;">
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
      ></v-progress-circular>
    </div>

    <!-- Error State -->
    <v-alert
      v-else-if="error"
      type="error"
      variant="outlined"
      icon="mdi-alert-circle"
      title="Error loading merge requests"
      :text="error.message"
      class="mb-6"
    >
      <template v-slot:append>
        <v-btn
          color="error"
          variant="outlined"
          @click="refetch"
        >
          Try Again
        </v-btn>
      </template>
    </v-alert>

    <!-- Merge Request List with Selection -->
    <MRSelectionCard
      v-else
      :merge-requests="filteredMrs"
      :selected-mr-ids="selectedMrIds"
      @update:selected-mr-ids="selectedMrIds = $event"
    />

    <!-- Batch Action Dialog -->
    <BatchActionDialog
      v-model="showDialog"
      :selected-mrs="selectedMrs"
      :action-type="currentAction"
      @confirm="handleBatchOperation"
      @cancel="showDialog = false"
      @complete="handleOperationComplete"
      ref="batchDialogRef"
    />
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '../stores/authStore'
import gitlabAPI from '../api/gitlab'
import MRSelectionCard from '../components/MRSelectionCard.vue'
import BatchActionDialog from '../components/BatchActionDialog.vue'

const authStore = useAuthStore()
const selectedMrIds = ref([])
const showDialog = ref(false)
const currentAction = ref('approve')
const isOperating = ref(false)
const batchDialogRef = ref(null)
const filterType = ref('all')

// Fetch merge requests
const {
  data,
  isLoading,
  error,
  refetch,
  isFetching
} = useQuery({
  queryKey: ['mergeRequests', { state: 'opened', scope: 'all' }],
  queryFn: () => gitlabAPI.getMergeRequests({ state: 'opened', scope: 'all' }),
  refetchInterval: 60000,
  enabled: computed(() => !!authStore.token)
})

// Helper function to check if MR needs approval
const needsApproval = (mr) => {
  // Check if MR has required approvals
  const approvalsRequired = mr.approvals_required || 0
  const approvedBy = mr.approved_by || []
  return approvedBy.length < approvalsRequired
}

// Helper function to check if MR is ready to merge
const isReadyToMerge = (mr) => {
  const mergeStatus = mr.merge_status || mr.detailed_merge_status
  return mergeStatus === 'can_be_merged'
}

// Filtered merge requests based on selected filter
const filteredMrs = computed(() => {
  if (!data.value) return []

  switch (filterType.value) {
    case 'needs-approval':
      return data.value.filter(mr => needsApproval(mr))
    case 'ready-to-merge':
      return data.value.filter(mr => isReadyToMerge(mr))
    case 'all':
    default:
      return data.value
  }
})

// Counts for filter chips
const allMrCount = computed(() => data.value?.length || 0)
const needsApprovalCount = computed(() =>
  data.value?.filter(mr => needsApproval(mr)).length || 0
)
const readyToMergeCount = computed(() =>
  data.value?.filter(mr => isReadyToMerge(mr)).length || 0
)

// Get selected MRs
const selectedMrs = computed(() => {
  if (!data.value) return []
  return data.value.filter(mr => selectedMrIds.value.includes(mr.id))
})

// Clear selection
const clearSelection = () => {
  selectedMrIds.value = []
}

// Open approval dialog
const openApprovalDialog = () => {
  currentAction.value = 'approve'
  showDialog.value = true
}

// Open merge dialog
const openMergeDialog = () => {
  currentAction.value = 'merge'
  showDialog.value = true
}

// Get merge status error message
const getMergeStatusError = (mergeStatus) => {
  switch (mergeStatus) {
    case 'cannot_be_merged':
      return 'Cannot merge: merge conflicts exist'
    case 'cannot_be_merged_recheck':
      return 'Cannot merge: recheck needed'
    case 'ci_must_pass':
      return 'Cannot merge: CI must pass first'
    case 'ci_still_running':
      return 'Cannot merge: CI pipeline still running'
    case 'discussions_not_resolved':
      return 'Cannot merge: unresolved discussions'
    case 'draft_status':
      return 'Cannot merge: MR is in draft status'
    case 'not_approved':
      return 'Cannot merge: approval required'
    case 'blocked_status':
      return 'Cannot merge: MR is blocked'
    case 'checking':
      return 'Cannot merge: merge status still being checked'
    case 'unchecked':
      return 'Cannot merge: merge status not checked yet'
    default:
      return `Cannot merge: status is ${mergeStatus}`
  }
}

// Handle batch operation (approve or merge)
const handleBatchOperation = async (results) => {
  isOperating.value = true

  // Process each MR sequentially with throttling (like BulkCreate.vue pattern)
  for (const result of results.value) {
    try {
      if (currentAction.value === 'approve') {
        await gitlabAPI.approveMergeRequest(result.projectId, result.iid)
        batchDialogRef.value?.updateResult(result.mrId, 'success')
      } else {
        // For merge operation, validate merge status first
        const mr = selectedMrs.value.find(m => m.id === result.mrId)
        const mergeStatus = mr?.merge_status || mr?.detailed_merge_status

        // Only attempt to merge if status is 'can_be_merged'
        if (mergeStatus === 'can_be_merged') {
          await gitlabAPI.mergeMergeRequest(result.projectId, result.iid, {
            should_remove_source_branch: false,
            merge_when_pipeline_succeeds: false
          })
          batchDialogRef.value?.updateResult(result.mrId, 'success')
        } else {
          // MR is not mergeable, report error without attempting merge
          const errorMessage = getMergeStatusError(mergeStatus)
          batchDialogRef.value?.updateResult(result.mrId, 'error', errorMessage)
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error'
      batchDialogRef.value?.updateResult(result.mrId, 'error', errorMessage)
    }

    // Throttle requests (200ms delay like BulkCreate.vue)
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  // Mark operation as complete
  batchDialogRef.value?.finishExecution()
  isOperating.value = false
}

// Handle operation complete
const handleOperationComplete = () => {
  // Clear selection and refetch data
  selectedMrIds.value = []
  refetch()
}
</script>
