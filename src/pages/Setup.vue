<template>
  <v-container class="layout-full-page-content d-flex justify-center align-center">
    <v-card class="mx-auto" max-width="600" elevation="8">
      <v-card-text class="pa-8">
        <div class="text-center mb-6">
          <v-card-title class="text-h4 font-weight-bold mb-2 pa-0">
            Welcome to GitLab Merge Fleet
          </v-card-title>
          <v-card-subtitle class="text-body-1 pa-0">
            Connect your GitLab account to start managing merge requests across multiple repositories.
          </v-card-subtitle>
        </div>

        <v-form @submit.prevent="handleSubmit">
          <div class="d-flex flex-column ga-6">
            <v-text-field
              v-model="authStore.gitlabUrl"
              type="url"
              label="GitLab Instance URL"
              placeholder="https://gitlab.example.com"
              prepend-inner-icon="mdi-web"
              variant="outlined"
              hint="The URL of your GitLab instance"
              persistent-hint
              required
            ></v-text-field>

            <div>
              <v-text-field
                v-model="token"
                type="password"
                label="Personal Access Token"
                placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                prepend-inner-icon="mdi-key"
                variant="outlined"
                hint="Required scopes: api, read_repository, write_repository"
                persistent-hint
                required
              >
                <template v-slot:append>
                  <v-btn
                    :href="`${authStore.gitlabUrl}/-/profile/personal_access_tokens`"
                    target="_blank"
                    icon="mdi-open-in-new"
                    variant="text"
                    size="small"
                    title="Create token"
                  ></v-btn>
                </template>
              </v-text-field>
            </div>

            <v-checkbox
              v-model="authStore.sessionOnly"
              label="Session only (don't persist token after browser close)"
              color="primary"
              hide-details
            ></v-checkbox>

            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              icon="mdi-alert-circle"
              :text="error"
            ></v-alert>

            <v-alert
              v-if="success"
              type="success"
              variant="tonal"
              icon="mdi-check-circle"
              text="Successfully connected! Redirecting to dashboard..."
            ></v-alert>

            <v-btn
              type="submit"
              :disabled="loading || !token"
              :loading="loading"
              color="primary"
              size="large"
              block
              prepend-icon="mdi-source-branch"
            >
              {{ loading ? 'Connecting...' : 'Connect to GitLab' }}
            </v-btn>
          </div>
        </v-form>

        <v-alert
          type="info"
          variant="tonal"
          icon="mdi-shield-check"
          class="mt-6"
        >
          <div class="font-weight-medium mb-2">Security Note</div>
          <div>
            Your Personal Access Token is encrypted and stored locally in your browser. 
            It never leaves your device and is not sent to any external servers.
          </div>
        </v-alert>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import gitlabAPI from '../api/gitlab'

const router = useRouter()
const authStore = useAuthStore()

const token = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  success.value = false

  try {
    // Set the token temporarily for testing
    await authStore.setToken(token.value)
    
    // Test the connection
    const testResult = await gitlabAPI.testConnection()
    
    if (testResult.success) {
      // Get user information
      const user = await gitlabAPI.getCurrentUser()
      authStore.setUser(user)
      success.value = true
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/')
      }, 1000)
    } else {
      throw new Error(testResult.error || 'Connection failed')
    }
  } catch (err) {
    error.value = err.message || 'Failed to connect to GitLab'
    await authStore.setToken(null)
  } finally {
    loading.value = false
  }
}
</script>