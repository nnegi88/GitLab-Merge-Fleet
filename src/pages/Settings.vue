<template>
  <v-container class="max-width-4xl">
    <v-card-title class="text-h4 font-weight-bold mb-6 pa-0">Settings</v-card-title>

    <div class="d-flex flex-column ga-6">
      <!-- Account Information -->
      <v-card>
        <v-card-title class="text-h6">Account Information</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <div class="mb-4">
                <v-label class="text-caption text-medium-emphasis mb-1">GitLab Instance</v-label>
                <div class="text-body-1">{{ authStore.gitlabUrl }}</div>
              </div>
              
              <div v-if="authStore.user" class="mb-4">
                <v-label class="text-caption text-medium-emphasis mb-1">Username</v-label>
                <div class="text-body-1">@{{ authStore.user.username }}</div>
              </div>
            </v-col>
            
            <v-col cols="12" md="6">
              <div v-if="authStore.user?.name" class="mb-4">
                <v-label class="text-caption text-medium-emphasis mb-1">Name</v-label>
                <div class="text-body-1">{{ authStore.user.name }}</div>
              </div>
              
              <div v-if="authStore.user?.email" class="mb-4">
                <v-label class="text-caption text-medium-emphasis mb-1">Email</v-label>
                <div class="text-body-1">{{ authStore.user.email }}</div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Security Settings -->
      <v-card>
        <v-card-title class="text-h6">Security</v-card-title>
        <v-card-text>
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-body-1 font-weight-medium">Session Only Storage</div>
              <div class="text-body-2 text-medium-emphasis">
                Don't persist authentication after browser close
              </div>
            </div>
            <v-switch
              :model-value="authStore.sessionOnly"
              @update:model-value="authStore.setSessionOnly"
              color="primary"
              hide-details
            ></v-switch>
          </div>
        </v-card-text>
      </v-card>

      <!-- AI Integration -->
      <v-card>
        <v-card-title class="text-h6">AI Integration</v-card-title>
        <v-card-text>
          <!-- API Key guidance -->
          <v-alert
            v-if="!geminiApiKey"
            variant="outlined"
            type="warning"
            icon="mdi-key-alert"
            class="mb-4"
          >
            <template v-slot:title>
              API Key Required for AI Features
            </template>
            <div class="text-body-2">
              To use AI-powered repository analysis, you'll need a free Google Gemini API key. 
              Visit <a href="https://ai.google.dev/" target="_blank" class="text-primary">ai.google.dev</a> 
              to get started.
            </div>
          </v-alert>
          <div class="d-flex flex-column ga-4">
            <v-tooltip
              text="Get a free API key from https://ai.google.dev/ - stored securely in your browser"
              location="top"
            >
              <template v-slot:activator="{ props }">
                <v-text-field
                  v-bind="props"
                  v-model="geminiApiKey"
                  type="password"
                  label="Google Gemini API Key"
                  placeholder="Enter your Gemini API key"
                  prepend-inner-icon="mdi-key"
                  variant="outlined"
                  hint="Required for AI-powered code review features. Get your API key from Google AI Studio."
                  persistent-hint
                ></v-text-field>
              </template>
            </v-tooltip>

            <v-alert
              type="info"
              variant="tonal"
              icon="mdi-information"
              text="Your API key is stored locally in your browser and never sent to our servers."
            ></v-alert>

            <v-alert
              v-if="saved"
              type="success"
              variant="tonal"
              icon="mdi-check-circle"
              text="Settings saved successfully!"
            ></v-alert>

            <div class="d-flex ga-3">
              <v-btn
                @click="testGeminiConnection"
                :disabled="!geminiApiKey || isTesting"
                :loading="isTesting"
                variant="outlined"
                prepend-icon="mdi-key"
              >
                Test Connection
              </v-btn>
              
              <v-btn
                @click="handleSave"
                color="primary"
                prepend-icon="mdi-content-save"
              >
                Save Settings
              </v-btn>
            </div>

            <!-- Test Results -->
            <div v-if="testResult">
              <v-alert
                v-if="testResult.success"
                type="success"
                variant="tonal"
                icon="mdi-check-circle"
                :text="testResult.message"
              ></v-alert>
              
              <v-alert
                v-else
                type="error"
                variant="tonal"
                icon="mdi-close-circle"
                :text="testResult.error"
              ></v-alert>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import geminiAPI from '../api/gemini'

const authStore = useAuthStore()
const saved = ref(false)
const geminiApiKey = ref('')
const isTesting = ref(false)
const testResult = ref(null)

onMounted(() => {
  geminiApiKey.value = localStorage.getItem('gemini_api_key') || ''
})

const handleSave = () => {
  if (geminiApiKey.value) {
    localStorage.setItem('gemini_api_key', geminiApiKey.value)
  } else {
    localStorage.removeItem('gemini_api_key')
  }
  
  saved.value = true
  testResult.value = null
  setTimeout(() => {
    saved.value = false
  }, 3000)
}

const testGeminiConnection = async () => {
  if (!geminiApiKey.value) return
  
  isTesting.value = true
  testResult.value = null
  
  // Temporarily save the key for testing
  const originalKey = localStorage.getItem('gemini_api_key')
  localStorage.setItem('gemini_api_key', geminiApiKey.value)
  
  try {
    const result = await geminiAPI.testConnection()
    testResult.value = result
  } catch (error) {
    testResult.value = {
      success: false,
      error: error.message
    }
  } finally {
    // Restore original key
    if (originalKey) {
      localStorage.setItem('gemini_api_key', originalKey)
    } else {
      localStorage.removeItem('gemini_api_key')
    }
    isTesting.value = false
  }
}
</script>