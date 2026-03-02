<template>
  <v-app-bar color="surface" elevation="0" border="b">
    <v-app-bar-title>
      <router-link to="/" style="text-decoration: none; color: inherit;">
        <div class="d-flex align-center">
          <img src="/DeveStreamingPlatform.png" alt="Deve Streaming Platform" class="mr-2" style="height: 32px; width: 32px;" />
          <span class="text-h6 font-weight-bold">Deve Streaming Platform</span>
        </div>
      </router-link>
    </v-app-bar-title>

    <v-spacer></v-spacer>

    <!-- Version badge - clickable link to GitHub releases -->
    <v-chip
      class="mr-2"
      color="surface-variant"
      variant="flat"
      size="small"
      href="https://github.com/devedse/DeveStreamingPlatform/releases"
      target="_blank"
      rel="noopener noreferrer"
      style="cursor: pointer; text-decoration: none;"
    >
      <v-icon icon="mdi-information-outline" start size="small"></v-icon>
      v{{ appVersion }}
    </v-chip>

    <!-- Viewer count badge -->
    <v-chip
      v-if="totalViewers > 0"
      class="mr-4"
      color="primary"
      variant="flat"
    >
      <v-icon icon="mdi-eye" start></v-icon>
      {{ totalViewers }} {{ totalViewers === 1 ? 'viewer' : 'viewers' }}
    </v-chip>

    <!-- Multi-stream view button -->
    <v-btn
      icon="mdi-view-grid"
      @click="navigateToMultiStream"
      :color="isMultiStreamView ? 'primary' : undefined"
    ></v-btn>

    <!-- Theme toggle button -->
    <v-btn
      :icon="theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
      @click="toggleTheme"
    ></v-btn>

    <!-- Login/Logout button -->
    <v-btn
      v-if="authStore.isAuthenticated"
      icon="mdi-logout"
      @click="handleLogout"
    >
      <v-icon>mdi-logout</v-icon>
      <v-tooltip activator="parent" location="bottom">Logout</v-tooltip>
    </v-btn>
    <v-btn
      v-else
      icon="mdi-login"
      @click="showLogin = true"
    >
      <v-icon>mdi-login</v-icon>
      <v-tooltip activator="parent" location="bottom">Login</v-tooltip>
    </v-btn>

    <!-- Login Dialog -->
    <LoginDialog v-model="showLogin" />
  </v-app-bar>
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStreamStore } from '@/stores/streams'
import { useAuthStore } from '@/stores/auth'
import { APP_VERSION } from '@/version'
import LoginDialog from '@/components/auth/LoginDialog.vue'

const theme = useTheme()
const router = useRouter()
const route = useRoute()
const streamStore = useStreamStore()
const authStore = useAuthStore()

const totalViewers = computed(() => streamStore.totalViewers)
const appVersion = APP_VERSION
const isMultiStreamView = computed(() => route.name === 'multi-stream')
const showLogin = ref(false)

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}

function navigateToMultiStream() {
  router.push('/streams/multi')
}

async function handleLogout() {
  await authStore.logout()
  // Refresh streams to show only public streams
  await streamStore.fetchStreams()
}
</script>

<style scoped>
a {
  text-decoration: none;
  color: inherit;
}
</style>
