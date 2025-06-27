<template>
  <v-app-bar elevation="1" color="white">
    <v-container class="d-flex align-center justify-space-between">
      <v-btn 
        variant="text" 
        to="/" 
        class="text-none"
        prepend-icon="mdi-source-branch"
      >
        <span class="text-h6 font-weight-medium">GitLab Merge Fleet</span>
      </v-btn>
      
      <div v-if="authStore.token" class="d-flex align-center">
        <v-chip 
          v-if="authStore.user" 
          variant="outlined" 
          prepend-icon="mdi-account"
          class="mr-4"
        >
          {{ authStore.user.name || authStore.user.username }}
        </v-chip>
        
        <v-btn
          icon="mdi-cog"
          variant="text"
          to="/settings"
          :color="$route.name === 'settings' ? 'primary' : 'default'"
        ></v-btn>
        
        <v-btn
          icon="mdi-logout"
          variant="text"
          @click="handleLogout"
          title="Logout"
        ></v-btn>
      </div>
    </v-container>
  </v-app-bar>
  
  <v-main>
    <v-container class="mt-8">
      <slot />
    </v-container>
  </v-main>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = () => {
  authStore.clearToken()
  router.push('/setup')
}
</script>