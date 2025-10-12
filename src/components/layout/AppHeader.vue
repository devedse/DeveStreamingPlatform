<template>
  <v-app-bar color="surface" elevation="0" border="b">
    <v-app-bar-title>
      <router-link to="/" style="text-decoration: none; color: inherit;">
        <div class="d-flex align-center">
          <v-icon icon="mdi-video-wireless" size="large" class="mr-2" color="primary"></v-icon>
          <span class="text-h6 font-weight-bold">Deve Streaming Platform</span>
        </div>
      </router-link>
    </v-app-bar-title>

    <v-spacer></v-spacer>

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

    <!-- Theme toggle button -->
    <v-btn
      :icon="theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
      @click="toggleTheme"
    ></v-btn>
  </v-app-bar>
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'
import { computed } from 'vue'
import { useStreamStore } from '@/stores/streams'

const theme = useTheme()
const streamStore = useStreamStore()

const totalViewers = computed(() => streamStore.totalViewers)

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}
</script>

<style scoped>
a {
  text-decoration: none;
  color: inherit;
}
</style>
