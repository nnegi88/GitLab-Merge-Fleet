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

  <div v-else>
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Merge Requests</h1>
      <div class="d-flex ga-3">
        <v-btn
          color="success"
          to="/bulk-branch"
          prepend-icon="mdi-source-branch"
        >
          Bulk Create Branches
        </v-btn>
        <v-btn
          color="primary"
          to="/bulk-create"
          prepend-icon="mdi-source-merge"
        >
          Bulk Create MRs
        </v-btn>
        <v-btn
          color="gitlab"
          to="/repository-review"
          prepend-icon="mdi-robot"
        >
          Repository Review
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

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" md="4">
        <v-card>
          <v-card-text>
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">Total Open</div>
                <div class="text-h4 font-weight-bold">{{ stats.total }}</div>
              </div>
              <v-icon icon="mdi-source-merge" size="x-large" color="primary"></v-icon>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card>
          <v-card-text>
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">Draft</div>
                <div class="text-h4 font-weight-bold">{{ stats.draft }}</div>
              </div>
              <v-icon icon="mdi-file-document-edit-outline" size="x-large" color="grey"></v-icon>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card>
          <v-card-text>
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">Approved</div>
                <div class="text-h4 font-weight-bold">{{ stats.approved }}</div>
              </div>
              <v-icon icon="mdi-check-circle" size="x-large" color="success"></v-icon>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

    </v-row>

    <!-- Filter Bar -->
    <FilterBar v-model:filters="filters" class="mb-6" />

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

    <!-- Merge Request List -->
    <MergeRequestList v-else :merge-requests="data || []" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '../stores/authStore'
import gitlabAPI from '../api/gitlab'
import FilterBar from '../components/FilterBar.vue'
import MergeRequestList from '../components/MergeRequestList.vue'

const authStore = useAuthStore()
const filters = ref({
  state: 'opened',
  scope: 'all',
  search: '',
  labels: [],
  author: '',
  assignee: '',
  milestone: '',
  orderBy: 'created_at',
  wip: 'all'
})

const { 
  data, 
  isLoading, 
  error,
  refetch,
  isFetching
} = useQuery({
  queryKey: ['mergeRequests', filters],
  queryFn: () => gitlabAPI.getMergeRequests(filters.value),
  refetchInterval: 60000, // Refresh every minute
  enabled: computed(() => !!authStore.token)
})

const stats = computed(() => {
  const mergeRequests = data.value || []
  
  return {
    total: mergeRequests.length,
    draft: mergeRequests.filter(mr => mr.draft || mr.work_in_progress).length,
    approved: mergeRequests.filter(mr => mr.approvals_required === 0 || 
      (mr.approved_by && mr.approved_by.length >= (mr.approvals_required || 1))).length
  }
})
</script>