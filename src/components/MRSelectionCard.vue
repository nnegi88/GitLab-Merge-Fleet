<template>
  <v-card v-if="mergeRequests.length === 0" class="text-center pa-8">
    <v-icon icon="mdi-source-merge" size="x-large" color="grey-lighten-1" class="mb-4"></v-icon>
    <v-card-title class="text-h6 mb-2">No merge requests found</v-card-title>
    <v-card-text>
      There are no open merge requests matching your filters.
    </v-card-text>
  </v-card>

  <div v-else class="space-y-4">
    <v-card
      v-for="mr in mergeRequests"
      :key="mr.id"
      class="mb-4"
      :class="{ 'border-primary': isSelected(mr.id) }"
      hover
    >
      <v-card-text class="pa-6">
        <div class="d-flex justify-space-between align-start">
          <div class="d-flex align-start flex-grow-1" style="min-width: 0;">
            <v-checkbox
              :model-value="isSelected(mr.id)"
              @update:model-value="toggleSelection(mr.id)"
              hide-details
              class="mr-4 mt-0"
              color="primary"
            ></v-checkbox>

            <div class="flex-grow-1" style="min-width: 0;">
              <div class="d-flex align-center mb-2">
                <v-card-title class="pa-0 text-h6 flex-grow-1" style="line-height: 1.2;">
                  {{ mr.title }}
                </v-card-title>

                <v-btn
                  :href="mr.web_url"
                  target="_blank"
                  icon="mdi-open-in-new"
                  variant="text"
                  size="small"
                  class="ml-2"
                  @click.stop
                ></v-btn>

                <v-chip
                  v-if="mr.draft || mr.work_in_progress"
                  size="small"
                  variant="outlined"
                  class="ml-2"
                >
                  Draft
                </v-chip>
              </div>

              <div class="d-flex align-center flex-wrap mb-2 text-body-2">
                <div class="d-flex align-center mr-4 mb-1">
                  <v-icon icon="mdi-source-branch" size="small" class="mr-1"></v-icon>
                  <span>{{ mr.source_branch }} → {{ mr.target_branch }}</span>
                </div>

                <div class="d-flex align-center mr-4 mb-1">
                  <v-icon icon="mdi-account" size="small" class="mr-1"></v-icon>
                  <span>{{ mr.author.username }}</span>
                </div>

                <div class="d-flex align-center mr-4 mb-1">
                  <v-icon icon="mdi-clock-outline" size="small" class="mr-1"></v-icon>
                  <span>{{ formatDistanceToNow(mr.created_at) }}</span>
                </div>

                <div class="d-flex align-center mr-4 mb-1">
                  <v-icon icon="mdi-comment-outline" size="small" class="mr-1"></v-icon>
                  <span>{{ mr.user_notes_count }}</span>
                </div>
              </div>

              <div class="mb-2 text-body-2">
                <a
                  :href="mr.web_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-decoration-none"
                >
                  {{ mr.references.full }}
                </a>
              </div>

              <div v-if="mr.labels.length > 0" class="d-flex flex-wrap ga-2">
                <v-chip
                  v-for="label in mr.labels"
                  :key="label"
                  size="small"
                  variant="outlined"
                  prepend-icon="mdi-tag"
                >
                  {{ label }}
                </v-chip>
              </div>
            </div>
          </div>

          <div class="ml-6 d-flex flex-column align-end ga-2" style="min-width: 150px;">
            <v-chip
              :color="getApprovalStatus(mr).color"
              size="small"
              variant="text"
            >
              {{ getApprovalStatus(mr).text }}
            </v-chip>

            <v-chip
              :color="getPipelineStatus(mr).color"
              size="small"
              variant="text"
              :prepend-icon="getPipelineStatus(mr).icon"
            >
              {{ getPipelineStatus(mr).text }}
            </v-chip>

            <v-chip
              :color="getMergeStatus(mr).color"
              size="small"
              variant="text"
            >
              {{ getMergeStatus(mr).text }}
            </v-chip>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { formatDistanceToNow } from '../utils/dateUtils'

const props = defineProps({
  mergeRequests: {
    type: Array,
    default: () => []
  },
  selectedMrIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:selectedMrIds'])

const isSelected = (mrId) => {
  return props.selectedMrIds.includes(mrId)
}

const toggleSelection = (mrId) => {
  const currentSelection = [...props.selectedMrIds]
  const index = currentSelection.indexOf(mrId)

  if (index > -1) {
    currentSelection.splice(index, 1)
  } else {
    currentSelection.push(mrId)
  }

  emit('update:selectedMrIds', currentSelection)
}

const getApprovalStatus = (mr) => {
  if (!mr.approvals_required || mr.approvals_required === 0) {
    return { text: 'No approval required', color: 'grey' }
  }

  const approvedCount = mr.approved_by?.length || 0
  if (approvedCount >= mr.approvals_required) {
    return { text: 'Approved', color: 'success' }
  }

  return {
    text: `${approvedCount}/${mr.approvals_required} approvals`,
    color: 'warning'
  }
}

const getPipelineStatus = (mr) => {
  const status = mr.head_pipeline?.status || mr.pipeline?.status

  if (!status) {
    return { text: 'No pipeline', color: 'grey', icon: 'mdi-minus-circle' }
  }

  switch (status) {
    case 'success':
      return { text: 'Pipeline passed', color: 'success', icon: 'mdi-check-circle' }
    case 'failed':
      return { text: 'Pipeline failed', color: 'error', icon: 'mdi-close-circle' }
    case 'running':
      return { text: 'Pipeline running', color: 'info', icon: 'mdi-loading' }
    case 'pending':
      return { text: 'Pipeline pending', color: 'warning', icon: 'mdi-clock-outline' }
    case 'canceled':
      return { text: 'Pipeline canceled', color: 'grey', icon: 'mdi-cancel' }
    case 'skipped':
      return { text: 'Pipeline skipped', color: 'grey', icon: 'mdi-skip-forward' }
    default:
      return { text: status, color: 'grey', icon: 'mdi-help-circle' }
  }
}

const getMergeStatus = (mr) => {
  const status = mr.merge_status || mr.detailed_merge_status

  switch (status) {
    case 'can_be_merged':
      return { text: 'Ready to merge', color: 'success' }
    case 'cannot_be_merged':
      return { text: 'Conflicts', color: 'error' }
    case 'checking':
      return { text: 'Checking...', color: 'info' }
    case 'unchecked':
      return { text: 'Not checked', color: 'grey' }
    case 'cannot_be_merged_recheck':
      return { text: 'Recheck needed', color: 'warning' }
    case 'ci_must_pass':
      return { text: 'CI must pass', color: 'warning' }
    case 'ci_still_running':
      return { text: 'CI running', color: 'info' }
    case 'discussions_not_resolved':
      return { text: 'Discussions open', color: 'warning' }
    case 'draft_status':
      return { text: 'Draft', color: 'grey' }
    case 'not_approved':
      return { text: 'Not approved', color: 'warning' }
    case 'blocked_status':
      return { text: 'Blocked', color: 'error' }
    default:
      return { text: status || 'Unknown', color: 'grey' }
  }
}
</script>
