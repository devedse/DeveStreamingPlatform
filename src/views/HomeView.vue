<template>
  <v-container fluid class="pa-6">
    <!-- Page header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-2">
          <v-icon icon="mdi-television-play" color="primary" class="mr-2"></v-icon>
          Live Streams
        </h1>
        <p class="text-body-1 text-grey">
          Browse and watch live streams
        </p>
      </div>
      
      <div class="d-flex gap-2 align-center">
        <v-btn
          icon="mdi-refresh"
          variant="text"
          :loading="loading"
          @click="refreshStreams"
        ></v-btn>
        <AddStreamDialog />
      </div>
    </div>

    <!-- Stream grid -->
    <StreamGrid :streams="streams" :loading="loading" />

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
import StreamGrid from '@/components/streams/StreamGrid.vue'
import AddStreamDialog from '@/components/streams/AddStreamDialog.vue'

const streamStore = useStreamStore()

const streams = computed(() => streamStore.liveStreams)
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
