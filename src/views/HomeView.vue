<template>
  <v-container fluid class="pa-6" style="max-width: 100%;">
    <!-- Page header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-2">
          <v-icon icon="mdi-television-play" color="primary" class="mr-2"></v-icon>
          Live Streams
        </h1>
        <p class="text-body-1 text-grey">
          {{ authStore.isAuthenticated ? 'Browse and manage all live streams' : 'Browse public live streams' }}
        </p>
      </div>
      
      <div class="d-flex align-center">
        <v-btn
          icon="mdi-refresh"
          variant="text"
          :loading="loading"
          @click="refreshStreams"
          class="mr-3"
        ></v-btn>
        <!-- Admin-only controls -->
        <template v-if="authStore.isAuthenticated">
          <PullStreamDialog />
          <AddStreamDialog />
        </template>
      </div>
    </div>

    <!-- Stream grid -->
    <StreamGrid :streams="streams" :loading="loading" />

    <!-- Hint for unauthenticated users -->
    <v-alert
      v-if="!authStore.isAuthenticated && streams.length === 0 && !loading"
      type="info"
      variant="tonal"
      class="mt-4"
    >
      <template #prepend>
        <v-icon icon="mdi-information"></v-icon>
      </template>
      No public streams are currently live. Login to see all streams.
    </v-alert>

    <!-- Error message -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mt-4"
      closable
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue'
import { useStreamStore } from '@/stores/streams'
import { useAuthStore } from '@/stores/auth'
import StreamGrid from '@/components/streams/StreamGrid.vue'
import AddStreamDialog from '@/components/streams/AddStreamDialog.vue'
import PullStreamDialog from '@/components/streams/PullStreamDialog.vue'

const streamStore = useStreamStore()
const authStore = useAuthStore()

// Show all streams if authenticated, only public if not
const streams = computed(() => streamStore.visibleStreams)
const loading = computed(() => streamStore.loading)
const error = computed({
  get: () => streamStore.error,
  set: (value) => { streamStore.error = value }
})

onMounted(async () => {
  await refreshStreams()
  // Start polling for updates every 5 seconds
  streamStore.startPolling(5000)
})

onBeforeUnmount(() => {
  // Stop polling when leaving the page
  streamStore.stopPolling()
})

async function refreshStreams() {
  await streamStore.fetchStreams()
}
</script>
