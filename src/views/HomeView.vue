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

    <!-- Orphaned public streams section -->
    <template v-if="authStore.isAuthenticated && orphanedStreams.length > 0">
      <v-divider class="my-6" />
      <div class="d-flex align-center mb-4">
        <v-icon icon="mdi-alert-circle" color="warning" class="mr-2" />
        <h2 class="text-h5 font-weight-medium">Orphaned Public Streams</h2>
        <v-chip color="warning" size="small" class="ml-3">{{ orphanedStreams.length }}</v-chip>
      </div>
      <p class="text-body-2 text-grey mb-4">
        These streams exist in the public app but have no matching source stream. They can be safely deleted.
      </p>
      <StreamGrid :streams="orphanedStreams" />
    </template>

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
const orphanedStreams = computed(() => streamStore.orphanedStreams)
const loading = computed(() => streamStore.loading)
const error = computed({
  get: () => streamStore.error,
  set: (value) => { streamStore.error = value }
})

onMounted(async () => {
  // Start polling (includes immediate first fetch)
  await streamStore.startPolling(5000)
})

onBeforeUnmount(() => {
  streamStore.stopPolling()
})

// Manual refresh button
async function refreshStreams() {
  await streamStore.fetchStreams()
}
</script>
