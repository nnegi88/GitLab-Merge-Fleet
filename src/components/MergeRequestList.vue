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
      hover
      @click="$router.push(`/mr/${mr.project_id}/${mr.iid}`)"
      style="cursor: pointer;"
    >
      <v-card-text class="pa-6">
        <div class="d-flex justify-space-between align-start">
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
          
          <div class="ml-6 d-flex flex-column align-end ga-2">
            <v-chip
              :color="getApprovalStatus(mr).color"
              size="small"
              variant="text"
            >
              {{ getApprovalStatus(mr).text }}
            </v-chip>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { formatDistanceToNow } from '../utils/dateUtils'

defineProps({
  mergeRequests: {
    type: Array,
    default: () => []
  }
})


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
</script>