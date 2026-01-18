<template>
  <v-dialog v-model="isOpen" max-width="700" persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center ga-2">
        <v-icon
          :icon="actionType === 'approve' ? 'mdi-check-circle' : 'mdi-source-merge'"
          :color="isExecuting ? 'grey' : 'primary'"
        ></v-icon>
        <span v-if="!isExecuting">
          {{ actionType === 'approve' ? 'Approve' : 'Merge' }} {{ selectedMrs.length }} Merge Request{{ selectedMrs.length !== 1 ? 's' : '' }}
        </span>
        <span v-else>
          {{ actionType === 'approve' ? 'Approving' : 'Merging' }} Merge Requests
        </span>
      </v-card-title>

      <v-divider></v-divider>

      <!-- Confirmation View -->
      <v-card-text v-if="!isExecuting && results.length === 0" class="pa-4">
        <!-- Warning Message -->
        <v-alert
          type="warning"
          variant="tonal"
          icon="mdi-alert-triangle"
          class="mb-4"
        >
          <div class="font-weight-medium mb-2">
            {{ actionType === 'approve' ? 'Batch Approval' : 'Batch Merge' }} Confirmation
          </div>
          <div>
            You are about to {{ actionType === 'approve' ? 'approve' : 'merge' }}
            <strong>{{ selectedMrs.length }}</strong> merge request{{ selectedMrs.length !== 1 ? 's' : '' }}.
            <template v-if="actionType === 'merge'">
              This action will merge all selected merge requests that are ready to be merged.
            </template>
            This action cannot be undone.
          </div>
        </v-alert>

        <!-- Selected MRs List -->
        <div class="mb-4">
          <div class="text-subtitle-2 font-weight-bold mb-2">
            Selected Merge Requests:
          </div>
          <div style="max-height: 300px; overflow-y: auto;" class="border rounded">
            <v-list density="compact">
              <v-list-item
                v-for="mr in selectedMrs"
                :key="mr.id"
                class="pa-3"
              >
                <template v-slot:prepend>
                  <v-icon
                    icon="mdi-source-merge"
                    size="small"
                    color="primary"
                  ></v-icon>
                </template>

                <v-list-item-title class="font-weight-medium">
                  {{ mr.title }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-body-2">
                  <div class="d-flex align-center flex-wrap ga-2 mt-1">
                    <span>{{ mr.references.full }}</span>
                    <span class="text-medium-emphasis">•</span>
                    <span>{{ mr.source_branch }} → {{ mr.target_branch }}</span>
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
        </div>
      </v-card-text>

      <!-- Progress/Results View -->
      <v-card-text v-else style="max-height: 400px; overflow-y: auto;" class="pa-4">
        <v-list>
          <v-list-item
            v-for="result in results"
            :key="result.mrId"
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
              {{ result.mrTitle }}
            </v-list-item-title>
            <v-list-item-subtitle>
              <div class="text-body-2 text-medium-emphasis mb-1">
                {{ result.mrReference }}
              </div>
              <div v-if="result.error" class="text-error text-body-2">
                {{ result.error }}
              </div>
              <div v-else-if="result.status === 'success'" class="text-success text-body-2">
                {{ actionType === 'approve' ? 'Approved successfully' : 'Merged successfully' }}
              </div>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-divider></v-divider>

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <!-- Confirmation Actions -->
        <template v-if="!isExecuting && results.length === 0">
          <v-spacer></v-spacer>
          <v-btn
            @click="handleCancel"
            variant="outlined"
          >
            Cancel
          </v-btn>
          <v-btn
            @click="handleConfirm"
            color="primary"
            :prepend-icon="actionType === 'approve' ? 'mdi-check-circle' : 'mdi-source-merge'"
          >
            {{ actionType === 'approve' ? 'Approve All' : 'Merge All' }}
          </v-btn>
        </template>

        <!-- Progress/Results Actions -->
        <template v-else>
          <div v-if="isExecuting" class="text-body-2 text-medium-emphasis">
            {{ completedCount }} of {{ selectedMrs.length }} completed
          </div>
          <v-spacer></v-spacer>
          <v-btn
            @click="handleClose"
            :disabled="isExecuting"
            color="primary"
          >
            {{ isExecuting ? `${actionType === 'approve' ? 'Approving' : 'Merging'}...` : 'Done' }}
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  selectedMrs: {
    type: Array,
    default: () => []
  },
  actionType: {
    type: String,
    default: 'approve',
    validator: (value) => ['approve', 'merge'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel', 'complete'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isExecuting = ref(false)
const results = ref([])

const completedCount = computed(() => {
  return results.value.filter(r => r.status === 'success' || r.status === 'error').length
})

// Reset state when dialog opens
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    results.value = []
    isExecuting.value = false
  }
})

const handleCancel = () => {
  emit('cancel')
  isOpen.value = false
}

const handleConfirm = () => {
  isExecuting.value = true

  // Initialize results with pending status
  results.value = props.selectedMrs.map(mr => ({
    mrId: mr.id,
    mrTitle: mr.title,
    mrReference: mr.references.full,
    projectId: mr.project_id,
    iid: mr.iid,
    status: 'pending'
  }))

  emit('confirm', results)
}

const handleClose = () => {
  if (!isExecuting.value) {
    emit('complete')
    isOpen.value = false
  }
}

// Expose methods to parent component
const updateResult = (mrId, status, error = null) => {
  const index = results.value.findIndex(r => r.mrId === mrId)
  if (index !== -1) {
    results.value[index] = {
      ...results.value[index],
      status,
      error
    }
  }
}

const finishExecution = () => {
  isExecuting.value = false
}

defineExpose({
  updateResult,
  finishExecution
})
</script>
