<template>
  <v-card>
    <v-card-text class="pa-4">
      <!-- Main filters row -->
      <v-row align="center" class="mb-4">
        <v-col cols="12" md="6">
          <v-text-field
            :model-value="filters.search"
            @update:model-value="updateFilter('search', $event)"
            placeholder="Search merge requests..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            hide-details
            density="compact"
          ></v-text-field>
        </v-col>
        
        <v-col cols="12" md="6">
          <div class="d-flex align-center ga-3 flex-wrap">
            <div class="d-flex align-center ga-2">
              <v-icon icon="mdi-filter" size="small"></v-icon>
              <span class="text-body-2 font-weight-medium">Filters:</span>
            </div>
            
            <v-select
              :model-value="filters.state"
              @update:model-value="updateFilter('state', $event)"
              :items="[
                { title: 'Open', value: 'opened' },
                { title: 'Merged', value: 'merged' },
                { title: 'Closed', value: 'closed' },
                { title: 'All', value: 'all' }
              ]"
              variant="outlined"
              hide-details
              density="compact"
              style="min-width: 100px;"
            ></v-select>
            
            <v-select
              :model-value="filters.scope"
              @update:model-value="updateFilter('scope', $event)"
              :items="[
                { title: 'All MRs', value: 'all' },
                { title: 'Created by me', value: 'created_by_me' },
                { title: 'Assigned to me', value: 'assigned_to_me' }
              ]"
              variant="outlined"
              hide-details
              density="compact"
              style="min-width: 140px;"
            ></v-select>
            
            <v-btn
              @click="showAdvanced = !showAdvanced"
              variant="outlined"
              size="small"
              :prepend-icon="showAdvanced ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            >
              Advanced
            </v-btn>
          </div>
        </v-col>
      </v-row>
      
      <!-- Advanced filters -->
      <v-expand-transition>
        <div v-if="showAdvanced">
          <v-divider class="mb-4"></v-divider>
          <v-row>
            <v-col cols="12" md="4">
              <v-text-field
                :model-value="filters.labels?.join(',')"
                @update:model-value="updateFilter('labels', $event ? $event.split(',') : [])"
                label="Labels"
                placeholder="bug,feature (comma separated)"
                variant="outlined"
                hide-details
                density="compact"
              ></v-text-field>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-text-field
                :model-value="filters.author"
                @update:model-value="updateFilter('author', $event)"
                label="Author"
                placeholder="Username"
                variant="outlined"
                hide-details
                density="compact"
              ></v-text-field>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-text-field
                :model-value="filters.assignee"
                @update:model-value="updateFilter('assignee', $event)"
                label="Assignee"
                placeholder="Username"
                variant="outlined"
                hide-details
                density="compact"
              ></v-text-field>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-text-field
                :model-value="filters.milestone"
                @update:model-value="updateFilter('milestone', $event)"
                label="Milestone"
                placeholder="Milestone title"
                variant="outlined"
                hide-details
                density="compact"
              ></v-text-field>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-select
                :model-value="filters.orderBy || 'created_at'"
                @update:model-value="updateFilter('orderBy', $event)"
                :items="[
                  { title: 'Created Date', value: 'created_at' },
                  { title: 'Updated Date', value: 'updated_at' },
                  { title: 'Title', value: 'title' }
                ]"
                label="Sort By"
                variant="outlined"
                hide-details
                density="compact"
              ></v-select>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-select
                :model-value="filters.wip || 'all'"
                @update:model-value="updateFilter('wip', $event)"
                :items="[
                  { title: 'All', value: 'all' },
                  { title: 'Only Drafts', value: 'yes' },
                  { title: 'Exclude Drafts', value: 'no' }
                ]"
                label="Draft/WIP"
                variant="outlined"
                hide-details
                density="compact"
              ></v-select>
            </v-col>
            
            <v-col cols="12" class="d-flex justify-end">
              <v-btn
                @click="resetFilters"
                variant="outlined"
                prepend-icon="mdi-refresh"
              >
                Reset Filters
              </v-btn>
            </v-col>
          </v-row>
        </div>
      </v-expand-transition>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  filters: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:filters'])
const showAdvanced = ref(false)

const updateFilter = (key, value) => {
  emit('update:filters', { ...props.filters, [key]: value })
}

const resetFilters = () => {
  emit('update:filters', {
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
  showAdvanced.value = false
}
</script>